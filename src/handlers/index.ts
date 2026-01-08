// Types
export type {
	FileConfig,
	NormalizedFileConfig,
	VersionFileEntry,
	VersionHandler,
	VersionReadResult,
	VersionWriteResult,
} from './types';
export { normalizeFileConfig } from './types';

// Handlers
export { packageJsonHandler } from './package-json';
export { pyprojectHandler } from './pyproject';
export { yamlHandler } from './yaml';

// Registry
export { getVersion, registry, setVersion } from './registry';
