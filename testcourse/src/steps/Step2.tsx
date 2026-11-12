import { placeById, places, questions, site, type Evidence, type Owner, type PlaceId } from '../data/sample';
import { t, type Key } from '../i18n';
import { placeStatus, rowStatus, useStore, useVersionLabel, type Row, type RowStatus } from '../store';
import { Avatar } from '../components/Shell';
import { PlaceChips, Viewer } from '../three/Viewer';
import type { ZoneLook } from '../three/Scene';

export const STATUS_COLOR: Record<RowStatus, string> = { none: '#64748b', half: '#e0a400', agreed: '#16a34a' };
const OWNERS: Owner[] = ['robot', 'human', 'out'];

export function useEvidenceText() {
  const answers = useStore((s) => s.answers);
  return (e: Evidence) =>
    e.type === 'answer'
      ? { quote: answers[e.q] ?? questions[e.q].example, src: t('s11.fromAnswer', { n: e.q + 1 }) }
      : { quote: e.text, src: t('s11.fromPhoto') };
}

export function StatusBadge({ s }: { s: RowStatus }) {
  return (
    <span className={`status st-${s}`}>
      <i />
      {t(`s2.status.${s}` as Key)}
    </span>
  );
}

function OkButtons({ okSite, okRobot, disabled, onSite, onRobot }: { okSite: boolean; okRobot: boolean; disabled?: boolean; onSite: () => void; onRobot: () => void }) {
  return (
    <div className="okbtns">
      <button className={`okbtn ok-site ${okSite ? 'on' : ''}`} disabled={disabled} onClick={onSite} aria-pressed={okSite}>
        <Avatar who="site" size={18} />
        {t('s2.okSite')}
        {okSite && <b>✓</b>}
      </button>
      <button className={`okbtn ok-robot ${okRobot ? 'on' : ''}`} disabled={disabled} onClick={onRobot} aria-pressed={okRobot}>
        <Avatar who="robot" size={18} />
        {t('s2.okRobot')}
        {okRobot && <b>✓</b>}
      </button>
    </div>
  );
}

function TaskCard({ row }: { row: Row }) {
  const setOwner = useStore((s) => s.setOwner);
  const setCondition = useStore((s) => s.setCondition);
  const commitCondition = useStore((s) => s.commitCondition);
  const toggleOk = useStore((s) => s.toggleOk);
  const ev = useEvidenceText()(row.evidence);
  const st = rowStatus(row);
  return (
    <article className={`task st-${st}`}>
      <header>
        <h4>{row.task}</h4>
        <StatusBadge s={st} />
      </header>
      <blockquote className="evidence">
        <span className="evidence-l">{t('s2.evidence')}</span>
        <p>「{ev.quote}」</p>
        <small>
          {row.evidence.type === 'answer' ? `${site.people.site.name}・${ev.src}` : ev.src}
        </small>
      </blockquote>
      <div className="field">
        <label>{t('s2.owner')}</label>
        <div className="seg seg-owner">
          {OWNERS.map((o) => (
            <button key={o} className={`${row.owner === o ? 'on' : ''} o-${o}`} onClick={() => setOwner(row.id, o)}>
              {t(`s2.owners.${o}` as Key)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`c-${row.id}`}>{t('s2.condition')}</label>
        <input
          id={`c-${row.id}`}
          value={row.condition}
          placeholder={t('s2.conditionPh')}
          onChange={(e) => setCondition(row.id, e.target.value)}
          onBlur={() => commitCondition(row.id)}
        />
      </div>
      <OkButtons okSite={row.okSite} okRobot={row.okRobot} disabled={!row.owner} onSite={() => toggleOk(row.id, 'site')} onRobot={() => toggleOk(row.id, 'robot')} />
      <p className="hint">{t('s2.resetNote')}</p>
    </article>
  );
}

function PlacePanel() {
  const selected = useStore((s) => s.selected);
  const rows = useStore((s) => s.rows);
  if (!selected) return <section className="card place-panel empty-panel">{t('s2.pickPlace')}</section>;
  const p = placeById[selected];
  const rs = rows.filter((r) => r.place === selected);
  return (
    <section className="card place-panel">
      <h3 className="card-h">
        {t('s2.tasksAt', { place: p.name })}
        <span className="pill">{rs.length}</span>
      </h3>
      <div className="tasks">
        {rs.map((r) => (
          <TaskCard key={r.id} row={r} />
        ))}
      </div>
    </section>
  );
}

function PassLine() {
  const pass = useStore((s) => s.pass);
  const setPass = useStore((s) => s.setPass);
  const togglePassOk = useStore((s) => s.togglePassOk);
  const n = Math.round((site.humanThroughput * pass.throughputPct) / 100);
  return (
    <div className="passline">
      <div className="passline-h">
        <h4>{t('s2.passTitle')}</h4>
        <StatusBadge s={rowStatus(pass)} />
      </div>
      <div className="pass-grid">
        <div className="field">
          <label>{t('s2.throughput')}</label>
          <input type="range" min={50} max={100} step={5} value={pass.throughputPct} onChange={(e) => setPass({ throughputPct: Number(e.target.value) })} />
          <small>{t('s2.throughputVal', { base: site.humanThroughput, pct: pass.throughputPct, n })}</small>
        </div>
        <div className="field">
          <label>{t('s2.success')}</label>
          <select value={pass.successRate} onChange={(e) => setPass({ successRate: Number(e.target.value) })}>
            {[95, 98, 99, 99.5].map((v) => (
              <option key={v} value={v}>
                {t('s2.atLeast', { v })}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('s2.interventions')}</label>
          <select value={pass.interventions} onChange={(e) => setPass({ interventions: Number(e.target.value) })}>
            {[1, 2, 3, 5].map((v) => (
              <option key={v} value={v}>
                {v} {t('s2.perHour')}
              </option>
            ))}
          </select>
        </div>
      </div>
      <OkButtons okSite={pass.okSite} okRobot={pass.okRobot} onSite={() => togglePassOk('site')} onRobot={() => togglePassOk('robot')} />
    </div>
  );
}

function Sheet() {
  const rows = useStore((s) => s.rows);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const ev = useEvidenceText();
  return (
    <div className="sheet-wrap">
      <table className="sheet">
        <thead>
          <tr>
            <th>{t('s2.cols.place')}</th>
            <th>{t('s2.cols.task')}</th>
            <th>{t('s2.cols.owner')}</th>
            <th>{t('s2.cols.cond')}</th>
            <th>{t('s2.cols.evidence')}</th>
            <th>{t('s2.cols.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const e = ev(r.evidence);
            return (
              <tr key={r.id} className={selected === r.place ? 'sel' : ''} onClick={() => select(r.place)}>
                <td data-l={t('s2.cols.place')}>{placeById[r.place].short}</td>
                <td data-l={t('s2.cols.task')}>
                  <b>{r.task}</b>
                </td>
                <td data-l={t('s2.cols.owner')}>{r.owner ? <span className={`owner o-${r.owner}`}>{t(`s2.owners.${r.owner}` as Key)}</span> : <span className="muted">{t('s2.unset')}</span>}</td>
                <td data-l={t('s2.cols.cond')}>{r.condition || '—'}</td>
                <td data-l={t('s2.cols.evidence')} className="ev-cell">
                  <span title={e.quote}>{e.src}</span>
                </td>
                <td data-l={t('s2.cols.status')}>
                  <StatusBadge s={rowStatus(r)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Versions() {
  const versions = useStore((s) => s.versions);
  const draft = useStore((s) => s.draftChanges);
  const rows = useStore((s) => s.rows);
  const pass = useStore((s) => s.pass);
  const confirm = useStore((s) => s.confirmVersion);
  const go = useStore((s) => s.go);
  const v = useVersionLabel();
  const remaining = [...rows, pass].filter((r) => rowStatus(r) !== 'agreed').length;
  const nextV = v.confirmed + 1;
  const needConfirm = !versions.length || draft.length > 0;
  return (
    <div className="versions">
      <div className="versions-action">
        {needConfirm ? (
          <>
            <button className="btn btn-primary btn-lg" disabled={remaining > 0} onClick={confirm}>
              {t('s2.confirm', { n: nextV })}
            </button>
            {remaining > 0 && <span className="muted small">{t('s2.confirmNeed', { n: remaining })}</span>}
          </>
        ) : (
          <>
            <span className="badge badge-green">✓ {t('s2.confirmedAt', { n: v.confirmed })}</span>
            <button className="btn btn-primary btn-lg" onClick={() => go('s3')}>
              {t('s2.next')} →
            </button>
          </>
        )}
      </div>
      {(versions.length > 0 || draft.length > 0) && (
        <div className="history">
          <h4>{t('s2.history')}</h4>
          <ol>
            {draft.length > 0 && (
              <li className="h-draft">
                <span className="hv">{t('app.versionDraft', { n: nextV })}</span>
                <div>
                  <b>{t('s2.draftChanges', { n: nextV })}</b>
                  <ul>
                    {draft.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </li>
            )}
            {[...versions].reverse().map((ver) => (
              <li key={ver.v}>
                <span className="hv ok">v{ver.v}</span>
                <div>
                  <b>
                    {t('s2.confirmedAt', { n: ver.v })} · {ver.at}
                  </b>
                  {ver.changes.length > 0 && (
                    <ul>
                      {ver.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function Step2() {
  const rows = useStore((s) => s.rows);
  const look = (p: PlaceId): ZoneLook => {
    const st = placeStatus(rows, p);
    return { color: STATUS_COLOR[st], label: t(`s2.status.${st}` as Key) };
  };
  const v = useVersionLabel();
  return (
    <div className="step-page">
      <p className="lead">{t('s2.lead')}</p>
      <div className="s2-top">
        <div className="s2-viewer">
          <Viewer
            mode="agree"
            look={look}
            legend={(['none', 'half', 'agreed'] as RowStatus[]).map((s) => ({ color: STATUS_COLOR[s], label: t(`s2.legend.${s}` as Key) }))}
          />
          <PlaceChips look={look} />
        </div>
        <PlacePanel />
      </div>
      <section className="card">
        <h3 className="card-h">
          {t('s2.sheetTitle')}
          <span className={`ver-chip ${v.draft ? 'is-draft' : v.confirmed ? 'is-ok' : ''}`}>{v.label}</span>
          <span className="pill">{t('s2.sheetCount', { p: places.length, n: rows.length })}</span>
        </h3>
        <Sheet />
        <PassLine />
        <Versions />
      </section>
    </div>
  );
}
