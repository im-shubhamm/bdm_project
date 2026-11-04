import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, money, pct } from '../lib/api.js';

export default function Discounts() {
  const [bands, setBands] = useState([]);
  const [worst, setWorst] = useState([]);

  useEffect(() => {
    Promise.all([getJson('/discounts'), getJson('/products/worst?limit=8')]).then(([d, w]) => {
      setBands(d); setWorst(w);
    });
  }, []);

  if (!bands.length) return <div className="loading">Loading discounts…</div>;

  const order = ['No discount', 'Low (≤20%)', 'Medium (21–40%)', 'High (>40%)'];
  const sorted = [...bands].sort((a, b) => order.indexOf(a.DiscountBand) - order.indexOf(b.DiscountBand));

  return (
    <div className="page">
      <h1>Discount damage</h1>
      <p className="lead">Deep discounts do not buy profit — they buy volume that often loses money.</p>
      <div className="grid grid-2">
        <div className="card">
          <h2>Profit by discount band</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={sorted}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="DiscountBand" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => money(v)} />
                <Bar dataKey="Profit" name="Profit">
                  {sorted.map(b => <Cell key={b.DiscountBand} fill={b.Profit < 0 ? '#9f1239' : '#0f6b4c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="table">
            <thead><tr><th>Band</th><th className="num">Lines</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {sorted.map(b => (
                <tr key={b.DiscountBand}>
                  <td>{b.DiscountBand}</td>
                  <td className="num">{b.Lines}</td>
                  <td className="num">{money(b.Sales)}</td>
                  <td className="num">{money(b.Profit)}</td>
                  <td className="num">{pct(b.ProfitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Worst products by profit</h2>
          <p className="sub">Candidates for delist / repricing</p>
          <table className="table">
            <thead><tr><th>Product</th><th>Category</th><th className="num">Avg disc.</th><th className="num">Profit</th></tr></thead>
            <tbody>
              {worst.map(p => (
                <tr key={p.ProductID}>
                  <td>{p.ProductName.slice(0, 42)}{p.ProductName.length > 42 ? '…' : ''}</td>
                  <td>{p.Category}</td>
                  <td className="num">{pct(p.AvgDiscount)}</td>
                  <td className="num"><span className="badge bad">{money(p.Profit)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="finding">
            <strong>Recommendation: </strong>cap discounts above 20% on Furniture Tables/Bookcases unless the order attaches high-margin Technology add-ons.
          </div>
        </div>
      </div>
    </div>
  );
}
