import Brand from './Brand.jsx';

export default function Footer() {
  const openMethod = () => document.getElementById('howBtn')?.click();

  return (
    <footer className="site-footer">
      <Brand footer />
      <p>Runs entirely in your browser. No account, backend, or uploaded chemistry data.</p>
      <div>
        <button className="footer-link" type="button" onClick={openMethod}>Read the method</button>
        <a className="footer-link" href="/1000_CHEMICAL_AUDIT.html" target="_blank" rel="noopener noreferrer">View the audit ↗</a>
      </div>
    </footer>
  );
}
