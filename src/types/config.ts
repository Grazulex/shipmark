import type { VersionFileEntry } from '../handlers/types';

export interface ShipmarkConfig {
	changelog: ChangelogConfig;
	version: VersionConfig;
	commits: CommitConfig;
	git: GitConfig;
}

export interface ChangelogConfig {
	file: string;
	types: Record<string, string>;
	includeHash: boolean;
	includeDate: boolean;
	includeAuthor: boolean;
}

/**
 * Version file entry configuration.
 * Can be a simple string path or an object with additional options.
 */
export interface VersionFileConfig {
	path: string;
	key?: string;
	prefix?: string;
}

export interface VersionConfig {
	/** List of files to update with version. Supports strings and objects with path/key/prefix. */
	files: VersionFileEntry[];
	tagPrefix: string;
	tagMessage: string;
	commitMessage: string;
	/** Check that all version files are in sync before release */
	syncCheck?: boolean;
}

export interface CommitConfig {
	conventional: boolean;
	allowCustomTypes: boolean;
}

export interface GitConfig {
	push: boolean;
	pushTags: boolean;
	signTags: boolean;
	signCommits: boolean;
}

export const DEFAULT_CONFIG: ShipmarkConfig = {
	changelog: {
		file: 'CHANGELOG.md',
		types: {
			feat: 'Features',
			fix: 'Bug Fixes',
			docs: 'Documentation',
			style: 'Styles',
			refactor: 'Code Refactoring',
			perf: 'Performance Improvements',
			test: 'Tests',
			build: 'Build System',
			ci: 'Continuous Integration',
			chore: 'Chores',
			revert: 'Reverts',
		},
		includeHash: true,
		includeDate: true,
		includeAuthor: false,
	},
	version: {
		files: ['package.json'],
		tagPrefix: 'v',
		tagMessage: 'Release {version}',
		commitMessage: 'chore(release): {version}',
	},
	commits: {
		conventional: true,
		allowCustomTypes: true,
	},
	git: {
		push: true,
		pushTags: true,
		signTags: false,
		signCommits: false,
	},
};
