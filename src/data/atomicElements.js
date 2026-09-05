const SUBSHELL_DEFINITIONS = [
  { id: '1s', n: 1, l: 0, label: '1s', capacity: 2, orbitalCount: 1, ml: [0] },
  { id: '2s', n: 2, l: 0, label: '2s', capacity: 2, orbitalCount: 1, ml: [0] },
  { id: '2p', n: 2, l: 1, label: '2p', capacity: 6, orbitalCount: 3, ml: [-1, 0, 1] },
  { id: '3s', n: 3, l: 0, label: '3s', capacity: 2, orbitalCount: 1, ml: [0] },
  { id: '3p', n: 3, l: 1, label: '3p', capacity: 6, orbitalCount: 3, ml: [-1, 0, 1] },
  { id: '4s', n: 4, l: 0, label: '4s', capacity: 2, orbitalCount: 1, ml: [0] },
  { id: '3d', n: 3, l: 2, label: '3d', capacity: 10, orbitalCount: 5, ml: [-2, -1, 0, 1, 2] },
  { id: '4p', n: 4, l: 1, label: '4p', capacity: 6, orbitalCount: 3, ml: [-1, 0, 1] },
];

export const ATOMIC_SUBSHELLS = Object.freeze(SUBSHELL_DEFINITIONS.map((item) => Object.freeze({
  ...item,
  ml: Object.freeze([...item.ml]),
})));

const RAW_ELEMENTS = [
  [1, 'H', 'Hydrogen', 1, 1, 's', 1.008, 13.5984, [1, 0, 0, 0, 0, 0, 0, 0], '1s¹', 0],
  [2, 'He', 'Helium', 1, 18, 's', 4.0026, 24.5874, [2, 0, 0, 0, 0, 0, 0, 0], '1s²', 0],
  [3, 'Li', 'Lithium', 2, 1, 's', 6.94, 5.3917, [2, 1, 0, 0, 0, 0, 0, 0], '[He] 2s¹', 2],
  [4, 'Be', 'Beryllium', 2, 2, 's', 9.0122, 9.3227, [2, 2, 0, 0, 0, 0, 0, 0], '[He] 2s²', 2],
  [5, 'B', 'Boron', 2, 13, 'p', 10.81, 8.2980, [2, 2, 1, 0, 0, 0, 0, 0], '[He] 2s² 2p¹', 2],
  [6, 'C', 'Carbon', 2, 14, 'p', 12.011, 11.2603, [2, 2, 2, 0, 0, 0, 0, 0], '[He] 2s² 2p²', 2],
  [7, 'N', 'Nitrogen', 2, 15, 'p', 14.007, 14.5341, [2, 2, 3, 0, 0, 0, 0, 0], '[He] 2s² 2p³', 2],
  [8, 'O', 'Oxygen', 2, 16, 'p', 15.999, 13.6181, [2, 2, 4, 0, 0, 0, 0, 0], '[He] 2s² 2p⁴', 2],
  [9, 'F', 'Fluorine', 2, 17, 'p', 18.998, 17.4228, [2, 2, 5, 0, 0, 0, 0, 0], '[He] 2s² 2p⁵', 2],
  [10, 'Ne', 'Neon', 2, 18, 'p', 20.180, 21.5645, [2, 2, 6, 0, 0, 0, 0, 0], '[He] 2s² 2p⁶', 2],
  [11, 'Na', 'Sodium', 3, 1, 's', 22.990, 5.1391, [2, 2, 6, 1, 0, 0, 0, 0], '[Ne] 3s¹', 10],
  [12, 'Mg', 'Magnesium', 3, 2, 's', 24.305, 7.6462, [2, 2, 6, 2, 0, 0, 0, 0], '[Ne] 3s²', 10],
  [13, 'Al', 'Aluminium', 3, 13, 'p', 26.982, 5.9858, [2, 2, 6, 2, 1, 0, 0, 0], '[Ne] 3s² 3p¹', 10],
  [14, 'Si', 'Silicon', 3, 14, 'p', 28.085, 8.1517, [2, 2, 6, 2, 2, 0, 0, 0], '[Ne] 3s² 3p²', 10],
  [15, 'P', 'Phosphorus', 3, 15, 'p', 30.974, 10.4867, [2, 2, 6, 2, 3, 0, 0, 0], '[Ne] 3s² 3p³', 10],
  [16, 'S', 'Sulfur', 3, 16, 'p', 32.06, 10.3600, [2, 2, 6, 2, 4, 0, 0, 0], '[Ne] 3s² 3p⁴', 10],
  [17, 'Cl', 'Chlorine', 3, 17, 'p', 35.45, 12.9676, [2, 2, 6, 2, 5, 0, 0, 0], '[Ne] 3s² 3p⁵', 10],
  [18, 'Ar', 'Argon', 3, 18, 'p', 39.95, 15.7596, [2, 2, 6, 2, 6, 0, 0, 0], '[Ne] 3s² 3p⁶', 10],
  [19, 'K', 'Potassium', 4, 1, 's', 39.098, 4.3407, [2, 2, 6, 2, 6, 1, 0, 0], '[Ar] 4s¹', 18],
  [20, 'Ca', 'Calcium', 4, 2, 's', 40.078, 6.1132, [2, 2, 6, 2, 6, 2, 0, 0], '[Ar] 4s²', 18],
  [21, 'Sc', 'Scandium', 4, 3, 'd', 44.956, 6.5615, [2, 2, 6, 2, 6, 2, 1, 0], '[Ar] 3d¹ 4s²', 18],
  [22, 'Ti', 'Titanium', 4, 4, 'd', 47.867, 6.8281, [2, 2, 6, 2, 6, 2, 2, 0], '[Ar] 3d² 4s²', 18],
  [23, 'V', 'Vanadium', 4, 5, 'd', 50.942, 6.7462, [2, 2, 6, 2, 6, 2, 3, 0], '[Ar] 3d³ 4s²', 18],
  [24, 'Cr', 'Chromium', 4, 6, 'd', 51.996, 6.7665, [2, 2, 6, 2, 6, 1, 5, 0], '[Ar] 3d⁵ 4s¹', 18, 'The NIST ground-state record is 3d⁵ 4s¹, not the simple 3d⁴ 4s² filling prediction.'],
  [25, 'Mn', 'Manganese', 4, 7, 'd', 54.938, 7.4340, [2, 2, 6, 2, 6, 2, 5, 0], '[Ar] 3d⁵ 4s²', 18],
  [26, 'Fe', 'Iron', 4, 8, 'd', 55.845, 7.9025, [2, 2, 6, 2, 6, 2, 6, 0], '[Ar] 3d⁶ 4s²', 18],
  [27, 'Co', 'Cobalt', 4, 9, 'd', 58.933, 7.8810, [2, 2, 6, 2, 6, 2, 7, 0], '[Ar] 3d⁷ 4s²', 18],
  [28, 'Ni', 'Nickel', 4, 10, 'd', 58.693, 7.6399, [2, 2, 6, 2, 6, 2, 8, 0], '[Ar] 3d⁸ 4s²', 18],
  [29, 'Cu', 'Copper', 4, 11, 'd', 63.546, 7.7264, [2, 2, 6, 2, 6, 1, 10, 0], '[Ar] 3d¹⁰ 4s¹', 18, 'The NIST ground-state record is 3d¹⁰ 4s¹, not the simple 3d⁹ 4s² filling prediction.'],
  [30, 'Zn', 'Zinc', 4, 12, 'd', 65.38, 9.3942, [2, 2, 6, 2, 6, 2, 10, 0], '[Ar] 3d¹⁰ 4s²', 18],
  [31, 'Ga', 'Gallium', 4, 13, 'p', 69.723, 5.9993, [2, 2, 6, 2, 6, 2, 10, 1], '[Ar] 3d¹⁰ 4s² 4p¹', 18],
  [32, 'Ge', 'Germanium', 4, 14, 'p', 72.630, 7.8994, [2, 2, 6, 2, 6, 2, 10, 2], '[Ar] 3d¹⁰ 4s² 4p²', 18],
  [33, 'As', 'Arsenic', 4, 15, 'p', 74.922, 9.7886, [2, 2, 6, 2, 6, 2, 10, 3], '[Ar] 3d¹⁰ 4s² 4p³', 18],
  [34, 'Se', 'Selenium', 4, 16, 'p', 78.971, 9.7524, [2, 2, 6, 2, 6, 2, 10, 4], '[Ar] 3d¹⁰ 4s² 4p⁴', 18],
  [35, 'Br', 'Bromine', 4, 17, 'p', 79.904, 11.8138, [2, 2, 6, 2, 6, 2, 10, 5], '[Ar] 3d¹⁰ 4s² 4p⁵', 18],
  [36, 'Kr', 'Krypton', 4, 18, 'p', 83.798, 13.9996, [2, 2, 6, 2, 6, 2, 10, 6], '[Ar] 3d¹⁰ 4s² 4p⁶', 18],
];

const toGroundSubshells = (counts) => Object.freeze(Object.fromEntries(
  ATOMIC_SUBSHELLS.map((subshell, index) => [subshell.id, counts[index]]),
));

export const ATOMIC_ELEMENTS = Object.freeze(RAW_ELEMENTS.map(([
  atomicNumber, symbol, name, period, group, block, atomicWeight, ionizationEnergyEV,
  counts, shorthand, nobleGasCoreZ, exceptionNote = '',
]) => Object.freeze({
  atomicNumber,
  symbol,
  name,
  period,
  group,
  block,
  atomicWeight,
  ionizationEnergyEV,
  groundSubshells: toGroundSubshells(counts),
  shorthand,
  nobleGasCoreZ,
  exceptionNote,
})));

export const ATOMIC_ELEMENT_BY_Z = Object.freeze(Object.fromEntries(
  ATOMIC_ELEMENTS.map((element) => [element.atomicNumber, element]),
));

export const ATOMIC_ELEMENT_BY_SYMBOL = Object.freeze(Object.fromEntries(
  ATOMIC_ELEMENTS.map((element) => [element.symbol, element]),
));

export const ATOMIC_MODEL_BOUNDARY = Object.freeze({
  included: 'Neutral ground-state electron configurations and NIST first-ionization-energy records for H through Kr.',
  excluded: 'Arbitrary ions, excited states, term symbols, spectra, radii, electron affinities, bonding, and many-electron wavefunction calculation.',
  orbitalGraphic: 'Qualitative wavefunction/probability-density isosurface silhouette—not an electron path, measured radius, or computed many-electron density.',
});
