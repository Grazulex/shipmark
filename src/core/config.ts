import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ShipmarkConfig } from '../types/config';
import { DEFAULT_CONFIG } from '../types/config';
import { ConfigError } from '../utils/errors';

const CONFIG_FILES = ['.shipmarkrc.yml', '.shipmarkrc.yaml', '.shipmarkrc.json', 'shipmark.config.js'];

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
			// Simple YAML parsing for basic config
			const userConfig = parseSimpleYaml(content);
			return mergeConfig(DEFAULT_CONFIG, userConfig);
		}

		return DEFAULT_CONFIG;
	} catch (error: any) {
		throw new ConfigError(`Failed to load config from ${configPath}`, [error.message]);
	}
}

export function saveConfig(config: Partial<ShipmarkConfig>, cwd: string = process.cwd()): void {
	const configPath = join(cwd, '.shipmarkrc.yml');
	const content = stringifySimpleYaml(config);
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

// Simple YAML parser for basic flat/nested config
function parseSimpleYaml(content: string): Record<string, any> {
	const result: Record<string, any> = {};
	const lines = content.split('\n');
	let currentSection = '';
	let currentIndent = 0;

	for (const line of lines) {
		// Skip comments and empty lines
		if (line.trim().startsWith('#') || line.trim() === '') continue;

		const indent = line.search(/\S/);
		const trimmed = line.trim();

		// Check if it's a section header (key without value)
		if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
			currentSection = trimmed.slice(0, -1);
			currentIndent = indent;
			result[currentSection] = {};
			continue;
		}

		// Parse key-value
		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) continue;

		const key = trimmed.slice(0, colonIndex).trim();
		let value: any = trimmed.slice(colonIndex + 1).trim();

		// Parse value type
		if (value === 'true') value = true;
		else if (value === 'false') value = false;
		else if (/^\d+$/.test(value)) value = parseInt(value, 10);
		else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
		else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
		else if (value.startsWith('[') && value.endsWith(']')) {
			// Simple array parsing
			value = value
				.slice(1, -1)
				.split(',')
				.map((v: string) => v.trim().replace(/^['"]|['"]$/g, ''));
		}

		// Add to result
		if (indent > currentIndent && currentSection) {
			result[currentSection][key] = value;
		} else {
			result[key] = value;
			currentSection = '';
		}
	}

	return result;
}

function stringifySimpleYaml(obj: Record<string, any>, indent = 0): string {
	const lines: string[] = [];
	const prefix = '  '.repeat(indent);

	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) continue;

		if (typeof value === 'object' && !Array.isArray(value)) {
			lines.push(`${prefix}${key}:`);
			lines.push(stringifySimpleYaml(value, indent + 1));
		} else if (Array.isArray(value)) {
			lines.push(`${prefix}${key}: [${value.map((v) => `"${v}"`).join(', ')}]`);
		} else if (typeof value === 'string') {
			lines.push(`${prefix}${key}: "${value}"`);
		} else {
			lines.push(`${prefix}${key}: ${value}`);
		}
	}

	return lines.join('\n');
}

export function getVersionFromPackageJson(cwd: string = process.cwd()): string | null {
	const packagePath = join(cwd, 'package.json');

	if (!existsSync(packagePath)) {
		return null;
	}

	try {
		const content = readFileSync(packagePath, 'utf8');
		const pkg = JSON.parse(content);
		return pkg.version || null;
	} catch {
		return null;
	}
}

export function updateVersionInFile(
	filePath: string,
	newVersion: string,
	cwd: string = process.cwd()
): void {
	const fullPath = join(cwd, filePath);

	if (!existsSync(fullPath)) {
		throw new ConfigError(`File not found: ${filePath}`);
	}

	const content = readFileSync(fullPath, 'utf8');

	if (filePath.endsWith('.json')) {
		const data = JSON.parse(content);
		data.version = newVersion;
		writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
		return;
	}

	// Generic version replacement for other file types
	const versionRegex = /("?version"?\s*[:=]\s*["'])([^"']+)(["'])/;
	const updated = content.replace(versionRegex, `$1${newVersion}$3`);
	writeFileSync(fullPath, updated, 'utf8');
}
