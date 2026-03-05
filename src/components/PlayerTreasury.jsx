import React from 'react';
import { useGame, getOuterTerritoryDef } from '../context/GameContext';

export default function PlayerTreasury({ player, isCurrentPlayer, playerCount = 4, boardHeight = 1050 }) {
  const {
    selectedTerritory,
    selectedCorner,
    pendingIncomeTypeSelection,
    purchaseTerritory,
    purchaseTerritoryWithIncomeType,
    sellTerritory,
    selectCorner,
    payTribute,
    attackTerritory,
    attackNearbyPlayer,
    skipTerritoryAction,
    skipAttack,
    currentPlayerIndex,
    players,
    territories,
    boardSpaces,
    combatActive,
    attackedPlayers,
    attackImmunity,
    useFateCard,
    usePenaltyCard,
    sellCard,
    tollBooths = {},
    cannotMoveNextTurn = {},
    cannotBuyTerritories = {},
    territoryCostPlus100 = {},
    goldBlockedUntilPayoff = {},
    defensiveStructures = {},
    reverseMovement = {},
    penaltyImmunity = {},
    alliances = {},
    reverseUntilBattleWin = {},
    aiTurnSummaryByPlayerId = {},
  } = useGame();
  const currentPlayer = players[currentPlayerIndex];
  const isActuallyCurrent = currentPlayer?.id === player.id;

  const getActiveEffects = (pid) => {
    const out = [];
    const toll = tollBooths[pid];
    if (toll?.roundsLeft != null) out.push({ label: 'Toll booth', duration: `${toll.roundsLeft} round${toll.roundsLeft !== 1 ? 's' : ''} left` });
    const imm = attackImmunity?.[pid];
    if (imm && typeof imm === 'object' && Object.keys(imm).length) {
      const names = Object.entries(imm)
        .filter(([, t]) => (t ?? 0) > 0)
        .map(([defId]) => players.find((p) => p.id === defId)?.name)
        .filter(Boolean);
      if (names.length) out.push({ label: `Can't attack: ${names.join(', ')}`, duration: null });
    }
    if (cannotMoveNextTurn[pid]) out.push({ label: "Can't move next turn (training)", duration: null });
    const buyTurns = cannotBuyTerritories[pid];
    if (buyTurns != null && buyTurns > 0) out.push({ label: "Can't buy territories", duration: `${buyTurns} turn${buyTurns !== 1 ? 's' : ''} left` });
    if (territoryCostPlus100[pid]) out.push({ label: 'Next territory +100 Gold', duration: null });
    if (goldBlockedUntilPayoff[pid]) out.push({ label: 'Gold blocked until Resource pay‑off', duration: null });
    if (defensiveStructures[pid]) out.push({ label: 'Opponents lose 1 Army on your territory', duration: null });
    const revRolls = reverseMovement[pid];
    if (revRolls != null && revRolls > 0) out.push({ label: 'Move in reverse', duration: `${revRolls} roll${revRolls !== 1 ? 's' : ''} left` });
    if (penaltyImmunity[pid]) out.push({ label: 'Immune to next penalty', duration: null });
    const ally = alliances[pid];
    if (ally?.allyId) {
      const name = players.find((p) => p.id === ally.allyId)?.name;
      const t = ally.turnsLeft ?? 0;
      out.push({ label: `Allied with ${name || '?'} (share Army)`, duration: t > 0 ? `${t} turn${t !== 1 ? 's' : ''} left` : null });
    }
    if (reverseUntilBattleWin[pid]) out.push({ label: 'Move in reverse until battle win', duration: null });
    return out;
  };
  const activeEffects = getActiveEffects(player.id);
  const getInnerTerritoryCost = (territoryId) => {
    // First inner territory (corner) costs 750G, second (side) costs 1250G
    if (/-1$/.test(territoryId)) return 750;
    if (/-2$/.test(territoryId)) return 1250;
    return 750;
  };

  // Calculate dynamic sizes based on player count and board height
  // Account for gaps between players (gap is ~1.5rem, so subtract that from total)
  const gapSize = 24; // ~1.5rem in pixels
  const totalGaps = (playerCount - 1) * gapSize;
  const availableHeight = (boardHeight - totalGaps) / playerCount;
  // Mobile-friendly padding and sizing
  const paddingValue = Math.max(6, Math.min(availableHeight * 0.05, 16)); // Responsive padding
  const iconSize = `clamp(1.25rem, ${availableHeight * 0.15}px, 3rem)`;
  const titleSize = `clamp(0.75rem, ${availableHeight * 0.08}px, 1.125rem)`;
  const statPadding = `clamp(0.2rem, ${availableHeight * 0.03}px, 0.5rem)`;
  const statTextSize = `clamp(0.65rem, ${availableHeight * 0.06}px, 0.875rem)`;
  const spacing = `clamp(0.2rem, ${availableHeight * 0.02}px, 0.5rem)`;

  const getTerritoryDisplayInfo = (territoryId) => {
    const isInner = territoryId.startsWith('inner-');

    if (isInner) {
      const territory = territories[territoryId];
      const incomeSkillRaw = territory?.incomeType || 'army';
      const incomeSkill = incomeSkillRaw === 'defense' ? 'Defense' : 'Army';
      return {
        isInner: true,
        title: 'Inner Territory',
        badge: `${incomeSkill} Income`,
        description: `This inner territory adds 1% of your ${incomeSkill.toLowerCase()} stat to your salary when you cross START.`,
      };
    }

    // Territories around the outer board spaces (e.g. "territory-5")
    const territoryData = territories[territoryId];
    let spaceIndex = territoryData?.spaceIndex;
    if (spaceIndex === undefined && territoryId.startsWith('territory-')) {
      const parsed = parseInt(territoryId.replace('territory-', ''), 10);
      if (!Number.isNaN(parsed)) spaceIndex = parsed;
    }

    const space = Number.isInteger(spaceIndex) ? boardSpaces[spaceIndex] : null;
    const spaceLabel = space?.label || (spaceIndex !== undefined ? `Space ${spaceIndex}` : territoryId.replace('territory-', 'Space '));

    return {
      isInner: false,
      title: spaceLabel,
      badge: 'Gold Income',
      description: 'Adds +100G to your salary when you cross START.',
    };
  };

  return (
    <div 
      className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border-2 flex flex-col transition-all duration-200 ${isCurrentPlayer ? 'border-yellow-400 ring-2 ring-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.25)]' : 'border-gray-600'}`} 
      style={{ 
        padding: `${paddingValue}px`, 
        flex: '1 1 0', 
        minHeight: 0, 
        maxHeight: '100%', 
        overflow: 'hidden', 
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="flex flex-col h-full min-h-0 overflow-y-auto" 
        style={{ gap: spacing, paddingBottom: spacing }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ fontSize: iconSize }}>{player.icon}</span>
          <div>
            <h3 className="text-white font-bold" style={{ fontSize: titleSize }}>{player.name}</h3>
            {isActuallyCurrent && (
              <span className="text-yellow-400" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>Your Turn</span>
            )}
          </div>
        </div>

        {/* Turn summary (AI and human) */}
        {aiTurnSummaryByPlayerId[player.id] && (
          <div className="flex-shrink-0 rounded bg-slate-700/80 border border-slate-600 p-2">
            <div className="text-slate-300 font-semibold" style={{ fontSize: `clamp(0.55rem, ${availableHeight * 0.045}px, 0.7rem)`, marginBottom: 4 }}>Last turn</div>
            <p className="text-slate-200 text-xs leading-snug" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}>
              {aiTurnSummaryByPlayerId[player.id]}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-col gap-1 flex-shrink-0" style={{ gap: spacing }}>
          <div className="bg-yellow-600 rounded flex justify-between items-center" style={{ padding: statPadding }}>
            <span className="text-white font-semibold" style={{ fontSize: statTextSize }}>Gold:</span>
            <span className="text-white font-bold" style={{ fontSize: statTextSize }}>{player.gold}</span>
          </div>
          
          <div className="bg-green-600 rounded flex justify-between items-center" style={{ padding: statPadding }}>
            <span className="text-white font-semibold" style={{ fontSize: statTextSize }}>Army:</span>
            <span className="text-white font-bold" style={{ fontSize: statTextSize }}>{player.armyStrength}%</span>
          </div>
          
          <div className="bg-blue-600 rounded flex justify-between items-center" style={{ padding: statPadding }}>
            <span className="text-white font-semibold" style={{ fontSize: statTextSize }}>Defense:</span>
            <span className="text-white font-bold" style={{ fontSize: statTextSize }}>{player.defenseStrength}%</span>
          </div>
        </div>

        {/* Kept Cards (fate/penalty) */}
        <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
          <div className="text-white font-semibold" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)`, marginBottom: spacing }}>Cards:</div>
          {player.hand?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {player.hand.map((c, idx) => (
                  <div
                    key={`${c.id}-${idx}`}
                    className="flex flex-col gap-1 bg-gray-800/60 rounded px-2 py-1.5 flex-shrink-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${c.type === 'fate' ? 'bg-pink-600/70 text-pink-100' : 'bg-amber-600/70 text-amber-100'}`}
                        style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                      >
                        {c.type === 'fate' ? 'Fate' : 'Penalty'}
                      </span>
                    </div>
                    <p className="text-gray-200 text-xs line-clamp-2" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.7rem)` }}>
                      {c.text}
                    </p>
                    {c.effect && (
                      <p className="text-gray-400 text-xs" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.035}px, 0.65rem)` }}>
                        {[c.effect.gold != null && `Gold ${c.effect.gold >= 0 ? '+' : ''}${c.effect.gold}`, c.effect.army != null && `Army ${c.effect.army >= 0 ? '+' : ''}${c.effect.army}%`, c.effect.defense != null && `Def ${c.effect.defense >= 0 ? '+' : ''}${c.effect.defense}%`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {isActuallyCurrent && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.type === 'fate' && (
                          <button
                            onClick={() => useFateCard(player.id, idx)}
                            className="bg-pink-600 hover:bg-pink-700 text-white rounded px-2 py-0.5 text-xs font-semibold"
                            style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                          >
                            Use (self)
                          </button>
                        )}
                        {c.type === 'penalty' &&
                          players
                            .filter((p) => p.id !== player.id)
                            .map((target) => (
                              <button
                                key={target.id}
                                onClick={() => usePenaltyCard(player.id, target.id, idx)}
                                className="bg-amber-600 hover:bg-amber-700 text-white rounded px-2 py-0.5 text-xs font-semibold"
                                style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                              >
                                Use on {target.name}
                              </button>
                            ))}
                        {players
                          .filter((p) => p.id !== player.id && p.gold >= 100)
                          .map((buyer) => (
                            <button
                              key={buyer.id}
                              onClick={() => sellCard(player.id, buyer.id, idx)}
                              className="bg-slate-500 hover:bg-slate-600 text-white rounded px-2 py-0.5 text-xs font-semibold"
                              style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                            >
                              Sell to {buyer.name} (100g)
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
          ) : (
            <p className="text-gray-400 text-xs" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.05}px, 0.7rem)` }}>None</p>
          )}
        </div>

        {/* Active effects (multi-turn card effects) */}
        <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
          <div className="text-white font-semibold" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)`, marginBottom: spacing }}>Effects:</div>
          {activeEffects.length > 0 ? (
            <div className="flex flex-col gap-1">
              {activeEffects.map((e, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-0.5 bg-amber-900/30 rounded px-2 py-1 flex-shrink-0 border border-amber-700/40"
                >
                  <span className="text-amber-100 text-xs font-medium" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.7rem)` }}>
                    {e.label}
                  </span>
                  {e.duration && (
                    <span className="text-amber-200/80 text-xs" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.035}px, 0.65rem)` }}>
                      {e.duration}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.05}px, 0.7rem)` }}>None</p>
          )}
        </div>

        {/* Owned Territories */}
        <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
          <div className="text-white font-semibold" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)`, marginBottom: spacing }}>Territories:</div>
          {player.ownedTerritories.length > 0 ? (
            <div className="flex flex-col gap-1">
              {player.ownedTerritories.map((territoryId) => {
                const info = getTerritoryDisplayInfo(territoryId);
                return (
                  <div
                    key={territoryId}
                    className="flex items-start justify-between gap-2 bg-gray-800/60 rounded px-2 py-1 flex-shrink-0"
                  >
                    <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-white font-semibold truncate"
                          style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.8rem)` }}
                        >
                          {info.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide flex-shrink-0 ${
                            info.isInner ? 'bg-blue-700/70 text-blue-100' : 'bg-green-700/70 text-green-100'
                          }`}
                          style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                        >
                          {info.badge}
                        </span>
                      </div>
                      <span
                        className="text-gray-300 text-xs line-clamp-2"
                        style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                      >
                        {info.description}
                      </span>
                    </div>
                    {isActuallyCurrent && (
                      <button
                        onClick={() => sellTerritory(territoryId)}
                        className="bg-orange-600 hover:bg-orange-700 text-white rounded px-2 self-center flex-shrink-0"
                        style={{ padding: `clamp(0.125rem, ${availableHeight * 0.015}px, 0.2rem)`, fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}
                      >
                        Sell (150G)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-white" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>
              None
            </div>
          )}
        </div>

        {/* Income Type Selection - When purchasing first inner territory */}
        {isActuallyCurrent && pendingIncomeTypeSelection !== null && (
          <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
            <div className="text-white mb-1" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>Choose Income Type</div>
            <div className="text-white mb-2" style={{ fontSize: `clamp(0.5rem, ${availableHeight * 0.04}px, 0.65rem)` }}>
              For this inner territory, choose which stat will add 1% to your salary each time you cross START.
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => purchaseTerritoryWithIncomeType(pendingIncomeTypeSelection, getInnerTerritoryCost(pendingIncomeTypeSelection), 'army')}
                className="bg-green-600 hover:bg-green-700 text-white rounded flex-1"
                style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
              >
                Army ({player.armyStrength}%)
              </button>
              <button
                onClick={() => purchaseTerritoryWithIncomeType(pendingIncomeTypeSelection, getInnerTerritoryCost(pendingIncomeTypeSelection), 'defense')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded flex-1"
                style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
              >
                Defense ({player.defenseStrength}%)
              </button>
            </div>
          </div>
        )}

        {/* Inner Green Territory Purchase - Corner Selection */}
        {isActuallyCurrent && selectedCorner !== null && pendingIncomeTypeSelection === null && (
          <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
            <div className="text-white mb-1" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>Purchase Inner Territories</div>
            <div className="flex flex-col gap-1">
              {(() => {
                const cornerTerritories = {
                  'tl': ['inner-tl-1', 'inner-tl-2'], // First rectangle + first side rectangle
                  'tr': ['inner-tr-1', 'inner-tr-2'],
                  'bl': ['inner-bl-1', 'inner-bl-2'],
                  'br': ['inner-br-1', 'inner-br-2'],
                };
                const territoryIds = cornerTerritories[selectedCorner] || [];
                
                return territoryIds.map((territoryId) => {
                  const isOwned = territories[territoryId];
                  const cost = getInnerTerritoryCost(territoryId);
                  return (
                    <button
                      key={territoryId}
                      onClick={() => !isOwned && purchaseTerritory(territoryId, cost)}
                      disabled={isOwned}
                      className={`${isOwned ? 'bg-gray-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded flex-1`}
                      style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                    >
                      {isOwned ? 'Owned' : `Buy (${cost}G)`}
                    </button>
                  );
                });
              })()}
              <button
                onClick={() => selectCorner(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white rounded"
                style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Territory Purchase/Action */}
        {isActuallyCurrent && selectedTerritory !== null && selectedCorner === null && (() => {
          const territoryId = `territory-${selectedTerritory}`;
          const territory = territories[territoryId];
          const def = getOuterTerritoryDef(selectedTerritory);
          const price = def?.price ?? 300;
          const bribe = territory?.bribe ?? def?.bribe ?? 100;
          const isOwned = !!territory?.ownerId;
          const isOwnedByOther = isOwned && territory.ownerId !== player.id;
          return (
            <div className="bg-gray-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
              <div className="text-white mb-1" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>Territory Available</div>
              <div className="flex gap-1 flex-wrap">
                {!isOwned && (
                  <button
                    onClick={() => purchaseTerritory(territoryId, price)}
                    className="bg-green-600 hover:bg-green-700 text-white rounded flex-1 min-w-0"
                    style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                  >
                    Buy ({price}G)
                  </button>
                )}
                {isOwnedByOther && (
                  <>
                    <button
                      onClick={() => payTribute(territoryId, bribe)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white rounded flex-1 min-w-0"
                      style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                    >
                      Bribe ({bribe}G)
                    </button>
                    <button
                      onClick={() => attackTerritory(territoryId)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded flex-1 min-w-0"
                      style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                    >
                      Attack
                    </button>
                  </>
                )}
                <button
                  onClick={skipTerritoryAction}
                  className="bg-gray-600 hover:bg-gray-700 text-white rounded flex-1 min-w-0"
                  style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                >
                  Skip
                </button>
              </div>
            </div>
          );
        })()}

        {/* Attack Nearby Players - Only show for current player when not in combat */}
        {isActuallyCurrent && !combatActive && !selectedTerritory && !selectedCorner && !player.lastDrawnCard && (() => {
          const totalSpaces = boardSpaces.length;
          const currentPlayerAttacked = attackedPlayers[player.id] || [];
          
          // Find players that are within 3 spaces AND attacker is behind them (in forward direction)
          const myImmunity = attackImmunity?.[player.id] || {};
          const nearbyPlayers = players.filter(p => {
            if (p.id === player.id) return false;
            if (currentPlayerAttacked.includes(p.id)) return false;
            if ((myImmunity[p.id] ?? 0) > 0) return false; // r8: cannot attack for 2 turns
            
            const forwardDistance = (p.position - player.position + totalSpaces) % totalSpaces;
            const isBehind = forwardDistance > 0 && forwardDistance <= 3;
            return isBehind;
          });
          
          if (nearbyPlayers.length === 0) return null;
          
          return (
            <div className="bg-red-700 rounded flex-shrink-0" style={{ padding: statPadding }}>
              <div className="text-white font-semibold mb-2" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>
                ⚔️ Attack Nearby Players (Within 3 Spaces)
              </div>
              <div className="flex flex-col gap-1">
                {nearbyPlayers.map((targetPlayer) => {
                  const forwardDistance = (targetPlayer.position - player.position + totalSpaces) % totalSpaces;
                  return (
                    <button
                      key={targetPlayer.id}
                      onClick={() => attackNearbyPlayer(targetPlayer.id)}
                      className="bg-red-600 hover:bg-red-800 text-white rounded flex items-center justify-between px-2 flex-shrink-0"
                      style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                    >
                      <span className="flex items-center gap-1 min-w-0">
                        <span>{targetPlayer.icon}</span>
                        <span className="truncate">{targetPlayer.name}</span>
                      </span>
                      <span className="text-xs opacity-75 flex-shrink-0">{forwardDistance} space{forwardDistance !== 1 ? 's' : ''} ahead</span>
                    </button>
                  );
                })}
                <button
                  onClick={skipAttack}
                  className="bg-gray-600 hover:bg-gray-700 text-white rounded px-2 font-semibold mt-1 flex-shrink-0"
                  style={{ padding: `clamp(0.125rem, ${availableHeight * 0.02}px, 0.25rem)`, fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}
                >
                  Skip Attack
                </button>
              </div>
            </div>
          );
        })()}

        {/* Last Drawn Card */}
        {player.lastDrawnCard && (
          <div className="bg-purple-600 rounded flex-shrink-0" style={{ padding: statPadding }}>
            <div className="text-white font-semibold mb-1" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>Last Card:</div>
            <div className="text-white break-words" style={{ fontSize: `clamp(0.625rem, ${availableHeight * 0.05}px, 0.75rem)` }}>{player.lastDrawnCard.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
