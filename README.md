# Kingdom Ruins

A multiplayer turn-based board game web application built with React, Tailwind CSS, and Framer Motion.

## Features

- **2-4 Player Support**: Choose the number of players at game start
- **Four Unique Factions**: King, Dragon, Knight, and Wizard, each with unique starting bonuses
- **Turn-Based Gameplay**: Roll dice, move around the perimeter track, and trigger space actions
- **Card System**: Five card decks (Resource, Army, Defense, Fate, Penalty)
- **AI Opponents**: Any seat can be played by the computer
- **Territory Management**: Purchase territories, pay tribute, or attack to claim them
- **Combat System**: Battle mechanics using Army Strength vs Defense Strength
- **Animated UI**: Smooth animations for dice rolls and player movement using Framer Motion

## Technology Stack

- **React.js**: Frontend framework
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Vite**: Build tool and dev server
- **React Context API**: State management

## Installation

### Quick Start (Recommended)

Run the provided script for a clean install and start:

```bash
./run.sh
```

This will:
- Clean any existing dependencies
- Install all required packages
- Start the development server

### Manual Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)

## How to Play

1. **Setup**: Choose 2–4 players, pick factions, and mark any seats as AI. Players roll; the **lowest** roll goes first.
2. **Your Turn** — do one of these:
   - **Roll** the dice and move clockwise. Doubles give one extra roll per turn.
   - **Attack** an opponent 1–3 spaces ahead (instead of rolling). Press *Skip Attack* to roll instead.
   - **Vanguard Jump**: standing on your own START, pay 100 Gold to warp to any outer territory you don't own.
   - Before any of these, you may **Challenge the House** once: bet 100/250/500 Gold (win 2× from the House Vault, lose 2× into it; the House wins ties) or try a **Vault Heist** for the whole vault (lose half your Gold and 1 Army).
3. **Landing**:
   - **Card spaces**: draw from that deck. Penalties you draw always apply to you; some Fate cards can be kept.
   - **New Territory**: buy it, or pay tribute / attack if an opponent owns it.
   - **START**: stay or fast travel. On an opponent's START, pay a 100 Gold bribe or fight.
4. **Income**: passing your own START pays 100 Gold, +100 per outer territory, +1% of Army or Defense per inner territory.
5. **Winning**: own both inner territories, have 10%+ combined Army and Defense and 500 Gold, then enter the Blue Ruin Zone and survive the Gauntlet against every other player. Lose a clash and you may give up one outer territory to retry once; otherwise you lose an inner territory and return to START.

The full rulebook is in the game (the **Rules** button on the lore screen).

## Game Components

### Factions
- **King**: 700 Gold (500 + 200 bonus)
- **Dragon**: 500 Gold, +2% Army
- **Knight**: 500 Gold, +2% Defense
- **Wizard**: 500 Gold, +1% Army and +1% Defense

### Board Spaces
40 perimeter spaces with a START in each corner (one per faction):
- **Resource Card**: gold and economy effects
- **Army Card**: Army Strength
- **Defense Card**: Defense Strength
- **Fate Card**: mixed effects, some keepable
- **Penalty Card**: negative effects
- **New Territory**: six purchasable outer territories (200–400 Gold)

Each faction also has two inner territories in its quadrant (750 and 1250 Gold).

### Combat
Total = 2d6 + stat + bribes (100 Gold per +1, max 3). The attacker uses Army, the defender Defense; a Tactical Clash (Vanguard Jump, Gauntlet) uses Army + Defense for both. Ties re-roll. The loser pays the difference ×10 (up to what they have); winning by 5+ also takes 1 stat point.

## Project Structure

```
src/
├── components/            # Board, dice, modals (card, combat, START, Gauntlet, card offers), HUD
├── context/
│   ├── GameContext.jsx    # Game rules: reducer, actions, card decks
│   └── gameReducer.test.js
├── hooks/
│   ├── useAITurn.js       # AI players (turn state machine, Gauntlet, card offers)
│   └── useGameBoardImages.js
├── analytics/             # Game analytics recorder
├── assets/                # WebP artwork
├── App.jsx
└── main.jsx
```

## Testing

```bash
npm test
```

Runs the Vitest suite for the game rules (`src/context/gameReducer.test.js`).

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Customization

### Adding Custom Cards
Edit the card generation functions in `src/context/GameContext.jsx`:
- `generateResourceCards()`
- `generateArmyCards()`
- `generateDefenseCards()`
- `generateFateCards()`
- `generatePenaltyCards()`
- `generateTerritoryCards()`

### Artwork
Images live in `src/assets` as WebP. To replace one, export a WebP with the same file name (for example `cwebp -q 80 input.png -o src/assets/cards/army.webp`).

## License

This project is open source and available for personal use.
