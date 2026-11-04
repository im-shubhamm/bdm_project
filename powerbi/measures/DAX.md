# DAX measures

```dax
Total Sales = SUM ( FactSales[Sales] )

Total Profit = SUM ( FactSales[Profit] )

Profit Margin % = DIVIDE ( [Total Profit], [Total Sales] )

Order Count = DISTINCTCOUNT ( FactSales[OrderID] )

Quantity Sold = SUM ( FactSales[Quantity] )

Avg Discount = AVERAGE ( FactSales[Discount] )

Loss Lines = CALCULATE ( COUNTROWS ( FactSales ), FactSales[IsLoss] = TRUE() )

Loss Line % = DIVIDE ( [Loss Lines], COUNTROWS ( FactSales ) )

Sales YTD = TOTALYTD ( [Total Sales], DimCalendar[Date] )

Profit YTD = TOTALYTD ( [Total Profit], DimCalendar[Date] )
```

Use **Profit Margin %** and **Loss Line %** on KPI cards. Use **Avg Discount** on the Discount page with a slicer on `DiscountBand`.
