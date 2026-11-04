# Deployment

## Live dashboard (Customers panel fixed)

**Working preview (claim to keep):**
- App: https://prompt-vega-zplfo3v.tmp.now
- Claim: https://vercel.com/claim-deployment?code=d11fc8cd-a7aa-4e6e-9380-22da0ffd719a

Open **Customers** — RFM chart + top customers load from slim aggregates (`top_customers.json`, `agg_by_rfm.json`).

Previous production alias (older build, Customers empty until quota resets / claim):
- https://bdm-project-im-shubhamms-projects.vercel.app

> Vercel Hobby hit the free **API deployments/day** limit, so the production project could not be updated via API tonight. Claim the preview above into project `bdm-project` (or wait ~24h and redeploy).

## Local
```bash
cd web/server && npm install && PORT=43151 npm start
cd web/client && npm install && npm run dev   # :43150
```
