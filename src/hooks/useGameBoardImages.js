import { useState, useEffect } from 'react';
import { preloadImage } from '../utils/imagePreloader';

// Import all GameBoard images
import gameBackgroundPng from '../assets/game_background.png';
import bridgePng from '../assets/bridge.png';
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
import ruinedCastlePng from '../assets/ruined_castle.png';
import restoredCastlePng from '../assets/restored_castle.png';
import gameFloorPng from '../assets/game_floor.png';

/**
 * Hook that ensures all GameBoard images are loaded before rendering
 * Returns loading state and progress
 */
export function useGameBoardImages() {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const gameBoardImages = [
      gameBackgroundPng,
      bridgePng,
      kingPng,
      king1Png,
      king2Png,
      dragonPng,
      dragon1Png,
      dragon2Png,
      knightPng,
      knight1Png,
      knight2Png,
      wizardPng,
      wizard1Png,
      wizard2Png,
      ruinedCastlePng,
      restoredCastlePng,
      gameFloorPng,
    ];

    let loadedCount = 0;
    const totalImages = gameBoardImages.length;

    const loadImages = async () => {
      // Load all images in parallel
      const promises = gameBoardImages.map((src) => {
        return preloadImage(src).then(() => {
          loadedCount++;
          setProgress(loadedCount / totalImages);
        });
      });

      await Promise.all(promises);
      setImagesLoaded(true);
      setProgress(1);
    };

    loadImages();
  }, []);

  return { imagesLoaded, progress };
}
