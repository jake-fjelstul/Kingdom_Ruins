import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

export default function GauntletSacrificeModal() {
  const { gauntlet, players, territories, boardSpaces, gauntletSacrifice, gauntletDeclineSacrifice } = useGame();

  if (!gauntlet || gauntlet.phase !== 'sacrifice_prompt') return null;
  const target = players.find((p) => p.id === gauntlet.targetId);
  if (!target) return null;
  const outer = (target.ownedTerritories || []).filter((t) => !t.startsWith('inner-'));
  if (outer.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-amber-900 to-orange-900 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-amber-600"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            🛡️ Sacrifice to Stay in the Blue Ruin Zone
          </h2>
          <p className="text-amber-100 text-center mb-6">
            You lost a clash. Sacrifice an outer territory to remain and re-attempt the Gauntlet, or decline to return to the board.
          </p>
          <div className="flex flex-col gap-2 mb-6">
            {outer.map((tid) => {
              const t = territories[tid];
              const space = t?.spaceIndex != null ? boardSpaces[t.spaceIndex] : null;
              const label = space ? `Space ${t.spaceIndex}` : tid;
              return (
                <button
                  key={tid}
                  onClick={() => gauntletSacrifice(tid)}
                  className="w-full py-3 px-4 rounded-lg font-semibold bg-amber-700 hover:bg-amber-600 text-white border border-amber-500 transition-all"
                >
                  Sacrifice: {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={gauntletDeclineSacrifice}
            className="w-full py-3 px-4 rounded-lg font-bold bg-slate-600 hover:bg-slate-500 text-white transition-all"
          >
            Decline — Return to board
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
