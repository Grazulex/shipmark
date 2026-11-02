import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { extractVersionEntry } from './changelog-generator';
import { git } from './git';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'unknown';

export interface ReleaseProviderInfo {
	provider: GitProvider;
	cli: string | null;
	cliAvailable: boolean;
	releaseCommand: string | null;
	releaseUrl: string | null;
}

export interface PullRequestInfo {
	provider: GitProvider;
	cli: string | null;
	cliAvailable: boolean;
	prCommand: string | null;
	prUrl: string | null;
}

const PROVIDER_CONFIG: Record<
	Exclude<GitProvider, 'unknown'>,
	{
		hosts: string[];
		cli: string;
		releaseCmd: (tag: string, notesFile: string) => string;
		prCmd: (title: string, body: string, base: string) => string;
	}
> = {
	github: {
		hosts: ['github'],
		cli: 'gh',
		releaseCmd: (tag, notesFile) => `gh release create ${tag} --notes-file ${notesFile}`,
		prCmd: (title, body, base) =>
			`gh pr create --title "${title}" --body "${body}" --base "${base}"`,
	},
	gitlab: {
		hosts: ['gitlab'],
		cli: 'glab',
		releaseCmd: (tag, notesFile) => `glab release create ${tag} --notes-file ${notesFile}`,
		prCmd: (title, body, base) =>
			`glab mr create --title "${title}" --description "${body}" --target-branch "${base}"`,
	},
	bitbucket: {
		hosts: ['bitbucket'],
		cli: 'bb', // Bitbucket CLI is less common
		releaseCmd: () => '', // Bitbucket doesn't have native releases like GitHub/GitLab
		prCmd: () => '', // Bitbucket CLI doesn't support PR creation the same way
	},
};

function isCliAvailable(cli: string): boolean {
	try {
		execSync(`which ${cli}`, { stdio: 'pipe' });
		return true;
	} catch {
		// Try 'where' on Windows
		try {
			execSync(`where ${cli}`, { stdio: 'pipe' });
			return true;
		} catch {
			return false;
		}
	}
}

function getRemoteHost(remoteUrl: string): string {
	try {
		return new URL(remoteUrl).hostname.toLowerCase();
	} catch {
		// scp-like syntax has no scheme: [user@]host:owner/repo.git
		const match = remoteUrl.match(/^(?:[^@:/]+@)?([^:/]+):/);
		return match ? match[1].toLowerCase() : '';
	}
}

function stripGitSuffix(path: string): string {
	return path.replace(/\.git$/, '').replace(/\/$/, '');
}

/**
 * Convert a git remote URL to the repository's web URL. Credentials and SSH
 * ports are dropped, so neither ends up in a link.
 */
export function toWebUrl(remoteUrl: string): string | null {
	try {
		const url = new URL(remoteUrl);
		if (!url.hostname) return null;

		const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
		const origin = isWeb ? `${url.protocol}//${url.host}` : `https://${url.hostname}`;
		return `${origin}${stripGitSuffix(url.pathname)}`;
	} catch {
		// scp-like syntax has no scheme: [user@]host:owner/repo.git
		const match = remoteUrl.match(/^(?:[^@:/]+@)?([^:/]+):(.+)$/);
		return match ? `https://${match[1]}/${stripGitSuffix(match[2])}` : null;
	}
}

/**
 * The repository's web URL and provider, used to build links in the changelog.
 */
export function getRepositoryLinks(): { repoUrl?: string; provider?: GitProvider } {
	const remoteUrl = git.getRemoteUrl();
	if (!remoteUrl) return {};

	return { repoUrl: toWebUrl(remoteUrl) ?? undefined, provider: detectProvider(remoteUrl) };
}

export function detectProvider(remoteUrl: string): GitProvider {
	// Match on the host only, so self-hosted instances such as gitlab.example.com are detected too
	const host = getRemoteHost(remoteUrl);

	for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
		if (config.hosts.some((name) => host.includes(name))) {
			return provider as GitProvider;
		}
	}

	return 'unknown';
}

function getWebReleaseUrl(remoteUrl: string, provider: GitProvider, tag: string): string | null {
	const httpsUrl = toWebUrl(remoteUrl);
	if (provider === 'unknown' || !httpsUrl) return null;

	switch (provider) {
		case 'github':
			return `${httpsUrl}/releases/new?tag=${tag}`;
		case 'gitlab':
			return `${httpsUrl}/-/releases/new?tag_name=${tag}`;
		case 'bitbucket':
			return null; // Bitbucket doesn't have the same release concept
		default:
			return null;
	}
}

export function getReleaseProviderInfo(
	tag: string,
	changelogFile = 'CHANGELOG.md'
): ReleaseProviderInfo {
	const remoteUrl = git.getRemoteUrl();

	if (!remoteUrl) {
		return {
			provider: 'unknown',
			cli: null,
			cliAvailable: false,
			releaseCommand: null,
			releaseUrl: null,
		};
	}

	const provider = detectProvider(remoteUrl);

	if (provider === 'unknown') {
		return {
			provider: 'unknown',
			cli: null,
			cliAvailable: false,
			releaseCommand: null,
			releaseUrl: getWebReleaseUrl(remoteUrl, provider, tag),
		};
	}

	const config = PROVIDER_CONFIG[provider];
	const cliAvailable = isCliAvailable(config.cli);
	const releaseCommand = config.releaseCmd(tag, changelogFile);

	return {
		provider,
		cli: config.cli,
		cliAvailable,
		releaseCommand: releaseCommand || null,
		releaseUrl: getWebReleaseUrl(remoteUrl, provider, tag),
	};
}

/**
 * Write the version's changelog entry to a temporary file, so the release
 * notes hold only that version. Falls back to the whole changelog when it has
 * no entry for the version.
 */
function writeReleaseNotes(changelogFile: string, version?: string): string {
	if (!version || !existsSync(changelogFile)) return changelogFile;

	const notes = extractVersionEntry(readFileSync(changelogFile, 'utf8'), version);
	if (notes === null) return changelogFile;

	const notesFile = join(mkdtempSync(join(tmpdir(), 'shipmark-')), 'release-notes.md');
	writeFileSync(notesFile, `${notes}\n`, 'utf8');
	return notesFile;
}

export function executeRelease(
	tag: string,
	changelogFile = 'CHANGELOG.md',
	version?: string
): { success: boolean; output: string } {
	const notesFile = writeReleaseNotes(changelogFile, version);

	try {
		return runRelease(tag, notesFile);
	} finally {
		if (notesFile !== changelogFile) rmSync(dirname(notesFile), { recursive: true, force: true });
	}
}

function runRelease(tag: string, notesFile: string): { success: boolean; output: string } {
	const info = getReleaseProviderInfo(tag, notesFile);

	if (!info.releaseCommand) {
		return {
			success: false,
			output: `No release command available for provider: ${info.provider}`,
		};
	}

	if (!info.cliAvailable) {
		return {
			success: false,
			output: `CLI '${info.cli}' not found. Install it or create the release manually.`,
		};
	}

	try {
		const output = execSync(info.releaseCommand, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		return { success: true, output: output.trim() };
	} catch (error: any) {
		return {
			success: false,
			output: error.stderr?.toString() || error.message,
		};
	}
}

function getWebPrUrl(remoteUrl: string, provider: GitProvider, branch: string): string | null {
	const httpsUrl = toWebUrl(remoteUrl);
	if (provider === 'unknown' || !httpsUrl) return null;

	switch (provider) {
		case 'github':
			return `${httpsUrl}/compare/${branch}?expand=1`;
		case 'gitlab':
			return `${httpsUrl}/-/merge_requests/new?merge_request[source_branch]=${branch}`;
		case 'bitbucket':
			return `${httpsUrl}/pull-requests/new?source=${branch}`;
		default:
			return null;
	}
}

export function getPullRequestInfo(
	branch: string,
	title: string,
	body: string,
	baseBranch: string
): PullRequestInfo {
	const remoteUrl = git.getRemoteUrl();

	if (!remoteUrl) {
		return {
			provider: 'unknown',
			cli: null,
			cliAvailable: false,
			prCommand: null,
			prUrl: null,
		};
	}

	const provider = detectProvider(remoteUrl);

	if (provider === 'unknown') {
		return {
			provider: 'unknown',
			cli: null,
			cliAvailable: false,
			prCommand: null,
			prUrl: getWebPrUrl(remoteUrl, provider, branch),
		};
	}

	const config = PROVIDER_CONFIG[provider];
	const cliAvailable = isCliAvailable(config.cli);
	const prCommand = config.prCmd(title, body, baseBranch);

	return {
		provider,
		cli: config.cli,
		cliAvailable,
		prCommand: prCommand || null,
		prUrl: getWebPrUrl(remoteUrl, provider, branch),
	};
}

export function createPullRequest(
	branch: string,
	title: string,
	body: string,
	baseBranch: string
): { success: boolean; output: string; url?: string } {
	const info = getPullRequestInfo(branch, title, body, baseBranch);

	if (!info.prCommand) {
		return {
			success: false,
			output: `No PR command available for provider: ${info.provider}`,
			url: info.prUrl || undefined,
		};
	}

	if (!info.cliAvailable) {
		return {
			success: false,
			output: `CLI '${info.cli}' not found. Create the PR manually.`,
			url: info.prUrl || undefined,
		};
	}

	try {
		const output = execSync(info.prCommand, {
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		// Extract URL from output (gh and glab both output the PR URL)
		const urlMatch = output.match(/https?:\/\/[^\s]+/);
		return {
			success: true,
			output: output.trim(),
			url: urlMatch ? urlMatch[0] : undefined,
		};
	} catch (error: any) {
		return {
			success: false,
			output: error.stderr?.toString() || error.message,
			url: info.prUrl || undefined,
		};
	}
}
