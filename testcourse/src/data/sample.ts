// サンプル現場「通販倉庫の箱詰めライン A」（架空）のデータ。
// 現場を差し替えるときはこのファイルだけを書き換えればよい。

export type PlaceId = 'tray' | 'workbench' | 'boxes' | 'conveyor' | 'aisle';
export type ReqKind = 'task' | 'exception' | 'condition' | 'performance';
export type Owner = 'robot' | 'human' | 'out';

export const site = {
  name: '通販倉庫の箱詰めライン A',
  people: {
    site: { name: '佐藤', role: '現場責任者', initial: '佐' },
    robot: { name: '高橋', role: 'Deployment Lead', initial: '高' },
  },
  humanThroughput: 120, // 箱/時（今の人の実績）
};

export interface Place {
  id: PlaceId;
  name: string;
  short: string;
  /** 床の上の中心 [x, z]（メートル） */
  center: [number, number];
  /** 床の上の大きさ [幅, 奥行き] */
  size: [number, number];
  labelHeight: number;
  note: string;
}

export const places: Place[] = [
  { id: 'tray', name: '商品トレー（棚）', short: '商品トレー', center: [-4.4, -1.1], size: [2.0, 1.6], labelHeight: 2.35, note: '流動棚の 3 段。手前に傾いたトレーから 1 点ずつ取る。' },
  { id: 'workbench', name: '作業台', short: '作業台', center: [-1.3, -1.25], size: [2.8, 2.1], labelHeight: 2.0, note: '箱詰めと封かん。奥にロボットアームを置く想定。' },
  { id: 'boxes', name: '箱置き場', short: '箱置き場', center: [-1.3, 1.45], size: [2.0, 1.5], labelHeight: 1.05, note: 'パレットに組み立て前・組み立て済みの段ボール。' },
  { id: 'conveyor', name: 'コンベア', short: 'コンベア', center: [2.9, -1.1], size: [5.2, 1.3], labelHeight: 1.35, note: '封かんした箱を出荷エリアへ流す。' },
  { id: 'aisle', name: '人の通路', short: '通路', center: [0.4, 3.7], size: [15, 1.7], labelHeight: 0.5, note: '人と台車が通る。幅 約 1.6 m。' },
];

export const placeById = Object.fromEntries(places.map((p) => [p.id, p])) as Record<PlaceId, Place>;

export interface Extract {
  kind: ReqKind;
  text: string;
}

export interface Question {
  q: string;
  example: string;
  extracts: Extract[];
}

/** ヒアリングの質問と回答例、回答から取り出す要件 */
export const questions: Question[] = [
  {
    q: 'こんにちは。ロボットに任せたい作業の流れを、最初から順に教えてください。',
    example: '棚のトレーから商品を取って、作業台で段ボールに詰めます。テープで封をして、コンベアに流しています。箱は横の箱置き場から取ります。',
    extracts: [
      { kind: 'task', text: '商品トレーから商品を取る' },
      { kind: 'task', text: '箱置き場から段ボールを取る' },
      { kind: 'task', text: '作業台で箱に詰める' },
      { kind: 'task', text: 'テープで封をする' },
      { kind: 'task', text: 'コンベアに流す' },
    ],
  },
  {
    q: 'ありがとうございます。いつもと違うこと、困ることはどんな時に起きますか？',
    example: '届いた段ボールが潰れていることがあります。あと、袋に入った柔らかい商品が全体の1割くらいあって、つかみにくいです。',
    extracts: [
      { kind: 'exception', text: '潰れた段ボールが混ざる' },
      { kind: 'exception', text: '袋入りの柔らかい商品（約1割）' },
    ],
  },
  {
    q: '現場の条件を教えてください。商品の重さ、通路、明るさなどはどうですか？',
    example: '商品はいちばん重くて2kgくらいです。作業台の前の通路は人と台車が通ります。夕方は窓から西日が入って、棚のあたりがまぶしくなります。',
    extracts: [
      { kind: 'condition', text: '商品は最大 2kg' },
      { kind: 'condition', text: '通路を人と台車が通る' },
      { kind: 'condition', text: '夕方は棚に西日が入る' },
    ],
  },
  {
    q: '最後に、今の実績を教えてください。1時間に何箱くらい、ミスはどのくらいですか？',
    example: '1人で1時間に120箱くらいです。入れ間違いは1日に1〜2件あります。',
    extracts: [
      { kind: 'performance', text: '人の実績 120 箱/時' },
      { kind: 'performance', text: '入れ間違い 1〜2 件/日' },
    ],
  },
];

/** 写真の確認で順に見つかるもの（デモ用の演出） */
export const photoFindings: Extract[][] = [
  [{ kind: 'condition', text: '流動棚は 3 段・手前に傾斜' }],
  [{ kind: 'exception', text: '潰れた箱（写真から検出）' }],
  [{ kind: 'condition', text: '通路の幅 約 1.6 m' }],
  [],
];

export type Evidence = { type: 'answer'; q: number } | { type: 'photo'; index: number; text: string };

export interface RowSeed {
  id: string;
  place: PlaceId;
  task: string;
  condition: string;
  evidence: Evidence;
  /** 実機テストの方法と理由（ロボット担当のとき） */
  test: { method: 'real' | 'sim'; reason: string };
}

/** 合意シートの行（作業）。条件は提案として入れておく。 */
export const rowSeeds: RowSeed[] = [
  { id: 'r1', place: 'tray', task: '箱物の商品を取る', condition: '2kg 以下の箱物。トレーの手前 1 列のみ', evidence: { type: 'answer', q: 0 }, test: { method: 'real', reason: 'つかみ・取り出しは物理接触が多く、実機でしか確かめられない' } },
  { id: 'r2', place: 'tray', task: '袋入りの柔らかい商品を取る', condition: '人が取り出して作業台に置く', evidence: { type: 'answer', q: 1 }, test: { method: 'real', reason: '袋の変形はシミュレーションの再現度が低い' } },
  { id: 'r3', place: 'tray', task: '西日の中で商品を見分ける', condition: '夕方 16〜18 時は棚に遮光カーテン', evidence: { type: 'answer', q: 2 }, test: { method: 'sim', reason: '照明条件はシミュレーションで幅広く振れる。実機は代表 1 条件のみ' } },
  { id: 'r4', place: 'boxes', task: '組み立て済みの箱を取る', condition: '箱置き場は 1 段積みまで', evidence: { type: 'answer', q: 0 }, test: { method: 'real', reason: '段ボールの摩擦・たわみは実機で確認する' } },
  { id: 'r5', place: 'boxes', task: '潰れた箱をよける', condition: '見つけたら脇に置き、人に知らせる', evidence: { type: 'photo', index: 1, text: '写真2：箱置き場の潰れた段ボール' }, test: { method: 'sim', reason: '潰れ方のパターンを数多く試せる。代表 3 箱は実機でも確認' } },
  { id: 'r6', place: 'workbench', task: '商品を箱に詰める', condition: '1 箱あたり 1〜3 点', evidence: { type: 'answer', q: 0 }, test: { method: 'real', reason: '箱の中での位置合わせは接触を伴う' } },
  { id: 'r7', place: 'workbench', task: 'テープで封をする', condition: '封かん機を使う。テープ切れは人が補充', evidence: { type: 'answer', q: 0 }, test: { method: 'real', reason: 'テープの貼り付き具合は実機でしか測れない' } },
  { id: 'r8', place: 'conveyor', task: '箱をコンベアに流す', condition: 'コンベアは 0.3 m/s 以下', evidence: { type: 'answer', q: 0 }, test: { method: 'sim', reason: '置き位置と速度の組み合わせを網羅的に試す' } },
  { id: 'r9', place: 'aisle', task: '通路の人・台車と共存する', condition: '人が 1.5 m 以内に入ったら減速、0.5 m で停止', evidence: { type: 'answer', q: 2 }, test: { method: 'sim', reason: '人の動きは危険を伴うため、まずシミュレーションで網羅。停止は実機でも確認' } },
];

export const defaultPass = { throughputPct: 70, successRate: 99, interventions: 2 };

export const testVenue = 'ロボット企業の試験場（ライン A の作業台・流動棚・コンベアを同じ寸法で再現した区画）';

/** 計画書の「再現する条件」 */
export const reproduceConditions = [
  '潰れた箱を全体の 5% 混ぜる',
  '袋入りの商品を全体の 10% 混ぜる（人の担当として流れを止めないか確認）',
  '西日相当の照明（棚の手前で 3,000 lx 以上）を 30 分',
  '通路を人が 10 分に 1 回横切る（台車あり・なし）',
  '商品の重さは 0.1〜2.0 kg',
];

/** 取り込む実機の結果（デモ用） */
export const sampleResults = {
  throughput: 88, // 箱/時
  successRate: 98.6,
  interventions: 1.6,
  hours: 4,
  items: {
    r1: { pass: true, note: '取り出し成功 412/415（99.3%）' },
    r3: { pass: true, note: 'シミュレーション 2,000 条件で見分け 99.6%。実機 1 条件も問題なし' },
    r4: { pass: true, note: '箱の取り出し 140/140' },
    r5: { pass: true, note: '潰れた箱 7/7 をよけた（シミュレーション 500 パターンで 98.8%）' },
    r6: { pass: true, note: '詰め 139/140、1 件は箱の角に当たり再試行' },
    r7: { pass: false, note: 'テープの端の浮き 4/140（2.9%）。封かん機の手前で箱がずれる' },
    r8: { pass: true, note: '置き位置のずれ 2 cm 以内（シミュレーション 1,000 回）' },
    r9: { pass: true, note: '減速・停止とも全 24 回で作動。最短停止距離 0.62 m' },
  } as Record<string, { pass: boolean; note: string }>,
  proposals: [
    { id: 'p1', row: 'r7', text: '「テープで封をする」の条件に「封かん機の前に位置合わせガイドを付ける」を追加して再テスト', condition: '封かん機を使う。手前に位置合わせガイドを付ける。テープ切れは人が補充' },
    { id: 'p2', row: null, text: '成功率 98.6% は合格ライン 99% に届かず。封かんの改善後に同じ合格ラインで再テストする', condition: null },
  ],
};
