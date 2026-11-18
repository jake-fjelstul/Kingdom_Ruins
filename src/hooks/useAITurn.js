import { useEffect, useRef } from 'react';
import {
  useGame,
  canEnterBlueRuinZone,
  INNER_BY_FACTION,
  FACTION_TO_START_INDEX,
  getOuterTerritoryDef,
  MIN_COMBINED_STATS,
  cannotAttack,
  getInnerTerritoryCost,
  getVanguardTargets,
  getCombatStats,
} from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import { roll2d6, randomInt } from '../utils/dice';

/** AI trace logging: silent unless running the dev server with localStorage.kr_ai_debug = '1'. */
const aiLog = (() => {
  try {
    if (import.meta.env?.DEV && globalThis.localStorage?.getItem('kr_ai_debug') === '1') return console.log.bind(console);
  } catch {
    // storage blocked — stay quiet
  }
  return () => {};
})();

/** Rough standing: gold + stats + territories (used to aim harmful cards at whoever is ahead). */
const leaderScore = (p) => (p.gold ?? 0) + 100 * ((p.armyStrength ?? 0) + (p.defenseStrength ?? 0)) + 300 * (p.ownedTerritories?.length ?? 0);

/** Highest-scoring opponent (optionally filtered); ties are broken at random so no seat is singled out. */
function pickTarget(state, me, score, filter = () => true) {
  const options = (state.players || []).filter((p) => p.id !== me.id && filter(p));
  if (!options.length) return null;
  const best = Math.max(...options.map(score));
  const top = options.filter((p) => score(p) === best);
  return top[randomInt(top.length)];
}

// Delays tuned so other players can clearly see what the AI does
const DELAY_MS = 1200;
const ROLL_AND_MOVE_MS = 1600;
const COMBAT_ROLL_MS = 1500;
/** How long a resolved combat result stays on screen before the AI presses Continue */
const COMBAT_RESULT_MS = 3500;
/** Give humans (and AI) time to set bribes before dice are rolled */
const COMBAT_BRIBE_WINDOW_MS = 1500;
/** Hard safety cap so the AI never waits forever for a move to finish */
const MAX_WAIT_FOR_MOVE_MS = 8000;
/** Time the card modal is shown before the AI applies the effect (so players can read it) */
const CARD_DISPLAY_MS = 1800;
const CARD_DISPLAY_PENALTY_MS = 2000;
/** Pause after any action (buy, bribe, apply card, etc.) before continuing */
const AFTER_ACTION_MS = 1500;
/** Pause at start of AI turn so "AI's turn" is obvious */
const TURN_START_MS = 1500;
/** Pause before switching to next player */
const BEFORE_END_TURN_MS = 1500;
/** Wait after movement completes before resolving space (so cards don't appear while token is still animating) */
const POST_MOVE_SETTLE_MS = 500;
/** Minimum time to wait after applying a card before doing anything else (modal must be off screen first) */
const POST_CARD_CLOSE_MS = 900;

const AI_STATES = {
  EVALUATE_BOARD: 'EVALUATE_BOARD',
  MOVEMENT_DECISION: 'MOVEMENT_DECISION',
  WAITING_FOR_MOVE: 'WAITING_FOR_MOVE',
  SPACE_RESOLUTION: 'SPACE_RESOLUTION',
  COMBAT_PHASE: 'COMBAT_PHASE',
  ECONOMY_PHASE: 'ECONOMY_PHASE',
  END_TURN: 'END_TURN',
};


export function useAITurn() {
  const game = useGame();
  const { aiSpeedMultiplier = 1 } = useSettings();
  const runningRef = useRef(false);
  const fsmStateRef = useRef(null);
  const gameRef = useRef(game);
  const turnSummaryRef = useRef([]);
  const lastRollSumRef = useRef(null);
  /** AI triggers its own move (Dice component skips AI); we only call movePlayer once per roll */
  const moveTriggeredRef = useRef(false);
  /** When effect re-runs (e.g. deps change), old timeouts must no-op so we don't get double movement/cards */
  const fsmGenerationRef = useRef(0);
  /** Ensure we only schedule one bribe+roll sequence per combat */
  const combatBribePlannedRef = useRef(false);

  gameRef.current = game;

  useEffect(() => {
    const g = gameRef.current;
    const { gamePhase, players = [], currentPlayerIndex, dispatch } = g;
    const activePlayer = players[currentPlayerIndex];

    if (gamePhase !== 'playing' || !activePlayer?.isAI) {
      runningRef.current = false;
      return;
    }

    if (runningRef.current) return;
    runningRef.current = true;
    const myGen = ++fsmGenerationRef.current;
    turnSummaryRef.current = [];
    lastRollSumRef.current = null;
    fsmStateRef.current = AI_STATES.EVALUATE_BOARD;

    const speed = Math.max(0.25, Math.min(2, Number(aiSpeedMultiplier) || 1));
    // Scale delays by speed; enforce minimums so AI never gets out of sync (cards visible, movement settled)
    const d = (ms) => Math.max(100, Math.round(ms / speed));
    const dCard = (ms) => Math.max(600, Math.round(ms / speed));

    const runStep = (stateName) => {
      if (myGen !== fsmGenerationRef.current) return;
      const state = gameRef.current;
      const {
        players: pList = [],
        currentPlayerIndex: cpi,
        boardSpaces = [],
        territories = {},
        diceRoll,
        isRolling,
        combatActive,
        combatData,
        selectedTerritory,
        landedOnStart,
        landedOnStartChoice,
        attackedPlayers = {},
        attackImmunity = {},
        cardDecks = {},
        cannotBuyTerritories = {},
        territoryCostPlus100 = {},
      } = state;

      const ai = pList[cpi];
      if (!ai || !ai.isAI) {
        runningRef.current = false;
        return;
      }

      const totalSpaces = boardSpaces.length || 1;
      const startIndex = FACTION_TO_START_INDEX[ai.faction] ?? 0;

      switch (stateName) {
        case AI_STATES.EVALUATE_BOARD: {
          aiLog('[AI FSM] EVALUATE_BOARD — start of turn', { playerId: ai.id, gold: ai.gold, army: ai.armyStrength, defense: ai.defenseStrength });

          const combined = (ai.armyStrength ?? 0) + (ai.defenseStrength ?? 0);
          const hasBothInners = (INNER_BY_FACTION[ai.faction] || []).every((id) => (ai.ownedTerritories || []).includes(id));
          const canBlueRuin = ai.gold >= 500 && combined >= MIN_COMBINED_STATS && hasBothInners && canEnterBlueRuinZone(ai, state);

          if (canBlueRuin) {
            aiLog('[AI FSM] EVALUATE_BOARD — endgame: entering Blue Ruin Zone');
            turnSummaryRef.current.push('Entered Blue Ruin Zone');
            g.requestEnterBlueRuin?.();
            runningRef.current = false;
            return;
          }

          // Only consider Vanguard Jump after this AI has completed at least one full turn.
          // aiTurnSummaryByPlayerId[ai.id] is written by SET_AI_TURN_SUMMARY at this AI's END_TURN
          // and reset on INITIALIZE_GAME, so it is a reliable per-player "has taken a turn" marker.
          const hasTakenTurn = !!(state.aiTurnSummaryByPlayerId || {})[ai.id];
          const vanguardTargets = hasTakenTurn ? getVanguardTargets(state) : [];
          if (vanguardTargets.length > 0) {
            // Prefer an unclaimed territory; otherwise clash for an owned one only when clearly stronger
            // (tactical: Army+Defense on both sides, defender gets +1)
            const myPower = (ai.armyStrength ?? 0) + (ai.defenseStrength ?? 0);
            const unclaimed = vanguardTargets.filter((t) => !t.ownerId);
            const winnable = vanguardTargets.filter((t) => {
              const owner = pList.find((p) => p.id === t.ownerId);
              return owner && myPower >= (owner.armyStrength ?? 0) + (owner.defenseStrength ?? 0) + 4;
            });
            const pick = unclaimed.length
              ? unclaimed[randomInt(unclaimed.length)]
              : winnable.length ? winnable[randomInt(winnable.length)] : null;
            if (pick) {
              aiLog('[AI FSM] EVALUATE_BOARD — Vanguard Jump to', pick.name, pick.ownerId ? '(clash)' : '');
              turnSummaryRef.current.push(`Vanguard Jump to ${pick.name} (100G)`);
              g.vanguardJump?.(pick.spaceIndex);
              setTimeout(() => runStep(pick.ownerId ? AI_STATES.COMBAT_PHASE : AI_STATES.SPACE_RESOLUTION), d(DELAY_MS));
              return;
            }
          }

          setTimeout(() => runStep(AI_STATES.MOVEMENT_DECISION), d(DELAY_MS));
          return;
        }

        case AI_STATES.MOVEMENT_DECISION: {
          if (ai.lastDrawnCard) {
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(200));
            return;
          }
          const isDoublesSecondRoll = state.doublesExtraRollAvailable && !state.doublesBonusUsed;
          aiLog('[AI FSM] MOVEMENT_DECISION', isDoublesSecondRoll ? '(doubles second roll)' : '');

          // a9 "train instead of marching": no roll and no attack (attacking moves the token) this turn
          if (!isDoublesSecondRoll && (state.cannotMoveNextTurn || {})[ai.id]) {
            aiLog('[AI FSM] MOVEMENT_DECISION — training: cannot move this turn');
            turnSummaryRef.current.push('Trained (could not move)');
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(DELAY_MS));
            return;
          }

          if (isDoublesSecondRoll) {
            dispatch({ type: 'USE_DOUBLES_BONUS' });
            dispatch({ type: 'CLEAR_DICE' });
          }

          const myImmunity = attackImmunity[ai.id] || {};
          const attacked = attackedPlayers[ai.id] || [];
          let bestDefender = null;
          let bestDist = 4;
          for (const other of pList) {
            if (other.id === ai.id || attacked.includes(other.id) || (myImmunity[other.id] ?? 0) > 0) continue;
            const forwardDist = (other.position - ai.position + totalSpaces) % totalSpaces;
            if (forwardDist > 0 && forwardDist <= 3 && forwardDist < bestDist) {
              bestDist = forwardDist;
              bestDefender = other;
            }
          }

          if (bestDefender) {
            const atkRoll = roll2d6();
            const simAtk = atkRoll.sum + (ai.armyStrength ?? 0) + 0;
            const simDef = 7 + (bestDefender.defenseStrength ?? 0) + 0;
            const winChance = simAtk > simDef ? 1 : simAtk === simDef ? 0.5 : 0;
            const weStronger = (ai.armyStrength ?? 0) > (bestDefender.defenseStrength ?? 0);
            // More likely to attack when we have higher army than their defense — AI tries to win
            const attackThreshold = weStronger ? 0.35 : 0.6;
            if (winChance >= attackThreshold) {
              aiLog('[AI FSM] MOVEMENT_DECISION — aggression: attacking nearby player', bestDefender.id);
              turnSummaryRef.current.push(`Attacked ${bestDefender.name}`);
              g.attackNearbyPlayer?.(bestDefender.id);
              setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), d(DELAY_MS));
              return;
            }
          }

          aiLog('[AI FSM] MOVEMENT_DECISION — standard move: rolling dice');
          moveTriggeredRef.current = false;
          g.rollDice?.();
          fsmStateRef.current = AI_STATES.WAITING_FOR_MOVE;
          const waitStart = Date.now();
          /** Roll lands after 1000ms (see GameContext rollDice); wait slightly longer then trigger move ourselves so we don't rely on Dice effect (which can be cancelled on turn change). */
          const ROLL_LAND_MS = 1100;
          const rollLandMs = d(ROLL_LAND_MS);
          const pollMove = () => {
            if (myGen !== fsmGenerationRef.current) return;
            const st = gameRef.current;
            const { diceRoll: dr, isRolling: ir } = st;
            const elapsed = Date.now() - waitStart;

            if (dr != null && Array.isArray(dr)) lastRollSumRef.current = dr[0] + dr[1];

            // Once roll has landed, trigger movement from the AI (Dice component does not run move for AI)
            if (elapsed >= rollLandMs && dr != null && Array.isArray(dr) && !ir && !moveTriggeredRef.current) {
              moveTriggeredRef.current = true;
              const sum = dr[0] + dr[1];
              g.movePlayer?.(ai.id, sum);
            }

            // Give the dice+movement animation a minimum window to start
            if (elapsed < d(ROLL_AND_MOVE_MS)) {
              setTimeout(pollMove, 400);
              return;
            }

            // Safety: if something went wrong (e.g. dice never cleared) don't get stuck forever.
            if (elapsed > d(MAX_WAIT_FOR_MOVE_MS)) {
              console.warn('[AI FSM] WAITING_FOR_MOVE — timeout; forcing move resolution', {
                diceRoll: dr,
                isRolling: ir,
                lastRollSum: lastRollSumRef.current,
              });
              const cpTimeout = st.players[st.currentPlayerIndex];
              if (!cpTimeout?.isAI) {
                runningRef.current = false;
                return;
              }
              // If dice are visible and not rolling, try to move based on them once.
              if (dr != null && Array.isArray(dr) && !ir) {
                const forcedSum = dr[0] + dr[1];
                try {
                  g.movePlayer?.(cpTimeout.id, forcedSum);
                } catch (err) {
                  console.error('[AI FSM] WAITING_FOR_MOVE — forced move failed', err);
                }
              }
              // In all cases, clear dice so the AI state machine can continue.
              try {
                st.dispatch?.({ type: 'CLEAR_DICE' });
              } catch {
                // ignore – best-effort safeguard
              }
              if (st.combatActive) {
                runStep(AI_STATES.COMBAT_PHASE);
              } else {
                runStep(AI_STATES.SPACE_RESOLUTION);
              }
              return;
            }

            if (ir || dr !== null || st.movingPlayerId != null) {
              setTimeout(pollMove, 400);
              return;
            }
            const cp = st.players[st.currentPlayerIndex];
            if (!cp?.isAI) {
              runningRef.current = false;
              return;
            }
            const rollSum = lastRollSumRef.current;
            if (rollSum != null) turnSummaryRef.current.push(`Rolled ${rollSum} and moved`);
            aiLog('[AI FSM] WAITING_FOR_MOVE — move complete');
            // Post-move settle so board paints final position before cards/modals appear
            const settleMs = d(POST_MOVE_SETTLE_MS);
            if (st.combatActive) {
              setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), settleMs);
            } else {
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), settleMs);
            }
          };
          setTimeout(pollMove, d(500));
          return;
        }

        case AI_STATES.COMBAT_PHASE: {
          const st = gameRef.current;
          const cd = st.combatData;
          if (!st.combatActive || !cd) {
            combatBribePlannedRef.current = false;
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(DELAY_MS));
            return;
          }

          // Before dice are rolled, give both players a bribe window and let the AI add bribes if it improves odds.
          if (!cd.diceRolled) {
            if (!combatBribePlannedRef.current) {
              combatBribePlannedRef.current = true;
              aiLog('[AI FSM] COMBAT_PHASE — bribe window before rolling dice');
              const scheduleBribesAndRoll = () => {
                if (myGen !== fsmGenerationRef.current) return;
                const s2 = gameRef.current;
                const cd2 = s2.combatData;
                if (!s2.combatActive || !cd2 || cd2.diceRolled) return;

                try {
                  const aiPlayer = s2.players[s2.currentPlayerIndex];
                  if (!aiPlayer?.isAI) {
                    // Human's turn: don't interfere with their manual roll/bribes
                  } else {
                    const getEffectiveArmy = (pid) => s2.players.find(p => p.id === pid)?.armyStrength ?? 0;
                    const attacker = s2.players.find(p => p.id === cd2.attackerId);
                    const defender = s2.players.find(p => p.id === cd2.defenderId);
                    if (attacker && defender) {
                      const tactical = cd2.combatMode === 'tactical';
                      const atkArmy = getEffectiveArmy(cd2.attackerId);
                      const atkStat = tactical
                        ? (attacker.armyStrength ?? 0) + (attacker.defenseStrength ?? 0)
                        : atkArmy;
                      const defStat = tactical
                        ? (defender.armyStrength ?? 0) + (defender.defenseStrength ?? 0)
                        : (defender.defenseStrength ?? 0);

                      const aiId = aiPlayer.id;
                      const isAttacker = aiId === cd2.attackerId;
                      const isDefender = aiId === cd2.defenderId;
                      if (isAttacker || isDefender) {
                        const myStat = isAttacker ? atkStat : defStat;
                        const oppStat = isAttacker ? defStat : atkStat;
                        const myBribes = isAttacker ? (cd2.attackerBribe || 0) : (cd2.defenderBribe || 0);
                        const maxExtra = 3 - myBribes;
                        const me = aiPlayer;
                        const affordable = Math.floor((me.gold ?? 0) / 100); // 100G per bribe
                        const maxBribes = Math.max(0, Math.min(maxExtra, affordable));
                        if (maxBribes > 0) {
                          const statDiff = myStat - oppStat;
                          let desired = 0;
                          if (statDiff < 0) {
                            // Behind: invest enough bribes to close most of the gap, up to 2
                            desired = Math.min(maxBribes, Math.max(1, -statDiff));
                            desired = Math.min(desired, 2);
                          } else if (statDiff >= 0 && statDiff <= 2) {
                            // Slightly ahead or even: small edge bribe 60% of the time
                            if (randomInt(100) < 60) desired = Math.min(1, maxBribes);
                          }
                          for (let i = 0; i < desired; i++) {
                            g.addCombatBribe?.(aiId);
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('[AI FSM] COMBAT_PHASE — bribe planning failed', err);
                }

                aiLog('[AI FSM] COMBAT_PHASE — rolling combat dice');
                g.rollCombatDice?.();
                setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), d(COMBAT_ROLL_MS));
              };

              // Wait a moment so human opponents can click their own bribes before dice are rolled
              setTimeout(scheduleBribesAndRoll, d(COMBAT_BRIBE_WINDOW_MS));
              return;
            }

            // Bribe+roll already scheduled; wait for diceRolled to become true
            setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), d(400));
            return;
          }

          // Dice were rolled and the fight resolved in one step; leave the result on screen, then close it
          aiLog('[AI FSM] COMBAT_PHASE — combat resolved, showing result');
          combatBribePlannedRef.current = false;
          const aiId = st.players[st.currentPlayerIndex]?.id;
          if (cd.winner === aiId) turnSummaryRef.current.push('Won combat');
          else if (cd.loser === aiId) turnSummaryRef.current.push('Lost combat');
          setTimeout(() => {
            if (myGen !== fsmGenerationRef.current) return;
            g.finishCombat?.();
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
          }, d(COMBAT_RESULT_MS));
          return;
        }

        case AI_STATES.SPACE_RESOLUTION: {
          const st = gameRef.current;
          const ai2 = st.players[st.currentPlayerIndex];
          if (!ai2?.isAI) {
            runningRef.current = false;
            return;
          }

          if (st.combatActive) {
            runStep(AI_STATES.COMBAT_PHASE);
            return;
          }

          // Dismiss "pass go" salary popup when it's for this AI — click Continue automatically
          if (st.incomeNotification && st.incomeNotification.playerId === ai2.id) {
            const amount = st.incomeNotification.amount ?? 0;
            if (amount > 0) turnSummaryRef.current.push(`Passed GO: +${amount}G`);
            aiLog('[AI FSM] SPACE_RESOLUTION — dismissing income/salary popup');
            g.clearIncomeNotification?.();
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(800));
            return;
          }

          if (st.pendingIncomeTypeSelection) {
            const territoryId = st.pendingIncomeTypeSelection;
            const cost = getInnerTerritoryCost(territoryId);
            const incomeType = (ai2.armyStrength ?? 0) >= (ai2.defenseStrength ?? 0) ? 'army' : 'defense';
            g.purchaseTerritoryWithIncomeType?.(territoryId, cost, incomeType);
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
            return;
          }

          if (ai2.lastDrawnCard) {
            const card = ai2.lastDrawnCard;
            const effect = card?.effect || {};
            aiLog('[AI FSM] SPACE_RESOLUTION — resolving card', card?.id);

            const cardTypeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
            turnSummaryRef.current.push(`Drew ${cardTypeLabel} card`);
            // Build a short line for stat gains from this card (gold, army, defense)
            const cardGainParts = [];
            if (effect.gold != null && effect.gold !== 0) cardGainParts.push(`${effect.gold > 0 ? '+' : ''}${effect.gold} G`);
            if (effect.army != null && effect.army !== 0) cardGainParts.push(`${effect.army > 0 ? '+' : ''}${effect.army} Army`);
            if (effect.defense != null && effect.defense !== 0) cardGainParts.push(`${effect.defense > 0 ? '+' : ''}${effect.defense} Defense`);
            if (cardGainParts.length > 0) turnSummaryRef.current.push(cardGainParts.join(', '));
            const cardDisplayTime = card.type === 'penalty' ? dCard(CARD_DISPLAY_PENALTY_MS) : dCard(CARD_DISPLAY_MS);
            setTimeout(() => {
              if (myGen !== fsmGenerationRef.current) return;
              const st2 = gameRef.current;
              const ai2b = st2.players[st2.currentPlayerIndex];
              if (!ai2b?.isAI || !ai2b.lastDrawnCard) return;

              if (card.type === 'resource' && (effect.special === 'gold_per_territory' || (effect.gold != null || effect.army != null || effect.defense != null))) {
                g.applyCardEffect?.(ai2b.id, effect, { isPenalty: card.type === 'penalty' });
              } else if (card.type === 'resource' && ['toll_3_rounds', 'return_to_start_rewards'].includes(effect.special)) {
                g.applyResourceSpecial?.(card.id, ai2b.id);
              } else if (card.type === 'army' && ['steal_army_highest', 'raid_nearest_territory', 'train_no_move'].includes(effect.special)) {
                g.applyArmySpecial?.(card.id, ai2b.id);
              } else if (card.type === 'defense' && ['defensive_structures', 'seal_borders', 'retreat_fortified', 'reverse_movement', 'penalty_immunity'].includes(effect.special)) {
                g.applyDefenseSpecial?.(card.id, ai2b.id);
              } else if (card.type === 'fate' && ['move_5_collect_100', 'cancel_next_penalty', 'reverse_until_battle_win'].includes(effect.special)) {
                g.applyFateSpecial?.(card.id, ai2b.id);
              } else if (card.type === 'resource' && effect.special === 'rival_kingdom') {
                // You both gain 200G and you can't attack them: spend it on whoever you'd least like to fight
                const target = pickTarget(st2, ai2b, (p) => p.defenseStrength ?? 0);
                g.applyResourceSpecial?.(card.id, ai2b.id, target?.id ?? null);
              } else if (card.type === 'army' && effect.special === 'challenge_nearby') {
                // Same rule as humans: only commanders 1–N spaces ahead can be challenged; hit the leader
                const within = effect.withinSpaces ?? 5;
                const n = st2.boardSpaces?.length || 40;
                const inRange = (p) => { const dist = (p.position - ai2b.position + n) % n; return dist > 0 && dist <= within; };
                const target = pickTarget(st2, ai2b, leaderScore, inRange);
                g.applyArmySpecial?.(card.id, ai2b.id, target?.id ?? null);
              } else if (card.type === 'army' && effect.special === 'bribe_guards') {
                // Opponent loses 2 Defense: weaken the leader
                const target = pickTarget(st2, ai2b, leaderScore);
                g.applyArmySpecial?.(card.id, ai2b.id, target?.id ?? null);
              } else if (card.type === 'fate' && effect.special === 'swap_positions') {
                // Swap with whoever stands closest before our own START, so we collect salary soon
                const n = st2.boardSpaces?.length || 40;
                const myStart = FACTION_TO_START_INDEX[ai2b.faction] ?? 0;
                const target = pickTarget(st2, ai2b, (p) => -(((myStart - p.position + n) % n) || n));
                g.applyFateSpecial?.('f6', ai2b.id, target?.id ?? null);
              } else if (card.type === 'fate' && effect.special === 'alliance') {
                // Truce with the biggest military threat
                const target = pickTarget(st2, ai2b, (p) => (p.armyStrength ?? 0) + (p.defenseStrength ?? 0));
                g.applyFateSpecial?.('f7', ai2b.id, target?.id ?? null);
              } else if (card.type === 'fate' && card.keepable) {
                // Prefer to use the card now (80%) rather than keep for later — AI tries to get value immediately
                const preferUse = randomInt(100) < 80;
                if (preferUse) {
                  g.applyCardEffect?.(ai2b.id, effect, { isPenalty: card.type === 'penalty' });
                } else {
                  g.keepDrawnCard?.();
                }
              } else {
                g.applyCardEffect?.(ai2b.id, effect, { isPenalty: card.type === 'penalty' });
              }
              // Short delay after applying card so modal closes, then continue (turn ends soon after)
              const afterCardMs = Math.max(d(500), dCard(400));
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), afterCardMs);
            }, cardDisplayTime);
            return;
          }

          if (st.selectedTerritory != null) {
            const spaceId = typeof st.selectedTerritory === 'number' ? st.selectedTerritory : parseInt(String(st.selectedTerritory).replace('territory-', ''), 10);
            const territoryId = `territory-${spaceId}`;
            const terr = st.territories?.[territoryId];
            const plus100 = (st.territoryCostPlus100 || {})[ai2.id];
            const def = getOuterTerritoryDef(spaceId);
            const cost = def?.price ?? 250;
            const actualCost = plus100 ? cost + 100 : cost;
            if (terr?.ownerId && terr.ownerId !== ai2.id) {
              // Opponent's territory: tribute or fight (no free skip). Attack only when clearly stronger.
              const owner = st.players.find((p) => p.id === terr.ownerId);
              const bribe = terr.bribe ?? def?.bribe ?? 100;
              const canFight = owner && !cannotAttack(st, ai2.id, owner.id);
              if (canFight && (ai2.armyStrength ?? 0) >= (owner.defenseStrength ?? 0) + 3) {
                aiLog('[AI FSM] SPACE_RESOLUTION — attacking owned territory', spaceId);
                turnSummaryRef.current.push(`Attacked ${owner.name}'s ${def?.name ?? 'territory'}`);
                g.attackTerritory?.(territoryId);
              } else {
                turnSummaryRef.current.push(`Paid ${Math.min(bribe, ai2.gold ?? 0)}G tribute to ${owner?.name ?? 'owner'}`);
                g.payTribute?.(territoryId, bribe);
              }
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
              return;
            }
            const canBuy = !(st.cannotBuyTerritories || {})[ai2.id] && (ai2.gold >= actualCost) && !terr;
            if (canBuy && (ai2.gold - actualCost >= 200 || (ai2.ownedTerritories || []).length < 2)) {
              aiLog('[AI FSM] SPACE_RESOLUTION — buying outer territory', spaceId);
              const spaceLabel = st.boardSpaces?.[spaceId]?.label || def?.name || `Space ${spaceId}`;
              turnSummaryRef.current.push(`Bought ${spaceLabel} (-${actualCost}G)`);
              g.purchaseTerritory?.(territoryId, cost);
            } else {
              turnSummaryRef.current.push('Skipped territory');
              g.skipTerritoryAction?.();
            }
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
            return;
          }

          if (st.landedOnStartChoice) {
            const choice = st.landedOnStartChoice;
            const owner = st.players.find((p) => p.id === choice.ownerId);
            const goldOk = (ai2.gold ?? 0) >= 100;
            const ourArmy = ai2.armyStrength ?? 0;
            const ownerDef = owner?.defenseStrength ?? 0;
            // More likely to fight when we have higher army than owner's defense — AI tries to win
            const weStrongerOrClose = ourArmy >= ownerDef - 2;
            const shouldBribe = owner && goldOk && !weStrongerOrClose && ourArmy < ownerDef - 5;
            if (owner && cannotAttack(st, ai2.id, owner.id)) {
              turnSummaryRef.current.push('Passed START peacefully (truce)');
              g.payStartBribe?.(0);
            } else if (shouldBribe) {
              aiLog('[AI FSM] SPACE_RESOLUTION — paying start bribe 100G');
              turnSummaryRef.current.push('Paid 100G at START');
              g.payStartBribe?.(100);
            } else {
              aiLog('[AI FSM] SPACE_RESOLUTION — choosing to fight at START');
              turnSummaryRef.current.push('Fought at START');
              g.chooseStartFight?.();
            }
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
            return;
          }

          if (st.landedOnStart) {
            turnSummaryRef.current.push('Stayed on START');
            g.stayOnStart?.();
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(AFTER_ACTION_MS));
            return;
          }

          if (st.doublesExtraRollAvailable && !st.doublesBonusUsed) {
            aiLog('[AI FSM] SPACE_RESOLUTION — doubles: AI gets second roll');
            setTimeout(() => runStep(AI_STATES.MOVEMENT_DECISION), d(DELAY_MS));
            return;
          }

          if (st.selectedCorner != null) {
            g.selectCorner?.(null);
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(200));
            return;
          }

          const stillBlocking = st.landedOnStart != null || st.landedOnStartChoice != null || st.selectedTerritory != null || ai2.lastDrawnCard != null || st.pendingIncomeTypeSelection != null
            || st.movingPlayerId != null || st.cardSaleOffer != null;
          if (stillBlocking) {
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(300));
            return;
          }

          aiLog('[AI FSM] SPACE_RESOLUTION — done, moving to ECONOMY_PHASE');
          setTimeout(() => runStep(AI_STATES.ECONOMY_PHASE), d(DELAY_MS));
          return;
        }

        case AI_STATES.ECONOMY_PHASE: {
          aiLog('[AI FSM] ECONOMY_PHASE');
          const st = gameRef.current;
          const ai3 = st.players[st.currentPlayerIndex];
          if (!ai3?.isAI) {
            runningRef.current = false;
            return;
          }

          const inners = INNER_BY_FACTION[ai3.faction] || [];
          const owned = ai3.ownedTerritories || [];
          const cantBuy = (st.cannotBuyTerritories || {})[ai3.id];
          const plus100 = (st.territoryCostPlus100 || {})[ai3.id];

          // Prioritize buying inner territories when able — AI tries to win (inner territories are key to progression)
          for (const tid of inners) {
            if (st.territories[tid] || cantBuy) continue;
            const cost = getInnerTerritoryCost(tid);
            const actual = plus100 ? cost + 100 : cost;
            const canAfford = (ai3.gold ?? 0) >= actual;
            const keepBuffer = (ai3.gold ?? 0) - actual >= 150;
            if (canAfford && (keepBuffer || owned.length >= 1)) {
              aiLog('[AI FSM] ECONOMY_PHASE — unlocking inner territory (gateway)', tid);
              turnSummaryRef.current.push(`Unlocked inner territory (-${actual}G)`);
              const incomeType = (ai3.armyStrength ?? 0) >= (ai3.defenseStrength ?? 0) ? 'army' : 'defense';
              g.purchaseTerritoryWithIncomeType?.(tid, cost, incomeType);
              setTimeout(() => runStep(AI_STATES.ECONOMY_PHASE), d(AFTER_ACTION_MS));
              return;
            }
          }

          setTimeout(() => runStep(AI_STATES.END_TURN), d(DELAY_MS));
          return;
        }

        case AI_STATES.END_TURN: {
          aiLog('[AI FSM] END_TURN');
          // A late card move (e.g. f8) or a fight may still be running — finish it first
          if (state.movingPlayerId != null || combatActive || ai.lastDrawnCard) {
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(400));
            return;
          }
          const summary = turnSummaryRef.current.length > 0 ? turnSummaryRef.current.join(' · ') : 'Ended turn';
          const expectedTurn = state.turnNumber ?? 0;
          dispatch({ type: 'SET_AI_TURN_SUMMARY', payload: { playerId: ai.id, summary } });
          setTimeout(() => {
            if (myGen !== fsmGenerationRef.current) return;
            dispatch({ type: 'NEXT_TURN', payload: { turnSummary: summary, expectedTurn } });
            runningRef.current = false;
          }, d(BEFORE_END_TURN_MS));
          return;
        }

        default:
          runningRef.current = false;
      }
    };

    const t = setTimeout(() => runStep(AI_STATES.EVALUATE_BOARD), d(TURN_START_MS));
    return () => {
      clearTimeout(t);
      runningRef.current = false;
    };
  // Intentionally omit aiSpeedMultiplier: re-running when speed changes would start a second FSM and cause double movement/cards
  }, [game.gamePhase, game.currentPlayerIndex, game.players?.[game.currentPlayerIndex]?.id, game.players?.[game.currentPlayerIndex]?.isAI]);

  const speedDelay = (ms) => {
    const speed = Math.max(0.25, Math.min(2, Number(aiSpeedMultiplier) || 1));
    return Math.max(100, Math.round(ms / speed));
  };

  // Gauntlet: AI participants place bribes, and fights with no human in them are rolled and closed by the AI.
  // AI targets also make their own sacrifice-or-leave choice after a defeat.
  const gauntletBribedRef = useRef(null);
  const gauntletPhase = game.gauntlet?.phase;
  const gauntletIndex = game.gauntlet?.challengerIndex;
  const gCombat = game.combatData?.combatSource === 'gauntlet' ? game.combatData : null;
  useEffect(() => {
    const g = gameRef.current;
    if (g.gamePhase !== 'gauntlet' || !g.gauntlet) return undefined;
    const { gauntlet, players = [] } = g;
    const target = players.find((p) => p.id === gauntlet.targetId);

    if (gauntlet.phase === 'sacrifice_prompt') {
      if (!target?.isAI) return undefined;
      const t = setTimeout(() => {
        const now = gameRef.current;
        if (now.gauntlet?.phase !== 'sacrifice_prompt') return;
        const me = now.players.find((p) => p.id === now.gauntlet.targetId);
        const outer = (me?.ownedTerritories || []).filter((tid) => !tid.startsWith('inner-'));
        if (outer.length === 0) { now.gauntletDeclineSacrifice?.(); return; }
        // Give up the cheapest outer territory and try again
        const price = (tid) => getOuterTerritoryDef(now.territories?.[tid]?.spaceIndex)?.price ?? 0;
        const cheapest = [...outer].sort((a, b) => price(a) - price(b))[0];
        aiLog('[AI Gauntlet] sacrificing', cheapest, 'to retry');
        now.gauntletSacrifice?.(cheapest);
      }, speedDelay(2000));
      return () => clearTimeout(t);
    }

    const cd = g.combatData;
    if (gauntlet.phase !== 'clash' || !g.combatActive || cd?.combatSource !== 'gauntlet') return undefined;
    const attacker = players.find((p) => p.id === cd.attackerId);
    const defender = players.find((p) => p.id === cd.defenderId);
    if (!attacker || !defender) return undefined;
    const humanInvolved = !attacker.isAI || !defender.isAI;

    if (!cd.diceRolled) {
      const t = setTimeout(() => {
        const now = gameRef.current;
        const c = now.combatData;
        if (!c || c.diceRolled || c.combatSource !== 'gauntlet') return;
        const key = `${now.turnNumber}-${now.gauntlet?.challengerIndex}-${c.attackerId}-${c.defenderId}`;
        if (gauntletBribedRef.current !== key) {
          gauntletBribedRef.current = key;
          const atk = now.players.find((p) => p.id === c.attackerId);
          const def = now.players.find((p) => p.id === c.defenderId);
          // Includes the challenger's rally bonus, so an AI target bribes to cover it
          const { atkStat, defStat } = getCombatStats(now, c) || { atkStat: 0, defStat: 0 };
          for (const [me, myStat, oppStat] of [[atk, atkStat, defStat], [def, defStat, atkStat]]) {
            if (!me?.isAI) continue;
            // Close the stat gap plus a 1-point edge, at most 3 bribes, never below 100G left over
            const wanted = Math.min(3, Math.max(0, oppStat - myStat + 1));
            const affordable = Math.max(0, Math.floor(((me.gold ?? 0) - 100) / 100));
            for (let i = 0; i < Math.min(wanted, affordable); i++) now.addCombatBribe?.(me.id);
          }
        }
        if (!humanInvolved) setTimeout(() => gameRef.current.rollCombatDice?.(), speedDelay(300));
      }, speedDelay(1500));
      return () => clearTimeout(t);
    }

    if (cd.winner != null && !humanInvolved) {
      const t = setTimeout(() => gameRef.current.finishCombat?.(), speedDelay(COMBAT_RESULT_MS));
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.gamePhase, gauntletPhase, gauntletIndex, game.combatActive, gCombat?.attackerId, gCombat?.diceRolled, gCombat?.winner]);

  // AI buyers answer card-sale offers: buy when they can comfortably afford it
  const offer = game.cardSaleOffer;
  useEffect(() => {
    if (!offer) return undefined;
    const buyer = gameRef.current.players.find((p) => p.id === offer.buyerId);
    if (!buyer?.isAI) return undefined;
    const t = setTimeout(() => {
      const now = gameRef.current;
      if (now.cardSaleOffer !== offer) return;
      const b = now.players.find((p) => p.id === offer.buyerId);
      const reserve = offer.card?.type === 'penalty' ? 500 : 300;
      const accept = !!b && (b.gold ?? 0) - offer.price >= reserve;
      aiLog('[AI] card offer', accept ? 'accepted' : 'declined', offer);
      now.respondCardSale?.(accept);
    }, speedDelay(1200));
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);
}
