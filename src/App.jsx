import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { SettingsProvider } from './context/SettingsContext';
import { useAITurn } from './hooks/useAITurn';
import GameSetup from './components/GameSetup';
import AnalyticsPage from './components/AnalyticsPage';
import GameBoard from './components/GameBoard';
import PlayerTreasury from './components/PlayerTreasury';
import Dice from './components/Dice';
import CardModal from './components/CardModal';
import IncomeNotification from './components/IncomeNotification';
import LoreScreen from './components/LoreScreen';
import RollForFirst from './components/RollForFirst';
import CombatModal from './components/CombatModal';
import StartChoiceModal from './components/StartChoiceModal';
import StartLandingModal from './components/StartLandingModal';
import GauntletSacrificeModal from './components/GauntletSacrificeModal';
import VictoryScreen from './components/VictoryScreen';
import Timer from './components/Timer';
import ImagePreloader from './components/ImagePreloader';
import gameFloorImgPng from './assets/game_floor.png';

function GameContent({ onRestart, skipLore = false }) {
  const [showLore, setShowLore] = useState(!skipLore);
  const [boardHeight, setBoardHeight] = useState(825);
  const [mobileTreasuryTab, setMobileTreasuryTab] = useState(0);
  const { players, gamePhase, victorId, currentPlayerIndex } = useGame();

  useAITurn();

  // On mobile, auto-switch treasury tab to current player when turn changes
  useEffect(() => {
    setMobileTreasuryTab(currentPlayerIndex);
  }, [currentPlayerIndex]);

  // Calculate responsive board height
  useEffect(() => {
    const updateBoardHeight = () => {
      if (typeof window !== 'undefined') {
        // On mobile, use 60% of viewport height, max 825px
        const isMobile = window.innerWidth < 1024;
        const newHeight = isMobile 
          ? Math.min(window.innerHeight * 0.6, 825)
          : 825;
        setBoardHeight(newHeight);
      }
    };

    updateBoardHeight();
    window.addEventListener('resize', updateBoardHeight);
    return () => window.removeEventListener('resize', updateBoardHeight);
  }, []);

  if (showLore) {
    return <LoreScreen onContinue={() => setShowLore(false)} />;
  }

  if (gamePhase === 'determine_first') {
    return <RollForFirst />;
  }

  if (gamePhase === 'ended') {
    const victor = victorId ? players.find((p) => p.id === victorId) : null;
    return (
      <VictoryScreen
        victor={victor}
        onRestart={() => {
          setShowLore(false);
          onRestart?.();
        }}
      />
    );
  }

  // Distribute players: Left side = King (0) and Knight (2), Right side = Dragon (1) and Wizard (3)
  // Player order: 0=King (top-left), 1=Dragon (top-right), 2=Knight (bottom-left), 3=Wizard (bottom-right)
  let leftPlayers = [];
  let rightPlayers = [];
  
  if (players.length === 2) {
    leftPlayers = [players[0]]; // King
    rightPlayers = [players[1]]; // Dragon
  } else if (players.length === 3) {
    leftPlayers = [players[0], players[2]]; // King, Knight
    rightPlayers = [players[1]]; // Dragon
  } else if (players.length === 4) {
    leftPlayers = [players[0], players[2]]; // King (top-left), Knight (bottom-left)
    rightPlayers = [players[1], players[3]]; // Dragon (top-right), Wizard (bottom-right)
  }

  return (
    <div 
      className="min-h-screen p-2 sm:p-4 overflow-x-hidden"
      style={{
        backgroundColor: '#2d1b4d', // Fallback purple background if image fails to load
        backgroundImage: `url(${gameFloorImgPng})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-[2000px] mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white text-center mb-2 font-serif tracking-widest px-2">KINGDOM RUINS</h1>
        
        {/* Timer */}
        <Timer />
        
        {/* Mobile Layout: Stack vertically */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-8 items-start">
          {/* Mobile: Single player treasury with tabs; auto-switches to current player */}
          <div className="lg:hidden w-full order-1">
            <div className="flex gap-1 p-1 rounded-t-lg bg-slate-800/80 border-b border-slate-600">
              {players.map((player, index) => {
                const isCurrent = players[currentPlayerIndex]?.id === player.id;
                const isSelected = mobileTreasuryTab === index;
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setMobileTreasuryTab(index)}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-semibold text-sm transition-all ${
                      isSelected
                        ? 'bg-slate-600 text-white shadow-inner'
                        : 'bg-slate-700/70 text-slate-300 hover:bg-slate-600/80'
                    } ${isCurrent ? 'ring-2 ring-yellow-400/60' : ''}`}
                  >
                    <span className="text-lg leading-none shrink-0" title={player.name}>{player.icon}</span>
                    <span className="truncate min-w-0">{player.name}</span>
                    {isCurrent && <span className="text-yellow-400 text-xs font-bold shrink-0">Turn</span>}
                  </button>
                );
              })}
            </div>
            <div className="rounded-b-lg overflow-hidden border border-t-0 border-slate-600 bg-slate-800/40">
              {players[mobileTreasuryTab] && (
                <PlayerTreasury
                  key={players[mobileTreasuryTab].id}
                  player={players[mobileTreasuryTab]}
                  isCurrentPlayer={players[currentPlayerIndex]?.id === players[mobileTreasuryTab].id}
                  playerCount={1}
                  boardHeight={350}
                />
              )}
            </div>
          </div>

          {/* Desktop: Left Sidebar - Factions (max 2) */}
          <div className="hidden lg:flex lg:col-span-2 flex-col" style={{ height: `${boardHeight}px` }}>
            <div className="flex flex-col h-full" style={{ gap: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
              {leftPlayers.map((player) => (
                <PlayerTreasury 
                  key={player.id} 
                  player={player} 
                  isCurrentPlayer={players[currentPlayerIndex]?.id === player.id} 
                  playerCount={leftPlayers.length} 
                  boardHeight={boardHeight} 
                />
              ))}
            </div>
          </div>

          {/* Center - Hero Board */}
          <div className="lg:col-span-8 flex flex-col items-center overflow-x-auto overflow-y-visible w-full min-w-0 order-2 lg:order-none">
            <div className="w-full max-w-[1100px]" style={{ minWidth: 0 }}>
              <div className="p-0.5 sm:p-1 bg-[#4d3319] rounded-lg sm:rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 sm:border-4 border-[#2d1b0d]">
                <GameBoard />
              </div>
            </div>
            
            {/* Dice below board */}
            <div className="mt-3 sm:mt-6 w-full max-w-[1100px]">
              <div className="bg-slate-800/90 backdrop-blur rounded-lg sm:rounded-xl p-3 sm:p-6 shadow-2xl border border-slate-700 flex justify-center">
                <Dice />
              </div>
            </div>
          </div>

          {/* Desktop: Right Sidebar - Factions (max 2) */}
          <div className="hidden lg:flex lg:col-span-2 flex-col" style={{ height: `${boardHeight}px` }}>
            <div className="flex flex-col h-full" style={{ gap: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
              {rightPlayers.map((player) => (
                <PlayerTreasury 
                  key={player.id} 
                  player={player} 
                  isCurrentPlayer={players[currentPlayerIndex]?.id === player.id} 
                  playerCount={rightPlayers.length} 
                  boardHeight={boardHeight} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <CardModal />
      <IncomeNotification />
      <CombatModal />
      <StartLandingModal />
      <StartChoiceModal />
      <GauntletSacrificeModal />
    </div>
  );
}

function App() {
  const [view, setView] = useState('setup'); // 'setup' | 'analytics' | 'game'
  const [startOpts, setStartOpts] = useState({});

  return (
    <GameProvider>
      <SettingsProvider>
        {/* Preload all images on app startup */}
        <ImagePreloader />
        {view === 'analytics' && <AnalyticsPage onBack={() => setView('setup')} />}
        {view === 'setup' && (
          <GameSetup
            onStart={(opts) => {
              setStartOpts(opts || {});
              setView('game');
            }}
            onViewAnalytics={() => setView('analytics')}
          />
        )}
        {view === 'game' && (
          <GameContent
            skipLore={!!startOpts?.testingMode}
            onRestart={() => setView('setup')}
          />
        )}
      </SettingsProvider>
    </GameProvider>
  );
}

export default App;
