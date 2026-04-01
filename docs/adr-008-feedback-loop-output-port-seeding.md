---
date: 2026-01-01
title: simulate() seeds feedback loops by preserving output port values between iterations
status: accepted
---

## Decision

At the start of each `simulate()` call, **input** port values are reset to `null`, but **output** port values are left at their previous values. The iterative propagation loop (up to 256 passes) then uses those stale output values as the initial seed for any feedback paths.

## Why

Logic circuits with feedback (SR latches, D latches, flip-flops) cannot be evaluated in a single topological pass — the output of a gate feeds back into its own input, creating a cycle with no defined evaluation order. By seeding output ports with their last known values, the first iteration of the loop gets a plausible starting state. Subsequent iterations converge to the stable output (Q=1/Q̄=0 or vice versa) based on the current inputs. Without this seeding, every simulate() call would start from all-null and the latch would always resolve to an undefined/oscillating state regardless of what it had been holding.

## Alternatives rejected

- **Topological sort with cycle detection**: Could evaluate acyclic parts optimally and handle cycles separately. Significantly more complex to implement; the iterative fixed-point approach achieves the same result with far simpler code.
- **Treating feedback as a special case**: Marking feedback wires explicitly and handling them differently would require user annotation or static analysis. The current approach requires no special knowledge of which circuits contain feedback.

## Constraints

- The iteration limit is 256. Circuits that oscillate (e.g. a NOT gate feeding itself) will not converge; they stop at 256 iterations in whatever state they reached. This is acceptable for a teaching tool.
- `simulateCompositeInline` uses the same seeding principle: gate `portValues` inside the block's internal circuit are preserved between calls (via `inst._blockState`) so latches inside custom blocks also retain their state.
