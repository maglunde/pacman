import React, { useEffect, useState } from 'react';
import { closeMenuSubPage } from '../../game/menu.js';
import { fetchTopScores } from '../../lib/scores.js';
import { MenuShell } from './MenuAnimation.jsx';
import { MenuButton } from './MenuButton.jsx';
import '../styles/LeaderboardOverlay.scss';

export function LeaderboardOverlay() {
	const [rows, setRows]         = useState(null);
	const [error, setError]       = useState(null);
	const [selected, setSelected] = useState(-1); // -1 = ingenting valgt, rows.length = BACK

	useEffect(function() {
		fetchTopScores()
			.then(setRows)
			.catch(function(err) { setError(err.message); });
	}, []);

	useEffect(function() {
		function onKey(e) {
			if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
				e.stopPropagation();
				const count = rows ? rows.length + 1 : 1; // +1 for BACK
				setSelected(function(s) {
					const start = s === -1 ? 0 : s;
					return e.key === 'ArrowUp'
						? (start - 1 + count) % count
						: (start + 1) % count;
				});
			}
			if (e.key === 'Enter' || e.key === 'Escape') {
				e.stopPropagation();
				closeMenuSubPage();
			}
		}
		document.addEventListener('keydown', onKey, true);
		return function() { document.removeEventListener('keydown', onKey, true); };
	}, [rows]);

	const backSelected = rows !== null && selected === rows.length;

	return (
		<MenuShell>
			<div className="retro-title">LEADERBOARD</div>
			<div className="leaderboard-body">
				{error ? (
					<div className="leaderboard-status leaderboard-status--error">COULD NOT LOAD SCORES</div>
				) : rows === null ? (
					<div className="leaderboard-status">LOADING...</div>
				) : rows.length === 0 ? (
					<div className="leaderboard-status">NO SCORES YET</div>
				) : (
					<table className="leaderboard-table">
						<thead>
							<tr>
								<th>#</th>
								<th>NAME</th>
								<th>SCORE</th>
								<th>LVL</th>
							</tr>
						</thead>
						<tbody>
							{rows.map(function(row, i) {
								let className = '';
								if (i === selected)      className = 'leaderboard-row--selected';
								else if (i === 0)        className = 'leaderboard-row--gold';
								return (
									<tr key={i} className={className}>
										<td>{i + 1}</td>
										<td>{row.display_name}</td>
										<td>{row.score}</td>
										<td>{row.level}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>
			<div className="menu-button-list">
				<MenuButton label="BACK" active={backSelected} onClick={closeMenuSubPage} />
			</div>
		</MenuShell>
	);
}
