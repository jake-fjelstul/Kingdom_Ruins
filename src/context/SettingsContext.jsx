import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'kr_ai_speed';
const MIN_SPEED = 0.25;
const MAX_SPEED = 2;
const DEFAULT_SPEED = 1;

function loadStoredSpeed() {
  try {
    const v = parseFloat(localStorage.getItem(STORAGE_KEY), 10);
    if (Number.isFinite(v) && v >= MIN_SPEED && v <= MAX_SPEED) return v;
  } catch (_) {}
  return DEFAULT_SPEED;
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [aiSpeedMultiplier, setAiSpeedMultiplierState] = useState(loadStoredSpeed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(aiSpeedMultiplier));
    } catch (_) {}
  }, [aiSpeedMultiplier]);

  const setAiSpeedMultiplier = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(value, 10);
    if (Number.isFinite(n)) {
      setAiSpeedMultiplierState(Math.max(MIN_SPEED, Math.min(MAX_SPEED, n)));
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        aiSpeedMultiplier,
        setAiSpeedMultiplier,
        aiSpeedMin: MIN_SPEED,
        aiSpeedMax: MAX_SPEED,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
