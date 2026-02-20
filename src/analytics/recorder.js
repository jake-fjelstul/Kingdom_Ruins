/**
 * Kingdom Ruins – Analytics recorder
 * Buffers events in memory and optionally flushes to JSON/endpoint for the Python pipeline.
 */

import { ANALYTICS_VERSION, EVENTS, PAYLOAD_SCHEMAS, gameStateSnapshot } from './schema';

const MAX_BUFFER = 5000;
const FLUSH_INTERVAL_MS = 30000;

export function createRecorder(options = {}) {
  const {
    onFlush,
    maxBuffer = MAX_BUFFER,
    flushIntervalMs = FLUSH_INTERVAL_MS,
    captureActionTrail = true,
  } = options;

  const buffer = [];
  let sessionId = null;
  let gameStartTs = null;
  let turnStartTs = null;
  let flushTimer = null;

  function getSessionId() {
    if (!sessionId) sessionId = `kr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return sessionId;
  }

  function emit(eventType, payload = {}, state = null) {
    const schema = PAYLOAD_SCHEMAS[eventType];
    const normalized = schema ? schema(payload, state) : payload;
    const event = {
      v: ANALYTICS_VERSION,
      sessionId: getSessionId(),
      ts: Date.now(),
      event: eventType,
      payload: normalized,
    };
    buffer.push(event);
    if (buffer.length >= maxBuffer) flush();
  }

  function flush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    try {
      onFlush?.(batch);
    } catch (e) {
      console.warn('[Kingdom Ruins Analytics] flush failed:', e);
    }
  }

  function startSession() {
    sessionId = null;
    gameStartTs = Date.now();
    getSessionId();
  }

  function setTurnStartTs(ts) {
    turnStartTs = ts ?? Date.now();
  }

  function getTurnDurationMs() {
    return turnStartTs != null ? Date.now() - turnStartTs : null;
  }

  function getGameDurationMs() {
    return gameStartTs != null ? Date.now() - gameStartTs : null;
  }

  function recordAction(action, stateBefore, stateAfter) {
    if (!captureActionTrail) return;
    // Minimal action trail for replay/correlation (action type + state snapshots at key points)
    const actionEvent = {
      v: ANALYTICS_VERSION,
      sessionId: getSessionId(),
      ts: Date.now(),
      event: 'action',
      payload: {
        type: action?.type,
        payload: action?.payload,
        stateBefore: stateBefore ? gameStateSnapshot(stateBefore) : null,
        stateAfter: stateAfter ? gameStateSnapshot(stateAfter) : null,
      },
    };
    buffer.push(actionEvent);
    if (buffer.length >= maxBuffer) flush();
  }

  function recordGameEnd(state, winCondition = 'gauntlet') {
    emit(EVENTS.GAME_END, { winCondition, gameDurationMs: getGameDurationMs() }, state);
    if (flushIntervalMs > 0) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    // Do not flush here so the buffer stays full for "Export analytics (JSON)" and beforeunload persist
  }

  function recordTurnStart(state) {
    setTurnStartTs(Date.now());
    const currentPlayer = state?.players?.[state.currentPlayerIndex];
    emit(EVENTS.TURN_START, { playerId: currentPlayer?.id }, state);
  }

  function recordTurnEnd(state) {
    const currentPlayer = state?.players?.[state.currentPlayerIndex];
    emit(EVENTS.TURN_END, {
      playerId: currentPlayer?.id,
      turnDurationMs: getTurnDurationMs(),
    }, state);
  }

  if (flushIntervalMs > 0) {
    flushTimer = setInterval(flush, flushIntervalMs);
  }

  return {
    emit,
    flush,
    startSession,
    setTurnStartTs,
    getTurnDurationMs,
    getGameDurationMs,
    recordAction,
    recordGameEnd,
    recordTurnStart,
    recordTurnEnd,
    getBuffer: () => [...buffer],
    getSessionId,
  };
}

// Default singleton for app use (set by GameProvider or analytics context)
let defaultRecorder = null;

export function setDefaultRecorder(recorder) {
  defaultRecorder = recorder;
}

export function getDefaultRecorder() {
  return defaultRecorder;
}

/**
 * Export session buffer as JSON (for download or send to local pipeline).
 */
export function exportSessionAsJSON(recorder = defaultRecorder) {
  if (!recorder) return null;
  const buf = recorder.getBuffer();
  recorder.flush();
  return JSON.stringify(buf, null, 0);
}
