/**
 * optimizer.js — Premier League squad valuation & auto-draft helpers.
 * Export names keep compatibility with SquadBuilder.jsx.
 */

export const IPL_RULES = {
  MIN_SQUAD_SIZE: 18,
  MAX_SQUAD_SIZE: 25,
  DEFAULT_SQUAD_TARGET: 20,
  MAX_OVERSEAS_SQUAD: 17,
  PLAYING_XI_SIZE: 11,
  MAX_OVERSEAS_XI: 17,
  MAX_RETENTIONS: 8,
  MAX_CAPPED_RETENTIONS: 8,
  CAPPED_RETENTION_LADDER: [0, 0, 0, 0, 0],
  UNCAPPED_RETENTION_PRICE: 0,
  XI_ROLES: {
    Goalkeeper: 1,
    Defender: 4,
    Midfielder: 3,
    Forward: 3,
  },
  SQUAD_MIN_ROLES: {
    Goalkeeper: 2,
    Defender: 5,
    Midfielder: 5,
    Forward: 3,
  },
};

export const PL_RULES = IPL_RULES;

export function getPlayerEffectivePrice(player, currentSquad = []) {
  if (player.isRetained) {
    if (player.retentionType === 'Uncapped' || player.retentionType === 'Homegrown') {
      return IPL_RULES.UNCAPPED_RETENTION_PRICE;
    }
    const cappedCount = currentSquad.filter(
      p => p.isRetained && p.retentionType === 'Capped' && p.playerKey !== player.playerKey,
    ).length;
    const slabIndex = Math.min(cappedCount, IPL_RULES.CAPPED_RETENTION_LADDER.length - 1);
    return IPL_RULES.CAPPED_RETENTION_LADDER[slabIndex];
  }
  return player.effectivePrice ?? player.priceCr ?? 0;
}

export function validateSquad(squad, playingXIKeys = new Set(), purseCap = 100) {
  const roleAlias = {
    'Wicket-Keeper': 'Goalkeeper',
    Batter: 'Forward',
    Bowler: 'Defender',
    'All-Rounder': 'Midfielder',
  };
  const squadCounts = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Forward: 0,
    Overseas: 0,
    English: 0,
    Retained: 0,
    Auction: 0,
    CappedRetained: 0,
    UncappedRetained: 0,
  };

  let totalSpend = 0;
  let retentionSpend = 0;
  let auctionSpend = 0;

  for (const p of squad) {
    const role = roleAlias[p.role] || p.role || 'Midfielder';
    if (squadCounts[role] != null) squadCounts[role] += 1;
    const overseas = p.nationality === 'Overseas';
    if (overseas) squadCounts.Overseas += 1;
    else squadCounts.English += 1;
    const price = p.effectivePrice ?? getPlayerEffectivePrice(p, squad);
    totalSpend += price;
    if (p.isRetained) {
      squadCounts.Retained += 1;
      if (p.retentionType === 'Uncapped' || p.retentionType === 'Homegrown') squadCounts.UncappedRetained += 1;
      else squadCounts.CappedRetained += 1;
      retentionSpend += price;
    } else {
      squadCounts.Auction += 1;
      auctionSpend += price;
    }
  }

  const playingXI = squad.filter(p => playingXIKeys.has(p.playerKey));
  const xiCounts = {
    Goalkeeper: 0,
    Defender: 0,
    Midfielder: 0,
    Forward: 0,
    Overseas: 0,
  };
  for (const p of playingXI) {
    const role = roleAlias[p.role] || p.role;
    if (xiCounts[role] != null) xiCounts[role] += 1;
    if (p.nationality === 'Overseas') xiCounts.Overseas += 1;
  }

  const isOverBudget = totalSpend > purseCap + 1e-6;
  const purseRemaining = Math.round((purseCap - totalSpend) * 10) / 10;

  const squadChecks = {
    minSize: squad.length >= IPL_RULES.MIN_SQUAD_SIZE,
    maxSize: squad.length <= IPL_RULES.MAX_SQUAD_SIZE,
    overseas: squadCounts.Overseas <= IPL_RULES.MAX_OVERSEAS_SQUAD,
    retentions: squadCounts.Retained <= IPL_RULES.MAX_RETENTIONS,
    budget: !isOverBudget,
  };

  const xiChecks = {
    size: playingXI.length === IPL_RULES.PLAYING_XI_SIZE,
    overseas: xiCounts.Overseas <= IPL_RULES.MAX_OVERSEAS_XI,
    gk: xiCounts.Goalkeeper >= 1,
  };

  const isFullSquadValid = squadChecks.minSize && squadChecks.maxSize && squadChecks.overseas && squadChecks.budget;
  const isPlayingXIValid = xiChecks.size && xiChecks.gk;

  return {
    totalSpend: Math.round(totalSpend * 10) / 10,
    retentionSpend: Math.round(retentionSpend * 10) / 10,
    auctionSpend: Math.round(auctionSpend * 10) / 10,
    purseRemaining: Math.round(Math.abs(purseRemaining) * 10) / 10,
    isOverBudget,
    squadCounts,
    xiCounts,
    squadChecks,
    xiChecks,
    isFullSquadValid,
    isPlayingXIValid,
    playingXI,
    starters: playingXI,
    bench: squad.filter(p => !playingXIKeys.has(p.playerKey)),
  };
}

export function computeSquadMetrics(
  squad,
  playingXIKeys = new Set(),
  leagueSpendCr = 400,
  leaguePricedImpact = 20000,
  purseCap = 100,
) {
  const val = validateSquad(squad, playingXIKeys, purseCap);

  let totalSquadImpact = 0;
  for (const p of squad) totalSquadImpact += p.impactPoints || 0;

  let xiImpact = 0;
  let xiSpend = 0;
  let xiRuns = 0;
  let xiWickets = 0;

  for (const p of val.playingXI) {
    xiImpact += p.impactPoints || 0;
    const price = p.effectivePrice ?? getPlayerEffectivePrice(p, squad);
    xiSpend += price;
    xiRuns += p.runs || p.goals || 0;
    xiWickets += p.wickets || p.assists || 0;
  }
  xiSpend = +xiSpend.toFixed(2);

  let xiValueIndex = 0;
  if (xiSpend > 0 && leagueSpendCr > 0 && leaguePricedImpact > 0) {
    const impShare = xiImpact / leaguePricedImpact;
    const spendShare = xiSpend / leagueSpendCr;
    xiValueIndex = spendShare > 0 ? +(impShare / spendShare).toFixed(2) : 0;
  }

  let squadValueIndex = 0;
  if (val.totalSpend > 0 && leagueSpendCr > 0 && leaguePricedImpact > 0) {
    const impShare = totalSquadImpact / leaguePricedImpact;
    const spendShare = val.totalSpend / leagueSpendCr;
    squadValueIndex = spendShare > 0 ? +(impShare / spendShare).toFixed(2) : 0;
  }

  const xiScore = Math.min(40, (xiImpact / 4000) * 40);
  const effScore = Math.min(30, (squadValueIndex / 2.0) * 30);
  const squadSizeRatio = Math.min(1, squad.length / IPL_RULES.MIN_SQUAD_SIZE);
  const depthScore = Math.round(squadSizeRatio * 20 + (val.isPlayingXIValid ? 10 : 0));

  let ratingScore = Math.round(xiScore + effScore + depthScore);
  if (val.isOverBudget) ratingScore = Math.max(0, ratingScore - 40);

  let tier = 'Drafting';
  let tierLabel = `${squad.length}/${IPL_RULES.MIN_SQUAD_SIZE} Min Squad`;
  let tierColor = 'var(--muted)';

  if (val.isOverBudget) {
    tier = 'Over Budget';
    tierLabel = 'Budget Exceeded';
    tierColor = 'var(--pink)';
  } else if (val.isFullSquadValid && val.isPlayingXIValid) {
    if (ratingScore >= 88 && squadValueIndex >= 1.8) {
      tier = 'S Tier';
      tierLabel = 'Title Contender';
      tierColor = 'var(--green)';
    } else if (ratingScore >= 75) {
      tier = 'A Tier';
      tierLabel = 'European Places';
      tierColor = 'var(--accent)';
    } else {
      tier = 'B Tier';
      tierLabel = 'Mid-table Squad';
      tierColor = 'var(--blue)';
    }
  } else if (val.isPlayingXIValid) {
    tier = 'XI Ready';
    tierLabel = `Need ${Math.max(0, IPL_RULES.MIN_SQUAD_SIZE - squad.length)} more squad players`;
    tierColor = 'var(--accent)';
  }

  return {
    ...val,
    totalSquadImpact,
    xiImpact,
    xiSpend,
    xiRuns,
    xiWickets,
    xiValueIndex,
    squadValueIndex,
    ratingScore,
    tier,
    tierLabel,
    tierColor,
  };
}

export function selectBestXIFromSquad(squad) {
  if (!squad || squad.length === 0) return new Set();

  const byRole = {
    Goalkeeper: [],
    Defender: [],
    Midfielder: [],
    Forward: [],
  };

  for (const p of squad) {
    if (byRole[p.role]) byRole[p.role].push(p);
    else byRole.Midfielder.push(p);
  }

  for (const r of Object.keys(byRole)) {
    byRole[r].sort((a, b) => (b.impactPoints || 0) - (a.impactPoints || 0));
  }

  const selected = [];
  let overseasCount = 0;

  function pick(role, count) {
    const list = byRole[role] || [];
    let picked = 0;
    for (const p of list) {
      if (picked >= count) break;
      if (selected.some(s => s.playerKey === p.playerKey)) continue;
      const isOverseas = p.nationality === 'Overseas';
      if (isOverseas && overseasCount >= IPL_RULES.MAX_OVERSEAS_XI) continue;
      selected.push(p);
      if (isOverseas) overseasCount++;
      picked++;
    }
  }

  pick('Goalkeeper', IPL_RULES.XI_ROLES.Goalkeeper);
  pick('Defender', IPL_RULES.XI_ROLES.Defender);
  pick('Midfielder', IPL_RULES.XI_ROLES.Midfielder);
  pick('Forward', IPL_RULES.XI_ROLES.Forward);

  if (selected.length < IPL_RULES.PLAYING_XI_SIZE) {
    const remaining = squad
      .filter(p => !selected.some(s => s.playerKey === p.playerKey))
      .sort((a, b) => (b.impactPoints || 0) - (a.impactPoints || 0));
    for (const p of remaining) {
      if (selected.length >= IPL_RULES.PLAYING_XI_SIZE) break;
      const isOverseas = p.nationality === 'Overseas';
      if (isOverseas && overseasCount >= IPL_RULES.MAX_OVERSEAS_XI) continue;
      selected.push(p);
      if (isOverseas) overseasCount++;
    }
  }

  return new Set(selected.map(p => p.playerKey));
}

export function autoDraftFullSquad(pool, initialSquad = [], purseCap = 100, targetSize = IPL_RULES.DEFAULT_SQUAD_TARGET) {
  const squad = [...initialSquad];
  const retainedKeys = new Set(squad.map(p => p.playerKey));

  let currentSpend = squad.reduce((sum, p) => sum + (p.effectivePrice ?? p.priceCr ?? 0), 0);
  let overseasCount = squad.filter(p => p.nationality === 'Overseas').length;

  const byRole = {
    Goalkeeper: [],
    Defender: [],
    Midfielder: [],
    Forward: [],
  };

  for (const p of pool) {
    if (retainedKeys.has(p.playerKey)) continue;
    if (byRole[p.role]) byRole[p.role].push(p);
    else byRole.Midfielder.push(p);
  }

  for (const r of Object.keys(byRole)) {
    byRole[r].sort((a, b) => (b.valueIndex || 0) - (a.valueIndex || 0) || (b.impactPoints || 0) - (a.impactPoints || 0));
  }

  function tryAdd(p) {
    if (squad.some(s => s.playerKey === p.playerKey)) return false;
    const isOverseas = p.nationality === 'Overseas';
    if (isOverseas && overseasCount >= IPL_RULES.MAX_OVERSEAS_SQUAD) return false;
    const remainingSlots = targetSize - (squad.length + 1);
    const minReserveNeeded = remainingSlots * 0.5;
    if (currentSpend + (p.priceCr || 0) + minReserveNeeded > purseCap) return false;
    squad.push({ ...p, effectivePrice: p.priceCr });
    currentSpend += p.priceCr || 0;
    if (isOverseas) overseasCount++;
    return true;
  }

  const targets = { Goalkeeper: 2, Defender: 6, Midfielder: 7, Forward: 5 };
  for (const [r, target] of Object.entries(targets)) {
    for (const p of byRole[r]) {
      if (squad.filter(s => s.role === r).length >= target) break;
      tryAdd(p);
    }
  }

  const allRemaining = [...pool]
    .filter(p => !squad.some(s => s.playerKey === p.playerKey))
    .sort((a, b) => (b.valueIndex || 0) - (a.valueIndex || 0) || (a.priceCr || 0) - (b.priceCr || 0));

  for (const p of allRemaining) {
    if (squad.length >= targetSize) break;
    tryAdd(p);
  }

  const playingXIKeys = selectBestXIFromSquad(squad);
  return { squad, playingXIKeys };
}

export const suggestPlayingXI = selectBestXIFromSquad;
