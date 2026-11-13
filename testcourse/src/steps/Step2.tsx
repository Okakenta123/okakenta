// ステップ 2：シミュレーションで合意（Figma のレビュー画面のような共同編集）
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { cursorTour, placeById, places, questions, site, type Evidence, type Owner, type Party, type PlaceId } from '../data/sample';
import { t, type Key } from '../i18n';
import { openThreads, usePlaceStates, useStore, useVersionLabel, type PlaceState, type Row, type Thread } from '../store';
import { Avatar } from '../components/Shell';
import { relTime, useNow } from '../components/time';
import { Viewer } from '../three/Viewer';
import type { ZoneLook } from '../three/Scene';
import { anchorRef, moveAnchor, type V3 } from '../three/anchors';

export const STATE_COLOR: Record<PlaceState, string> = { discussing: '#e8930c', ready: '#16a34a' };
const OWNERS: Owner[] = ['robot', 'human', 'out'];
const MEASURE = '#e5446d';

export function useEvidenceText() {
  const answers = useStore((s) => s.answers);
  return (e: Evidence) =>
    e.type === 'answer'
      ? { quote: answers[e.q] ?? questions[e.q].example, src: t('s11.fromAnswer', { n: e.q + 1 }) }
      : { quote: e.text, src: t('s11.fromPhoto') };
}

export function StateBadge({ s }: { s: PlaceState }) {
  return (
    <span className={`status st-${s}`}>
      <i />
      {t(`s2.status.${s}` as Key)}
    </span>
  );
}

const other = (p: Party): Party => (p === 'site' ? 'robot' : 'site');
const nameOf = (p: Party) => site.people[p].name;

// ---------------------------------------------------------------- 左パネル
function PlaceList() {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const rows = useStore((s) => s.rows);
  const threads = useStore((s) => s.threads);
  const st = usePlaceStates();
  const groups: PlaceState[] = ['discussing', 'ready'];
  return (
    <nav className="ws-left" aria-label={t('s2.places')}>
      <div className="ws-left-scroll">
        {groups.map((g) => {
          const items = places.filter((p) => st.map[p.id] === g);
          return (
            <section key={g} className={`plist g-${g}`}>
              <h4>
                <i style={{ background: STATE_COLOR[g] }} />
                {t(`s2.${g}` as Key)}
                <span>{items.length}</span>
              </h4>
              <ul>
                {items.map((p) => {
                  const n = openThreads(threads, p.id).length;
                  const un = rows.filter((r) => r.place === p.id && !r.owner).length;
                  const idx = places.indexOf(p) + 1;
                  return (
                    <li key={p.id}>
                      <button className={selected === p.id ? 'on' : ''} onClick={() => select(p.id)}>
                        <span className="pl-n" style={{ background: STATE_COLOR[g] }}>
                          {idx}
                        </span>
                        <span className="pl-name">{p.name}</span>
                        <span className="pl-meta">
                          {n > 0 && <span className="pl-c">{t('s2.comments', { n })}</span>}
                          {un > 0 && <span className="pl-u">{t('s2.unassigned', { n: un })}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && <li className="pl-empty">—</li>}
              </ul>
            </section>
          );
        })}
        <button className={`pl-line ${selected === null ? 'on' : ''}`} onClick={() => select(null)}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
            <path d="M3 14h14M5 14V9M9 14V6M13 14v-4M17 14V4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
          <span>
            <b>{t('s2.lineWide')}</b>
            <small>{t('s2.lineWideSub')}</small>
          </span>
        </button>
      </div>
      <ConfirmBox />
    </nav>
  );
}

function ConfirmBox() {
  const st = usePlaceStates();
  const versions = useStore((s) => s.versions);
  const draft = useStore((s) => s.draftChanges);
  const confirm = useStore((s) => s.confirmVersion);
  const go = useStore((s) => s.go);
  const v = useVersionLabel();
  const nextV = v.confirmed + 1;
  const needConfirm = !versions.length || draft.length > 0;
  const allReady = st.ready === st.total;
  return (
    <div className="ws-confirm">
      <div className="meter">
        <div className="meter-bar" style={{ width: `${(st.ready / st.total) * 100}%` }} />
      </div>
      <div className="meter-row">
        <span>{t('s2.readyCount', { a: st.ready, t: st.total })}</span>
        <span className={`ver-chip ${v.draft ? 'is-draft' : v.confirmed ? 'is-ok' : ''}`}>{v.label}</span>
      </div>
      {needConfirm ? (
        <>
          <button className="btn btn-primary" disabled={!allReady} onClick={confirm}>
            {t('s2.confirm', { n: nextV })}
          </button>
          {!allReady && <p className="muted small">{t('s2.confirmNeed', { n: st.total - st.ready })}</p>}
        </>
      ) : (
        <>
          <span className="badge badge-green">✓ {t('s2.confirmedAt', { n: v.confirmed })}</span>
          <button className="btn btn-primary" onClick={() => go('s3')}>
            {t('s2.next')} →
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Inspect
function TaskEditor({ row, focused }: { row: Row; focused: string | null }) {
  const setOwner = useStore((s) => s.setOwner);
  const setField = useStore((s) => s.setField);
  const commitField = useStore((s) => s.commitField);
  const ev = useEvidenceText()(row.evidence);
  const ref = useRef<HTMLElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focused) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (focused === 'pass') passRef.current?.focus({ preventScroll: true });
  }, [focused]);
  return (
    <article ref={ref} className={`task ${focused ? 'is-focused' : ''} ${row.owner ? '' : 'is-unset'}`}>
      <h4>{row.task}</h4>
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
        <input id={`c-${row.id}`} value={row.condition} placeholder={t('s2.conditionPh')} onChange={(e) => setField(row.id, 'condition', e.target.value)} onBlur={() => commitField(row.id, 'condition')} />
      </div>
      <div className={`field field-pass ${focused === 'pass' ? 'is-focused' : ''}`}>
        <label htmlFor={`p-${row.id}`}>
          <Ruler /> {t('s2.passRow')}
        </label>
        <input ref={passRef} id={`p-${row.id}`} value={row.pass} placeholder={t('s2.passRowPh')} onChange={(e) => setField(row.id, 'pass', e.target.value)} onBlur={() => commitField(row.id, 'pass')} />
      </div>
      <blockquote className="evidence">
        <span className="evidence-l">{t('s2.evidence')}</span>
        <p>「{ev.quote}」</p>
        <small>{row.evidence.type === 'answer' ? `${nameOf('site')}・${ev.src}` : ev.src}</small>
      </blockquote>
    </article>
  );
}

function Ruler() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className="ruler">
      <path d="M1 11l10-10 4 4-10 10z M4 8l1.5 1.5M6 6l2 2M8 4l1.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function History({ place }: { place: PlaceId | null }) {
  const activity = useStore((s) => s.activity);
  const now = useNow();
  const items = activity.filter((a) => !place || a.place === place).slice(0, place ? 12 : 20);
  return (
    <section className="insp-sec">
      <h5>{t('s2.history')}</h5>
      {items.length === 0 ? (
        <p className="muted small">{t('s2.historyEmpty')}</p>
      ) : (
        <ul className="feed">
          {items.map((a) => (
            <li key={a.id}>
              <Avatar who={a.who} size={20} />
              <span className="feed-t">
                <b>{a.who === 'site' || a.who === 'robot' ? nameOf(a.who) : a.who === 'ai' ? 'AI' : ''}</b> {a.text}
              </span>
              <time>{relTime(a.at, now)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinePass() {
  const pass = useStore((s) => s.pass);
  const setPass = useStore((s) => s.setPass);
  const n = Math.round((site.humanThroughput * pass.throughputPct) / 100);
  return (
    <section className="insp-sec">
      <h5>
        <Ruler /> {t('s2.passTitle')}
      </h5>
      <div className="field">
        <label htmlFor="pl-tp">{t('s2.throughput')}</label>
        <input id="pl-tp" type="range" min={50} max={120} step={5} value={pass.throughputPct} onChange={(e) => setPass({ throughputPct: Number(e.target.value) })} />
        <small>{t('s2.throughputVal', { base: site.humanThroughput, pct: pass.throughputPct, n })}</small>
      </div>
      <div className="pass-grid">
        <div className="field">
          <label htmlFor="pl-sr">{t('s2.success')}</label>
          <select id="pl-sr" value={pass.successRate} onChange={(e) => setPass({ successRate: Number(e.target.value) })}>
            {[95, 98, 99, 99.5].map((v) => (
              <option key={v} value={v}>
                {t('s2.atLeast', { v })}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pl-iv">{t('s2.interventions')}</label>
          <select id="pl-iv" value={pass.interventions} onChange={(e) => setPass({ interventions: Number(e.target.value) })}>
            {[1, 2, 3, 5].map((v) => (
              <option key={v} value={v}>
                {v} {t('s2.perHour')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

function Versions() {
  const versions = useStore((s) => s.versions);
  const draft = useStore((s) => s.draftChanges);
  const now = useNow();
  if (!versions.length) return null;
  const nextV = versions[versions.length - 1].v + 1;
  return (
    <section className="insp-sec history">
      <h5>{t('s2.versions')}</h5>
      <ol>
        {draft.length > 0 && (
          <li>
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
                {t('s2.confirmedAt', { n: ver.v })} · {relTime(ver.at, now)}
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
    </section>
  );
}

function Inspect() {
  const selected = useStore((s) => s.selected);
  const rows = useStore((s) => s.rows);
  const threads = useStore((s) => s.threads);
  const focus = useStore((s) => s.focus);
  const openThreadId = useStore((s) => s.openThreadId);
  const startThread = useStore((s) => s.startThread);
  const select = useStore((s) => s.select);
  const st = usePlaceStates();
  const now = useNow();

  if (!selected) {
    return (
      <aside className="ws-right">
        <header className="insp-h">
          <span className="insp-kicker">{t('s2.inspect')}</span>
          <h3>{t('s2.lineWide')}</h3>
        </header>
        <LinePass />
        <Versions />
        <History place={null} />
      </aside>
    );
  }
  const p = placeById[selected];
  const rs = rows.filter((r) => r.place === selected);
  const open = openThreads(threads, selected);
  return (
    <aside className="ws-right">
      <header className="insp-h">
        <span className="insp-kicker">{t('s2.inspect')}</span>
        <div className="insp-title">
          <h3>{p.name}</h3>
          <button className="icon-btn" aria-label={t('s2.close')} onClick={() => select(null)}>
            ×
          </button>
        </div>
        <div className="insp-state">
          <StateBadge s={st.map[selected]} />
          <span className="muted small">{t('s2.tasks', { n: rs.length })}</span>
        </div>
        {st.map[selected] === 'discussing' && <p className="hint">{t('s2.readyWhy')}</p>}
      </header>

      <section className="insp-sec">
        <h5>
          {t('s2.openComments')} <span className="pill">{open.length}</span>
        </h5>
        {open.length === 0 ? (
          <p className="muted small">{t('s2.noComments')}</p>
        ) : (
          <ul className="insp-threads">
            {open.map((th) => (
              <li key={th.id}>
                <button onClick={() => openThreadId(th.id)}>
                  <Avatar who={th.messages[0].who} size={22} />
                  <span>
                    <b>{th.messages[0].text}</b>
                    <small>
                      {nameOf(th.messages[0].who)} · {relTime(th.messages[0].at, now)} · {th.messages.length}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => startThread(selected, [p.center[0], p.labelHeight - 0.5, p.center[1]])}>
          + {t('s2.addComment')}
        </button>
      </section>

      <section className="insp-sec">
        <h5>{t('s2.tasks', { n: rs.length })}</h5>
        <div className="tasks">
          {rs.map((r) => (
            <TaskEditor key={r.id} row={r} focused={focus && focus.rowId === r.id ? `${focus.field}` : null} />
          ))}
        </div>
      </section>
      <History place={selected} />
    </aside>
  );
}

// ---------------------------------------------------------------- 3D の上の重ね表示
function Cursor({ who, me, id, label }: { who: Party; me?: boolean; id?: string; label?: string }) {
  return (
    <div className={`cursor cur-${who}`} ref={id ? anchorRef(id, [0, 0, 0], true) : undefined} data-me={me ? '1' : undefined}>
      <svg viewBox="0 0 16 20" width="16" height="20" aria-hidden>
        <path d="M1 1l13 10-6 1-3 6z" fill="currentColor" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      <span>{label ?? nameOf(who)}</span>
    </div>
  );
}

/** 相手のカーソルを場所から場所へゆっくり動かす（3D の位置で動くので、カメラを回しても付いてくる） */
function CursorDriver({ id }: { id: string }) {
  const pts = useMemo(
    () =>
      cursorTour.map((pid) => {
        const p = placeById[pid];
        return [p.center[0] + 0.35, Math.min(p.labelHeight, 1.6) - 0.2, p.center[1] + 0.3] as V3;
      }),
    [],
  );
  const cur = useRef<V3>([...pts[0]]);
  useFrame(({ clock }) => {
    const seg = 5.5; // 1 区間の秒数（うち 2.5 秒移動、残りは止まって見ている）
    const tt = clock.elapsedTime;
    const i = Math.floor(tt / seg) % pts.length;
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const k = Math.min(1, (tt % seg) / 2.5);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    // 止まっている間も少し揺らす
    const wob = k >= 1 ? Math.sin(tt * 1.7) * 0.08 : 0;
    cur.current = [a[0] + (b[0] - a[0]) * e + wob, a[1] + (b[1] - a[1]) * e + Math.sin(e * Math.PI) * 0.6, a[2] + (b[2] - a[2]) * e + wob * 0.5];
    moveAnchor(id, cur.current);
  });
  return null;
}

/** スマホ幅かどうか（スレッドを下に出すため） */
function useNarrow() {
  const q = '(max-width: 900px)';
  const [narrow, setNarrow] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setNarrow(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return narrow;
}

function CommentPin({ th, narrow }: { th: Thread; narrow: boolean }) {
  const open = useStore((s) => s.openThread === th.id);
  const openThreadId = useStore((s) => s.openThreadId);
  const first = th.messages[0];
  return (
    <div className={`cpin ${open ? 'is-open' : ''} ${th.draft ? 'is-draft' : ''}`} ref={anchorRef(`thread-${th.id}`, th.pos, true)}>
      <button className={`cpin-b cur-${first?.who ?? 'site'}`} onClick={() => openThreadId(open ? null : th.id)} aria-label={first?.text ?? t('s2.addComment')}>
        {first ? site.people[first.who].initial : '+'}
        {th.messages.length > 1 && <i>{th.messages.length}</i>}
      </button>
      {open && !narrow && <ThreadCard th={th} />}
    </div>
  );
}

function ThreadCard({ th }: { th: Thread }) {
  const reply = useStore((s) => s.reply);
  const resolve = useStore((s) => s.resolve);
  const close = useStore((s) => s.openThreadId);
  const discard = useStore((s) => s.discardDraft);
  const me = useStore((s) => s.me);
  const [text, setText] = useState('');
  const now = useNow();
  const send = () => {
    if (!text.trim()) return;
    reply(th.id, text);
    setText('');
  };
  return (
    <div className="thread" onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <b>{placeById[th.place].name}</b>
        {!th.draft && (
          <button className="btn btn-secondary btn-sm" onClick={() => resolve(th.id)}>
            ✓ {t('s2.resolve')}
          </button>
        )}
        <button className="icon-btn" aria-label={t('s2.close')} onClick={() => (th.draft ? discard() : close(null))}>
          ×
        </button>
      </header>
      {th.messages.length > 0 && (
        <ul className="thread-msgs">
          {th.messages.map((m) => (
            <li key={m.id}>
              <Avatar who={m.who} size={22} />
              <div>
                <span className="tm-h">
                  <b>{nameOf(m.who)}</b>
                  <small>{relTime(m.at, now)}</small>
                </span>
                <p>{m.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="thread-in">
        <Avatar who={me} size={22} />
        <input
          autoFocus
          value={text}
          placeholder={th.draft ? t('s2.commentPh') : t('s2.replyPh')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
            if (e.key === 'Escape') (th.draft ? discard() : close(null));
          }}
        />
        <button className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={send}>
          {t('s2.send')}
        </button>
      </div>
    </div>
  );
}

/** 寸法ラベルのような合格ライン */
const labelAnchor: Record<PlaceId, V3> = {
  tray: [-5.35, 1.2, -0.35],
  workbench: [-0.05, 1.0, -0.4],
  boxes: [-0.35, 0.35, 1.95],
  conveyor: [5.4, 0.85, -0.55],
  aisle: [-4.2, 0.05, 4.45],
};

function PassLabels() {
  const rows = useStore((s) => s.rows);
  const focus = useStore((s) => s.focus);
  const setFocus = useStore((s) => s.setFocus);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  return (
    <>
      {places.map((p) => {
        const rs = rows.filter((r) => r.place === p.id && r.pass.trim());
        // 選んだ場所はすべて、それ以外は 1 つ目と残りの件数だけ（3D が埋まらないように）
        const expanded = selected === p.id;
        const shown = expanded ? rs : rs.slice(0, 1);
        return (
        <div key={p.id} className={`mlabel ${expanded ? 'is-expanded' : ''}`} ref={anchorRef(`label-${p.id}`, labelAnchor[p.id], true)} style={{ ['--m' as string]: MEASURE }}>
          <i className="mlabel-dot" />
          <i className="mlabel-line" />
          <div className="mlabel-stack">
            {shown.map((r) => (
              <button key={r.id} className={focus?.rowId === r.id && focus.field === 'pass' ? 'on' : ''} onClick={() => setFocus(r.id, 'pass')} title={r.task}>
                {r.pass}
              </button>
            ))}
            {!expanded && rs.length > 1 && (
              <button className="more" onClick={() => select(p.id)}>
                +{rs.length - 1}
              </button>
            )}
          </div>
        </div>
        );
      })}
    </>
  );
}

function SimHud() {
  const playing = useStore((s) => s.playing);
  const sec = useStore((s) => s.simSeconds);
  const rate = 98;
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = Math.floor(sec % 60);
  const clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return (
    <div className={`simhud ${playing ? 'is-playing' : ''}`}>
      <span className="simhud-state">
        <i />
        {playing ? t('s2.simPlaying') : t('s2.simPaused')}
      </span>
      <b>{clock}</b>
      <span>{t('s2.simBoxes', { n: Math.floor((sec / 3600) * rate) })}</span>
      <span>{t('s2.simRate', { n: rate })}</span>
      <span className="muted">{t('s2.simSpeed')}</span>
    </div>
  );
}

// ---------------------------------------------------------------- ツールバー
function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const showLabels = useStore((s) => s.showLabels);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const playing = useStore((s) => s.playing);
  const togglePlay = useStore((s) => s.togglePlay);
  return (
    <div className="toolbar" role="toolbar">
      <button className={tool === 'select' ? 'on' : ''} onClick={() => setTool('select')} title={`${t('s2.toolSelect')} (V)`}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
          <path d="M4 3l11 8-5 1-2.5 5z" fill="currentColor" />
        </svg>
        <span>{t('s2.toolSelect')}</span>
      </button>
      <button className={tool === 'comment' ? 'on' : ''} onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')} title={`${t('s2.toolComment')} (C)`}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
          <path d="M3 4h14v9H8l-4 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span>{t('s2.toolComment')}</span>
      </button>
      <button className={showLabels ? 'on' : ''} onClick={toggleLabels} title={`${t('s2.toolLabels')} (L)`} aria-pressed={showLabels}>
        <Ruler />
        <span>{t('s2.toolLabels')}</span>
      </button>
      <i className="tb-sep" />
      <button className={`tb-play ${playing ? 'on' : ''}`} onClick={togglePlay} title={`${playing ? t('s2.pause') : t('s2.play')} (Space)`}>
        {playing ? (
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <path d="M6 4h3v12H6zM11 4h3v12h-3z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
            <path d="M6 4l10 6-10 6z" fill="currentColor" />
          </svg>
        )}
        <span>{playing ? t('s2.pause') : t('s2.play')}</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- 合意シート
function Sheet() {
  const rows = useStore((s) => s.rows);
  const pass = useStore((s) => s.pass);
  const open = useStore((s) => s.sheetOpen);
  const setOpen = useStore((s) => s.setSheetOpen);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const setFocus = useStore((s) => s.setFocus);
  const st = usePlaceStates();
  const v = useVersionLabel();
  const ev = useEvidenceText();
  const now = useNow(1000);
  return (
    <section className={`ws-sheet ${open ? 'is-open' : ''}`}>
      <button className="ws-sheet-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <b>{t('s2.sheetTitle')}</b>
        <span className={`ver-chip ${v.draft ? 'is-draft' : v.confirmed ? 'is-ok' : ''}`}>{v.label}</span>
        <span className="muted small hide-sm">{t('s2.sheetLive')}</span>
        <span className="pill">{t('s2.sheetCount', { p: places.length, n: rows.length })}</span>
        <span className="chev">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="ws-sheet-body">
          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>{t('s2.cols.place')}</th>
                  <th>{t('s2.cols.task')}</th>
                  <th>{t('s2.cols.owner')}</th>
                  <th>{t('s2.cols.cond')}</th>
                  <th>{t('s2.cols.pass')}</th>
                  <th>{t('s2.cols.evidence')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = ev(r.evidence);
                  const fresh = r.touchedAt && now - r.touchedAt < 2500;
                  return (
                    <tr key={r.id} className={`${selected === r.place ? 'sel' : ''} ${fresh ? 'fresh' : ''}`} onClick={() => select(r.place)}>
                      <td data-l={t('s2.cols.place')}>
                        <span className="sh-place">
                          <i style={{ background: STATE_COLOR[st.map[r.place]] }} />
                          {placeById[r.place].short}
                        </span>
                      </td>
                      <td data-l={t('s2.cols.task')}>
                        <b>{r.task}</b>
                      </td>
                      <td data-l={t('s2.cols.owner')}>{r.owner ? <span className={`owner o-${r.owner}`}>{t(`s2.owners.${r.owner}` as Key)}</span> : <span className="owner o-unset">{t('s2.unset')}</span>}</td>
                      <td data-l={t('s2.cols.cond')}>{r.condition || '—'}</td>
                      <td data-l={t('s2.cols.pass')}>
                        <button
                          className="sh-pass"
                          onClick={(ev2) => {
                            ev2.stopPropagation();
                            setFocus(r.id, 'pass');
                          }}
                        >
                          {r.pass || '—'}
                        </button>
                      </td>
                      <td data-l={t('s2.cols.evidence')} className="ev-cell">
                        <span title={e.quote}>{e.src}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="sh-line" onClick={() => select(null)}>
            <Ruler />{' '}
            {t('s2.sheetLine', {
              n: Math.round((site.humanThroughput * pass.throughputPct) / 100),
              pct: pass.throughputPct,
              sr: pass.successRate,
              iv: pass.interventions,
            })}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- 画面
export function Step2() {
  const threads = useStore((s) => s.threads);
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const showLabels = useStore((s) => s.showLabels);
  const toggleLabels = useStore((s) => s.toggleLabels);
  const playing = useStore((s) => s.playing);
  const togglePlay = useStore((s) => s.togglePlay);
  const tickSim = useStore((s) => s.tickSim);
  const select = useStore((s) => s.select);
  const startThread = useStore((s) => s.startThread);
  const me = useStore((s) => s.me);
  const st = usePlaceStates();
  const myCursor = useRef<HTMLDivElement>(null);
  const narrow = useNarrow();
  const openThreadId = useStore((s) => s.openThread);
  const dockThread = narrow ? threads.find((th) => th.id === openThreadId) : undefined;
  const centerRef = useRef<HTMLDivElement>(null);

  const look = (p: PlaceId): ZoneLook => ({ color: STATE_COLOR[st.map[p]], label: t(`s2.status.${st.map[p]}` as Key) });

  // シミュレーションの時計（60 倍速）
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => tickSim(6), 100);
    return () => clearInterval(id);
  }, [playing, tickSim]);

  // キーボード：V 選択 / C コメント / L ラベル / Space 再生
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey) return;
      if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'c' || e.key === 'C') setTool('comment');
      else if (e.key === 'l' || e.key === 'L') toggleLabels();
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool, toggleLabels, togglePlay]);

  const onPick = (p: PlaceId, point?: V3) => {
    if (tool === 'comment') startThread(p, point ?? [placeById[p].center[0], 1, placeById[p].center[1]]);
    else select(p);
  };
  const onFloor = (point: V3) => {
    if (tool !== 'comment') return;
    // いちばん近い場所に紐づける
    const near = places.reduce((best, p) => {
      const d = Math.hypot(p.center[0] - point[0], p.center[1] - point[2]);
      return d < best.d ? { p, d } : best;
    }, { p: places[0], d: Infinity });
    startThread(near.p.id, point);
  };

  const visibleThreads = threads.filter((th) => !th.resolved);
  const otherWho = other(me);

  return (
    <div className={`workspace tool-${tool}`}>
      <PlaceList />
      <div
        className="ws-center"
        ref={centerRef}
        onPointerMove={(e) => {
          const el = myCursor.current;
          const box = centerRef.current?.getBoundingClientRect();
          if (!el || !box) return;
          el.style.opacity = '1';
          el.style.transform = `translate(${e.clientX - box.left}px, ${e.clientY - box.top}px)`;
        }}
        onPointerLeave={() => {
          if (myCursor.current) myCursor.current.style.opacity = '0';
        }}
      >
        <div className="ws-stage">
          <Viewer
            mode="agree"
            className="ws-viewer"
            look={look}
            animate={playing}
            hint={false}
            onPick={onPick}
            onFloor={onFloor}
            legend={(['discussing', 'ready'] as PlaceState[]).map((s) => ({ color: STATE_COLOR[s], label: t(`s2.legend.${s}` as Key) }))}
            sceneExtras={<CursorDriver id="cursor-other" />}
            overlay={
              <>
                {showLabels && <PassLabels />}
                {visibleThreads.map((th) => (
                  <CommentPin key={th.id} th={th} narrow={narrow} />
                ))}
                <Cursor who={otherWho} id="cursor-other" />
                <SimHud />
              </>
            }
          />
          <div className="my-cursor" ref={myCursor}>
            <Cursor who={me} label={`${nameOf(me)}（${t('s2.you')}）`} me />
          </div>
          {tool === 'comment' && <div className="tool-hint">{t('s2.commentHint')}</div>}
          <Toolbar />
          {dockThread && (
            <div className="thread-dock">
              <ThreadCard th={dockThread} />
            </div>
          )}
        </div>
        <Sheet />
      </div>
      <Inspect />
    </div>
  );
}
