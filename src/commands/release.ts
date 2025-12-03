import boxen from 'boxen';
import chalk from 'chalk';
import type { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { git } from '../core/git';
import { parseCommits } from '../core/log-parser';
import { generateChangelog, generateFullChangelog, previewChangelog } from '../core/changelog-generator';
import * as semver from '../core/semver';
import { loadConfig, getVersionFromPackageJson, updateVersionInFile } from '../core/config';
import type { BumpType, PrereleaseType, Version } from '../types/version';
import { COMMIT_TYPES } from '../types/commit';
import { colors, icons, colorizeBumpType } from '../utils/colors';
import { logger } from '../utils/logger';
import { GitError, handleError } from '../utils/errors';

interface ReleaseOptions {
	dryRun?: boolean;
	skipChangelog?: boolean;
	skipTag?: boolean;
	skipPush?: boolean;
	prerelease?: string;
	yes?: boolean;
}

export function releaseCommand(program: Command): void {
	program
		.command('release')
		.description('Create a new release with changelog, tag, and push')
		.option('-d, --dry-run', 'Preview changes without executing')
		.option('--skip-changelog', 'Skip changelog generation')
		.option('--skip-tag', 'Skip tag creation')
		.option('--skip-push', 'Skip pushing to remote')
		.option('-p, --prerelease <type>', 'Create prerelease (alpha, beta, rc)')
		.option('-y, --yes', 'Skip confirmation prompts')
		.action(async (options: ReleaseOptions) => {
			try {
				await runRelease(options);
			} catch (error) {
				handleError(error);
			}
		});
}

async function runRelease(options: ReleaseOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	// Check git repository
	spinner.start('Checking git repository...');
	git.ensureRepo();

	if (!git.hasCommits()) {
		throw new GitError('No commits found in repository', [
			'Make sure you have at least one commit',
			'Run: git commit -m "Initial commit"',
		]);
	}

	spinner.succeed('Git repository OK');

	// Get current version
	const currentVersionStr = getVersionFromPackageJson(cwd);
	const latestTag = git.getLatestTag();

	let currentVersion: Version;

	if (currentVersionStr) {
		currentVersion = semver.parse(currentVersionStr);
		logger.info(`Current version: ${colors.accent(currentVersionStr)}`);
	} else if (latestTag) {
		currentVersion = semver.parse(latestTag);
		logger.info(`Latest tag: ${colors.accent(latestTag)}`);
	} else {
		currentVersion = semver.parse('0.0.0');
		logger.info('No version found, starting from 0.0.0');
	}

	// Get commits since last tag
	const commitsSince = git.getCommitsSinceTag(latestTag || undefined);
	logger.info(`${colors.highlight(commitsSince.toString())} commits since last release`);

	if (commitsSince === 0 && !options.yes) {
		const { proceed } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'proceed',
				message: 'No new commits since last release. Continue anyway?',
				default: false,
			},
		]);

		if (!proceed) {
			logger.info('Release cancelled');
			return;
		}
	}

	// Fetch and parse commits
	spinner.start('Fetching commits...');
	const logOutput = git.log({ from: latestTag || undefined });
	const rawCommits = git.parseLogOutput(logOutput);
	const commits = parseCommits(rawCommits);
	spinner.succeed(`Found ${commits.length} commits`);

	// Preview changelog
	if (commits.length > 0) {
		logger.header('Changelog Preview');
		const preview = previewChangelog(commits, { ...COMMIT_TYPES, ...config.changelog.types });
		for (const line of preview) {
			console.log(`  ${colors.muted(line)}`);
		}
		logger.newline();
	}

	// Select version bump
	const prereleaseType = (options.prerelease as PrereleaseType) || 'alpha';
	const bumpOptions = semver.getBumpOptions(currentVersion, prereleaseType);

	let selectedBump: BumpType;
	let newVersionStr: string;

	if (options.yes && options.prerelease) {
		selectedBump = 'prerelease';
		const newVersion = semver.bump(currentVersion, selectedBump, prereleaseType);
		newVersionStr = semver.format(newVersion);
	} else {
		const choices = bumpOptions.map((opt) => ({
			name: `${colorizeBumpType(opt.type).padEnd(20)} ${icons.arrow} ${colors.accent(opt.newVersion)}`,
			value: opt.type,
			short: opt.newVersion,
		}));

		choices.push({
			name: `${colors.muted('custom')}                  ${icons.arrow} Enter custom version`,
			value: 'custom' as BumpType,
			short: 'custom',
		});

		const { bumpType } = await inquirer.prompt([
			{
				type: 'list',
				name: 'bumpType',
				message: 'Select version bump:',
				choices,
			},
		]);

		if (bumpType === 'custom') {
			const { customVersion } = await inquirer.prompt([
				{
					type: 'input',
					name: 'customVersion',
					message: 'Enter custom version:',
					validate: (input: string) => {
						if (!semver.isValid(input)) {
							return 'Invalid semver format (e.g., 1.0.0, 2.0.0-beta.1)';
						}
						return true;
					},
				},
			]);
			newVersionStr = semver.clean(customVersion);
			selectedBump = 'patch'; // placeholder
		} else {
			selectedBump = bumpType;
			const newVersion = semver.bump(currentVersion, selectedBump, prereleaseType);
			newVersionStr = semver.format(newVersion);
		}
	}

	const tagName = `${config.version.tagPrefix}${newVersionStr}`;

	// Summary
	logger.header('Release Summary');
	console.log(`  ${colors.muted('Version:')}    ${colors.highlight(newVersionStr)}`);
	console.log(`  ${colors.muted('Tag:')}        ${colors.highlight(tagName)}`);
	console.log(`  ${colors.muted('Commits:')}    ${colors.highlight(commits.length.toString())}`);
	console.log(`  ${colors.muted('Changelog:')} ${options.skipChangelog ? colors.warning('skipped') : colors.success('yes')}`);
	console.log(`  ${colors.muted('Push:')}       ${options.skipPush ? colors.warning('skipped') : colors.success('yes')}`);
	logger.newline();

	if (options.dryRun) {
		logger.warning('Dry run mode - no changes will be made');
		return;
	}

	// Confirmation
	if (!options.yes) {
		const { confirm } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'confirm',
				message: `Release ${colors.accent(newVersionStr)}?`,
				default: true,
			},
		]);

		if (!confirm) {
			logger.info('Release cancelled');
			return;
		}
	}

	// Execute release
	logger.newline();

	// Update version files
	spinner.start('Updating version files...');
	for (const file of config.version.files) {
		try {
			updateVersionInFile(file, newVersionStr, cwd);
		} catch {
			// File might not exist, skip
		}
	}
	spinner.succeed('Version files updated');

	// Generate changelog
	if (!options.skipChangelog) {
		spinner.start('Generating changelog...');
		const today = new Date().toISOString().split('T')[0];
		const remoteUrl = git.getRemoteUrl()?.replace(/\.git$/, '').replace(/^git@github.com:/, 'https://github.com/');

		const changelogEntry = generateChangelog({
			version: newVersionStr,
			date: today,
			commits,
			config: config.changelog,
			repoUrl: remoteUrl || undefined,
		});

		const changelogPath = join(cwd, config.changelog.file);
		const existingChangelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';
		const fullChangelog = generateFullChangelog(existingChangelog, changelogEntry, newVersionStr);

		writeFileSync(changelogPath, fullChangelog, 'utf8');
		spinner.succeed('Changelog updated');
	}

	// Create commit
	spinner.start('Creating release commit...');
	const commitMessage = config.version.commitMessage.replace('{version}', newVersionStr);
	git.stageAll();
	git.commit(commitMessage, [], config.git.signCommits);
	spinner.succeed('Release commit created');

	// Create tag
	if (!options.skipTag) {
		spinner.start('Creating tag...');
		const tagMessage = config.version.tagMessage.replace('{version}', newVersionStr);
		git.createTag(tagName, tagMessage, config.git.signTags);
		spinner.succeed(`Tag ${colors.accent(tagName)} created`);
	}

	// Push
	if (!options.skipPush && git.hasRemote()) {
		spinner.start('Pushing to remote...');
		git.push(config.git.pushTags && !options.skipTag);
		spinner.succeed('Pushed to remote');
	}

	// Done!
	logger.newline();
	console.log(
		boxen(
			`${icons.rocket} ${chalk.bold.green('Released')} ${chalk.bold.white(newVersionStr)}`,
			{
				padding: 1,
				margin: { top: 0, bottom: 1, left: 0, right: 0 },
				borderStyle: 'round',
				borderColor: 'green',
			}
		)
	);
}
