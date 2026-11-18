import { useEffect, useState } from 'react';
import { preloadImages } from '../utils/imagePreloader';

// Import all critical images
import startBackgroundPng from '../assets/start_background.webp';
import rulesBackgroundPng from '../assets/rules_background.webp';
import diceBackgroundPng from '../assets/dice_background.webp';
import gameFloorPng from '../assets/game_floor.webp';
import gameBackgroundPng from '../assets/game_background.webp';
import bridgePng from '../assets/bridge.webp';
import ruinedCastlePng from '../assets/ruined_castle.webp';
import restoredCastlePng from '../assets/restored_castle.webp';
import kingPng from '../assets/player_territories/king.webp';
import king1Png from '../assets/player_territories/king_1.webp';
import king2Png from '../assets/player_territories/king_2.webp';
import dragonPng from '../assets/player_territories/dragon.webp';
import dragon1Png from '../assets/player_territories/dragon_1.webp';
import dragon2Png from '../assets/player_territories/dragon_2.webp';
import knightPng from '../assets/player_territories/knight.webp';
import knight1Png from '../assets/player_territories/knight_1.webp';
import knight2Png from '../assets/player_territories/knight_2.webp';
import wizardPng from '../assets/player_territories/wizard.webp';
import wizard1Png from '../assets/player_territories/wizard_1.webp';
import wizard2Png from '../assets/player_territories/wizard_2.webp';
import resourceCardPng from '../assets/cards/resource.webp';
import armyCardPng from '../assets/cards/army.webp';
import defenseCardPng from '../assets/cards/defense.webp';
import fateCardPng from '../assets/cards/fate.webp';
import penaltyCardPng from '../assets/cards/penalty.webp';
import mossWardPng from '../assets/tiles/moss_ward.webp';
import aqueductPng from '../assets/tiles/aqueduct.webp';
import catacombsPng from '../assets/tiles/catacombs.webp';
import brokenKeepPng from '../assets/tiles/broken_keep.webp';
import ashPitsPng from '../assets/tiles/ash_pits.webp';
import blackSpirePng from '../assets/tiles/black_spire.webp';

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
