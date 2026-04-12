import { TICKS_PER_SECOND } from './constants.js';

// Single mutable game state object shared across all modules.
// Each property is mutated in-place; never replace the object itself.
export const state = {
	// Canvas / rendering
	canvas:    null,
	ctx:       null,
	sceneEl:   null,
	engineStarted: false,
	engineReady: false,
	width:     0,
	height:    0,
	img:       null,
	mspacImg:  null,
	mapPixels: null,
	mapOffX:   0,
	mapOffY:   0,
	mapScaledW: 0,
	mapScaledH: 0,

	// Active map config (set from MAPS[mapIdx] before any init functions run)
	mapIdx:    0,
	activeMap: null,
	playerSpriteSheet: null,

	// Grid dimensions (set after sprite sheet is loaded)
	GRID_COLS: 0,
	GRID_ROWS: 0,
	grid:      null,

	// Dots
	dots:                null,
	bigDots:             null,
	dotsEaten:           0,
	fruitDotsSinceSpawn: 0,

	// Entities
	pacman: null,
	ghosts: null,

	// Timers
	scaredTimer:           0,
	ghostEatenFreezeTimer: 0,
	scatterPhase:          0,   // index into SCATTER_CHASE_PHASES; even = scatter, odd = chase
	scatterTimer:          420, // frames left in current phase

	// Scoring
	score:               0,
	lastExtraLifeScore:  0,
	highScore:           parseInt(localStorage.getItem('pacman-hi')    || '0'),
	username:            localStorage.getItem('pacman-username') || '',
	lives:       3,
	level:       1,
	ghostCombo:  0,
	stateTimer:  0,
	cherry:      null,
	scorePopups: [],

	// Game flow
	gameState:    'menu', // 'menu'|'ready'|'playing'|'dead'|'gameover'|'win'
	paused:       false,
	aiMode:       false,
	menuSelected: 0,
	menuSubState: 'main', // 'main' | 'personality' | 'settings' | 'leaderboard'
	aiPersonalityIdx: 1,
	selectedGhostIdx:      -1,  // ghost highlighted for takeover in AI mode (-1 = none)
	controlledGhostIdx:    -1,  // ghost currently player-controlled (-1 = AI controls all)
	ghostIndicatorStyle:    0,  // 0=arrow  1=dashed-square  2=corners  3=glow
	indicatorStyleBounds:  null, // hit-test bounds for indicator picker clicks
	escapeMenuActive:      false,
	escapeMenuSelected:    0,
	settingsOverlayActive: false,
	settingsRow:           0,    // 0=speed  1=volume  2=map  3=back
	personalityRow:        0,    // 0=selector  1=back
	menuStartFrame:        -1,   // state.frames value when menu was last entered

	// Audio
	audioCtx:      null,
	audioBuffers:  {},
	volume:        parseFloat(localStorage.getItem('pacman-vol')   || '0.5'),
	muted:         localStorage.getItem('pacman-muted') === '1',
	gameSpeed:     parseFloat(localStorage.getItem('pacman-speed') || '1'),
	get effectiveSpeed() { return this.gameSpeed * 2 * (60 / TICKS_PER_SECOND); },
	pendingBeginning: false,
	activeLoopTrack: null,  // 'fright' | 'eyes' | null
	loopNodes:       null,  // { intro: AudioBufferSourceNode, loop: AudioBufferSourceNode, gain: GainNode }

	// Animation counters
	frames: 0,
	frame:  0,

	// AI debug paths
	aiPath: [],

	// Debug panel
	showPaths:     { pacman: false, blinky: false, pinky: false, inky: false, clyde: false },
	showInfoPanel: false,

	// Slider hit-test bounds (set each frame by drawHUD)
	volTrackBounds:   null,
	volIconBounds:    null,
	draggingVolume:   false,
	speedTrackBounds: null,
	speedIconBounds:  null,
	draggingSpeed:    false,

	// Setting toast (center-screen flash when speed/volume changes)
	settingToast: { text: '', timer: 0 },
};
