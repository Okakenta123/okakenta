import { create } from 'zustand';
import { t } from './i18n';
import {
  defaultPass,
  photoFindings,
  placeById,
  places,
  questions,
  rowSeeds,
  sampleResults,
  type Evidence,
  type Owner,
  type PlaceId,
  type ReqKind,
} from './data/sample';
import { samplePhotos } from './data/photos';

export type StepId = 's11' | 's12' | 's2' | 's3';
export const STEPS: StepId[] = ['s11', 's12', 's2', 's3'];
export type Actor = 'site' | 'robot' | 'ai' | 'system';
export type RowStatus = 'none' | 'half' | 'agreed';

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
  evidence: Evidence;
  okSite: boolean;
  okRobot: boolean;
}
export interface PassLine {
  throughputPct: number;
  successRate: number;
  interventions: number;
  okSite: boolean;
  okRobot: boolean;
}
export interface Version {
  v: number;
  at: string;
  rows: Row[];
  pass: PassLine;
  changes: string[];
}
export interface Activity {
  id: string;
  who: Actor;
  text: string;
  at: string;
}

interface State {
  step: StepId;
  done: Record<StepId, boolean>;
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
  // 共通（3D）
  selected: PlaceId | null;
  view: '3d' | 'render';
  // 2
  rows: Row[];
  pass: PassLine;
  versions: Version[];
  draftChanges: string[];
  // 3
  results: 'none' | 'importing' | 'ready';
  appliedProposals: string[];
  reportShared: boolean;
  activity: Activity[];
  toast: string | null;

  go: (s: StepId) => void;
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
  setCondition: (rowId: string, c: string) => void;
  commitCondition: (rowId: string) => void;
  toggleOk: (rowId: string, who: 'site' | 'robot') => void;
  setPass: (p: Partial<Pick<PassLine, 'throughputPct' | 'successRate' | 'interventions'>>) => void;
  togglePassOk: (who: 'site' | 'robot') => void;
  confirmVersion: () => void;
  importResults: () => void;
  applyProposal: (id: string) => void;
  shareReport: () => void;
  showToast: (s: string) => void;
}

let seq = 0;
const uid = (p: string) => `${p}${++seq}`;
const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const rowStatus = (r: { okSite: boolean; okRobot: boolean; owner?: Owner | null }): RowStatus =>
  r.okSite && r.okRobot ? 'agreed' : r.okSite || r.okRobot ? 'half' : 'none';

export const placeStatus = (rows: Row[], p: PlaceId): RowStatus => {
  const rs = rows.filter((r) => r.place === p);
  if (rs.length && rs.every((r) => rowStatus(r) === 'agreed')) return 'agreed';
  if (rs.some((r) => r.okSite || r.okRobot)) return 'half';
  return 'none';
};

const firstAI: ChatMsg = { id: 'm0', from: 'ai', text: questions[0].q };

export const useStore = create<State>((set, get) => {
  const log = (who: Actor, text: string) =>
    set((s) => ({ activity: [{ id: uid('a'), who, text, at: now() }, ...s.activity].slice(0, 80) }));

  /** 確定後の変更は次の版の案として記録する */
  const recordChange = (text: string) => {
    const s = get();
    if (!s.versions.length) return;
    const next = s.versions[s.versions.length - 1].v + 1;
    set({ draftChanges: [...s.draftChanges, text] });
    log('system', t('activity.draft', { n: next, text }));
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

  return {
    step: 's11',
    done: { s11: false, s12: false, s2: false, s3: false },
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
    rows: rowSeeds.map((r) => ({ id: r.id, place: r.place, task: r.task, owner: null, condition: r.condition, evidence: r.evidence, okSite: false, okRobot: false })),
    pass: { ...defaultPass, okSite: false, okRobot: false },
    versions: [],
    draftChanges: [],
    results: 'none',
    appliedProposals: [],
    reportShared: false,
    activity: [],
    toast: null,

    go: (step) => set({ step, selected: null }),

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
      // 次の未確認の場所へ
      const rest = places.find((pl) => !get().checkedPlaces.includes(pl.id));
      if (rest) set({ selected: rest.id });
    },

    finish12: () => {
      set((s) => ({ done: { ...s.done, s12: true }, step: 's2', selected: 'tray' }));
      log('site', t('activity.layout'));
    },

    setOwner: (rowId, o) => {
      const r = get().rows.find((x) => x.id === rowId);
      if (!r || r.owner === o) return;
      set((s) => ({ rows: s.rows.map((x) => (x.id === rowId ? { ...x, owner: o, okSite: false, okRobot: false } : x)) }));
      const text = t('activity.owner', { task: r.task, owner: t(`s2.owners.${o}`) });
      log('robot', text);
      recordChange(text);
    },

    setCondition: (rowId, c) =>
      set((s) => ({ rows: s.rows.map((x) => (x.id === rowId ? { ...x, condition: c, okSite: false, okRobot: false } : x)) })),

    commitCondition: (rowId) => {
      const r = get().rows.find((x) => x.id === rowId);
      if (!r) return;
      const text = t('activity.cond', { task: r.task });
      log('robot', text);
      recordChange(`${text}「${r.condition}」`);
    },

    toggleOk: (rowId, who) => {
      const r = get().rows.find((x) => x.id === rowId);
      if (!r || !r.owner) return;
      const key = who === 'site' ? 'okSite' : 'okRobot';
      const on = !r[key];
      set((s) => ({ rows: s.rows.map((x) => (x.id === rowId ? { ...x, [key]: on } : x)) }));
      log(who, t(on ? 'activity.ok' : 'activity.unok', { task: r.task, who: t(who === 'site' ? 'app.roleSite' : 'app.roleRobot') }));
    },

    setPass: (p) => {
      set((s) => ({ pass: { ...s.pass, ...p, okSite: false, okRobot: false } }));
      log('robot', t('activity.pass'));
    },

    togglePassOk: (who) => {
      const key = who === 'site' ? 'okSite' : 'okRobot';
      const on = !get().pass[key];
      set((s) => ({ pass: { ...s.pass, [key]: on } }));
      log(who, t(on ? 'activity.ok' : 'activity.unok', { task: t('s2.passTitle'), who: t(who === 'site' ? 'app.roleSite' : 'app.roleRobot') }));
    },

    confirmVersion: () => {
      const s = get();
      const v = s.versions.length ? s.versions[s.versions.length - 1].v + 1 : 1;
      set({
        versions: [...s.versions, { v, at: now(), rows: s.rows.map((r) => ({ ...r })), pass: { ...s.pass }, changes: s.draftChanges }],
        draftChanges: [],
        done: { ...s.done, s2: true },
        results: v > 1 ? 'none' : s.results,
        reportShared: v > 1 ? false : s.reportShared,
        appliedProposals: v > 1 ? [] : s.appliedProposals,
      });
      log('system', t('activity.confirm', { n: v }));
      if (v === 1) log('system', t('activity.plan'));
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
        set((s) => ({ rows: s.rows.map((x) => (x.id === row ? { ...x, condition: cond, okSite: false, okRobot: false } : x)) }));
        get().commitCondition(row);
      } else {
        recordChange(p.text);
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

// テスト・デモ用にストアを公開（開発時のみ）
if (import.meta.env.DEV) (window as unknown as { __tc: typeof useStore }).__tc = useStore;

export const canEnter = (done: Record<StepId, boolean>, s: StepId) => {
  const i = STEPS.indexOf(s);
  return STEPS.slice(0, i).every((p) => done[p]);
};
