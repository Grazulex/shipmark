<div align="center">

<img src="logo.png" alt="Shipmark Logo" width="120" />

# ShipMark

### 🚀 Git Release Management Made Easy
**Beautiful CLI • Zero Dependencies • Full Control**

[![npm version](https://img.shields.io/npm/v/@grazulex/shipmark.svg?style=flat-square&logo=npm&color=cb3837)](https://www.npmjs.com/package/@grazulex/shipmark)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Website](https://img.shields.io/badge/Website-shipmark.tech-4ECDC4?style=flat-square)](https://shipmark.tech)

**Automate your release workflow with an interactive CLI that generates changelogs, manages versions, and creates tags—all without external dependencies.**

[Website](https://shipmark.tech) • [Quick Start](#-quick-start) • [Features](#-features) • [CI/CD](#-cicd-integration) • [Commands](#-commands)

</div>

---

## ⚡ Quick Start

```bash
# Install globally
npm install -g @grazulex/shipmark

# Initialize configuration
shipmark init

# Check release status
shipmark status

# Create a release (interactive)
shipmark release
```

**That's it!** ShipMark will guide you through version selection, generate a changelog, create a tag, and push to remote.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎯 Interactive Workflow
Guided prompts for version bumping with preview of all changes before execution. Never release blind again.

</td>
<td width="50%">

### 📝 Automatic Changelog
Parses [Conventional Commits](https://www.conventionalcommits.org/) to generate beautiful, organized changelogs.

</td>
</tr>
<tr>
<td>

### 🏷️ Semantic Versioning
Full semver support including major, minor, patch, and prerelease versions (alpha, beta, rc).

</td>
<td>

### 🔧 Zero External Dependencies
Works with native Git only. No GitHub CLI, GitLab CLI, or other tools required.

</td>
</tr>
<tr>
<td>

### 🤖 CI/CD Ready
Non-interactive mode with auto-detection of version bumps based on commit types. Perfect for pipelines.

</td>
<td>

### 🎨 Beautiful Terminal UI
Colorful output, spinners, and progress indicators. Release management that feels modern.

</td>
</tr>
</table>

---

## 🖥️ Commands

### `shipmark release`

Interactive release workflow with changelog, tag, and push.

```bash
shipmark release                    # Interactive mode
shipmark release --dry-run          # Preview without executing
shipmark release --ci auto          # CI mode with auto version detection
shipmark release --ci minor         # CI mode with specific bump
shipmark release -p beta            # Create beta prerelease
shipmark release --skip-push        # Don't push to remote
```

### `shipmark status`

Check release status before creating a release.

```bash
shipmark status                     # Show pending changes summary
shipmark status -v                  # Include commit details
```

**Example output:**
```
📦 Release Status
──────────────────────────────────────────────────
  Branch:          main
  Package version: 1.2.3
  Latest tag:      v1.2.3
  Working tree:    clean

📝 Pending Changes
──────────────────────────────────────────────────
  5 commits since v1.2.3

  Features      2
  Bug Fixes     2
  Documentation 1

🚀 Suggested Release
──────────────────────────────────────────────────
  Current:    1.2.3
  Next:       1.3.0 (minor)
```

### `shipmark changelog`

Generate or preview changelog.

```bash
shipmark changelog                  # Update CHANGELOG.md
shipmark changelog --preview        # Preview without writing
shipmark changelog --from v1.0.0    # From specific tag
```

### `shipmark version`

Manage project version.

```bash
shipmark version                    # Show current version
shipmark version bump               # Interactive bump
shipmark version bump minor         # Specific bump type
shipmark version set 2.0.0          # Set exact version
```

### `shipmark tag`

Manage Git tags.

```bash
shipmark tag list                   # List all tags
shipmark tag latest                 # Show latest tag
shipmark tag create 1.2.0           # Create new tag
shipmark tag delete v1.2.0 -r       # Delete from local and remote
```

### `shipmark history`

View release history with dates and commit counts.

```bash
shipmark history                    # Show release history
shipmark history -d                 # Include commit details
shipmark history -l 5               # Limit to last 5 releases
```

**Example output:**
```
Release History
──────────────────────────────────────────────────
┌─────────┬────────────┬─────────┐
│ Version │ Date       │ Commits │
├─────────┼────────────┼─────────┤
│ 1.3.0   │ 2024-01-15 │ 5       │
├─────────┼────────────┼─────────┤
│ 1.2.0   │ 2024-01-10 │ 8       │
├─────────┼────────────┼─────────┤
│ 1.1.0   │ 2024-01-05 │ 3       │
└─────────┴────────────┴─────────┘
```

### `shipmark init`

Initialize ShipMark configuration.

```bash
shipmark init                       # Interactive setup
shipmark init -y                    # Use defaults
```

---

## 🤖 CI/CD Integration

ShipMark works seamlessly in CI/CD pipelines with non-interactive mode.

### GitHub Actions

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Version bump type'
        required: true
        default: 'auto'
        type: choice
        options:
          - auto
          - patch
          - minor
          - major

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install ShipMark
        run: npm install -g @grazulex/shipmark

      - name: Create Release
        run: shipmark release --ci ${{ inputs.bump }}
        env:
          GIT_AUTHOR_NAME: github-actions
          GIT_AUTHOR_EMAIL: github-actions@github.com
          GIT_COMMITTER_NAME: github-actions
          GIT_COMMITTER_EMAIL: github-actions@github.com
```

### CI Mode Options

| Option | Description |
|--------|-------------|
| `--ci auto` | Auto-detect bump from commits (breaking→major, feat→minor, else→patch) |
| `--ci patch` | Force patch bump |
| `--ci minor` | Force minor bump |
| `--ci major` | Force major bump |
| `--ci prerelease` | Increment prerelease version |

### CI Output Variables

In CI mode, ShipMark outputs variables for pipeline consumption:

```bash
SHIPMARK_VERSION=1.3.0
SHIPMARK_TAG=v1.3.0
SHIPMARK_BUMP=minor
```

---

## ⚙️ Configuration

ShipMark uses `.shipmarkrc.yml` for configuration:

```yaml
changelog:
  file: "CHANGELOG.md"
  includeHash: true
  includeDate: true

version:
  files:
    - "package.json"                    # Node.js
    - "pyproject.toml"                  # Python (PEP 621, Poetry, Setuptools)
    - path: "helm/values.yaml"          # Helm/YAML with custom key
      key: "image.tag"
      prefix: ""                        # No "v" prefix for Docker tags
  tagPrefix: "v"
  tagMessage: "Release {version}"
  commitMessage: "chore(release): {version}"
  syncCheck: true                       # Warn if versions differ before release

commits:
  conventional: true                    # false also lists non-conventional commits

git:
  push: true
  pushTags: true
  signTags: false
  signCommits: false
```

### Non-Conventional Commits

A commit that cannot be parsed as a conventional commit is grouped under the
type `other`. With `commits.conventional: true` (the default) those commits stay
out of the changelog, and ShipMark warns which ones it left out:

```
⚠ 1 commit(s) are not conventional commits and are left out of the changelog:
  → 19f8503 PROJ-123: fixed the thing
  → Set commits.conventional to false to include them.
```

Set `commits.conventional: false` to list them under an `Other` heading instead.
Rename that heading through `changelog.types`:

```yaml
changelog:
  types:
    other: "Miscellaneous"

commits:
  conventional: false
```

### Multi-File Version Support

ShipMark can update version in multiple files across different ecosystems:

| File Type | Auto-detected | Config Example |
|-----------|---------------|----------------|
| `package.json` | Yes | `"package.json"` |
| `pyproject.toml` | Yes (PEP 621, Poetry, Setuptools) | `"pyproject.toml"` |
| `*.yaml` / `*.yml` | With key path | `path: "values.yaml"`, `key: "image.tag"` |

**Example for React + Python monorepo:**

```yaml
version:
  files:
    - "frontend/package.json"
    - "backend/pyproject.toml"
    - path: "deploy/helm/values.yaml"
      key: "image.tag"
      prefix: ""
  syncCheck: true
```

---

## 📋 Conventional Commits

ShipMark parses [Conventional Commits](https://www.conventionalcommits.org/) to organize your changelog:

| Prefix | Section | Bump |
|--------|---------|------|
| `feat:` | Features | minor |
| `fix:` | Bug Fixes | patch |
| `docs:` | Documentation | patch |
| `refactor:` | Code Refactoring | patch |
| `perf:` | Performance | patch |
| `test:` | Tests | patch |
| `chore:` | Chores | patch |
| `BREAKING CHANGE:` | ⚠️ Breaking Changes | **major** |

---

## 🔢 Version Bumping

| Type | Example | When to use |
|------|---------|-------------|
| `patch` | 1.0.0 → 1.0.1 | Bug fixes, minor changes |
| `minor` | 1.0.0 → 1.1.0 | New features (backwards compatible) |
| `major` | 1.0.0 → 2.0.0 | Breaking changes |
| `prepatch` | 1.0.0 → 1.0.1-alpha.1 | Testing a patch |
| `preminor` | 1.0.0 → 1.1.0-alpha.1 | Testing a feature |
| `premajor` | 1.0.0 → 2.0.0-alpha.1 | Testing breaking changes |
| `prerelease` | 1.0.0-alpha.1 → 1.0.0-alpha.2 | Next prerelease iteration |

---

## 🚀 Installation

### npm (Recommended)

```bash
npm install -g @grazulex/shipmark
```

### npx (No install)

```bash
npx @grazulex/shipmark release
```

### Verify Installation

```bash
shipmark --version
```

---

## 📊 Comparison

| Feature | ShipMark | semantic-release | release-it | standard-version |
|---------|----------|------------------|------------|------------------|
| **Zero Config** | ✅ | ❌ | ⚠️ | ⚠️ |
| **Interactive Mode** | ✅ | ❌ | ✅ | ❌ |
| **CI Mode** | ✅ | ✅ | ✅ | ✅ |
| **No External Deps** | ✅ | ❌ | ❌ | ⚠️ |
| **Dry Run Preview** | ✅ Full | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |
| **Status Command** | ✅ | ❌ | ❌ | ❌ |
| **Actively Maintained** | ✅ | ✅ | ✅ | ❌ Deprecated |

---

## 🤝 Contributing

Contributions are welcome! Whether it's:
- 🐛 Bug reports
- ✨ Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

---

## 📄 License

MIT © [Grazulex](https://github.com/Grazulex)

---

<div align="center">

**[🌐 Website](https://shipmark.tech)** •
**[📦 npm](https://www.npmjs.com/package/@grazulex/shipmark)** •
**[🐛 Issues](https://github.com/Grazulex/shipmark/issues)** •
**[💬 Discussions](https://github.com/Grazulex/shipmark/discussions)**

---

**Built with ❤️ for developers who value simplicity**

*Star this repo if ShipMark helps your workflow!* ⭐

</div>
