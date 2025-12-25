import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { findConfigFile, saveConfig } from '../core/config';
import { git } from '../core/git';
import { DEFAULT_CONFIG } from '../types/config';
import { colors, icons } from '../utils/colors';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface InitOptions {
	yes?: boolean;
	force?: boolean;
}

export function initCommand(program: Command): void {
	program
		.command('init')
		.description('Initialize ShipMark configuration')
		.option('-y, --yes', 'Use default configuration')
		.option('-f, --force', 'Overwrite existing configuration')
		.action(async (options: InitOptions) => {
			try {
				await runInit(options);
			} catch (error) {
				handleError(error);
			}
		});
}

async function runInit(options: InitOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();

	logger.newline();
	console.log(chalk.bold(`${icons.rocket} ShipMark Setup`));
	logger.divider();
	logger.newline();

	// Check for existing config
	const existingConfig = findConfigFile(cwd);
	if (existingConfig && !options.force) {
		logger.warning(`Configuration already exists: ${existingConfig}`);
		logger.step('Use --force to overwrite');
		return;
	}

	// Check if git repo
	let isGitRepo = false;
	try {
		isGitRepo = git.isRepo();
	} catch {
		// Not a git repo
	}

	if (!isGitRepo) {
		logger.warning('Not a git repository');

		if (!options.yes) {
			const { initGit } = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'initGit',
					message: 'Initialize git repository?',
					default: true,
				},
			]);

			if (initGit) {
				spinner.start('Initializing git repository...');
				const { execSync } = await import('node:child_process');
				execSync('git init', { cwd, encoding: 'utf8' });
				spinner.succeed('Git repository initialized');
			}
		}
	}

	// Configuration
	const config = { ...DEFAULT_CONFIG };

	if (!options.yes) {
		// Changelog file
		const { changelogFile } = await inquirer.prompt([
			{
				type: 'input',
				name: 'changelogFile',
				message: 'Changelog file:',
				default: 'CHANGELOG.md',
			},
		]);
		config.changelog.file = changelogFile;

		// Tag prefix
		const { tagPrefix } = await inquirer.prompt([
			{
				type: 'input',
				name: 'tagPrefix',
				message: 'Tag prefix:',
				default: 'v',
			},
		]);
		config.version.tagPrefix = tagPrefix;

		// Commit message
		const { commitMessage } = await inquirer.prompt([
			{
				type: 'input',
				name: 'commitMessage',
				message: 'Commit message template:',
				default: 'chore(release): {version}',
			},
		]);
		config.version.commitMessage = commitMessage;

		// Auto push
		const { autoPush } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'autoPush',
				message: 'Auto push after release?',
				default: true,
			},
		]);
		config.git.push = autoPush;
		config.git.pushTags = autoPush;

		// GPG signing
		const { signTags } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'signTags',
				message: 'Sign tags with GPG?',
				default: false,
			},
		]);
		config.git.signTags = signTags;

		// Conventional commits
		const { conventional } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'conventional',
				message: 'Use conventional commits?',
				default: true,
			},
		]);
		config.commits.conventional = conventional;
	}

	// Save config
	spinner.start('Creating configuration file...');
	saveConfig(config, cwd);
	spinner.succeed('Configuration saved to .shipmarkrc.yml');

	// Summary
	logger.newline();
	logger.header('Configuration Summary');
	console.log(`  ${colors.muted('Changelog:')}      ${config.changelog.file}`);
	console.log(`  ${colors.muted('Tag prefix:')}     ${config.version.tagPrefix}`);
	console.log(`  ${colors.muted('Commit msg:')}     ${config.version.commitMessage}`);
	console.log(
		`  ${colors.muted('Auto push:')}      ${config.git.push ? colors.success('yes') : colors.warning('no')}`
	);
	console.log(
		`  ${colors.muted('Sign tags:')}      ${config.git.signTags ? colors.success('yes') : colors.muted('no')}`
	);
	console.log(
		`  ${colors.muted('Conventional:')}   ${config.commits.conventional ? colors.success('yes') : colors.muted('no')}`
	);

	logger.newline();
	logger.success('ShipMark initialized! Run `shipmark release` to create your first release.');
	logger.newline();
}
