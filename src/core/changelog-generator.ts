import type { ParsedCommit } from '../types/commit';
import { COMMIT_TYPES, COMMIT_TYPE_ORDER, OTHER_COMMIT_LABEL } from '../types/commit';
import type { ChangelogConfig, CommitConfig } from '../types/config';
import { groupCommitsByType, sortCommitGroups } from './log-parser';
import type { GitProvider } from './release-provider';

export interface ChangelogOptions {
	version: string;
	date: string;
	commits: ParsedCommit[];
	config: ChangelogConfig;
	commitsConfig?: CommitConfig;
	repoUrl?: string;
	provider?: GitProvider;
}

/**
 * Build the label per commit type. Commits that are not conventional commits
 * are grouped under 'other' and only appear in the changelog when that type
 * has a label: either one the user configured under `changelog.types`, or the
 * default one, applied when `commits.conventional` is false.
 */
export function buildTypeLabels(
	config: ChangelogConfig,
	commitsConfig?: CommitConfig
): Record<string, string> {
	const typeLabels: Record<string, string> = { ...COMMIT_TYPES, ...config.types };

	if (commitsConfig?.conventional === false && typeLabels.other === undefined) {
		typeLabels.other = OTHER_COMMIT_LABEL;
	}

	return typeLabels;
}

export function generateChangelog(options: ChangelogOptions): string {
	const { version, date, commits, config, commitsConfig, repoUrl, provider } = options;
	const lines: string[] = [];
	// GitLab serves project pages under /-/
	const pathPrefix = provider === 'gitlab' ? '/-' : '';
	const releasePath = provider === 'gitlab' ? 'releases' : 'releases/tag';

	// Header
	const versionHeader = repoUrl
		? `[${version}](${repoUrl}${pathPrefix}/${releasePath}/v${version})`
		: version;
	lines.push(`## ${versionHeader} (${date})`);
	lines.push('');

	// Group commits
	const typeLabels = buildTypeLabels(config, commitsConfig);
	const groups = groupCommitsByType(commits, typeLabels);
	const sortedGroups = sortCommitGroups(groups, ['breaking', ...COMMIT_TYPE_ORDER]);

	// Generate sections
	for (const [type, typeCommits] of sortedGroups) {
		const title = type === 'breaking' ? '⚠ BREAKING CHANGES' : typeLabels[type] || type;
		lines.push(`### ${title}`);
		lines.push('');

		for (const commit of typeCommits) {
			const line = formatCommitLine(commit, config, repoUrl && `${repoUrl}${pathPrefix}`);
			lines.push(line);
		}

		lines.push('');
	}

	return lines.join('\n');
}

function formatCommitLine(commit: ParsedCommit, config: ChangelogConfig, repoUrl?: string): string {
	let line = '- ';

	// Scope
	if (commit.scope) {
		line += `**${commit.scope}:** `;
	}

	// Subject
	line += commit.subject;

	// Hash link
	if (config.includeHash && repoUrl) {
		line += ` ([${commit.shortHash}](${repoUrl}/commit/${commit.hash}))`;
	} else if (config.includeHash) {
		line += ` (${commit.shortHash})`;
	}

	// Breaking change note
	if (commit.breaking && commit.breakingNote) {
		line += `\n  - ${commit.breakingNote}`;
	}

	return line;
}

export function generateFullChangelog(
	existingContent: string,
	newEntry: string,
	version: string
): string {
	const header =
		'# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

	// Check if this version already exists
	const versionPattern = new RegExp(`^## \\[?${escapeRegex(version)}\\]?`, 'm');
	if (versionPattern.test(existingContent)) {
		// Replace existing version entry
		const nextVersionPattern = /^## \[?\d+\.\d+\.\d+/m;
		const versionStart = existingContent.search(versionPattern);
		const afterVersion = existingContent.slice(versionStart + 1);
		const nextVersionMatch = afterVersion.search(nextVersionPattern);

		if (nextVersionMatch !== -1) {
			return (
				existingContent.slice(0, versionStart) + newEntry + afterVersion.slice(nextVersionMatch)
			);
		}

		return existingContent.slice(0, versionStart) + newEntry;
	}

	// Check if changelog has header
	if (existingContent.startsWith('# Changelog')) {
		// Insert after header
		const headerEnd = existingContent.indexOf('\n\n', existingContent.indexOf('\n') + 1);
		if (headerEnd !== -1) {
			return (
				existingContent.slice(0, headerEnd + 2) + newEntry + existingContent.slice(headerEnd + 2)
			);
		}
	}

	// New changelog
	return header + newEntry;
}

/**
 * Return the body of one version's entry, without its heading, or null when
 * the changelog has no entry for that version.
 */
export function extractVersionEntry(content: string, version: string): string | null {
	const versionPattern = new RegExp(`^## \\[?${escapeRegex(version)}(?:\\]|\\s|$)`, 'm');
	const versionStart = content.search(versionPattern);
	if (versionStart === -1) return null;

	const entry = content.slice(versionStart);
	const nextVersionStart = entry.slice(1).search(/^## /m);
	const fullEntry = nextVersionStart === -1 ? entry : entry.slice(0, nextVersionStart + 1);

	return fullEntry.slice(fullEntry.indexOf('\n') + 1).trim();
}

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function previewChangelog(
	commits: ParsedCommit[],
	typeLabels: Record<string, string>
): string[] {
	const groups = groupCommitsByType(commits, typeLabels);
	const sortedGroups = sortCommitGroups(groups, ['breaking', ...COMMIT_TYPE_ORDER]);
	const lines: string[] = [];

	for (const [type, typeCommits] of sortedGroups) {
		const title = type === 'breaking' ? '⚠ BREAKING CHANGES' : typeLabels[type] || type;
		lines.push(`${title}:`);

		for (const commit of typeCommits) {
			const scope = commit.scope ? `(${commit.scope}) ` : '';
			lines.push(`  - ${scope}${commit.subject}`);
		}
	}

	return lines;
}
