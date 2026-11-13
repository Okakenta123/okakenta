import { placeById } from '../data/sample';
import { t, tl } from '../i18n';
import { useStore } from '../store';
import { PlaceChips, Viewer } from '../three/Viewer';
import type { ZoneLook } from '../three/Scene';

const C_PLACE = '#2f6bff';

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
  const selected = useStore((s) => s.selected);
  const finish = useStore((s) => s.finish12);
  const done = useStore((s) => s.done.s12);
  const go = useStore((s) => s.go);

  // 位置の確認はしない。ラベルは場所の名前だけ
  const look = (): ZoneLook => ({ color: C_PLACE, label: '' });
  const sel = selected ? placeById[selected] : null;
  const built = build === 'built';

  return (
    <div className="step-page">
      <p className="lead">{t('s12.lead')}</p>
      <Viewer mode="check" look={look} overlay={<BuildOverlay />} />
      {built && (
        <>
          <PlaceChips look={look} />
          <section className="card">
            <h3 className="card-h">{sel ? sel.name : t('s12.placesTitle')}</h3>
            <p className="muted">{sel ? sel.note : t('s12.placesLead')}</p>
          </section>
        </>
      )}
      <div className="footer-bar">
        <span className="muted small">{built ? '' : t('s12.needBuild')}</span>
        <button className="btn btn-primary btn-lg" disabled={!built} onClick={() => (done ? go('s2') : finish())}>
          {t('s12.next')} →
        </button>
      </div>
    </div>
  );
}
