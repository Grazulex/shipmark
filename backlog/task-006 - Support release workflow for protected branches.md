---
id: 6
title: Support release workflow for protected branches
status: Done
priority: high
assignees:
  - '@claude'
labels:
  - feature
  - git
subtasks: []
dependencies: []
blocked_by: []
created_date: '2026-01-08T23:37:29.872Z'
updated_date: '2026-01-08T23:49:50.757Z'
closed_date: '2026-01-08T23:49:50.757Z'
changelog:
  - timestamp: '2026-01-08T23:37:29.872Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2026-01-08T23:37:58.957Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:39:34.226Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2026-01-08T23:40:28.702Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:41:36.550Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:43:16.192Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:45:02.740Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:49:01.533Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:49:12.956Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:49:26.532Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-01-08T23:49:33.045Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:33.738Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:34.413Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:35.098Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:35.811Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:42.159Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:42.833Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:43.556Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:44.234Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:44.929Z'
    action: modified
    details: Task updated
    user: user
  - timestamp: '2026-01-08T23:49:50.757Z'
    action: updated
    details: 'status: In Progress → Done'
    user: user
acceptance_criteria:
  - text: Option --pr ajoutee a la commande release
    checked: true
  - text: Cree une branche de release automatiquement
    checked: true
  - text: Push la branche et cree une PR si gh/glab disponible
    checked: true
  - text: Build et lint passent
    checked: true
  - text: Documentation mise a jour
    checked: true
ai_plan: >-
  ## Plan d'implémentation


  ### Objectif

  Permettre le workflow de release quand la branche principale est protégée, en
  créant une branche de release et en ouvrant une PR.


  ### Solution proposée

  Ajouter une option `--branch <name>` (ou auto-génération `release/vX.X.X`) qui
  :

  1. Crée une branche de release avant le commit

  2. Fait le commit + tag sur cette branche

  3. Push la branche de release

  4. Propose d'ouvrir une PR via gh/glab CLI si disponible


  ### Étapes

  1. Ajouter l'option `--branch <name>` dans les options CLI

  2. Ajouter `createBranch()` et `checkoutBranch()` dans git.ts

  3. Modifier le flow de release pour :
     - Si `--branch` : créer la branche avant le commit
     - Push la branche de release au lieu de main
     - Proposer d'ouvrir une PR si gh/glab disponible
  4. Ajouter la config `git.releaseBranch` pour un pattern par défaut

  5. Écrire les tests


  ### Fichiers concernés

  - src/commands/release.ts (modify) - Ajouter l'option et la logique

  - src/core/git.ts (modify) - Ajouter createBranch, checkoutBranch, pushBranch

  - src/core/release-provider.ts (modify) - Ajouter création de PR

  - src/types/config.ts (modify) - Ajouter config releaseBranch


  ### Approche technique

  - `--branch` sans valeur = auto-génère `release/vX.X.X`

  - `--branch custom-name` = utilise le nom fourni

  - Après push, si gh/glab disponible : propose `gh pr create` / `glab mr
  create`

  - Le tag reste créé sur la branche de release (sera mergé avec la PR)


  ### Défis potentiels

  - Le tag doit-il être sur main ou sur la branche de release ?

  - Faut-il attendre le merge de la PR pour tagger ?

  - Gestion de l'état si l'utilisateur annule en cours de route
ai_notes: >
  **2026-01-08T23:40:28.701Z** - **00:40** - PROGRESS: Added git branch
  functions (createBranch, checkoutBranch, branchExists, pushBranch,
  getDefaultBranch) in git.ts

  **2026-01-08T23:41:36.550Z** - **00:45** - PROGRESS: Added PR functions in
  release-provider.ts (getPullRequestInfo, createPullRequest, getWebPrUrl)

  **2026-01-08T23:43:16.191Z** - **00:52** - PROGRESS: Implemented full --pr
  mode in release.ts (branch creation, PR creation, modified output messages)

  **2026-01-08T23:45:02.740Z** - **00:58** - PROGRESS: Build and lint pass.
  Dry-run test with --pr shows correct output (Branch, PR target)

  **2026-01-08T23:49:01.533Z** - **01:10** - PROGRESS: Documented feature on
  shipmark.tech (commands.html, features.html), updated Claude rules and skills
ai_documentation: >-
  ## Documentation


  ### Usage


  L'option `--pr` permet de creer une release quand la branche principale est
  protegee.


  ### Syntaxe


  ```bash

  # Branche auto-generee (release/vX.X.X)

  shipmark release --pr


  # Branche personnalisee

  shipmark release --pr my-release-branch


  # Avec CI mode

  shipmark release --ci auto --pr -y

  ```


  ### Comportement


  1. Cree une branche de release (ex: `release/v1.2.0`)

  2. Met a jour les fichiers de version et changelog

  3. Cree le commit de release sur la branche

  4. Cree le tag Git sur la branche

  5. Push la branche vers le remote

  6. Cree une PR automatiquement si gh/glab disponible


  ### Sortie CI


  Variables supplementaires en mode CI avec `--pr`:

  - `SHIPMARK_BRANCH` - Nom de la branche de release

  - `SHIPMARK_PR_URL` - URL de la PR creee


  ### Configuration


  Aucune configuration supplementaire requise. L'option utilise:

  - `git.getDefaultBranch()` pour determiner la branche cible de la PR

  - Le pattern `release/{tagPrefix}{version}` pour le nom de branche par defaut
ai_review: >-
  ## Self-Review


  ### Complete

  - [x] Option --pr ajoutee a la commande release

  - [x] Fonctions git pour branches (createBranch, checkoutBranch, pushBranch,
  branchExists, getDefaultBranch)

  - [x] Logique de creation de PR (getPullRequestInfo, createPullRequest)

  - [x] Integration dans le flow de release

  - [x] Support GitHub (gh) et GitLab (glab)

  - [x] Sortie CI avec variables supplementaires (SHIPMARK_BRANCH,
  SHIPMARK_PR_URL)

  - [x] Documentation sur shipmark.tech (commands.html, features.html)

  - [x] Documentation dans les rules Claude

  - [x] Documentation dans les skills Claude


  ### Tests effectues

  - Build: OK

  - Lint (biome check): OK

  - Dry-run avec --pr: OK (affiche Branch et PR target correctement)

  - Help command: OK (--pr visible dans l'aide)


  ### Qualite du code

  - Standards respectes: Oui

  - Documentation: Complete


  ### Limitations connues

  - La creation de PR depend de gh/glab CLI etant installes

  - Si gh/glab n'est pas disponible, l'URL manuelle est fournie

  - Le tag est cree sur la branche de release (sera merge avec la PR)


  ### Questions pour le developpeur

  - Faut-il ajouter une option pour ne pas creer le tag sur la branche de
  release ?

  - Faut-il supporter d'autres providers que GitHub/GitLab ?


  ### Recommandations

  - Tester en conditions reelles avec une vraie branche protegee

  - Considerer l'ajout d'une option --base pour specifier la branche cible
  manuellement
---
Quand main est protégée sur GitHub, proposer un flow alternatif via une branche de release + PR
