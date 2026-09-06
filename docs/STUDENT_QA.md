# Student playground quality checks

The playground is a teaching model for explicitly chosen atoms, bonds, and charges. A recognized structure is matched by connectivity, not by an atom count alone. Placing atoms in this editor does not simulate the laboratory synthesis of a substance. The 3D geometry and motion are schematic.

## What this reliability pass fixes

- Building controls wait until the editor has initialized and recovered the draft, preventing clicks from being lost during startup.
- Refresh recovers the current molecule, selected attachment atom, learning goal, bond tool, reference/manual origin, and Undo history in the same browser tab.
- Undo restores the attachment selection, so O → H → H → Undo → H creates water again.
- Malformed or unavailable browser storage cannot prevent normal editing. Damaged saved records are ignored; rejected loads leave the current molecule intact.
- A learner's saved molecule retains its origin. Loading a reference remains identified as a supplied answer, including after Undo or refresh.
- Loading an example onto an empty canvas can be undone.
- 3D atom controls and hit-test positions update together when Undo or a graph replacement changes the camera. Immediate reconnects are checked repeatedly.
- Playground delete/undo shortcuts are inactive while another lab or a modal is open. Unsupported Shift+Ctrl/Cmd+Z does not accidentally undo.
- Keyboard users can activate 2D sockets, keep focus across diagram and inspector updates, identify the chosen bond tool, and enter/leave dialogs.
- Interrupted 2D drags restore the original positions. Bond gestures track their initiating pointer and ignore a second finger.
- A hint button selects the suggested atom without changing the molecule, including the correct carbon when the ethanol skeleton still needs oxygen.
- The 2D drawing fits its atoms inside the canvas when the screen becomes narrower, preserving connectivity.
- Essential building controls use larger text, wrap on narrow screens, follow their visual reading order, and allow native zoom over the scene.
- Draft parsing, history size, and atom counts are bounded. The canvas currently supports up to 160 explicitly placed atoms.

## Repeatable checks

| Check | Coverage |
| --- | --- |
| `npm run verify:student-chemistry` | 12,553 partial graphs from six learning goals; 12,000 seeded wrong-bond graphs; 240 charge, saturation, and immutability probes; all 20 visible presets |
| `npm run verify:student-storage` | Malformed/null/oversized data, graph shape, duplicate atoms/bonds, invalid endpoints, unsupported element/type inputs, open graphs, bounded history, selection and provenance recovery |
| `npm run verify:discovery` | Full graph recognition, isomers, explicit hydrogen, graph permutations, guided feedback and input immutability |
| `npm run verify:playground` | Existing Chromium visual controls, manual interactions, narrow layouts and fallback behavior |
| `npm run verify:discovery-browser` | Existing 3D/2D O→H→H and H→O→H, body-drop bonding, ethanol construction, ethanol/ether rewiring, exact Undo and supplied-reference behavior |
| `npm run verify:student-browser` | Six molecules built through student controls; break/Undo; refresh/Clear; local saves; hidden shortcuts; dialogs; MOL export; 2D keyboard/pointer cancellation; Tab order; mobile touch taps; malformed data/hash and unavailable storage |

The GitHub workflow runs the new student journeys against the production build in Chromium, Firefox, and WebKit. The original interaction suites also run in Chromium. Screenshot artifacts are retained for seven days.

Example local reproduction after installing dependencies and Playwright browsers:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5173
# In a second terminal:
BASE_URL=http://127.0.0.1:5173 STUDENT_BROWSER=firefox npm run verify:student-browser
```

## Verification record

Production build, pure storage checks, existing discovery checks, and all 24,793 deterministic chemistry probes pass. Browser results and screenshots are recorded in [PR #4 checks](https://github.com/SyedAkramaIrshad/chemistry_project/pull/4/checks). Use the results for the latest revision; a passing older run does not verify a later code change.

## Release limits

These automated checks cover selected workflows; they do not establish learning gains, complete accessibility conformance, or real-device performance. WebKit on Linux is not a physical iPhone or Safari installation. Phone tests use a 390px touch-enabled context; reflow covers 320, 390, 640, and 742px. The 640px layout approximates the effective CSS viewport of a 1280px window at 200% page zoom; native browser zoom itself is not automated. Multi-pointer cancellation is tested with synthetic pointer events.

Interactive cloud preview inspection was blocked by the environment's browser security policy during this pass. The independent browser tests run in GitHub Actions. Before adopting this across a class, run a supervised student pilot on the actual school devices, including keyboard/screen-reader users, and observe whether learners can build water and ethanol without assistance, recover from a wrong bond, and explain why ethanol and dimethyl ether differ.
