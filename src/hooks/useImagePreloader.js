import { useState, useEffect } from 'react';
import { preloadImage } from '../utils/imagePreloader';

/**
 * Hook to preload images and track loading progress
 * @param {string[]} imageSources - Array of image source paths (from imports) to preload
 * @returns {object} - { loaded: boolean, progress: number (0-1), error: Error | null }
 */
export function useImagePreloader(imageSources) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!imageSources || imageSources.length === 0) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    let loadedCount = 0;

    const loadImages = async () => {
      try {
        const promises = imageSources.map((src) => {
          return preloadImage(src).then(() => {
            if (!cancelled) {
              loadedCount++;
              setProgress(loadedCount / imageSources.length);
            }
          });
        });

        await Promise.all(promises);

        if (!cancelled) {
          setLoaded(true);
          setProgress(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoaded(true); // Still mark as loaded so app can continue
        }
      }
    };

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [imageSources]);

  return { loaded, progress, error };
}
