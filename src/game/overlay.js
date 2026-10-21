import { state } from './state.js';
import { resumeAudio } from './audio.js';

// The game stays paused while any in-game modal is open: pause menu, settings (which can sit on
// top of the pause menu) or back-confirm. Call this after closing one of them; it only resumes
// play and audio when no other modal is left on screen.
export function resumeUnlessOverlayOpen() {
	state.paused = state.escapeMenuActive || state.settingsOverlayActive || state.backConfirmActive;
	if (!state.paused) resumeAudio();
}
