export default function EquationSections() {
  return (
    <>
      <section className="panel balancer-section equation-section" id="balanceLab">
        <div className="panel-header">
          <span className="panel-code">33 / Equation balancer</span>
          <h2>Make both sides agree</h2>
          <p>Enter known reactants and products. The solver finds exact coefficients and shows the conservation check.</p>
        </div>
        <div className="panel-body balancer-grid">
          <div>
            <input
              className="equation-input"
              id="equationInput"
              defaultValue="C2H6 + O2 -> CO2 + H2O"
              aria-label="Chemical equation"
            />
            <p className="helper-text">Put spaces around plus signs. Example: Fe + O2 -&gt; Fe2O3</p>
            <div className="example-row">
              <button className="example-btn" type="button" data-equation="H2 + O2 -> H2O">Water</button>
              <button className="example-btn" type="button" data-equation="C2H6 + O2 -> CO2 + H2O">Combustion</button>
              <button className="example-btn" type="button" data-equation="Al + HCl -> AlCl3 + H2">Displacement</button>
              <button className="example-btn" type="button" data-equation="KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2">Redox example</button>
            </div>
            <button className="btn secondary balance-action" id="balanceBtn" type="button">Balance equation</button>
          </div>
          <div className="balance-result" id="balanceResult">
            <p>Balanced coefficients and conservation checks will appear here.</p>
          </div>
        </div>
      </section>

      <section className="panel balancer-section coverage-section">
        <div className="panel-header">
          <span className="panel-code">Model boundary</span>
          <h2>Know where the map ends</h2>
          <p>This is a broad introductory chemistry engine, not a quantum simulator or a universal synthesis predictor.</p>
        </div>
        <div className="panel-body coverage-grid">
          <article className="coverage-card">
            <strong>1,000-structure audited rules</strong>
            <p>Charge states, electron accounting, shell limits, ionic polarity, graph identity, formula, mass, and unsaturation.</p>
          </article>
          <article className="coverage-card">
            <strong>Reaction families</strong>
            <p>Combustion, neutralization, acid–carbonate, displacement, precipitation, oxidation, combination, and decomposition.</p>
          </article>
          <article className="coverage-card">
            <strong>Exact equation solver</strong>
            <p>Formulas with parentheses, hydrates, and explicit ionic charge can be balanced when a positive unique solution exists.</p>
          </article>
          <article className="coverage-card">
            <strong>Deliberate boundary</strong>
            <p>Coordination complexes, non-cubic crystal structures, real phase stability, stereochemistry, and condition-dependent products are blocked rather than guessed.</p>
          </article>
        </div>
      </section>
    </>
  );
}
