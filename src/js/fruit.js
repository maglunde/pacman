import {
	CHERRY_POINTS,
	STRAWBERRY_POINTS,
	ORANGE_POINTS,
	PRETZEL_POINTS,
	APPLE_POINTS,
	PEAR_POINTS,
	BANANA_POINTS
} from './constants.js';
import {
	s_cherry,
	s_strawberry,
	s_orange,
	s_pretzel,
	s_apple,
	s_pear,
	s_banana
} from './sprite.js';

let FRUIT_DEFS = [
	{ key: 'cherry', points: CHERRY_POINTS, sprite: function() { return s_cherry; } },
	{ key: 'strawberry', points: STRAWBERRY_POINTS, sprite: function() { return s_strawberry; } },
	{ key: 'orange', points: ORANGE_POINTS, sprite: function() { return s_orange; } },
	{ key: 'pretzel', points: PRETZEL_POINTS, sprite: function() { return s_pretzel; } },
	{ key: 'apple', points: APPLE_POINTS, sprite: function() { return s_apple; } },
	{ key: 'pear', points: PEAR_POINTS, sprite: function() { return s_pear; } },
	{ key: 'banana', points: BANANA_POINTS, sprite: function() { return s_banana; } }
];

export function getAvailableFruits(level) {
	let fruitCount = Math.max(1, Math.min(level, FRUIT_DEFS.length));
	return FRUIT_DEFS.slice(0, fruitCount);
}
