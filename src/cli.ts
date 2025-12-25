#!/usr/bin/env node

import { createRequire } from 'node:module';
import boxen from 'boxen';
import chalk from 'chalk';
import { program } from 'commander';
import { changelogCommand } from './commands/changelog';
import { historyCommand } from './commands/history';
import { initCommand } from './commands/init';
import { releaseCommand } from './commands/release';
import { statusCommand } from './commands/status';
import { tagCommand } from './commands/tag';
import { versionCommand } from './commands/version';
import { handleError } from './utils/errors';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');
const VERSION = packageJson.version;

const banner = `
${chalk.hex('#FF6B6B').bold('┌─────────────────────────────────────┐')}
${chalk.hex('#FF6B6B').bold('│')}  ${chalk.hex('#4ECDC4').bold('🚀 SHIPMARK')}                        ${chalk.hex('#FF6B6B').bold('│')}
${chalk.hex('#FF6B6B').bold('│')}  ${chalk.gray('Release management made easy')}       ${chalk.hex('#FF6B6B').bold('│')}
${chalk.hex('#FF6B6B').bold('└─────────────────────────────────────┘')}
`;

function showBanner(): void {
	console.log(banner);
}

function showVersion(): void {
	const info = boxen(
		[
			`${chalk.hex('#4ECDC4').bold('ShipMark')} ${chalk.white(`v${VERSION}`)}`,
			'',
			`${chalk.gray('Node:')} ${process.version}`,
			`${chalk.gray('Platform:')} ${process.platform}`,
		].join('\n'),
		{
			padding: 1,
			margin: 1,
			borderStyle: 'round',
			borderColor: '#FF6B6B',
		}
	);

	console.log(info);
}

program
	.name('shipmark')
	.description('A beautiful CLI for managing Git releases, changelogs, and versioning')
	.version(VERSION, '-v, --version', 'Show version information')
	.action(() => {
		showBanner();
		program.help();
	});

// Override version display
program.on('option:version', () => {
	showVersion();
	process.exit(0);
});

// Register commands
releaseCommand(program);
statusCommand(program);
changelogCommand(program);
tagCommand(program);
versionCommand(program);
historyCommand(program);
initCommand(program);

// Global error handling
program.exitOverride((err) => {
	if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
		process.exit(0);
	}
	handleError(err);
});

// Parse arguments
try {
	program.parse();
} catch (error) {
	handleError(error);
}
