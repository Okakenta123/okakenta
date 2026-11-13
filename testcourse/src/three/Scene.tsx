import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { places, type PlaceId } from '../data/sample';
import { anchors, type V3 } from './anchors';
import { concreteRoughness, concreteTexture, wallTexture } from './textures';
import {
  Carton,
  Conveyor,
  CrushedCarton,
  FlatCardboard,
  FlowRack,
  HandCart,
  HighBayLamp,
  Pallet,
  PalletLoad,
  PalletRack,
  Person,
  RobotArm,
  SafetyFence,
  Workbench,
  mats,
} from './models';

export type ZoneLook = { color: string; label: string; badge?: string };

export interface SceneProps {
  mode: 'check' | 'agree';
  selected: PlaceId | null;
  /** 場所のクリック。point はクリックした 3D の位置 */
  onSelect: (p: PlaceId, point?: V3) => void;
  /** 場所以外の床をクリックしたとき（コメントを置くときなど） */
  onFloor?: (point: V3) => void;
  look: (p: PlaceId) => ZoneLook;
  builtAt: number; // performance.now()/1000。0 なら即表示
  animate?: boolean;
  children?: ReactNode;
}

// ---------- 生成の演出：順番に現れる ----------
function Appear({ order, builtAt, children }: { order: number; builtAt: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const done = useRef(builtAt === 0);
  useFrame(() => {
    const g = ref.current;
    if (!g || done.current) return;
    const k = THREE.MathUtils.clamp((performance.now() / 1000 - builtAt - order * 0.28) / 0.55, 0, 1);
    const e = k === 0 ? 0.0001 : 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2; // easeOutBack
    g.scale.setScalar(Math.max(0.0001, e));
    g.visible = k > 0;
    if (k >= 1) done.current = true;
  });
  return (
    <group ref={ref} scale={builtAt === 0 ? 1 : 0.0001}>
      {children}
    </group>
  );
}

// ---------- 建屋 ----------
function Building() {
  const floorMat = useMemo(() => {
    const map = concreteTexture();
    const rough = concreteRoughness();
    return new THREE.MeshStandardMaterial({ map, roughnessMap: rough, roughness: 0.85, metalness: 0.0, color: '#d4d8dc' });
  }, []);
  const wallMat = useMemo(() => {
    const t = wallTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(5, 1);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  }, []);
  const m = mats();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0, 0.5]} material={floorMat} receiveShadow>
        <planeGeometry args={[21, 15]} />
      </mesh>
      {/* 奥の壁 */}
      <mesh position={[0.5, 3.5, -6]} material={wallMat} receiveShadow>
        <planeGeometry args={[21, 7]} />
      </mesh>
      <mesh position={[0.5, 0.15, -5.98]}>
        <planeGeometry args={[21, 0.3]} />
        <meshStandardMaterial color="#f2b705" roughness={0.6} />
      </mesh>
      {/* 西の壁と窓（夕方の西日） */}
      <mesh position={[-10, 3.5, 0.5]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[15, 7]} />
      </mesh>
      {[-3.5, 0, 3.5].map((z) => (
        <group key={z} position={[-9.97, 4.1, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <planeGeometry args={[2.4, 1.5]} />
            <meshStandardMaterial color="#fff" emissive="#ffd9a0" emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.06, 1.5]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </group>
      ))}
      {/* 柱 */}
      {[-6, -1, 4, 9].map((x) => (
        <group key={x} position={[x, 0, -5.75]}>
          <mesh position={[0, 3.5, 0]} material={m.steelDark} castShadow receiveShadow>
            <boxGeometry args={[0.35, 7, 0.35]} />
          </mesh>
          <mesh position={[0, 0.6, 0]} material={m.safetyYellow}>
            <boxGeometry args={[0.42, 1.2, 0.42]} />
          </mesh>
        </group>
      ))}
      {[
        [-7, -3],
        [-1.5, -3],
        [4, -3],
        [-7, 2],
        [-1.5, 2],
        [4, 2],
      ].map(([x, z]) => (
        <HighBayLamp key={`${x}${z}`} position={[x, 6.2, z]} />
      ))}
      <FloorMarkings />
    </group>
  );
}

function Stripe({ from, to, w = 0.1, color = '#f2b705', y = 0.004 }: { from: [number, number]; to: [number, number]; w?: number; color?: string; y?: number }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ang = Math.atan2(to[1] - from[1], to[0] - from[0]);
  return (
    <mesh position={[(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2]} rotation={[-Math.PI / 2, 0, -ang]} receiveShadow>
      <planeGeometry args={[len, w]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

function FloorMarkings() {
  return (
    <group>
      {/* 通路の線 */}
      <Stripe from={[-9.6, 2.85]} to={[10.6, 2.85]} />
      <Stripe from={[-9.6, 4.55]} to={[10.6, 4.55]} />
      {/* 通路の矢印 */}
      {[-6, -2, 2, 6].map((x) => (
        <group key={x} position={[x, 0.005, 3.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh position={[-0.2, 0, 0]}>
            <planeGeometry args={[0.6, 0.14]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.7} />
          </mesh>
          <mesh position={[0.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.22, 3]} />
            <meshStandardMaterial color="#e5e7eb" roughness={0.7} />
          </mesh>
        </group>
      ))}
      {/* ラックの前の線 */}
      <Stripe from={[-8, -3.85]} to={[7, -3.85]} w={0.08} />
      {/* ロボット周りの立入禁止の斜線 */}
      {Array.from({ length: 10 }, (_, i) => (
        <Stripe key={i} from={[-2.45 + i * 0.24, -2.45]} to={[-2.25 + i * 0.24, -2.15]} w={0.06} y={0.005} />
      ))}
    </group>
  );
}

// ---------- 場所の当たり判定・色・ラベル ----------
function Border({ w, d, color, thick, dashed }: { w: number; d: number; color: string; thick: number; dashed: boolean }) {
  // 床に貼る枠線（破線は短い板を並べる）
  const segs = useMemo(() => {
    const out: { x: number; z: number; len: number; rot: number }[] = [];
    const edge = (x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const rot = Math.atan2(z2 - z1, x2 - x1);
      if (!dashed) return out.push({ x: (x1 + x2) / 2, z: (z1 + z2) / 2, len, rot });
      const n = Math.max(2, Math.round(len / 0.4));
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.2) / n, t1 = (i + 0.8) / n;
        out.push({ x: x1 + (x2 - x1) * (t0 + t1) / 2, z: z1 + (z2 - z1) * (t0 + t1) / 2, len: len * (t1 - t0), rot });
      }
    };
    edge(-w / 2, -d / 2, w / 2, -d / 2);
    edge(w / 2, -d / 2, w / 2, d / 2);
    edge(w / 2, d / 2, -w / 2, d / 2);
    edge(-w / 2, d / 2, -w / 2, -d / 2);
    return out;
  }, [w, d, dashed]);
  return (
    <group position={[0, 0.003, 0]}>
      {segs.map((sg, i) => (
        <mesh key={i} position={[sg.x, 0, sg.z]} rotation={[-Math.PI / 2, 0, -sg.rot]}>
          <planeGeometry args={[sg.len + (dashed ? 0 : thick), thick]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Zone({ id, look, selected, hovered, onSelect, onHover }: {
  id: PlaceId;
  look: ZoneLook;
  selected: boolean;
  hovered: boolean;
  onSelect: (p: PlaceId, point?: V3) => void;
  onHover: (p: PlaceId | null) => void;
}) {
  const place = places.find((p) => p.id === id)!;
  const [cx, cz] = place.center;
  const [w, d] = place.size;
  const fill = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(look.color), [look.color]);
  useFrame(({ clock }) => {
    const pulse = selected ? 0.4 + 0.15 * Math.sin(clock.elapsedTime * 4) : hovered ? 0.38 : 0.24;
    if (fill.current) fill.current.opacity = pulse;
    if (glow.current) {
      glow.current.visible = selected;
      const s = 1 + 0.04 * Math.sin(clock.elapsedTime * 4);
      glow.current.scale.set(s, s, 1);
    }
  });
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onSelect(id, [e.point.x, e.point.y, e.point.z]);
  };
  return (
    <group position={[cx, 0.012, cz]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={click}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(id);
        }}
        onPointerOut={() => onHover(null)}
      >
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial ref={fill} color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} visible={false}>
        <planeGeometry args={[w + 0.35, d + 0.35]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <Border w={w} d={d} color={look.color} thick={selected ? 0.12 : hovered ? 0.09 : 0.06} dashed={!selected && look.badge === 'dash'} />
    </group>
  );
}

/** 選んだ場所へカメラを寄せる */
function FocusRig({ selected }: { selected: PlaceId | null }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const goal = useRef<{ target: THREE.Vector3; cam: THREE.Vector3 } | null>(null);
  useEffect(() => {
    if (!selected) return;
    const p = places.find((x) => x.id === selected)!;
    const target = new THREE.Vector3(p.center[0], 0.6, p.center[1]);
    const dist = selected === 'aisle' ? 13 : selected === 'conveyor' ? 11 : 10;
    const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
    // 真上・真下からになり過ぎないよう補正
    dir.y = THREE.MathUtils.clamp(dir.y, 0.45, 0.8);
    dir.normalize();
    goal.current = { target, cam: target.clone().add(dir.multiplyScalar(dist)) };
  }, [selected, camera, controls]);
  useFrame((_, dt) => {
    if (!goal.current || !controls) return;
    const k = 1 - Math.exp(-dt * 4);
    controls.target.lerp(goal.current.target, k);
    camera.position.lerp(goal.current.cam, k);
    controls.update();
    if (camera.position.distanceTo(goal.current.cam) < 0.02) goal.current = null;
  });
  return null;
}

/** 登録された 3D の点を画面座標に変換して、DOM の要素を動かす */
function Projector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    anchors.forEach((a) => {
      v.set(a.pos[0], a.pos[1], a.pos[2]).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      a.el.style.opacity = visible ? '1' : '0';
      a.el.style.visibility = visible ? '' : 'hidden';
      a.el.style.transform = a.tip ? `translate(${x}px, ${y}px)` : `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  });
  return null;
}

export function WarehouseScene({ selected, onSelect, onFloor, look, builtAt, animate = true, children }: SceneProps) {
  const [hovered, setHovered] = useState<PlaceId | null>(null);
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  return (
    <>
      <color attach="background" args={['#aeb6be']} />
      <fog attach="fog" args={['#aeb6be', 20, 42]} />
      <hemisphereLight args={['#eaf1f7', '#6b6155', 0.55]} />
      {/* 西日（窓のある西側から） */}
      <directionalLight
        position={[-11, 13, 5]}
        intensity={2.4}
        color="#fff1dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[8, 6, 10]} intensity={0.35} color="#dbe7ff" />
      {[[-4, 5, 0], [2, 5, 0]].map((p, i) => (
        <pointLight key={i} position={p as [number, number, number]} intensity={8} distance={11} decay={2} color="#fff4e0" />
      ))}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} color="#fff6e8" />
        <Lightformer form="rect" intensity={1.2} position={[-8, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 3, 1]} color="#ffd9a0" />
        <Lightformer form="rect" intensity={0.6} position={[8, 3, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} color="#cfe0ff" />
      </Environment>

      <Appear order={0} builtAt={builtAt}>
        <Building />
      </Appear>
      <Appear order={2} builtAt={builtAt}>
        <PalletRack position={[-7.6, 0, -4.7]} bays={5} levels={3} />
      </Appear>

      {/* 商品トレー（流動棚） */}
      <Appear order={4} builtAt={builtAt}>
        <group onClick={(e) => { e.stopPropagation(); if (e.delta <= 6) onSelect('tray', [e.point.x, e.point.y, e.point.z]); }}>
          <FlowRack position={[-4.4, 0, -1.4]} />
          <group position={[-4.4, 0, -0.2]} rotation={[0, Math.PI / 2, 0]}>
            <Person walk={false} range={[0, 0]} vestColor="#2fb36d" />
          </group>
        </group>
      </Appear>

      {/* 作業台とロボット */}
      <Appear order={5} builtAt={builtAt}>
        <group onClick={(e) => { e.stopPropagation(); if (e.delta <= 6) onSelect('workbench', [e.point.x, e.point.y, e.point.z]); }}>
          <Workbench position={[-1.3, 0, -0.75]} />
          <RobotArm position={[-1.3, 0, -1.75]} active={animate} />
          <SafetyFence points={[[-2.55, -0.55], [-2.55, -2.45], [-0.05, -2.45], [-0.05, -1.55]]} />
        </group>
      </Appear>

      {/* 箱置き場 */}
      <Appear order={6} builtAt={builtAt}>
        <group onClick={(e) => { e.stopPropagation(); if (e.delta <= 6) onSelect('boxes', [e.point.x, e.point.y, e.point.z]); }}>
          <Pallet position={[-1.5, 0, 1.45]} />
          <FlatCardboard position={[-1.5, 0.144, 1.45]} count={16} />
          <Carton position={[-0.65, 0, 1.15]} size={[0.42, 0.28, 0.32]} />
          <Carton position={[-0.65, 0.28, 1.13]} size={[0.42, 0.28, 0.32]} rotation={[0, 0.08, 0]} />
          <CrushedCarton position={[-0.62, 0, 1.75]} rotation={[0, -0.4, 0]} />
        </group>
      </Appear>

      {/* コンベア */}
      <Appear order={7} builtAt={builtAt}>
        <group onClick={(e) => { e.stopPropagation(); if (e.delta <= 6) onSelect('conveyor', [e.point.x, e.point.y, e.point.z]); }}>
          <Conveyor position={[2.9, 0, -1.1]} length={5.2} running={animate} />
        </group>
        <PalletLoad position={[6.4, 0, -1.1]} layers={2} seed={7} />
        <PalletLoad position={[6.4, 0, 0.6]} layers={3} seed={11} />
      </Appear>

      {/* 人の通路 */}
      <Appear order={8} builtAt={builtAt}>
        <group onClick={(e) => { e.stopPropagation(); if (e.delta <= 6) onSelect('aisle', [e.point.x, e.point.y, e.point.z]); }}>
          <Person walk={animate} range={[-6.5, 6.5]} z={3.45} speed={0.85} />
          <HandCart position={[6.2, 0, 4.0]} rotation={[0, Math.PI, 0]} />
        </group>
      </Appear>

      <Appear order={10} builtAt={builtAt}>
        {places.map((p) => (
          <Zone key={p.id} id={p.id} look={look(p.id)} selected={selected === p.id} hovered={hovered === p.id} onSelect={onSelect} onHover={setHovered} />
        ))}
      </Appear>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.15}
        target={[-0.3, 0.5, 0.6]}
      />
      <FocusRig selected={selected} />
      <Projector />
      {children}
      {onFloor && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0.5, 0.002, 0.5]}
          onClick={(e) => {
            if (e.delta > 6) return;
            e.stopPropagation();
            onFloor([e.point.x, 0, e.point.z]);
          }}
        >
          <planeGeometry args={[21, 15]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}
