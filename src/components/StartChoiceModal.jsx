import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

const BRIBE_AMOUNT = 100;

export default function StartChoiceModal() {
  const { landedOnStartChoice, players, payStartBribe, chooseStartFight } = useGame();

  const mover = landedOnStartChoice ? players.find((p) => p.id === landedOnStartChoice.moverId) : null;
  const owner = landedOnStartChoice ? players.find((p) => p.id === landedOnStartChoice.ownerId) : null;
  const canAffordBribe = mover ? mover.gold >= BRIBE_AMOUNT : false;

  const handleBribe = () => {
    if (!canAffordBribe) return;
    payStartBribe(BRIBE_AMOUNT);
  };

  const handleFight = () => {
    chooseStartFight();
  };

  return (
    <AnimatePresence>
      {landedOnStartChoice && mover && owner && (
        <motion.div
          key="start-choice"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-amber-900 to-yellow-900 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-amber-600"
            onClick={(e) => e.stopPropagation()}
          >
          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {owner.icon} {owner.name}&apos;s START
          </h2>
          <p className="text-amber-100 text-center mb-6">
            You&apos;ve landed on {owner.name}&apos;s start space. Pay a bribe or fight?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleBribe}
              disabled={!canAffordBribe}
              className={`w-full py-3 px-4 rounded-lg font-bold text-lg transition-all ${
                canAffordBribe
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Pay bribe ({BRIBE_AMOUNT}g)
              {!canAffordBribe && (
                <span className="block text-sm font-normal mt-1">
                  You need {BRIBE_AMOUNT - mover.gold}g more
                </span>
              )}
            </button>
            <button
              onClick={handleFight}
              className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all"
            >
              Fight {owner.name}
            </button>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
