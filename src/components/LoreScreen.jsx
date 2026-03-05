import React, { useState } from 'react';
import { motion } from 'framer-motion';
import rulesBackground from '../assets/rules_background.png';

const RULES_TEXT = `🏰 KINGDOM RUINS: OFFICIAL RULEBOOK

Goal: Be the first player to unlock your territories, amass a powerful army, and survive the "Gauntlet of the Fallen" to restore Primer Castle.

I. SETUP & FACTIONS
Each player chooses a faction and starts on their respective START tile with 500 Gold.

Faction   Starting Bonus               Role
The King  Starts with +200 Gold extra  Wealth focus
The Wizard Starts with +1% Army and +1% Defense  Utility focus
The Dragon Starts with +2% Army Strength         Offensive focus
The Knight Starts with +2% Defense Strength      Defensive focus

Each player will roll: The lowest roll goes first.

II. THE GOLD ECONOMY
Gold is the fuel of your conquest. Use it for the following actions:
● Unlock Gateway: Pay 250 Gold per territory to unlock the two green squares in your quadrant.
● New Territory Spot: A player may buy one new territory spot on the outer loop for another 250 Gold.
● Bribe: Pay 100 Gold during a battle to add +1 to your dice roll (Max +3 per battle).
● Rebuild the Castle: Pay 500 Gold to the Treasury once you enter the Blue Ruin Zone.

III. MOVEMENT & NAVIGATION
Players move clockwise around the outer loop using two dice.
● Standard Move: Roll and move. If you land on a Card space, draw from that deck.
● The Vanguard Jump (Cut-through): If you are standing on your START tile, you may spend 100 Gold to "warp" safely directly to any unlocked 'new territory' spot on the board. If you do not spend the money then you must attack.
  ○ Note: If that territory is owned by an opponent, an immediate Tactical Clash begins. The defending player gets an added +1 to their roll.
● Territory Access: You can only enter the inner green squares of your quadrant once you have paid the Unlock Gateway fee.
● Income: Once you pass the start of your own territory you collect $100 + 1% army or defense for each of the territories owned. This must be chosen when the green territories are purchased and cannot be changed.
● Doubles: If the player rolls doubles they get to roll again for a second turn, but only once per turn session.

IV. THE TACTICAL CLASH (COMBAT)
Combat occurs when two players land on the same space or when a player "Cut-throughs" into an occupied territory and chooses not to pay. A player can also attack another player if they are within three spaces of each other; in this case the attacker may move to the defender's position and the clash proceeds as usual.

Bribes/Pot: When players bribe each other that money goes into the pot; whoever wins the battle gets the pot.

The Battle Formula:
Total Power = (2d6 roll) + (Total Card % Bonus) + (Gold Bribes)
● Attacker uses Army %.
● Defender uses Defense %.
● Outcome: The loser must pay the winner Gold equal to the difference ×10. If the winner wins by 5 or more, they may also force the loser to discard one 1% card of the winner's choice.

V. ALLIANCES
Two players can enter into alliances with each other for a maximum of 3 rounds (rolls). During this time period their Army and Defense points combine respectively, so they can attack and defend against other players with their combined forces and split the loot.

A player in an alliance can however choose to backstab their partner.
If you backstab you get +3 on your next attack dice roll, but must draw 1 penalty card.

VI. FATE & PENALTY CARDS
Fate and Penalty Cards are cards that will either say to be used immediately as a normal card or may say to be picked up and held by players and either be used to help the player or be used against any other player on the holder's turn.
Penalty and Fate Cards may be sold for 100 Gold.

VII. THE ENDGAME: RESTORING PRIMER
To initiate the winning sequence, you must meet the Entry Requirements:
1. Own both of your inner territories.
2. Have at least 10% total combined stats (Army + Defense).
3. Have at least 500 Gold (to pay for the rebuild).

Step 1: Entering the Ruins
Move your piece into the Blue Ruin Zone and pay the 500 Gold Rebuild Fee to the Treasury.

Step 2: The Gauntlet of the Fallen
Once you are in the center, you are the "Target." Before your next turn, every other player gets to initiate one final attack against you, regardless of where they are on the board.
● The Gauntlet: You must resolve a Tactical Clash against every player. Every player combines their Army and Defense against your Army and Defense points. There is no limit on the amount of bribes you can use (100 Gold for 1 bonus point).
● Victory: If you defeat the challengers, the kingdom is restored. YOU WIN! All ties require a reroll.
● Defeat: If you lose this battle, your restoration fails.
  ○ You are kicked out of the Blue Zone back to your START tile.
  ○ You lose 1 territory (it becomes "Locked" again and must be re-purchased). If you own a new territory spot around the outer loop of the board you may choose to lose that and can stay in the middle and try the endgame again.`;

export default function LoreScreen({ onContinue }) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4 sm:p-6 md:p-8 overflow-y-auto bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${rulesBackground})`,
        minHeight: '100vh',
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-xl md:max-w-2xl mt-9 md:mt-20 mb-4 flex justify-center"
      >
        {/* Centered lore text box, sized to sit within scroll area */}
        <div
          className="relative rounded-lg shadow-2xl p-4 sm:p-5 md:p-6 bg-[#f4e8d0]/75"
          style={{
            border: '3px solid #8b4513',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(139, 69, 19, 0.1)',
            maxHeight: '65vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Decorative inner border */}
          <div className="absolute inset-0 border-4 border-double border-amber-900/30 rounded-lg pointer-events-none" />

          {/* Scrollable content area constrained to the scroll region */}
          <div
            className="flex-1 overflow-y-auto pr-2 pt-4 md:pt-6"
            style={{ maxHeight: 'calc(65vh - 110px)' }}
          >
            {/* Title */}
            <h1
              className="text-center mb-4 md:mb-5 font-serif tracking-wider"
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)',
                color: '#7a6b5a',
                fontWeight: '500',
                letterSpacing: '0.1em',
              }}
            >
              {showRules ? 'Rules' : 'Kingdom Ruins'}
            </h1>

            {showRules ? (
              <pre
                className="whitespace-pre-wrap leading-relaxed font-serif text-left"
                style={{
                  fontSize: 'clamp(0.8rem, 1.7vw, 1rem)',
                  color: '#6b5d4a',
                  lineHeight: '1.7',
                }}
              >
                {RULES_TEXT}
              </pre>
            ) : (
              <div
                className="text-justify leading-relaxed font-serif"
                style={{
                  fontSize: 'clamp(0.875rem, 2vw, 1.2rem)',
                  color: '#6b5d4a',
                  lineHeight: '1.7',
                  fontWeight: '400',
                }}
              >
                <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                  The Kingdom of Primer has fallen due to war. Four territories have risen from the destruction and must fight to regain the Kingdom.
                </p>

                <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                  The territory of the <strong className="text-green-700">King</strong> who still has a large reserve of gold. The territory of the <strong className="text-red-700">Dragon</strong> who has a boost of army strength. The territory of the <strong className="text-blue-700">Knight</strong> who has a boost in defense strength. Finally, the territory of the <strong className="text-purple-700">Wizard</strong> who has a boost in army strength.
                </p>

                <p className="mb-3 md:mb-4 indent-6 md:indent-8">
                  Your quest is to buy the surrounding territory, strengthen your domain's defense, increase your army, acquire resources, and eventually take back Primer Castle.
                </p>

                <p className="mb-4 md:mb-6 indent-6 md:indent-8">
                  Beware, along the way you will face challenges. Neighbors will attack, resources may be lost, and your lands may be taken. It is now up to you to take back this Kingdom of Ruins and restore Primer Castle to its former glory.
                </p>
              </div>
            )}
          </div>

          {/* Buttons - sticky at bottom */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 pt-4 border-t-2 border-amber-900/20">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onContinue}
              className="px-8 py-3 font-serif font-bold text-white rounded-lg shadow-lg transition-colors"
              style={{
                background: 'linear-gradient(to bottom, #8b4513, #654321)',
                fontSize: 'clamp(0.875rem, 1.75vw, 1.125rem)',
                border: '2px solid #3d2817',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              Begin Your Quest
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRules((prev) => !prev)}
              className="px-8 py-3 font-serif font-bold text-white rounded-lg shadow-lg transition-colors"
              style={{
                background: showRules
                  ? 'linear-gradient(to bottom, #6b21a8, #4c1d95)'
                  : 'linear-gradient(to bottom, #a855f7, #7c3aed)',
                fontSize: 'clamp(0.875rem, 1.75vw, 1.125rem)',
                border: '2px solid #4c1d95',
                boxShadow: '0 4px 10px rgba(76, 29, 149, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              {showRules ? 'Back to Lore' : 'Rules'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
