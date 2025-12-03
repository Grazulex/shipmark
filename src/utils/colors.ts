import chalk from 'chalk';

export const colors = {
	// Semantic colors
	success: chalk.green,
	error: chalk.red,
	warning: chalk.yellow,
	info: chalk.cyan,
	muted: chalk.gray,
	highlight: chalk.bold.white,

	// Version types
	major: chalk.red.bold,
	minor: chalk.yellow.bold,
	patch: chalk.green.bold,
	prerelease: chalk.magenta.bold,

	// Commit types
	feat: chalk.green,
	fix: chalk.red,
	docs: chalk.blue,
	refactor: chalk.cyan,
	test: chalk.yellow,
	chore: chalk.gray,
	breaking: chalk.red.bold,

	// UI elements
	brand: chalk.hex('#FF6B6B').bold,
	accent: chalk.hex('#4ECDC4'),
	dim: chalk.dim,
};

export const icons = {
	// Status
	success: '✔',
	error: '✖',
	warning: '⚠',
	info: 'ℹ',

	// Actions
	rocket: '🚀',
	package: '📦',
	tag: '🏷️',
	git: '📝',
	changelog: '📋',
	version: '🔖',

	// UI
	arrow: '→',
	bullet: '•',
	check: '✓',
	cross: '✗',
	dot: '·',
};

export function colorizeCommitType(type: string): string {
	const colorMap: Record<string, (s: string) => string> = {
		feat: colors.feat,
		fix: colors.fix,
		docs: colors.docs,
		refactor: colors.refactor,
		test: colors.test,
		chore: colors.chore,
		style: colors.muted,
		perf: colors.warning,
		ci: colors.muted,
		build: colors.muted,
	};

	const colorFn = colorMap[type] || colors.muted;
	return colorFn(type);
}

export function colorizeVersion(version: string): string {
	return colors.accent(version);
}

export function colorizeBumpType(type: string): string {
	const colorMap: Record<string, (s: string) => string> = {
		major: colors.major,
		minor: colors.minor,
		patch: colors.patch,
		premajor: colors.prerelease,
		preminor: colors.prerelease,
		prepatch: colors.prerelease,
		prerelease: colors.prerelease,
	};

	const colorFn = colorMap[type] || colors.muted;
	return colorFn(type);
}
