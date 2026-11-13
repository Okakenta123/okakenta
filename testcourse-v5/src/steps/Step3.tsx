import { placeById, reproduceConditions, rowSeeds, sampleResults, site, testVenue } from '../data/sample';
import { t, type Key } from '../i18n';
import { fmtTime, useStore, useVersionLabel } from '../store';
import { useEvidenceText } from './Step2';

const seedById = Object.fromEntries(rowSeeds.map((r) => [r.id, r]));

function Lock() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
      <rect x="4" y="9" width="12" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Verdict({ pass }: { pass: boolean }) {
  return <span className={`verdict ${pass ? 'pass' : 'fail'}`}>{pass ? `✓ ${t('s3.pass')}` : `✕ ${t('s3.fail')}`}</span>;
}

export function Step3() {
  const versions = useStore((s) => s.versions);
  const results = useStore((s) => s.results);
  const importResults = useStore((s) => s.importResults);
  const applied = useStore((s) => s.appliedProposals);
  const apply = useStore((s) => s.applyProposal);
  const shared = useStore((s) => s.reportShared);
  const share = useStore((s) => s.shareReport);
  const go = useStore((s) => s.go);
  const ev = useEvidenceText();
  const vl = useVersionLabel();
  const ver = versions[versions.length - 1];
  if (!ver) return null;

  const pass = ver.pass;
  const target = Math.round((site.humanThroughput * pass.throughputPct) / 100);
  const robotRows = ver.rows.filter((r) => r.owner === 'robot');
  const excluded = ver.rows.filter((r) => r.owner !== 'robot');
  const R = sampleResults;
  const metrics = [
    { label: t('s2.throughput'), target: `${t('s3.boxesPerHour', { n: target })}（${pass.throughputPct}%）`, measured: t('s3.boxesPerHour', { n: R.throughput }), ok: R.throughput >= target },
    { label: t('s2.success'), target: t('s2.atLeast', { v: pass.successRate }), measured: `${R.successRate}%`, ok: R.successRate >= pass.successRate },
    { label: t('s2.interventions'), target: `${pass.interventions} ${t('s2.perHour')}`, measured: t('s3.timesPerHour', { n: R.interventions }), ok: R.interventions <= pass.interventions },
  ];
  const itemResults = robotRows.map((r) => ({ row: r, res: R.items[r.id] ?? { pass: true, note: '—' } }));
  const overall = metrics.every((m) => m.ok) && itemResults.every((i) => i.res.pass);
  const nextV = ver.v + 1;

  return (
    <div className="step-page">
      <p className="lead">{t('s3.lead')}</p>
      <div className="privacy">
        <Lock />
        <p>{t('s3.privacy')}</p>
      </div>

      <section className="card doc">
        <header className="doc-h">
          <div>
            <h3>{t('s3.planTitle')}</h3>
            <p className="muted small">
              {site.name} · {t('s3.planFrom', { n: ver.v })} · {fmtTime(ver.at)}
            </p>
          </div>
          <span className="ver-chip is-ok">v{ver.v}</span>
        </header>

        <div className="doc-grid">
          <div className="doc-block">
            <h4>{t('s3.venue')}</h4>
            <p>{testVenue}</p>
          </div>
          <div className="doc-block">
            <h4>{t('s3.passLine')}</h4>
            <ul className="kv">
              {metrics.map((m) => (
                <li key={m.label}>
                  <span>{m.label}</span>
                  <b>{m.target}</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="doc-block">
            <h4>{t('s3.reproduce')}</h4>
            <ul className="bullets">
              {reproduceConditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        <h4 className="doc-sub">
          {t('s3.items')} <span className="pill">{robotRows.length}</span>
        </h4>
        <div className="sheet-wrap">
          <table className="sheet plan">
            <thead>
              <tr>
                <th>{t('s2.cols.place')}</th>
                <th>{t('s2.cols.task')}</th>
                <th>{t('s2.cols.cond')}</th>
                <th>{t('s2.cols.pass')}</th>
                <th>{t('s3.method')}</th>
                <th>{t('s3.reason')}</th>
              </tr>
            </thead>
            <tbody>
              {robotRows.map((r) => {
                const m = seedById[r.id].test;
                return (
                  <tr key={r.id}>
                    <td data-l={t('s2.cols.place')}>{placeById[r.place].short}</td>
                    <td data-l={t('s2.cols.task')}>
                      <b>{r.task}</b>
                      <small className="muted block">{t('s3.evidencePrefix')}{ev(r.evidence).src}</small>
                    </td>
                    <td data-l={t('s2.cols.cond')}>{r.condition}</td>
                    <td data-l={t('s2.cols.pass')}>
                      <span className="pass-chip">{r.pass}</span>
                    </td>
                    <td data-l={t('s3.method')}>
                      <span className={`method m-${m.method}`}>{t(`s3.${m.method}` as Key)}</span>
                    </td>
                    <td data-l={t('s3.reason')} className="muted">
                      {m.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {excluded.length > 0 && (
          <div className="excluded">
            <h4>{t('s3.excluded')}</h4>
            <ul>
              {excluded.map((r) => (
                <li key={r.id}>
                  <span className={`owner o-${r.owner}`}>{t(`s2.owners.${r.owner ?? 'out'}` as Key)}</span>
                  {r.task}
                  <small className="muted">（{r.condition}）</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="doc-actions">
          {results === 'none' && (
            <button className="btn btn-primary btn-lg" onClick={importResults}>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
                <path d="M10 3v10M5 8l5 5 5-5M3 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('s3.import')}
            </button>
          )}
          {results === 'importing' && (
            <div className="importing">
              <i />
              {t('s3.importing')}
            </div>
          )}
        </div>
      </section>

      {results === 'ready' && (
        <section className="card doc report">
          <header className="doc-h">
            <div>
              <h3>{t('s3.reportTitle')}</h3>
              <p className="muted small">
                {t('s3.reportFor')} · v{ver.v} · {t('s3.hours', { n: R.hours })}
              </p>
            </div>
            <div className="overall">
              <span className="muted small">{t('s3.overall')}</span>
              <Verdict pass={overall} />
            </div>
          </header>

          <div className="metrics">
            {metrics.map((m) => (
              <div key={m.label} className={`metric ${m.ok ? 'pass' : 'fail'}`}>
                <span className="metric-l">{m.label}</span>
                <b>{m.measured}</b>
                <small>
                  {t('s3.target')}：{m.target}
                </small>
                <Verdict pass={m.ok} />
              </div>
            ))}
          </div>

          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>{t('s2.cols.place')}</th>
                  <th>{t('s2.cols.task')}</th>
                  <th>{t('s2.cols.pass')}</th>
                  <th>{t('s3.measured')}</th>
                  <th>{t('s3.result')}</th>
                </tr>
              </thead>
              <tbody>
                {itemResults.map(({ row, res }) => (
                  <tr key={row.id} className={res.pass ? '' : 'row-fail'}>
                    <td data-l={t('s2.cols.place')}>{placeById[row.place].short}</td>
                    <td data-l={t('s2.cols.task')}>
                      <b>{row.task}</b>
                    </td>
                    <td data-l={t('s2.cols.pass')}>
                      <span className="pass-chip">{row.pass}</span>
                    </td>
                    <td data-l={t('s3.measured')}>
                      <span className={`method m-${seedById[row.id].test.method}`}>{t(`s3.${seedById[row.id].test.method}` as Key)}</span> {res.note}
                    </td>
                    <td data-l={t('s3.result')}>
                      <Verdict pass={res.pass} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="doc-sub">{t('s3.proposals')}</h4>
          <ul className="proposals">
            {R.proposals.map((p) => {
              const done = applied.includes(p.id);
              return (
                <li key={p.id}>
                  <span className="prop-n">→</span>
                  <p>{p.text}</p>
                  <button className="btn btn-secondary btn-sm" disabled={done} onClick={() => apply(p.id)}>
                    {done ? `✓ ${t('s3.applied', { n: nextV })}` : t('s3.apply', { n: nextV })}
                  </button>
                </li>
              );
            })}
          </ul>
          {vl.draft && (
            <p className="draft-note">
              {t('s3.draftNote', { n: nextV })}
              <button className="btn btn-ghost btn-sm" onClick={() => go('s2')}>
                {t('s3.openSheet')} →
              </button>
            </p>
          )}

          <div className="doc-actions">
            <div className="privacy small-privacy">
              <Lock />
              <p>{t('s3.privacy')}</p>
            </div>
            <button className="btn btn-primary btn-lg" disabled={shared} onClick={share}>
              {shared ? `✓ ${t('s3.sharedReport')}` : t('s3.shareReport')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
