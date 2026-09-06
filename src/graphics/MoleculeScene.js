import * as THREE from 'three';
import { canonicalBondKey, formatCharge, graphBounds, separatedFragments } from './sceneMath.js';

const ELEMENT_NAMES = { H: 'Hydrogen', He: 'Helium', C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', F: 'Fluorine', Ne: 'Neon', Na: 'Sodium', Mg: 'Magnesium', Al: 'Aluminium', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', K: 'Potassium', Ca: 'Calcium', Fe: 'Iron', Cu: 'Copper', Zn: 'Zinc', Br: 'Bromine', I: 'Iodine' };
const COLORS = { H: '#e8f1fc', C: '#56667e', N: '#407af3', O: '#ed4e62', S: '#f6ca4f', P: '#ed973f', Cl: '#59cba1', F: '#76dbc0', Na: '#a37fee', He: '#a3e8ef' };
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const easeOut = value => 1 - (1 - value) ** 3;
const nameOf = atom => atom.name || ELEMENT_NAMES[atom.symbol] || atom.symbol;

/**
 * A presentation layer over the canonical, manually edited molecular graph.
 * Graph x/y stay in workspace pixels. Orbit, zoom, shadows and transient motion
 * do not infer a molecular geometry, energy or reaction outcome.
 */
export function createMoleculeScene(host, callbacks = {}) {
  if (!host) throw new Error('The molecular scene needs a host element.');
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' });
  const labelLayer = document.createElement('div');
  labelLayer.className = 'scene-label-layer';
  Object.assign(labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
  const announcer = document.createElement('span');
  announcer.className = 'scene-status';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  host.append(canvas, labelLayer, announcer);
  host.dataset.status = 'ready';

  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.rotation.set(0.17, -0.19, 0);
  scene.add(root);
  const camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 1, 5000);
  camera.position.set(0, 0, 1400);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xc1deff, 0x283440, 2.8));
  const keyLight = new THREE.DirectionalLight(0xfff4e6, 4.1);
  keyLight.position.set(-300, 420, 650);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -1200, right: 1200, top: 1200, bottom: -1200, near: 1, far: 2300 });
  keyLight.shadow.bias = -0.0008;
  keyLight.shadow.normalBias = 0.6;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x81bfff, 3.2);
  rimLight.position.set(380, -80, 180);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xf598bb, 0.85);
  fillLight.position.set(-200, -260, 90);
  scene.add(fillLight);

  const sphereGeometry = new THREE.SphereGeometry(1, 40, 28);
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16, 1);
  const ringGeometry = new THREE.TorusGeometry(1, 0.023, 8, 72);
  const floorGeometry = new THREE.PlaneGeometry(6000, 6000);
  const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3, depthWrite: false });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.z = -56;
  floor.receiveShadow = true;
  root.add(floor);

  const guideMaterial = new THREE.LineDashedMaterial({ color: 0x69edd0, dashSize: 8, gapSize: 6, transparent: true, opacity: 0.85, depthTest: false });
  const guideGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const guide = new THREE.Line(guideGeometry, guideMaterial);
  guide.visible = false;
  guide.renderOrder = 12;
  root.add(guide);

  const atoms = new Map(), bonds = new Map(), ghosts = [];
  let snapshot = { atoms: [], bonds: [] }, width = 1, height = 1;
  let center = { x: 0, y: 0 }, mode = 'edit', disposed = false, contextLost = false;
  let raf = 0, visible = true, hasFitted = false, gesture = null, lastEventId = null;
  let animation = null, suppressClickUntil = 0, suppressClickId = null;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const localPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const worldPlane = new THREE.Plane();
  const tmp = new THREE.Vector3();

  function invalidate() {
    if (!raf && !disposed && !contextLost && visible && !document.hidden && host.clientWidth && host.clientHeight) raf = requestAnimationFrame(draw);
  }

  function updateCameraFrame() {
    // The bottom guide is taller than the top controls. Offset only the view,
    // by a fixed screen distance, so terminal atoms clear its caption on mobile.
    camera.position.y = -26 / camera.zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function resize() {
    if (disposed) return;
    const nextWidth = host.clientWidth, nextHeight = host.clientHeight;
    if (!nextWidth || !nextHeight) return;
    width = nextWidth; height = nextHeight;
    renderer.setSize(width, height, false);
    camera.left = -width / 2; camera.right = width / 2;
    camera.top = height / 2; camera.bottom = -height / 2;
    updateCameraFrame();
    invalidate();
  }

  function rayFromScreen(clientX, clientY) {
    const rect = host.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1, -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1);
    camera.updateMatrixWorld(); root.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
  }

  function screenToGraph(clientX, clientY) {
    rayFromScreen(clientX, clientY);
    worldPlane.copy(localPlane).applyMatrix4(root.matrixWorld);
    const point = raycaster.ray.intersectPlane(worldPlane, new THREE.Vector3());
    if (!point) return null;
    root.worldToLocal(point);
    return { x: point.x + center.x, y: center.y - point.y };
  }

  function hitAt(clientX, clientY, onlyAtoms = false) {
    rayFromScreen(clientX, clientY);
    const meshes = [...atoms.values()].map(record => record.mesh);
    if (!onlyAtoms) for (const record of bonds.values()) {
      if (record.group.visible) meshes.push(...record.group.children.filter(mesh => mesh.visible));
    }
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit?.object.userData || null;
  }

  function pointFor(atom) {
    return new THREE.Vector3((Number(atom.x) || 0) - center.x, center.y - (Number(atom.y) || 0), 0);
  }

  function button(className, label) {
    const node = document.createElement('button');
    node.type = 'button'; node.className = className;
    node.setAttribute('aria-label', label);
    node.style.pointerEvents = 'auto';
    node.style.touchAction = 'none';
    return node;
  }

  function startGesture(event, kind, id) {
    if (event.button !== 0 || gesture) return;
    event.stopPropagation();
    if (kind === 'socket') {
      if (callbacks.beginBond?.(id) === false) return;
    }
    const atom = snapshot.atoms.find(item => item.id === id);
    gesture = { kind, id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false, origin: atom ? { x: atom.x, y: atom.y } : null, graphStart: screenToGraph(event.clientX, event.clientY), target: event.currentTarget };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Detached nodes cannot capture. */ }
    if (kind === 'socket') { guide.visible = true; updateGuide(event.clientX, event.clientY); }
  }

  function addAtom(atom) {
    const radius = Number(atom.radius) > 12 && Number(atom.radius) < 65 ? Number(atom.radius) : atom.symbol === 'H' ? 26 : atom.symbol === 'He' ? 30 : atom.symbol === 'C' ? 39 : 37;
    const color = new THREE.Color(COLORS[atom.symbol] || atom.color || '#83a4c8');
    const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.23, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.scale.setScalar(radius);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { kind: 'atom', id: atom.id };
    root.add(mesh);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x77e7d0, transparent: true, opacity: 0.8, depthWrite: false });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.scale.setScalar(radius + 8); ring.visible = false;
    root.add(ring);
    const label = document.createElement('div');
    label.className = 'scene-atom-label';
    label.dataset.atomId = String(atom.id);
    label.dataset.light = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 > 0.57 ? 'true' : 'false';
    Object.assign(label.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none' });
    label.style.setProperty('--scene-atom-color', `#${color.getHexString()}`);
    const node = button('scene-atom-button', `${nameOf(atom)} atom ${atom.id}. Select to inspect properties.`);
    node.dataset.atomId = String(atom.id);
    node.dataset.sceneAtomId = String(atom.id);
    node.dataset.symbol = atom.symbol;
    const symbol = document.createElement('span'); symbol.className = 'scene-symbol'; symbol.textContent = atom.symbol;
    const charge = document.createElement('sup'); charge.className = 'scene-charge';
    const number = document.createElement('span'); number.className = 'scene-atomic-number';
    number.textContent = atom.atomicNumber || '';
    node.append(symbol, charge, number);
    node.addEventListener('pointerdown', event => startGesture(event, mode === 'orbit' ? 'orbit' : 'atom', atom.id));
    node.addEventListener('click', event => {
      event.stopPropagation();
      if (event.detail !== 0 && suppressClickId === atom.id && performance.now() < suppressClickUntil) { suppressClickId = null; return; }
      callbacks.selectAtom?.(atom.id);
    });
    node.addEventListener('keydown', event => {
      if (event.key.toLowerCase() === 'b' && Number(atoms.get(atom.id)?.atom.sites) > 0) { event.preventDefault(); event.stopPropagation(); callbacks.beginBond?.(atom.id); }
      const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (direction && mode === 'edit') {
        event.preventDefault(); event.stopPropagation();
        const current = atoms.get(atom.id)?.atom;
        if (current) {
          const distance = event.shiftKey ? 20 : 5;
          callbacks.moveStart?.(atom.id);
          callbacks.moveAtom?.(atom.id, current.x + direction[0] * distance, current.y + direction[1] * distance);
          callbacks.moveEnd?.(atom.id, false);
        }
      }
    });
    const socket = button('scene-socket', `Start a bond from ${nameOf(atom)} atom ${atom.id}`);
    socket.dataset.atomId = String(atom.id);
    socket.dataset.sceneSocketId = String(atom.id);
    const plus = document.createElement('span'); plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true');
    const count = document.createElement('small'); count.className = 'scene-site-count'; count.setAttribute('aria-hidden', 'true');
    socket.append(plus, count);
    socket.addEventListener('pointerdown', event => startGesture(event, 'socket', atom.id));
    socket.addEventListener('click', event => { event.stopPropagation(); if (event.detail === 0) callbacks.beginBond?.(atom.id); });
    const electrons = document.createElement('span'); electrons.className = 'scene-electrons'; electrons.setAttribute('aria-hidden', 'true');
    label.append(node, socket, electrons); labelLayer.append(label);
    const record = { atom, radius, mesh, ring, label, node, charge, socket, count, electrons, projected: null };
    atoms.set(atom.id, record);
    return record;
  }

  function removeAtom(record) {
    root.remove(record.mesh, record.ring);
    record.mesh.material.dispose(); record.ring.material.dispose(); record.label.remove();
  }

  function addBond(bond, ghost = false) {
    const group = new THREE.Group(); root.add(group);
    const endpointColors = [bond.a, bond.b].map(id => new THREE.Color(COLORS[atoms.get(id)?.atom.symbol] || atoms.get(id)?.atom.color || '#91a7be').lerp(new THREE.Color('#aec5d8'), 0.58));
    const materials = endpointColors.map(color => new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, metalness: 0.27, clearcoat: 0.7, transparent: ghost, opacity: 1 }));
    const key = canonicalBondKey(bond.a, bond.b);
    const node = ghost ? null : button('scene-bond-button', `${nameOf(atoms.get(bond.a)?.atom || { symbol: '?' })} ${bond.type || 'single'} bond to ${nameOf(atoms.get(bond.b)?.atom || { symbol: '?' })}. Select to inspect or break.`);
    if (node) {
      node.dataset.bondKey = key;
      node.dataset.sceneBondKey = key;
      node.dataset.a = String(bond.a);
      node.dataset.b = String(bond.b);
      node.dataset.bondType = bond.type || 'single';
      Object.assign(node.style, { position: 'absolute', left: '0', top: '0', minWidth: '44px', minHeight: '44px' });
      node.addEventListener('pointerdown', event => event.stopPropagation());
      node.addEventListener('click', event => { event.stopPropagation(); callbacks.selectBond?.(bond.a, bond.b); });
      labelLayer.prepend(node);
    }
    return { bond: { ...bond }, key, group, materials, node, ghost, bornAt: 0 };
  }

  function removeBond(record) {
    root.remove(record.group); record.materials.forEach(material => material.dispose()); record.node?.remove();
  }

  function drawCylinder(record, index, from, to, radius, half) {
    let mesh = record.group.children[index];
    if (!mesh) {
      mesh = new THREE.Mesh(cylinderGeometry, record.materials[half]);
      mesh.castShadow = !record.ghost; mesh.receiveShadow = true;
      mesh.userData = { kind: 'bond', a: record.bond.a, b: record.bond.b };
      record.group.add(mesh);
    }
    const direction = to.clone().sub(from), length = direction.length();
    mesh.material = record.materials[half];
    mesh.visible = length > 0.05;
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.scale.set(radius, Math.max(0.001, length), radius);
    mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  }

  function renderBond(record, positions, growth = 1, breakProgress = 0) {
    const a = positions.get(record.bond.a), b = positions.get(record.bond.b);
    if (!a || !b) { record.group.visible = false; return; }
    record.group.visible = true;
    const direction = b.clone().sub(a), distance = direction.length();
    const perpendicular = new THREE.Vector3(-direction.y, direction.x, 0).normalize();
    const ionic = record.bond.type === 'ionic';
    const order = ionic ? 1 : clamp(Math.round(Number(record.bond.order) || ({ double: 2, triple: 3 }[record.bond.type] || 1)), 1, 3);
    const selected = snapshot.selectedBondKey === record.key && !record.ghost;
    record.materials.forEach(material => {
      material.emissive.set(selected ? 0x339d91 : 0x000000);
      material.emissiveIntensity = selected ? 0.3 : 0;
      if (record.ghost) material.opacity = (1 - breakProgress) * 0.8;
    });
    const separation = order === 2 ? 6.7 : 8.5;
    const radius = ionic ? 3 : order === 1 ? 5.8 : order === 2 ? 4.1 : 3.3;
    let index = 0;
    for (let strand = 0; strand < order; strand += 1) {
      const offset = perpendicular.clone().multiplyScalar((strand - (order - 1) / 2) * separation * 2);
      const ends = [a.clone().add(offset), b.clone().add(offset)];
      for (let half = 0; half < 2; half += 1) {
        const from = ends[half], to = from.clone().lerp(ends[1 - half], 0.5 * growth * (1 - breakProgress));
        const segments = ionic ? Math.max(1, Math.ceil(distance / 30)) : 1;
        for (let segment = 0; segment < segments; segment += 1) {
          const start = from.clone().lerp(to, segment / segments);
          const end = from.clone().lerp(to, (segment + (ionic ? 0.48 : 1)) / segments);
          drawCylinder(record, index++, start, end, radius, half);
        }
      }
    }
    for (; index < record.group.children.length; index += 1) record.group.children[index].visible = false;
    if (record.node) {
      const midpoint = a.clone().add(b).multiplyScalar(0.5);
      root.localToWorld(midpoint); midpoint.project(camera);
      record.node.style.transform = `translate(${(midpoint.x + 1) * width / 2}px,${(1 - midpoint.y) * height / 2}px) translate(-50%,-50%)`;
      record.node.classList.toggle('is-selected', selected);
      record.node.setAttribute('aria-pressed', String(selected));
      record.node.style.zIndex = '1';
      record.node.hidden = midpoint.z < -1 || midpoint.z > 1;
    }
  }

  function updateGuide(clientX, clientY) {
    const source = atoms.get(gesture?.id), target = screenToGraph(clientX, clientY);
    if (!source || !target) return;
    const a = pointFor(source.atom), b = pointFor(target);
    const buffer = guide.geometry.attributes.position;
    buffer.setXYZ(0, a.x, a.y, 1); buffer.setXYZ(1, b.x, b.y, 1); buffer.needsUpdate = true;
    guide.computeLineDistances(); invalidate();
  }

  function draw(now) {
    raf = 0;
    if (disposed || contextLost || document.hidden || !visible) return;
    const positions = new Map();
    let active = false;
    const feedback = animation && !reducedMotion ? clamp((now - animation.start) / animation.duration, 0, 1) : 1;
    if (animation && feedback < 1) active = true;
    const recoil = animation?.fragments ? Math.sin(feedback * Math.PI) * (1 - feedback) * 22 : 0;
    root.updateMatrixWorld(true);
    const billboard = root.quaternion.clone().invert().multiply(camera.quaternion);
    for (const record of atoms.values()) {
      const position = pointFor(record.atom);
      if (recoil && animation.fragDirection) {
        const side = animation.fragments[0].has(record.atom.id) ? -1 : animation.fragments[1].has(record.atom.id) ? 1 : 0;
        position.addScaledVector(animation.fragDirection, recoil * side);
      }
      positions.set(record.atom.id, position);
      record.mesh.position.copy(position);
      record.ring.position.copy(position); record.ring.quaternion.copy(billboard);
      const selected = snapshot.selectedAtomId === record.atom.id, pending = snapshot.pendingBondAtomId === record.atom.id;
      const compatible = record.atom.compatible === true;
      const incompatible = record.atom.compatible === false;
      const blocked = animation?.kind === 'blocked' && feedback < 1 && (animation.a === record.atom.id || animation.b === record.atom.id);
      record.ring.visible = selected || pending || blocked || compatible;
      record.ring.material.color.set(blocked ? 0xff7c7c : pending || compatible ? 0x91ffcd : 0x79cce9);
      record.ring.material.opacity = blocked ? 0.35 + Math.sin(feedback * Math.PI) * 0.6 : compatible ? 0.62 : 0.85;
      const projected = root.localToWorld(position.clone()).project(camera);
      record.projected = projected;
      record.label.hidden = projected.z < -1 || projected.z > 1;
      record.label.style.transform = `translate(${(projected.x + 1) * width / 2}px,${(1 - projected.y) * height / 2}px) translate(-50%,-50%)`;
      record.label.style.zIndex = String(Math.round((1 - projected.z) * 1000) + 3);
      const diameter = record.radius * 2 * camera.zoom;
      record.label.style.setProperty('--scene-diameter', `${diameter}px`);
      record.label.style.setProperty('--scene-radius', `${diameter / 2}px`);
      record.node.style.width = `${Math.max(44, diameter)}px`;
      record.node.style.height = `${Math.max(44, diameter)}px`;
      record.label.classList.toggle('is-selected', selected);
      record.label.classList.toggle('is-pending', pending);
      record.label.classList.toggle('is-compatible', compatible);
      record.label.classList.toggle('is-incompatible', incompatible);
      record.node.setAttribute('aria-pressed', String(selected));
      record.mesh.material.emissive.set(pending ? 0x3b8b66 : selected ? 0x29485d : 0x000000);
      record.mesh.material.emissiveIntensity = selected || pending ? 0.14 : 0;
    }
    for (const record of bonds.values()) {
      const t = record.bornAt && !reducedMotion ? clamp((now - record.bornAt) / 560, 0, 1) : 1;
      if (t < 1) active = true;
      renderBond(record, positions, easeOut(t));
    }
    for (let index = ghosts.length - 1; index >= 0; index -= 1) {
      const record = ghosts[index], t = reducedMotion ? 1 : clamp((now - record.bornAt) / 430, 0, 1);
      if (t >= 1) { removeBond(record); ghosts.splice(index, 1); }
      else { renderBond(record, positions, 1, easeOut(t)); active = true; }
    }
    if (animation && feedback >= 1) animation = null;
    renderer.render(scene, camera);
    if (active) invalidate();
  }

  function update(next) {
    if (disposed || contextLost) return;
    // The controller clears its drag snapshot before replacing a graph. Cancel
    // capture here so an old pointer cannot start moving the replacement graph.
    if (gesture && next.graphKey != null && next.graphKey !== snapshot.graphKey) cancelGesture();
    const previous = snapshot;
    snapshot = { ...next, atoms: next.atoms.map(atom => ({ ...atom })), bonds: next.bonds.map(bond => ({ ...bond })) };
    const event = next.event;
    const eventIsNew = event && event.id !== lastEventId;
    if (eventIsNew) lastEventId = event.id;
    const currentIds = new Set(snapshot.atoms.map(atom => atom.id));
    for (const [id, record] of atoms) if (!currentIds.has(id)) { removeAtom(record); atoms.delete(id); }
    for (const atom of snapshot.atoms) {
      const record = atoms.get(atom.id) || addAtom(atom);
      record.atom = atom;
      record.charge.textContent = formatCharge(atom.charge);
      record.charge.hidden = !Number(atom.charge);
      const count = clamp(Number(atom.sites) || 0, 0, 8);
      record.socket.hidden = count === 0;
      record.socket.setAttribute('aria-label', `Start a ${snapshot.bondType || 'single'} bond from ${nameOf(atom)} atom ${atom.id}. ${count} permitted interaction site${count === 1 ? '' : 's'}.`);
      record.node.setAttribute('aria-label', `${nameOf(atom)} atom ${atom.id}, ${Number(atom.charge) ? `formal charge ${formatCharge(atom.charge)}` : 'neutral'}. ${count} permitted interaction site${count === 1 ? '' : 's'}. Select to inspect properties.`);
      record.count.textContent = count > 1 ? String(count) : '';
      record.node.title = `${nameOf(atom)} (${atom.symbol})${atom.atomicNumber ? ` · atomic number ${atom.atomicNumber}` : ''}${atom.mass ? ` · atomic mass ${atom.mass}` : ''}${atom.charge ? ` · formal charge ${formatCharge(atom.charge)}` : ''}. Select to inspect. Drag to move. B starts a permitted bond.`;
      record.node.dataset.charge = String(Number(atom.charge) || 0);
      const electronCount = snapshot.showLewisElectrons ? clamp(Math.round(Number(atom.nonbondingElectrons) || 0), 0, 8) : 0;
      if (record.electrons.childElementCount !== electronCount) {
        record.electrons.replaceChildren();
        for (let index = 0; index < electronCount; index += 1) {
          const dot = document.createElement('i'); dot.className = 'scene-electron';
          const pair = Math.floor(index / 2), angle = Math.PI * (0.5 + pair * 0.5);
          dot.style.setProperty('--scene-electron-x', String(Math.cos(angle)));
          dot.style.setProperty('--scene-electron-y', String(Math.sin(angle)));
          dot.style.setProperty('--scene-pair-offset', `${index % 2 === 0 ? -3.5 : 3.5}px`);
          record.electrons.append(dot);
        }
      }
    }
    const currentKeys = new Set(snapshot.bonds.map(bond => canonicalBondKey(bond.a, bond.b)));
    for (const [key, record] of bonds) if (!currentKeys.has(key)) {
      if (eventIsNew && event.kind === 'break' && key === canonicalBondKey(event.a, event.b) && !reducedMotion && currentIds.has(record.bond.a) && currentIds.has(record.bond.b)) {
        const ghost = addBond(record.bond, true); ghost.bornAt = performance.now(); ghosts.push(ghost);
      }
      removeBond(record); bonds.delete(key);
    }
    for (const bond of snapshot.bonds) {
      const key = canonicalBondKey(bond.a, bond.b);
      if (!atoms.has(bond.a) || !atoms.has(bond.b)) continue;
      const record = bonds.get(key) || addBond(bond);
      record.bond = { ...bond }; bonds.set(key, record);
      record.node.dataset.bondType = bond.type || 'single';
      record.node.setAttribute('aria-label', `${nameOf(atoms.get(bond.a).atom)} ${bond.type || 'single'} bond to ${nameOf(atoms.get(bond.b).atom)}. Select to inspect or break.`);
      if (eventIsNew && event.kind === 'bond' && key === canonicalBondKey(event.a, event.b) && !reducedMotion) record.bornAt = performance.now();
    }
    if (eventIsNew) {
      const fragments = event.kind === 'break' ? separatedFragments(snapshot.atoms, snapshot.bonds, event.a, event.b) : null;
      const from = atoms.get(event.a)?.atom, to = atoms.get(event.b)?.atom;
      animation = { ...event, start: performance.now(), duration: 620, fragments, fragDirection: from && to ? pointFor(to).sub(pointFor(from)).normalize() : null };
      announcer.textContent = event.kind === 'bond' ? 'Bond formed. Inspect its properties or select it to break.' : event.kind === 'break' ? 'Bond broken. Both atoms remain.' : event.kind === 'blocked' ? 'Bond attempt rejected. The chemistry graph is unchanged.' : '';
    }
    if ((!hasFitted && snapshot.atoms.length) || (next.graphKey != null && next.graphKey !== previous.graphKey)) fit();
    invalidate();
  }

  function fit() {
    if (disposed) return;
    cancelGesture();
    resize();
    const bounds = graphBounds(snapshot.atoms);
    center = { x: bounds.x, y: bounds.y };
    // Small structures should feel like the subject of the canvas. Reserve
    // space for the toolbar, atom labels, sockets and the bottom guide while
    // allowing a three-atom starting structure to fill the available stage.
    camera.zoom = clamp(Math.min(width / Math.max(220, bounds.width + 170), Math.max(180, height - 170) / Math.max(170, bounds.height + 160), 2.25), 0.28, 2.25);
    root.rotation.set(0.17, -0.19, 0);
    updateCameraFrame();
    hasFitted = snapshot.atoms.length > 0;
    invalidate();
  }

  function setMode(nextMode) {
    const requestedMode = nextMode === 'orbit' ? 'orbit' : 'edit';
    if (gesture && requestedMode !== mode) finishPointer({ pointerId: gesture.pointerId }, true);
    mode = requestedMode;
    host.dataset.mode = mode;
    canvas.style.cursor = mode === 'orbit' ? 'grab' : 'default';
    invalidate();
  }

  function pointerDown(event) {
    if (event.target !== canvas && event.target !== host) return;
    const hit = hitAt(event.clientX, event.clientY);
    if (hit?.kind === 'atom') startGesture(event, mode === 'orbit' ? 'orbit' : 'atom', hit.id);
    else if (hit?.kind === 'bond' && mode === 'edit') { event.stopPropagation(); callbacks.selectBond?.(hit.a, hit.b); }
    else startGesture(event, 'orbit');
  }

  function pointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    const current = gesture;
    const dx = event.clientX - current.lastX, dy = event.clientY - current.lastY;
    const moved = Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 4;
    if (moved && !current.moved && current.kind === 'atom') callbacks.moveStart?.(current.id);
    current.moved ||= moved;
    if (current.kind === 'socket') updateGuide(event.clientX, event.clientY);
    else if (current.kind === 'atom' && current.moved) {
      const point = screenToGraph(event.clientX, event.clientY);
      if (point && current.graphStart) callbacks.moveAtom?.(current.id, current.origin.x + point.x - current.graphStart.x, current.origin.y + point.y - current.graphStart.y);
    } else if (current.kind === 'orbit' && current.moved) {
      root.rotation.y = clamp(root.rotation.y + dx * 0.007, -1.15, 1.15);
      root.rotation.x = clamp(root.rotation.x + dy * 0.007, -1.1, 1.1);
      canvas.style.cursor = 'grabbing'; invalidate();
    }
    current.lastX = event.clientX; current.lastY = event.clientY;
  }

  function finishPointer(event, cancelled = false) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = gesture; gesture = null;
    guide.visible = false; invalidate();
    try { current.target.releasePointerCapture(event.pointerId); } catch { /* The graph may have been reloaded. */ }
    if (current.moved || cancelled) { suppressClickUntil = performance.now() + 100; suppressClickId = current.id; }
    if (current.kind === 'atom') {
      if (current.moved) callbacks.moveEnd?.(current.id, cancelled);
      else if (!cancelled && (current.target === canvas || current.target === host)) callbacks.selectAtom?.(current.id);
    } else if (current.kind === 'socket' && !cancelled && current.moved) {
      const hit = hitAt(event.clientX, event.clientY, true);
      if (hit?.kind === 'atom' && hit.id !== current.id) callbacks.connectAtoms?.(current.id, hit.id);
      else callbacks.clearSelection?.();
    } else if (current.kind === 'socket' && cancelled) callbacks.clearSelection?.();
    else if (current.kind === 'orbit' && !current.moved && !cancelled && !current.id) callbacks.clearSelection?.();
    canvas.style.cursor = mode === 'orbit' ? 'grab' : 'default';
  }

  const pointerUp = event => finishPointer(event, false);
  const pointerCancel = event => finishPointer(event, true);
  function cancelGesture() { if (gesture) finishPointer({ pointerId: gesture.pointerId }, true); }
  function keyDown(event) {
    if (event.key === 'Escape') { cancelGesture(); callbacks.clearSelection?.(); }
  }
  function wheel(event) {
    event.preventDefault(); event.stopPropagation();
    const delta = clamp(event.deltaY * (event.deltaMode === 1 ? 16 : 1), -120, 120);
    camera.zoom = clamp(camera.zoom * Math.exp(-delta * 0.0018), 0.28, 2.5);
    updateCameraFrame(); invalidate();
  }
  function visibilityChange() { if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; } else invalidate(); }
  function motionChange(event) { reducedMotion = event.matches; invalidate(); }
  function lostContext(event) {
    event.preventDefault(); contextLost = true; host.dataset.status = 'lost';
    if (raf) cancelAnimationFrame(raf); raf = 0;
    const detail = { message: 'The 3D graphics context was interrupted. Use the diagram view to keep editing.' };
    host.dispatchEvent(new CustomEvent('sceneerror', { detail }));
    callbacks.error?.(detail.message);
  }
  function restoredContext() { if (!disposed) { contextLost = false; host.dataset.status = 'ready'; invalidate(); } }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true;
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; } else invalidate();
  }) : null;
  intersectionObserver?.observe(host);
  host.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointermove', pointerMove, { passive: false });
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerCancel);
  window.addEventListener('blur', cancelGesture);
  host.addEventListener('wheel', wheel, { passive: false });
  host.addEventListener('click', stopSceneClick);
  host.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', lostContext);
  canvas.addEventListener('webglcontextrestored', restoredContext);
  document.addEventListener('visibilitychange', visibilityChange);
  motionQuery.addEventListener('change', motionChange);
  function stopSceneClick(event) { event.stopPropagation(); }
  resize(); setMode('edit');

  function dispose() {
    if (disposed) return;
    if (gesture) finishPointer({ pointerId: gesture.pointerId }, true);
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    resizeObserver.disconnect(); intersectionObserver?.disconnect();
    host.removeEventListener('pointerdown', pointerDown);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
    window.removeEventListener('pointercancel', pointerCancel);
    window.removeEventListener('blur', cancelGesture);
    host.removeEventListener('wheel', wheel);
    host.removeEventListener('click', stopSceneClick);
    host.removeEventListener('keydown', keyDown);
    canvas.removeEventListener('webglcontextlost', lostContext);
    canvas.removeEventListener('webglcontextrestored', restoredContext);
    document.removeEventListener('visibilitychange', visibilityChange);
    motionQuery.removeEventListener('change', motionChange);
    atoms.forEach(removeAtom); bonds.forEach(removeBond); ghosts.forEach(removeBond);
    sphereGeometry.dispose(); cylinderGeometry.dispose(); ringGeometry.dispose(); floorGeometry.dispose(); floorMaterial.dispose(); guideGeometry.dispose(); guideMaterial.dispose();
    keyLight.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss();
    canvas.remove(); labelLayer.remove(); announcer.remove(); host.dataset.status = 'disposed';
  }
  return { update, setMode, fit, dispose, screenToGraph };
}
