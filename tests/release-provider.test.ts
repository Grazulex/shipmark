import { describe, expect, it } from 'vitest';
import { detectProvider, toWebUrl } from '../src/core/release-provider';

describe('detectProvider', () => {
	it('should detect the hosted providers', () => {
		expect(detectProvider('git@github.com:owner/repo.git')).toBe('github');
		expect(detectProvider('https://gitlab.com/owner/repo.git')).toBe('gitlab');
		expect(detectProvider('https://bitbucket.org/owner/repo.git')).toBe('bitbucket');
	});

	it('should detect a self-hosted GitLab over SSH', () => {
		expect(detectProvider('git@gitlab.example.com:group/repo.git')).toBe('gitlab');
	});

	it('should detect a self-hosted GitLab over HTTPS and ssh:// with a port', () => {
		expect(detectProvider('https://gitlab.example.com/group/repo.git')).toBe('gitlab');
		expect(detectProvider('ssh://git@gitlab.example.com:2222/group/repo.git')).toBe('gitlab');
	});

	it('should detect GitHub Enterprise', () => {
		expect(detectProvider('git@github.example.com:owner/repo.git')).toBe('github');
	});

	it('should ignore provider names in the repository path', () => {
		expect(detectProvider('git@gitlab.example.com:mirrors/github-tools.git')).toBe('gitlab');
		expect(detectProvider('https://git.example.com/gitlab/repo.git')).toBe('unknown');
	});

	it('should return unknown for other hosts and local paths', () => {
		expect(detectProvider('git@git.example.com:owner/repo.git')).toBe('unknown');
		expect(detectProvider('/srv/git/repo.git')).toBe('unknown');
	});
});

describe('toWebUrl', () => {
	it('should convert SSH remotes to an HTTPS URL', () => {
		expect(toWebUrl('git@gitlab.example.com:group/repo.git')).toBe(
			'https://gitlab.example.com/group/repo'
		);
		expect(toWebUrl('ssh://git@gitlab.example.com:2222/group/repo.git')).toBe(
			'https://gitlab.example.com/group/repo'
		);
	});

	it('should keep an HTTPS remote without its credentials', () => {
		expect(toWebUrl('https://ci-token:secret@gitlab.example.com/group/repo.git')).toBe(
			'https://gitlab.example.com/group/repo'
		);
		expect(toWebUrl('https://git.example.com:8443/owner/repo')).toBe(
			'https://git.example.com:8443/owner/repo'
		);
	});

	it('should return null for local paths', () => {
		expect(toWebUrl('/srv/git/repo.git')).toBeNull();
		expect(toWebUrl('file:///srv/git/repo.git')).toBeNull();
	});
});
