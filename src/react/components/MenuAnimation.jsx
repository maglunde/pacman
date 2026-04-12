import React from 'react';
import { useFitScale } from '../hooks/useFitScale.js';
import { TICKS_PER_SECOND } from '../../game/constants.js';
import '../styles/MenuAnimation.scss';

const BASE_URL = import.meta.env.BASE_URL;
const PACMAN_SHEET_URL = `${BASE_URL}res/sheet-2.png`;
const MSPACMAN_SHEET_URL = `${BASE_URL}res/mspacmansheet.png`;

const TITLE_FRAME = { sheet: PACMAN_SHEET_URL, x: 0, y: 508, w: 425, h: 99 };
const PACMAN_LEFT_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 160, w: 14, h: 14 },
	{ sheet: MSPACMAN_SHEET_URL, x: 472, y: 160, w: 14, h: 14 },
];
const PACMAN_RIGHT_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 472, y: 144, w: 14, h: 14 },
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 144, w: 14, h: 14 },
];
const MSPACMAN_LEFT_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 457, y: 17, w: 14, h: 14 },
	{ sheet: MSPACMAN_SHEET_URL, x: 473, y: 17, w: 14, h: 14 },
];
const MSPACMAN_RIGHT_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 457, y: 1, w: 14, h: 14 },
	{ sheet: MSPACMAN_SHEET_URL, x: 473, y: 1, w: 14, h: 14 },
];
const GHOST_ROW_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 64,  w: 16, h: 16, colorVar: '--color-blinky', name: 'SHADOW',  nick: '"BLINKY"' },
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 80,  w: 16, h: 16, colorVar: '--color-pinky',  name: 'SPEEDY',  nick: '"PINKY"' },
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 96,  w: 16, h: 16, colorVar: '--color-inky',   name: 'BASHFUL', nick: '"INKY"' },
	{ sheet: MSPACMAN_SHEET_URL, x: 456, y: 112, w: 16, h: 16, colorVar: '--color-clyde',  name: 'POKEY',   nick: '"CLYDE"' },
];
const GHOST_RUN_FRAMES = [
	{ sheet: MSPACMAN_SHEET_URL, x: 488, y: 64,  w: 16, h: 16 },
	{ sheet: MSPACMAN_SHEET_URL, x: 488, y: 80,  w: 16, h: 16 },
	{ sheet: MSPACMAN_SHEET_URL, x: 488, y: 96,  w: 16, h: 16 },
	{ sheet: MSPACMAN_SHEET_URL, x: 488, y: 112, w: 16, h: 16 },
];
const SCARED_GHOST_FRAME = { sheet: PACMAN_SHEET_URL, x: 533, y: 139, w: 30, h: 30 };

export function MenuShell({ children }) {
	let fit = useFitScale({ portraitMaxScale: 3 });
	return (
		<div className="overlay-screen overlay-screen--menu-main">
			<div className="menu-fit-frame" ref={fit.frameRef}>
				<div
					className="retro-panel retro-panel--menu-shell"
					ref={fit.contentRef}
					style={{ transform: `scale(${fit.scale})` }}
				>
					<MenuHeader />
					{children}
				</div>
			</div>
		</div>
	);
}

export function ModalShell({ children, panelWidth = '20rem' }) {
	let fit = useFitScale({ maxScale: 1, portraitMaxScale: 3 });
	return (
		<div className="overlay-screen overlay-screen--dim">
			<div className="menu-fit-frame" ref={fit.frameRef}>
				<div
					ref={fit.contentRef}
					style={{ width: panelWidth, transformOrigin: 'center center', transform: `scale(${fit.scale})` }}
				>
					{children}
				</div>
			</div>
		</div>
	);
}

export function MenuHeader() {
	return (
		<div className="menu-header">
			<SpriteFrame frame={TITLE_FRAME} scale={0.8} className="menu-title-sprite" />
		</div>
	);
}

export function MenuGhostRoster() {
	return (
		<div className="menu-roster">
			<div className="menu-roster-title">CHARACTER / NICKNAME</div>
			<div className="menu-roster-list">
				{GHOST_ROW_FRAMES.map(function(ghost) {
					return (
						<div className="menu-roster-row" key={ghost.name} style={{ color: `var(${ghost.colorVar})` }}>
							<SpriteFrame frame={ghost} scale={1.625} className="menu-roster-sprite" />
							<span className="menu-roster-name">- {ghost.name}</span>
							<span className="menu-roster-nick">{ghost.nick}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function MenuAnimation({ frames, menuStartFrame, isMsPacman }) {
	let tps = TICKS_PER_SECOND;
	let animationDelay = 1 * tps;
	let menuAge = Math.max(0, frames - menuStartFrame);
	let mouthFrame = Math.floor(frames / Math.round(tps / 12)) % 2;
	let bob = Math.floor(frames / Math.round(tps / 6)) % 2 === 0 ? 0 : 2;
	let phase0Duration = 3 * tps;
	let pauseDuration = 2 * tps;
	let phase1Duration = 3 * tps;
	let restDuration = 3 * tps;
	let cycleLength = phase0Duration + pauseDuration + phase1Duration + restDuration;
	let animationFrame = Math.max(0, menuAge - animationDelay) % cycleLength;
	let isChasePhase = animationFrame >= phase0Duration + pauseDuration && animationFrame < phase0Duration + pauseDuration + phase1Duration;
	let isRestPhase = animationFrame >= phase0Duration + pauseDuration + phase1Duration;
	let phaseFrame = isChasePhase ? animationFrame - phase0Duration - pauseDuration : animationFrame;
	let startX = 554;
	let endX = -252;
	let percent = isChasePhase
		? Math.min(1, phaseFrame / phase1Duration)
		: Math.min(1, phaseFrame / phase0Duration);
	let animationX = isRestPhase
		? startX
		: isChasePhase
			? endX + (startX - endX) * percent
			: startX + (endX - startX) * percent;
	let leftFrames  = isMsPacman ? MSPACMAN_LEFT_FRAMES  : PACMAN_LEFT_FRAMES;
	let rightFrames = isMsPacman ? MSPACMAN_RIGHT_FRAMES : PACMAN_RIGHT_FRAMES;
	let pacmanFrame = isChasePhase ? rightFrames[mouthFrame] : leftFrames[mouthFrame];

	return (
		<div className="menu-animation-strip">
			<div className="menu-animation-track" style={{ transform: `translateX(${animationX}px)` }}>
				<SpriteFrame frame={pacmanFrame} scale={2} className="menu-animation-pacman" />
				<div className="menu-animation-ghosts">
					{(isChasePhase ? GHOST_RUN_FRAMES.map(function() { return SCARED_GHOST_FRAME; }) : GHOST_RUN_FRAMES).map(function(frame, index) {
						return (
							<SpriteFrame
								key={index}
								frame={frame}
								scale={isChasePhase ? 1 : 1.875}
								className="menu-animation-ghost"
								style={{ transform: `translateY(${bob}px)` }}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function SpriteFrame({ frame, scale, className = '', style = {} }) {
	let scaledWidth = frame.w * scale;
	let scaledHeight = frame.h * scale;

	return (
		<div className={`sprite-frame ${className}`.trim()} style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px`, ...style }}>
			<img
				src={frame.sheet}
				alt=""
				aria-hidden="true"
				draggable="false"
				style={{
					position: 'absolute',
					top: `${-frame.y * scale}px`,
					left: `${-frame.x * scale}px`,
					imageRendering: 'pixelated',
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			/>
		</div>
	);
}
