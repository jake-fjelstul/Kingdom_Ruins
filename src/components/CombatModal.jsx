import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

export default function CombatModal() {
  const { combatActive, combatData, players, currentPlayerIndex, finishCombat, addCombatBribe, rollCombatDice } = useGame();
  const [showResults, setShowResults] = useState(false);
  const [showAttackAnimation, setShowAttackAnimation] = useState(false);
  const isGauntlet = combatData?.combatSource === 'gauntlet';
  const tactical = combatData?.combatMode === 'tactical';

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

  const attacker = combatData ? players.find(p => p.id === combatData.attackerId) : null;
  const defender = combatData ? players.find(p => p.id === combatData.defenderId) : null;
  // Who may press buttons: in a normal fight the human whose turn it is; in the Gauntlet any human participant.
  // AI-controlled fights are rolled and closed by useAITurn.
  const turnPlayer = players[currentPlayerIndex];
  const humanControls = isGauntlet
    ? !!(attacker && !attacker.isAI) || !!(defender && !defender.isAI)
    : !!(turnPlayer && !turnPlayer.isAI);

  // Dice are rolled and resolved in one step; play the clash animation, then show the result
  useEffect(() => {
    if (!combatActive || !combatData) return undefined;
    if (!combatData.diceRolled) {
      setShowResults(false);
      setShowAttackAnimation(false);
      return undefined;
    }
    setShowAttackAnimation(true);
    const t1 = setTimeout(() => setShowAttackAnimation(false), 1000);
    const t2 = setTimeout(() => setShowResults(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [combatActive, combatData?.diceRolled, combatData?.attackerId, combatData?.defenderId]);

  if (!combatActive || !combatData || !attacker || !defender) return null;

  const diceRolled = combatData.diceRolled || false;
  
  // Get dice values from combatData (stored as arrays) - only available after dice are rolled
  const attackerDice = combatData.attackerDice || (diceRolled ? [Math.floor((combatData.attackerRoll || 0) / 2), Math.ceil((combatData.attackerRoll || 0) / 2)] : null);
  const defenderDice = combatData.defenderDice || (diceRolled ? [Math.floor((combatData.defenderRoll || 0) / 2), Math.ceil((combatData.defenderRoll || 0) / 2)] : null);

  const handleAddBribe = (playerId) => {
    addCombatBribe(playerId); // No amount needed - bribe is fixed at 100 gold per point
  };

  const handleRollDice = () => {
    rollCombatDice();
    // Results will be shown automatically via useEffect after animation
  };

  const handleClose = () => {
    if (!humanControls || combatData?.winner == null) return;
    setShowResults(false);
    finishCombat();
  };

  const defenderBonus = combatData?.defenderBonus || 0; // e.g. +1 defending against a Vanguard Jump
  const attackerBonus = combatData?.attackerBonus || 0; // Gauntlet challengers: the realm rallies against the target
  // The reducer's stored stat includes the bonus; show the two separately
  const attackerBaseStat = (combatData?.attackerStat ?? null) != null ? combatData.attackerStat - attackerBonus : null;
  const atkStat = tactical
    ? (attacker.armyStrength ?? 0) + (attacker.defenseStrength ?? 0)
    : (attacker.armyStrength ?? 0); // shown pre-roll only
  const defStat = tactical
    ? (defender.armyStrength ?? 0) + (defender.defenseStrength ?? 0)
    : (defender.defenseStrength ?? 0);

  // Authoritative numbers come from the reducer once dice are rolled
  const attackerTotal = diceRolled ? (combatData.attackerTotal ?? null) : null;
  const defenderTotal = diceRolled ? (combatData.defenderTotal ?? null) : null;
  const attackerWins =
    combatData.winner != null
      ? combatData.winner === combatData.attackerId
      : (diceRolled && attackerTotal != null && defenderTotal != null ? attackerTotal > defenderTotal : null);
  const difference = diceRolled && attackerTotal != null && defenderTotal != null ? Math.abs(attackerTotal - defenderTotal) : 0;
  const decisiveVictory = difference >= 5;
  // Banner from the human's point of view: with exactly one human in the fight, they see VICTORY or
  // DEFEAT; AI-vs-AI or two humans on one screen just name the winner.
  const winnerPlayer = attackerWins ? attacker : defender;
  const humansInFight = [attacker, defender].filter((p) => p && !p.isAI);
  const bannerMood = humansInFight.length === 1 ? (humansInFight[0].id === winnerPlayer?.id ? 'win' : 'lose') : 'neutral';
  const bannerTitle = bannerMood === 'win' ? '🎉 VICTORY! 🎉' : bannerMood === 'lose' ? '💀 DEFEAT 💀' : '🏆 VICTORY 🏆';
  const bribePot = combatData.bribePot || 0;
  const goldPayment = combatData.goldPayment ?? 0; // capped at what the loser had

  return (
    <AnimatePresence>
      {combatActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={showResults ? handleClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            className="bg-gradient-to-br from-red-900 to-orange-900 rounded-lg shadow-2xl p-4 sm:p-6 lg:p-8 max-w-2xl w-full mx-2 sm:mx-4 border-2 sm:border-4 border-red-600 max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!showResults ? (
              <>
                {/* Battle Header with Attack Animation */}
                <div className="text-center mb-6 relative">
                  <motion.h2
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
                  >
                    {isGauntlet ? '⚔️ THE GAUNTLET OF THE FALLEN ⚔️' : '⚔️ BATTLE ⚔️'}
                  </motion.h2>
                  <p className="text-red-200 text-sm sm:text-base lg:text-lg flex flex-col items-center gap-2">
                    <span>{attacker.name} vs {defender.name}{tactical ? ' (Tactical Clash)' : ''}</span>
                    {bribePot > 0 && (
                      <span className="inline-flex items-center gap-2 bg-yellow-900/60 border border-yellow-500/60 rounded-full px-3 py-1 shadow-md">
                        <span className="text-2xl">💰</span>
                        <span className="text-sm font-semibold text-yellow-200">Bribe Pot</span>
                        <span className="text-sm font-bold text-yellow-300">${bribePot}</span>
                      </span>
                    )}
                  </p>
                  
                  {/* Attack Animation Overlay */}
                  <AnimatePresence>
                    {showAttackAnimation && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], rotate: [0, 360] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <motion.div
                          animate={{
                            x: [-20, 20, -20],
                            y: [-10, 10, -10],
                          }}
                          transition={{ duration: 0.3, repeat: 3 }}
                          className="text-6xl"
                        >
                          ⚔️
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Combat Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {/* Attacker */}
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ 
                      x: showAttackAnimation ? [0, -10, 0] : 0,
                      opacity: 1,
                    }}
                    transition={{ duration: 0.3, repeat: showAttackAnimation ? 3 : 0 }}
                    className="bg-red-800/50 rounded-lg p-4 border-2 border-red-600"
                  >
                    <div className="text-center mb-3">
                      <span className="text-2xl sm:text-3xl">{attacker.icon}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-2">{attacker.name}</h3>
                      <p className="text-red-200 text-xs sm:text-sm">{tactical ? `${isGauntlet ? 'Challenger' : 'Attacker'} (Army+Defense)` : 'Attacker (Army %)'}</p>
                    </div>
                    <div className="space-y-2 text-white">
                      {diceRolled && attackerDice ? (
                        <>
                          <div className="flex flex-col items-center mb-2">
                            <span className="text-sm mb-1">2d6 Roll:</span>
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.3, type: 'spring' }}
                              className="flex items-center gap-2"
                            >
                              <motion.span
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="text-4xl"
                              >
                                {getDiceFace(attackerDice[0])}
                              </motion.span>
                              <span className="text-white font-bold">+</span>
                              <motion.span
                                animate={{ rotate: [0, -360] }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="text-4xl"
                              >
                                {getDiceFace(attackerDice[1])}
                              </motion.span>
                              <span className="font-bold text-yellow-300 text-xl ml-1">
                                = {combatData.attackerRoll}
                              </span>
                            </motion.div>
                          </div>
                          <div className="flex justify-between">
                            <span>{tactical ? 'Army+Defense:' : 'Army %:'}</span>
                            <span className="font-semibold">{tactical ? (attackerBaseStat ?? atkStat) : `${attackerBaseStat ?? atkStat}%`}</span>
                          </div>
                          {attackerBonus > 0 && (
                            <div className="flex justify-between">
                              <span>Realm rallies:</span>
                              <span className="font-semibold text-green-300">+{attackerBonus}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Bribe Points:</span>
                            <span className="font-semibold text-yellow-300">+{combatData.attackerBribe || 0}</span>
                          </div>
                          <div className="border-t border-red-600 pt-2 mt-2 flex justify-between">
                            <span className="font-bold">Total:</span>
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="font-bold text-yellow-300 text-xl"
                            >
                              {attackerTotal}
                            </motion.span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>{tactical ? 'Army+Defense:' : 'Army %:'}</span>
                            <span className="font-semibold">{tactical ? atkStat : `${attacker.armyStrength}%`}</span>
                          </div>
                          {attackerBonus > 0 && (
                            <div className="flex justify-between">
                              <span>Realm rallies:</span>
                              <span className="font-semibold text-green-300">+{attackerBonus}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Gold Bribe:</span>
                            <span className="font-semibold text-yellow-300">+{combatData.attackerBribe || 0}</span>
                          </div>
                          <div className="text-center text-sm text-red-200 mt-2">
                            Dice will be rolled after bribes
                          </div>
                        </>
                      )}
                    </div>
                    
                    {!diceRolled && !attacker.isAI && (() => {
                      const currentBribes = combatData.attackerBribe || 0;
                      const canAfford = attacker.gold >= 100;
                      const unlimited = isGauntlet;
                      return (
                        <div className="mt-4">
                          <div className="text-xs text-red-200 mb-2 text-center">
                            {unlimited ? 'Add Bribes: 100G = +1 Point (no limit)' : 'Add Bribes: 100G = +1 Point (Max 3)'}
                          </div>
                          <div className="flex gap-2 justify-center flex-wrap">
                            {unlimited ? (
                              <button
                                onClick={() => canAfford && handleAddBribe(combatData.attackerId)}
                                disabled={!canAfford}
                                className={`px-3 py-1 rounded font-semibold ${canAfford ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                              >
                                +1 (100G) ×{currentBribes}
                              </button>
                            ) : (
                              [1, 2, 3].map((bribeNum) => {
                                const canAdd = bribeNum > currentBribes && canAfford;
                                return (
                                  <button
                                    key={bribeNum}
                                    onClick={() => canAdd && handleAddBribe(combatData.attackerId)}
                                    disabled={!canAdd}
                                    className={`px-3 py-1 rounded font-semibold ${
                                      canAdd ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : bribeNum <= currentBribes ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    {bribeNum <= currentBribes ? '✓' : `+1 (100G)`}
                                  </button>
                                );
                              })
                            )}
                          </div>
                          {attacker.gold < 100 && (unlimited || currentBribes < 3) && (
                            <div className="text-xs text-red-300 mt-2 text-center">Need 100G to add bribe</div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>

                  {/* Defender */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ 
                      x: showAttackAnimation ? [0, 10, 0] : 0,
                      opacity: 1,
                    }}
                    transition={{ duration: 0.3, repeat: showAttackAnimation ? 3 : 0 }}
                    className="bg-blue-800/50 rounded-lg p-4 border-2 border-blue-600"
                  >
                    <div className="text-center mb-3">
                      <span className="text-2xl sm:text-3xl">{defender.icon}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-2">{defender.name}</h3>
                      <p className="text-blue-200 text-xs sm:text-sm">{tactical ? `${isGauntlet ? 'Target' : 'Defender'} (Army+Defense)` : 'Defender (Defense %)'}</p>
                    </div>
                    <div className="space-y-2 text-white">
                      {diceRolled && defenderDice ? (
                        <>
                          <div className="flex flex-col items-center mb-2">
                            <span className="text-sm mb-1">2d6 Roll:</span>
                            <motion.div
                              initial={{ scale: 0, rotate: 180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.3, type: 'spring' }}
                              className="flex items-center gap-2"
                            >
                              <motion.span
                                animate={{ rotate: [0, -360] }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="text-4xl"
                              >
                                {getDiceFace(defenderDice[0])}
                              </motion.span>
                              <span className="text-white font-bold">+</span>
                              <motion.span
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                                className="text-4xl"
                              >
                                {getDiceFace(defenderDice[1])}
                              </motion.span>
                              <span className="font-bold text-yellow-300 text-xl ml-1">
                                = {combatData.defenderRoll}
                              </span>
                            </motion.div>
                          </div>
                          <div className="flex justify-between">
                            <span>{tactical ? 'Army+Defense:' : 'Defense %:'}</span>
                            <span className="font-semibold">{tactical ? defStat : `${defender.defenseStrength}%`}</span>
                          </div>
                          {defenderBonus > 0 && (
                            <div className="flex justify-between">
                              <span>Holding ground:</span>
                              <span className="font-semibold text-green-300">+{defenderBonus}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Bribe Points:</span>
                            <span className="font-semibold text-yellow-300">+{combatData.defenderBribe || 0}</span>
                          </div>
                          <div className="border-t border-blue-600 pt-2 mt-2 flex justify-between">
                            <span className="font-bold">Total:</span>
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 }}
                              className="font-bold text-yellow-300 text-xl"
                            >
                              {defenderTotal}
                            </motion.span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>{tactical ? 'Army+Defense:' : 'Defense %:'}</span>
                            <span className="font-semibold">{tactical ? defStat : `${defender.defenseStrength}%`}</span>
                          </div>
                          {defenderBonus > 0 && (
                            <div className="flex justify-between">
                              <span>Holding ground:</span>
                              <span className="font-semibold text-green-300">+{defenderBonus}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>Gold Bribe:</span>
                            <span className="font-semibold text-yellow-300">+{combatData.defenderBribe || 0}</span>
                          </div>
                          <div className="text-center text-sm text-blue-200 mt-2">
                            Dice will be rolled after bribes
                          </div>
                        </>
                      )}
                    </div>
                    
                    {!diceRolled && !defender.isAI && (() => {
                      const currentBribes = combatData.defenderBribe || 0;
                      const canAfford = defender.gold >= 100;
                      const unlimited = isGauntlet;
                      return (
                        <div className="mt-4">
                          <div className="text-xs text-blue-200 mb-2 text-center">
                            {unlimited ? 'Add Bribes: 100G = +1 Point (no limit)' : 'Add Bribes: 100G = +1 Point (Max 3)'}
                          </div>
                          <div className="flex gap-2 justify-center flex-wrap">
                            {unlimited ? (
                              <button
                                onClick={() => canAfford && handleAddBribe(combatData.defenderId)}
                                disabled={!canAfford}
                                className={`px-3 py-1 rounded font-semibold ${canAfford ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                              >
                                +1 (100G) ×{currentBribes}
                              </button>
                            ) : (
                              [1, 2, 3].map((bribeNum) => {
                                const canAdd = bribeNum > currentBribes && canAfford;
                                return (
                                  <button
                                    key={bribeNum}
                                    onClick={() => canAdd && handleAddBribe(combatData.defenderId)}
                                    disabled={!canAdd}
                                    className={`px-3 py-1 rounded font-semibold ${
                                      canAdd ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : bribeNum <= currentBribes ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                                  >
                                    {bribeNum <= currentBribes ? '✓' : `+1 (100G)`}
                                  </button>
                                );
                              })
                            )}
                          </div>
                          {defender.gold < 100 && (unlimited || currentBribes < 3) && (
                            <div className="text-xs text-blue-300 mt-2 text-center">Need 100G to add bribe</div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                </div>

                {/* Action Button - Roll Dice or Resolve */}
                <div className="text-center">
                  {diceRolled ? (
                    <div className="text-red-100 font-semibold">⚔️ Clash in progress…</div>
                  ) : humanControls ? (
                    <button
                      onClick={handleRollDice}
                      className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all"
                    >
                      Roll Dice
                    </button>
                  ) : (
                    <div className="text-red-100 font-semibold">AI is preparing to roll…</div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Results with Winner Banner and Loot Animation */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-center relative"
                >
                  {/* Winner Banner */}
                  <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 10 }}
                    className="mb-6 relative overflow-hidden"
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(255, 215, 0, 0.5)',
                          '0 0 40px rgba(255, 215, 0, 0.8)',
                          '0 0 20px rgba(255, 215, 0, 0.5)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`inline-block px-8 py-4 rounded-lg ${
                        bannerMood === 'lose' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gradient-to-r from-yellow-600 to-orange-600'
                      }`}
                    >
                      <motion.h2
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-5xl font-bold text-white"
                      >
                        {bannerTitle}
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-2xl text-white mt-2 font-semibold"
                      >
                        {winnerPlayer?.name} Wins!
                      </motion.p>
                    </motion.div>
                  </motion.div>

                  {/* Loot Animation - skip for Gauntlet */}
                  {!isGauntlet && (difference > 0 || bribePot > 0) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mb-6 relative"
                      style={{ height: '100px' }}
                    >
                      {/* Gold coins moving from loser to winner */}
                      {Array.from({ length: Math.min(difference, 10) }).map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{
                            x: attackerWins ? '-50%' : '50%',
                            y: '0%',
                            opacity: 1,
                            scale: 0,
                          }}
                          animate={{
                            x: attackerWins ? '150%' : '-150%',
                            y: [0, -20, 0, -10, 0],
                            opacity: [1, 1, 1, 0.5, 0],
                            scale: [1, 1.2, 1, 0.8, 0],
                            rotate: [0, 180, 360],
                          }}
                          transition={{
                            duration: 1.5,
                            delay: 0.7 + i * 0.1,
                            ease: 'easeOut',
                          }}
                          className="absolute text-3xl"
                          style={{
                            left: attackerWins ? '0%' : '100%',
                            top: `${20 + (i % 3) * 30}%`,
                          }}
                        >
                          💰
                        </motion.div>
                      ))}
                      {/* Gold amount text */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="bg-green-600/80 rounded-lg px-6 py-3 border-2 border-green-400">
                          <span className="text-3xl font-bold text-white">
                            +${goldPayment + bribePot}
                          </span>
                          {bribePot > 0 && (
                            <div className="text-xs text-yellow-200 mt-1 text-center">
                              (${goldPayment} payment + ${bribePot} pot)
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2 }}
                    className="bg-white/10 rounded-lg p-6 mb-4"
                  >
                    <p className="text-lg text-white mb-2">
                      Difference: <span className="font-bold text-yellow-300">{difference}</span>
                    </p>
                    {!isGauntlet && (
                      <>
                        <p className="text-lg text-white mb-2">
                          Gold Payment: <span className="font-bold text-green-300">${goldPayment}</span>
                        </p>
                        {bribePot > 0 && (
                          <p className="text-lg text-white mb-2">
                            Bribe Pot Won: <span className="font-bold text-yellow-300">${bribePot}</span>
                          </p>
                        )}
                      </>
                    )}
                    {isGauntlet && (
                      <p className="text-lg text-amber-200 mt-2">
                        {attackerWins ? 'Challenger wins! Click Continue.' : 'Target holds! Click Continue for next challenger.'}
                      </p>
                    )}
                    {!isGauntlet && decisiveVictory && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.2 }}
                        className="text-red-300 font-semibold mt-3"
                      >
                        {combatData.decisiveSteal
                          ? `⚠️ Decisive Victory! ${attackerWins ? attacker.name : defender.name} takes 1 ${combatData.decisiveSteal.stat === 'army' ? 'Army' : 'Defense'} from ${attackerWins ? defender.name : attacker.name}.`
                          : '⚠️ Decisive Victory! (The loser had no stats to take.)'}
                      </motion.p>
                    )}
                  </motion.div>

                  {humanControls ? (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.5 }}
                      onClick={handleClose}
                      className="px-8 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all"
                    >
                      Continue
                    </motion.button>
                  ) : (
                    <p className="text-white/80 font-semibold">AI is continuing…</p>
                  )}
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}