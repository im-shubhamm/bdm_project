import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, money, pct } from '../lib/api.js';

export default function Regions() {
  const [regions, setRegions] = useState([]);
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    Promise.all([getJson('/regions'), getJson('/segments')]).then(([r, s]) => {
      setRegions(r); setSegments(s);
    });
  }, []);

  if (!regions.length) return <div className="loading">Loading regions…</div>;

  return (
    <div className="page">
      <h1>Regions & customer segments</h1>
      <p className="lead">West leads sales; watch margin differences across the map and segments.</p>
      <div className="grid grid-2">
        <div className="card">
          <h2>Sales by region</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={regions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="Region" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => money(v)} />
                <Bar dataKey="Sales" fill="#1d4f91" />
                <Bar dataKey="Profit" fill="#0f6b4c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="table">
            <thead><tr><th>Region</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {regions.map(r => (
                <tr key={r.Region}>
                  <td>{r.Region}</td>
                  <td className="num">{money(r.Sales)}</td>
                  <td className="num">{money(r.Profit)}</td>
                  <td className="num">{pct(r.ProfitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Segment contribution</h2>
          <p className="sub">Consumer is largest; Corporate and Home Office still matter for margin mix</p>
          <table className="table">
            <thead><tr><th>Segment</th><th className="num">Customers</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {segments.map(s => (
                <tr key={s.Segment}>
                  <td>{s.Segment}</td>
                  <td className="num">{s.Customers}</td>
                  <td className="num">{money(s.Sales)}</td>
                  <td className="num">{money(s.Profit)}</td>
                  <td className="num">{pct(s.ProfitMargin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="finding">Use region × category filters in Power BI for the live drill-down during viva.</div>
        </div>
      </div>
    </div>
  );
}
