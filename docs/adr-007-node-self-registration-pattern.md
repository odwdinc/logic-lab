---
date: 2026-01-01
title: Node types self-register via registerNode(); engine never checks type by ID
status: accepted
---

## Decision

Each node file calls `registerNode(descriptor)` at the top level. The engine never references node types by their string ID or checks flags directly. All node behaviour is accessed through dispatcher functions (`drawDescNode`, `descClickCell`, `descHitNode`, etc.) that look up the descriptor from `_nodeRegistry`.

## Why

This makes node files fully self-contained: adding a new node type means creating one file and adding one `<script>` tag — nothing else changes. It also means any node file can be removed without crashing the engine; the type simply becomes unavailable. The engine cannot develop hard dependencies on specific node IDs because it has no direct references to them.

## Alternatives rejected

- **Central switch/case on node type**: Common in smaller codebases. Would require modifying a central file every time a node is added or removed. Makes it impossible to disable a node type without editing engine code.
- **Subclassing / prototype hierarchy**: Would impose an OOP structure on what are essentially data descriptors. The plain-object descriptor with optional hooks is simpler and easier to read in isolation.

## Constraints

- Descriptor hooks are optional. The dispatcher checks for the hook's presence before calling it (`if (!desc?.draw) return false`), so nodes only implement what they need.
- Flags (`isIO`, `isClock`, `passthroughColor`, etc.) are spread into `blockDefs` at registration time via `addDef()`. Engine code reads flags from `blockDefs`, not directly from the descriptor, so the registry is the single source of truth at runtime.
