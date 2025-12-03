import type { BumpType, PrereleaseType, Version } from '../types/version';
import { ValidationError } from '../utils/errors';

const SEMVER_REGEX =
	/^v?(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)(?:\.(\d+))?)?(?:\+(.+))?$/i;

export function parse(version: string): Version {
	const match = version.match(SEMVER_REGEX);

	if (!match) {
		throw new ValidationError(`Invalid version format: ${version}`, [
			'Version must follow semver format: MAJOR.MINOR.PATCH',
			'Examples: 1.0.0, 2.1.3, 1.0.0-alpha.1, v1.2.3',
		]);
	}

	const [, major, minor, patch, prerelease, prereleaseNum, build] = match;

	return {
		major: parseInt(major, 10),
		minor: parseInt(minor, 10),
		patch: parseInt(patch, 10),
		prerelease: prerelease?.toLowerCase() as PrereleaseType | undefined,
		prereleaseNumber: prereleaseNum ? parseInt(prereleaseNum, 10) : undefined,
		build,
	};
}

export function format(version: Version, prefix = ''): string {
	let str = `${prefix}${version.major}.${version.minor}.${version.patch}`;

	if (version.prerelease) {
		str += `-${version.prerelease}`;
		if (version.prereleaseNumber !== undefined) {
			str += `.${version.prereleaseNumber}`;
		}
	}

	if (version.build) {
		str += `+${version.build}`;
	}

	return str;
}

export function bump(
	version: Version,
	type: BumpType,
	prereleaseType: PrereleaseType = 'alpha'
): Version {
	const newVersion = { ...version };

	// Clear prerelease and build metadata for non-prerelease bumps
	delete newVersion.prerelease;
	delete newVersion.prereleaseNumber;
	delete newVersion.build;

	switch (type) {
		case 'major':
			newVersion.major += 1;
			newVersion.minor = 0;
			newVersion.patch = 0;
			break;

		case 'minor':
			newVersion.minor += 1;
			newVersion.patch = 0;
			break;

		case 'patch':
			newVersion.patch += 1;
			break;

		case 'premajor':
			newVersion.major += 1;
			newVersion.minor = 0;
			newVersion.patch = 0;
			newVersion.prerelease = prereleaseType;
			newVersion.prereleaseNumber = 1;
			break;

		case 'preminor':
			newVersion.minor += 1;
			newVersion.patch = 0;
			newVersion.prerelease = prereleaseType;
			newVersion.prereleaseNumber = 1;
			break;

		case 'prepatch':
			newVersion.patch += 1;
			newVersion.prerelease = prereleaseType;
			newVersion.prereleaseNumber = 1;
			break;

		case 'prerelease':
			if (version.prerelease) {
				// Increment prerelease number
				newVersion.prerelease = version.prerelease;
				newVersion.prereleaseNumber = (version.prereleaseNumber || 0) + 1;
			} else {
				// Start new prerelease
				newVersion.patch += 1;
				newVersion.prerelease = prereleaseType;
				newVersion.prereleaseNumber = 1;
			}
			break;
	}

	return newVersion;
}

export function compare(a: Version, b: Version): number {
	// Compare major.minor.patch
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	if (a.patch !== b.patch) return a.patch - b.patch;

	// Handle prerelease (no prerelease > prerelease)
	if (!a.prerelease && b.prerelease) return 1;
	if (a.prerelease && !b.prerelease) return -1;
	if (!a.prerelease && !b.prerelease) return 0;

	// Compare prerelease type (rc > beta > alpha)
	const prereleaseOrder: Record<string, number> = { alpha: 1, beta: 2, rc: 3 };
	const aOrder = prereleaseOrder[a.prerelease!] || 0;
	const bOrder = prereleaseOrder[b.prerelease!] || 0;

	if (aOrder !== bOrder) return aOrder - bOrder;

	// Compare prerelease number
	return (a.prereleaseNumber || 0) - (b.prereleaseNumber || 0);
}

export function isValid(version: string): boolean {
	return SEMVER_REGEX.test(version);
}

export function clean(version: string): string {
	return version.replace(/^v/, '');
}

export function getBumpOptions(
	currentVersion: Version,
	prereleaseType: PrereleaseType = 'alpha'
): Array<{ type: BumpType; newVersion: string }> {
	const options: Array<{ type: BumpType; newVersion: string }> = [];

	const bumpTypes: BumpType[] = ['patch', 'minor', 'major'];

	for (const type of bumpTypes) {
		const newVersion = bump(currentVersion, type);
		options.push({
			type,
			newVersion: format(newVersion),
		});
	}

	// Add prerelease options
	const prereleaseTypes: BumpType[] = ['prepatch', 'preminor', 'premajor'];
	for (const type of prereleaseTypes) {
		const newVersion = bump(currentVersion, type, prereleaseType);
		options.push({
			type,
			newVersion: format(newVersion),
		});
	}

	// If already in prerelease, add increment option
	if (currentVersion.prerelease) {
		const newVersion = bump(currentVersion, 'prerelease', prereleaseType);
		options.push({
			type: 'prerelease',
			newVersion: format(newVersion),
		});
	}

	return options;
}
