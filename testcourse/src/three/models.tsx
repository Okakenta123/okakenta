// 倉庫の 3D モデル（コードで組み立てたもの）。
// glTF に差し替えるときは、同じ位置・大きさで <primitive object={gltf.scene} /> に置き換える。
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { cardboardTexture, woodTexture } from './textures';

type V3 = [number, number, number];

// ---------- マテリアル ----------
let _m: ReturnType<typeof createMats> | null = null;
function createMats() {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  return {
    steel: std({ color: '#7d868f', metalness: 0.75, roughness: 0.38 }),
    steelDark: std({ color: '#3a4048', metalness: 0.6, roughness: 0.5 }),
    rackBlue: std({ color: '#1f5fa8', metalness: 0.35, roughness: 0.45 }),
    rackOrange: std({ color: '#e0731b', metalness: 0.3, roughness: 0.45 }),
    safetyYellow: std({ color: '#f2b705', metalness: 0.2, roughness: 0.5 }),
    black: std({ color: '#1d2125', roughness: 0.85 }),
    belt: std({ color: '#25292d', roughness: 0.95 }),
    rubber: std({ color: '#15181b', roughness: 0.9 }),
    wood: std({ map: woodTexture(), color: '#d9b98a', roughness: 0.85 }),
    palletWood: std({ map: woodTexture(), color: '#c39a66', roughness: 0.9 }),
    card: std({ map: cardboardTexture(true), roughness: 0.92 }),
    cardPlain: std({ map: cardboardTexture(false), roughness: 0.92 }),
    trayBlue: std({ color: '#2f78c4', roughness: 0.55 }),
    robotWhite: std({ color: '#e8ebee', metalness: 0.15, roughness: 0.32 }),
    robotJoint: std({ color: '#2a3036', metalness: 0.5, roughness: 0.4 }),
    accent: std({ color: '#0f9488', emissive: '#0f9488', emissiveIntensity: 0.25, roughness: 0.4 }),
    skin: std({ color: '#e1b48c', roughness: 0.7 }),
    vest: std({ color: '#ff7a1a', roughness: 0.65 }),
    reflect: std({ color: '#e8eef2', emissive: '#c9d4dc', emissiveIntensity: 0.15, roughness: 0.3 }),
    pants: std({ color: '#2f3a4a', roughness: 0.8 }),
    shirt: std({ color: '#465569', roughness: 0.8 }),
    helmet: std({ color: '#f5f6f7', roughness: 0.35 }),
    screen: std({ color: '#0b1220', emissive: '#2aa3d9', emissiveIntensity: 0.6, roughness: 0.2 }),
    bag: std({ color: '#d7dde3', roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.92 }),
    fence: std({ color: '#f2b705', transparent: true, opacity: 0.18, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false }),
  };
}
export const mats = () => (_m ??= createMats());

function Bx({ s, p = [0, 0, 0], r, m, cast = true, receive = true }: { s: V3; p?: V3; r?: V3; m: THREE.Material; cast?: boolean; receive?: boolean }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Cyl({ rt, rb = rt, h, p = [0, 0, 0], r, m, seg = 20 }: { rt: number; rb?: number; h: number; p?: V3; r?: V3; m: THREE.Material; seg?: number }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
    </mesh>
  );
}

// ---------- 段ボール ----------
export function Carton({ size = [0.4, 0.3, 0.3], position = [0, 0, 0], rotation, plain }: { size?: V3; position?: V3; rotation?: V3; plain?: boolean }) {
  const m = mats();
  return (
    <mesh position={[position[0], position[1] + size[1] / 2, position[2]]} rotation={rotation} material={plain ? m.cardPlain : m.card} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** 潰れた段ボール：頂点を押し下げて凹みを作る */
export function CrushedCarton({ position = [0, 0, 0], rotation }: { position?: V3; rotation?: V3 }) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.46, 0.32, 0.36, 8, 6, 8);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // 角を斜めに押しつぶす
      const k = THREE.MathUtils.clamp((v.x + 0.23) / 0.46, 0, 1) * THREE.MathUtils.clamp((v.z + 0.18) / 0.36, 0, 1);
      if (v.y > 0) v.y -= 0.17 * k * k;
      // 側面の凹み
      const d = Math.exp(-((v.y - 0.02) ** 2) / 0.006 - (v.x - 0.05) ** 2 / 0.01);
      if (v.z > 0.17) v.z -= 0.07 * d;
      v.x += Math.sin(v.y * 18) * 0.006;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geo} position={[position[0], position[1] + 0.16, position[2]]} rotation={rotation} material={mats().cardPlain} castShadow receiveShadow />;
}

/** 組み立て前の平たい段ボールの束 */
export function FlatCardboard({ position = [0, 0, 0], count = 14 }: { position?: V3; count?: number }) {
  const m = mats();
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <Bx key={i} s={[0.95, 0.012, 0.7]} p={[(i % 3) * 0.006 - 0.006, 0.006 + i * 0.013, ((i * 7) % 5) * 0.004]} r={[0, ((i % 4) - 1.5) * 0.008, 0]} m={m.cardPlain} />
      ))}
    </group>
  );
}

// ---------- パレット ----------
export function Pallet({ position = [0, 0, 0], rotation }: { position?: V3; rotation?: V3 }) {
  const m = mats();
  return (
    <group position={position} rotation={rotation}>
      {[-0.5, -0.25, 0, 0.25, 0.5].map((x) => (
        <Bx key={`t${x}`} s={[0.14, 0.022, 1.0]} p={[x * 1.0, 0.133, 0]} m={m.palletWood} />
      ))}
      {[-0.45, 0, 0.45].map((z) => (
        <Bx key={`s${z}`} s={[1.2, 0.1, 0.1]} p={[0, 0.072, z]} m={m.palletWood} />
      ))}
      {[-0.5, 0, 0.5].map((x) => (
        <Bx key={`b${x}`} s={[0.14, 0.022, 1.0]} p={[x * 1.05, 0.011, 0]} m={m.palletWood} />
      ))}
    </group>
  );
}

/** パレットに積んだ段ボールの山 */
export function PalletLoad({ position = [0, 0, 0], layers = 3, seed = 1, rotation }: { position?: V3; layers?: number; seed?: number; rotation?: V3 }) {
  const items = useMemo(() => {
    const out: { p: V3; s: V3 }[] = [];
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let l = 0; l < layers; l++)
      for (let ix = 0; ix < 3; ix++)
        for (let iz = 0; iz < 2; iz++) {
          if (l === layers - 1 && r() < 0.35) continue;
          out.push({ p: [-0.38 + ix * 0.38 + (r() - 0.5) * 0.02, 0.145 + l * 0.3, -0.24 + iz * 0.48 + (r() - 0.5) * 0.02], s: [0.36, 0.29, 0.46] });
        }
    return out;
  }, [layers, seed]);
  return (
    <group position={position} rotation={rotation}>
      <Pallet />
      {items.map((it, i) => (
        <Carton key={i} position={it.p} size={it.s} plain={i % 3 === 0} />
      ))}
    </group>
  );
}

// ---------- 背景のパレットラック ----------
export function PalletRack({ position = [0, 0, 0], bays = 3, levels = 3, seed = 3 }: { position?: V3; bays?: number; levels?: number; seed?: number }) {
  const m = mats();
  const bayW = 2.7, depth = 1.1, levelH = 1.6;
  const H = levels * levelH + 0.6;
  return (
    <group position={position}>
      {Array.from({ length: bays + 1 }, (_, i) => (
        <group key={i} position={[i * bayW, 0, 0]}>
          <Bx s={[0.09, H, 0.09]} p={[0, H / 2, -depth / 2]} m={m.rackBlue} />
          <Bx s={[0.09, H, 0.09]} p={[0, H / 2, depth / 2]} m={m.rackBlue} />
          {Array.from({ length: Math.ceil(H / 0.8) }, (_, k) => (
            <Bx key={k} s={[0.03, 0.03, depth * 1.05]} p={[0, 0.4 + k * 0.8, 0]} r={[k % 2 ? 0.6 : -0.6, 0, 0]} m={m.rackBlue} cast={false} />
          ))}
          <Bx s={[0.22, 0.4, 0.22]} p={[0, 0.2, depth / 2 + 0.05]} m={m.safetyYellow} />
        </group>
      ))}
      {Array.from({ length: bays }, (_, b) =>
        Array.from({ length: levels }, (_, l) => {
          const y = 0.15 + l * levelH;
          const x = b * bayW + bayW / 2;
          return (
            <group key={`${b}-${l}`}>
              {l > 0 && (
                <>
                  <Bx s={[bayW, 0.12, 0.06]} p={[x, y - 0.08, -depth / 2]} m={m.rackOrange} />
                  <Bx s={[bayW, 0.12, 0.06]} p={[x, y - 0.08, depth / 2]} m={m.rackOrange} />
                </>
              )}
              {[(-0.62), 0.62].map((dx, k) =>
                (b + l + k + seed) % 5 === 0 ? null : (
                  <PalletLoad key={k} position={[x + dx, l === 0 ? 0 : y - 0.02, 0]} rotation={[0, Math.PI / 2, 0]} layers={1 + ((b * 3 + l + k + seed) % 3)} seed={b * 10 + l * 3 + k + seed} />
                ),
              )}
            </group>
          );
        }),
      )}
    </group>
  );
}

// ---------- 流動棚（商品トレー） ----------
function Tray({ position, seed }: { position: V3; seed: number }) {
  const m = mats();
  const w = 0.42, d = 0.55, h = 0.16, t = 0.012;
  const colors = ['#c0392b', '#e9e1d3', '#2c3e50', '#16a085', '#d35400', '#8e44ad'];
  return (
    <group position={position}>
      <Bx s={[w, t, d]} p={[0, t / 2, 0]} m={m.trayBlue} />
      <Bx s={[t, h, d]} p={[-w / 2, h / 2, 0]} m={m.trayBlue} />
      <Bx s={[t, h, d]} p={[w / 2, h / 2, 0]} m={m.trayBlue} />
      <Bx s={[w, h, t]} p={[0, h / 2, -d / 2]} m={m.trayBlue} />
      <Bx s={[w, h * 0.6, t]} p={[0, h * 0.3, d / 2]} m={m.trayBlue} />
      {Array.from({ length: 3 + (seed % 3) }, (_, i) => {
        const bag = (seed + i) % 4 === 0;
        const c = colors[(seed * 3 + i) % colors.length];
        const px = -0.11 + (i % 2) * 0.2, pz = -0.18 + Math.floor(i / 2) * 0.17;
        return bag ? (
          <mesh key={i} position={[px, 0.06, pz]} scale={[1, 0.45, 1.2]} material={m.bag} castShadow>
            <sphereGeometry args={[0.085, 16, 12]} />
          </mesh>
        ) : (
          <mesh key={i} position={[px, 0.055, pz]} rotation={[0, (i - 1) * 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.13, 0.1 - (i % 2) * 0.03, 0.12]} />
            <meshStandardMaterial color={c} roughness={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

export function FlowRack({ position = [0, 0, 0], rotation }: { position?: V3; rotation?: V3 }) {
  const m = mats();
  const W = 1.8, D = 1.0, H = 2.0;
  const tilt = 0.14;
  return (
    <group position={position} rotation={rotation}>
      {[-W / 2, W / 2].map((x) =>
        [-D / 2, D / 2].map((z) => <Bx key={`${x}${z}`} s={[0.06, H, 0.06]} p={[x, H / 2, z]} m={m.rackBlue} />),
      )}
      {[-W / 2, W / 2].map((x) => <Bx key={`top${x}`} s={[0.05, 0.05, D]} p={[x, H - 0.03, 0]} m={m.rackBlue} />)}
      {[0.35, 0.95, 1.55].map((y, li) => (
        <group key={li} position={[0, y, 0]} rotation={[tilt, 0, 0]}>
          <Bx s={[W, 0.05, 0.05]} p={[0, -0.03, -D / 2]} m={m.rackOrange} />
          <Bx s={[W, 0.05, 0.05]} p={[0, -0.03, D / 2]} m={m.rackOrange} />
          {/* ローラー */}
          {Array.from({ length: 9 }, (_, k) => (
            <Cyl key={k} rt={0.012} h={D} p={[-W / 2 + 0.1 + k * 0.2, -0.01, 0]} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={8} />
          ))}
          {[-0.66, -0.22, 0.22, 0.66].map((x, k) => (
            <Tray key={k} position={[x, 0.0, 0.12]} seed={li * 4 + k + 1} />
          ))}
        </group>
      ))}
      {/* ラベル板 */}
      <Bx s={[W, 0.08, 0.01]} p={[0, 0.25, D / 2 + 0.06]} m={m.safetyYellow} cast={false} />
    </group>
  );
}

// ---------- 作業台 ----------
export function Workbench({ position = [0, 0, 0], rotation }: { position?: V3; rotation?: V3 }) {
  const m = mats();
  const W = 1.8, D = 0.8, H = 0.9;
  return (
    <group position={position} rotation={rotation}>
      <Bx s={[W, 0.04, D]} p={[0, H, 0]} m={m.wood} />
      <Bx s={[W, 0.06, 0.04]} p={[0, H - 0.05, D / 2 - 0.02]} m={m.steelDark} />
      {[-W / 2 + 0.05, W / 2 - 0.05].map((x) =>
        [-D / 2 + 0.05, D / 2 - 0.05].map((z) => <Bx key={`${x}${z}`} s={[0.05, H, 0.05]} p={[x, H / 2, z]} m={m.steelDark} />),
      )}
      <Bx s={[W - 0.1, 0.03, D - 0.1]} p={[0, 0.2, 0]} m={m.steel} />
      {/* 下段の平たい段ボール */}
      <FlatCardboard position={[0.3, 0.215, 0]} count={6} />
      {/* 上の棚と照明 */}
      {[-W / 2 + 0.05, W / 2 - 0.05].map((x) => <Bx key={x} s={[0.04, 0.9, 0.04]} p={[x, H + 0.45, -D / 2 + 0.05]} m={m.steelDark} />)}
      <Bx s={[W, 0.03, 0.3]} p={[0, H + 0.85, -D / 2 + 0.17]} m={m.steel} />
      <mesh position={[0, H + 0.82, -D / 2 + 0.2]}>
        <boxGeometry args={[W - 0.3, 0.02, 0.06]} />
        <meshStandardMaterial color="#fff" emissive="#fff6e5" emissiveIntensity={1.2} />
      </mesh>
      {/* モニター */}
      <group position={[0.65, H + 0.02, -0.25]} rotation={[0, -0.35, 0]}>
        <Bx s={[0.06, 0.25, 0.06]} p={[0, 0.12, 0]} m={m.steelDark} />
        <Bx s={[0.42, 0.26, 0.02]} p={[0, 0.36, 0]} r={[-0.1, 0, 0]} m={m.robotJoint} />
        <mesh position={[0, 0.36, 0.012]} rotation={[-0.1, 0, 0]} material={m.screen}>
          <planeGeometry args={[0.38, 0.22]} />
        </mesh>
      </group>
      {/* テープカッターと開いた箱 */}
      <group position={[-0.62, H + 0.02, 0.12]}>
        <Bx s={[0.22, 0.1, 0.1]} p={[0, 0.05, 0]} m={m.robotJoint} />
        <Cyl rt={0.06} h={0.05} p={[0, 0.12, 0]} r={[0, 0, Math.PI / 2]} m={m.card} />
      </group>
      <OpenCarton position={[-0.05, H + 0.02, 0.05]} />
    </group>
  );
}

export function OpenCarton({ position = [0, 0, 0] }: { position?: V3 }) {
  const m = mats();
  const w = 0.42, d = 0.32, h = 0.26, t = 0.008;
  return (
    <group position={position}>
      <Bx s={[w, t, d]} p={[0, t / 2, 0]} m={m.cardPlain} />
      <Bx s={[t, h, d]} p={[-w / 2, h / 2, 0]} m={m.cardPlain} />
      <Bx s={[t, h, d]} p={[w / 2, h / 2, 0]} m={m.cardPlain} />
      <Bx s={[w, h, t]} p={[0, h / 2, -d / 2]} m={m.cardPlain} />
      <Bx s={[w, h, t]} p={[0, h / 2, d / 2]} m={m.cardPlain} />
      {/* フラップ */}
      <Bx s={[w, t, d / 2]} p={[0, h + 0.07, -d / 2 - 0.07]} r={[-1.1, 0, 0]} m={m.cardPlain} />
      <Bx s={[w, t, d / 2]} p={[0, h + 0.07, d / 2 + 0.07]} r={[1.1, 0, 0]} m={m.cardPlain} />
      <mesh position={[0.06, 0.07, 0]} castShadow>
        <boxGeometry args={[0.14, 0.12, 0.13]} />
        <meshStandardMaterial color="#c0392b" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ---------- ロボットアーム ----------
export function RobotArm({ position = [0, 0, 0], rotation, active = true }: { position?: V3; rotation?: V3; active?: boolean }) {
  const m = mats();
  const j0 = useRef<THREE.Group>(null);
  const j1 = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);
  const j3 = useRef<THREE.Group>(null);
  const fingerL = useRef<THREE.Mesh>(null);
  const fingerR = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = active ? clock.elapsedTime * 0.55 : 0;
    // 取る→持ち上げる→回る→置く の繰り返し
    const ph = (Math.sin(t) + 1) / 2;
    const dip = Math.max(0, Math.sin(t * 2 - 1.2));
    if (j0.current) j0.current.rotation.y = THREE.MathUtils.lerp(-1.0, 0.55, ph);
    if (j1.current) j1.current.rotation.z = -0.55 - dip * 0.25;
    if (j2.current) j2.current.rotation.z = 1.55 + dip * 0.35;
    if (j3.current) j3.current.rotation.z = 0.6 - dip * 0.1;
    const g = 0.035 + 0.025 * Math.max(0, Math.cos(t * 2 - 1.2));
    if (fingerL.current) fingerL.current.position.z = g;
    if (fingerR.current) fingerR.current.position.z = -g;
  });
  return (
    <group position={position} rotation={rotation}>
      {/* 架台 */}
      <RoundedBox args={[0.55, 0.62, 0.55]} radius={0.03} position={[0, 0.31, 0]} material={m.steelDark} castShadow receiveShadow />
      <Bx s={[0.6, 0.03, 0.6]} p={[0, 0.635, 0]} m={m.steel} />
      <Cyl rt={0.17} rb={0.19} h={0.14} p={[0, 0.72, 0]} m={m.robotJoint} />
      <Cyl rt={0.191} h={0.025} p={[0, 0.66, 0]} m={m.accent} />
      <group ref={j0} position={[0, 0.79, 0]}>
        <Cyl rt={0.15} h={0.22} p={[0, 0.11, 0]} m={m.robotWhite} />
        <group position={[0, 0.26, 0]}>
          <Cyl rt={0.12} h={0.3} r={[Math.PI / 2, 0, 0]} m={m.robotJoint} />
          <group ref={j1}>
            <RoundedBox args={[0.13, 0.62, 0.14]} radius={0.05} position={[0, 0.31, 0.0]} material={m.robotWhite} castShadow />
            <Cyl rt={0.121} h={0.06} p={[0, 0, 0.12]} r={[Math.PI / 2, 0, 0]} m={m.accent} />
            <group position={[0, 0.62, 0]}>
              <Cyl rt={0.09} h={0.24} r={[Math.PI / 2, 0, 0]} m={m.robotJoint} />
              <group ref={j2}>
                <RoundedBox args={[0.1, 0.52, 0.11]} radius={0.04} position={[0, 0.26, 0]} material={m.robotWhite} castShadow />
                <group position={[0, 0.52, 0]}>
                  <Cyl rt={0.065} h={0.18} r={[Math.PI / 2, 0, 0]} m={m.robotJoint} />
                  <group ref={j3}>
                    <Cyl rt={0.05} h={0.14} p={[0, 0.08, 0]} m={m.robotWhite} />
                    <Bx s={[0.07, 0.04, 0.16]} p={[0, 0.17, 0]} m={m.robotJoint} />
                    <mesh ref={fingerL} position={[0, 0.24, 0.04]} material={m.steelDark} castShadow>
                      <boxGeometry args={[0.03, 0.1, 0.015]} />
                    </mesh>
                    <mesh ref={fingerR} position={[0, 0.24, -0.04]} material={m.steelDark} castShadow>
                      <boxGeometry args={[0.03, 0.1, 0.015]} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** ロボットの周りの安全柵 */
export function SafetyFence({ points, height = 1.4 }: { points: [number, number][]; height?: number }) {
  const m = mats();
  return (
    <group>
      {points.map(([x, z], i) => (
        <group key={i}>
          <Bx s={[0.05, height, 0.05]} p={[x, height / 2, z]} m={m.safetyYellow} />
          {i < points.length - 1 &&
            (() => {
              const [x2, z2] = points[i + 1];
              const len = Math.hypot(x2 - x, z2 - z);
              const ang = Math.atan2(z2 - z, x2 - x);
              return (
                <group position={[(x + x2) / 2, 0, (z + z2) / 2]} rotation={[0, -ang, 0]}>
                  <mesh position={[0, height / 2 + 0.05, 0]} material={m.fence}>
                    <planeGeometry args={[len, height - 0.2]} />
                  </mesh>
                  <Bx s={[len, 0.03, 0.03]} p={[0, height - 0.02, 0]} m={m.safetyYellow} cast={false} />
                  <Bx s={[len, 0.03, 0.03]} p={[0, 0.12, 0]} m={m.safetyYellow} cast={false} />
                </group>
              );
            })()}
        </group>
      ))}
    </group>
  );
}

// ---------- コンベア ----------
export function Conveyor({ position = [0, 0, 0], length = 5, running = true }: { position?: V3; length?: number; running?: boolean }) {
  const m = mats();
  const W = 0.62, H = 0.78;
  const boxes = useRef<THREE.Group>(null);
  const beltTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 8;
    const g = c.getContext('2d')!;
    g.fillStyle = '#2a2e33';
    g.fillRect(0, 0, 64, 8);
    g.fillStyle = '#1c1f22';
    for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 2, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(length * 3, 1);
    return tex;
  }, [length]);
  useFrame((_, dt) => {
    if (!running) return;
    beltTex.offset.x -= dt * 0.9;
    boxes.current?.children.forEach((b) => {
      b.position.x += dt * 0.3;
      if (b.position.x > length / 2 - 0.2) b.position.x = -length / 2 + 0.25;
    });
  });
  return (
    <group position={position}>
      <mesh position={[0, H, 0]} receiveShadow>
        <boxGeometry args={[length, 0.03, W - 0.06]} />
        <meshStandardMaterial map={beltTex} roughness={0.95} color="#ffffff" />
      </mesh>
      {[-W / 2, W / 2].map((z) => (
        <group key={z}>
          <Bx s={[length, 0.12, 0.04]} p={[0, H - 0.02, z]} m={m.steel} />
          <Bx s={[length, 0.025, 0.025]} p={[0, H + 0.1, z]} m={m.steelDark} />
        </group>
      ))}
      {Array.from({ length: Math.floor(length / 1.2) + 1 }, (_, i) => {
        const x = -length / 2 + 0.15 + i * ((length - 0.3) / Math.floor(length / 1.2));
        return (
          <group key={i} position={[x, 0, 0]}>
            <Bx s={[0.05, H - 0.05, 0.05]} p={[0, (H - 0.05) / 2, -W / 2 + 0.03]} m={m.steelDark} />
            <Bx s={[0.05, H - 0.05, 0.05]} p={[0, (H - 0.05) / 2, W / 2 - 0.03]} m={m.steelDark} />
            <Bx s={[0.04, 0.04, W]} p={[0, 0.25, 0]} m={m.steelDark} />
            <Cyl rt={0.03} h={0.02} p={[0, 0.01, -W / 2 + 0.03]} m={m.rubber} />
            <Cyl rt={0.03} h={0.02} p={[0, 0.01, W / 2 - 0.03]} m={m.rubber} />
          </group>
        );
      })}
      {[-length / 2, length / 2].map((x) => (
        <Cyl key={x} rt={0.05} h={W - 0.04} p={[x, H - 0.02, 0]} r={[Math.PI / 2, 0, 0]} m={m.steel} />
      ))}
      {/* モーター */}
      <Bx s={[0.25, 0.2, 0.2]} p={[length / 2 - 0.3, H - 0.25, W / 2 + 0.12]} m={m.rackBlue} />
      <group ref={boxes}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} position={[-length / 2 + 0.4 + i * (length / 4), 0, 0]}>
            <Carton position={[0, H + 0.015, 0]} size={[0.38, 0.24, 0.3]} />
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------- 人 ----------
export function Person({ walk = true, range = [-5.5, 6], z = 0, speed = 0.9, vestColor }: { walk?: boolean; range?: [number, number]; z?: number; speed?: number; vestColor?: string }) {
  const m = mats();
  const root = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const vest = useMemo(() => (vestColor ? new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.65 }) : m.vest), [vestColor, m.vest]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const span = range[1] - range[0];
    let x = range[0], dir = 1;
    if (walk) {
      const d = (t * speed) % (span * 2);
      dir = d < span ? 1 : -1;
      x = d < span ? range[0] + d : range[1] - (d - span);
    }
    if (root.current) {
      root.current.position.set(x, 0, z);
      root.current.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const s = walk ? Math.sin(t * speed * 6.2) * 0.5 : 0;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
    if (armL.current) armL.current.rotation.x = -s * 0.8;
    if (armR.current) armR.current.rotation.x = s * 0.8;
  });
  return (
    <group ref={root}>
      {[legL, legR].map((ref, i) => (
        <group key={i} ref={ref} position={[i ? -0.1 : 0.1, 0.9, 0]}>
          <mesh position={[0, -0.43, 0]} material={m.pants} castShadow>
            <capsuleGeometry args={[0.065, 0.72, 4, 10]} />
          </mesh>
          <Bx s={[0.11, 0.07, 0.24]} p={[0, -0.86, 0.05]} m={m.black} />
        </group>
      ))}
      <mesh position={[0, 1.22, 0]} material={m.shirt} castShadow>
        <capsuleGeometry args={[0.17, 0.42, 6, 14]} />
      </mesh>
      {/* 反射ベスト */}
      <mesh position={[0, 1.24, 0]} material={vest} castShadow>
        <cylinderGeometry args={[0.185, 0.19, 0.46, 18]} />
      </mesh>
      <mesh position={[0, 1.16, 0]} material={m.reflect}>
        <cylinderGeometry args={[0.192, 0.192, 0.04, 18]} />
      </mesh>
      {[armL, armR].map((ref, i) => (
        <group key={i} ref={ref} position={[i ? -0.24 : 0.24, 1.48, 0]}>
          <mesh position={[0, -0.3, 0]} material={m.shirt} castShadow>
            <capsuleGeometry args={[0.05, 0.5, 4, 10]} />
          </mesh>
          <mesh position={[0, -0.62, 0]} material={m.skin}>
            <sphereGeometry args={[0.05, 10, 8]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.66, 0]} material={m.skin} castShadow>
        <sphereGeometry args={[0.11, 18, 14]} />
      </mesh>
      <mesh position={[0, 1.72, 0]} material={m.helmet} castShadow>
        <sphereGeometry args={[0.125, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

/** 台車 */
export function HandCart({ position = [0, 0, 0], rotation }: { position?: V3; rotation?: V3 }) {
  const m = mats();
  return (
    <group position={position} rotation={rotation}>
      <Bx s={[0.9, 0.04, 0.6]} p={[0, 0.18, 0]} m={m.steelDark} />
      <Bx s={[0.03, 0.85, 0.03]} p={[-0.43, 0.6, -0.27]} m={m.steel} />
      <Bx s={[0.03, 0.85, 0.03]} p={[-0.43, 0.6, 0.27]} m={m.steel} />
      <Bx s={[0.03, 0.03, 0.57]} p={[-0.43, 1.02, 0]} m={m.steel} />
      {[-0.35, 0.35].map((x) => [-0.24, 0.24].map((z) => <Cyl key={`${x}${z}`} rt={0.07} h={0.04} p={[x, 0.08, z]} r={[Math.PI / 2, 0, 0]} m={m.rubber} />))}
      <Carton position={[0.05, 0.2, 0]} size={[0.5, 0.3, 0.4]} />
      <Carton position={[0.08, 0.5, 0.02]} size={[0.4, 0.22, 0.3]} plain />
    </group>
  );
}

/** 天井の照明（見た目だけ） */
export function HighBayLamp({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.25, 0.35, 0.18, 20, 1, true]} />
        <meshStandardMaterial color="#3a4048" side={THREE.DoubleSide} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 24]} />
        <meshStandardMaterial color="#fff" emissive="#fff4e0" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}
