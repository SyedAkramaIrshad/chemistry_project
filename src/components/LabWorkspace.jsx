import ExperimentGuide from './ExperimentGuide.jsx';
import { DiscoveryGoalBar, DiscoveryBuildTray, DiscoveryPanel } from './MoleculeDiscovery.jsx';
import '../styles/molecular-playground.css';
import '../styles/molecular-scene.css';

function ElementLibrary() {
  return (
    <details className="panel library-panel playground-library playground-rail" open>
      <summary className="panel-header rail-heading">
        <span className="rail-heading-copy"><span className="panel-code">Your building blocks</span><h2>Elements</h2></span>
        <span className="rail-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="panel-body">
        <p className="rail-intro">Click to add or attach to the selected atom. Drag onto an atom to connect.</p>
        <label className="mp-sr-only" htmlFor="elementSearch">Search elements</label>
        <input className="search-input" id="elementSearch" type="search" placeholder="Find an element…" autoComplete="off" />
        <div className="atom-grid" id="atomPalette" />
        <div className="divider" />
        <p className="subhead">Start with a molecule</p>
        <label className="mp-sr-only" htmlFor="presetSearch">Search starting molecules</label>
        <input className="search-input" id="presetSearch" type="search" placeholder="Water, methane…" autoComplete="off" />
        <div className="preset-list" id="presetList" />
      </div>
    </details>
  );
}

function BuilderToolbar() {
  return (
    <div className="builder-toolbar">
      <div className="tool-group bond-tools" role="group" aria-label="Bond tools">
        <span className="tool-label">Bond</span>
        <button className="btn small active" type="button" data-bond-type="single"><span aria-hidden="true">—</span> Single</button>
        <button className="btn small" type="button" data-bond-type="double"><span aria-hidden="true">═</span> Double</button>
        <button className="btn small" type="button" data-bond-type="triple"><span aria-hidden="true">≡</span> Triple</button>
        <button className="btn small" type="button" data-bond-type="ionic"><span aria-hidden="true">⋯</span> Ionic</button>
      </div>
      <div className="tool-group edit-tools" role="group" aria-label="Workspace tools">
        <button className="btn danger small break-bond-btn" id="breakBondBtn" type="button" disabled><span aria-hidden="true">✂</span> Break bond</button>
        <button className="btn small active toggle-btn" id="lewisToggle" type="button" aria-pressed="true" title="Show or hide simplified Lewis valence electrons"><span aria-hidden="true">••</span> Electrons</button>
        <button className="btn ghost small" id="undoBtn" type="button" title="Undo the last graph edit">↶ Undo</button>
        <button className="btn ghost small" id="centerBtn" type="button" title="Move the graph to the center of the editing plane">Center</button>
        <button className="btn danger small" id="clearBtn" type="button">Clear</button>
      </div>
    </div>
  );
}

function MolecularBuilder() {
  return (
    <section className="panel builder-panel playground-builder">
      <header className="builder-stage-head">
        <div><span className="stage-live-dot" aria-hidden="true" /><h2>Molecular canvas</h2></div>
        <p>Make a connection. See what changes.</p>
      </header>
      <BuilderToolbar />
      <DiscoveryBuildTray />
      <div id="workspace" role="application" aria-label="Molecular graph building workspace" aria-describedby="sceneStatus">
        <div id="sceneLayer" />
        <div className="canvas-hud" aria-hidden="true"><span><i /> Live graph</span><small>You control every edit</small></div>
        <div className="scene-controls" role="group" aria-label="Molecular view controls">
          <div className="scene-mode-switch">
            <button className="active" data-scene-mode="edit" type="button" aria-pressed="true" title="Drop an atom onto another to make a bond, or drag into empty space to move">Build</button>
            <button data-scene-mode="orbit" type="button" aria-pressed="false" title="Drag the scene to rotate the camera">Rotate</button>
          </div>
          <button id="sceneResetBtn" type="button" title="Reset the camera without changing any atom or bond" aria-label="Reset camera view">↺</button>
          <button id="sceneFallbackBtn" type="button" title="Switch between 3D and the accessible 2D editor">2D view</button>
        </div>
        <svg id="bondLayer" aria-hidden="true" />
        <div id="atomLayer" />
        <p className="scene-model-caption">SCHEMATIC GEOMETRY · ILLUSTRATIVE MOTION</p>
        <p id="sceneStatus" className="scene-view-status" role="status">Drop one atom onto another to connect</p>
        <div className="bond-guide bond-guide-overlay" id="bondGuide" aria-live="polite">
          <div className="guide-icon" id="guideIcon">1</div>
          <div className="guide-copy"><strong id="guideTitle">Add or select an atom</strong><span id="guideDetail">Choose a green socket, then another atom to make a bond.</span></div>
          <div className="guide-legend" aria-hidden="true"><span><i className="legend-electron" /> electron</span><span><i className="legend-site" /> open site</span></div>
        </div>
        <div className="empty-state" id="emptyState">
          <div className="empty-inner">
            <div className="empty-orbit" aria-hidden="true"><i /><i /><i /></div>
            <h3>A little curiosity.<br />A whole new molecule.</h3>
            <p>Add a building block above. Connect the green sockets to discover what your atoms can become.</p>
          </div>
        </div>
      </div>
      <div className="builder-summary">
        <div className="summary-top">
          <div className="summary-title"><strong id="moleculeName">Your next discovery</strong><p id="moleculeDetail">Add an atom to begin. Every connection is your decision.</p></div>
          <span className="status-pill open" id="structureStatus">Empty</span>
        </div>
        <div className="metric-grid">
          <div className="metric"><span>Formula</span><strong id="metricFormula">—</strong></div>
          <div className="metric"><span>Molar mass</span><strong id="metricMass">—</strong></div>
          <div className="metric"><span>Net charge</span><strong id="metricCharge">0</strong></div>
          <div className="metric"><span>Components</span><strong id="metricComponents">0</strong></div>
          <div className="metric"><span>Unsaturation</span><strong id="metricDbe">—</strong></div>
        </div>
        <div className="summary-actions">
          <button className="btn primary" id="addReactantBtn" type="button">Add as reactant <span aria-hidden="true">↗</span></button>
          <button className="btn ghost" id="saveStructureBtn" type="button">Save locally</button>
          <button className="btn ghost" id="exportMolBtn" type="button">Export MOL</button>
        </div>
      </div>
    </section>
  );
}

function InspectorStack() {
  return (
    <aside className="right-stack playground-inspector" aria-label="Atom properties and structure state">
      <DiscoveryPanel />
      <details className="panel inspector-panel playground-rail" open>
        <summary className="panel-header rail-heading"><span className="rail-heading-copy"><span className="panel-code">Look a little closer</span><h2>Atom inspector</h2></span><span className="rail-chevron" aria-hidden="true">⌄</span></summary>
        <div className="panel-body" id="inspector"><p className="inspector-empty">Select an atom or bond to explore its properties.</p></div>
      </details>
      <details className="panel verdict-panel playground-rail" open>
        <summary className="panel-header rail-heading"><span className="rail-heading-copy"><span className="panel-code">The chemistry check</span><h2>Structure state</h2></span><span className="rail-chevron" aria-hidden="true">⌄</span></summary>
        <div className="panel-body"><div className="validation-list" id="validationList" /></div>
      </details>
      <details className="panel saved-panel">
        <summary><span><b>Your molecule shelf</b><small>Saved in this browser</small></span><i aria-hidden="true">＋</i></summary>
        <div className="panel-header split"><div><h2>Saved structures</h2><p>Return to a graph exactly as you saved it.</p></div><button className="btn danger small" id="clearSavedBtn" type="button">Clear</button></div>
        <div className="panel-body"><div className="saved-list" id="savedList" /></div>
      </details>
    </aside>
  );
}

export default function LabWorkspace() {
  return (
    <main className="molecule-playground lab-grid" id="laboratory">
      <header className="playground-heading">
        <div className="playground-title"><p>CHEMLAB / PLAYGROUND</p><h2>Small atoms. <em>Real discoveries.</em></h2><span>Build it atom by atom. Watch a molecule take shape.</span></div>
        <div className="playground-process" aria-label="How to use the playground"><span><i>01</i> Add atoms</span><span><i>02</i> Connect them</span><span><i>03</i> Discover a molecule</span></div>
      </header>
      <DiscoveryGoalBar />
      <section className="playground-table" aria-label="Interactive molecular construction table"><ElementLibrary /><MolecularBuilder /><InspectorStack /></section>
      <section className="playground-challenge" aria-label="Guided bond rewriting challenge">
        <div className="challenge-ribbon"><span className="challenge-kicker">YOUR FIRST EXPERIMENT</span><strong>One bond.<br />A different story.</strong><div className="challenge-molecule" aria-hidden="true"><span>O</span><i /> <span>H</span></div><p>Break an O–H bond, keep every atom, and explore a new connection.</p></div>
        <ExperimentGuide />
      </section>
      <footer className="playground-boundary"><strong>A model you can question.</strong><span>Manual graph edits · no automatic repair.</span><span>Display geometry and motion are illustrative; they do not predict a reaction, stability, or measured structure.</span></footer>
    </main>
  );
}
