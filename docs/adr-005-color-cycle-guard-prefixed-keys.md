---
date: 2026-04-01
title: Separate key prefixes for portLaneColors and gateOutputColor cycle guards
status: accepted
---

## Decision

`portLaneColors` uses the prefix `plc:` for its `_colorVisited` keys (`plc:cid|nodeId|portId`). `gateOutputColor` uses unprefixed keys (`cid|nodeId|portId`). Keys are deleted before returning from `portLaneColors` so the guard only blocks re-entry during active recursion, not later independent queries.

## Why

Both functions originally shared the same key format. When `portLaneColors` was given a cycle guard (to fix infinite recursion through D-Latch feedback loops), it would add `cid|nodeId|portId` for a gate's output port and then immediately call `gateOutputColor` with the same node/port — which would see its own key already present and return `null`. This caused gate output wires connected to OUTPUT nodes to show the wrong colour (no source colour → fallback red).

Deleting the key on return fixes the case where the same port is queried twice in one render frame (wire drawing + node drawing). The prefix fix ensures `portLaneColors` and `gateOutputColor` cannot block each other even when called in sequence on the same port.

## Alternatives rejected

- **Single guard in one function only**: Would leave the other unprotected against feedback loops.
- **Separate visited sets per function**: Equivalent to prefixed keys but costs more memory and two clear calls per render.

## Constraints

- `_colorVisited` is cleared at the start of every `render()` call; neither function needs to manage cleanup across frames.
