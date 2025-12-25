# ShipMark - Project Guide

## Overview

ShipMark is a CLI tool for managing Git releases, changelogs, and versioning. It provides a beautiful, interactive terminal experience without requiring external dependencies like GitHub CLI or GitLab CLI.

## Tech Stack

- **Language**: TypeScript (ES2022, ESM)
- **CLI Framework**: Commander.js
- **Terminal UI**: Chalk, Ora, Boxen, cli-table3, Inquirer
- **Linter/Formatter**: Biome
- **Tests**: Vitest
- **Build**: tsc + custom fix-imports.mjs script

## Project Structure

```
src/
├── cli.ts                    # Entry point with banner and command registration
├── commands/
│   ├── release.ts            # Full release workflow (interactive)
│   ├── changelog.ts          # Generate changelog only
│   ├── tag.ts                # Create/list/delete tags
│   ├── version.ts            # Show/bump version
│   └── init.ts               # Initialize config
├── core/
│   ├── git.ts                # Git wrapper (execSync commands)
│   ├── log-parser.ts         # Parse git log into structured commits
│   ├── changelog-generator.ts # Generate markdown changelog
│   ├── semver.ts             # Semantic versioning logic
│   └── config.ts             # Configuration management
├── types/
│   ├── commit.ts             # Commit types
│   ├── config.ts             # Config types
│   └── version.ts            # Version types
└── utils/
    ├── colors.ts             # Semantic color mapping
    ├── logger.ts             # Logging with icons
    ├── errors.ts             # ValidationError with suggestions
    └── validators.ts         # Input validation
```

## Commands

- `shipmark release` - Interactive release workflow
- `shipmark changelog [--from <tag>]` - Generate changelog
- `shipmark tag <version>` - Create annotated tag
- `shipmark version [bump-type]` - Show or bump version
- `shipmark init` - Initialize configuration

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev [command]

# Build
npm run build

# Run tests
npm test

# Lint & format
npm run check
npm run format
```

## Git Operations

All Git operations use native Git commands via `child_process.execSync`:

- `git log` - Parse commit history
- `git tag` - Create/list tags
- `git describe` - Find latest tag
- `git push` - Push commits and tags
- `git rev-parse` - Check Git status

No GitHub CLI, GitLab CLI, or other external tools required.

## Configuration

Config file: `.shipmarkrc.yml` in project root

```yaml
changelog:
  file: CHANGELOG.md
  types:
    feat: Features
    fix: Bug Fixes
    docs: Documentation
    refactor: Code Refactoring
    test: Tests
    chore: Chores

version:
  files:
    - package.json
  tagPrefix: v

commits:
  conventional: true
```

## Conventional Commits

Supports parsing conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance
- `BREAKING CHANGE:` - Breaking changes

## Code Style

- Use tabs for indentation
- Single quotes for strings
- Trailing commas (ES5 style)
- Always use semicolons
- Max line width: 100 characters
