import React from 'react';
import { useGame } from '../context/GameContext';

export default function CardDeckZone({ type, color, label }) {
  const { cardDecks } = useGame();
  const deck = cardDecks[type] || [];
  const count = deck.length;

  return (
    <div 
      className={`${color} rounded-lg border-2 border-gray-800 shadow-lg flex flex-col items-center justify-center relative overflow-hidden`}
      style={{ 
        width: 'clamp(60px, 8vw, 90px)', 
        height: 'clamp(50px, 6.5vw, 75px)',
        padding: 'clamp(4px, 0.5vw, 8px)'
      }}
    >
      {/* Card stack visual effect */}
      <div className="absolute inset-0 bg-black bg-opacity-10"></div>
      <div className="relative z-10 text-center">
        <div className="font-bold text-center text-gray-900 mb-0.5" style={{ fontSize: 'clamp(8px, 1vw, 10px)' }}>{label}</div>
        <div className="text-gray-800 font-semibold" style={{ fontSize: 'clamp(7px, 0.85vw, 9px)' }}>{count} cards</div>
      </div>
      {/* Visual card stack representation */}
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
        {[...Array(Math.min(count, 5))].map((_, i) => (
          <div key={i} className="bg-black bg-opacity-20 border border-gray-700 rounded-sm" style={{ width: 'clamp(3px, 0.4vw, 4px)', height: 'clamp(4px, 0.5vw, 5px)', transform: `translateX(${i * 1.5}px)` }}></div>
        ))}
      </div>
    </div>
  );
}
