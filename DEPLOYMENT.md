# Deployment

## Live (Vercel production)

**https://bdm-project-im-shubhamms-projects.vercel.app**

Customers panel uses slim aggregates (`top_customers.json`, `agg_by_rfm.json`, `worst_products.json`) so RFM works without shipping the full dimension tables.

## Local
```bash
cd web/server && npm install && PORT=43151 npm start
cd web/client && npm install && npm run dev   # :43150 proxies /api
```
