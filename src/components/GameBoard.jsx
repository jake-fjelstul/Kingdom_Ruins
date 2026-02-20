import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGame, SPACE_TYPES, FACTIONS } from '../context/GameContext';
import { useGameBoardImages } from '../hooks/useGameBoardImages';

const CORNER_FACTION = { tl: 'king', tr: 'dragon', bl: 'knight', br: 'wizard' };
const getCornerIcon = (corner) => {
  const id = CORNER_FACTION[corner];
  const factionKey = id ? id.toUpperCase() : null;
  return factionKey && FACTIONS[factionKey] ? FACTIONS[factionKey].icon : null;
};
import PlayerToken from './PlayerToken';
import CentralCastle from './CentralCastle';
import gameBackgroundImg from '../assets/game_background.png';
import bridgeImg from '../assets/bridge.png';
import kingImg from '../assets/player_territories/king.png';
import king1Img from '../assets/player_territories/king_1.png';
import king2Img from '../assets/player_territories/king_2.png';
import dragonImg from '../assets/player_territories/dragon.png';
import dragon1Img from '../assets/player_territories/dragon_1.png';
import dragon2Img from '../assets/player_territories/dragon_2.png';
import knightImg from '../assets/player_territories/knight.png';
import knight1Img from '../assets/player_territories/knight_1.png';
import knight2Img from '../assets/player_territories/knight_2.png';
import wizardImg from '../assets/player_territories/wizard.png';
import wizard1Img from '../assets/player_territories/wizard_1.png';
import wizard2Img from '../assets/player_territories/wizard_2.png';

const CENTER_X = 50;
const CENTER_Y = 50;
const GAUNTLET_ENTRY_DURATION = 1.8;

const getTerritoryImage = (territoryId) => {
  if (territoryId.startsWith('inner-tl')) {
    if (territoryId === 'inner-tl' || territoryId === 'inner-tl-main') return kingImg;
    if (territoryId.endsWith('-1')) return king1Img;
    if (territoryId.endsWith('-2')) return king2Img;
    return kingImg;
  }
  if (territoryId.startsWith('inner-tr')) {
    if (territoryId === 'inner-tr' || territoryId === 'inner-tr-main') return dragonImg;
    if (territoryId.endsWith('-1')) return dragon1Img;
    if (territoryId.endsWith('-2')) return dragon2Img;
    return dragonImg;
  }
  if (territoryId.startsWith('inner-bl')) {
    if (territoryId === 'inner-bl' || territoryId === 'inner-bl-main') return knightImg;
    if (territoryId.endsWith('-1')) return knight1Img;
    if (territoryId.endsWith('-2')) return knight2Img;
    return knightImg;
  }
  if (territoryId.startsWith('inner-br')) {
    if (territoryId === 'inner-br' || territoryId === 'inner-br-main') return wizardImg;
    if (territoryId.endsWith('-1')) return wizard1Img;
    if (territoryId.endsWith('-2')) return wizard2Img;
    return wizardImg;
  }
  return null;
};

export default function GameBoard() {
  const { boardSpaces = [], players = [], territories = {}, currentPlayerIndex, selectedCorner, selectCorner, purchaseTerritory, gauntlet, gauntletEntryAnimationComplete, castleState } = useGame();
  const { imagesLoaded } = useGameBoardImages();
  const currentPlayer = players[currentPlayerIndex];
  const entryAnim = gauntlet?.phase === 'entry_animation';
  const target = entryAnim && gauntlet?.targetId ? players.find((p) => p.id === gauntlet.targetId) : null;

  const cornerFromTerritoryId = (id) => {
    if (!id || !id.startsWith('inner-')) return null;
    const m = id.match(/^inner-(tl|tr|bl|br)-/);
    return m ? m[1] : null;
  };
  const isCornerInPlay = (corner) => {
    const factionId = CORNER_FACTION[corner];
    return factionId && players.some((p) => p.faction === factionId);
  };

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

  // Show loading state until images are ready (with fade-in animation)
  if (!imagesLoaded) {
    return (
      <div 
        className="relative shadow-2xl overflow-hidden border-[#3d2616] mx-auto flex items-center justify-center"
        style={{ 
          width: '100%', 
          maxWidth: '1100px', 
          aspectRatio: '4/3',
          minWidth: 0,
          borderWidth: 'clamp(6px, 1.2vw, 12px)',
          backgroundColor: '#5c3a21',
          boxSizing: 'border-box'
        }}
      >
        <div className="text-white text-sm opacity-70">Preparing game board...</div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative shadow-2xl overflow-hidden border-[#3d2616] mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ 
        width: '100%', 
        maxWidth: '1100px', 
        aspectRatio: '4/3',
        minWidth: 0,
        borderWidth: 'clamp(6px, 1.2vw, 12px)',
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
          const image = getTerritoryImage(territoryId);
          // King (gold), Dragon (darker green), Knight (silver), Wizard (darker purple)
          let gradientBackground = 'linear-gradient(135deg, #3a7d44 0%, #3a7d44 100%)';
          if (territoryId.startsWith('inner-tl')) {
            gradientBackground = 'linear-gradient(135deg, #fff2a8 0%, #d4af37 35%, #fff2a8 70%, #b38728 100%)';
          } else if (territoryId.startsWith('inner-tr')) {
            gradientBackground = 'linear-gradient(135deg, #2f6b3a 0%, #1f4f2a 100%)';
          } else if (territoryId.startsWith('inner-bl')) {
            gradientBackground = 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #f8fafc 70%, #94a3b8 100%)';
          } else if (territoryId.startsWith('inner-br')) {
            gradientBackground = 'linear-gradient(135deg, #6d28d9 0%, #3b1b8a 100%)';
          }
          
          // Use multiple background images: PNG on top, gradient as fallback base layer
          // If PNG fails to load, gradient will show through
          const style = {
            backgroundImage: image ? `url(${image}), ${gradientBackground}` : gradientBackground,
            backgroundSize: image ? 'cover, cover' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          };
          
          return style;
        };

        const renderRect = (territoryId, top, left, right, bottom, width, height) => {
          const territory = territories[territoryId];
          const owner = territory ? players.find(p => p.id === territory.ownerId) : null;
          const isInnerTerritory = territoryId.startsWith('inner-');
          const isOwned = !!owner;
          const corner = cornerFromTerritoryId(territoryId);
          const cornerPlaying = corner !== null && isCornerInPlay(corner);
          const style = { width, height };
          if (top !== undefined) style.top = top;
          if (left !== undefined) style.left = left;
          if (right !== undefined) style.right = right;
          if (bottom !== undefined) style.bottom = bottom;
          const sectionStyle = getSectionStyle(territoryId);

          return (
            <div
              className="absolute border-2 border-black/40 flex flex-col items-center justify-center z-20 overflow-hidden min-w-0"
              style={{ ...style, ...sectionStyle }}
            >
              {owner && <span className="flex-shrink-0" style={{ fontSize: 'clamp(0.6rem, 1.8vmin, 1.5rem)', zIndex: 10 }}>{owner.icon}</span>}
              {!isOwned && cornerPlaying && (
                <div className="bg-yellow-600/90 border border-yellow-800 rounded px-0.5 py-0 flex items-center gap-0.5 shadow-md mt-0.5 flex-shrink-0" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.35rem, 1vmin, 1.05rem)' }}>💰</span>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.35rem, 1vmin, 1.05rem)' }}>
                    {territoryId.endsWith('-1') ? 750 : territoryId.endsWith('-2') ? 1250 : 750}
                  </span>
                </div>
              )}
              {!isOwned && corner !== null && !cornerPlaying && getCornerIcon(corner) && (
                <div className="flex items-center justify-center mt-0.5 flex-shrink-0" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.6rem, 1.8vmin, 1.5rem)', opacity: 0.8 }}>{getCornerIcon(corner)}</span>
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Top Left Corner - King 👑 (Player 0) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'tl' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 overflow-hidden min-w-0 ${currentPlayerIndex === 0 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ top: '10%', left: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-tl') }}
              onClick={() => currentPlayerIndex === 0 && selectCorner('tl')}
            >
              <div className="flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255, 242, 168, 0.5)', padding: 'clamp(0.3rem, 1vmin, 0.6rem)', zIndex: 10 }}>
                <span className="opacity-80 flex-shrink-0" style={{ fontSize: 'clamp(0.9rem, 3vmin, 1.875rem)' }}>👑</span>
              </div>
            </div>
            <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '17%', left: '22.3%', width: '3.2%', height: '5.5%', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }} />
            {renderRect('inner-tl-1', '14%', '24.33%', undefined, undefined, '8%', '12%')}
            
            {/* Top Right Corner - Dragon 🐉 (Player 1) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'tr' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 overflow-hidden min-w-0 ${currentPlayerIndex === 1 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ top: '10%', right: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-tr') }}
              onClick={() => currentPlayerIndex === 1 && selectCorner('tr')}
            >
              <div className="flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(47, 107, 58, 0.4)', padding: 'clamp(0.3rem, 1vmin, 0.6rem)', zIndex: 10 }}>
                <span className="opacity-80 flex-shrink-0" style={{ fontSize: 'clamp(0.9rem, 3vmin, 1.875rem)' }}>🐉</span>
              </div>
            </div>
            <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '17%', right: '22.3%', width: '3.2%', height: '5.5%', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }} />
            {renderRect('inner-tr-1', '14%', undefined, '24.33%', undefined, '8%', '12%')}
            
            {/* Bottom Left Corner - Knight ⚔️ (Player 2) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'bl' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 overflow-hidden min-w-0 ${currentPlayerIndex === 2 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ bottom: '10%', left: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-bl') }}
              onClick={() => currentPlayerIndex === 2 && selectCorner('bl')}
            >
              <div className="flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(248, 250, 252, 0.6)', padding: 'clamp(0.3rem, 1vmin, 0.6rem)', zIndex: 10 }}>
                <span className="opacity-80 flex-shrink-0" style={{ fontSize: 'clamp(0.9rem, 3vmin, 1.875rem)' }}>⚔️</span>
              </div>
            </div>
            <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ bottom: '17%', left: '22.3%', width: '3.2%', height: '5.5%', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }} />
            {renderRect('inner-bl-1', undefined, '24.33%', undefined, '14%', '8%', '12%')}
            
            {/* Bottom Right Corner - Wizard 🧙 (Player 3) */}
            <div 
              className={`absolute border-2 border-b-4 border-r-4 border-b-stone-600 border-r-stone-600 ${selectedCorner === 'br' ? 'border-yellow-400' : 'border-black/30'} flex items-center justify-center z-20 overflow-hidden min-w-0 ${currentPlayerIndex === 3 ? 'cursor-pointer hover:opacity-90' : ''}`}
              style={{ bottom: '10%', right: '8.33%', width: '15%', height: '18%', ...getSectionStyle('inner-br') }}
              onClick={() => currentPlayerIndex === 3 && selectCorner('br')}
            >
              <div className="flex items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(109, 40, 217, 0.4)', padding: 'clamp(0.3rem, 1vmin, 0.6rem)', zIndex: 10 }}>
                <span className="opacity-80 flex-shrink-0" style={{ fontSize: 'clamp(0.9rem, 3vmin, 1.875rem)' }}>🧙</span>
              </div>
            </div>
            <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ bottom: '17%', right: '22.3%', width: '3.2%', height: '5.5%', transform: 'rotate(90deg)', transformOrigin: '50% 50%' }} />
            {renderRect('inner-br-1', undefined, undefined, '24.33%', '14%', '8%', '12%')}
          </>
        );
      })()}

      {/* Side Territories - Second purchasable rectangle for each corner */}
      {(() => {
        const getSectionStyle = (territoryId) => {
          const image = getTerritoryImage(territoryId);
          // King (gold), Dragon (darker green), Knight (silver), Wizard (darker purple)
          let gradientBackground = 'linear-gradient(135deg, #3a7d44 0%, #3a7d44 100%)';
          if (territoryId.startsWith('inner-tl')) {
            gradientBackground = 'linear-gradient(135deg, #fff2a8 0%, #d4af37 35%, #fff2a8 70%, #b38728 100%)';
          } else if (territoryId.startsWith('inner-tr')) {
            gradientBackground = 'linear-gradient(135deg, #2f6b3a 0%, #1f4f2a 100%)';
          } else if (territoryId.startsWith('inner-bl')) {
            gradientBackground = 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #f8fafc 70%, #94a3b8 100%)';
          } else if (territoryId.startsWith('inner-br')) {
            gradientBackground = 'linear-gradient(135deg, #6d28d9 0%, #3b1b8a 100%)';
          }
          
          // Use multiple background images: PNG on top, gradient as fallback base layer
          // If PNG fails to load, gradient will show through
          const style = {
            backgroundImage: image ? `url(${image}), ${gradientBackground}` : gradientBackground,
            backgroundSize: image ? 'cover, cover' : 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          };
          
          return style;
        };

        const renderRect = (territoryId, top, left, right, width, height) => {
          const territory = territories[territoryId];
          const owner = territory ? players.find(p => p.id === territory.ownerId) : null;
          const isInnerTerritory = territoryId.startsWith('inner-');
          const isOwned = !!owner;
          const corner = cornerFromTerritoryId(territoryId);
          const cornerPlaying = corner !== null && isCornerInPlay(corner);
          const style = { top, width, height };
          if (left !== undefined) style.left = left;
          if (right !== undefined) style.right = right;

          const sectionStyle = getSectionStyle(territoryId);

          return (
            <div
              className="absolute border-2 border-black/40 flex flex-col items-center justify-center z-20 overflow-hidden min-w-0"
              style={{ ...style, ...sectionStyle }}
            >
              {owner && <span className="flex-shrink-0" style={{ fontSize: 'clamp(0.5rem, 1.4vmin, 1.25rem)', zIndex: 10 }}>{owner.icon}</span>}
              {!isOwned && cornerPlaying && (
                <div className="bg-yellow-600/90 border border-yellow-800 rounded px-0.5 py-0 flex items-center gap-0.5 shadow-md mt-0.5 flex-shrink-0" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.35rem, 1vmin, 1.05rem)' }}>💰</span>
                  <span className="text-white font-bold" style={{ fontSize: 'clamp(0.35rem, 1vmin, 1.05rem)' }}>
                    {territoryId.endsWith('-1') ? 750 : territoryId.endsWith('-2') ? 1250 : 750}
                  </span>
                </div>
              )}
              {!isOwned && corner !== null && !cornerPlaying && getCornerIcon(corner) && (
                <div className="flex items-center justify-center mt-0.5 flex-shrink-0" style={{ zIndex: 15 }}>
                  <span style={{ fontSize: 'clamp(0.5rem, 1.4vmin, 1.25rem)', opacity: 0.8 }}>{getCornerIcon(corner)}</span>
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
      <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '27.5%', left: '13.5%', width: '5%', height: '2.5%' }} />
      <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '27.5%', right: '13.5%', width: '5%', height: '2.5%' }} />
      <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '70%', left: '13.5%', width: '5%', height: '2.5%' }} />
      <img src={bridgeImg} alt="" className="absolute z-20 object-cover" style={{ top: '70%', right: '13.5%', width: '5%', height: '2.5%' }} />

      {/* 3. PERIMETER SPACES */}
      {boardSpaces.map((space, index) => {
        const { x, y, widthPercent, heightPercent } = getPosition(index);
        const isCorner = index === 0 || index === 11 || index === 21 || index === 32;
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

        const isCurrentPlayerTile = currentPlayer != null && index === (currentPlayer.position ?? 0);
        const isNewTerritoryTile = isNewTerritory && tileIcon;
        return (
          <div
            key={space.id || index}
            className={`absolute border-2 border-b-4 border-r-4 flex flex-col items-center justify-center z-20 shadow-sm border-black/30 border-b-stone-600 border-r-stone-600 overflow-hidden box-border ${bgColor}`}
            style={{
              ...tileStyle,
              gap: '1px',
              padding: isNewTerritoryTile ? '3px 2px 6px 2px' : '1px',
              ...(isCurrentPlayerTile ? { boxShadow: 'inset 0 0 0 999px rgba(250, 204, 21, 0.35), inset 0 0 0 3px rgba(250, 204, 21, 0.95)' } : {}),
            }}
          >
            <div className="w-full min-w-0 flex-1 min-h-0 flex items-center justify-center overflow-hidden px-0.5">
              <span
                style={{
                  fontSize: isNewTerritoryTile ? 'clamp(4px, 0.7vmin, 11px)' : 'clamp(4px, 0.9vmin, 14px)',
                  lineHeight: 1.15,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  hyphens: 'auto',
                }}
                className="font-bold text-center uppercase font-serif w-full leading-tight"
              >
                {isOwned && owner ? owner.name : space.label}
              </span>
            </div>
            {tileIcon && (
              <img
                src={tileIcon}
                alt=""
                className="object-contain flex-shrink-0 w-auto h-auto"
                style={
                  isNewTerritoryTile
                    ? { width: 'clamp(10px, 1.9vmin, 28px)', height: 'clamp(10px, 1.9vmin, 28px)', maxWidth: '85%', maxHeight: '48%' }
                    : { width: 'clamp(14px, 2.8vmin, 42px)', height: 'clamp(14px, 2.8vmin, 42px)', maxWidth: '90%', maxHeight: '55%' }
                }
              />
            )}
            {isNewTerritory && (
              <div className="bg-yellow-600/90 border border-yellow-800 rounded px-0.5 py-0 flex items-center gap-0.5 shadow-md flex-shrink-0 min-w-0 overflow-hidden justify-center mt-0.5">
                <span style={{ fontSize: 'clamp(3px, 0.65vmin, 10px)' }}>💰</span>
                <span className="text-white font-bold" style={{ fontSize: 'clamp(3px, 0.65vmin, 10px)' }}>{territoryPrice}</span>
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
    </motion.div>
  );
}