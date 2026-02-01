import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, FACTIONS } from '../context/GameContext';

const START_SPACES = [
  { spaceIndex: 0, factionKey: 'KING' },
  { spaceIndex: 11, factionKey: 'DRAGON' },
  { spaceIndex: 21, factionKey: 'WIZARD' },
  { spaceIndex: 32, factionKey: 'KNIGHT' },
];

const SPACE_TO_FACTION = { 0: 'KING', 11: 'DRAGON', 21: 'WIZARD', 32: 'KNIGHT' };

export default function StartLandingModal() {
  const { landedOnStart, landedOnStartChoice, players, stayOnStart, fastTravelToStart } = useGame();
  const [showDestinations, setShowDestinations] = useState(false);

  if (!landedOnStart || landedOnStartChoice) return null;
  const mover = players.find((p) => p.id === landedOnStart.moverId);
  if (!mover) return null;
  const owner = landedOnStart.ownerId ? players.find((p) => p.id === landedOnStart.ownerId) : null;
  const isNonPlayerStart = landedOnStart.ownerId === null;
  const isOwnStart = mover && owner && landedOnStart.moverId === landedOnStart.ownerId;
  const isPostBribeFight = landedOnStart.phase === 'post-bribe-fight';
  const currentSpaceIndex = landedOnStart.spaceIndex ?? -1;
  const otherStarts = START_SPACES.filter((s) => s.spaceIndex !== currentSpaceIndex);

  const factionKey = SPACE_TO_FACTION[currentSpaceIndex];
  const faction = factionKey ? FACTIONS[factionKey] : null;
  const title = owner
    ? `${owner.icon} ${owner.name}'s START`
    : faction
      ? `${faction.icon} ${faction.name}'s START`
      : 'START';

  const handleStay = () => {
    setShowDestinations(false);
    stayOnStart();
  };

  const handleFastTravel = (spaceIndex) => {
    setShowDestinations(false);
    fastTravelToStart(spaceIndex);
  };

  const handleBack = () => setShowDestinations(false);

  return (
    <AnimatePresence>
      <motion.div
        key="start-landing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border-2 border-indigo-500"
          onClick={(e) => e.stopPropagation()}
        >
          {!showDestinations ? (
            <>
              <h2 className="text-2xl font-bold text-center text-white mb-2">{title}</h2>
              {isPostBribeFight ? (
                <>
                  <p className="text-indigo-100 text-center mb-6">
                    Fast travel to another start or stay here?
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleStay}
                      className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all"
                    >
                      Stay here
                    </button>
                    <button
                      onClick={() => setShowDestinations(true)}
                      className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg transition-all"
                    >
                      Fast travel to another start
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-indigo-100 text-center mb-6">
                    {isNonPlayerStart
                      ? "You've landed on an unclaimed start. Stay or fast travel to another start?"
                      : "You've landed on your start. Stay or fast travel to another start?"}
                  </p>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleStay}
                      className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all"
                    >
                      Stay
                    </button>
                    <button
                      onClick={() => setShowDestinations(true)}
                      className="w-full py-3 px-4 rounded-lg font-bold text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg transition-all"
                    >
                      Fast travel to another start
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center text-white mb-2">Choose destination</h2>
              <p className="text-indigo-200 text-center text-sm mb-4">
                Fast travel to any other start territory.
              </p>
              <div className="flex flex-col gap-2">
                {otherStarts.map(({ spaceIndex, factionKey: fk }) => {
                  const f = FACTIONS[fk];
                  if (!f) return null;
                  const owningPlayer = players.find((p) => p.faction === f.id);
                  const label = owningPlayer
                    ? `${owningPlayer.icon} ${owningPlayer.name}'s START`
                    : `${f.icon} ${f.name}'s START`;
                  return (
                    <button
                      key={spaceIndex}
                      onClick={() => handleFastTravel(spaceIndex)}
                      className="w-full py-3 px-4 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 transition-all"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleBack}
                className="w-full mt-4 py-2 px-4 rounded-lg font-semibold bg-slate-600 hover:bg-slate-500 text-white transition-all"
              >
                Back
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
