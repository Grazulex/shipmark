import { describe, expect, it } from 'vitest';
import {
	parseConventionalCommit,
	parseCommits,
	groupCommitsByType,
	filterSignificantCommits,
} from '../src/core/log-parser';
import type { RawCommit } from '../src/types/commit';

describe('log-parser', () => {
	describe('parseConventionalCommit', () => {
		const baseCommit: RawCommit = {
			hash: 'abc123def456',
			shortHash: 'abc123d',
			subject: '',
			body: '',
			author: 'Test Author',
			date: '2024-01-01',
		};

		it('should parse feat commit', () => {
			const commit = { ...baseCommit, subject: 'feat: add new feature' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('feat');
			expect(result.subject).toBe('add new feature');
			expect(result.breaking).toBe(false);
		});

		it('should parse fix commit', () => {
			const commit = { ...baseCommit, subject: 'fix: resolve bug' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('fix');
			expect(result.subject).toBe('resolve bug');
		});

		it('should parse commit with scope', () => {
			const commit = { ...baseCommit, subject: 'feat(auth): add login' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('feat');
			expect(result.scope).toBe('auth');
			expect(result.subject).toBe('add login');
		});

		it('should parse breaking change with !', () => {
			const commit = { ...baseCommit, subject: 'feat!: breaking change' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('feat');
			expect(result.breaking).toBe(true);
		});

		it('should parse breaking change with scope and !', () => {
			const commit = { ...baseCommit, subject: 'feat(api)!: breaking api change' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('feat');
			expect(result.scope).toBe('api');
			expect(result.breaking).toBe(true);
		});

		it('should parse BREAKING CHANGE in body', () => {
			const commit = {
				...baseCommit,
				subject: 'feat: new feature',
				body: 'BREAKING CHANGE: this breaks everything',
			};
			const result = parseConventionalCommit(commit);

			expect(result.breaking).toBe(true);
			expect(result.breakingNote).toBe('this breaks everything');
		});

		it('should handle non-conventional commit', () => {
			const commit = { ...baseCommit, subject: 'Update readme file' };
			const result = parseConventionalCommit(commit);

			expect(result.type).toBe('other');
			expect(result.subject).toBe('Update readme file');
		});

		it('should handle various commit types', () => {
			const types = ['docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'];

			for (const type of types) {
				const commit = { ...baseCommit, subject: `${type}: some change` };
				const result = parseConventionalCommit(commit);
				expect(result.type).toBe(type);
			}
		});
	});

	describe('parseCommits', () => {
		it('should parse multiple commits', () => {
			const rawCommits: RawCommit[] = [
				{
					hash: 'abc123',
					shortHash: 'abc',
					subject: 'feat: feature 1',
					body: '',
					author: 'Author',
					date: '2024-01-01',
				},
				{
					hash: 'def456',
					shortHash: 'def',
					subject: 'fix: bug fix',
					body: '',
					author: 'Author',
					date: '2024-01-02',
				},
			];

			const result = parseCommits(rawCommits);

			expect(result).toHaveLength(2);
			expect(result[0].type).toBe('feat');
			expect(result[1].type).toBe('fix');
		});
	});

	describe('groupCommitsByType', () => {
		it('should group commits by type', () => {
			const commits = [
				{ hash: '1', shortHash: '1', type: 'feat', subject: 'feature 1', body: '', author: '', date: '', breaking: false },
				{ hash: '2', shortHash: '2', type: 'feat', subject: 'feature 2', body: '', author: '', date: '', breaking: false },
				{ hash: '3', shortHash: '3', type: 'fix', subject: 'fix 1', body: '', author: '', date: '', breaking: false },
			];

			const typeLabels = { feat: 'Features', fix: 'Bug Fixes' };
			const groups = groupCommitsByType(commits, typeLabels);

			expect(groups.get('feat')).toHaveLength(2);
			expect(groups.get('fix')).toHaveLength(1);
		});

		it('should create breaking changes group', () => {
			const commits = [
				{ hash: '1', shortHash: '1', type: 'feat', subject: 'breaking', body: '', author: '', date: '', breaking: true },
				{ hash: '2', shortHash: '2', type: 'feat', subject: 'normal', body: '', author: '', date: '', breaking: false },
			];

			const typeLabels = { feat: 'Features' };
			const groups = groupCommitsByType(commits, typeLabels);

			expect(groups.get('breaking')).toHaveLength(1);
		});
	});

	describe('filterSignificantCommits', () => {
		it('should filter out chore, ci, build, style commits', () => {
			const commits = [
				{ hash: '1', shortHash: '1', type: 'feat', subject: 'feature', body: '', author: '', date: '', breaking: false },
				{ hash: '2', shortHash: '2', type: 'chore', subject: 'chore', body: '', author: '', date: '', breaking: false },
				{ hash: '3', shortHash: '3', type: 'ci', subject: 'ci', body: '', author: '', date: '', breaking: false },
				{ hash: '4', shortHash: '4', type: 'fix', subject: 'fix', body: '', author: '', date: '', breaking: false },
			];

			const result = filterSignificantCommits(commits);

			expect(result).toHaveLength(2);
			expect(result.map((c) => c.type)).toEqual(['feat', 'fix']);
		});

		it('should keep breaking chore commits', () => {
			const commits = [
				{ hash: '1', shortHash: '1', type: 'chore', subject: 'breaking chore', body: '', author: '', date: '', breaking: true },
			];

			const result = filterSignificantCommits(commits);

			expect(result).toHaveLength(1);
		});
	});
});
