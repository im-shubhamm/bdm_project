/**
 * index.js — Start the API as a normal long-running server (local dev, Render, VPS).
 * On Vercel this file is not used; see ../../api/index.js.
 *
 * Bind 0.0.0.0 for cloud/preview environments. Default port 43141 (uncommon).
 */
import app from './app.js';
import { connectDB } from './db.js';
import { seedIfEmpty } from './seedOnBoot.js';

const PORT = Number(process.env.PORT || 43141);
const HOST = process.env.HOST || '0.0.0.0';

connectDB()
  .then(async () => {
    console.log('⚽ Connected to MongoDB');
    await seedIfEmpty();
    app.listen(PORT, HOST, () => {
      console.log(`🚀 API server running on http://${HOST}:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
