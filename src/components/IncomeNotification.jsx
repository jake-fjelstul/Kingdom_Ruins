import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

export default function IncomeNotification() {
  const { incomeNotification, players, clearIncomeNotification, currentPlayerIndex,
        landedOnStart, landedOnStartChoice, combatActive } = useGame();
  const [shouldShow, setShouldShow] = useState(false);
  
  const currentPlayer = players[currentPlayerIndex];
  const hasBlockingModal =
    currentPlayer?.lastDrawnCard != null ||
    landedOnStart !== null ||
    landedOnStartChoice !== null ||
    combatActive;

  useEffect(() => {
    if (incomeNotification && !hasBlockingModal) {
      const timer = setTimeout(() => setShouldShow(true), 500);
      return () => clearTimeout(timer);
    } else if (hasBlockingModal) {
      setShouldShow(false);
    }
  }, [incomeNotification, hasBlockingModal]);

  if (!incomeNotification || !shouldShow) return null;

  const player = players.find(p => p.id === incomeNotification.playerId);
  if (!player) return null;

  const { amount = 0, outerCount = 0, army = 0, defense = 0, debt = 0 } = incomeNotification;
  const statGains = [army > 0 && `+${army} Army`, defense > 0 && `+${defense} Defense`].filter(Boolean).join(', ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={clearIncomeNotification}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          className="bg-green-600 rounded-lg p-6 shadow-2xl max-w-md border-4 border-green-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-2xl font-bold text-white mb-4 text-center">💰 Income Collected!</h3>
          <div className="bg-white rounded p-4 mb-4">
            <p className="text-gray-800 text-lg text-center mb-2">
              {player.name} passed START and collected income!
            </p>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">+${amount}</div>
              {statGains && <div className="text-xl font-bold text-emerald-700 mt-1">{statGains}</div>}
              <div className="text-sm text-gray-600 mt-2">
                Base $100 + $100 × {outerCount} outer {outerCount === 1 ? 'territory' : 'territories'}
                {statGains && <> · inner territories: {statGains}</>}
              </div>
              {debt > 0 && (
                <div className="text-sm text-red-700 font-semibold mt-2">
                  {Math.min(debt, amount)}G of this repays your bank debt{debt > amount ? ` (${debt - amount}G still owed)` : ' — debt cleared!'}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={clearIncomeNotification}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-lg"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
