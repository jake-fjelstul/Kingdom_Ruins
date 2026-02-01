import React from 'react';
import { motion } from 'framer-motion';

export default function PlayerToken({ player, position }) {
  // Handle both pixel values (numbers) and percentage strings (for responsive scaling)
  const leftValue = typeof position.x === 'number' ? `${position.x}px` : position.x;
  const topValue = typeof position.y === 'number' ? `${position.y}px` : position.y;
  
  return (
    <motion.div
      key={player.id}
      className="absolute z-30 cursor-pointer flex items-center justify-center"
      style={{
        left: leftValue,
        top: topValue,
        transform: 'translate(-50%, -50%)',
        width: 'clamp(1.4rem, 2.4vw, 1.9rem)',
        height: 'clamp(1.4rem, 2.4vw, 1.9rem)',
        fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)', // Slightly smaller to fit within space
        lineHeight: 1,
      }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ 
        scale: 1,
        rotate: 0,
        left: leftValue,
        top: topValue,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        scale: { duration: 0.3 },
        left: { duration: 0.35, ease: 'easeInOut' },
        top: { duration: 0.35, ease: 'easeInOut' },
      }}
      whileHover={{ scale: 1.3, zIndex: 30 }}
      whileTap={{ scale: 1.1 }}
    >
      {player.icon}
    </motion.div>
  );
}
