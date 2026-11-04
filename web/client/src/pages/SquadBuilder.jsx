/**
 * SquadBuilder.jsx — PL Squad Builder & Transfer Budget Simulator.
 *
 * Premier League features:
 * 1. Keep contracted core players at £0 window cost (£18m, £14m, £11m, £4m Uncapped).
 * 2. Club retention templates from the API.
 * 3. Live budget: window buys count against the transfer budget (default £100m).
 * 4. 18–25 player squad with Starting XI (11) + bench reserves.
 * 5. Full valuation engine: Squad Value Index, Rating Score, Knapsack Auto-Draft, CSV Export.
 */
import { useState, useMemo, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { formatMoney, formatVI, formatNum } from '../lib/format';
import {
  IPL_RULES,
  getPlayerEffectivePrice,
  validateSquad,
  computeSquadMetrics,
  selectBestXIFromSquad,
  autoDraftFullSquad,
} from '../lib/optimizer';
import Loading from '../components/Loading';
import SoWhat from '../components/SoWhat';
import Icon from '../components/Icon';
import { PageHeader } from '../components/ui';

export default function SquadBuilder() {
  const [season, setSeason] = useState(2024);
  const [purseCap, setPurseCap] = useState(100);
  const [selectedFranchise, setSelectedFranchise] = useState('CUSTOM');
  const [teamName, setTeamName] = useState('My Custom Club');
  const [squad, setSquad] = useState([]);
  const [playingXIKeys, setPlayingXIKeys] = useState(new Set());
  const [activeTab, setActiveTab] = useState('xi'); // 'xi' | 'squad'
  const [marketTab, setMarketTab] = useState('all'); // 'all' | 'auction' | 'retained'
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [sortBy, setSortBy] = useState('vi');
  const [copied, setCopied] = useState(false);

  // Fetch pool data from backend
  const { data, loading } = useApi(`/squad-builder/pool?season=${season}`);

  const auctionPool = data?.auctionPool || [];
  const retainedPool = data?.retainedPool || [];
  const allPlayers = data?.allPlayers || [];
  const franchiseTemplates = data?.franchiseTemplates || {};
  const leagueSpendCr = data?.leagueSpendCr || 215.45;
  const leaguePricedImpact = data?.leaguePricedImpact || 48000;

  // Real-time valuation metrics
  const metrics = useMemo(() => {
    return computeSquadMetrics(squad, playingXIKeys, leagueSpendCr, leaguePricedImpact, purseCap);
  }, [squad, playingXIKeys, leagueSpendCr, leaguePricedImpact, purseCap]);

  // Set of all drafted player keys
  const draftedKeys = useMemo(() => new Set(squad.map(p => p.playerKey)), [squad]);

  // Handle club template selection
  const handleSelectTemplate = tmplKey => {
    setSelectedFranchise(tmplKey);

    if (tmplKey === 'CUSTOM') {
      setTeamName('My Custom Club');
      setSquad([]);
      setPlayingXIKeys(new Set());
      return;
    }

    const tmpl = franchiseTemplates[tmplKey];
    if (!tmpl) return;

    setTeamName(tmpl.name);

    // Find retained players matching template IDs
    const preloadedRetained = [];
    const targetIds = new Set(tmpl.retainedPlayerIds);

    for (const p of retainedPool) {
      if (targetIds.has(p.id) || targetIds.has(p.playerKey)) {
        preloadedRetained.push(p);
      }
    }

    // Assign effective prices according to retention ladder
    const preloadedWithPrices = [];
    let cappedCount = 0;

    for (const p of preloadedRetained) {
      let price = IPL_RULES.UNCAPPED_RETENTION_PRICE;
      if (p.retentionType === 'Capped') {
        const slabIdx = Math.min(cappedCount, IPL_RULES.CAPPED_RETENTION_LADDER.length - 1);
        price = IPL_RULES.CAPPED_RETENTION_LADDER[slabIdx];
        cappedCount++;
      }
      preloadedWithPrices.push({ ...p, effectivePrice: price });
    }

    setSquad(preloadedWithPrices);
    const xi = selectBestXIFromSquad(preloadedWithPrices);
    setPlayingXIKeys(xi);
  };

  // Add player to squad
  const handleAddPlayer = player => {
    if (draftedKeys.has(player.playerKey)) return;
    if (squad.length >= IPL_RULES.MAX_SQUAD_SIZE) {
      alert(`Squad is at maximum squad capacity (${IPL_RULES.MAX_SQUAD_SIZE} players).`);
      return;
    }

    const isOverseas = player.nationality === 'Overseas';
    const currentOverseas = squad.filter(p => p.nationality === 'Overseas').length;
    if (isOverseas && currentOverseas >= IPL_RULES.MAX_OVERSEAS_SQUAD) {
      alert(`Full squad overseas quota reached! Maximum ${IPL_RULES.MAX_OVERSEAS_SQUAD} overseas players allowed.`);
      return;
    }

    if (player.isRetained) {
      const retainedCount = squad.filter(p => p.isRetained).length;
      if (retainedCount >= IPL_RULES.MAX_RETENTIONS) {
        alert(`Rule: Maximum ${IPL_RULES.MAX_RETENTIONS} retentions allowed per club.`);
        return;
      }
    }

    // Dynamic price calculation
    const effectivePrice = getPlayerEffectivePrice(player, squad);
    const updatedPlayer = { ...player, effectivePrice };
    const updatedSquad = [...squad, updatedPlayer];
    setSquad(updatedSquad);

    // Auto-promote to Starting XI if slots open
    if (playingXIKeys.size < IPL_RULES.PLAYING_XI_SIZE) {
      const currentXIOverseas = updatedSquad.filter(p => playingXIKeys.has(p.playerKey) && p.nationality === 'Overseas').length;
      if (!isOverseas || currentXIOverseas < IPL_RULES.MAX_OVERSEAS_XI) {
        const nextXI = new Set(playingXIKeys);
        nextXI.add(player.playerKey);
        setPlayingXIKeys(nextXI);
      }
    }
  };

  // Remove player from squad
  const handleRemovePlayer = playerKey => {
    const updatedSquad = squad.filter(p => p.playerKey !== playerKey);
    // Re-evaluate ladder prices for remaining capped retentions
    let cappedCount = 0;
    const rePriced = updatedSquad.map(p => {
      if (!p.isRetained) return p;
      if (p.retentionType === 'Uncapped') return { ...p, effectivePrice: IPL_RULES.UNCAPPED_RETENTION_PRICE };
      const slabIdx = Math.min(cappedCount, IPL_RULES.CAPPED_RETENTION_LADDER.length - 1);
      cappedCount++;
      return { ...p, effectivePrice: IPL_RULES.CAPPED_RETENTION_LADDER[slabIdx] };
    });

    setSquad(rePriced);
    const nextXI = new Set(playingXIKeys);
    nextXI.delete(playerKey);
    setPlayingXIKeys(nextXI);
  };

  // Toggle starter / bench
  const handleToggleStarter = playerKey => {
    const nextXI = new Set(playingXIKeys);
    if (nextXI.has(playerKey)) {
      nextXI.delete(playerKey);
    } else {
      if (nextXI.size >= IPL_RULES.PLAYING_XI_SIZE) {
        alert('Starting XI is already full (11 players). Move someone to bench first.');
        return;
      }
      const player = squad.find(p => p.playerKey === playerKey);
      if (player?.nationality === 'Overseas') {
        const currentOverseas = squad.filter(p => nextXI.has(p.playerKey) && p.nationality === 'Overseas').length;
        if (currentOverseas >= IPL_RULES.MAX_OVERSEAS_XI) {
          alert(`Maximum ${IPL_RULES.MAX_OVERSEAS_XI} overseas players allowed in the Starting XI.`);
          return;
        }
      }
      nextXI.add(playerKey);
    }
    setPlayingXIKeys(nextXI);
  };

  // Auto-Select Best XI
  const handleAutoPickXI = () => {
    if (squad.length === 0) return;
    const bestXI = selectBestXIFromSquad(squad);
    setPlayingXIKeys(bestXI);
  };

  // Auto-Draft Full Squad
  const handleAutoDraftSquad = () => {
    if (!auctionPool.length) return;
    const { squad: fullSquad, playingXIKeys: bestXI } = autoDraftFullSquad(auctionPool, squad, purseCap, 20);
    setSquad(fullSquad);
    setPlayingXIKeys(bestXI);
  };

  // Clear squad
  const handleClearSquad = () => {
    if (squad.length === 0) return;
    if (window.confirm('Are you sure you want to clear your squad?')) {
      setSelectedFranchise('CUSTOM');
      setTeamName('My Custom Club');
      setSquad([]);
      setPlayingXIKeys(new Set());
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (squad.length === 0) return;
    const headers = ['Player', 'Acquisition', 'Status', 'Role', 'Nationality', 'Club', 'Fee (£m)', 'Impact Points', 'Value Index'];
    const rows = squad.map(p => [
      `"${p.name}"`,
      p.isRetained ? `Retained (${p.retentionType})` : 'Transfer Buy',
      playingXIKeys.has(p.playerKey) ? 'Starting XI' : 'Bench Reserve',
      p.role,
      p.nationality,
      p.team,
      p.effectivePrice ?? p.priceCr,
      p.impactPoints,
      p.valueIndex ?? 'N/A',
    ]);
    const summaryRows = [
      [],
      ['Total Squad Spend (£m)', metrics.totalSpend],
      ['Retention Spend (£m)', metrics.retentionSpend],
      ['Transfer Spend (£m)', metrics.auctionSpend],
      ['Budget Remaining (£m)', metrics.purseRemaining],
      ['Starting XI Spend (£m)', metrics.xiSpend],
      ['Starting XI Value Index', metrics.xiValueIndex],
      ['Total Squad Impact', metrics.totalSquadImpact],
      ['Starting XI Impact', metrics.xiImpact],
      ['Squad Rating', `${metrics.ratingScore}/100 (${metrics.tier})`],
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(',')), ...summaryRows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${teamName.replace(/\s+/g, '_')}_PL_Squad.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Summary
  const handleCopySummary = () => {
    const starters = squad.filter(p => playingXIKeys.has(p.playerKey));
    const bench = squad.filter(p => !playingXIKeys.has(p.playerKey));

    const text = `⚽ ${teamName} (PL ${season}/${String(season+1).slice(-2)} Squad)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total Spend: £${metrics.totalSpend}m / £${purseCap}m
   ├─ Kept core: £${metrics.retentionSpend}m (${metrics.squadCounts.Retained} players)
   └─ Window buys: £${metrics.auctionSpend}m (${metrics.squadCounts.Auction} players)
💰 Budget left: £${metrics.purseRemaining}m
⭐ Starting XI Value Index: ${metrics.xiValueIndex}× [${metrics.tier}]
⚡ Matchday Impact: ${formatNum(metrics.xiImpact)} pts | Full Squad: ${formatNum(metrics.totalSquadImpact)} pts
👥 Squad Size: ${squad.length} Players (${starters.length} XI Starters + ${bench.length} Bench Reserves)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MATCHDAY PLAYING XI:
${starters.map((p, i) => `${i + 1}. ${p.name} (${p.role}, ${p.nationality}) — £${p.effectivePrice ?? p.priceCr}m [${p.isRetained ? 'Retained' : 'Transfer'}]`).join('\n')}

BENCH RESERVES:
${bench.map((p, i) => `• ${p.name} (${p.role}, ${p.nationality}) — £${p.effectivePrice ?? p.priceCr}m [${p.isRetained ? 'Retained' : 'Transfer'}]`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter marketplace pool
  const filteredPool = useMemo(() => {
    let list = marketTab === 'auction' ? [...auctionPool]
      : marketTab === 'retained' ? [...retainedPool]
      : [...allPlayers];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }

    if (roleFilter !== 'All') {
      list = list.filter(p => p.role === roleFilter);
    }

    if (sortBy === 'vi') {
      list.sort((a, b) => (b.valueIndex || 0) - (a.valueIndex || 0));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => a.priceCr - b.priceCr);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.priceCr - a.priceCr);
    } else if (sortBy === 'impact') {
      list.sort((a, b) => b.impactPoints - a.impactPoints);
    }

    return list;
  }, [auctionPool, retainedPool, allPlayers, marketTab, searchTerm, roleFilter, sortBy]);

  // Group XI by role (accept legacy cricket role labels from API)
  const xiByRole = useMemo(() => {
    const xi = squad.filter(p => playingXIKeys.has(p.playerKey));
    const is = (p, names) => names.includes(p.role);
    return {
      Goalkeeper: xi.filter(p => is(p, ['Goalkeeper', 'Wicket-Keeper'])),
      Defender: xi.filter(p => is(p, ['Defender', 'Bowler'])),
      Midfielder: xi.filter(p => is(p, ['Midfielder', 'All-Rounder'])),
      Forward: xi.filter(p => is(p, ['Forward', 'Batter'])),
    };
  }, [squad, playingXIKeys]);

  if (loading) return <Loading message="Loading transfer market & club cores…" />;

  const spendPct = Math.min(100, Math.round((metrics.totalSpend / purseCap) * 100));

  return (
    <div className="page" id="page-squad-builder">
      <PageHeader
        title="Squad Builder"
        finding={<>Start from a club's real retentions or a blank slate, then draft an 18–25 player squad under a <strong>£{purseCap}m</strong> budget. Every pick is scored on Value Index.</>}
        controls={
          <div className="chip-group">
            <span className="chip__note">Club</span>
            <label className="chip-select">
              <Icon name="database" size={14} style={{ display: 'none' }} />
              <select value={selectedFranchise} onChange={e => handleSelectTemplate(e.target.value)} aria-label="Club preset" style={{ paddingLeft: 14 }}>
                <option value="CUSTOM">Blank slate · £100m budget</option>
                <option value="ARS">Arsenal · core kept</option>
                <option value="MCI">Man City · core kept</option>
                <option value="LIV">Liverpool · core kept</option>
                <option value="CHE">Chelsea · core kept</option>
                <option value="MUN">Man United · core kept</option>
                <option value="TOT">Tottenham · core kept</option>
                <option value="NEW">Newcastle · core kept</option>
                <option value="AVL">Aston Villa · core kept</option>
                <option value="WHU">West Ham · core kept</option>
              </select>
              <Icon name="chevronDown" size={14} />
            </label>
          </div>
        }
      />

      {/* Live Financial & Valuation KPI Strip */}
      <div className="kpi-strip" id="squad-kpis" style={{ marginBottom: '16px' }}>
        {/* Remaining Budget Card */}
        <div className="card kpi">
          <div className="kpi__value" style={{ color: metrics.isOverBudget ? 'var(--pink)' : 'var(--ink)' }}>
            {formatMoney(metrics.purseRemaining)}
          </div>
          <div className="kpi__label">
            {metrics.isOverBudget ? 'Over budget' : 'Budget Remaining'}
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--card-alt)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${spendPct}%`,
                height: '100%',
                background: metrics.isOverBudget ? 'var(--pink)' : spendPct > 85 ? 'var(--accent)' : 'var(--green)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Total Spend Breakdown */}
        <div className="card kpi">
          <div className="kpi__value">{formatMoney(metrics.totalSpend)}</div>
          <div className="kpi__label">
            Total Spend ({spendPct}%) · Ret: {formatMoney(metrics.retentionSpend)} | Xfer: {formatMoney(metrics.auctionSpend)}
          </div>
        </div>

        {/* Squad Size & Bench */}
        <div className="card kpi">
          <div className="kpi__value">
            {squad.length} / {IPL_RULES.MAX_SQUAD_SIZE}
          </div>
          <div className="kpi__label">
            Squad (Min {IPL_RULES.MIN_SQUAD_SIZE}) · Bench: {metrics.bench.length}
          </div>
        </div>

        {/* Starting XI Impact */}
        <div className="card kpi">
          <div className="kpi__value">{formatNum(metrics.xiImpact)}</div>
          <div className="kpi__label">Starting XI Impact (Full: {formatNum(metrics.totalSquadImpact)})</div>
        </div>

        {/* Starting XI Value Index & Rating */}
        <div className="card kpi">
          <div className="kpi__value" style={{ color: metrics.tierColor }}>
            {metrics.xiValueIndex > 0 ? `${metrics.xiValueIndex}×` : '—'}
          </div>
          <div className="kpi__label" style={{ fontWeight: 700, color: metrics.tierColor }}>
            {metrics.tier} ({metrics.ratingScore}/100)
          </div>
        </div>
      </div>

      {/* Dynamic Budget Ledger & Retention Breakdown Banner */}
      {(() => {
        const retPct = Math.min(100, Math.round((metrics.retentionSpend / purseCap) * 100));
        const aucPct = Math.min(100, Math.round((metrics.auctionSpend / purseCap) * 100));
        const remPct = Math.max(0, 100 - retPct - aucPct);
        const auctionPurseLeft = Math.max(0, +(purseCap - metrics.retentionSpend).toFixed(2));

        return (
          <div
            className="card"
            style={{
              padding: '12px 18px',
              marginBottom: '16px',
              background: 'var(--card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--dark)' }}>
                  Transfer budget ledger (£{purseCap.toFixed(1)}m):
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {metrics.squadCounts.Retained > 0 ? (
                    <>
                      <strong>{metrics.squadCounts.Retained} Retentions</strong> cost <strong>£{metrics.retentionSpend}m</strong> → leaving <strong>£{auctionPurseLeft}m</strong> for window bidding.
                    </>
                  ) : (
                    <>
                      <strong>Blank Slate</strong> (0 retentions) → Full <strong>£100m</strong> available for window buys or custom keeps.
                    </>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.78rem', fontWeight: 700, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--blue)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--blue)' }} />
                  Kept: £{metrics.retentionSpend}m ({metrics.squadCounts.Retained} players)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--amber)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--amber)' }} />
                  Window buys: £{metrics.auctionSpend}m ({metrics.squadCounts.Auction} players)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: metrics.isOverBudget ? 'var(--pink)' : 'var(--green-ink)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: metrics.isOverBudget ? 'var(--pink)' : 'var(--green-ink)' }} />
                  {metrics.isOverBudget ? 'Deficit' : 'Unspent budget'}: £{metrics.purseRemaining}m
                </span>
              </div>
            </div>

            {/* Stacked multi-segment progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'var(--card-alt)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
              <div
                title={`Kept core: £${metrics.retentionSpend}m (${retPct}%)`}
                style={{ width: `${retPct}%`, height: '100%', background: 'var(--blue)', transition: 'width 0.3s ease' }}
              />
              <div
                title={`Window buys: £${metrics.auctionSpend}m (${aucPct}%)`}
                style={{ width: `${aucPct}%`, height: '100%', background: 'var(--amber)', transition: 'width 0.3s ease' }}
              />
              <div
                title={`Remaining budget: £${metrics.purseRemaining}m (${remPct}%)`}
                style={{ width: `${remPct}%`, height: '100%', background: metrics.isOverBudget ? 'var(--pink)' : 'var(--green-ink)', opacity: 0.35, transition: 'width 0.3s ease' }}
              />
            </div>
          </div>
        );
      })()}

      {/* Rules & Toolbar Strip */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card-alt)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginRight: '4px' }}>
            Rules Checklist:
          </span>

          <span
            className="pill"
            style={{
              background: metrics.squadChecks.minSize ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--pink) 12%, transparent)',
              color: metrics.squadChecks.minSize ? 'var(--green-ink)' : 'var(--pink-ink)',
              border: `1px solid ${metrics.squadChecks.minSize ? 'var(--green)' : 'var(--pink)'}`,
            }}
          >
            {metrics.squadChecks.minSize ? '✓' : '✗'} Squad: {squad.length}/{IPL_RULES.MIN_SQUAD_SIZE} min (max 25)
          </span>

          <span
            className="pill"
            style={{
              background: metrics.squadChecks.retentions ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--pink) 12%, transparent)',
              color: metrics.squadChecks.retentions ? 'var(--green-ink)' : 'var(--pink-ink)',
              border: `1px solid ${metrics.squadChecks.retentions ? 'var(--green)' : 'var(--pink)'}`,
            }}
          >
            {metrics.squadChecks.retentions ? '✓' : '✗'} Retentions: {metrics.squadCounts.Retained}/{IPL_RULES.MAX_RETENTIONS} max
          </span>

          <span
            className="pill"
            style={{
              background: metrics.squadChecks.overseas ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--pink) 12%, transparent)',
              color: metrics.squadChecks.overseas ? 'var(--green-ink)' : 'var(--pink-ink)',
              border: `1px solid ${metrics.squadChecks.overseas ? 'var(--green)' : 'var(--pink)'}`,
            }}
          >
            {metrics.squadChecks.overseas ? '✓' : '✗'} Squad Overseas: {metrics.squadCounts.Overseas}/{IPL_RULES.MAX_OVERSEAS_SQUAD} max
          </span>

          <span
            className="pill"
            style={{
              background: metrics.xiChecks.size ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--pink) 12%, transparent)',
              color: metrics.xiChecks.size ? 'var(--green-ink)' : 'var(--pink-ink)',
              border: `1px solid ${metrics.xiChecks.size ? 'var(--green)' : 'var(--pink)'}`,
            }}
          >
            {metrics.xiChecks.size ? '✓' : '✗'} Starting XI: {metrics.playingXI.length}/11
          </span>

          <span
            className="pill"
            style={{
              background: metrics.xiChecks.overseas ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--pink) 12%, transparent)',
              color: metrics.xiChecks.overseas ? 'var(--green-ink)' : 'var(--pink-ink)',
              border: `1px solid ${metrics.xiChecks.overseas ? 'var(--green)' : 'var(--pink)'}`,
            }}
          >
            {metrics.xiChecks.overseas ? '✓' : '✗'} XI Overseas: {metrics.xiCounts.Overseas}/{IPL_RULES.MAX_OVERSEAS_XI} max
          </span>
        </div>

        {/* Toolbar Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAutoDraftSquad}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--dark)',
              color: 'var(--on-dark)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Auto-draft with transfer budget
          </button>

          <button
            type="button"
            onClick={handleAutoPickXI}
            disabled={squad.length < 11}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent)',
              color: '#1A1A1E',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: squad.length < 11 ? 'not-allowed' : 'pointer',
              opacity: squad.length < 11 ? 0.5 : 1,
            }}
          >
            Auto-select best XI
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={squad.length === 0}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: squad.length === 0 ? 'not-allowed' : 'pointer',
              opacity: squad.length === 0 ? 0.5 : 1,
            }}
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            disabled={squad.length === 0}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: squad.length === 0 ? 'not-allowed' : 'pointer',
              opacity: squad.length === 0 ? 0.5 : 1,
            }}
          >
            {copied ? 'Copied' : 'Copy summary'}
          </button>

          <button
            type="button"
            onClick={handleClearSquad}
            disabled={squad.length === 0}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'transparent',
              color: 'var(--pink)',
              border: '1px solid color-mix(in srgb, var(--pink) 40%, transparent)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: squad.length === 0 ? 'not-allowed' : 'pointer',
              opacity: squad.length === 0 ? 0.5 : 1,
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Workspace: squad on top, marketplace below */}
      <div className="squad-workspace">
        {/* Squad: Starting XI vs full squad */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--card-alt)', padding: '4px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('xi')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeTab === 'xi' ? 'var(--dark)' : 'transparent',
                  color: activeTab === 'xi' ? 'var(--on-dark)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Starting XI ({metrics.playingXI.length}/11)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('squad')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: activeTab === 'squad' ? 'var(--dark)' : 'transparent',
                  color: activeTab === 'squad' ? 'var(--on-dark)' : 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                Full Squad ({squad.length}/{IPL_RULES.MAX_SQUAD_SIZE})
              </button>
            </div>

            {metrics.isPlayingXIValid && (
              <span className="pill" style={{ background: 'var(--green)', color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>
                ✓ Valid XI Ready
              </span>
            )}
          </div>

          {squad.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--muted)', background: 'var(--card-alt)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--line)' }}>
              
              <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>Your club squad is currently empty</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                Select a club preset above, or draft players from the marketplace pool!
              </p>
            </div>
          ) : activeTab === 'xi' ? (
            /* Tab 1: Starting XI View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(IPL_RULES.XI_ROLES).map(([roleName, targetCount]) => {
                const playersInRole = xiByRole[roleName] || [];
                const emptySlots = Math.max(0, targetCount - playersInRole.length);

                return (
                  <div key={roleName}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {roleName} ({playersInRole.length}/{targetCount})
                      </span>
                    </div>

                    <div className="squad-grid">
                      {playersInRole.map(p => (
                        <div
                          key={p.playerKey}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: 'var(--card-alt)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                                {p.name}
                              </span>
                              {p.isRetained && (
                                <span className="pill" style={{ fontSize: '0.65rem', padding: '1px 6px', background: 'color-mix(in srgb, var(--accent) 25%, transparent)', color: 'var(--accent-ink)', fontWeight: 700 }}>
                                  Retained ({p.retentionType})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                              <span>{p.team}</span>
                              <span>•</span>
                              <span style={{ color: p.nationality === 'Overseas' ? 'var(--blue-ink)' : 'var(--green-ink)', fontWeight: 600 }}>
                                {p.nationality}
                              </span>
                              <span>•</span>
                              <span>{formatNum(p.impactPoints)} pts</span>
                              {p.valueIndex != null && (
                                <>
                                  <span>•</span>
                                  <span style={{ color: 'var(--green-ink)', fontWeight: 700 }}>
                                    VI: {formatVI(p.valueIndex)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                              {formatMoney(p.effectivePrice ?? p.priceCr)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleStarter(p.playerKey)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-pill)',
                                background: 'var(--card)',
                                border: '1px solid var(--line)',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: 'var(--muted)',
                              }}
                              title="Move to bench"
                            >
                              Bench
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Empty Slot Placeholders */}
                      {Array.from({ length: emptySlots }).map((_, idx) => (
                        <div
                          key={`empty-${roleName}-${idx}`}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px dashed var(--line)',
                            color: 'var(--faint)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>+</span>
                          <span>Need {roleName} starter slot #{playersInRole.length + idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Tab 2: Full Squad & Bench View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Starting Starting XI ({metrics.playingXI.length}/11)
                </h3>
                <div className="squad-grid">
                  {metrics.playingXI.map(p => (
                    <div
                      key={p.playerKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'color-mix(in srgb, var(--green) 5%, transparent)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</span>
                        {p.isRetained && (
                          <span style={{ fontSize: '0.68rem', marginLeft: '6px', color: 'var(--accent-ink)', fontWeight: 700 }}>
                            [Retained]
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                          {p.role} · {p.team} · {formatMoney(p.effectivePrice ?? p.priceCr)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStarter(p.playerKey)}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--card)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          Move to Bench
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(p.playerKey)}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-pill)',
                            color: 'var(--pink)',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Bench & Backup Reserves ({metrics.bench.length} players)
                </h3>
                {metrics.bench.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', padding: '12px', background: 'var(--card-alt)', borderRadius: 'var(--radius-sm)' }}>
                    No bench reserves drafted yet. Draft more players to build depth!
                  </div>
                ) : (
                  <div className="squad-grid">
                    {metrics.bench.map(p => (
                      <div
                        key={p.playerKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'var(--card-alt)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                          {p.isRetained && (
                            <span style={{ fontSize: '0.68rem', marginLeft: '6px', color: 'var(--accent-ink)', fontWeight: 700 }}>
                              [Retained]
                            </span>
                          )}
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '8px' }}>
                            {p.role} · {p.team} · {formatMoney(p.effectivePrice ?? p.priceCr)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStarter(p.playerKey)}
                            disabled={metrics.playingXI.length >= 11}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-pill)',
                              background: 'var(--dark)',
                              color: 'var(--on-dark)',
                              opacity: metrics.playingXI.length >= 11 ? 0.5 : 1,
                            }}
                          >
                            Set Starter
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(p.playerKey)}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-pill)',
                              color: 'var(--pink)',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Marketplace: transfer buys and retention candidates */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Player Marketplace</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Draft transfer buys or retain marquee players into your club
            </span>
          </div>

          {/* Marketplace Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', background: 'var(--card-alt)', padding: '4px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => setMarketTab('all')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: marketTab === 'all' ? 'var(--dark)' : 'transparent',
                color: marketTab === 'all' ? 'var(--on-dark)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              All Players ({allPlayers.length})
            </button>
            <button
              type="button"
              onClick={() => setMarketTab('auction')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: marketTab === 'auction' ? 'var(--dark)' : 'transparent',
                color: marketTab === 'auction' ? 'var(--on-dark)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Transfer Buys ({auctionPool.length})
            </button>
            <button
              type="button"
              onClick={() => setMarketTab('retained')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: marketTab === 'retained' ? 'var(--dark)' : 'transparent',
                color: marketTab === 'retained' ? 'var(--on-dark)' : 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Retained Stars ({retainedPool.length})
            </button>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div className="search-box" style={{ maxWidth: '100%' }}>
              <span className="search-box__icon"><Icon name="search" size={16} /></span>
              <input
                type="text"
                placeholder="Search player name (e.g. Salah, Palmer, Haaland)…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--card-alt)', padding: '3px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--line)' }}>
                {['All', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: roleFilter === r ? 'var(--dark)' : 'transparent',
                      color: roleFilter === r ? 'var(--on-dark)' : 'var(--muted)',
                    }}
                  >
                    {r === 'Midfielder' ? 'MID' : r === 'Goalkeeper' ? 'GK' : r === 'Defender' ? 'DEF' : r === 'Forward' ? 'FWD' : r}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <option value="vi">Highest Value Index</option>
                  <option value="impact">Highest Impact Points</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {marketTab === 'retained' && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: '10px',
                background: 'color-mix(in srgb, var(--blue) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                color: 'var(--blue)',
                lineHeight: 1.4,
              }}
            >
              <strong>Homegrown / keep list:</strong> Retaining stars uses the retention ladder (£18m / £14m / £11m / £4m uncapped) against your £100m budget before transfer bidding starts. Maximum 6 retentions per club.
            </div>
          )}

          {/* Player Cards List */}
          <div className="market-grid">
            {filteredPool.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 10px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                No players match your search and filter criteria.
              </div>
            ) : (
              filteredPool.map(p => {
                const isDrafted = draftedKeys.has(p.playerKey);
                const isStarter = playingXIKeys.has(p.playerKey);
                const isOverseas = p.nationality === 'Overseas';
                const currentOverseas = squad.filter(s => s.nationality === 'Overseas').length;
                const overseasSquadMaxed = isOverseas && currentOverseas >= IPL_RULES.MAX_OVERSEAS_SQUAD && !isDrafted;
                const squadMaxed = squad.length >= IPL_RULES.MAX_SQUAD_SIZE && !isDrafted;

                // Estimate dynamic price if drafted
                const dynamicPrice = getPlayerEffectivePrice(p, squad);

                return (
                  <div
                    key={p.playerKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isDrafted ? 'color-mix(in srgb, var(--green) 6%, transparent)' : 'var(--card)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isDrafted ? 'var(--green)' : 'var(--line)'}`,
                      opacity: overseasSquadMaxed || squadMaxed ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                          {p.name}
                        </span>
                        <span className="pill" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--card-alt)' }}>
                          {p.team}
                        </span>
                        {p.isRetained ? (
                          <span
                            className="pill"
                            style={{
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              background: p.retentionType === 'Uncapped' ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--accent) 25%, transparent)',
                              color: p.retentionType === 'Uncapped' ? 'var(--green-ink)' : 'var(--accent-ink)',
                              fontWeight: 700,
                            }}
                          >
                            {p.retentionType === 'Uncapped' ? 'Homegrown keep' : 'Capped Ret.'}
                          </span>
                        ) : (
                          <span className="pill" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'color-mix(in srgb, var(--ink) 6%, transparent)' }}>
                            Transfer
                          </span>
                        )}
                        {isOverseas && (
                          <span className="pill" style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'color-mix(in srgb, var(--blue) 12%, transparent)', color: 'var(--blue-ink)' }}>
                            Overseas
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '3px' }}>
                        {p.role} · {formatNum(p.impactPoints)} Impact pts
                        {p.valueIndex != null && (
                          <>
                            {' '}·{' '}
                            <span style={{ color: 'var(--green-ink)', fontWeight: 700 }}>
                              VI: {formatVI(p.valueIndex)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                        {formatMoney(p.isRetained ? dynamicPrice : p.priceCr)}
                      </span>

                      {isDrafted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-pill)',
                              background: isStarter ? 'var(--green)' : 'var(--card-alt)',
                              color: isStarter ? '#fff' : 'var(--muted)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              border: '1px solid var(--line)',
                            }}
                          >
                            {isStarter ? '★ Starter' : 'Bench'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(p.playerKey)}
                            style={{
                              color: 'var(--pink)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                            }}
                            title="Remove from squad"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={overseasSquadMaxed || squadMaxed}
                          onClick={() => handleAddPlayer(p)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 'var(--radius-pill)',
                            background: overseasSquadMaxed || squadMaxed ? 'var(--card-alt)' : 'var(--dark)',
                            color: overseasSquadMaxed || squadMaxed ? 'var(--faint)' : 'var(--on-dark)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: overseasSquadMaxed || squadMaxed ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {overseasSquadMaxed ? 'Max Overseas (8)' : squadMaxed ? 'Squad Full (25)' : p.isRetained ? '+ Retain' : '+ Draft'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <SoWhat>
        Transfer strategy starts months before the window opens. Clubs that retain their core at retention slabs (£18m, £14m) sacrifice budget flexibility, while clubs that retain few players enter the window with a full budget to construct deep, high-value 20-player squads.
      </SoWhat>
    </div>
  );
}
