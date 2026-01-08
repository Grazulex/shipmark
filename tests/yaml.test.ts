import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registry } from '../src/handlers/registry';
import { yamlHandler } from '../src/handlers/yaml';

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures', 'yaml-test');

describe('yamlHandler', () => {
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
		it('should handle YAML files with key config', () => {
			expect(yamlHandler.canHandle('values.yaml', { path: 'values.yaml', key: 'image.tag' })).toBe(
				true
			);
			expect(
				yamlHandler.canHandle('helm/values.yml', { path: 'helm/values.yml', key: 'version' })
			).toBe(true);
		});

		it('should not handle YAML files without key config', () => {
			expect(yamlHandler.canHandle('values.yaml')).toBe(false);
			expect(yamlHandler.canHandle('values.yaml', { path: 'values.yaml' })).toBe(false);
		});

		it('should not handle non-YAML files', () => {
			expect(yamlHandler.canHandle('package.json', { path: 'package.json', key: 'version' })).toBe(
				false
			);
		});
	});

	describe('read', () => {
		it('should read version from simple key', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`appVersion: "1.2.3"
replicas: 3
`
			);

			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'appVersion',
			});
			expect(version).toBe('1.2.3');
		});

		it('should read version from nested key (dot notation)', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`image:
  repository: myapp
  tag: "2.0.0"
  pullPolicy: Always
`
			);

			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'image.tag',
			});
			expect(version).toBe('2.0.0');
		});

		it('should read version from deeply nested key', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`metadata:
  labels:
    app:
      version: "3.0.0"
`
			);

			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'metadata.labels.app.version',
			});
			expect(version).toBe('3.0.0');
		});

		it('should return null for missing file', () => {
			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'version',
			});
			expect(version).toBeNull();
		});

		it('should return null for missing key', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(yamlPath, 'replicas: 3\n');

			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'version',
			});
			expect(version).toBeNull();
		});

		it('should return null without key config', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(yamlPath, 'version: "1.0.0"\n');

			const version = yamlHandler.read('values.yaml', TEST_DIR);
			expect(version).toBeNull();
		});

		it('should handle numeric versions', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(yamlPath, 'version: 1.0\n');

			const version = yamlHandler.read('values.yaml', TEST_DIR, {
				path: 'values.yaml',
				key: 'version',
			});
			expect(version).toBe('1');
		});
	});

	describe('write', () => {
		it('should update version in simple key', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`appVersion: "1.0.0"
replicas: 3
`
			);

			yamlHandler.write('values.yaml', '2.0.0', TEST_DIR, {
				path: 'values.yaml',
				key: 'appVersion',
			});

			const content = readFileSync(yamlPath, 'utf8');
			expect(content).toContain('appVersion: "2.0.0"');
			expect(content).toContain('replicas: 3');
		});

		it('should update version in nested key', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: Always
`
			);

			yamlHandler.write('values.yaml', '2.0.0', TEST_DIR, {
				path: 'values.yaml',
				key: 'image.tag',
			});

			const content = readFileSync(yamlPath, 'utf8');
			expect(content).toContain('tag: "2.0.0"');
			expect(content).toContain('repository: myapp');
			expect(content).toContain('pullPolicy: Always');
		});

		it('should preserve comments', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(
				yamlPath,
				`# Helm values
image:
  # Docker image tag
  tag: "1.0.0"
  repository: myapp
`
			);

			yamlHandler.write('values.yaml', '2.0.0', TEST_DIR, {
				path: 'values.yaml',
				key: 'image.tag',
			});

			const content = readFileSync(yamlPath, 'utf8');
			expect(content).toContain('# Helm values');
			expect(content).toContain('# Docker image tag');
			expect(content).toContain('tag: "2.0.0"');
		});

		it('should throw for missing file', () => {
			expect(() => {
				yamlHandler.write('values.yaml', '1.0.0', TEST_DIR, {
					path: 'values.yaml',
					key: 'version',
				});
			}).toThrow('File not found');
		});

		it('should throw without key config', () => {
			const yamlPath = join(TEST_DIR, 'values.yaml');
			writeFileSync(yamlPath, 'version: "1.0.0"\n');

			expect(() => {
				yamlHandler.write('values.yaml', '2.0.0', TEST_DIR);
			}).toThrow('key path');
		});
	});

	describe('Helm Chart.yaml', () => {
		it('should update appVersion in Chart.yaml', () => {
			const chartPath = join(TEST_DIR, 'Chart.yaml');
			writeFileSync(
				chartPath,
				`apiVersion: v2
name: my-chart
description: A Helm chart
type: application
version: 0.1.0
appVersion: "1.0.0"
`
			);

			yamlHandler.write('Chart.yaml', '2.0.0', TEST_DIR, {
				path: 'Chart.yaml',
				key: 'appVersion',
			});

			const content = readFileSync(chartPath, 'utf8');
			expect(content).toContain('appVersion: "2.0.0"');
			expect(content).toContain('version: 0.1.0'); // chart version unchanged
		});
	});

	describe('Kubernetes manifest', () => {
		it('should update version label in deployment', () => {
			const deployPath = join(TEST_DIR, 'deployment.yaml');
			writeFileSync(
				deployPath,
				`apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
    version: "1.0.0"
spec:
  replicas: 3
`
			);

			yamlHandler.write('deployment.yaml', '2.0.0', TEST_DIR, {
				path: 'deployment.yaml',
				key: 'metadata.labels.version',
			});

			const content = readFileSync(deployPath, 'utf8');
			expect(content).toContain('version: "2.0.0"');
			expect(content).toContain('app: myapp');
		});
	});
});

describe('registry with yaml', () => {
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

	it('should find handler for yaml with key config', () => {
		const handler = registry.findHandler('values.yaml', { path: 'values.yaml', key: 'image.tag' });
		expect(handler).toBe(yamlHandler);
	});

	it('should not find handler for yaml without key config', () => {
		const handler = registry.findHandler('values.yaml');
		expect(handler).toBeNull();
	});

	it('should read version via registry', () => {
		const yamlPath = join(TEST_DIR, 'values.yaml');
		writeFileSync(
			yamlPath,
			`image:
  tag: "1.2.3"
`
		);

		const result = registry.readVersion('values.yaml', TEST_DIR, {
			path: 'values.yaml',
			key: 'image.tag',
		});
		expect(result.version).toBe('1.2.3');
		expect(result.handler).toBe('yaml');
	});

	it('should write version via registry', () => {
		const yamlPath = join(TEST_DIR, 'values.yaml');
		writeFileSync(
			yamlPath,
			`image:
  tag: "1.0.0"
`
		);

		const result = registry.writeVersion('values.yaml', '2.0.0', TEST_DIR, {
			path: 'values.yaml',
			key: 'image.tag',
		});
		expect(result.success).toBe(true);
		expect(result.handler).toBe('yaml');

		const content = readFileSync(yamlPath, 'utf8');
		expect(content).toContain('tag: "2.0.0"');
	});
});
