import { packageJsonHandler } from './package-json';
import { pyprojectHandler } from './pyproject';
import type {
	FileConfig,
	NormalizedFileConfig,
	VersionFileEntry,
	VersionHandler,
	VersionReadResult,
	VersionWriteResult,
} from './types';
import { normalizeFileConfig } from './types';
import { yamlHandler } from './yaml';

/**
 * Registry of version file handlers.
 * Handlers are tried in order until one can handle the file.
 */
class HandlerRegistry {
	private handlers: VersionHandler[] = [];

	/**
	 * Register a new handler.
	 * Handlers registered later take priority.
	 */
	register(handler: VersionHandler): void {
		this.handlers.unshift(handler);
	}

	/**
	 * Get all registered handlers.
	 */
	getHandlers(): VersionHandler[] {
		return [...this.handlers];
	}

	/**
	 * Find a handler that can process the given file.
	 */
	findHandler(filepath: string, config?: FileConfig): VersionHandler | null {
		for (const handler of this.handlers) {
			if (handler.canHandle(filepath, config)) {
				return handler;
			}
		}
		return null;
	}

	/**
	 * Read version from a single file.
	 */
	readVersion(filepath: string, cwd: string, config?: FileConfig): VersionReadResult {
		const handler = this.findHandler(filepath, config);

		if (!handler) {
			return {
				filepath,
				version: null,
				handler: 'none',
				error: `No handler found for file: ${filepath}`,
			};
		}

		try {
			const version = handler.read(filepath, cwd, config);
			return {
				filepath,
				version,
				handler: handler.name,
			};
		} catch (error: any) {
			return {
				filepath,
				version: null,
				handler: handler.name,
				error: error.message,
			};
		}
	}

	/**
	 * Write version to a single file.
	 */
	writeVersion(
		filepath: string,
		version: string,
		cwd: string,
		config?: FileConfig
	): VersionWriteResult {
		const handler = this.findHandler(filepath, config);

		if (!handler) {
			return {
				filepath,
				success: false,
				handler: 'none',
				error: `No handler found for file: ${filepath}`,
			};
		}

		try {
			handler.write(filepath, version, cwd, config);
			return {
				filepath,
				success: true,
				handler: handler.name,
			};
		} catch (error: any) {
			return {
				filepath,
				success: false,
				handler: handler.name,
				error: error.message,
			};
		}
	}

	/**
	 * Read version from multiple files.
	 * Returns the first successful read as the primary version.
	 */
	readVersionFromFiles(
		files: VersionFileEntry[],
		cwd: string
	): { primary: string | null; results: VersionReadResult[] } {
		const results: VersionReadResult[] = [];
		let primary: string | null = null;

		for (const entry of files) {
			const config = normalizeFileConfig(entry);
			const result = this.readVersion(config.path, cwd, config);
			results.push(result);

			if (primary === null && result.version) {
				primary = result.version;
			}
		}

		return { primary, results };
	}

	/**
	 * Write version to multiple files.
	 */
	writeVersionToFiles(
		files: VersionFileEntry[],
		version: string,
		cwd: string
	): VersionWriteResult[] {
		const results: VersionWriteResult[] = [];

		for (const entry of files) {
			const config = normalizeFileConfig(entry);

			// Apply prefix transformation if specified
			let versionToWrite = version;
			if (config.prefix !== undefined) {
				// Remove any existing 'v' prefix and apply the configured one
				versionToWrite = config.prefix + version.replace(/^v/, '');
			}

			const result = this.writeVersion(config.path, versionToWrite, cwd, config);
			results.push(result);
		}

		return results;
	}

	/**
	 * Validate that all files have the same version.
	 * Returns mismatches if any.
	 */
	validateVersionSync(
		files: VersionFileEntry[],
		cwd: string
	): { synced: boolean; versions: Map<string, string>; mismatches: string[] } {
		const versions = new Map<string, string>();
		const mismatches: string[] = [];

		for (const entry of files) {
			const config = normalizeFileConfig(entry);
			const result = this.readVersion(config.path, cwd, config);

			if (result.version) {
				// Normalize version (remove prefix for comparison)
				const normalizedVersion = result.version.replace(/^v/, '');
				versions.set(config.path, result.version);

				// Check against first version found
				const firstVersion = [...versions.values()][0]?.replace(/^v/, '');
				if (firstVersion && normalizedVersion !== firstVersion) {
					mismatches.push(config.path);
				}
			}
		}

		return {
			synced: mismatches.length === 0,
			versions,
			mismatches,
		};
	}
}

/**
 * Global handler registry instance.
 */
export const registry = new HandlerRegistry();

// Register built-in handlers
registry.register(packageJsonHandler);
registry.register(pyprojectHandler);
registry.register(yamlHandler);

/**
 * Convenience function to get the primary version from configured files.
 */
export function getVersion(files: VersionFileEntry[], cwd: string): string | null {
	const { primary } = registry.readVersionFromFiles(files, cwd);
	return primary;
}

/**
 * Convenience function to update version in all configured files.
 */
export function setVersion(
	files: VersionFileEntry[],
	version: string,
	cwd: string
): VersionWriteResult[] {
	return registry.writeVersionToFiles(files, version, cwd);
}
