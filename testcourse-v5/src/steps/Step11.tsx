import { useEffect, useRef, useState } from 'react';
import { questions, type ReqKind } from '../data/sample';
import { t, type Key } from '../i18n';
import { useStore } from '../store';
import { Avatar } from '../components/Shell';

const KINDS: ReqKind[] = ['task', 'exception', 'condition', 'performance'];

function Chat() {
  const chat = useStore((s) => s.chat);
  const answers = useStore((s) => s.answers);
  const answer = useStore((s) => s.answer);
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);
  const finished = answers.length >= questions.length;

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length]);

  const send = () => {
    if (!text.trim()) return;
    answer(text);
    setText('');
  };

  // 「回答例を入れる」：残りの質問すべてについて、回答例をタイピング → 送信 → 次の質問、を自動で繰り返す
  const [auto, setAuto] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const runAuto = async () => {
    if (auto) return;
    setAuto(true);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    while (alive.current) {
      const i = useStore.getState().answers.length;
      if (i >= questions.length) break;
      const ex = questions[i].example;
      const frames = 20; // 0.5 秒ほどでタイピング
      for (let k = 1; k <= frames; k++) {
        if (!alive.current) return;
        setText(ex.slice(0, Math.ceil((ex.length * k) / frames)));
        await sleep(25);
      }
      answer(ex);
      setText('');
      await sleep(600); // AI の次の質問を待つ
    }
    if (alive.current) setAuto(false);
  };

  return (
    <section className="card chat">
      <h3 className="card-h">
        {t('s11.chatTitle')}
        <span className="pill">{Math.min(answers.length, 4)}/4</span>
      </h3>
      <div className="chat-list" ref={list}>
        {chat.map((m) => (
          <div key={m.id} className={`msg msg-${m.from}`}>
            <Avatar who={m.from} size={26} />
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      {!finished && (
        <div className="chat-input">
          <button className="btn btn-ghost btn-sm" onClick={runAuto} disabled={auto}>
            {t('s11.useExample')}
          </button>
          <div className="chat-row">
            <textarea
              value={text}
              rows={2}
              readOnly={auto}
              placeholder={t('s11.placeholder')}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !auto) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn btn-primary" onClick={send} disabled={!text.trim() || auto}>
              {t('s11.send')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Requirements() {
  const reqs = useStore((s) => s.reqs);
  return (
    <section className="card reqs">
      <h3 className="card-h">
        {t('s11.reqTitle')}
        <span className="pill">{reqs.length}</span>
      </h3>
      {reqs.length === 0 ? (
        <div className="empty">
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
            <rect x="8" y="6" width="32" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M15 16h18M15 24h18M15 32h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p>{t('s11.reqEmpty')}</p>
        </div>
      ) : (
        <div className="req-groups">
          {KINDS.map((k) => {
            const items = reqs.filter((r) => r.kind === k);
            return (
              <div key={k} className={`req-group k-${k}`}>
                <h4>
                  <i />
                  {t(`s11.kinds.${k}` as Key)}
                  <span>{items.length}</span>
                </h4>
                {items.length === 0 ? (
                  <p className="muted small">—</p>
                ) : (
                  <ul>
                    {items.map((r) => (
                      <li key={r.id} className={r.fresh ? 'fresh' : ''}>
                        <span>{r.text}</span>
                        <small>{r.source.type === 'answer' ? t('s11.fromAnswer', { n: r.source.q + 1 }) : `${t('s11.fromPhoto')}：${r.source.name}`}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Photos() {
  const photos = useStore((s) => s.photos);
  const addPhotos = useStore((s) => s.addPhotos);
  const addSamples = useStore((s) => s.addSamplePhotos);
  const toggle = useStore((s) => s.togglePhoto);
  const input = useRef<HTMLInputElement>(null);

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    addPhotos(Array.from(files).filter((f) => f.type.startsWith('image/')).map((f) => ({ name: f.name, url: URL.createObjectURL(f), sample: false })));
  };

  return (
    <section
      className="card photos"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
    >
      <h3 className="card-h">
        {t('s11.photoTitle')}
        <span className="pill">{t('s11.photoCount', { n: photos.filter((p) => p.selected).length })}</span>
      </h3>
      <p className="muted small">{t('s11.photoLead')}</p>
      <div className="photo-actions">
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <button className="btn btn-secondary btn-sm" onClick={() => input.current?.click()}>
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden>
            <path d="M10 14V3M5 8l5-5 5 5M3 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('s11.upload')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={addSamples}>
          {t('s11.useSamples')}
        </button>
      </div>
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((p) => (
            <button key={p.id} className={`photo ${p.selected ? 'on' : ''}`} onClick={() => toggle(p.id)} aria-pressed={p.selected}>
              <img src={p.url} alt={p.name} />
              <span className="photo-check">{p.selected ? '✓' : ''}</span>
              <span className="photo-name">{p.name}</span>
              {p.state === 'analyzing' ? (
                <span className="photo-scan">
                  <i />
                  {t('s11.analyzing')}
                </span>
              ) : (
                p.found.length > 0 && (
                  <span className={`photo-found pf-${p.found[0].kind}`}>
                    {t('s11.detected')}：{p.found.map((f) => f.text).join('、')}
                  </span>
                )
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function Step11() {
  const answers = useStore((s) => s.answers.length);
  const photos = useStore((s) => s.photos.filter((p) => p.selected && p.state === 'done').length);
  const finish = useStore((s) => s.finish11);
  const done = useStore((s) => s.done.s11);
  const go = useStore((s) => s.go);
  const ready = answers >= 4 && photos >= 3;
  return (
    <div className="step-page">
      <p className="lead">{t('s11.lead')}</p>
      <div className="grid-2">
        <Chat />
        <Requirements />
      </div>
      <Photos />
      <div className="footer-bar">
        <span className="muted small">{ready ? '' : t('s11.needMore')}</span>
        <button className="btn btn-primary btn-lg" disabled={!ready} onClick={() => (done ? go('s12') : finish())}>
          {t('s11.next')} →
        </button>
      </div>
    </div>
  );
}
