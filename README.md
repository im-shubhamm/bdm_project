# Premier League Transfer Valuation & Player Performance Intelligence

BDM project. It answers one question for a Premier League club: **which transfer fees earned their price?** Every window buy from 2016/17 to 2025/26 is scored on goals, assists, minutes and defensive actions per £ million. Scores roll up to clubs, roles, nationalities, fee brackets and seasons.

Built in the same pattern as a typical BDM sports-analytics submission: clean processed tables, Value Index methodology, interactive MERN dashboard, and written deliverables.

| Part | Status | Folder |
| --- | --- | --- |
| **Processed data + dictionary** | ✅ | [`data/`](data/) |
| **MERN web app** (Express + Mongo + React/Vite) | ✅ | [`web/`](web/) |
| **Docs** (PRD, handoff, deployment) | ✅ | [`docs/`](docs/), root markdown |
| **Power BI placeholder** | Notes only (web is the live demo) | [`powerbi/`](powerbi/) |

## Team

| Name | Roll no. |
| --- | --- |
| Shubham | 2023IMG048 |
| Arkadip Siddha | 2023IMG009 |
| Advitya Ranjan | 2023IMG004 |
| Chayan Das | 2023IMG017 |

## Repo layout

```
.
├── README.md
├── HANDOFF.md
├── DEPLOYMENT.md
├── data/
│   ├── raw/                transfer CSV extract + club map
│   ├── processed/          star-schema tables (CSV + JSON) for the web app
│   └── README.md           data dictionary
├── scripts/generate_pl_data.py
├── docs/                   PRD and brief
└── web/                    MERN app: client/ (React + Vite), server/ (Express + Mongoose)
```

## Quick start

```bash
# regenerate processed tables (optional)
python3 scripts/generate_pl_data.py

# API (auto in-memory Mongo + seed if MONGODB_URI unset)
cd web/server && npm install && npm run dev

# UI (new terminal) — http://127.0.0.1:43140
cd web/client && npm install && npm run dev
```

Open **[PL Transfer Value](http://127.0.0.1:43140)**. The Vite dev server proxies `/api` to the Express API on port **43141**.

## Headline framing (demo dataset)

- Bargain window buys return several× fair value per £m; £80m+ arrivals often land below 1.0× in year one.
- Spending more does not guarantee a higher win %; spending efficiently (Value Index) correlates better with results.
- 2023 window: **Cole Palmer** (£42.5m) posts a strong Value Index; **Moises Caicedo** and **Enzo Fernandez** rank among the largest £m overpays on arrival-season output.

## Data note

`PriceCr` in the schema means **transfer fee in £ millions** (legacy column name kept so the Value Index pipelines match the reference BDM pattern). Football stats are stored in the shared columns documented in [`data/README.md`](data/README.md).
