---
date: 2026-01-01
title: allCircuits() returns top-level circuits plus all custom block internal circuits
status: accepted
---

## Decision

`allCircuits()` in `ll-state.js` merges `circuits` (the top-level circuit dictionary) with the internal circuits embedded in every custom block definition. All timer-sync scans and other global operations use `allCircuits()` rather than iterating `circuits` directly.

## Why

Custom blocks can contain CLOCK, ANALYZER, or WEB_INPUT nodes. Those nodes own timers that must be started and stopped as they appear and disappear. If timer sync only scanned top-level circuits, a clock inside a custom block definition would never get its timer started — it would appear to work when you entered the block to edit it (since `simulate()` runs on the live circuit), but would never tick autonomously.

## Alternatives rejected

- **Scan blockDefs separately in each timer sync function**: Each timer-owning node (CLOCK, ANALYZER, WEB_INPUT) would need to implement its own two-level scan. `allCircuits()` centralises this so sync functions stay simple.
- **Forbid timer nodes inside custom blocks**: Too restrictive. A reusable clocked circuit (e.g. a configurable counter with its own clock) is a legitimate design.

## Constraints

- Custom block internal circuits have their own `id` (e.g. `circ_d3`). `allCircuits()` de-duplicates by ID to avoid returning the same circuit twice if it appears in both `circuits` and a block def.
- When a custom block is deleted, its internal circuit is removed from both `circuits` and `blockDefs`. Timer sync running after deletion will stop any orphaned timers because the nodes are no longer found.
