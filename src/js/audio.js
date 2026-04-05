import { WAKA_DURATION } from './constants.js';
import { state } from './state.js';

const AUDIO_FILES = [
	{ key: 'beginning',    url: 'res/pacman_beginning.wav' },
	{ key: 'chomp',        url: 'res/waka.mp3' },
	{ key: 'death',        url: 'res/pacman_death.wav' },
	{ key: 'eatfruit',     url: 'res/pacman_eatfruit.wav' },
	{ key: 'eatghost',     url: 'res/pacman_eatghost.wav' },
	{ key: 'extrapac',     url: 'res/pacman_extrapac.wav' },
	{ key: 'intermission', url: 'res/pacman_intermission.wav' }
];

export function initAudio() {
	if (state.audioCtx) return;
	state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	AUDIO_FILES.forEach(file => {
		fetch(file.url)
			.then(r => r.arrayBuffer())
			.then(ab => state.audioCtx.decodeAudioData(ab))
			.then(buf => { state.audioBuffers[file.key] = buf; })
			.catch(err => console.error('Failed to load audio:', file.url, err));
	});
}

function playBuffer(key, volumeMult = 1, offset = 0, duration) {
	if (!state.audioCtx || !state.audioBuffers[key]) return;
	
	const gain = state.audioCtx.createGain();
	gain.gain.value = state.muted ? 0 : state.volume * volumeMult;
	gain.connect(state.audioCtx.destination);
	
	const src = state.audioCtx.createBufferSource();
	src.buffer = state.audioBuffers[key];
	src.connect(gain);
	
	if (duration) {
		src.start(0, offset, duration);
	} else {
		src.start(0, offset);
	}
	return src;
}

export function playWaka() {
	// Reusing the waka/chomp rhythm logic
	const offset = (state.dotsEaten % 2) * WAKA_DURATION;
	playBuffer('chomp', 0.3, offset, WAKA_DURATION);
}

export function playBeginning() {
	playBuffer('beginning', 0.5);
}

export function playDeath() {
	playBuffer('death', 0.5);
}

export function playEatFruit() {
	playBuffer('eatfruit', 0.5);
}

export function playEatGhost() {
	playBuffer('eatghost', 0.5);
}

export function playExtraPac() {
	playBuffer('extrapac', 0.5);
}

export function playIntermission() {
	playBuffer('intermission', 0.5);
}
