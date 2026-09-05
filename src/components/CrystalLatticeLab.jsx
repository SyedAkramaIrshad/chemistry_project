import { useMemo, useState } from 'react';
import { CRYSTAL_STRUCTURE_LIST, CRYSTAL_STRUCTURES } from '../data/crystalStructures.js';
import {
  applyPointDefect, calculateCrystalCell, calculateCubicDiffraction, createTeachingSupercell,
  planeCubeIntersections, projectCrystalPoint, summarizePointDefects,
} from '../chemistry/crystalLattice.js';
import { MODEL_PASSPORTS, SCIENCE_SOURCES } from '../data/scienceSources.js';

let crystalActivityId = 0;
const activity = (kind, title, detail) => ({ id: ++crystalActivityId, kind, title, detail });
const keyActivate = (event, callback) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); callback(); } };
const number = (value, digits = 3) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : '—';
const signedIndices = ({ h, k, l }) => `(${h} ${k} ${l})`;
const fractionLabel = (value) => value === 1 ? '1' : value === 0.5 ? '1/2' : value === 0.125 ? '1/8' : number(value, 3);

const cubeCorners = [
  { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 },
];
const cubeEdges = [];
for (let i = 0; i < cubeCorners.length; i += 1) for (let j = i + 1; j < cubeCorners.length; j += 1) {
  if (Number(cubeCorners[i].x !== cubeCorners[j].x) + Number(cubeCorners[i].y !== cubeCorners[j].y) + Number(cubeCorners[i].z !== cubeCorners[j].z) === 1) cubeEdges.push([i, j]);
}

function StructureShelf({ structure, onChoose }) {
  return <aside className="crystal-structure-shelf crystal-panel">
    <div className="crystal-panel-heading"><span>Conventional cell library</span><strong>Choose how the cube is centred</strong></div>
    <div className="crystal-structure-buttons">{CRYSTAL_STRUCTURE_LIST.map((item) => <button type="button" className={item.id === structure.id ? 'active' : ''} key={item.id} onClick={() => onChoose(item)}>
      <span>{item.shortName}</span><div><strong>{item.name}</strong><small>{item.centring}</small></div><b>{item.atomsPerCell} Z</b>
    </button>)}</div>
    <div className="crystal-study-path"><span>Read the solid in four passes</span><ol><li><i>1</i><b>Count</b> shared sites.</li><li><i>2</i><b>Connect</b> contact geometry.</li><li><i>3</i><b>Probe</b> one reflection.</li><li><i>4</i><b>Break</b> perfect periodicity.</li></ol></div>
    <div className="crystal-shelf-boundary"><span>Reference, not identity</span><p>SC, BCC, and FCC describe centring geometry. Selecting one does not identify a real element or prove that structure is stable.</p></div>
  </aside>;
}

function CrystalTheatre({ structure, angle, setAngle, indices, diffraction, showPlane, setShowPlane }) {
  const view = { angleDeg: angle, tiltDeg: 24, scale: 300, centerX: 450, centerY: 255 };
  const projectedCorners = cubeCorners.map((point) => projectCrystalPoint(point, view));
  const sites = structure.displaySites.map((site) => ({ ...site, projected: projectCrystalPoint(site, view) })).sort((a, b) => a.projected.depth - b.projected.depth);
  const plane = planeCubeIntersections(indices.h, indices.k, indices.l).map((point) => projectCrystalPoint(point, view));
  const planePoints = plane.map((point) => `${point.x},${point.y}`).join(' ');
  const tone = diffraction?.status || 'invalid';
  return <section className={`crystal-theatre crystal-panel ${tone}`}>
    <div className="crystal-theatre-top"><span><i/> periodic-cell theatre</span><b>{structure.centring} · {signedIndices(indices)}</b></div>
    <svg viewBox="0 0 900 520" className="crystal-theatre-svg" role="img" aria-label={`${structure.name} conventional cell. ${structure.displaySites.length} displayed sites. Plane ${signedIndices(indices)} is ${showPlane ? 'visible' : 'hidden'}.`}>
      <defs>
        <radialGradient id="crystalHost" cx="32%" cy="25%"><stop offset="0" stopColor="#e8fdff"/><stop offset=".28" stopColor="#69e7ff"/><stop offset="1" stopColor="#18779a"/></radialGradient>
        <radialGradient id="crystalCore" cx="32%" cy="25%"><stop offset="0" stopColor="#fff7c9"/><stop offset=".3" stopColor="#ffd166"/><stop offset="1" stopColor="#a36b0d"/></radialGradient>
        <radialGradient id="crystalFace" cx="32%" cy="25%"><stop offset="0" stopColor="#eeeaff"/><stop offset=".3" stopColor="#8e8aff"/><stop offset="1" stopColor="#4945a8"/></radialGradient>
        <filter id="crystalGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <g className="crystal-atmosphere"><circle cx="450" cy="255" r="205"/><circle cx="450" cy="255" r="145"/><path d="M145 255 H755 M450 40 V470"/></g>
      {showPlane && plane.length >= 3 && <g className={`crystal-plane ${tone}`}><polygon points={planePoints}/><text x={plane.reduce((sum, point) => sum + point.x, 0) / plane.length} y={plane.reduce((sum, point) => sum + point.y, 0) / plane.length} textAnchor="middle">{signedIndices(indices)} plane</text></g>}
      <g className="crystal-cube-edges">{cubeEdges.map(([a, b], index) => <line key={index} x1={projectedCorners[a].x} y1={projectedCorners[a].y} x2={projectedCorners[b].x} y2={projectedCorners[b].y}/>)}</g>
      <g className="crystal-sites">{sites.map((site) => <g key={site.id} className={`crystal-site ${site.kind}`} transform={`translate(${site.projected.x} ${site.projected.y})`} style={{ opacity: 0.72 + (site.projected.depth + 0.9) * 0.14 }}>
        <circle className="site-shadow" cy="8" r={site.kind === 'body' ? 35 : 30}/><circle className="site-sphere" r={site.kind === 'body' ? 32 : site.kind === 'face' ? 27 : 29}/><circle className="site-shine" cx="-9" cy="-10" r="6"/><text y="5" textAnchor="middle">{site.kind === 'corner' ? '⅛' : site.kind === 'face' ? '½' : '1'}</text>
      </g>)}</g>
      <g className="crystal-axis"><path d="M90 435 h52 M90 435 v-52 M90 435 l-32 26"/><text x="149" y="440">a</text><text x="86" y="375">b</text><text x="48" y="473">c</text></g>
      <text className="crystal-theatre-caption" x="450" y="500" textAnchor="middle">displayed conventional cell · rotate the view, not the crystal model</text>
    </svg>
    <div className="crystal-view-controls"><label><span>View angle</span><input type="range" min="-45" max="225" step="1" value={angle} onChange={(event) => setAngle(Number(event.target.value))}/><b>{angle}°</b></label><button type="button" onClick={() => setShowPlane((value) => !value)}>{showPlane ? 'Hide lattice plane' : 'Show lattice plane'}</button></div>
  </section>;
}

function CellAudit({ structure, cell, latticeParameterA, setLatticeParameterA, molarMassGmol, setMolarMassGmol }) {
  return <aside className="crystal-cell-audit crystal-panel">
    <div className="crystal-panel-heading"><span>Cell audit</span><strong>Account for one repeating cube</strong></div>
    <div className="crystal-sharing-ledger">{structure.sharing.map((row) => <div key={row.site}><span>{row.site}</span><strong>{row.count} × {fractionLabel(row.fraction)}</strong><b>= {number(row.contribution, 2)}</b></div>)}<div className="total"><span>Sites per cell, Z</span><strong>{structure.sharing.map((row) => number(row.contribution, 2)).join(' + ')}</strong><b>= {structure.atomsPerCell}</b></div></div>
    <div className="crystal-input-pair"><label><span>Lattice parameter a</span><div><input type="number" min="0.1" step="0.01" value={latticeParameterA} onChange={(event) => setLatticeParameterA(Number(event.target.value))}/><b>Å</b></div></label><label><span>Molar mass</span><div><input type="number" min="0.1" step="0.1" value={molarMassGmol} onChange={(event) => setMolarMassGmol(Number(event.target.value))}/><b>g mol⁻¹</b></div></label></div>
    {cell.valid ? <>
      <div className="crystal-metric-hero"><div><span>Ideal density</span><strong>{number(cell.densityGcm3, 3)}</strong><b>g cm⁻³</b></div><p>ρ = ZM / (N<sub>A</sub>a³)</p></div>
      <div className="crystal-metric-grid"><div><span>Coordination</span><strong>{cell.coordinationNumber}</strong><small>nearest sites</small></div><div><span>Packing</span><strong>{number(cell.packingFraction * 100, 2)}%</strong><small>hard spheres</small></div><div><span>Nearest neighbour</span><strong>{number(cell.nearestNeighborA, 3)} Å</strong><small>geometry</small></div><div><span>Contact radius</span><strong>{number(cell.hardSphereRadiusA, 3)} Å</strong><small>ideal sphere</small></div><div><span>Cell volume</span><strong>{number(cell.cellVolumeA3, 3)} Å³</strong><small>a³</small></div><div><span>Z check</span><strong>{number(cell.sharingTotal, 2)}</strong><small>shared total</small></div></div>
    </> : <div className="crystal-invalid-result"><span>Calculation held</span><p>{cell.reason}</p></div>}
    <p className="crystal-audit-note">These are ideal monatomic conventional-cell quantities. The defect microscope does not silently rewrite them.</p>
  </aside>;
}

function DiffractionGraphic({ diffraction }) {
  const possible = diffraction?.valid && diffraction.geometryPossible;
  const theta = possible ? diffraction.thetaDeg : 35;
  const twoTheta = possible ? Math.min(diffraction.twoThetaDeg, 155) : 70;
  const center = { x: 330, y: 185 }, length = 230, radians = -twoTheta * Math.PI / 180;
  const detector = { x: center.x + Math.cos(radians) * length, y: center.y + Math.sin(radians) * length };
  return <svg viewBox="0 0 650 340" className={`diffraction-graphic ${diffraction?.status || 'invalid'}`} role="img" aria-label={diffraction?.reason || 'Diffraction geometry unavailable'}>
    <defs><marker id="rayArrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9 Z"/></marker></defs>
    <g className="diffraction-rings"><circle cx={center.x} cy={center.y} r="125"/><circle cx={center.x} cy={center.y} r="185"/></g>
    <g className="diffraction-planes" transform={`rotate(${-theta} ${center.x} ${center.y})`}>{[-24,-12,0,12,24].map((offset) => <line key={offset} x1="170" y1={center.y + offset} x2="490" y2={center.y + offset}/>)}</g>
    <path className="incoming-ray" d={`M35 ${center.y} H${center.x}`} markerEnd="url(#rayArrow)"/>
    {possible && <path className="outgoing-ray" d={`M${center.x} ${center.y} L${detector.x} ${detector.y}`} markerEnd="url(#rayArrow)"/>}
    <g className={`diffraction-detector ${possible ? '' : 'missing'}`} transform={`translate(${detector.x} ${detector.y}) rotate(${-twoTheta})`}><rect x="-8" y="-35" width="16" height="70" rx="5"/><circle cx="0" cy="0" r="3"/></g>
    <path className="theta-arc" d={`M${center.x + 74} ${center.y} A74 74 0 0 0 ${center.x + 74 * Math.cos(-theta * Math.PI / 180)} ${center.y + 74 * Math.sin(-theta * Math.PI / 180)}`}/>
    <text x={center.x + 82} y={center.y - 18}>θ {possible ? number(theta, 2) : '—'}°</text><text x="40" y={center.y - 17}>incident λ</text><text x={detector.x - 16} y={detector.y - 47} textAnchor="middle">detector · 2θ</text>
  </svg>;
}

function DiffractionBench({ structure, latticeParameterA, indices, setIndices, wavelengthA, setWavelengthA, order, setOrder, diffraction, onInspect }) {
  const updateIndex = (name, value) => setIndices((current) => ({ ...current, [name]: Number(value) }));
  return <section className="crystal-diffraction crystal-panel">
    <div className="crystal-panel-heading"><span>Reciprocal-space probe</span><strong>Ask whether one reflection can appear</strong></div>
    <div className="diffraction-layout"><div className="diffraction-controls">
      <div className="miller-inputs"><span>Signed Miller indices</span><div>{['h','k','l'].map((name) => <label key={name}><b>{name}</b><input type="number" step="1" min="-6" max="6" value={indices[name]} onChange={(event) => updateIndex(name, event.target.value)}/></label>)}</div></div>
      <label className="diffraction-number"><span>Wavelength λ</span><div><input type="number" min="0.01" step="0.01" value={wavelengthA} onChange={(event) => setWavelengthA(Number(event.target.value))}/><b>Å</b></div></label>
      <label className="diffraction-number"><span>Order n</span><div><input type="number" min="1" max="4" step="1" value={order} onChange={(event) => setOrder(Number(event.target.value))}/><b>integer</b></div></label>
      <button type="button" className="btn primary crystal-inspect-reflection" onClick={onInspect}>Inspect this reflection</button>
      <div className="reflection-rule"><span>{structure.shortName} centring rule</span><p>{structure.reflectionRule}</p></div>
    </div><DiffractionGraphic diffraction={diffraction}/><div className={`diffraction-result ${diffraction?.status || 'invalid'}`}>
      {diffraction?.valid ? <><span>{diffraction.status === 'allowed' ? 'Allowed reflection' : diffraction.status === 'extinct' ? 'Systematic absence' : 'No real Bragg angle'}</span><h3>{signedIndices(indices)}</h3><p>{diffraction.reason}</p><div className="diffraction-equations"><code>d = a / √(h²+k²+l²)</code><strong>{number(diffraction.dA, 4)} Å</strong><code>nλ = 2d sin θ</code><strong>{diffraction.geometryPossible ? `${number(diffraction.thetaDeg, 3)}° θ · ${number(diffraction.twoThetaDeg, 3)}° 2θ` : `sin θ = ${number(diffraction.sinTheta, 3)}`}</strong></div></> : <><span>Input held</span><h3>{signedIndices(indices)}</h3><p>{diffraction?.reason}</p></>}
      <small>Bragg geometry is necessary but not sufficient for intensity. This panel applies only the declared monatomic centring rule.</small>
    </div></div>
  </section>;
}

function DefectMicroscope({ supercell, mode, setMode, onSite, onClear, feedback }) {
  const summary = summarizePointDefects(supercell);
  const allCoordinates = [...supercell.hostSites, ...supercell.interstitialSites];
  const maxima = allCoordinates.reduce((result, site) => ({ x: Math.max(result.x, site.x), y: Math.max(result.y, site.y), z: Math.max(result.z, site.z) }), { x: 1, y: 1, z: 1 });
  const normalizeSite = (site) => ({ x: site.x / maxima.x, y: site.y / maxima.y, z: site.z / maxima.z });
  const view = { angleDeg: 42, tiltDeg: 25, scale: 290, centerX: 450, centerY: 230 };
  const hosts = supercell.hostSites.map((site) => ({ ...site, projected: projectCrystalPoint(normalizeSite(site), view), defect: supercell.defects[site.id] })).sort((a, b) => a.projected.depth - b.projected.depth);
  const gaps = supercell.interstitialSites.map((site) => ({ ...site, projected: projectCrystalPoint(normalizeSite(site), view), defect: supercell.defects[site.id] })).sort((a, b) => a.projected.depth - b.projected.depth);
  const modeCopy = { vacancy: 'Remove one displayed host atom', substitution: 'Replace one displayed host atom', interstitial: 'Add one atom at a marked gap', restore: 'Restore one edited site' };
  return <section className="crystal-defects crystal-panel">
    <div className="crystal-panel-heading"><span>Finite defect microscope</span><strong>Break periodicity only where you click</strong></div>
    <div className="defect-mode-bar">{Object.keys(modeCopy).map((item) => <button type="button" className={`${item} ${mode === item ? 'active' : ''}`} key={item} onClick={() => setMode(item)}><i/><span>{item}</span><small>{modeCopy[item]}</small></button>)}</div>
    <div className="defect-microscope-layout"><div className="defect-stage"><div className="defect-stage-top"><span>{CRYSTAL_STRUCTURES[supercell.structureId].shortName} finite teaching supercell</span><b>{summary.renderedAtomCount} rendered atoms</b></div><svg viewBox="0 0 900 460" role="img" aria-label={`${summary.hostSiteCount} host sites, ${summary.vacancyCount} vacancies, ${summary.substitutionCount} substitutions, ${summary.interstitialCount} interstitials.`}>
      <g className="defect-field">{[110,230,350,470,590,710,830].map((x) => <line key={x} x1={x} x2={x - 130} y1="60" y2="405"/>)}{[80,160,240,320,400].map((y) => <line key={y} x1="85" x2="815" y1={y} y2={y}/>)}</g>
      <g className="defect-host-sites">{hosts.map((site) => {
        const vacancy = site.defect?.mode === 'vacancy', substitution = site.defect?.mode === 'substitution';
        return <g key={site.id} role="button" tabIndex="0" aria-label={`${vacancy ? 'Vacancy' : substitution ? 'Substitutional atom' : 'Host atom'} at finite site ${site.id}`} className={`defect-site host ${vacancy ? 'vacancy' : substitution ? 'substitution' : ''}`} transform={`translate(${site.projected.x} ${site.projected.y})`} onClick={() => onSite(site.id)} onKeyDown={(event) => keyActivate(event, () => onSite(site.id))}><circle className="defect-hit" r="22"/><circle className="defect-atom" r={substitution ? 15 : 12}/>{vacancy && <><circle className="vacancy-ring" r="16"/><path d="M-7 -7 L7 7 M7 -7 L-7 7"/></>}<circle className="defect-shine" cx="-4" cy="-5" r="3"/></g>;
      })}</g>
      <g className={`defect-gap-sites ${mode === 'interstitial' || mode === 'restore' ? 'active' : ''}`}>{gaps.map((site) => <g key={site.id} role="button" tabIndex="0" aria-label={`${site.defect ? 'Interstitial atom' : 'Illustrative interstitial target'} at ${site.id}`} className={`defect-site gap ${site.defect ? 'occupied' : ''}`} transform={`translate(${site.projected.x} ${site.projected.y})`} onClick={() => onSite(site.id)} onKeyDown={(event) => keyActivate(event, () => onSite(site.id))}><circle className="defect-hit" r="20"/><circle className="gap-ring" r="10"/><path d="M-5 0 H5 M0 -5 V5"/>{site.defect && <circle className="interstitial-atom" r="11"/>}</g>)}</g>
      <text className="defect-stage-caption" x="450" y="442" textAnchor="middle">finite illustration · click targets are not equilibrium crystallographic sites</text>
    </svg></div><aside className="defect-readout"><div className={`defect-feedback ${feedback.kind}`} aria-live="polite"><span>{feedback.title}</span><p>{feedback.detail}</p></div><div className="defect-counts"><div><i className="host"/><span>Host sites</span><strong>{summary.hostSiteCount}</strong></div><div><i className="vacancy"/><span>Vacancies</span><strong>{summary.vacancyCount}</strong></div><div><i className="substitution"/><span>Substitutions</span><strong>{summary.substitutionCount}</strong></div><div><i className="interstitial"/><span>Interstitials</span><strong>{summary.interstitialCount}</strong></div></div><button type="button" className="btn ghost" disabled={!Object.keys(supercell.defects).length} onClick={onClear}>Clear all defect edits</button><div className="defect-boundary"><span>What did not change</span><p>Z, packing, ideal density, and reflection rules above still describe the perfect periodic reference. A finite drawing cannot predict a bulk property change.</p></div></aside></div>
  </section>;
}

function CrystalTrace({ attempts }) {
  return <aside className="crystal-trace crystal-panel"><div className="crystal-panel-heading"><span>Learning trace</span><strong>Every test leaves evidence</strong></div><div className="crystal-attempts">{attempts.map((entry) => <div className={entry.kind} key={entry.id}><i/><span>{entry.kind}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}</div><div className="crystal-teacher-prompts"><span>Teacher lens</span><p>Ask: Why can Bragg geometry be possible while a monatomic FCC reflection is absent? Why can a visible vacancy not justify recalculating the bulk density?</p></div></aside>;
}

function CrystalPassport() {
  const passport = MODEL_PASSPORTS.crystalLattice;
  return <aside className="crystal-passport crystal-panel"><div className="crystal-panel-heading"><span>Model passport</span><strong>{passport.name}</strong></div><div className="crystal-passport-verdict"><i/>{passport.resultKind}</div><p>{passport.inputProvenance}</p><div className="crystal-passport-groups"><div><span>Included</span>{passport.includes.map((item) => <b key={item}>{item}</b>)}</div><div className="excluded"><span>Not included</span>{passport.excludes.map((item) => <b key={item}>{item}</b>)}</div></div><p>{passport.dataStatement}</p><div className="crystal-formulas"><span>Equations in use</span><code>Z = Σ(site count × share)</code><code>ρ = ZM / (N<sub>A</sub>a³)</code><code>d<sub>hkl</sub> = a / √(h²+k²+l²)</code><code>nλ = 2d sin θ</code></div><div className="crystal-sources"><span>Reference basis</span>{passport.sources.map((sourceId) => { const source = SCIENCE_SOURCES[sourceId]; return <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><strong>{source.name}</strong><small>{source.role}</small><b aria-hidden="true">↗</b></a>; })}</div></aside>;
}

export default function CrystalLatticeLab() {
  const [structureId, setStructureId] = useState('fcc');
  const [angle, setAngle] = useState(38), [showPlane, setShowPlane] = useState(true);
  const [latticeParameterA, setLatticeParameterA] = useState(4.05), [molarMassGmol, setMolarMassGmol] = useState(63.5);
  const [indices, setIndices] = useState({ h: 1, k: 1, l: 1 }), [wavelengthA, setWavelengthA] = useState(1.54), [order, setOrder] = useState(1);
  const [defectMode, setDefectMode] = useState('vacancy'), [supercell, setSupercell] = useState(() => createTeachingSupercell('fcc'));
  const [defectFeedback, setDefectFeedback] = useState({ kind: 'ready', title: 'Choose a defect mode, then a site', detail: 'Only your selected finite-supercell site will change.' });
  const [attempts, setAttempts] = useState([activity('load', 'FCC reference loaded', 'The perfect periodic reference and a separate finite defect picture are ready.')]);
  const structure = CRYSTAL_STRUCTURES[structureId];
  const cell = useMemo(() => calculateCrystalCell({ structureId, latticeParameterA, molarMassGmol }), [structureId, latticeParameterA, molarMassGmol]);
  const diffraction = useMemo(() => calculateCubicDiffraction({ structureId, latticeParameterA, ...indices, wavelengthA, order }), [structureId, latticeParameterA, indices, wavelengthA, order]);
  const addAttempt = (kind, title, detail) => setAttempts((current) => [activity(kind, title, detail), ...current].slice(0, 16));
  const chooseStructure = (next) => {
    if (next.id === structureId) {
      const detail = `${next.shortName} is already active. Numeric inputs and finite defect edits were preserved.`;
      setDefectFeedback({ kind: 'ready', title: `${next.shortName} already selected`, detail });
      addAttempt('inspect', 'Structure selection unchanged', detail);
      return;
    }
    setStructureId(next.id); setSupercell(createTeachingSupercell(next.id));
    setDefectFeedback({ kind: 'reset', title: `${next.shortName} finite view reset`, detail: 'Defect edits were cleared because the lattice basis changed. Numeric inputs were preserved.' });
    setAttempts([activity('load', `${next.shortName} reference loaded`, `a, molar mass, wavelength, order, and ${signedIndices(indices)} were preserved; finite defects were cleared explicitly.`)]);
  };
  const inspectReflection = () => {
    const title = !diffraction.valid ? 'Reflection input rejected' : diffraction.status === 'allowed' ? 'Reflection permitted' : diffraction.status === 'extinct' ? 'Reflection systematically absent' : 'Bragg geometry has no real solution';
    addAttempt(diffraction.status || 'blocked', `${signedIndices(indices)} · ${title}`, diffraction.reason);
  };
  const editDefect = (siteId) => {
    const evaluation = applyPointDefect(supercell, { mode: defectMode, siteId });
    if (!evaluation.allowed) { setDefectFeedback({ kind: 'blocked', title: 'Defect edit blocked', detail: evaluation.reason }); addAttempt('blocked', 'Finite site unchanged', evaluation.reason); return; }
    setSupercell(evaluation.state); setDefectFeedback({ kind: evaluation.summary.vacancyCount + evaluation.summary.substitutionCount + evaluation.summary.interstitialCount ? 'changed' : 'reset', title: `${defectMode[0].toUpperCase() + defectMode.slice(1)} edit applied`, detail: evaluation.reason }); addAttempt('defect', `${defectMode} site action`, evaluation.reason);
  };
  const clearDefects = () => {
    const evaluation = applyPointDefect(supercell, { mode: 'clear' }); setSupercell(evaluation.state);
    setDefectFeedback({ kind: 'reset', title: 'Finite defect picture cleared', detail: evaluation.reason }); addAttempt('reset', 'All defect edits cleared', evaluation.reason);
  };
  return <section className="crystal-lab" id="crystalLab" aria-labelledby="crystalLabTitle">
    <header className="crystal-header"><div><p className="section-code">29 / Materials crystal structure</p><h2 id="crystalLabTitle">A crystal is not one cube. It is the rule that repeats.</h2><p>Count what the cell shares, rotate its periodic geometry, interrogate a lattice plane, and break one finite site yourself—without pretending the picture predicts a real material.</p></div><div className="crystal-condition-stamp"><span>Local periodic model</span><strong>Three monatomic cubic references</strong><small>Ideal geometry · explicit defects · no property oracle</small></div></header>
    <div className="crystal-bench"><StructureShelf structure={structure} onChoose={chooseStructure}/><CrystalTheatre structure={structure} angle={angle} setAngle={setAngle} indices={indices} diffraction={diffraction} showPlane={showPlane} setShowPlane={setShowPlane}/><CellAudit structure={structure} cell={cell} latticeParameterA={latticeParameterA} setLatticeParameterA={setLatticeParameterA} molarMassGmol={molarMassGmol} setMolarMassGmol={setMolarMassGmol}/><DiffractionBench structure={structure} latticeParameterA={latticeParameterA} indices={indices} setIndices={setIndices} wavelengthA={wavelengthA} setWavelengthA={setWavelengthA} order={order} setOrder={setOrder} diffraction={diffraction} onInspect={inspectReflection}/><DefectMicroscope supercell={supercell} mode={defectMode} setMode={setDefectMode} onSite={editDefect} onClear={clearDefects} feedback={defectFeedback}/><CrystalTrace attempts={attempts}/><CrystalPassport/></div>
  </section>;
}
