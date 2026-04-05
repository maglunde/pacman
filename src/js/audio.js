import { WAKA_DURATION } from './constants.js';
import { state } from './state.js';

const AUDIO_FILES = [
	{ key: 'beginning',       url: 'res/pacman_beginning.wav' },
	{ key: 'chomp',           url: 'res/waka.mp3' },
	{ key: 'death',           url: 'res/pacman_death.wav' },
	{ key: 'eatfruit',        url: 'res/pacman_eatfruit.wav' },
	{ key: 'eatghost',        url: 'res/pacman_eatghost.wav' },
	{ key: 'extrapac',        url: 'res/pacman_extrapac.wav' },
	{ key: 'intermission',    url: 'res/pacman_intermission.wav' },
	{ key: 'fright',          url: 'res/fright.wav' },
	{ key: 'fright_firstloop', url: 'res/fright_firstloop.wav' },
	{ key: 'eyes',            url: 'res/eyes.wav' },
	{ key: 'eyes_firstloop',  url: 'res/eyes_firstloop.wav' }
];

export function initAudio() {
	if (state.audioCtx) return;
	state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	
	AUDIO_FILES.forEach(file => {
		fetch(file.url)
			.then(r => r.arrayBuffer())
			.then(ab => state.audioCtx.decodeAudioData(ab))
			.then(buf => {
				state.audioBuffers[file.key] = buf;
				if (file.key === 'beginning' && state.pendingBeginning) {
					playBeginning();
				}
			})
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

// ── Looping music ─────────────────────────────────────────────────────────────

const LOOP_PRIORITY = { eyes: 2, fright: 1 };

function loopPriority(trackKey) {
	return LOOP_PRIORITY[trackKey] || 0;
}

function stopLoopNodes() {
	if (!state.loopNodes) return;
	try { state.loopNodes.intro.stop(); } catch (e) {}
	try { state.loopNodes.loop.stop();  } catch (e) {}
	state.loopNodes = null;
}

function playLoopingTrack(introKey, loopKey) {
	stopLoopNodes();
	if (!state.audioCtx || !state.audioBuffers[introKey] || !state.audioBuffers[loopKey]) return;
	if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

	const gain = state.audioCtx.createGain();
	gain.gain.value = state.muted ? 0 : state.volume;
	gain.connect(state.audioCtx.destination);

	const introSrc = state.audioCtx.createBufferSource();
	introSrc.buffer = state.audioBuffers[introKey];
	introSrc.connect(gain);

	const loopSrc = state.audioCtx.createBufferSource();
	loopSrc.buffer = state.audioBuffers[loopKey];
	loopSrc.loop = true;
	loopSrc.connect(gain);

	const introDuration = state.audioBuffers[introKey].duration;
	const now = state.audioCtx.currentTime;
	introSrc.start(now);
	loopSrc.start(now + introDuration);

	state.loopNodes = { intro: introSrc, loop: loopSrc, gain };
}

export function startFright() {
	if (state.activeLoopTrack && loopPriority(state.activeLoopTrack) >= loopPriority('fright')) return;
	state.activeLoopTrack = 'fright';
	playLoopingTrack('fright_firstloop', 'fright');
}

export function startEyes() {
	if (state.activeLoopTrack === 'eyes') return;
	state.activeLoopTrack = 'eyes';
	playLoopingTrack('eyes_firstloop', 'eyes');
}

export function stopLoopingMusic() {
	stopLoopNodes();
	state.activeLoopTrack = null;
}

export function updateLoopVolume() {
	if (!state.loopNodes) return;
	state.loopNodes.gain.gain.value = state.muted ? 0 : state.volume;
}

export function playWaka() {
	// Reusing the waka/chomp rhythm logic
	const offset = (state.dotsEaten % 2) * WAKA_DURATION;
	playBuffer('chomp', .4, offset, WAKA_DURATION);
}

export function playBeginning() {
	if (state.audioBuffers['beginning']) {
		state.pendingBeginning = false;
	}
	playBuffer('beginning');
}

export function playDeath() {
	playBuffer('death', 0.7);
}

export function playEatFruit() {
	playBuffer('eatfruit');
}

export function playEatGhost() {
	playBuffer('eatghost', 0.5);
}

export function playExtraPac() {
	playBuffer('extrapac');
}

export function playIntermission() {
	playBuffer('intermission');
}
