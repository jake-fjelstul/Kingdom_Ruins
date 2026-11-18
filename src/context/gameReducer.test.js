import { describe, it, expect } from 'vitest';
import {
  gameReducer,
  initialState,
  buildGamePayload,
  isTurnComplete,
  isAttackOfferPending,
  canStillRoll,
  cannotAttack,
  getVanguardTargets,
  getTerritorySalePrice,
  getBankDebt,
} from './GameContext';

/** A fresh 2–4 player game already in the 'playing' phase. */
function newGame(playerCount = 2, opts = {}) {
  let s = gameReducer(initialState, { type: 'INITIALIZE_GAME', payload: buildGamePayload(playerCount, null, opts) });
  return { ...s, gamePhase: 'playing' };
}

const run = (state, ...actions) => actions.reduce((s, a) => gameReducer(s, a), state);
const player = (s, id) => s.players.find((p) => p.id === id);
const setPlayer = (s, id, patch) => ({ ...s, players: s.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

// Rolls are [atkDie1, atkDie2, defDie1, defDie2]
const ATTACKER_WINS = [[6, 6, 1, 1]];
const DEFENDER_WINS = [[1, 1, 6, 6]];

describe('combat', () => {
  const startFight = (s, extra = {}) =>
    gameReducer(s, { type: 'START_COMBAT', payload: { attackerId: 'player-0', defenderId: 'player-1', ...extra } });

  it('rolls and resolves in one step, paying the winner once and keeping the modal open', () => {
    let s = startFight(newGame());
    const before = { atk: player(s, 'player-0').gold, def: player(s, 'player-1').gold };
    s = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: ATTACKER_WINS } });

    expect(s.combatActive).toBe(true);
    expect(s.combatData.diceRolled).toBe(true);
    expect(s.combatData.winner).toBe('player-0');
    const pay = s.combatData.difference * 10;
    expect(pay).toBeGreaterThan(0);
    expect(player(s, 'player-0').gold).toBe(before.atk + pay);
    expect(player(s, 'player-1').gold).toBe(before.def - pay);

    // A second resolve (double click / AI race) changes nothing
    const again = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: DEFENDER_WINS } });
    expect(again).toBe(s);
  });

  it('skips tied candidates (ties require a reroll)', () => {
    let s = startFight(newGame());
    const { armyStrength } = player(s, 'player-0'); // King: 0 army
    const { defenseStrength } = player(s, 'player-1'); // Dragon: 0 defense
    expect(armyStrength).toBe(defenseStrength);
    s = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: [[3, 3, 2, 4], [1, 1, 6, 6]] } });
    expect(s.combatData.attackerRoll).toBe(2);
    expect(s.combatData.winner).toBe('player-1');
  });

  it('refuses bribes after the dice are rolled', () => {
    let s = startFight(newGame());
    s = gameReducer(s, { type: 'ADD_COMBAT_BRIBE', payload: { playerId: 'player-0' } });
    expect(s.combatData.attackerBribe).toBe(1);
    s = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: ATTACKER_WINS } });
    const after = gameReducer(s, { type: 'ADD_COMBAT_BRIBE', payload: { playerId: 'player-0' } });
    expect(after).toBe(s);
  });

  it('END_COMBAT closes the modal', () => {
    let s = run(startFight(newGame()), { type: 'RESOLVE_COMBAT', payload: { rolls: ATTACKER_WINS } }, { type: 'END_COMBAT' });
    expect(s.combatActive).toBe(false);
    expect(s.combatData).toBe(null);
  });
});

describe('turn flow', () => {
  it('a turn is not complete before the player rolls or attacks (using a kept card cannot end it)', () => {
    const s = newGame();
    expect(canStillRoll(s)).toBe(true);
    expect(isTurnComplete(s)).toBe(false);
  });

  it('is complete after rolling once everything has settled', () => {
    let s = run(newGame(), { type: 'SET_DICE_RESULT', payload: [2, 3] }, { type: 'CLEAR_DICE' });
    expect(canStillRoll(s)).toBe(false);
    expect(isTurnComplete(s)).toBe(true);
  });

  it('is not complete while a token is moving', () => {
    let s = run(newGame(), { type: 'SET_DICE_RESULT', payload: [2, 3] }, { type: 'CLEAR_DICE' },
      { type: 'MOVE_STARTED', payload: { playerId: 'player-0' } });
    expect(isTurnComplete(s)).toBe(false);
  });

  it('waits for a pending doubles roll', () => {
    let s = run(newGame(), { type: 'SET_DICE_RESULT', payload: [4, 4] }, { type: 'CLEAR_DICE' });
    expect(isTurnComplete(s)).toBe(false);
  });

  it('ignores NEXT_TURN while moving and stale NEXT_TURN requests', () => {
    let s = newGame(3);
    const moving = gameReducer(s, { type: 'MOVE_STARTED', payload: { playerId: 'player-0' } });
    expect(gameReducer(moving, { type: 'NEXT_TURN', payload: {} })).toBe(moving);

    s = gameReducer(s, { type: 'NEXT_TURN', payload: { expectedTurn: 0 } });
    expect(s.currentPlayerIndex).toBe(1);
    expect(s.turnNumber).toBe(1);
    // A delayed duplicate scheduled for turn 0 must not skip player 1
    const dup = gameReducer(s, { type: 'NEXT_TURN', payload: { expectedTurn: 0 } });
    expect(dup).toBe(s);
  });

  it('resets per-turn flags on NEXT_TURN', () => {
    let s = run(newGame(), { type: 'SET_DICE_RESULT', payload: [1, 2] }, { type: 'DISMISS_ATTACK_OFFER' });
    s = gameReducer(s, { type: 'NEXT_TURN', payload: {} });
    expect(s.hasRolledThisTurn).toBe(false);
    expect(s.attackedThisTurn).toBe(false);
    expect(s.attackOfferDismissed).toBe(false);
  });
});

describe('nearby attacks', () => {
  // King on 0, Dragon placed 2 spaces ahead
  const withNeighbour = () => setPlayer(newGame(), 'player-1', { position: 2 });

  it('Skip Attack dismisses the offer but keeps the roll', () => {
    let s = withNeighbour();
    expect(isAttackOfferPending(s)).toBe(true);
    s = gameReducer(s, { type: 'DISMISS_ATTACK_OFFER' });
    expect(isAttackOfferPending(s)).toBe(false);
    expect(canStillRoll(s)).toBe(true);
    expect(isTurnComplete(s)).toBe(false);
  });

  it('attacking uses up the roll', () => {
    let s = gameReducer(withNeighbour(), { type: 'ATTACK_PLAYER', payload: { attackerId: 'player-0', defenderId: 'player-1' } });
    expect(canStillRoll(s)).toBe(false);
  });

  it('a new position brings a fresh offer', () => {
    let s = run(withNeighbour(), { type: 'DISMISS_ATTACK_OFFER' }, { type: 'MOVE_FINISHED' });
    expect(s.attackOfferDismissed).toBe(false);
  });
});

describe('card sales need the buyer to accept', () => {
  const withCard = () => {
    const card = { id: 'f1', type: 'fate', text: 'x', effect: { defense: 2 }, keepable: true };
    return setPlayer(newGame(), 'player-0', { hand: [card] });
  };

  it('an offer moves no gold or cards until accepted', () => {
    const s0 = withCard();
    const s = gameReducer(s0, { type: 'OFFER_CARD_SALE', payload: { sellerId: 'player-0', buyerId: 'player-1', cardIndex: 0, price: 100 } });
    expect(s.cardSaleOffer).not.toBe(null);
    expect(player(s, 'player-1').gold).toBe(player(s0, 'player-1').gold);
    expect(player(s, 'player-0').hand).toHaveLength(1);
  });

  it('declining clears the offer', () => {
    let s = run(withCard(),
      { type: 'OFFER_CARD_SALE', payload: { sellerId: 'player-0', buyerId: 'player-1', cardIndex: 0, price: 100 } },
      { type: 'RESPOND_CARD_SALE', payload: { accept: false } });
    expect(s.cardSaleOffer).toBe(null);
    expect(player(s, 'player-0').hand).toHaveLength(1);
  });

  it('accepting transfers the card and the gold', () => {
    const s0 = withCard();
    const s = run(s0,
      { type: 'OFFER_CARD_SALE', payload: { sellerId: 'player-0', buyerId: 'player-1', cardIndex: 0, price: 100 } },
      { type: 'RESPOND_CARD_SALE', payload: { accept: true } });
    expect(player(s, 'player-0').hand).toHaveLength(0);
    expect(player(s, 'player-1').hand).toHaveLength(1);
    expect(player(s, 'player-0').gold).toBe(player(s0, 'player-0').gold + 100);
    expect(player(s, 'player-1').gold).toBe(player(s0, 'player-1').gold - 100);
  });
});

describe('gauntlet defeat (either/or)', () => {
  // King owns both inner territories; optionally one outer territory
  const inGauntlet = (withOuter) => {
    let s = newGame(2);
    const owned = ['inner-tl-1', 'inner-tl-2', ...(withOuter ? ['territory-6'] : [])];
    s = setPlayer(s, 'player-0', { ownedTerritories: owned, position: 5 });
    s = {
      ...s,
      territories: {
        'inner-tl-1': { ownerId: 'player-0', incomeType: 'army' },
        'inner-tl-2': { ownerId: 'player-0', incomeType: 'army' },
        ...(withOuter ? { 'territory-6': { ownerId: 'player-0', spaceIndex: 6 } } : {}),
      },
      gamePhase: 'gauntlet',
      castleState: 'repaired',
      gauntlet: { targetId: 'player-0', challengerIds: ['player-1'], challengerIndex: 0, phase: 'clash' },
    };
    return s;
  };

  it('with an outer territory: offers the sacrifice and keeps everything else', () => {
    const s = gameReducer(inGauntlet(true), { type: 'GAUNTLET_DEFEAT' });
    expect(s.gauntlet.phase).toBe('sacrifice_prompt');
    expect(player(s, 'player-0').ownedTerritories).toContain('inner-tl-2');
    expect(player(s, 'player-0').position).toBe(5);
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('declining the sacrifice kicks the target out and ends the turn', () => {
    const s = run(inGauntlet(true), { type: 'GAUNTLET_DEFEAT' }, { type: 'GAUNTLET_DECLINE_SACRIFICE' });
    expect(s.gamePhase).toBe('playing');
    expect(s.gauntlet).toBe(null);
    expect(s.castleState).toBe('ruins');
    expect(player(s, 'player-0').ownedTerritories).not.toContain('inner-tl-2');
    expect(player(s, 'player-0').ownedTerritories).toContain('inner-tl-1');
    expect(player(s, 'player-0').position).toBe(0);
    expect(s.currentPlayerIndex).toBe(1);
  });

  it('without an outer territory: kicked out straight away and the turn ends', () => {
    const s = gameReducer(inGauntlet(false), { type: 'GAUNTLET_DEFEAT' });
    expect(s.gamePhase).toBe('playing');
    expect(player(s, 'player-0').ownedTerritories).toEqual(['inner-tl-1']);
    expect(s.currentPlayerIndex).toBe(1);
  });

  it('sacrificing keeps the target in and restarts the clash', () => {
    const s = run(inGauntlet(true), { type: 'GAUNTLET_DEFEAT' }, { type: 'GAUNTLET_SACRIFICE_TERRITORY', payload: { territoryId: 'territory-6' } });
    expect(s.gauntlet.phase).toBe('clash');
    expect(s.gauntlet.challengerIndex).toBe(0);
    expect(player(s, 'player-0').ownedTerritories).toEqual(['inner-tl-1', 'inner-tl-2']);
  });
});

describe('rounds and effect durations', () => {
  const nextTurns = (s, n) => { for (let i = 0; i < n; i++) s = gameReducer(s, { type: 'NEXT_TURN', payload: {} }); return s; };

  it('a round ends when play returns to whoever went first, not seat 0', () => {
    let s = newGame(3);
    s = { ...s, currentPlayerIndex: 1, firstPlayerIndex: 1, currentRound: 0 };
    s = nextTurns(s, 2); // 1 -> 2 -> 0
    expect(s.currentRound).toBe(0);
    s = nextTurns(s, 1); // 0 -> 1 (back to first player)
    expect(s.currentRound).toBe(1);
  });

  it('SET_FIRST_PLAYER remembers the first seat', () => {
    let s = gameReducer(initialState, { type: 'INITIALIZE_GAME', payload: buildGamePayload(2) });
    s = { ...s, firstPlayerRolls: [{ playerId: 'player-0', sum: 9 }, { playerId: 'player-1', sum: 4 }] };
    s = gameReducer(s, { type: 'SET_FIRST_PLAYER' });
    expect(s.currentPlayerIndex).toBe(1);
    expect(s.firstPlayerIndex).toBe(1);
  });

  it('a toll booth lasts 3 full rounds whoever plays it', () => {
    let s = gameReducer(newGame(3), { type: 'APPLY_SPECIAL_RESOURCE', payload: { cardId: 'r6', playerId: 'player-0' } });
    expect(s.tollBooths['player-0'].turnsLeft).toBe(9);
    s = nextTurns(s, 8);
    expect(s.tollBooths['player-0']).toBeTruthy();
    s = nextTurns(s, 1);
    expect(s.tollBooths['player-0']).toBeUndefined();
  });

  it('a sealed space stays sealed for every opponent\'s next turn', () => {
    // Seat 2 (last in the round) seals: the old seat-0 round counter expired this immediately
    let s = { ...newGame(3), currentPlayerIndex: 2 };
    s = gameReducer(s, { type: 'APPLY_SPECIAL_DEFENSE', payload: { cardId: 'd7', playerId: 'player-2' } });
    const idx = player(s, 'player-2').position;
    s = nextTurns(s, 2); // seats 0 and 1 have their turns
    expect(s.sealedSpaces[idx]).toBeGreaterThan(0);
    s = nextTurns(s, 1); // back to the sealer
    expect(s.sealedSpaces[idx]).toBeUndefined();
  });
});

describe('salary', () => {
  it('pays the 100G base when passing your START even with no territories', () => {
    let s = setPlayer(newGame(), 'player-0', { position: 39, ownedTerritories: [] });
    const before = player(s, 'player-0').gold;
    s = gameReducer(s, { type: 'MOVE_PLAYER_STEP', payload: { playerId: 'player-0' } });
    expect(player(s, 'player-0').position).toBe(0);
    expect(player(s, 'player-0').gold).toBe(before + 100);
  });
});

describe('debts never create gold', () => {
  it('tribute pays only what the payer has', () => {
    let s = setPlayer(newGame(), 'player-0', { gold: 30 });
    const ownerBefore = player(s, 'player-1').gold;
    s = gameReducer(s, { type: 'PAY_TRIBUTE', payload: { fromPlayerId: 'player-0', toPlayerId: 'player-1', amount: 150 } });
    expect(player(s, 'player-0').gold).toBe(0);
    expect(player(s, 'player-1').gold).toBe(ownerBefore + 30);
  });

  it('a combat loser pays at most what they have', () => {
    let s = setPlayer(newGame(), 'player-1', { gold: 20 });
    s = gameReducer(s, { type: 'START_COMBAT', payload: { attackerId: 'player-0', defenderId: 'player-1' } });
    const atkBefore = player(s, 'player-0').gold;
    s = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: [[6, 6, 1, 1]] } });
    expect(s.combatData.difference * 10).toBeGreaterThan(20);
    expect(s.combatData.goldPayment).toBe(20);
    expect(player(s, 'player-1').gold).toBe(0);
    expect(player(s, 'player-0').gold).toBe(atkBefore + 20);
  });
});

describe('cards', () => {
  const draw = (s, card) => gameReducer(s, { type: 'TEST_DRAW_CARD', payload: { card } });

  it('a drawn penalty cannot be kept', () => {
    const p1 = { id: 'p1', type: 'penalty', text: 'x', effect: { defense: -2 }, keepable: true };
    const s = draw(newGame(), p1);
    expect(gameReducer(s, { type: 'KEEP_DRAWN_CARD' })).toBe(s);
  });

  it('a keepable fate card can still be kept', () => {
    const f1 = { id: 'f1', type: 'fate', text: 'x', effect: { defense: 2 }, keepable: true };
    const s = gameReducer(draw(newGame(), f1), { type: 'KEEP_DRAWN_CARD' });
    expect(player(s, 'player-0').hand.map((c) => c.id)).toEqual(['f1']);
    expect(player(s, 'player-0').lastDrawnCard).toBe(null);
  });

  it('DRAW_CARD skips excluded cards (no f8 chains)', () => {
    let s = newGame();
    s = { ...s, cardDecks: { ...s.cardDecks, fate: s.cardDecks.fate.filter((c) => ['f8', 'f4'].includes(c.id)) } };
    for (let i = 0; i < 2; i++) {
      const after = gameReducer(s, { type: 'DRAW_CARD', payload: { deckType: 'fate', randomIndex: i, excludeCardIds: ['f8'] } });
      expect(player(after, 'player-0').lastDrawnCard.id).toBe('f4');
      expect(after.cardDecks.fate.map((c) => c.id)).toEqual(['f8']);
    }
  });

  it('the f8 move goes forward even under reverse movement', () => {
    let s = { ...newGame(), reverseMovement: { 'player-0': 3 } };
    s = setPlayer(s, 'player-0', { position: 5 });
    const back = gameReducer(s, { type: 'MOVE_PLAYER_STEP', payload: { playerId: 'player-0' } });
    expect(player(back, 'player-0').position).toBe(4);
    const fwd = gameReducer(s, { type: 'MOVE_PLAYER_STEP', payload: { playerId: 'player-0', forceForward: true } });
    expect(player(fwd, 'player-0').position).toBe(6);
  });

  it('a7 uses the dice from the action: the lower roll loses 1 Army', () => {
    let s = setPlayer(newGame(), 'player-1', { armyStrength: 4 });
    s = setPlayer(s, 'player-0', { armyStrength: 4, lastDrawnCard: { id: 'a7', type: 'army', effect: { special: 'challenge_nearby' } } });
    s = gameReducer(s, { type: 'APPLY_SPECIAL_ARMY', payload: { cardId: 'a7', playerId: 'player-0', targetPlayerId: 'player-1', rolls: [5, 2] } });
    expect(player(s, 'player-0').armyStrength).toBe(4);
    expect(player(s, 'player-1').armyStrength).toBe(3);
    expect(player(s, 'player-0').lastDrawnCard).toBe(null);
  });
});

describe('truce card (f7)', () => {
  const truce = () => gameReducer(newGame(), { type: 'APPLY_SPECIAL_FATE', payload: { cardId: 'f7', playerId: 'player-0', targetPlayerId: 'player-1' } });

  it('stops both players attacking each other, with no stat sharing', () => {
    const s = truce();
    expect(cannotAttack(s, 'player-0', 'player-1')).toBe(true);
    expect(cannotAttack(s, 'player-1', 'player-0')).toBe(true);
    expect(s.alliances).toBeUndefined();
  });

  it('hides the nearby-attack offer', () => {
    const s = setPlayer(truce(), 'player-1', { position: 2 });
    expect(isAttackOfferPending(s)).toBe(false);
  });

  it('covers 3 turns for each player (the card player\'s current turn counts)', () => {
    let s = truce(); // A's turn 1
    const next = () => { s = gameReducer(s, { type: 'NEXT_TURN', payload: {} }); };
    next(); expect(cannotAttack(s, 'player-1', 'player-0')).toBe(true); // B turn 1
    next(); expect(cannotAttack(s, 'player-0', 'player-1')).toBe(true); // A turn 2
    next(); expect(cannotAttack(s, 'player-1', 'player-0')).toBe(true); // B turn 2
    next(); expect(cannotAttack(s, 'player-0', 'player-1')).toBe(true); // A turn 3
    next(); expect(cannotAttack(s, 'player-1', 'player-0')).toBe(true); // B turn 3
    next(); expect(cannotAttack(s, 'player-0', 'player-1')).toBe(false); // A turn 4: free
    next(); expect(cannotAttack(s, 'player-1', 'player-0')).toBe(false); // B turn 4: free
  });
});

describe('decisive victory', () => {
  const fight = (s, rolls) => run(s,
    { type: 'START_COMBAT', payload: { attackerId: 'player-0', defenderId: 'player-1' } },
    { type: 'RESOLVE_COMBAT', payload: { rolls } });

  it('winning by 5+ takes 1 point of the loser\'s stronger stat', () => {
    let s = setPlayer(newGame(), 'player-1', { armyStrength: 2, defenseStrength: 6 });
    s = setPlayer(s, 'player-0', { armyStrength: 10, defenseStrength: 0 });
    s = fight(s, [[6, 6, 1, 1]]); // 22 vs 8
    expect(s.combatData.decisiveSteal).toEqual({ stat: 'defense', amount: 1 });
    expect(player(s, 'player-1').defenseStrength).toBe(5);
    expect(player(s, 'player-0').defenseStrength).toBe(1);
  });

  it('a narrow win takes nothing', () => {
    let s = setPlayer(newGame(), 'player-1', { armyStrength: 2, defenseStrength: 6 });
    s = fight(s, [[6, 4, 1, 1]]); // 10 vs 8
    expect(s.combatData.decisiveSteal).toBe(null);
    expect(player(s, 'player-1').defenseStrength).toBe(6);
  });
});

describe('selling territories', () => {
  it('pays half the list price', () => {
    let s = newGame();
    expect(getTerritorySalePrice(s, 'territory-6')).toBe(100); // Moss Ward 200
    expect(getTerritorySalePrice(s, 'territory-36')).toBe(200); // Black Spire 400
    expect(getTerritorySalePrice(s, 'inner-tl-1')).toBe(375);
    expect(getTerritorySalePrice(s, 'inner-tl-2')).toBe(625);
    s = setPlayer(s, 'player-0', { ownedTerritories: ['inner-tl-2'] });
    s = { ...s, territories: { 'inner-tl-2': { ownerId: 'player-0', incomeType: 'army' } } };
    const before = player(s, 'player-0').gold;
    s = gameReducer(s, { type: 'SELL_TERRITORY', payload: { territoryId: 'inner-tl-2' } });
    expect(player(s, 'player-0').gold).toBe(before + 625);
    expect(player(s, 'player-0').ownedTerritories).toEqual([]);
  });
});

describe('vanguard jump', () => {
  const jump = (s, spaceIndex) => gameReducer(s, { type: 'VANGUARD_JUMP', payload: { playerId: 'player-0', spaceIndex } });
  const dragonOwns6 = (s) => ({
    ...setPlayer(s, 'player-1', { ownedTerritories: ['territory-6'] }),
    territories: { 'territory-6': { ownerId: 'player-1', spaceIndex: 6 } },
  });

  it('is offered on your own START before you roll, for every outer spot you don\'t own', () => {
    const s = newGame();
    expect(getVanguardTargets(s).map((t) => t.spaceIndex)).toEqual([6, 12, 18, 24, 30, 36]);
    expect(getVanguardTargets(gameReducer(s, { type: 'SET_DICE_RESULT', payload: [1, 2] }))).toEqual([]);
    expect(getVanguardTargets(setPlayer(s, 'player-0', { position: 3 }))).toEqual([]);
    expect(getVanguardTargets(setPlayer(s, 'player-0', { gold: 50 }))).toEqual([]);
  });

  it('to an unclaimed spot: pays 100G, warps, and offers the purchase', () => {
    const s0 = newGame();
    const s = jump(s0, 12);
    expect(player(s, 'player-0').position).toBe(12);
    expect(player(s, 'player-0').gold).toBe(player(s0, 'player-0').gold - 100);
    expect(s.selectedTerritory).toBe(12);
    expect(canStillRoll(s)).toBe(false);
  });

  it('to an opponent\'s territory: Tactical Clash with the defender +1', () => {
    let s = dragonOwns6(newGame());
    s = jump(s, 6);
    expect(s.combatActive).toBe(true);
    expect(s.combatData).toMatchObject({ combatMode: 'tactical', defenderBonus: 1, territoryId: 'territory-6', defenderId: 'player-1' });
    s = gameReducer(s, { type: 'RESOLVE_COMBAT', payload: { rolls: [[3, 3, 3, 3]] } }); // 6 vs 6+2 army +1 bonus
    const dragon = player(s, 'player-1');
    expect(s.combatData.defenderTotal).toBe(6 + dragon.armyStrength + dragon.defenseStrength + 1);
    expect(s.combatData.winner).toBe('player-1');
  });

  it('a won clash takes the territory', () => {
    let s = setPlayer(dragonOwns6(newGame()), 'player-0', { armyStrength: 10 });
    s = run(s, { type: 'VANGUARD_JUMP', payload: { playerId: 'player-0', spaceIndex: 6 } }, { type: 'RESOLVE_COMBAT', payload: { rolls: [[6, 6, 1, 1]] } });
    expect(s.territories['territory-6'].ownerId).toBe('player-0');
    expect(player(s, 'player-0').ownedTerritories).toContain('territory-6');
  });

  it('can\'t target a territory owned by a player you have a truce with', () => {
    let s = dragonOwns6(newGame());
    s = gameReducer(s, { type: 'APPLY_SPECIAL_RESOURCE', payload: { cardId: 'r8', playerId: 'player-0', targetPlayerId: 'player-1' } });
    expect(getVanguardTargets(s).map((t) => t.spaceIndex)).not.toContain(6);
    expect(jump(s, 6)).toBe(s);
  });
});

describe('bank debt (p0) can always be repaid', () => {
  const inDebt = (gold) => {
    let s = setPlayer(newGame(), 'player-0', { gold });
    return gameReducer(s, { type: 'APPLY_CARD_EFFECT', payload: { playerId: 'player-0', effect: { special: 'bank_debt' }, isPenalty: true } });
  };

  it('puts the player 300G in debt', () => {
    expect(getBankDebt(inDebt(0), 'player-0')).toBe(300);
  });

  it('earnings pay the debt down instead of vanishing', () => {
    let s = setPlayer(inDebt(0), 'player-0', { position: 39 });
    s = gameReducer(s, { type: 'MOVE_PLAYER_STEP', payload: { playerId: 'player-0' } }); // +100 salary
    expect(player(s, 'player-0').gold).toBe(0);
    expect(getBankDebt(s, 'player-0')).toBe(200);
  });

  it('a broke player is never stuck: income clears it, then gold flows again', () => {
    let s = inDebt(0);
    for (const g of [250, 100]) s = gameReducer(s, { type: 'APPLY_CARD_EFFECT', payload: { playerId: 'player-0', effect: { gold: g } } });
    expect(getBankDebt(s, 'player-0')).toBe(0);
    expect(player(s, 'player-0').gold).toBe(50); // 350 earned − 300 repaid
  });

  it('landing on Resource pays what you can, even a partial amount', () => {
    let s = gameReducer(inDebt(120), { type: 'PAY_OFF_GOLD_BLOCK', payload: { playerId: 'player-0' } });
    expect(player(s, 'player-0').gold).toBe(0);
    expect(getBankDebt(s, 'player-0')).toBe(180);
  });

  it('gold paid to a debtor goes to the bank too', () => {
    let s = setPlayer(inDebt(0), 'player-1', { gold: 500 });
    s = gameReducer(s, { type: 'PAY_TRIBUTE', payload: { fromPlayerId: 'player-1', toPlayerId: 'player-0', amount: 100 } });
    expect(player(s, 'player-1').gold).toBe(400);
    expect(player(s, 'player-0').gold).toBe(0);
    expect(getBankDebt(s, 'player-0')).toBe(200);
  });
});

describe('inner territories raise a stat each lap', () => {
  it('passing START gives +1 of each inner territory\'s chosen stat plus gold for outer ones', () => {
    let s = setPlayer(newGame(), 'player-0', { position: 39, armyStrength: 2, defenseStrength: 3, ownedTerritories: ['inner-tl-1', 'inner-tl-2', 'territory-6'] });
    s = { ...s, territories: { 'inner-tl-1': { ownerId: 'player-0', incomeType: 'army' }, 'inner-tl-2': { ownerId: 'player-0', incomeType: 'defense' }, 'territory-6': { ownerId: 'player-0', spaceIndex: 6 } } };
    const gold = player(s, 'player-0').gold;
    s = gameReducer(s, { type: 'MOVE_PLAYER_STEP', payload: { playerId: 'player-0' } });
    expect(player(s, 'player-0').gold).toBe(gold + 200);
    expect(player(s, 'player-0').armyStrength).toBe(3);
    expect(player(s, 'player-0').defenseStrength).toBe(4);
    expect(s.incomeNotification).toMatchObject({ amount: 200, outerCount: 1, army: 1, defense: 1 });
  });
});

describe('gauntlet challenger bonus', () => {
  const clash = (pc) => gameReducer(newGame(pc), { type: 'START_COMBAT', payload: { attackerId: 'player-1', defenderId: 'player-0', combatSource: 'gauntlet', combatMode: 'tactical' } });

  it('scales with player count: +4 / +3 / +2', () => {
    expect(clash(2).combatData.attackerBonus).toBe(4);
    expect(clash(3).combatData.attackerBonus).toBe(3);
    expect(clash(4).combatData.attackerBonus).toBe(2);
  });

  it('is added to the challenger\'s total', () => {
    const s = gameReducer(clash(2), { type: 'RESOLVE_COMBAT', payload: { rolls: [[3, 3, 3, 3]] } });
    const dragon = player(s, 'player-1');
    expect(s.combatData.attackerTotal).toBe(6 + dragon.armyStrength + dragon.defenseStrength + 4);
  });

  it('does not apply to ordinary fights', () => {
    const s = gameReducer(newGame(2), { type: 'START_COMBAT', payload: { attackerId: 'player-1', defenderId: 'player-0' } });
    expect(s.combatData.attackerBonus).toBe(0);
  });
});
