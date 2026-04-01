---
date: 2026-04-01
title: Per-instance _blockState for composite block simulation
status: accepted
---

## Decision

Each placed instance of a custom block carries its own `_blockState` object that stores the internal gate `portValues` (and recursively the `_blockState` of any nested composite nodes). `simulateCompositeInline` loads this state into the shared internal circuit before propagation and saves it back afterwards.

## Why

All instances of the same custom block share one internal circuit object in `blockDefs`. Without per-instance state, running `simulateCompositeInline` for instance A would leave the shared circuit in A's state; instance B would then start from A's values rather than its own. This broke latching behaviour the moment two D_LATCH or REG_1BIT blocks were placed in the same circuit.

## Alternatives rejected

- **Clone the internal circuit per instance**: Would multiply memory usage and make `commitBlockUpdate` (which patches the shared circuit) much harder to propagate to all instances.
- **Snapshot-and-restore all gate nodes on every call**: The original approach. Worked for stateless combinational blocks but wiped latch state on every tick because it restored portValues to the pre-call snapshot.

## Constraints

- `_blockState` must be JSON-serialisable so it survives `projectSnapshot` / `restoreProject`.
- Nested composite blocks require recursive `{ pv, bs }` entries so inner latches (e.g. NAND gates inside D_LATCH inside REG_1BIT) are also isolated per outer instance.
- `JSON.parse(JSON.stringify(...))` is used for deep-copy on load/save of nested `bs` to prevent cross-instance aliasing.
