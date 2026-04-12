/**
 * Draw pixel-font text. Font family is always 'Press Start 2P'.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} size   - font size in px
 * @param {string} color  - CSS color string
 * @param {string} [align='center'] - 'left' | 'center' | 'right'
 */
export function drawText(ctx, text, x, y, size, color, align = 'center') {
	ctx.fillStyle = color;
	ctx.font      = size + "px 'Press Start 2P', monospace";
	ctx.textAlign = align;
	ctx.fillText(text, x, y);
}
