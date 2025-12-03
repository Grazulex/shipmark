import type { ParsedCommit, RawCommit } from '../types/commit';

const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
const BREAKING_CHANGE_REGEX = /^BREAKING\s*CHANGE:\s*(.+)$/im;

export function parseConventionalCommit(commit: RawCommit): ParsedCommit {
	const match = commit.subject.match(CONVENTIONAL_REGEX);

	if (match) {
		const [, type, scope, breaking, subject] = match;
		const breakingNote = extractBreakingChange(commit.body);

		return {
			hash: commit.hash,
			shortHash: commit.shortHash,
			type: type.toLowerCase(),
			scope: scope || undefined,
			subject,
			body: commit.body,
			author: commit.author,
			date: commit.date,
			breaking: !!breaking || !!breakingNote,
			breakingNote,
		};
	}

	// Non-conventional commit
	return {
		hash: commit.hash,
		shortHash: commit.shortHash,
		type: 'other',
		subject: commit.subject,
		body: commit.body,
		author: commit.author,
		date: commit.date,
		breaking: false,
	};
}

function extractBreakingChange(body: string): string | undefined {
	const match = body.match(BREAKING_CHANGE_REGEX);
	return match?.[1];
}

export function parseCommits(rawCommits: RawCommit[]): ParsedCommit[] {
	return rawCommits.map(parseConventionalCommit);
}

export function groupCommitsByType(
	commits: ParsedCommit[],
	typeLabels: Record<string, string>
): Map<string, ParsedCommit[]> {
	const groups = new Map<string, ParsedCommit[]>();

	// Initialize breaking changes group
	const breakingCommits = commits.filter((c) => c.breaking);
	if (breakingCommits.length > 0) {
		groups.set('breaking', breakingCommits);
	}

	// Group by type
	for (const commit of commits) {
		if (commit.type === 'other') continue;

		const label = typeLabels[commit.type];
		if (!label) continue;

		const existing = groups.get(commit.type) || [];
		existing.push(commit);
		groups.set(commit.type, existing);
	}

	return groups;
}

export function sortCommitGroups(
	groups: Map<string, ParsedCommit[]>,
	order: string[]
): Map<string, ParsedCommit[]> {
	const sorted = new Map<string, ParsedCommit[]>();

	for (const type of order) {
		const commits = groups.get(type);
		if (commits && commits.length > 0) {
			sorted.set(type, commits);
		}
	}

	// Add any remaining groups not in order
	for (const [type, commits] of groups) {
		if (!sorted.has(type) && commits.length > 0) {
			sorted.set(type, commits);
		}
	}

	return sorted;
}

export function filterSignificantCommits(commits: ParsedCommit[]): ParsedCommit[] {
	const ignoredTypes = new Set(['chore', 'ci', 'build', 'style']);
	return commits.filter((c) => c.breaking || !ignoredTypes.has(c.type) || c.type === 'other');
}
