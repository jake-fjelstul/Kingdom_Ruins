import React from 'react';
import { motion } from 'framer-motion';
import { useGame, SPACE_TYPES } from '../context/GameContext';
import PlayerToken from './PlayerToken';
import CentralCastle from './CentralCastle';
import gameBackgroundImg from '../assets/game_background.png';

const CENTER_X = 50;
const CENTER_Y = 50;
const GAUNTLET_ENTRY_DURATION = 1.8;

export default function GameBoard() {
  const { boardSpaces = [], players = [], territories = {}, currentPlayerIndex, selectedCorner, selectCorner, purchaseTerritory, gauntlet, gauntletEntryAnimationComplete, castleState } = useGame();
  const currentPlayer = players[currentPlayerIndex];
  const entryAnim = gauntlet?.phase === 'entry_animation';
  const target = entryAnim && gauntlet?.targetId ? players.find((p) => p.id === gauntlet.targetId) : null;

  const COLUMNS = 12;
  const ROWS = 10;

  const getPosition = (index) => {
    const widthPercent = (1 / COLUMNS) * 100;
    const heightPercent = (1 / ROWS) * 100;
    
    if (index <= 11) {
      const centerX = ((index + 0.5) / COLUMNS) * 100;
      return { x: Math.max(0, centerX - widthPercent / 2), y: 0, centerX, centerY: heightPercent / 2, widthPercent, heightPercent };
    }
    if (index <= 20) {
      const rowPosition = index - 11;
      const centerY = ((rowPosition + 0.5) / ROWS) * 100;
      return { x: 100 - widthPercent, y: Math.max(heightPercent / 2, centerY - heightPercent / 2), centerX: 100 - widthPercent / 2, centerY, widthPercent, heightPercent };
    }
    if (index <= 32) {
      const bottomIndex = index - 21;
      const colPosition = COLUMNS - 1 - bottomIndex;
      const centerX = ((colPosition + 0.5) / COLUMNS) * 100;
      return { x: Math.max(0, centerX - widthPercent / 2), y: 100 - heightPercent, centerX, centerY: 100 - heightPercent / 2, widthPercent, heightPercent };
    }
    const leftIndex = index - 33;
    const rowsOnLeft = [8, 7, 6, 5, 4, 3, 2, 1];
    const rowPosition = rowsOnLeft[leftIndex];
    const centerY = ((rowPosition + 0.5) / ROWS) * 100;
    return { x: 0, y: centerY - heightPercent / 2, centerX: widthPercent / 2, centerY, widthPercent, heightPercent };
  };

  return (
    <div 
      className="relative shadow-2xl overflow-hidden border-[12px] border-[#3d2616] mx-auto"
      style={{ 
        width: '100%', maxWidth: '1100px', aspectRatio: '4/3', 
        backgroundColor: '#5c3a21',
        backgroundImage: `url(${gameBackgroundImg}), url("https://www.transparenttextures.com/patterns/wood-pattern.png")`,
        backgroundSize: 'contain, auto',
        backgroundPosition: 'center, 0 0',
        backgroundRepeat: 'no-repeat, repeat',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. CENTRAL CASTLE */}
      <div 
        className="absolute z-10 flex items-center justify-center"
        style={{ top: '32%', left: '31%', width: '38%', height: '36%' }}
      >
        <CentralCastle castleState={castleState ?? 'ruins'} />
      </div>

      {/* 2. INNER LOOP - GREEN TERRITORIES & PATHS */}
      {/* Helper to render purchasable rectangle with ownership */}
      {(() => {
        const getSectionStyle = (territoryId) => {
          // King (gold), Dragon (darker green), Knight (silver), Wizard (darker purple)
          if (territoryId.startsWith('inner-tl')) {
            return {
              background: 'linear-gradient(135deg, #fff2a8 0%, #d4af37 35%, #fff2a8 70%, #b38728 100%)',
            };
          }
          if (territoryId.startsWith('inner-tr')) {
            return {
              background: 'linear-gradient(135deg, #2f6b3a 0%, #1f4f2a 100%)',
            };
          }
          if (territoryId.startsWith('inner-bl')) {
            return {
              background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #f8fafc 70%, #94a3b8 100%)',
            };
          }
          if (territoryId.startsWith('inner-br')) {
            return {
              background: 'linear-gradient(135deg, #6d28d9 0%, #3b1b8a 100%)',
            };
          }
          return { background: '#3a7d44' };
        };

        const renderRect = (territoryId, top, left, right, bottom, width, height) => {
          const territory = territories[territoryId];
          const owner = territory ? players.find(p => p.id === territory.ownerId) : null;
          const isInnerTerritory = territoryId.startsWith('inner-');
          const isOwned = !!owner;
          const style = { width, height };
          if (top !== undefined) style.top = top;
          if (left !== undefined) style.left = left;
          if (right !== undefined) style.right = right;
          if (bottom !== undefined) style.bottom = bottom;
          const sectionStyle = getSectionStyle(territoryId);

          return (
            <div
              className="absolute border-2 border-black/40 flex flex-col items-center justify-center z-20"
              style={{ ...style, ...sectionStyle }}
            >
              {isInnerTerritory && (
                <>
                  <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                  <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                  <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                </>
              )}
              {owner && <span style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', zIndex: 10 }}>{owner.icon}</span>}
              {!isOwned && (
                <div className="bg-yellow-600/90 border border-yellow-800 rounded px-1 py-0.5 flex items-center gap-0.5 shadow-md mt-1" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)' }}>💰</span>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)' }}>
                    {territoryId.endsWith('-1') ? 750 : territoryId.endsWith('-2') ? 1250 : 750}
                  </span>
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Top Left Corner - King 👑 (Player 0) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'tl' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 ${currentPlayerIndex === 0 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ top: '10%', left: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-tl') }}
              onClick={() => currentPlayerIndex === 0 && selectCorner('tl')}
            >
              <span className="text-3xl opacity-80">👑</span>
              <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
            </div>
            <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '18%', left: '23.33%', width: '1%', height: '4%' }} />
            {renderRect('inner-tl-1', '14%', '24.33%', undefined, undefined, '8%', '12%')}
            
            {/* Top Right Corner - Dragon 🐉 (Player 1) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'tr' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 ${currentPlayerIndex === 1 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ top: '10%', right: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-tr') }}
              onClick={() => currentPlayerIndex === 1 && selectCorner('tr')}
            >
              <span className="text-3xl opacity-80">🐉</span>
              <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
            </div>
            <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '18%', right: '23.33%', width: '1%', height: '4%' }} />
            {renderRect('inner-tr-1', '14%', undefined, '24.33%', undefined, '8%', '12%')}
            
            {/* Bottom Left Corner - Knight ⚔️ (Player 2) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'bl' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 ${currentPlayerIndex === 2 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ bottom: '10%', left: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-bl') }}
              onClick={() => currentPlayerIndex === 2 && selectCorner('bl')}
            >
              <span className="text-3xl opacity-80">⚔️</span>
              <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
            </div>
            <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ bottom: '18%', left: '23.33%', width: '1%', height: '4%' }} />
            {renderRect('inner-bl-1', undefined, '24.33%', undefined, '14%', '8%', '12%')}
            
            {/* Bottom Right Corner - Wizard 🧙 (Player 3) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'br' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 ${currentPlayerIndex === 3 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ bottom: '10%', right: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-br') }}
              onClick={() => currentPlayerIndex === 3 && selectCorner('br')}
            >
              <span className="text-3xl opacity-80">🧙</span>
              <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
              <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>🌳</span>
            </div>
            <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ bottom: '18%', right: '23.33%', width: '1%', height: '4%' }} />
            {renderRect('inner-br-1', undefined, undefined, '24.33%', '14%', '8%', '12%')}
          </>
        );
      })()}

      {/* Side Territories - Second purchasable rectangle for each corner */}
      {(() => {
        const getSectionStyle = (territoryId) => {
          if (territoryId.startsWith('inner-tl')) {
            return {
              background: 'linear-gradient(135deg, #fff2a8 0%, #d4af37 35%, #fff2a8 70%, #b38728 100%)',
            };
          }
          if (territoryId.startsWith('inner-tr')) {
            return {
              background: 'linear-gradient(135deg, #2f6b3a 0%, #1f4f2a 100%)',
            };
          }
          if (territoryId.startsWith('inner-bl')) {
            return {
              background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #f8fafc 70%, #94a3b8 100%)',
            };
          }
          if (territoryId.startsWith('inner-br')) {
            return {
              background: 'linear-gradient(135deg, #6d28d9 0%, #3b1b8a 100%)',
            };
          }
          return { background: '#3a7d44' };
        };

        const renderRect = (territoryId, top, left, right, width, height) => {
          const territory = territories[territoryId];
          const owner = territory ? players.find(p => p.id === territory.ownerId) : null;
          const isInnerTerritory = territoryId.startsWith('inner-');
          const isOwned = !!owner;
          const style = { top, width, height };
          if (left !== undefined) style.left = left;
          if (right !== undefined) style.right = right;

          const sectionStyle = getSectionStyle(territoryId);

          return (
            <div
              className="absolute border-2 border-black/40 flex flex-col items-center justify-center z-20"
              style={{ ...style, ...sectionStyle }}
            >
              {isInnerTerritory && (
                <>
                  <span className="absolute bottom-1 left-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                  <span className="absolute bottom-1 right-1 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                  <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-green-900" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)', zIndex: 5 }}>🌳</span>
                </>
              )}
              {owner && <span style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.25rem)', zIndex: 10 }}>{owner.icon}</span>}
              {!isOwned && (
                <div className="bg-yellow-600/90 border border-yellow-800 rounded px-1 py-0.5 flex items-center gap-0.5 shadow-md mt-1" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)' }}>💰</span>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.5rem, 0.8vw, 0.7rem)' }}>
                    {territoryId.endsWith('-1') ? 750 : territoryId.endsWith('-2') ? 1250 : 750}
                  </span>
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Side rectangles adjacent to each corner player box */}
            {renderRect('inner-tl-2', '30%', '10.33%', undefined, '12%', '10%')}
            {renderRect('inner-tr-2', '30%', undefined, '10.33%', '12%', '10%')}
            {renderRect('inner-bl-2', '60%', '10.33%', undefined, '12%', '10%')}
            {renderRect('inner-br-2', '60%', undefined, '10.33%', '12%', '10%')}
          </>
        );
      })()}
      {/* Bridges connecting side territories to adjacent rectangles */}

      {/* Bridges connecting corner boxes to side territories */}
      <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '28%', left: '14.5%', width: '4%', height: '2%' }} />
      <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '28%', right: '14.5%', width: '4%', height: '2%' }} />
      <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '70%', left: '14.5%', width: '4%', height: '2%' }} />
      <div className="absolute bg-[#3a7d44] border-2 border-black/40 z-20" style={{ top: '70%', right: '14.5%', width: '4%', height: '2%' }} />

      {/* 3. PERIMETER SPACES */}
      {boardSpaces.map((space, index) => {
        const { x, y, widthPercent, heightPercent } = getPosition(index);
        const isCorner = index === 0 || index === 11 || index === 32 || index === 21;
        const isOwned = space.owned && space.ownerId;
        const owner = isOwned ? players.find(p => p.id === space.ownerId) : null;
        const isNewTerritory = !isOwned && space.type === SPACE_TYPES.NEW_TERRITORY;
        const territoryPrice = space.price ?? 300;

        let bgColor = 'bg-stone-100/90';
        if (space.type === SPACE_TYPES.START) bgColor = 'bg-green-700 text-white';
        else if (isOwned && owner) {
          const colorMap = { green: 'bg-green-200', red: 'bg-red-200', blue: 'bg-blue-200', purple: 'bg-purple-200' };
          bgColor = colorMap[owner.color] || 'bg-stone-50';
        } else if (isCorner) bgColor = 'bg-stone-200';

        const tileIcon = space.backgroundImage;
        const tileStyle = {
          left: `${x}%`,
          top: `${y}%`,
          width: `${widthPercent}%`,
          height: `${heightPercent}%`,
          boxSizing: 'border-box',
          gap: '2px',
        };

        return (
          <div
            key={space.id || index}
            className={`absolute border-2 border-b-4 border-r-4 flex flex-col items-center justify-center z-20 shadow-sm border-black/30 border-b-stone-600 border-r-stone-600 ${bgColor}`}
            style={tileStyle}
          >
            <span style={{ fontSize: 'clamp(5px, 0.7vw, 7px)' }} className="font-bold text-center leading-tight uppercase font-serif">
              {isOwned && owner ? owner.name : space.label}
            </span>
            {tileIcon && (
              <img
                src={tileIcon}
                alt=""
                className="object-contain flex-shrink-0"
                style={{ width: 'clamp(12px, 1.8vw, 22px)', height: 'clamp(12px, 1.8vw, 22px)' }}
              />
            )}
            {isNewTerritory && (
              <div className="bg-yellow-600/90 border border-yellow-800 rounded px-1 py-0 flex items-center gap-0.5 shadow-md">
                <span style={{ fontSize: 'clamp(4px, 0.6vw, 6px)' }}>💰</span>
                <span className="text-white font-bold" style={{ fontSize: 'clamp(4px, 0.6vw, 6px)' }}>{territoryPrice}</span>
              </div>
            )}
          </div>
        );
      })}

      {/* 5. PLAYER TOKENS */}
      {players.map((player) => {
        if (entryAnim && target && player.id === target.id) return null;
        const { centerX, centerY } = getPosition(player.position || 0);
        return <PlayerToken key={player.id} player={player} position={{ x: `${centerX}%`, y: `${centerY}%` }} />;
      })}
      {entryAnim && target && (() => {
        const start = getPosition(target.position || 0);
        return (
          <motion.div
            key={`gauntlet-entry-${target.id}`}
            className="absolute z-40 flex items-center justify-center pointer-events-none drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]"
            style={{
              width: 'clamp(1.4rem, 2.4vw, 1.9rem)',
              height: 'clamp(1.4rem, 2.4vw, 1.9rem)',
              fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)',
              lineHeight: 1,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            initial={{
              left: `${start.centerX}%`,
              top: `${start.centerY}%`,
              x: '-50%',
              y: '-50%',
            }}
            animate={{
              left: `${CENTER_X}%`,
              top: `${CENTER_Y}%`,
              x: '-50%',
              y: '-50%',
            }}
            transition={{
              duration: GAUNTLET_ENTRY_DURATION,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            onAnimationComplete={gauntletEntryAnimationComplete}
          >
            {target.icon}
          </motion.div>
        );
      })()}
    </div>
  );
}