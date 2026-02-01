import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import GameSetup from './components/GameSetup';
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

function GameContent() {
  const [showLore, setShowLore] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const { players, gamePhase, victorId, currentPlayerIndex } = useGame();

  if (!gameStarted) {
    return (
      <GameSetup
        onStart={(opts) => {
          setGameStarted(true);
          const testing = !!opts?.testingMode;
          setShowLore(!testing);
        }}
      />
    );
  }

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
          setGameStarted(false);
          setShowLore(false);
        }}
      />
    );
  }

  // Distribute players: Left side = King (0) and Knight (2), Right side = Dragon (1) and Wizard (3)
  // Player order: 0=King (top-left), 1=Dragon (top-right), 2=Knight (bottom-left), 3=Wizard (bottom-right)
  const boardHeight = 825;
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
    <div className="min-h-screen p-4 bg-[#2d1b4d] overflow-x-hidden"> {/* Dark purple background matching your screenshot */}
      <div className="max-w-[2000px] mx-auto w-full">
        <h1 className="text-4xl font-bold text-white text-center mb-2 font-serif tracking-widest">KINGDOM RUINS</h1>
        
        {/* Timer */}
        <Timer />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar - Factions (max 2) */}
          <div className="lg:col-span-2 flex flex-col" style={{ height: `${boardHeight}px` }}>
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
          <div className="lg:col-span-8 flex flex-col items-center overflow-visible w-full min-w-0">
            <div style={{ width: '100%', maxWidth: '1100px', minWidth: '600px' }}>
              <div className="p-1 bg-[#4d3319] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-[#2d1b0d]">
                <GameBoard />
              </div>
            </div>
            
            {/* Dice below board */}
            <div className="mt-6 w-full max-w-[1100px]">
              <div className="bg-slate-800/90 backdrop-blur rounded-xl p-6 shadow-2xl border border-slate-700 flex justify-center">
                <Dice />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Factions (max 2) */}
          <div className="lg:col-span-2 flex flex-col" style={{ height: `${boardHeight}px` }}>
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
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
