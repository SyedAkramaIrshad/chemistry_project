# ChemLab Studio

**A visual chemistry playground where learners build molecules by hand, test bonds, and learn from every accepted or rejected move.**

![ChemLab Studio molecular playground](docs/preview-desktop.png)

ChemLab Studio turns molecular structure into a direct-manipulation learning experience. Drag atoms onto the construction table, connect visible bonding sites, break or rebuild bonds, and inspect how the structure changes.

The central interaction rule is simple:

> Explain, permit, or reject the learner's action—but never silently repair their structure.

## Start with the bond-rewriting challenge

The guided **H₂O + N** challenge demonstrates the full learning loop:

1. Load water and a separate nitrogen atom.
2. Attempt an N–O bond while both O–H bonds remain intact.
3. Read why the attempted bond is rejected while the molecular graph stays unchanged.
4. Select and break one O–H bond; both atoms remain in the workspace.
5. Reconnect oxygen to nitrogen manually and inspect the resulting open structure.

An allowed graph edit is not automatically a stable molecule or evidence that a real reaction will occur. ChemLab Studio keeps that distinction visible.

## What learners can do

- Drag, place, move, select, and remove atoms.
- Explore a glossy 3D workbench with visible element symbols, atomic numbers, and formal charges.
- Create single, double, triple, and supported ionic interactions.
- Select and break bonds without deleting either atom.
- Watch bonds grow or retract, with brief visual separation when a break disconnects fragments.
- Reconnect atoms using a learner-selected bond mode.
- See available bonding sites and simplified valence electrons.
- Inspect formula, molar mass, charge, connectivity, and structure state live.
- Receive a specific chemical explanation when an attempted edit is rejected.
- Keep the attempted structure unchanged when an action is not permitted.
- Load starting structures, save structures in the browser, and export MOL files.

### Playing in 3D

Drag an atom to move it. Select an atom to see its name, atomic mass, neutral-atom electron configuration (H–Kr reference set), and current Lewis-state properties. Use its **+** socket or **Start bond** in the inspector, then select a target atom. Select a bond and choose **Break bond**, or press Delete. Every attempted connection is checked by the existing chemistry engine.

Choose **Rotate** to turn the view, scroll over the stage to zoom, and use **Reset view** to fit the structure. These camera actions do not change molecular coordinates. Keyboard users can Tab to atoms and bonds, press Enter to select, **B** on an atom to begin a connection, and use arrow keys to move an atom (Shift moves farther). Undo restores the previous graph edit.

The **2D view** remains fully editable and is used automatically if WebGL cannot start or its context is lost. Motion respects the system's reduced-motion preference. The 3D drawing and bond animations are schematic feedback, not optimized molecular geometry or a molecular dynamics simulation.

## Why it is different

Many chemistry tools jump directly to a corrected answer. ChemLab Studio leaves the learner in control:

- **No automatic repair:** atoms and bonds change only through an explicit learner action.
- **Visible consequences:** breaking a bond exposes the new open sites instead of hiding the intermediate state.
- **Specific feedback:** rejected attempts name the rule that blocked the requested edit.
- **Honest uncertainty:** unsupported chemistry is labelled rather than guessed.
- **One workspace at a time:** the playground is the primary experience; specialist labs remain available through navigation.

## Run locally

Requirements:

- Node.js `^20.19.0` or `>=22.12.0`
- npm

```bash
git clone https://github.com/SyedAkramaIrshad/chemistry_project.git
cd chemistry_project
npm install
npm run dev
```

Open the local URL printed by Vite. The molecular playground route is:

```text
/#laboratory
```

Create a production build with:

```bash
npm run build
```

Run the focused browser verification against the local development server:

```bash
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 5173
# In another terminal:
npm run verify:playground
```

This checks atom properties, conservation during bond edits, blocked connections, exact undo, bond-order changes, dragging, camera isolation, responsive layouts, and the 2D fallback. It writes screenshots to `test-results/`. The Molecular playground GitHub Actions workflow runs the same checks on pull requests.

## Other learning workspaces

The navigation also exposes focused workspaces for atomic structure, molecular geometry, molecular orbitals, stoichiometry, equilibrium, spectroscopy, thermochemistry, electrochemistry, and other university-chemistry topics.

These modules are secondary to the molecular playground and load one at a time. The curriculum atlas explains what is interactive now, what is only a concept boundary, and what needs a different scientific engine.

## Project map

```text
src/
├── components/             React interfaces and learning workspaces
├── chemistry/              Deterministic chemistry models and controllers
├── data/                   Declared scenarios and scientific source records
└── styles/                 Shared and workspace-specific styling
docs/                       Progress notes, previews, and detailed design records
scripts/                    Module-specific verification scripts
```

Key playground files:

- [`src/components/LabWorkspace.jsx`](src/components/LabWorkspace.jsx) — molecular construction interface
- [`src/components/ExperimentGuide.jsx`](src/components/ExperimentGuide.jsx) — H₂O + N guided challenge
- [`src/chemistry/controller.js`](src/chemistry/controller.js) — graph edits and rejection behavior
- [`src/graphics/MoleculeScene.js`](src/graphics/MoleculeScene.js) — disposable 3D presentation and accessible scene controls
- [`src/graphics/sceneMath.js`](src/graphics/sceneMath.js) — camera bounds and visual fragment feedback
- [`src/styles/molecular-playground.css`](src/styles/molecular-playground.css) — playground presentation
- [`src/styles/molecular-scene.css`](src/styles/molecular-scene.css) — projected atom labels and scene controls

## Scientific boundary

ChemLab Studio is an educational, rule-based workbench. Its verdicts describe the implemented model, not all of chemistry.

It does not:

- predict whether an arbitrary real reaction will occur;
- infer reaction conditions, mechanisms, kinetics, yield, or safety;
- replace experimental evidence, laboratory supervision, or chemical-safety guidance;
- claim that every chemically relevant exception is implemented.

Open, radical, incomplete, disconnected, and unsupported states remain editable so learners can inspect them.

## Documentation

- [Current progress](docs/CURRENT_PROGRESS.md)
- [Scientific data and attribution](THIRD_PARTY_DATA.md)
- [Contributing](CONTRIBUTING.md)

## License

Released under the [MIT License](LICENSE).
