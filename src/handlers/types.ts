/**
 * Configuration for a version file entry.
 * Can be a simple string path or an object with additional options.
 */
export interface FileConfig {
	path: string;
	key?: string;
	prefix?: string;
}

/**
 * Normalized file configuration (always an object).
 */
export type NormalizedFileConfig = FileConfig;

/**
 * Union type for version file entries in config.
 * Supports both simple strings and detailed objects.
 */
export type VersionFileEntry = string | FileConfig;

/**
 * Interface for version file handlers.
 * Each handler is responsible for reading and writing version
 * in a specific file format (JSON, TOML, YAML, etc.).
 */
export interface VersionHandler {
	/** Handler name for logging/debugging */
	readonly name: string;

	/** File extensions this handler can process */
	readonly extensions: string[];

	/**
	 * Check if this handler can process the given file.
	 * @param filepath - Path to the file
	 * @param config - Optional file configuration
	 */
	canHandle(filepath: string, config?: FileConfig): boolean;

	/**
	 * Read the version from a file.
	 * @param filepath - Path to the file (relative to cwd)
	 * @param cwd - Current working directory
	 * @param config - Optional file configuration
	 * @returns The version string or null if not found
	 */
	read(filepath: string, cwd: string, config?: FileConfig): string | null;

	/**
	 * Write a new version to a file.
	 * @param filepath - Path to the file (relative to cwd)
	 * @param version - New version to write
	 * @param cwd - Current working directory
	 * @param config - Optional file configuration
	 */
	write(filepath: string, version: string, cwd: string, config?: FileConfig): void;
}

/**
 * Result of reading version from multiple files.
 */
export interface VersionReadResult {
	filepath: string;
	version: string | null;
	handler: string;
	error?: string;
}

/**
 * Result of writing version to multiple files.
 */
export interface VersionWriteResult {
	filepath: string;
	success: boolean;
	handler: string;
	error?: string;
}

/**
 * Normalize a version file entry to a FileConfig object.
 */
export function normalizeFileConfig(entry: VersionFileEntry): NormalizedFileConfig {
	if (typeof entry === 'string') {
		return { path: entry };
	}
	return entry;
}
