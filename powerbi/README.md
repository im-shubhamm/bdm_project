# Power BI

This BDM submission centres on the **MERN web dashboard** (`web/`), which implements the same pages and Value Index rules a Power BI report would show.

To rebuild a Power BI desktop file for viva:

1. Load each CSV in `data/processed/` as a table.
2. Relate on `PlayerID`, `TeamKey`, `Season`, `TeamSeasonKey`.
3. Recreate measures from `docs/PRD_WebApp.md` / `HANDOFF.md` (Value Index must use seasonal shares, never an average of VI).
4. Pages: Home, Market, Clubs, Value Map, Steals, Roles, Brackets, Players, Methodology.

Optional: export a PDF of the web pages into `powerbi/deliverables/` for the report appendix.
