import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

export default function CardModal() {
  const { players, currentPlayerIndex, applyCardEffect, applyResourceSpecial, applyArmySpecial, applyDefenseSpecial, applyFateSpecial, keepDrawnCard, boardSpaces = [] } = useGame();
  const currentPlayer = players[currentPlayerIndex];
  const card = currentPlayer?.lastDrawnCard;

  if (!card || !currentPlayer) return null;

  const isKeepable = (card.type === 'fate' || card.type === 'penalty') && card.keepable === true;
  const effect = card.effect || {};
  const isR8 = card.type === 'resource' && effect.special === 'rival_kingdom';
  const isSpecialNoTarget = card.type === 'resource' && (effect.special === 'toll_3_rounds' || effect.special === 'return_to_start_rewards');

  const isArmySpecialNoTarget = card.type === 'army' && ['steal_army_highest', 'raid_nearest_territory', 'train_no_move'].includes(effect.special);
  const isA7 = card.type === 'army' && effect.special === 'challenge_nearby';
  const isA0 = card.type === 'army' && effect.special === 'bribe_guards';
  const isDefenseSpecialNoTarget = card.type === 'defense' && ['defensive_structures', 'seal_borders', 'retreat_fortified', 'reverse_movement', 'penalty_immunity'].includes(effect.special);
  const isF6 = card.type === 'fate' && effect.special === 'swap_positions';
  const isF7 = card.type === 'fate' && effect.special === 'alliance';
  const isFateSpecialNoTarget = card.type === 'fate' && ['move_5_collect_100', 'cancel_next_penalty', 'reverse_until_battle_win'].includes(effect.special);
  const withinSpaces = effect.withinSpaces ?? 5;
  const totalSpaces = boardSpaces.length;
  const a7Targets = totalSpaces > 0 ? players.filter((p) => {
    if (p.id === currentPlayer.id) return false;
    const d = (p.position - currentPlayer.position + totalSpaces) % totalSpaces;
    return d > 0 && d <= withinSpaces;
  }) : [];

  const handleApply = () => {
    if (effect.special === 'gold_per_territory' || (effect.gold != null || effect.army != null || effect.defense != null)) {
      applyCardEffect(currentPlayer.id, effect, { isPenalty: card.type === 'penalty' });
    }
  };

  const handleSpecial = () => {
    if (isSpecialNoTarget) applyResourceSpecial(card.id, currentPlayer.id);
  };

  const handleArmySpecial = () => {
    if (isArmySpecialNoTarget) applyArmySpecial(card.id, currentPlayer.id);
  };

  const handleDefenseSpecial = () => {
    if (isDefenseSpecialNoTarget) applyDefenseSpecial(card.id, currentPlayer.id);
  };

  const handleFateSpecial = () => {
    if (isFateSpecialNoTarget) applyFateSpecial(card.id, currentPlayer.id);
  };

  const handleF6Choose = (targetPlayerId) => {
    applyFateSpecial('f6', currentPlayer.id, targetPlayerId);
  };

  const handleF7Choose = (targetPlayerId) => {
    applyFateSpecial('f7', currentPlayer.id, targetPlayerId);
  };

  const handleR8Choose = (targetPlayerId) => {
    applyResourceSpecial('r8', currentPlayer.id, targetPlayerId);
  };

  const handleA7Choose = (targetPlayerId) => {
    applyArmySpecial('a7', currentPlayer.id, targetPlayerId);
  };

  const handleA0Choose = (targetPlayerId) => {
    applyArmySpecial('a0', currentPlayer.id, targetPlayerId);
  };

  const handleKeep = () => keepDrawnCard();

  const handlePrimary = () => {
    if (isKeepable) handleKeep();
    else if (isR8 || isA7 || isA0 || isF6 || isF7) return; // must choose player
    else if (isSpecialNoTarget) handleSpecial();
    else if (isArmySpecialNoTarget) handleArmySpecial();
    else if (isDefenseSpecialNoTarget) handleDefenseSpecial();
    else if (isFateSpecialNoTarget) handleFateSpecial();
    else handleApply();
  };

  const getCardColor = (type) => {
    const colors = {
      resource: 'bg-green-300',
      army: 'bg-emerald-400',
      defense: 'bg-blue-300',
      fate: 'bg-pink-200',
      penalty: 'bg-yellow-300',
      territory: 'bg-green-600',
    };
    return colors[type] || 'bg-gray-300';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handlePrimary}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          className={`${getCardColor(card.type)} rounded-lg p-6 shadow-2xl max-w-md border-4 border-gray-800`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Card Drawn</h3>
          <p className="text-gray-800 text-lg mb-4 text-center">{card.text}</p>

          {effect && (effect.special || effect.gold != null || effect.army != null || effect.defense != null) && (
            <div className="bg-white rounded p-3 mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Effect:</div>
              <div className="text-sm text-gray-600">
                {effect.special === 'gold_per_territory' && (
                  <div>Gain 50 Gold per territory you own.</div>
                )}
                {effect.special === 'toll_3_rounds' && (
                  <div>Toll booth: passers pay you 50g for 3 rounds.</div>
                )}
                {effect.special === 'return_to_start_rewards' && (
                  <div>Return to start and collect income.</div>
                )}
                {effect.special === 'rival_kingdom' && (
                  <div>Choose a player: you both gain 200g, you can&apos;t attack them for 2 turns.</div>
                )}
                {effect.special === 'steal_army_highest' && (
                  <div>Steal 1 Army from the player with the highest Army.</div>
                )}
                {effect.special === 'challenge_nearby' && (
                  <div>Choose a player within 5 spaces. You both roll a die; the loser loses 1 Army.</div>
                )}
                {effect.special === 'raid_nearest_territory' && (
                  <div>Move to nearest opponent territory. If your Army &gt; their Defense, steal 200 Gold.</div>
                )}
                {effect.special === 'train_no_move' && (
                  <div>Gain 3 Army, but you cannot move on your next turn.</div>
                )}
                {effect.special === 'bribe_guards' && (
                  <div>Spend 100 Gold: choose an opponent, they lose 2 Defense, you gain 1 Army.</div>
                )}
                {effect.special === 'defensive_structures' && (
                  <div>Opponents who land on your territory lose 1 Army.</div>
                )}
                {effect.special === 'seal_borders' && (
                  <div>No one can land on or pass through your current space for 1 round.</div>
                )}
                {effect.special === 'retreat_fortified' && (
                  <div>Teleport to your highest-Defense territory.</div>
                )}
                {effect.special === 'reverse_movement' && (
                  <div>Move backward for your next 4 rolls.</div>
                )}
                {effect.special === 'penalty_immunity' && (
                  <div>Immune to the next penalty card played against you.</div>
                )}
                {effect.special === 'swap_positions' && (
                  <div>Swap board positions with the player you choose.</div>
                )}
                {effect.special === 'alliance' && (
                  <div>Choose a player. You share Army stats for the next 3 turns.</div>
                )}
                {effect.special === 'move_5_collect_100' && (
                  <div>Move forward 5 spaces and collect 100 Gold.</div>
                )}
                {effect.special === 'cancel_next_penalty' && (
                  <div>Cancel the next Penalty card played on you.</div>
                )}
                {effect.special === 'reverse_until_battle_win' && (
                  <div>Move in reverse until you win a battle.</div>
                )}
                {effect.special === 'banished' && (
                  <div>Move backward 10 spaces. Cannot buy territories for 2 turns.</div>
                )}
                {effect.special === 'currency_tanked' && (
                  <div>Your next Territory purchase costs +100 Gold.</div>
                )}
                {effect.special === 'rebellion' && (
                  <div>Lose 1 Army per 2 territories you own.</div>
                )}
                {effect.special === 'secrets_sold' && (
                  <div>Give 1 Defense to the player on your right.</div>
                )}
                {effect.special === 'bank_debt' && (
                  <div>Cannot gain Gold until you land on Resource and pay off 300 Gold.</div>
                )}
                {!effect.special && (
                  <>
                    {effect.gold != null && <div>Gold: {effect.gold >= 0 ? '+' : ''}{effect.gold}</div>}
                    {effect.army != null && <div>Army: {effect.army >= 0 ? '+' : ''}{effect.army}%</div>}
                    {effect.defense != null && <div>Defense: {effect.defense >= 0 ? '+' : ''}{effect.defense}%</div>}
                  </>
                )}
              </div>
            </div>
          )}

          {isR8 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">Choose a player to form a connection with:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {players
                  .filter((p) => p.id !== currentPlayer.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleR8Choose(p.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                    >
                      {p.icon} {p.name}
                    </button>
                  ))}
              </div>
            </div>
          ) : isA7 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">Choose a commander within {withinSpaces} spaces:</p>
              {a7Targets.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-amber-700 text-center">No players within {withinSpaces} spaces.</p>
                  <button
                    onClick={() => handleA7Choose(null)}
                    className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg"
                  >
                    OK (no effect)
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  {a7Targets.map((p) => {
                    const d = (p.position - currentPlayer.position + totalSpaces) % totalSpaces;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleA7Choose(p.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
                      >
                        {p.icon} {p.name} ({d} ahead)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : isA0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">Spend 100 Gold. Choose an opponent:</p>
              {currentPlayer.gold < 100 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-amber-700 text-center">You need 100 Gold.</p>
                  <button
                    onClick={() => handleA0Choose(null)}
                    className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg"
                  >
                    OK (no effect)
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  {players
                    .filter((p) => p.id !== currentPlayer.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleA0Choose(p.id)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
                      >
                        {p.icon} {p.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : isF6 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">Choose a player to swap positions with:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {players
                  .filter((p) => p.id !== currentPlayer.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleF6Choose(p.id)}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                    >
                      {p.icon} {p.name}
                    </button>
                  ))}
              </div>
            </div>
          ) : isF7 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center font-medium">Choose a player to ally with:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {players
                  .filter((p) => p.id !== currentPlayer.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleF7Choose(p.id)}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg"
                    >
                      {p.icon} {p.name}
                    </button>
                  ))}
              </div>
            </div>
          ) : isKeepable ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 text-center">
                Keep this card to use later on your turn, or sell it for 100g.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleKeep}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg"
                >
                  Keep
                </button>
                {card.effect && (
                  <button
                    onClick={handleApply}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                  >
                    Use now
                  </button>
                )}
              </div>
            </div>
          ) : isSpecialNoTarget ? (
            <button
              onClick={handleSpecial}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              Apply Effect
            </button>
          ) : isArmySpecialNoTarget ? (
            <button
              onClick={handleArmySpecial}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              Apply Effect
            </button>
          ) : isDefenseSpecialNoTarget ? (
            <button
              onClick={handleDefenseSpecial}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              Apply Effect
            </button>
          ) : isFateSpecialNoTarget ? (
            <button
              onClick={handleFateSpecial}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              Apply Effect
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              Apply Effect
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
