import { execSync } from 'node:child_process';
import { git } from './git';

export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'unknown';

export interface ReleaseProviderInfo {
	provider: GitProvider;
	cli: string | null;
	cliAvailable: boolean;
	releaseCommand: string | null;
	releaseUrl: string | null;
}

const PROVIDER_CONFIG: Record<
	Exclude<GitProvider, 'unknown'>,
	{ hosts: string[]; cli: string; releaseCmd: (tag: string, notesFile: string) => string }
> = {
	github: {
		hosts: ['github.com'],
		cli: 'gh',
		releaseCmd: (tag, notesFile) => `gh release create ${tag} --notes-file ${notesFile}`,
	},
	gitlab: {
		hosts: ['gitlab.com'],
		cli: 'glab',
		releaseCmd: (tag, notesFile) => `glab release create ${tag} --notes-file ${notesFile}`,
	},
	bitbucket: {
		hosts: ['bitbucket.org'],
		cli: 'bb', // Bitbucket CLI is less common
		releaseCmd: () => '', // Bitbucket doesn't have native releases like GitHub/GitLab
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

function detectProvider(remoteUrl: string): GitProvider {
	const urlLower = remoteUrl.toLowerCase();

	for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
		if (config.hosts.some((host) => urlLower.includes(host))) {
			return provider as GitProvider;
		}
	}

	return 'unknown';
}

function getWebReleaseUrl(remoteUrl: string, provider: GitProvider, tag: string): string | null {
	if (provider === 'unknown') return null;

	// Convert git URL to HTTPS URL
	const httpsUrl = remoteUrl.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '');

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

export function executeRelease(
	tag: string,
	changelogFile = 'CHANGELOG.md'
): { success: boolean; output: string } {
	const info = getReleaseProviderInfo(tag, changelogFile);

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
