import { state } from './state.js';
import { TILE, COLORS } from './constants.js';
import { ghostLookahead } from './ghost.js';
import { hexToRgb } from './hud.js';

const GHOST_KEYS = ['blinky', 'pinky', 'inky', 'clyde'];

export function renderPaths(ctx) {
	ctx.save();
	ctx.lineWidth = 3;
	ctx.setLineDash([3, 5]);

	const allPaths = [];

	// Collect Pac-Man path
	if (state.aiMode && state.showPaths.pacman && state.aiPath.length > 0) {
		const pPath = [{ col: state.pacman.col, row: state.pacman.row }].concat(state.aiPath);
		allPaths.push({ id: 'pacman', color: COLORS.path.pacman, points: pPath, index: 0 });
	}

	// Collect ghost paths
	state.ghosts.forEach(function(g, idx) {
		if (!state.showPaths[GHOST_KEYS[idx]] || !g.exited || state.scaredTimer > 0) return;
		const gLook = ghostLookahead(g, 20);
		if (gLook.length === 0) return;
		const gPath = [{ col: g.col, row: g.row }].concat(gLook);
		allPaths.push({ id: GHOST_KEYS[idx], color: 'rgba(' + hexToRgb(g.pathColor) + ',0.45)', points: gPath, index: idx + 1 });
	});

	// Draw each segment with perpendicular offsets where paths share a segment
	allPaths.forEach(function(pathObj) {
		ctx.strokeStyle = pathObj.color;
		ctx.beginPath();

		for (let i = 0; i < pathObj.points.length - 1; i++) {
			const p1 = pathObj.points[i];
			const p2 = pathObj.points[i + 1];

			const key = [p1.row + ',' + p1.col, p2.row + ',' + p2.col].sort().join('-');

			const sharingPaths = allPaths.filter(function(other) {
				for (let j = 0; j < other.points.length - 1; j++) {
					const op1 = other.points[j];
					const op2 = other.points[j + 1];
					const okey = [op1.row + ',' + op1.col, op2.row + ',' + op2.col].sort().join('-');
					if (okey === key) return true;
				}
				return false;
			});

			let offsetX = 0, offsetY = 0;
			if (sharingPaths.length > 1) {
				sharingPaths.sort((a, b) => a.index - b.index);
				const myRank = sharingPaths.indexOf(pathObj);
				const offsetMag = (myRank - (sharingPaths.length - 1) / 2) * 4;
				if (p1.row === p2.row) {
					offsetY = offsetMag;
				} else {
					offsetX = offsetMag;
				}
			}

			const x1 = state.mapOffX + p1.col * TILE + TILE / 2 + offsetX;
			const y1 = state.mapOffY + p1.row * TILE + TILE / 2 + offsetY;
			const x2 = state.mapOffX + p2.col * TILE + TILE / 2 + offsetX;
			const y2 = state.mapOffY + p2.row * TILE + TILE / 2 + offsetY;

			if (i === 0) ctx.moveTo(x1, y1);

			// Skip wrap-around segments (long horizontal jumps across the screen)
			if (Math.abs(p1.col - p2.col) > 1) {
				ctx.moveTo(x2, y2);
			} else {
				ctx.lineTo(x2, y2);
			}
		}
		ctx.stroke();
	});

	ctx.restore();
}
