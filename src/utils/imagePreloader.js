/**
 * Utility to preload images for better performance
 * Preloads critical images before they're needed to eliminate loading delays
 */

/**
 * Preloads a single image
 * @param {string} src - Image source path (from import)
 * @returns {Promise<void>} - Resolves when image is loaded
 */
export function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      // Don't reject - just resolve so app continues even if image fails
      console.warn(`Failed to preload image: ${src}`);
      resolve();
    };
    img.src = src;
  });
}

/**
 * Preloads multiple images in parallel
 * @param {string[]} sources - Array of image source paths
 * @returns {Promise<void>} - Resolves when all images are loaded
 */
export function preloadImages(sources) {
  return Promise.all(sources.map(src => preloadImage(src)));
}
