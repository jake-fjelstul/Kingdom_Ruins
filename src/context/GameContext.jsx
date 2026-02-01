import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { rollD6, roll2d6, randomInt } from '../utils/dice';
import { TILE_IMAGES } from '../assets/tiles';

// Game Constants
export const FACTIONS = {
  KING: { id: 'king', name: 'King', icon: '👑', color: 'green', startGold: 700, startArmy: 0, startDefense: 0 }, // Base 500 + 200 bonus
  DRAGON: { id: 'dragon', name: 'Dragon', icon: '🐉', color: 'red', startGold: 500, startArmy: 2, startDefense: 0 }, // Base 500 + 2% army
  KNIGHT: { id: 'knight', name: 'Knight', icon: '⚔️', color: 'blue', startGold: 500, startArmy: 0, startDefense: 2 }, // Base 500 + 2% defense
  WIZARD: { id: 'wizard', name: 'Wizard', icon: '🧙', color: 'purple', startGold: 500, startArmy: 1, startDefense: 1 }, // Base 500 + 1% army + 1% defense
};

export const SPACE_TYPES = {
  RESOURCE_CARD: 'Resource Card',
  ARMY_CARD: 'Army Card',
  DEFENSE_CARD: 'Defense Card',
  FATE_CARD: 'Fate Card',
  PENALTY_CARD: 'Penalty Card',
  NEW_TERRITORY: 'New Territory',
  START: 'START',
};

export const CARD_TYPES = {
  RESOURCE: 'resource',
  ARMY: 'army',
  DEFENSE: 'defense',
  FATE: 'fate',
  PENALTY: 'penalty',
  NEW_TERRITORY: 'territory',
};

// Blue Ruin Zone / Gauntlet
export const BLUE_RUIN_FEE = 500;
export const MIN_COMBINED_STATS = 10;
export const GAUNTLET_BRIBE_COST = 100;

export const INNER_BY_FACTION = {
  king: ['inner-tl-1', 'inner-tl-2'],
  dragon: ['inner-tr-1', 'inner-tr-2'],
  knight: ['inner-bl-1', 'inner-bl-2'],
  wizard: ['inner-br-1', 'inner-br-2'],
};

export const FACTION_TO_START_INDEX = { king: 0, dragon: 11, knight: 32, wizard: 21 };

// Outer territory definitions: name, price, bribe, backgroundImage (NEW_TERRITORY spaces 6, 12, 18, 24, 30, 36)
export const OUTER_TERRITORY_DEFS = [
  { name: 'Moss Ward', price: 200, bribe: 50, backgroundImage: TILE_IMAGES.moss_ward },
  { name: 'The Aqueduct', price: 250, bribe: 80, backgroundImage: TILE_IMAGES.aqueduct },
  { name: 'Catacombs', price: 300, bribe: 110, backgroundImage: TILE_IMAGES.catacombs },
  { name: 'Broken Keep', price: 350, bribe: 150, backgroundImage: TILE_IMAGES.broken_keep },
  { name: 'Ash Pits', price: 350, bribe: 150, backgroundImage: TILE_IMAGES.ash_pits },
  { name: 'Black Spire', price: 400, bribe: 200, backgroundImage: TILE_IMAGES.black_spire },
];

const NEW_TERRITORY_SPACE_INDICES = [6, 12, 18, 24, 30, 36];

export function getOuterTerritoryDef(spaceIndex) {
  const idx = NEW_TERRITORY_SPACE_INDICES.indexOf(spaceIndex);
  return idx >= 0 ? OUTER_TERRITORY_DEFS[idx] : null;
}

export function canEnterBlueRuinZone(player, state) {
  if (!player || !state) return false;
  const inners = INNER_BY_FACTION[player.faction];
  if (!inners || inners.length !== 2) return false;
  const owned = player.ownedTerritories || [];
  const hasBoth = inners.every((id) => owned.includes(id));
  if (!hasBoth) return false;
  const combined = (player.armyStrength ?? 0) + (player.defenseStrength ?? 0);
  if (combined < MIN_COMBINED_STATS) return false;
  if ((player.gold ?? 0) < BLUE_RUIN_FEE) return false;
  return true;
}

// Initial State
const initialState = {
  players: [],
  currentPlayerIndex: 0,
  boardSpaces: [],
  cardDecks: {
    resource: [],
    army: [],
    defense: [],
    fate: [],
    penalty: [],
    territory: [],
  },
  territories: {},
  gamePhase: 'setup', // setup, playing, ended
  diceRoll: null, // Array of [die1, die2] or null
  isRolling: false,
  doublesBonusUsed: false, // Track if player has used their doubles bonus roll this turn
  doublesExtraRollAvailable: false, // Whether a doubles extra roll is still available this turn (persists through card popups)
  selectedTerritory: null,
  selectedCorner: null, // 'tl', 'tr', 'bl', 'br' for corner selection
  pendingIncomeTypeSelection: null, // Territory ID that needs income type selection
  incomeNotification: null, // { playerId, amount } when income is collected
  combatActive: false, // Whether combat is currently happening
  combatData: null, // { attackerId, defenderId, territoryId?, attackerRoll, defenderRoll, attackerTotal, defenderTotal, attackerBribe, defenderBribe, winner, difference }
  attackedPlayers: {}, // Track which players have been attacked by current player: { [playerId]: [defenderIds] }
  firstPlayerRolls: null, // [ { playerId, roll: [d1, d2], sum } ] when determining first player
  tollBooths: {}, // { [ownerPlayerId]: { spaceIndex, roundsLeft } } – r6
  attackImmunity: {}, // { [attackerId]: { [defenderId]: turnsRemaining } } – r8
  currentRound: 0,
  cannotMoveNextTurn: {}, // { [playerId]: true } – a9
  defensiveStructures: {}, // { [playerId]: true } – d6
  sealedSpaces: {}, // { [spaceIndex]: roundsLeft } – d7
  reverseMovement: {}, // { [playerId]: rollsLeft } – d9
  penaltyImmunity: {}, // { [playerId]: true } – d0
  alliances: {}, // { [playerId]: { allyId, turnsLeft } } – f7
  reverseUntilBattleWin: {}, // { [playerId]: true } – f0
  cannotBuyTerritories: {}, // { [playerId]: turnsLeft } – p6
  territoryCostPlus100: {}, // { [playerId]: true } – p7
  goldBlockedUntilPayoff: {}, // { [playerId]: true } – p0
  testingMode: false,
  landedOnStart: null, // { moverId, ownerId, spaceIndex } when mover lands on any START – stay or fast travel
  landedOnStartChoice: null, // { moverId, ownerId } when staying on another's START – bribe or fight
  treasuryGold: 0, // 500g fee for Blue Ruin Zone
  gauntlet: null, // { targetId, challengerIds, challengerIndex, phase: 'clash'|'sacrifice_prompt' }
  victorId: null, // winner when gamePhase === 'ended'
  castleState: 'ruins', // 'ruins' | 'repaired' – center castle; repaired when pay to enter Blue Ruin, ruins on Gauntlet loss
};

const PENALTY_SPECIALS = ['banished', 'currency_tanked', 'rebellion', 'secrets_sold', 'bank_debt'];

function isGoldBlocked(state, playerId) {
  return !!((state.goldBlockedUntilPayoff || {})[playerId]);
}

function applyPenaltySpecialState(state, targetPlayerId, special) {
  const target = state.players.find(p => p.id === targetPlayerId);
  if (!target) return state;
  const totalSpaces = state.boardSpaces.length || 1;
  const n = state.players.length;
  const targetIdx = state.players.findIndex(p => p.id === targetPlayerId);
  const rightIdx = (targetIdx + 1) % n;
  const rightId = state.players[rightIdx]?.id;
  let next = { ...state };

  if (special === 'banished') {
    next.players = state.players.map(p =>
      p.id === targetPlayerId ? { ...p, position: (p.position - 10 + totalSpaces) % totalSpaces } : p
    );
    next.cannotBuyTerritories = { ...(state.cannotBuyTerritories || {}), [targetPlayerId]: 2 };
    return next;
  }
  if (special === 'currency_tanked') {
    next.territoryCostPlus100 = { ...(state.territoryCostPlus100 || {}), [targetPlayerId]: true };
    return next;
  }
  if (special === 'rebellion') {
    const count = (target.ownedTerritories || []).length;
    const loss = Math.floor(count / 2);
    next.players = state.players.map(p =>
      p.id === targetPlayerId ? { ...p, armyStrength: Math.max(0, p.armyStrength - loss) } : p
    );
    return next;
  }
  if (special === 'secrets_sold') {
    if (!rightId || rightId === targetPlayerId) return state;
    next.players = state.players.map(p => {
      if (p.id === targetPlayerId) return { ...p, defenseStrength: Math.max(0, p.defenseStrength - 1) };
      if (p.id === rightId) return { ...p, defenseStrength: Math.min(100, p.defenseStrength + 1) };
      return p;
    });
    return next;
  }
  if (special === 'bank_debt') {
    next.goldBlockedUntilPayoff = { ...(state.goldBlockedUntilPayoff || {}), [targetPlayerId]: true };
    return next;
  }
  return state;
}

// Game Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      const { players: initPlayers, boardSpaces: initSpaces, cardDecks: initDecks, testingMode: initTesting = false } = action.payload;
      return {
        ...state,
        players: initPlayers,
        boardSpaces: initSpaces,
        cardDecks: initDecks,
        gamePhase: initTesting ? 'playing' : 'determine_first',
        currentPlayerIndex: 0,
        attackedPlayers: {},
        firstPlayerRolls: null,
        tollBooths: {},
        attackImmunity: {},
        currentRound: 0,
        cannotMoveNextTurn: {},
        defensiveStructures: {},
        sealedSpaces: {},
        reverseMovement: {},
        penaltyImmunity: {},
        alliances: {},
        reverseUntilBattleWin: {},
        cannotBuyTerritories: {},
        territoryCostPlus100: {},
        goldBlockedUntilPayoff: {},
        testingMode: !!initTesting,
        landedOnStartChoice: null,
        landedOnStart: null,
        treasuryGold: 0,
        gauntlet: null,
        victorId: null,
        castleState: 'ruins',
      };
    }

    case 'STORE_FIRST_PLAYER_ROLLS':
      return {
        ...state,
        firstPlayerRolls: action.payload,
      };

    case 'ADD_FIRST_PLAYER_ROLL':
      const r = action.payload;
      return {
        ...state,
        firstPlayerRolls: state.firstPlayerRolls == null
          ? [r]
          : [...state.firstPlayerRolls, r],
      };

    case 'CLEAR_FIRST_PLAYER_ROLLS':
      return {
        ...state,
        firstPlayerRolls: null,
      };

    case 'SET_FIRST_PLAYER':
      const rolls = state.firstPlayerRolls;
      if (!rolls || !rolls.length) return state;
      const minSum = Math.min(...rolls.map((r) => r.sum));
      const firstEntry = rolls.find((r) => r.sum === minSum);
      if (!firstEntry) return state;
      const firstIndex = state.players.findIndex((p) => p.id === firstEntry.playerId);
      return {
        ...state,
        gamePhase: 'playing',
        currentPlayerIndex: firstIndex >= 0 ? firstIndex : 0,
        firstPlayerRolls: null,
      };

    case 'ROLL_DICE':
      return {
        ...state,
        isRolling: true,
      };

    case 'SET_DICE_RESULT':
      const [die1, die2] = action.payload;
      const isDoubles = die1 === die2;
      return {
        ...state,
        diceRoll: action.payload,
        isRolling: false,
        // If doubles rolled and bonus not used yet, mark extra roll as available
        doublesExtraRollAvailable: isDoubles && !state.doublesBonusUsed ? true : state.doublesExtraRollAvailable,
      };

    case 'CLEAR_DICE':
      return {
        ...state,
        diceRoll: null,
        // Don't reset doublesBonusUsed here - it should persist until next turn
      };

    case 'USE_DOUBLES_BONUS':
      return {
        ...state,
        doublesBonusUsed: true,
        doublesExtraRollAvailable: false, // Clear the flag when bonus is used
      };

    case 'MOVE_PLAYER':
      const { playerId, spaces } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      if (!player) return state;
      
      const startPosition = player.position;
      const totalSpaces = state.boardSpaces.length;
      const newPosition = (startPosition + spaces) % totalSpaces;
      
      // Check if player passed their START space and collect income
      // Map faction to corner position (START space)
      const factionToStartPosition = {
        'king': 0,    // top-left
        'dragon': 11, // top-right
        'knight': 32, // bottom-left
        'wizard': 21, // bottom-right
      };
      const playerStartIndex = player ? factionToStartPosition[player.faction] : undefined;
      
      let updatedPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, position: newPosition } : p
      );
      
      // Income collection: If player passed their START, collect:
      // - Base 100G
      // - +100G per outer territory (around the board)
      // - +1% of chosen stat (army/defense) per inner territory, based on that territory's setting
      if (playerStartIndex !== undefined && player.ownedTerritories.length > 0) {
        const passedStart = (startPosition < playerStartIndex && newPosition >= playerStartIndex) ||
                           (startPosition > playerStartIndex && newPosition < startPosition && spaces > 1) ||
                           (startPosition === playerStartIndex && spaces > 0);
        
        if (passedStart) {
          const innerTerritories = player.ownedTerritories.filter(t => t.startsWith('inner-'));
          const outerTerritories = player.ownedTerritories.filter(t => !t.startsWith('inner-'));
          
          // Gold from outer territories: +100G each
          const outerIncome = outerTerritories.length * 100;
          
          // Stat-based income from inner territories: 1% of chosen stat per territory
          const innerIncome = innerTerritories.reduce((sum, tid) => {
            const territory = state.territories[tid];
            const tIncomeType = territory?.incomeType;
            if (!tIncomeType) return sum;
            
            const statPercentage = tIncomeType === 'army' ? player.armyStrength : player.defenseStrength;
            const perTerritoryIncome = statPercentage * 0.01; // 1% of stat percentage value
            return sum + perTerritoryIncome;
          }, 0);
          
          const income = 100 + outerIncome + innerIncome;
          const roundInc = Math.round(income);
          const skipGold = isGoldBlocked(state, playerId);
          updatedPlayers = updatedPlayers.map(p =>
            p.id === playerId ? { ...p, gold: skipGold ? p.gold : p.gold + roundInc } : p
          );
        }
      }
      return { ...state, players: updatedPlayers };

    case 'MOVE_PLAYER_TO_POSITION':
      const { playerId: movePlayerId, position: targetPosition } = action.payload;
      const movePlayer = state.players.find(p => p.id === movePlayerId);
      if (!movePlayer) return state;
      
      return {
        ...state,
        players: state.players.map(p =>
          p.id === movePlayerId ? { ...p, position: targetPosition } : p
        ),
      };

    case 'MOVE_PLAYER_STEP': {
      const { playerId: stepPlayerId } = action.payload;
      const stepPlayer = state.players.find(p => p.id === stepPlayerId);
      if (!stepPlayer) return state;

      const stepCurrentPosition = stepPlayer.position;
      const stepTotalSpaces = state.boardSpaces.length;
      const revRolls = (state.reverseMovement || {})[stepPlayerId] ?? 0;
      const revUntilWin = !!((state.reverseUntilBattleWin || {})[stepPlayerId]);
      const useReverse = revRolls > 0 || revUntilWin;
      const dir = useReverse ? -1 : 1;
      let stepNextPosition = (stepCurrentPosition + dir + stepTotalSpaces) % stepTotalSpaces;

      // d7: sealed space – cannot land on or pass through; lose this step
      const sealed = state.sealedSpaces || {};
      if ((sealed[stepNextPosition] ?? 0) > 0) return state;

      // Check if player has moved out of range of previously attacked players
      const stepAttackedList = state.attackedPlayers[stepPlayerId] || [];
      const stillInRange = stepAttackedList.some(defenderId => {
        const defender = state.players.find(p => p.id === defenderId);
        if (!defender) return false;
        const forwardDistance = (defender.position - stepNextPosition + stepTotalSpaces) % stepTotalSpaces;
        return forwardDistance > 0 && forwardDistance <= 3;
      });

      const updatedAttackedPlayers = { ...state.attackedPlayers };
      if (!stillInRange && stepAttackedList.length > 0) {
        updatedAttackedPlayers[stepPlayerId] = [];
      }

      const stepFactionToStartPosition = {
        king: 0, dragon: 11, knight: 32, wizard: 21,
      };
      const stepPlayerStartIndex = stepPlayer ? stepFactionToStartPosition[stepPlayer.faction] : undefined;

      let stepUpdatedPlayers = state.players.map(p =>
        p.id === stepPlayerId ? { ...p, position: stepNextPosition } : p
      );
      const stepStateWithAttacked = { ...state, attackedPlayers: updatedAttackedPlayers };

      // Income: only when moving forward (d9 reverse skip)
      if (dir === 1) {
      // Income collection: If player passed their START, collect:
      // - Base 100G
      // - +100G per outer territory (around the board)
      // - +1% of chosen stat (army/defense) per inner territory, based on that territory's setting
      if (stepPlayerStartIndex !== undefined && stepPlayer.ownedTerritories.length > 0) {
        // Check if player passed their START - they just need to go past it
        const wrappedAround = stepCurrentPosition === stepTotalSpaces - 1 && stepNextPosition === 0;
        // Passed START if:
        // 1. Moving forward: from before START to at/after START (not wrapping)
        // 2. Wrapping: from last space to first space when START is at 0
        // 3. Wrapping and START is not at 0: if we've moved past START on the next cycle
        const passedStartForward = !wrappedAround && stepCurrentPosition < stepPlayerStartIndex && stepNextPosition >= stepPlayerStartIndex;
        const passedStartOnWrap = wrappedAround && stepPlayerStartIndex === 0;
        
        if (passedStartForward || passedStartOnWrap) {
          const innerTerritories = stepPlayer.ownedTerritories.filter(t => t.startsWith('inner-'));
          const outerTerritories = stepPlayer.ownedTerritories.filter(t => !t.startsWith('inner-'));
          
          // Gold from outer territories: +100G each
          const outerIncome = outerTerritories.length * 100;
          
          // Stat-based income from inner territories: 1% of chosen stat per territory
          const innerIncome = innerTerritories.reduce((sum, tid) => {
            const territory = state.territories[tid];
            const tIncomeType = territory?.incomeType;
            if (!tIncomeType) return sum;
            
            const statPercentage = tIncomeType === 'army' ? stepPlayer.armyStrength : stepPlayer.defenseStrength;
            const perTerritoryIncome = statPercentage * 0.01; // 1% of stat percentage value
            return sum + perTerritoryIncome;
          }, 0);
          
          const stepIncome = 100 + outerIncome + innerIncome;
          const roundedIncome = Math.round(stepIncome);
          const skipStepGold = isGoldBlocked(state, stepPlayerId);
          stepUpdatedPlayers = stepUpdatedPlayers.map(p =>
            p.id === stepPlayerId ? { ...p, gold: skipStepGold ? p.gold : p.gold + roundedIncome } : p
          );

          const tollBoothsIncome = state.tollBooths || {};
          for (const [ownerId, toll] of Object.entries(tollBoothsIncome)) {
            if (toll.spaceIndex !== stepNextPosition || ownerId === stepPlayerId) continue;
            const moverP = stepUpdatedPlayers.find(p => p.id === stepPlayerId);
            const ownerP = stepUpdatedPlayers.find(p => p.id === ownerId);
            if (!moverP || !ownerP) continue;
            const tollPay = Math.min(50, moverP.gold);
            const skipTollRecv = isGoldBlocked(state, ownerId);
            stepUpdatedPlayers = stepUpdatedPlayers.map(p => {
              if (p.id === stepPlayerId) return { ...p, gold: Math.max(0, p.gold - tollPay) };
              if (p.id === ownerId) return { ...p, gold: skipTollRecv ? p.gold : p.gold + tollPay };
              return p;
            });
            break;
          }
          // d6: defensive structures – land on opponent's territory, lose 1 Army
          const defStruct = state.defensiveStructures || {};
          for (const [, t] of Object.entries(state.territories || {})) {
            if (t.spaceIndex !== stepNextPosition || t.ownerId === stepPlayerId) continue;
            if (!defStruct[t.ownerId]) continue;
            const m = stepUpdatedPlayers.find(p => p.id === stepPlayerId);
            if (!m) break;
            stepUpdatedPlayers = stepUpdatedPlayers.map(p =>
              p.id === stepPlayerId ? { ...p, armyStrength: Math.max(0, p.armyStrength - 1) } : p
            );
            break;
          }
          return {
            ...stepStateWithAttacked,
            players: stepUpdatedPlayers,
            ...(!skipStepGold && {
              incomeNotification: { playerId: stepPlayerId, amount: roundedIncome, statType: stepPlayer.incomeType },
            }),
          };
        }
      }
      }

      const tollBooths = state.tollBooths || {};
      for (const [ownerId, toll] of Object.entries(tollBooths)) {
        if (toll.spaceIndex !== stepNextPosition || ownerId === stepPlayerId) continue;
        const mover = stepUpdatedPlayers.find(p => p.id === stepPlayerId);
        const owner = stepUpdatedPlayers.find(p => p.id === ownerId);
        if (!mover || !owner) continue;
        const tollPay = Math.min(50, mover.gold);
        const skipTollRecv = isGoldBlocked(state, ownerId);
        stepUpdatedPlayers = stepUpdatedPlayers.map(p => {
          if (p.id === stepPlayerId) return { ...p, gold: Math.max(0, p.gold - tollPay) };
          if (p.id === ownerId) return { ...p, gold: skipTollRecv ? p.gold : p.gold + tollPay };
          return p;
        });
        break;
      }
      // d6: defensive structures – land on opponent's territory, lose 1 Army
      const defStruct = state.defensiveStructures || {};
      for (const [, t] of Object.entries(state.territories || {})) {
        if (t.spaceIndex !== stepNextPosition || t.ownerId === stepPlayerId) continue;
        if (!defStruct[t.ownerId]) continue;
        const m = stepUpdatedPlayers.find(p => p.id === stepPlayerId);
        if (!m) break;
        stepUpdatedPlayers = stepUpdatedPlayers.map(p =>
          p.id === stepPlayerId ? { ...p, armyStrength: Math.max(0, p.armyStrength - 1) } : p
        );
        break;
      }
      return {
        ...stepStateWithAttacked,
        players: stepUpdatedPlayers,
      };
    }

    case 'PAY_OFF_GOLD_BLOCK': {
      const { playerId: payOffPlayerId } = action.payload;
      const payOffPlayer = state.players.find(p => p.id === payOffPlayerId);
      if (!payOffPlayer || !(state.goldBlockedUntilPayoff || {})[payOffPlayerId]) return state;
      const amount = Math.min(300, payOffPlayer.gold);
      const nextBlock = { ...(state.goldBlockedUntilPayoff || {}) };
      delete nextBlock[payOffPlayerId];
      return {
        ...state,
        goldBlockedUntilPayoff: nextBlock,
        players: state.players.map(p =>
          p.id === payOffPlayerId ? { ...p, gold: Math.max(0, p.gold - amount) } : p
        ),
      };
    }

    case 'DRAW_CARD': {
      const { deckType, randomIndex } = action.payload;
      const deck = state.cardDecks[deckType];
      if (!deck?.length) return state;
      const i = Math.max(0, Math.min(randomIndex ?? 0, deck.length - 1));
      const drawnCard = deck[i];
      const newDeck = [...deck.slice(0, i), ...deck.slice(i + 1)];

      return {
        ...state,
        cardDecks: {
          ...state.cardDecks,
          [deckType]: newDeck,
        },
        players: state.players.map(p =>
          p.id === state.players[state.currentPlayerIndex].id
            ? { ...p, lastDrawnCard: drawnCard }
            : p
        ),
      };
    }

    case 'TEST_DRAW_CARD': {
      const { card } = action.payload;
      const cp = state.players[state.currentPlayerIndex];
      if (!cp || !card) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === cp.id ? { ...p, lastDrawnCard: { ...card } } : p
        ),
      };
    }

    case 'APPLY_CARD_EFFECT': {
      const { playerId: pid, effect, isPenalty } = action.payload;
      const imm = (state.penaltyImmunity || {})[pid];
      if (isPenalty && imm) {
        const nextPenaltyImmunity = { ...(state.penaltyImmunity || {}) };
        delete nextPenaltyImmunity[pid];
        return {
          ...state,
          penaltyImmunity: nextPenaltyImmunity,
          players: state.players.map(p => (p.id === pid ? { ...p, lastDrawnCard: null } : p)),
        };
      }
      if (isPenalty && effect?.special && PENALTY_SPECIALS.includes(effect.special)) {
        const next = applyPenaltySpecialState(state, pid, effect.special);
        return {
          ...next,
          players: next.players.map(p => (p.id === pid ? { ...p, lastDrawnCard: null } : p)),
        };
      }
      if (effect?.special === 'gold_per_territory') {
        const pl = state.players.find(p => p.id === pid);
        if (!pl) return state;
        const count = pl.ownedTerritories?.length ?? 0;
        const gold = (effect.amountPer ?? 50) * count;
        const skipG = gold > 0 && isGoldBlocked(state, pid);
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id !== pid) return p;
            return {
              ...p,
              gold: skipG ? p.gold : Math.max(0, p.gold + gold),
              lastDrawnCard: null,
            };
          }),
        };
      }
      if (effect?.special) return state; // Handled by APPLY_SPECIAL_*
      const eg = effect.gold || 0;
      const skipGold = eg > 0 && isGoldBlocked(state, pid);
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id !== pid) return p;
          return {
            ...p,
            gold: skipGold ? p.gold : Math.max(0, p.gold + eg),
            armyStrength: Math.max(0, Math.min(100, p.armyStrength + (effect.army || 0))),
            defenseStrength: Math.max(0, Math.min(100, p.defenseStrength + (effect.defense || 0))),
            lastDrawnCard: null,
          };
        }),
      };
    }

    case 'APPLY_SPECIAL_RESOURCE': {
      const { cardId, playerId, targetPlayerId } = action.payload;
      const actor = state.players.find(p => p.id === playerId);
      if (!actor) return state;
      const factionToStart = { king: 0, dragon: 11, knight: 32, wizard: 21 };
      const startIndex = factionToStart[actor.faction];

      if (cardId === 'r6') {
        const spaceIndex = actor.position;
        return {
          ...state,
          tollBooths: { ...state.tollBooths, [playerId]: { spaceIndex, roundsLeft: 3 } },
          players: state.players.map(p =>
            p.id === playerId ? { ...p, lastDrawnCard: null } : p
          ),
        };
      }

      if (cardId === 'r8') {
        const target = state.players.find(p => p.id === targetPlayerId);
        if (!target || targetPlayerId === playerId) return state;
        const imm = { ...(state.attackImmunity[playerId] || {}), [targetPlayerId]: 2 };
        const skipA = isGoldBlocked(state, playerId);
        const skipB = isGoldBlocked(state, targetPlayerId);
        return {
          ...state,
          attackImmunity: { ...state.attackImmunity, [playerId]: imm },
          players: state.players.map(p => {
            if (p.id === playerId) return { ...p, gold: skipA ? p.gold : p.gold + 200, lastDrawnCard: null };
            if (p.id === targetPlayerId) return { ...p, gold: skipB ? p.gold : p.gold + 200 };
            return p;
          }),
        };
      }

      if (cardId === 'r9') {
        const inner = (actor.ownedTerritories || []).filter(t => t.startsWith('inner-'));
        const outer = (actor.ownedTerritories || []).filter(t => !t.startsWith('inner-'));
        const outerIncome = outer.length * 100;
        const innerIncome = inner.reduce((sum, tid) => {
          const t = state.territories[tid];
          const ty = t?.incomeType;
          if (!ty) return sum;
          const stat = ty === 'army' ? actor.armyStrength : actor.defenseStrength;
          return sum + stat * 0.01;
        }, 0);
        const income = Math.round(100 + outerIncome + innerIncome);
        const skipG = isGoldBlocked(state, playerId);
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id !== playerId) return p;
            return {
              ...p,
              position: startIndex,
              gold: skipG ? p.gold : Math.max(0, p.gold + income),
              lastDrawnCard: null,
            };
          }),
        };
      }

      return state;
    }

    case 'APPLY_SPECIAL_ARMY': {
      const { cardId, playerId, targetPlayerId } = action.payload;
      const actor = state.players.find(p => p.id === playerId);
      if (!actor) return state;
      const totalSpaces = state.boardSpaces.length;

      if (cardId === 'a6') {
        const others = state.players.filter(p => p.id !== playerId);
        if (others.length === 0) return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        const maxArmy = Math.max(...others.map(p => p.armyStrength));
        const victim = others.find(p => p.armyStrength === maxArmy);
        if (!victim || victim.armyStrength <= 0) return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id === playerId) return { ...p, armyStrength: Math.min(100, p.armyStrength + 1), lastDrawnCard: null };
            if (p.id === victim.id) return { ...p, armyStrength: Math.max(0, p.armyStrength - 1) };
            return p;
          }),
        };
      }

      if (cardId === 'a7') {
        const target = targetPlayerId ? state.players.find(p => p.id === targetPlayerId) : null;
        if (!target || targetPlayerId === playerId) {
          return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        }
        const rollA = rollD6();
        const rollB = rollD6();
        let next = state.players.map(p => {
          if (p.id !== playerId && p.id !== targetPlayerId) return p;
          if (p.id === playerId) return { ...p, lastDrawnCard: null };
          return p;
        });
        if (rollA < rollB) next = next.map(p => p.id === playerId ? { ...p, armyStrength: Math.max(0, p.armyStrength - 1) } : p);
        else if (rollB < rollA) next = next.map(p => p.id === targetPlayerId ? { ...p, armyStrength: Math.max(0, p.armyStrength - 1) } : p);
        return { ...state, players: next };
      }

      if (cardId === 'a8') {
        const opponentTerrs = Object.entries(state.territories || {}).filter(
          ([tid, t]) => t.ownerId !== playerId && !tid.startsWith('inner-') && t.spaceIndex != null
        );
        if (opponentTerrs.length === 0) {
          return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        }
        let best = null;
        let bestDist = Infinity;
        for (const [, t] of opponentTerrs) {
          const d = (t.spaceIndex - actor.position + totalSpaces) % totalSpaces;
          if (d > 0 && d < bestDist) { bestDist = d; best = t; }
        }
        if (!best) {
          return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        }
        const owner = state.players.find(p => p.id === best.ownerId);
        const steal = owner && actor.armyStrength > owner.defenseStrength ? Math.min(200, owner.gold) : 0;
        const skipSteal = isGoldBlocked(state, playerId);
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id === playerId) {
              return { ...p, position: best.spaceIndex, gold: skipSteal ? p.gold : p.gold + steal, lastDrawnCard: null };
            }
            if (p.id === best.ownerId) return { ...p, gold: Math.max(0, p.gold - steal) };
            return p;
          }),
        };
      }

      if (cardId === 'a9') {
        return {
          ...state,
          cannotMoveNextTurn: { ...state.cannotMoveNextTurn, [playerId]: true },
          players: state.players.map(p =>
            p.id === playerId ? { ...p, armyStrength: Math.min(100, p.armyStrength + 3), lastDrawnCard: null } : p
          ),
        };
      }

      if (cardId === 'a0') {
        const target = targetPlayerId ? state.players.find(p => p.id === targetPlayerId) : null;
        if (!target || targetPlayerId === playerId || actor.gold < 100) {
          return { ...state, players: state.players.map(p => p.id === playerId ? { ...p, lastDrawnCard: null } : p) };
        }
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id === playerId) return { ...p, gold: p.gold - 100, armyStrength: Math.min(100, p.armyStrength + 1), lastDrawnCard: null };
            if (p.id === targetPlayerId) return { ...p, defenseStrength: Math.max(0, p.defenseStrength - 2) };
            return p;
          }),
        };
      }

      return state;
    }

    case 'APPLY_SPECIAL_DEFENSE': {
      const { cardId, playerId } = action.payload;
      const actor = state.players.find(p => p.id === playerId);
      if (!actor) return state;

      if (cardId === 'd6') {
        return {
          ...state,
          defensiveStructures: { ...(state.defensiveStructures || {}), [playerId]: true },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      if (cardId === 'd7') {
        const spaceIndex = actor.position;
        return {
          ...state,
          sealedSpaces: { ...(state.sealedSpaces || {}), [spaceIndex]: 1 },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      if (cardId === 'd8') {
        const outer = (actor.ownedTerritories || []).filter(t => !t.startsWith('inner-'));
        let bestSpace = null;
        for (const tid of outer) {
          const t = state.territories[tid];
          if (t?.ownerId === playerId && t.spaceIndex != null) { bestSpace = t.spaceIndex; break; }
        }
        if (bestSpace == null) {
          return { ...state, players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)) };
        }
        return {
          ...state,
          players: state.players.map(p =>
            p.id === playerId ? { ...p, position: bestSpace, lastDrawnCard: null } : p
          ),
        };
      }

      if (cardId === 'd9') {
        return {
          ...state,
          reverseMovement: { ...(state.reverseMovement || {}), [playerId]: 4 },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      if (cardId === 'd0') {
        return {
          ...state,
          penaltyImmunity: { ...(state.penaltyImmunity || {}), [playerId]: true },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      return state;
    }

    case 'DECREMENT_REVERSE_ROLLS': {
      const { decPlayerId } = action.payload;
      const rev = state.reverseMovement || {};
      const rollsLeft = (rev[decPlayerId] ?? 0) - 1;
      const next = { ...rev };
      if (rollsLeft <= 0) delete next[decPlayerId];
      else next[decPlayerId] = rollsLeft;
      return { ...state, reverseMovement: next };
    }

    case 'APPLY_SPECIAL_FATE': {
      const { cardId, playerId, targetPlayerId } = action.payload;
      const actor = state.players.find(p => p.id === playerId);
      if (!actor) return state;
      const totalSpaces = state.boardSpaces.length;

      if (cardId === 'f6') {
        const target = targetPlayerId ? state.players.find(p => p.id === targetPlayerId) : null;
        if (!target || targetPlayerId === playerId) {
          return { ...state, players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)) };
        }
        const posA = actor.position;
        const posB = target.position;
        return {
          ...state,
          players: state.players.map(p => {
            if (p.id === playerId) return { ...p, position: posB, lastDrawnCard: null };
            if (p.id === targetPlayerId) return { ...p, position: posA };
            return p;
          }),
        };
      }

      if (cardId === 'f7') {
        const target = targetPlayerId ? state.players.find(p => p.id === targetPlayerId) : null;
        if (!target || targetPlayerId === playerId) {
          return { ...state, players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)) };
        }
        const shared = { [playerId]: { allyId: targetPlayerId, turnsLeft: 3 }, [targetPlayerId]: { allyId: playerId, turnsLeft: 3 } };
        return {
          ...state,
          alliances: { ...(state.alliances || {}), ...shared },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      if (cardId === 'f8') {
        const newPos = (actor.position + 5) % (totalSpaces || 1);
        const skipF8 = isGoldBlocked(state, playerId);
        return {
          ...state,
          players: state.players.map(p =>
            p.id === playerId ? { ...p, position: newPos, gold: skipF8 ? p.gold : p.gold + 100, lastDrawnCard: null } : p
          ),
        };
      }

      if (cardId === 'f9') {
        return {
          ...state,
          penaltyImmunity: { ...(state.penaltyImmunity || {}), [playerId]: true },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      if (cardId === 'f0') {
        return {
          ...state,
          reverseUntilBattleWin: { ...(state.reverseUntilBattleWin || {}), [playerId]: true },
          players: state.players.map(p => (p.id === playerId ? { ...p, lastDrawnCard: null } : p)),
        };
      }

      return state;
    }

    case 'KEEP_DRAWN_CARD': {
      const keepPlayerId = state.players[state.currentPlayerIndex].id;
      const kept = state.players.find(p => p.id === keepPlayerId)?.lastDrawnCard;
      if (!kept) return state;
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id !== keepPlayerId) return p;
          return {
            ...p,
            hand: [...(p.hand || []), { ...kept }],
            lastDrawnCard: null,
          };
        }),
      };
    }

    case 'USE_FATE_CARD': {
      const { playerId: fatePlayerId, cardIndex } = action.payload;
      const fatePlayer = state.players.find(p => p.id === fatePlayerId);
      if (!fatePlayer || !fatePlayer.hand?.length || cardIndex < 0 || cardIndex >= fatePlayer.hand.length) return state;
      const card = fatePlayer.hand[cardIndex];
      if (card.type !== 'fate' || !card.effect) return state;
      const handAfter = fatePlayer.hand.filter((_, i) => i !== cardIndex);
      const fg = card.effect.gold || 0;
      const skipFateGold = fg > 0 && isGoldBlocked(state, fatePlayerId);
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id !== fatePlayerId) return p;
          return {
            ...p,
            hand: handAfter,
            gold: skipFateGold ? p.gold : Math.max(0, p.gold + fg),
            armyStrength: Math.max(0, Math.min(100, p.armyStrength + (card.effect.army || 0))),
            defenseStrength: Math.max(0, Math.min(100, p.defenseStrength + (card.effect.defense || 0))),
          };
        }),
      };
    }

    case 'USE_PENALTY_CARD': {
      const { ownerId, targetPlayerId, cardIndex } = action.payload;
      const owner = state.players.find(p => p.id === ownerId);
      const target = state.players.find(p => p.id === targetPlayerId);
      if (!owner || !target || !owner.hand?.length || cardIndex < 0 || cardIndex >= owner.hand.length) return state;
      const card = owner.hand[cardIndex];
      if (card.type !== 'penalty' || !card.effect) return state;
      const handAfter = owner.hand.filter((_, i) => i !== cardIndex);
      const immune = (state.penaltyImmunity || {})[targetPlayerId];
      const nextPenaltyImmunity = { ...(state.penaltyImmunity || {}) };
      if (immune) delete nextPenaltyImmunity[targetPlayerId];
      const isSpecial = card.effect.special && PENALTY_SPECIALS.includes(card.effect.special);
      if (isSpecial && !immune) {
        const next = applyPenaltySpecialState(
          { ...state, penaltyImmunity: nextPenaltyImmunity },
          targetPlayerId,
          card.effect.special
        );
        return {
          ...next,
          players: next.players.map(p => (p.id === ownerId ? { ...p, hand: handAfter } : p)),
        };
      }
      if (isSpecial && immune) {
        return {
          ...state,
          penaltyImmunity: nextPenaltyImmunity,
          players: state.players.map(p => (p.id === ownerId ? { ...p, hand: handAfter } : p)),
        };
      }
      const pg = card.effect.gold || 0;
      const skipPenaltyGold = pg > 0 && isGoldBlocked(state, targetPlayerId);
      return {
        ...state,
        penaltyImmunity: nextPenaltyImmunity,
        players: state.players.map(p => {
          if (p.id === ownerId) return { ...p, hand: handAfter };
          if (p.id !== targetPlayerId) return p;
          if (immune) return p;
          return {
            ...p,
            gold: skipPenaltyGold ? p.gold : Math.max(0, p.gold + pg),
            armyStrength: Math.max(0, Math.min(100, p.armyStrength + (card.effect.army || 0))),
            defenseStrength: Math.max(0, Math.min(100, p.defenseStrength + (card.effect.defense || 0))),
          };
        }),
      };
    }

    case 'SELL_CARD': {
      const { sellerId, buyerId, cardIndex, price } = action.payload;
      const seller = state.players.find(p => p.id === sellerId);
      const buyer = state.players.find(p => p.id === buyerId);
      const p = price ?? 100;
      if (!seller || !buyer || buyer.gold < p || !seller.hand?.length || cardIndex < 0 || cardIndex >= seller.hand.length) return state;
      const card = seller.hand[cardIndex];
      const handAfter = seller.hand.filter((_, i) => i !== cardIndex);
      const skipSellGold = isGoldBlocked(state, sellerId);
      return {
        ...state,
        players: state.players.map(pl => {
          if (pl.id === sellerId) return { ...pl, hand: handAfter, gold: skipSellGold ? pl.gold : pl.gold + p };
          if (pl.id === buyerId) return { ...pl, gold: pl.gold - p, hand: [...(pl.hand || []), { ...card }] };
          return pl;
        }),
      };
    }

    case 'SET_PLAYER_STATS':
      const { playerId: statPlayerId, gold: newGold, armyStrength: newArmy, defenseStrength: newDefense } = action.payload;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === statPlayerId
            ? {
                ...p,
                gold: newGold !== undefined ? Math.max(0, newGold) : p.gold,
                armyStrength: newArmy !== undefined ? Math.max(0, Math.min(100, newArmy)) : p.armyStrength,
                defenseStrength: newDefense !== undefined ? Math.max(0, Math.min(100, newDefense)) : p.defenseStrength,
              }
            : p
        ),
      };

    case 'PURCHASE_TERRITORY': {
      const { territoryId, ownerId, cost, spaceIndex, name, bribe, backgroundImage } = action.payload;
      if ((state.cannotBuyTerritories || {})[ownerId]) return state;
      const owner = state.players.find(p => p.id === ownerId);
      const plus100 = (state.territoryCostPlus100 || {})[ownerId];
      const actualCost = plus100 ? cost + 100 : cost;
      if (!owner || owner.gold < actualCost) return state;
      const nextPlus100 = { ...(state.territoryCostPlus100 || {}) };
      if (plus100) delete nextPlus100[ownerId];
      const territoryData = { ownerId, purchased: true, spaceIndex };
      if (name != null) territoryData.name = name;
      if (bribe != null) territoryData.bribe = bribe;
      if (backgroundImage != null) territoryData.backgroundImage = backgroundImage;
      return {
        ...state,
        territoryCostPlus100: nextPlus100,
        territories: {
          ...state.territories,
          [territoryId]: territoryData,
        },
        boardSpaces: state.boardSpaces.map((space, idx) =>
          idx === spaceIndex
            ? { ...space, ownerId, owned: true, ownerName: owner?.name, ownerIcon: owner?.icon }
            : space
        ),
        players: state.players.map(p =>
          p.id === ownerId ? { ...p, gold: p.gold - actualCost, ownedTerritories: [...p.ownedTerritories, territoryId] } : p
        ),
      };
    }

    case 'PAY_TRIBUTE': {
      const { fromPlayerId, toPlayerId, amount } = action.payload;
      const skipTribute = isGoldBlocked(state, toPlayerId);
      return {
        ...state,
        players: state.players.map(p => {
          if (p.id === fromPlayerId) return { ...p, gold: Math.max(0, p.gold - amount) };
          if (p.id === toPlayerId) return { ...p, gold: skipTribute ? p.gold : p.gold + amount };
          return p;
        }),
      };
    }

    case 'SET_LANDED_ON_START':
      return { ...state, landedOnStart: action.payload };

    case 'SET_LANDED_ON_START_PHASE': {
      const land = state.landedOnStart;
      if (!land) return state;
      return { ...state, landedOnStart: { ...land, phase: action.payload } };
    }

    case 'CLEAR_LANDED_ON_START':
      return { ...state, landedOnStart: null };

    case 'SET_LANDED_ON_START_CHOICE':
      return { ...state, landedOnStartChoice: action.payload };

    case 'CLEAR_LANDED_ON_START_CHOICE':
      return { ...state, landedOnStartChoice: null };

    case 'PAY_START_BRIBE': {
      const { moverId, ownerId, amount } = action.payload;
      const mover = state.players.find(p => p.id === moverId);
      const owner = state.players.find(p => p.id === ownerId);
      if (!mover || !owner || mover.gold < amount) return state;
      const skipOwnerGold = isGoldBlocked(state, ownerId);
      const land = state.landedOnStart;
      const nextLand = land ? { ...land, phase: 'post-bribe-fight' } : null;
      return {
        ...state,
        landedOnStartChoice: null,
        landedOnStart: nextLand,
        players: state.players.map(p => {
          if (p.id === moverId) return { ...p, gold: p.gold - amount };
          if (p.id === ownerId) return { ...p, gold: skipOwnerGold ? p.gold : p.gold + amount };
          return p;
        }),
      };
    }

    case 'START_COMBAT': {
      const pl = action.payload;
      return {
        ...state,
        combatActive: true,
        combatData: {
          attackerId: pl.attackerId,
          defenderId: pl.defenderId,
          territoryId: pl.territoryId,
          diceRolled: false,
          attackerBribe: 0,
          defenderBribe: 0,
          bribePot: 0,
          combatSource: pl.combatSource ?? null,
          combatMode: pl.combatMode ?? null, // 'tactical' = Army+Defense for both
        },
      };
    }

    case 'ROLL_COMBAT_DICE': {
      if (!state.combatData) return state;
      const currentAttacker = state.players.find(p => p.id === state.combatData.attackerId);
      const currentDefender = state.players.find(p => p.id === state.combatData.defenderId);
      if (!currentAttacker || !currentDefender) return state;

      const tactical = state.combatData.combatMode === 'tactical';
      const alliances = state.alliances || {};
      const getEffectiveArmy = (pid) => {
        const a = alliances[pid];
        if (!a?.allyId) return state.players.find(p => p.id === pid)?.armyStrength ?? 0;
        const pl = state.players.find(x => x.id === pid);
        const ally = state.players.find(x => x.id === a.allyId);
        return Math.max(pl?.armyStrength ?? 0, ally?.armyStrength ?? 0);
      };
      const atkArmy = getEffectiveArmy(state.combatData.attackerId);
      const atkStat = tactical ? (currentAttacker.armyStrength ?? 0) + (currentAttacker.defenseStrength ?? 0) : atkArmy;
      const defStat = tactical ? (currentDefender.armyStrength ?? 0) + (currentDefender.defenseStrength ?? 0) : (currentDefender.defenseStrength ?? 0);

      let atkDie1, atkDie2, atkRoll;
      let defDie1, defDie2, defRoll;
      let atkTotalRolled, defTotalRolled;
      const atkCardBonus = 0;
      const defCardBonus = 0;

      for (let i = 0; i < 50; i++) {
        atkDie1 = rollD6();
        atkDie2 = rollD6();
        atkRoll = atkDie1 + atkDie2;
        defDie1 = rollD6();
        defDie2 = rollD6();
        defRoll = defDie1 + defDie2;
        atkTotalRolled = atkRoll + atkStat + atkCardBonus + (state.combatData.attackerBribe || 0);
        defTotalRolled = defRoll + defStat + defCardBonus + (state.combatData.defenderBribe || 0);
        if (atkTotalRolled !== defTotalRolled) break;
      }

      return {
        ...state,
        combatData: {
          ...state.combatData,
          diceRolled: true,
          attackerRoll: atkRoll,
          defenderRoll: defRoll,
          attackerDice: [atkDie1, atkDie2],
          defenderDice: [defDie1, defDie2],
          attackerTotal: atkTotalRolled,
          defenderTotal: defTotalRolled,
        },
      };
    }

    case 'ADD_COMBAT_BRIBE':
      const { playerId: bribePlayerId } = action.payload;
      if (!state.combatData) return state;
      
      const bribePlayer = state.players.find(p => p.id === bribePlayerId);
      if (!bribePlayer || bribePlayer.gold < GAUNTLET_BRIBE_COST) return state;
      
      const updatedCombatData = { ...state.combatData };
      const gauntletUnlimitedBribe = state.combatData.combatSource === 'gauntlet';
      const MAX_BRIBES = gauntletUnlimitedBribe ? Infinity : 3;
      
      let currentBribeCount = 0;
      if (bribePlayerId === updatedCombatData.attackerId) {
        currentBribeCount = updatedCombatData.attackerBribe || 0;
        if (currentBribeCount >= MAX_BRIBES) return state;
        updatedCombatData.attackerBribe = currentBribeCount + 1;
      } else if (bribePlayerId === updatedCombatData.defenderId) {
        currentBribeCount = updatedCombatData.defenderBribe || 0;
        if (currentBribeCount >= MAX_BRIBES) return state;
        updatedCombatData.defenderBribe = currentBribeCount + 1;
      }

      updatedCombatData.bribePot = (updatedCombatData.bribePot || 0) + GAUNTLET_BRIBE_COST;
      const bribeUpdatedPlayers = state.players.map(p =>
        p.id === bribePlayerId ? { ...p, gold: p.gold - GAUNTLET_BRIBE_COST } : p
      );
      
      return {
        ...state,
        combatData: updatedCombatData,
        players: bribeUpdatedPlayers,
      };

    case 'RESOLVE_COMBAT':
      const combatPayload = action.payload;
      const { attackerId: atkId, defenderId: defId, territoryId: combatTid, attackerTotal: atkTotal, defenderTotal: defTotal, attackerBribe: atkBribe, defenderBribe: defBribe } = combatPayload;
      const difference = Math.abs(atkTotal - defTotal);
      const attackerWins = atkTotal > defTotal;
      const isGauntlet = combatPayload.combatSource === 'gauntlet';

      let postCombatPlayers = state.players;
      let newTerritories = state.territories;
      let newBoardSpaces = state.boardSpaces;
      let nextReverseUntilBattleWin = state.reverseUntilBattleWin;

      if (!isGauntlet) {
        const goldPayment = difference * 10;
        const bribePot = combatPayload.bribePot || 0;
        const winnerId = attackerWins ? atkId : defId;
        const skipCombatGold = isGoldBlocked(state, winnerId);
        postCombatPlayers = postCombatPlayers.map(p => {
          if (attackerWins) {
            if (p.id === atkId) return { ...p, gold: skipCombatGold ? p.gold : p.gold + goldPayment + bribePot };
            if (p.id === defId) return { ...p, gold: Math.max(0, p.gold - goldPayment) };
          } else {
            if (p.id === defId) return { ...p, gold: skipCombatGold ? p.gold : p.gold + goldPayment + bribePot };
            if (p.id === atkId) return { ...p, gold: Math.max(0, p.gold - goldPayment) };
          }
          return p;
        });

        if (attackerWins && combatTid && state.territories[combatTid]) {
          newTerritories = { ...state.territories };
          const existingTerritory = newTerritories[combatTid];
          const attacker = postCombatPlayers.find(p => p.id === atkId);
          newTerritories[combatTid] = { ...existingTerritory, ownerId: atkId };
          const spaceIndex = existingTerritory.spaceIndex;
          if (spaceIndex !== undefined) {
            newBoardSpaces = state.boardSpaces.map((space, idx) =>
              idx === spaceIndex
                ? { ...space, ownerId: atkId, ownerName: attacker?.name, ownerIcon: attacker?.icon }
                : space
            );
          }
          postCombatPlayers = postCombatPlayers.map(p => {
            if (p.id === atkId) return { ...p, ownedTerritories: [...p.ownedTerritories.filter(t => t !== combatTid), combatTid] };
            if (p.id === defId) return { ...p, ownedTerritories: p.ownedTerritories.filter(t => t !== combatTid) };
            return p;
          });
        }

        nextReverseUntilBattleWin = { ...(state.reverseUntilBattleWin || {}) };
        const ruwWinner = attackerWins ? atkId : defId;
        if (ruwWinner) delete nextReverseUntilBattleWin[ruwWinner];
      }

      const combatWinnerId = attackerWins ? atkId : defId;
      return {
        ...state,
        players: postCombatPlayers,
        territories: newTerritories,
        boardSpaces: newBoardSpaces,
        reverseUntilBattleWin: nextReverseUntilBattleWin,
        combatActive: isGauntlet ? true : false,
        combatData: {
          ...combatPayload,
          winner: combatWinnerId,
          loser: attackerWins ? defId : atkId,
          difference,
          goldPayment: isGauntlet ? 0 : difference * 10,
          bribePot: combatPayload.bribePot || 0,
        },
      };

    case 'END_COMBAT':
      return {
        ...state,
        combatActive: false,
        combatData: null,
      };

    case 'ATTACK_TERRITORY':
      // Legacy case - keeping for backwards compatibility, but new combat uses START_COMBAT -> RESOLVE_COMBAT
      const { attackerId: legacyAtkId, defenderId: legacyDefId, territoryId: legacyTid, attackerWins: legacyAtkWins } = action.payload;
      if (legacyAtkWins) {
        // Transfer territory
        const legacyTerritories = { ...state.territories };
        const existingTerritory = legacyTerritories[legacyTid];
        const attacker = state.players.find(p => p.id === legacyAtkId);
        
        if (existingTerritory) {
          // Preserve spaceIndex when transferring
          legacyTerritories[legacyTid] = { ...existingTerritory, ownerId: legacyAtkId };
          
          // Update board space ownership
          const spaceIndex = existingTerritory.spaceIndex;
          return {
            ...state,
            territories: legacyTerritories,
            boardSpaces: state.boardSpaces.map((space, idx) =>
              idx === spaceIndex
                ? { ...space, ownerId: legacyAtkId, ownerName: attacker?.name, ownerIcon: attacker?.icon }
                : space
            ),
            players: state.players.map(p => {
              if (p.id === legacyAtkId) {
                return { ...p, ownedTerritories: [...p.ownedTerritories, legacyTid] };
              }
              if (p.id === legacyDefId) {
                return { 
                  ...p, 
                  ownedTerritories: p.ownedTerritories.filter(t => t !== legacyTid),
                  armyStrength: Math.max(0, p.armyStrength - 2),
                };
              }
              return p;
            }),
          };
        }
      } else {
        // Attacker loses
        return {
          ...state,
          players: state.players.map(p =>
            p.id === legacyAtkId
              ? { ...p, armyStrength: Math.max(0, p.armyStrength - 2) }
              : p
          ),
        };
      }
      return state;

    case 'NEXT_TURN': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      const newCurrentPlayerId = state.players[nextIndex].id;
      const newAttackedPlayers = { ...state.attackedPlayers };
      if (!newAttackedPlayers[newCurrentPlayerId]) newAttackedPlayers[newCurrentPlayerId] = [];

      let nextRound = state.currentRound ?? 0;
      let nextTollBooths = { ...(state.tollBooths || {}) };
      let nextSealed = { ...(state.sealedSpaces || {}) };
      if (nextIndex === 0 && state.players.length > 0) {
        nextRound++;
        for (const [ownerId, toll] of Object.entries(nextTollBooths)) {
          const left = (toll.roundsLeft ?? 0) - 1;
          if (left <= 0) delete nextTollBooths[ownerId];
          else nextTollBooths[ownerId] = { ...toll, roundsLeft: left };
        }
        const nextSealedNew = {};
        for (const [spaceIdx, roundsLeft] of Object.entries(nextSealed)) {
          const left = (roundsLeft ?? 0) - 1;
          if (left > 0) nextSealedNew[spaceIdx] = left;
        }
        nextSealed = nextSealedNew;
      }

      let nextImmunity = { ...(state.attackImmunity || {}) };
      const immForNew = nextImmunity[newCurrentPlayerId];
      if (immForNew && typeof immForNew === 'object') {
        const next = { ...immForNew };
        for (const [defId, turns] of Object.entries(next)) {
          const t = (turns ?? 0) - 1;
          if (t <= 0) delete next[defId];
          else next[defId] = t;
        }
        if (Object.keys(next).length === 0) delete nextImmunity[newCurrentPlayerId];
        else nextImmunity[newCurrentPlayerId] = next;
      }

      const leavingPlayerId = state.players[state.currentPlayerIndex]?.id;
      const nextCannotMove = { ...(state.cannotMoveNextTurn || {}) };
      if (leavingPlayerId) delete nextCannotMove[leavingPlayerId];

      let nextAlliances = { ...(state.alliances || {}) };
      const allyEntry = nextAlliances[newCurrentPlayerId];
      if (allyEntry && allyEntry.allyId != null) {
        const left = (allyEntry.turnsLeft ?? 0) - 1;
        const allyId = allyEntry.allyId;
        if (left <= 0) {
          delete nextAlliances[newCurrentPlayerId];
          delete nextAlliances[allyId];
        } else {
          nextAlliances[newCurrentPlayerId] = { ...allyEntry, turnsLeft: left };
          if (nextAlliances[allyId]) nextAlliances[allyId] = { ...nextAlliances[allyId], turnsLeft: left };
        }
      }

      let nextCannotBuy = { ...(state.cannotBuyTerritories || {}) };
      const buyTurns = nextCannotBuy[newCurrentPlayerId];
      if (buyTurns != null) {
        const left = (buyTurns ?? 0) - 1;
        if (left <= 0) delete nextCannotBuy[newCurrentPlayerId];
        else nextCannotBuy[newCurrentPlayerId] = left;
      }

      return {
        ...state,
        currentPlayerIndex: nextIndex,
        diceRoll: null,
        doublesBonusUsed: false,
        doublesExtraRollAvailable: false,
        attackedPlayers: newAttackedPlayers,
        currentRound: nextRound,
        tollBooths: nextTollBooths,
        sealedSpaces: nextSealed,
        attackImmunity: nextImmunity,
        cannotMoveNextTurn: nextCannotMove,
        alliances: nextAlliances,
        cannotBuyTerritories: nextCannotBuy,
        selectedCorner: null,
        selectedTerritory: null,
        pendingIncomeTypeSelection: null,
      };
    }

    case 'ATTACK_PLAYER':
      const { attackerId: attackAtkId, defenderId: attackDefId } = action.payload;
      return {
        ...state,
        attackedPlayers: {
          ...state.attackedPlayers,
          [attackAtkId]: [...(state.attackedPlayers[attackAtkId] || []), attackDefId],
        },
      };

    case 'CLEAR_ATTACKED_PLAYERS':
      const { playerId: clearPlayerId } = action.payload;
      const clearedAttackedPlayers = { ...state.attackedPlayers };
      delete clearedAttackedPlayers[clearPlayerId];
      return {
        ...state,
        attackedPlayers: clearedAttackedPlayers,
      };

    case 'SELL_TERRITORY': {
      const { territoryId: sellTerritoryId } = action.payload;
      const sellTerritory = state.territories[sellTerritoryId];
      if (!sellTerritory) return state;
      const sellSpaceIndex = sellTerritory.spaceIndex;
      const sellPrice = 150;
      const sellTerritories = { ...state.territories };
      delete sellTerritories[sellTerritoryId];
      const spaceToSell = state.boardSpaces[sellSpaceIndex];
      const originalSpaceType = spaceToSell?.originalType || 'New Territory';
      const originalLabel = spaceToSell?.originalLabel || 'New Territory';
      const skipSellTerr = isGoldBlocked(state, sellTerritory.ownerId);
      return {
        ...state,
        territories: sellTerritories,
        boardSpaces: state.boardSpaces.map((space, idx) =>
          idx === sellSpaceIndex
            ? { ...space, ownerId: null, owned: false, ownerName: null, ownerIcon: null, type: originalSpaceType, label: originalLabel }
            : space
        ),
        players: state.players.map(p =>
          p.id === sellTerritory.ownerId
            ? { ...p, gold: skipSellTerr ? p.gold : p.gold + sellPrice, ownedTerritories: p.ownedTerritories.filter(t => t !== sellTerritoryId) }
            : p
        ),
      };
    }

    case 'SELECT_TERRITORY':
      return {
        ...state,
        selectedTerritory: action.payload,
      };

    case 'SELECT_CORNER':
      return {
        ...state,
        selectedCorner: action.payload,
      };

    case 'SET_PENDING_INCOME_TYPE':
      return {
        ...state,
        pendingIncomeTypeSelection: action.payload, // territoryId that needs income type
      };

    case 'CLEAR_PENDING_INCOME_TYPE':
      return {
        ...state,
        pendingIncomeTypeSelection: null,
      };

    case 'SHOW_INCOME_NOTIFICATION':
      return {
        ...state,
        incomeNotification: action.payload, // { playerId, amount, statType }
      };

    case 'CLEAR_INCOME_NOTIFICATION':
      return {
        ...state,
        incomeNotification: null,
      };

    case 'PURCHASE_INNER_TERRITORY': {
      const { innerTerritoryId, ownerId: innerOwnerId, cost: innerCost, incomeType } = action.payload;
      if ((state.cannotBuyTerritories || {})[innerOwnerId]) return state;
      const innerOwner = state.players.find(p => p.id === innerOwnerId);
      const plus100 = (state.territoryCostPlus100 || {})[innerOwnerId];
      const actualCost = plus100 ? innerCost + 100 : innerCost;
      if (!innerOwner || innerOwner.gold < actualCost) return state;
      if (state.territories[innerTerritoryId]) return state;
      const nextPlus100 = { ...(state.territoryCostPlus100 || {}) };
      if (plus100) delete nextPlus100[innerOwnerId];
      return {
        ...state,
        territoryCostPlus100: nextPlus100,
        territories: {
          ...state.territories,
          [innerTerritoryId]: { ownerId: innerOwnerId, purchased: true, incomeType },
        },
        players: state.players.map(p =>
          p.id === innerOwnerId
            ? { ...p, gold: p.gold - actualCost, ownedTerritories: [...p.ownedTerritories, innerTerritoryId] }
            : p
        ),
      };
    }

    case 'END_GAME':
      return {
        ...state,
        gamePhase: 'ended',
        victorId: action.payload?.victorId ?? state.victorId,
      };

    case 'REQUEST_ENTER_BLUE_RUIN': {
      const { playerId } = action.payload;
      const player = state.players.find(p => p.id === playerId);
      if (!player || !canEnterBlueRuinZone(player, state)) return state;
      const challengerIds = state.players.filter(p => p.id !== playerId).map(p => p.id);
      const nextTerritories = { ...state.territories };
      const nextPlayers = state.players.map(p =>
        p.id === playerId ? { ...p, gold: Math.max(0, p.gold - BLUE_RUIN_FEE) } : p
      );
      return {
        ...state,
        players: nextPlayers,
        treasuryGold: (state.treasuryGold || 0) + BLUE_RUIN_FEE,
        gauntlet: { targetId: playerId, challengerIds, challengerIndex: 0, phase: 'entry_animation' },
        gamePhase: 'gauntlet',
        castleState: 'repaired',
      };
    }

    case 'GAUNTLET_ENTRY_ANIMATION_DONE': {
      const g = state.gauntlet;
      if (!g) return state;
      return { ...state, gauntlet: { ...g, phase: 'clash' } };
    }

    case 'GAUNTLET_ADVANCE_CHALLENGER': {
      const g = state.gauntlet;
      if (!g) return state;
      const nextIndex = (g.challengerIndex ?? 0) + 1;
      return {
        ...state,
        gauntlet: { ...g, challengerIndex: nextIndex },
      };
    }

    case 'GAUNTLET_VICTORY': {
      const g = state.gauntlet;
      if (!g) return state;
      return {
        ...state,
        gauntlet: null,
        gamePhase: 'ended',
        victorId: g.targetId,
        combatActive: false,
        combatData: null,
      };
    }

    case 'GAUNTLET_DEFEAT': {
      const g = state.gauntlet;
      if (!g) return state;
      const target = state.players.find(p => p.id === g.targetId);
      if (!target) return state;
      const inners = INNER_BY_FACTION[target.faction];
      const toRelock = (inners && inners.find((id) => (target.ownedTerritories || []).includes(id))) || null;
      let nextTerritories = { ...state.territories };
      let nextPlayers = state.players.map((p) => {
        if (p.id !== g.targetId) return p;
        const startIndex = FACTION_TO_START_INDEX[p.faction] ?? 0;
        let owned = [...(p.ownedTerritories || [])];
        if (toRelock) {
          owned = owned.filter((t) => t !== toRelock);
        }
        return { ...p, position: startIndex, ownedTerritories: owned };
      });
      if (toRelock) delete nextTerritories[toRelock];
      const outer = (target.ownedTerritories || []).filter((t) => !t.startsWith('inner-'));
      const hasOuter = outer.length > 0;
      return {
        ...state,
        players: nextPlayers,
        territories: nextTerritories,
        combatActive: false,
        combatData: null,
        gauntlet: hasOuter
          ? { ...g, phase: 'sacrifice_prompt' }
          : null,
        gamePhase: hasOuter ? 'gauntlet' : 'playing',
        ...(!hasOuter && { castleState: 'ruins' }),
      };
    }

    case 'GAUNTLET_SACRIFICE_TERRITORY': {
      const { territoryId } = action.payload;
      const g = state.gauntlet;
      if (!g || g.phase !== 'sacrifice_prompt') return state;
      const target = state.players.find(p => p.id === g.targetId);
      if (!target || !(target.ownedTerritories || []).includes(territoryId)) return state;
      if (territoryId.startsWith('inner-')) return state;
      const t = state.territories[territoryId];
      if (!t) return state;
      const spaceIndex = t.spaceIndex;
      const nextTerritories = { ...state.territories };
      delete nextTerritories[territoryId];
      const nextBoard = state.boardSpaces.map((space, idx) =>
        idx === spaceIndex
          ? { ...space, ownerId: null, owned: false, ownerName: null, ownerIcon: null, type: space.originalType || space.type, label: space.originalLabel || space.label }
          : space
      );
      const nextPlayers = state.players.map((p) =>
        p.id === g.targetId
          ? { ...p, ownedTerritories: (p.ownedTerritories || []).filter((tid) => tid !== territoryId) }
          : p
      );
      return {
        ...state,
        players: nextPlayers,
        territories: nextTerritories,
        boardSpaces: nextBoard,
        gauntlet: { ...g, challengerIndex: 0, phase: 'clash' },
      };
    }

    case 'GAUNTLET_DECLINE_SACRIFICE': {
      const g = state.gauntlet;
      if (!g) return state;
      return {
        ...state,
        gauntlet: null,
        gamePhase: 'playing',
        castleState: 'ruins',
      };
    }

    default:
      return state;
  }
}

// Create Context
const GameContext = createContext();

// Provider Component
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const initializeGame = useCallback((playerCount, selectedFactions = null, options = {}) => {
    // Default faction order: King (top-left), Dragon (top-right), Knight (bottom-left), Wizard (bottom-right)
    const defaultFactionOrder = ['KING', 'DRAGON', 'KNIGHT', 'WIZARD'];
    const factionOrder = selectedFactions || defaultFactionOrder.slice(0, playerCount);
    
    // Map factions to their corner positions
    // Corner positions: 0 (top-left), 11 (top-right), 32 (bottom-left), 21 (bottom-right)
    // Note: Bottom row indices are reversed - index 32 is leftmost, index 21 is rightmost
    const factionToCorner = {
      'KING': 0,    // top-left
      'DRAGON': 11, // top-right
      'KNIGHT': 32, // bottom-left
      'WIZARD': 21, // bottom-right
    };
    
    const players = Array.from({ length: playerCount }, (_, i) => {
      const factionKey = factionOrder[i] || defaultFactionOrder[i];
      const faction = FACTIONS[factionKey];
      const cornerPosition = factionToCorner[factionKey] || 0;
      
      return {
        id: `player-${i}`,
        name: faction.name,
        faction: faction.id,
        icon: faction.icon,
        color: faction.color,
        position: cornerPosition, // Starting positions at corners based on faction
        gold: faction.startGold,
        armyStrength: faction.startArmy,
        defenseStrength: faction.startDefense,
        ownedTerritories: [],
        hand: [], // Kept fate/penalty cards: { id, type, text, effect, keepable }
        lastDrawnCard: null,
        incomeType: null, // 'army' or 'defense' - chosen when first inner territory is purchased
      };
    });

    // Create board spaces (41 spaces total for a perimeter track)
    // Board is 12 spaces wide, 10 spaces tall
    // Corners: 0 (top-left), 11 (top-right), 32 (bottom-right), 21 (bottom-left)
    const boardSpaces = [];
    const spaceTypes = [
      SPACE_TYPES.RESOURCE_CARD,
      SPACE_TYPES.ARMY_CARD,
      SPACE_TYPES.DEFENSE_CARD,
      SPACE_TYPES.FATE_CARD,
      SPACE_TYPES.PENALTY_CARD,
      SPACE_TYPES.NEW_TERRITORY,
    ];
    
    const cornerIndices = [0, 11, 32, 21]; // All four corners: top-left, top-right, bottom-right, bottom-left
    
    for (let i = 0; i < 41; i++) {
      if (cornerIndices.includes(i)) {
        boardSpaces.push({ id: i, type: SPACE_TYPES.START, label: 'START', originalType: SPACE_TYPES.START, originalLabel: 'START', owned: false });
      } else {
        const typeIndex = (i - 1) % spaceTypes.length;
        const spaceType = spaceTypes[typeIndex];
        const territoryDefIdx = NEW_TERRITORY_SPACE_INDICES.indexOf(i);
        const territoryDef = territoryDefIdx >= 0 ? OUTER_TERRITORY_DEFS[territoryDefIdx] : null;
        boardSpaces.push({ 
          id: i, 
          type: spaceType, 
          label: territoryDef ? territoryDef.name : spaceType, 
          originalType: spaceType, 
          originalLabel: territoryDef ? territoryDef.name : spaceType,
          owned: false,
          ...(territoryDef && {
            name: territoryDef.name,
            price: territoryDef.price,
            bribe: territoryDef.bribe,
            backgroundImage: territoryDef.backgroundImage,
          }),
        });
      }
    }

    // Initialize card decks with placeholder cards
    const cardDecks = {
      resource: generateResourceCards(),
      army: generateArmyCards(),
      defense: generateDefenseCards(),
      fate: generateFateCards(),
      penalty: generatePenaltyCards(),
      territory: generateTerritoryCards(),
    };

    dispatch({
      type: 'INITIALIZE_GAME',
      payload: { players, boardSpaces, cardDecks, testingMode: !!options?.testingMode },
    });
  }, []);

  const rollDice = useCallback(() => {
    dispatch({ type: 'ROLL_DICE' });
    setTimeout(() => {
      const { dice } = roll2d6();
      dispatch({ type: 'SET_DICE_RESULT', payload: dice });
    }, 1000);
  }, []);

  const setTestDice = useCallback((die1, die2) => {
    if (die1 < 1 || die1 > 6 || die2 < 1 || die2 > 6) return;
    dispatch({ type: 'SET_DICE_RESULT', payload: [die1, die2] });
  }, []);

  const testDrawCard = useCallback((card) => {
    if (!card) return;
    dispatch({ type: 'TEST_DRAW_CARD', payload: { card } });
  }, []);

  const setTestPlayerStats = useCallback((playerId, gold, armyStrength, defenseStrength) => {
    dispatch({
      type: 'SET_PLAYER_STATS',
      payload: { playerId, gold, armyStrength, defenseStrength },
    });
  }, []);

  const handleSpaceAction = useCallback((space) => {
    if (space.type === SPACE_TYPES.NEW_TERRITORY) {
      dispatch({ type: 'SELECT_TERRITORY', payload: space.id });
      return;
    }

    // Map space types to deck types
    const deckTypeMap = {
      [SPACE_TYPES.RESOURCE_CARD]: 'resource',
      [SPACE_TYPES.ARMY_CARD]: 'army',
      [SPACE_TYPES.DEFENSE_CARD]: 'defense',
      [SPACE_TYPES.FATE_CARD]: 'fate',
      [SPACE_TYPES.PENALTY_CARD]: 'penalty',
    };

    const deckType = deckTypeMap[space.type];
    if (deckType) {
      const st = stateRef.current;
      const currentPlayer = st.players[st.currentPlayerIndex];
      if (deckType === 'resource' && currentPlayer && (st.goldBlockedUntilPayoff || {})[currentPlayer.id]) {
        dispatch({ type: 'PAY_OFF_GOLD_BLOCK', payload: { playerId: currentPlayer.id } });
      }
      const deck = st.cardDecks[deckType];
      const idx = deck?.length > 0 ? randomInt(deck.length) : 0;
      dispatch({ type: 'DRAW_CARD', payload: { deckType, randomIndex: idx } });
    }
  }, []);

  // Helper function to check if player has nearby attackable players
  const hasAttackablePlayers = useCallback((player, allPlayers, boardSpaces, attackedPlayersList, isCombatActive, attackImmunityMap = {}) => {
    if (!player || isCombatActive) return false;
    const totalSpaces = boardSpaces.length;
    const currentPlayerAttacked = attackedPlayersList[player.id] || [];
    const myImmunity = attackImmunityMap[player.id] || {};
    
    return allPlayers.some(p => {
      if (p.id === player.id || currentPlayerAttacked.includes(p.id)) return false;
      if ((myImmunity[p.id] ?? 0) > 0) return false; // r8: cannot attack for 2 turns
      
      const forwardDistance = (p.position - player.position + totalSpaces) % totalSpaces;
      const isBehind = forwardDistance > 0 && forwardDistance <= 3;
      return isBehind;
    });
  }, []);

  // Helper function to check if turn is complete and auto-advance
  const checkAndAdvanceTurn = useCallback(() => {
    const currentState = stateRef.current;
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    
    const hasPendingAction = currentState.selectedTerritory !== null || 
                             currentPlayer?.lastDrawnCard !== null ||
                             hasAttackablePlayers(currentPlayer, currentState.players, currentState.boardSpaces, currentState.attackedPlayers, currentState.combatActive, currentState.attackImmunity);
    
    // Don't advance turn if player has a doubles bonus roll available
    const hasDoublesBonusPending = currentState.doublesExtraRollAvailable && !currentState.doublesBonusUsed;
    
    // If no pending actions, dice roll is cleared, no doubles bonus pending, and no combat, advance turn
    if (!hasPendingAction && currentState.diceRoll === null && !currentState.combatActive && !hasDoublesBonusPending) {
      setTimeout(() => {
        dispatch({ type: 'NEXT_TURN' });
      }, 500); // Small delay to allow UI to update
    }
  }, [hasAttackablePlayers]);

  // Helper function to calculate card bonus (% cards that add to combat)
  // For now, we'll assume card bonuses are already in armyStrength/defenseStrength
  const calculateCardBonus = useCallback((player) => {
    // This would sum up % bonuses from cards if we had a card inventory
    // For now, return 0 as cards modify stats directly
    return 0;
  }, []);

  const startCombat = useCallback((attackerId, defenderId, territoryId = null, combatSource = null, combatMode = null) => {
    const currentState = stateRef.current;
    const attacker = currentState.players.find(p => p.id === attackerId);
    const defender = currentState.players.find(p => p.id === defenderId);
    if (!attacker || !defender) return;
    dispatch({
      type: 'START_COMBAT',
      payload: { attackerId, defenderId, territoryId, combatSource, combatMode },
    });
  }, []);

  // Roll dice for combat (after bribes have been added)
  const rollCombatDice = useCallback(() => {
    dispatch({ type: 'ROLL_COMBAT_DICE' });
  }, []);

  const movePlayer = useCallback((playerId, spaces) => {
    // Calculate final position using current state
    const currentState = stateRef.current;
    const player = currentState.players.find(p => p.id === playerId);
    if (!player) return;
    
    const startPosition = player.position;
    const totalSpaces = currentState.boardSpaces.length;
    
    // Move one space at a time with animation delay
    let stepsRemaining = spaces;
    const moveStep = () => {
      if (stepsRemaining > 0) {
        // Get current state
        const currentState = stateRef.current;
        const currentPlayer = currentState.players.find(p => p.id === playerId);
        if (!currentPlayer) return;
        
        // Move one step
        dispatch({ type: 'MOVE_PLAYER_STEP', payload: { playerId } });
        stepsRemaining--;
        
        if (stepsRemaining === 0) {
          setTimeout(() => {
            dispatch({ type: 'DECREMENT_REVERSE_ROLLS', payload: { decPlayerId: playerId } });
            dispatch({ type: 'CLEAR_DICE' });
            const updatedState = stateRef.current;
            const finalPlayer = updatedState.players.find(p => p.id === playerId);
            if (finalPlayer) {
              // Check for same-space combat (another player on this space)
              const otherPlayersOnSpace = updatedState.players.filter(p => 
                p.id !== playerId && p.position === finalPlayer.position
              );
              
              if (otherPlayersOnSpace.length > 0) {
                const defender = otherPlayersOnSpace[0];
                startCombat(playerId, defender.id, null);
              } else {
                const space = updatedState.boardSpaces[finalPlayer.position];
                const cornerIndices = [0, 11, 21, 32];
                const startToFaction = { 0: 'king', 11: 'dragon', 32: 'knight', 21: 'wizard' };
                // Approach spaces (forward): 20->21, 10->11, 31->32, 40->0. Reverse: 22->21, 1->0, 33->32, 12->11.
                const approachToCorner = { 20: 21, 10: 11, 31: 32, 40: 0, 22: 21, 1: 0, 33: 32, 12: 11 };

                let runStartLogic = false;
                let startSpaceIndex = finalPlayer.position;
                let startOwnerId = null;

                if (cornerIndices.includes(finalPlayer.position)) {
                  // Always treat corners as START; never draw a card here
                  runStartLogic = true;
                  startSpaceIndex = finalPlayer.position;
                  const faction = startToFaction[finalPlayer.position];
                  const owner = updatedState.players.find(p => p.faction === faction);
                  startOwnerId = owner?.id ?? null;
                } else if (approachToCorner[finalPlayer.position] != null) {
                  const cornerIndex = approachToCorner[finalPlayer.position];
                  const faction = startToFaction[cornerIndex];
                  const owner = updatedState.players.find(p => p.faction === faction);
                  if (!owner) {
                    // Adjacent corner is a non-player start: offer stay/fast travel instead of card
                    runStartLogic = true;
                    startSpaceIndex = cornerIndex;
                    startOwnerId = null;
                  }
                }

                if (runStartLogic) {
                  dispatch({
                    type: 'SET_LANDED_ON_START',
                    payload: {
                      moverId: playerId,
                      ownerId: startOwnerId,
                      spaceIndex: startSpaceIndex,
                      phase: 'choose',
                    },
                  });
                  if (startOwnerId && startOwnerId !== playerId) {
                    dispatch({ type: 'SET_LANDED_ON_START_CHOICE', payload: { moverId: playerId, ownerId: startOwnerId } });
                  }
                } else if (space) {
                  handleSpaceAction(space);
                } else {
                  checkAndAdvanceTurn();
                }
              }
            }
          }, 400); // Delay after final movement
        } else {
          // Continue to next step
          setTimeout(moveStep, 400); // 400ms delay between steps
        }
      }
    };
    
    // Start the movement
    moveStep();
  }, [handleSpaceAction, dispatch, checkAndAdvanceTurn, startCombat]);

  const applyCardEffect = useCallback((playerId, effect, options = {}) => {
    dispatch({ type: 'APPLY_CARD_EFFECT', payload: { playerId, effect, isPenalty: options.isPenalty } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const applyResourceSpecial = useCallback((cardId, playerId, targetPlayerId = null) => {
    dispatch({ type: 'APPLY_SPECIAL_RESOURCE', payload: { cardId, playerId, targetPlayerId } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const applyArmySpecial = useCallback((cardId, playerId, targetPlayerId = null) => {
    dispatch({ type: 'APPLY_SPECIAL_ARMY', payload: { cardId, playerId, targetPlayerId } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const applyDefenseSpecial = useCallback((cardId, playerId) => {
    dispatch({ type: 'APPLY_SPECIAL_DEFENSE', payload: { cardId, playerId } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const applyFateSpecial = useCallback((cardId, playerId, targetPlayerId = null) => {
    dispatch({ type: 'APPLY_SPECIAL_FATE', payload: { cardId, playerId, targetPlayerId } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const keepDrawnCard = useCallback(() => {
    dispatch({ type: 'KEEP_DRAWN_CARD' });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const useFateCard = useCallback((playerId, cardIndex) => {
    dispatch({ type: 'USE_FATE_CARD', payload: { playerId, cardIndex } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const usePenaltyCard = useCallback((ownerId, targetPlayerId, cardIndex) => {
    dispatch({ type: 'USE_PENALTY_CARD', payload: { ownerId, targetPlayerId, cardIndex } });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const sellCard = useCallback((sellerId, buyerId, cardIndex, price = 100) => {
    dispatch({ type: 'SELL_CARD', payload: { sellerId, buyerId, cardIndex, price } });
  }, []);

  const purchaseTerritory = useCallback((territoryId, cost = 300) => {
    const currentState = stateRef.current;
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer) return;
    if ((currentState.cannotBuyTerritories || {})[currentPlayer.id]) return;
    const plus100 = (currentState.territoryCostPlus100 || {})[currentPlayer.id];
    const actualCost = plus100 ? cost + 100 : cost;
    if (currentPlayer.gold < actualCost) return;

    if (territoryId.startsWith('inner-')) {
      if (currentState.territories[territoryId]) return;
      dispatch({ type: 'SET_PENDING_INCOME_TYPE', payload: territoryId });
    } else {
      const spaceIndex = parseInt(territoryId.replace('territory-', ''), 10);
      const def = getOuterTerritoryDef(spaceIndex);
      const price = def ? def.price : cost;
      const actualPrice = plus100 ? price + 100 : price;
      if (currentPlayer.gold < actualPrice) return;
      dispatch({
        type: 'PURCHASE_TERRITORY',
        payload: {
          territoryId,
          ownerId: currentPlayer.id,
          cost: price,
          spaceIndex,
          name: def?.name,
          bribe: def?.bribe,
          backgroundImage: def?.backgroundImage,
        },
      });
      dispatch({ type: 'SELECT_TERRITORY', payload: null });
      setTimeout(() => checkAndAdvanceTurn(), 100);
    }
  }, [checkAndAdvanceTurn]);

  const payTribute = useCallback((territoryId, amount = 100) => {
    const currentState = stateRef.current;
    const territory = currentState.territories[territoryId];
    if (!territory) return;
    
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    const owner = currentState.players.find(p => p.id === territory.ownerId);
    
    if (owner && currentPlayer.id !== owner.id) {
      dispatch({
        type: 'PAY_TRIBUTE',
        payload: { fromPlayerId: currentPlayer.id, toPlayerId: owner.id, amount },
      });
      dispatch({ type: 'SELECT_TERRITORY', payload: null });
      // After paying tribute, check if turn should advance
      setTimeout(() => {
        checkAndAdvanceTurn();
      }, 100);
    }
  }, [checkAndAdvanceTurn]);

  const sellTerritory = useCallback((territoryId) => {
    dispatch({ type: 'SELL_TERRITORY', payload: { territoryId } });
  }, []);

  const selectCorner = useCallback((cornerId) => {
    dispatch({ type: 'SELECT_CORNER', payload: cornerId });
  }, []);

  const addCombatBribe = useCallback((playerId) => {
    dispatch({
      type: 'ADD_COMBAT_BRIBE',
      payload: { playerId },
    });
  }, []);

  const resolveCombat = useCallback(() => {
    const currentState = stateRef.current;
    const combatData = currentState.combatData;
    if (!combatData) return;

    const attacker = currentState.players.find(p => p.id === combatData.attackerId);
    const defender = currentState.players.find(p => p.id === combatData.defenderId);
    if (!attacker || !defender) return;

    const alliances = currentState.alliances || {};
    const getEffectiveArmy = (pid) => {
      const a = alliances[pid];
      if (!a?.allyId) return currentState.players.find(p => p.id === pid)?.armyStrength ?? 0;
      const pl = currentState.players.find(x => x.id === pid);
      const ally = currentState.players.find(x => x.id === a.allyId);
      return Math.max(pl?.armyStrength ?? 0, ally?.armyStrength ?? 0);
    };
    const tactical = combatData.combatMode === 'tactical';
    const atkArmy = getEffectiveArmy(combatData.attackerId);
    const atkStat = tactical ? (attacker.armyStrength ?? 0) + (attacker.defenseStrength ?? 0) : atkArmy;
    const defStat = tactical ? (defender.armyStrength ?? 0) + (defender.defenseStrength ?? 0) : (defender.defenseStrength ?? 0);

    const attackerCardBonus = calculateCardBonus(attacker);
    const defenderCardBonus = calculateCardBonus(defender);

    const attackerTotal = combatData.attackerRoll + atkStat + attackerCardBonus + (combatData.attackerBribe || 0);
    const defenderTotal = combatData.defenderRoll + defStat + defenderCardBonus + (combatData.defenderBribe || 0);

    dispatch({
      type: 'RESOLVE_COMBAT',
      payload: {
        ...combatData,
        attackerTotal,
        defenderTotal,
      },
    });

    const fromStartLanding = combatData.combatSource === 'start_landing';
    const fromGauntlet = combatData.combatSource === 'gauntlet';
    setTimeout(() => {
      if (fromGauntlet) {
        // Gauntlet flow runs on modal close (handleGauntletClose)
      } else if (fromStartLanding) {
        dispatch({ type: 'END_COMBAT' });
        dispatch({ type: 'SET_LANDED_ON_START_PHASE', payload: 'post-bribe-fight' });
      } else {
        checkAndAdvanceTurn();
      }
    }, 100);
  }, [calculateCardBonus, checkAndAdvanceTurn]);

  const endCombat = useCallback(() => {
    dispatch({ type: 'END_COMBAT' });
  }, []);

  const attackTerritory = useCallback((territoryId) => {
    const currentState = stateRef.current;
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    const territory = currentState.territories[territoryId];
    if (!territory) return;
    
    const defender = currentState.players.find(p => p.id === territory.ownerId);
    if (!defender || defender.id === currentPlayer.id) return;

    // Start combat using new system
    startCombat(currentPlayer.id, defender.id, territoryId);
    dispatch({ type: 'SELECT_TERRITORY', payload: null });
  }, [startCombat]);

  // Calculate distance between two positions on the board (handling wrap-around)
  const calculateDistance = useCallback((pos1, pos2, totalSpaces) => {
    const forward = (pos2 - pos1 + totalSpaces) % totalSpaces;
    const backward = (pos1 - pos2 + totalSpaces) % totalSpaces;
    return Math.min(forward, backward);
  }, []);

  // Attack a nearby player (within 3 spaces) - only if attacker is behind defender
  const attackNearbyPlayer = useCallback((defenderId) => {
    const currentState = stateRef.current;
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    const defender = currentState.players.find(p => p.id === defenderId);
    
    if (!currentPlayer || !defender || defender.id === currentPlayer.id) return;
    if (currentState.combatActive) return; // Already in combat
    
    const totalSpaces = currentState.boardSpaces.length;
    
    // Check if attacker is behind defender (in forward direction) and within 3 spaces
    const forwardDistance = (defender.position - currentPlayer.position + totalSpaces) % totalSpaces;
    const isBehind = forwardDistance > 0 && forwardDistance <= 3;
    
    if (!isBehind) return;
    
    // Check if already attacked this player
    const currentPlayerAttacked = currentState.attackedPlayers[currentPlayer.id] || [];
    if (currentPlayerAttacked.includes(defenderId)) return;
    
    // Mark as attacked
    dispatch({
      type: 'ATTACK_PLAYER',
      payload: { attackerId: currentPlayer.id, defenderId },
    });
    
    // Move attacker to defender's position
    dispatch({
      type: 'MOVE_PLAYER_TO_POSITION',
      payload: { playerId: currentPlayer.id, position: defender.position },
    });
    
    // Start combat after a short delay to allow movement animation
    setTimeout(() => {
      startCombat(currentPlayer.id, defender.id, null); // null territoryId means player vs player combat
    }, 500);
  }, [calculateDistance, startCombat]);

  const payStartBribe = useCallback((amount = 100) => {
    const st = stateRef.current;
    const choice = st.landedOnStartChoice;
    if (!choice) return;
    dispatch({ type: 'PAY_START_BRIBE', payload: { moverId: choice.moverId, ownerId: choice.ownerId, amount } });
    // Don't advance – show "Fast travel?" next (phase set in reducer)
  }, []);

  const chooseStartFight = useCallback(() => {
    const st = stateRef.current;
    const choice = st.landedOnStartChoice;
    if (!choice) return;
    dispatch({ type: 'CLEAR_LANDED_ON_START_CHOICE' });
    startCombat(choice.moverId, choice.ownerId, null, 'start_landing');
  }, [startCombat]);

  const stayOnStart = useCallback(() => {
    const st = stateRef.current;
    if (!st.landedOnStart) return;
    dispatch({ type: 'CLEAR_LANDED_ON_START' });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const fastTravelToStart = useCallback((targetSpaceIndex) => {
    const st = stateRef.current;
    const land = st.landedOnStart;
    if (!land) return;
    dispatch({ type: 'MOVE_PLAYER_TO_POSITION', payload: { playerId: land.moverId, position: targetSpaceIndex } });
    dispatch({ type: 'CLEAR_LANDED_ON_START' });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, []);

  const skipTerritoryAction = useCallback(() => {
    dispatch({ type: 'SELECT_TERRITORY', payload: null });
    // After skipping territory action, check if turn should advance
    setTimeout(() => {
      checkAndAdvanceTurn();
    }, 100);
  }, [checkAndAdvanceTurn]);

  const skipAttack = useCallback(() => {
    // Clear any pending attack state and advance turn
    dispatch({ type: 'NEXT_TURN' });
  }, []);

  const endTurn = useCallback(() => {
    dispatch({ type: 'NEXT_TURN' });
  }, []);

  const useDoublesBonus = useCallback(() => {
    dispatch({ type: 'USE_DOUBLES_BONUS' });
  }, []);

  const purchaseTerritoryWithIncomeType = useCallback((territoryId, cost, incomeType) => {
    const currentState = stateRef.current;
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer) return;
    if ((currentState.cannotBuyTerritories || {})[currentPlayer.id]) return;
    const plus100 = (currentState.territoryCostPlus100 || {})[currentPlayer.id];
    const actualCost = plus100 ? cost + 100 : cost;
    if (currentPlayer.gold < actualCost) return;

    dispatch({
      type: 'PURCHASE_INNER_TERRITORY',
      payload: { innerTerritoryId: territoryId, ownerId: currentPlayer.id, cost, incomeType },
    });
    dispatch({ type: 'CLEAR_PENDING_INCOME_TYPE' });
    setTimeout(() => checkAndAdvanceTurn(), 100);
  }, [checkAndAdvanceTurn]);

  const clearIncomeNotification = useCallback(() => {
    dispatch({ type: 'CLEAR_INCOME_NOTIFICATION' });
  }, []);

  const rollForFirstPlayer = useCallback((playerId) => {
    const { dice, sum } = roll2d6();
    dispatch({
      type: 'ADD_FIRST_PLAYER_ROLL',
      payload: { playerId, roll: dice, sum },
    });
  }, []);

  const clearFirstPlayerRolls = useCallback(() => {
    dispatch({ type: 'CLEAR_FIRST_PLAYER_ROLLS' });
  }, []);

  const setFirstPlayerAndStart = useCallback(() => {
    dispatch({ type: 'SET_FIRST_PLAYER' });
  }, []);

  const requestEnterBlueRuin = useCallback(() => {
    const st = stateRef.current;
    const player = st.players[st.currentPlayerIndex];
    if (!player || !canEnterBlueRuinZone(player, st)) return;
    const challengerIds = st.players.filter((p) => p.id !== player.id).map((p) => p.id);
    dispatch({ type: 'REQUEST_ENTER_BLUE_RUIN', payload: { playerId: player.id } });
    if (challengerIds.length === 0) {
      dispatch({ type: 'GAUNTLET_VICTORY' });
    }
    // Combat starts after entry animation (gauntletEntryAnimationComplete)
  }, []);

  const gauntletEntryAnimationComplete = useCallback(() => {
    const st = stateRef.current;
    const g = st.gauntlet;
    if (!g || g.phase !== 'entry_animation') return;
    dispatch({ type: 'GAUNTLET_ENTRY_ANIMATION_DONE' });
    const challengerIds = st.players.filter((p) => p.id !== g.targetId).map((p) => p.id);
    if (challengerIds.length > 0) {
      setTimeout(() => {
        startCombat(challengerIds[0], g.targetId, null, 'gauntlet', 'tactical');
      }, 150);
    }
  }, [startCombat]);

  const handleGauntletClose = useCallback(() => {
    const st = stateRef.current;
    const g = st.gauntlet;
    const combatData = st.combatData;
    if (!g || g.phase !== 'clash') return;
    if (!combatData?.winner) return;
    const targetWon = combatData.winner === g.targetId;
    if (targetWon) {
      const nextIndex = (g.challengerIndex ?? 0) + 1;
      dispatch({ type: 'GAUNTLET_ADVANCE_CHALLENGER' });
      if (nextIndex >= g.challengerIds.length) {
        dispatch({ type: 'GAUNTLET_VICTORY' });
      } else {
        setTimeout(() => {
          startCombat(g.challengerIds[nextIndex], g.targetId, null, 'gauntlet', 'tactical');
        }, 100);
      }
    } else {
      dispatch({ type: 'GAUNTLET_DEFEAT' });
    }
  }, [startCombat]);

  const gauntletSacrifice = useCallback((territoryId) => {
    dispatch({ type: 'GAUNTLET_SACRIFICE_TERRITORY', payload: { territoryId } });
    const st = stateRef.current;
    const g = st.gauntlet;
    if (!g) return;
    const challengerIds = st.players.filter((p) => p.id !== g.targetId).map((p) => p.id);
    if (challengerIds.length > 0) {
      setTimeout(() => {
        startCombat(challengerIds[0], g.targetId, null, 'gauntlet', 'tactical');
      }, 100);
    }
  }, [startCombat]);

  const gauntletDeclineSacrifice = useCallback(() => {
    dispatch({ type: 'GAUNTLET_DECLINE_SACRIFICE' });
  }, []);

  const value = {
    ...state,
    dispatch,
    initializeGame,
    rollForFirstPlayer,
    clearFirstPlayerRolls,
    setFirstPlayerAndStart,
    rollDice,
    setTestDice,
    setTestPlayerStats,
    testDrawCard,
    movePlayer,
    applyCardEffect,
    applyResourceSpecial,
    applyArmySpecial,
    applyDefenseSpecial,
    applyFateSpecial,
    keepDrawnCard,
    useFateCard,
    usePenaltyCard,
    sellCard,
    purchaseTerritory,
    purchaseTerritoryWithIncomeType,
    sellTerritory,
    selectCorner,
    payTribute,
    attackTerritory,
    attackNearbyPlayer,
    payStartBribe,
    chooseStartFight,
    stayOnStart,
    fastTravelToStart,
    skipTerritoryAction,
    skipAttack,
    clearIncomeNotification,
    endTurn,
    useDoublesBonus,
    startCombat,
    rollCombatDice,
    addCombatBribe,
    resolveCombat,
    endCombat,
    requestEnterBlueRuin,
    gauntletEntryAnimationComplete,
    handleGauntletClose,
    gauntletSacrifice,
    gauntletDeclineSacrifice,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Hook to use context
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Card generation functions
function generateResourceCards() {
  return [
    { id: 'r1', type: 'resource', text: 'At the end of a rainbow, you find a large pot of gold', effect: { gold: 300 } },
    { id: 'r2', type: 'resource', text: 'You discover a hidden treasure chest', effect: { gold: 200 } },
    { id: 'r3', type: 'resource', text: 'A merchant pays you for safe passage', effect: { gold: 150 } },
    { id: 'r4', type: 'resource', text: 'You find gold coins in an abandoned mine', effect: { gold: 250 } },
    { id: 'r5', type: 'resource', text: 'Tax collection brings in revenue', effect: { gold: 100 } },
    { id: 'r6', type: 'resource', text: 'Set up a toll booth on your current space. For the next 3 rounds, any player who passes you pays you 50 Gold.', effect: { special: 'toll_3_rounds' } },
    { id: 'r7', type: 'resource', text: 'Set up a toll booth on your current space. Sacrifice 2 Army points to immediately gain 500 Gold.', effect: { army: -2, gold: 500 } },
    { id: 'r8', type: 'resource', text: 'Establish a connection with a rival kingdom. Choose a player; you both gain 200 Gold, but you cannot attack them for 2 turns.', effect: { special: 'rival_kingdom', requiresTarget: true } },
    { id: 'r9', type: 'resource', text: "You mark a spot on the map with an 'X'. Return to your start and reap the rewards.", effect: { special: 'return_to_start_rewards' } },
    { id: 'r0', type: 'resource', text: "Your influence over the region grows. Gain 50 Gold for every Territory card you currently own.", effect: { special: 'gold_per_territory', amountPer: 50 } },
  ];
}

function generateArmyCards() {
  return [
    { id: 'a1', type: 'army', text: 'Many young men in your kingdom come of age', effect: { army: 1 } },
    { id: 'a2', type: 'army', text: 'A skilled general joins your forces', effect: { army: 2 } },
    { id: 'a3', type: 'army', text: 'Recruits flock to your banner', effect: { army: 1 } },
    { id: 'a4', type: 'army', text: 'Mercenaries offer their services', effect: { army: 2 } },
    { id: 'a5', type: 'army', text: 'Training improves your soldiers', effect: { army: 1 } },
    { id: 'a6', type: 'army', text: 'Draft the strongest soldiers from your rivals.', effect: { special: 'steal_army_highest' } },
    { id: 'a7', type: 'army', text: 'Issue a challenge to a nearby commander.', effect: { special: 'challenge_nearby', requiresTarget: true, withinSpaces: 5 } },
    { id: 'a8', type: 'army', text: 'Launch a surprise raid on an enemy position.', effect: { special: 'raid_nearest_territory' } },
    { id: 'a9', type: 'army', text: 'Focus on training instead of marching.', effect: { special: 'train_no_move' } },
    { id: 'a0', type: 'army', text: "Bribe the guards of a rival's stronghold.", effect: { special: 'bribe_guards', requiresTarget: true } },
  ];
}

function generateDefenseCards() {
  return [
    { id: 'd1', type: 'defense', text: 'You recruit a young wizard who can help your army become disguised', effect: { defense: 1 } },
    { id: 'd2', type: 'defense', text: 'A new defensive weapon has been developed', effect: { defense: 1 } },
    { id: 'd3', type: 'defense', text: 'Fortifications are strengthened', effect: { defense: 1 } },
    { id: 'd4', type: 'defense', text: 'Shield technology improves', effect: { defense: 2 } },
    { id: 'd5', type: 'defense', text: 'Defensive tactics are refined', effect: { defense: 1 } },
    { id: 'd6', type: 'defense', text: 'Defensive structures that hurt the attacker.', effect: { special: 'defensive_structures' } },
    { id: 'd7', type: 'defense', text: 'Seal the borders of your kingdom.', effect: { special: 'seal_borders' } },
    { id: 'd8', type: 'defense', text: 'Retreat to your most fortified position.', effect: { special: 'retreat_fortified' } },
    { id: 'd9', type: 'defense', text: 'The best defense is a good offense.', effect: { special: 'reverse_movement' } },
    { id: 'd0', type: 'defense', text: 'Protection from injury.', effect: { special: 'penalty_immunity' } },
  ];
}

function generateFateCards() {
  return [
    { id: 'f1', type: 'fate', text: 'A new defensive weapon has been developed', effect: { defense: 2 }, keepable: true },
    { id: 'f2', type: 'fate', text: 'Favorable winds aid your cause', effect: { army: 1, defense: 1 }, keepable: true },
    { id: 'f3', type: 'fate', text: 'A wise advisor joins your court', effect: { gold: 100, army: 1 }, keepable: true },
    { id: 'f4', type: 'fate', text: 'Good fortune smiles upon you', effect: { gold: 150 }, keepable: false },
    { id: 'f5', type: 'fate', text: 'Allies provide support', effect: { army: 1 }, keepable: false },
    { id: 'f6', type: 'fate', text: 'The stars align and reality shifts.', effect: { special: 'swap_positions', requiresTarget: true }, keepable: false },
    { id: 'f7', type: 'fate', text: 'A desperate alliance is formed in the ruins.', effect: { special: 'alliance', requiresTarget: true }, keepable: false },
    { id: 'f8', type: 'fate', text: 'Prosperity reaches every corner of the map.', effect: { special: 'move_5_collect_100' }, keepable: false },
    { id: 'f9', type: 'fate', text: 'A glitch in the timeline of the ruins.', effect: { special: 'cancel_next_penalty' }, keepable: false },
    { id: 'f0', type: 'fate', text: 'In search of glory', effect: { special: 'reverse_until_battle_win' }, keepable: false },
  ];
}

function generatePenaltyCards() {
  return [
    { id: 'p1', type: 'penalty', text: 'Your enemies are able to defeat your systems', effect: { defense: -2 }, keepable: true },
    { id: 'p2', type: 'penalty', text: 'A plague weakens your forces', effect: { army: -2 }, keepable: true },
    { id: 'p3', type: 'penalty', text: 'Raiders steal your gold', effect: { gold: -200 }, keepable: false },
    { id: 'p4', type: 'penalty', text: 'Betrayal weakens your defenses', effect: { defense: -1, army: -1 }, keepable: true },
    { id: 'p5', type: 'penalty', text: 'Economic downturn hits your treasury', effect: { gold: -150 }, keepable: false },
    { id: 'p6', type: 'penalty', text: 'You have been banished by the Council.', effect: { special: 'banished' }, keepable: false },
    { id: 'p7', type: 'penalty', text: 'The value of your currency has tanked.', effect: { special: 'currency_tanked' }, keepable: false },
    { id: 'p8', type: 'penalty', text: 'Your citizens are rebelling against the crown.', effect: { special: 'rebellion' }, keepable: false },
    { id: 'p9', type: 'penalty', text: 'Your closest ally has sold your secrets.', effect: { special: 'secrets_sold' }, keepable: false },
    { id: 'p0', type: 'penalty', text: 'The bank is coming for what you owe.', effect: { special: 'bank_debt' }, keepable: false },
  ];
}

function generateTerritoryCards() {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `t${i}`,
    type: 'territory',
    text: `Territory ${i + 1}`,
    territoryId: `territory-${i}`,
    cost: 300 + (i * 50),
  }));
}
