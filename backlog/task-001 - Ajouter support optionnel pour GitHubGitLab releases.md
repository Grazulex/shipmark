---
id: 1
title: Ajouter support optionnel pour GitHub/GitLab releases
status: In Progress
priority: medium
assignees:
  - '@claude'
labels:
  - feature
subtasks: []
dependencies: []
blocked_by: []
created_date: '2025-12-18T01:53:01.635Z'
updated_date: '2025-12-18T01:56:57.831Z'
changelog:
  - timestamp: '2025-12-18T01:53:01.635Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2025-12-18T01:53:13.105Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2025-12-18T01:53:20.307Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:53:20.916Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:53:21.536Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:53:22.164Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:53:22.788Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:53:31.758Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2025-12-18T01:56:38.714Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2025-12-18T01:56:49.553Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2025-12-18T01:56:55.375Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:56:55.980Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:56:56.585Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:56:57.199Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2025-12-18T01:56:57.831Z'
    action: modified
    details: Task updated
    user: user
acceptance_criteria:
  - text: 'Détection automatique du provider Git (GitHub, GitLab, Bitbucket)'
    checked: true
  - text: Message informatif avec commande de release après le push
    checked: true
  - text: Option --create-release pour exécuter automatiquement
    checked: true
  - text: Zéro dépendance ajoutée
    checked: true
  - text: Fonctionne si CLI non installée (message warning)
    checked: true
ai_plan: >-
  ## Plan d'implémentation


  ### Objectif

  Ajouter un support optionnel pour créer des releases sur GitHub/GitLab sans
  ajouter de dépendances. Utiliser les CLIs natives si disponibles.


  ### Étapes

  1. Créer un module `release-provider.ts` pour détecter le provider Git

  2. Ajouter une fonction pour vérifier si la CLI est disponible (gh, glab)

  3. Ajouter une fonction pour générer la commande de release

  4. Modifier `release.ts` pour afficher un message informatif après le push

  5. Ajouter l'option `--create-release` pour exécuter automatiquement la
  commande

  6. Tester avec différents scénarios


  ### Fichiers concernés

  - `src/core/release-provider.ts` (nouveau)

  - `src/commands/release.ts` (modifier)

  - `src/types/config.ts` (modifier si nécessaire)


  ### Approche technique

  - Détection du provider via l'URL remote (github.com, gitlab.com,
  bitbucket.org)

  - Vérification CLI via `which gh` ou `which glab`

  - Zéro dépendance ajoutée - utilise uniquement child_process

  - Message informatif par défaut, exécution avec --create-release
ai_notes: |
  **2025-12-18T01:56:38.713Z** - **02:58** - PROGRESS: Implémentation terminée
  - Créé src/core/release-provider.ts avec détection GitHub/GitLab/Bitbucket
  - Modifié src/commands/release.ts avec option --create-release
  - Build OK, tests manuels OK
  - Détection du provider fonctionne correctement
ai_review: |-
  ## Self-Review

  ### Complété
  - [x] Détection automatique du provider Git (GitHub, GitLab, Bitbucket)
  - [x] Message informatif avec commande de release après le push
  - [x] Option --create-release (-r) pour exécuter automatiquement
  - [x] Zéro dépendance ajoutée (utilise child_process natif)
  - [x] Fonctionne si CLI non installée (affiche warning + URL web)

  ### Tests effectués
  - Build TypeScript: OK
  - Détection provider GitHub: OK
  - Détection CLI gh: OK
  - Génération commande: OK
  - Génération URL release: OK

  ### Limitations connues
  - Bitbucket n'a pas de releases natives comme GitHub/GitLab
  - Le test réel de création de release nécessite une vraie release

  ### Comportement
  - Sans --create-release: affiche la commande à exécuter manuellement
  - Avec --create-release: exécute automatiquement si CLI disponible
  - Si CLI non disponible: affiche l'URL web pour créer manuellement
---

