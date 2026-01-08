import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as TOML from 'smol-toml';
import type { FileConfig, VersionHandler } from './types';

/**
 * Locations where version can be found in pyproject.toml
 * Ordered by priority (PEP 621 first, then Poetry, then Setuptools)
 */
const VERSION_PATHS = [
	['project', 'version'], // PEP 621 (modern standard)
	['tool', 'poetry', 'version'], // Poetry
	['tool', 'setuptools', 'version'], // Setuptools (legacy)
] as const;

/**
 * Handler for pyproject.toml files.
 * Supports PEP 621, Poetry, and Setuptools version locations.
 */
export const pyprojectHandler: VersionHandler = {
	name: 'pyproject',
	extensions: ['.toml'],

	canHandle(filepath: string, _config?: FileConfig): boolean {
		return filepath.endsWith('pyproject.toml');
	},

	read(filepath: string, cwd: string, _config?: FileConfig): string | null {
		const fullPath = join(cwd, filepath);

		if (!existsSync(fullPath)) {
			return null;
		}

		try {
			const content = readFileSync(fullPath, 'utf8');
			const data = TOML.parse(content);

			// Check for dynamic version
			const project = data.project as Record<string, unknown> | undefined;
			if (project?.dynamic && Array.isArray(project.dynamic)) {
				if (project.dynamic.includes('version')) {
					// Dynamic version - cannot read
					return null;
				}
			}

			// Try each version path in order
			for (const path of VERSION_PATHS) {
				const version = getNestedValue(data, path);
				if (typeof version === 'string') {
					return version;
				}
			}

			return null;
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

		// Check for dynamic version before attempting to write
		try {
			const data = TOML.parse(content);
			const project = data.project as Record<string, unknown> | undefined;
			if (project?.dynamic && Array.isArray(project.dynamic)) {
				if (project.dynamic.includes('version')) {
					throw new Error('Cannot update dynamic version in pyproject.toml');
				}
			}
		} catch (e: any) {
			if (e.message.includes('dynamic')) {
				throw e;
			}
			// Continue with write attempt
		}

		// Find which version path exists and update it
		const data = TOML.parse(content);
		let updated = false;

		for (const path of VERSION_PATHS) {
			if (hasNestedValue(data, path)) {
				setNestedValue(data, path, version);
				updated = true;
				break;
			}
		}

		if (!updated) {
			// No existing version found, create in [project] section (PEP 621)
			if (!data.project) {
				(data as Record<string, unknown>).project = {};
			}
			(data.project as Record<string, unknown>).version = version;
		}

		// Write back preserving as much formatting as possible
		// smol-toml stringify maintains structure
		const newContent = TOML.stringify(data);
		writeFileSync(fullPath, newContent, 'utf8');
	},
};

/**
 * Get a nested value from an object using a path array.
 */
function getNestedValue(obj: unknown, path: readonly string[]): unknown {
	let current: unknown = obj;

	for (const key of path) {
		if (current === null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return current;
}

/**
 * Check if a nested path exists in an object.
 */
function hasNestedValue(obj: unknown, path: readonly string[]): boolean {
	let current: unknown = obj;

	for (const key of path) {
		if (current === null || typeof current !== 'object') {
			return false;
		}
		if (!(key in (current as Record<string, unknown>))) {
			return false;
		}
		current = (current as Record<string, unknown>)[key];
	}

	return true;
}

/**
 * Set a nested value in an object using a path array.
 * Creates intermediate objects if needed.
 */
function setNestedValue(obj: unknown, path: readonly string[], value: unknown): void {
	let current: Record<string, unknown> = obj as Record<string, unknown>;

	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}

	current[path[path.length - 1]] = value;
}
