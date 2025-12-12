# PlayMesa SDK Integration Guide

> This document is optimized for AI coding assistants (Claude, Copilot, Cursor, etc.)

## Overview

PlayMesa is an educational games portal. Games are embedded in iframes and communicate with the portal via the Mesa SDK using postMessage.

## Setup

1. Copy `mesa-sdk.js` to your game's `sdk/` folder
2. Include in HTML: `<script src="sdk/mesa-sdk.js"></script>`
3. Initialize before using any SDK features:

```javascript
await window.Mesa.init();
```

## API Reference

### User

```javascript
// Check login status
if (window.Mesa.user.isLoggedIn()) {
  const user = window.Mesa.user.get();
  // user = { id: string, username: string, avatar: string | null }
}

// Get language preferences (ordered array, user prefs first, then browser)
const languages = window.Mesa.user.getLanguages();
// Returns: ['German', 'Czech', 'English', ...]
```

### Data Persistence (Cloud Saves)

```javascript
// Save data (debounced 1s)
await window.Mesa.data.setItem('progress', JSON.stringify({ level: 5 }));

// Load data
const progress = await window.Mesa.data.getItem('progress');

// Remove data
await window.Mesa.data.removeItem('progress');

// Clear all game data
await window.Mesa.data.clear();
```

### Leaderboard (requires login)

```javascript
// Submit score (higher sortValue = better)
await window.Mesa.leaderboard.submit({
  key: 'classic',           // Optional, defaults to 'default'
  playerName: 'Player One', // Required, max 50 chars
  displayValue: '18.5s',    // Required, what users see
  sortValue: 99981.5        // Required, numeric for sorting (higher = better)
});

// For time-based (lower = better), invert: sortValue = 100000 - timeInSeconds

// Get leaderboard
const board = await window.Mesa.leaderboard.get({ key: 'classic' });
// board.entries = [{ rank, playerName, displayValue, isCurrentUser }]

// Get top entries
const top = await window.Mesa.leaderboard.getTop({ key: 'classic', limit: 10 });
```

### Game Events

```javascript
window.Mesa.game.loadingEnd();     // Call when assets loaded
window.Mesa.game.gameplayStart();  // Call when gameplay begins
window.Mesa.game.gameplayStop();   // Call on pause/game over/menu
```

### Error Handling

```javascript
const result = await window.Mesa.data.setItem('key', 'value');
if (result.error) {
  console.error(`[${result.error.code}] ${result.error.message}`);
}

// Subscribe to errors
window.Mesa.on('error', (err) => {
  console.log(`Error in ${err.operation}: ${err.message}`);
});
```

### Logging

Use branded console logging to easily identify your game's output in DevTools:

```javascript
window.Mesa.log.info('Game started');       // Blue badge
window.Mesa.log.warn('Low FPS:', fps);      // Orange badge
window.Mesa.log.error('Load failed', err);  // Red badge
```

## Supported Languages

The SDK uses standard locale codes (e.g. `en_us`, `es_es`).

Supported locales:

`en_us`, `es_es`, `fr_fr`, `de_de`, `it_it`, `pt_pt`, `ru_ru`, `ja_jp`, `ko_kr`, `zh_cn`, `hi_in`, `ar_sa`, `nl_nl`, `pl_pl`, `tr_tr`, `vi_vn`, `th_th`, `sv_se`, `cs_cz`, `el_gr`, `hu_hu`, `ro_ro`, `uk_ua`, `id_id`, `ms_my`, `tl_ph`, `bn_bd`, `ta_in`, `fa_ir`

## Error Codes

- `timeout` - Request timed out
- `quota_exceeded` - Storage full
- `not_initialized` - Call Mesa.init() first
- `invalid_input` - Bad parameters
- `not_logged_in` - Login required
- `unauthorized` - Invalid session

## Local Development

When running outside PlayMesa (directly opening index.html), the SDK auto-detects this and uses localStorage for testing. A mock user "LocalDev" is provided.

## File Structure

Your game ZIP should include:
```
index.html
sdk/mesa-sdk.js
scripts/
styles/
images/
```
