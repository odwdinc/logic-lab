# Logic Lab

A browser-based logic circuit editor. No installation, no build step — open `index.html` and start building.

![Logic Lab](https://img.shields.io/badge/runs%20in-browser-4fc3f7?style=flat-square)
![License: CC BY-NC 4.0](https://img.shields.io/badge/license-CC%20BY--NC%204.0-lightgrey?style=flat-square)

---

## What it does

Logic Lab lets you design and simulate digital logic circuits in real time:

- **Place gates** — AND, OR, NAND, NOR, XOR, NOT, tri-state buffer
- **Wire them up** — drag from any output port to any input port; wires route themselves
- **See it live** — the circuit simulates on every change; signal values update instantly
- **Multi-bit buses** — scale any I/O node from 1 to 8 bits; ribbon wires show each lane in its own color
- **Clocks** — configurable square-wave oscillators (0.001–50 Hz) drive sequential logic
- **7-segment displays** — visualise BCD values with up to 3 digits, signed or unsigned
- **RAM** — 256×16 memory with an interactive table; read and write cells directly
- **Logic analyser** — capture up to 1024 samples across 8 channels, triggered or free-running; export as CSV
- **Custom blocks** — select any sub-circuit, save it as a reusable block, and drag instances from the library
- **Multi-select** — rubber-band select a group of nodes and move them together
- **Autosave** — your work is saved to browser storage automatically and restored on next open

---

## Why it's useful

Most logic simulators require installation, a specific OS, or a paid licence. Logic Lab runs entirely from a folder of static files — no server, no framework, no dependencies. That makes it useful when:

- **Teaching** — share a single `index.html` with students; they open it in any browser and start experimenting immediately
- **Prototyping** — quickly sketch a latch, counter, or ALU slice to verify logic before committing it to HDL or a schematic tool
- **Exploring** — the built-in demos (gates, SR latch, buses, 7-seg display, logic analyser, RAM) show real circuits you can poke and modify straight away
- **Embedding** — because it's pure HTML + JS with no build pipeline, it can be dropped into any web page or documentation site

---

## Getting started

1. Clone or download the repository
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari)
3. The demo project loads automatically — click any input node to toggle its value

### Basic controls

| Action | How |
|---|---|
| Place a node | Drag from the left-hand library onto the canvas |
| Wire two ports | Drag from an output dot to an input dot (or reverse) |
| Toggle an input bit | Click directly on the bit cell inside an INPUT node |
| Move a node | Click and drag it |
| Select multiple nodes | Drag a box on empty canvas, or Shift+click individual nodes |
| Move a selection | Click-drag any node in the selection |
| Delete | Select node(s) then press Delete or Backspace |
| Pan | Middle-click drag, or Alt+drag |
| Zoom | Scroll wheel |
| Enter a custom block | Double-click it |
| Save | Ctrl/Cmd+S, or autosaved every 1.5 s |

---

## Project structure

```
index.html        — the whole app shell
nodes/            — one self-contained file per node type
core/             — engine files (ll-nodes.js, ll-state.js, ll-render.js, …)
...               — see CLAUDE.md for the full breakdown
```

Everything a node type needs — logic, drawing, properties panel, resize behaviour, demo circuit — lives in its own file under `nodes/`. Removing a node file from `index.html` disables that node type without affecting anything else.

---

## Adding a new node type

Create `nodes/node-MYNODE.js`, call `registerNode(...)`, add a `<script>` tag to `index.html`. No other files need to change. See [CLAUDE.md](CLAUDE.md) for the full descriptor API and examples.

---

## Credits & inspiration

Logic Lab was directly inspired by **Sebastian Lague's [Digital Logic Sim](https://github.com/SebLague/Digital-Logic-Sim)** — a beautifully made logic simulator built in Unity. The goal here was to take that same spirit and bring it to the browser: cross-platform, zero-install, and easy to extend with custom node types by dropping in a single file.

---

## License

[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE)

Free to use, share, and adapt for non-commercial purposes. Credit required. You may not sell this software or use it as part of a commercial product or service.
