import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadJsonStore, table, sortBy, useMongo } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

// Warm JSON cache on cold start
loadJsonStore();

app.get('/api/health', async (_req, res) => {
  const tables = loadJsonStore();
  const collections = Object.entries(tables).map(([name, rows]) => ({
    name,
    count: Array.isArray(rows) ? rows.length : 0,
  }));
  const totalDocs = collections.reduce((s, c) => s + c.count, 0);
  res.json({
    status: 'ok',
    db: useMongo() ? 'mongodb' : 'json-files',
    database: useMongo() ? 'superstore_bdm' : 'web/data/processed',
    totalDocs,
    collections: collections.sort((a, b) => b.count - a.count),
  });
});

app.get('/api/summary', (_req, res) => {
  res.json(table('summary')[0] || {});
});

app.get('/api/years', (_req, res) => {
  res.json(sortBy(table('agg_by_year'), 'OrderYear', 1));
});

app.get('/api/categories', (_req, res) => {
  res.json(sortBy(table('agg_by_category'), 'Sales', -1));
});

app.get('/api/subcategories', (_req, res) => {
  res.json(sortBy(table('agg_by_subcategory'), 'Profit', 1));
});

app.get('/api/regions', (_req, res) => {
  res.json(sortBy(table('agg_by_region'), 'Sales', -1));
});

app.get('/api/segments', (_req, res) => {
  res.json(sortBy(table('agg_by_segment'), 'Sales', -1));
});

app.get('/api/discounts', (_req, res) => {
  res.json(table('agg_by_discount'));
});

app.get('/api/monthly', (_req, res) => {
  res.json(sortBy(table('agg_monthly'), 'OrderMonth', 1));
});

app.get('/api/customers/top', (req, res) => {
  const limit = Number(req.query.limit || 15);
  const key = req.query.sort === 'profit' ? 'Profit' : 'Sales';
  const slim = table('top_customers');
  if (slim.length) {
    res.json(sortBy(slim, key, -1).slice(0, limit));
    return;
  }
  res.json(sortBy(table('dim_customers'), key, -1).slice(0, limit));
});

app.get('/api/customers/rfm', (_req, res) => {
  const slim = table('agg_by_rfm');
  if (slim.length) {
    res.json(sortBy(slim, 'sales', -1));
    return;
  }
  const map = new Map();
  for (const c of table('dim_customers')) {
    const seg = c.RFMSegment || 'Others';
    const cur = map.get(seg) || { segment: seg, customers: 0, sales: 0, profit: 0 };
    cur.customers += 1;
    cur.sales += c.Sales || 0;
    cur.profit += c.Profit || 0;
    map.set(seg, cur);
  }
  res.json([...map.values()].sort((a, b) => b.sales - a.sales));
});

app.get('/api/products/worst', (req, res) => {
  const limit = Number(req.query.limit || 10);
  const slim = table('worst_products');
  if (slim.length) {
    res.json(slim.slice(0, limit));
    return;
  }
  const rows = table('dim_products').filter(p => (p.Profit || 0) < 0);
  res.json(sortBy(rows, 'Profit', 1).slice(0, limit));
});

app.get('/api/sales', (req, res) => {
  const filter = {};
  if (req.query.year) filter.OrderYear = Number(req.query.year);
  if (req.query.category) filter.Category = req.query.category;
  if (req.query.region) filter.Region = req.query.region;
  const limit = Math.min(Number(req.query.limit || 100), 500);
  let rows = table('fact_sales');
  rows = rows.filter(r =>
    (filter.OrderYear == null || r.OrderYear === filter.OrderYear) &&
    (filter.Category == null || r.Category === filter.Category) &&
    (filter.Region == null || r.Region === filter.Region),
  );
  res.json(sortBy(rows, 'Sales', -1).slice(0, limit));
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../../client/dist');
if (process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production') {
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'), err => { if (err) next(); });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

export default app;
