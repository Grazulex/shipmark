---
id: 2
title: 'Refactorer architecture: système de handlers'
status: Done
priority: high
milestone: v0.6.0
assignees:
  - '@claude'
labels:
  - refactoring
  - architecture
subtasks: []
dependencies: []
blocked_by: []
created_date: '2026-01-08T20:34:36.972Z'
updated_date: '2026-01-08T20:41:46.907Z'
closed_date: '2026-01-08T20:41:46.907Z'
changelog:
  - timestamp: '2026-01-08T20:34:36.972Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2026-01-08T20:34:58.878Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:34:59.552Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:00.243Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:00.930Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:01.637Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:54.995Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:37:00.168Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2026-01-08T20:37:11.395Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:41:18.387Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:41:26.279Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:41:27.120Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:41:27.817Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:41:28.517Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:41:29.234Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:41:41.855Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:41:46.907Z'
    action: updated
    details: 'status: In Progress → Done'
    user: user
acceptance_criteria:
  - text: 'Interface VersionHandler définie (canHandle, read, write)'
    checked: true
  - text: Registry de handlers avec auto-détection
    checked: true
  - text: Handler package.json refactoré vers le nouveau système
    checked: true
  - text: Tests unitaires pour le registry
    checked: true
  - text: Rétrocompatibilité maintenue
    checked: true
ai_plan: >-
  ## Plan d'implémentation


  ### Objectif

  Créer une architecture modulaire de handlers pour supporter différents formats
  de fichiers de version.


  ### Étapes

  1. Créer src/handlers/types.ts avec l'interface VersionHandler

  2. Créer src/handlers/registry.ts pour le dispatch automatique

  3. Refactorer la logique package.json vers src/handlers/package-json.ts

  4. Créer src/handlers/index.ts comme point d'entrée

  5. Modifier src/core/config.ts pour utiliser le registry

  6. Mettre à jour src/commands/version.ts pour utiliser les nouveaux handlers

  7. Ajouter tests unitaires


  ### Fichiers concernés

  - src/handlers/types.ts (create)

  - src/handlers/registry.ts (create)

  - src/handlers/package-json.ts (create)

  - src/handlers/index.ts (create)

  - src/core/config.ts (modify)

  - src/commands/version.ts (modify)

  - tests/handlers/ (create)


  ### Interface proposée

  ```typescript

  interface FileConfig {
    path: string;
    key?: string;
    prefix?: string;
  }


  interface VersionHandler {
    name: string;
    canHandle(filepath: string): boolean;
    read(filepath: string, cwd: string): string | null;
    write(filepath: string, version: string, cwd: string): void;
  }

  ```


  ### Défis potentiels

  - Maintenir la rétrocompatibilité avec l'API existante

  - Gérer les erreurs de manière cohérente entre handlers
ai_notes: >
  **2026-01-08T20:37:11.395Z** - **21:36** - PROGRESS: Démarrage de
  l'implémentation. Création du dossier src/handlers/

  **2026-01-08T20:41:18.386Z** - **21:41** - PROGRESS: Architecture handlers
  complète

  - types.ts: Interface VersionHandler + FileConfig

  - package-json.ts: Handler refactoré

  - registry.ts: Registry avec auto-dispatch

  - index.ts: Point d'entrée exports

  - config.ts: Intégration avec nouvelles fonctions (rétrocompatibles)

  - 20 nouveaux tests passent (70 total)
ai_review: >-
  ## Self-Review


  ### Complet

  - [x] Interface VersionHandler avec canHandle, read, write

  - [x] Types FileConfig, VersionFileEntry, NormalizedFileConfig

  - [x] Registry avec pattern singleton

  - [x] Handler package.json refactoré

  - [x] Fonctions rétrocompatibles (getVersionFromPackageJson,
  updateVersionInFile)

  - [x] Nouvelles fonctions (getVersionFromFiles, updateVersionInFiles,
  validateVersionSync)

  - [x] 20 tests unitaires


  ### Tests effectués

  - npm run build: OK

  - npm run check: OK

  - npm run test:run: 70 tests passent


  ### Qualité du code

  - Standards Biome respectés: Oui

  - Documentation JSDoc: Complète

  - Types TypeScript: Stricts


  ### Fichiers créés

  - src/handlers/types.ts

  - src/handlers/package-json.ts

  - src/handlers/registry.ts

  - src/handlers/index.ts

  - tests/handlers.test.ts


  ### Fichiers modifiés

  - src/core/config.ts (nouvelles fonctions + intégration registry)


  ### Prêt pour Phase 2

  L'architecture est en place pour ajouter les handlers pyproject.ts et yaml.ts.
---
Créer un système de handlers modulaire pour gérer différents formats de fichiers (JSON, TOML, YAML). Base pour les features Python/YAML.
