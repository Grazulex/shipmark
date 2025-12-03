import chalk from 'chalk';
import Table from 'cli-table3';
import type { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig } from '../core/config';
import { git } from '../core/git';
import * as semver from '../core/semver';
import { colors, icons } from '../utils/colors';
import { GitError, ValidationError, handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface TagCreateOptions {
	message?: string;
	sign?: boolean;
	push?: boolean;
}

interface TagDeleteOptions {
	remote?: boolean;
	yes?: boolean;
}

export function tagCommand(program: Command): void {
	const tag = program.command('tag').description('Manage git tags');

	// List tags
	tag
		.command('list')
		.alias('ls')
		.description('List all tags')
		.option('-n, --limit <number>', 'Limit number of tags', '10')
		.action(async (options) => {
			try {
				await listTags(Number.parseInt(options.limit, 10));
			} catch (error) {
				handleError(error);
			}
		});

	// Create tag
	tag
		.command('create <version>')
		.description('Create a new tag')
		.option('-m, --message <message>', 'Tag message')
		.option('-s, --sign', 'Sign the tag with GPG')
		.option('-p, --push', 'Push tag to remote')
		.action(async (version: string, options: TagCreateOptions) => {
			try {
				await createTag(version, options);
			} catch (error) {
				handleError(error);
			}
		});

	// Delete tag
	tag
		.command('delete <version>')
		.alias('rm')
		.description('Delete a tag')
		.option('-r, --remote', 'Also delete from remote')
		.option('-y, --yes', 'Skip confirmation')
		.action(async (version: string, options: TagDeleteOptions) => {
			try {
				await deleteTag(version, options);
			} catch (error) {
				handleError(error);
			}
		});

	// Latest tag
	tag
		.command('latest')
		.description('Show the latest tag')
		.action(async () => {
			try {
				await showLatestTag();
			} catch (error) {
				handleError(error);
			}
		});
}

async function listTags(limit: number): Promise<void> {
	git.ensureRepo();

	const tags = git.getTags();

	if (tags.length === 0) {
		logger.info('No tags found');
		return;
	}

	const table = new Table({
		head: [chalk.bold.cyan('Tag'), chalk.bold.cyan('Version')],
		style: { head: [], border: ['gray'] },
	});

	const displayTags = tags.slice(0, limit);

	for (const tag of displayTags) {
		const version = semver.clean(tag);
		table.push([colors.accent(tag), colors.muted(version)]);
	}

	console.log(table.toString());

	if (tags.length > limit) {
		logger.info(`Showing ${limit} of ${tags.length} tags. Use --limit to show more.`);
	}
}

async function createTag(version: string, options: TagCreateOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	git.ensureRepo();

	// Validate version
	const cleanVersion = semver.clean(version);
	if (!semver.isValid(cleanVersion)) {
		throw new ValidationError(`Invalid version format: ${version}`, [
			'Version must follow semver format',
			'Examples: 1.0.0, 2.1.3-beta.1',
		]);
	}

	// Build tag name
	const tagName = version.startsWith(config.version.tagPrefix)
		? version
		: `${config.version.tagPrefix}${cleanVersion}`;

	// Check if tag exists
	if (git.tagExists(tagName)) {
		throw new GitError(`Tag ${tagName} already exists`, [
			`Delete the existing tag first: shipmark tag delete ${tagName}`,
			'Or use a different version number',
		]);
	}

	// Determine message
	const message = options.message || config.version.tagMessage.replace('{version}', cleanVersion);

	// Create tag
	spinner.start(`Creating tag ${tagName}...`);
	const sign = options.sign ?? config.git.signTags;
	git.createTag(tagName, message, sign);
	spinner.succeed(`Tag ${colors.accent(tagName)} created`);

	// Push if requested
	if (options.push) {
		spinner.start('Pushing tag to remote...');
		git.push(true);
		spinner.succeed('Tag pushed to remote');
	}
}

async function deleteTag(version: string, options: TagDeleteOptions): Promise<void> {
	const spinner = ora();
	const config = loadConfig();

	git.ensureRepo();

	// Build tag name
	const tagName = version.startsWith(config.version.tagPrefix)
		? version
		: `${config.version.tagPrefix}${version}`;

	// Check if tag exists
	if (!git.tagExists(tagName)) {
		throw new GitError(`Tag ${tagName} does not exist`, ['List available tags: shipmark tag list']);
	}

	// Confirmation
	if (!options.yes) {
		const { confirm } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'confirm',
				message: `Delete tag ${colors.accent(tagName)}?`,
				default: false,
			},
		]);

		if (!confirm) {
			logger.info('Cancelled');
			return;
		}
	}

	// Delete local tag
	spinner.start(`Deleting tag ${tagName}...`);
	git.deleteTag(tagName);
	spinner.succeed(`Tag ${colors.accent(tagName)} deleted locally`);

	// Delete remote tag
	if (options.remote && git.hasRemote()) {
		spinner.start('Deleting tag from remote...');
		try {
			const { execSync } = await import('node:child_process');
			execSync(`git push origin :refs/tags/${tagName}`, { encoding: 'utf8' });
			spinner.succeed('Tag deleted from remote');
		} catch {
			spinner.fail('Failed to delete tag from remote');
		}
	}
}

async function showLatestTag(): Promise<void> {
	git.ensureRepo();

	const latestTag = git.getLatestTag();

	if (!latestTag) {
		logger.info('No tags found');
		return;
	}

	const commitsSince = git.getCommitsSinceTag(latestTag);

	logger.newline();
	console.log(`  ${colors.muted('Latest tag:')}    ${colors.accent(latestTag)}`);
	console.log(`  ${colors.muted('Commits since:')} ${colors.highlight(commitsSince.toString())}`);
	logger.newline();
}
