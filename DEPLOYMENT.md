# Deployment

## Live dashboard (Vercel)

**Working preview (claim to keep permanently):**
- App: https://flying-scarlet-5fxyr8i.tmp.now
- Claim: https://vercel.com/claim-deployment?code=09a64cb5-50c1-49aa-a204-3fec1f9da6ad

A Vercel project **`bdm-project`** is already created on your account (`im-shubhamms-projects`). Production alias after a successful project deploy:

- https://bdm-project-im-shubhamms-projects.vercel.app

### Keep the deploy (recommended)
1. Open the **claim** link above while logged into Vercel as `im-shubhamm`.
2. Assign it to project `bdm-project` (or create/attach one). That makes the URL permanent.

### Local
```bash
cd web/server && npm install && PORT=43151 npm start
cd web/client && npm install && npm run dev   # :43150 proxies /api
```

Data is served from `web/data/processed/*.json` (no MongoDB required for the dashboard). Full fact table + star-schema CSVs remain in the repo for Power BI / Mongo.
