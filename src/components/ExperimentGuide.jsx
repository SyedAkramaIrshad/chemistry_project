export default function ExperimentGuide() {
  return (
    <section className="panel experiment-panel" id="experimentGuide">
      <div className="panel-header split">
        <div>
          <span className="panel-code">PLAY THIS FIRST · BOND REWRITE</span>
          <h2>Can nitrogen connect to oxygen?</h2>
          <p>Water begins with both O–H bonds intact. Select one bond, break only that bond, then attempt N–O yourself.</p>
        </div>
        <span className="experiment-badge">3 learner actions</span>
      </div>
      <div className="panel-body">
        <div className="mission-actions">
          <button className="btn secondary small" id="missionStartBtn" type="button">Start with H₂O + N</button>
          <button className="btn ghost small" id="missionResetBtn" type="button" disabled>Restart</button>
        </div>

        <div className="mission-progress" aria-label="Experiment progress">
          <div><span>Progress</span><strong id="missionProgressText">0 / 3</strong></div>
          <div className="mission-progress-track" aria-hidden="true"><i id="missionProgressBar" /></div>
        </div>

        <ol className="mission-steps" aria-label="Bond rewrite challenge steps">
          <li id="missionStepLoad"><i>1</i><span><strong>See the starting graph</strong><small>H₂O and N are separate. No bond has been changed.</small></span></li>
          <li id="missionStepBreak"><i>2</i><span><strong>Select O–H and break it</strong><small>Both atoms remain; oxygen gains an open socket.</small></span></li>
          <li id="missionStepConnect"><i>3</i><span><strong>Drag the O socket onto N</strong><small>Single mode tests only the bond you requested.</small></span></li>
        </ol>

        <div className="mission-observation" id="missionObservation" aria-live="polite">
          <span>What to notice</span>
          <p>A permitted graph edit is not proof of a spontaneous reaction or stable isolated product. The playground teaches what changed—and what did not.</p>
        </div>

        <details className="teacher-note">
          <summary>Teaching prompt</summary>
          <p>Ask: “Why could N not attach before the O–H bond was broken?” Then compare the oxygen electron and bond count after each learner action.</p>
        </details>

        <div className="trace-heading">
          <div><span>Experiment trace</span><strong>Every action leaves evidence</strong></div>
          <span className="trace-live"><i /> live</span>
        </div>
        <div className="experiment-log" id="experimentLog" aria-live="polite">
          <div className="trace-empty">Load the challenge or edit the canvas to begin your notebook.</div>
        </div>
      </div>
    </section>
  );
}
