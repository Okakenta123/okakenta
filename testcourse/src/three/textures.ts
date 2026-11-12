import * as THREE from 'three';

// 外部の画像を使わず、Canvas で床や段ボールの質感を作る。
// （CC0 アセットに差し替える場合は TextureLoader で読み込めばよい）

const cache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, repeat = 1, color = true) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, rng(key.length * 9973 + size));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** 塗装されたコンクリート床（色ムラ・汚れ・目地） */
export function concreteTexture() {
  return make('concrete', 1024, (g, r) => {
    g.fillStyle = '#a3a7ab';
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 260; i++) {
      const x = r() * 1024, y = r() * 1024, rad = 20 + r() * 140;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      const d = r() > 0.5 ? 255 : 0;
      grd.addColorStop(0, `rgba(${d},${d},${d},${0.02 + r() * 0.05})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 26000; i++) {
      const v = Math.floor(r() * 80 + 110);
      g.fillStyle = `rgba(${v},${v},${v},${0.15 + r() * 0.2})`;
      g.fillRect(r() * 1024, r() * 1024, 1.4, 1.4);
    }
    // タイヤ痕
    g.strokeStyle = 'rgba(40,40,40,0.05)';
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 6 + r() * 10;
      g.beginPath();
      const y = r() * 1024;
      g.moveTo(0, y);
      g.bezierCurveTo(300, y + (r() - 0.5) * 200, 700, y + (r() - 0.5) * 200, 1024, y + (r() - 0.5) * 60);
      g.stroke();
    }
    // 目地
    g.strokeStyle = 'rgba(60,60,60,0.35)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 1024, 1024);
  }, 6);
}

/** 床の凹凸（roughness 用） */
export function concreteRoughness() {
  return make('concrete-r', 512, (g, r) => {
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 400; i++) {
      const x = r() * 512, y = r() * 512, rad = 10 + r() * 70;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(90,90,90,${0.1 + r() * 0.25})`);
      grd.addColorStop(1, 'rgba(90,90,90,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 6, false);
}

/** 段ボール（繊維の筋とテープ） */
export function cardboardTexture(tape = true) {
  return make(`cardboard-${tape}`, 256, (g, r) => {
    g.fillStyle = '#b98b5c';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,230,200' : '90,55,25'},${0.03 + r() * 0.05})`;
      g.fillRect(0, r() * 256, 256, 1 + r() * 2);
    }
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(70,45,20,${r() * 0.12})`;
      g.fillRect(r() * 256, r() * 256, 1, 1);
    }
    if (tape) {
      g.fillStyle = 'rgba(214,190,150,0.85)';
      g.fillRect(112, 0, 32, 256);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(114, 0, 4, 256);
    }
  });
}

/** 壁のパネル */
export function wallTexture() {
  return make('wall', 512, (g, r) => {
    g.fillStyle = '#d5d9dd';
    g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      g.fillStyle = 'rgba(0,0,0,0.07)';
      g.fillRect(x, 0, 3, 512);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(x + 3, 0, 2, 512);
    }
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
      g.fillRect(r() * 512, r() * 512, 2, 2);
    }
    const grd = g.createLinearGradient(0, 380, 0, 512);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.12)');
    g.fillStyle = grd;
    g.fillRect(0, 380, 512, 132);
  });
}

/** 合板・作業台の天板 */
export function woodTexture() {
  return make('wood', 256, (g, r) => {
    g.fillStyle = '#c9a678';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(110,70,35,${0.05 + r() * 0.12})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      const y = r() * 256;
      g.moveTo(0, y);
      g.bezierCurveTo(80, y + (r() - 0.5) * 12, 170, y + (r() - 0.5) * 12, 256, y);
      g.stroke();
    }
  });
}
