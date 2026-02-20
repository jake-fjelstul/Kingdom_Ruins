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
import { roll2d6, randomInt } from '../utils/dice';

// Delays tuned so other players can clearly see what the AI does (slightly reduced)
const DELAY_MS = 900;
const ROLL_AND_MOVE_MS = 1000;
const COMBAT_ROLL_MS = 1200;
/** Time the card modal is shown before the AI applies the effect (so players can read it) */
const CARD_DISPLAY_MS = 1000;
const CARD_DISPLAY_PENALTY_MS = 1000;
/** Pause after any action (buy, bribe, apply card, etc.) before continuing */
const AFTER_ACTION_MS = 1000;
/** Pause at start of AI turn so "AI's turn" is obvious */
const TURN_START_MS = 1000;
/** Pause before switching to next player */
const BEFORE_END_TURN_MS = 1200;

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
  const runningRef = useRef(false);
  const fsmStateRef = useRef(null);
  const gameRef = useRef(game);
  const turnSummaryRef = useRef([]);
  const lastRollSumRef = useRef(null);

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
    turnSummaryRef.current = [];
    lastRollSumRef.current = null;
    fsmStateRef.current = AI_STATES.EVALUATE_BOARD;

    const runStep = (stateName) => {
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
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), DELAY_MS);
              return;
            }
          }

          setTimeout(() => runStep(AI_STATES.MOVEMENT_DECISION), DELAY_MS);
          return;
        }

        case AI_STATES.MOVEMENT_DECISION: {
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
            if (winChance >= 0.6) {
              console.log('[AI FSM] MOVEMENT_DECISION — aggression: attacking nearby player', bestDefender.id);
              turnSummaryRef.current.push(`Attacked ${bestDefender.name}`);
              g.attackNearbyPlayer?.(bestDefender.id);
              setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), DELAY_MS);
              return;
            }
          }

          console.log('[AI FSM] MOVEMENT_DECISION — standard move: rolling dice');
          g.rollDice?.();
          fsmStateRef.current = AI_STATES.WAITING_FOR_MOVE;
          const waitStart = Date.now();
          const pollMove = () => {
            const st = gameRef.current;
            const { diceRoll: dr, isRolling: ir } = st;
            if (dr != null && Array.isArray(dr)) lastRollSumRef.current = dr[0] + dr[1];
            if (Date.now() - waitStart < ROLL_AND_MOVE_MS) {
              setTimeout(pollMove, 400);
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
            if (st.combatActive) {
              runStep(AI_STATES.COMBAT_PHASE);
            } else {
              runStep(AI_STATES.SPACE_RESOLUTION);
            }
          };
          setTimeout(pollMove, 500);
          return;
        }

        case AI_STATES.COMBAT_PHASE: {
          const st = gameRef.current;
          if (!st.combatActive || !st.combatData) {
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), DELAY_MS);
            return;
          }
          if (!st.combatData.diceRolled) {
            console.log('[AI FSM] COMBAT_PHASE — rolling combat dice');
            g.rollCombatDice?.();
            setTimeout(() => runStep(AI_STATES.COMBAT_PHASE), COMBAT_ROLL_MS);
            return;
          }
          console.log('[AI FSM] COMBAT_PHASE — resolving combat');
          g.resolveCombat?.();
          setTimeout(() => {
            const next = gameRef.current;
            const aiId = next.players[next.currentPlayerIndex]?.id;
            if (next.combatData?.winner === aiId) turnSummaryRef.current.push('Won combat');
            else if (next.combatData?.loser === aiId) turnSummaryRef.current.push('Lost combat');
            if (next.combatActive && next.gauntlet) return;
            runStep(AI_STATES.SPACE_RESOLUTION);
          }, AFTER_ACTION_MS);
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

          if (ai2.lastDrawnCard) {
            const card = ai2.lastDrawnCard;
            const effect = card?.effect || {};
            console.log('[AI FSM] SPACE_RESOLUTION — resolving card', card?.id);

            const cardTypeLabel = card.type.charAt(0).toUpperCase() + card.type.slice(1);
            turnSummaryRef.current.push(`Drew ${cardTypeLabel} card`);
            const cardDisplayTime = card.type === 'penalty' ? CARD_DISPLAY_PENALTY_MS : CARD_DISPLAY_MS;
            setTimeout(() => {
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
                g.keepDrawnCard?.();
              } else {
                g.applyCardEffect?.(ai2b.id, effect, { isPenalty: card.type === 'penalty' });
              }
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), AFTER_ACTION_MS);
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
              turnSummaryRef.current.push(`Bought ${spaceLabel}`);
              g.purchaseTerritory?.(territoryId, cost);
            } else {
              turnSummaryRef.current.push('Skipped territory');
              g.skipTerritoryAction?.();
            }
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), AFTER_ACTION_MS);
            return;
          }

          if (st.landedOnStartChoice) {
            const choice = st.landedOnStartChoice;
            const owner = st.players.find((p) => p.id === choice.ownerId);
            const goldOk = (ai2.gold ?? 0) >= 100;
            if (owner && goldOk && (ai2.armyStrength ?? 0) < (owner.defenseStrength ?? 0) + 5) {
              console.log('[AI FSM] SPACE_RESOLUTION — paying start bribe 100G');
              turnSummaryRef.current.push('Paid 100G at START');
              g.payStartBribe?.(100);
            } else {
              console.log('[AI FSM] SPACE_RESOLUTION — choosing to fight at START');
              turnSummaryRef.current.push('Fought at START');
              g.chooseStartFight?.();
            }
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), AFTER_ACTION_MS);
            return;
          }

          if (st.landedOnStart) {
            turnSummaryRef.current.push('Stayed on START');
            g.stayOnStart?.();
            setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), AFTER_ACTION_MS);
            return;
          }

          if (st.doublesExtraRollAvailable && !st.doublesBonusUsed) {
            console.log('[AI FSM] SPACE_RESOLUTION — doubles: AI gets second roll');
            setTimeout(() => runStep(AI_STATES.MOVEMENT_DECISION), DELAY_MS);
            return;
          }

          console.log('[AI FSM] SPACE_RESOLUTION — done, moving to ECONOMY_PHASE');
          setTimeout(() => runStep(AI_STATES.ECONOMY_PHASE), DELAY_MS);
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

          for (const tid of inners) {
            if (st.territories[tid] || cantBuy) continue;
            const cost = getInnerTerritoryCost(tid);
            const actual = plus100 ? cost + 100 : cost;
            if ((ai3.gold ?? 0) >= actual && (ai3.gold - actual >= 300 || owned.length >= 2)) {
              console.log('[AI FSM] ECONOMY_PHASE — unlocking inner territory (gateway)', tid);
              turnSummaryRef.current.push('Unlocked inner territory');
              const incomeType = (ai3.armyStrength ?? 0) >= (ai3.defenseStrength ?? 0) ? 'army' : 'defense';
              g.purchaseTerritoryWithIncomeType?.(tid, cost, incomeType);
              setTimeout(() => runStep(AI_STATES.ECONOMY_PHASE), AFTER_ACTION_MS);
              return;
            }
          }

          if ((ai3.gold ?? 0) >= 300) {
            const armyDeck = st.cardDecks?.army?.length ?? 0;
            const defDeck = st.cardDecks?.defense?.length ?? 0;
            if (armyDeck > 0 || defDeck > 0) {
              const deckType = (armyDeck && defDeck) ? ((ai3.armyStrength ?? 0) >= (ai3.defenseStrength ?? 0) ? 'army' : 'defense') : (armyDeck ? 'army' : 'defense');
              console.log('[AI FSM] ECONOMY_PHASE — mercenary contract: 300G draw', deckType);
              turnSummaryRef.current.push(`Mercenary: drew ${deckType} card`);
              g.mercenaryDraw?.(deckType);
              setTimeout(() => runStep(AI_STATES.SPACE_RESOLUTION), AFTER_ACTION_MS);
              return;
            }
          }

          setTimeout(() => runStep(AI_STATES.END_TURN), DELAY_MS);
          return;
        }

        case AI_STATES.END_TURN: {
          console.log('[AI FSM] END_TURN');
          const summary = turnSummaryRef.current.length > 0 ? turnSummaryRef.current.join(' · ') : 'Ended turn';
          dispatch({ type: 'SET_AI_TURN_SUMMARY', payload: { playerId: ai.id, summary } });
          setTimeout(() => {
            dispatch({ type: 'NEXT_TURN' });
            runningRef.current = false;
          }, BEFORE_END_TURN_MS);
          return;
        }

        default:
          runningRef.current = false;
      }
    };

    const t = setTimeout(() => runStep(AI_STATES.EVALUATE_BOARD), TURN_START_MS);
    return () => {
      clearTimeout(t);
      runningRef.current = false;
    };
  }, [game.gamePhase, game.currentPlayerIndex, game.players?.[game.currentPlayerIndex]?.id, game.players?.[game.currentPlayerIndex]?.isAI]);
}
