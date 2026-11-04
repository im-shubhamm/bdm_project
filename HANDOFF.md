# Handoff: PL Transfer Value Intelligence

## 1. What this project is

A BDM coursework build that mirrors the structure of an IPL auction-value project, applied to the **Premier League transfer market**:

- Star schema in `data/processed/`
- Value Index = impact share ÷ fee share (never average VI)
- MERN dashboard with Market, Clubs, Value Map, Steals, Roles, Brackets, Players, Squad Builder, Methodology

## 2. Team

- Shubham — 2023IMG048
- Arkadip Siddha — 2023IMG009
- Advitya Ranjan — 2023IMG004
- Chayan Das — 2023IMG017

## 3. Data contract

One collection per file in `data/processed/`:

| File | Grain |
| --- | --- |
| players | one player |
| teams | one club |
| seasons | one PL season (start year) |
| team_seasons | club × season |
| player_seasons | player × season × club (**main fact**) |
| auction_buys | one transfer purchase (fee in £m as `PriceCr`) |
| team_matches | club × match result row |
| unsold_players | failed 2025 window targets |

Football field mapping (same columns as the IPL reference schema):

| Column | Meaning here |
| --- | --- |
| PriceCr | Fee £m |
| Runs | Goals |
| Wickets | Assists |
| BallsFaced | Minutes |
| Catches | Tackles |
| Stumpings | Clean sheets |
| Fours | Shots |
| Sixes | Key passes |
| Nationality | English / Overseas |
| Role | Forward / Midfielder / Defender / Goalkeeper |
| PriceSource=Auction | Fee attached (arrival season) |

## 4. Run the web app

```bash
cd web/server && npm install && npm run dev   # :43141, auto-seed
cd web/client && npm install && npm run dev   # :43140
```

If `MONGODB_URI` is unset, the API starts **mongodb-memory-server** and seeds from `data/processed/`.

## 5. Pages → APIs

Same routes as the reference pattern: `/api/summary`, `/api/seasons`, `/api/team-seasons`, `/api/player-seasons`, `/api/rankings/*`, `/api/breakdown`, `/api/players`, `/api/squad-builder/pool`.

## 6. Rules that keep Value Index honest

1. Value metrics use priced rows only (`PriceSource === "Auction"`).
2. Never average `ValueIndex` — sum seasonal shares, then divide.
3. Rankings require `Matches >= 5`.
4. Rank overpaid by `OverpayCr` (£m lost), not lowest VI.
5. Format money with `formatMoney` as £m.
