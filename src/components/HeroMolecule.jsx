import { useEffect, useRef, useState } from 'react';

const SCENES = [
  {
    name: 'Water', formula: 'H₂O', preset: 'H2O',
    atoms: [
      { symbol: 'O', x: 0, y: -18, radius: 42, color: '#ff6b6b', electrons: 6, depth: 16 },
      { symbol: 'H', x: -112, y: 72, radius: 28, color: '#e8f4fb', electrons: 1, depth: 7 },
      { symbol: 'H', x: 112, y: 72, radius: 28, color: '#e8f4fb', electrons: 1, depth: 10 },
    ],
    bonds: [[0, 1, 1], [0, 2, 1]],
  },
  {
    name: 'Carbon dioxide', formula: 'CO₂', preset: 'CO2',
    atoms: [
      { symbol: 'O', x: -138, y: 0, radius: 38, color: '#ff6b6b', electrons: 6, depth: 8 },
      { symbol: 'C', x: 0, y: 0, radius: 43, color: '#71869a', electrons: 4, depth: 18 },
      { symbol: 'O', x: 138, y: 0, radius: 38, color: '#ff6b6b', electrons: 6, depth: 10 },
    ],
    bonds: [[0, 1, 2], [1, 2, 2]],
  },
  {
    name: 'Methane', formula: 'CH₄', preset: 'CH4',
    atoms: [
      { symbol: 'C', x: 0, y: 0, radius: 43, color: '#71869a', electrons: 4, depth: 18 },
      { symbol: 'H', x: 0, y: -132, radius: 27, color: '#e8f4fb', electrons: 1, depth: 6 },
      { symbol: 'H', x: 130, y: 38, radius: 27, color: '#e8f4fb', electrons: 1, depth: 11 },
      { symbol: 'H', x: 0, y: 132, radius: 27, color: '#e8f4fb', electrons: 1, depth: 8 },
      { symbol: 'H', x: -130, y: 38, radius: 27, color: '#e8f4fb', electrons: 1, depth: 13 },
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
  },
];

function drawBond(ctx, from, to, order) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const offsets = order === 2 ? [-5, 5] : [0];

  offsets.forEach((offset) => {
    const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, 'rgba(99,230,255,.28)');
    gradient.addColorStop(.5, 'rgba(223,248,255,.92)');
    gradient.addColorStop(1, 'rgba(167,139,250,.36)');
    ctx.beginPath();
    ctx.moveTo(from.x + nx * offset, from.y + ny * offset);
    ctx.lineTo(to.x + nx * offset, to.y + ny * offset);
    ctx.lineWidth = order === 2 ? 3 : 5;
    ctx.strokeStyle = gradient;
    ctx.shadowColor = 'rgba(99,230,255,.35)';
    ctx.shadowBlur = 10;
    ctx.stroke();
  });
  ctx.shadowBlur = 0;
}

function drawAtom(ctx, atom, position, time, index) {
  const { x, y, radius } = position;
  const halo = ctx.createRadialGradient(x, y, radius * .35, x, y, radius * 1.75);
  halo.addColorStop(0, `${atom.color}55`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.75, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  const fill = ctx.createRadialGradient(x - radius * .3, y - radius * .35, radius * .1, x, y, radius);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(.17, atom.color);
  fill.addColorStop(1, atom.symbol === 'H' ? '#8ca4b6' : '#293d55');
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.shadowColor = `${atom.color}88`;
  ctx.shadowBlur = 24;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.stroke();

  ctx.fillStyle = atom.symbol === 'H' ? '#152a40' : '#f7fcff';
  ctx.font = `800 ${Math.max(18, radius * .65)}px "SFMono-Regular", Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(atom.symbol, x, y + 1);

  const visibleElectrons = Math.min(atom.electrons, 6);
  for (let electron = 0; electron < visibleElectrons; electron += 1) {
    const angle = (Math.PI * 2 * electron) / visibleElectrons + time * .00018 * (index % 2 ? -1 : 1);
    const orbit = radius + 14;
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = electron % 2 ? '#a78bfa' : '#63e6ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export default function HeroMolecule() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = SCENES[sceneIndex];

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !stage || !context) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const bounds = stage.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);
      const scale = Math.min(width / 520, height / 520);
      const centerX = width / 2;
      const centerY = height * .43;
      const pointer = pointerRef.current;

      for (let point = 0; point < 28; point += 1) {
        const angle = point * 2.399 + time * .000035 * (point % 3 + 1);
        const orbit = (52 + (point * 31) % 210) * scale;
        const x = centerX + Math.cos(angle) * orbit + pointer.x * (point % 5);
        const y = centerY + Math.sin(angle) * orbit * .72 + pointer.y * (point % 4);
        context.beginPath();
        context.arc(x, y, point % 6 === 0 ? 1.8 : 1, 0, Math.PI * 2);
        context.fillStyle = point % 4 === 0 ? 'rgba(167,139,250,.55)' : 'rgba(99,230,255,.42)';
        context.fill();
      }

      const positions = scene.atoms.map((atom, index) => ({
        x: centerX + atom.x * scale + pointer.x * atom.depth + Math.sin(time * .0007 + index) * 2.2,
        y: centerY + atom.y * scale + pointer.y * atom.depth + Math.cos(time * .00065 + index * 1.4) * 2.2,
        radius: atom.radius * scale,
      }));

      scene.bonds.forEach(([from, to, order]) => drawBond(context, positions[from], positions[to], order));
      scene.atoms.forEach((atom, index) => drawAtom(context, atom, positions[index], time, index));

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw(performance.now());
    const observer = new ResizeObserver(() => {
      resize();
      if (reducedMotion) draw(0);
    });
    observer.observe(stage);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [scene]);

  const trackPointer = (event) => {
    const bounds = stageRef.current.getBoundingClientRect();
    pointerRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width - .5) * 1.7,
      y: ((event.clientY - bounds.top) / bounds.height - .5) * 1.7,
    };
  };

  const resetPointer = () => {
    pointerRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      className="molecule-stage"
      id="heroMoleculeStage"
      ref={stageRef}
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
    >
      <div className="stage-grid" aria-hidden="true" />
      <canvas ref={canvasRef} id="heroMoleculeCanvas" aria-hidden="true" />

      <div className="stage-topline">
        <span><i /> Live molecular field</span>
        <button
          className="stage-cycle"
          id="moleculeCycleBtn"
          type="button"
          onClick={() => setSceneIndex((current) => (current + 1) % SCENES.length)}
        >
          Cycle molecule <span aria-hidden="true">↻</span>
        </button>
      </div>

      <div className="stage-axis stage-axis-x" aria-hidden="true" />
      <div className="stage-axis stage-axis-y" aria-hidden="true" />
      <div className="stage-hint" aria-hidden="true">Move your pointer through the field</div>

      <div className="stage-readout">
        <div>
          <span>Selected specimen</span>
          <strong id="heroMoleculeName">{scene.name}</strong>
        </div>
        <b id="heroMoleculeFormula">{scene.formula}</b>
        <button
          className="stage-load"
          id="heroLoadMolecule"
          type="button"
          data-load-preset={scene.preset}
        >
          Build this molecule <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
