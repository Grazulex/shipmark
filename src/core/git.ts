import { execSync } from 'child_process';
import { GitError } from '../utils/errors';

export interface GitLogOptions {
	from?: string;
	to?: string;
	format?: string;
}

const DEFAULT_LOG_FORMAT = '%H|%h|%s|%b|%an|%ad';
const LOG_SEPARATOR = '---COMMIT---';

function exec(command: string): string {
	try {
		return execSync(command, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
	} catch (error: any) {
		const stderr = error.stderr?.toString() || error.message;
		throw new GitError(`Git command failed: ${command}`, [stderr]);
	}
}

function execSafe(command: string): string | null {
	try {
		return exec(command);
	} catch {
		return null;
	}
}

export const git = {
	isRepo(): boolean {
		return execSafe('git rev-parse --is-inside-work-tree') === 'true';
	},

	ensureRepo(): void {
		if (!this.isRepo()) {
			throw new GitError('Not a git repository', [
				'Make sure you are in a git repository',
				'Run: git init',
			]);
		}
	},

	hasCommits(): boolean {
		return execSafe('git rev-parse HEAD') !== null;
	},

	hasRemote(): boolean {
		const remotes = execSafe('git remote');
		return remotes !== null && remotes.length > 0;
	},

	getCurrentBranch(): string {
		return exec('git rev-parse --abbrev-ref HEAD');
	},

	getRemoteUrl(): string | null {
		return execSafe('git remote get-url origin');
	},

	hasUncommittedChanges(): boolean {
		const status = exec('git status --porcelain');
		return status.length > 0;
	},

	getTags(): string[] {
		const tags = execSafe('git tag --sort=-v:refname');
		if (!tags) return [];
		return tags.split('\n').filter(Boolean);
	},

	getLatestTag(): string | null {
		return execSafe('git describe --tags --abbrev=0');
	},

	getCommitsSinceTag(tag?: string): number {
		if (!tag) {
			const count = execSafe('git rev-list --count HEAD');
			return count ? parseInt(count, 10) : 0;
		}
		const count = execSafe(`git rev-list --count ${tag}..HEAD`);
		return count ? parseInt(count, 10) : 0;
	},

	log(options: GitLogOptions = {}): string {
		const { from, to = 'HEAD', format = DEFAULT_LOG_FORMAT } = options;

		let range = to;
		if (from) {
			range = `${from}..${to}`;
		}

		const formatWithSeparator = `${format}${LOG_SEPARATOR}`;
		return exec(`git log ${range} --pretty=format:"${formatWithSeparator}" --date=short`);
	},

	parseLogOutput(output: string): Array<{
		hash: string;
		shortHash: string;
		subject: string;
		body: string;
		author: string;
		date: string;
	}> {
		if (!output) return [];

		return output
			.split(LOG_SEPARATOR)
			.filter(Boolean)
			.map((entry) => {
				const [hash, shortHash, subject, body, author, date] = entry.trim().split('|');
				return {
					hash: hash || '',
					shortHash: shortHash || '',
					subject: subject || '',
					body: body || '',
					author: author || '',
					date: date || '',
				};
			})
			.filter((commit) => commit.hash);
	},

	createTag(name: string, message: string, sign = false): void {
		const signFlag = sign ? '-s' : '-a';
		exec(`git tag ${signFlag} "${name}" -m "${message}"`);
	},

	deleteTag(name: string): void {
		exec(`git tag -d "${name}"`);
	},

	tagExists(name: string): boolean {
		return execSafe(`git rev-parse "refs/tags/${name}"`) !== null;
	},

	commit(message: string, files: string[] = [], sign = false): void {
		if (files.length > 0) {
			exec(`git add ${files.map((f) => `"${f}"`).join(' ')}`);
		}
		const signFlag = sign ? '-S' : '';
		exec(`git commit ${signFlag} -m "${message}"`);
	},

	push(includeTags = true): void {
		exec('git push');
		if (includeTags) {
			exec('git push --tags');
		}
	},

	stageAll(): void {
		exec('git add -A');
	},

	getConfig(key: string): string | null {
		return execSafe(`git config --get ${key}`);
	},
};
