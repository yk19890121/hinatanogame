'use strict';
/* =========================================================
   えの じゅんび（さきに かいておいて はやく えがく）
   ========================================================= */
const Assets = (() => {
  const cache = {};
  const glowCache = {};
  const OVER = 16; // じめんの ふちが うえに はみだす ぶん

  function canvasFor(w, h, s, paint) {
    const c = makeCanvas(w * s, h * s);
    const x = c.getContext('2d');
    x.scale(s, s);
    paint(x);
    return c;
  }

  // 4ほうこうに ループさせて えがく（もようを つなぎめなく）
  function wrap2(S, x, y, r, fn) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const xx = x + dx * S, yy = y + dy * S;
        if (xx + r < 0 || xx - r > S || yy + r < 0 || yy - r > S) continue;
        fn(xx, yy);
      }
    }
  }

  /* ---------- つち ---------- */
  function paintSoil(ctx, g, S) {
    ctx.fillStyle = g.soil;
    ctx.fillRect(0, 0, S, S);
    const r = mulberry32(77);
    if (g.style === 'metal') {
      for (let py = 0; py < S; py += T) {
        for (let px = 0; px < S; px += T) {
          const gr = ctx.createLinearGradient(px, py, px + T, py + T);
          gr.addColorStop(0, g.stone);
          gr.addColorStop(1, g.soil2);
          ctx.fillStyle = gr;
          ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(px + 2, py + 2, T - 4, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(px + 2, py + T - 4, T - 4, 2);
          [[8, 8], [T - 8, 8], [8, T - 8], [T - 8, T - 8]].forEach(([bx, by]) => {
            ctx.fillStyle = g.stoneDark;
            ctx.beginPath();
            ctx.arc(px + bx, py + by, 3, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.arc(px + bx - 0.8, py + by - 0.8, 1.2, 0, TAU);
            ctx.fill();
          });
          if (r() < 0.3) {
            for (let k = 0; k < 4; k++) {
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              ctx.fillRect(px + 16, py + 20 + k * 7, T - 32, 3);
              ctx.fillStyle = r() < 0.5 ? 'rgba(63,246,255,0.25)' : 'rgba(255,79,216,0.2)';
              ctx.fillRect(px + 16, py + 23 + k * 7, T - 32, 1);
            }
          }
        }
      }
      return;
    }
    for (let i = 0; i < 46; i++) {
      const x = r() * S, y = r() * S, rad = 12 + r() * 36;
      const col = r() < 0.6 ? g.soil2 : g.speck;
      wrap2(S, x, y, rad, (xx, yy) => {
        const gr = ctx.createRadialGradient(xx, yy, 0, xx, yy, rad);
        gr.addColorStop(0, rgba(col, 0.45));
        gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr;
        ctx.fillRect(xx - rad, yy - rad, rad * 2, rad * 2);
      });
    }
    if (g.style === 'sand') {
      for (let y = 10; y < S; y += 32) {
        ctx.fillStyle = rgba(g.soil2, 0.3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= S; x += 8) ctx.lineTo(x, y + Math.sin((TAU * 2 * x) / S) * 3);
        for (let x = S; x >= 0; x -= 8) ctx.lineTo(x, y + 9 + Math.sin((TAU * 2 * x) / S + 1) * 2);
        ctx.closePath();
        ctx.fill();
      }
    }
    for (let i = 0; i < 260; i++) {
      const x = r() * S, y = r() * S, rad = 0.8 + r() * 1.8;
      ctx.fillStyle = rgba(r() < 0.5 ? g.speck : g.soil2, 0.4 + r() * 0.5);
      wrap2(S, x, y, rad, (xx, yy) => {
        ctx.beginPath();
        ctx.arc(xx, yy, rad, 0, TAU);
        ctx.fill();
      });
    }
    for (let i = 0; i < 10; i++) {
      const x = r() * S, y = r() * S, rx = 7 + r() * 11, ry = 5 + r() * 6, rot = (r() - 0.5) * 0.8;
      wrap2(S, x, y, rx + 2, (xx, yy) => {
        ctx.fillStyle = rgba(g.edge, 0.35);
        ctx.beginPath();
        ctx.ellipse(xx + 1, yy + 2, rx, ry, rot, 0, TAU);
        ctx.fill();
        const gr = ctx.createLinearGradient(xx, yy - ry, xx, yy + ry);
        gr.addColorStop(0, g.stone);
        gr.addColorStop(1, g.stoneDark);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(xx, yy, rx, ry, rot, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(xx - rx * 0.3, yy - ry * 0.4, rx * 0.35, ry * 0.25, rot, 0, TAU);
        ctx.fill();
      });
    }
    if (g.style === 'snow') {
      ctx.strokeStyle = 'rgba(200,235,255,0.35)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        let x = r() * S, y = r() * S;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          x += (r() - 0.5) * 30;
          y += r() * 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  /* ---------- じめんの ふち ---------- */
  function paintCap(ctx, g, v) {
    const r = mulberry32(31 + v * 17);
    const k = [2, 3, 2][v], amp = [4, 3, 5][v];
    const bottom = (x, extra = 0) => OVER + 14 + (g.capThick || 0) + extra + amp * Math.sin((TAU * k * x) / T);
    if (g.style === 'metal') {
      const gr = ctx.createLinearGradient(0, OVER - 3, 0, OVER + 14);
      gr.addColorStop(0, g.capTop);
      gr.addColorStop(1, g.capBot);
      ctx.fillStyle = gr;
      ctx.fillRect(0, OVER - 2, T, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, OVER + 14, T, 3);
      for (let x = 8; x < T; x += 16) {
        ctx.fillStyle = g.stoneDark;
        ctx.beginPath();
        ctx.arc(x, OVER + 7, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = g.neon;
      ctx.shadowBlur = 10;
      ctx.fillStyle = g.neon;
      ctx.fillRect(0, OVER - 4, T, 3);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(0, OVER - 3.5, T, 1);
      return;
    }
    const top = (x) => (g.style === 'snow' ? OVER - 7 - 3 * Math.cos((TAU * x) / T) : OVER - 3);
    const drip = (x) => (g.style === 'snow' ? OVER + 12 + 7 * Math.max(0, Math.sin((TAU * 3 * x) / T)) : bottom(x));
    // かげ
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    for (let x = 0; x <= T; x += 2) ctx.lineTo(x, top(x) + 4);
    for (let x = T; x >= 0; x -= 2) ctx.lineTo(x, drip(x) + 5);
    ctx.closePath();
    ctx.fill();
    // おび
    const gr = ctx.createLinearGradient(0, OVER - 8, 0, OVER + 20);
    gr.addColorStop(0, g.capTop);
    gr.addColorStop(1, g.capBot);
    ctx.fillStyle = gr;
    ctx.beginPath();
    for (let x = 0; x <= T; x += 2) ctx.lineTo(x, top(x));
    for (let x = T; x >= 0; x -= 2) ctx.lineTo(x, drip(x));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= T; x += 2) ctx.lineTo(x, top(x) + 1.5);
    ctx.stroke();
    if (g.capEdge) {
      // おびの したの なみなみの ふち
      ctx.strokeStyle = g.capEdge;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= T; x += 2) ctx.lineTo(x, drip(x) - 1);
      ctx.stroke();
    }
    if (g.style === 'grass') {
      for (let i = 0; i < 18; i++) {
        const x = r() * T, h = 6 + r() * 11, lean = (r() - 0.5) * 7;
        ctx.fillStyle = r() < 0.55 ? g.blade : g.bladeDark;
        ctx.beginPath();
        ctx.moveTo(x - 2.4, OVER);
        ctx.quadraticCurveTo(x + lean * 0.5, OVER - h * 0.6, x + lean, OVER - h);
        ctx.quadraticCurveTo(x + lean * 0.5 + 1, OVER - h * 0.5, x + 2.4, OVER);
        ctx.fill();
      }
      if (v === 2) {
        [[14, '#ffffff'], [44, '#ffe14a']].forEach(([fx, c]) => {
          ctx.fillStyle = c;
          for (let p = 0; p < 5; p++) {
            ctx.beginPath();
            ctx.arc(fx + Math.cos((p * TAU) / 5) * 2.6, OVER - 9 + Math.sin((p * TAU) / 5) * 2.6, 2, 0, TAU);
            ctx.fill();
          }
          ctx.fillStyle = '#ff9a3a';
          ctx.beginPath();
          ctx.arc(fx, OVER - 9, 1.5, 0, TAU);
          ctx.fill();
        });
      }
    } else if (g.style === 'sand') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const y = OVER + 3 + i * 4;
        for (let x = 0; x <= T; x += 4) ctx.lineTo(x, y + Math.sin((TAU * 2 * x) / T + i) * 1.2);
        ctx.stroke();
      }
    } else if (g.style === 'snow') {
      for (let i = 0; i < 5; i++) {
        const x = r() * T, y = OVER - 4 + r() * 12;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        starPath(ctx, x, y, 2.4, 0.8, 4, 0);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(140,180,230,0.35)';
      ctx.beginPath();
      for (let x = 0; x <= T; x += 2) ctx.lineTo(x, drip(x) - 4);
      for (let x = T; x >= 0; x -= 2) ctx.lineTo(x, drip(x));
      ctx.closePath();
      ctx.fill();
    }
  }

  // かどの まるい ふち（ひだりがわ。みぎは はんてんして つかう）
  function paintEndCap(ctx, g) {
    const W = 26;
    if (g.style === 'metal') {
      ctx.fillStyle = g.capBot;
      rrect(ctx, 6, OVER - 4, W, 20, 4);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = g.neon;
      ctx.shadowBlur = 10;
      ctx.fillStyle = g.neon;
      ctx.fillRect(6, OVER - 4, W, 3);
      ctx.fillRect(6, OVER - 4, 3, 20);
      ctx.restore();
      return;
    }
    const gr = ctx.createLinearGradient(0, OVER - 8, 0, OVER + 22);
    gr.addColorStop(0, g.capTop);
    gr.addColorStop(1, g.capBot);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(13, OVER + 9, 11, 14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(W + 4, OVER - 3);
    ctx.lineTo(14, OVER - (g.style === 'snow' ? 8 : 3));
    ctx.quadraticCurveTo(3, OVER - 2, 3, OVER + 8);
    ctx.quadraticCurveTo(3, OVER + 18, 10, OVER + 20);
    ctx.quadraticCurveTo(18, OVER + 21, W + 4, OVER + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W + 4, OVER - 1.5);
    ctx.lineTo(14, OVER - 1.5);
    ctx.quadraticCurveTo(5, OVER, 4.5, OVER + 7);
    ctx.stroke();
    if (g.style === 'grass') {
      const r = mulberry32(5);
      for (let i = 0; i < 7; i++) {
        const x = 6 + r() * 20, h = 5 + r() * 8;
        ctx.fillStyle = r() < 0.5 ? g.blade : g.bladeDark;
        ctx.beginPath();
        ctx.moveTo(x - 2, OVER);
        ctx.quadraticCurveTo(x - 2, OVER - h * 0.6, x - 3, OVER - h);
        ctx.quadraticCurveTo(x, OVER - h * 0.5, x + 2, OVER);
        ctx.fill();
      }
    }
  }

  function paintEdge(ctx, g) {
    const gr = ctx.createLinearGradient(0, 0, 16, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0.42)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 16, T);
    ctx.fillStyle = g.edge;
    ctx.fillRect(0, 0, 2.5, T);
  }

  /* ---------- ブロック ---------- */
  function paintBrick(ctx, b) {
    if (b.style === 'brick') {
      ctx.fillStyle = b.mortar;
      ctx.fillRect(0, 0, T, T);
      const rows = [[0, [[0, 32], [32, 32]]], [32, [[-16, 32], [16, 32], [48, 32]]]];
      for (const [y, list] of rows) {
        for (const [x, w] of list) {
          const gr = ctx.createLinearGradient(0, y, 0, y + 32);
          gr.addColorStop(0, b.light);
          gr.addColorStop(0.35, b.base);
          gr.addColorStop(1, b.dark);
          ctx.fillStyle = gr;
          rrect(ctx, x + 2, y + 2, w - 4, 28, 5);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 6, y + 4, w - 12, 2.5);
        }
      }
    } else if (b.style === 'carved') {
      const gr = ctx.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, b.light);
      gr.addColorStop(0.4, b.base);
      gr.addColorStop(1, b.dark);
      ctx.fillStyle = b.mortar;
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = gr;
      rrect(ctx, 2, 2, T - 4, T - 4, 6);
      ctx.fill();
      ctx.strokeStyle = rgba(b.mortar, 0.6);
      ctx.lineWidth = 3;
      rrect(ctx, 10, 10, T - 20, T - 20, 4);
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) {
        const rr = 2 + a * 2.2;
        ctx.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      rrect(ctx, 11, 11.5, T - 22, T - 22, 4);
      ctx.stroke();
    } else if (b.style === 'ice') {
      const gr = ctx.createLinearGradient(0, 0, T, T);
      gr.addColorStop(0, b.light);
      gr.addColorStop(0.5, b.base);
      gr.addColorStop(1, b.dark);
      ctx.fillStyle = gr;
      rrect(ctx, 1, 1, T - 2, T - 2, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.lineTo(26, 6);
      ctx.lineTo(8, 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(40, 14);
      ctx.lineTo(34, 30);
      ctx.lineTo(44, 40);
      ctx.lineTo(38, 54);
      ctx.stroke();
      ctx.strokeStyle = rgba(b.mortar, 0.8);
      ctx.lineWidth = 2;
      rrect(ctx, 1, 1, T - 2, T - 2, 8);
      ctx.stroke();
    } else {
      ctx.fillStyle = b.dark;
      ctx.fillRect(0, 0, T, T);
      const gr = ctx.createLinearGradient(0, 0, 0, T);
      gr.addColorStop(0, b.light);
      gr.addColorStop(1, b.base);
      ctx.fillStyle = gr;
      rrect(ctx, 4, 4, T - 8, T - 8, 6);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = b.mortar;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = b.mortar;
      ctx.lineWidth = 2.5;
      rrect(ctx, 5, 5, T - 10, T - 10, 6);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,240,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, 20);
      ctx.lineTo(28, 20);
      ctx.lineTo(34, 30);
      ctx.lineTo(50, 30);
      ctx.moveTo(14, 44);
      ctx.lineTo(24, 44);
      ctx.lineTo(30, 38);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,240,255,0.8)';
      [[14, 20], [50, 30], [14, 44]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, TAU);
        ctx.fill();
      });
    }
  }

  function paintPlank(ctx, p) {
    const gr = ctx.createLinearGradient(0, 4, 0, 22);
    gr.addColorStop(0, p.light);
    gr.addColorStop(0.5, p.base);
    gr.addColorStop(1, p.dark);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rrect(ctx, 1, 8, T - 2, 18, 5);
    ctx.fill();
    ctx.fillStyle = gr;
    rrect(ctx, 1, 4, T - 2, 18, 5);
    ctx.fill();
    ctx.strokeStyle = rgba(p.dark, 0.6);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(6, 9 + i * 4);
      ctx.bezierCurveTo(20, 7 + i * 4, 40, 12 + i * 4, 58, 9 + i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = p.dark;
    [10, T - 10].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, 13, 2, 0, TAU);
      ctx.fill();
    });
    ctx.fillStyle = p.top;
    rrect(ctx, 1, 2, T - 2, 5, 3);
    ctx.fill();
  }

  /* ---------- いしの かべ（もんだいの とびら） ---------- */
  const WALL_W = 96, WALL_H = 620;
  function paintWall(ctx, w, th) {
    const r = mulberry32(8);
    const x0 = 12, ww = 72;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x0 + 6, 0, ww, WALL_H);
    let y = WALL_H;
    let row = 0;
    while (y > 0) {
      const h = 46;
      y -= h;
      const split = row % 2 === 0 ? [[0, ww]] : [[0, ww / 2], [ww / 2, ww / 2]];
      for (const [sx, sw] of split) {
        const gr = ctx.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, w.light);
        gr.addColorStop(0.3, w.base);
        gr.addColorStop(1, w.dark);
        ctx.fillStyle = gr;
        rrect(ctx, x0 + sx + 1.5, y + 1.5, sw - 3, h - 3, 7);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x0 + sx + 6, y + 4, sw - 12, 2);
        if (r() < 0.4) {
          ctx.strokeStyle = rgba(w.dark, 0.7);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let cx = x0 + sx + 8 + r() * (sw - 16), cy = y + 8;
          ctx.moveTo(cx, cy);
          for (let k = 0; k < 3; k++) {
            cx += (r() - 0.5) * 14;
            cy += 8 + r() * 6;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
        if (w.moss && r() < 0.3) {
          ctx.fillStyle = rgba(w.moss, 0.85);
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.arc(x0 + sx + 6 + k * 5, y + 3 + Math.sin(k) * 2, 4 + r() * 2, 0, TAU);
            ctx.fill();
          }
        }
      }
      row++;
    }
    // てつの おび
    [WALL_H - 60, WALL_H - 330].forEach((by) => {
      const gr = ctx.createLinearGradient(0, by, 0, by + 16);
      gr.addColorStop(0, '#9aa3b5');
      gr.addColorStop(0.5, '#5d6578');
      gr.addColorStop(1, '#2e3342');
      ctx.fillStyle = gr;
      rrect(ctx, x0 - 6, by, ww + 12, 16, 4);
      ctx.fill();
      for (let bx = x0; bx <= x0 + ww; bx += 18) {
        ctx.fillStyle = '#cfd6e2';
        ctx.beginPath();
        ctx.arc(bx, by + 8, 2.4, 0, TAU);
        ctx.fill();
      }
    });
    // まほうの みぞ
    ctx.save();
    ctx.shadowColor = w.rune;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = rgba(w.rune, 0.85);
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let yy = 10; yy < WALL_H - 230; yy += 28) {
      ctx.moveTo(x0 + ww / 2, yy);
      ctx.lineTo(x0 + ww / 2 + 8, yy + 9);
      ctx.lineTo(x0 + ww / 2, yy + 18);
    }
    ctx.stroke();
    ctx.restore();
    // もんしょうの だい
    const cy = WALL_H - 194;
    ctx.fillStyle = '#2b2f3e';
    ctx.beginPath();
    ctx.arc(x0 + ww / 2, cy, 36, 0, TAU);
    ctx.fill();
    const gr = ctx.createLinearGradient(0, cy - 36, 0, cy + 36);
    gr.addColorStop(0, '#f2d27a');
    gr.addColorStop(1, '#9a6a1e');
    ctx.strokeStyle = gr;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x0 + ww / 2, cy, 34, 0, TAU);
    ctx.stroke();
  }

  /* ---------- ゴールの だい ---------- */
  function paintPodium(ctx) {
    const steps = [[0, 84, 192], [21, 52, 150], [41, 22, 110]];
    for (const [x, y, w] of steps) {
      const gr = ctx.createLinearGradient(0, y, 0, y + 34);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#c9d2e6');
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      rrect(ctx, x + 4, y + 6, w, 34, 8);
      ctx.fill();
      ctx.fillStyle = gr;
      rrect(ctx, x, y, w, 34, 8);
      ctx.fill();
      const gg = ctx.createLinearGradient(0, y, 0, y + 6);
      gg.addColorStop(0, '#ffe58a');
      gg.addColorStop(1, '#e0a12a');
      ctx.fillStyle = gg;
      rrect(ctx, x, y, w, 7, 4);
      ctx.fill();
    }
    outlinedText(ctx, 'ゴール', 96, 103, 22, '#ffcf3a', '#5a3400', 0.28);
  }

  /* ---------- かざり ---------- */
  const DECOR = {
    flowers: [52, 40, (ctx, w, h) => {
      const r = mulberry32(3);
      for (let i = 0; i < 12; i++) {
        const x = 8 + r() * 36, hh = 10 + r() * 14;
        ctx.fillStyle = r() < 0.5 ? '#4fb840' : '#2f8a2c';
        ctx.beginPath();
        ctx.moveTo(x - 2, h);
        ctx.quadraticCurveTo(x, h - hh * 0.6, x + (r() - 0.5) * 6, h - hh);
        ctx.quadraticCurveTo(x + 1, h - hh * 0.5, x + 2, h);
        ctx.fill();
      }
      [[14, 18, '#ff5a7a'], [30, 10, '#ffe14a'], [42, 20, '#ffffff']].forEach(([x, y, c]) => {
        ctx.strokeStyle = '#3a9a34';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = c;
        for (let p = 0; p < 5; p++) {
          ctx.beginPath();
          ctx.ellipse(x + Math.cos((p * TAU) / 5) * 4.5, y + Math.sin((p * TAU) / 5) * 4.5, 4, 3, (p * TAU) / 5, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ff9a2a';
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, TAU);
        ctx.fill();
      });
    }],
    bush: [84, 50, (ctx, w, h) => {
      Paint.roundTree(ctx, w / 2, h + 34, 52, { light: '#a6ea6e', mid: '#52a846', dark: '#226a2e', trunk: 'rgba(0,0,0,0)' }, 9);
    }],
    mushroom: [40, 46, (ctx, w, h) => {
      ctx.fillStyle = '#fff2dc';
      rrect(ctx, 14, 22, 12, 24, 5);
      ctx.fill();
      const gr = ctx.createRadialGradient(15, 10, 2, 20, 18, 22);
      gr.addColorStop(0, '#ff8a7a');
      gr.addColorStop(1, '#c8262a');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.ellipse(20, 22, 19, 15, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      [[12, 14, 3.5], [24, 10, 3], [29, 18, 2.5], [17, 19, 2]].forEach(([x, y, rr]) => {
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, TAU);
        ctx.fill();
      });
    }],
    cactusS: [48, 78, (ctx, w, h) => {
      Paint.cactus(ctx, w / 2, h - 2, 74, { light: '#b6ea8a', mid: '#4fa04a', dark: '#245a30' });
      ctx.fillStyle = '#ff6a9a';
      ctx.beginPath();
      ctx.arc(w / 2, h - 76, 5, 0, TAU);
      ctx.fill();
    }],
    rocks: [70, 34, (ctx, w, h) => {
      [[22, 20, 18, 14], [46, 24, 14, 10], [34, 26, 10, 8]].forEach(([x, y, rx, ry]) => {
        const gr = ctx.createLinearGradient(0, y - ry, 0, y + ry);
        gr.addColorStop(0, '#d8935a');
        gr.addColorStop(1, '#7a4024');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(x, h - ry, rx, ry, 0, Math.PI, 0);
        ctx.fill();
      });
    }],
    drybush: [60, 40, (ctx, w, h) => {
      ctx.strokeStyle = '#8a5a30';
      ctx.lineWidth = 2;
      const r = mulberry32(4);
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.2, len = 16 + r() * 18;
        ctx.beginPath();
        ctx.moveTo(w / 2, h);
        ctx.quadraticCurveTo(w / 2 + Math.cos(a) * len * 0.5, h + Math.sin(a) * len * 0.6, w / 2 + Math.cos(a) * len, h + Math.sin(a) * len);
        ctx.stroke();
      }
    }],
    snowman: [64, 96, (ctx, w, h) => {
      const ball = (x, y, rr) => {
        const gr = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(1, '#b8d0ec');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, TAU);
        ctx.fill();
      };
      ball(32, 76, 20);
      ball(32, 46, 15);
      ctx.strokeStyle = '#6a4a32';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(18, 48);
      ctx.lineTo(4, 38);
      ctx.moveTo(46, 48);
      ctx.lineTo(60, 36);
      ctx.stroke();
      ctx.fillStyle = '#e8343a';
      rrect(ctx, 18, 54, 28, 7, 3);
      ctx.fill();
      ctx.fillRect(36, 56, 7, 16);
      ctx.fillStyle = '#2a2a3a';
      [[27, 42], [37, 42], [32, 70], [32, 80]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, TAU);
        ctx.fill();
      });
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(32, 46);
      ctx.lineTo(44, 49);
      ctx.lineTo(32, 50);
      ctx.fill();
      ctx.fillStyle = '#3a6ad0';
      rrect(ctx, 20, 22, 24, 12, 3);
      ctx.fill();
      rrect(ctx, 16, 31, 32, 4, 2);
      ctx.fill();
    }],
    pineS: [60, 100, (ctx, w, h) => {
      Paint.pine(ctx, w / 2, h, 100, { light: '#4f9a8a', mid: '#2e6e66', dark: '#18444a', trunk: '#4a3428' }, 1, '#ffffff');
    }],
    crystal: [48, 64, (ctx, w, h) => {
      [[24, 64, 10, 0], [12, 60, 7, -0.4], [36, 62, 7, 0.4]].forEach(([x, y, s, rot]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const gr = ctx.createLinearGradient(-s, 0, s, 0);
        gr.addColorStop(0, 'rgba(230,250,255,0.95)');
        gr.addColorStop(1, 'rgba(120,180,255,0.85)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(-s, -s * 3.6);
        ctx.lineTo(0, -s * 4.6);
        ctx.lineTo(s, -s * 3.6);
        ctx.lineTo(s, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(-s * 0.6, -s * 3.4, s * 0.35, s * 3);
        ctx.restore();
      });
    }],
    lamp: [44, 184, (ctx, w, h) => {
      const gr = ctx.createLinearGradient(16, 0, 28, 0);
      gr.addColorStop(0, '#5a5f8a');
      gr.addColorStop(1, '#1e2040');
      ctx.fillStyle = gr;
      ctx.fillRect(19, 30, 6, h - 30);
      rrect(ctx, 12, h - 12, 20, 12, 3);
      ctx.fill();
      ctx.fillStyle = '#2a2d52';
      rrect(ctx, 8, 14, 28, 18, 6);
      ctx.fill();
      ctx.fillStyle = '#fff2b8';
      rrect(ctx, 11, 26, 22, 7, 3);
      ctx.fill();
    }],
    cone: [36, 40, (ctx, w, h) => {
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(8, h - 4);
      ctx.lineTo(16, 4);
      ctx.lineTo(20, 4);
      ctx.lineTo(28, h - 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(12, 16, 12, 5);
      ctx.fillRect(10, 26, 16, 5);
      ctx.fillStyle = '#3a3a5a';
      rrect(ctx, 3, h - 6, 30, 6, 2);
      ctx.fill();
    }],
    bench: [96, 48, (ctx, w, h) => {
      ctx.fillStyle = '#2a2d52';
      ctx.fillRect(12, 28, 5, 20);
      ctx.fillRect(79, 28, 5, 20);
      ctx.fillStyle = '#6a5acc';
      rrect(ctx, 4, 24, 88, 7, 3);
      ctx.fill();
      rrect(ctx, 4, 6, 88, 6, 3);
      ctx.fill();
      rrect(ctx, 4, 14, 88, 6, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,79,216,0.8)';
      ctx.fillRect(4, 24, 88, 1.5);
    }],
  };

  /* ---------- そらの もの ---------- */
  function paintStars(ctx, W, H, density) {
    const r = mulberry32(42);
    const n = Math.floor(260 * density);
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = Math.pow(r(), 1.6) * H, s = r() < 0.08 ? 1.8 : 0.6 + r() * 0.9;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, TAU);
      ctx.fill();
    }
  }

  function aurora() {
    const c = makeCanvas(8, 256);
    const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(120,80,255,0)');
    g.addColorStop(0.45, 'rgba(110,120,255,0.18)');
    g.addColorStop(0.8, 'rgba(70,255,190,0.55)');
    g.addColorStop(0.93, 'rgba(160,255,220,0.9)');
    g.addColorStop(1, 'rgba(70,255,190,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 8, 256);
    return c;
  }

  // あかるい ひかりの たま（たしざん ブレンドで つかう）
  function glow(color) {
    if (glowCache[color]) return glowCache[color];
    const c = makeCanvas(128, 128);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(0.25, rgba(color, 0.55));
    g.addColorStop(0.6, rgba(color, 0.15));
    g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    glowCache[color] = c;
    return c;
  }

  function build(th, AS, mainCtx) {
    const A = { AS };
    A.layers = th.layers.map((L, i) => {
      const ls = Math.min(AS, i < 2 ? 0.75 : 1.1);
      return { f: L.f, w: LAYER_W, h: VIEW_H, y: 0, img: canvasFor(LAYER_W, VIEW_H, ls, (c) => Paint[L.p](c, LAYER_W, VIEW_H, L.o, th)) };
    });
    A.fg = null;
    if (th.fg) {
      const fh = th.fg.h;
      A.fg = { f: th.fg.f, w: LAYER_W, h: fh, y: VIEW_H - fh, img: canvasFor(LAYER_W, fh, Math.min(AS, 1), (c) => Paint[th.fg.p](c, LAYER_W, fh, th.fg.o, th)) };
    }
    A.clouds = [];
    for (let i = 0; i < 4; i++) {
      const w = th.cloud.thin ? 380 : 300, h = th.cloud.thin ? 100 : 140;
      A.clouds.push({ w, h, img: canvasFor(w, h, Math.min(AS, 1), (c) => Paint.cloud(c, w, h, 100 + i * 13, th.cloud)) });
    }
    const g = th.ground;
    const S = 256;
    const soilC = canvasFor(S, S, AS, (c) => paintSoil(c, g, S));
    A.soil = mainCtx.createPattern(soilC, 'repeat');
    if (A.soil.setTransform) A.soil.setTransform(new DOMMatrix([1 / AS, 0, 0, 1 / AS, 0, 0]));
    A.caps = [0, 1, 2].map((v) => canvasFor(T, OVER + 32, AS, (c) => paintCap(c, g, v)));
    A.endCap = canvasFor(34, OVER + 32, AS, (c) => paintEndCap(c, g));
    A.edge = canvasFor(16, T, AS, (c) => paintEdge(c, g));
    A.brick = canvasFor(T, T, AS, (c) => paintBrick(c, th.brick));
    A.plank = canvasFor(T, 28, AS, (c) => paintPlank(c, th.plank));
    A.wall = canvasFor(WALL_W, WALL_H, AS, (c) => paintWall(c, th.wall, th));
    A.podium = canvasFor(192, 120, AS, paintPodium);
    A.decor = {};
    for (const k of new Set(th.decor)) {
      const [w, h, fn] = DECOR[k];
      A.decor[k] = { w, h, img: canvasFor(w, h, AS, (c) => fn(c, w, h)) };
    }
    if (th.stars) A.stars = canvasFor(1600, 560, 1, (c) => paintStars(c, 1600, 560, th.stars));
    if (th.aurora) A.aurora = aurora();
    return A;
  }

  function get(key, AS, mainCtx) {
    const id = key + '@' + AS;
    if (!cache[id]) cache[id] = build(THEMES[key], AS, mainCtx);
    return cache[id];
  }

  return { get, glow, OVER, WALL_W, WALL_H };
})();
