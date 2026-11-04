# PL Transfer Value Intelligence — MERN Web Application

Interactive MERN stack application for **Premier League Transfer Valuation & Player Performance Intelligence** (BDM Semester 7). Built with MongoDB, Express.js, React (Vite), and Node.js to deliver interactive features such as the **Squad Builder & Transfer Budget Simulator**.

---

## 📁 Architecture

```text
web/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── pages/               # 10 Dashboard Pages (Home, Market, Clubs, Value Map,
│   │   │                        # Steals, Roles, Brackets, Players, Squad Builder, Methodology)
│   │   ├── components/          # Reusable UI (NavBar with MongoDB Inspector, KPI cards, etc.)
│   │   ├── lib/                 # formatters, PL squad rules, Squad Builder optimizer & knapsack math
│   │   └── hooks/               # useApi data fetcher
│   └── package.json
│
├── server/                      # Express + Node.js + MongoDB API
│   ├── src/
│   │   ├── models/              # Mongoose schemas for 8 MongoDB collections
│   │   ├── routes/              # 8 REST API route handlers
│   │   ├── app.js               # Express app: routes, health monitor, static serving
│   │   ├── db.js                # Cached MongoDB connection (shared by local + Vercel)
│   │   └── index.js             # Local / Render entry: connect + listen (npm start, npm run dev)
│   ├── scripts/
│   │   ├── seed.js              # Idempotent database seeder
│   │   └── test_*.js            # QA and endpoint validation test suites
│   └── package.json
│
├── api/index.js                 # Vercel serverless function (wraps server/src/app.js)
├── vercel.json                  # Vercel build + rewrites (Root Directory = web)
└── package.json                 # API dependencies for the Vercel function
```

---

## ⚡ Quick Start (Local Development)

### 1. MongoDB Database
Ensure MongoDB is running locally (port 27017) or via Docker:
```bash
docker run -d --name pl-mongo -p 27017:27017 mongo:latest
```

Seed the database:
```bash
cd web/server
node scripts/seed.js
```

### 2. Start Backend API
```bash
cd web/server
npm install
npm run dev
# Running on http://localhost:5000
```

### 3. Start Frontend Client
```bash
cd web/client
npm install
npm run dev
# Running on http://localhost:5173
```

---

## 🚀 Deployment

The repo is ready for **Vercel**: one project with Root Directory `web` serves the React build and runs the Express API as a serverless function (`api/index.js` → `server/src/app.js`, settings in `vercel.json`). Only `MONGODB_URI` (MongoDB Atlas) has to be set. Step-by-step: **[../DEPLOYMENT.md](../DEPLOYMENT.md)**, Option 1.

`server/src/app.js` builds the Express app; `server/src/index.js` connects and listens (used by `npm start` / `npm run dev`); `server/src/db.js` holds the shared MongoDB connection.
