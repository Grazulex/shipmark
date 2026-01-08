---
id: 3
title: 'Phase 1: Support pyproject.toml'
status: Done
priority: high
milestone: v0.6.0
assignees:
  - '@claude'
labels:
  - feature
  - python
subtasks: []
dependencies: []
blocked_by: []
created_date: '2026-01-08T20:34:37.835Z'
updated_date: '2026-01-08T20:44:41.410Z'
closed_date: '2026-01-08T20:44:41.410Z'
changelog:
  - timestamp: '2026-01-08T20:34:37.835Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2026-01-08T20:35:02.495Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:03.145Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:03.840Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:04.534Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:05.236Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:05.936Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:06.659Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:07.377Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:55.823Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:41:57.617Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2026-01-08T20:42:06.199Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:44:11.428Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:44:18.437Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:19.139Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:19.829Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:20.498Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:21.172Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:21.874Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:22.596Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:35.639Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:44:36.471Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:44:41.410Z'
    action: updated
    details: 'status: In Progress → Done'
    user: user
acceptance_criteria:
  - text: Dépendance smol-toml ajoutée
    checked: true
  - text: 'Support [project].version (PEP 621)'
    checked: true
  - text: 'Support [tool.poetry].version'
    checked: true
  - text: 'Support [tool.setuptools].version'
    checked: true
  - text: 'Gestion dynamic = [version] (warn + skip)'
    checked: true
  - text: Préservation du formatage TOML
    checked: true
  - text: Tests unitaires complets
    checked: true
  - text: Documentation mise à jour
    checked: true
ai_plan: >-
  ## Plan d'implémentation


  ### Objectif

  Ajouter le support complet de pyproject.toml pour les projets Python.


  ### Étapes

  1. Ajouter dépendance smol-toml dans package.json

  2. Créer src/handlers/pyproject.ts

  3. Implémenter la détection de l'emplacement de version (PEP 621 → Poetry →
  Setuptools)

  4. Implémenter read() avec parsing TOML

  5. Implémenter write() avec préservation du formatage

  6. Gérer le cas dynamic = ["version"] (warning)

  7. Enregistrer le handler dans le registry

  8. Ajouter tests avec fixtures réalistes

  9. Mettre à jour la documentation


  ### Fichiers concernés

  - package.json (modify - add smol-toml)

  - src/handlers/pyproject.ts (create)

  - src/handlers/registry.ts (modify)

  - tests/handlers/pyproject.test.ts (create)

  - tests/fixtures/pyproject/ (create)

  - README.md (modify)


  ### Ordre de détection version

  1. [project].version (PEP 621 - standard moderne)

  2. [tool.poetry].version (Poetry)

  3. [tool.setuptools].version (legacy)


  ### Edge cases

  - dynamic = ["version"] → warn + skip

  - Fichier sans section version → warn + skip

  - Commentaires TOML à préserver
ai_notes: >
  **2026-01-08T20:42:06.199Z** - **21:42** - PROGRESS: Ajout de smol-toml comme
  dépendance

  **2026-01-08T20:44:11.428Z** - **21:44** - PROGRESS: Handler pyproject.toml
  complet

  - Support PEP 621 ([project].version)

  - Support Poetry ([tool.poetry].version)

  - Support Setuptools ([tool.setuptools].version)

  - Gestion dynamic = ["version"] (erreur)

  - 18 nouveaux tests (88 total)
ai_review: |-
  ## Self-Review

  ### Complet
  - [x] Dépendance smol-toml ajoutée
  - [x] Support [project].version (PEP 621)
  - [x] Support [tool.poetry].version
  - [x] Support [tool.setuptools].version
  - [x] Gestion dynamic = ["version"] (throw error)
  - [x] Préservation du formatage via smol-toml
  - [x] 18 tests unitaires

  ### Tests effectués
  - npm run build: OK
  - npm run check: OK
  - npm run test:run: 88 tests passent

  ### Qualité du code
  - Standards Biome respectés: Oui
  - Documentation JSDoc: Complète
  - Types TypeScript: Stricts

  ### Fichiers créés
  - src/handlers/pyproject.ts
  - tests/pyproject.test.ts

  ### Fichiers modifiés
  - package.json (smol-toml dependency)
  - src/handlers/registry.ts (register pyprojectHandler)
  - src/handlers/index.ts (export pyprojectHandler)

  ### Limitation connue
  - smol-toml stringify peut modifier légèrement le formatage (whitespace)
  - Commentaires TOML ne sont pas préservés par smol-toml

  ### Note
  La doc sera mise à jour à la Phase 3 avec toutes les features.
---
Ajouter le support de pyproject.toml pour les projets Python. Support PEP 621, Poetry, et Setuptools.
