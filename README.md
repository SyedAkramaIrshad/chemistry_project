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
- Create single, double, triple, and supported ionic interactions.
- Select and break bonds without deleting either atom.
- Reconnect atoms using a learner-selected bond mode.
- See available bonding sites and simplified valence electrons.
- Inspect formula, molar mass, charge, connectivity, and structure state live.
- Receive a specific chemical explanation when an attempted edit is rejected.
- Keep the attempted structure unchanged when an action is not permitted.
- Load starting structures, save structures in the browser, and export MOL files.

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
- [`src/styles/molecular-playground.css`](src/styles/molecular-playground.css) — playground presentation

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
