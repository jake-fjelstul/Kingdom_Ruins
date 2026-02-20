import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

export default function Timer() {
  const { currentPlayerIndex, players } = useGame();
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    // Reset timer when player changes
    setSeconds(0);
    setIsRunning(true);
  }, [currentPlayerIndex]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4 px-2">
      <div className="bg-slate-800/90 backdrop-blur rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-3 shadow-xl border border-slate-700 w-full max-w-md">
        <div className="flex flex-col sm:flex-row items-center justify-evenly gap-2 sm:gap-4">
          <span className="text-white text-xs sm:text-sm font-semibold">Turn Timer:</span>
          <span className="text-white text-xl sm:text-2xl font-mono font-bold">{formatTime(seconds)}</span>
          {currentPlayer && (
            <span className="text-white text-sm sm:text-lg">
              {currentPlayer.icon} {currentPlayer.name}'s Turn
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
