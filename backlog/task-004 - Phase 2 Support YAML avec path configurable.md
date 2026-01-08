---
id: 4
title: 'Phase 2: Support YAML avec path configurable'
status: Done
priority: high
milestone: v0.6.0
assignees:
  - '@claude'
labels:
  - feature
  - yaml
  - devops
subtasks: []
dependencies: []
blocked_by: []
created_date: '2026-01-08T20:34:38.655Z'
updated_date: '2026-01-08T20:51:02.482Z'
closed_date: '2026-01-08T20:51:02.482Z'
changelog:
  - timestamp: '2026-01-08T20:34:38.655Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2026-01-08T20:35:08.270Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:08.964Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:09.672Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:10.406Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:11.145Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:11.866Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:12.624Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:13.324Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:35:56.711Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:44:54.396Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2026-01-08T20:45:02.045Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:50:15.247Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:50:28.959Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:29.655Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:30.359Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:31.050Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:31.759Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:32.458Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:33.141Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:33.830Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T20:50:56.828Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T20:51:02.482Z'
    action: updated
    details: 'status: In Progress → Done'
    user: user
acceptance_criteria:
  - text: Dépendance yaml ajoutée
    checked: true
  - text: Schema config étendu pour path + key + prefix
    checked: true
  - text: 'Parsing dot notation (image.tag, metadata.labels.version)'
    checked: true
  - text: Option prefix par fichier (avec/sans v)
    checked: true
  - text: Préservation des commentaires YAML
    checked: true
  - text: Support des anchors/aliases YAML
    checked: true
  - text: Tests avec fichiers Helm réalistes
    checked: true
  - text: Documentation mise à jour
    checked: true
ai_plan: |-
  ## Plan d'implémentation

  ### Objectif
  Supporter les fichiers YAML avec chemins configurables pour Helm, K8s, etc.

  ### Étapes
  1. Ajouter dépendance yaml dans package.json
  2. Étendre le type VersionConfig pour supporter les objets FileConfig
  3. Créer src/handlers/yaml.ts
  4. Implémenter le parsing de dot notation (image.tag → image.tag)
  5. Implémenter read() avec YAML.parseDocument (préserve commentaires)
  6. Implémenter write() avec modification in-place
  7. Gérer l'option prefix par fichier
  8. Mettre à jour le parsing de config pour le nouveau format
  9. Ajouter tests avec fichiers Helm réalistes
  10. Mettre à jour la documentation

  ### Fichiers concernés
  - package.json (modify - add yaml)
  - src/types/config.ts (modify - extend VersionConfig)
  - src/handlers/yaml.ts (create)
  - src/handlers/registry.ts (modify)
  - src/core/config.ts (modify - parsing nouveau format)
  - tests/handlers/yaml.test.ts (create)
  - tests/fixtures/yaml/ (create)
  - README.md (modify)

  ### Nouveau format config
  ```yaml
  version:
    files:
      - "package.json"
      - path: "helm/values.yaml"
        key: "image.tag"
        prefix: ""
  ```

  ### Défis potentiels
  - Parsing de paths profondément imbriqués
  - Préservation des anchors/aliases YAML
  - Migration douce du format config (supporter les deux)
ai_notes: >
  **2026-01-08T20:45:02.045Z** - **21:45** - PROGRESS: Ajout de yaml comme
  dépendance

  **2026-01-08T20:50:15.247Z** - **21:50** - PROGRESS: Handler YAML complet

  - Support dot notation (image.tag, metadata.labels.version)

  - Préservation des commentaires via parseDocument

  - Config étendue avec path/key/prefix

  - Parsing config utilise maintenant la lib yaml

  - 21 nouveaux tests (109 total)
ai_review: >-
  ## Self-Review


  ### Complet

  - [x] Dépendance yaml ajoutée

  - [x] Schema config étendu (VersionFileEntry = string | FileConfig)

  - [x] Parsing dot notation (image.tag, metadata.labels.version)

  - [x] Option prefix par fichier

  - [x] Préservation des commentaires via parseDocument

  - [x] Support des anchors/aliases (via lib yaml)

  - [x] 21 tests dont Helm Chart.yaml et K8s deployment


  ### Tests effectués

  - npm run build: OK

  - npm run check: OK

  - npm run test:run: 109 tests passent


  ### Qualité du code

  - Standards Biome respectés: Oui

  - Documentation JSDoc: Complète

  - Types TypeScript: Stricts


  ### Fichiers créés

  - src/handlers/yaml.ts

  - tests/yaml.test.ts


  ### Fichiers modifiés

  - package.json (yaml dependency)

  - src/types/config.ts (VersionConfig étendu)

  - src/core/config.ts (utilise lib yaml pour parsing)

  - src/commands/version.ts (updateVersionInFiles)

  - src/commands/release.ts (updateVersionInFiles)

  - src/handlers/registry.ts (yamlHandler)

  - src/handlers/index.ts (export yamlHandler)


  ### Changement architectural

  Le parsing de config .shipmarkrc.yml utilise maintenant la lib yaml au lieu du
  parser simple custom, permettant les structures complexes.
---
Ajouter le support des fichiers YAML (Helm values.yaml, K8s manifests) avec chemin configurable via dot notation.
