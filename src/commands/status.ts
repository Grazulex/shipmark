import chalk from 'chalk';
import Table from 'cli-table3';
import type { Command } from 'commander';
import { getVersionFromPackageJson, loadConfig } from '../core/config';
import { git } from '../core/git';
import { parseCommits } from '../core/log-parser';
import * as semver from '../core/semver';
import { COMMIT_TYPES } from '../types/commit';
import { colors, icons } from '../utils/colors';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

export function statusCommand(program: Command): void {
	program
		.command('status')
		.alias('st')
		.description('Show release status and pending changes')
		.option('-v, --verbose', 'Show detailed commit list')
		.action(async (options: { verbose?: boolean }) => {
			try {
				await showStatus(options.verbose);
			} catch (error) {
				handleError(error);
			}
		});
}

async function showStatus(verbose = false): Promise<void> {
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	// Check git repo
	if (!git.isRepo()) {
		logger.error('Not a git repository');
		return;
	}

	logger.newline();
	console.log(chalk.bold(`${icons.package} Release Status`));
	logger.divider();
	logger.newline();

	// Version info
	const packageVersion = getVersionFromPackageJson(cwd);
	const latestTag = git.getLatestTag();
	const currentBranch = git.getCurrentBranch();
	const hasRemote = git.hasRemote();
	const hasUncommitted = git.hasUncommittedChanges();

	// Display current state
	const stateTable = new Table({
		style: { head: [], border: ['gray'] },
		chars: {
			top: '',
			'top-mid': '',
			'top-left': '',
			'top-right': '',
			bottom: '',
			'bottom-mid': '',
			'bottom-left': '',
			'bottom-right': '',
			left: '  ',
			'left-mid': '',
			mid: '',
			'mid-mid': '',
			right: '',
			'right-mid': '',
			middle: ' ',
		},
	});

	stateTable.push(
		[colors.muted('Branch:'), colors.accent(currentBranch)],
		[
			colors.muted('Package version:'),
			packageVersion ? colors.accent(packageVersion) : colors.warning('not set'),
		],
		[colors.muted('Latest tag:'), latestTag ? colors.accent(latestTag) : colors.warning('no tags')],
		[
			colors.muted('Remote:'),
			hasRemote ? colors.success('connected') : colors.warning('not configured'),
		],
		[
			colors.muted('Working tree:'),
			hasUncommitted ? colors.warning('uncommitted changes') : colors.success('clean'),
		]
	);

	console.log(stateTable.toString());
	logger.newline();

	// Commits since last tag
	const commitsSince = git.getCommitsSinceTag(latestTag || undefined);

	if (commitsSince === 0) {
		console.log(colors.success(`${icons.check} No changes since last release`));
		logger.newline();
		return;
	}

	// Parse commits
	const logOutput = git.log({ from: latestTag || undefined });
	const rawCommits = git.parseLogOutput(logOutput);
	const commits = parseCommits(rawCommits);

	// Summary by type
	const typeCounts: Record<string, number> = {};
	let breakingCount = 0;

	for (const commit of commits) {
		typeCounts[commit.type] = (typeCounts[commit.type] || 0) + 1;
		if (commit.breaking) breakingCount++;
	}

	// Suggest version bump
	let suggestedBump = 'patch';
	if (breakingCount > 0) {
		suggestedBump = 'major';
	} else if (typeCounts.feat) {
		suggestedBump = 'minor';
	}

	// Changes summary
	console.log(chalk.bold(`${icons.git} Pending Changes`));
	logger.divider();
	logger.newline();

	console.log(
		`  ${colors.highlight(commitsSince.toString())} commits since ${latestTag || 'beginning'}`
	);
	logger.newline();

	// Type breakdown
	const typeLabels = { ...COMMIT_TYPES, ...config.changelog.types };
	const sortedTypes = Object.entries(typeCounts)
		.sort((a, b) => b[1] - a[1])
		.filter(([type]) => type !== 'other');

	if (sortedTypes.length > 0) {
		const summaryTable = new Table({
			style: { head: [], border: ['gray'] },
			chars: {
				top: '',
				'top-mid': '',
				'top-left': '',
				'top-right': '',
				bottom: '',
				'bottom-mid': '',
				'bottom-left': '',
				'bottom-right': '',
				left: '  ',
				'left-mid': '',
				mid: '',
				'mid-mid': '',
				right: '',
				'right-mid': '',
				middle: '  ',
			},
		});

		for (const [type, count] of sortedTypes) {
			const label = typeLabels[type] || type;
			summaryTable.push([colors.muted(label), colors.highlight(count.toString())]);
		}

		if (breakingCount > 0) {
			summaryTable.push([colors.error('Breaking changes'), colors.error(breakingCount.toString())]);
		}

		console.log(summaryTable.toString());
		logger.newline();
	}

	// Verbose: show all commits
	if (verbose && commits.length > 0) {
		console.log(chalk.bold('Commits:'));
		logger.divider();

		for (const commit of commits.slice(0, 20)) {
			const typeColor = commit.breaking ? colors.error : colors.muted;
			const scope = commit.scope ? `(${commit.scope})` : '';
			console.log(
				`  ${colors.muted(commit.shortHash)} ${typeColor(commit.type)}${scope}: ${commit.subject}`
			);
		}

		if (commits.length > 20) {
			console.log(colors.muted(`  ... and ${commits.length - 20} more`));
		}

		logger.newline();
	}

	// Suggested next version
	if (packageVersion) {
		try {
			const currentVersion = semver.parse(packageVersion);
			const nextVersion = semver.bump(currentVersion, suggestedBump as any);
			const nextVersionStr = semver.format(nextVersion);

			console.log(chalk.bold(`${icons.rocket} Suggested Release`));
			logger.divider();
			logger.newline();

			console.log(`  ${colors.muted('Current:')}    ${packageVersion}`);
			console.log(
				`  ${colors.muted('Next:')}       ${colors.accent(nextVersionStr)} (${suggestedBump})`
			);
			logger.newline();

			console.log(
				colors.muted(`  Run: ${colors.accent('shipmark release')} to create this release`)
			);
		} catch {
			// Version parsing failed, skip suggestion
		}
	}

	logger.newline();
}
