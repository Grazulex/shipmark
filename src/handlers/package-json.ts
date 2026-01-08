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
		const data = JSON.parse(content);
		data.version = version;

		// Preserve formatting: detect indent from original file
		const indent = detectIndent(content);
		writeFileSync(fullPath, `${JSON.stringify(data, null, indent)}\n`, 'utf8');
	},
};

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
