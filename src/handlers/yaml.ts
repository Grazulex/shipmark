import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Document, parseDocument } from 'yaml';
import type { FileConfig, VersionHandler } from './types';

/**
 * Handler for YAML files with configurable key paths.
 * Preserves comments and formatting using yaml library's Document API.
 */
export const yamlHandler: VersionHandler = {
	name: 'yaml',
	extensions: ['.yaml', '.yml'],

	canHandle(filepath: string, config?: FileConfig): boolean {
		// Only handle YAML files that have a key specified
		// (we don't want to handle arbitrary YAML files without knowing where to look)
		const isYaml = filepath.endsWith('.yaml') || filepath.endsWith('.yml');
		const hasKey = config?.key !== undefined;
		return isYaml && hasKey;
	},

	read(filepath: string, cwd: string, config?: FileConfig): string | null {
		const fullPath = join(cwd, filepath);

		if (!existsSync(fullPath)) {
			return null;
		}

		if (!config?.key) {
			return null;
		}

		try {
			const content = readFileSync(fullPath, 'utf8');
			const doc = parseDocument(content);
			const value = getValueByPath(doc, config.key);

			if (typeof value === 'string') {
				return value;
			}
			if (typeof value === 'number') {
				return String(value);
			}

			return null;
		} catch {
			return null;
		}
	},

	write(filepath: string, version: string, cwd: string, config?: FileConfig): void {
		const fullPath = join(cwd, filepath);

		if (!existsSync(fullPath)) {
			throw new Error(`File not found: ${filepath}`);
		}

		if (!config?.key) {
			throw new Error('YAML handler requires a key path');
		}

		const content = readFileSync(fullPath, 'utf8');
		const doc = parseDocument(content);

		setValueByPath(doc, config.key, version);

		// Write back preserving formatting
		const newContent = doc.toString();
		writeFileSync(fullPath, newContent, 'utf8');
	},
};

/**
 * Get a value from a YAML document using dot notation path.
 * Supports paths like "image.tag" or "metadata.labels.version"
 */
function getValueByPath(doc: Document, path: string): unknown {
	const keys = parsePath(path);
	let current: unknown = doc.toJSON();

	for (const key of keys) {
		if (current === null || typeof current !== 'object') {
			return undefined;
		}

		if (Array.isArray(current)) {
			const index = Number.parseInt(key, 10);
			if (Number.isNaN(index)) {
				return undefined;
			}
			current = current[index];
		} else {
			current = (current as Record<string, unknown>)[key];
		}
	}

	return current;
}

/**
 * Set a value in a YAML document using dot notation path.
 * Preserves comments and formatting.
 */
function setValueByPath(doc: Document, path: string, value: string): void {
	const keys = parsePath(path);

	if (keys.length === 0) {
		throw new Error('Empty key path');
	}

	if (keys.length === 1) {
		doc.set(keys[0], value);
		return;
	}

	// Navigate to parent and set the final key
	let current = doc.contents;

	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];

		if (!current || typeof current !== 'object' || !('get' in current)) {
			throw new Error(`Cannot navigate to ${keys.slice(0, i + 1).join('.')}`);
		}

		const next = (current as any).get(key, true);
		if (!next) {
			throw new Error(`Key not found: ${keys.slice(0, i + 1).join('.')}`);
		}
		current = next;
	}

	const finalKey = keys[keys.length - 1];
	if (current && typeof current === 'object' && 'set' in current) {
		(current as any).set(finalKey, value);
	} else {
		throw new Error(`Cannot set value at ${path}`);
	}
}

/**
 * Parse a dot notation path into an array of keys.
 * Handles quoted keys with dots inside.
 */
function parsePath(path: string): string[] {
	const keys: string[] = [];
	let current = '';
	let inQuotes = false;
	let quoteChar = '';

	for (let i = 0; i < path.length; i++) {
		const char = path[i];

		if (!inQuotes && (char === '"' || char === "'")) {
			inQuotes = true;
			quoteChar = char;
		} else if (inQuotes && char === quoteChar) {
			inQuotes = false;
			quoteChar = '';
		} else if (!inQuotes && char === '.') {
			if (current) {
				keys.push(current);
				current = '';
			}
		} else {
			current += char;
		}
	}

	if (current) {
		keys.push(current);
	}

	return keys;
}
