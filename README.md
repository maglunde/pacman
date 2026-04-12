# Pac-Man

Classic Pac-Man in the browser. Vanilla JS + Canvas, React for UI overlays.

## Play

[maglunde.github.io/pacman](https://maglunde.github.io/pacman)

## Run locally

```bash
npm install
npm run dev
```

## Modes

- **Play** — classic Pac-Man with arrow keys
- **Watch AI** — AI agent with selectable personality (Coward, Balanced, Aggressive, Greedy)
- **2-player** — one player controls Pac-Man with arrow keys, another controls a ghost with WASD (Tab to select, Enter to take over)

## Leaderboard

Scores are submitted to a global leaderboard after each game. AI runs are submitted automatically under the personality name (e.g. `AI:BALANCED`).

## Stack

Vite · React 19 · Vanilla JS · Sass · Supabase
