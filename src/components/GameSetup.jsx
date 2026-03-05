import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, FACTIONS } from '../context/GameContext';
import { useSettings } from '../context/SettingsContext';
import startBackground from '../assets/start_background.webp';

export default function GameSetup({ onStart, onViewAnalytics }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [testingMode, setTestingMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerSelections, setPlayerSelections] = useState({
    0: 'KING',
    1: 'DRAGON',
    2: 'KNIGHT',
    3: 'WIZARD',
  });
  const [playerIsAI, setPlayerIsAI] = useState({ 0: false, 1: false, 2: false, 3: false });
  const { initializeGame } = useGame();
  const { aiSpeedMultiplier, setAiSpeedMultiplier, aiSpeedMin, aiSpeedMax } = useSettings();

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
    const aiPlayers = Array.from({ length: playerCount }, (_, i) => !!playerIsAI[i]);
    initializeGame(playerCount, selectedFactions, { testingMode, aiPlayers });
    onStart({ testingMode });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-2 py-4 sm:px-4 sm:py-6 md:py-8 relative"
      style={{
        backgroundImage: `url(${startBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="relative z-10 bg-white/60 backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-3 md:p-4 w-full max-w-3xl"
      >
        <div className="flex items-start justify-center">
          <h1 className="text-base sm:text-xl md:text-2xl lg:text-2xl font-bold text-center mb-1 sm:mb-2 text-gray-800 flex-1">Kingdom Ruins</h1>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-200/80 hover:text-gray-800 transition-colors -mt-0.5"
            title="Settings"
            aria-label="Settings"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2 md:mb-3">A multiplayer turn-based strategy game</p>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-4">Settings</h2>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI speed
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12">Slower</span>
                    <input
                      type="range"
                      min={aiSpeedMin}
                      max={aiSpeedMax}
                      step={0.25}
                      value={aiSpeedMultiplier}
                      onChange={(e) => setAiSpeedMultiplier(parseFloat(e.target.value, 10))}
                      className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 accent-purple-600"
                    />
                    <span className="text-xs text-gray-500 w-12">Faster</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 text-center">
                    {aiSpeedMultiplier === 1 ? 'Normal' : aiSpeedMultiplier < 1 ? `${Math.round((1 - aiSpeedMultiplier) * 100)}% slower` : `${Math.round((aiSpeedMultiplier - 1) * 100)}% faster`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 px-4 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-2 sm:mb-3 md:mb-4">
          <label className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base">
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

        <div className="mb-2 sm:mb-3 md:mb-4">
          <h3 className="text-gray-700 font-semibold mb-2 sm:mb-3 text-center text-sm sm:text-base">Select Factions:</h3>
          {/* Single panel showing all factions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
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
                  className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 md:p-4 rounded border-2 transition-all ${
                    isSelected && playerIndex === selectedPlayer
                      ? 'border-blue-600 bg-blue-100 shadow-md ring-2 ring-blue-400'
                      : isSelected
                      ? 'border-blue-400 bg-blue-50 shadow-sm'
                      : selectedPlayer < playerCount
                      ? 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                      : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl md:text-3xl">{faction.icon}</span>
                  <div className="text-center">
                    <div className="font-semibold text-gray-800 text-xs sm:text-sm">{faction.name}</div>
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
          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-gray-50 rounded border border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-2 sm:mb-3 text-center">Select Player to Assign:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
              {Array.from({ length: playerCount }, (_, i) => {
                const selectedFactionKey = playerSelections[i];
                const faction = FACTIONS[selectedFactionKey];
                const isActivePlayer = selectedPlayer === i;
                
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedPlayer(i)}
                      className={`flex items-center justify-center gap-1 sm:gap-2 p-2 sm:p-3 rounded border-2 transition-all ${
                        isActivePlayer
                          ? 'border-blue-600 bg-blue-100 shadow-md'
                          : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">Player {i + 1}</span>
                      {faction && (
                        <>
                          <span className="text-lg sm:text-xl">{faction.icon}</span>
                          <span className="text-xs text-gray-600">{faction.name}</span>
                        </>
                      )}
                      {isActivePlayer && (
                        <span className="text-blue-600 font-bold">✓</span>
                      )}
                    </button>
                    <label className="flex items-center justify-center gap-1.5 cursor-pointer text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={!!playerIsAI[i]}
                        onChange={(e) => setPlayerIsAI(prev => ({ ...prev, [i]: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-gray-400 text-purple-600 focus:ring-purple-500"
                      />
                      <span>AI</span>
                    </label>
                  </div>
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

        <label className="flex items-center gap-2 cursor-pointer mb-2 sm:mb-3 p-2 sm:p-3 rounded-lg border border-gray-300 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={testingMode}
            onChange={(e) => setTestingMode(e.target.checked)}
            className="w-4 h-4 rounded border-gray-400 text-purple-600 focus:ring-purple-500 flex-shrink-0"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-700">Testing mode</span>
          <span className="text-xs text-gray-500 hidden sm:inline">(skip lore &amp; roll for first; show test controls in game)</span>
        </label>

        {testingMode && typeof onViewAnalytics === 'function' && (
          <button
            type="button"
            onClick={onViewAnalytics}
            className="w-full mb-2 sm:mb-3 py-2 sm:py-2 px-3 sm:px-4 rounded-lg border-2 border-slate-400 bg-slate-100 text-slate-700 text-sm sm:text-base font-medium hover:bg-slate-200 transition-colors"
          >
            View analytics
          </button>
        )}

        <motion.button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm sm:text-base font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg hover:from-purple-700 hover:to-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start Game
        </motion.button>
      </motion.div>
    </div>
  );
}
