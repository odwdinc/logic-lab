---
date: 2026-04-01
title: BUS_WIRE implemented as a pathline node, not a traditional node box
status: accepted
---

## Decision

BUS_WIRE is implemented as a routable polyline with dynamic tap ports rather than a rectangular node with fixed input/output ports.

## Why

A traditional node box with fixed writers and readers would force the user to pre-declare how many connections they need and wire to named ports. A shared bus is conceptually a piece of wire, not a component — any node should be able to attach anywhere along it. The pathline model (waypoints + t-fraction taps) directly represents that mental model.

## Alternatives rejected

- **Fixed-port node**: Would require the user to know in advance how many writers/readers they need. Changing the count would break existing wires.
- **Invisible intermediary node**: Hiding a node behind wire visuals adds hidden state the user cannot see or inspect.

## Constraints

- The engine's `addWire` / port model expects ports to exist before wires are made. Solved via `resolveWireDrop` which creates tap ports on the fly during a wire drag.
- `initNode` is not called on restore, so all `_pts`/`_taps` reads include null-guards.
