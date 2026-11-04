# Power BI — Superstore Profitability (BDM)

## Open in Power BI Desktop (Windows / your laptop)

1. Open **Power BI Desktop**.
2. **Get data → Text** → select every CSV in `powerbi/data/`:
   - `FactSales.csv` (fact)
   - `DimCustomer.csv`
   - `DimProduct.csv`
   - `DimLocation.csv`
   - `DimCalendar.csv`
3. In **Model view**, create relationships:

| From | To |
| --- | --- |
| FactSales[CustomerID] | DimCustomer[CustomerID] |
| FactSales[ProductID] | DimProduct[ProductID] |
| FactSales[OrderDate] | DimCalendar[Date] (mark DimCalendar as date table) |

City/State/Region can be used from the fact table or DimLocation.

4. Paste measures from `powerbi/measures/DAX.md` into a `_Measures` table.
5. Build pages listed in `powerbi/pages/PAGES.md`.
6. Export PDF to `powerbi/deliverables/` for the report appendix.

## Why this is the Power BI half

MongoDB powers the live web demo. Power BI is the **classroom / viva** visual layer on the same cleaned star schema (`powerbi/data` = export of `data/processed`).
