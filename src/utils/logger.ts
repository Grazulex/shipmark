import type { ParsedCommit } from '../types/commit';
import { colors, icons } from './colors';

export const logger = {
	success(message: string): void {
		console.log(`${colors.success(icons.success)} ${message}`);
	},

	error(message: string): void {
		console.error(`${colors.error(icons.error)} ${message}`);
	},

	warning(message: string): void {
		console.warn(`${colors.warning(icons.warning)} ${message}`);
	},

	info(message: string): void {
		console.log(`${colors.info(icons.info)} ${message}`);
	},

	log(message: string): void {
		console.log(message);
	},

	newline(): void {
		console.log();
	},

	divider(): void {
		console.log(colors.dim('─'.repeat(50)));
	},

	header(title: string): void {
		logger.newline();
		console.log(colors.highlight(title));
		logger.divider();
	},

	step(message: string): void {
		console.log(`  ${colors.muted(icons.arrow)} ${message}`);
	},

	list(items: string[]): void {
		for (const item of items) {
			console.log(`  ${colors.muted(icons.bullet)} ${item}`);
		}
	},
};

/**
 * Report the commits that are left out of the changelog because they are not
 * conventional commits. Silence here is what makes a release look complete
 * while it is not, so the commits are named individually.
 */
export function warnAboutSkippedCommits(
	commits: ParsedCommit[],
	typeLabels: Record<string, string>
): void {
	if (typeLabels.other !== undefined) return;

	const skipped = commits.filter((c) => c.type === 'other');
	if (skipped.length === 0) return;

	logger.warning(
		`${skipped.length} commit(s) are not conventional commits and are left out of the changelog:`
	);

	for (const commit of skipped) {
		logger.step(`${commit.shortHash} ${commit.subject}`);
	}

	logger.step(colors.muted('Set commits.conventional to false to include them.'));
}
