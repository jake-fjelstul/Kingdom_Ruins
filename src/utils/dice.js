/**
 * Fair, cryptographically random d6 rolls.
 * Uses crypto.getRandomValues with rejection sampling for uniform 1–6.
 * Falls back to Math.random() only if Web Crypto API is unavailable.
 */

function getCrypto() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) return window.crypto;
  if (typeof self !== 'undefined' && self.crypto && self.crypto.getRandomValues) return self.crypto;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) return globalThis.crypto;
  return null;
}

const crypto = getCrypto();

/** Returns a fair random integer 1–6 using rejection sampling. */
export function rollD6() {
  if (crypto) {
    const arr = new Uint32Array(1);
    const limit = 0x1_0000_0000 - (0x1_0000_0000 % 6); // Reject top 4 values for uniform 0–5
    let n;
    do {
      crypto.getRandomValues(arr);
      n = arr[0];
    } while (n >= limit);
    return (n % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

/** Returns [d1, d2] and their sum for 2d6. */
export function roll2d6() {
  const d1 = rollD6();
  const d2 = rollD6();
  return { dice: [d1, d2], sum: d1 + d2 };
}

/** Returns a random integer in [0, max) (max exclusive). Uses crypto when available. */
export function randomInt(max) {
  if (max <= 0) return 0;
  const n = Math.floor(max);
  if (n <= 1) return 0;
  if (crypto && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    const limit = 0x1_0000_0000 - (0x1_0000_0000 % n);
    let x;
    do {
      crypto.getRandomValues(arr);
      x = arr[0];
    } while (x >= limit);
    return (x % n);
  }
  return Math.floor(Math.random() * n);
}
