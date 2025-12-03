import chalk from 'chalk';
import type { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getVersionFromPackageJson, loadConfig, updateVersionInFile } from '../core/config';
import { git } from '../core/git';
import * as semver from '../core/semver';
import type { BumpType, PrereleaseType } from '../types/version';
import { colorizeBumpType, colors, icons } from '../utils/colors';
import { ValidationError, handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface VersionBumpOptions {
	prerelease?: string;
	dryRun?: boolean;
}

export function versionCommand(program: Command): void {
	const version = program.command('version').description('Show or bump project version');

	// Show current version
	version
		.command('show')
		.alias('current')
		.description('Show current version')
		.action(async () => {
			try {
				await showVersion();
			} catch (error) {
				handleError(error);
			}
		});

	// Bump version
	version
		.command('bump [type]')
		.description('Bump version (patch, minor, major, prepatch, preminor, premajor, prerelease)')
		.option('-p, --prerelease <type>', 'Prerelease type (alpha, beta, rc)', 'alpha')
		.option('-d, --dry-run', 'Preview changes without executing')
		.action(async (type: string | undefined, options: VersionBumpOptions) => {
			try {
				await bumpVersion(type, options);
			} catch (error) {
				handleError(error);
			}
		});

	// Set specific version
	version
		.command('set <version>')
		.description('Set a specific version')
		.option('-d, --dry-run', 'Preview changes without executing')
		.action(async (newVersion: string, options: { dryRun?: boolean }) => {
			try {
				await setVersion(newVersion, options);
			} catch (error) {
				handleError(error);
			}
		});

	// Default action (show version)
	version.action(async () => {
		try {
			await showVersion();
		} catch (error) {
			handleError(error);
		}
	});
}

async function showVersion(): Promise<void> {
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	// Get version from package.json
	const packageVersion = getVersionFromPackageJson(cwd);

	// Get latest tag
	let latestTag: string | null = null;
	try {
		git.ensureRepo();
		latestTag = git.getLatestTag();
	} catch {
		// Not a git repo, that's fine
	}

	logger.newline();

	if (packageVersion) {
		console.log(`  ${colors.muted('package.json:')} ${colors.accent(packageVersion)}`);
	}

	if (latestTag) {
		const tagVersion = semver.clean(latestTag);
		console.log(`  ${colors.muted('Latest tag:')}   ${colors.accent(latestTag)} (${tagVersion})`);

		const commitsSince = git.getCommitsSinceTag(latestTag);
		if (commitsSince > 0) {
			console.log(
				`  ${colors.muted('Commits:')}      ${colors.warning(`${commitsSince} uncommitted changes`)}`
			);
		}
	}

	if (!packageVersion && !latestTag) {
		logger.info('No version found');
		logger.step('Create a package.json or git tag to track versions');
	}

	logger.newline();
}

async function bumpVersion(type: string | undefined, options: VersionBumpOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);
	const prereleaseType = (options.prerelease as PrereleaseType) || 'alpha';

	// Get current version
	const currentVersionStr = getVersionFromPackageJson(cwd);
	if (!currentVersionStr) {
		throw new ValidationError('No version found in package.json', [
			'Make sure package.json exists and has a version field',
		]);
	}

	const currentVersion = semver.parse(currentVersionStr);
	logger.info(`Current version: ${colors.accent(currentVersionStr)}`);

	// Determine bump type
	let bumpType: BumpType;

	if (type) {
		const validTypes: BumpType[] = [
			'major',
			'minor',
			'patch',
			'premajor',
			'preminor',
			'prepatch',
			'prerelease',
		];
		if (!validTypes.includes(type as BumpType)) {
			throw new ValidationError(`Invalid bump type: ${type}`, [
				`Valid types: ${validTypes.join(', ')}`,
			]);
		}
		bumpType = type as BumpType;
	} else {
		// Interactive selection
		const bumpOptions = semver.getBumpOptions(currentVersion, prereleaseType);
		const choices = bumpOptions.map((opt) => ({
			name: `${colorizeBumpType(opt.type).padEnd(20)} ${icons.arrow} ${colors.accent(opt.newVersion)}`,
			value: opt.type,
			short: opt.newVersion,
		}));

		const { selectedType } = await inquirer.prompt([
			{
				type: 'list',
				name: 'selectedType',
				message: 'Select version bump:',
				choices,
			},
		]);

		bumpType = selectedType;
	}

	// Calculate new version
	const newVersion = semver.bump(currentVersion, bumpType, prereleaseType);
	const newVersionStr = semver.format(newVersion);

	logger.newline();
	console.log(`  ${colors.muted('Bump:')}        ${colorizeBumpType(bumpType)}`);
	console.log(`  ${colors.muted('Current:')}     ${currentVersionStr}`);
	console.log(`  ${colors.muted('New:')}         ${colors.accent(newVersionStr)}`);
	logger.newline();

	if (options.dryRun) {
		logger.warning('Dry run mode - no changes made');
		return;
	}

	// Update version files
	spinner.start('Updating version files...');
	for (const file of config.version.files) {
		try {
			updateVersionInFile(file, newVersionStr, cwd);
			logger.step(`Updated ${file}`);
		} catch {
			// File might not exist, skip
		}
	}
	spinner.succeed(`Version bumped to ${colors.accent(newVersionStr)}`);
}

async function setVersion(newVersion: string, options: { dryRun?: boolean }): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	// Validate version
	const cleanVersion = semver.clean(newVersion);
	if (!semver.isValid(cleanVersion)) {
		throw new ValidationError(`Invalid version format: ${newVersion}`, [
			'Version must follow semver format',
			'Examples: 1.0.0, 2.1.3-beta.1',
		]);
	}

	// Get current version
	const currentVersionStr = getVersionFromPackageJson(cwd);

	logger.newline();
	if (currentVersionStr) {
		console.log(`  ${colors.muted('Current:')} ${currentVersionStr}`);
	}
	console.log(`  ${colors.muted('New:')}     ${colors.accent(cleanVersion)}`);
	logger.newline();

	if (options.dryRun) {
		logger.warning('Dry run mode - no changes made');
		return;
	}

	// Update version files
	spinner.start('Setting version...');
	for (const file of config.version.files) {
		try {
			updateVersionInFile(file, cleanVersion, cwd);
		} catch {
			// File might not exist, skip
		}
	}
	spinner.succeed(`Version set to ${colors.accent(cleanVersion)}`);
}
