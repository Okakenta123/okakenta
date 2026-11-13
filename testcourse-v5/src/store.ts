import { create } from 'zustand';
import { t } from './i18n';
import {
  commentSeeds,
  defaultPass,
  historySeeds,
  photoFindings,
  placeById,
  places,
  questions,
  rowSeeds,
  sampleResults,
  type Evidence,
  type Owner,
  type Party,
  type PlaceId,
  type ReqKind,
} from './data/sample';
import { samplePhotos } from './data/photos';

export type StepId = 's11' | 's12' | 's2' | 's3';
export const STEPS: StepId[] = ['s11', 's12', 's2', 's3'];
export type Actor = Party | 'ai' | 'system';
/** 場所の状態：話し合い中 / Ready for test */
export type PlaceState = 'discussing' | 'ready';

export interface Requirement {
  id: string;
  kind: ReqKind;
  text: string;
  source: { type: 'answer'; q: number } | { type: 'photo'; name: string };
  fresh?: boolean;
}
export interface ChatMsg {
  id: string;
  from: 'ai' | 'site';
  text: string;
}
export interface Photo {
  id: string;
  name: string;
  url: string;
  sample: boolean;
  selected: boolean;
  state: 'analyzing' | 'done';
  found: { kind: ReqKind; text: string }[];
}
export interface Row {
  id: string;
  place: PlaceId;
  task: string;
  owner: Owner | null;
  condition: string;
  pass: string;
  evidence: Evidence;
  /** 最後に変わった時刻（シートで光らせる） */
  touchedAt?: number;
}
export interface PassLine {
  throughputPct: number;
  successRate: number;
  interventions: number;
}
export interface Message {
  id: string;
  who: Party;
  text: string;
  at: number;
}
export interface Thread {
  id: string;
  place: PlaceId;
  pos: [number, number, number];
  messages: Message[];
  resolved: boolean;
  draft?: boolean;
}
export interface Version {
  v: number;
  at: number;
  rows: Row[];
  pass: PassLine;
  changes: string[];
}
export interface Activity {
  id: string;
  who: Actor;
  text: string;
  at: number;
  place?: PlaceId;
}
export type Tool = 'select' | 'comment';
export type Field = 'owner' | 'condition' | 'pass';

interface State {
  step: StepId;
  done: Record<StepId, boolean>;
  me: Party;
  // 1-1
  chat: ChatMsg[];
  answers: string[];
  reqs: Requirement[];
  photos: Photo[];
  findingCursor: number;
  // 1-2
  build: 'none' | 'building' | 'built';
  buildStage: number;
  builtAt: number;
  checkedPlaces: PlaceId[];
  // 3D
  selected: PlaceId | null;
  view: '3d' | 'render';
  // 2
  rows: Row[];
  pass: PassLine;
  threads: Thread[];
  openThread: string | null;
  tool: Tool;
  showLabels: boolean;
  playing: boolean;
  simSeconds: number;
  focus: { rowId: string; field: Field; at: number } | null;
  sheetOpen: boolean;
  versions: Version[];
  draftChanges: string[];
  // 3
  results: 'none' | 'importing' | 'ready';
  appliedProposals: string[];
  reportShared: boolean;
  activity: Activity[];
  toast: string | null;

  go: (s: StepId) => void;
  setMe: (p: Party) => void;
  answer: (text: string) => void;
  addPhotos: (files: { name: string; url: string; sample: boolean }[]) => void;
  addSamplePhotos: () => void;
  togglePhoto: (id: string) => void;
  finish11: () => void;
  buildScene: () => void;
  select: (p: PlaceId | null) => void;
  setView: (v: '3d' | 'render') => void;
  checkPlace: (p: PlaceId) => void;
  finish12: () => void;
  setOwner: (rowId: string, o: Owner) => void;
  setField: (rowId: string, f: 'condition' | 'pass', v: string) => void;
  commitField: (rowId: string, f: 'condition' | 'pass') => void;
  setPass: (p: Partial<PassLine>) => void;
  setFocus: (rowId: string, field: Field) => void;
  setTool: (t: Tool) => void;
  toggleLabels: () => void;
  togglePlay: () => void;
  tickSim: (sec: number) => void;
  setSheetOpen: (o: boolean) => void;
  openThreadId: (id: string | null) => void;
  startThread: (place: PlaceId, pos: [number, number, number]) => void;
  reply: (threadId: string, text: string) => void;
  resolve: (threadId: string) => void;
  discardDraft: () => void;
  confirmVersion: () => void;
  importResults: () => void;
  applyProposal: (id: string) => void;
  shareReport: () => void;
  showToast: (s: string) => void;
}

let seq = 0;
const uid = (p: string) => `${p}${++seq}`;
const MIN = 60_000;

export const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** 場所の状態：未解決のコメントがなく、作業すべてに担当があれば Ready */
export const placeState = (rows: Row[], threads: Thread[], p: PlaceId): PlaceState => {
  const open = threads.some((th) => th.place === p && !th.resolved && !th.draft);
  const unassigned = rows.some((r) => r.place === p && !r.owner);
  return open || unassigned ? 'discussing' : 'ready';
};

export const openThreads = (threads: Thread[], p?: PlaceId) => threads.filter((th) => !th.resolved && !th.draft && (!p || th.place === p));

const firstAI: ChatMsg = { id: 'm0', from: 'ai', text: questions[0].q };

export const useStore = create<State>((set, get) => {
  const log = (who: Actor, text: string, place?: PlaceId) =>
    set((s) => ({ activity: [{ id: uid('a'), who, text, at: Date.now(), place }, ...s.activity].slice(0, 120) }));

  /** 確定後の変更は次の版の案として記録する */
  const recordChange = (text: string) => {
    const s = get();
    if (!s.versions.length) return;
    set({ draftChanges: [...s.draftChanges, text] });
  };

  const edit = (text: string, place?: PlaceId) => {
    log(get().me, text, place);
    recordChange(text);
  };

  const analyze = (ids: string[]) => {
    ids.forEach((id, i) => {
      setTimeout(() => {
        const s = get();
        const findings = photoFindings[Math.min(s.findingCursor, photoFindings.length - 1)] ?? [];
        const photo = s.photos.find((p) => p.id === id);
        if (!photo) return;
        const newReqs: Requirement[] = findings.map((f) => ({
          id: uid('q'),
          kind: f.kind,
          text: f.text,
          source: { type: 'photo', name: photo.name },
          fresh: true,
        }));
        set({
          findingCursor: s.findingCursor + 1,
          photos: s.photos.map((p) => (p.id === id ? { ...p, state: 'done', found: findings } : p)),
          reqs: [...s.reqs.map((r) => ({ ...r, fresh: false })), ...newReqs],
        });
        findings.forEach((f) => log('ai', t('activity.detect', { name: photo.name, what: f.text })));
      }, 900 + i * 700);
    });
  };

  const start = Date.now();

  return {
    step: 's11',
    done: { s11: false, s12: false, s2: false, s3: false },
    me: 'site',
    chat: [firstAI],
    answers: [],
    reqs: [],
    photos: [],
    findingCursor: 0,
    build: 'none',
    buildStage: 0,
    builtAt: 0,
    checkedPlaces: [],
    selected: null,
    view: '3d',
    rows: rowSeeds.map((r) => ({ id: r.id, place: r.place, task: r.task, owner: r.owner, condition: r.condition, pass: r.pass, evidence: r.evidence })),
    pass: { ...defaultPass },
    threads: commentSeeds.map((c) => ({
      id: c.id,
      place: c.place,
      pos: c.pos,
      resolved: c.resolved ?? false,
      messages: c.messages.map((m, i) => ({ id: `${c.id}-${i}`, who: m.who, text: m.text, at: start - m.minutesAgo * MIN })),
    })),
    openThread: null,
    tool: 'select',
    showLabels: true,
    playing: true,
    simSeconds: 0,
    focus: null,
    sheetOpen: false,
    versions: [],
    draftChanges: [],
    results: 'none',
    appliedProposals: [],
    reportShared: false,
    activity: historySeeds
      .map((h, i) => ({ id: `h${i}`, who: h.who as Actor, text: h.text, place: h.place, at: start - h.minutesAgo * MIN }))
      .reverse(),
    toast: null,

    go: (step) => set({ step, selected: step === 's2' ? get().selected : null, openThread: null, tool: 'select' }),
    setMe: (me) => set({ me }),

    answer: (text) => {
      const s = get();
      const qi = s.answers.length;
      if (qi >= questions.length || !text.trim()) return;
      const q = questions[qi];
      const isExample = text.trim() === q.example;
      // 回答例どおりなら構造化した要件を、自由回答ならその文をそのまま要件にする
      const extracted: Requirement[] = (isExample ? q.extracts : [{ kind: q.extracts[0].kind, text: text.trim().slice(0, 60) }]).map((e) => ({
        id: uid('q'),
        kind: e.kind,
        text: e.text,
        source: { type: 'answer', q: qi },
        fresh: true,
      }));
      const nextQ = questions[qi + 1];
      set({
        answers: [...s.answers, text.trim()],
        chat: [...s.chat, { id: uid('m'), from: 'site', text: text.trim() }],
        reqs: [...s.reqs.map((r) => ({ ...r, fresh: false })), ...extracted],
      });
      log('site', t('activity.answered', { n: qi + 1 }));
      setTimeout(() => {
        set((st) => ({ chat: [...st.chat, { id: uid('m'), from: 'ai', text: nextQ ? nextQ.q : t('s11.done') }] }));
      }, 450);
    },

    addPhotos: (files) => {
      const added: Photo[] = files.map((f) => ({ id: uid('p'), ...f, selected: true, state: 'analyzing', found: [] }));
      set((s) => ({ photos: [...s.photos, ...added] }));
      added.forEach((p) => log('site', t('activity.photo', { name: p.name })));
      analyze(added.map((p) => p.id));
    },

    addSamplePhotos: () => {
      const have = new Set(get().photos.map((p) => p.name));
      get().addPhotos(samplePhotos.filter((p) => !have.has(p.name)).map((p) => ({ ...p, sample: true })));
    },

    togglePhoto: (id) => set((s) => ({ photos: s.photos.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)) })),

    finish11: () => {
      set((s) => ({ done: { ...s.done, s11: true }, step: 's12' }));
      log('site', t('activity.s11done'));
    },

    buildScene: () => {
      if (get().build !== 'none') return;
      set({ build: 'building', buildStage: 0, builtAt: performance.now() / 1000 });
      [1, 2, 3, 4].forEach((n) =>
        setTimeout(() => {
          set({ buildStage: n, ...(n === 4 ? { build: 'built' as const, selected: 'tray' as const } : {}) });
          if (n === 4) log('ai', t('activity.built'));
        }, n * 900),
      );
    },

    select: (p) => set({ selected: p }),
    setView: (view) => set({ view }),

    checkPlace: (p) => {
      if (get().checkedPlaces.includes(p)) return;
      set((s) => ({ checkedPlaces: [...s.checkedPlaces, p] }));
      log('site', t('activity.placeOk', { place: placeById[p].name }));
      const rest = places.find((pl) => !get().checkedPlaces.includes(pl.id));
      if (rest) set({ selected: rest.id });
    },

    finish12: () => {
      set((s) => ({ done: { ...s.done, s12: true }, step: 's2', selected: null }));
      log('site', t('activity.layout'));
    },

    setOwner: (rowId, o) => {
      const r = get().rows.find((x) => x.id === rowId);
      if (!r || r.owner === o) return;
      set((s) => ({ rows: s.rows.map((x) => (x.id === rowId ? { ...x, owner: o, touchedAt: Date.now() } : x)) }));
      edit(t('activity.owner', { task: r.task, owner: t(`s2.owners.${o}`) }), r.place);
    },

    setField: (rowId, f, v) => set((s) => ({ rows: s.rows.map((x) => (x.id === rowId ? { ...x, [f]: v, touchedAt: Date.now() } : x)) })),

    commitField: (rowId, f) => {
      const r = get().rows.find((x) => x.id === rowId);
      if (!r) return;
      edit(t(f === 'pass' ? 'activity.passRow' : 'activity.cond', { task: r.task, v: r[f] }), r.place);
    },

    setPass: (p) => {
      set((s) => ({ pass: { ...s.pass, ...p } }));
      const s = get().pass;
      edit(t('activity.pass', { pct: s.throughputPct, sr: s.successRate, iv: s.interventions }));
    },

    setFocus: (rowId, field) => {
      const r = get().rows.find((x) => x.id === rowId);
      set({ focus: { rowId, field, at: Date.now() }, selected: r?.place ?? get().selected });
    },
    setTool: (tool) => set({ tool }),
    toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
    togglePlay: () => set((s) => ({ playing: !s.playing })),
    tickSim: (sec) => set((s) => ({ simSeconds: s.simSeconds + sec })),
    setSheetOpen: (sheetOpen) => set({ sheetOpen }),

    openThreadId: (id) => {
      const th = get().threads.find((x) => x.id === id);
      set((s) => ({ openThread: id, selected: th ? th.place : s.selected, threads: s.threads.filter((x) => !x.draft || x.id === id) }));
    },

    startThread: (place, pos) => {
      const id = uid('new-thread-');
      set((s) => ({
        threads: [...s.threads.filter((x) => !x.draft), { id, place, pos: [pos[0], Math.max(pos[1], 0.4) + 0.3, pos[2]], messages: [], resolved: false, draft: true }],
        openThread: id,
        selected: place,
      }));
    },

    reply: (threadId, text) => {
      const th = get().threads.find((x) => x.id === threadId);
      if (!th || !text.trim()) return;
      const me = get().me;
      const msg: Message = { id: uid('m'), who: me, text: text.trim(), at: Date.now() };
      set((s) => ({ threads: s.threads.map((x) => (x.id === threadId ? { ...x, draft: false, messages: [...x.messages, msg] } : x)) }));
      log(me, t(th.draft ? 'activity.comment' : 'activity.reply', { place: placeById[th.place].short, text: msg.text.slice(0, 24) }), th.place);
      if (th.draft) set({ tool: 'select' });
    },

    resolve: (threadId) => {
      const th = get().threads.find((x) => x.id === threadId);
      if (!th) return;
      set((s) => ({ threads: s.threads.map((x) => (x.id === threadId ? { ...x, resolved: true } : x)), openThread: null }));
      edit(t('activity.resolve', { place: placeById[th.place].short, text: th.messages[0]?.text.slice(0, 20) ?? '' }), th.place);
    },

    discardDraft: () => set((s) => ({ threads: s.threads.filter((x) => !x.draft), openThread: null })),

    confirmVersion: () => {
      const s = get();
      const v = s.versions.length ? s.versions[s.versions.length - 1].v + 1 : 1;
      set({
        versions: [...s.versions, { v, at: Date.now(), rows: s.rows.map((r) => ({ ...r })), pass: { ...s.pass }, changes: s.draftChanges }],
        draftChanges: [],
        done: { ...s.done, s2: true },
        results: v > 1 ? 'none' : s.results,
        reportShared: v > 1 ? false : s.reportShared,
        appliedProposals: v > 1 ? [] : s.appliedProposals,
      });
      log('system', t('activity.confirm', { n: v }));
      log('system', t('activity.plan'));
    },

    importResults: () => {
      set({ results: 'importing' });
      setTimeout(() => {
        set({ results: 'ready' });
        log('robot', t('activity.results'));
      }, 1800);
    },

    applyProposal: (id) => {
      const p = sampleResults.proposals.find((x) => x.id === id);
      if (!p || get().appliedProposals.includes(id)) return;
      set((s) => ({ appliedProposals: [...s.appliedProposals, id] }));
      if (p.row && p.condition) {
        const row = p.row;
        const cond = p.condition;
        set((s) => ({ rows: s.rows.map((x) => (x.id === row ? { ...x, condition: cond, touchedAt: Date.now() } : x)) }));
        get().commitField(row, 'condition');
      } else {
        recordChange(p.text);
        log('robot', p.text);
      }
    },

    shareReport: () => {
      set({ reportShared: true });
      log('robot', t('activity.shared'));
    },

    showToast: (s) => {
      set({ toast: s });
      setTimeout(() => set({ toast: null }), 2200);
    },
  };
});

/** 現在の版の表示ラベル */
export function useVersionLabel() {
  const versions = useStore((s) => s.versions);
  const draft = useStore((s) => s.draftChanges);
  if (!versions.length) return { label: t('app.draft'), confirmed: 0, draft: false };
  const last = versions[versions.length - 1].v;
  return draft.length
    ? { label: t('app.versionDraft', { n: last + 1 }), confirmed: last, draft: true }
    : { label: `v${last}`, confirmed: last, draft: false };
}

/** 場所ごとの状態をまとめて返す */
export function usePlaceStates() {
  const rows = useStore((s) => s.rows);
  const threads = useStore((s) => s.threads);
  const map = Object.fromEntries(places.map((p) => [p.id, placeState(rows, threads, p.id)])) as Record<PlaceId, PlaceState>;
  const ready = places.filter((p) => map[p.id] === 'ready').length;
  return { map, ready, total: places.length, open: openThreads(threads).length };
}

// テスト・デモ用にストアを公開（開発時のみ）
if (import.meta.env.DEV) (window as unknown as { __tc: typeof useStore }).__tc = useStore;

export const canEnter = (done: Record<StepId, boolean>, s: StepId) => {
  const i = STEPS.indexOf(s);
  return STEPS.slice(0, i).every((p) => done[p]);
};
