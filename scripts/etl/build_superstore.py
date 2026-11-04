#!/usr/bin/env python3
"""
ETL: Sample Superstore (public Tableau/Power BI sample) → star schema + Mongo JSON.

Source (internet):
  https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv
  Classic Sample Superstore retail orders (US), ~9,994 line items, 2016–2019.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "Sample_Superstore.csv"
OUT = ROOT / "data" / "processed"
PBI = ROOT / "powerbi" / "data"
OUT.mkdir(parents=True, exist_ok=True)
PBI.mkdir(parents=True, exist_ok=True)


def dump_json(name: str, rows: list[dict]):
    (OUT / name).write_text(json.dumps(rows, indent=1, default=str))
    print(f"  {name}: {len(rows)}")


def main():
    df = pd.read_csv(RAW)
    df.columns = [c.strip().replace(" ", "").replace("-", "") for c in df.columns]
    # OrderID, OrderDate, SubCategory, PostalCode, OrderQuarter, …
    # Parse dates (DD/MM/YYYY in this file)
    df["OrderDate"] = pd.to_datetime(df["OrderDate"], dayfirst=True, errors="coerce")
    df["ShipDate"] = pd.to_datetime(df["ShipDate"], dayfirst=True, errors="coerce")
    df["PostalCode"] = df["PostalCode"].fillna(0).astype(int).astype(str)
    df["ProfitMargin"] = (df["Profit"] / df["Sales"]).replace([pd.NA, float("inf"), float("-inf")], 0).fillna(0)
    df["IsLoss"] = df["Profit"] < 0
    df["DiscountBand"] = pd.cut(
        df["Discount"],
        bins=[-0.01, 0, 0.2, 0.4, 1.0],
        labels=["No discount", "Low (≤20%)", "Medium (21–40%)", "High (>40%)"],
    ).astype(str)
    df["OrderMonth"] = df["OrderDate"].dt.to_period("M").astype(str)
    df["ShipDays"] = (df["ShipDate"] - df["OrderDate"]).dt.days
    df["LineID"] = df["OrderID"].astype(str) + "|" + df["ProductID"].astype(str) + "|" + df.index.astype(str)

    # --- Dimensions ---
    customers = (
        df.groupby("CustomerID", as_index=False)
        .agg(
            CustomerName=("CustomerName", "first"),
            Segment=("Segment", "first"),
            Orders=("OrderID", "nunique"),
            Sales=("Sales", "sum"),
            Profit=("Profit", "sum"),
            Quantity=("Quantity", "sum"),
            FirstOrder=("OrderDate", "min"),
            LastOrder=("OrderDate", "max"),
        )
        .sort_values("Sales", ascending=False)
    )
    customers["ProfitMargin"] = (customers["Profit"] / customers["Sales"]).fillna(0)
    # RFM-ish scores within dataset
    max_date = df["OrderDate"].max()
    customers["RecencyDays"] = (max_date - customers["LastOrder"]).dt.days
    customers["Frequency"] = customers["Orders"]
    customers["Monetary"] = customers["Sales"]
    for col, new in [("RecencyDays", "R"), ("Frequency", "F"), ("Monetary", "M")]:
        # R: lower is better
        if col == "RecencyDays":
            customers[new] = pd.qcut(customers[col].rank(method="first"), 5, labels=[5, 4, 3, 2, 1]).astype(int)
        else:
            customers[new] = pd.qcut(customers[col].rank(method="first"), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    customers["RFM"] = customers["R"].astype(str) + customers["F"].astype(str) + customers["M"].astype(str)
    customers["RFMSegment"] = "Others"
    customers.loc[customers["R"] >= 4, "RFMSegment"] = "Promising"
    customers.loc[(customers["R"] >= 4) & (customers["F"] >= 4) & (customers["M"] >= 4), "RFMSegment"] = "Champions"
    customers.loc[(customers["R"] <= 2) & (customers["F"] <= 2), "RFMSegment"] = "At Risk"
    customers.loc[(customers["M"] >= 4) & (customers["R"] <= 2), "RFMSegment"] = "Cant Lose"

    products = (
        df.groupby("ProductID", as_index=False)
        .agg(
            ProductName=("ProductName", "first"),
            Category=("Category", "first"),
            SubCategory=("SubCategory", "first"),
            Sales=("Sales", "sum"),
            Profit=("Profit", "sum"),
            Quantity=("Quantity", "sum"),
            Orders=("OrderID", "nunique"),
            AvgDiscount=("Discount", "mean"),
        )
    )
    products["ProfitMargin"] = (products["Profit"] / products["Sales"]).fillna(0)

    locations = (
        df.groupby(["City", "State", "Region", "PostalCode"], as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Orders=("OrderID", "nunique"))
    )
    locations["LocationKey"] = locations["City"] + "|" + locations["State"] + "|" + locations["PostalCode"]

    calendar = (
        df.groupby(df["OrderDate"].dt.date)
        .size()
        .reset_index(name="Lines")
        .rename(columns={"OrderDate": "Date"})
    )
    calendar["Date"] = pd.to_datetime(calendar["Date"])
    calendar["Year"] = calendar["Date"].dt.year
    calendar["Month"] = calendar["Date"].dt.month
    calendar["MonthName"] = calendar["Date"].dt.strftime("%b")
    calendar["Quarter"] = calendar["Date"].dt.quarter
    calendar["YearMonth"] = calendar["Date"].dt.to_period("M").astype(str)

    # --- Fact ---
    fact = df[
        [
            "LineID",
            "OrderID",
            "OrderDate",
            "ShipDate",
            "ShipMode",
            "ShipDays",
            "CustomerID",
            "ProductID",
            "Category",
            "SubCategory",
            "Segment",
            "Region",
            "State",
            "City",
            "PostalCode",
            "Sales",
            "Quantity",
            "Discount",
            "DiscountBand",
            "Profit",
            "ProfitMargin",
            "IsLoss",
            "OrderYear",
            "OrderMonth",
        ]
    ].copy()
    fact["OrderQuarter"] = df["OrderQuarter"] if "OrderQuarter" in df.columns else df["OrderDate"].dt.quarter

    # Aggregates for dashboard
    by_year = (
        fact.groupby("OrderYear", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Orders=("OrderID", "nunique"), Lines=("LineID", "count"), Qty=("Quantity", "sum"))
    )
    by_year["ProfitMargin"] = by_year["Profit"] / by_year["Sales"]

    by_category = (
        fact.groupby("Category", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Qty=("Quantity", "sum"), Lines=("LineID", "count"))
    )
    by_category["ProfitMargin"] = by_category["Profit"] / by_category["Sales"]

    by_sub = (
        fact.groupby(["Category", "SubCategory"], as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Qty=("Quantity", "sum"), AvgDiscount=("Discount", "mean"))
        .sort_values("Profit")
    )
    by_sub["ProfitMargin"] = by_sub["Profit"] / by_sub["Sales"]

    by_region = (
        fact.groupby("Region", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Orders=("OrderID", "nunique"))
    )
    by_region["ProfitMargin"] = by_region["Profit"] / by_region["Sales"]

    by_segment = (
        fact.groupby("Segment", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Customers=("CustomerID", "nunique"))
    )
    by_segment["ProfitMargin"] = by_segment["Profit"] / by_segment["Sales"]

    by_discount = (
        fact.groupby("DiscountBand", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Lines=("LineID", "count"))
    )
    by_discount["ProfitMargin"] = by_discount["Profit"] / by_discount["Sales"]

    monthly = (
        fact.groupby("OrderMonth", as_index=False)
        .agg(Sales=("Sales", "sum"), Profit=("Profit", "sum"), Orders=("OrderID", "nunique"))
        .sort_values("OrderMonth")
    )

    summary = {
        "source": "Sample Superstore (public retail sample via GitHub mirror of Tableau Superstore)",
        "sourceUrl": "https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv",
        "rows": int(len(fact)),
        "orders": int(fact["OrderID"].nunique()),
        "customers": int(fact["CustomerID"].nunique()),
        "products": int(fact["ProductID"].nunique()),
        "sales": round(float(fact["Sales"].sum()), 2),
        "profit": round(float(fact["Profit"].sum()), 2),
        "margin": round(float(fact["Profit"].sum() / fact["Sales"].sum()), 4),
        "lossLines": int(fact["IsLoss"].sum()),
        "years": sorted(fact["OrderYear"].dropna().unique().astype(int).tolist()),
        "topInsight": "Furniture posts solid sales but weak profit; high discounts drive most loss-making lines.",
    }

    # Serialize dates
    def ser_df(frame: pd.DataFrame) -> list[dict]:
        out = frame.copy()
        for c in out.columns:
            if pd.api.types.is_datetime64_any_dtype(out[c]):
                out[c] = out[c].dt.strftime("%Y-%m-%d")
        return out.to_dict(orient="records")

    print("Writing processed + Power BI tables…")
    dump_json("summary.json", [summary])
    dump_json("fact_sales.json", ser_df(fact))
    dump_json("dim_customers.json", ser_df(customers))
    dump_json("dim_products.json", ser_df(products))
    dump_json("dim_locations.json", ser_df(locations))
    dump_json("dim_calendar.json", ser_df(calendar))
    dump_json("agg_by_year.json", ser_df(by_year))
    dump_json("agg_by_category.json", ser_df(by_category))
    dump_json("agg_by_subcategory.json", ser_df(by_sub))
    dump_json("agg_by_region.json", ser_df(by_region))
    dump_json("agg_by_segment.json", ser_df(by_segment))
    dump_json("agg_by_discount.json", ser_df(by_discount))
    dump_json("agg_monthly.json", ser_df(monthly))

    # Power BI–ready CSVs (same content)
    fact.to_csv(PBI / "FactSales.csv", index=False)
    customers.to_csv(PBI / "DimCustomer.csv", index=False)
    products.to_csv(PBI / "DimProduct.csv", index=False)
    locations.to_csv(PBI / "DimLocation.csv", index=False)
    calendar.to_csv(PBI / "DimCalendar.csv", index=False)
    by_year.to_csv(PBI / "AggByYear.csv", index=False)
    by_category.to_csv(PBI / "AggByCategory.csv", index=False)
    by_sub.to_csv(PBI / "AggBySubCategory.csv", index=False)
    by_region.to_csv(PBI / "AggByRegion.csv", index=False)
    by_segment.to_csv(PBI / "AggBySegment.csv", index=False)
    by_discount.to_csv(PBI / "AggByDiscount.csv", index=False)

    # Also processed CSV copies
    for name, frame in [
        ("fact_sales.csv", fact),
        ("dim_customers.csv", customers),
        ("dim_products.csv", products),
        ("dim_locations.csv", locations),
        ("dim_calendar.csv", calendar),
    ]:
        frame.to_csv(OUT / name, index=False)

    print("\nHeadline KPIs")
    print(json.dumps(summary, indent=2))
    print("\nWorst subcategories by profit:")
    print(by_sub.head(5)[["Category", "SubCategory", "Sales", "Profit", "AvgDiscount"]].to_string(index=False))
    print("\nBest subcategories by profit:")
    print(by_sub.tail(5)[["Category", "SubCategory", "Sales", "Profit", "AvgDiscount"]].to_string(index=False))


if __name__ == "__main__":
    main()
