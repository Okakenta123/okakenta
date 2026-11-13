import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { places, type PlaceId } from '../data/sample';
import { hasRenders, renders } from '../data/renders';
import { t } from '../i18n';
import { useStore } from '../store';
import { WarehouseScene, type ZoneLook } from './Scene';
import { anchorRef, type V3 } from './anchors';

export interface ViewerProps {
  mode: 'check' | 'agree';
  look: (p: PlaceId) => ZoneLook;
  legend?: { color: string; label: string }[];
  /** 3D の上に重ねる DOM（コメントピン・ラベル・カーソルなど） */
  overlay?: ReactNode;
  /** 3D シーンの中に足すもの（カーソルを動かす処理など） */
  sceneExtras?: ReactNode;
  onPick?: (p: PlaceId, point?: V3) => void;
  onFloor?: (point: V3) => void;
  animate?: boolean;
  className?: string;
  hint?: boolean;
}

const placeAnchor = Object.fromEntries(places.map((p) => [p.id, [p.center[0], p.labelHeight, p.center[1]] as V3]));

export function Viewer({ mode, look, legend, overlay, sceneExtras, onPick, onFloor, animate, className, hint = true }: ViewerProps) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const builtAt = useStore((s) => s.builtAt);
  const build = useStore((s) => s.build);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const pick = onPick ?? ((p: PlaceId) => select(p));

  const media = view === 'render' ? (selected && renders.places[selected]) || renders.overview : undefined;

  return (
    <div className={`viewer ${className ?? ''}`}>
      {build !== 'none' && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [5.8, 6.6, 9.2], fov: 42, near: 0.1, far: 120 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <WarehouseScene
              mode={mode}
              selected={selected}
              onSelect={pick}
              onFloor={onFloor}
              look={look}
              builtAt={builtAt}
              animate={animate ?? build === 'built'}
            >
              {sceneExtras}
            </WarehouseScene>
          </Suspense>
        </Canvas>
      )}
      {build === 'built' && view === '3d' && (
        <div className="pins">
          {places.map((p, i) => {
            const l = look(p.id);
            return (
              <button
                key={p.id}
                type="button"
                ref={anchorRef(`place-${p.id}`, placeAnchor[p.id])}
                className={`pin ${selected === p.id ? 'is-selected' : ''}`}
                style={{ ['--pin' as string]: l.color }}
                onClick={() => pick(p.id)}
              >
                <span className="pin-dot">{i + 1}</span>
                <span className="pin-name">{p.short}</span>
                {l.label && <span className="pin-status">{l.label}</span>}
              </button>
            );
          })}
          {overlay}
        </div>
      )}
      {media && (
        <div className="viewer-media">
          {media.type === 'video' ? <video src={media.src} poster={media.poster} autoPlay muted loop playsInline /> : <img src={media.src} alt={media.caption ?? ''} />}
          {media.caption && <span className="viewer-media-cap">{media.caption}</span>}
        </div>
      )}
      {build !== 'built' && overlay}
      {legend && build === 'built' && (
        <div className="viewer-legend">
          {legend.map((l) => (
            <span key={l.label}>
              <i style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {hasRenders && build === 'built' && (
        <div className="viewer-toggle seg">
          <button className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}>
            {t('app.view3d')}
          </button>
          <button className={view === 'render' ? 'on' : ''} onClick={() => setView('render')}>
            {t('app.viewRender')}
          </button>
        </div>
      )}
      {hint && build === 'built' && <div className="viewer-hint">{t('app.hint3d')}</div>}
    </div>
  );
}

/** 3D の下に出す場所のリスト（スマホでも押しやすいように） */
export function PlaceChips({ look }: { look: (p: PlaceId) => ZoneLook }) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  return (
    <div className="chips" role="tablist">
      {places.map((p, i) => {
        const l = look(p.id);
        return (
          <button key={p.id} role="tab" aria-selected={selected === p.id} className={`chip ${selected === p.id ? 'on' : ''}`} onClick={() => select(p.id)} style={{ ['--pin' as string]: l.color }}>
            <span className="chip-n">{i + 1}</span>
            {p.short}
            {l.label && <span className="chip-s">{l.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
