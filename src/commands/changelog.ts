import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import type { Command } from 'commander';
import ora from 'ora';
import {
	generateChangelog,
	generateFullChangelog,
	previewChangelog,
} from '../core/changelog-generator';
import { getVersionFromPackageJson, loadConfig } from '../core/config';
import { git } from '../core/git';
import { parseCommits } from '../core/log-parser';
import { COMMIT_TYPES } from '../types/commit';
import { colors } from '../utils/colors';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ChangelogOptions {
	from?: string;
	to?: string;
	output?: string;
	preview?: boolean;
	version?: string;
}

export function changelogCommand(program: Command): void {
	program
		.command('changelog')
		.description('Generate or update changelog from commits')
		.option('-f, --from <tag>', 'Starting tag/commit (default: latest tag)')
		.option('-t, --to <ref>', 'Ending ref (default: HEAD)')
		.option('-o, --output <file>', 'Output file (default: CHANGELOG.md)')
		.option('-p, --preview', 'Preview changelog without writing')
		.option('-V, --version <version>', 'Version for changelog header')
		.action(async (options: ChangelogOptions) => {
			try {
				await runChangelog(options);
			} catch (error) {
				handleError(error);
			}
		});
}

async function runChangelog(options: ChangelogOptions): Promise<void> {
	const spinner = ora();
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	// Ensure git repo
	git.ensureRepo();

	// Determine version range
	const fromTag = options.from || git.getLatestTag() || undefined;
	const toRef = options.to || 'HEAD';

	logger.info(
		`Generating changelog from ${fromTag ? colors.accent(fromTag) : colors.muted('beginning')} to ${colors.accent(toRef)}`
	);

	// Fetch commits
	spinner.start('Fetching commits...');
	const logOutput = git.log({ from: fromTag, to: toRef });
	const rawCommits = git.parseLogOutput(logOutput);
	const commits = parseCommits(rawCommits);
	spinner.succeed(`Found ${commits.length} commits`);

	if (commits.length === 0) {
		logger.warning('No commits found in range');
		return;
	}

	// Determine version
	const version = options.version || getVersionFromPackageJson(cwd) || 'Unreleased';

	// Preview mode
	if (options.preview) {
		logger.header(`Changelog Preview - ${version}`);
		const preview = previewChangelog(commits, { ...COMMIT_TYPES, ...config.changelog.types });
		for (const line of preview) {
			console.log(`  ${line}`);
		}
		return;
	}

	// Generate changelog
	spinner.start('Generating changelog...');
	const today = new Date().toISOString().split('T')[0];
	const remoteUrl = git
		.getRemoteUrl()
		?.replace(/\.git$/, '')
		.replace(/^git@github.com:/, 'https://github.com/');

	const changelogEntry = generateChangelog({
		version,
		date: today,
		commits,
		config: config.changelog,
		repoUrl: remoteUrl || undefined,
	});

	// Output file
	const outputFile = options.output || config.changelog.file;
	const outputPath = join(cwd, outputFile);

	const existingChangelog = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '';
	const fullChangelog = generateFullChangelog(existingChangelog, changelogEntry, version);

	writeFileSync(outputPath, fullChangelog, 'utf8');
	spinner.succeed(`Changelog written to ${colors.accent(outputFile)}`);

	// Show summary
	logger.newline();
	logger.header('Summary');

	const typeLabels = { ...COMMIT_TYPES, ...config.changelog.types };
	const typeCounts: Record<string, number> = {};

	for (const commit of commits) {
		typeCounts[commit.type] = (typeCounts[commit.type] || 0) + 1;
	}

	for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
		const label = typeLabels[type] || type;
		console.log(`  ${colors.muted(`${label}:`)} ${colors.highlight(count.toString())}`);
	}

	const breakingCount = commits.filter((c) => c.breaking).length;
	if (breakingCount > 0) {
		console.log(
			`  ${colors.error('Breaking changes:')} ${colors.highlight(breakingCount.toString())}`
		);
	}
}
