# Data

Two layers:

- **`raw/`**: transfer fee extract and club name map used to rebuild demos.
- **`processed/`**: finished tables for the web app (CSV + JSON arrays). Value metrics are precomputed. **The API seeds from these files.**

Money is always in **£ millions** stored in `…Cr` columns for schema compatibility with the reference BDM pipeline (`PriceCr` = fee in £m).

## processed/

| File | Grain | Key |
| --- | --- | --- |
| `players` | one player | `PlayerID` |
| `teams` | one club | `TeamKey` |
| `seasons` | one season 2016–2025 | `Season` |
| `team_seasons` | club × season | `TeamSeasonKey` |
| `player_seasons` | player × season × club | `PlayerSeasonKey` |
| `auction_buys` | one transfer | `AuctionKey` |
| `team_matches` | club × match | `TeamMatchKey` |
| `unsold_players` | failed target | `Season` + `Player` |

### Impact Points

```
12×Goals + 8×Assists + 0.04×Minutes + 1.5×KeyPasses + 0.8×Shots
+ 1.2×Tackles + 10×CleanSheets (DEF/GK) − 1.5×Yellow − 6×Red
```

### Value Index

For priced rows in a season:

```
VI = (Impact / LeaguePricedImpact) / (Fee / LeagueSpend)
FairValue = Impact × (LeagueSpend / LeaguePricedImpact)
Overpay = Fee − FairValue
```

Regenerate:

```bash
python3 scripts/generate_pl_data.py
```
