# Shipmark

> Release management made easy

A beautiful CLI for managing Git releases, changelogs, and semantic versioning. No external dependencies required - just Git.

## Features

- **Interactive release workflow** - Guided prompts for version bumping
- **Automatic changelog generation** - Parses conventional commits
- **Semantic versioning** - Support for major, minor, patch, and prerelease
- **Tag management** - Create, list, and delete tags
- **Zero external dependencies** - Works with native Git only (no GitHub CLI, GitLab CLI, etc.)
- **Beautiful terminal UI** - Colorful output with spinners and progress indicators

## Installation

```bash
npm install -g @grazulex/shipmark
```

Or run directly with npx:

```bash
npx @grazulex/shipmark release
```

## Quick Start

```bash
# Initialize configuration
shipmark init

# Create a release (interactive)
shipmark release

# Preview changelog without creating release
shipmark changelog --preview
```

## Commands

### `shipmark release`

Interactive release workflow that:
1. Shows commits since last release
2. Lets you select version bump type
3. Generates/updates CHANGELOG.md
4. Creates release commit
5. Creates annotated tag
6. Pushes to remote

```bash
shipmark release                    # Interactive mode
shipmark release --dry-run          # Preview without executing
shipmark release -p beta            # Create beta prerelease
shipmark release -y                 # Skip confirmations
shipmark release --skip-push        # Don't push to remote
```

### `shipmark changelog`

Generate or update changelog from commits.

```bash
shipmark changelog                  # Update CHANGELOG.md
shipmark changelog --preview        # Preview without writing
shipmark changelog --from v1.0.0    # From specific tag
```

### `shipmark tag`

Manage Git tags.

```bash
shipmark tag list                   # List all tags
shipmark tag latest                 # Show latest tag
shipmark tag create 1.2.0           # Create new tag
shipmark tag delete v1.2.0          # Delete tag
shipmark tag delete v1.2.0 -r       # Delete from remote too
```

### `shipmark version`

Show or bump project version.

```bash
shipmark version                    # Show current version
shipmark version show               # Show current version
shipmark version bump               # Interactive bump
shipmark version bump patch         # Bump patch version
shipmark version bump minor         # Bump minor version
shipmark version bump major         # Bump major version
shipmark version set 2.0.0          # Set specific version
```

### `shipmark init`

Initialize Shipmark configuration.

```bash
shipmark init                       # Interactive setup
shipmark init -y                    # Use defaults
```

## Configuration

Shipmark uses `.shipmarkrc.yml` for configuration:

```yaml
changelog:
  file: "CHANGELOG.md"
  includeHash: true
  includeDate: true

version:
  files: ["package.json"]
  tagPrefix: "v"
  tagMessage: "Release {version}"
  commitMessage: "chore(release): {version}"

commits:
  conventional: true

git:
  push: true
  pushTags: true
  signTags: false
  signCommits: false
```

## Conventional Commits

Shipmark parses [Conventional Commits](https://www.conventionalcommits.org/) to generate changelogs:

| Prefix | Section |
|--------|---------|
| `feat:` | Features |
| `fix:` | Bug Fixes |
| `docs:` | Documentation |
| `refactor:` | Code Refactoring |
| `perf:` | Performance |
| `test:` | Tests |
| `chore:` | Chores |

Breaking changes are highlighted when using `!` or `BREAKING CHANGE:` in commit messages.

## Version Bumping

| Type | Example | Description |
|------|---------|-------------|
| `patch` | 1.0.0 → 1.0.1 | Bug fixes |
| `minor` | 1.0.0 → 1.1.0 | New features |
| `major` | 1.0.0 → 2.0.0 | Breaking changes |
| `prepatch` | 1.0.0 → 1.0.1-alpha.1 | Prerelease patch |
| `preminor` | 1.0.0 → 1.1.0-alpha.1 | Prerelease minor |
| `premajor` | 1.0.0 → 2.0.0-alpha.1 | Prerelease major |
| `prerelease` | 1.0.0-alpha.1 → 1.0.0-alpha.2 | Increment prerelease |

## Requirements

- Node.js >= 18.0.0
- Git

## License

MIT © [Grazulex](https://github.com/Grazulex)
