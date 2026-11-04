# Deployment

## Live (Vercel production)

**https://bdm-project-im-shubhamms-projects.vercel.app**

Project: `bdm-project` · Root of the deployed app is the `web/` folder (API + Vite client + JSON aggregates).

## Local
```bash
cd web/server && npm install && PORT=43151 npm start
cd web/client && npm install && npm run dev   # :43150 proxies /api
```

Data for the dashboard comes from `web/data/processed/*.json` (no MongoDB required). Full fact/dimension tables and Power BI CSVs stay in the repo for offline analysis / Mongo load.
