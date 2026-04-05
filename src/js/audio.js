import { WAKA_DURATION } from './constants.js';
import { state } from './state.js';

export function initAudio() {
	if (state.audioCtx) return;
	state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	fetch('res/waka.mp3')
		.then(r => r.arrayBuffer())
		.then(ab => state.audioCtx.decodeAudioData(ab))
		.then(buf => { state.wakaBuffer = buf; });
}

export function playWaka() {
	if (!state.audioCtx || !state.wakaBuffer) return;
	var offset = (state.dotsEaten % 2) * WAKA_DURATION;
	var gain = state.audioCtx.createGain();
	gain.gain.value = state.muted ? 0 : state.volume * 0.3;
	gain.connect(state.audioCtx.destination);
	var src = state.audioCtx.createBufferSource();
	src.buffer = state.wakaBuffer;
	src.connect(gain);
	src.start(0, offset, WAKA_DURATION);
}
