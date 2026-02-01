import React from 'react';
import { motion } from 'framer-motion';

export default function LoreScreen({ onContinue }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative max-w-3xl w-full my-8"
      >
        {/* Parchment Paper Background */}
        <div
          className="relative rounded-lg shadow-2xl p-6 md:p-8 lg:p-12"
          style={{
            background: 'linear-gradient(to bottom, #f4e8d0, #e8d4b0)',
            backgroundImage: `
              url("https://www.transparenttextures.com/patterns/parchment.png"),
              radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(160, 82, 45, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(184, 134, 11, 0.05) 0%, transparent 70%)
            `,
            border: '3px solid #8b4513',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(139, 69, 19, 0.1)',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Decorative border pattern */}
          <div className="absolute inset-0 border-4 border-double border-amber-900/30 rounded-lg pointer-events-none" />
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {/* Title */}
            <h1 
              className="text-center mb-6 font-serif tracking-wider"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 3rem)',
                color: '#7a6b5a',
                fontWeight: '500',
                textShadow: 'none',
                letterSpacing: '0.1em',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
              }}
            >
              KINGDOM RUINS
            </h1>

            {/* Lore Text */}
            <div
              className="text-justify leading-relaxed font-serif"
              style={{
                fontSize: 'clamp(0.875rem, 2vw, 1.2rem)',
                color: '#6b5d4a',
                lineHeight: '1.7',
                fontWeight: '400',
                textShadow: 'none',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
              }}
            >
              <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                The Kingdom of Primer has fallen due to war. Four territories have risen from the destruction and must fight to regain the Kingdom.
              </p>

              <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                The territory of the <strong className="text-green-700">King</strong> who still has a large reserve of gold. The territory of the <strong className="text-red-700">Dragon</strong> who has a boost of army strength. The territory of the <strong className="text-blue-700">Knight</strong> who has a boost in defense strength. Finally, the territory of the <strong className="text-purple-700">Wizard</strong> who has a boost in army strength.
              </p>

              <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                Your quest is to buy the surrounding territory, strengthen your domain's defense, increase your army, acquire resources, and eventually take back Primer Castle.
              </p>

              <p className="mb-4 md:mb-6 indent-6 md:indent-8">
                Beware, along the way you will face challenges. Neighbors will attack, resources may be lost, and your lands may be taken. It is now up to you to take back this Kingdom of Ruins and restore Primer Castle to its former glory.
              </p>
            </div>
          </div>

          {/* Continue Button - Sticky at bottom */}
          <div className="flex justify-center mt-4 pt-4 border-t-2 border-amber-900/20">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onContinue}
              className="px-8 py-3 font-serif font-bold text-white rounded-lg shadow-lg transition-colors"
              style={{
                background: 'linear-gradient(to bottom, #8b4513, #654321)',
                fontSize: 'clamp(0.875rem, 1.75vw, 1.125rem)',
                border: '2px solid #3d2817',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              Begin Your Quest
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
