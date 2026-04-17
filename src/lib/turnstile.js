// Cloudflare Turnstile browser helper. Loads the script lazily and resolves a
// one-shot token for the current submit. When VITE_TURNSTILE_SITE_KEY is not
// configured the helper is a no-op (returns null) so local dev keeps working.
//
// The widget is rendered with appearance: 'interaction-only', which keeps it
// invisible unless Cloudflare decides a visible challenge is needed. If a
// challenge is shown the user sees a small tile in the bottom-right corner.

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;
let readyPromise  = null;

function createTurnstileError(errorCode) {
	const code = Number(errorCode);
	let message = 'Turnstile failed';

	switch (code) {
		case 110100:
		case 110110:
		case 400020:
			message = 'Turnstile site key is invalid';
			break;
		case 110200:
			message = 'Turnstile domain is not authorized for this site';
			break;
		case 110600:
		case 110620:
			message = 'Turnstile challenge timed out';
			break;
		case 200100:
			message = 'Turnstile blocked by browser clock or cache';
			break;
		case 200500:
			message = 'Turnstile iframe failed to load';
			break;
		case 400070:
			message = 'Turnstile site key is disabled';
			break;
		default:
			if (Math.floor(code / 1000) === 300 || Math.floor(code / 1000) === 600) {
				message = 'Turnstile rejected the browser challenge';
			} else if (Number.isFinite(code) && code > 0) {
				message = 'Turnstile failed (' + code + ')';
			}
			break;
	}

	const err = new Error(message);
	err.turnstileCode = Number.isFinite(code) ? code : null;
	return err;
}

export function turnstileEnabled() {
	return Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
}

function loadScript() {
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise(function(resolve, reject) {
		if (typeof document === 'undefined') {
			reject(new Error('document is not available'));
			return;
		}
		const existing = document.querySelector('script[data-turnstile]');
		if (existing) { resolve(); return; }
		const s = document.createElement('script');
		s.src   = SCRIPT_URL;
		s.async = true;
		s.defer = true;
		s.dataset.turnstile = '1';
		s.onload  = function() { resolve(); };
		s.onerror = function() { reject(new Error('Failed to load Turnstile')); };
		document.head.appendChild(s);
	});
	return scriptPromise;
}

function whenReady() {
	if (readyPromise) return readyPromise;
	readyPromise = loadScript().then(function() {
		return new Promise(function(resolve) {
			if (window.turnstile?.render) { resolve(); return; }
			const id = setInterval(function() {
				if (window.turnstile?.render) {
					clearInterval(id);
					resolve();
				}
			}, 50);
		});
	});
	return readyPromise;
}

export async function getTurnstileToken() {
	if (!turnstileEnabled()) return null;
	await whenReady();

	return new Promise(function(resolve, reject) {
		const container = document.createElement('div');
		container.style.position = 'fixed';
		container.style.bottom   = '8px';
		container.style.right    = '8px';
		container.style.zIndex   = '9999';
		document.body.appendChild(container);

		let settled = false;
		let widgetId = null;
		function cleanup() {
			if (widgetId !== null) {
				try {
					window.turnstile?.remove(widgetId);
				} catch {
					// Best-effort cleanup only.
				}
			}
			setTimeout(function() {
				if (container.parentNode) container.parentNode.removeChild(container);
			}, 400);
		}

		try {
			widgetId = window.turnstile.render(container, {
				sitekey:    import.meta.env.VITE_TURNSTILE_SITE_KEY,
				appearance: 'interaction-only',
				callback:   function(token) {
					if (settled) return;
					settled = true;
					cleanup();
					resolve(token);
				},
				'error-callback': function(errorCode) {
					if (settled) return;
					settled = true;
					cleanup();
					reject(createTurnstileError(errorCode));
				},
				'expired-callback': function() {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new Error('Turnstile token expired'));
				},
				'timeout-callback': function() {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new Error('Turnstile challenge timed out'));
				},
			});
		} catch (err) {
			cleanup();
			reject(err);
		}
	});
}
