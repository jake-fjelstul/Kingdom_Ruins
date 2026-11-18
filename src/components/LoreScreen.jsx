import React, { useState } from 'react';
import { motion } from 'framer-motion';
import rulesBackground from '../assets/rules_background.webp';

const RULES_TEXT = `🏰 KINGDOM RUINS: OFFICIAL RULEBOOK

Goal: Be the first player to unlock your territories, amass a powerful army, and survive the "Gauntlet of the Fallen" to restore Primer Castle.

I. SETUP & FACTIONS
Each player chooses a faction and starts on their respective START tile with 500 Gold.

Faction   Starting Bonus               Role
The King  Starts with +200 Gold extra  Wealth focus
The Wizard Starts with +1% Army and +1% Defense  Utility focus
The Dragon Starts with +2% Army Strength         Offensive focus
The Knight Starts with +2% Defense Strength      Defensive focus

Each player will roll: the lowest roll goes first. Ties re-roll.

II. THE GOLD ECONOMY
Gold is the fuel of your conquest. Use it for the following actions:
● Unlock Gateway: Your quadrant has two inner green territories. The first costs 750 Gold, the second 1250 Gold.
● New Territory Spot: Buy an outer territory when you land on it. Prices run from 200 Gold (Moss Ward) to 400 Gold (Black Spire).
● Tribute: If you land on an opponent's outer territory you must pay its tribute (50–200 Gold) or attack it. Win the attack and the territory is yours.
● Selling: You may sell a territory on your turn for half its price (outer 100–200 Gold, inner 375 or 625 Gold).
● Bribe: Pay 100 Gold during a battle (before the dice are rolled) to add +1 to your total (Max +3 per battle).
● Rebuild the Castle: Pay 500 Gold to the Treasury once you enter the Blue Ruin Zone.
● Debts: If you owe more than you have (tribute, a lost battle), you pay what you have and the rest is forgiven.
● Bank Debt: The "bank is coming" penalty puts you 300 Gold in debt. Until it is repaid, all Gold you earn goes to the bank, and landing on a Resource space lets you pay from your treasury (instead of drawing a card).

III. MOVEMENT & NAVIGATION
Players move clockwise around the outer loop using two dice.
● Standard Move: Roll and move. If you land on a Card space, draw from that deck.
● The Vanguard Jump (Cut-through): If you start your turn on your own START tile, you may spend 100 Gold instead of rolling to "warp" directly to any outer territory spot you don't own.
  ○ An unclaimed spot can be bought as usual.
  ○ If that territory is owned by an opponent, an immediate Tactical Clash begins. The defending player gets an added +1 to their total. Win, and the territory is yours.
● Territory Access: You can only enter the inner green squares of your quadrant once you have paid the Unlock Gateway fee.
● Income: Every time you pass your own START you collect 100 Gold, plus 100 Gold for each outer territory you own. Each inner territory you own also gives you +1 Army or +1 Defense (chosen when it is purchased; it cannot be changed).
● Doubles: If the player rolls doubles they get to roll again for a second turn, but only once per turn session.

IV. THE TACTICAL CLASH (COMBAT)
Combat occurs when two players land on the same space, when a player attacks an owned territory, or when a Vanguard Jump lands on an opponent's territory.
● Nearby attack: At the start of your turn, if an opponent is 1–3 spaces ahead of you, you may attack them instead of rolling. You move to their space and the clash proceeds as usual. You may also attack after you move. Choosing "Skip" lets you roll normally.

Bribes/Pot: When players bribe, that money goes into the pot; whoever wins the battle gets the pot.

The Battle Formula:
Total Power = (2d6 roll) + (Army or Defense %) + (Gold Bribes)
● Attacker uses Army %.
● Defender uses Defense %.
● A Tactical Clash (Vanguard Jump, Gauntlet) uses Army + Defense for both sides.
● All ties require a reroll.
● Outcome: The loser pays the winner Gold equal to the difference ×10. If the winner wins by 5 or more (a Decisive Victory), they also take 1 point of the loser's stronger stat (Army or Defense).

V. TRUCES
Some cards stop attacks between players. "A truce is sworn" (Fate): you and the chosen player cannot attack each other for your next 3 turns. "Rival kingdom" (Resource): you cannot attack the chosen player for 2 turns.
While a truce stops you, you can't make nearby or territory attacks on that player, and landing on their space or their START is peaceful.

VI. FATE & PENALTY CARDS
Most cards are used immediately. Some Fate cards may be kept and used later on your turn to help you.
A Penalty card you draw always applies to you.
Kept cards may be offered to another player for 100 Gold; the buyer can accept or decline.

VII. THE ENDGAME: RESTORING PRIMER
To initiate the winning sequence, you must meet the Entry Requirements:
1. Own both of your inner territories.
2. Have at least 10% total combined stats (Army + Defense).
3. Have at least 500 Gold (to pay for the rebuild).

Step 1: Entering the Ruins
At the start of your turn (instead of rolling), move your piece into the Blue Ruin Zone and pay the 500 Gold Rebuild Fee to the Treasury.

Step 2: The Gauntlet of the Fallen
Once you are in the center, you are the "Target." Every other player gets to initiate one final attack against you, regardless of where they are on the board.
● The Gauntlet: You must resolve a Tactical Clash against every player. Every player combines their Army and Defense against your Army and Defense points. The realm rallies against a would-be ruler: each challenger adds +4 in a 2-player game, +3 with 3 players, or +2 with 4 players. There is no limit on the amount of bribes you can use (100 Gold for 1 bonus point).
● Victory: If you defeat the challengers, the kingdom is restored. YOU WIN! All ties require a reroll.
● Defeat: If you lose a clash, your restoration fails — unless you pay for another chance:
  ○ If you own an outer territory, you may give one up to stay in the center and try the Gauntlet again from the first challenger.
  ○ Otherwise (or if you decline), you are kicked out of the Blue Zone back to your START tile, you lose 1 inner territory (it becomes "Locked" again and must be re-purchased), and your turn ends.`;

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
