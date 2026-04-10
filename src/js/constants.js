export var TILE                    = 16;
export var SPEED                   = 0.8;
export var PACMAN_DOT_SPEED_FACTOR = 0.9;  // Pac-Man slows on dot tiles
export var GHOST_SPEED             = 0.68;
export var SCARED_DURATION         = 1000;
export var SCARED_FLASH_THRESHOLD  = 200;  // Frames left when scared ghost starts flashing
export var WAKA_DURATION           = 0.155;
export var SPEED_MIN               = 0.25;
export var SPEED_MAX               = 8.0;

// State-machine durations (frames)
export var DEAD_STATE_FRAMES        = 120;
export var RESULT_STATE_FRAMES      = 180; // Win + gameover hold
export var GHOST_EATEN_FREEZE_FRAMES = 120;
export var GHOST_REGEN_DELAY        = 300; // Frames in house before re-release after returning

// Ghost initial release delays (frames)
export var PINKY_RELEASE_DELAY  = 300;
export var INKY_RELEASE_DELAY   = 600;
export var CLYDE_RELEASE_DELAY  = 900;

// Cherry
export var CHERRY_DOT_THRESHOLD    = 70;   // Dots eaten before cherry appears
export var CHERRY_DURATION         = 1000; // Frames cherry stays on board
export var CHERRY_FLASH_THRESHOLD  = 150;  // Frames left when fruit starts flashing (~2.5s at 60fps)
export var FRUIT_SPAWN_COL         = 13;
export var FRUIT_SPAWN_ROW         = 17;
export var CHERRY_POINTS           = 100;
export var STRAWBERRY_POINTS       = 300;
export var ORANGE_POINTS           = 500;
export var PRETZEL_POINTS          = 700;
export var APPLE_POINTS            = 1000;
export var PEAR_POINTS             = 3000;
export var BANANA_POINTS           = 5000;

// HUD
export var LIFE_ICON_SPACING = 28; // Pixels between life icons in HUD

// Wall detection
export var WALL_BRIGHTNESS_THRESHOLD = 80; // Pixel brightness sum above which a pixel is a wall

export var dir = { none: -1, left: 0, up: 1, right: 2, down: 3 };

export var MAPS = [
	{
		name:        'PAC-MAN',
		spriteSheet: 'pacman',
		sprite:      { x: 0, y: 4, w: 450, h: 496 },
		scale:       1,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:23 }, { col:26,row:23 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN',
		// empty board (no pre-drawn dots) — 8px/tile, scaled 2x → same 28×31 grid
		// the dotted version (0,0,225,248) has yellow dots that trick wall detection
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 0, w: 225, h: 248 },
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN 2',
		// empty board at y=247 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 248, w: 224, h: 248},
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:4 }, { col:26,row:4 }, { col:1,row:26 }, { col:26,row:26 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN 3',
		// empty board at y=496 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 496, w: 225, h: 248 },
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:20 }, { col:26,row:20 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN 4',
		// empty board at y=4744 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 744, w: 225, h: 248 },
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN 5',
		// empty board at y=992 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 992, w: 225, h: 248 },
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:23 }, { col:26,row:23 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
	{
		name:        'MS PAC-MAN 6',
		// empty board at y=1240 — 8px/tile, scaled 2x → same 28×31 grid
		spriteSheet: 'mspacman',
		sprite:      { x: 228, y: 1240, w: 225, h: 248 },
		scale:       2,
		pacmanStart: { col: 13, row: 23 },
		bigDots:     [{ col:1,row:3 }, { col:26,row:3 }, { col:1,row:27 }, { col:26,row:27 }],
		ghostHouse:  { rowMin:12, rowMax:15, colMin:11, colMax:16 },
		door:        { row:11, colMin:12, colMax:15 },
	},
];

// Scatter/chase cycle: alternating durations in frames (even idx = scatter, odd = chase).
// Last entry is Infinity so the final chase phase never ends.
export var SCATTER_CHASE_PHASES = [420, 1200, 420, 1200, 300, 1200, 300, Infinity];

export var AI_PERSONALITIES = {
	coward:     { fleeAt: 5, look: 20, trapDepth: 16, pelletCluster: 8, safetyMargin: 2, huntScared: false, label: 'Coward'     },
	balanced:   { fleeAt: 3, look: 15, trapDepth: 12, pelletCluster: 6, safetyMargin: 1, huntScared: true,  label: 'Balanced'   },
	aggressive: { fleeAt: 2, look: 10, trapDepth:  8, pelletCluster: 4, safetyMargin: 0, huntScared: true,  label: 'Aggressive' },
	greedy:     { fleeAt: 3, look: 12, trapDepth: 10, pelletCluster: 5, safetyMargin: 1, huntScared: true,  label: 'Greedy'     },
};
export var AI_PERSONALITY_KEYS = ['coward', 'balanced', 'aggressive', 'greedy'];

export var COLORS = {
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
