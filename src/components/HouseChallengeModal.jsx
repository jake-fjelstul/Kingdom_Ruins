import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

const FACES = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };

/** Shows the dice and payout of a House challenge. Humans dismiss it; the AI dismisses its own. */
export default function HouseChallengeModal() {
  const { houseChallenge, players, clearHouseChallenge, houseVault } = useGame();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!houseChallenge) { setRevealed(false); return undefined; }
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 900);
    return () => clearTimeout(t);
  }, [houseChallenge]);

  if (!houseChallenge) return null;
  const player = players.find((p) => p.id === houseChallenge.playerId);
  if (!player) return null;
  const { playerDice, houseDice, won, goldChange, armyChange, heist, stake } = houseChallenge;
  const pSum = playerDice[0] + playerDice[1];
  const hSum = houseDice[0] + houseDice[1];
  const tie = pSum === hSum;

  const die = (v, i) => (
    <motion.span
      key={i}
      className="text-5xl"
      animate={revealed ? { rotate: 0 } : { rotate: [0, 360] }}
      transition={revealed ? { duration: 0.2 } : { duration: 0.4, repeat: Infinity, ease: 'linear' }}
    >
      {revealed ? FACES[v] : '⚀'}
    </motion.span>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="house"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-950 to-stone-900 rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 border-2 border-amber-500 text-center"
          role="dialog"
          aria-labelledby="house-title"
        >
          <h2 id="house-title" className="text-2xl font-bold text-amber-200 mb-1">
            {heist ? '🗝️ Vault Heist' : '🎲 Challenge the House'}
          </h2>
          <p className="text-amber-100/80 text-sm mb-5">
            {player.icon} {player.name} {heist ? 'goes all-in for the whole vault' : `bets ${stake}G`} · the House wins ties
          </p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-amber-100 text-sm mb-1">{player.name}</div>
              <div className="flex justify-center gap-1">{playerDice.map(die)}</div>
              {revealed && <div className="text-2xl font-bold text-white mt-1">{pSum}</div>}
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-amber-100 text-sm mb-1">🏛️ The House</div>
              <div className="flex justify-center gap-1">{houseDice.map((v, i) => die(v, i + 2))}</div>
              {revealed && <div className="text-2xl font-bold text-white mt-1">{hSum}</div>}
            </div>
          </div>
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
              <div className={`text-3xl font-black ${won ? 'text-green-300' : 'text-red-300'}`}>
                {won ? (heist ? 'The vault is yours!' : 'You beat the House!') : tie ? 'Tie — the House wins' : 'The House wins'}
              </div>
              <div className={`text-xl font-bold mt-2 ${goldChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {goldChange >= 0 ? '+' : '−'}{Math.abs(goldChange)} Gold{armyChange < 0 ? ` and ${armyChange} Army` : ''}
              </div>
              <div className="text-amber-200/80 text-sm mt-2">House Vault now holds {houseVault}G</div>
            </motion.div>
          )}
          {player.isAI ? (
            <p className="text-white/80 font-semibold">AI is continuing…</p>
          ) : (
            <button
              onClick={clearHouseChallenge}
              disabled={!revealed}
              className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white shadow-lg"
            >
              Continue
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
