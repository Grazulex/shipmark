export interface RawCommit {
	hash: string;
	shortHash: string;
	subject: string;
	body: string;
	author: string;
	date: string;
}

export interface ParsedCommit {
	hash: string;
	shortHash: string;
	type: string;
	scope?: string;
	subject: string;
	body: string;
	author: string;
	date: string;
	breaking: boolean;
	breakingNote?: string;
}

export interface CommitGroup {
	type: string;
	title: string;
	commits: ParsedCommit[];
}

export const COMMIT_TYPES: Record<string, string> = {
	feat: 'Features',
	fix: 'Bug Fixes',
	docs: 'Documentation',
	style: 'Styles',
	refactor: 'Code Refactoring',
	perf: 'Performance Improvements',
	test: 'Tests',
	build: 'Build System',
	ci: 'Continuous Integration',
	chore: 'Chores',
	revert: 'Reverts',
};

export const COMMIT_TYPE_ORDER = [
	'breaking',
	'feat',
	'fix',
	'perf',
	'refactor',
	'docs',
	'test',
	'build',
	'ci',
	'chore',
	'revert',
];
