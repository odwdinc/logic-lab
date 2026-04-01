---
date: 2026-04-01
title: Lesson panel hooks into navigation via monkey-patching switchToCircuit/closeCircuit
status: accepted
---

## Decision

`ll-lessons.js` wraps the globally-defined `switchToCircuit` and `closeCircuit` functions at the bottom of the file, storing the originals and replacing them with wrappers that add lesson-panel visibility logic before delegating to the originals.

## Why

The lesson panel must hide when the user switches to a non-lesson circuit tab and reappear when they switch back. The two natural integration points are `switchToCircuit` (in `ll-nav.js`) and `closeCircuit` (also in `ll-nav.js`). Adding lesson-specific calls directly to those functions would couple core navigation to the lesson system — which is designed to be an optional add-on that can be removed from `index.html` without breaking anything. The monkey-patch approach keeps `ll-nav.js` completely unaware of lessons.

## Alternatives rejected

- **Event / callback hooks in ll-nav.js**: Would require `ll-nav.js` to explicitly support a listener list for circuit changes. Adds surface area to a core file for a non-core feature.
- **Polling the current circuit ID on a timer**: Would add latency to panel hide/show and waste CPU. Not appropriate for a UI state synchronisation that has known trigger points.
- **Checking inside ll-lessons.js from a render loop**: Same problems as polling.

## Constraints

- `ll-lessons.js` loads after `ll-nav.js` (it's the last non-core script). The functions it wraps must already be defined at wrap time; this is guaranteed by the script load order in `index.html`.
- If `ll-lessons.js` is removed from `index.html`, `switchToCircuit` and `closeCircuit` remain their original versions — nothing breaks.
