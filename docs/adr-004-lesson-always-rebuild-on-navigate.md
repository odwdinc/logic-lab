---
date: 2026-04-01
title: Lesson build steps always clear and rebuild on navigation
status: accepted
---

## Decision

Every time the user navigates to a step that has a `build()` function — forward, backward, or on page refresh — the lesson circuit is cleared and the build runs from scratch. The previous `builtSteps` set (which skipped rebuild if a step had already been built) is removed.

## Why

The original once-only approach meant that after a page refresh, or after navigating away and back, the circuit showed whatever was left over rather than the canonical state for that step. Users had to close and reopen the lesson to recover. Always rebuilding guarantees the circuit always matches the lesson step, with no stale state.

## Alternatives rejected

- **Persist built state across refresh**: Would require serialising lesson progress including node IDs into localStorage. Complex and fragile — any change to a lesson file would invalidate saved state.
- **Only rebuild on refresh, not on back-navigation**: Partial solution; still breaks the "change the build" use case during lesson development.

## Constraints

- `nodeRemovedHook` is called for each node before clearing so clock/analyzer timer nodes are properly stopped.
- A `beginBatchBuild()` / `endBatchBuild(cid)` wrapper suppresses the per-`addNode`/`addWire` `simulate()` calls during the build, replacing ~20 intermediate simulations with one final call. Required to keep complex lesson builds (e.g. 4-bit register) responsive.
- A spinner overlay is shown during the build frame to prevent the UI appearing frozen.
