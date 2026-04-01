---
date: 2026-01-01
title: simulate(quiet=true) for timer ticks — patch live values without rebuilding the props panel
status: accepted
---

## Decision

`simulate()` accepts a `quiet` boolean. When `quiet=true` (used by all timer-driven calls — clock ticks, analyzer ticks, web-input polls), it calls `patchPropPanelLive()` to update read-only display elements in place. When `quiet=false` (user actions), it calls `updatePropPanelIfSafe()` which rebuilds the panel's HTML, and also calls `autosaveDebounced()`.

## Why

Clock nodes can tick at up to 50 Hz. Rebuilding the full properties panel HTML (which involves DOM teardown, re-creation, and re-binding of all event listeners) on every tick causes visible flicker and wastes significant CPU. Nodes that own timers implement the `patchLive(node, def)` descriptor hook to update only the specific DOM elements that change (e.g. the current value display on a ROM, the waveform on an analyser). This targeted patching is imperceptible to the user while remaining correct.

## Alternatives rejected

- **Always rebuild the panel**: Works correctly but produces 50 flickers per second at max clock speed. Tested and confirmed unusable.
- **Throttle panel rebuilds to a fixed rate**: Adds complexity (a separate timer) and still wastes work. The quiet/loud split is simpler — loud when the user causes a change, quiet for background ticks.
- **Virtual DOM / diffing**: Would eliminate the flicker problem but adds a significant dependency or implementation burden for a static-file project.

## Constraints

- `quiet=true` never calls `autosaveDebounced()`. This is intentional — clock ticks should not trigger autosave, only user actions should.
- Nodes that display live data (CLOCK, ANALYZER, ROM, DISPLAY, BUS_WIRE) must implement `patchLive` to update their display under timer ticks. Nodes that don't implement it simply show stale values in the props panel until the user takes an action.
