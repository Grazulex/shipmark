import chalk from 'chalk';
import Table from 'cli-table3';
import type { Command } from 'commander';
import { git } from '../core/git';
import { colors, icons } from '../utils/colors';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

interface HistoryOptions {
	limit?: string;
	details?: boolean;
}

export function historyCommand(program: Command): void {
	program
		.command('history')
		.description('Show release history with dates and summaries')
		.option('-l, --limit <number>', 'Limit number of releases to show', '10')
		.option('-d, --details', 'Show commit details for each release')
		.action(async (options: HistoryOptions) => {
			try {
				await showHistory(options);
			} catch (error) {
				handleError(error);
			}
		});
}

async function showHistory(options: HistoryOptions): Promise<void> {
	git.ensureRepo();

	const tags = git.listTags();

	if (tags.length === 0) {
		logger.info('No releases found');
		return;
	}

	// Get tag details with dates
	const tagDetails = tags.map((tag) => {
		const date = git.getTagDate(tag);
		const commitCount = git.getCommitCountBetweenTags(tag);
		return { tag, date, commitCount };
	});

	// Sort by date descending (most recent first)
	tagDetails.sort((a, b) => {
		if (!a.date || !b.date) return 0;
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	// Apply limit
	const limit = Number.parseInt(options.limit || '10', 10);
	const limitedTags = tagDetails.slice(0, limit);

	logger.header('Release History');

	const table = new Table({
		head: [chalk.white.bold('Version'), chalk.white.bold('Date'), chalk.white.bold('Commits')],
		style: { head: [], border: [] },
	});

	for (const { tag, date, commitCount } of limitedTags) {
		const version = tag.replace(/^v/, '');
		const formattedDate = date ? formatDate(date) : colors.muted('unknown');
		const commits = commitCount !== null ? commitCount.toString() : '-';

		table.push([colors.accent(version), formattedDate, colors.muted(commits)]);
	}

	console.log(table.toString());
	logger.newline();

	// Show total count
	if (tags.length > limit) {
		logger.info(
			`Showing ${limit} of ${tags.length} releases. Use ${colors.accent('--limit')} to see more.`
		);
	} else {
		logger.info(`${icons.tag} ${tags.length} release${tags.length !== 1 ? 's' : ''} total`);
	}

	// Details mode: show commits for each release
	if (options.details && limitedTags.length > 0) {
		logger.newline();
		logger.header('Release Details');

		for (let i = 0; i < limitedTags.length; i++) {
			const { tag, date } = limitedTags[i];
			const prevTag = limitedTags[i + 1]?.tag;

			console.log(`\n${colors.accent(tag)} ${colors.muted(date ? `(${formatDate(date)})` : '')}`);
			console.log(colors.muted('─'.repeat(40)));

			const commits = git.getCommitsBetweenTags(prevTag, tag);
			if (commits.length === 0) {
				console.log(colors.muted('  No commits found'));
			} else {
				for (const commit of commits.slice(0, 10)) {
					console.log(`  ${colors.muted('•')} ${commit}`);
				}
				if (commits.length > 10) {
					console.log(colors.muted(`  ... and ${commits.length - 10} more`));
				}
			}
		}
	}
}

function formatDate(dateStr: string): string {
	try {
		const date = new Date(dateStr);
		return date.toISOString().split('T')[0];
	} catch {
		return dateStr;
	}
}
