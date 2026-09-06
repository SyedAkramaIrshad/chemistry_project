/** Presentation helpers only: these never edit the chemistry graph. */
export function canonicalBondKey(a, b) {
  return [Number(a), Number(b)].sort((x, y) => x - y).join(':');
}

export function graphBounds(atoms) {
  if (!atoms.length) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = atoms.map(atom => Number(atom.x) || 0);
  const ys = atoms.map(atom => Number(atom.y) || 0);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** Only disconnecting a bridge permits a visual fragment recoil. Ring cuts do not. */
export function separatedFragments(atoms, bonds, a, b) {
  const neighbors = new Map(atoms.map(atom => [atom.id, []]));
  for (const bond of bonds) {
    neighbors.get(bond.a)?.push(bond.b);
    neighbors.get(bond.b)?.push(bond.a);
  }
  if (!neighbors.has(a) || !neighbors.has(b)) return null;
  function connected(start) {
    const found = new Set([start]), queue = [start];
    for (let index = 0; index < queue.length; index += 1) {
      for (const next of neighbors.get(queue[index]) || []) {
        if (!found.has(next)) { found.add(next); queue.push(next); }
      }
    }
    return found;
  }
  const first = connected(a);
  return first.has(b) ? null : [first, connected(b)];
}

export function formatCharge(charge) {
  const value = Number(charge) || 0;
  return value ? `${Math.abs(value) === 1 ? '' : Math.abs(value)}${value > 0 ? '+' : '−'}` : '';
}
