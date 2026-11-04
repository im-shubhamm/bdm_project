# Superstore Sales & Profitability Intelligence (BDM)

Business Data Management project. We take a **real retail dataset from the internet**, load it into **MongoDB**, model it for **Power BI**, and present where Superstore makes (and loses) money — especially in **Furniture / housewares** vs Technology.

## Team
| Name | Roll |
| --- | --- |
| Shubham | 2023IMG048 |
| Arkadip Siddha | 2023IMG009 |
| Advitya Ranjan | 2023IMG004 |
| Chayan Das | 2023IMG017 |

## Dataset (internet)
- **Sample Superstore** public CSV (Tableau/Power BI classic sample)
- URL: https://raw.githubusercontent.com/ThigasSantos/BaseSuperStore/main/sales.csv
- Local copy: `data/raw/Sample_Superstore.csv`
- ~9,994 lines · 2016–2019 · Furniture, Office Supplies, Technology

## What’s in the repo
| Piece | Path |
| --- | --- |
| Raw + processed data | `data/` |
| ETL script | `scripts/etl/build_superstore.py` |
| MongoDB API | `web/server/` |
| Web dashboard (demo) | `web/client/` |
| Power BI CSVs + DAX + page guide | `powerbi/` |
| Report & demo script | `docs/` |

## Quick start
```bash
# optional: refresh processed tables
python3 scripts/etl/build_superstore.py

# API (auto in-memory MongoDB + seed)
cd web/server && npm install && npm run dev    # :43151

# UI
cd web/client && npm install && npm run dev    # :43150
```

Open **http://127.0.0.1:43150**

### Power BI
On a Windows laptop with Power BI Desktop, import CSVs from `powerbi/data/` and follow `powerbi/README.md`.

## Headline findings
- Sales ≈ **$2.30M**, profit ≈ **$286k**, margin ≈ **12.5%**
- **Tables** and **Bookcases** destroy Furniture profit
- **High discounts** drive loss-making lines
- **Copiers / Phones / Accessories** carry profitability

## Note on GitHub remote
Push target can be updated when you share your repository URL (`git remote set-url origin <your-repo>`).
