import { site } from '../data/sample';
import { t, type Key } from '../i18n';
import { STEPS, canEnter, rowStatus, useStore, useVersionLabel, type Actor } from '../store';

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
        <rect width="32" height="32" rx="8" fill="var(--brand)" />
        <path d="M8 22 L16 8 L24 22 Z" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="2.4" fill="#fbbf24" />
      </svg>
      <b>{t('app.name')}</b>
    </span>
  );
}

export function Avatar({ who, size = 28 }: { who: Actor; size?: number }) {
  const label = who === 'site' ? site.people.site.initial : who === 'robot' ? site.people.robot.initial : who === 'ai' ? 'AI' : '•';
  return (
    <span className={`avatar av-${who}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {label}
    </span>
  );
}

export function AppBar() {
  const step = useStore((s) => s.step);
  const showToast = useStore((s) => s.showToast);
  const v = useVersionLabel();
  return (
    <header className="appbar">
      <Logo />
      <nav className="crumbs" aria-label="breadcrumb">
        <span>{site.name}</span>
        <span className="sep">/</span>
        <span>{t('app.crumbProject')}</span>
        <span className="sep">/</span>
        <b>
          {t(`steps.${step}.no` as Key)} {t(`steps.${step}.title` as Key)}
        </b>
      </nav>
      <span className={`ver ${v.draft ? 'is-draft' : v.confirmed ? 'is-ok' : ''}`}>{v.label}</span>
      <div className="appbar-right">
        <div className="people">
          <span title={`${site.people.site.name}（${t('app.roleSite')}・${site.people.site.role}）`}>
            <Avatar who="site" />
          </span>
          <span title={`${site.people.robot.name}（${t('app.roleRobot')}・${site.people.robot.role}）`}>
            <Avatar who="robot" />
          </span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => showToast(t('app.shared'))}>
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
            <path d="M14 6l-4-4-4 4M10 2v11M4 11v5h12v-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hide-sm">{t('app.share')}</span>
        </button>
      </div>
    </header>
  );
}

export function Stepper() {
  const step = useStore((s) => s.step);
  const done = useStore((s) => s.done);
  const go = useStore((s) => s.go);
  return (
    <ol className="stepper">
      {STEPS.map((s) => {
        const enabled = canEnter(done, s);
        return (
          <li key={s}>
            <button className={`step ${step === s ? 'on' : ''} ${done[s] ? 'done' : ''}`} disabled={!enabled} onClick={() => go(s)} title={enabled ? '' : t('steps.locked')}>
              <span className="step-no">{done[s] && step !== s ? '✓' : t(`steps.${s}.no` as Key)}</span>
              <span className="step-txt">
                <b>{t(`steps.${s}.title` as Key)}</b>
                <small>{t(`steps.${s}.who` as Key)}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function SidePanel() {
  const rows = useStore((s) => s.rows);
  const pass = useStore((s) => s.pass);
  const activity = useStore((s) => s.activity);
  const step = useStore((s) => s.step);
  const answers = useStore((s) => s.answers.length);
  const photos = useStore((s) => s.photos.filter((p) => p.selected).length);
  const checked = useStore((s) => s.checkedPlaces.length);
  const all = [...rows, pass];
  const total = all.length;
  const agreed = all.filter((r) => rowStatus(r) === 'agreed').length;
  const okS = all.filter((r) => r.okSite).length;
  const okR = all.filter((r) => r.okRobot).length;
  const pct = Math.round((agreed / total) * 100);

  return (
    <aside className="side">
      <section className="card side-card">
        <h3 className="card-h">{t('side.status')}</h3>
        <div className="meter" aria-label={t('side.agreed', { a: agreed, t: total })}>
          <div className="meter-bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="meter-row">
          <span>{t('side.agreed', { a: agreed, t: total })}</span>
          <b>{pct}%</b>
        </div>
        <div className="okcount">
          <div>
            <Avatar who="site" size={22} />
            <span>{t('side.okSite')}</span>
            <b>
              {okS}/{total}
            </b>
          </div>
          <div>
            <Avatar who="robot" size={22} />
            <span>{t('side.okRobot')}</span>
            <b>
              {okR}/{total}
            </b>
          </div>
        </div>
        {step === 's11' && <p className="muted small">{t('side.progress11', { a: Math.min(answers, 4), p: Math.min(photos, 3) })}</p>}
        {step === 's12' && <p className="muted small">{t('side.progress12', { a: checked })}</p>}
      </section>
      <section className="card side-card side-activity">
        <h3 className="card-h">{t('side.activity')}</h3>
        {activity.length === 0 ? (
          <p className="muted small">{t('side.empty')}</p>
        ) : (
          <ul className="feed">
            {activity.map((a) => (
              <li key={a.id}>
                <Avatar who={a.who} size={20} />
                <span className="feed-t">{a.text}</span>
                <time>{a.at}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
