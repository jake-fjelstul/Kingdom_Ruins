import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, canEnterBlueRuinZone, isAttackOfferPending, canStillRoll, getVanguardTargets, VANGUARD_JUMP_COST, getHouseOptions, HOUSE_PAYOUT_MULTIPLIER, HOUSE_LOSS_MULTIPLIER } from '../context/GameContext';

export default function Dice() {
  const game = useGame();
  const { gamePhase, diceRoll, isRolling, rollDice, setTestDice, setTestPlayerStats, testDrawCard, movePlayer, currentPlayerIndex, players, endTurn, selectedTerritory, selectedCorner, pendingIncomeTypeSelection, landedOnStart, landedOnStartChoice, doublesBonusUsed, doublesExtraRollAvailable, useDoublesBonus, cannotMoveNextTurn, dispatch, testingMode, finishGameForTesting, requestEnterBlueRuin, combatActive, cardDecks = {}, territories = {}, testPurchaseInnerTerritory, movingPlayerId, cardSaleOffer, vanguardJump, houseChallenge, houseVault = 0, challengeHouse } = game;
  const currentPlayer = players[currentPlayerIndex];
  const cannotMove = !!(currentPlayer && (cannotMoveNextTurn || {})[currentPlayer.id]);

  // Things that must be completed before the turn can proceed (doubles bonus is NOT blocking – it's the option you get after completing these)
  const hasBlockingAction =
    selectedTerritory !== null ||
    currentPlayer?.lastDrawnCard !== null ||
    selectedCorner !== null ||
    pendingIncomeTypeSelection !== null ||
    landedOnStart !== null ||
    landedOnStartChoice !== null ||
    combatActive ||
    movingPlayerId != null ||
    cardSaleOffer != null ||
    houseChallenge != null ||
    isAttackOfferPending(game);
  const isMoving = movingPlayerId != null;
  const mayRoll = canStillRoll(game); // attacking (or having rolled) uses up this turn's roll

  // Check if current roll is doubles (for display purposes) — defined before cannotRoll so it can be used there
  const isDoubles = diceRoll !== null && Array.isArray(diceRoll) && diceRoll[0] === diceRoll[1];
  const canRollAgain = doublesExtraRollAvailable && !doublesBonusUsed;

  // Roll button should be grayed out when it's not the human's turn to roll (e.g. AI's turn, or already rolled with no doubles)
  const cannotRoll =
    !!currentPlayer?.isAI ||
    isRolling ||
    cannotMove ||
    hasBlockingAction ||
    diceRoll !== null ||   // dice already rolled — wait for movement
    !mayRoll ||            // already rolled or attacked this turn
    canRollAgain;          // doubles bonus pending — must use the "Roll Again" button

  const canEnter = gamePhase === 'playing' && !combatActive && currentPlayer && !currentPlayer.isAI && mayRoll && canEnterBlueRuinZone(currentPlayer, game);
  // Vanguard Jump: on your own START, pay 100G to warp to an outer territory instead of rolling
  const vanguardTargets = !currentPlayer?.isAI && !hasBlockingAction && diceRoll === null && !isRolling
    ? getVanguardTargets(game)
    : [];
  const [showVanguard, setShowVanguard] = useState(false);
  React.useEffect(() => { setShowVanguard(false); }, [currentPlayer?.id, vanguardTargets.length === 0]);
  // Challenge the House: once per turn, before rolling
  const houseOpts = !currentPlayer?.isAI && !hasBlockingAction && !cannotMove ? getHouseOptions(game) : { stakes: [], heist: false };
  const canChallengeHouse = houseOpts.stakes.length > 0 || houseOpts.heist;
  const [showHouse, setShowHouse] = useState(false);
  React.useEffect(() => { setShowHouse(false); }, [currentPlayer?.id, canChallengeHouse]);
  const [testDie1, setTestDie1] = useState(1);
  const [testDie2, setTestDie2] = useState(1);
  const [testGold, setTestGold] = useState(currentPlayer?.gold || 0);
  const [testArmy, setTestArmy] = useState(currentPlayer?.armyStrength || 0);
  const [testDefense, setTestDefense] = useState(currentPlayer?.defenseStrength || 0);

  // Update test values when current player changes
  React.useEffect(() => {
    if (currentPlayer) {
      setTestGold(currentPlayer.gold);
      setTestArmy(currentPlayer.armyStrength);
      setTestDefense(currentPlayer.defenseStrength);
    }
  }, [currentPlayer?.id, currentPlayer?.gold, currentPlayer?.armyStrength, currentPlayer?.defenseStrength]);

  const handleRoll = () => {
    if (cannotRoll) return;
    rollDice();
  };

  const handleRollAgain = () => {
    if (!canRollAgain) return;
    useDoublesBonus();
    // Clear current dice and allow new roll
    dispatch({ type: 'CLEAR_DICE' });
    setTimeout(() => {
      rollDice();
    }, 200);
  };

  // For human players only: schedule movement after dice land. AI movement is triggered by useAITurn so it isn't cancelled when effects re-run.
  // Never schedule while a card is on screen so movement and cards never overlap.
  React.useEffect(() => {
    if (diceRoll !== null && !isRolling && currentPlayer && !currentPlayer.isAI && !currentPlayer?.lastDrawnCard) {
      const diceValue = Array.isArray(diceRoll) ? diceRoll[0] + diceRoll[1] : diceRoll;
      const playerId = currentPlayer.id;
      const timeoutId = setTimeout(() => {
        movePlayer(playerId, diceValue);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [diceRoll, isRolling, currentPlayer?.id, currentPlayer?.isAI, currentPlayer?.lastDrawnCard, movePlayer]);

  const getDiceFace = (value) => {
    const dots = {
      1: '⚀',
      2: '⚁',
      3: '⚂',
      4: '⚃',
      5: '⚄',
      6: '⚅',
    };
    return dots[value] || '⚀';
  };

  if (gamePhase === 'gauntlet') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-center text-amber-200 font-semibold">
          🏰 The Gauntlet of the Fallen — in progress
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {canEnter && diceRoll === null && !hasBlockingAction && (
        <motion.button
          onClick={requestEnterBlueRuin}
          className="px-6 py-3 rounded-lg font-bold text-white shadow-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 border-2 border-amber-400"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🏰 Enter Blue Ruin Zone (Restoration)
        </motion.button>
      )}
      {vanguardTargets.length > 0 && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <motion.button
            onClick={() => setShowVanguard((v) => !v)}
            className="px-5 py-2 rounded-lg font-bold text-white shadow-lg bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-700 hover:to-sky-800 border-2 border-cyan-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ⚡ Vanguard Jump ({VANGUARD_JUMP_COST}G)
          </motion.button>
          {showVanguard && (
            <div className="w-full bg-slate-800/90 border border-cyan-500/60 rounded-lg p-2 flex flex-col gap-1">
              <p className="text-cyan-100 text-xs text-center mb-1">
                Warp to a territory instead of rolling. Owned territories start a Tactical Clash (defender +1).
              </p>
              {vanguardTargets.map((t) => {
                const owner = t.ownerId ? players.find((p) => p.id === t.ownerId) : null;
                return (
                  <button
                    key={t.spaceIndex}
                    onClick={() => { setShowVanguard(false); vanguardJump(t.spaceIndex); }}
                    className={`w-full px-3 py-1.5 rounded text-sm font-semibold text-white flex justify-between ${owner ? 'bg-red-700 hover:bg-red-800' : 'bg-cyan-700 hover:bg-cyan-800'}`}
                  >
                    <span>{t.name}</span>
                    <span className="opacity-80">{owner ? `⚔️ ${owner.icon} ${owner.name}` : 'Unclaimed'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {canChallengeHouse && (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm">
          <motion.button
            onClick={() => setShowHouse((v) => !v)}
            aria-expanded={showHouse}
            className="px-5 py-2 rounded-lg font-bold text-white shadow-lg bg-gradient-to-r from-amber-700 to-yellow-700 hover:from-amber-800 hover:to-yellow-800 border-2 border-amber-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🎲 Challenge the House (Vault: {houseVault}G)
          </motion.button>
          {showHouse && (
            <div className="w-full bg-slate-800/90 border border-amber-500/60 rounded-lg p-2 flex flex-col gap-1">
              <p className="text-amber-100 text-xs text-center mb-1">
                You and the House each roll 2d6. Higher total wins; the House wins ties (about 44% for you). Once per turn, then you still roll.
              </p>
              {houseOpts.stakes.map((stake) => (
                <button
                  key={stake}
                  onClick={() => { setShowHouse(false); challengeHouse(stake); }}
                  className="w-full px-3 py-1.5 rounded text-sm font-semibold text-white flex justify-between bg-amber-700 hover:bg-amber-800"
                >
                  <span>Bet {stake}G</span>
                  <span className="opacity-90">win +{stake * HOUSE_PAYOUT_MULTIPLIER} · lose −{stake * HOUSE_LOSS_MULTIPLIER}</span>
                </button>
              ))}
              {houseOpts.heist && (
                <button
                  onClick={() => { setShowHouse(false); challengeHouse('heist'); }}
                  className="w-full px-3 py-1.5 rounded text-sm font-semibold text-white flex justify-between gap-2 bg-red-800 hover:bg-red-900"
                >
                  <span className="whitespace-nowrap">🗝️ Vault Heist</span>
                  <span className="opacity-90 text-right">win +{houseVault} · lose ½ gold +1 Army</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {cannotMove ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-amber-300 font-semibold text-center">{currentPlayer?.isAI ? `${currentPlayer.name} cannot move this turn (training).` : 'You cannot move this turn (training).'}</p>
          {!currentPlayer?.isAI && !hasBlockingAction && (
            <motion.button
              onClick={endTurn}
              className="px-6 py-3 rounded-lg font-bold text-white shadow-lg bg-green-600 hover:bg-green-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              End Turn
            </motion.button>
          )}
        </div>
      ) : (
        <motion.button
          onClick={handleRoll}
          disabled={cannotRoll}
          className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-base text-white shadow-lg transition-all ${
            cannotRoll ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          whileHover={!cannotRoll ? { scale: 1.05 } : undefined}
          whileTap={!cannotRoll ? { scale: 0.95 } : undefined}
        >
          {isRolling ? 'Rolling...' : isMoving ? 'Moving...' : currentPlayer?.isAI ? "AI's turn" : !mayRoll ? 'Move Complete' : 'Roll Dice'}
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        {diceRoll !== null && Array.isArray(diceRoll) && (
          <motion.div
            key={`${diceRoll[0]}-${diceRoll[1]}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-4xl sm:text-5xl lg:text-6xl">
                {getDiceFace(diceRoll[0])}
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl text-white font-bold">+</div>
              <div className="text-4xl sm:text-5xl lg:text-6xl">
                {getDiceFace(diceRoll[1])}
              </div>
              <div className="text-xl sm:text-2xl text-white font-bold ml-1 sm:ml-2">
                = {diceRoll[0] + diceRoll[1]}
              </div>
            </div>
            {isDoubles && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-yellow-300 font-bold text-base sm:text-lg"
              >
                🎲 Doubles! 🎲
              </motion.div>
            )}
          </motion.div>
        )}
        {isRolling && (
          <motion.div
            key="rolling"
            className="flex items-center gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
              className="text-4xl sm:text-5xl lg:text-6xl"
            >
              ⚀
            </motion.div>
            <div className="text-2xl sm:text-3xl lg:text-4xl text-white font-bold">+</div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
              className="text-4xl sm:text-5xl lg:text-6xl"
            >
              ⚀
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!cannotMove && !currentPlayer?.isAI && canRollAgain && diceRoll === null && !hasBlockingAction && (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="text-yellow-300 text-sm font-semibold text-center">
            🎲 You rolled doubles! Roll again! 🎲
          </div>
          <motion.button
            onClick={handleRollAgain}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Roll Again
          </motion.button>
        </div>
      )}
      {!cannotMove && !currentPlayer?.isAI && canRollAgain && (diceRoll !== null || hasBlockingAction) && (
        <div className="text-yellow-300 text-xs text-center mt-2">
          🎲 Doubles bonus: Complete your action to roll again
        </div>
      )}
      {!cannotMove && !currentPlayer?.isAI && !mayRoll && diceRoll === null && !isRolling && !hasBlockingAction && !canRollAgain && (
        <motion.button
          onClick={endTurn}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          End Turn
        </motion.button>
      )}
      {hasBlockingAction && (
        <div className="text-white text-sm text-center">
          Complete action to continue
        </div>
      )}

      {testingMode && (
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600 w-full max-w-md">
        <p className="text-xs text-gray-400 mb-2 text-center">🧪 Testing Mode</p>
        <div className="flex justify-center mb-3">
          <button
            type="button"
            onClick={finishGameForTesting}
            className="px-4 py-2 rounded text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white"
          >
            Finish game → Win screen
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            min="1"
            max="6"
            value={testDie1}
            onChange={(e) => setTestDie1(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
            className="w-12 px-2 py-1 rounded bg-gray-700 text-white text-center border border-gray-600 text-sm"
          />
          <span className="text-white font-bold">+</span>
          <input
            type="number"
            min="1"
            max="6"
            value={testDie2}
            onChange={(e) => setTestDie2(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
            className="w-12 px-2 py-1 rounded bg-gray-700 text-white text-center border border-gray-600 text-sm"
          />
          <button
            onClick={() => setTestDice(testDie1, testDie2)}
            disabled={isRolling || diceRoll !== null || cannotMove || hasBlockingAction}
            className={`px-3 py-1 rounded text-sm font-semibold ${
              isRolling || diceRoll !== null || cannotMove || hasBlockingAction
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            Set Dice
          </button>
        </div>
        {/* Testing Feature - Set Player Stats */}
        {currentPlayer && (
          <div className="border-t border-gray-600 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2 text-center">Set {currentPlayer.name} Stats</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-yellow-300 text-xs w-12">💰 Gold:</span>
                <input
                  type="number"
                  min="0"
                  value={testGold}
                  onChange={(e) => setTestGold(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 px-2 py-1 rounded bg-gray-700 text-white text-center border border-gray-600 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-300 text-xs w-12">⚔️ Army:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testArmy}
                  onChange={(e) => setTestArmy(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="flex-1 px-2 py-1 rounded bg-gray-700 text-white text-center border border-gray-600 text-sm"
                />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-300 text-xs w-12">🛡️ Defense:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={testDefense}
                  onChange={(e) => setTestDefense(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="flex-1 px-2 py-1 rounded bg-gray-700 text-white text-center border border-gray-600 text-sm"
                />
                <span className="text-gray-400 text-xs">%</span>
              </div>
              <button
                onClick={() => setTestPlayerStats(currentPlayer.id, testGold, testArmy, testDefense)}
                className="px-3 py-1 rounded text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white mt-1"
              >
                Set Stats
              </button>
            </div>
          </div>
        )}
        {/* Testing Feature - Buy Player Territory Sections (inner sections only; no gold required; no turn advance) */}
        {currentPlayer && testPurchaseInnerTerritory && (
          <div className="border-t border-gray-600 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2 text-center">Buy {currentPlayer.name} Territory Sections</p>
            <div className="space-y-2">
              {(() => {
                const factionToPrefix = { king: 'tl', dragon: 'tr', knight: 'bl', wizard: 'br' };
                const prefix = factionToPrefix[currentPlayer.faction];
                if (!prefix) return null;
                const innerIds = [
                  { id: `inner-${prefix}-1`, label: 'Section 1' },
                  { id: `inner-${prefix}-2`, label: 'Section 2' },
                ];
                return innerIds.map(({ id, label }) => {
                  const owned = territories[id];
                  if (owned) {
                    return (
                      <div key={id} className="flex items-center justify-between text-xs text-gray-500 py-1">
                        <span>{label} ({id})</span>
                        <span className="text-green-400">Owned</span>
                      </div>
                    );
                  }
                  return (
                    <div key={id} className="flex flex-wrap items-center gap-1 py-1">
                      <span className="text-gray-300 text-xs w-24">{label} ({id}):</span>
                      <button
                        type="button"
                        onClick={() => testPurchaseInnerTerritory(id, 'army')}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-green-600 hover:bg-green-700 text-white"
                      >
                        Army
                      </button>
                      <button
                        type="button"
                        onClick={() => testPurchaseInnerTerritory(id, 'defense')}
                        className="px-2 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Defense
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
        {/* Testing Feature - Test Cards */}
        {currentPlayer && (
          <div className="border-t border-gray-600 pt-3 mt-3">
            <p className="text-xs text-gray-400 mb-2 text-center">Test Cards (applies to {currentPlayer.name})</p>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {[
                { key: 'resource', label: 'Resource', color: 'bg-yellow-600' },
                { key: 'army', label: 'Army', color: 'bg-green-600' },
                { key: 'defense', label: 'Defense', color: 'bg-blue-600' },
                { key: 'fate', label: 'Fate', color: 'bg-pink-600' },
                { key: 'penalty', label: 'Penalty', color: 'bg-amber-600' },
              ].map(({ key, label, color }) => {
                const deck = cardDecks[key];
                if (!deck?.length) return null;
                return (
                  <div key={key} className="space-y-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <div className="flex flex-wrap gap-1">
                      {deck.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => testDrawCard(card)}
                          disabled={!!currentPlayer?.lastDrawnCard}
                          title={card.text}
                          className={`px-2 py-0.5 rounded text-xs font-medium ${color} hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {card.id}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
