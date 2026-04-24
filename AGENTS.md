# Logic Lab - Agent Guide

This document provides guidance for AI agents working on the Logic Lab project. Logic Lab is a browser-based logic circuit editor that runs entirely from static files with no build step.

## Quick Start

```bash
# Serve the project locally
python3 server.py
# Or open index.html directly in a browser
```

## Project Overview

Logic Lab is a modular circuit simulator with:
- **Core engine** (`core/`): Simulation, rendering, UI, state management
- **Node types** (`nodes/`): Self-contained, self-registering circuit elements
- **Lessons** (`lessons/`): Interactive tutorials with verification
- **Documentation** (`docs/`): Architecture Decision Records (ADRs)

## Key Concepts for Agents

### 1. Self-Registration Pattern
- Node types register themselves via `registerNode(descriptor)` in `nodes/node-*.js`
- Lessons register via `registerLesson(descriptor)` in `lessons/lesson-*.js`
- No central registry to update when adding new components

### 2. No Build System
- No Webpack, Rollup, or bundler
- Scripts loaded in specific order in `index.html`
- Any file can be removed from `index.html` without breaking the engine

### 3. Descriptor-Based Architecture
Nodes define behavior through descriptor hooks:
```js
registerNode({
  id: 'MY_NODE',
  name: 'My Node',
  color: '#aabbcc',
  flags: { isIO: true, ioDir: 'in' },
  ports: [{ id:'a', dir:'in', bits:1 }, { id:'out', dir:'out', bits:1 }],
  logic(i) { return { out: i.a }; },
  demo() { /* create demo circuit */ }
});
```

## Common Tasks for Agents

### Adding a New Node Type
1. Create `nodes/node-MYNODE.js` with `registerNode()` call
2. Add `<script src="nodes/node-MYNODE.js"></script>` to `index.html` before `core/ll-state.js`
3. **No other files need modification**

### Adding a New Lesson
1. Create `lessons/lesson-NAME.js` with `registerLesson()` call
2. Add `<script src="lessons/lesson-NAME.js"></script>` to `index.html` after `core/ll-lessons.js`

### Modifying Core Engine
Core files in `core/` directory:
- `ll-nodes.js`: Node registry and hook dispatchers
- `ll-state.js`: Global state, circuits, block definitions
- `ll-simulate.js`: Circuit simulation
- `ll-render.js`: Canvas rendering
- `ll-events.js`: Mouse/touch event handling
- `ll-canvas.js`: Viewport and selection state
- `ll-geometry.js`: Node and port positioning
- `ll-color.js`: Wire color tracing
- `ll-blocks.js`: Composite blocks and context menu
- `ll-nav.js`: Circuit navigation and tabs
- `ll-props.js`: Properties panel
- `ll-lessons.js`: Lesson system
- `ll-core.js`: Save/load, modals, initialization
- `ll-resize.js`: Resize handles

## Development Guidelines

### File Structure Rules
```
├── index.html          # HTML shell with ordered script tags
├── nodes/              # One file per node type
│   ├── node-AND.js
│   ├── node-OR.js
│   └── node-MYNODE.js  # New nodes go here
├── core/               # Engine files (no node-type knowledge)
│   ├── ll-nodes.js     # Must be loaded first
│   └── ll-core.js      # Loaded last, calls init()
├── lessons/            # Interactive tutorials
│   └── lesson-NAME.js
└── docs/               # Architecture Decision Records
    └── adr-*.md
```

### Script Load Order (Critical!)
Scripts must load in this order in `index.html`:
1. `core/ll-nodes.js` (registry must be first)
2. `nodes/node-*.js` (descriptors register themselves)
3. `core/ll-state.js` (engine starts here)
4. Other core files in dependency order
5. `core/ll-core.js` (calls `init()` at end)

### State Management
- `circuits`: Live circuit state with nodes and wires
- `blockDefs`: Node type registry
- `selNodeId` / `selNodeIds`: Selection state
- `vpX` / `vpY` / `vpScale`: Viewport state

### Simulation Rules
- `simulate(cid, quiet=false)`: Runs circuit propagation
- Feedback loops: Output ports retain previous values as seeds
- Null values: Represent floating/high-Z signals
- Iteration limit: 256 cycles to prevent infinite loops

## Testing & Verification

### Running Tests
- No formal test suite - manual testing in browser
- Use demo circuits defined in node `demo()` functions
- Lesson test steps verify truth tables

### Common Pitfalls
1. **Missing script order**: Nodes must load before `ll-state.js`
2. **Restore safety**: `initNode()` not called on restore - use fallback defaults
3. **Color cycle guards**: Prevent infinite recursion in feedback circuits
4. **Timer management**: Each node manages its own timers via hooks

## Documentation Standards

### When to Write ADRs
Create `docs/adr-NNN-slug.md` for:
- Non-obvious design decisions
- Trade-offs between reasonable alternatives
- Workarounds for engine constraints
- Decisions future contributors might question

### ADR Format
```markdown
# ADR NNN: Short descriptive title

Date: YYYY-MM-DD

## Decision
One-line description of the decision.

## Why
Context and rationale.

## Alternatives Considered
1. Alternative A - why rejected
2. Alternative B - why rejected

## Constraints
Technical constraints that influenced the decision.
```

## Agent-Specific Notes

### For AI Assistants (Like Me)
- Always check script load order when adding files
- Follow existing patterns in similar nodes/lessons
- Use descriptor hooks instead of modifying core logic
- Preserve the "no build step" philosophy
- Test changes by opening `index.html` in browser
- Update relevant ADRs when making architectural changes

### Working with Existing Code
- **Nodes**: Copy patterns from existing `node-*.js` files
- **Lessons**: Follow `lesson-*.js` structure
- **Core**: Changes require understanding of hook dispatchers
- **UI**: Canvas-based rendering - no DOM manipulation for circuit elements

## Quick Reference

### Key Functions
- `addNode(cid, defId, x, y, label)`: Add node to circuit
- `addWire(cid, fromNode, fromPort, toNode, toPort)`: Connect nodes
- `simulate(cid, quiet)`: Run circuit simulation
- `render()`: Redraw canvas
- `makeCircuit(id, name)`: Create new circuit

### Important Constants
- `PORT_R = 5`: Port dot radius
- `PORT_HIT = 11`: Port click hit radius  
- `NLH = 22`: Node label header height
- `NPS = 24`: Port spacing
- `STUB_LEN = 18`: 1-bit gate port stub length

### Descriptor Hooks (Most Common)
- `logic(inp, node)`: Simulation logic
- `draw(g, node, def, isSel, isHov)`: Custom rendering
- `getPropsHTML(node, def, bits)`: Properties panel
- `demo()`: Demo circuit builder
- `onAdded(node, cid)` / `onRemoved(node, cid)`: Lifecycle
- `syncTimers()`: Timer management

## Getting Help

1. **Read SYSTEM.md**: Comprehensive system documentation (784 lines)
2. **Check ADRs**: Architecture decisions in `docs/adr-*.md`
3. **Examine examples**: Look at existing nodes and lessons
4. **Test in browser**: Open `index.html` directly

Remember: This is a **static file project** - no build step means changes take effect immediately on refresh.