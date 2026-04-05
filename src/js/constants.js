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
export var CHERRY_DOT_THRESHOLD = 70;   // Dots eaten before cherry appears
export var CHERRY_DURATION      = 1000;  // Frames cherry stays on board

// HUD
export var LIFE_ICON_SPACING = 28; // Pixels between life icons in HUD

// Wall detection
export var WALL_BRIGHTNESS_THRESHOLD = 80; // Pixel brightness sum above which a pixel is a wall

export var dir = { none: -1, left: 0, up: 1, right: 2, down: 3 };

export var GHOST_HOUSE_ROW_MIN = 12;
export var GHOST_HOUSE_ROW_MAX = 15;
export var GHOST_HOUSE_COL_MIN = 11;
export var GHOST_HOUSE_COL_MAX = 16;
export var DOOR_ROW     = 11;
export var DOOR_COL_MIN = 12;
export var DOOR_COL_MAX = 15;

export var BIG_DOT_POSITIONS = [
	{ col: 1,  row: 3  },
	{ col: 26, row: 3  },
	{ col: 1,  row: 23 },
	{ col: 26, row: 23 }
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
