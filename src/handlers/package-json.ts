import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FileConfig, VersionHandler } from './types';

/**
 * Handler for package.json files.
 * Reads and writes the "version" field in JSON format.
 */
export const packageJsonHandler: VersionHandler = {
	name: 'package-json',
	extensions: ['.json'],

	canHandle(filepath: string, _config?: FileConfig): boolean {
		return filepath.endsWith('package.json');
	},

	read(filepath: string, cwd: string, _config?: FileConfig): string | null {
		const fullPath = join(cwd, filepath);

		if (!existsSync(fullPath)) {
			return null;
		}

		try {
			const content = readFileSync(fullPath, 'utf8');
			const data = JSON.parse(content);
			return data.version || null;
		} catch {
			return null;
		}
	},

	write(filepath: string, version: string, cwd: string, _config?: FileConfig): void {
		const fullPath = join(cwd, filepath);

		if (!existsSync(fullPath)) {
			throw new Error(`File not found: ${filepath}`);
		}

		const content = readFileSync(fullPath, 'utf8');

		// Replace the value in place, so the rest of the file keeps its formatting
		// (re-serializing would expand inline arrays and break formatter checks)
		const range = findTopLevelVersion(content);
		if (range) {
			const updated = `${content.slice(0, range.start)}${JSON.stringify(version)}${content.slice(range.end)}`;
			writeFileSync(fullPath, updated, 'utf8');
			return;
		}

		// No version field yet: fall back to re-serializing the file
		const data = JSON.parse(content);
		data.version = version;
		const indent = detectIndent(content);
		writeFileSync(fullPath, `${JSON.stringify(data, null, indent)}\n`, 'utf8');
	},
};

/**
 * Find the position of the top-level "version" string value, ignoring keys of
 * nested objects and text inside other strings.
 */
function findTopLevelVersion(content: string): { start: number; end: number } | null {
	let depth = 0;
	let i = 0;

	while (i < content.length) {
		const char = content[i];

		if (char === '{' || char === '[') {
			depth++;
			i++;
		} else if (char === '}' || char === ']') {
			depth--;
			i++;
		} else if (char === '"') {
			const end = skipString(content, i);
			const isVersionKey = depth === 1 && content.slice(i, end) === '"version"';
			i = end;

			if (isVersionKey) {
				const value = content.slice(i).match(/^\s*:\s*/);
				if (value && content[i + value[0].length] === '"') {
					const start = i + value[0].length;
					return { start, end: skipString(content, start) };
				}
			}
		} else {
			i++;
		}
	}

	return null;
}

/**
 * Return the index right after the JSON string starting at `start`.
 */
function skipString(content: string, start: number): number {
	let i = start + 1;
	while (i < content.length && content[i] !== '"') {
		i += content[i] === '\\' ? 2 : 1;
	}
	return i + 1;
}

/**
 * Detect indentation used in a JSON file.
 * Defaults to 2 spaces if detection fails.
 */
function detectIndent(content: string): number | string {
	const match = content.match(/^[\t ]+/m);
	if (match) {
		const indent = match[0];
		if (indent.startsWith('\t')) {
			return '\t';
		}
		return indent.length;
	}
	return 2;
}
