export default function Brand({ footer = false }) {
  return (
    <div className={`brand${footer ? ' footer-brand' : ''}`}>
      <div className="brand-mark" aria-hidden="true">
        <span>C</span>
        <small>2</small>
      </div>
      <div>
        <strong>ChemLab Studio</strong>
        <small>{footer ? 'Built to explain, never to bluff.' : 'Open chemistry studio'}</small>
      </div>
    </div>
  );
}
