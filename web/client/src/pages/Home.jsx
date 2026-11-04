import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getJson, money, pct } from '../lib/api.js';

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [years, setYears] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getJson('/summary'), getJson('/years'), getJson('/monthly')])
      .then(([s, y, m]) => { setSummary(s); setYears(y); setMonthly(m); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="loading">Failed to load: {error}</div>;
  if (!summary) return <div className="loading">Loading overview…</div>;

  return (
    <div className="page">
      <section className="hero">
        <h1>Where does Superstore make money — and where does it leak?</h1>
        <p>
          Real Sample Superstore orders (2016–2019) loaded into MongoDB. We track sales, profit margin,
          discount damage, and customer value for the BDM viva.
        </p>
        <div className="kpis">
          <div className="kpi"><b>{money(summary.sales)}</b><small>Total sales</small></div>
          <div className="kpi"><b>{money(summary.profit)}</b><small>Total profit</small></div>
          <div className="kpi"><b>{pct(summary.margin)}</b><small>Overall margin</small></div>
          <div className="kpi"><b>{summary.orders.toLocaleString()}</b><small>Orders</small></div>
          <div className="kpi"><b>{summary.lossLines.toLocaleString()}</b><small>Loss-making lines</small></div>
        </div>
      </section>

      <div className="grid grid-2">
        <div className="card">
          <h2>Sales by year</h2>
          <p className="sub">Revenue grew across the four years in the public sample</p>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={years}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="OrderYear" />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => money(v)} />
                <Area type="monotone" dataKey="Sales" stroke="#0f6b4c" fill="#cfe8db" name="Sales" />
                <Area type="monotone" dataKey="Profit" stroke="#1d4f91" fill="#d7e4f7" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2>Monthly sales trend</h2>
          <p className="sub">Seasonality visible toward year-end peaks</p>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5dccb" />
                <XAxis dataKey="OrderMonth" hide />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => money(v)} labelFormatter={l => l} />
                <Area type="monotone" dataKey="Sales" stroke="#1c1915" fill="#e8e1d4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="finding">
        <strong>Presentation hook: </strong>{summary.topInsight}
        {' '}Tables and Bookcases destroy Furniture profit even when sales look healthy — open Categories next.
      </div>
    </div>
  );
}
