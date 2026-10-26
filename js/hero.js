'use strict';
/* =========================================================
   マッチョ ヒーロー（うごき と え）
   ========================================================= */
const HERO_S = 0.9;                // （えが よめない ときの かわりの え）の おおきさ
const HERO_SPRITE_S = 0.76;        // スプライトの おおきさ（ぜんコマ おなじ）
const TH = 24, SH = 24, FOOT = 7;  // ふともも・すね・くつ
const UA = 22, FA = 19;            // にのうで・まえうで

const PAL = {
  skin: { light: '#ffdcb8', base: '#f0a46e', dark: '#b55f2e', line: '#4a220e' },
  skinFar: { light: '#e8b08a', base: '#cf8550', dark: '#8f4620', line: '#4a220e' },
  gold: { light: '#fff8c8', base: '#ffcf48', dark: '#c27a10', line: '#663800' },
  goldFar: { light: '#f3dc96', base: '#e2aa34', dark: '#a0600a', line: '#663800' },
  trunks: { light: '#ff7f7f', base: '#e3252e', dark: '#8a0e16', line: '#3a0408' },
  trunksFar: { light: '#e65c5c', base: '#bd1a22', dark: '#6a0a10', line: '#3a0408' },
};

const bump = (t, p) => Math.sin(Math.PI * (t < p ? (0.5 * t) / p : 0.5 + (0.5 * (t - p)) / (1 - p)));

// ふくらみの ある うで・あし
function limb(ctx, x1, y1, x2, y2, r1, r2, bA, bB, peak, pal, lw = 2.2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const N = 10;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const t = i / N, r = lerp(r1, r2, t) + bA * bump(t, peak);
    ctx.lineTo(x1 + dx * t + nx * r, y1 + dy * t + ny * r);
  }
  const an = Math.atan2(ny, nx);
  ctx.arc(x2, y2, r2, an, an - Math.PI, true);
  for (let i = N; i >= 0; i--) {
    const t = i / N, r = lerp(r1, r2, t) + bB * bump(t, peak);
    ctx.lineTo(x1 + dx * t - nx * r, y1 + dy * t - ny * r);
  }
  ctx.arc(x1, y1, r1, an - Math.PI, an - TAU, true);
  ctx.closePath();
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, R = (r1 + r2) / 2 + Math.max(bA, bB);
  const lit = nx * -0.55 + ny * -0.83 > 0 ? 1 : -1;
  const g = ctx.createLinearGradient(mx + nx * R * lit, my + ny * R * lit, mx - nx * R * lit, my - ny * R * lit);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.42, pal.base);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function ball(ctx, x, y, r, pal, lw = 2.2) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.5, pal.base);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/* ---------------- ポーズ ---------------- */
function makePose() {
  return { lean: 0, hipY: -(TH + SH + FOOT), legF: [0.14, 0.06], legN: [-0.12, -0.16], armF: [0.42, 0.85], armN: [-0.38, 0.15], head: 0, chest: 1, flex: 0, wind: 0 };
}

function targetPose(h, t) {
  const P = { lean: 0, legF: [0.14, 0.06], legN: [-0.12, -0.16], armF: [0.42, 0.85], armN: [-0.38, 0.15], head: 0, chest: 1, flex: 0, face: 'smile' };
  switch (h.anim) {
    case 'idle': {
      const b = Math.sin(t * 2.4);
      P.armF = [0.42 + b * 0.03, 0.88 + b * 0.05];
      P.armN = [-0.38 - b * 0.03, 0.12];
      P.chest = 1 + b * 0.018;
      P.head = b * 0.02;
      break;
    }
    case 'run': {
      const q = h.runPhase;
      const leg = (ph) => {
        const th = 0.8 * Math.sin(ph);
        return [th, th - (0.25 + 1.25 * Math.max(0, Math.cos(ph)))];
      };
      P.legF = leg(q);
      P.legN = leg(q + Math.PI);
      const s = Math.sin(q);
      P.armF = [-0.85 * s, -0.85 * s + 1.45];
      P.armN = [0.85 * s, 0.85 * s + 1.45];
      P.lean = 0.14;
      P.head = -0.06;
      break;
    }
    case 'jump':
      P.legF = [0.95, 0.15];
      P.legN = [-0.3, -1.2];
      P.armF = [2.5, 2.95];
      P.armN = [-0.8, -0.2];
      P.lean = 0.05;
      break;
    case 'fall':
      P.legF = [0.45, -0.15];
      P.legN = [-0.2, -0.75];
      P.armF = [1.7, 2.3];
      P.armN = [-1.5, -1.0];
      break;
    case 'flex':
      P.legF = [0.26, 0.12];
      P.legN = [-0.26, -0.12];
      P.armF = [1.78, 3.3];
      P.armN = [-1.78, -3.3];
      P.chest = 1.08 + Math.sin(t * 12) * 0.012;
      P.flex = 1;
      P.face = 'grin';
      P.head = -0.06;
      break;
    case 'punch':
      P.legF = [0.75, 0.3];
      P.legN = [-0.55, -0.5];
      P.armF = [1.57, 1.57];
      P.armN = [-0.4, 1.4];
      P.lean = 0.25;
      P.face = 'shout';
      break;
    case 'hurt':
      P.legF = [0.5, 0.2];
      P.legN = [-0.3, -0.6];
      P.armF = [2.2 + Math.sin(t * 22) * 0.3, 2.6];
      P.armN = [-2.0, -1.6];
      P.lean = -0.3;
      P.face = 'ouch';
      break;
    case 'victory': {
      // ダブルバイセップス と ガッツポーズ を こうごに
      const k = Math.floor(t / 0.9) % 2;
      if (k === 0) {
        P.armF = [1.62, 3.3];
        P.armN = [-1.62, -3.3];
        P.flex = 1;
      } else {
        P.armF = [2.9, 3.05];
        P.armN = [-0.9, 0.9];
        P.flex = 0.5;
      }
      P.legF = [0.26, 0.12];
      P.legN = [-0.26, -0.12];
      P.chest = 1.08;
      P.face = 'grin';
      break;
    }
  }
  return P;
}

/* ---------------- からだを えがく ---------------- */
function drawShoe(ctx, x, y, a2) {
  const rot = clamp(-a2 * 0.55, -0.7, 0.9);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.quadraticCurveTo(-10, 5, -6, 6.5);
  ctx.lineTo(15, 6.5);
  ctx.quadraticCurveTo(20, 6, 18, 0);
  ctx.quadraticCurveTo(15, -5.5, 6, -6.5);
  ctx.lineTo(-5, -7.5);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -7, 0, 7);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c9d0e0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#2a2a40';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e3252e';
  ctx.beginPath();
  ctx.moveTo(-4, -2);
  ctx.quadraticCurveTo(5, -4, 13, 2);
  ctx.lineTo(10, 3.5);
  ctx.quadraticCurveTo(4, -0.5, -4, 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2a40';
  rrect(ctx, -8, 4.5, 26, 4, 2);
  ctx.fill();
  ctx.restore();
}

function drawLeg(ctx, hx, hy, L, pal) {
  const [a1, a2] = L;
  const kx = hx + Math.sin(a1) * TH, ky = hy + Math.cos(a1) * TH;
  const fx = kx + Math.sin(a2) * SH, fy = ky + Math.cos(a2) * SH;
  limb(ctx, kx, ky, fx, fy, 8.2, 5.6, 3.6, 0.8, 0.3, pal);
  limb(ctx, hx, hy, kx, ky, 12.5, 8.6, 2.2, 4.2, 0.45, pal);
  drawShoe(ctx, fx, fy, a2);
}

function drawArm(ctx, sx, sy, a1, a2, pal, flex) {
  const ex = sx + Math.sin(a1) * UA, ey = sy + Math.cos(a1) * UA;
  const wx = ex + Math.sin(a2) * FA, wy = ey + Math.cos(a2) * FA;
  const side = Math.sin(a1 - a2);
  const bic = 3.6 + Math.abs(side) * 5.6 + flex * 5.2;
  const tri = 3.2;
  // まえうで
  limb(ctx, ex, ey, wx, wy, 9, 6.8, 3.2, 2.2, 0.3, pal);
  // にのうで（ちからこぶ）
  limb(ctx, sx, sy, ex, ey, 11.5, 8.6, side > 0 ? bic : tri, side > 0 ? tri : bic, 0.5, pal);
  // かた
  ball(ctx, sx, sy, 13.6, pal);
  // リストバンド と こぶし
  const ux = Math.sin(a2), uy = Math.cos(a2);
  limb(ctx, wx - ux * 2, wy - uy * 2, wx + ux * 2, wy + uy * 2, 7.6, 7.6, 0, 0, 0.5, { light: '#fff3a0', base: '#ffd23f', dark: '#c48a00', line: '#5a3a00' }, 1.8);
  ball(ctx, wx + ux * 7, wy + uy * 7, 9, pal);
  ctx.strokeStyle = rgba(pal.line, 0.6);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(wx + ux * 7, wy + uy * 7, 5, Math.atan2(uy, ux) - 1, Math.atan2(uy, ux) + 1);
  ctx.stroke();
  if (flex > 0.5) return { x: (sx + ex) / 2, y: (sy + ey) / 2 };
  return null;
}

function drawTorso(ctx, pal, P) {
  const c = P.chest;
  ctx.save();
  ctx.scale(1 + (c - 1) * 1.3, 1 + (c - 1) * 0.4);
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-19, -12, -27, -24);
  ctx.quadraticCurveTo(-34, -34, -31, -43);
  ctx.quadraticCurveTo(-25, -52, -9, -52);
  ctx.lineTo(11, -52);
  ctx.quadraticCurveTo(28, -52, 34, -43);
  ctx.quadraticCurveTo(36, -34, 29, -24);
  ctx.quadraticCurveTo(21, -12, 16, 0);
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -38, 4, 2, -28, 40);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.5, pal.base);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // むね
  const pec = (x0, x1, x2) => {
    ctx.beginPath();
    ctx.moveTo(x0, -45);
    ctx.quadraticCurveTo((x0 + x1) / 2, -48, x1, -41);
    ctx.quadraticCurveTo(x1 + (x1 > x0 ? 2 : -2), -30, x2, -27);
    ctx.quadraticCurveTo((x0 + x2) / 2, -24, x0, -29);
    ctx.closePath();
    const pg = ctx.createLinearGradient(0, -47, 0, -26);
    pg.addColorStop(0, pal.light);
    pg.addColorStop(1, pal.base);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.strokeStyle = rgba(pal.line, 0.55);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = rgba(pal.dark, 0.9);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x1 + (x1 > x0 ? 1 : -1), -33);
    ctx.quadraticCurveTo(x2, -25.5, x0, -28.5);
    ctx.stroke();
  };
  pec(1, -24, -15);
  pec(3, 28, 21);
  // ふっきん
  for (let i = 0; i < 3; i++) {
    const y = -21 + i * 6.8;
    for (const s of [-1, 1]) {
      const x = 2.5 + s * 5.4;
      ctx.fillStyle = rgba(pal.light, 0.55);
      ctx.beginPath();
      ctx.ellipse(x, y, 4.4, 2.9, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(pal.dark, 0.6);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(x, y + 0.6, 4.6, 3.1, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = rgba(pal.dark, 0.55);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(2.5, -26);
  ctx.lineTo(2.8, -3);
  ctx.moveTo(-12, -20);
  ctx.quadraticCurveTo(-10, -10, -9, -3);
  ctx.moveTo(17, -20);
  ctx.quadraticCurveTo(15, -10, 14, -3);
  ctx.stroke();
  ctx.restore();
}

function drawBelt(ctx, power) {
  ctx.fillStyle = PAL.trunks.base;
  rrect(ctx, -17, -6, 37, 13, 6);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -12, 0, -3);
  g.addColorStop(0, '#fff2a0');
  g.addColorStop(0.5, '#f2b928');
  g.addColorStop(1, '#a86a08');
  ctx.fillStyle = g;
  rrect(ctx, -17.5, -12, 38, 8.5, 4);
  ctx.fill();
  ctx.strokeStyle = '#5a3400';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const bg = ctx.createRadialGradient(5, -11, 1, 6, -8, 11);
  bg.addColorStop(0, '#ffffff');
  bg.addColorStop(0.4, '#ffd84a');
  bg.addColorStop(1, '#b8760a');
  ctx.fillStyle = bg;
  rrect(ctx, -2, -16, 15, 15, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = power ? '#ffffff' : '#e3252e';
  starPath(ctx, 5.5, -8.5, 4.6, 2, 5);
  ctx.fill();
}

function drawHead(ctx, pal, P, t, h) {
  // くび と しょうぼきん
  ctx.beginPath();
  ctx.moveTo(-16, -44);
  ctx.quadraticCurveTo(-7, -50, -5, -59);
  ctx.lineTo(10, -59);
  ctx.quadraticCurveTo(13, -50, 22, -44);
  ctx.closePath();
  const ng = ctx.createLinearGradient(0, -59, 0, -44);
  ng.addColorStop(0, pal.dark);
  ng.addColorStop(1, pal.base);
  ctx.fillStyle = ng;
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.save();
  ctx.translate(5, -72);
  ctx.rotate(P.head);
  const w = P.wind;
  // はちまきの しっぽ
  const ph = t * (7 + 10 * w);
  for (let k = 0; k < 2; k++) {
    const len = 17 + 9 * w + k * 4;
    const ex = -13 - len * (0.35 + 0.65 * w);
    const ey = -9 + len * (1 - w) * 0.75 + k * 4 + Math.sin(ph * 1.3 + k * 2) * 4 * (0.25 + w);
    const cx = -13 - len * 0.45, cy = -10 + Math.sin(ph + k) * 4 * (0.3 + w);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#5a0a0a';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(-12, -9);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = k ? '#d01e26' : '#ff3b3b';
    ctx.lineWidth = 4.6;
    ctx.stroke();
  }
  // あたま
  ctx.beginPath();
  ctx.moveTo(-12, 3);
  ctx.bezierCurveTo(-15, -12, -7, -18, 2, -18);
  ctx.bezierCurveTo(11, -18, 16, -11, 16, -3);
  ctx.lineTo(17, 3);
  ctx.bezierCurveTo(17, 10, 14, 15, 7, 16);
  ctx.bezierCurveTo(0, 17, -7, 14, -10, 9);
  ctx.closePath();
  const hg = ctx.createRadialGradient(6, -6, 2, 3, -1, 21);
  hg.addColorStop(0, pal.light);
  hg.addColorStop(0.55, pal.base);
  hg.addColorStop(1, pal.dark);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // みみ
  ctx.fillStyle = pal.base;
  ctx.beginPath();
  ctx.ellipse(-4.5, 1.5, 3.4, 4.6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // かみ
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-16.5, -2);
  ctx.lineTo(-13, -6);
  ctx.lineTo(-20, -12);
  ctx.lineTo(-10.5, -14);
  ctx.lineTo(-14, -23);
  ctx.lineTo(-3.5, -18);
  ctx.lineTo(0, -28);
  ctx.lineTo(6, -18.5);
  ctx.lineTo(14, -25);
  ctx.lineTo(13.5, -14);
  ctx.lineTo(19, -12.5);
  ctx.quadraticCurveTo(10, -10.5, 4, -9.5);
  ctx.quadraticCurveTo(-4, -8.5, -6.5, 0);
  ctx.lineTo(-7.5, 5);
  ctx.closePath();
  const hair = ctx.createLinearGradient(0, -28, 0, 6);
  hair.addColorStop(0, '#4c4670');
  hair.addColorStop(1, '#16121f');
  ctx.fillStyle = hair;
  ctx.fill();
  ctx.strokeStyle = '#0c0a12';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(170,160,230,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -15);
  ctx.quadraticCurveTo(0, -20, 6, -16);
  ctx.stroke();
  // はちまき
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(15.5, -13.5);
  ctx.lineTo(16.5, -8);
  ctx.lineTo(-9, -6);
  ctx.closePath();
  ctx.fillStyle = '#f0262e';
  ctx.fill();
  ctx.strokeStyle = '#5a0a0a';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-8, -11.5, 22, 1.6);
  ctx.fillStyle = '#d01e26';
  ctx.beginPath();
  ctx.arc(-11, -8.5, 3.4, 0, TAU);
  ctx.fill();
  // かお
  const face = P.face;
  const ink = '#2a160c';
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  if (face === 'shout') {
    ctx.moveTo(0, -6.5); ctx.lineTo(8, -4);
    ctx.moveTo(11, -4); ctx.lineTo(16.5, -6);
  } else if (face === 'ouch') {
    ctx.moveTo(0.5, -4); ctx.lineTo(8, -6.5);
    ctx.moveTo(11, -6.5); ctx.lineTo(16, -4.5);
  } else {
    ctx.moveTo(0, -5); ctx.lineTo(8.5, -6.8);
    ctx.moveTo(10.8, -6.6); ctx.lineTo(16.5, -5.2);
  }
  ctx.stroke();
  const blink = h.blink > 0;
  if (face === 'grin' || blink) {
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(1.8, -0.5); ctx.quadraticCurveTo(4.6, -4.4, 7.4, -0.5);
    ctx.moveTo(11, -0.5); ctx.quadraticCurveTo(13.2, -4, 15.4, -0.5);
    ctx.stroke();
  } else if (face === 'ouch') {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2.5, -3.5); ctx.lineTo(6.5, -1); ctx.lineTo(2.5, 1.5);
    ctx.moveTo(15, -3.5); ctx.lineTo(11.5, -1); ctx.lineTo(15, 1.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(4.6, -1.3, 2.9, 3.5, 0, 0, TAU);
    ctx.ellipse(13.2, -1.3, 2.2, 3.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(5.5, -1, 2, 0, TAU);
    ctx.arc(13.8, -1, 1.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6.2, -2, 0.75, 0, TAU);
    ctx.arc(14.3, -2, 0.6, 0, TAU);
    ctx.fill();
    if (face === 'shout') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(1.5, -3.6); ctx.lineTo(7.6, -2.6);
      ctx.moveTo(11, -2.8); ctx.lineTo(15.4, -3.6);
      ctx.stroke();
    }
  }
  // はな
  ctx.strokeStyle = rgba(pal.line, 0.8);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(16, -0.5);
  ctx.lineTo(18, 3.8);
  ctx.lineTo(15, 4.8);
  ctx.stroke();
  // くち
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = ink;
  if (face === 'grin') {
    ctx.beginPath();
    ctx.moveTo(5.5, 6.5);
    ctx.quadraticCurveTo(11.5, 16.5, 17, 6);
    ctx.quadraticCurveTo(11, 8.5, 5.5, 6.5);
    ctx.fillStyle = '#7a1a1a';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6.5, 7);
    ctx.quadraticCurveTo(11, 8.6, 16, 6.6);
    ctx.lineTo(15, 9);
    ctx.quadraticCurveTo(11, 10.5, 7.5, 9);
    ctx.closePath();
    ctx.fill();
  } else if (face === 'shout') {
    ctx.beginPath();
    ctx.ellipse(12, 9, 4.2, 3.8, 0, 0, TAU);
    ctx.fillStyle = '#7a1a1a';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 5.6, 6, 2);
  } else if (face === 'ouch') {
    ctx.beginPath();
    ctx.moveTo(7, 9);
    ctx.quadraticCurveTo(9, 7, 11, 9);
    ctx.quadraticCurveTo(13, 11, 15, 9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(7, 7.5);
    ctx.quadraticCurveTo(11.5, 13.5, 16, 7);
    ctx.quadraticCurveTo(11.5, 9.2, 7, 7.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeroBody(ctx, P, t, h, power) {
  const sk = power ? PAL.gold : PAL.skin;
  const skF = power ? PAL.goldFar : PAL.skinFar;
  const hipY = P.hipY;
  const cl = Math.cos(P.lean), sl = Math.sin(P.lean);
  const tw = (x, y) => [x * cl - y * sl, hipY + x * sl + y * cl];
  const [sfx, sfy] = tw(22, -42);
  const [snx, sny] = tw(-21, -42);
  const bicepF = drawArm(ctx, sfx, sfy, P.armF[0], P.armF[1], skF, P.flex);
  drawLeg(ctx, 5, hipY - 2, P.legF, skF);
  drawLeg(ctx, -5, hipY - 2, P.legN, sk);
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(P.lean);
  drawTorso(ctx, sk, P);
  ctx.restore();
  // パンツ
  [[5, P.legF, PAL.trunksFar], [-5, P.legN, PAL.trunks]].forEach(([hx, L, pal]) => {
    const a1 = L[0];
    limb(ctx, hx, hipY - 2, hx + Math.sin(a1) * TH * 0.4, hipY - 2 + Math.cos(a1) * TH * 0.4, 13.6, 12.8, 0, 0, 0.5, pal);
  });
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(P.lean);
  drawBelt(ctx, power);
  drawHead(ctx, sk, P, t, h);
  ctx.restore();
  const bicepN = drawArm(ctx, snx, sny, P.armN[0], P.armN[1], sk, P.flex);
  return [bicepF, bicepN];
}

/* ---------------- ヒーロー ---------------- */
class Hero {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 54;
    this.h = 134; // あたりはんていは えとは べつ（うでや かみで かわらない）
    this.facing = 1;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = false;
    this.hearts = 3;
    this.maxHearts = 3;
    this.invuln = 0;
    this.power = 0;
    this.lock = 0;
    this.forced = null;
    this.anim = 'idle';
    this.runPhase = 0;
    this.pose = makePose();
    this.sx = 1;
    this.sy = 1;
    this.blink = 0;
    this.blinkT = 2;
    this.airT = 0;
    this.safe = { x, y };
    this.sAnim = 'idle'; // スプライトの アニメ
    this.sT = 0;
    this.takeoffT = 0;
    this.landT = 0;
    this.canAnswer = true; // 1かいの ジャンプで こたえられるのは 1かい だけ
    this.auto = null; // タイトルがめんの じどう そうさ
  }

  get left() { return this.x - this.w / 2; }
  get right() { return this.x + this.w / 2; }
  get top() { return this.y - this.h; }

  jump(v = -1080) {
    this.vy = v;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.jumping = true;
    this.takeoffT = 0.07;
    this.sx = 0.84;
    this.sy = 1.2;
  }

  update(dt, game) {
    const inp = this.auto || Input.state;
    const control = this.lock <= 0 && !this.forced;
    let move = 0;
    if (control) {
      if (inp.left) move -= 1;
      if (inp.right) move += 1;
    }
    const maxV = this.power > 0 ? 450 : 400;
    if (move !== 0) {
      const turning = Math.sign(this.vx) !== move && Math.abs(this.vx) > 60;
      const acc = (this.onGround ? 2600 : 1900) * (turning ? 1.8 : 1);
      const lim = Math.max(maxV, Math.abs(this.vx) - 2400 * dt); // ふっとび中は すこしずつ もどす
      this.vx = clamp(this.vx + move * acc * dt, -lim, lim);
      this.facing = move;
      if (turning && this.onGround && Math.random() < 0.4) game.fx.dust(this.x, this.y, 1, -move);
    } else {
      const fr = (this.onGround ? 3000 : 700) * dt;
      this.vx = Math.abs(this.vx) <= fr ? 0 : this.vx - Math.sign(this.vx) * fr;
    }
    // ジャンプ
    if (inp.jumpPressed && control) this.jumpBuf = 0.13;
    this.coyote = this.onGround ? 0.1 : this.coyote - dt;
    if (control && this.jumpBuf > 0 && this.coyote > 0) {
      this.jump();
      Sound.play('jump');
      game.fx.dust(this.x, this.y, 6, 0);
    }
    this.jumpBuf -= dt;
    if (this.jumping && !inp.jump && this.vy < -300) {
      this.vy *= 0.5;
      this.jumping = false;
    }
    if (this.vy >= 0) this.jumping = false;
    this.vy = Math.min(this.vy + (this.vy > 0 ? 2900 : 2500) * dt, 1300);

    const wasGround = this.onGround;
    const prevBottom = this.y, prevTop = this.y - this.h;
    const solids = game.solids;
    Physics.moveX(this, this.vx * dt, game.level, solids);
    const hit = Physics.moveY(this, this.vy * dt, game.level, solids, prevBottom, prevTop);
    if (hit.head) game.onHeadHit(this, hit.head);
    if (this.onGround && !wasGround) {
      if (this.airT > 0.12) {
        if (this.airT > 0.25) this.landT = 0.14;
        this.sx = 1.22;
        this.sy = 0.8;
        game.fx.dust(this.x, this.y, 7, 0);
        Sound.play('land');
      }
    }
    this.airT = this.onGround ? 0 : this.airT + dt;
    if (this.onGround) this.canAnswer = true;
    if (this.onGround && !hit.onEntity && Physics.safeGround(game.level, this)) this.safe = { x: this.x, y: this.y };

    // ふみつけ スプリング など
    this.sx = damp(this.sx, 1, 12, dt);
    this.sy = damp(this.sy, 1, 12, dt);
    if (!game.cutin) { // カットイン中は パワー・むてきの のこりじかんを へらさない
      this.invuln = Math.max(0, this.invuln - dt);
      this.power = Math.max(0, this.power - dt);
    }
    this.lock = Math.max(0, this.lock - dt);
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.12;
      this.blinkT = 2.5 + Math.random() * 2.5;
    }
    this.blink = Math.max(0, this.blink - dt);

    // アニメーション
    let anim;
    if (this.forced) anim = this.forced;
    else if (!this.onGround) anim = this.vy < 0 ? 'jump' : 'fall';
    else if (Math.abs(this.vx) > 30) anim = 'run';
    else anim = 'idle';
    if (anim === 'run') {
      const before = Math.floor(this.runPhase / Math.PI);
      this.runPhase += dt * (Math.abs(this.vx) * 0.045 + 1.5);
      if (Math.floor(this.runPhase / Math.PI) !== before && Math.random() < 0.6) game.fx.dust(this.x - this.facing * 10, this.y, 1, -this.facing);
    }
    this.anim = anim;
    this.takeoffT = Math.max(0, this.takeoffT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.updateSprite(dt, move);
    if (!Sprites.ready) this.updatePose(dt, game.time);
  }

  // じょうたい ごとに アニメを えらぶ（ジャンプの たかさや いどうは ゲームの ざひょうで うごかす）
  updateSprite(dt, move = 0) {
    let s;
    const f = this.forced;
    if (f === 'flex' && !this.onGround) s = this.vy < 0 ? 'rise' : 'fall';
    else if (f) s = f;
    else if (!this.onGround) s = this.takeoffT > 0 ? 'takeoff' : this.vy < -380 ? 'rise' : this.vy < 260 ? 'apex' : this.vy < 800 ? 'fall' : 'fallFast';
    else if (this.landT > 0 && move === 0) s = 'land';
    else if (Math.abs(this.vx) > 30) s = 'run';
    else s = 'idle';
    if (s !== this.sAnim) {
      this.sAnim = s;
      this.sT = 0;
    }
    this.sT += s === 'run' ? dt * clamp(Math.abs(this.vx) / 400, 0.45, 1.1) : dt;
  }

  updatePose(dt, t) {
    const P = this.pose;
    const tp = targetPose(this, t);
    const rate = this.anim === 'run' ? 30 : this.anim === 'flex' || this.anim === 'punch' ? 16 : 14;
    P.lean = damp(P.lean, tp.lean, rate, dt);
    for (const k of ['legF', 'legN', 'armF', 'armN']) {
      P[k][0] = damp(P[k][0], tp[k][0], rate, dt);
      P[k][1] = damp(P[k][1], tp[k][1], rate, dt);
    }
    P.head = damp(P.head, tp.head, 10, dt);
    P.chest = damp(P.chest, tp.chest, 10, dt);
    P.flex = damp(P.flex, tp.flex, 10, dt);
    P.face = tp.face;
    P.wind = damp(P.wind, clamp(Math.abs(this.vx) / 400 + (this.onGround ? 0 : 0.4), 0, 1), 5, dt);
    const dyF = Math.cos(P.legF[0]) * TH + Math.cos(P.legF[1]) * SH;
    const dyN = Math.cos(P.legN[0]) * TH + Math.cos(P.legN[1]) * SH;
    const grounded = this.onGround || this.anim === 'flex' || this.anim === 'victory';
    const target = grounded ? -(Math.max(dyF, dyN) + FOOT) + 2 : -(TH + SH + FOOT) * 0.97;
    P.hipY = damp(P.hipY, target, 30, dt);
  }

  draw(ctx, t) {
    if (Sprites.ready) {
      this.drawSprite(ctx, t);
      return;
    }
    const power = this.power > 0;
    if (this.invuln > 0 && !this.forced && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (power) {
      ctx.globalCompositeOperation = 'lighter';
      const a = 0.55 + Math.sin(t * 14) * 0.15;
      ctx.globalAlpha = a * (this.power < 1.5 ? (Math.floor(t * 10) % 2 ? 1 : 0.3) : 1);
      ctx.drawImage(Assets.glow('#ffc23a'), -95, -175, 190, 210);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.scale(this.facing * this.sx * HERO_S, this.sy * HERO_S);
    const biceps = drawHeroBody(ctx, this.pose, t, this, power);
    ctx.restore();
    ctx.globalAlpha = 1;
    // ちからこぶの キラッ
    if (this.pose.flex > 0.8) {
      biceps.forEach((b, i) => {
        if (!b) return;
        const x = this.x + b.x * this.facing * HERO_S, y = this.y + b.y * HERO_S - 6;
        const s = 6 + Math.sin(t * 16 + i * 2) * 3;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(Assets.glow('#fff6b0'), x - 16, y - 16, 32, 32);
        ctx.fillStyle = '#ffffff';
        starPath(ctx, x, y, s, s * 0.25, 4, t * 2);
        ctx.fill();
        ctx.restore();
      });
    }
  }

  drawSprite(ctx, t) {
    const power = this.power > 0;
    const anim = HERO_ANIM[this.sAnim] || HERO_ANIM.idle;
    const frame = Sprites.frameAt(anim, this.sT);
    if (power) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.55 + Math.sin(t * 14) * 0.15) * (this.power < 1.5 ? (Math.floor(t * 10) % 2 ? 1 : 0.3) : 1);
      ctx.drawImage(Assets.glow('#ffc23a'), this.x - 120, this.y - 215, 240, 255);
      ctx.restore();
    }
    const blink = this.invuln > 0 && !this.forced && Math.floor(t * 18) % 2 === 0;
    Sprites.draw(ctx, 'hero', frame, this.x, this.y, HERO_SPRITE_S, this.facing < 0, power ? 'gold' : null, blink ? 0.45 : 1);
    // ダブルバイセップスの ときは ちからこぶが キラッ
    if (frame === 27) {
      for (const [dx, i] of [[-61, 0], [61, 1]]) {
        const x = this.x + dx, y = this.y - 103;
        const s = 7 + Math.sin(t * 16 + i * 2) * 3;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(Assets.glow('#fff6b0'), x - 18, y - 18, 36, 36);
        ctx.fillStyle = '#ffffff';
        starPath(ctx, x, y, s, s * 0.25, 4, t * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
