import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pyprojectHandler } from '../src/handlers/pyproject';
import { registry } from '../src/handlers/registry';

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures', 'pyproject-test');

describe('pyprojectHandler', () => {
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
		it('should handle pyproject.toml files', () => {
			expect(pyprojectHandler.canHandle('pyproject.toml')).toBe(true);
			expect(pyprojectHandler.canHandle('backend/pyproject.toml')).toBe(true);
		});

		it('should not handle other files', () => {
			expect(pyprojectHandler.canHandle('package.json')).toBe(false);
			expect(pyprojectHandler.canHandle('values.yaml')).toBe(false);
			expect(pyprojectHandler.canHandle('other.toml')).toBe(false);
		});
	});

	describe('read - PEP 621', () => {
		it('should read version from [project].version (PEP 621)', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
version = "1.2.3"
description = "A test package"
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBe('1.2.3');
		});

		it('should return null for dynamic version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
dynamic = ["version"]
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBeNull();
		});
	});

	describe('read - Poetry', () => {
		it('should read version from [tool.poetry].version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[tool.poetry]
name = "my-package"
version = "2.0.0"
description = "A Poetry package"

[tool.poetry.dependencies]
python = "^3.10"
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBe('2.0.0');
		});
	});

	describe('read - Setuptools', () => {
		it('should read version from [tool.setuptools].version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[build-system]
requires = ["setuptools"]

[tool.setuptools]
version = "3.0.0"
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBe('3.0.0');
		});
	});

	describe('read - priority', () => {
		it('should prefer [project].version over [tool.poetry].version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
version = "1.0.0"

[tool.poetry]
version = "2.0.0"
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBe('1.0.0');
		});
	});

	describe('read - errors', () => {
		it('should return null for missing file', () => {
			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBeNull();
		});

		it('should return null for file without version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[build-system]
requires = ["setuptools"]
`
			);

			const version = pyprojectHandler.read('pyproject.toml', TEST_DIR);
			expect(version).toBeNull();
		});
	});

	describe('write - PEP 621', () => {
		it('should update version in [project].version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
version = "1.0.0"
description = "Test"
`
			);

			pyprojectHandler.write('pyproject.toml', '2.0.0', TEST_DIR);

			const content = readFileSync(tomlPath, 'utf8');
			expect(content).toContain('version = "2.0.0"');
		});

		it('should preserve other fields', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
version = "1.0.0"
description = "Test package"

[project.optional-dependencies]
dev = ["pytest"]
`
			);

			pyprojectHandler.write('pyproject.toml', '2.0.0', TEST_DIR);

			const content = readFileSync(tomlPath, 'utf8');
			expect(content).toContain('name = "my-package"');
			expect(content).toContain('description = "Test package"');
			expect(content).toContain('[project.optional-dependencies]');
		});
	});

	describe('write - Poetry', () => {
		it('should update version in [tool.poetry].version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[tool.poetry]
name = "my-package"
version = "1.0.0"
`
			);

			pyprojectHandler.write('pyproject.toml', '3.0.0', TEST_DIR);

			const content = readFileSync(tomlPath, 'utf8');
			expect(content).toContain('version = "3.0.0"');
		});
	});

	describe('write - errors', () => {
		it('should throw for missing file', () => {
			expect(() => {
				pyprojectHandler.write('pyproject.toml', '1.0.0', TEST_DIR);
			}).toThrow('File not found');
		});

		it('should throw for dynamic version', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[project]
name = "my-package"
dynamic = ["version"]
`
			);

			expect(() => {
				pyprojectHandler.write('pyproject.toml', '1.0.0', TEST_DIR);
			}).toThrow('dynamic');
		});
	});

	describe('write - create version', () => {
		it('should create version in [project] if no version exists', () => {
			const tomlPath = join(TEST_DIR, 'pyproject.toml');
			writeFileSync(
				tomlPath,
				`[build-system]
requires = ["setuptools"]
`
			);

			pyprojectHandler.write('pyproject.toml', '1.0.0', TEST_DIR);

			const content = readFileSync(tomlPath, 'utf8');
			expect(content).toContain('version = "1.0.0"');
		});
	});
});

describe('registry with pyproject', () => {
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

	it('should find handler for pyproject.toml', () => {
		const handler = registry.findHandler('pyproject.toml');
		expect(handler).toBe(pyprojectHandler);
	});

	it('should read version from pyproject.toml via registry', () => {
		const tomlPath = join(TEST_DIR, 'pyproject.toml');
		writeFileSync(
			tomlPath,
			`[project]
name = "test"
version = "1.2.3"
`
		);

		const result = registry.readVersion('pyproject.toml', TEST_DIR);
		expect(result.version).toBe('1.2.3');
		expect(result.handler).toBe('pyproject');
	});

	it('should write version to pyproject.toml via registry', () => {
		const tomlPath = join(TEST_DIR, 'pyproject.toml');
		writeFileSync(
			tomlPath,
			`[project]
name = "test"
version = "1.0.0"
`
		);

		const result = registry.writeVersion('pyproject.toml', '2.0.0', TEST_DIR);
		expect(result.success).toBe(true);
		expect(result.handler).toBe('pyproject');

		const content = readFileSync(tomlPath, 'utf8');
		expect(content).toContain('version = "2.0.0"');
	});
});
