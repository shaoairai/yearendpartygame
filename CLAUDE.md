# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure frontend collection of 5 lottery/raffle games for year-end parties (尾牙). No backend required - just open HTML files in browser. All data persists via localStorage.

## Development

No build system - static HTML/CSS/JS files. To develop:
1. Open `index.html` in browser, or
2. Use any local server (e.g., `npx serve`, VS Code Live Server)

No tests, linting, or compilation steps.

## Architecture

### File Structure
- `index.html` - Main menu linking to all 5 games
- `assets/css/global.css` - Shared CSS variables, components, utilities
- `assets/js/utils.js` - `LuckyUtils` module with shared functionality
- `games/{game}/` - Each game has `index.html`, `style.css`, `app.js`

### LuckyUtils Module (`assets/js/utils.js`)
All games depend on this IIFE module exposing:
- **localStorage**: `getData()`, `setData()`, `removeData()`
- **Import/Export**: `exportJSON()`, `importJSONFromFile()`, `validateImportData()`
- **Random**: `randomPick()`, `weightedRandomPick()`, `shuffle()`
- **DOM**: `$()`, `$$()`, `createElement()`
- **UI**: `showToast()`, `formatTime()`, `addLog()`, `getLogs()`

### Game State Pattern
Each game follows the same state management pattern:
```javascript
const STORAGE_KEY = 'LUCKY_{GAME}_V1';
const DEFAULT_DATA = { version: VERSION, pool: [], drawn: [], ... };
let state = null;

function loadState() {
  state = LuckyUtils.getData(STORAGE_KEY, DEFAULT_DATA);
}
function saveState() {
  LuckyUtils.setData(STORAGE_KEY, state);
}
```

### CSS Design System
Uses CSS custom properties defined in `global.css`:
- Colors: `--primary`, `--success`, `--warning`, `--danger`, `--gray-*`
- Spacing: `--space-xs` through `--space-xl`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Radius: `--radius-sm` through `--radius-xl`

All visual elements are pure CSS (no images/SVG). Graphics include wheels, lottery jars, gacha machines, slot machines, scratch cards.

### Games
1. **Wheel** (`games/wheel/`) - Canvas-based spinning wheel with high DPI support
2. **Picker** (`games/picker/`) - Lottery stick jar with CSS animations
3. **Gacha** (`games/gacha/`) - Capsule machine with drop animations
4. **Slot** (`games/slot/`) - 3-reel slot with pool/weight modes
5. **Scratch** (`games/scratch/`) - Canvas scratch-off cards

## Key Implementation Notes

- **High DPI Canvas**: Wheel game uses `devicePixelRatio` for sharp text on Retina displays
- **Z-index Animations**: Picker uses z-index transitions in keyframes to animate stick from behind jar to front
- **Two Draw Modes**: Most games support "draw person" vs "draw prize" with toggle
- **Undo Support**: Games track `lastDrawn` to enable single-step undo
- **JSON Import/Export**: Each game validates version string on import
