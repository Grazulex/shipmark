import { colors } from './colors';

export class ShipmarkError extends Error {
	constructor(
		message: string,
		public suggestions: string[] = []
	) {
		super(message);
		this.name = 'ShipmarkError';
	}
}

export class GitError extends ShipmarkError {
	constructor(message: string, suggestions: string[] = []) {
		super(message, suggestions);
		this.name = 'GitError';
	}
}

export class ValidationError extends ShipmarkError {
	constructor(message: string, suggestions: string[] = []) {
		super(message, suggestions);
		this.name = 'ValidationError';
	}
}

export class ConfigError extends ShipmarkError {
	constructor(message: string, suggestions: string[] = []) {
		super(message, suggestions);
		this.name = 'ConfigError';
	}
}

export function formatError(error: ShipmarkError): void {
	console.error();
	console.error(colors.error(`✖ ${error.message}`));

	if (error.suggestions.length > 0) {
		console.error();
		console.error(colors.muted('Suggestions:'));
		for (const suggestion of error.suggestions) {
			console.error(`  ${colors.muted('•')} ${suggestion}`);
		}
	}

	console.error();
}

export function handleError(error: unknown): never {
	if (error instanceof ShipmarkError) {
		formatError(error);
	} else if (error instanceof Error) {
		console.error();
		console.error(colors.error(`✖ ${error.message}`));
		console.error();
	} else {
		console.error();
		console.error(colors.error('✖ An unexpected error occurred'));
		console.error();
	}

	process.exit(1);
}
