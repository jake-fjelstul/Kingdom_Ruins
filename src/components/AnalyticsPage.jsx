import React, { useState, useEffect, useMemo } from 'react';

function getFinalState(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.event === 'game_end') {
      const p = e.payload || {};
      return p.finalState;
    }
    if (e?.event === 'action') {
      const p = e.payload || {};
      return p.stateAfter;
    }
  }
  return null;
}

function iterSessions(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  const sorted = [...events].sort((a, b) => {
    const sidA = a.sessionId || '';
    const sidB = b.sessionId || '';
    if (sidA !== sidB) return sidA.localeCompare(sidB);
    return (a.ts || 0) - (b.ts || 0);
  });
  const sessions = [];
  let currentId = null;
  let current = [];
  for (const e of sorted) {
    const sid = e.sessionId || '';
    if (!sid) continue;
    if (sid !== currentId) {
      if (current.length) sessions.push([currentId, current]);
      currentId = sid;
      current = [];
    }
    current.push(e);
  }
  if (current.length) sessions.push([currentId, current]);
  return sessions;
}

function computeWinRateByTurnOrder(sessions) {
  const winsByOrder = {};
  let gamesCount = 0;
  for (const [, events] of sessions) {
    const state = getFinalState(events);
    if (!state?.players?.length) continue;
    const victorId = state.victorId;
    const winnerIdx = state.players.findIndex((p) => p.id === victorId);
    if (winnerIdx === -1) continue;
    gamesCount += 1;
    winsByOrder[winnerIdx] = (winsByOrder[winnerIdx] || 0) + 1;
  }
  const total = gamesCount || 1;
  return Object.entries(winsByOrder).map(([order, wins]) => ({
    turn_order: Number(order),
    wins,
    games_total: gamesCount,
    win_rate: wins / total,
  }));
}

function computeFactionWinRates(sessions) {
  const factionWins = {};
  const factionGames = {};
  let totalGames = 0;
  for (const [, events] of sessions) {
    const state = getFinalState(events);
    if (!state?.players?.length) continue;
    totalGames += 1;
    const victorId = state.victorId;
    for (const p of state.players) {
      const f = p.faction || 'unknown';
      factionGames[f] = (factionGames[f] || 0) + 1;
      if (p.id === victorId) factionWins[f] = (factionWins[f] || 0) + 1;
    }
  }
  const n = totalGames || 1;
  const result = {};
  for (const [f, games] of Object.entries(factionGames)) {
    const wins = factionWins[f] || 0;
    result[f] = { wins, games_played: games, win_rate_pct: (100 * wins) / n };
  }
  return { total_games: totalGames, faction_win_rates: result };
}

function computeRunawayLeader(sessions) {
  const goldGaps = [];
  const territoryGaps = [];
  const GOLD_THRESHOLD = 500;
  const TERR_THRESHOLD = 2;
  for (const [, events] of sessions) {
    const state = getFinalState(events);
    if (!state?.players?.length) continue;
    const victorId = state.victorId;
    const winner = state.players.find((p) => p.id === victorId);
    const others = state.players.filter((p) => p.id !== victorId);
    if (!winner || !others.length) continue;
    const wGold = winner.gold ?? 0;
    const wTerr = winner.ownedTerritoriesCount ?? 0;
    const oGold = others.reduce((s, p) => s + (p.gold ?? 0), 0) / others.length;
    const oTerr = others.reduce((s, p) => s + (p.ownedTerritoriesCount ?? 0), 0) / others.length;
    goldGaps.push(wGold - oGold);
    territoryGaps.push(wTerr - oTerr);
  }
  const out = {};
  if (goldGaps.length) {
    const mean = goldGaps.reduce((a, b) => a + b, 0) / goldGaps.length;
    const sorted = [...goldGaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    out.gold_gap_mean = mean;
    out.gold_gap_median = median;
    out.runaway_gold_pct = (100 * goldGaps.filter((g) => g >= GOLD_THRESHOLD).length) / goldGaps.length;
  }
  if (territoryGaps.length) {
    out.territory_gap_mean = territoryGaps.reduce((a, b) => a + b, 0) / territoryGaps.length;
    out.runaway_territory_pct =
      (100 * territoryGaps.filter((g) => g >= TERR_THRESHOLD).length) / territoryGaps.length;
  }
  return out;
}

function computeRoundStats(sessions) {
  const roundCounts = [];
  for (const [, events] of sessions) {
    const state = getFinalState(events);
    if (state && typeof state.currentRound === 'number') roundCounts.push(state.currentRound);
  }
  if (!roundCounts.length) return null;
  const sorted = [...roundCounts].sort((a, b) => a - b);
  const mean = roundCounts.reduce((a, b) => a + b, 0) / roundCounts.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return { rounds_mean: mean, rounds_median: median, count: roundCounts.length };
}

function computeDurationStats(events) {
  const gameDurationsMs = [];
  const turnDurationsMs = [];
  for (const e of events) {
    if (e?.event === 'game_end' && e?.payload?.gameDurationMs != null) {
      gameDurationsMs.push(Number(e.payload.gameDurationMs));
    }
    if (e?.event === 'turn_end' && e?.payload?.turnDurationMs != null) {
      turnDurationsMs.push(Number(e.payload.turnDurationMs));
    }
  }
  const toStats = (arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      mean: arr.reduce((s, n) => s + n, 0) / arr.length,
      median: sorted[Math.floor(sorted.length / 2)],
      count: arr.length,
    };
  };
  return {
    gameDuration: toStats(gameDurationsMs),
    turnDuration: toStats(turnDurationsMs),
  };
}

function formatMs(ms) {
  if (ms == null || ms < 0) return '—';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

/** Human-readable label for board position (perimeter 0–41). */
function getSpaceLabel(position) {
  if (position == null) return 'unknown space';
  const p = Number(position);
  const startPositions = [0, 11, 21, 32];
  if (startPositions.includes(p)) return 'START';
  const newTerritoryIndices = [6, 12, 18, 24, 30, 36];
  const newTerritoryNames = ['Moss Ward', 'The Aqueduct', 'Catacombs', 'Broken Keep', 'Ash Pits', 'Black Spire'];
  const idx = newTerritoryIndices.indexOf(p);
  if (idx >= 0) return newTerritoryNames[idx];
  return `space ${p}`;
}

/** Get action events for a given player in a time range (for building turn narrative). */
function getActionsForTurn(events, playerId, startTs, endTs) {
  const sorted = [...events].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  return sorted.filter((e) => {
    if (e?.event !== 'action' || !e?.payload) return false;
    const t = e.ts ?? 0;
    if (t <= startTs || t > endTs) return false;
    const before = e.payload.stateBefore;
    const cp = before?.players?.[before?.currentPlayerIndex];
    return cp?.id === playerId;
  });
}

/** Build a readable play-by-play narrative from a list of action events (same player's turn). */
function buildTurnNarrativeFromEvents(turnActions, playerId, playerById) {
  const parts = [];
  let lastPosition = null;
  let rollSum = null;
  const defenderFactionById = {};
  if (playerById) {
    Object.entries(playerById).forEach(([id, p]) => {
      if (p?.faction) defenderFactionById[id] = String(p.faction).charAt(0).toUpperCase() + String(p.faction).slice(1);
    });
  }

  for (const e of turnActions) {
    const type = e?.payload?.type;
    const p = e?.payload?.payload ?? e?.payload ?? {};
    const stateBefore = e?.payload?.stateBefore;
    const stateAfter = e?.payload?.stateAfter;

    switch (type) {
      case 'SET_DICE_RESULT': {
        const dice = Array.isArray(p) ? p : (p?.dice ?? e?.payload?.payload ?? []);
        const a = dice[0] ?? 0;
        const b = dice[1] ?? 0;
        rollSum = a + b;
        parts.push(rollSum > 0 ? `Rolled ${rollSum} (${a}+${b})` : 'Rolled dice');
        break;
      }
      case 'MOVE_PLAYER_STEP': {
        const moverId = p?.playerId ?? stateAfter?.players?.[stateAfter?.currentPlayerIndex]?.id;
        if (moverId !== playerId) break;
        const nextPos = stateAfter?.players?.find((pl) => pl.id === playerId)?.position;
        if (nextPos != null) lastPosition = nextPos;
        break;
      }
      case 'MOVE_PLAYER_TO_POSITION':
        if (p?.playerId === playerId && p?.position != null) lastPosition = p.position;
        break;
      case 'DRAW_CARD': {
        const deck = p?.deckType || 'card';
        const label = String(deck).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        parts.push(`Drew ${label} card`);
        break;
      }
      case 'APPLY_CARD_EFFECT':
      case 'APPLY_SPECIAL_RESOURCE':
      case 'APPLY_SPECIAL_ARMY':
      case 'APPLY_SPECIAL_DEFENSE':
      case 'APPLY_SPECIAL_FATE':
        parts.push('Applied card effect');
        break;
      case 'KEEP_DRAWN_CARD':
        parts.push('Kept drawn card');
        break;
      case 'PURCHASE_TERRITORY':
        parts.push(p?.name ? `Bought ${p.name}` : 'Bought territory');
        break;
      case 'PAY_TRIBUTE':
        parts.push(p?.amount != null ? `Paid ${p.amount}G tribute` : 'Paid tribute');
        break;
      case 'ATTACK_PLAYER':
        parts.push('Chose to attack');
        break;
      case 'START_COMBAT': {
        const defId = p?.defenderId;
        const defName = defenderFactionById[defId] || 'opponent';
        parts.push(`Attacked ${defName}`);
        break;
      }
      case 'RESOLVE_COMBAT': {
        const winner = p?.winner ?? p?.winnerId;
        if (winner == null) break;
        const atk = p?.attackerTotal;
        const def = p?.defenderTotal;
        const scores = atk != null && def != null ? ` (${atk} vs ${def})` : '';
        if (winner === playerId) parts.push(`Won combat${scores}`);
        else if (p?.attackerId === playerId || p?.defenderId === playerId) parts.push(`Lost combat${scores}`);
        break;
      }
      case 'SET_LANDED_ON_START':
        parts.push('Landed on START');
        break;
      case 'SET_LANDED_ON_START_CHOICE':
        parts.push('Landed on START (bribe or fight)');
        break;
      case 'PAY_START_BRIBE':
        parts.push(p?.amount != null ? `Paid ${p.amount}G at START` : 'Paid bribe at START');
        break;
      case 'COLLECT_START_INCOME':
        parts.push('Collected income at START');
        break;
      case 'CLEAR_LANDED_ON_START':
        break;
      case 'PURCHASE_INNER_TERRITORY':
        parts.push('Bought inner territory');
        break;
      case 'REQUEST_ENTER_BLUE_RUIN':
        parts.push('Entered Blue Ruin Zone');
        break;
      case 'MERCENARY_DRAW':
        parts.push(p?.deckType ? `Mercenary draw (${p.deckType})` : 'Mercenary draw');
        break;
      case 'USE_DOUBLES_BONUS':
        parts.push('Used doubles bonus');
        break;
      case 'SET_PLAYER_STATS':
        break;
      case 'SET_AI_TURN_SUMMARY':
        break;
      case 'NEXT_TURN':
        break;
      default:
        break;
    }
  }

  if (lastPosition != null && rollSum != null && !parts.some((s) => s.includes('Moved to') || s.includes('Landed on'))) {
    const label = getSpaceLabel(lastPosition);
    parts.push(`Moved to ${label}`);
  } else if (lastPosition != null && rollSum != null && parts.length > 0) {
    const label = getSpaceLabel(lastPosition);
    const lastPart = parts[parts.length - 1];
    if (!lastPart.includes('START') && !lastPart.includes(label)) parts.push(`Landed on ${label}`);
  }

  return parts.length > 0 ? parts.join('. ') : 'No actions recorded';
}

/** Per-session list of turns with round, player, summary (from payload or derived from events), duration. */
function computeTurnSummariesBySession(sessions) {
  return sessions.map(([sessionId, events]) => {
    const finalState = getFinalState(events);
    const playerById = {};
    if (finalState?.players?.length) {
      finalState.players.forEach((p) => {
        playerById[p.id] = p;
      });
    }
    const sortedEvents = [...events].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const turnEnds = sortedEvents
      .filter((e) => (e?.event === 'turn_end' || e?.event === 'turnEnd') && e?.payload != null)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));

    const turns = [];
    let prevTurnEndTs = 0;

    for (const te of turnEnds) {
      const pl = te.payload || {};
      const playerId = pl.playerId;
      const player = playerById[playerId];
      const faction = player?.faction ?? pl.playerId ?? '—';
      const name = typeof faction === 'string' ? faction.charAt(0).toUpperCase() + faction.slice(1) : '—';
      const endTs = te.ts ?? 0;
      const turnActions = getActionsForTurn(events, playerId, prevTurnEndTs, endTs);
      const derivedSummary = buildTurnNarrativeFromEvents(turnActions, playerId, playerById);
      const summary =
        pl.turnSummary != null && String(pl.turnSummary).trim() !== ''
          ? String(pl.turnSummary)
          : derivedSummary;
      turns.push({
        round: pl.round ?? '—',
        playerId,
        playerName: name,
        summary,
        durationMs: pl.turnDurationMs,
      });
      prevTurnEndTs = endTs;
    }

    const turnStarts = sortedEvents.filter((e) => e?.event === 'turn_start' && e?.payload != null);
    const lastTurnEndTs = turnEnds.length > 0 ? (turnEnds[turnEnds.length - 1].ts ?? 0) : 0;
    const gameEndTs = sortedEvents.find((e) => e?.event === 'game_end')?.ts ?? Infinity;
    if (turnStarts.length > turnEnds.length && lastTurnEndTs < gameEndTs) {
      const lastStart = turnStarts[turnStarts.length - 1];
      const ps = lastStart.payload || {};
      const playerId = ps.playerId;
      const player = playerById[playerId];
      const faction = player?.faction ?? playerId ?? '—';
      const name = typeof faction === 'string' ? faction.charAt(0).toUpperCase() + faction.slice(1) : '—';
      const startTs = lastStart.ts ?? 0;
      const turnActions = getActionsForTurn(events, playerId, lastTurnEndTs, gameEndTs + 1);
      const derivedSummary = buildTurnNarrativeFromEvents(turnActions, playerId, playerById);
      turns.push({
        round: ps.round ?? '—',
        playerId,
        playerName: name,
        summary: derivedSummary,
        durationMs: gameEndTs !== Infinity ? gameEndTs - startTs : null,
      });
    }

    return { sessionId, turns, playerById };
  });
}

/** Single flat list of all turns across sessions for prominent display. */
function computeAllTurnsFlat(turnSummariesBySession) {
  const list = [];
  turnSummariesBySession.forEach(({ sessionId, turns }, gameIndex) => {
    turns.forEach((t) => list.push({ ...t, gameIndex: gameIndex + 1, sessionId }));
  });
  return list;
}

export default function AnalyticsPage({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** null = all games, otherwise 0-based index into sessions (which file/game to view). */
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const loadFromManifest = () =>
      fetch('/data/json_files/manifest.json')
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No manifest'))))
        .then((filenames) => {
          if (!Array.isArray(filenames) || filenames.length === 0) return [];
          return Promise.all(
            filenames.map((name) =>
              fetch(`/data/json_files/${encodeURIComponent(name)}`).then((res) => {
                if (!res.ok) return [];
                return res.json();
              })
            )
          ).then((arrays) => arrays.flatMap((a) => (Array.isArray(a) ? a : [])));
        });

    const loadFromSingleFile = () =>
      fetch('/data/events.json')
        .then((r) => {
          if (!r.ok) throw new Error('No data file');
          return r.json();
        })
        .then((data) => (Array.isArray(data) ? data : []));

    loadFromManifest()
      .then((eventsFromManifest) => {
        if (cancelled) return;
        if (eventsFromManifest.length > 0) {
          setEvents(eventsFromManifest);
          setLoading(false);
          return;
        }
        return loadFromSingleFile();
      })
      .then((fallbackEvents) => {
        if (cancelled) return;
        if (fallbackEvents !== undefined) setEvents(fallbackEvents);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        loadFromSingleFile()
          .then((single) => {
            if (cancelled) return;
            setEvents(single);
            setError(single.length === 0 ? err.message : null);
          })
          .catch(() => {
            if (cancelled) return;
            setEvents([]);
            setError(err.message);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      });

    return () => { cancelled = true; };
  }, []);

  const handleFileUpload = (e) => {
    const files = e?.target?.files;
    if (!files?.length) return;
    const read = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            resolve(Array.isArray(data) ? data : []);
          } catch {
            reject(new Error('Invalid JSON'));
          }
        };
        reader.readAsText(file);
      });
    Promise.all(Array.from(files).map(read))
      .then((arrays) => {
        setEvents(arrays.flat());
        setError(null);
      })
      .catch((err) => setError(err?.message || 'Invalid JSON'));
    e.target.value = '';
  };

  const sessions = useMemo(() => iterSessions(events), [events]);

  /** When viewing a single game, restrict to that session; otherwise use all. */
  const filteredSessions = useMemo(() => {
    if (selectedGameIndex == null || selectedGameIndex < 0 || selectedGameIndex >= sessions.length) {
      return sessions;
    }
    return [sessions[selectedGameIndex]];
  }, [sessions, selectedGameIndex]);

  const filteredEvents = useMemo(() => {
    if (selectedGameIndex == null || selectedGameIndex < 0 || selectedGameIndex >= sessions.length) {
      return events;
    }
    const [, sessionEvents] = sessions[selectedGameIndex] || [];
    return Array.isArray(sessionEvents) ? sessionEvents : [];
  }, [events, sessions, selectedGameIndex]);

  const winByOrder = useMemo(() => computeWinRateByTurnOrder(filteredSessions), [filteredSessions]);
  const factionRates = useMemo(() => computeFactionWinRates(filteredSessions), [filteredSessions]);
  const runaway = useMemo(() => computeRunawayLeader(filteredSessions), [filteredSessions]);
  const roundStats = useMemo(() => computeRoundStats(filteredSessions), [filteredSessions]);
  const durationStats = useMemo(() => computeDurationStats(filteredEvents), [filteredEvents]);
  const turnSummariesBySession = useMemo(() => computeTurnSummariesBySession(filteredSessions), [filteredSessions]);
  const allTurnsFlat = useMemo(() => computeAllTurnsFlat(turnSummariesBySession), [turnSummariesBySession]);

  const hasData = sessions.length > 0 && factionRates.total_games > 0;

  /** Keep selection in range when session list changes (e.g. after new upload). */
  const safeSelectedGameIndex =
    selectedGameIndex != null && selectedGameIndex >= 0 && selectedGameIndex < sessions.length
      ? selectedGameIndex
      : null;

  return (
    <div className="min-h-screen bg-[#2d1b4d] text-slate-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-serif tracking-wide text-amber-200">Analytics</h1>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium"
          >
            Back to setup
          </button>
        </div>

        {loading && (
          <p className="text-slate-400">Loading sessions from /data/json_files/ or /data/events.json…</p>
        )}

        {!loading && !hasData && (
          <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-600">
            <p className="text-slate-300 mb-4">
              No analytics data. Put <code className="bg-slate-700 px-1 rounded">kingdom-ruins-analytics-*.json</code> files in{' '}
              <code className="bg-slate-700 px-1 rounded">public/data/json_files/</code> and list them in{' '}
              <code className="bg-slate-700 px-1 rounded">manifest.json</code>, or upload one or more JSON files below.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 cursor-pointer text-white">
              <input type="file" accept=".json" multiple onChange={handleFileUpload} className="hidden" />
              Upload JSON file(s)
            </label>
            {error && <p className="mt-2 text-amber-400">{error}</p>}
          </div>
        )}

        {!loading && hasData && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <p className="text-slate-400">
                {sessions.length} session(s), {factionRates.total_games} completed game(s)
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="analytics-game-select" className="text-slate-400 text-sm whitespace-nowrap">
                  View:
                </label>
                <select
                  id="analytics-game-select"
                  value={safeSelectedGameIndex === null ? '' : String(safeSelectedGameIndex)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedGameIndex(v === '' ? null : parseInt(v, 10));
                  }}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                >
                  <option value="">All games</option>
                  {sessions.map(([sessionId], idx) => (
                    <option key={sessionId} value={idx}>
                      Game {idx + 1}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer text-sm">
                <input type="file" accept=".json" multiple onChange={handleFileUpload} className="hidden" />
                Add or replace with file(s)…
              </label>
            </div>

            <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 mb-6">
              <h2 className="text-xl font-semibold text-amber-200 mb-4">Turn history</h2>
              <p className="text-slate-400 text-sm mb-3">Summary of every turn taken in each game (real and AI players).</p>
              {allTurnsFlat.length > 0 ? (
                <>
                  <h3 className="text-sm font-medium text-amber-100/90 mb-2">All turns ({allTurnsFlat.length})</h3>
                  <ul className="divide-y divide-slate-600 max-h-96 overflow-y-auto mb-6 rounded-lg border border-slate-600">
                    {allTurnsFlat.map((t, i) => (
                      <li key={`all-${i}`} className="px-3 py-2 text-sm bg-slate-800/50">
                        <span className="font-medium text-amber-200/90">R{t.round}</span>
                        <span className="mx-2 text-slate-500">·</span>
                        <span className="text-slate-300 capitalize">{t.playerName}</span>
                        <span className="mx-2 text-slate-500">·</span>
                        <span className="text-slate-200">{t.summary}</span>
                        {t.durationMs != null && (
                          <span className="ml-2 text-slate-500">({formatMs(t.durationMs)})</span>
                        )}
                        <span className="ml-2 text-slate-500 text-xs">Game {t.gameIndex}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <h3 className="text-sm font-medium text-amber-100/90 mb-2">By game</h3>
              <div className="space-y-6">
                {turnSummariesBySession.map(({ sessionId, turns }, idx) => (
                  <div key={sessionId} className="border border-slate-600 rounded-lg overflow-hidden">
                    <h4 className="text-sm font-medium text-amber-100/90 bg-slate-700/80 px-3 py-2">
                      Game {idx + 1} — {turns.length} turn(s)
                    </h4>
                    <ul className="divide-y divide-slate-600 max-h-80 overflow-y-auto">
                      {turns.length === 0 ? (
                        <li className="px-3 py-2 text-slate-500 text-sm">No turn summaries recorded.</li>
                      ) : (
                        turns.map((t, i) => (
                          <li key={`${sessionId}-${i}`} className="px-3 py-2 text-sm">
                            <span className="font-medium text-amber-200/90">R{t.round}</span>
                            <span className="mx-2 text-slate-500">·</span>
                            <span className="text-slate-300 capitalize">{t.playerName}</span>
                            <span className="mx-2 text-slate-500">·</span>
                            <span className="text-slate-200">{t.summary}</span>
                            {t.durationMs != null && (
                              <span className="ml-2 text-slate-500">({formatMs(t.durationMs)})</span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 mb-6">
              <h2 className="text-xl font-semibold text-amber-200 mb-4">Win rate by turn order</h2>
              <p className="text-slate-400 text-sm mb-3">Turn order 0 = first player.</p>
              <ul className="space-y-2">
                {winByOrder.map(({ turn_order, wins, games_total, win_rate }) => (
                  <li key={turn_order} className="flex justify-between text-slate-300">
                    <span>Order {turn_order}</span>
                    <span>{wins} / {games_total} ({(100 * win_rate).toFixed(1)}%)</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 mb-6">
              <h2 className="text-xl font-semibold text-amber-200 mb-4">Faction win rates</h2>
              <ul className="space-y-2">
                {Object.entries(factionRates.faction_win_rates || {}).map(([faction, { wins, win_rate_pct }]) => (
                  <li key={faction} className="flex justify-between text-slate-300 capitalize">
                    <span>{faction}</span>
                    <span>{wins} wins ({win_rate_pct.toFixed(1)}%)</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 mb-6">
              <h2 className="text-xl font-semibold text-amber-200 mb-4">Runaway leader</h2>
              <ul className="space-y-2 text-slate-300">
                {runaway.gold_gap_mean != null && (
                  <li>Mean gold gap (winner vs others): {runaway.gold_gap_mean.toFixed(0)}</li>
                )}
                {runaway.runaway_gold_pct != null && (
                  <li>% games with winner ≥500 gold ahead: {runaway.runaway_gold_pct.toFixed(1)}%</li>
                )}
                {runaway.territory_gap_mean != null && (
                  <li>Mean territory gap: {runaway.territory_gap_mean.toFixed(2)}</li>
                )}
                {runaway.runaway_territory_pct != null && (
                  <li>% games with winner ≥2 territories ahead: {runaway.runaway_territory_pct.toFixed(1)}%</li>
                )}
              </ul>
            </section>

            {roundStats && (
              <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600 mb-6">
                <h2 className="text-xl font-semibold text-amber-200 mb-4">Round duration</h2>
                <p className="text-slate-300">
                  Mean rounds per game: {roundStats.rounds_mean.toFixed(1)} · Median: {roundStats.rounds_median} (n={roundStats.count})
                </p>
              </section>
            )}

            {(durationStats?.gameDuration || durationStats?.turnDuration) && (
              <section className="bg-slate-800/80 rounded-xl p-6 border border-slate-600">
                <h2 className="text-xl font-semibold text-amber-200 mb-4">Time</h2>
                <ul className="space-y-2 text-slate-300">
                  {durationStats.gameDuration && (
                    <li>
                      <span className="font-medium">Game duration</span> (per completed game): mean {formatMs(durationStats.gameDuration.mean)}, median {formatMs(durationStats.gameDuration.median)} (n={durationStats.gameDuration.count})
                    </li>
                  )}
                  {durationStats.turnDuration && (
                    <li>
                      <span className="font-medium">Average turn duration</span>: mean {formatMs(durationStats.turnDuration.mean)}, median {formatMs(durationStats.turnDuration.median)} (n={durationStats.turnDuration.count} turns)
                    </li>
                  )}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
