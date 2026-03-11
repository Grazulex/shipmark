---
id: 7
title: 'Fix: only stage release-related files instead of git add -A'
status: Done
priority: high
assignees:
  - '@claude'
labels:
  - bug
  - release
subtasks: []
dependencies: []
blocked_by: []
created_date: '2026-03-11T10:37:56.939Z'
updated_date: '2026-03-11T10:39:56.602Z'
closed_date: '2026-03-11T10:39:56.602Z'
changelog:
  - timestamp: '2026-03-11T10:37:56.939Z'
    action: created
    details: Task created
    user: system
  - timestamp: '2026-03-11T10:38:14.291Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-03-11T10:38:18.415Z'
    action: updated
    details: 'status: To Do → In Progress'
    user: user
  - timestamp: '2026-03-11T10:39:52.392Z'
    action: modified
    details: Task updated
    user: AI
  - timestamp: '2026-03-11T10:39:56.602Z'
    action: updated
    details: 'status: In Progress → Done'
    user: user
acceptance_criteria: []
ai_plan: >-
  ## Implementation Plan


  ### Objective

  Replace git.stageAll() (git add -A) with targeted staging of only
  release-related files.


  ### Steps

  1. Add a new git.stage(files) method in src/core/git.ts

  2. In release.ts, collect the list of files modified by the release (version
  files + changelog)

  3. Replace git.stageAll() with git.stage(releaseFiles)


  ### Files to Modify

  - src/core/git.ts - Add stage(files) method

  - src/commands/release.ts - Replace stageAll() with targeted staging


  ### Technical Approach

  - The version files are already known from config.version.files

  - The changelog file is known from config.changelog.file

  - We build the list of files to stage based on what was actually modified
  (skip changelog if --skip-changelog)


  ### Edge Cases

  - --skip-changelog flag: don't include changelog in staged files

  - Multiple version files configured

  - Version files with nested paths (normalizeFileConfig)
ai_notes: >
  **2026-03-11T10:39:52.392Z** - Implementation complete:

  - Added git.stage(files) method in src/core/git.ts (line 159)

  - Replaced git.stageAll() with targeted staging in src/commands/release.ts
  (line 405-410)

  - Only stages: version files (from config.version.files) + changelog file (if
  not skipped)

  - Build OK, 109 tests pass, lint clean
---
Issue #9: git.stageAll() stages all files including untracked ones. Should only stage CHANGELOG.md and version files modified by Shipmark.
