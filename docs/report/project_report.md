# BDM Project Report — Superstore Sales & Profitability Intelligence

## Team
| Name | Roll no. |
| --- | --- |
| Shubham | 2023IMG048 |
| Arkadip Siddha | 2023IMG009 |
| Advitya Ranjan | 2023IMG004 |
| Chayan Das | 2023IMG017 |

## 1. Problem
A multi-category retailer (furniture/housewares, office supplies, technology) needs to know **which products, discounts, regions and customers create profit — and which destroy it.**

## 2. Dataset (from the internet)
- **Name:** Sample Superstore (classic Tableau / Power BI teaching dataset)
- **Download:** `https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv`
- **Stored as:** `data/raw/Sample_Superstore.csv`
- **Size:** 9,994 order lines · 5,009 orders · 793 customers · 1,862 products · years 2016–2019
- **Fields:** Order, ship, customer, geo, product hierarchy, sales, qty, discount, profit

## 3. Architecture
1. **Ingest** raw CSV from the public URL  
2. **ETL** (`scripts/etl/build_superstore.py`) → star schema  
3. **MongoDB** stores facts, dimensions and aggregates for the API  
4. **Power BI** connects to the same CSVs in `powerbi/data/`  
5. **Web dashboard** (React + Express) mirrors the story for live demo  

## 4. Key findings
1. **Total sales ≈ $2.30M**, **profit ≈ $286k**, overall margin ≈ **12.5%**.  
2. **1,871 lines (19%) are loss-making.**  
3. **Furniture** looks fine on sales but weak on profit; **Tables (−$17.7k)** and **Bookcases (−$3.5k)** are the leaks.  
4. **Technology** (Copiers, Phones, Accessories) funds the profit pool.  
5. **High discounts (&gt;40%)** correlate with negative profit — discounting is not free growth.  
6. **RFM** separates Champions from At Risk customers for retention actions.  

## 5. Recommendations
- Cap deep discounts on Furniture Tables/Bookcases.  
- Bundle loss-leaders with high-margin Technology accessories.  
- Prioritize West growth while investigating Central margin gaps in Power BI.  
- Run retention offers on “Can’t Lose” / At Risk high-monetary customers.  

## 6. Tools
MongoDB · Python (pandas ETL) · Power BI Desktop · Node/Express · React
