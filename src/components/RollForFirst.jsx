import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import diceBackground from '../assets/dice_background.webp';

const DICE_FACES = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

const ROLL_DURATION_MS = 1000;

export default function RollForFirst() {
  const {
    players,
    firstPlayerRolls,
    rollForFirstPlayer,
    clearFirstPlayerRolls,
    setFirstPlayerAndStart,
  } = useGame();
  const [isRolling, setIsRolling] = useState(false);

  const rolledCount = firstPlayerRolls?.length ?? 0;
  const currentRoller = players[rolledCount] ?? null;
  const allRolled = rolledCount === players.length && players.length > 0;

  const handleRoll = useCallback(() => {
    if (isRolling || !currentRoller) return;
    setIsRolling(true);
    setTimeout(() => {
      rollForFirstPlayer(currentRoller.id);
      setIsRolling(false);
    }, ROLL_DURATION_MS);
  }, [isRolling, currentRoller, rollForFirstPlayer]);

  const handleReRoll = useCallback(() => {
    clearFirstPlayerRolls();
  }, [clearFirstPlayerRolls]);

  const handleBegin = () => {
    setFirstPlayerAndStart();
  };

  const minSum = firstPlayerRolls?.length
    ? Math.min(...firstPlayerRolls.map((r) => r.sum))
    : null;
  const lowestRolls =
    minSum != null && firstPlayerRolls?.length
      ? firstPlayerRolls.filter((r) => r.sum === minSum)
      : [];
  const isTie = lowestRolls.length > 1;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${diceBackground})`,
        minHeight: '100vh',
      }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 rounded-3xl shadow-2xl p-6 md:p-8 max-w-lg w-full border border-slate-500/40 bg-slate-900/60 backdrop-blur-md"
      >
        <h2 className="text-xl md:text-2xl font-bold text-slate-50 text-center mb-2">
          Who Goes First?
        </h2>
        <p className="text-slate-100 text-center mb-6 text-sm md:text-base">
          Each player rolls individually. The{' '}
          <strong className="text-yellow-400">lowest</strong> total goes first.
        </p>

        <AnimatePresence mode="wait">
          {allRolled ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {isTie && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-400/50"
                >
                  <p className="text-amber-400 font-semibold text-sm">
                    Tie! Re-roll to break it.
                  </p>
                </motion.div>
              )}
              <div className="space-y-3">
                {firstPlayerRolls.map(({ playerId, roll, sum }, i) => {
                  const player = players.find((p) => p.id === playerId);
                  const isLowest = !isTie && sum === minSum;
                  return (
                    <motion.div
                      key={playerId}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: i * 0.08,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                      className={`flex items-center justify-between gap-4 p-3 rounded-xl border-2 ${
                        isLowest
                          ? 'border-yellow-400 bg-amber-500/20'
                          : 'border-slate-600 bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{player?.icon ?? '?'}</span>
                        <span className="font-semibold text-white">
                          {player?.name ?? 'Player'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl" title={`${roll[0]} + ${roll[1]}`}>
                          {DICE_FACES[roll[0]] ?? '⚀'}
                          {DICE_FACES[roll[1]] ?? '⚀'}
                        </span>
                        <span className="text-slate-400">=</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isLowest ? 'text-yellow-400' : 'text-white'
                          }`}
                        >
                          {sum}
                        </span>
                      </div>
                      {isLowest && (
                        <span className="text-xs font-bold text-yellow-400 uppercase">
                          First
                        </span>
                      )}
                      {isTie && sum === minSum && (
                        <span className="text-xs font-bold text-amber-400 uppercase">
                          Tied
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <motion.button
                  onClick={handleReRoll}
                  className={`px-4 py-2 rounded-lg font-semibold border ${
                    isTie
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isTie ? 'Re-roll (required)' : 'Re-roll'}
                </motion.button>
                <motion.button
                  onClick={handleBegin}
                  disabled={isTie}
                  className={`px-6 py-3 rounded-xl font-bold shadow-lg ${
                    isTie
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  }`}
                  whileHover={isTie ? undefined : { scale: 1.05 }}
                  whileTap={isTie ? undefined : { scale: 0.95 }}
                >
                  Begin game
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="rolling-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {isRolling && currentRoller && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <p className="text-slate-400 text-sm">
                    <span className="text-xl mr-2">{currentRoller.icon}</span>
                    <strong className="text-white">{currentRoller.name}</strong> is rolling…
                  </p>
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="text-6xl"
                    >
                      ⚀
                    </motion.div>
                    <span className="text-4xl text-white font-bold">+</span>
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="text-6xl"
                    >
                      ⚀
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {!isRolling && currentRoller && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <p className="text-slate-300 text-center text-sm">
                    <span className="text-2xl mr-2">{currentRoller.icon}</span>
                    <strong className="text-white">{currentRoller.name}</strong>, roll!
                  </p>
                  <motion.button
                    onClick={handleRoll}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Roll
                  </motion.button>
                </motion.div>
              )}

              {rolledCount > 0 && (
                <div className="border-t border-slate-600 pt-4 mt-2">
                  <p className="text-slate-500 text-xs font-semibold mb-2 uppercase tracking-wide">
                    Rolled so far
                  </p>
                  <div className="space-y-2">
                    {firstPlayerRolls.map(({ playerId, roll, sum }) => {
                      const player = players.find((p) => p.id === playerId);
                      return (
                        <div
                          key={playerId}
                          className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-slate-700/50 border border-slate-600"
                        >
                          <span className="text-lg">{player?.icon ?? '?'}</span>
                          <span className="text-sm text-white font-medium">
                            {player?.name ?? 'Player'}
                          </span>
                          <span className="text-sm text-slate-400">
                            {DICE_FACES[roll[0]] ?? '⚀'}
                            {DICE_FACES[roll[1]] ?? '⚀'} ={' '}
                            <span className="text-white font-bold">{sum}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
