import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

export default function IncomeNotification() {
  const { incomeNotification, players, clearIncomeNotification, currentPlayerIndex } = useGame();
  const [shouldShow, setShouldShow] = useState(false);
  
  // Check if there's a card modal showing - if so, wait for it to close
  const currentPlayer = players[currentPlayerIndex];
  const hasCardModal = currentPlayer?.lastDrawnCard !== null;

  useEffect(() => {
    if (incomeNotification && !hasCardModal) {
      // Show notification after card modal closes
      const timer = setTimeout(() => {
        setShouldShow(true);
      }, hasCardModal ? 100 : 500); // Small delay if card was just closed
      return () => clearTimeout(timer);
    } else if (hasCardModal) {
      setShouldShow(false); // Hide while card modal is showing
    }
  }, [incomeNotification, hasCardModal]);

  if (!incomeNotification || !shouldShow) return null;

  const player = players.find(p => p.id === incomeNotification.playerId);
  if (!player) return null;

  const statLabel = incomeNotification.statType === 'army' ? 'Army' : 'Defense';
  const statValue = incomeNotification.statType === 'army' ? player.armyStrength : player.defenseStrength;

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
              <div className="text-3xl font-bold text-green-600">+${incomeNotification.amount}</div>
              <div className="text-sm text-gray-600 mt-2">
                Base: $100 + ({statLabel} {statValue}% × {player.ownedTerritories.length} territories)
              </div>
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
