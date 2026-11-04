# Deployment

## Local (default)

No Atlas account required. The API starts an in-memory MongoDB and seeds `data/processed/`.

```bash
cd web/server && npm install && npm run dev
cd web/client && npm install && npm run dev
```

- UI: http://127.0.0.1:43140  
- API: http://127.0.0.1:43141/api/health  

## Option 1 — Vercel + MongoDB Atlas

1. Create an Atlas cluster and database `pl_transfer`.
2. Set project env `MONGODB_URI`.
3. From `web/`: `npx vercel` (uses `vercel.json`; `api/index.js` is the serverless entry).
4. Run `npm run seed` once against Atlas (with `MONGODB_URI` set) before first traffic.

## Option 2 — Render web service

1. Build: `cd web/client && npm install && npm run build`
2. Start: `cd web/server && SERVE_STATIC=true NODE_ENV=production npm start`
3. Bind `0.0.0.0:$PORT` (already default host `0.0.0.0`).
4. Attach a MongoDB instance and set `MONGODB_URI`.

Filesystem is ephemeral on Render — do not rely on local writes; keep data in MongoDB.
