import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { useFitScale } from './useFitScale.js';

let resizeObserverCallback = null;

class MockResizeObserver {
	constructor(callback) {
		resizeObserverCallback = callback;
	}

	observe() {}
	disconnect() {}
}

function FitScaleProbe(props) {
	let fit = useFitScale(props);

	return (
		<div data-testid="frame" ref={fit.frameRef}>
			<div data-testid="content" ref={fit.contentRef} data-scale={fit.scale}>content</div>
		</div>
	);
}

describe('useFitScale', function() {
	beforeEach(function() {
		vi.stubGlobal('ResizeObserver', MockResizeObserver);
	});

	afterEach(function() {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('caps scale in landscape mode with maxScale', function() {
		render(<FitScaleProbe maxScale={1.4} portraitMaxScale={3} />);

		let frame = screen.getByTestId('frame');
		let content = screen.getByTestId('content');

		Object.defineProperty(frame, 'getBoundingClientRect', {
			value: function() {
				return { width: 400, height: 300 };
			},
			configurable: true,
		});
		Object.defineProperty(content, 'offsetWidth', { value: 100, configurable: true });
		Object.defineProperty(content, 'offsetHeight', { value: 100, configurable: true });

		act(function() {
			resizeObserverCallback();
		});

		expect(content).toHaveAttribute('data-scale', '1.4');
	});

	it('uses the portrait cap on narrow screens', function() {
		render(<FitScaleProbe maxScale={1.4} portraitMaxScale={3} />);

		let frame = screen.getByTestId('frame');
		let content = screen.getByTestId('content');

		Object.defineProperty(frame, 'getBoundingClientRect', {
			value: function() {
				return { width: 400, height: 900 };
			},
			configurable: true,
		});
		Object.defineProperty(content, 'offsetWidth', { value: 100, configurable: true });
		Object.defineProperty(content, 'offsetHeight', { value: 100, configurable: true });

		act(function() {
			resizeObserverCallback();
		});

		expect(content).toHaveAttribute('data-scale', '3');
	});
});
