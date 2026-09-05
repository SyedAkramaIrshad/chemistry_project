export default function Modals() {
  return (
    <>
      <div className="toast" id="toast" role="status" aria-live="polite" />

      <div className="modal-backdrop" id="howModal" role="dialog" aria-modal="true" aria-labelledby="howTitle">
        <section className="modal">
          <header>
            <h2 id="howTitle">How the chemistry engine works</h2>
            <button className="btn ghost icon-btn" type="button" data-close-modal="howModal" aria-label="Close">×</button>
          </header>
          <main>
            <h3>1. Molecular graph</h3>
            <p>
              Every atom is a node and every supported interaction is an edge. Identity uses
              connectivity, bond order, and formal charge, so an incorrect H–H–O chain is not
              recognized as water just because it contains H₂O.
            </p>
            <h3>2. Lewis electrons and bonding</h3>
            <p>
              Before accepting a bond or charge change, the engine recomputes nonbonding
              electrons, checks permitted bond order, and enforces first-shell or octet capacity.
              Unsupported metal, coordination, and crystal bonding is separated from definite
              invalidity.
            </p>
            <h3>3. Reactions</h3>
            <p>
              The predictor checks exact textbook reactions and deterministic families such as
              complete combustion, neutralization, displacement, and precipitation. Generated
              products are balanced by element and charge conservation.
            </p>
            <h3>4. Four truth states</h3>
            <p>
              <strong>Valid</strong> is certified inside the model. <strong>Open</strong> is radical,
              incomplete, or charge-unbalanced. <strong>Unsupported</strong> needs chemistry outside
              the implemented model. <strong>Invalid</strong> is reserved for a hard rule violation.
            </p>
            <h3>5. Scientific boundary</h3>
            <p>
              Real outcomes can depend on solvent, temperature, pressure, catalyst, concentration,
              phase, light, and kinetics. Missing conditions produce a clear limitation instead of
              a fabricated equation.
            </p>
            <h3>Safety</h3>
            <p>This application teaches representations and reaction logic. It does not provide experimental quantities or operational synthesis procedures.</p>
          </main>
        </section>
      </div>

      <div className="modal-backdrop" id="testsModal" role="dialog" aria-modal="true" aria-labelledby="testsTitle">
        <section className="modal">
          <header>
            <h2 id="testsTitle">Engine self-tests</h2>
            <button className="btn ghost icon-btn" type="button" data-close-modal="testsModal" aria-label="Close">×</button>
          </header>
          <main><div className="test-list" id="testList" /></main>
        </section>
      </div>
    </>
  );
}
