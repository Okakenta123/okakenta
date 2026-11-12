import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { places, type PlaceId } from '../data/sample';
import { hasRenders, renders } from '../data/renders';
import { t } from '../i18n';
import { useStore } from '../store';
import { WarehouseScene, type PinRefs, type ZoneLook } from './Scene';

export interface ViewerProps {
  mode: 'check' | 'agree';
  look: (p: PlaceId) => ZoneLook;
  legend?: { color: string; label: string }[];
  overlay?: React.ReactNode;
  height?: string;
}

export function Viewer({ mode, look, legend, overlay, height }: ViewerProps) {
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const builtAt = useStore((s) => s.builtAt);
  const build = useStore((s) => s.build);
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  const pins = useRef({}) as PinRefs;
  const hovered = useStore((s) => s.selected);
  const media = view === 'render' ? (selected && renders.places[selected]) || renders.overview : undefined;

  return (
    <div className="viewer" style={height ? { height } : undefined}>
      {build !== 'none' && (
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [5.8, 6.6, 9.2], fov: 42, near: 0.1, far: 120 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onPointerMissed={() => undefined}
        >
          <Suspense fallback={null}>
            <WarehouseScene mode={mode} selected={selected} onSelect={select} look={look} builtAt={builtAt} animate={build === 'built'} pins={pins} />
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
                ref={(el) => {
                  pins.current[p.id] = el;
                }}
                className={`pin ${hovered === p.id ? 'is-selected' : ''}`}
                style={{ ['--pin' as string]: l.color }}
                onClick={() => select(p.id)}
              >
                <span className="pin-dot">{i + 1}</span>
                <span className="pin-name">{p.short}</span>
                <span className="pin-status">{l.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {media && (
        <div className="viewer-media">
          {media.type === 'video' ? <video src={media.src} poster={media.poster} autoPlay muted loop playsInline /> : <img src={media.src} alt={media.caption ?? ''} />}
          {media.caption && <span className="viewer-media-cap">{media.caption}</span>}
        </div>
      )}
      {overlay}
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
          <button className={view === '3d' ? 'on' : ''} onClick={() => setView('3d')}>{t('app.view3d')}</button>
          <button className={view === 'render' ? 'on' : ''} onClick={() => setView('render')}>{t('app.viewRender')}</button>
        </div>
      )}
      {build === 'built' && <div className="viewer-hint">{t('app.hint3d')}</div>}
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
            <span className="chip-s">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}
