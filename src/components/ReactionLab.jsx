export default function ReactionLab() {
  return (
    <section className="panel reaction-section" id="reactionLab">
      <div className="panel-header split">
        <div>
          <span className="panel-code">32 / Reaction chamber</span>
          <h2>Bring reactants together</h2>
          <p>
            Add a structure from the canvas or enter a formula. The chamber predicts only
            reactions supported by deterministic chemistry rules.
          </p>
        </div>
        <span className="status-pill valid">No guessing</span>
      </div>

      <div className="panel-body reaction-grid">
        <div>
          <p className="subhead">Add a formula</p>
          <div className="formula-add">
            <input
              className="formula-input"
              id="formulaInput"
              placeholder="Examples: O2, HCl, Ca(OH)2, AgNO3"
            />
            <button className="btn secondary" id="addFormulaBtn" type="button">Add species</button>
          </div>
          <p className="helper-text">
            For charged species use caret notation, such as SO4^2-. Add one instance of each
            reactant and the chamber will calculate the balanced ratio.
          </p>
          <div className="quick-species" id="quickSpecies" />
          <div className="divider" />
          <p className="subhead">Reactants</p>
          <div className="reactant-list" id="reactantList">
            <p className="reactant-empty">No reactants added.</p>
          </div>
          <div className="reaction-actions">
            <button className="btn primary" id="runReactionBtn" type="button">Predict and balance</button>
            <button className="btn ghost" id="resetReactionBtn" type="button">Reset reactants</button>
          </div>
        </div>

        <div>
          <div className="result-box" id="reactionResult">
            <div className="placeholder">
              Your reaction result will appear here. Unsupported combinations are called out
              clearly instead of being assigned invented products.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
