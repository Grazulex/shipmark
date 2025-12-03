export interface Version {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string;
	prereleaseNumber?: number;
	build?: string;
}

export type BumpType =
	| 'major'
	| 'minor'
	| 'patch'
	| 'premajor'
	| 'preminor'
	| 'prepatch'
	| 'prerelease';

export type PrereleaseType = 'alpha' | 'beta' | 'rc';

export interface BumpOption {
	type: BumpType;
	label: string;
	description: string;
	newVersion: string;
}
