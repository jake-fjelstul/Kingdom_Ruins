import { useEffect, useState } from 'react';
import { preloadImages } from '../utils/imagePreloader';

// Import all critical images
import startBackgroundPng from '../assets/start_background.png';
import rulesBackgroundPng from '../assets/rules_background.png';
import diceBackgroundPng from '../assets/dice_background.png';
import gameFloorPng from '../assets/game_floor.png';
import gameBackgroundPng from '../assets/game_background.png';
import bridgePng from '../assets/bridge.png';
import ruinedCastlePng from '../assets/ruined_castle.png';
import restoredCastlePng from '../assets/restored_castle.png';
import kingPng from '../assets/player_territories/king.png';
import king1Png from '../assets/player_territories/king_1.png';
import king2Png from '../assets/player_territories/king_2.png';
import dragonPng from '../assets/player_territories/dragon.png';
import dragon1Png from '../assets/player_territories/dragon_1.png';
import dragon2Png from '../assets/player_territories/dragon_2.png';
import knightPng from '../assets/player_territories/knight.png';
import knight1Png from '../assets/player_territories/knight_1.png';
import knight2Png from '../assets/player_territories/knight_2.png';
import wizardPng from '../assets/player_territories/wizard.png';
import wizard1Png from '../assets/player_territories/wizard_1.png';
import wizard2Png from '../assets/player_territories/wizard_2.png';
import resourceCardPng from '../assets/cards/resource.png';
import armyCardPng from '../assets/cards/army.png';
import defenseCardPng from '../assets/cards/defense.png';
import fateCardPng from '../assets/cards/fate.png';
import penaltyCardPng from '../assets/cards/penalty.png';
import mossWardPng from '../assets/tiles/moss_ward.png';
import aqueductPng from '../assets/tiles/aqueduct.png';
import catacombsPng from '../assets/tiles/catacombs.png';
import brokenKeepPng from '../assets/tiles/broken_keep.png';
import ashPitsPng from '../assets/tiles/ash_pits.png';
import blackSpirePng from '../assets/tiles/black_spire.png';

/**
 * Component that preloads all game images on mount
 * This ensures images are cached before they're needed, eliminating loading delays
 * 
 * Strategy:
 * 1. Preload critical images immediately (startup screens, main game)
 * 2. Preload secondary images in background (variations, cards, tiles)
 * 3. All images load in parallel for maximum speed
 */
export default function ImagePreloader() {
  const [criticalLoaded, setCriticalLoaded] = useState(false);

  useEffect(() => {
    // Critical images - loaded first (shown immediately)
    const criticalImages = [
      // Startup screens (highest priority - shown first)
      startBackgroundPng,
      rulesBackgroundPng,
      diceBackgroundPng,
      
      // Main game (high priority - shown when game starts)
      gameFloorPng,
      gameBackgroundPng,
      bridgePng,
      
      // Castle images (shown on game board)
      ruinedCastlePng,
      restoredCastlePng,
      
      // Player territories (main - shown on game board)
      kingPng,
      dragonPng,
      knightPng,
      wizardPng,
    ];

    // Secondary images - loaded after critical (shown later)
    const secondaryImages = [
      // Player territory variations
      king1Png,
      king2Png,
      dragon1Png,
      dragon2Png,
      knight1Png,
      knight2Png,
      wizard1Png,
      wizard2Png,
      
      // Card backgrounds (shown when cards are drawn)
      resourceCardPng,
      armyCardPng,
      defenseCardPng,
      fateCardPng,
      penaltyCardPng,
      
      // Tiles (shown when territories are purchased)
      mossWardPng,
      aqueductPng,
      catacombsPng,
      brokenKeepPng,
      ashPitsPng,
      blackSpirePng,
    ];

    // Start preloading critical images immediately
    preloadImages(criticalImages).then(() => {
      setCriticalLoaded(true);
    });

    // Start preloading secondary images immediately in parallel
    // (don't wait for critical - browser handles parallel loading)
    preloadImages(secondaryImages);
  }, []);

  // This component doesn't render anything
  return null;
}
