import ExperimentGuide from './ExperimentGuide.jsx';
import '../styles/molecular-playground.css';

function ElementLibrary() {
  return (
    <aside className="panel library-panel playground-library">
      <div className="panel-header">
        <span className="panel-code">Element cabinet</span>
        <h2>Pick an atom</h2>
        <p>Tap to place it in the field, or drag it exactly where you want it.</p>
      </div>
      <div className="panel-body">
        <input
          className="search-input"
          id="elementSearch"
          type="search"
          placeholder="Search elements…"
          autoComplete="off"
        />
        <div className="atom-grid" id="atomPalette" />
        <div className="divider" />
        <p className="subhead">Starting structures</p>
        <input
          className="search-input"
          id="presetSearch"
          type="search"
          placeholder="Search molecules…"
          autoComplete="off"
        />
        <div className="preset-list" id="presetList" />
      </div>
    </aside>
  );
}

function BuilderToolbar() {
  return (
    <div className="builder-toolbar">
      <div className="tool-group" aria-label="Bond tools">
        <span className="tool-label">Bond to attempt</span>
        <button className="btn small active" type="button" data-bond-type="single">
          <span className="bond-label-text">Single</span> —
        </button>
        <button className="btn small" type="button" data-bond-type="double">
          <span className="bond-label-text">Double</span> ═
        </button>
        <button className="btn small" type="button" data-bond-type="triple">
          <span className="bond-label-text">Triple</span> ≡
        </button>
        <button
          className="btn small"
          type="button"
          disabled
          title="Aromaticity is a ring property. Build alternating single/double bonds or load a validated aromatic preset."
        >
          <span className="bond-label-text">Aromatic*</span> ◌
        </button>
        <button className="btn small" type="button" data-bond-type="ionic">
          <span className="bond-label-text">Ionic</span> ⋯
        </button>
        <button className="btn danger small break-bond-btn" id="breakBondBtn" type="button" disabled>
          <span aria-hidden="true">✂</span> Break selected bond
        </button>
      </div>

      <div className="tool-group">
        <button
          className="btn small active toggle-btn"
          id="lewisToggle"
          type="button"
          aria-pressed="true"
          title="Show or hide simplified Lewis valence electrons"
        >
          <span aria-hidden="true">••</span> <span className="bond-label-text">Electrons</span>
        </button>
        <button className="btn ghost small" id="undoBtn" type="button">Undo</button>
        <button className="btn ghost small" id="centerBtn" type="button">Center</button>
        <button className="btn danger small" id="clearBtn" type="button">Clear</button>
      </div>
    </div>
  );
}

function MolecularBuilder() {
  return (
    <section className="panel builder-panel playground-builder">
      <header className="builder-stage-head">
        <div>
          <span>LIVE MOLECULAR GRAPH</span>
          <h2>Construction table</h2>
        </div>
        <p><i /> Every edit is manual <b>·</b> rejected moves preserve the graph</p>
      </header>
      <BuilderToolbar />

      <div id="workspace" role="application" aria-label="Molecular graph building workspace">
        <div className="canvas-hud" aria-hidden="true">
          <span><i /> Manual graph mode</span>
          <small>Atoms persist · no automatic repair</small>
        </div>
        <div className="canvas-axis-label canvas-axis-x" aria-hidden="true">bond distance</div>
        <div className="canvas-axis-label canvas-axis-y" aria-hidden="true">electron state</div>
        <svg id="bondLayer" aria-hidden="true" />
        <div id="atomLayer" />
        <div className="bond-guide bond-guide-overlay" id="bondGuide" aria-live="polite">
          <div className="guide-icon" id="guideIcon">1</div>
          <div className="guide-copy">
            <strong id="guideTitle">Add or select an atom</strong>
            <span id="guideDetail">Green sockets are available bonding sites. Drag one onto another atom.</span>
          </div>
          <div className="guide-legend" aria-hidden="true">
            <span><i className="legend-electron" /> lone electron</span>
            <span><i className="legend-site" /> open socket</span>
            <span><i className="legend-closed" /> complete</span>
          </div>
        </div>
        <div className="empty-state" id="emptyState">
          <div className="empty-inner">
            <div className="empty-orbit" aria-hidden="true"><i /><i /><i /></div>
            <h3>Place your first atom</h3>
            <p>Choose from the cabinet. Open bonding sockets appear automatically, but you decide every edit.</p>
          </div>
        </div>
      </div>

      <div className="builder-summary">
        <div className="summary-top">
          <div className="summary-title">
            <strong id="moleculeName">No structure yet</strong>
            <p id="moleculeDetail">Formula and structural state will appear here. Identity is never guessed.</p>
          </div>
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
          <button className="btn primary" id="addReactantBtn" type="button">Add as reactant</button>
          <button className="btn ghost" id="saveStructureBtn" type="button">Save locally</button>
          <button className="btn ghost" id="exportMolBtn" type="button">Export MOL</button>
        </div>
      </div>
    </section>
  );
}

function InspectorStack() {
  return (
    <aside className="right-stack playground-inspector">
      <section className="panel inspector-panel">
        <div className="panel-header">
          <span className="panel-code">Selection drawer</span>
          <h2>Atom or bond</h2>
          <p>Select anything in the field. Break controls and chemical details appear here.</p>
        </div>
        <div className="panel-body" id="inspector">
          <p className="inspector-empty">Nothing selected. Click an atom in the workspace.</p>
        </div>
      </section>

      <section className="panel verdict-panel">
        <div className="panel-header">
          <span className="panel-code">Structure state</span>
          <h2>What the rules can say</h2>
          <p>Errors name a broken rule. Open structures remain editable. Unsupported chemistry stays unclaimed.</p>
        </div>
        <div className="panel-body"><div className="validation-list" id="validationList" /></div>
      </section>

      <details className="panel saved-panel">
        <summary>
          <span><b>Your molecule shelf</b><small>Saved in this browser</small></span>
          <i aria-hidden="true">＋</i>
        </summary>
        <div className="panel-header split">
          <div>
            <h2>Saved structures</h2>
            <p>Reload a graph without changing the chemistry engine.</p>
          </div>
          <button className="btn danger small" id="clearSavedBtn" type="button">Clear</button>
        </div>
        <div className="panel-body"><div className="saved-list" id="savedList" /></div>
      </details>
    </aside>
  );
}

export default function LabWorkspace() {
  return (
    <main className="molecule-playground lab-grid" id="laboratory">
      <header className="playground-heading">
        <div className="playground-title">
          <p>THE MOLECULE IS THE LESSON</p>
          <h2>Build it. Break it. <em>Ask why.</em></h2>
          <span>Nothing rearranges itself. Every atom stays where you put it until you move, reconnect, or remove it.</span>
        </div>
        <div className="playground-process" aria-label="How the molecular playground works">
          <article><i>01</i><strong>Place atoms</strong><small>Tap or drag from the cabinet</small></article>
          <b aria-hidden="true">→</b>
          <article><i>02</i><strong>Edit bonds</strong><small>Select to break; drag sockets to form</small></article>
          <b aria-hidden="true">→</b>
          <article><i>03</i><strong>Read the reason</strong><small>The graph changes only when allowed</small></article>
        </div>
      </header>

      <section className="playground-table" aria-label="Interactive molecular construction table">
        <ElementLibrary />
        <MolecularBuilder />
        <InspectorStack />
      </section>

      <section className="playground-challenge" aria-label="Guided bond rewriting challenge">
        <div className="challenge-ribbon" aria-hidden="true"><span>O—H</span><i>BREAK</i><span>O···N</span><i>TRY</i><span>O—N</span></div>
        <ExperimentGuide />
      </section>

      <footer className="playground-boundary">
        <strong>What this playground promises</strong>
        <span><i>✓</i> Manual graph edits</span>
        <span><i>✓</i> Specific rejection reasons</span>
        <span><i>✓</i> No automatic repair</span>
        <span><i>≠</i> Not a reaction-condition predictor</span>
      </footer>
    </main>
  );
}
