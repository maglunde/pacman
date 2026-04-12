import React from 'react';
import { version } from '../../../package.json';
import '../styles/VersionBadge.scss';

export function VersionBadge() {
	return (
		<div className="version-badge">v{version}</div>
	);
}
