import type { ParsedCommit } from '../types/commit';
import { COMMIT_TYPES, COMMIT_TYPE_ORDER } from '../types/commit';
import type { ChangelogConfig } from '../types/config';
import { groupCommitsByType, sortCommitGroups } from './log-parser';

export interface ChangelogOptions {
	version: string;
	date: string;
	commits: ParsedCommit[];
	config: ChangelogConfig;
	repoUrl?: string;
}

export function generateChangelog(options: ChangelogOptions): string {
	const { version, date, commits, config, repoUrl } = options;
	const lines: string[] = [];

	// Header
	const versionHeader = repoUrl
		? `[${version}](${repoUrl}/releases/tag/v${version})`
		: version;
	lines.push(`## ${versionHeader} (${date})`);
	lines.push('');

	// Group commits
	const typeLabels = { ...COMMIT_TYPES, ...config.types };
	const groups = groupCommitsByType(commits, typeLabels);
	const sortedGroups = sortCommitGroups(groups, ['breaking', ...COMMIT_TYPE_ORDER]);

	// Generate sections
	for (const [type, typeCommits] of sortedGroups) {
		const title = type === 'breaking' ? '⚠ BREAKING CHANGES' : typeLabels[type] || type;
		lines.push(`### ${title}`);
		lines.push('');

		for (const commit of typeCommits) {
			const line = formatCommitLine(commit, config, repoUrl);
			lines.push(line);
		}

		lines.push('');
	}

	return lines.join('\n');
}

function formatCommitLine(
	commit: ParsedCommit,
	config: ChangelogConfig,
	repoUrl?: string
): string {
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
	const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';

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
				existingContent.slice(0, versionStart) +
				newEntry +
				afterVersion.slice(nextVersionMatch)
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
				existingContent.slice(0, headerEnd + 2) +
				newEntry +
				existingContent.slice(headerEnd + 2)
			);
		}
	}

	// New changelog
	return header + newEntry;
}

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function previewChangelog(commits: ParsedCommit[], typeLabels: Record<string, string>): string[] {
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
