import { useState } from 'react';
import { CURRICULUM_AREAS, CURRICULUM_STATUS } from '../data/curriculum.js';

export default function CurriculumAtlas() {
  const [activeId, setActiveId] = useState(CURRICULUM_AREAS[0].id);
  const active = CURRICULUM_AREAS.find((area) => area.id === activeId) || CURRICULUM_AREAS[0];
  const liveTopics = CURRICULUM_AREAS.flatMap((area) => area.topics).filter((topic) => topic.status === 'live').length;

  return (
    <section className="curriculum-section" id="curriculum" aria-labelledby="curriculumTitle">
      <header className="curriculum-intro">
        <div>
          <p className="section-code">University chemistry atlas</p>
          <h2 id="curriculumTitle">See the whole degree. Enter where the science is live.</h2>
        </div>
        <div className="atlas-key" aria-label="Curriculum availability key">
          <span><i className="key-live" /> Interactive now</span>
          <span><i className="key-concept" /> Concept boundary</span>
          <span><i className="key-next" /> Needs another engine</span>
        </div>
      </header>

      <div className="curriculum-atlas">
        <div className="discipline-rail" role="tablist" aria-label="Chemistry disciplines">
          <div className="atlas-meter" aria-hidden="true">
            <strong>{liveTopics}</strong>
            <span>live topic clusters</span>
          </div>
          {CURRICULUM_AREAS.map((area) => (
            <button
              key={area.id}
              type="button"
              role="tab"
              aria-selected={area.id === active.id}
              className={area.id === active.id ? 'discipline-tab active' : 'discipline-tab'}
              style={{ '--area-accent': area.accent }}
              onClick={() => setActiveId(area.id)}
            >
              <span>{area.shortName}</span>
              <strong>{area.name}</strong>
            </button>
          ))}
        </div>

        <article className="discipline-detail" key={active.id} style={{ '--area-accent': active.accent }}>
          <div className="discipline-heading">
            <div>
              <p className="discipline-code">{active.shortName} / undergraduate track</p>
              <h3>{active.name}</h3>
              <p>{active.summary}</p>
            </div>
            <div className="discipline-orbit" aria-hidden="true">
              <span>{active.shortName}</span>
              <i /><i /><i />
            </div>
          </div>

          <div className="discipline-body">
            <section className="outcome-block" aria-labelledby={`${active.id}-outcomes`}>
              <p className="atlas-label" id={`${active.id}-outcomes`}>What a learner should be able to do</p>
              <ul>
                {active.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}
              </ul>
            </section>

            <section className="topic-block" aria-labelledby={`${active.id}-topics`}>
              <p className="atlas-label" id={`${active.id}-topics`}>Coverage map</p>
              <div className="topic-grid">
                {active.topics.map((topic) => {
                  const status = CURRICULUM_STATUS[topic.status];
                  return (
                    <article className={`topic-card ${status.tone}`} key={topic.name}>
                      <span>{status.label}</span>
                      <strong>{topic.name}</strong>
                      <p>{topic.detail}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <footer className="discipline-footer">
            <div className="live-lab-list">
              <p className="atlas-label">Available workbenches</p>
              {active.liveLabs.length ? active.liveLabs.map((lab) => (
                <a href={lab.href} key={lab.name}>
                  <span><strong>{lab.name}</strong><small>{lab.detail}</small></span>
                  <b aria-hidden="true">→</b>
                </a>
              )) : <p className="no-live-lab">This discipline is mapped, but no dedicated simulator is claimed yet.</p>}
            </div>
            <div className="model-note">
              <span>Model boundary</span>
              <p>{[active.boundaryAddendum, active.bandBoundary, active.modelBoundary].filter(Boolean).join(' ')}</p>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}
