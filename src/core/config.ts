import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { getVersion, registry, setVersion } from '../handlers/index';
import type { VersionFileEntry } from '../handlers/types';
import type { ShipmarkConfig } from '../types/config';
import { DEFAULT_CONFIG } from '../types/config';
import { ConfigError } from '../utils/errors';

const CONFIG_FILES = [
	'.shipmarkrc.yml',
	'.shipmarkrc.yaml',
	'.shipmarkrc.json',
	'shipmark.config.js',
];

export function findConfigFile(cwd: string = process.cwd()): string | null {
	for (const file of CONFIG_FILES) {
		const path = join(cwd, file);
		if (existsSync(path)) {
			return path;
		}
	}
	return null;
}

export function loadConfig(cwd: string = process.cwd()): ShipmarkConfig {
	const configPath = findConfigFile(cwd);

	if (!configPath) {
		return DEFAULT_CONFIG;
	}

	try {
		const content = readFileSync(configPath, 'utf8');

		if (configPath.endsWith('.json')) {
			const userConfig = JSON.parse(content);
			return mergeConfig(DEFAULT_CONFIG, userConfig);
		}

		if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
			// Use yaml library for full YAML support (including arrays of objects)
			const userConfig = parseYaml(content) || {};
			return mergeConfig(DEFAULT_CONFIG, userConfig);
		}

		return DEFAULT_CONFIG;
	} catch (error: any) {
		throw new ConfigError(`Failed to load config from ${configPath}`, [error.message]);
	}
}

export function saveConfig(config: Partial<ShipmarkConfig>, cwd: string = process.cwd()): void {
	const configPath = join(cwd, '.shipmarkrc.yml');
	const content = stringifyYaml(config);
	writeFileSync(configPath, content, 'utf8');
}

function mergeConfig(defaults: ShipmarkConfig, user: Partial<ShipmarkConfig>): ShipmarkConfig {
	return {
		changelog: { ...defaults.changelog, ...user.changelog },
		version: { ...defaults.version, ...user.version },
		commits: { ...defaults.commits, ...user.commits },
		git: { ...defaults.git, ...user.git },
	};
}

/**
 * Get version from package.json.
 * @deprecated Use getVersionFromFiles() instead for multi-file support.
 */
export function getVersionFromPackageJson(cwd: string = process.cwd()): string | null {
	return getVersion(['package.json'], cwd);
}

/**
 * Get version from configured files.
 * Returns the first successfully read version.
 */
export function getVersionFromFiles(
	files: VersionFileEntry[],
	cwd: string = process.cwd()
): string | null {
	return getVersion(files, cwd);
}

/**
 * Update version in a single file.
 * @deprecated Use updateVersionInFiles() instead for multi-file support.
 */
export function updateVersionInFile(
	filePath: string,
	newVersion: string,
	cwd: string = process.cwd()
): void {
	const results = setVersion([filePath], newVersion, cwd);
	const result = results[0];

	if (!result.success) {
		throw new ConfigError(result.error || `Failed to update version in ${filePath}`);
	}
}

/**
 * Update version in multiple files using the handler registry.
 */
export function updateVersionInFiles(
	files: VersionFileEntry[],
	newVersion: string,
	cwd: string = process.cwd()
): { success: boolean; errors: string[] } {
	const results = setVersion(files, newVersion, cwd);
	const errors: string[] = [];

	for (const result of results) {
		if (!result.success && result.error) {
			errors.push(`${result.filepath}: ${result.error}`);
		}
	}

	return {
		success: errors.length === 0,
		errors,
	};
}

/**
 * Validate that all version files are in sync.
 */
export function validateVersionSync(
	files: VersionFileEntry[],
	cwd: string = process.cwd()
): { synced: boolean; versions: Map<string, string>; mismatches: string[] } {
	return registry.validateVersionSync(files, cwd);
}
