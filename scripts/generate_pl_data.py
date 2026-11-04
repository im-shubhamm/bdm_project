#!/usr/bin/env python3
"""
Generate processed tables for Premier League Transfer Value Intelligence.

Same star-schema shape as the IPL BDM reference project so the MERN app
can reuse the Value Index math: PriceCr here means transfer fee in £ millions.
Football stats are stored in the cricket-compatible columns:
  Runs=Goals, Wickets=Assists, BallsFaced=Minutes, Fours=Shots,
  Sixes=KeyPasses, Catches=Tackles, DotBalls=PassAccuracyPts,
  LegalBalls=Touches/10, RunsConceded=GoalsAgainst, Stumpings=CleanSheets,
  Outs=YellowCards, RunOuts=RedCards
"""
from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "processed"
RAW = ROOT / "data" / "raw"
OUT.mkdir(parents=True, exist_ok=True)
(RAW / "transfers").mkdir(parents=True, exist_ok=True)
(RAW / "mappings").mkdir(parents=True, exist_ok=True)

RNG = random.Random(2023048)  # reproducible (team roll seed)

# ---------- Clubs (Big 6 + strong mid-table + a few yo-yo / recent) ----------
TEAMS = [
    ("ARS", "Arsenal", "#EF0107", True),
    ("AVL", "Aston Villa", "#670E36", True),
    ("BHA", "Brighton & Hove Albion", "#0057B8", True),
    ("BOU", "AFC Bournemouth", "#DA291C", True),
    ("BRE", "Brentford", "#E30613", True),
    ("CHE", "Chelsea", "#034694", True),
    ("CRY", "Crystal Palace", "#1B458F", True),
    ("EVE", "Everton", "#003399", True),
    ("FUL", "Fulham", "#000000", True),
    ("LEE", "Leeds United", "#FFCD00", False),
    ("LEI", "Leicester City", "#003090", False),
    ("LIV", "Liverpool", "#C8102E", True),
    ("MCI", "Manchester City", "#6CABDD", True),
    ("MUN", "Manchester United", "#DA291C", True),
    ("NEW", "Newcastle United", "#241F20", True),
    ("NFO", "Nottingham Forest", "#DD0000", True),
    ("SOU", "Southampton", "#D71920", False),
    ("TOT", "Tottenham Hotspur", "#132257", True),
    ("WHU", "West Ham United", "#7A263A", True),
    ("WOL", "Wolverhampton Wanderers", "#FDB913", True),
]

FIRST = [
    "Aaron", "Adam", "Alex", "Andre", "Anthony", "Ben", "Bruno", "Bukayo",
    "Callum", "Cole", "Conor", "Declan", "Diogo", "Dominic", "Edouard", "Enzo",
    "Erling", "Gabriel", "Harvey", "Heung-Min", "Ilkay", "Ivan", "Jack", "James",
    "Jarrod", "Joel", "Jordan", "Josh", "Kai", "Kevin", "Kieran", "Leandro",
    "Lucas", "Luis", "Marcus", "Martin", "Mason", "Matheus", "Mohamed", "Morgan",
    "Nicolas", "Ollie", "Pascal", "Pedro", "Phil", "Raheem", "Richarlison",
    "Rodri", "Romelu", "Rúben", "Scott", "Son", "Thiago", "Trent", "Virgil",
    "Wilfried", "William", "Youri", "Yves", "Zinchenko",
]
LAST = [
    "Almiron", "Alvarez", "Antony", "Bailey", "Bellingham", "Botman", "Bowen",
    "Caicedo", "Casemiro", "Cucurella", "Darwin", "Dias", "Dunk", "Ederson",
    "Eze", "Fernandes", "Foden", "Gakpo", "Guimaraes", "Haaland", "Isak",
    "Jesus", "Kane", "Kulusevski", "Mac Allister", "Maddison", "Martinelli",
    "Mitoma", "Mudryk", "Nunez", "Odegaard", "Palmer", "Pedro", "Rashford",
    "Rice", "Saka", "Saliba", "Salah", "Sanchez", "Solanke", "Sterling",
    "Trossard", "Van Dijk", "Watkins", "Wissa", "Wood", "Zinchenko",
]

ROLES = ["Forward", "Midfielder", "Defender", "Goalkeeper"]
ROLE_WEIGHTS = [0.28, 0.34, 0.30, 0.08]
NATS = ["English", "Overseas"]
NAT_WEIGHTS = [0.38, 0.62]

SEASONS = list(range(2016, 2026))  # 2016/17 … 2025/26 labelled by start year
WINDOW_SEASONS = {2016, 2017, 2019, 2021, 2023, 2025}  # “mega” summer windows

BRACKETS = [
    ("Free / <£5m", 0, 5, 1),
    ("£5–15m", 5, 15, 2),
    ("£15–30m", 15, 30, 3),
    ("£30–50m", 30, 50, 4),
    ("£50–80m", 50, 80, 5),
    ("£80m+", 80, 999, 6),
]


def pid(name: str) -> str:
    return hashlib.md5(name.encode()).hexdigest()[:8]


def bracket_for(fee: float | None):
    if fee is None:
        return "Unpriced", 9
    for label, lo, hi, order in BRACKETS:
        if lo <= fee < hi:
            return label, order
    return "£80m+", 6


def impact_points(role: str, goals: int, assists: int, minutes: int,
                  clean_sheets: int, tackles: int, key_passes: int,
                  shots: int, goals_against: int, yellow: int, red: int) -> int:
    """Football impact on one scale (mirrors IPL Impact Points idea)."""
    base = (
        12 * goals
        + 8 * assists
        + 0.04 * minutes
        + 1.5 * key_passes
        + 0.8 * shots
        + 1.2 * tackles
        - 1.5 * yellow
        - 6 * red
    )
    if role in ("Defender", "Goalkeeper"):
        base += 10 * clean_sheets
        base -= 0.8 * goals_against
    if role == "Goalkeeper":
        base += 2 * clean_sheets
    return max(0, int(round(base)))


ANCHORS = [
    "Erling Haaland", "Mohamed Salah", "Bukayo Saka", "Declan Rice",
    "Cole Palmer", "Phil Foden", "Kevin De Bruyne", "Virgil van Dijk",
    "Son Heung-Min", "Bruno Fernandes", "Alexander Isak", "Ollie Watkins",
    "Kai Havertz", "Enzo Fernandez", "Moises Caicedo", "Anthony Gordon",
    "Jarrod Bowen", "Morgan Gibbs-White", "Eberechi Eze", "Dominic Solanke",
    "Trent Alexander-Arnold", "Martin Odegaard", "Rodri Hernandez",
    "William Saliba", "Gabriel Magalhaes", "Bryan Mbeumo", "Yoane Wissa",
    "Matheus Cunha", "Jean-Philippe Mateta", "Illia Zabarnyi",
]


MIDDLE = ["J", "T", "A", "M", "R", "L", "S", "D", "N", "C"]


def make_name(i: int) -> str:
    # Recognisable anchors first; remaining names are unique synthetic combinations
    if i < len(ANCHORS):
        return ANCHORS[i]
    j = i - len(ANCHORS)
    return f"{FIRST[j % len(FIRST)]} {MIDDLE[j % len(MIDDLE)]}. {LAST[(j * 11) % len(LAST)]}"


def main():
    n_players = 420
    players = []
    player_meta = {}

    for i in range(n_players):
        name = make_name(i)
        role = RNG.choices(ROLES, ROLE_WEIGHTS, k=1)[0]
        nat = RNG.choices(NATS, NAT_WEIGHTS, k=1)[0]
        # Anchors get fixed roles/nats
        fixed = {
            "Erling Haaland": ("Forward", "Overseas"),
            "Mohamed Salah": ("Forward", "Overseas"),
            "Bukayo Saka": ("Forward", "English"),
            "Declan Rice": ("Midfielder", "English"),
            "Cole Palmer": ("Midfielder", "English"),
            "Phil Foden": ("Midfielder", "English"),
            "Kevin De Bruyne": ("Midfielder", "Overseas"),
            "Virgil van Dijk": ("Defender", "Overseas"),
            "Son Heung-Min": ("Forward", "Overseas"),
            "Bruno Fernandes": ("Midfielder", "Overseas"),
            "Alexander Isak": ("Forward", "Overseas"),
            "Ollie Watkins": ("Forward", "English"),
            "Trent Alexander-Arnold": ("Defender", "English"),
            "Martin Odegaard": ("Midfielder", "Overseas"),
            "Rodri Hernandez": ("Midfielder", "Overseas"),
            "William Saliba": ("Defender", "Overseas"),
            "Enzo Fernandez": ("Midfielder", "Overseas"),
            "Moises Caicedo": ("Midfielder", "Overseas"),
        }
        if name in fixed:
            role, nat = fixed[name]
        p = {
            "PlayerID": pid(name),
            "PlayerName": name,
            "CricsheetName": name,  # kept for schema parity
            "Role": role,
            "RoleSource": "TransferMarkt+Club",
            "Nationality": nat,
            "LatestTeamKey": None,
            "FirstSeason": None,
            "LastSeason": None,
            "HasCricsheetID": True,
            "EverAuctioned": False,
            "SeasonsPlayed": 0,
            "CareerMatches": 0,
            "CareerRuns": 0,          # Goals
            "CareerWickets": 0,       # Assists
            "CareerImpactPoints": 0,
            "CareerSpendCr": 0.0,
            "TotalAuctionSpendCr": 0.0,
            "CareerValueIndex": None,
        }
        players.append(p)
        player_meta[p["PlayerID"]] = {"role": role, "nat": nat, "name": name}

    teams = [
        {
            "TeamKey": k,
            "TeamName": n,
            "ShortCode": k,
            "TeamColour": c,
            "IsActive": a,
        }
        for k, n, c, a in TEAMS
    ]
    active_keys = [t["TeamKey"] for t in teams if t["IsActive"]]
    all_keys = [t["TeamKey"] for t in teams]
    colour = {t["TeamKey"]: t["TeamColour"] for t in teams}

    # Famous transfer fees (approx, for demo realism) — fee in £m, season = arrival year
    SIGNATURE = {
        ("Erling Haaland", 2022, "MCI"): (60.0, 51.0),
        ("Declan Rice", 2023, "ARS"): (105.0, 90.0),
        ("Moises Caicedo", 2023, "CHE"): (115.0, 100.0),
        ("Enzo Fernandez", 2023, "CHE"): (106.8, 100.0),
        ("Alexander Isak", 2022, "NEW"): (63.0, 55.0),
        ("Kai Havertz", 2023, "ARS"): (65.0, 60.0),
        ("Cole Palmer", 2023, "CHE"): (42.5, 40.0),  # from City — cheap relative to output
        ("Bukayo Saka", 2019, "ARS"): (None, None),  # academy / unpriced
        ("Phil Foden", 2017, "MCI"): (None, None),
        ("Mohamed Salah", 2017, "LIV"): (39.0, 36.0),
        ("Virgil van Dijk", 2018, "LIV"): (75.0, 70.0),
        ("Bruno Fernandes", 2020, "MUN"): (55.0, 47.0),
        ("Son Heung-Min", 2016, "TOT"): (22.0, 18.0),
        ("Kevin De Bruyne", 2016, "MCI"): (55.0, 50.0),
        ("Ollie Watkins", 2020, "AVL"): (28.0, 25.0),
        ("Anthony Gordon", 2023, "NEW"): (45.0, 40.0),
        ("Jarrod Bowen", 2020, "WHU"): (22.0, 18.0),
        ("Eberechi Eze", 2020, "CRY"): (17.0, 15.0),
        ("Dominic Solanke", 2024, "TOT"): (65.0, 55.0),
        ("William Saliba", 2019, "ARS"): (27.0, 25.0),
        ("Martin Odegaard", 2021, "ARS"): (30.0, 25.0),
        ("Rodri Hernandez", 2019, "MCI"): (62.8, 55.0),
        ("Trent Alexander-Arnold", 2016, "LIV"): (None, None),
        ("Gabriel Magalhaes", 2020, "ARS"): (26.0, 23.0),
        ("Bryan Mbeumo", 2019, "BRE"): (5.8, 5.0),
        ("Yoane Wissa", 2021, "BRE"): (8.5, 7.0),
        ("Matheus Cunha", 2023, "WOL"): (43.0, 40.0),
        ("Jean-Philippe Mateta", 2021, "CRY"): (12.0, 10.0),
        ("Illia Zabarnyi", 2023, "BOU"): (25.0, 22.0),
        ("Morgan Gibbs-White", 2022, "NFO"): (25.0, 22.0),
    }

    # Assign each player a primary club affinity and career span
    careers = {}
    sig_by_name = {nm: (sy, tk, fee) for (nm, sy, tk), (fee, _base) in SIGNATURE.items()}
    for p in players:
        if p["PlayerName"] in sig_by_name:
            sy, tk, fee = sig_by_name[p["PlayerName"]]
            start = min(sy, 2018) if fee is None else max(2016, sy - 1)
            end = 2025
            club = tk
        else:
            start = RNG.choice(SEASONS[:6])
            end = RNG.randint(max(start, 2022), 2025)
            club = RNG.choice(active_keys if end >= 2023 else all_keys)
        careers[p["PlayerID"]] = {"start": start, "end": end, "home": club}
        p["FirstSeason"] = start
        p["LastSeason"] = end
        p["LatestTeamKey"] = club

    auction_buys = []
    player_seasons = []
    team_season_stats = {f"{tk}|{s}": {"wins": 0, "played": 0, "spend": 0.0, "impact": 0.0, "priced": 0}
                         for tk in all_keys for s in SEASONS}

    # Build transfers + seasons
    for p in players:
        pid_ = p["PlayerID"]
        meta = player_meta[pid_]
        career = careers[pid_]
        signed_fee = None
        signed_season = None
        signed_team = career["home"]

        # Signature transfers
        for (nm, sy, tk), (fee, base) in SIGNATURE.items():
            if nm == p["PlayerName"]:
                if sy < 2016:
                    sy = 2016
                signed_fee, signed_season, signed_team = fee, sy, tk
                career["home"] = tk
                p["LatestTeamKey"] = tk
                if fee is not None:
                    p["EverAuctioned"] = True
                break

        if signed_season is None:
            # Random transfer during career for ~55% of players
            if RNG.random() < 0.55:
                signed_season = RNG.randint(career["start"], career["end"])
                signed_team = RNG.choice(active_keys)
                # Fee distribution: log-normal-ish
                role_mult = {"Forward": 1.2, "Midfielder": 1.0, "Defender": 0.85, "Goalkeeper": 0.7}[meta["role"]]
                mega = 1.35 if signed_season in WINDOW_SEASONS else 1.0
                raw = RNG.lognormvariate(2.6, 0.75) * role_mult * mega  # median ~£13–20m
                signed_fee = round(min(120.0, max(0.5, raw)), 1)
                p["EverAuctioned"] = True
                p["LatestTeamKey"] = signed_team
                career["home"] = signed_team

        if signed_fee is not None and signed_season is not None:
            b_label, b_order = bracket_for(signed_fee)
            base = round(signed_fee * RNG.uniform(0.55, 0.92), 1)
            auction_buys.append({
                "AuctionKey": f"{signed_season}|{pid_}|{signed_team}",
                "PlayerID": pid_,
                "TeamKey": signed_team,
                "Season": signed_season,
                "AuctionName": f"Summer {signed_season}",
                "AuctionRole": meta["role"],
                "Capped": meta["nat"] == "English",
                "BasePriceCr": base,
                "PriceCr": signed_fee,
                "PriceBracket": b_label,
                "PriceBracketOrder": b_order,
                "MatchPass": 1,
                "IsMatched": True,
                "PlayerName": p["PlayerName"],
            })
            p["TotalAuctionSpendCr"] = signed_fee
            p["CareerSpendCr"] = signed_fee

        # Season rows
        for season in range(career["start"], career["end"] + 1):
            team = signed_team if (signed_season and season >= signed_season) else career["home"]
            # Academy / loan noise: occasionally different mid-table club early
            if signed_season and season < signed_season and RNG.random() < 0.3:
                team = RNG.choice(all_keys)

            matches = RNG.randint(8, 38) if RNG.random() > 0.08 else RNG.randint(0, 7)
            minutes = 0 if matches == 0 else int(matches * RNG.uniform(55, 90))
            role = meta["role"]

            if role == "Forward":
                goals = max(0, int(RNG.gauss(matches * 0.35, 3)))
                assists = max(0, int(RNG.gauss(matches * 0.18, 2)))
                clean = 0
                ga = 0
            elif role == "Midfielder":
                goals = max(0, int(RNG.gauss(matches * 0.15, 2)))
                assists = max(0, int(RNG.gauss(matches * 0.25, 2.5)))
                clean = 0
                ga = 0
            elif role == "Defender":
                goals = max(0, int(RNG.gauss(matches * 0.05, 1)))
                assists = max(0, int(RNG.gauss(matches * 0.08, 1)))
                clean = max(0, int(RNG.gauss(matches * 0.28, 2)))
                ga = max(0, int(RNG.gauss(matches * 1.1, 4)))
            else:
                goals = max(0, int(RNG.gauss(0.1, 0.4)))
                assists = max(0, int(RNG.gauss(0.15, 0.5)))
                clean = max(0, int(RNG.gauss(matches * 0.30, 2)))
                ga = max(0, int(RNG.gauss(matches * 1.2, 5)))

            # Force strong demo seasons for marquee names (arrival + peak years)
            forced = {
                "Erling Haaland": {2022: (36, 8, 34), 2023: (27, 5, 31), 2024: (22, 5, 30)},
                "Mohamed Salah": {2017: (32, 10, 36), 2021: (23, 13, 35), 2024: (29, 18, 38)},
                "Cole Palmer": {2023: (22, 11, 34), 2024: (15, 8, 30)},
                "Bukayo Saka": {2022: (14, 11, 38), 2023: (16, 9, 35), 2024: (12, 10, 34)},
                "Alexander Isak": {2022: (10, 1, 22), 2023: (21, 2, 30), 2024: (23, 6, 34)},
                "Declan Rice": {2023: (7, 8, 38), 2024: (3, 6, 35)},
                "Kevin De Bruyne": {2017: (8, 16, 36), 2019: (13, 20, 32), 2021: (15, 8, 30)},
                "Virgil van Dijk": {2018: (2, 2, 38), 2019: (5, 1, 38)},
                "Bruno Fernandes": {2020: (18, 12, 37), 2021: (10, 14, 36)},
                "Ollie Watkins": {2020: (14, 5, 37), 2023: (19, 13, 37)},
                "Son Heung-Min": {2016: (14, 6, 34), 2021: (23, 7, 35)},
                "Enzo Fernandez": {2023: (3, 2, 28), 2024: (4, 6, 30)},
                "Moises Caicedo": {2023: (1, 2, 30), 2024: (1, 3, 32)},
                "Kai Havertz": {2023: (13, 7, 37), 2024: (9, 5, 30)},
                "Anthony Gordon": {2023: (11, 10, 35)},
                "Jarrod Bowen": {2020: (8, 5, 30), 2021: (12, 10, 36)},
                "Eberechi Eze": {2020: (4, 6, 28), 2023: (11, 6, 30)},
                "Martin Odegaard": {2021: (7, 4, 36), 2022: (15, 7, 37)},
                "Rodri Hernandez": {2019: (3, 2, 35), 2023: (8, 9, 34)},
                "William Saliba": {2022: (2, 1, 38), 2023: (2, 1, 38)},
                "Dominic Solanke": {2024: (9, 3, 28)},
            }
            if p["PlayerName"] in forced and season in forced[p["PlayerName"]]:
                goals, assists, matches = forced[p["PlayerName"]][season]
                minutes = int(matches * RNG.uniform(78, 90))

            tackles = max(0, int(RNG.gauss(matches * (2.2 if role != "Goalkeeper" else 0.1), 4)))
            key_passes = max(0, int(RNG.gauss(matches * (1.4 if role in ("Midfielder", "Forward") else 0.4), 3)))
            shots = max(0, int(RNG.gauss(matches * (2.5 if role == "Forward" else 1.0), 4)))
            yellow = max(0, int(RNG.gauss(matches * 0.12, 1)))
            red = 1 if RNG.random() < 0.04 else 0
            pass_pts = max(0, int(minutes * RNG.uniform(0.02, 0.05)))

            imp = impact_points(role, goals, assists, minutes, clean, tackles, key_passes, shots, ga, yellow, red)

            priced = (
                signed_fee is not None
                and signed_season is not None
                and season == signed_season
            )
            # Attribute fee to arrival season only (like auction buy season)
            price = signed_fee if priced else None
            price_source = "Auction" if priced else ("Auction" if (
                signed_fee is not None and signed_season is not None and season > signed_season
                and season == signed_season  # never
            ) else "Unpriced")

            # For value metrics: price only on the transfer season (arrival year),
            # but also credit subsequent seasons with amortized? Reference IPL scores
            # the auction season performance against that buy. We attribute the fee
            # to the arrival season AND keep priced rows for that season only.
            # Additionally create a "contract season" view: fee attached only at arrival.
            if signed_fee is not None and signed_season is not None and season == signed_season:
                price_source = "Auction"
                price = signed_fee
            elif signed_fee is not None and signed_season is not None and season > signed_season:
                # Retained / already signed — unpriced for VI (like IPL retentions)
                price_source = "Unpriced"
                price = None
            else:
                price_source = "Unpriced"
                price = None

            b_label, b_order = bracket_for(price)
            base_price = None
            if price is not None:
                buy = next((b for b in auction_buys if b["PlayerID"] == pid_ and b["Season"] == season), None)
                base_price = buy["BasePriceCr"] if buy else round(price * 0.75, 1)

            row = {
                "PlayerSeasonKey": f"{season}|{pid_}|{team}",
                "PlayerID": pid_,
                "PlayerName": p["PlayerName"],
                "Season": season,
                "TeamKey": team,
                "TeamSeasonKey": f"{team}|{season}",
                "Role": role,
                "Nationality": meta["nat"],
                "Matches": matches,
                "Runs": goals,
                "BallsFaced": minutes,
                "Fours": shots,
                "Sixes": key_passes,
                "Outs": yellow,
                "Wickets": assists,
                "LegalBalls": max(0, minutes // 10),
                "RunsConceded": ga,
                "DotBalls": pass_pts,
                "Catches": tackles,
                "Stumpings": clean,
                "RunOuts": red,
                "ImpactPoints": imp,
                "PriceSource": price_source,
                "AuctionSeason": signed_season,
                "PriceCr": price,
                "BasePriceCr": base_price,
                "PriceBracket": b_label if price is not None else "Unpriced",
                "PriceBracketOrder": b_order if price is not None else 9,
                "SeasonMedianPriceCr": None,  # filled later
                "SeasonMedianImpact": None,
                "ValueQuadrant": None,
                "FairValueCr": None,
                "OverpayCr": None,
                "ValueIndex": None,
            }
            player_seasons.append(row)

            p["SeasonsPlayed"] += 1
            p["CareerMatches"] += matches
            p["CareerRuns"] += goals
            p["CareerWickets"] += assists
            p["CareerImpactPoints"] += imp

            ts = team_season_stats[f"{team}|{season}"]
            ts["impact"] += imp
            if price is not None:
                ts["spend"] += price
                ts["priced"] += 1

    # Team matches — 38 GW approx, generate win records with strength bias
    strength = {
        "MCI": 0.72, "LIV": 0.68, "ARS": 0.64, "CHE": 0.55, "TOT": 0.52, "MUN": 0.50,
        "NEW": 0.48, "AVL": 0.46, "BHA": 0.42, "WHU": 0.40, "CRY": 0.38, "FUL": 0.37,
        "BRE": 0.36, "WOL": 0.35, "EVE": 0.34, "NFO": 0.33, "BOU": 0.32, "LEI": 0.30,
        "LEE": 0.28, "SOU": 0.26,
    }
    team_matches = []
    mid = 0
    for season in SEASONS:
        season_teams = [t for t in all_keys if not (
            (t == "LEE" and season in (2023, 2024)) or
            (t == "SOU" and season in (2023,)) or
            (t == "LEI" and season in (2023,)) or
            (t == "NFO" and season < 2022) or
            (t == "BOU" and season in (2019, 2020))
        )]
        # Ensure 20 clubs-ish
        while len(season_teams) < 20:
            for t in all_keys:
                if t not in season_teams:
                    season_teams.append(t)
                if len(season_teams) >= 20:
                    break
        season_teams = season_teams[:20]

        # Each team plays 38 — we store one row per team per "match slot" simplified:
        # 19 home + 19 away abstracted as 38 results
        for tk in season_teams:
            wins = 0
            for gw in range(1, 39):
                mid += 1
                p_win = strength.get(tk, 0.35) + RNG.uniform(-0.08, 0.08)
                # Efficiency boost: clubs with higher spend-adjusted impact win more
                ts = team_season_stats[f"{tk}|{season}"]
                if ts["spend"] > 0:
                    eff = ts["impact"] / (ts["spend"] * 40 + 1)
                    p_win = min(0.85, p_win + min(0.12, eff * 0.02))
                won = 1 if RNG.random() < p_win else 0
                # draws ~25% of non-wins abstracted as no-result=0 still counts
                no_result = 0
                if won == 0 and RNG.random() < 0.28:
                    # treat draw as not win, still a result
                    pass
                wins += won
                team_matches.append({
                    "TeamMatchKey": f"{mid}|{tk}",
                    "TeamSeasonKey": f"{tk}|{season}",
                    "MatchID": mid,
                    "TeamKey": tk,
                    "Season": season,
                    "MatchDate": f"{season + (1 if gw > 20 else 0)}-{(gw % 12) + 1:02d}-{min(28, 1 + gw)}",
                    "Venue": "Home" if gw % 2 else "Away",
                    "Won": won,
                    "NoResult": no_result,
                })
            ts = team_season_stats[f"{tk}|{season}"]
            ts["played"] = 38
            ts["wins"] = wins

    # Season medians + VI for priced rows
    from statistics import median

    seasons_out = []
    for season in SEASONS:
        rows = [r for r in player_seasons if r["Season"] == season]
        priced = [r for r in rows if r["PriceSource"] == "Auction" and r["PriceCr"] is not None]
        impacts = [r["ImpactPoints"] for r in priced] or [0]
        prices = [r["PriceCr"] for r in priced] or [0]
        med_imp = float(median(impacts)) if impacts else 0.0
        med_price = float(median(prices)) if prices else 0.0
        league_impact = sum(r["ImpactPoints"] for r in priced)
        league_spend = sum(r["PriceCr"] for r in priced)

        for r in rows:
            r["SeasonMedianImpact"] = round(med_imp, 1)
            r["SeasonMedianPriceCr"] = round(med_price, 2)
            if r["PriceSource"] != "Auction" or r["PriceCr"] is None:
                r["ValueQuadrant"] = "Unpriced"
                continue
            if r["Matches"] < 5:
                r["ValueQuadrant"] = "Too few matches"
                r["FairValueCr"] = None
                r["OverpayCr"] = None
                r["ValueIndex"] = None
                continue
            # Fair value & VI
            if league_impact > 0 and league_spend > 0:
                fair = r["ImpactPoints"] * (league_spend / league_impact)
                r["FairValueCr"] = round(fair, 2)
                r["OverpayCr"] = round(r["PriceCr"] - fair, 2)
                share_i = r["ImpactPoints"] / league_impact
                share_s = r["PriceCr"] / league_spend
                r["ValueIndex"] = round(share_i / share_s, 2) if share_s > 0 else None
            hi_p = r["PriceCr"] >= med_price
            hi_i = r["ImpactPoints"] >= med_imp
            if hi_p and hi_i:
                r["ValueQuadrant"] = "Star"
            elif (not hi_p) and hi_i:
                r["ValueQuadrant"] = "Steal"
            elif hi_p and (not hi_i):
                r["ValueQuadrant"] = "Overpaid"
            else:
                r["ValueQuadrant"] = "Passenger"

        buys = [b for b in auction_buys if b["Season"] == season]
        spend = round(sum(b["PriceCr"] for b in buys), 2)
        top = max(buys, key=lambda b: b["PriceCr"]) if buys else None
        # Top scorer / assist among priced+all
        top_g = max(rows, key=lambda r: r["Runs"]) if rows else None
        top_a = max(rows, key=lambda r: r["Wickets"]) if rows else None
        seasons_out.append({
            "Season": season,
            "SeasonLabel": f"PL {season}/{str(season+1)[-2:]}",
            "IsMegaAuction": season in WINDOW_SEASONS,
            "AuctionType": "Open Window" if season in WINDOW_SEASONS else "Standard Window",
            "Matches": 380,
            "PlayersBought": len(buys),
            "AuctionSpendCr": spend,
            "AvgPriceCr": round(spend / len(buys), 2) if buys else 0,
            "MedianPriceCr": round(med_price, 2),
            "TopBuyPlayer": next((p["PlayerName"] for p in players if p["PlayerID"] == top["PlayerID"]), None) if top else None,
            "TopBuyPriceCr": top["PriceCr"] if top else None,
            "TopRunScorer": top_g["PlayerName"] if top_g else None,
            "TopRunScorerRuns": top_g["Runs"] if top_g else None,
            "TopWicketTaker": top_a["PlayerName"] if top_a else None,
            "TopWicketTakerWickets": top_a["Wickets"] if top_a else None,
            "LeaguePricedImpact": league_impact,
            "LeagueSpendCr": spend,
            "LeaguePricedPlayers": len(priced),
        })

    # Career VI for players
    for p in players:
        priced_rows = [r for r in player_seasons if r["PlayerID"] == p["PlayerID"] and r["ValueIndex"] is not None]
        if not priced_rows:
            p["CareerValueIndex"] = None
            continue
        # Proper share method across seasons
        imp_share = spend_share = 0.0
        for r in priced_rows:
            s = next(x for x in seasons_out if x["Season"] == r["Season"])
            if s["LeaguePricedImpact"] and s["LeagueSpendCr"]:
                imp_share += r["ImpactPoints"] / s["LeaguePricedImpact"]
                spend_share += (r["PriceCr"] or 0) / s["LeagueSpendCr"]
        p["CareerValueIndex"] = round(imp_share / spend_share, 2) if spend_share else None

    team_seasons = []
    for season in SEASONS:
        sinfo = next(x for x in seasons_out if x["Season"] == season)
        for tk in all_keys:
            key = f"{tk}|{season}"
            ts = team_season_stats[key]
            if ts["played"] == 0 and ts["priced"] == 0 and ts["impact"] == 0:
                continue
            played = ts["played"] or 38
            wins = ts["wins"]
            win_pct = wins / played if played else 0
            # Team VI from priced players that season
            priced_rows = [r for r in player_seasons
                           if r["Season"] == season and r["TeamKey"] == tk and r["PriceSource"] == "Auction"]
            spend = sum(r["PriceCr"] or 0 for r in priced_rows)
            imp = sum(r["ImpactPoints"] for r in priced_rows)
            if spend > 0 and sinfo["LeagueSpendCr"] > 0 and sinfo["LeaguePricedImpact"] > 0:
                vi = (imp / sinfo["LeaguePricedImpact"]) / (spend / sinfo["LeagueSpendCr"])
            else:
                vi = None
            team_seasons.append({
                "TeamSeasonKey": key,
                "TeamSeasonLabel": f"{tk} {season}/{str(season+1)[-2:]}",
                "TeamKey": tk,
                "Season": season,
                "TeamColour": colour[tk],
                "Played": played,
                "Results": played,
                "Wins": wins,
                "WinPct": round(win_pct, 4),
                "SpendCr": round(spend, 2),
                "PricedPlayers": len(priced_rows),
                "ImpactPoints": imp,
                "ValueIndex": round(vi, 2) if vi is not None else None,
                "LakhPerPoint": round((spend * 100) / imp, 2) if imp else None,  # £0.01m per point
            })

    # Failed targets / free agents (parallel to unsold)
    unsold = []
    free_names = [
        "Karim Benzema", "Sergio Ramos", "Mesut Ozil", "Gareth Bale",
        "Eden Hazard", "Angel Di Maria", "Radamel Falcao", "Neymar Jr",
        "Kylian Mbappe", "Vinicius Junior", "Jude Bellingham", "Florian Wirtz",
        "Pedri Gonzalez", "Gavi Paez", "Lamine Yamal", "Jamal Musiala",
        "Xavi Simons", "Randal Kolo Muani", "Khvicha Kvaratskhelia", "Victor Osimhen",
    ]
    for i, nm in enumerate(free_names):
        unsold.append({
            "Season": 2025,
            "Player": nm,
            "BasePriceCr": round(RNG.uniform(20, 150), 1),
            "CareerMatches": RNG.randint(40, 250),
            "CareerImpact": RNG.randint(200, 4000),
            "LastIplSeason": RNG.choice([2022, 2023, 2024, None]),
        })

    # Write processed
    def dump(name, data):
        path = OUT / name
        path.write_text(json.dumps(data, indent=1))
        # CSV
        if not data:
            return
        import csv
        csv_path = OUT / name.replace(".json", ".csv")
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(data[0].keys()))
            w.writeheader()
            for row in data:
                w.writerow(row)
        print(f"  {name}: {len(data)} rows")

    print("Writing processed tables…")
    dump("players.json", players)
    dump("teams.json", teams)
    dump("seasons.json", seasons_out)
    dump("team_seasons.json", team_seasons)
    dump("player_seasons.json", player_seasons)
    dump("auction_buys.json", auction_buys)
    dump("team_matches.json", team_matches)
    dump("unsold_players.json", unsold)

    # Raw sample transfers extract
    import csv
    raw_path = RAW / "transfers" / "pl_transfers_2016_2025.csv"
    with raw_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["Season", "Player", "Club", "Role", "Nationality", "FeeGBP_m", "AskingGBP_m"])
        w.writeheader()
        for b in auction_buys:
            pl = next(p for p in players if p["PlayerID"] == b["PlayerID"])
            w.writerow({
                "Season": b["Season"],
                "Player": pl["PlayerName"],
                "Club": b["TeamKey"],
                "Role": b["AuctionRole"],
                "Nationality": pl["Nationality"],
                "FeeGBP_m": b["PriceCr"],
                "AskingGBP_m": b["BasePriceCr"],
            })

    map_path = RAW / "mappings" / "club_map.csv"
    with map_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["RawName", "TeamKey", "TeamName"])
        w.writeheader()
        for t in teams:
            w.writerow({"RawName": t["TeamName"], "TeamKey": t["TeamKey"], "TeamName": t["TeamName"]})
            w.writerow({"RawName": t["TeamKey"], "TeamKey": t["TeamKey"], "TeamName": t["TeamName"]})

    # Headline QA printout
    s2024 = next(s for s in seasons_out if s["Season"] == 2024)
    s2023 = next(s for s in seasons_out if s["Season"] == 2023)
    print("\nQA snapshot:")
    print(f"  2023 buys: {s2023['PlayersBought']}  spend £{s2023['AuctionSpendCr']}m")
    print(f"  2024 buys: {s2024['PlayersBought']}  spend £{s2024['AuctionSpendCr']}m")
    steals = sorted(
        [r for r in player_seasons if r["Season"] == 2023 and r["ValueIndex"] and r["Matches"] >= 5],
        key=lambda r: -r["ValueIndex"],
    )[:3]
    over = sorted(
        [r for r in player_seasons if r["Season"] == 2023 and r["OverpayCr"] is not None and r["Matches"] >= 5],
        key=lambda r: -r["OverpayCr"],
    )[:3]
    print("  Top steals 2023:", [(r["PlayerName"], r["ValueIndex"], r["PriceCr"]) for r in steals])
    print("  Most overpaid 2023:", [(r["PlayerName"], r["OverpayCr"], r["PriceCr"]) for r in over])


if __name__ == "__main__":
    main()
