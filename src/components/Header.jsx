import Brand from './Brand.jsx';

export default function Header() {
  return (
    <>
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand-link" href="#laboratory" aria-label="Open the ChemLab molecular playground">
          <Brand />
        </a>

        <div className="nav-links" aria-label="Explore the lab">
          <a href="#laboratory"><span aria-hidden="true">⚛</span>Playground</a>
          <a href="#curriculum"><span aria-hidden="true">◫</span>Learn</a>
          <a href="#atomicStructureLab"><span aria-hidden="true">ψ</span>Atoms</a>
          <a href="#molecularGeometryLab"><span aria-hidden="true">△</span>Shapes</a>
          <a href="#molecularOrbitalLab"><span aria-hidden="true">ψ₂</span>Orbitals</a>
          <a href="#stoichiometryLab"><span aria-hidden="true">ν</span>Moles</a>
          <details className="nav-more">
            <summary><span aria-hidden="true">•••</span>More labs</summary>
            <div className="nav-more-menu">
              <a href="#nuclearChemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">☢</span><b><strong>Nuclear chemistry observatory</strong><small>Close A/Z/lepton ledgers and release isotope clocks</small></b></a>
              <a href="#intermolecularLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">δ</span><b><strong>Molecular interaction observatory</strong><small>Dock noncovalent sites and orient solvation</small></b></a>
              <a href="#solutionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≈</span><b><strong>Solution equilibrium</strong><small>Move through an ideal weak-acid titration</small></b></a>
              <a href="#chemicalEquilibriumLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">Q</span><b><strong>Reaction quotient observatory</strong><small>Perturb Q, predict direction, and re-equilibrate</small></b></a>
              <a href="#energyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Energy and rate</strong><small>Separate favorable from fast</small></b></a>
              <a href="#thermochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">Σ</span><b><strong>Thermochemical cycle studio</strong><small>Reverse equations, cancel species, and balance heat</small></b></a>
              <a href="#solubilityLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⇣</span><b><strong>Solubility & precipitation</strong><small>Mix ions, settle a solid, and scan separation windows</small></b></a>
              <a href="#electrochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⎓</span><b><strong>Electrochemical cells</strong><small>Wire half-cells and audit charge</small></b></a>
              <a href="#spectroscopyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◒</span><b><strong>Spectroscopy</strong><small>Build and challenge a calibration</small></b></a>
              <a href="#infraredEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≋</span><b><strong>Infrared evidence studio</strong><small>Scan gas-phase records and defend an isomer choice</small></b></a>
              <a href="#orthogonalEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">δ</span><b><strong>Orthogonal structure evidence</strong><small>Route formula, IR, NMR, and ideal mass evidence</small></b></a>
              <a href="#measurementEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">±</span><b><strong>Measurement evidence</strong><small>Compare repeats, coverage, and blank detection</small></b></a>
              <a href="#chromatographyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Chromatography</strong><small>Tune retention, efficiency, and resolution</small></b></a>
              <a href="#functionalGroupLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Functional groups</strong><small>Probe connectivity and distinguish overlapping motifs</small></b></a>
              <a href="#gasPhaseLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◎</span><b><strong>Gas & phase laboratory</strong><small>Control variables and phase boundaries</small></b></a>
              <a href="#binaryVleLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◭</span><b><strong>Binary equilibrium navigator</strong><small>Map two phases and balance their amounts</small></b></a>
              <a href="#nonidealThermodynamicsLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">γ</span><b><strong>Nonideal thermodynamics</strong><small>Bend activity, stability, and fugacity surfaces</small></b></a>
              <a href="#biomoleculeLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⋈</span><b><strong>Biomolecular assembly</strong><small>Weave peptides and pair strands</small></b></a>
              <a href="#enzymeLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌬</span><b><strong>Enzyme kinetics</strong><small>Explore saturation and inhibition</small></b></a>
              <a href="#mechanismLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">↝</span><b><strong>Mechanism studio</strong><small>Move electron pairs manually</small></b></a>
              <a href="#stereochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◇</span><b><strong>Stereochemical navigation</strong><small>Swap groups, compare sides, and turn a Newman dial</small></b></a>
              <a href="#stereochemicalReactionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">↯</span><b><strong>Stereochemical reaction theatre</strong><small>Carry geometry through inversion and elimination</small></b></a>
              <a href="#coordinationLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌘</span><b><strong>Coordination field</strong><small>Place d electrons manually</small></b></a>
              <a href="#crystalLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◇</span><b><strong>Crystal lattice</strong><small>Rotate cells and test reflections</small></b></a>
              <a href="#electronicBandLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">∿</span><b><strong>Electronic bands</strong><small>Split site levels, fill a band, and test a gap</small></b></a>
              <a href="#polymerPopulationLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≈</span><b><strong>Polymer populations</strong><small>Weave chains and compare number with mass weighting</small></b></a>
              <a href="#reactionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⇄</span><b><strong>Reaction chamber</strong><small>Test supported families</small></b></a>
              <a href="#balanceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">=</span><b><strong>Equation balancer</strong><small>Verify conservation</small></b></a>
            </div>
          </details>
        </div>

        <div className="top-actions">
          <div className="engine-pill"><i /> Audited locally</div>
          <button className="btn ghost small" id="howBtn" type="button">How it works</button>
          <button className="btn ghost small" id="testsBtn" type="button">Self-tests</button>
          <button className="btn primary small" id="jumpBtn" type="button" onClick={() => { window.location.hash = 'laboratory'; }}>
            Enter the lab <span aria-hidden="true">↓</span>
          </button>
        </div>
      </nav>

      <nav className="mobile-nav" aria-label="Chemistry studio sections">
        <a href="#laboratory"><span aria-hidden="true">⚛</span>Play</a>
        <a href="#curriculum"><span aria-hidden="true">◫</span>Learn</a>
        <a href="#atomicStructureLab"><span aria-hidden="true">ψ</span>Atoms</a>
        <a href="#molecularGeometryLab"><span aria-hidden="true">△</span>Shapes</a>
        <a href="#molecularOrbitalLab"><span aria-hidden="true">ψ₂</span>Orbitals</a>
        <details className="mobile-more">
          <summary><span aria-hidden="true">•••</span>More</summary>
          <div className="mobile-more-menu">
            <a href="#nuclearChemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">☢</span><b><strong>Nuclear chemistry observatory</strong><small>Close A/Z/lepton ledgers and release isotope clocks</small></b></a>
            <a href="#intermolecularLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">δ</span><b><strong>Molecular interaction observatory</strong><small>Dock noncovalent sites and orient solvation</small></b></a>
            <a href="#stoichiometryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">ν</span><b><strong>Stoichiometry foundry</strong><small>Compare equation-sized batches</small></b></a>
            <a href="#solutionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≈</span><b><strong>Solution equilibrium</strong><small>Move through an ideal weak-acid titration</small></b></a>
            <a href="#chemicalEquilibriumLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">Q</span><b><strong>Reaction quotient observatory</strong><small>Perturb Q, predict direction, and re-equilibrate</small></b></a>
            <a href="#energyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Energy and rate</strong><small>Separate favorable from fast</small></b></a>
            <a href="#thermochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">Σ</span><b><strong>Thermochemical cycle studio</strong><small>Reverse equations, cancel species, and balance heat</small></b></a>
            <a href="#solubilityLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⇣</span><b><strong>Solubility & precipitation</strong><small>Mix ions, settle a solid, and scan separation windows</small></b></a>
            <a href="#gasPhaseLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◎</span><b><strong>Gas & phase laboratory</strong><small>Control variables and phase boundaries</small></b></a>
            <a href="#binaryVleLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◭</span><b><strong>Binary equilibrium navigator</strong><small>Map two phases and balance their amounts</small></b></a>
            <a href="#nonidealThermodynamicsLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">γ</span><b><strong>Nonideal thermodynamics</strong><small>Bend activity, stability, and fugacity surfaces</small></b></a>
            <a href="#electrochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⎓</span><b><strong>Electrochemical cells</strong><small>Wire half-cells and audit charge</small></b></a>
            <a href="#spectroscopyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◒</span><b><strong>Spectroscopy</strong><small>Build and challenge a calibration</small></b></a>
            <a href="#infraredEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≋</span><b><strong>Infrared evidence studio</strong><small>Scan gas-phase records and defend an isomer choice</small></b></a>
            <a href="#orthogonalEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">δ</span><b><strong>Orthogonal structure evidence</strong><small>Route formula, IR, NMR, and ideal mass evidence</small></b></a>
            <a href="#measurementEvidenceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">±</span><b><strong>Measurement evidence</strong><small>Compare repeats, coverage, and blank detection</small></b></a>
            <a href="#chromatographyLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Chromatography</strong><small>Tune retention, efficiency, and resolution</small></b></a>
            <a href="#functionalGroupLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌁</span><b><strong>Functional groups</strong><small>Probe connectivity and distinguish overlapping motifs</small></b></a>
            <a href="#biomoleculeLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⋈</span><b><strong>Biomolecular assembly</strong><small>Weave peptides and pair strands</small></b></a>
            <a href="#enzymeLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌬</span><b><strong>Enzyme kinetics</strong><small>Explore saturation and inhibition</small></b></a>
            <a href="#mechanismLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">↝</span><b><strong>Mechanism studio</strong><small>Move electron pairs manually</small></b></a>
            <a href="#stereochemistryLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◇</span><b><strong>Stereochemical navigation</strong><small>Swap groups, compare sides, and turn a Newman dial</small></b></a>
            <a href="#stereochemicalReactionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">↯</span><b><strong>Stereochemical reaction theatre</strong><small>Carry geometry through inversion and elimination</small></b></a>
            <a href="#coordinationLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⌘</span><b><strong>Coordination field</strong><small>Place d electrons manually</small></b></a>
            <a href="#crystalLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">◇</span><b><strong>Crystal lattice</strong><small>Rotate cells and test reflections</small></b></a>
            <a href="#electronicBandLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">∿</span><b><strong>Electronic bands</strong><small>Split site levels, fill a band, and test a gap</small></b></a>
            <a href="#polymerPopulationLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">≈</span><b><strong>Polymer populations</strong><small>Weave chains and compare number with mass weighting</small></b></a>
            <a href="#reactionLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">⇄</span><b><strong>Reaction chamber</strong><small>Test supported families</small></b></a>
            <a href="#balanceLab" onClick={(event)=>event.currentTarget.closest('details')?.removeAttribute('open')}><span aria-hidden="true">=</span><b><strong>Equation balancer</strong><small>Verify conservation</small></b></a>
          </div>
        </details>
      </nav>
    </>
  );
}
