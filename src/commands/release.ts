import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import boxen from 'boxen';
import chalk from 'chalk';
import type { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import {
	generateChangelog,
	generateFullChangelog,
	previewChangelog,
} from '../core/changelog-generator';
import {
	getVersionFromPackageJson,
	loadConfig,
	updateVersionInFiles,
	validateVersionSync,
} from '../core/config';
import { git } from '../core/git';
import { parseCommits } from '../core/log-parser';
import { executeRelease, getReleaseProviderInfo } from '../core/release-provider';
import * as semver from '../core/semver';
import { normalizeFileConfig } from '../handlers/types';
import { COMMIT_TYPES } from '../types/commit';
import type { BumpType, PrereleaseType, Version } from '../types/version';
import { colorizeBumpType, colors, icons } from '../utils/colors';
import { GitError, handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ReleaseOptions {
	dryRun?: boolean;
	skipChangelog?: boolean;
	skipTag?: boolean;
	skipPush?: boolean;
	prerelease?: string;
	yes?: boolean;
	ci?: string;
	createRelease?: boolean;
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
		.option('--ci <bump>', 'CI mode: non-interactive release (patch, minor, major, auto)')
		.option('-r, --create-release', 'Create GitHub/GitLab release using CLI (if available)')
		.action(async (options: ReleaseOptions) => {
			try {
				await runRelease(options);
			} catch (error) {
				handleError(error);
			}
		});
}

function detectBumpType(commits: Array<{ type: string; breaking: boolean }>): BumpType {
	const hasBreaking = commits.some((c) => c.breaking);
	const hasFeature = commits.some((c) => c.type === 'feat');

	if (hasBreaking) return 'major';
	if (hasFeature) return 'minor';
	return 'patch';
}

async function runRelease(options: ReleaseOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);
	const isCiMode = !!options.ci;

	// Check git repository
	if (!isCiMode) spinner.start('Checking git repository...');
	git.ensureRepo();

	if (!git.hasCommits()) {
		throw new GitError('No commits found in repository', [
			'Make sure you have at least one commit',
			'Run: git commit -m "Initial commit"',
		]);
	}

	if (!isCiMode) spinner.succeed('Git repository OK');

	// Get current version
	const currentVersionStr = getVersionFromPackageJson(cwd);
	const latestTag = git.getLatestTag();

	let currentVersion: Version;

	if (currentVersionStr) {
		currentVersion = semver.parse(currentVersionStr);
		if (!isCiMode) logger.info(`Current version: ${colors.accent(currentVersionStr)}`);
	} else if (latestTag) {
		currentVersion = semver.parse(latestTag);
		if (!isCiMode) logger.info(`Latest tag: ${colors.accent(latestTag)}`);
	} else {
		currentVersion = semver.parse('0.0.0');
		if (!isCiMode) logger.info('No version found, starting from 0.0.0');
	}

	// Get commits since last tag
	const commitsSince = git.getCommitsSinceTag(latestTag || undefined);
	if (!isCiMode) {
		logger.info(`${colors.highlight(commitsSince.toString())} commits since last release`);
	}

	if (commitsSince === 0 && !options.yes && !isCiMode) {
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
	if (!isCiMode) spinner.start('Fetching commits...');
	const logOutput = git.log({ from: latestTag || undefined });
	const rawCommits = git.parseLogOutput(logOutput);
	const commits = parseCommits(rawCommits);
	if (!isCiMode) spinner.succeed(`Found ${commits.length} commits`);

	// Preview changelog (not in CI mode unless dry-run)
	if (commits.length > 0 && (!isCiMode || options.dryRun)) {
		logger.header('Changelog Preview');
		const preview = previewChangelog(commits, { ...COMMIT_TYPES, ...config.changelog.types });
		for (const line of preview) {
			console.log(`  ${colors.muted(line)}`);
		}
		logger.newline();
	}

	// Select version bump
	const prereleaseType = (options.prerelease as PrereleaseType) || 'alpha';

	let selectedBump: BumpType;
	let newVersionStr: string;

	// CI mode: non-interactive bump selection
	if (isCiMode) {
		const ciBump = options.ci?.toLowerCase() || 'auto';

		if (ciBump === 'auto') {
			selectedBump = detectBumpType(commits);
		} else if (
			['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'].includes(ciBump)
		) {
			selectedBump = ciBump as BumpType;
		} else {
			throw new GitError(`Invalid CI bump type: ${ciBump}`, [
				'Valid options: auto, major, minor, patch, premajor, preminor, prepatch, prerelease',
			]);
		}

		const newVersion = semver.bump(currentVersion, selectedBump, prereleaseType);
		newVersionStr = semver.format(newVersion);
	} else if (options.yes && options.prerelease) {
		selectedBump = 'prerelease';
		const newVersion = semver.bump(currentVersion, selectedBump, prereleaseType);
		newVersionStr = semver.format(newVersion);
	} else {
		const bumpOptions = semver.getBumpOptions(currentVersion, prereleaseType);
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
	console.log(`  ${colors.muted('Bump:')}       ${colorizeBumpType(selectedBump)}`);
	console.log(
		`  ${colors.muted('Changelog:')} ${options.skipChangelog ? colors.warning('skipped') : colors.success('yes')}`
	);
	console.log(
		`  ${colors.muted('Push:')}       ${options.skipPush ? colors.warning('skipped') : colors.success('yes')}`
	);
	logger.newline();

	// Enhanced dry-run: show full changelog that would be generated
	if (options.dryRun) {
		if (!options.skipChangelog && commits.length > 0) {
			const today = new Date().toISOString().split('T')[0];
			const remoteUrl = git
				.getRemoteUrl()
				?.replace(/\.git$/, '')
				.replace(/^git@github.com:/, 'https://github.com/');

			const changelogEntry = generateChangelog({
				version: newVersionStr,
				date: today,
				commits,
				config: config.changelog,
				repoUrl: remoteUrl || undefined,
			});

			logger.header('Changelog Output (dry-run)');
			console.log(colors.muted('─'.repeat(50)));
			console.log(changelogEntry);
			console.log(colors.muted('─'.repeat(50)));
			logger.newline();
		}

		// Show files that would be updated
		logger.header('Files to update');
		for (const file of config.version.files) {
			const fileConfig = normalizeFileConfig(file);
			const currentVersion = getVersionFromPackageJson(cwd) || 'unknown';
			const keyInfo = fileConfig.key ? `:${fileConfig.key}` : '';
			console.log(
				`  ${icons.success} ${fileConfig.path}${keyInfo} (${currentVersion} ${icons.arrow} ${newVersionStr})`
			);
		}
		logger.newline();

		logger.warning('Dry run mode - no changes will be made');
		logger.newline();

		// CI mode output
		if (isCiMode) {
			console.log(`SHIPMARK_VERSION=${newVersionStr}`);
			console.log(`SHIPMARK_TAG=${tagName}`);
			console.log(`SHIPMARK_BUMP=${selectedBump}`);
		}

		return;
	}

	// Check version sync if enabled
	if (config.version.syncCheck && config.version.files.length > 1) {
		const { synced, versions, mismatches } = validateVersionSync(config.version.files, cwd);
		if (!synced) {
			logger.warning('Version mismatch detected:');
			for (const [filepath, version] of versions.entries()) {
				const isMismatch = mismatches.includes(filepath);
				const icon = isMismatch ? icons.error : icons.success;
				console.log(`  ${icon} ${filepath}: ${version}`);
			}
			logger.newline();

			if (!options.yes && !isCiMode) {
				const { continueAnyway } = await inquirer.prompt([
					{
						type: 'confirm',
						name: 'continueAnyway',
						message: 'Versions differ. Continue anyway?',
						default: false,
					},
				]);

				if (!continueAnyway) {
					logger.info('Release cancelled');
					return;
				}
			}
		}
	}

	// Confirmation (skip in CI mode)
	if (!options.yes && !isCiMode) {
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
	if (!isCiMode) logger.newline();

	// Update version files
	if (!isCiMode) spinner.start('Updating version files...');
	updateVersionInFiles(config.version.files, newVersionStr, cwd);
	if (!isCiMode) spinner.succeed('Version files updated');

	// Generate changelog
	if (!options.skipChangelog) {
		if (!isCiMode) spinner.start('Generating changelog...');
		const today = new Date().toISOString().split('T')[0];
		const remoteUrl = git
			.getRemoteUrl()
			?.replace(/\.git$/, '')
			.replace(/^git@github.com:/, 'https://github.com/');

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
		if (!isCiMode) spinner.succeed('Changelog updated');
	}

	// Create commit
	if (!isCiMode) spinner.start('Creating release commit...');
	const commitMessage = config.version.commitMessage.replace('{version}', newVersionStr);
	git.stageAll();
	git.commit(commitMessage, [], config.git.signCommits);
	if (!isCiMode) spinner.succeed('Release commit created');

	// Create tag
	if (!options.skipTag) {
		if (!isCiMode) spinner.start('Creating tag...');
		const tagMessage = config.version.tagMessage.replace('{version}', newVersionStr);
		git.createTag(tagName, tagMessage, config.git.signTags);
		if (!isCiMode) spinner.succeed(`Tag ${colors.accent(tagName)} created`);
	}

	// Push
	if (!options.skipPush && git.hasRemote()) {
		if (!isCiMode) spinner.start('Pushing to remote...');
		git.push(config.git.pushTags && !options.skipTag);
		if (!isCiMode) spinner.succeed('Pushed to remote');
	}

	// Create GitHub/GitLab release if requested
	const releaseInfo = getReleaseProviderInfo(tagName, config.changelog.file);

	if (options.createRelease && !options.skipPush && git.hasRemote()) {
		if (releaseInfo.cliAvailable && releaseInfo.releaseCommand) {
			if (!isCiMode) spinner.start(`Creating ${releaseInfo.provider} release...`);
			const result = executeRelease(tagName, config.changelog.file);
			if (result.success) {
				if (!isCiMode) spinner.succeed(`${releaseInfo.provider} release created`);
			} else {
				if (!isCiMode) spinner.fail(`Failed to create release: ${result.output}`);
			}
		} else if (releaseInfo.cli) {
			logger.warning(
				`CLI '${releaseInfo.cli}' not found. Install it to create releases automatically.`
			);
			if (releaseInfo.releaseCommand) {
				logger.info(`Run manually: ${colors.accent(releaseInfo.releaseCommand)}`);
			}
		}
	}

	// Done!
	if (isCiMode) {
		// CI mode: output variables for pipeline consumption
		console.log(`SHIPMARK_VERSION=${newVersionStr}`);
		console.log(`SHIPMARK_TAG=${tagName}`);
		console.log(`SHIPMARK_BUMP=${selectedBump}`);
	} else {
		logger.newline();
		console.log(
			boxen(`${icons.rocket} ${chalk.bold.green('Released')} ${chalk.bold.white(newVersionStr)}`, {
				padding: 1,
				margin: { top: 0, bottom: 1, left: 0, right: 0 },
				borderStyle: 'round',
				borderColor: 'green',
			})
		);

		// Show release hint if not already created
		if (!options.createRelease && releaseInfo.provider !== 'unknown' && !options.skipPush) {
			logger.newline();
			if (releaseInfo.cliAvailable && releaseInfo.releaseCommand) {
				logger.info(`${icons.info} Create ${releaseInfo.provider} release:`);
				console.log(`  ${colors.accent(releaseInfo.releaseCommand)}`);
			} else if (releaseInfo.releaseUrl) {
				logger.info(`${icons.info} Create ${releaseInfo.provider} release:`);
				console.log(`  ${colors.accent(releaseInfo.releaseUrl)}`);
			}
			if (releaseInfo.cli && !releaseInfo.cliAvailable) {
				console.log(colors.muted(`  Or install '${releaseInfo.cli}' CLI for automatic releases`));
			}
		}
	}
}
