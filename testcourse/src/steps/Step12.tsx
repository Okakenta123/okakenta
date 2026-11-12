import { placeById, places, type PlaceId } from '../data/sample';
import { t, tl } from '../i18n';
import { useStore } from '../store';
import { PlaceChips, Viewer } from '../three/Viewer';
import type { ZoneLook } from '../three/Scene';

const C_OK = '#2f6bff';
const C_TODO = '#64748b';

function BuildOverlay() {
  const build = useStore((s) => s.build);
  const stage = useStore((s) => s.buildStage);
  const allPhotos = useStore((s) => s.photos);
  const photos = allPhotos.filter((p) => p.selected);
  const answers = useStore((s) => s.answers.length);
  const buildScene = useStore((s) => s.buildScene);
  if (build === 'built') return null;
  const stages = tl('s12.stages');
  return (
    <div className={`build-overlay ${build === 'building' ? 'is-building' : ''}`}>
      {build === 'none' ? (
        <div className="build-card">
          <div className="build-photos">
            {photos.slice(0, 4).map((p, i) => (
              <img key={p.id} src={p.url} alt={p.name} style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }} />
            ))}
          </div>
          <p>{t('s12.placeholder', { p: photos.length, a: answers })}</p>
          <button className="btn btn-primary btn-lg" onClick={buildScene}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
              <path d="M10 2l7 4v8l-7 4-7-4V6z M3 6l7 4 7-4 M10 10v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
            {t('s12.build')}
          </button>
        </div>
      ) : (
        <div className="build-progress">
          <b>{t('s12.building')}</b>
          <ol>
            {stages.map((s, i) => (
              <li key={s} className={i < stage ? 'done' : i === stage ? 'now' : ''}>
                <i />
                {s}
              </li>
            ))}
          </ol>
          <div className="meter">
            <div className="meter-bar" style={{ width: `${(stage / stages.length) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Step12() {
  const build = useStore((s) => s.build);
  const checked = useStore((s) => s.checkedPlaces);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const checkPlace = useStore((s) => s.checkPlace);
  const finish = useStore((s) => s.finish12);
  const done = useStore((s) => s.done.s12);
  const go = useStore((s) => s.go);

  const look = (p: PlaceId): ZoneLook =>
    checked.includes(p) ? { color: C_OK, label: t('s12.confirmed') } : { color: C_TODO, label: t('s12.unconfirmed'), badge: 'dash' };
  const sel = selected ? placeById[selected] : null;

  return (
    <div className="step-page">
      <p className="lead">{t('s12.lead')}</p>
      <Viewer
        mode="check"
        look={look}
        overlay={<BuildOverlay />}
        legend={[
          { color: C_TODO, label: t('s12.unconfirmed') },
          { color: C_OK, label: t('s12.confirmed') },
        ]}
      />
      {build === 'built' && (
        <>
          <PlaceChips look={look} />
          <div className="grid-2 s12-panel">
            <section className="card">
              <h3 className="card-h">{sel ? sel.name : t('s12.checkTitle')}</h3>
              {sel ? (
                <>
                  <p className="muted">{sel.note}</p>
                  <div className="place-actions">
                    {checked.includes(sel.id) ? (
                      <span className="badge badge-ok">✓ {t('s12.confirmed')}</span>
                    ) : (
                      <button className="btn btn-primary" onClick={() => checkPlace(sel.id)}>
                        ✓ {t('s12.confirmPlace')}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="muted">{t('s12.checkLead')}</p>
              )}
            </section>
            <section className="card">
              <h3 className="card-h">
                {t('s12.checkTitle')}
                <span className="pill">{checked.length}/5</span>
              </h3>
              <ul className="checklist">
                {places.map((p, i) => (
                  <li key={p.id}>
                    <button className={selected === p.id ? 'on' : ''} onClick={() => select(p.id)}>
                      <span className={`ck ${checked.includes(p.id) ? 'ok' : ''}`}>{checked.includes(p.id) ? '✓' : i + 1}</span>
                      {p.name}
                      <small>{checked.includes(p.id) ? t('s12.confirmed') : t('s12.unconfirmed')}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
      <div className="footer-bar">
        <span className="muted small">{checked.length < 5 ? t('s12.needAll') : ''}</span>
        <button className="btn btn-primary btn-lg" disabled={checked.length < 5} onClick={() => (done ? go('s2') : finish())}>
          {t('s12.confirmAll')} →
        </button>
      </div>
    </div>
  );
}
