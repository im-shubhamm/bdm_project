export default function Methodology() {
  return (
    <div className="page">
      <h1>Data, stack & team</h1>
      <p className="lead">Everything you need to defend the project in viva.</p>

      <div className="grid grid-2">
        <div className="card">
          <h2>Dataset (from the internet)</h2>
          <p className="sub">Not synthetic — public Sample Superstore retail orders</p>
          <ul>
            <li><strong>Source URL:</strong> GitHub mirror of the classic Tableau/Power BI Sample Superstore CSV</li>
            <li><code>https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv</code></li>
            <li>~9,994 line items · 5,009 orders · 793 customers · 2016–2019 · US regions</li>
            <li>Categories: Furniture (housewares), Office Supplies, Technology</li>
          </ul>
          <h2>Pipeline</h2>
          <ol>
            <li>Download raw CSV → <code>data/raw/</code></li>
            <li>ETL star schema → <code>data/processed/</code> + <code>powerbi/data/</code></li>
            <li>Load JSON into <strong>MongoDB</strong> (memory server locally / Atlas in cloud)</li>
            <li>Analyze in <strong>Power BI Desktop</strong> from <code>powerbi/data/*.csv</code></li>
            <li>Interactive web mirror for demo without Power BI installed</li>
          </ol>
        </div>
        <div className="card">
          <h2>Power BI model</h2>
          <p className="sub">Open the CSVs in Power BI Desktop — relationships documented in powerbi/README.md</p>
          <ul>
            <li>FactSales ← DimCustomer / DimProduct / DimLocation / DimCalendar</li>
            <li>Measures: Total Sales, Profit, Margin %, Loss Lines, Avg Discount</li>
            <li>Pages: Overview, Category, Region, Discount, Customers (RFM)</li>
          </ul>
          <h2>Team</h2>
          <table className="table">
            <tbody>
              <tr><td>Shubham</td><td>2023IMG048</td></tr>
              <tr><td>Arkadip Siddha</td><td>2023IMG009</td></tr>
              <tr><td>Advitya Ranjan</td><td>2023IMG004</td></tr>
              <tr><td>Chayan Das</td><td>2023IMG017</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
