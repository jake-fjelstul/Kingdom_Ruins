import { useEffect, useRef } from 'react';
import {
  useGame,
  canEnterBlueRuinZone,
  INNER_BY_FACTION,
  FACTION_TO_START_INDEX,
  NEW_TERRITORY_SPACE_INDICES,
  getOuterTerritoryDef,
  MIN_COMBINED_STATS,
} from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import { roll2d6, randomInt } from '../utils/dice';

// Delays tuned so other players can clearly see what the AI does
const DELAY_MS = 1200;
const ROLL_AND_MOVE_MS = 1600;
const COMBAT_ROLL_MS = 1500;
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

function getInnerTerritoryCost(territoryId) {
  if (/-1$/.test(territoryId)) return 750;
  if (/-2$/.test(territoryId)) return 1250;
  return 750;
}

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
          console.log('[AI FSM] EVALUATE_BOARD — start of turn', { playerId: ai.id, gold: ai.gold, army: ai.armyStrength, defense: ai.defenseStrength });

          const combined = (ai.armyStrength ?? 0) + (ai.defenseStrength ?? 0);
          const hasBothInners = (INNER_BY_FACTION[ai.faction] || []).every((id) => (ai.ownedTerritories || []).includes(id));
          const canBlueRuin = ai.gold >= 500 && combined >= MIN_COMBINED_STATS && hasBothInners && canEnterBlueRuinZone(ai, state);

          if (canBlueRuin) {
            console.log('[AI FSM] EVALUATE_BOARD — endgame: entering Blue Ruin Zone');
            turnSummaryRef.current.push('Entered Blue Ruin Zone');
            g.requestEnterBlueRuin?.();
            runningRef.current = false;
            return;
          }

          // Only consider Vanguard Jump after at least one full round, so the first turn always shows dice roll + step animation
          const isFirstRound = (state.currentRound ?? 0) === 0;
          if (!isFirstRound && ai.position === startIndex && (ai.gold ?? 0) >= 100) {
            const unownedNewTerritories = NEW_TERRITORY_SPACE_INDICES.filter((idx) => {
              const space = boardSpaces[idx];
              return space && !space.owned;
            });
            if (unownedNewTerritories.length > 0) {
              const targetSpace = unownedNewTerritories[randomInt(unownedNewTerritories.length)];
              console.log('[AI FSM] EVALUATE_BOARD — Vanguard Jump: paying 100G, warping to new territory', targetSpace);
              turnSummaryRef.current.push('Vanguard jump to new territory (100G)');
              dispatch({ type: 'SET_PLAYER_STATS', payload: { playerId: ai.id, gold: Math.max(0, ai.gold - 100) } });
              dispatch({ type: 'MOVE_PLAYER_TO_POSITION', payload: { playerId: ai.id, position: targetSpace } });
              dispatch({ type: 'SELECT_TERRITORY', payload: targetSpace });
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(DELAY_MS));
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
          console.log('[AI FSM] MOVEMENT_DECISION', isDoublesSecondRoll ? '(doubles second roll)' : '');

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
              console.log('[AI FSM] MOVEMENT_DECISION — aggression: attacking nearby player', bestDefender.id);
              turnSummaryRef.current.push(`Attacked ${bestDefender.name}`);
              g.attackNearbyPlayer?.(bestDefender.id);
              setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), d(DELAY_MS));
              return;
            }
          }

          console.log('[AI FSM] MOVEMENT_DECISION — standard move: rolling dice');
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

            if (ir || dr !== null) {
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
            console.log('[AI FSM] WAITING_FOR_MOVE — move complete');
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
              console.log('[AI FSM] COMBAT_PHASE — bribe window before rolling dice');
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
                    const alliances = s2.alliances || {};
                    const getEffectiveArmy = (pid) => {
                      const a = alliances[pid];
                      if (!a?.allyId) return s2.players.find(p => p.id === pid)?.armyStrength ?? 0;
                      const pl = s2.players.find(x => x.id === pid);
                      const ally = s2.players.find(x => x.id === a.allyId);
                      return Math.max(pl?.armyStrength ?? 0, ally?.armyStrength ?? 0);
                    };
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

                console.log('[AI FSM] COMBAT_PHASE — rolling combat dice');
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

          console.log('[AI FSM] COMBAT_PHASE — resolving combat');
          combatBribePlannedRef.current = false;
          g.resolveCombat?.();
          setTimeout(() => {
            const next = gameRef.current;
            const aiId = next.players[next.currentPlayerIndex]?.id;
            if (next.combatData?.winner === aiId) turnSummaryRef.current.push('Won combat');
            else if (next.combatData?.loser === aiId) turnSummaryRef.current.push('Lost combat');
            if (next.combatActive && next.gauntlet) return;
            runStep(AI_STATES.SPACE_RESOLUTION);
          }, d(AFTER_ACTION_MS));
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
            console.log('[AI FSM] SPACE_RESOLUTION — dismissing income/salary popup');
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
            console.log('[AI FSM] SPACE_RESOLUTION — resolving card', card?.id);

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
                const target = st2.players.find((p) => p.id !== ai2b.id);
                if (target) g.applyResourceSpecial?.(card.id, ai2b.id, target.id);
                else g.applyCardEffect?.(ai2b.id, effect, { isPenalty: false });
              } else if (card.type === 'army' && effect.special === 'challenge_nearby') {
                const target = st2.players.find((p) => p.id !== ai2b.id);
                if (target) g.applyArmySpecial?.(card.id, ai2b.id, target.id);
                else g.applyCardEffect?.(ai2b.id, effect, { isPenalty: false });
              } else if (card.type === 'army' && effect.special === 'bribe_guards') {
                const target = st2.players.find((p) => p.id !== ai2b.id);
                if (target) g.applyArmySpecial?.(card.id, ai2b.id, target.id);
                else g.applyCardEffect?.(ai2b.id, effect, { isPenalty: false });
              } else if (card.type === 'fate' && (effect.special === 'swap_positions' || effect.special === 'alliance')) {
                const target = st2.players.find((p) => p.id !== ai2b.id);
                if (target) g.applyFateSpecial?.(effect.special === 'swap_positions' ? 'f6' : 'f7', ai2b.id, target.id);
                else g.applyCardEffect?.(ai2b.id, effect, { isPenalty: false });
              } else if ((card.type === 'fate' || card.type === 'penalty') && card.keepable) {
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
            const canBuy = !(st.cannotBuyTerritories || {})[ai2.id] && (ai2.gold >= actualCost) && !terr;
            if (canBuy && (ai2.gold - actualCost >= 200 || (ai2.ownedTerritories || []).length < 2)) {
              console.log('[AI FSM] SPACE_RESOLUTION — buying outer territory', spaceId);
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
            if (shouldBribe) {
              console.log('[AI FSM] SPACE_RESOLUTION — paying start bribe 100G');
              turnSummaryRef.current.push('Paid 100G at START');
              g.payStartBribe?.(100);
            } else {
              console.log('[AI FSM] SPACE_RESOLUTION — choosing to fight at START');
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
            console.log('[AI FSM] SPACE_RESOLUTION — doubles: AI gets second roll');
            setTimeout(() => runStep(AI_STATES.MOVEMENT_DECISION), d(DELAY_MS));
            return;
          }

          if (st.selectedCorner != null) {
            g.selectCorner?.(null);
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(200));
            return;
          }

          const stillBlocking = st.landedOnStart != null || st.landedOnStartChoice != null || st.selectedTerritory != null || ai2.lastDrawnCard != null || st.pendingIncomeTypeSelection != null;
          if (stillBlocking) {
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), d(300));
            return;
          }

          console.log('[AI FSM] SPACE_RESOLUTION — done, moving to ECONOMY_PHASE');
          setTimeout(() => runStep(AI_STATES.ECONOMY_PHASE), d(DELAY_MS));
          return;
        }

        case AI_STATES.ECONOMY_PHASE: {
          console.log('[AI FSM] ECONOMY_PHASE');
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
              console.log('[AI FSM] ECONOMY_PHASE — unlocking inner territory (gateway)', tid);
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
          console.log('[AI FSM] END_TURN');
          const summary = turnSummaryRef.current.length > 0 ? turnSummaryRef.current.join(' · ') : 'Ended turn';
          dispatch({ type: 'SET_AI_TURN_SUMMARY', payload: { playerId: ai.id, summary } });
          setTimeout(() => {
            dispatch({ type: 'NEXT_TURN', payload: { turnSummary: summary } });
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
}
