// Unreal Engine などで描画した画像・動画への差し替え口。
// public/renders/ にファイルを置き、パスを書くと、3D ビューアに「レンダー」切り替えが出る。
// overview はシーン全体、places は場所を選んだときに出す。
// 例：
//   overview: { type: 'video', src: '/renders/line-a-overview.mp4', poster: '/renders/line-a.jpg' },
//   places: { workbench: { type: 'image', src: '/renders/workbench.png' } },

import type { PlaceId } from './sample';

export interface RenderMedia {
  type: 'image' | 'video';
  src: string;
  poster?: string;
  caption?: string;
}

export const renders: { overview?: RenderMedia; places: Partial<Record<PlaceId, RenderMedia>> } = {
  overview: undefined,
  places: {},
};

export const hasRenders = Boolean(renders.overview) || Object.keys(renders.places).length > 0;
