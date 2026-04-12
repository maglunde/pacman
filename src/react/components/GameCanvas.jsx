import React, { useEffect, useRef } from 'react';
import { mountGame } from '../../game/game.js';

export function GameCanvas() {
	let hostRef = useRef(null);

	useEffect(function() {
		if (!hostRef.current) return;
		mountGame(hostRef.current);
	}, []);

	return <div className="canvas-host" data-testid="canvas-host" ref={hostRef}></div>;
}
