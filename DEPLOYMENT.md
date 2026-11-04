# Deployment

## Live (Vercel)

Project: **bdm-project** on Vercel (account `im-shubhamm`).

Root directory for the app is `web/` (API + Vite client + JSON data).

### Temporary preview (anonymous)
- App: https://flying-scarlet-5fxyr8i.tmp.now
- Claim to keep: https://vercel.com/claim-deployment?code=09a64cb5-50c1-49aa-a204-3fec1f9da6ad

### Production project
After production deploy finishes, the stable URL is:
- https://bdm-project-im-shubhamms-projects.vercel.app

## Local
```bash
cd web/server && npm install && PORT=43151 npm start
cd web/client && npm install && npm run dev   # :43150, proxies /api
```

Data is served from `web/data/processed/*.json` (no MongoDB required for the dashboard).
