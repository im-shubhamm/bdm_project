import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, money } from '../lib/api.js';

export default function Customers() {
  const [top, setTop] = useState([]);
  const [rfm, setRfm] = useState([]);

  useEffect(() => {
    Promise.all([getJson('/customers/top?limit=12'), getJson('/customers/rfm')]).then(([t, r]) => {
      setTop(t); setRfm(r);
    });
  }, []);

  if (!top.length) return <div className="loading">Loading customers…</div>;

  return (
    <div className="page">
      <h1>Customer value (RFM)</h1>
      <p className="lead">Champions vs At Risk — who to keep, who to win back.</p>
      <div className="grid grid-2">
        <div className="card">
          <h2>RFM segments</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={rfm}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="segment" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="customers" fill="#1d4f91" name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="table">
            <thead><tr><th>Segment</th><th className="num">Customers</th><th className="num">Sales</th><th className="num">Profit</th></tr></thead>
            <tbody>
              {rfm.map(r => (
                <tr key={r.segment}>
                  <td><span className="badge">{r.segment}</span></td>
                  <td className="num">{r.customers}</td>
                  <td className="num">{money(r.sales)}</td>
                  <td className="num">{money(r.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2>Top customers by sales</h2>
          <table className="table">
            <thead><tr><th>Customer</th><th>Segment</th><th>RFM</th><th className="num">Sales</th><th className="num">Profit</th></tr></thead>
            <tbody>
              {top.map(c => (
                <tr key={c.CustomerID}>
                  <td>{c.CustomerName}</td>
                  <td>{c.Segment}</td>
                  <td><span className={`badge${c.RFMSegment === 'At Risk' || c.RFMSegment === 'Cant Lose' ? ' warn' : ''}`}>{c.RFMSegment}</span></td>
                  <td className="num">{money(c.Sales)}</td>
                  <td className="num">{money(c.Profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
