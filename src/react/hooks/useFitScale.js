import { useLayoutEffect, useRef, useState } from 'react';

export function useFitScale({ maxScale = 1.4, portraitMaxScale = maxScale } = {}) {
	let frameRef = useRef(null);
	let contentRef = useRef(null);
	let [scale, setScale] = useState(1);

	useLayoutEffect(function() {
		if (!frameRef.current || !contentRef.current) return;

		let frameEl = frameRef.current;
		let contentEl = contentRef.current;

		function updateScale() {
			let frameRect = frameEl.getBoundingClientRect();
			let contentWidth = contentEl.offsetWidth;
			let contentHeight = contentEl.offsetHeight;
			if (!frameRect.width || !frameRect.height || !contentWidth || !contentHeight) return;

			let cap = frameRect.height > frameRect.width ? portraitMaxScale : maxScale;
			let nextScale = Math.min(frameRect.width / contentWidth, frameRect.height / contentHeight, cap);
			setScale(nextScale);
		}

		let resizeObserver = new ResizeObserver(updateScale);
		resizeObserver.observe(frameEl);
		resizeObserver.observe(contentEl);
		updateScale();

		window.addEventListener('resize', updateScale);
		return function() {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateScale);
		};
	}, []);

	return { frameRef, contentRef, scale };
}
