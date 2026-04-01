---
date: 2026-01-01
title: No build step — runs directly from static files
status: accepted
---

## Decision

Logic Lab runs by opening `index.html` directly in a browser. There is no bundler, no transpiler, no package.json, no node_modules. Script load order is declared with `<script>` tags in `index.html`.

## Why

The primary use case is sharing a single folder (or zip) with students or colleagues who open it without installing anything. A build step would add a prerequisite that breaks that use case. The codebase is small enough that module splitting via `<script>` tags is sufficient; the performance cost of multiple small files is negligible on a local file:// load.

## Alternatives rejected

- **Webpack / Rollup bundle**: Adds a node_modules dependency, a build command, and a separate dist/ output. Anyone cloning the repo to look at or modify a node file would need to rebuild before seeing changes. Rejected because it introduces friction exactly where the project values zero friction.
- **ES modules (`type="module"`)**: Would allow `import/export` but breaks `file://` loading in some browsers due to CORS restrictions on local modules. Also changes how globals are shared across files (currently all top-level vars are intentionally global).
- **TypeScript**: Would add a compile step and toolchain. The codebase's correctness model relies on small, self-contained node files that can be read and modified without IDE support.

## Constraints

- Script load order matters and is documented in CLAUDE.md. `ll-nodes.js` must load first (registry), node files second, then engine files in dependency order, `ll-core.js` last.
- Any node file can be removed from `index.html` without breaking anything else — all cross-node dependencies go through descriptor hook dispatchers or `typeof` guards.
