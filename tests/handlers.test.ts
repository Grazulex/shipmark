import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { packageJsonHandler } from '../src/handlers/package-json';
import { getVersion, registry, setVersion } from '../src/handlers/registry';
import { normalizeFileConfig } from '../src/handlers/types';

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures', 'handlers-test');

describe('normalizeFileConfig', () => {
	it('should convert string to FileConfig', () => {
		const result = normalizeFileConfig('package.json');
		expect(result).toEqual({ path: 'package.json' });
	});

	it('should pass through FileConfig objects', () => {
		const config = { path: 'values.yaml', key: 'image.tag', prefix: '' };
		const result = normalizeFileConfig(config);
		expect(result).toEqual(config);
	});
});

describe('packageJsonHandler', () => {
	beforeEach(() => {
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe('canHandle', () => {
		it('should handle package.json files', () => {
			expect(packageJsonHandler.canHandle('package.json')).toBe(true);
			expect(packageJsonHandler.canHandle('frontend/package.json')).toBe(true);
		});

		it('should not handle other files', () => {
			expect(packageJsonHandler.canHandle('pyproject.toml')).toBe(false);
			expect(packageJsonHandler.canHandle('values.yaml')).toBe(false);
			expect(packageJsonHandler.canHandle('other.json')).toBe(false);
		});
	});

	describe('read', () => {
		it('should read version from package.json', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '1.2.3' }, null, 2));

			const version = packageJsonHandler.read('package.json', TEST_DIR);
			expect(version).toBe('1.2.3');
		});

		it('should return null for missing file', () => {
			const version = packageJsonHandler.read('package.json', TEST_DIR);
			expect(version).toBeNull();
		});

		it('should return null for missing version field', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ name: 'test' }, null, 2));

			const version = packageJsonHandler.read('package.json', TEST_DIR);
			expect(version).toBeNull();
		});
	});

	describe('write', () => {
		it('should update version in package.json', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2));

			packageJsonHandler.write('package.json', '2.0.0', TEST_DIR);

			const content = JSON.parse(require('node:fs').readFileSync(pkgPath, 'utf8'));
			expect(content.version).toBe('2.0.0');
		});

		it('should preserve other fields', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			const original = {
				name: 'test',
				version: '1.0.0',
				description: 'Test package',
				dependencies: { lodash: '^4.0.0' },
			};
			writeFileSync(pkgPath, JSON.stringify(original, null, 2));

			packageJsonHandler.write('package.json', '2.0.0', TEST_DIR);

			const content = JSON.parse(require('node:fs').readFileSync(pkgPath, 'utf8'));
			expect(content.name).toBe('test');
			expect(content.description).toBe('Test package');
			expect(content.dependencies).toEqual({ lodash: '^4.0.0' });
		});

		it('should throw for missing file', () => {
			expect(() => {
				packageJsonHandler.write('package.json', '1.0.0', TEST_DIR);
			}).toThrow('File not found');
		});
	});
});

describe('registry', () => {
	beforeEach(() => {
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe('findHandler', () => {
		it('should find handler for package.json', () => {
			const handler = registry.findHandler('package.json');
			expect(handler).toBe(packageJsonHandler);
		});

		it('should return null for unknown files', () => {
			const handler = registry.findHandler('unknown.xyz');
			expect(handler).toBeNull();
		});
	});

	describe('readVersion', () => {
		it('should read version successfully', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ version: '1.0.0' }, null, 2));

			const result = registry.readVersion('package.json', TEST_DIR);
			expect(result.version).toBe('1.0.0');
			expect(result.handler).toBe('package-json');
			expect(result.error).toBeUndefined();
		});

		it('should return error for no handler', () => {
			const result = registry.readVersion('unknown.xyz', TEST_DIR);
			expect(result.version).toBeNull();
			expect(result.handler).toBe('none');
			expect(result.error).toContain('No handler found');
		});
	});

	describe('writeVersion', () => {
		it('should write version successfully', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ version: '1.0.0' }, null, 2));

			const result = registry.writeVersion('package.json', '2.0.0', TEST_DIR);
			expect(result.success).toBe(true);
			expect(result.handler).toBe('package-json');
		});

		it('should return error for no handler', () => {
			const result = registry.writeVersion('unknown.xyz', '1.0.0', TEST_DIR);
			expect(result.success).toBe(false);
			expect(result.error).toContain('No handler found');
		});
	});

	describe('validateVersionSync', () => {
		it('should detect synced versions', () => {
			const pkg1Path = join(TEST_DIR, 'package.json');
			const subDir = join(TEST_DIR, 'sub');
			mkdirSync(subDir, { recursive: true });
			const pkg2Path = join(subDir, 'package.json');

			writeFileSync(pkg1Path, JSON.stringify({ version: '1.0.0' }, null, 2));
			writeFileSync(pkg2Path, JSON.stringify({ version: '1.0.0' }, null, 2));

			const result = registry.validateVersionSync(['package.json', 'sub/package.json'], TEST_DIR);
			expect(result.synced).toBe(true);
			expect(result.mismatches).toHaveLength(0);
		});

		it('should detect mismatched versions', () => {
			const pkg1Path = join(TEST_DIR, 'package.json');
			const subDir = join(TEST_DIR, 'sub');
			mkdirSync(subDir, { recursive: true });
			const pkg2Path = join(subDir, 'package.json');

			writeFileSync(pkg1Path, JSON.stringify({ version: '1.0.0' }, null, 2));
			writeFileSync(pkg2Path, JSON.stringify({ version: '2.0.0' }, null, 2));

			const result = registry.validateVersionSync(['package.json', 'sub/package.json'], TEST_DIR);
			expect(result.synced).toBe(false);
			expect(result.mismatches).toContain('sub/package.json');
		});
	});
});

describe('convenience functions', () => {
	beforeEach(() => {
		if (!existsSync(TEST_DIR)) {
			mkdirSync(TEST_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		if (existsSync(TEST_DIR)) {
			rmSync(TEST_DIR, { recursive: true, force: true });
		}
	});

	describe('getVersion', () => {
		it('should get primary version from files', () => {
			const pkgPath = join(TEST_DIR, 'package.json');
			writeFileSync(pkgPath, JSON.stringify({ version: '1.2.3' }, null, 2));

			const version = getVersion(['package.json'], TEST_DIR);
			expect(version).toBe('1.2.3');
		});
	});

	describe('setVersion', () => {
		it('should set version in all files', () => {
			const pkg1Path = join(TEST_DIR, 'package.json');
			const subDir = join(TEST_DIR, 'sub');
			mkdirSync(subDir, { recursive: true });
			const pkg2Path = join(subDir, 'package.json');

			writeFileSync(pkg1Path, JSON.stringify({ version: '1.0.0' }, null, 2));
			writeFileSync(pkg2Path, JSON.stringify({ version: '1.0.0' }, null, 2));

			const results = setVersion(['package.json', 'sub/package.json'], '2.0.0', TEST_DIR);

			expect(results).toHaveLength(2);
			expect(results.every((r) => r.success)).toBe(true);

			const v1 = getVersion(['package.json'], TEST_DIR);
			const v2 = getVersion(['sub/package.json'], TEST_DIR);
			expect(v1).toBe('2.0.0');
			expect(v2).toBe('2.0.0');
		});
	});
});
