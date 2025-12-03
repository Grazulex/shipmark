import { colors, icons } from './colors';

export const logger = {
	success(message: string): void {
		console.log(`${colors.success(icons.success)} ${message}`);
	},

	error(message: string): void {
		console.error(`${colors.error(icons.error)} ${message}`);
	},

	warning(message: string): void {
		console.warn(`${colors.warning(icons.warning)} ${message}`);
	},

	info(message: string): void {
		console.log(`${colors.info(icons.info)} ${message}`);
	},

	log(message: string): void {
		console.log(message);
	},

	newline(): void {
		console.log();
	},

	divider(): void {
		console.log(colors.dim('─'.repeat(50)));
	},

	header(title: string): void {
		logger.newline();
		console.log(colors.highlight(title));
		logger.divider();
	},

	step(message: string): void {
		console.log(`  ${colors.muted(icons.arrow)} ${message}`);
	},

	list(items: string[]): void {
		for (const item of items) {
			console.log(`  ${colors.muted(icons.bullet)} ${item}`);
		}
	},
};
