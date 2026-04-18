import React, { useEffect, useState } from 'react';
import { quitToMenu, saveUsername } from '../../game/menu.js';
import { submitScore } from '../../lib/scores.js';
import { preloadTurnstile } from '../../lib/turnstile.js';
import { AI_PERSONALITIES, AI_PERSONALITY_KEYS } from '../../game/constants.js';
import { ModalShell } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';
import '../styles/GameOverOverlay.scss';

export function GameOverOverlay({ snapshot }) {
	const [name, setName]             = useState(snapshot.username || '');
	const [submitted, setSubmitted]   = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError]           = useState(null);

	const ready = snapshot.stateTimer <= 0;
	const aiName = getAiDisplayName(snapshot.aiPersonalityIdx);

	useEffect(function() {
		preloadTurnstile().catch(function() {
			// Ignore preload failures; submit keeps the real error handling.
		});
	}, []);

	useEffect(function() {
		if (!ready || !snapshot.aiMode || submitted || submitting) return;
		submitScore({
			displayName: aiName,
			score:       snapshot.score,
			level:       snapshot.level,
			token:       snapshot.sessionToken,
		})
			.then(function() { setSubmitted(true); })
			.catch(function(err) { setError(err?.message || 'SUBMIT FAILED'); });
	}, [aiName, ready, snapshot.aiMode, snapshot.level, snapshot.score, snapshot.sessionToken, submitted, submitting]);

	useEffect(function() {
		if (!snapshot.aiMode || !ready) return;
		function onKey(e) {
			if (e.key === 'Enter') {
				e.stopPropagation();
				quitToMenu();
			}
		}
		document.addEventListener('keydown', onKey, true);
		return function() { document.removeEventListener('keydown', onKey, true); };
	}, [snapshot.aiMode, ready]);

	async function handleSubmit() {
		if (!name.trim() || submitting) return;
		setSubmitting(true);
		setError(null);
		let displayName = name.trim();
		saveUsername(displayName);

		let submitPromise = submitScore({
			displayName,
			score: snapshot.score,
			level: snapshot.level,
			token: snapshot.sessionToken,
		}).catch(function(err) {
			console.error('Background score submit failed', err);
		});

		await Promise.race([
			submitPromise,
			new Promise(function(resolve) {
				window.setTimeout(resolve, 500);
			}),
		]);

		quitToMenu();
	}

	if (snapshot.aiMode) {
		return (
			<ModalShell testId="gameover-modal">
				<div className="retro-panel retro-panel--modal">
					<div className="gameover-title">GAME OVER</div>
					<div className="gameover-score">SCORE: {snapshot.score}</div>
					{ready && (
						<div className="gameover-submit">
							{submitted && <div className="gameover-label">SAVED AS <span className="gameover-name">{aiName}</span></div>}
							{error && <div className="gameover-error">{error}</div>}
							<MenuButton label="RETURN TO MENU" active={true} onClick={quitToMenu} />
						</div>
					)}
				</div>
			</ModalShell>
		);
	}

	return (
		<ModalShell testId="gameover-modal">
			<div className="retro-panel retro-panel--modal">
				<div className="gameover-title">GAME OVER</div>
				<div className="gameover-score">SCORE: {snapshot.score}</div>

				{ready && !submitted && (
					<div className="gameover-submit">
						<div className="gameover-label">ENTER NAME</div>
						<input
							className="gameover-input"
							type="text"
							maxLength={16}
							value={name}
							onChange={function(e) { setName(e.target.value); }}
							onKeyDown={function(e) {
								e.stopPropagation();
								if (e.key === 'Enter') handleSubmit();
							}}
							autoFocus
							spellCheck={false}
							autoComplete="off"
						/>
						{error && <div className="gameover-error">{error}</div>}
						<div className="gameover-actions">
							<MenuButton
								label={submitting ? 'SUBMITTING...' : 'SUBMIT'}
								active={true}
								onClick={handleSubmit}
							/>
							<MenuButton
								label="SKIP"
								active={false}
								onClick={handleSkip}
							/>
						</div>
					</div>
				)}

				{ready && submitted && (
					<div className="gameover-label">SAVED!</div>
				)}
			</div>
		</ModalShell>
	);

	function handleSkip() {
		quitToMenu();
	}
}

function getAiDisplayName(aiPersonalityIdx) {
	const personalityKey = AI_PERSONALITY_KEYS[aiPersonalityIdx];
	const personalityLabel = AI_PERSONALITIES[personalityKey]?.label || personalityKey;
	return 'AI:' + personalityLabel;
}
