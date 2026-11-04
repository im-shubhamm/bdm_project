/**
 * Data store: reads committed JSON under web/data/processed (works on Vercel
 * without MongoDB). Optional MongoDB when MONGODB_URI is set.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDataDir() {
  const candidates = [
    join(__dirname, '..', '..', 'data', 'processed'),          // web/data/processed
    join(__dirname, '..', '..', '..', 'data', 'processed'),    // repo root data/processed
  ];
  for (const p of candidates) {
    if (existsSync(join(p, 'summary.json'))) return p;
  }
  throw new Error('Processed data not found (expected web/data/processed/*.json)');
}

const DATA = resolveDataDir();
const cache = globalThis.__ssJson || (globalThis.__ssJson = { loaded: false, tables: {} });

const FILES = [
  'summary', 'fact_sales', 'dim_customers', 'dim_products', 'dim_locations',
  'dim_calendar', 'agg_by_year', 'agg_by_category', 'agg_by_subcategory',
  'agg_by_region', 'agg_by_segment', 'agg_by_discount', 'agg_monthly',
  'agg_by_rfm', 'top_customers', 'worst_products',
];

export function loadJsonStore() {
  if (cache.loaded) return cache.tables;
  for (const name of FILES) {
    const path = join(DATA, `${name}.json`);
    if (!existsSync(path)) {
      // Optional on serverless if aggregates/dims cover the dashboard.
      cache.tables[name] = name === 'summary' ? [{}] : [];
      continue;
    }
    cache.tables[name] = JSON.parse(readFileSync(path, 'utf8'));
  }
  cache.loaded = true;
  return cache.tables;
}

export function useMongo() {
  return Boolean(process.env.MONGODB_URI);
}

export function table(name) {
  const tables = loadJsonStore();
  if (!tables[name]) throw new Error(`Unknown table ${name}`);
  return tables[name];
}

export function sortBy(rows, key, dir = 1) {
  return [...rows].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}
