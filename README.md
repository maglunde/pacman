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
- **2-player ghost** — control one ghost manually while AI controls the rest

## Leaderboard

Scores are submitted to a global leaderboard after each game. AI runs are submitted automatically under the personality name (e.g. `AI:BALANCED`).

## Controls

| Key | Action |
|---|---|
| Arrow keys | Move Pac-Man |
| `P` | Pause |
| `M` | Mute |
| `,` / `.` | Speed down/up |
| `Esc` | Pause menu / back |

## Stack

Vite · React 19 · Vanilla JS · Sass · Supabase
