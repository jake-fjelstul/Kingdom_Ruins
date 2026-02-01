import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame, FACTIONS } from '../context/GameContext';

export default function GameSetup({ onStart }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [testingMode, setTestingMode] = useState(false);
  const [playerSelections, setPlayerSelections] = useState({
    0: 'KING',
    1: 'DRAGON',
    2: 'KNIGHT',
    3: 'WIZARD',
  });
  const { initializeGame } = useGame();

  // Reset selections when player count changes
  useEffect(() => {
    const defaultSelections = {
      0: 'KING',
      1: 'DRAGON',
      2: 'KNIGHT',
      3: 'WIZARD',
    };
    setPlayerSelections(defaultSelections);
    setSelectedPlayer(0); // Reset to player 1 when count changes
  }, [playerCount]);

  const handlePlayerFactionChange = (playerIndex, factionKey) => {
    setPlayerSelections(prev => ({
      ...prev,
      [playerIndex]: factionKey,
    }));
  };

  const handleFactionClick = (factionKey) => {
    // Assign the clicked faction to the currently selected player
    handlePlayerFactionChange(selectedPlayer, factionKey);
  };

  const handleStart = () => {
    const selectedFactions = Array.from({ length: playerCount }, (_, i) => playerSelections[i] || Object.keys(FACTIONS)[i]);
    initializeGame(playerCount, selectedFactions, { testingMode });
    onStart({ testingMode });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-blue-900">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full"
      >
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">Kingdom Ruins</h1>
        <p className="text-center text-gray-600 mb-6">A multiplayer turn-based strategy game</p>

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Number of Players (2-4)
          </label>
          <div className="flex gap-2">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  playerCount === count
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {count} Players
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-gray-700 font-semibold mb-3 text-center">Select Factions:</h3>
          {/* Single panel showing all factions */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(FACTIONS).map(([key, faction]) => {
              // Find which player has selected this faction
              const selectedByPlayer = Object.entries(playerSelections).find(
                ([idx, factionKey]) => factionKey === key && parseInt(idx) < playerCount
              );
              const playerIndex = selectedByPlayer ? parseInt(selectedByPlayer[0]) : null;
              const isSelected = playerIndex !== null;
              
              return (
                <button
                  key={key}
                  onClick={() => handleFactionClick(key)}
                  disabled={selectedPlayer >= playerCount}
                  className={`flex flex-col items-center gap-2 p-4 rounded border-2 transition-all ${
                    isSelected && playerIndex === selectedPlayer
                      ? 'border-blue-600 bg-blue-100 shadow-md ring-2 ring-blue-400'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : selectedPlayer < playerCount
                      ? 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-3xl">{faction.icon}</span>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800 text-sm">{faction.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      G:{faction.startGold} | A:{faction.startArmy}% | D:{faction.startDefense}%
                    </div>
                  </div>
                  {isSelected && playerIndex !== null && (
                    <div className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded mt-1">
                      Player {playerIndex + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Player assignment buttons at the bottom */}
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-3 text-center">Select Player to Assign:</div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: playerCount }, (_, i) => {
                const selectedFactionKey = playerSelections[i];
                const faction = FACTIONS[selectedFactionKey];
                const isActivePlayer = selectedPlayer === i;
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPlayer(i)}
                    className={`flex items-center justify-center gap-2 p-3 rounded border-2 transition-all ${
                      isActivePlayer
                        ? 'border-blue-600 bg-blue-100 shadow-md'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-gray-700">Player {i + 1}</span>
                    {faction && (
                      <>
                        <span className="text-xl">{faction.icon}</span>
                        <span className="text-xs text-gray-600">{faction.name}</span>
                      </>
                    )}
                    {isActivePlayer && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-center text-gray-600">
              {selectedPlayer < playerCount && (
                <span>Click a faction above to assign it to Player {selectedPlayer + 1}</span>
              )}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mb-4 p-3 rounded-lg border border-gray-300 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={testingMode}
            onChange={(e) => setTestingMode(e.target.checked)}
            className="w-4 h-4 rounded border-gray-400 text-purple-600 focus:ring-purple-500"
          />
          <span className="text-sm font-medium text-gray-700">Testing mode</span>
          <span className="text-xs text-gray-500">(skip lore &amp; roll for first; show test controls in game)</span>
        </label>

        <motion.button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start Game
        </motion.button>
      </motion.div>
    </div>
  );
}
