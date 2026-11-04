# Deployment

## Local
```bash
cd web/server && npm install && npm run dev   # :43151
cd web/client && npm install && npm run dev   # :43150
```

Data is served from `web/data/processed/*.json` (no MongoDB required).

## Vercel (production)
Project root directory: **`web/`**

1. Import https://github.com/im-shubhamm/bdm_project on Vercel
2. Set Root Directory to `web`
3. Deploy — API is `api/index.js`, static UI from `client/dist`

Optional: set `MONGODB_URI` later if you want Atlas instead of JSON files.
