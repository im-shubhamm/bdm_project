import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getMongoUri } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try { await connectDB(); } catch (e) { console.error(e.message); }
  const ok = mongoose.connection.readyState === 1;
  let collections = [];
  let totalDocs = 0;
  if (ok && mongoose.connection.db) {
    const cols = await mongoose.connection.db.listCollections().toArray();
    for (const c of cols) {
      const count = await mongoose.connection.db.collection(c.name).countDocuments();
      collections.push({ name: c.name, count });
      totalDocs += count;
    }
  }
  res.json({
    status: 'ok',
    db: ok ? 'connected' : 'disconnected',
    database: mongoose.connection.name || 'superstore_bdm',
    uri: getMongoUri().replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
    totalDocs,
    collections: collections.sort((a, b) => b.count - a.count),
  });
});

app.use('/api', async (_req, _res, next) => {
  try { await connectDB(); next(); } catch (e) { next(e); }
});

const col = name => mongoose.connection.db.collection(name);

app.get('/api/summary', async (_req, res, next) => {
  try {
    const [summary] = await col('summary').find().toArray();
    res.json(summary || {});
  } catch (e) { next(e); }
});

app.get('/api/years', async (_req, res, next) => {
  try { res.json(await col('agg_by_year').find().sort({ OrderYear: 1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/categories', async (_req, res, next) => {
  try { res.json(await col('agg_by_category').find().sort({ Sales: -1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/subcategories', async (_req, res, next) => {
  try { res.json(await col('agg_by_subcategory').find().sort({ Profit: 1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/regions', async (_req, res, next) => {
  try { res.json(await col('agg_by_region').find().sort({ Sales: -1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/segments', async (_req, res, next) => {
  try { res.json(await col('agg_by_segment').find().sort({ Sales: -1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/discounts', async (_req, res, next) => {
  try { res.json(await col('agg_by_discount').find().toArray()); }
  catch (e) { next(e); }
});

app.get('/api/monthly', async (_req, res, next) => {
  try { res.json(await col('agg_monthly').find().sort({ OrderMonth: 1 }).toArray()); }
  catch (e) { next(e); }
});

app.get('/api/customers/top', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 15);
    const sort = req.query.sort === 'profit' ? { Profit: -1 } : { Sales: -1 };
    res.json(await col('dim_customers').find().sort(sort).limit(limit).toArray());
  } catch (e) { next(e); }
});

app.get('/api/customers/rfm', async (_req, res, next) => {
  try {
    const rows = await col('dim_customers').aggregate([
      { $group: { _id: '$RFMSegment', customers: { $sum: 1 }, sales: { $sum: '$Sales' }, profit: { $sum: '$Profit' } } },
      { $project: { _id: 0, segment: '$_id', customers: 1, sales: 1, profit: 1 } },
      { $sort: { sales: -1 } },
    ]).toArray();
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/products/worst', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 10);
    res.json(await col('dim_products').find({ Profit: { $lt: 0 } }).sort({ Profit: 1 }).limit(limit).toArray());
  } catch (e) { next(e); }
});

app.get('/api/sales', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.year) filter.OrderYear = Number(req.query.year);
    if (req.query.category) filter.Category = req.query.category;
    if (req.query.region) filter.Region = req.query.region;
    const limit = Math.min(Number(req.query.limit || 100), 500);
    res.json(await col('fact_sales').find(filter).sort({ Sales: -1 }).limit(limit).toArray());
  } catch (e) { next(e); }
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
