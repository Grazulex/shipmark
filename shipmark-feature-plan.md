# ShipMark - Feature Plan

## Context

Feature requests from Ariel (DevOps team lead) working with:
- Air-gapped Bitbucket Data Center / GitLab environments
- Mixed monorepo (React frontend + Python backend)
- Helm charts for deployment

---

## Feature 1: pyproject.toml Support

### Goal
Allow ShipMark to read/update version in Python projects using `pyproject.toml`.

### Technical Approach

#### 1.1 Version Location Detection
Python projects can define version in multiple places:

```toml
# PEP 621 standard (recommended)
[project]
name = "my-package"
version = "1.2.3"

# Poetry
[tool.poetry]
name = "my-package"
version = "1.2.3"

# Setuptools (legacy)
[tool.setuptools]
version = "1.2.3"
```

**Strategy:** Check in order: `[project].version` → `[tool.poetry].version` → `[tool.setuptools].version`

#### 1.2 Implementation Steps

1. **Add TOML parser** — Use a library like `smol-toml` (lightweight, no deps) or `@iarna/toml`
2. **Create `pyproject.ts` handler** similar to existing `package.json` handler
3. **Update config schema** — Add `pyproject.toml` to `version.files` options
4. **Preserve formatting** — TOML files should maintain comments and structure (use a parser that preserves them)

#### 1.3 Config Example

```yaml
# .shipmarkrc.yml
version:
  files:
    - "package.json"        # existing
    - "pyproject.toml"      # new
```

#### 1.4 Edge Cases to Handle
- Dynamic versioning (`dynamic = ["version"]`) → warn user, skip file
- Missing version field → warn and skip
- Read-only mode for validation

---

## Feature 2: YAML File Support

### Goal
Allow ShipMark to update version in arbitrary YAML files (Helm `values.yaml`, Kubernetes manifests, etc.).

### Technical Approach

#### 2.1 Challenge: Flexible Path
Unlike `package.json` (always `.version`) or `pyproject.toml` (known locations), YAML files have arbitrary structures:

```yaml
# Helm values.yaml
image:
  tag: "1.2.3"

# Or sometimes
appVersion: "1.2.3"

# Or nested
app:
  config:
    version: "1.2.3"
```

**Strategy:** Let user specify the YAML path using dot notation or JSONPath.

#### 2.2 Config Example

```yaml
# .shipmarkrc.yml
version:
  files:
    - "package.json"
    - path: "helm/values.yaml"
      key: "image.tag"              # dot notation
    - path: "k8s/deployment.yaml"
      key: "metadata.labels.version"
```

#### 2.3 Implementation Steps

1. **Add YAML parser** — Use `yaml` package (preserves comments with `YAML.parseDocument`)
2. **Create generic `yaml.ts` handler** with configurable path
3. **Support multiple YAML files** with different key paths
4. **Preserve formatting** — Critical for YAML (indentation, comments, anchors)

#### 2.4 Advanced Options (Future)

```yaml
version:
  files:
    - path: "helm/values.yaml"
      key: "image.tag"
      prefix: ""                    # no "v" prefix for Docker tags
    - path: "Chart.yaml"
      key: "appVersion"
      prefix: "v"
```

---

## Feature 3: Multi-file Version Sync (Bonus)

### Goal
Ensure all configured files stay in sync during release.

### Behavior
1. Read version from primary file (first in list, usually `package.json`)
2. Validate all other files have matching version (or warn if different)
3. Update all files atomically during release

### Config

```yaml
version:
  files:
    - "package.json"              # primary source of truth
    - "pyproject.toml"
    - path: "helm/values.yaml"
      key: "image.tag"
  syncCheck: true                 # warn if versions differ before release
```

---

## Implementation Roadmap

### Phase 1: pyproject.toml (MVP)
- [ ] Add TOML parser dependency
- [ ] Create `src/handlers/pyproject.ts`
- [ ] Support `[project].version` (PEP 621)
- [ ] Support `[tool.poetry].version`
- [ ] Update config schema
- [ ] Add tests
- [ ] Update documentation

**Estimated effort:** 1-2 days

### Phase 2: YAML Support
- [ ] Add YAML parser with comment preservation
- [ ] Create `src/handlers/yaml.ts`
- [ ] Implement configurable key path
- [ ] Handle prefix options (v prefix or not)
- [ ] Add tests
- [ ] Update documentation

**Estimated effort:** 2-3 days

### Phase 3: Polish & Release
- [ ] Multi-file sync check
- [ ] Dry-run improvements (show all files that would change)
- [ ] Better error messages for missing/invalid files
- [ ] Release as v0.6.0

**Estimated effort:** 1 day

---

## Dependencies to Add

```json
{
  "dependencies": {
    "smol-toml": "^1.1.0",    // lightweight TOML parser
    "yaml": "^2.3.0"          // YAML with comment preservation
  }
}
```

Alternative for TOML: `@iarna/toml` (more mature, slightly larger)

---

## File Structure Proposal

```
src/
├── handlers/
│   ├── index.ts           # handler registry
│   ├── package-json.ts    # existing (refactor if needed)
│   ├── pyproject.ts       # new
│   └── yaml.ts            # new
├── version/
│   └── manager.ts         # orchestrates multi-file updates
```

---

## Testing Strategy

1. **Unit tests** for each handler (read/write/preserve formatting)
2. **Integration tests** with sample project structures
3. **Edge cases:**
   - Missing files
   - Invalid TOML/YAML syntax
   - Dynamic Python versioning
   - Deeply nested YAML keys
   - Files with comments (must preserve)

---

## Notes for Ariel's PoC

Once implemented, his setup could look like:

```yaml
# .shipmarkrc.yml for React + Python monorepo
version:
  files:
    - "frontend/package.json"
    - "backend/pyproject.toml"
    - path: "deploy/helm/values.yaml"
      key: "image.tag"
      prefix: ""
  tagPrefix: "v"
  commitMessage: "chore(release): {version}"
```

This would update all three files in a single `shipmark release` command.
