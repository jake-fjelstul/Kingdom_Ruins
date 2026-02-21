import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { exportSessionAsJSON } from '../analytics';
import winBackground from '../assets/screen_backgrounds/win_background.png';

export default function VictoryScreen({ victor, onRestart }) {
  const { getAnalyticsRecorder } = useGame();

  const handleExportAnalytics = () => {
    const recorder = getAnalyticsRecorder?.();
    const json = exportSessionAsJSON(recorder);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kingdom-ruins-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Full-screen background image */}
      <div
        className="absolute inset-0 w-full h-full min-h-screen min-h-[100dvh]"
        style={{
          backgroundImage: `url(${winBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen min-h-[100dvh] w-full p-4">
      {/* Parchment-style box (matches LoreScreen) with content + buttons inside */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 12 }}
        className="relative text-center max-w-md w-full rounded-lg shadow-2xl p-4 sm:p-5 md:p-6 bg-[#f4e8d0]/75"
        style={{
          border: '3px solid #8b4513',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(139, 69, 19, 0.1)',
        }}
      >
        {/* Decorative inner border (like LoreScreen) */}
        <div className="absolute inset-0 border-4 border-double border-amber-900/30 rounded-lg pointer-events-none" />

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-amber-900 mb-6 font-serif tracking-wide"
          >
            Game Over
          </motion.h1>

          {victor ? (
            <>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-lg md:text-xl text-amber-900/90 mb-4"
              >
                The Kingdom has been restored!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.7, type: 'spring', stiffness: 100, damping: 14 }}
                className="mb-2"
              >
                <motion.span
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
                  className="inline-block text-8xl md:text-9xl drop-shadow-[0_2px_8px_rgba(120,80,20,0.3)]"
                >
                  {victor.icon}
                </motion.span>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 mb-2 font-serif"
              >
                {victor.name} Wins!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="text-lg md:text-xl text-amber-900/90"
              >
                has completed the Gauntlet of the Fallen
              </motion.p>
            </>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-2xl md:text-3xl text-amber-900"
            >
              Primer Castle has been reclaimed!
            </motion.p>
          )}

          {/* Buttons inside parchment - styled like LoreScreen */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6 pt-4 border-t-2 border-amber-900/20">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRestart}
              className="px-10 py-3 font-serif font-bold text-white rounded-lg shadow-lg transition-colors"
              style={{
                background: 'linear-gradient(to bottom, #8b4513, #654321)',
                fontSize: 'clamp(0.875rem, 1.75vw, 1.125rem)',
                border: '2px solid #3d2817',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              Restart Game
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportAnalytics}
              className="px-5 py-3 font-serif font-medium text-slate-200 rounded-lg shadow transition-colors"
              style={{
                background: 'linear-gradient(to bottom, #6b7280, #4b5563)',
                fontSize: 'clamp(0.875rem, 1.75vw, 1.125rem)',
                border: '2px solid #374151',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              Export analytics (JSON)
            </motion.button>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
