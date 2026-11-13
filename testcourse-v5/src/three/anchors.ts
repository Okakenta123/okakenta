// 3D の位置に DOM（ラベル・コメントピン・カーソル）を重ねるための登録所。
// Scene の中の Projector が毎フレーム画面座標に変換して、要素の transform を書き換える。

export type V3 = [number, number, number];

export interface Anchor {
  pos: V3;
  el: HTMLElement;
  /** true: 要素の左上を点に合わせる（カーソル）。false: 中心を合わせる */
  tip?: boolean;
}

export const anchors = new Map<string, Anchor>();

/** ref に渡す。要素が消えたら登録も消える */
export function anchorRef(id: string, pos: V3, tip = false) {
  return (el: HTMLElement | null) => {
    if (el) anchors.set(id, { pos, el, tip });
    else if (anchors.get(id)?.pos === pos) anchors.delete(id);
  };
}

/** 動く点（カーソルなど）の位置を書き換える */
export function moveAnchor(id: string, pos: V3) {
  const a = anchors.get(id);
  if (a) a.pos = pos;
}
