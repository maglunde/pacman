export const TICKS_PER_SECOND        = 120;
export const TILE                    = 16;
export const BOARD_TILE_ROWS         = 31;
export const SPEED                   = 0.8;
export const PACMAN_DOT_SPEED_FACTOR = 0.9;  // Pac-Man slows on dot tiles
export const PACMAN_DRAW_SIZE        = 28;
export const GHOST_DRAW_SIZE         = 30;
export const FRUIT_DRAW_SIZE         = 30;
export const DOT_DRAW_SIZE           = 6;
export const BIG_DOT_DRAW_SIZE       = 18;
export const LIFE_ICON_SIZE          = 18;
export const GHOST_SPEED             = 0.68;
export const SCARED_DURATION         = 1000;
export const SCARED_FLASH_THRESHOLD  = 200;  // Frames left when scared ghost starts flashing
export const WAKA_DURATION           = 0.155;
export const SPEED_MIN               = 0.25;
export const SPEED_MAX               = 8.0;

// State-machine durations (frames)
export const DEAD_STATE_FRAMES        = 120;
export const RESULT_STATE_FRAMES      = 180; // Win + gameover hold
export const GHOST_EATEN_FREEZE_FRAMES = 120;
export const GHOST_REGEN_DELAY        = 300; // Frames in house before re-release after returning

// Ghost initial release delays (frames)
export const PINKY_RELEASE_DELAY  = 300;
export const INKY_RELEASE_DELAY   = 600;
export const CLYDE_RELEASE_DELAY  = 900;

// Fruit
export const FRUIT_DOT_THRESHOLD   = 70;   // Dots eaten before fruit appears
export const FRUIT_DURATION        = 1000; // Frames fruit stays on board
export const FRUIT_FLASH_THRESHOLD = 150;  // Frames left when fruit starts flashing (~2.5s at 60fps)
export const FRUIT_SPAWN_COL       = 13;
export const FRUIT_SPAWN_ROW       = 17;
export const CHERRY_POINTS         = 100;
export const STRAWBERRY_POINTS     = 300;
export const ORANGE_POINTS         = 500;
export const PRETZEL_POINTS        = 700;
export const APPLE_POINTS          = 1000;
export const PEAR_POINTS           = 3000;
export const BANANA_POINTS         = 5000;

// HUD
export const LIFE_ICON_SPACING = 28; // Pixels between life icons in HUD

// Wall detection
export const WALL_BRIGHTNESS_THRESHOLD = 80; // Pixel brightness sum above which a pixel is a wall

export const dir = { none: -1, left: 0, up: 1, right: 2, down: 3 };

const DEFAULT_GHOST_LAYOUT = {
	ghostExitCol: 13,
	ghostStarts: {
		blinky: {
			spawn:      { col: 13, row: 11 },
			home:       { col: 13, row: 14 },
			bounceDir:  dir.up,
			spawnExited: true
		},
		pinky: {
			spawn:      { col: 13, row: 14 },
			home:       { col: 13, row: 14 },
			bounceDir:  dir.down,
			spawnExited: false
		},
		inky: {
			spawn:      { col: 11, row: 14 },
			home:       { col: 11, row: 14 },
			bounceDir:  dir.up,
			spawnExited: false
		},
		clyde: {
			spawn:      { col: 15, row: 14 },
			home:       { col: 15, row: 14 },
			bounceDir:  dir.up,
			spawnExited: false
		}
	}
};

export const MAPS = [
	{
		name:        'PAC-MAN',
		spriteSheet: 'pacman',
		sprite:      { x: 0, y: 4, w: 450, h: 496 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:23 }, { col:26,row:23 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN',
		// empty board (no pre-drawn dots) — 8px/tile, scaled 2x → same 28×31 grid
		// the dotted version (0,0,225,248) has yellow dots that trick wall detection
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 0, w: 225, h: 248 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN 2',
		// empty board at y=247 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 248, w: 224, h: 248},
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:4 }, { col:26,row:4 }, { col:1,row:26 }, { col:26,row:26 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN 3',
		// empty board at y=496 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 496, w: 225, h: 248 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:20 }, { col:26,row:20 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN 4',
		// empty board at y=4744 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 744, w: 225, h: 248 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN 5',
		// empty board at y=992 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 992, w: 225, h: 248 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:23 }, { col:26,row:23 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
	{
		name:        'MS PAC-MAN 6',
		// empty board at y=1240 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 1240, w: 225, h: 248 },
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
		...DEFAULT_GHOST_LAYOUT,
	},
];

// Scatter/chase cycle: alternating durations in frames (even idx = scatter, odd = chase).
// Last entry is Infinity so the final chase phase never ends.
export const SCATTER_CHASE_PHASES = [420, 1200, 420, 1200, 300, 1200, 300, Infinity];

export const AI_PERSONALITIES = {
	coward:     { fleeAt: 5, look: 20, trapDepth: 16, pelletCluster: 8, safetyMargin: 2, huntScared: false, label: 'Coward'     },
	balanced:   { fleeAt: 3, look: 15, trapDepth: 12, pelletCluster: 6, safetyMargin: 1, huntScared: true,  label: 'Balanced'   },
	aggressive: { fleeAt: 2, look: 10, trapDepth:  8, pelletCluster: 4, safetyMargin: 0, huntScared: true,  label: 'Aggressive' },
	greedy:     { fleeAt: 3, look: 12, trapDepth: 10, pelletCluster: 5, safetyMargin: 1, huntScared: true,  label: 'Greedy'     },
};
export const AI_PERSONALITY_KEYS = ['coward', 'balanced', 'aggressive', 'greedy'];

export const COLORS = {
    pacman: '#ffff00',
    blinky: '#ff0000',
    pinky:  '#ffb8ff',
    inky:   '#00ffff',
    clyde:  '#ffb851',
    scared: '#2121ff', // Original Pac-Man blue
    white:  '#ffffff',
    black:  '#000000',
    gray:   '#888888',
    darkGray: '#333333',
    lightGray: '#aaaaaa',
    wall:   '#2121ff',
    target: '#00ff88',
    cyan:   '#00ccff',
    orange: '#ff8800',
    overlay: 'rgba(0, 0, 0, 0.6)',
    dim:     'rgba(0, 0, 0, 0.5)',
    panel:   'rgba(0, 0, 0, 0.75)',
    path: {
        pacman: 'rgba(255,255,0,0.5)',
        ghost:  'rgba(255,255,255,0.45)',
        target: 'rgba(0, 255, 136, 0.5)'
    }
};
