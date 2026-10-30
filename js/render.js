'use strict';
/* =========================================================
   がめんを えがく
   S（シーン）: theme, A, viewW, camX, level, hero, fx, projectiles, time, zoom, focus, shake, flash
   ========================================================= */
const Render = (() => {
  function newAmb(type, W, anywhere) {
    const z = rand(0.45, 1.55);
    const p = { x: rand(-40, W + 40), y: anywhere ? rand(-20, VIEW_H) : -20, z, rot: rand(0, TAU), vr: rand(-2.5, 2.5), ph: rand(0, TAU) };
    if (type === 'petals') {
      p.vx = -rand(15, 45) * z;
      p.vy = rand(18, 45) * z;
      p.size = 4.2 * z;
      p.c = pick(['#ffd1e6', '#ffffff', '#ffb3d1', '#fff3a8']);
    } else if (type === 'sand') {
      p.vx = -rand(90, 220) * z;
      p.vy = rand(-6, 6);
      p.size = 1.4 * z;
      p.c = pick(['#ffe2b0', '#ffd090', '#fff0d0']);
    } else if (type === 'snow') {
      p.vx = rand(-25, 5);
      p.vy = rand(35, 75) * z;
      p.size = 2.2 * z;
    } else {
      p.vx = rand(-10, 10);
      p.vy = -rand(10, 35) * z;
      p.size = 2.3 * z;
      p.c = pick(['#ff4fd8', '#3ff6ff', '#ffe14a', '#9a7aff']);
    }
    return p;
  }

  function initScenery(S) {
    const th = S.theme;
    const r = mulberry32(th.key.length * 13 + 1);
    S.clouds = [];
    for (let i = 0; i < th.cloud.count; i++) S.clouds.push({ x: r() * 2600, y: 30 + r() * 250, s: 0.55 + r() * 0.75, f: 0.02 + r() * 0.05, v: 4 + r() * 10, img: i % 4 });
    S.amb = [];
    const n = { petals: 30, sand: 70, snow: 120, neon: 46 }[th.ambient] || 0;
    for (let i = 0; i < n; i++) S.amb.push(newAmb(th.ambient, S.viewW, true));
    S.birds = th.birds ? Array.from({ length: 6 }, () => ({ x: r() * S.viewW, y: 110 + r() * 180, s: 0.6 + r() * 0.6, ph: r() * TAU, v: 20 + r() * 30 })) : null;
    S.shoot = null;
  }

  function updateScenery(S, dt, camDx) {
    const W = S.viewW, type = S.theme.ambient;
    for (const p of S.amb) {
      p.x += p.vx * dt - camDx * p.z * 0.85;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (type === 'petals' || type === 'snow') p.x += Math.sin(S.time * 1.3 + p.ph) * 18 * dt * p.z;
      if (p.x < -80) p.x += W + 160;
      else if (p.x > W + 80) p.x -= W + 160;
      if (p.y > VIEW_H + 20) {
        p.y = -20;
        p.x = rand(-40, W + 40);
      } else if (p.y < -30) {
        p.y = VIEW_H + 20;
        p.x = rand(-40, W + 40);
      }
    }
    if (S.birds) {
      for (const b of S.birds) {
        b.x -= b.v * dt + camDx * 0.15;
        if (b.x < -40) {
          b.x = W + 40;
          b.y = 100 + Math.random() * 200;
        } else if (b.x > W + 60) b.x = -30;
      }
    }
    if (S.theme.key === 'night') {
      if (S.shoot) {
        S.shoot.x += S.shoot.vx * dt;
        S.shoot.y += S.shoot.vy * dt;
        S.shoot.life -= dt;
        if (S.shoot.life <= 0) S.shoot = null;
      } else if (Math.random() < dt * 0.18) {
        S.shoot = { x: rand(W * 0.3, W * 1.1), y: rand(30, 200), vx: -rand(700, 1000), vy: rand(200, 320), life: 0.9 };
      }
    }
  }

  /* ---------------- そら ---------------- */
  function sun(ctx, S) {
    const { x: fx, y, r } = S.theme.sun;
    const x = S.viewW * fx, t = S.time;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(t * 0.02);
    const rg = ctx.createRadialGradient(0, 0, r, 0, 0, 780);
    rg.addColorStop(0, 'rgba(255,246,214,0.17)');
    rg.addColorStop(1, 'rgba(255,246,214,0)');
    ctx.fillStyle = rg;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU, w = 0.06 + (i % 3) * 0.03;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 780, a, a + w);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75;
    ctx.drawImage(Assets.glow('#ffeec0'), x - 320, y - 320, 640, 640);
    ctx.globalAlpha = 1;
    ctx.drawImage(Assets.glow('#ffffff'), x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.restore();
    ctx.fillStyle = '#fffdf3';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, TAU);
    ctx.fill();
  }

  function sunset(ctx, S) {
    const { x: fx, y, r } = S.theme.sunset;
    const x = S.viewW * fx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(Assets.glow('#ff8a50'), x - 520, y - 420, 1040, 840);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(Assets.glow('#ffd27a'), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.restore();
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#fff7c4');
    g.addColorStop(0.6, '#ffb45a');
    g.addColorStop(1, '#ff6a4a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgba(232,98,122,0.55)';
    for (let i = 0; i < 5; i++) {
      const yy = y + r * 0.15 + i * r * 0.18;
      ctx.fillRect(x - r, yy, r * 2, 2 + i * 1.6);
    }
    ctx.restore();
  }

  function moon(ctx, S) {
    const { x: fx, y, r } = S.theme.moon;
    const x = S.viewW * fx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(Assets.glow('#9f8fff'), x - 300, y - 300, 600, 600);
    ctx.globalAlpha = 0.35;
    ctx.drawImage(Assets.glow('#ffffff'), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.restore();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#fffdf0');
    g.addColorStop(1, '#d4cbef');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,135,195,0.3)';
    [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.1]].forEach(([dx, dy, rr]) => {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, rr * r, 0, TAU);
      ctx.fill();
    });
  }

  function aurora(ctx, S) {
    const img = S.A.aurora, t = S.time, W = S.viewW;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
      const base = 170 + k * 80;
      for (let x = -10; x < W + 10; x += 8) {
        const wx = x + S.camX * 0.02;
        const y = base + Math.sin(wx * 0.004 + t * 0.25 + k * 2) * 42 + Math.sin(wx * 0.011 - t * 0.4) * 14;
        const a = 0.3 + 0.38 * Math.sin(wx * 0.008 + t * 0.6 + k * 1.7);
        if (a <= 0) continue;
        ctx.globalAlpha = a * (k ? 0.55 : 0.9);
        const hgt = 170 + Math.sin(wx * 0.006 + t * 0.3 + k) * 50;
        ctx.drawImage(img, x, y - hgt, 9, hgt);
      }
    }
    ctx.restore();
  }

  function sky(ctx, S) {
    const th = S.theme, W = S.viewW, t = S.time, A = S.A;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    th.sky.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(-60, -60, W + 120, VIEW_H + 120);
    if (A.stars) {
      const sw = 1600;
      let off = -((S.camX * 0.01) % sw);
      if (off > 0) off -= sw;
      ctx.globalAlpha = th.stars;
      for (let x = off; x < W; x += sw) ctx.drawImage(A.stars, x, 0, sw, 560);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 22; i++) {
        const sx = (((hash2(i, 7) * sw - S.camX * 0.01) % sw) + sw) % sw;
        if (sx > W) continue;
        const sy = hash2(i, 9) * 360;
        ctx.globalAlpha = th.stars * (0.5 + 0.5 * Math.sin(t * (1.5 + hash2(i, 2) * 2) + i));
        starPath(ctx, sx, sy, 4, 0.9, 4, 0);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (th.aurora) aurora(ctx, S);
    if (th.sun) sun(ctx, S);
    if (th.sunset) sunset(ctx, S);
    if (th.moon) moon(ctx, S);
    if (S.shoot) {
      const s = S.shoot;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, s.life * 2);
      const gr = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(160,140,255,0)');
      ctx.strokeStyle = gr;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15);
      ctx.stroke();
      ctx.restore();
    }
    // くも
    const span = W + 700;
    ctx.globalAlpha = th.cloud.alpha;
    for (const c of S.clouds) {
      const img = A.clouds[c.img];
      let x = c.x - S.camX * c.f - t * c.v;
      x = ((x % span) + span) % span - 350;
      ctx.drawImage(img.img, x, c.y, img.w * c.s, img.h * c.s);
    }
    ctx.globalAlpha = 1;
    if (S.birds) {
      ctx.strokeStyle = 'rgba(70,20,60,0.65)';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      for (const b of S.birds) {
        const f = Math.sin(t * 8 + b.ph);
        ctx.beginPath();
        ctx.moveTo(b.x - 10 * b.s, b.y - f * 6 * b.s);
        ctx.quadraticCurveTo(b.x - 4 * b.s, b.y - 2 * b.s, b.x, b.y);
        ctx.quadraticCurveTo(b.x + 4 * b.s, b.y - 2 * b.s, b.x + 10 * b.s, b.y - f * 6 * b.s);
        ctx.stroke();
      }
    }
  }

  function drawLayer(ctx, L, camX, W) {
    let off = -((camX * L.f) % L.w);
    if (off > 0) off -= L.w;
    if (off > -60) off -= L.w;
    for (let x = off; x < W + 60; x += L.w) ctx.drawImage(L.img, x, L.y, L.w + 1, L.h);
  }

  /* ---------------- じめん ---------------- */
  function tiles(ctx, S) {
    const L = S.level, A = S.A, OV = Assets.OVER;
    const c0 = Math.max(0, Math.floor(S.camX / T) - 1), c1 = Math.min(L.cols - 1, Math.floor((S.camX + S.viewW) / T) + 1);
    ctx.beginPath();
    for (let c = c0; c <= c1; c++) for (let r = 0; r < ROWS; r++) if (L.tiles[c * ROWS + r] === 1) ctx.rect(c * T, r * T, T + 0.5, T + 0.5);
    ctx.fillStyle = A.soil;
    ctx.fill();
    const dg = ctx.createLinearGradient(0, 430, 0, VIEW_H);
    dg.addColorStop(0, 'rgba(0,0,0,0)');
    dg.addColorStop(1, `rgba(0,0,0,${S.theme.depth == null ? 0.45 : S.theme.depth})`);
    ctx.fillStyle = dg;
    ctx.fill();
    for (let c = c0; c <= c1; c++) {
      for (let r = 0; r < ROWS; r++) {
        const t = L.tiles[c * ROWS + r];
        if (t === 0) continue;
        const x = c * T, y = r * T;
        if (t === 1) {
          const left = Physics.tile(L, c - 1, r) === 1, right = Physics.tile(L, c + 1, r) === 1;
          const up = r > 0 && L.tiles[c * ROWS + r - 1] === 1;
          if (!left) ctx.drawImage(A.edge, x, y, 16, T);
          if (!right) {
            ctx.save();
            ctx.translate(x + T, y);
            ctx.scale(-1, 1);
            ctx.drawImage(A.edge, 0, 0, 16, T);
            ctx.restore();
          }
          if (!up) {
            ctx.drawImage(A.caps[(hash2(c, r) * 3) | 0], x, y - OV, T, OV + 32);
            if (!left) ctx.drawImage(A.endCap, x - 8, y - OV, 34, OV + 32);
            if (!right) {
              ctx.save();
              ctx.translate(x + T + 8, y - OV);
              ctx.scale(-1, 1);
              ctx.drawImage(A.endCap, 0, 0, 34, OV + 32);
              ctx.restore();
            }
          }
        } else if (t === 2) ctx.drawImage(A.brick, x, y, T, T);
        else if (t === 3) ctx.drawImage(A.plank, x, y - 2, T, 28);
      }
    }
  }

  function world(ctx, S) {
    const L = S.level, A = S.A, th = S.theme, t = S.time;
    const x0 = S.camX - 260, x1 = S.camX + S.viewW + 260;
    const vis = (x) => x > x0 && x < x1;
    for (const d of L.decor) {
      if (!vis(d.x)) continue;
      const D = A.decor[d.key];
      ctx.drawImage(D.img, d.x - D.w / 2, d.y - D.h + 3, D.w, D.h);
    }
    for (const s of L.signs) if (vis(s.x)) drawSign(ctx, s, t);
    for (const g of L.gates) if (vis(g.x)) g.draw(ctx, t, th, A);
    tiles(ctx, S);
    if (th.key === 'night') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const d of L.decor) {
        if (d.key !== 'lamp' || !vis(d.x)) continue;
        const ly = d.y - A.decor.lamp.h + 30;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(Assets.glow('#ffe7a0'), d.x - 90, ly - 90, 180, 180);
        ctx.globalAlpha = 0.35;
        ctx.drawImage(Assets.glow('#ffd77a'), d.x - 110, d.y - 40, 220, 70);
      }
      ctx.restore();
    }
    if (L.goal && vis(L.goal.x)) drawGoal(ctx, L.goal, t, A);
    // 仲間（大きい ロボ・ゴリラも）は 数字ブロック・アイテム・ヒーローより うしろ（問題を かくさない）
    if (S.ally) S.ally.draw(ctx, t);
    for (const s of L.springs) if (vis(s.x)) s.draw(ctx, t);
    for (const b of L.blocks) if (vis(b.x)) b.draw(ctx, t, th);
    for (const d of L.dumbbells) if (!d.taken && vis(d.x)) drawDumbbell(ctx, d.x, d.y, t, d.phase);
    for (const p of L.proteins) if (!p.taken && vis(p.x)) drawProtein(ctx, p.x, p.y, t);
    for (const e of L.enemies) if (vis(e.x)) e.draw(ctx, t, th.slime);
    const h = S.hero;
    for (const g of L.gates) if (g.boss && vis(g.boss.x)) g.boss.draw(ctx, t, th.boss, h ? h.x : 0);
    if (h) {
      const gy = h.onGround ? h.y : Physics.groundBelow(L, h.x, h.y);
      if (gy != null) {
        const k = clamp(1 - (gy - h.y) / 320, 0.15, 1);
        drawShadow(ctx, h.x, gy, 32 * k, 0.3 * k);
      }
      h.draw(ctx, t);
    }
    if (S.projectiles) for (const p of S.projectiles) p.draw(ctx, t);
    if (S.enemyShots) for (const s of S.enemyShots) s.draw(ctx, t);
    S.fx.draw(ctx);
    S.fx.drawTexts(ctx);
  }

  function ambient(ctx, S, front) {
    const type = S.theme.ambient, list = S.amb;
    if (!list || !list.length) return;
    ctx.save();
    if (type === 'neon') ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      if (p.z > 1.15 !== front) continue;
      if (type === 'petals') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.globalAlpha = front ? 0.85 : 0.95;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (type === 'snow') {
        if (front) {
          ctx.globalAlpha = 0.7;
          const s = p.size * 3.2;
          ctx.drawImage(Assets.glow('#ffffff'), p.x - s, p.y - s, s * 2, s * 2);
        } else {
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
        }
      } else if (type === 'sand') {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.size * 3.5, p.size * 0.8);
      } else {
        ctx.globalAlpha = 0.45 + 0.45 * Math.sin(S.time * 3 + p.ph);
        const s = p.size * 4;
        ctx.drawImage(Assets.glow(p.c), p.x - s, p.y - s, s * 2, s * 2);
      }
    }
    ctx.restore();
  }

  function scene(ctx, S) {
    const W = S.viewW;
    ctx.save();
    if (S.zoom && Math.abs(S.zoom - 1) > 0.001) {
      ctx.translate(S.focus.x, S.focus.y);
      ctx.scale(S.zoom, S.zoom);
      ctx.translate(-S.focus.x, -S.focus.y);
    }
    if (S.shake > 0.3) ctx.translate((Math.random() * 2 - 1) * S.shake, (Math.random() * 2 - 1) * S.shake * 0.7);
    sky(ctx, S);
    for (const L of S.A.layers) drawLayer(ctx, L, S.camX, W);
    ambient(ctx, S, false);
    ctx.save();
    ctx.translate(-S.camX, 0);
    world(ctx, S);
    ctx.restore();
    if (S.A.fg) drawLayer(ctx, S.A.fg, S.camX, W);
    ambient(ctx, S, true);
    ctx.restore();
  }

  function post(ctx, S) {
    if (S.vignette) {
      ctx.globalAlpha = S.theme.vignette == null ? 1 : S.theme.vignette;
      ctx.drawImage(S.vignette, 0, 0, S.viewW, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (S.hero && S.hero.power > 0 && S.powerEdge) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.35 + Math.sin(S.time * 8) * 0.12) * Math.min(1, S.hero.power);
      ctx.drawImage(S.powerEdge, 0, 0, S.viewW, VIEW_H);
      ctx.restore();
    }
    if (S.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, S.flash)})`;
      ctx.fillRect(0, 0, S.viewW, VIEW_H);
    }
  }

  function edgeCanvas(inner, outer) {
    const c = makeCanvas(320, 180);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(160, 90, 40, 160, 90, 200);
    g.addColorStop(0, inner);
    g.addColorStop(0.55, inner);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.fillRect(0, 0, 320, 180);
    return c;
  }

  return { initScenery, updateScenery, scene, post, edgeCanvas };
})();
