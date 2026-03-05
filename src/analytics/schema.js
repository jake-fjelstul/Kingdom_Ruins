/**
 * Kingdom Ruins – Analytics event schema
 * Defines event types and payloads for mechanical balance and engagement analysis.
 */

export const ANALYTICS_VERSION = '1.0';

// ─── Event Categories ───────────────────────────────────────────────────────
export const EVENT_GROUPS = {
  GAME_LIFECYCLE: 'game_lifecycle',
  TURN: 'turn',
  MECHANICS: 'mechanics',
  COMBAT: 'combat',
  ENGAGEMENT_PROXY: 'engagement_proxy',
};

// ─── Event Types (quantitative + engagement proxies) ─────────────────────────
export const EVENTS = {
  // Game lifecycle
  GAME_INIT: 'game_init',
  GAME_END: 'game_end',
  FIRST_PLAYER_SET: 'first_player_set',

  // Turn flow
  TURN_START: 'turn_start',
  TURN_END: 'turn_end',
  DICE_ROLL: 'dice_roll',
  MOVEMENT: 'movement',
  INCOME_COLLECTED: 'income_collected',

  // Mechanics
  TERRITORY_PURCHASED: 'territory_purchased',
  CARD_DRAWN: 'card_drawn',
  CARD_EFFECT_APPLIED: 'card_effect_applied',
  COMBAT_START: 'combat_start',
  COMBAT_RESOLVED: 'combat_resolved',
  GAUNTLET_ENTERED: 'gauntlet_entered',
  GAUNTLET_CLASH: 'gauntlet_clash',
  GAUNTLET_END: 'gauntlet_end',

  // Engagement proxies (fiero, agency, downtime)
  FIERO_MOMENT: 'fiero_moment',       // combat win, gauntlet win, big gold swing
  AGENCY_CHOICE: 'agency_choice',     // meaningful decision (e.g. keep/discard, bribe/fight)
  DOWNTIME_START: 'downtime_start',    // not current player, turn began for another
  DOWNTIME_END: 'downtime_end',
};

// ─── Snapshot shape (for end-of-game and periodic state) ─────────────────────
export function playerSnapshot(player) {
  if (!player) return null;
  return {
    id: player.id,
    faction: player.faction,
    position: player.position,
    gold: player.gold ?? 0,
    armyStrength: player.armyStrength ?? 0,
    defenseStrength: player.defenseStrength ?? 0,
    ownedTerritoriesCount: (player.ownedTerritories || []).length,
    handSize: (player.hand || []).length,
  };
}

export function gameStateSnapshot(state) {
  if (!state?.players) return null;
  return {
    ts: Date.now(),
    gamePhase: state.gamePhase,
    currentRound: state.currentRound ?? 0,
    currentPlayerIndex: state.currentPlayerIndex ?? 0,
    victorId: state.victorId ?? null,
    players: state.players.map(playerSnapshot),
    territoriesCount: Object.keys(state.territories || {}).length,
  };
}

// ─── Event payload builders (used by recorder) ───────────────────────────────
export const PAYLOAD_SCHEMAS = {
  [EVENTS.GAME_INIT]: (payload) => ({
    playerCount: payload?.playerCount ?? 0,
    factionOrder: payload?.factionOrder ?? [],
    testingMode: payload?.testingMode ?? false,
  }),

  [EVENTS.GAME_END]: (payload, state) => ({
    victorId: state?.victorId ?? payload?.victorId,
    winCondition: payload?.winCondition ?? 'gauntlet', // 'gauntlet' | 'concession' | other
    gameDurationMs: payload?.gameDurationMs ?? null,
    finalState: gameStateSnapshot(state),
  }),

  [EVENTS.FIRST_PLAYER_SET]: (payload) => ({
    firstPlayerId: payload?.firstPlayerId,
    firstPlayerIndex: payload?.firstPlayerIndex,
    rollSums: payload?.rollSums,
  }),

  [EVENTS.TURN_START]: (payload, state) => ({
    playerId: payload?.playerId ?? state?.players?.[state.currentPlayerIndex]?.id,
    playerIndex: state?.currentPlayerIndex ?? 0,
    round: state?.currentRound ?? 0,
    stateSnapshot: gameStateSnapshot(state),
  }),

  [EVENTS.TURN_END]: (payload, state) => ({
    playerId: payload?.playerId,
    round: state?.currentRound ?? 0,
    turnDurationMs: payload?.turnDurationMs,
    turnSummary: payload?.turnSummary ?? null,
  }),

  [EVENTS.DICE_ROLL]: (payload) => ({
    playerId: payload?.playerId,
    dice: payload?.dice,
    sum: payload?.sum,
    isDoubles: payload?.isDoubles ?? false,
  }),

  [EVENTS.MOVEMENT]: (payload) => ({
    playerId: payload?.playerId,
    fromPosition: payload?.fromPosition,
    toPosition: payload?.toPosition,
    passedStart: payload?.passedStart ?? false,
  }),

  [EVENTS.INCOME_COLLECTED]: (payload) => ({
    playerId: payload?.playerId,
    amount: payload?.amount,
    source: payload?.source, // 'start' | 'territory' | 'card'
  }),

  [EVENTS.TERRITORY_PURCHASED]: (payload) => ({
    territoryId: payload?.territoryId,
    ownerId: payload?.ownerId,
    cost: payload?.cost,
    spaceIndex: payload?.spaceIndex,
  }),

  [EVENTS.CARD_DRAWN]: (payload) => ({
    playerId: payload?.playerId,
    deckType: payload?.deckType,
    cardId: payload?.cardId,
    cardType: payload?.cardType,
  }),

  [EVENTS.CARD_EFFECT_APPLIED]: (payload) => ({
    cardId: payload?.cardId,
    playerId: payload?.playerId,
    targetPlayerId: payload?.targetPlayerId,
    effectSummary: payload?.effectSummary, // e.g. { gold: 100, army: 1 }
  }),

  [EVENTS.COMBAT_START]: (payload) => ({
    attackerId: payload?.attackerId,
    defenderId: payload?.defenderId,
    territoryId: payload?.territoryId,
    source: payload?.source, // 'gauntlet' | 'board'
  }),

  [EVENTS.COMBAT_RESOLVED]: (payload) => ({
    attackerId: payload?.attackerId,
    defenderId: payload?.defenderId,
    winnerId: payload?.winnerId,
    attackerTotal: payload?.attackerTotal,
    defenderTotal: payload?.defenderTotal,
    goldExchange: payload?.goldExchange,
    source: payload?.source,
  }),

  [EVENTS.GAUNTLET_ENTERED]: (payload) => ({
    targetId: payload?.targetId,
    challengerIds: payload?.challengerIds,
  }),

  [EVENTS.GAUNTLET_CLASH]: (payload) => ({
    targetId: payload?.targetId,
    challengerId: payload?.challengerId,
    winnerId: payload?.winnerId,
  }),

  [EVENTS.GAUNTLET_END]: (payload) => ({
    victorId: payload?.victorId,
    wasTargetVictory: payload?.wasTargetVictory,
  }),

  [EVENTS.FIERO_MOMENT]: (payload) => ({
    type: payload?.type, // 'combat_win' | 'gauntlet_win' | 'big_income' | 'territory_steal' | 'comeback'
    playerId: payload?.playerId,
    magnitude: payload?.magnitude, // optional 0–1 scale
    context: payload?.context,
  }),

  [EVENTS.AGENCY_CHOICE]: (payload) => ({
    choiceType: payload?.choiceType, // 'keep_discard_card' | 'bribe_or_fight' | 'income_type' | 'stay_or_travel'
    playerId: payload?.playerId,
    optionsCount: payload?.optionsCount,
  }),

  [EVENTS.DOWNTIME_START]: (payload) => ({
    waitingPlayerIds: payload?.waitingPlayerIds,
    activePlayerId: payload?.activePlayerId,
    round: payload?.round,
  }),

  [EVENTS.DOWNTIME_END]: (payload) => ({
    durationMs: payload?.durationMs,
    waitingPlayerIds: payload?.waitingPlayerIds,
  }),
};
