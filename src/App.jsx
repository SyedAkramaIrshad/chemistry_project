import { lazy, Suspense, useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import CurriculumAtlas from './components/CurriculumAtlas.jsx';
import LabWorkspace from './components/LabWorkspace.jsx';
import SolutionLab from './components/SolutionLab.jsx';
import EnergyLab from './components/EnergyLab.jsx';
import SpectroscopyLab from './components/SpectroscopyLab.jsx';
import EnzymeKineticsLab from './components/EnzymeKineticsLab.jsx';
import MechanismLab from './components/MechanismLab.jsx';
import ReactionLab from './components/ReactionLab.jsx';
import EquationSections from './components/EquationSections.jsx';
import Footer from './components/Footer.jsx';
import Modals from './components/Modals.jsx';

const CoordinationFieldLab = lazy(() => import('./components/CoordinationFieldLab.jsx'));
const CrystalLatticeLab = lazy(() => import('./components/CrystalLatticeLab.jsx'));
const ElectronicBandLab = lazy(() => import('./components/ElectronicBandLab.jsx'));
const PolymerPopulationLab = lazy(() => import('./components/PolymerPopulationLab.jsx'));
const GasPhaseLab = lazy(() => import('./components/GasPhaseLab.jsx'));
const BinaryVleLab = lazy(() => import('./components/BinaryVleLab.jsx'));
const NonidealThermodynamicsLab = lazy(() => import('./components/NonidealThermodynamicsLab.jsx'));
const BiomolecularStudio = lazy(() => import('./components/BiomolecularStudio.jsx'));
const ElectrochemistryLab = lazy(() => import('./components/ElectrochemistryLab.jsx'));
const StoichiometryLab = lazy(() => import('./components/StoichiometryLab.jsx'));
const AtomicStructureLab = lazy(() => import('./components/AtomicStructureLab.jsx'));
const MolecularGeometryLab = lazy(() => import('./components/MolecularGeometryLab.jsx'));
const MolecularOrbitalLab = lazy(() => import('./components/MolecularOrbitalLab.jsx'));
const IntermolecularLab = lazy(() => import('./components/IntermolecularLab.jsx'));
const StereochemistryLab = lazy(() => import('./components/StereochemistryLab.jsx'));
const StereochemicalReactionLab = lazy(() => import('./components/StereochemicalReactionLab.jsx'));
const ChemicalEquilibriumLab = lazy(() => import('./components/ChemicalEquilibriumLab.jsx'));
const MeasurementEvidenceLab = lazy(() => import('./components/MeasurementEvidenceLab.jsx'));
const ChromatographyLab = lazy(() => import('./components/ChromatographyLab.jsx'));
const FunctionalGroupLab = lazy(() => import('./components/FunctionalGroupLab.jsx'));
const ThermochemistryLab = lazy(() => import('./components/ThermochemistryLab.jsx'));
const SolubilityLab = lazy(() => import('./components/SolubilityLab.jsx'));
const NuclearChemistryLab = lazy(() => import('./components/NuclearChemistryLab.jsx'));
const InfraredEvidenceLab = lazy(() => import('./components/InfraredEvidenceLab.jsx'));
const OrthogonalEvidenceLab = lazy(() => import('./components/OrthogonalEvidenceLab.jsx'));

function LabFallback({ id, label }) {
  return <section className="lab-loading" id={id} aria-live="polite"><i/><span>Preparing interactive workbench</span><strong>{label}</strong></section>;
}

const VIEW_IDS = new Set([
  'top', 'curriculum', 'atomicStructureLab', 'nuclearChemistryLab', 'laboratory',
  'molecularGeometryLab', 'molecularOrbitalLab', 'intermolecularLab', 'stoichiometryLab',
  'solutionLab', 'chemicalEquilibriumLab', 'energyLab', 'thermochemistryLab',
  'solubilityLab', 'electrochemistryLab', 'gasPhaseLab', 'binaryVleLab',
  'nonidealThermodynamicsLab', 'spectroscopyLab', 'infraredEvidenceLab',
  'orthogonalEvidenceLab', 'measurementEvidenceLab', 'chromatographyLab',
  'functionalGroupLab', 'biomoleculeLab', 'enzymeLab', 'mechanismLab',
  'stereochemistryLab', 'stereochemicalReactionLab', 'coordinationLab', 'crystalLab',
  'electronicBandLab', 'polymerPopulationLab', 'reactionLab', 'balanceLab',
]);

const viewFromHash = () => {
  let requested;
  try { requested = decodeURIComponent(window.location.hash.slice(1)); } catch { return 'laboratory'; }
  return VIEW_IDS.has(requested) ? requested : 'laboratory';
};

function AppView({ id, activeView, children }) {
  const active = activeView === id;
  return <div className="app-view" data-view={id} hidden={!active} aria-hidden={!active}>{children}</div>;
}

export default function App() {
  const [activeView, setActiveView] = useState(viewFromHash);

  useEffect(() => {
    const selectView = () => setActiveView(viewFromHash());
    window.addEventListener('hashchange', selectView);
    return () => window.removeEventListener('hashchange', selectView);
  }, []);

  useEffect(() => {
    import('./chemistry/controller.js');
  }, []);

  useEffect(() => {
    let frame = 0;
    let mutationObserver = null;
    let resizeObserver = null;
    let settleTimer = 0;
    let activeId = '';
    const disconnectWatchers = () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      mutationObserver = null;
      resizeObserver = null;
      window.clearTimeout(settleTimer);
      settleTimer = 0;
    };
    const alignActiveHash = () => {
      if (!activeId || viewFromHash() !== activeId) return;
      const target = document.getElementById(activeId);
      if (!target) return;
      target.scrollIntoView({block:'start',behavior:'instant'});
      window.clearTimeout(settleTimer);
      settleTimer = 0;
      if (!document.querySelector('.lab-loading')) {
        settleTimer = window.setTimeout(() => {
          const settledTarget = document.getElementById(activeId);
          settledTarget?.scrollIntoView({block:'start',behavior:'instant'});
          disconnectWatchers();
        }, 350);
      }
    };
    const scheduleAlignment = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(alignActiveHash);
    };
    const scrollToHash = () => {
      disconnectWatchers();
      if (!window.location.hash) return;
      activeId = viewFromHash();
      const target = document.getElementById(activeId);
      if (!target) return;
      target.scrollIntoView({block:'start',behavior:'instant'});
      const shell = document.querySelector('.app-shell');
      if (!shell) return;
      mutationObserver = new MutationObserver(scheduleAlignment);
      mutationObserver.observe(shell, {childList:true,subtree:true});
      resizeObserver = new ResizeObserver(scheduleAlignment);
      resizeObserver.observe(shell);
      scheduleAlignment();
    };
    const scheduleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scrollToHash);
    };
    scheduleScroll();
    window.addEventListener('hashchange', scheduleScroll);
    return () => {
      cancelAnimationFrame(frame);
      disconnectWatchers();
      window.removeEventListener('hashchange', scheduleScroll);
    };
  }, []);

  return (
    <>
      <div className="app-shell">
        <Header />
        <AppView id="top" activeView={activeView}><Hero /></AppView>
        <AppView id="curriculum" activeView={activeView}><CurriculumAtlas /></AppView>
        <AppView id="atomicStructureLab" activeView={activeView}><Suspense fallback={<LabFallback id="atomicStructureLab" label="Atomic signal observatory"/>}><AtomicStructureLab /></Suspense></AppView>
        <AppView id="nuclearChemistryLab" activeView={activeView}><Suspense fallback={<LabFallback id="nuclearChemistryLab" label="Nuclear chemistry observatory"/>}><NuclearChemistryLab /></Suspense></AppView>
        <AppView id="laboratory" activeView={activeView}><LabWorkspace /></AppView>
        <AppView id="molecularGeometryLab" activeView={activeView}><Suspense fallback={<LabFallback id="molecularGeometryLab" label="Molecular geometry wind tunnel"/>}><MolecularGeometryLab /></Suspense></AppView>
        <AppView id="molecularOrbitalLab" activeView={activeView}><Suspense fallback={<LabFallback id="molecularOrbitalLab" label="Molecular orbital bonding interferometer"/>}><MolecularOrbitalLab /></Suspense></AppView>
        <AppView id="intermolecularLab" activeView={activeView}><Suspense fallback={<LabFallback id="intermolecularLab" label="Molecular interaction observatory"/>}><IntermolecularLab /></Suspense></AppView>
        <AppView id="stoichiometryLab" activeView={activeView}><Suspense fallback={<LabFallback id="stoichiometryLab" label="Stoichiometry foundry"/>}><StoichiometryLab /></Suspense></AppView>
        <AppView id="solutionLab" activeView={activeView}><SolutionLab /></AppView>
        <AppView id="chemicalEquilibriumLab" activeView={activeView}><Suspense fallback={<LabFallback id="chemicalEquilibriumLab" label="Reaction quotient observatory"/>}><ChemicalEquilibriumLab /></Suspense></AppView>
        <AppView id="energyLab" activeView={activeView}><EnergyLab /></AppView>
        <AppView id="thermochemistryLab" activeView={activeView}><Suspense fallback={<LabFallback id="thermochemistryLab" label="Thermochemical cycle and calorimetry studio"/>}><ThermochemistryLab /></Suspense></AppView>
        <AppView id="solubilityLab" activeView={activeView}><Suspense fallback={<LabFallback id="solubilityLab" label="Solubility and selective precipitation studio"/>}><SolubilityLab /></Suspense></AppView>
        <AppView id="electrochemistryLab" activeView={activeView}><Suspense fallback={<LabFallback id="electrochemistryLab" label="Electrochemical cells"/>}><ElectrochemistryLab /></Suspense></AppView>
        <AppView id="gasPhaseLab" activeView={activeView}><Suspense fallback={<LabFallback id="gasPhaseLab" label="Gas & phase"/>}><GasPhaseLab /></Suspense></AppView>
        <AppView id="binaryVleLab" activeView={activeView}><Suspense fallback={<LabFallback id="binaryVleLab" label="Binary equilibrium navigator"/>}><BinaryVleLab /></Suspense></AppView>
        <AppView id="nonidealThermodynamicsLab" activeView={activeView}><Suspense fallback={<LabFallback id="nonidealThermodynamicsLab" label="Nonideal thermodynamics observatory"/>}><NonidealThermodynamicsLab /></Suspense></AppView>
        <AppView id="spectroscopyLab" activeView={activeView}><SpectroscopyLab /></AppView>
        <AppView id="infraredEvidenceLab" activeView={activeView}><Suspense fallback={<LabFallback id="infraredEvidenceLab" label="Infrared evidence studio"/>}><InfraredEvidenceLab /></Suspense></AppView>
        <AppView id="orthogonalEvidenceLab" activeView={activeView}><Suspense fallback={<LabFallback id="orthogonalEvidenceLab" label="Orthogonal structure evidence studio"/>}><OrthogonalEvidenceLab /></Suspense></AppView>
        <AppView id="measurementEvidenceLab" activeView={activeView}><Suspense fallback={<LabFallback id="measurementEvidenceLab" label="Measurement evidence bench"/>}><MeasurementEvidenceLab /></Suspense></AppView>
        <AppView id="chromatographyLab" activeView={activeView}><Suspense fallback={<LabFallback id="chromatographyLab" label="Chromatography control room"/>}><ChromatographyLab /></Suspense></AppView>
        <AppView id="functionalGroupLab" activeView={activeView}><Suspense fallback={<LabFallback id="functionalGroupLab" label="Functional group signal board"/>}><FunctionalGroupLab /></Suspense></AppView>
        <AppView id="biomoleculeLab" activeView={activeView}><Suspense fallback={<LabFallback id="biomoleculeLab" label="Biomolecular assembly"/>}><BiomolecularStudio /></Suspense></AppView>
        <AppView id="enzymeLab" activeView={activeView}><EnzymeKineticsLab /></AppView>
        <AppView id="mechanismLab" activeView={activeView}><MechanismLab /></AppView>
        <AppView id="stereochemistryLab" activeView={activeView}><Suspense fallback={<LabFallback id="stereochemistryLab" label="Stereochemical navigation studio"/>}><StereochemistryLab /></Suspense></AppView>
        <AppView id="stereochemicalReactionLab" activeView={activeView}><Suspense fallback={<LabFallback id="stereochemicalReactionLab" label="Stereochemical reaction theatre"/>}><StereochemicalReactionLab /></Suspense></AppView>
        <AppView id="coordinationLab" activeView={activeView}><Suspense fallback={<LabFallback id="coordinationLab" label="Coordination field"/>}><CoordinationFieldLab /></Suspense></AppView>
        <AppView id="crystalLab" activeView={activeView}><Suspense fallback={<LabFallback id="crystalLab" label="Crystal lattice"/>}><CrystalLatticeLab /></Suspense></AppView>
        <AppView id="electronicBandLab" activeView={activeView}><Suspense fallback={<LabFallback id="electronicBandLab" label="Electronic band and metallic bonding observatory"/>}><ElectronicBandLab /></Suspense></AppView>
        <AppView id="polymerPopulationLab" activeView={activeView}><Suspense fallback={<LabFallback id="polymerPopulationLab" label="Polymer population studio"/>}><PolymerPopulationLab /></Suspense></AppView>
        <AppView id="reactionLab" activeView={activeView}><ReactionLab /></AppView>
        <AppView id="balanceLab" activeView={activeView}><EquationSections /></AppView>
        <Footer />
      </div>
      <Modals />
    </>
  );
}
