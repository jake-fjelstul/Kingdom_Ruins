# Kingdom Ruins

A multiplayer turn-based board game web application built with React, Tailwind CSS, and Framer Motion.

## Features

- **2-4 Player Support**: Choose the number of players at game start
- **Four Unique Factions**: King, Dragon, Knight, and Wizard, each with unique starting bonuses
- **Turn-Based Gameplay**: Roll dice, move around the perimeter track, and trigger space actions
- **Card System**: Six different card decks (Resource, Army, Defense, Fate, Penalty, New Territory)
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

1. **Setup**: Choose the number of players (2-4) and click "Start Game"
2. **Your Turn**: 
   - Click "Roll Dice" to move your token
   - Land on spaces to trigger actions:
     - **Card Spaces**: Draw and apply card effects
     - **New Territory**: Purchase, pay tribute, or attack
3. **Card Effects**: Cards modify your Gold, Army Strength, or Defense Strength
4. **Territories**: Own territories to generate income and control the board
5. **Winning**: Be the first to control Primer Castle in the center!

## Game Components

### Factions
- **King**: Starts with 500 Gold
- **Dragon**: Starts with +5% Army Strength
- **Knight**: Starts with +5% Defense Strength  
- **Wizard**: Starts with +5% Army Strength

### Board Spaces
- **Resource Card**: Draw from Resource deck (gain Gold)
- **Army Card**: Draw from Army deck (increase Army Strength)
- **Defense Card**: Draw from Defense deck (increase Defense Strength)
- **Fate Card**: Draw from Fate deck (miscellaneous positive effects)
- **Penalty Card**: Draw from Penalty deck (negative effects)
- **New Territory**: Opportunity to purchase or interact with territories

### Card Decks
All decks are located in the central "Primer Castle" area:
- **Resource Deck** (Light Green): Provides Gold
- **Army Deck** (Bright Green): Increases Army Strength
- **Defense Deck** (Blue): Increases Defense Strength
- **Fate Deck** (White/Pink): Positive events
- **Penalty Deck** (Orange/Yellow): Negative events
- **New Territory Deck** (Dark Green): Territory deeds

## Project Structure

```
src/
├── components/
│   ├── CardModal.jsx          # Modal for displaying drawn cards
│   ├── CardDeckZone.jsx       # Visual representation of card decks
│   ├── Dice.jsx               # Dice rolling component
│   ├── GameBoard.jsx          # Main game board with perimeter track
│   ├── GameSetup.jsx          # Initial game setup screen
│   ├── PlayerToken.jsx        # Animated player tokens
│   └── PlayerTreasury.jsx     # Player stats and actions HUD
├── context/
│   └── GameContext.jsx         # Game state management
├── App.jsx                    # Main app component
├── main.jsx                   # Entry point
└── index.css                  # Global styles
```

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

### Replacing Card Images
The game currently uses placeholder text for cards. To add images:
1. Add your card images to a `public/cards/` directory
2. Update the card objects to include an `image` property
3. Modify `CardModal.jsx` to display the image

## License

This project is open source and available for personal use.
