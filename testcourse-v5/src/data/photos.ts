// デモ用の「サンプル写真」。実写の代わりに SVG で描いた現場の絵を使う。

const wrap = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dde1"/><stop offset="1" stop-color="#b9bfc5"/></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d939a"/><stop offset="1" stop-color="#6d737a"/></linearGradient>
        <linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c99b68"/><stop offset="1" stop-color="#a87a4a"/></linearGradient>
        <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#wall)"/>
      <rect y="190" width="400" height="110" fill="url(#floor)"/>
      ${body}
      <rect width="400" height="300" fill="url(#vig)"/>
    </svg>`,
  )}`;

const box = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#card)" stroke="#7c5631" stroke-width="1.5"/>
   <rect x="${x + w / 2 - 4}" y="${y}" width="8" height="${h}" fill="#d8c09a" opacity=".8"/>`;

export const samplePhotos = [
  {
    name: '流動棚.jpg',
    url: wrap(`
      <rect x="40" y="40" width="10" height="200" fill="#1f5fa8"/><rect x="250" y="40" width="10" height="200" fill="#1f5fa8"/>
      ${[70, 125, 180].map((y) => `<polygon points="50,${y} 250,${y - 14} 250,${y - 6} 50,${y + 8}" fill="#e07a1f"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="${58 + i * 47}" y="${y - 30 - i * 3}" width="40" height="24" rx="3" fill="#3d7fc1" stroke="#245a90"/>
          <rect x="${64 + i * 47}" y="${y - 36 - i * 3}" width="12" height="10" fill="#e9e1d3"/><rect x="${80 + i * 47}" y="${y - 38 - i * 3}" width="10" height="12" fill="#c44"/>`).join('')}`).join('')}
      <polygon points="300,0 400,0 400,150 300,120" fill="#ffe8b0" opacity=".85"/>
      <polygon points="300,120 400,150 260,300 160,300" fill="#fff3c9" opacity=".25"/>
    `),
  },
  {
    name: '箱置き場.jpg',
    url: wrap(`
      <rect x="60" y="215" width="250" height="18" fill="#b98a55"/><rect x="60" y="233" width="250" height="10" fill="#8c6238"/>
      ${box(75, 150, 70, 65)}${box(150, 150, 70, 65)}${box(110, 92, 70, 58)}
      <g transform="translate(232 168) rotate(-9)">
        <polygon points="0,0 62,-6 70,40 4,47" fill="url(#card)" stroke="#7c5631" stroke-width="1.5"/>
        <polyline points="10,8 28,22 22,30 48,24" fill="none" stroke="#6d4a28" stroke-width="2"/>
        <polygon points="40,-4 62,-6 58,14" fill="#8f6538"/>
      </g>
      <rect x="226" y="148" width="88" height="68" fill="none" stroke="#ef4444" stroke-width="3" rx="4"/>
      <rect x="226" y="128" width="72" height="18" fill="#ef4444"/><text x="231" y="141" font-size="11" fill="#fff" font-family="sans-serif">crushed</text>
    `),
  },
  {
    name: '通路.jpg',
    url: wrap(`
      <polygon points="150,190 250,190 400,300 0,300" fill="#7b8188"/>
      <polygon points="160,190 166,190 40,300 20,300" fill="#facc15"/><polygon points="234,190 240,190 380,300 360,300" fill="#facc15"/>
      <g transform="translate(205 130)"><circle cx="0" cy="0" r="10" fill="#e8c4a0"/><rect x="-12" y="12" width="24" height="38" rx="6" fill="#f97316"/>
        <rect x="-12" y="22" width="24" height="5" fill="#e5e7eb"/><rect x="-10" y="50" width="8" height="34" fill="#334155"/><rect x="2" y="50" width="8" height="34" fill="#334155"/></g>
      <rect x="235" y="160" width="55" height="50" fill="#4b5563"/><rect x="240" y="140" width="45" height="22" fill="url(#card)"/>
    `),
  },
  {
    name: '作業台.jpg',
    url: wrap(`
      <rect x="40" y="150" width="320" height="16" fill="#9aa4ae"/><rect x="40" y="166" width="320" height="6" fill="#5b636b"/>
      <rect x="55" y="172" width="8" height="90" fill="#5b636b"/><rect x="337" y="172" width="8" height="90" fill="#5b636b"/>
      ${box(90, 100, 90, 50)}
      <rect x="230" y="118" width="60" height="32" rx="4" fill="#334155"/><circle cx="246" cy="134" r="10" fill="#94a3b8"/>
      <rect x="300" y="60" width="50" height="34" rx="2" fill="#1e293b"/><rect x="304" y="64" width="42" height="26" fill="#38bdf8" opacity=".6"/>
    `),
  },
];
