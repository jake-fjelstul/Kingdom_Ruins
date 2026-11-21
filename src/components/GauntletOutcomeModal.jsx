import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

/** Explains a failed Gauntlet to everyone: who broke it, what the target lost, and where they went. */
export default function GauntletOutcomeModal() {
  const { gauntletOutcome, players, clearGauntletOutcome } = useGame();
  if (!gauntletOutcome) return null;
  const target = players.find((p) => p.id === gauntletOutcome.targetId);
  const beatenBy = gauntletOutcome.beatenBy ? players.find((p) => p.id === gauntletOutcome.beatenBy) : null;
  if (!target) return null;
  const isYou = !target.isAI;
  const lostLabel = gauntletOutcome.lostTerritory
    ? (/-2$/.test(gauntletOutcome.lostTerritory) ? 'their second inner territory' : 'their first inner territory')
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="gauntlet-outcome"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60]"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-indigo-400 text-center"
          role="dialog"
          aria-labelledby="gauntlet-outcome-title"
        >
          <div className="text-5xl mb-2">{target.icon}</div>
          <h2 id="gauntlet-outcome-title" className="text-2xl font-bold text-white mb-3">
            {isYou ? 'Your Gauntlet has failed' : `${target.name}'s Gauntlet has failed`}
          </h2>
          <ul className="text-indigo-100 text-left space-y-2 mb-6">
            {beatenBy && <li>⚔️ {beatenBy.icon} {beatenBy.name} won their clash.</li>}
            {lostLabel && <li>🔒 {target.name} lost {lostLabel}; it must be bought again.</li>}
            <li>🏚️ The castle falls back to ruins and {target.name} returns to their START.</li>
            <li>💰 The 500 Gold rebuild fee stays in the House Vault.</li>
          </ul>
          <button
            onClick={clearGauntletOutcome}
            className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
