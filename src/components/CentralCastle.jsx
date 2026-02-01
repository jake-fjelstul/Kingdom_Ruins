import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import ruinedCastleImg from '../assets/ruined_castle.png';
import restoredCastleImg from '../assets/restored_castle.png';

export default function CentralCastle({ castleState }) {
  const prevState = useRef(castleState);
  const [justRepaired, setJustRepaired] = useState(false);
  const [justRuined, setJustRuined] = useState(false);

  useEffect(() => {
    if (prevState.current === 'ruins' && castleState === 'repaired') {
      prevState.current = 'repaired';
      setJustRuined(false);
      setJustRepaired(true);
      const t = setTimeout(() => setJustRepaired(false), 1600);
      return () => clearTimeout(t);
    }
    if (prevState.current === 'repaired' && castleState === 'ruins') {
      prevState.current = 'ruins';
      setJustRepaired(false);
      setJustRuined(true);
      const t = setTimeout(() => setJustRuined(false), 1200);
      return () => clearTimeout(t);
    }
  }, [castleState]);

  const isRepaired = castleState === 'repaired';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Image: exact center of blue box */}
      <div className="absolute inset-0 flex items-center justify-center px-[5%]">
        <AnimatePresence mode="wait" initial={false}>
          {!isRepaired ? (
            <motion.div
              key="ruins"
              initial={justRuined ? { opacity: 0, scale: 0.92 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'brightness(0.6)' }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ maxHeight: 'clamp(62px, 12.5vw, 128px)', maxWidth: '92%', transform: 'translateY(-10%)' }}
              >
                <img
                  src={ruinedCastleImg}
                  alt="Kingdom Ruins"
                  className="w-full h-full object-contain object-center"
                  style={{ minHeight: 'clamp(56px, 11vw, 112px)' }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="repaired"
              initial={justRepaired ? { opacity: 0, scale: 0.75 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{
                duration: justRepaired ? 1.2 : 0.4,
                ease: [0.34, 1.2, 0.64, 1],
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ maxHeight: 'clamp(62px, 12.5vw, 128px)', maxWidth: '92%', transform: 'translateY(-10%)' }}
              >
                <img
                  src={restoredCastleImg}
                  alt="Primer Castle"
                  className="w-full h-full object-contain object-center"
                  style={{ minHeight: 'clamp(56px, 11vw, 112px)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Text band: centered below image, above bottom border */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center px-2 py-1.5"
        style={{
          minHeight: 'clamp(20px, 4vw, 36px)',
          bottom: 'clamp(8px, 2.2vw, 22px)',
        }}
      >
        <motion.span
          key={isRepaired ? 'label-repaired' : 'label-ruins'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-serif font-bold tracking-tighter uppercase opacity-90 text-center w-full"
          style={{
            fontSize: 'clamp(0.5rem, 1.8vw, 1.1rem)',
            lineHeight: 1.1,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {isRepaired ? 'Primer Castle' : 'Kingdom Ruins'}
        </motion.span>
      </div>
    </div>
  );
}
