import React from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { exportSessionAsJSON } from '../analytics';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 12 }}
        className="text-center max-w-2xl w-full"
      >
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold text-amber-200 mb-6 font-serif tracking-wide"
        >
          Game Over
        </motion.h1>

        {victor ? (
          <>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-lg md:text-xl text-slate-300 mb-4"
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
                className="inline-block text-8xl md:text-9xl drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]"
              >
                {victor.icon}
              </motion.span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 mb-2 font-serif"
            >
              {victor.name} Wins!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-lg md:text-xl text-amber-200/90"
            >
              has completed the Gauntlet of the Fallen
            </motion.p>
          </>
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-2xl md:text-3xl text-amber-200"
          >
            Primer Castle has been reclaimed!
          </motion.p>
        )}
      </motion.div>

      <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRestart}
          className="px-10 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-900/40 border-2 border-amber-400/50 transition-colors"
        >
          Restart Game
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportAnalytics}
          className="px-6 py-3 rounded-lg font-medium text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500 transition-colors"
        >
          Export analytics (JSON)
        </motion.button>
      </div>
    </div>
  );
}
