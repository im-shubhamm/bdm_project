import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', '..', 'data', 'processed');

const FILES = [
  'summary', 'fact_sales', 'dim_customers', 'dim_products', 'dim_locations',
  'dim_calendar', 'agg_by_year', 'agg_by_category', 'agg_by_subcategory',
  'agg_by_region', 'agg_by_segment', 'agg_by_discount', 'agg_monthly',
];

export async function seedIfEmpty() {
  const db = mongoose.connection.db;
  const existing = await db.listCollections({ name: 'summary' }).toArray();
  if (existing.length) {
    const n = await db.collection('summary').countDocuments();
    if (n > 0) {
      console.log('DB already seeded');
      return;
    }
  }
  console.log('Seeding Superstore collections…');
  for (const name of FILES) {
    const path = join(DATA, `${name}.json`);
    if (!existsSync(path)) throw new Error(`Missing ${path}`);
    const rows = JSON.parse(readFileSync(path, 'utf8'));
    await db.collection(name).deleteMany({});
    if (rows.length) await db.collection(name).insertMany(rows, { ordered: false });
    console.log(`  ${name}: ${rows.length}`);
  }
  await db.collection('fact_sales').createIndex({ Category: 1 });
  await db.collection('fact_sales').createIndex({ Region: 1 });
  await db.collection('fact_sales').createIndex({ OrderYear: 1 });
  await db.collection('fact_sales').createIndex({ CustomerID: 1 });
  console.log('Seed complete');
}
