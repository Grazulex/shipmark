import { describe, expect, it } from 'vitest';
import * as semver from '../src/core/semver';

describe('semver', () => {
	describe('parse', () => {
		it('should parse simple version', () => {
			const version = semver.parse('1.2.3');
			expect(version.major).toBe(1);
			expect(version.minor).toBe(2);
			expect(version.patch).toBe(3);
		});

		it('should parse version with v prefix', () => {
			const version = semver.parse('v1.2.3');
			expect(version.major).toBe(1);
			expect(version.minor).toBe(2);
			expect(version.patch).toBe(3);
		});

		it('should parse prerelease version', () => {
			const version = semver.parse('1.2.3-alpha.1');
			expect(version.major).toBe(1);
			expect(version.minor).toBe(2);
			expect(version.patch).toBe(3);
			expect(version.prerelease).toBe('alpha');
			expect(version.prereleaseNumber).toBe(1);
		});

		it('should parse beta prerelease', () => {
			const version = semver.parse('2.0.0-beta.5');
			expect(version.prerelease).toBe('beta');
			expect(version.prereleaseNumber).toBe(5);
		});

		it('should parse rc prerelease', () => {
			const version = semver.parse('1.0.0-rc.2');
			expect(version.prerelease).toBe('rc');
			expect(version.prereleaseNumber).toBe(2);
		});

		it('should throw on invalid version', () => {
			expect(() => semver.parse('invalid')).toThrow();
			expect(() => semver.parse('1.2')).toThrow();
			expect(() => semver.parse('abc.def.ghi')).toThrow();
		});
	});

	describe('format', () => {
		it('should format simple version', () => {
			const version = { major: 1, minor: 2, patch: 3 };
			expect(semver.format(version)).toBe('1.2.3');
		});

		it('should format with prefix', () => {
			const version = { major: 1, minor: 2, patch: 3 };
			expect(semver.format(version, 'v')).toBe('v1.2.3');
		});

		it('should format prerelease version', () => {
			const version = {
				major: 1,
				minor: 0,
				patch: 0,
				prerelease: 'alpha' as const,
				prereleaseNumber: 1,
			};
			expect(semver.format(version)).toBe('1.0.0-alpha.1');
		});
	});

	describe('bump', () => {
		const baseVersion = { major: 1, minor: 2, patch: 3 };

		it('should bump patch', () => {
			const result = semver.bump(baseVersion, 'patch');
			expect(result).toEqual({ major: 1, minor: 2, patch: 4 });
		});

		it('should bump minor', () => {
			const result = semver.bump(baseVersion, 'minor');
			expect(result).toEqual({ major: 1, minor: 3, patch: 0 });
		});

		it('should bump major', () => {
			const result = semver.bump(baseVersion, 'major');
			expect(result).toEqual({ major: 2, minor: 0, patch: 0 });
		});

		it('should bump prepatch', () => {
			const result = semver.bump(baseVersion, 'prepatch', 'alpha');
			expect(result.major).toBe(1);
			expect(result.minor).toBe(2);
			expect(result.patch).toBe(4);
			expect(result.prerelease).toBe('alpha');
			expect(result.prereleaseNumber).toBe(1);
		});

		it('should bump preminor', () => {
			const result = semver.bump(baseVersion, 'preminor', 'beta');
			expect(result.major).toBe(1);
			expect(result.minor).toBe(3);
			expect(result.patch).toBe(0);
			expect(result.prerelease).toBe('beta');
		});

		it('should bump premajor', () => {
			const result = semver.bump(baseVersion, 'premajor', 'rc');
			expect(result.major).toBe(2);
			expect(result.minor).toBe(0);
			expect(result.patch).toBe(0);
			expect(result.prerelease).toBe('rc');
		});

		it('should bump prerelease number', () => {
			const preVersion = {
				major: 1,
				minor: 0,
				patch: 0,
				prerelease: 'alpha' as const,
				prereleaseNumber: 1,
			};
			const result = semver.bump(preVersion, 'prerelease');
			expect(result.prerelease).toBe('alpha');
			expect(result.prereleaseNumber).toBe(2);
		});
	});

	describe('compare', () => {
		it('should compare major versions', () => {
			const a = { major: 2, minor: 0, patch: 0 };
			const b = { major: 1, minor: 0, patch: 0 };
			expect(semver.compare(a, b)).toBeGreaterThan(0);
			expect(semver.compare(b, a)).toBeLessThan(0);
		});

		it('should compare minor versions', () => {
			const a = { major: 1, minor: 2, patch: 0 };
			const b = { major: 1, minor: 1, patch: 0 };
			expect(semver.compare(a, b)).toBeGreaterThan(0);
		});

		it('should compare patch versions', () => {
			const a = { major: 1, minor: 0, patch: 2 };
			const b = { major: 1, minor: 0, patch: 1 };
			expect(semver.compare(a, b)).toBeGreaterThan(0);
		});

		it('should compare release vs prerelease', () => {
			const release = { major: 1, minor: 0, patch: 0 };
			const prerelease = {
				major: 1,
				minor: 0,
				patch: 0,
				prerelease: 'alpha' as const,
				prereleaseNumber: 1,
			};
			expect(semver.compare(release, prerelease)).toBeGreaterThan(0);
		});

		it('should compare prerelease types', () => {
			const alpha = { major: 1, minor: 0, patch: 0, prerelease: 'alpha' as const, prereleaseNumber: 1 };
			const beta = { major: 1, minor: 0, patch: 0, prerelease: 'beta' as const, prereleaseNumber: 1 };
			const rc = { major: 1, minor: 0, patch: 0, prerelease: 'rc' as const, prereleaseNumber: 1 };

			expect(semver.compare(beta, alpha)).toBeGreaterThan(0);
			expect(semver.compare(rc, beta)).toBeGreaterThan(0);
		});
	});

	describe('isValid', () => {
		it('should validate correct versions', () => {
			expect(semver.isValid('1.0.0')).toBe(true);
			expect(semver.isValid('v1.0.0')).toBe(true);
			expect(semver.isValid('1.2.3-alpha.1')).toBe(true);
			expect(semver.isValid('10.20.30')).toBe(true);
		});

		it('should reject invalid versions', () => {
			expect(semver.isValid('invalid')).toBe(false);
			expect(semver.isValid('1.2')).toBe(false);
			expect(semver.isValid('1.2.3.4')).toBe(false);
			expect(semver.isValid('')).toBe(false);
		});
	});

	describe('clean', () => {
		it('should remove v prefix', () => {
			expect(semver.clean('v1.0.0')).toBe('1.0.0');
		});

		it('should keep version without prefix', () => {
			expect(semver.clean('1.0.0')).toBe('1.0.0');
		});
	});
});
