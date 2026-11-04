/**
 * squadBuilder.js — Interactive Squad Builder & Budget Simulator (Premier League).
 */
import { Router } from 'express';
import PlayerSeason from '../models/PlayerSeason.js';
import Season from '../models/Season.js';

const router = Router();

const CLUB_TEMPLATES = {
  ARS: {
    name: 'Arsenal',
    retainedPlayerIds: ['b898a904', '3c7c6646', '43cbdbae', '0e14e229', '83ec0555', '969d3973'],
    retentionSpendCr: 0,
    notes: 'Core kept: Saka, Rice, Havertz, Saliba, Ødegaard, Gabriel.',
  },
  MCI: {
    name: 'Manchester City',
    retainedPlayerIds: ['3b246ec1', '60d5ca44', 'ab3c925c', '9a48610b'],
    retentionSpendCr: 0,
    notes: 'Core kept: Haaland, Foden, De Bruyne, Rodri.',
  },
  LIV: {
    name: 'Liverpool',
    retainedPlayerIds: ['a2f040c5', 'e400131a', '28cabbc5'],
    retentionSpendCr: 0,
    notes: 'Core kept: Salah, van Dijk, Alexander-Arnold.',
  },
  CHE: {
    name: 'Chelsea',
    retainedPlayerIds: ['137f228b', '79bd4a51', '43dc7a1c'],
    retentionSpendCr: 0,
    notes: 'Core kept: Palmer, Enzo, Caicedo.',
  },
  MUN: {
    name: 'Manchester United',
    retainedPlayerIds: ['e435ee98'],
    retentionSpendCr: 0,
    notes: 'Core kept: Bruno Fernandes.',
  },
  TOT: {
    name: 'Tottenham Hotspur',
    retainedPlayerIds: ['6bd46dac'],
    retentionSpendCr: 0,
    notes: 'Core kept: Son Heung-Min.',
  },
  NEW: {
    name: 'Newcastle United',
    retainedPlayerIds: ['bdf2b5a3', '9c1d2763'],
    retentionSpendCr: 0,
    notes: 'Core kept: Isak, Gordon.',
  },
  AVL: {
    name: 'Aston Villa',
    retainedPlayerIds: ['089f2333'],
    retentionSpendCr: 0,
    notes: 'Core kept: Ollie Watkins.',
  },
  WHU: {
    name: 'West Ham United',
    retainedPlayerIds: ['151fb0f6'],
    retentionSpendCr: 0,
    notes: 'Core kept: Jarrod Bowen.',
  },
};

router.get('/pool', async (req, res, next) => {
  try {
    const seasonQuery = req.query.season ? Number(req.query.season) : 2024;

    const seasonDoc = await Season.findOne({ Season: seasonQuery }).lean();
    const leagueSpendCr = seasonDoc?.LeagueSpendCr || seasonDoc?.AuctionSpendCr || 400;
    const leaguePricedImpact = seasonDoc?.LeaguePricedImpact || 20000;

    const allSeasonPlayers = await PlayerSeason.find({ Season: seasonQuery })
      .select({
        PlayerSeasonKey: 1,
        PlayerID: 1,
        PlayerName: 1,
        Season: 1,
        TeamKey: 1,
        Role: 1,
        Nationality: 1,
        Matches: 1,
        Runs: 1,
        Wickets: 1,
        ImpactPoints: 1,
        PriceSource: 1,
        PriceCr: 1,
        ValueIndex: 1,
        ValueQuadrant: 1,
        OverpayCr: 1,
        FairValueCr: 1,
      })
      .sort({ ImpactPoints: -1 })
      .lean();

    const auctionPool = [];
    const retainedPool = [];

    for (const p of allSeasonPlayers) {
      const isAuction = p.PriceSource === 'Auction' && p.PriceCr > 0;
      const formatted = {
        id: p.PlayerID || p.PlayerSeasonKey,
        playerKey: p.PlayerSeasonKey,
        name: p.PlayerName,
        role: p.Role || 'Midfielder',
        nationality: p.Nationality || 'Overseas',
        team: p.TeamKey || '—',
        isRetained: !isAuction,
        retentionType: !isAuction
          ? (p.Nationality === 'English' ? 'Homegrown' : 'Capped')
          : null,
        priceCr: isAuction
          ? p.PriceCr
          : Math.max(5, Math.round(p.FairValueCr || p.ImpactPoints / 20 || 15)),
        impactPoints: p.ImpactPoints || 0,
        valueIndex: p.ValueIndex ?? null,
        matches: p.Matches || 0,
        runs: p.Runs || 0,
        wickets: p.Wickets || 0,
        goals: p.Runs || 0,
        assists: p.Wickets || 0,
        quadrant: p.ValueQuadrant || 'Unclassified',
      };

      if (isAuction) auctionPool.push(formatted);
      else retainedPool.push(formatted);
    }

    res.json({
      season: seasonQuery,
      leagueSpendCr,
      leaguePricedImpact,
      defaultPurseCr: 100,
      totalAuction: auctionPool.length,
      totalRetained: retainedPool.length,
      totalPlayers: auctionPool.length + retainedPool.length,
      auctionPool,
      retainedPool,
      allPlayers: [...retainedPool, ...auctionPool],
      franchiseTemplates: CLUB_TEMPLATES,
      templates: CLUB_TEMPLATES,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
