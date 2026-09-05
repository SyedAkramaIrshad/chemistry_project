import HeroMolecule from './HeroMolecule.jsx';

export default function Hero() {
  return (
    <>
      <section className="hero" id="top" aria-labelledby="heroTitle">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="signal-dot" aria-hidden="true" />
            Open university chemistry workbench
          </div>
          <h1 id="heroTitle">Don’t memorize the molecule. <span>Take it apart.</span></h1>
          <p>
            Place every atom. Break one bond without deleting either atom. Attempt the next
            connection yourself—and when chemistry refuses, see the exact reason on the field.
          </p>
          <div className="hero-actions">
            <button className="btn primary" id="heroStartBtn" type="button" onClick={() => { window.location.hash = 'laboratory'; }}>
              Open the molecular playground <span aria-hidden="true">→</span>
            </button>
            <button className="btn ghost" type="button" data-load-preset="C2H5OH" onClick={() => { window.location.hash = 'laboratory'; }}>
              Load ethanol
            </button>
          </div>
          <div className="hero-proof" role="list" aria-label="Workbench capabilities">
            <div role="listitem"><strong>Manual</strong><span>every bond edit</span></div>
            <div role="listitem"><strong>Preserved</strong><span>atoms after bond breaking</span></div>
            <div role="listitem"><strong>Explained</strong><span>every rejected attempt</span></div>
          </div>
        </div>

        <div className="hero-side">
          <HeroMolecule />
        </div>
      </section>

      <section className="lab-intro" aria-labelledby="labIntroTitle">
        <div>
          <p className="section-code">CORE EXPERIENCE / MOLECULAR PLAYGROUND</p>
          <h2 id="labIntroTitle">Your molecule is not an answer. It is something you can change.</h2>
        </div>
        <ol className="lab-steps" aria-label="How to build a molecule">
          <li><span>1</span><strong>Place</strong><small>atoms on the table</small></li>
          <li><span>2</span><strong>Rewrite</strong><small>break or form one bond</small></li>
          <li><span>3</span><strong>Understand</strong><small>read why it changed—or did not</small></li>
        </ol>
      </section>
    </>
  );
}
