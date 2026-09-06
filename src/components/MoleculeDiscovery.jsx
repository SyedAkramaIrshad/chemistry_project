import '../styles/molecule-discovery.css';

/** Public controls are intentionally native: the graph controller owns every edit. */
export function DiscoveryGoalBar() {
  return (
    <section className="discovery-goal-bar" aria-label="Choose a molecule to build">
      <div className="discovery-goal-picker">
        <label htmlFor="discoveryGoalSelect"><span className="discovery-kicker">A little challenge</span>What will you build?</label>
        <select id="discoveryGoalSelect" defaultValue="ethanol">
          <option value="ethanol">Ethanol · an alcohol</option>
          <option value="methanol">Methanol · an alcohol</option>
          <option value="water">Water</option>
          <option value="methane">Methane</option>
          <option value="dimethyl-ether">Dimethyl ether</option>
          <option value="ethane">Ethane</option>
        </select>
      </div>
      <div className="discovery-goal-info" id="discoveryGoalInfo" aria-live="polite">
        <strong className="discovery-target-formula" aria-label="C H 3, C H 2, O H">CH₃<span>—</span>CH₂<span>—</span><em>OH</em></strong>
        <p className="discovery-goal-description">Two carbons, six hydrogens, one oxygen. The connections make it ethanol.</p>
      </div>
      <div className="discovery-goal-actions">
        <div className="discovery-action-row">
          <button className="btn primary" id="discoveryStartBtn" type="button">Start building <span aria-hidden="true">↗</span></button>
          <button className="btn ghost" id="discoveryFreeBtn" type="button" aria-pressed="false">Free build</button>
        </div>
        <div className="discovery-secondary-row"><span>Start building clears the canvas.</span><button id="discoveryReferenceBtn" type="button">Show reference</button></div>
      </div>
    </section>
  );
}

export function DiscoveryBuildTray() {
  return (
    <section className="discovery-build-tray" aria-label="Building blocks and next step">
      <div className="discovery-tray-top">
        <div className="discovery-tray-label"><span className="discovery-kicker">Your ingredients</span><strong>Add an atom</strong></div>
        <div className="discovery-inventory" id="discoveryInventory" role="group" aria-label="Quick add atoms">
          {[
            { symbol: 'C', name: 'Carbon', count: 2 },
            { symbol: 'H', name: 'Hydrogen', count: 6 },
            { symbol: 'O', name: 'Oxygen', count: 1 },
          ].map((element) => (
            <button className="discovery-element" data-build-element={element.symbol} type="button" key={element.symbol} aria-label={`Add ${element.name.toLowerCase()} atom`}>
              <span className="discovery-element-symbol" aria-hidden="true">{element.symbol}</span>
              <span className="discovery-element-copy"><span className="discovery-element-name">{element.name}</span><span className="discovery-element-count">0 / {element.count} placed</span></span>
              <span className="discovery-element-plus" aria-hidden="true">+</span>
            </button>
          ))}
        </div>
      </div>
      <div className="discovery-attach-row">
        <label className="discovery-attach-control"><input id="discoveryAttachToggle" type="checkbox" defaultChecked /><span>Attach to selected atom</span></label>
        <span id="discoveryAttachContext" className="discovery-attach-context">Select an atom to build from it.</span>
      </div>
      <div className="discovery-coach-row">
        <div className="discovery-next-action" id="discoveryNextAction" role="status"><span className="discovery-coach-icon" aria-hidden="true">↗</span><p>Choose <strong>Start building</strong>, then add your first carbon atom.</p></div>
        <button id="discoverySelectHint" className="btn small" type="button" hidden>Select suggested atom</button>
        <ol className="discovery-steps" id="discoverySteps" aria-label="Build progress" />
      </div>
    </section>
  );
}

export function DiscoveryPanel() {
  return (
    <section className="panel discovery-panel" aria-labelledby="discoveryPanelTitle">
      <header className="panel-header discovery-panel-header">
        <div><span className="panel-code">Follow the connections</span><h2 id="discoveryPanelTitle">Your molecule, live</h2></div>
        <span className="discovery-live-indicator" aria-hidden="true"><i /> Live</span>
      </header>
      <div className="panel-body">
        <div className="discovery-card" id="discoveryCard" aria-live="polite" aria-atomic="true">
          <span className="discovery-state-label">Ready to explore</span>
          <h3>Every bond tells a story.</h3>
          <p>Add atoms and connect them. Your molecule’s composition and identity will appear here as you build.</p>
        </div>
        <div className="discovery-collection" id="discoveryCollection" aria-label="Molecules discovered this session" />
      </div>
    </section>
  );
}
