Logic Lab is a browser-based logic circuit editor. It runs entirely from static files — no build step, no server. Open `index.html` directly in a browser.

**For AI assistants**: See `AGENTS.md` for specific guidance on working with this codebase.

---

## File Structure

```
├── index.html          — HTML shell + CSS + ordered <script> tags
├── README.md           — Project overview and usage instructions
├── SYSTEM.md           — Comprehensive system documentation (this file)
├── AGENTS.md           — Guide for AI assistants working on the project
├── LICENSE             — MIT license
│
├── nodes/              — One file per node type, fully self-contained
│   ├── node-AND.js     — AND gate; demo() builds the gates demo circuit
│   ├── node-OR.js
│   ├── node-NAND.js
│   ├── node-NOR.js     — NOR gate; demo() builds the SR latch demo circuit
│   ├── node-XOR.js
│   ├── node-NOT.js
│   ├── node-TRIBUF.js
│   ├── node-IO-BUS.js  — INPUT, OUTPUT, BITS→BUS, BUS→BITS; drawIONode; demo()
│   ├── node-CLOCK.js   — CLK; _clockTimers; startClockTimer/stopClockTimer/syncClockTimers
│   ├── node-ROM.js     — ROM; fmtRomCell; buildRomTableHTML; refreshRomTable; demo()
│   ├── node-DISPLAY.js — 7-SEG; SEG_MAP; draw7Seg; demo()
│   ├── node-ANALYZER.js — ANALYZER; _analyzerTimers; syncAnalyzerTimers; drawAnalyzer; demo()
│   ├── node-IO-WEB.js — WEB_INPUT example; _webTimers; polls a URL and drives a bus output
│   └── node-BUSW.js   — BUS_WIRE; shared tri-state bus line; path helpers; ribbon drawing
│
├── core/               — Engine files (no node-type knowledge)
│   ├── ll-nodes.js     — Node registry: registerNode, runDemos, all descriptor hook dispatchers
│   ├── ll-state.js     — Global state, blockDefs, circuits, addNode, addWire, addDef
│   ├── ll-color.js     — Wire color tracing: gateOutputColor, portLaneColors, blendColors
│   ├── ll-simulate.js  — simulate(), simulateCompositeInline()
│   ├── ll-geometry.js  — nodeGeom(), portWorldPos(), ioNodeW/H, port constants
│   ├── ll-canvas.js    — Canvas element, viewport state, coordinate transforms, selection state
│   ├── ll-render.js    — render(), drawWire(), drawBusWire(), drawNode(), collectThumbnailNodes()
│   ├── ll-resize.js    — Resize handles, hitResizeHandle(), applyResize(), drawResizeHandles(), hitNode(), hitPort(), hitWire()
│   ├── ll-events.js    — Mouse + touch event handlers; single-finger drag, pinch-zoom, double-tap, long-press→context menu
│   ├── ll-blocks.js    — Context menu, library drag (mouse + touch), openSaveAsBlock(), rebuildLibrary()
│   ├── ll-nav.js       — Circuit tabs, enterBlock(), commitBlockUpdate(), clearLiveInputFeeds()
│   ├── ll-props.js     — Properties panel HTML, patchPropPanelLive(), refreshRamTable()
│   └── ll-core.js      — Save/load, keyboard, modal, toast, loadDemo(), init(), autosave()
│
├── lessons/            — Interactive tutorial lessons
│   ├── lesson-AND.js
│   ├── lesson-NOT.js
│   ├── lesson-NAND.js
│   ├── lesson-OR.js
│   ├── lesson-XOR.js
│   ├── lesson-BINARY.js
│   ├── lesson-HALF-ADDER.js
│   ├── lesson-FULL-ADDER.js
│   ├── lesson-RIPPLE-ADDER.js
│   ├── lesson-SR-LATCH.js
│   ├── lesson-NOR.js
│   ├── lesson-D-LATCH.js
│   ├── lesson-NAND-D-LATCH.js
│   ├── lesson-ASYNC-REG.js
│   ├── lesson-D-FLIP-FLOP.js
│   ├── lesson-1BIT-REG.js
│   └── lesson-4BIT-REG.js
│
└── docs/               — Architecture Decision Records (ADRs)
    ├── adr-001-bus-wire-node.md
    ├── adr-002-composite-block-per-instance-state.md
    ├── adr-003-touch-support-synthetic-mouse-events.md
    ├── adr-004-lesson-always-rebuild-on-navigate.md
    ├── adr-005-color-cycle-guard-prefixed-keys.md
    ├── adr-006-static-files-no-build.md
    ├── adr-007-node-self-registration-pattern.md
    ├── adr-008-feedback-loop-output-port-seeding.md
    ├── adr-009-lesson-nav-monkey-patch.md
    ├── adr-010-simulate-quiet-flag.md
    └── adr-011-allcircuits-includes-block-internals.md
```

### Script load order in index.html

```
core/ll-nodes.js     ← registry must be first
nodes/node-*.js      ← descriptors register themselves (and their demo() functions)
core/ll-state.js     ← engine starts here
core/ll-color.js
core/ll-simulate.js
core/ll-geometry.js
core/ll-canvas.js
core/ll-render.js
core/ll-resize.js
core/ll-events.js
core/ll-blocks.js
core/ll-nav.js
core/ll-props.js
core/ll-core.js      ← calls init() at end
```

Any node file can be commented out of `index.html` without breaking the engine — all cross-node dependencies go through descriptor hooks or `typeof` guards.

---

## Core Data Model

### `blockDefs` — node type registry
```js
{
  id:        'AND',
  name:      'AND',
  color:     '#4fc3f7',
  isBuiltin: true,
  // flags spread from descriptor (data about what the node IS)
  isIO, ioDir, ioBits,      // IO nodes: direction and default bit width
  isClock,                   // clock node (used by syncClockTimers scan)
  isDisplay,                 // display node
  isAnalyzer,                // analyzer node
  isWebInput,                // example: web-polling input node
  passthroughColor,          // color traces through first input (e.g. NOT, CLOCK)
  excludeFromSnapshot,       // skip this node in simulateCompositeInline snapshots
  // ports (static list, may be overridden by descriptor getPorts)
  ports: [{ id, name, dir:'in'|'out', bits }],
  // logic function (set from descriptor or simulateCompositeInline for custom blocks)
  logic(inp, node) → { portId: value, ... }
}
```

### `circuits` — live circuit state
```js
{
  'main': {
    id: 'main',
    name: 'My Circuit',
    nodes: {
      'n1': {
        id, defId, x, y, label,
        portValues: { portId: number|null },
        _value,      // INPUT node's user-set value
        _bits,       // bus width (1–8)
        _dispFmt,    // 'dec'|'hex'|'bin'
        wireColor,   // INPUT nodes only
        // node-specific private state prefixed with _
        _hz, _phase,            // CLOCK
        _laState, _laRec, ...   // ANALYZER
        _rom, _romFmt,          // ROM
        _dispVal, _dispNeg, ... // DISPLAY
      }
    },
    wires: {
      'w1': { id, fromNode, fromPort, toNode, toPort }
    }
  }
}
```

### Custom block defs
Custom blocks created by the user are stored in `blockDefs` with `isBuiltin: false`. They have a `circuit` property pointing to their internal circuit. They survive `loadDemo()` and are included in autosave via `projectSnapshot()`.

---

## Node Registry System (`ll-nodes.js`)

Every built-in node calls `registerNode(descriptor)` from its own file. The engine queries descriptors via hook dispatcher functions — it never checks node type by ID or flag directly.

### Descriptor shape
```js
registerNode({
  id:    'MY_NODE',
  name:  'My Node',
  color: '#aabbcc',

  // Flags — spread into blockDef; use for engine-generic behaviour switches
  flags: {
    isIO: true, ioDir: 'in', ioBits: 1,  // IO direction and default width
    isClock: true,                         // scanned by syncClockTimers
    passthroughColor: true,                // color traces through first input only
    excludeFromSnapshot: true,             // skip in simulateCompositeInline
    // Any custom flag is fine — flags are just data
  },

  // Default bit width when node is first placed
  defaultBits: 4,

  // Static port list (used if getPorts not defined)
  // noStub:true suppresses the STUB_LEN offset on 1-bit ports (used by BUS_WIRE taps)
  ports: [{ id, name, dir:'in'|'out', bits, noStub }],

  // Dynamic port list (overrides static ports)
  getPorts(node) → [{ id, name, dir, bits }],

  // Called once when a node instance is created (addNode only — NOT on restore)
  initNode(node, opts) { node._myState = opts.myProp ?? 'default'; },

  // Called after node is inserted into the circuit (start timers, sync state)
  onAdded(node, cid) { },

  // Called before node is deleted from the circuit (stop timers, cleanup)
  onRemoved(node, cid) { },

  // Called by syncTimers() after project restore/init — start or restart timers
  syncTimers() { mySync(); },

  // Simulation logic — pure function, return changed output ports
  logic(inp, node) → { outPortId: value },

  // Geometry override — return full geometry object or null to use default
  getGeom(node, def) → { x, y, w, h, ports: { portId: {x,y,bits,dir,name} } },

  // Custom draw — called by drawDescNode(), must draw the entire node
  draw(g, node, def, isSel, isHov) { /* use ctx directly */ },

  // Body-only draw hook for gate-shaped nodes (draws inside the standard gate body)
  drawBody(g, node, def) { /* called after gate body is drawn */ },

  // Wire color override — return a color string or null
  // Called by gateOutputColor() before default blend logic
  getOutputColor(cid, node, outPortId, wireSourceColors, portLaneColors) → string|null,

  // Custom resize logic — mutates node x/y/_w/_h
  // Returning from this hook skips the default resize math
  applyResize(node, handleId, snap, dx, dy) { },

  // Opt this node type into block thumbnail rendering
  drawThumbnail(g, node, def) { /* draw mini version inside composite block body */ },

  // Props panel HTML string
  getPropsHTML(node, def, effectiveBits) → htmlString,

  // Props panel event binding
  bindProps(node, def, cid) { document.getElementById('...').addEventListener(...); },

  // Live patch during timer ticks (update read-only displays without rebuilding panel)
  patchLive(node, def) { document.getElementById('...').textContent = ...; },

  // Hover hit-test — return true if (wx,wy) is over a clickable cell of this node
  // Used by descHitCell() to set pointer cursor on mousemove
  hitCell(wx, wy, node) → boolean,

  // Click handler for cell interaction — return true if the click was consumed
  // Used by descClickCell() on mousedown; replaces hardcoded bit-toggle logic
  clickCell(node, wx, wy, cid) → boolean,

  // Custom node hit-test — return true/false, or null to fall back to bbox
  // false = inside bbox but not on the shape (keeps scanning other nodes)
  hitTest(wx, wy, node) → boolean|null,

  // Dynamic wire-drop port resolution — lets nodes create ports on the fly when a wire is dropped.
  // forDrop=false = hover preview only (return a preview port without mutating state)
  // forDrop=true  = wire was actually released here (create the tap and return it)
  // Only called during an active wire drag (wireStart is non-null).
  // Returns {node, portId, pp} or null.
  resolveWireDrop(wx, wy, node, cid, forDrop) → {node, portId, pp}|null,

  // Waypoint handle hit-test — return a resize-handle-like object when near a draggable waypoint,
  // or null. Object must have { id, cur, _wpIdx } so applyResize can identify it.
  // Called by descHitWaypoint() before the standard RESIZE_HANDLES loop.
  hitWaypoint(wx, wy, node) → {id, cur, _wpIdx}|null,

  // Double-click handler — return true to consume the event (skip block-enter / rename logic)
  onDblClick(wx, wy, node, cid) → boolean,

  // Demo circuit builder — called by runDemos() during loadDemo()
  demo() { makeCircuit(...); addNode(...); addWire(...); },
});
```

### Engine hook dispatchers (`ll-nodes.js`)
| Function | Called from | Purpose |
|---|---|---|
| `runDemos()` | `loadDemo()` | Calls `desc.demo()` for every descriptor that has one, in load order |
| `syncTimers()` | `restoreProject()`, `openSaveAsBlock()`, `commitBlockUpdate()` | Calls `desc.syncTimers()` on all descriptors — each node manages its own timers |
| `initRegisteredNodes()` | `initBuiltins()` | Calls `addDef()` for every registered descriptor |
| `nodeInitHook(node, def, opts)` | `addNode()` | Calls `desc.initNode` |
| `nodeAddedHook(node, def, cid)` | `addNode()` | Calls `desc.onAdded` |
| `nodeRemovedHook(node, def, cid)` | `removeNode()` | Calls `desc.onRemoved` |
| `getDescPorts(node, def)` | `getNodePorts()` | Returns `desc.getPorts()` or null |
| `getDescGeom(node, def)` | `nodeGeom()` | Returns `desc.getGeom()` or null |
| `drawDescNode(g, node, def, isSel, isHov)` | `drawNode()` | Calls `desc.draw()`, returns true if handled |
| `descApplyResize(node, def, id, snap, dx, dy)` | `applyResize()` | Calls `desc.applyResize()`, returns true if handled |
| `descHasThumbnail(def)` | `collectThumbnailNodes()` | True if descriptor has `drawThumbnail` |
| `descDrawThumbnail(g, node, def)` | `drawNode()` | Calls `desc.drawThumbnail()` |
| `descHitCell(wx, wy)` | `mousemove` | Returns true if cursor is over any node's clickable cell |
| `descClickCell(node, wx, wy, cid)` | `mousedown` | Calls `desc.clickCell()`, returns true if click was consumed |
| `getDescPropsHTML(node, def, bits)` | `updatePropPanel()` | Returns `desc.getPropsHTML()` |
| `bindDescProps(node, def, cid)` | `updatePropPanel()` | Calls `desc.bindProps()` |
| `patchDescLive(node, def)` | `patchPropPanelLive()` | Calls `desc.patchLive()` |
| `descHitNode(wx, wy, node)` | `hitNode()` | Calls `desc.hitTest()`; false skips node even if inside bbox |
| `descResolveWireDrop(wx, wy, node, cid, forDrop)` | `hitPort()` | Calls `desc.resolveWireDrop()` after fixed-port scan |
| `descHitWaypoint(wx, wy, node)` | `hitResizeHandle()` | Calls `desc.hitWaypoint()` before standard handle loop |
| `descDblClick(wx, wy, node, cid)` | `dblclick` handler | Calls `desc.onDblClick()`; true consumes the event |

---

## Simulation

### `simulate(cid, quiet=false)`
1. Resets all **input** port values to `null` (output ports keep previous value for feedback seeding)
2. Iterates up to 256 times: drive IO inputs → propagate wires → evaluate gate logic
3. Stops when no values changed
4. `quiet=true` (timer ticks): calls `patchPropPanelLive()` only — never rebuilds props panel HTML
5. `quiet=false` (user actions): calls `updatePropPanelIfSafe()` + `autosaveDebounced()`

### `simulateCompositeInline(defId, inputMap, inst)`
Used when evaluating a custom block as a black box from outside. `inst` is the node instance calling in (passed from the `logic` closure).
- Loads this instance's saved gate state (`inst._blockState`) into the shared circuit so multiple instances of the same block don't contaminate each other
- Feeds `inputMap` into INPUT IO nodes
- Runs propagation (no global reset)
- Saves updated gate state back to `inst._blockState` (preserves latch/flip-flop state per instance)
- Reads OUTPUT IO node values
- Restores INPUT IO `_value` so their display is not stale

### Null / floating signal rules
- `null` = floating / high-Z
- Two-input gates: both null → null; one null → treat as 0
- NOT: null in → null out
- TRIBUF: EN=0 or EN=null → null out
- Feedback loops bootstrap from previous output values (SR latch etc.)

---

## Wire Colors & Bus Lanes

### Concepts
- Each INPUT node has a `wireColor` (auto-assigned from `IO_COLORS` palette via `nextIOColor()`)
- Multi-bit buses carry **lane colors** — one color per bit, MSB-first (lane 0 = MSB)
- Wire color traces **backwards** from a port to its source

### Key functions (`ll-color.js`)
| Function | Purpose |
|---|---|
| `portWireColor(cid, nodeId, portId)` | Single representative color for a port |
| `portLaneColors(cid, nodeId, portId)` | Per-lane color array for a bus port |
| `gateOutputColor(cid, node, def, outPortId)` | Traces color back through gate inputs |
| `wireSourceColors(cid, nodeId, portId)` | Colors of all wires feeding an input port |

### Color tracing rules
- **IO input nodes** — return their assigned `wireColor`
- **`passthroughColor: true`** (e.g. NOT, CLOCK) — return first input's color
- **Descriptor `getOutputColor` hook** — called before default blend; return `null` to fall through
- **Everything else** — blend all input colors

### BTB lane convention
- `b0` = LSB (bottom pin), `b(n-1)` = MSB (top pin)
- `portLaneColors` lane 0 = MSB, lane `bits-1` = LSB
- BITS_TO_BUS `bus` output: lane `i` = color of `b(bits-1-i)`
- BUS_TO_BITS `b(i)` output: carries lane `bits-1-i` from the bus

---

## Timer Management

Each node that owns timers manages them entirely within its own file using the `onAdded`, `onRemoved`, and `syncTimers` descriptor hooks. The engine has no timer-specific code.

### `syncTimers()` (ll-nodes.js)
Called by core after every project restore or structural change (save-as-block, commit-block-update). Iterates the descriptor registry and calls `desc.syncTimers()` on each descriptor that defines it.

### Pattern used by CLOCK, ANALYZER, WEB_INPUT
```js
// Module-level timer registry
const _myTimers = {};

function _startMyTimer(nodeId) { _myTimers[nodeId] = setInterval(...); }
function _stopMyTimer(nodeId)  { clearInterval(_myTimers[nodeId]); delete _myTimers[nodeId]; }
function syncMyTimers()        { /* scan allCircuits(), start/stop as needed */ }

registerNode({
  ...
  onAdded(node, cid)   { syncMyTimers(); },
  onRemoved(node, cid) { _stopMyTimer(node.id); },
  syncTimers()         { syncMyTimers(); },
});
```

Timer ticks call `simulate(cid, true)` (quiet) so the circuit updates without rebuilding the props panel every tick.

### `allCircuits()`
Returns all circuits including those embedded inside custom block defs. Used by timer sync to find timer-owning nodes everywhere, including inside custom blocks.

---

## IO & Bus Nodes (`node-IO-BUS.js`)

### INPUT / OUTPUT
- `getGeom` uses `ioNodeW(bits)` / `ioNodeH(bits)` — scales with bus width
- `getPorts` returns dynamic port with correct `bits` value (needed for ribbon wire rendering)
- `drawIONode(c, node, def, g, isSel, isHov)` — draws the bit grid cell display; shared by IO-like nodes
- INPUT implements `hitCell` and `clickCell` descriptor hooks for bit-toggle interaction

### BITS_TO_BUS / BUS_TO_BITS
- `getPorts` generates dynamic port list (MSB at top)
- `getGeom` via shared `_btbGeom(node, def)` helper
- `getOutputColor` on each descriptor handles color tracing through bus conversion
- Shared `_btbBindProps(n, cid)` handles the bus width change prop
- `defaultBits: 2` sets the initial bit width when placed

### Multi-bit OUTPUT lane color mapping
When a source bus has fewer lanes than the OUTPUT bit count, lane colors are mapped by bit position — lower bits get source lane colors, upper bits get null (no color). The mapping is:
```
laneIdx = srcBits - 1 - (bits - 1 - b)  // for grid cell b
```

---

## BUS_WIRE Node (`node-BUSW.js`)

A routable shared tri-state bus line. Unlike regular nodes it has no fixed body — it is a polyline of waypoints that any number of other nodes can tap into.

### Concepts
- **Waypoints** (`node._pts`) — array of `{x,y}` world coords. First point is always at `(node.x, node.y)`. Minimum 2 points.
- **Taps** (`node._taps`) — array of `{id, t, dir}`. `t` is a 0–1 fraction along the total path length. `dir:'in'` = writer (drives the bus); `dir:'out'` = reader (receives bus value).
- **Tri-state resolution** — exactly one writer tap may be active at a time. If two writer taps carry different values, `node._conflict = true` and all reader taps receive `null`.

### Path math helpers (module-level)
| Function | Purpose |
|---|---|
| `_bwSyncPts(node)` | Shifts all `_pts` by the delta between `node.x/y` and `_pts[0]` — called at the start of every operation to reconcile engine-driven node movement |
| `_bwPathInfo(pts)` | Returns `{segs, total}` — segment array with cumulative start distances, plus total path length |
| `_bwPtAtT(pts, info, t)` | World position at fraction `t` along the path |
| `_bwNearestT(pts, info, wx, wy)` | `{t, dist}` — nearest point on the path to `(wx,wy)` |
| `_bwOffsetPolyline(pts, off)` | Offset polyline for a lane — miter-join intersection at interior waypoints |

### Drawing helpers (module-level)
| Function | Purpose |
|---|---|
| `_bwDrawRibbonBackground(pts, bits)` | Jacket + body as a single continuous polyline (`lineJoin:'round'`) — no cap artifacts at waypoints |
| `_bwDrawLanes(pts, bits, val, srcColor, laneColors)` | Per-lane offset polylines as continuous strokes — connected at corners via miter math |

### Adding / removing taps
Wires connect to the bus via `resolveWireDrop`. When a wire drag hovers over the bus, a preview port `tap_preview` is returned without mutating state. On actual drop, a new tap is created with an auto-incremented `_tapNext` ID. Taps are removed by deleting the connected wire and calling "Clear all taps" in the props panel.

### Waypoint editing
- **Drag waypoint handle** (when selected) → `hitWaypoint` returns `{id:'wp_N', _wpIdx:N}`; `applyResize` moves `_pts[N]`
- **Double-click on waypoint** → removes it (minimum 2 points kept)
- **Double-click on path** → inserts a new waypoint at that position
- `resizeSnap._wpX/_wpY` stores the waypoint's world position at drag start so `applyResize` can apply the delta correctly

### Restore safety
`initNode` is not called on restore. Every function that reads `_pts` or `_taps` guards with:
```js
if (!node._pts?.length) node._pts = [{ x: node.x, y: node.y }, { x: node.x + 200, y: node.y }];
if (!node._taps)    node._taps    = [];
if (!node._tapNext) node._tapNext = 0;
```

---

## Mobile / Touch Support (`ll-events.js`, `ll-blocks.js`)

Touch events are translated to the existing mouse-event logic. The canvas has `touch-action: none` (CSS) so the browser never intercepts events for scrolling.

### Canvas gestures
| Gesture | Behaviour |
|---|---|
| 1-finger tap | Select node / start wire / deselect |
| 1-finger drag | Move node / drag wire / rubber-band select |
| 1-finger long-press (600 ms, < 10 px movement) | Opens context menu (delete, rename, etc.) |
| Double-tap | Double-click — enters block, renames IO, adds/removes bus waypoints |
| 2-finger drag | Pan viewport |
| 2-finger pinch / spread | Zoom — anchored to the initial pinch centre |

### Implementation (IIFE in `ll-events.js`)
- `touchstart` (1 finger) → `mousedown`; starts long-press timer
- `touchmove` (1 finger) → `mousemove`; cancels long-press if movement > threshold
- `touchend` (1 finger) → `mouseup`; double-tap detection compares time + position to previous tap
- `touchstart` (2 fingers) → dispatches `mouseleave` to cancel drag; records pinch state
- `touchmove` (2 fingers) → directly updates `vpScale`/`vpX`/`vpY` without dispatching mouse events
- `touchcancel` → dispatches `mouseleave` to reset all drag state
- Dropping from 2 → 1 finger ends pinch cleanly without starting a new single-touch drag

### Library touch-drag (IIFE in `ll-blocks.js`)
- `touchstart` on a `.lib-item` → records `defId`, shows a floating ghost label
- `touchmove` (document) → moves the ghost label with the finger
- `touchend` (document) → if finger lifted over the canvas rect, calls `addNode()` at that position; otherwise cancels

---

## Geometry

### Constants (`ll-geometry.js`)
```
PORT_R   = 5    port dot radius
PORT_HIT = 11   port click hit radius
NLH      = 22   node label header height
NPY      = 8    node body top padding
NPS      = 24   port spacing
NMW      = 76   min node width
IONG_SZ  = 12   IO bit cell size
IONG_GAP = 2    IO bit cell gap
STUB_LEN = 18   1-bit gate port stub length
```

### `nodeGeom(node)` flow
1. Call `getDescGeom(node, def)` — if descriptor returns geometry, use it
2. Fall through to default: compute from `def.ports`, `NLH`, `NPY`, `NPS`

### Port world position
`portWorldPos(node, portId)` adds STUB_LEN offset for 1-bit gate ports (not IO ports, not multi-bit, not `noStub:true`).

---

## Rendering

### `render()` — full frame
1. Clear canvas, draw grid
2. Draw all wires (`drawWire`)
3. Draw in-progress wire drag
4. Draw all nodes (`drawNode`)
5. Draw rubber-band selection box if `dragMode === 'select'`

### `drawNode(c, node)` flow
1. Call `drawDescNode()` — if descriptor handles it, return
2. Draw standard gate body (background, header, label)
3. Call `desc.drawBody()` if present (e.g. clock waveform)
4. If node is a composite block, call `collectThumbnailNodes()` and `descDrawThumbnail()` for each
5. Draw ports

A node is considered selected (`isSel = true`) if its ID is in `selNodeIds` or equals `selNodeId`.

### Wire rendering
- 1-bit wires: `wireCurve()` bezier, color = HIGH→srcColor, LOW→`#2a2020`, float→dashed
- Multi-bit wires: `drawBusWire()` — ribbon of parallel lanes, each lane colored independently

### Cycle guard for color tracing
`_colorVisited = new Set()` — module-level, cleared at the start of each `render()`. `gateOutputColor` adds `cid|nodeId|portId` before recursing to prevent infinite loops in feedback circuits.

---

## Selection & Multi-Select (`ll-canvas.js` / `ll-events.js`)

### Selection state
```js
selNodeId   = null       // single focused node (props panel + resize handles)
selNodeIds  = new Set()  // all selected node IDs
```
`selNodeId` is only set when exactly one node is selected. When `selNodeIds.size > 1`, `selNodeId` is null and resize handles are hidden.

### Drag modes
| `dragMode` | Meaning |
|---|---|
| `'node'` | Dragging a single node |
| `'nodes'` | Dragging the entire multi-selection |
| `'select'` | Drawing rubber-band selection box |
| `'wire'` | Drawing a new wire |
| `'resize'` | Resizing a single node |

### Rubber-band selection box
```js
selBoxStart = {x, y}   // world coords where drag started
selBoxEnd   = {x, y}   // world coords of current mouse position
```
On mouseup, any node whose bounding box overlaps the box is added to `selNodeIds`. A box smaller than 4×4 world px is treated as a deselect click.

### Multi-drag
```js
dragNodesSnap = { nodeId: {x, y}, ... }  // node positions at drag start
```
On mousemove, delta from drag origin is snapped to 10px grid and applied to all nodes in `selNodeIds`.

### Interaction rules
- **Click node** — select just that node, start single drag
- **Shift+click node** — toggle node in/out of `selNodeIds`
- **Click inside multi-selection** — drag the whole group
- **Drag on empty space** — draw rubber-band box; release selects enclosed nodes
- **Shift+drag on empty space** — add enclosed nodes to existing selection
- **Delete / Backspace** — remove all nodes in `selNodeIds`

---

## Save / Load

### Autosave
`autosaveDebounced()` — 1.5s debounce, calls `autosave()` which writes `projectSnapshot()` to `localStorage[LS_KEY]`.

### `projectSnapshot()`
```js
{
  v: 3,
  circuits,
  currentCircuitId, editStack,
  _nid, _wid, _did, _colorIdx,
  customDefs: Object.values(blockDefs).filter(d => !d.isBuiltin)
}
```
Functions are stripped (JSON.stringify replacer). Custom block `logic` functions are re-attached on restore via `simulateCompositeInline`.

### `restoreProject(d)`
1. Wipes `blockDefs`, calls `initBuiltins()`
2. Restores custom defs, re-attaches their logic functions
3. Replaces `circuits`
4. Rebuilds UI, simulates, calls `syncTimers()` to restart all node timers

---

## Modal (`ll-core.js`)

```js
openModal(title, desc, okFn, okLabel='OK')
```
Opens the shared modal dialog. Callers may set `document.getElementById('modal-body').innerHTML` **before** calling `openModal` to inject custom form content.

`_closeModal()` is called on OK, Cancel, and backdrop click. It hides the modal and **clears `modal-body`**, so the next caller always starts with a clean slate.

---

## Adding a New Node Type

1. Create `nodes/node-MYNODE.js`
2. Call `registerNode({ id, name, color, flags, ports, logic, ... })`
3. Add `<script src="nodes/node-MYNODE.js"></script>` to `index.html` before `core/ll-state.js`
4. The engine picks it up automatically — **no other files need to change**

To add a demo circuit, include `demo()` in the descriptor — called automatically by `loadDemo()`.

### Minimal example
```js
registerNode({
  id:    'BUFFER',
  name:  'BUF',
  color: '#4fc3f7',
  flags: {},
  ports: [
    { id:'a',   name:'',  dir:'in',  bits:1 },
    { id:'out', name:'',  dir:'out', bits:1 },
  ],
  logic(i){ return { out: i.a }; },

  demo() {
    makeCircuit('buf_demo', 'Buffer Demo');
    const i = addNode('buf_demo', 'INPUT',  60, 60, 'IN');
    const b = addNode('buf_demo', 'BUFFER', 200, 60, 'BUF');
    const o = addNode('buf_demo', 'OUTPUT', 340, 60, 'OUT');
    addWire('buf_demo', i.id, 'out', b.id, 'a');
    addWire('buf_demo', b.id, 'out', o.id, 'a');
  },
});
```

### Node with custom geometry + draw
```js
registerNode({
  id: 'MY_DISPLAY',
  ...
  getGeom(node, def){
    const w = 120, h = 60;
    return { x:node.x, y:node.y, w, h,
      ports: { a: { x:0, y:h/2, bits:1, dir:'in', name:'IN' } } };
  },
  draw(g, node, def, isSel, isHov){
    rr(g.x, g.y, g.w, g.h, 4);
    ctx.fillStyle = '#111'; ctx.fill();
    // ... custom drawing using ctx directly
    if(isSel) drawResizeHandles(g, def.color);
  },
  applyResize(node, handleId, snap, dx, dy){
    // custom resize constraints — mutate node directly
    const {nx, nw} = snap;
    let rw = nw;
    if(handleId.includes('e')) rw = Math.max(80, nw + dx);
    node.x = Math.round(nx/10)*10;
    node._w = Math.round(rw/10)*10;
  },
  drawThumbnail(g, node, def){
    // called when this node appears inside a composite block on the canvas
    ctx.fillStyle = '#333';
    ctx.fillRect(g.x, g.y, g.w, g.h);
  },
});
```

### Node with timers
```js
const _myTimers = {};

function _startMyTimer(nodeId, ms){ ... }
function _stopMyTimer(nodeId){ clearInterval(_myTimers[nodeId]); delete _myTimers[nodeId]; }
function syncMyTimers(){ /* scan allCircuits(), start/stop */ }

registerNode({
  id: 'MY_TIMER_NODE', ...
  onAdded(node, cid)   { syncMyTimers(); },
  onRemoved(node, cid) { _stopMyTimer(node.id); },
  syncTimers()         { syncMyTimers(); },
});
```

### Node with clickable cells
```js
registerNode({
  id: 'MY_GRID_NODE', ...
  // Hover: return true if (wx,wy) is inside a cell → sets pointer cursor
  hitCell(wx, wy, node) {
    const g = nodeGeom(node);
    // ... hit-test against cell rects
    return false;
  },
  // Click: handle the interaction, return true to consume the event
  clickCell(node, wx, wy, cid) {
    const g = nodeGeom(node);
    // ... toggle or act on the clicked cell
    // simulate(cid); return true;
    return false;
  },
});
```

---

## Lesson System (`core/ll-lessons.js`)

Lessons are self-contained JS files under `lessons/`. Each calls `registerLesson(desc)`. No core file changes are needed to add a lesson.

### Lesson descriptor
```js
registerLesson({
  id:       'AND_Gates',         // unique key, stored in localStorage on completion
  title:    'Lesson 1 · ...',    // shown in picker and panel header
  requires: [],                  // lesson IDs that must be done first (locks this lesson)

  steps: [
    // Concept / text step — just prose
    { title: 'Concept', text: '...' },

    // Build step — runs once when the step is first reached (skipped on revisit)
    {
      title: 'Build the Circuit',
      text:  '...',
      build(cid) {
        const gA = addNode(cid, 'INPUT', 60, 60, 'A');
        // ... addNode / addWire calls
      },
    },

    // Test step — shows a truth table; Next is blocked until Check passes
    {
      title: 'Verify the Truth Table',
      text:  '...',
      test: {
        inputs:  ['A', 'B'],   // INPUT node labels to drive
        outputs: ['OUT'],      // OUTPUT node labels to read
        rows: [
          { in: [0, 0], out: [0] },
          { in: [0, 1], out: [0] },
          { in: [1, 0], out: [0] },
          { in: [1, 1], out: [1] },
        ],
      },
    },
  ],
});
```

### Lesson flow
1. **Picker** (`openLessonPicker()`) — shows all lessons with ○ / ✓ / 🔒 status. Locked lessons are greyed out until their prerequisites are complete.
2. **Open** (`openLesson(id)`) — creates a fresh isolated circuit (`lesson_<id>`), switches to it, shows the floating panel.
3. **Steps** — Prev/Next navigate between steps. `build()` runs once the first time its step is reached (not re-run on revisit, not run on Prev).
4. **Test step** — "Check Truth Table" button sets each input combination, simulates, reads OUTPUT port values, and compares to expected. On full pass the lesson is marked done in localStorage and Next unlocks.
5. **Completion** — Pressing "Done" on the last step calls `_finishLesson()`, which marks the lesson complete in localStorage and auto-advances to the next unlocked lesson (closing the old lesson circuit tab). `_lessonDone` (Set) persisted under `ll_lessons_done` in localStorage.

### Lesson panel behaviour
- The panel is **hidden on page load** (`display:none`). It only appears when a lesson is active.
- The panel has a **collapse/expand toggle** (not a close button). Collapsing hides the step content but keeps the lesson active.
- **Tab switching**: switching to a non-lesson circuit hides the panel without clearing lesson state. Switching back to the lesson circuit restores it.
- **Closing the lesson tab**: calls `_closeLessonPanel()` — clears lesson state, hides panel. Does NOT auto-advance.
- **Page refresh restore**: `ll-lessons.js` uses a `setTimeout(..., 0)` defer at startup to check if `currentCircuitId` starts with `lesson_` and restores the panel if so.
- `switchToCircuit` and `closeCircuit` in `ll-nav.js` are monkey-patched at the bottom of `ll-lessons.js` to keep panel visibility in sync without modifying core nav files.

### Adding a new lesson
1. Create `lessons/lesson-MYNAME.js` with a `registerLesson({...})` call.
2. Add `<script src="lessons/lesson-MYNAME.js"></script>` to `index.html` after `core/ll-lessons.js`.
3. Nothing else changes.

---

## Block Editing

Custom blocks are created via "Save as Block" (right-click menu). Entering a block for editing sets:
- `_editingDefId` — the def being edited
- `_editingNodeId` — the canvas instance entered from (if via canvas double-click)
- `_editingParentCid` — parent circuit

`commitBlockUpdate()` in `ll-nav.js` finalizes changes: updates port list, reconnects wires in all instances, re-simulates everywhere.

`clearLiveInputFeeds()` resets INPUT IO nodes when exiting live preview mode, preventing stale values from being snapshotted.

---

## Key Invariants

- **One driver per input port** — `addWire()` removes any existing wire to the same `toNode`/`toPort` before adding
- **Feedback loops** — output ports retain their previous value between simulate iterations as the seed; iteration limit is 256
- **Custom block logic** — stored as `(inp,inst)=>simulateCompositeInline(defId,inp,inst)` closure, stripped from JSON on save, re-attached on restore; `inst` is the node instance so each placed copy maintains independent state in `inst._blockState`
- **`main` circuit** — always exists, created by `init()`, cannot be closed
- **Node IDs** — `n{N}`, wire IDs `w{N}`, def IDs `d{N}` from monotonic counters `_nid/_wid/_did`
- **`excludeFromSnapshot`** — IO, clock, analyzer, display nodes set this flag so `simulateCompositeInline` doesn't clobber their live state during inline evaluation
- **`initNode` is not called on restore** — any field that draw or logic reads must have a fallback (`?? default`) in case the node was restored from localStorage before the field existed
- **`noStub: true` port flag** — suppresses the STUB_LEN tip offset in both `portWorldPos` and `hitPort`; used by BUS_WIRE taps so wire endpoints land on the path rather than beside it
- **`resolveWireDrop` only fires during a wire drag** — implementations must guard with `if (!wireStart) return null` to avoid intercepting regular click/hover events
- **`resizeSnap` is passed whole to `descApplyResize`** — the full object (including `_wpX/_wpY` stored at drag start) is forwarded so descriptor resize handlers can apply deltas correctly
- **Node files are optional** — any `nodes/node-*.js` can be removed from `index.html` without crashing the engine; its features simply become unavailable

---

## Architecture Decision Records

Non-obvious design decisions are recorded in `docs/adr-NNN-slug.md`. Each file has a date, a one-line decision, a **Why** section, an **Alternatives rejected** section, and a **Constraints** section.

When making a decision that is not obvious from the code — a choice between two reasonable approaches, a workaround for an engine constraint, a deliberate trade-off — write an ADR. Future contributors (and future Claude sessions) should be able to read it and understand why the code is the way it is without having to reverse-engineer intent.

### Current ADRs

| # | Title |
|---|---|
| [001](docs/adr-001-bus-wire-node.md) | BUS_WIRE implemented as a pathline node, not a traditional node box |
| [002](docs/adr-002-composite-block-per-instance-state.md) | Per-instance `_blockState` for composite block simulation |
| [003](docs/adr-003-touch-support-synthetic-mouse-events.md) | Mobile touch support via synthetic MouseEvent dispatch |
| [004](docs/adr-004-lesson-always-rebuild-on-navigate.md) | Lesson build steps always clear and rebuild on navigation |
| [005](docs/adr-005-color-cycle-guard-prefixed-keys.md) | Separate key prefixes for `portLaneColors` and `gateOutputColor` cycle guards |
| [006](docs/adr-006-static-files-no-build.md) | No build step — runs directly from static files |
| [007](docs/adr-007-node-self-registration-pattern.md) | Node types self-register via `registerNode()`; engine never checks type by ID |
| [008](docs/adr-008-feedback-loop-output-port-seeding.md) | `simulate()` seeds feedback loops by preserving output port values between iterations |
| [009](docs/adr-009-lesson-nav-monkey-patch.md) | Lesson panel hooks into navigation via monkey-patching `switchToCircuit`/`closeCircuit` |
| [010](docs/adr-010-simulate-quiet-flag.md) | `simulate(quiet=true)` for timer ticks — patch live values without rebuilding the props panel |
| [011](docs/adr-011-allcircuits-includes-block-internals.md) | `allCircuits()` returns top-level circuits plus all custom block internal circuits |
