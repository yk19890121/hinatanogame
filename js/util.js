'use strict';
/* =========================================================
   きょうつうの どうぐ（ユーティリティ）
   ========================================================= */
const TAU = Math.PI * 2;
const T = 64;               // 1マスの おおきさ（ろんりピクセル）
const VIEW_H = 768;         // がめんの たかさ（ろんりピクセル）
const ROWS = 12;            // たての マスの かず
const GROUND_ROW = 9;
const GROUND_Y = GROUND_ROW * T;
const BLOCK = 84;           // こたえの ブロックの おおきさ（そこは y=384 に そろえる）
const BLOCK_GAP = 160;      // ブロックの まんなか どうしの きょり
const LAYER_W = 1920;       // はいけいレイヤーの よこはば
const FONT = "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'BIZ UDPGothic', 'Meiryo', sans-serif";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// たねつき らんすう（ステージを まいかい おなじ かたちに する）
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ループする なみ（はいけいを つなぎめなく ならべるため）
function periodic(W, seed, terms) {
  const r = mulberry32(seed);
  const comps = terms.map(([k, a, sharp, soft]) => ({ k, a, sharp, soft: soft || 0, p: r() * TAU }));
  return (x) => {
    let v = 0;
    for (const c of comps) {
      const s = Math.sin((TAU * c.k * x) / W + c.p);
      // soft > 0 だと やまの てっぺんが まるくなる
      const ab = c.soft ? Math.sqrt(s * s + c.soft) - Math.sqrt(c.soft) : Math.abs(s);
      v += c.a * (c.sharp ? (1 - ab) * 2 - 1 : s);
    }
    return v;
  };
}

const Ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mix(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return '#' + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, '0')).join('');
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.55, y + s * 0.05, x - s * 0.5, y - s * 0.22);
  ctx.bezierCurveTo(x - s * 0.45, y - s * 0.5, x - s * 0.08, y - s * 0.52, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.08, y - s * 0.52, x + s * 0.45, y - s * 0.5, x + s * 0.5, y - s * 0.22);
  ctx.bezierCurveTo(x + s * 0.55, y + s * 0.05, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
  ctx.closePath();
}

// ふちどり もじ
function outlinedText(ctx, text, x, y, size, fill, stroke = '#2a1300', lw = 0.22) {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

const Store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('macho_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('macho_' + k, JSON.stringify(v));
    } catch (e) { /* ほぞん できなくても あそべる */ }
  },
};
