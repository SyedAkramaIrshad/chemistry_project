const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

export const METAL_ION_PRESETS = deepFreeze([
  { id: 'ti3', symbol: 'Ti', label: 'Ti³⁺', name: 'titanium(III)', group: 4, oxidation: 3, dCount: 1 },
  { id: 'v3', symbol: 'V', label: 'V³⁺', name: 'vanadium(III)', group: 5, oxidation: 3, dCount: 2 },
  { id: 'cr3', symbol: 'Cr', label: 'Cr³⁺', name: 'chromium(III)', group: 6, oxidation: 3, dCount: 3 },
  { id: 'mn2', symbol: 'Mn', label: 'Mn²⁺', name: 'manganese(II)', group: 7, oxidation: 2, dCount: 5 },
  { id: 'fe2', symbol: 'Fe', label: 'Fe²⁺', name: 'iron(II)', group: 8, oxidation: 2, dCount: 6 },
  { id: 'fe3', symbol: 'Fe', label: 'Fe³⁺', name: 'iron(III)', group: 8, oxidation: 3, dCount: 5 },
  { id: 'co2', symbol: 'Co', label: 'Co²⁺', name: 'cobalt(II)', group: 9, oxidation: 2, dCount: 7 },
  { id: 'co3', symbol: 'Co', label: 'Co³⁺', name: 'cobalt(III)', group: 9, oxidation: 3, dCount: 6 },
  { id: 'ni2', symbol: 'Ni', label: 'Ni²⁺', name: 'nickel(II)', group: 10, oxidation: 2, dCount: 8 },
  { id: 'cu2', symbol: 'Cu', label: 'Cu²⁺', name: 'copper(II)', group: 11, oxidation: 2, dCount: 9 },
  { id: 'zn2', symbol: 'Zn', label: 'Zn²⁺', name: 'zinc(II)', group: 12, oxidation: 2, dCount: 10 },
]);

export const ORBITAL_VISUALS = deepFreeze({
  dxy: { id: 'dxy', label: 'dxy', description: 'Four lobes lie between the x and y ligand axes.', kind: 'four', rotation: 45, plane: 'xy' },
  dxz: { id: 'dxz', label: 'dxz', description: 'Four lobes lie between the x and z ligand axes.', kind: 'four', rotation: -28, plane: 'xz' },
  dyz: { id: 'dyz', label: 'dyz', description: 'Four lobes lie between the y and z ligand axes.', kind: 'four', rotation: 28, plane: 'yz' },
  dz2: { id: 'dz2', label: 'dz²', description: 'Two axial lobes and an equatorial torus point along z.', kind: 'z2', rotation: 0, plane: 'z' },
  dx2y2: { id: 'dx2y2', label: 'dx²−y²', description: 'Four lobes point directly along the x and y ligand axes.', kind: 'four', rotation: 0, plane: 'xy' },
});

const ligandPositions = {
  octahedral: [
    { id: 'x+', x: 0.87, y: 0.5, depth: 0.1, axis: '+x' }, { id: 'x-', x: 0.13, y: 0.5, depth: -0.1, axis: '−x' },
    { id: 'y+', x: 0.5, y: 0.14, depth: 0.2, axis: '+y' }, { id: 'y-', x: 0.5, y: 0.86, depth: -0.2, axis: '−y' },
    { id: 'z+', x: 0.64, y: 0.31, depth: 0.8, axis: '+z' }, { id: 'z-', x: 0.36, y: 0.69, depth: -0.8, axis: '−z' },
  ],
  tetrahedral: [
    { id: 't1', x: 0.24, y: 0.25, depth: 0.65, axis: 'tetrahedral' }, { id: 't2', x: 0.76, y: 0.25, depth: -0.65, axis: 'tetrahedral' },
    { id: 't3', x: 0.25, y: 0.77, depth: -0.45, axis: 'tetrahedral' }, { id: 't4', x: 0.75, y: 0.77, depth: 0.45, axis: 'tetrahedral' },
  ],
  squarePlanar: [
    { id: 'spx+', x: 0.87, y: 0.5, depth: 0, axis: '+x' }, { id: 'spx-', x: 0.13, y: 0.5, depth: 0, axis: '−x' },
    { id: 'spy+', x: 0.5, y: 0.14, depth: 0, axis: '+y' }, { id: 'spy-', x: 0.5, y: 0.86, depth: 0, axis: '−y' },
  ],
};

export const COORDINATION_GEOMETRIES = deepFreeze({
  octahedral: {
    id: 'octahedral', shortName: 'Oh', name: 'Octahedral', coordinationNumber: 6,
    description: 'Six ideal donor positions lie on the positive and negative Cartesian axes.',
    quantitativeStatus: 'Ideal barycentric octahedral coefficients', normalizedOnly: false,
    ligands: ligandPositions.octahedral,
    orbitals: [
      { id: 'dxy', group: 't2g', coefficient: -0.4 }, { id: 'dxz', group: 't2g', coefficient: -0.4 }, { id: 'dyz', group: 't2g', coefficient: -0.4 },
      { id: 'dz2', group: 'eg', coefficient: 0.6 }, { id: 'dx2y2', group: 'eg', coefficient: 0.6 },
    ],
    groupOrder: ['t2g', 'eg'],
    boundary: 'The ideal Oh diagram ignores distortion, covalency parameters, interelectronic term splitting, and spin-orbit coupling.',
  },
  tetrahedral: {
    id: 'tetrahedral', shortName: 'Td', name: 'Tetrahedral', coordinationNumber: 4,
    description: 'Four ideal donor positions approach between the Cartesian axes.',
    quantitativeStatus: 'Ideal barycentric tetrahedral coefficients', normalizedOnly: false,
    ligands: ligandPositions.tetrahedral,
    orbitals: [
      { id: 'dz2', group: 'e', coefficient: -0.6 }, { id: 'dx2y2', group: 'e', coefficient: -0.6 },
      { id: 'dxy', group: 't2', coefficient: 0.4 }, { id: 'dxz', group: 't2', coefficient: 0.4 }, { id: 'dyz', group: 't2', coefficient: 0.4 },
    ],
    groupOrder: ['e', 't2'],
    boundary: 'The learner supplies Delta-t directly. The model does not infer it from an octahedral value or claim that a low-spin tetrahedral complex exists.',
  },
  squarePlanar: {
    id: 'squarePlanar', shortName: 'D4h', name: 'Square planar', coordinationNumber: 4,
    description: 'Four ideal donor positions lie on the positive and negative x and y axes.',
    quantitativeStatus: 'Normalized qualitative square-planar ordering', normalizedOnly: true,
    ligands: ligandPositions.squarePlanar,
    orbitals: [
      { id: 'dxz', group: 'dxz/dyz', coefficient: -0.6 }, { id: 'dyz', group: 'dxz/dyz', coefficient: -0.6 },
      { id: 'dz2', group: 'dz2', coefficient: -0.2 }, { id: 'dxy', group: 'dxy', coefficient: 0.2 }, { id: 'dx2y2', group: 'dx2-y2', coefficient: 1.2 },
    ],
    groupOrder: ['dxz/dyz', 'dz2', 'dxy', 'dx2-y2'],
    boundary: 'The coefficients only preserve a common qualitative ordering and barycentre. Real square-planar gaps are compound-specific.',
  },
});

export const COORDINATION_GEOMETRY_LIST = Object.freeze(Object.values(COORDINATION_GEOMETRIES));
