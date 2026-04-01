---
date: 2026-04-01
title: Mobile touch support via synthetic MouseEvent dispatch
status: accepted
---

## Decision

Touch events on the canvas are translated to synthetic `MouseEvent` objects and dispatched back onto the canvas, reusing all existing mouse-event handlers. Two-finger pan/zoom is handled directly (updating `vpX`/`vpY`/`vpScale` without dispatching mouse events). Long-press dispatches a `contextmenu` event.

## Why

The entire interaction model — drag modes, wire drawing, selection, resize handles — is built on mousedown/mousemove/mouseup. Duplicating that logic for touch would double the surface area for bugs. Dispatching synthetic MouseEvents lets touch piggyback on already-tested code paths with minimal new code.

## Alternatives rejected

- **Pointer Events API**: Unifies mouse and touch but would require refactoring all existing `mousedown`/`mousemove`/`mouseup` listeners. Too large a change for the benefit.
- **Separate touch code paths**: Would require maintaining two parallel implementations of drag, wire-draw, resize, etc.

## Constraints

- `touch-action: none` must be set on `#canvas` so the browser does not intercept touch events for native scrolling before they reach the canvas handlers.
- Library drag-and-drop uses HTML5 drag events which do not fire on mobile; a separate touch handler on `.lib-item` elements handles placement by checking whether the finger lifts over the canvas rect.
- Long-press timer (600 ms) is cancelled if the finger moves more than 10 px, so normal drag still works.
