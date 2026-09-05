const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};

const corners = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
].map(([x, y, z], index) => ({ id: `corner-${index + 1}`, kind: 'corner', x, y, z }));

const faces = [
  [0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5],
  [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5],
].map(([x, y, z], index) => ({ id: `face-${index + 1}`, kind: 'face', x, y, z }));

const body = [{ id: 'body-1', kind: 'body', x: 0.5, y: 0.5, z: 0.5 }];

export const CRYSTAL_STRUCTURES = freeze({
  sc: {
    id: 'sc', shortName: 'SC', name: 'Simple cubic', centring: 'Primitive cubic',
    description: 'Lattice points occupy only the eight corners of the conventional cube.',
    atomsPerCell: 1, coordinationNumber: 6,
    nearestNeighborFactor: 1, radiusFactor: 0.5, packingFraction: Math.PI / 6,
    displaySites: corners,
    basis: [{ x: 0, y: 0, z: 0, kind: 'corner basis' }],
    sharing: [{ site: 'corners', count: 8, fraction: 1 / 8, contribution: 1 }],
    reflectionRule: 'Every non-zero integral (hkl) is permitted by monatomic primitive centring.',
    signature: 'open axial channels',
  },
  bcc: {
    id: 'bcc', shortName: 'BCC', name: 'Body-centred cubic', centring: 'I-centred cubic',
    description: 'A full lattice point sits at the cube centre in addition to the corner points.',
    atomsPerCell: 2, coordinationNumber: 8,
    nearestNeighborFactor: Math.sqrt(3) / 2, radiusFactor: Math.sqrt(3) / 4,
    packingFraction: Math.sqrt(3) * Math.PI / 8,
    displaySites: [...corners, ...body],
    basis: [{ x: 0, y: 0, z: 0, kind: 'corner basis' }, { x: 0.5, y: 0.5, z: 0.5, kind: 'body basis' }],
    sharing: [
      { site: 'corners', count: 8, fraction: 1 / 8, contribution: 1 },
      { site: 'body centre', count: 1, fraction: 1, contribution: 1 },
    ],
    reflectionRule: 'Monatomic BCC permits reflections only when h + k + l is even.',
    signature: 'body-diagonal contact',
  },
  fcc: {
    id: 'fcc', shortName: 'FCC', name: 'Face-centred cubic', centring: 'F-centred cubic',
    description: 'A lattice point occupies each face centre in addition to the corner points.',
    atomsPerCell: 4, coordinationNumber: 12,
    nearestNeighborFactor: 1 / Math.sqrt(2), radiusFactor: 1 / (2 * Math.sqrt(2)),
    packingFraction: Math.PI / (3 * Math.sqrt(2)),
    displaySites: [...corners, ...faces],
    basis: [
      { x: 0, y: 0, z: 0, kind: 'corner basis' },
      { x: 0, y: 0.5, z: 0.5, kind: 'face basis' },
      { x: 0.5, y: 0, z: 0.5, kind: 'face basis' },
      { x: 0.5, y: 0.5, z: 0, kind: 'face basis' },
    ],
    sharing: [
      { site: 'corners', count: 8, fraction: 1 / 8, contribution: 1 },
      { site: 'face centres', count: 6, fraction: 1 / 2, contribution: 3 },
    ],
    reflectionRule: 'Monatomic FCC permits reflections when h, k, and l are all odd or all even.',
    signature: 'close-packed face diagonals',
  },
});

export const CRYSTAL_STRUCTURE_LIST = Object.freeze(Object.values(CRYSTAL_STRUCTURES));
