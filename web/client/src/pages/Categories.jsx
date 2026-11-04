import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, money, pct } from '../lib/api.js';

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    Promise.all([getJson('/categories'), getJson('/subcategories')]).then(([c, s]) => {
      setCats(c); setSubs(s);
    });
  }, []);

  if (!cats.length) return <div className="loading">Loading categories…</div>;

  return (
    <div className="page">
      <h1>Category & subcategory profit</h1>
      <p className="lead">Furniture sells — but Tables and Bookcases are the profit leaks.</p>

      <div className="grid grid-2">
        <div className="card">
          <h2>Sales vs profit by category</h2>
          <p className="sub">Technology wins on profit; Furniture lags on margin</p>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={cats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="Category" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => money(v)} />
                <Bar dataKey="Sales" fill="#1d4f91" name="Sales" />
                <Bar dataKey="Profit" fill="#0f6b4c" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="table">
            <thead><tr><th>Category</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {cats.map(c => (
                <tr key={c.Category}>
                  <td>{c.Category}</td>
                  <td className="num">{money(c.Sales)}</td>
                  <td className="num">{money(c.Profit)}</td>
                  <td className="num">{pct(c.ProfitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Subcategories ranked by profit</h2>
          <p className="sub">Red bars = money-losing lines</p>
          <div className="chart" style={{ height: 360 }}>
            <ResponsiveContainer>
              <BarChart data={subs} layout="vertical" margin={{ left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="SubCategory" width={70} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => money(v)} />
                <Bar dataKey="Profit" name="Profit">
                  {subs.map(s => <Cell key={s.SubCategory} fill={s.Profit < 0 ? '#9f1239' : '#0f6b4c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="finding">
        <strong>So what: </strong>
        Cut or reprice Tables (≈{money(subs.find(s => s.SubCategory === 'Tables')?.Profit || 0)} profit)
        and review Bookcases. Protect Copiers / Phones / Accessories — they fund the business.
      </div>
    </div>
  );
}
