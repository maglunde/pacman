import { state } from './state.js';
import { dir, TILE, GHOST_DRAW_SIZE, COLORS, SCARED_FLASH_THRESHOLD } from './constants.js';
import { inGhostHouse, isDoor } from './grid.js';
import { s_scaredGhost, s_eyes } from './sprite.js';

function ghostSpriteIdx(d) {
	if (d === dir.left)  return 0;
	if (d === dir.up)    return 1;
	if (d === dir.right) return 3;
	return 2;
}

export function drawGhost(g) {
	let ctx   = state.ctx;
	let drawX = g.x;
	let drawY = g.y;
	if (!g.exited && (inGhostHouse(g.col, g.row) || isDoor(g.col, g.row))) {
		drawX += TILE / 2;
	}
	if (g.returning) {
		s_eyes[ghostSpriteIdx(g.dir)].draw(ctx, drawX, drawY, GHOST_DRAW_SIZE, GHOST_DRAW_SIZE);
	} else if (g.pendingReturn || (state.scaredTimer > 0 && !g.immune)) {
		let white = state.scaredTimer <= SCARED_FLASH_THRESHOLD && Math.floor(state.frames / 8) % 2 === 1;
		s_scaredGhost[white ? 1 : 0].draw(ctx, drawX, drawY, GHOST_DRAW_SIZE, GHOST_DRAW_SIZE);
	} else {
		g.sprites[ghostSpriteIdx(g.dir)].draw(ctx, drawX, drawY, GHOST_DRAW_SIZE, GHOST_DRAW_SIZE);
	}

	// Selection indicator — yellow = selected, green = player-controlled
	let isSelected   = state.selectedGhostIdx >= 0 && state.ghosts[state.selectedGhostIdx] === g;
	let isControlled = state.controlledGhostIdx >= 0 && state.ghosts[state.controlledGhostIdx] === g;
	if (isSelected || isControlled) {
		let selColor = isControlled ? COLORS.target : COLORS.pacman;
		let cx = drawX + GHOST_DRAW_SIZE / 2, cy = drawY + GHOST_DRAW_SIZE / 2;
		ctx.save();

		if (state.ghostIndicatorStyle === 0) {
			// ── A: bouncing arrow above ghost ─────────────────────────
			let bounce = Math.abs(Math.sin(state.frames * 0.15)) * 5;
			ctx.fillStyle = selColor;
			ctx.font = "12px 'Press Start 2P', monospace";
			ctx.textAlign = 'center';
			ctx.textBaseline = 'bottom';
			ctx.fillText('▼', cx, g.y - 2 - bounce);

		} else if (state.ghostIndicatorStyle === 1) {
			// ── B: pulsing/marching dashed square ─────────────────────
			ctx.strokeStyle = COLORS.white;
			ctx.lineWidth = 2;
			ctx.setLineDash([4, 4]);
			if (isControlled) {
				ctx.lineDashOffset = state.frames * 0.5;
				ctx.strokeRect(g.x + 1, g.y + 1, GHOST_DRAW_SIZE - 2, GHOST_DRAW_SIZE - 2);
			} else {
				let p = 3 * Math.sin(state.frames * 0.12);
				ctx.globalAlpha = 0.8 + 0.2 * Math.sin(state.frames * 0.12);
				ctx.strokeRect(g.x + 1 - p, g.y + 1 - p, GHOST_DRAW_SIZE - 2 + p * 2, GHOST_DRAW_SIZE - 2 + p * 2);
			}

		} else if (state.ghostIndicatorStyle === 2) {
			// ── C: corner brackets ────────────────────────────────────
			let pad = 1, bLen = 6;
			let x0 = g.x + pad, y0 = g.y + pad;
			let x1 = g.x + GHOST_DRAW_SIZE - pad, y1 = g.y + GHOST_DRAW_SIZE - pad;
			ctx.strokeStyle = selColor;
			ctx.lineWidth = 2;
			ctx.beginPath(); ctx.moveTo(x0, y0 + bLen); ctx.lineTo(x0, y0); ctx.lineTo(x0 + bLen, y0); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(x1 - bLen, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + bLen); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(x0, y1 - bLen); ctx.lineTo(x0, y1); ctx.lineTo(x0 + bLen, y1); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(x1 - bLen, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - bLen); ctx.stroke();

		} else if (state.ghostIndicatorStyle === 3) {
			// ── D: radial glow ────────────────────────────────────────
			let glowAlpha = 0.35 + 0.25 * Math.sin(state.frames * 0.12);
			let rgb = isControlled ? '0,255,136' : '255,255,0';
			let grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 20);
			grd.addColorStop(0, 'rgba(' + rgb + ',' + glowAlpha + ')');
			grd.addColorStop(1, 'rgba(' + rgb + ',0)');
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(cx, cy, 20, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}
}
