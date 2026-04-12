# Pac-Man

Classic Pac-Man in the browser. Vanilla JS + Canvas, React for UI overlays.

## Play

[maglunde.github.io/pacman](https://maglunde.github.io/pacman)

## Run locally

```bash
npm install
npm run dev
```

## Testing

```bash
npm run test:unit
npm run test:e2e
npm test
```

- `Vitest` covers game state transitions, menu actions, overlay routing, and responsive scaling logic.
- `Playwright` covers the main menu, settings, leaderboard, AI personality menu, pause overlay, in-game settings, win notice, game-over submit flow, gameplay start, and mobile menu scaling.

## Modes

- **Play** — classic Pac-Man with arrow keys
- **Watch AI** — AI agent with selectable personality (Coward, Balanced, Aggressive, Greedy)
- **Control ghost** — Pac-Man on arrow keys, ghost on WASD; or take over a ghost from the AI with arrow keys (Tab to select, Enter to take over)

## Leaderboard

Scores are submitted to a global leaderboard after each game. AI runs are submitted automatically under the personality name (e.g. `AI:BALANCED`).

## Stack

Vite · React 19 · Vanilla JS · Sass · Supabase
