import { describe, expect, it } from 'vitest';
import {
	generateChangelog,
	generateFullChangelog,
	previewChangelog,
} from '../src/core/changelog-generator';
import type { ParsedCommit } from '../src/types/commit';
import type { ChangelogConfig } from '../src/types/config';

describe('changelog-generator', () => {
	const defaultConfig: ChangelogConfig = {
		file: 'CHANGELOG.md',
		types: {},
		includeHash: true,
		includeDate: true,
		includeAuthor: false,
	};

	const sampleCommits: ParsedCommit[] = [
		{
			hash: 'abc123def456',
			shortHash: 'abc123d',
			type: 'feat',
			subject: 'add new feature',
			body: '',
			author: 'Test Author',
			date: '2024-01-01',
			breaking: false,
		},
		{
			hash: 'def456abc789',
			shortHash: 'def456a',
			type: 'fix',
			subject: 'fix critical bug',
			body: '',
			author: 'Test Author',
			date: '2024-01-02',
			breaking: false,
		},
	];

	describe('generateChangelog', () => {
		it('should generate changelog with version header', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: defaultConfig,
			});

			expect(result).toContain('## 1.0.0 (2024-01-15)');
		});

		it('should include feature section', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: defaultConfig,
			});

			expect(result).toContain('### Features');
			expect(result).toContain('add new feature');
		});

		it('should include bug fixes section', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: defaultConfig,
			});

			expect(result).toContain('### Bug Fixes');
			expect(result).toContain('fix critical bug');
		});

		it('should include commit hash when configured', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: { ...defaultConfig, includeHash: true },
			});

			expect(result).toContain('abc123d');
		});

		it('should not include hash when disabled', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: { ...defaultConfig, includeHash: false },
			});

			expect(result).not.toContain('abc123d');
		});

		it('should include scope in commit line', () => {
			const commitsWithScope: ParsedCommit[] = [
				{
					...sampleCommits[0],
					scope: 'auth',
				},
			];

			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: commitsWithScope,
				config: defaultConfig,
			});

			expect(result).toContain('**auth:**');
		});

		it('should handle breaking changes', () => {
			const breakingCommits: ParsedCommit[] = [
				{
					...sampleCommits[0],
					breaking: true,
					breakingNote: 'This is a breaking change',
				},
			];

			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: breakingCommits,
				config: defaultConfig,
			});

			expect(result).toContain('BREAKING CHANGES');
		});

		it('should generate links when repoUrl is provided', () => {
			const result = generateChangelog({
				version: '1.0.0',
				date: '2024-01-15',
				commits: sampleCommits,
				config: defaultConfig,
				repoUrl: 'https://github.com/user/repo',
			});

			expect(result).toContain('[1.0.0](https://github.com/user/repo/releases/tag/v1.0.0)');
			expect(result).toContain('[abc123d](https://github.com/user/repo/commit/abc123def456)');
		});
	});

	describe('generateFullChangelog', () => {
		it('should create new changelog with header', () => {
			const newEntry = '## 1.0.0 (2024-01-15)\n\n### Features\n\n- new feature\n\n';
			const result = generateFullChangelog('', newEntry, '1.0.0');

			expect(result).toContain('# Changelog');
			expect(result).toContain('## 1.0.0');
		});

		it('should prepend to existing changelog', () => {
			const existing =
				'# Changelog\n\nAll notable changes.\n\n## 0.9.0 (2024-01-01)\n\n- old feature\n';
			const newEntry = '## 1.0.0 (2024-01-15)\n\n### Features\n\n- new feature\n\n';
			const result = generateFullChangelog(existing, newEntry, '1.0.0');

			expect(result).toContain('## 1.0.0');
			expect(result).toContain('## 0.9.0');
			expect(result.indexOf('1.0.0')).toBeLessThan(result.indexOf('0.9.0'));
		});
	});

	describe('previewChangelog', () => {
		it('should return preview lines', () => {
			const typeLabels = { feat: 'Features', fix: 'Bug Fixes' };
			const result = previewChangelog(sampleCommits, typeLabels);

			expect(result).toContain('Features:');
			expect(result).toContain('Bug Fixes:');
			expect(result.some((line) => line.includes('add new feature'))).toBe(true);
		});

		it('should include scope in preview', () => {
			const commitsWithScope: ParsedCommit[] = [
				{
					...sampleCommits[0],
					scope: 'cli',
				},
			];

			const typeLabels = { feat: 'Features' };
			const result = previewChangelog(commitsWithScope, typeLabels);

			expect(result.some((line) => line.includes('(cli)'))).toBe(true);
		});
	});
});
