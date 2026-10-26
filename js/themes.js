'use strict';
/* =========================================================
   せかいの みため（テーマ と はいけいの えがきかた）
   ========================================================= */
const Paint = {};

Paint.profile = (ctx, W, H, yAt, dx = 0, dy = 0) => {
  ctx.beginPath();
  ctx.moveTo(-8, H + 4);
  for (let x = -8; x <= W + 8; x += 3) ctx.lineTo(x, yAt(x - dx) + dy);
  ctx.lineTo(W + 8, H + 4);
  ctx.closePath();
};

// はしで きれないように 3かい えがく
Paint.wrap = (W, x, size, fn) => {
  fn(x);
  if (x < size) fn(x + W);
  if (x > W - size) fn(x - W);
};

Paint.haze = (ctx, W, H, color, fromY, toY, a) => {
  const hz = ctx.createLinearGradient(0, fromY, 0, toY);
  hz.addColorStop(0, rgba(color, 0));
  hz.addColorStop(1, rgba(color, a));
  ctx.fillStyle = hz;
  ctx.fillRect(-8, fromY, W + 16, H - fromY);
};

/* ---------------- やま ---------------- */
Paint.mountains = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const yAt = (x) => o.base - f(x) * o.amp;
  Paint.profile(ctx, W, H, yAt);
  ctx.fillStyle = o.lit;
  ctx.fill();
  ctx.save();
  Paint.profile(ctx, W, H, yAt);
  ctx.clip();
  if (o.snow) {
    const fs = periodic(W, o.seed + 9, [[13, 1], [29, 0.5]]);
    ctx.fillStyle = o.snow;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(W + 8, -8);
    for (let x = W + 8; x >= -8; x -= 3) ctx.lineTo(x, o.snowLine + fs(x) * 12);
    ctx.closePath();
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, o.base - o.amp, 0, H * 0.9);
  g.addColorStop(0, o.shadeTop);
  g.addColorStop(1, o.shadeBot);
  ctx.globalAlpha = o.shadeA == null ? 0.9 : o.shadeA;
  Paint.profile(ctx, W, H, yAt, o.shift, o.shift * 0.35);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (o.haze) Paint.haze(ctx, W, H, o.haze, o.base - o.amp * 0.4, o.hazeEnd || H * 0.85, o.hazeA == null ? 0.85 : o.hazeA);
  ctx.restore();
  if (o.trees) Paint.scatter(ctx, W, o, yAt, true);
  return yAt;
};

/* ---------------- おか（木つき） ---------------- */
Paint.scatter = (ctx, W, o, yAt, front) => {
  const tr = o.trees;
  const rng = mulberry32(o.seed * 7 + (front ? 3 : 1));
  const n = front ? Math.ceil(tr.count * 0.45) : Math.floor(tr.count * 0.55);
  const items = [];
  for (let i = 0; i < n; i++) items.push({ x: rng() * W, s: lerp(tr.min, tr.max, rng()), seed: o.seed * 100 + i + (front ? 50 : 0), dy: front ? lerp(10, 40, rng()) : lerp(-2, 6, rng()) });
  items.sort((a, b) => a.s - b.s);
  for (const it of items) {
    Paint.wrap(W, it.x, it.s, (xx) => Paint.tree(ctx, tr.kind, xx, yAt(xx) + it.dy + it.s * 0.05, it.s * (front ? 1 : 0.85), tr.c, it.seed));
  }
};

Paint.hills = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const yAt = (x) => o.base - f(x) * o.amp;
  if (o.trees) Paint.scatter(ctx, W, o, yAt, false);
  Paint.profile(ctx, W, H, yAt);
  const g = ctx.createLinearGradient(0, o.base - o.amp, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(1, o.bot);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  Paint.profile(ctx, W, H, yAt);
  ctx.clip();
  // やわらかい もよう
  const rng = mulberry32(o.seed + 99);
  for (let i = 0; i < 26; i++) {
    const x = rng() * W, y = yAt(x) + 20 + rng() * 120, r = 30 + rng() * 90;
    Paint.wrap(W, x, r, (xx) => {
      const gg = ctx.createRadialGradient(xx, y, 0, xx, y, r);
      gg.addColorStop(0, rgba(rng() < 0.5 ? o.rim : o.bot, 0.18));
      gg.addColorStop(1, rgba(o.bot, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(xx - r, y - r, r * 2, r * 2);
    });
  }
  ctx.strokeStyle = rgba(o.rim, 0.75);
  ctx.lineWidth = o.rimW || 4;
  ctx.beginPath();
  for (let x = -8; x <= W + 8; x += 3) ctx.lineTo(x, yAt(x) + 1.5);
  ctx.stroke();
  if (o.haze) Paint.haze(ctx, W, H, o.haze, o.base - o.amp, H, o.hazeA || 0.4);
  ctx.restore();
  if (o.extras) o.extras.forEach(([kind, fx, s]) => Paint.wrap(W, fx * W, s * 1.5, (xx) => Paint[kind](ctx, xx, yAt(xx) + 6, s, o)));
  if (o.trees) Paint.scatter(ctx, W, o, yAt, true);
  return yAt;
};

Paint.tree = (ctx, kind, x, y, s, c, seed) => {
  if (Array.isArray(kind)) kind = kind[seed % kind.length];
  if (kind === 'round') Paint.roundTree(ctx, x, y, s, c, seed);
  else if (kind === 'lollipop') Paint.lollipop(ctx, x, y, s, c);
  else if (kind === 'bush') Paint.bush(ctx, x, y, s, c);
  else if (kind === 'pine') Paint.pine(ctx, x, y, s, c, seed, c.snow);
  else if (kind === 'cactus') Paint.cactus(ctx, x, y, s, c);
};

Paint.roundTree = (ctx, x, y, s, c, seed) => {
  const r = mulberry32(seed);
  ctx.fillStyle = c.trunk;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.08, y);
  ctx.quadraticCurveTo(x - s * 0.03, y - s * 0.4, x - s * 0.05, y - s * 0.85);
  ctx.lineTo(x + s * 0.05, y - s * 0.85);
  ctx.quadraticCurveTo(x + s * 0.03, y - s * 0.4, x + s * 0.08, y);
  ctx.closePath();
  ctx.fill();
  const blobs = [];
  const n = 5 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * 0.3;
    blobs.push({ x: x + Math.cos(a) * d * s, y: y - s * 1.02 + Math.sin(a) * d * s * 0.8 - r() * 0.12 * s, rr: s * (0.3 + r() * 0.17) });
  }
  blobs.sort((a, b) => b.y - a.y);
  ctx.fillStyle = c.dark;
  for (const b of blobs) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.rr, 0, TAU);
    ctx.fill();
  }
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x - b.rr * 0.35, b.y - b.rr * 0.45, b.rr * 0.05, b.x - b.rr * 0.1, b.y - b.rr * 0.1, b.rr * 1.02);
    g.addColorStop(0, c.light);
    g.addColorStop(0.55, c.mid);
    g.addColorStop(1, rgba(c.dark, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y - b.rr * 0.04, b.rr * 0.94, 0, TAU);
    ctx.fill();
  }
};

// まるい は の シンプルな 木（デザイン見本の かたち）
Paint.lollipop = (ctx, x, y, s, c) => {
  ctx.fillStyle = c.trunk;
  rrect(ctx, x - s * 0.055, y - s * 0.72, s * 0.11, s * 0.74, s * 0.04);
  ctx.fill();
  const r = s * 0.36, cy = y - s * 0.9;
  const g = ctx.createRadialGradient(x - r * 0.35, cy - r * 0.4, r * 0.1, x, cy, r);
  g.addColorStop(0, c.light);
  g.addColorStop(0.6, c.mid);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, TAU);
  ctx.fill();
};

Paint.bush = (ctx, x, y, s, c) => {
  const blobs = [[-0.32, -0.16, 0.24], [0.3, -0.15, 0.22], [0, -0.26, 0.3]];
  for (const [bx, by, br] of blobs) {
    const cx = x + bx * s, cy = y + by * s, r = br * s;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, c.light);
    g.addColorStop(0.6, c.mid);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.15, r, 0, 0, TAU);
    ctx.fill();
  }
};

Paint.pine = (ctx, x, y, s, c, seed, snow) => {
  ctx.fillStyle = c.trunk;
  ctx.fillRect(x - s * 0.04, y - s * 0.24, s * 0.08, s * 0.26);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const w = s * lerp(0.34, 0.13, t);
    const by = y - s * 0.16 - i * s * 0.19;
    const ty = by - s * 0.33;
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, c.light);
    g.addColorStop(0.45, c.mid);
    g.addColorStop(1, c.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, ty);
    ctx.quadraticCurveTo(x - w * 0.45, by - s * 0.12, x - w, by);
    ctx.quadraticCurveTo(x, by + s * 0.05, x + w, by);
    ctx.quadraticCurveTo(x + w * 0.45, by - s * 0.12, x, ty);
    ctx.fill();
    if (snow) {
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.quadraticCurveTo(x - w * 0.35, by - s * 0.15, x - w * 0.85, by - s * 0.02);
      ctx.quadraticCurveTo(x - w * 0.35, by - s * 0.07, x - w * 0.05, by - s * 0.1);
      ctx.quadraticCurveTo(x + w * 0.3, by - s * 0.07, x + w * 0.55, by - s * 0.06);
      ctx.quadraticCurveTo(x + w * 0.3, by - s * 0.16, x, ty);
      ctx.fill();
    }
  }
};

Paint.cactus = (ctx, x, y, s, c) => {
  const w = s * 0.17;
  const pathC = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - s);
    ctx.moveTo(x, y - s * 0.42);
    ctx.lineTo(x - s * 0.24, y - s * 0.42);
    ctx.lineTo(x - s * 0.24, y - s * 0.7);
    ctx.moveTo(x, y - s * 0.55);
    ctx.lineTo(x + s * 0.22, y - s * 0.55);
    ctx.lineTo(x + s * 0.22, y - s * 0.8);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  pathC();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(-w * 0.16, 0);
  pathC();
  ctx.strokeStyle = c.mid;
  ctx.lineWidth = w * 0.62;
  ctx.stroke();
  ctx.translate(-w * 0.1, 0);
  pathC();
  ctx.strokeStyle = c.light;
  ctx.lineWidth = w * 0.18;
  ctx.stroke();
  ctx.restore();
};

Paint.windmill = (ctx, x, y, s) => {
  const g = ctx.createLinearGradient(x - s * 0.2, 0, x + s * 0.2, 0);
  g.addColorStop(0, '#fff8ec');
  g.addColorStop(1, '#d9c7b0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.2, y);
  ctx.lineTo(x - s * 0.12, y - s);
  ctx.lineTo(x + s * 0.12, y - s);
  ctx.lineTo(x + s * 0.2, y);
  ctx.fill();
  ctx.fillStyle = '#d2483e';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.17, y - s);
  ctx.lineTo(x, y - s * 1.22);
  ctx.lineTo(x + s * 0.17, y - s);
  ctx.fill();
  ctx.fillStyle = '#7a4a32';
  rrect(ctx, x - s * 0.05, y - s * 0.2, s * 0.1, s * 0.2, 3);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - s * 1.0);
  ctx.rotate(0.35);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(TAU / 4);
    ctx.fillStyle = '#f4ede0';
    ctx.fillRect(-s * 0.035, 0, s * 0.07, s * 0.62);
    ctx.fillStyle = 'rgba(160,120,90,0.6)';
    ctx.fillRect(-s * 0.012, 0, s * 0.024, s * 0.62);
  }
  ctx.fillStyle = '#5a3a2a';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.05, 0, TAU);
  ctx.fill();
  ctx.restore();
};

Paint.house = (ctx, x, y, s) => {
  ctx.fillStyle = '#fff1dc';
  ctx.fillRect(x - s * 0.45, y - s * 0.55, s * 0.9, s * 0.55);
  ctx.fillStyle = 'rgba(160,110,70,0.35)';
  ctx.fillRect(x + s * 0.1, y - s * 0.55, s * 0.35, s * 0.55);
  ctx.fillStyle = '#7a3a2a';
  ctx.fillRect(x + s * 0.18, y - s * 0.95, s * 0.12, s * 0.3);
  ctx.fillStyle = '#e0503e';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.55, y - s * 0.52);
  ctx.lineTo(x, y - s * 0.95);
  ctx.lineTo(x + s * 0.55, y - s * 0.52);
  ctx.fill();
  ctx.fillStyle = '#ffd66a';
  ctx.fillRect(x - s * 0.3, y - s * 0.4, s * 0.18, s * 0.16);
  ctx.fillStyle = '#8a5236';
  ctx.fillRect(x + s * 0.02, y - s * 0.32, s * 0.16, s * 0.32);
};

/* ---------------- さばく ---------------- */
Paint.mesas = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const n = periodic(W, o.seed + 5, [[31, 1], [57, 0.5]]);
  const yAt = (x) => o.base - o.amp * clamp((f(x) - o.th) * o.k, 0, 1) - n(x) * 4 - o.amp * 0.12;
  Paint.profile(ctx, W, H, yAt);
  ctx.fillStyle = o.lit;
  ctx.fill();
  ctx.save();
  Paint.profile(ctx, W, H, yAt);
  ctx.clip();
  ctx.globalAlpha = 0.85;
  Paint.profile(ctx, W, H, yAt, o.shift, o.shift * 0.2);
  ctx.fillStyle = o.shade;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = rgba(o.strata, 0.35);
  ctx.lineWidth = 2;
  for (let y = o.base - o.amp; y < H; y += 9) {
    ctx.beginPath();
    for (let x = -8; x <= W + 8; x += 12) ctx.lineTo(x, y + n(x * 3) * 2);
    ctx.stroke();
  }
  Paint.haze(ctx, W, H, o.haze, o.base - o.amp * 0.6, H * 0.85, o.hazeA);
  ctx.restore();
};

Paint.pyramids = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const yAt = (x) => o.base - f(x) * o.amp;
  for (const [fx, size] of o.list) {
    Paint.wrap(W, fx * W, size, (px) => {
      const by = yAt(px) + 14, ty = by - size * 0.72;
      ctx.fillStyle = o.lit;
      ctx.beginPath();
      ctx.moveTo(px - size, by);
      ctx.lineTo(px, ty);
      ctx.lineTo(px + size * 0.18, by);
      ctx.fill();
      ctx.fillStyle = o.shade;
      ctx.beginPath();
      ctx.moveTo(px, ty);
      ctx.lineTo(px + size, by);
      ctx.lineTo(px + size * 0.18, by);
      ctx.fill();
      ctx.strokeStyle = rgba(o.shade, 0.35);
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 9; i++) {
        const t = i / 9, yy = lerp(ty, by, t);
        ctx.beginPath();
        ctx.moveTo(px - size * t, yy);
        ctx.lineTo(px + size * 0.18 * t, yy);
        ctx.stroke();
      }
    });
  }
  Paint.profile(ctx, W, H, yAt);
  const g = ctx.createLinearGradient(0, o.base - o.amp, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(1, o.bot);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  Paint.profile(ctx, W, H, yAt);
  ctx.clip();
  Paint.haze(ctx, W, H, o.haze, o.base - o.amp - 200, H, o.hazeA);
  ctx.restore();
};

Paint.dunes = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const yAt = (x) => o.base - f(x) * o.amp;
  if (o.trees) Paint.scatter(ctx, W, o, yAt, false);
  Paint.profile(ctx, W, H, yAt);
  const g = ctx.createLinearGradient(0, o.base - o.amp, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(1, o.bot);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  Paint.profile(ctx, W, H, yAt);
  ctx.clip();
  ctx.globalAlpha = 0.5;
  Paint.profile(ctx, W, H, yAt, o.shift || 30, 8);
  ctx.fillStyle = o.shade;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = rgba(o.rim, 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -8; x <= W + 8; x += 3) ctx.lineTo(x, yAt(x) + 1);
  ctx.stroke();
  // かぜの もよう
  const rng = mulberry32(o.seed + 3);
  ctx.strokeStyle = rgba(o.rim, 0.25);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    const x = rng() * W, y = yAt(x) + 15 + rng() * 80, w = 30 + rng() * 60;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y - 6, x + w, y);
    ctx.stroke();
  }
  if (o.haze) Paint.haze(ctx, W, H, o.haze, o.base - o.amp, H, o.hazeA || 0.3);
  ctx.restore();
  if (o.trees) Paint.scatter(ctx, W, o, yAt, true);
};

Paint.desertNear = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, o.terms);
  const yAt = (x) => o.base - f(x) * o.amp;
  const rng = mulberry32(o.seed + 1);
  // いわの とう
  for (let i = 0; i < o.spires; i++) {
    const x = (i + 0.3 + rng() * 0.4) * (W / o.spires);
    const w = 40 + rng() * 50, h = 120 + rng() * 170;
    Paint.wrap(W, x, w * 1.5, (xx) => {
      const by = yAt(xx) + 10;
      ctx.beginPath();
      ctx.moveTo(xx - w * 0.8, by);
      ctx.bezierCurveTo(xx - w * 0.5, by - h * 0.4, xx - w * 0.7, by - h * 0.8, xx - w * 0.4, by - h);
      ctx.quadraticCurveTo(xx, by - h * 1.06, xx + w * 0.45, by - h * 0.98);
      ctx.bezierCurveTo(xx + w * 0.6, by - h * 0.7, xx + w * 0.45, by - h * 0.35, xx + w * 0.85, by);
      ctx.closePath();
      const g = ctx.createLinearGradient(xx - w, 0, xx + w, 0);
      g.addColorStop(0, o.lit);
      g.addColorStop(0.55, o.mid);
      g.addColorStop(1, o.shade);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = rgba(o.shade, 0.4);
      ctx.lineWidth = 3;
      for (let y = by - h; y < by; y += 16) {
        ctx.beginPath();
        ctx.moveTo(xx - w, y);
        ctx.quadraticCurveTo(xx, y + 4, xx + w, y - 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
  Paint.profile(ctx, W, H, yAt);
  const g = ctx.createLinearGradient(0, o.base - o.amp, 0, H);
  g.addColorStop(0, o.top);
  g.addColorStop(1, o.bot);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(o.rim, 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -8; x <= W + 8; x += 3) ctx.lineTo(x, yAt(x) + 1);
  ctx.stroke();
  if (o.trees) Paint.scatter(ctx, W, o, yAt, true);
};

/* ---------------- まち ---------------- */
Paint.skyline = (ctx, W, H, o) => {
  const r = mulberry32(o.seed);
  let x = 0;
  const blds = [];
  while (x < W - 10) {
    let w = lerp(o.wMin, o.wMax, r());
    if (x + w > W - 10) w = W - x;
    blds.push({ x, w, h: lerp(o.hMin, o.hMax, Math.pow(r(), 1.2)), roof: r() });
    x += w + (r() < 0.35 ? lerp(3, 18, r()) : 0);
  }
  for (const b of blds) {
    const top = o.base - b.h;
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, o.top);
    g.addColorStop(1, o.bot);
    ctx.fillStyle = g;
    ctx.fillRect(b.x, top, b.w, H - top);
    if (b.roof < 0.3) {
      ctx.fillRect(b.x + b.w * 0.35, top - 14, b.w * 0.3, 14);
      ctx.fillRect(b.x + b.w * 0.48, top - 14 - b.h * 0.12, 2, b.h * 0.12);
      const ly = top - 14 - b.h * 0.12;
      const lg = ctx.createRadialGradient(b.x + b.w * 0.48 + 1, ly, 0, b.x + b.w * 0.48 + 1, ly, 8);
      lg.addColorStop(0, 'rgba(255,80,90,0.95)');
      lg.addColorStop(1, 'rgba(255,80,90,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(b.x + b.w * 0.48 - 8, ly - 8, 18, 16);
    } else if (b.roof < 0.45) {
      ctx.beginPath();
      ctx.moveTo(b.x, top);
      ctx.lineTo(b.x + b.w / 2, top - b.w * 0.35);
      ctx.lineTo(b.x + b.w, top);
      ctx.fill();
    }
    if (o.rim) {
      ctx.fillStyle = rgba(o.rim, 0.5);
      ctx.fillRect(b.x, top, 2, H - top);
      ctx.fillRect(b.x, top, b.w, 1.5);
    }
    if (o.win) {
      for (let wy = top + 8; wy < H - 8; wy += o.winH + o.winGap) {
        for (let wx = b.x + 5; wx < b.x + b.w - 5 - o.winW; wx += o.winW + o.winGapX) {
          if (r() < o.winP) {
            ctx.fillStyle = o.win[(r() * o.win.length) | 0];
            ctx.globalAlpha = 0.35 + r() * 0.65;
            ctx.fillRect(wx, wy, o.winW, o.winH);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }
  if (o.haze) Paint.haze(ctx, W, H, o.haze, o.base - o.hMax * 0.4, H, o.hazeA);
};

Paint.neonSign = (ctx, x, y, w, h, color, text, kind) => {
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,30,0.85)';
  rrect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  rrect(ctx, x + 3, y + 3, w - 6, h - 6, 5);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  if (kind === 'dumbbell') {
    const cx = x + w / 2, cy = y + h / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.28, cy);
    ctx.lineTo(cx + w * 0.28, cy);
    ctx.stroke();
    ctx.fillStyle = color;
    [-1, 1].forEach((s) => {
      rrect(ctx, cx + s * w * 0.28 - 5, cy - h * 0.28, 10, h * 0.56, 3);
      ctx.fill();
    });
  } else {
    ctx.font = `900 ${Math.floor(h * 0.5)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = mix(color, '#ffffff', 0.6);
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  }
  ctx.restore();
};

Paint.neonCity = (ctx, W, H, o) => {
  Paint.skyline(ctx, W, H, o);
  const r = mulberry32(o.seed + 11);
  const signs = [['ジム', 0], ['', 'dumbbell'], ['マッスル', 0], ['24H', 0], ['プロテイン', 0], ['★', 0], ['', 'dumbbell'], ['きんにく', 0]];
  const cols = ['#ff4fd8', '#3ff6ff', '#ffe14a', '#7dff6a'];
  signs.forEach(([text, kind], i) => {
    const x = (i + 0.2 + r() * 0.5) * (W / signs.length);
    const w = kind ? 86 : Math.max(70, text.length * 30 + 20);
    const h = kind ? 50 : 46;
    const y = o.base - o.hMin * 0.6 - r() * (o.hMax - o.hMin) * 0.6;
    Paint.wrap(W, x, w, (xx) => Paint.neonSign(ctx, xx, y, w, h, cols[i % cols.length], text, kind));
  });
};

Paint.rooftops = (ctx, W, H, o) => {
  const r = mulberry32(o.seed);
  let x = 0;
  while (x < W - 10) {
    let w = lerp(120, 260, r());
    if (x + w > W - 10) w = W - x;
    const top = o.base - lerp(0, 70, r());
    ctx.fillStyle = o.body;
    ctx.fillRect(x, top, w, H - top);
    ctx.fillStyle = rgba(o.rim, 0.8);
    ctx.fillRect(x, top, w, 2);
    // まど
    for (let wy = top + 18; wy < H; wy += 26) {
      for (let wx = x + 12; wx < x + w - 24; wx += 30) {
        if (r() < 0.35) {
          ctx.fillStyle = r() < 0.5 ? 'rgba(255,214,120,0.75)' : 'rgba(120,230,255,0.6)';
          ctx.fillRect(wx, wy, 14, 10);
        }
      }
    }
    // やねの うえの もの
    const k = r();
    if (k < 0.35) {
      const tx = x + w * 0.6, ty = top;
      ctx.fillStyle = o.detail;
      ctx.fillRect(tx - 2, ty - 26, 4, 26);
      ctx.fillRect(tx + 30, ty - 26, 4, 26);
      rrect(ctx, tx - 8, ty - 70, 48, 46, 8);
      ctx.fill();
      ctx.fillStyle = rgba(o.rim, 0.6);
      ctx.fillRect(tx - 8, ty - 70, 3, 46);
    } else if (k < 0.65) {
      ctx.fillStyle = o.detail;
      ctx.fillRect(x + 20, top - 18, 40, 18);
      ctx.fillRect(x + 70, top - 12, 26, 12);
    } else {
      ctx.strokeStyle = o.detail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, top);
      ctx.lineTo(x + w * 0.3, top - 60);
      ctx.moveTo(x + w * 0.3 - 14, top - 45);
      ctx.lineTo(x + w * 0.3 + 14, top - 45);
      ctx.stroke();
    }
    x += w + lerp(0, 30, r());
  }
};

/* ---------------- てまえ（ぼかした まえの けしき） ---------------- */
Paint.fgGrass = (ctx, W, H, o) => {
  const r = mulberry32(o.seed);
  for (let i = 0; i < 70; i++) {
    const x = r() * W, h = 40 + r() * 110, lean = (r() - 0.5) * 40;
    Paint.wrap(W, x, 60, (xx) => {
      const g = ctx.createLinearGradient(0, H - h, 0, H);
      g.addColorStop(0, o.mid);
      g.addColorStop(1, o.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xx - 7, H);
      ctx.quadraticCurveTo(xx + lean * 0.3, H - h * 0.6, xx + lean, H - h);
      ctx.quadraticCurveTo(xx + lean * 0.3 + 4, H - h * 0.5, xx + 7, H);
      ctx.fill();
    });
  }
  for (let i = 0; i < 9; i++) {
    const x = r() * W, y = H - 50 - r() * 60;
    Paint.wrap(W, x, 20, (xx) => {
      ctx.fillStyle = o.dark;
      ctx.fillRect(xx - 1.5, y, 3, H - y);
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = o.flower;
        ctx.beginPath();
        ctx.ellipse(xx + Math.cos((k * TAU) / 6) * 8, y + Math.sin((k * TAU) / 6) * 8, 6, 4, (k * TAU) / 6, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(xx, y, 5, 0, TAU);
      ctx.fill();
    });
  }
};

Paint.fgRocks = (ctx, W, H, o) => {
  const r = mulberry32(o.seed);
  for (let i = 0; i < 18; i++) {
    const x = r() * W, w = 50 + r() * 120, h = 30 + r() * 70;
    Paint.wrap(W, x, w, (xx) => {
      const g = ctx.createLinearGradient(xx - w / 2, H - h, xx + w / 2, H);
      g.addColorStop(0, o.light);
      g.addColorStop(1, o.dark);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xx - w / 2, H);
      ctx.quadraticCurveTo(xx - w * 0.45, H - h, xx, H - h);
      ctx.quadraticCurveTo(xx + w * 0.45, H - h * 0.9, xx + w / 2, H);
      ctx.fill();
    });
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * W, h = 20 + r() * 50;
    Paint.wrap(W, x, 30, (xx) => {
      ctx.strokeStyle = o.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xx, H);
      ctx.quadraticCurveTo(xx + 6, H - h * 0.6, xx + 14, H - h);
      ctx.stroke();
    });
  }
};

Paint.fgSnow = (ctx, W, H, o) => {
  const f = periodic(W, o.seed, [[3, 0.6], [7, 0.3], [13, 0.1]]);
  const r = mulberry32(o.seed + 1);
  for (let i = 0; i < 6; i++) {
    const x = r() * W, s = 110 + r() * 60;
    Paint.wrap(W, x, s, (xx) => Paint.pine(ctx, xx, H - 30, s, { trunk: o.dark, light: o.pineL, mid: o.pineM, dark: o.dark }, i, o.light));
  }
  const yAt = (x) => H - 45 - f(x) * 30;
  Paint.profile(ctx, W, H, yAt);
  const g = ctx.createLinearGradient(0, H - 80, 0, H);
  g.addColorStop(0, o.light);
  g.addColorStop(1, o.shade);
  ctx.fillStyle = g;
  ctx.fill();
};

Paint.fgFence = (ctx, W, H, o) => {
  const r = mulberry32(o.seed);
  ctx.fillStyle = o.dark;
  ctx.fillRect(0, H - 80, W, 7);
  ctx.fillRect(0, H - 40, W, 5);
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, H - 86, 6, 86);
  ctx.fillStyle = rgba(o.rim, 0.6);
  ctx.fillRect(0, H - 80, W, 1.5);
  for (let i = 0; i < 8; i++) {
    const x = r() * W, w = 120 + r() * 180, h = 30 + r() * 30;
    Paint.wrap(W, x, w, (xx) => {
      ctx.fillStyle = o.dark;
      rrect(ctx, xx - w / 2, H - h, w, h + 20, 20);
      ctx.fill();
    });
  }
};

/* ---------------- くも ---------------- */
Paint.cloud = (ctx, w, h, seed, c) => {
  const r = mulberry32(seed);
  const puffs = [];
  const n = c.thin ? 9 : 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    puffs.push({
      x: w * (0.14 + 0.72 * t) + (r() - 0.5) * w * 0.06,
      y: h * (c.thin ? 0.62 : 0.6) - Math.sin(t * Math.PI) * h * (c.thin ? 0.12 : 0.24) + (r() - 0.5) * h * 0.08,
      rr: h * (c.thin ? 0.14 + r() * 0.1 : 0.2 + Math.sin(t * Math.PI) * 0.16 + r() * 0.06),
    });
  }
  for (const p of puffs) {
    ctx.fillStyle = c.shade;
    ctx.beginPath();
    ctx.arc(p.x, p.y + p.rr * 0.22, p.rr, 0, TAU);
    ctx.fill();
  }
  for (const p of puffs) {
    const g = ctx.createRadialGradient(p.x - p.rr * 0.3, p.y - p.rr * 0.4, p.rr * 0.1, p.x, p.y, p.rr);
    g.addColorStop(0, c.light);
    g.addColorStop(0.7, c.base);
    g.addColorStop(1, rgba(c.base, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.rr, 0, TAU);
    ctx.fill();
  }
};

/* =========================================================
   テーマ いちらん
   ========================================================= */
const THEMES = {
  meadow: {
    key: 'meadow',
    // デザイン見本に あわせた あかるい くさはら（たいよう・ひかりの すじ なし）
    sky: [[0, '#2ea6f6'], [0.42, '#5cc4f4'], [0.7, '#b6e8f2'], [0.82, '#e2f7e6'], [1, '#e2f7e6']],
    vignette: 0.2,
    depth: 0.1,     // つちの したの ほうの くらさ
    cloud: { light: '#ffffff', base: '#ffffff', shade: '#dcebf6', count: 6, alpha: 1 },
    ambient: 'petals',
    ground: { style: 'grass', capThick: 8, capEdge: '#3c9a2a',capTop: '#9be64f', capBot: '#4fb533', blade: '#5cc43a', bladeDark: '#3d9e2c', soil: '#d99a5d', soil2: '#cc8b50', speck: '#e7b37c', stone: '#f2cc9e', stoneDark: '#c58f58', edge: '#9a5a2e' },
    brick: { style: 'brick', base: '#f2b45a', dark: '#b8712c', light: '#ffdc98', mortar: '#8a5222' },
    plank: { base: '#cf8f50', dark: '#8a5528', light: '#eab67e', top: '#7ed957' },
    wall: { base: '#aab6c6', dark: '#66748a', light: '#dfe7f0', rune: '#5ff0ff', moss: '#6cc24a' },
    block: { top: '#7fe6ff', bot: '#1f86f0', glow: '#7fe8ff', line: '#0b2f7a' },
    slime: { light: '#f3c2ff', base: '#b45cf0', dark: '#5e1f9a' },
    boss: { light: '#ffb0cf', base: '#ea3f80', dark: '#7e0f3c' },
    decor: ['flowers', 'bush', 'flowers', 'mushroom'],
    layers: [
      { f: 0.04, p: 'mountains', o: { seed: 3, base: 470, amp: 120, terms: [[2, 0.6, 1, 0.04], [3, 0.25, 0], [5, 0.1, 0]], lit: '#a6d3ec', shadeTop: '#8fc4e4', shadeBot: '#b0d9ec', shadeA: 0.55, shift: 26, haze: '#dcf4ec', hazeA: 0.65 } },
      { f: 0.1, p: 'mountains', o: { seed: 8, base: 520, amp: 110, terms: [[3, 0.6, 1, 0.05], [5, 0.22, 0], [9, 0.08, 0]], lit: '#7cbde2', shadeTop: '#66aed8', shadeBot: '#8ec8e4', shadeA: 0.6, shift: 24, haze: '#dcf4ec', hazeA: 0.5 } },
      { f: 0.25, p: 'hills', o: { seed: 21, base: 548, amp: 34, terms: [[2, 0.6], [5, 0.3], [9, 0.1]], top: '#b8e48c', bot: '#a6d97c', rim: '#d6f3a8', haze: '#dcf4ec', hazeA: 0.25, trees: { kind: ['lollipop', 'lollipop', 'bush'], count: 22, min: 34, max: 48, c: { light: '#8fdc6a', mid: '#5bb84a', dark: '#3f9a3a', trunk: '#9a6a40' } } } },
      { f: 0.5, p: 'hills', o: { seed: 34, base: 575, amp: 30, terms: [[2, 0.5], [4, 0.35], [7, 0.15]], top: '#9ad66c', bot: '#7cc556', rim: '#c6ee94', trees: { kind: ['lollipop', 'bush', 'lollipop'], count: 10, min: 70, max: 100, c: { light: '#7fd45e', mid: '#46aa3e', dark: '#2f8a34', trunk: '#8a5a32' } }, extras: [['house', 0.12, 74], ['house', 0.62, 64]] } },
    ],
    fg: null,
    music: { id: 'meadow', bpm: 120, root: 60, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], seed: 7 },
  },

  desert: {
    key: 'desert',
    sky: [[0, '#2a1a58'], [0.33, '#6c3a8e'], [0.6, '#e2627a'], [0.84, '#ffa860'], [1, '#ffd696']],
    sunset: { x: 0.62, y: 420, r: 96 },
    cloud: { light: '#ffd8c0', base: '#f6a0a0', shade: '#a9568a', count: 6, alpha: 0.75, thin: true },
    ambient: 'sand',
    birds: true,
    ground: { style: 'sand', capTop: '#ffe6ad', capBot: '#e9b266', soil: '#d4914f', soil2: '#b9743c', speck: '#eaa965', stone: '#a8653a', stoneDark: '#7a4426', edge: '#6a3418' },
    brick: { style: 'carved', base: '#eaa560', dark: '#a8602e', light: '#ffd29c', mortar: '#7a4220' },
    plank: { base: '#b9773f', dark: '#7a4620', light: '#dca06a', top: '#f7d79a' },
    wall: { base: '#d9a066', dark: '#925a30', light: '#f6d2a2', rune: '#ffe14a' },
    block: { top: '#8dffd9', bot: '#0fa09a', glow: '#7affd8', line: '#044a46' },
    slime: { light: '#a8f2ff', base: '#28b0e0', dark: '#0e5a84' },
    boss: { light: '#c2ff96', base: '#4cc23a', dark: '#1a641a' },
    decor: ['cactusS', 'rocks', 'drybush', 'cactusS'],
    layers: [
      { f: 0.04, p: 'mesas', o: { seed: 4, base: 470, amp: 150, terms: [[3, 0.6, 1], [5, 0.4, 0], [9, 0.2, 0]], th: 0.1, k: 5, lit: '#c47592', shade: '#8f4c7e', strata: '#6a2f62', shift: 26, haze: '#ff9e86', hazeA: 0.75 } },
      { f: 0.1, p: 'pyramids', o: { seed: 9, base: 520, amp: 18, terms: [[2, 0.6], [5, 0.4]], list: [[0.18, 120], [0.28, 70], [0.66, 160], [0.78, 90]], lit: '#f2a46a', shade: '#a5584c', top: '#e98e62', bot: '#d47658', haze: '#ffae86', hazeA: 0.55 } },
      { f: 0.26, p: 'dunes', o: { seed: 15, base: 535, amp: 34, terms: [[3, 0.6], [6, 0.3], [11, 0.1]], top: '#f2a865', bot: '#d98a50', rim: '#ffd7a0', shade: '#b86a4a', haze: '#ffb486', hazeA: 0.3, trees: { kind: 'cactus', count: 14, min: 34, max: 56, c: { light: '#9fd47a', mid: '#4f9a4a', dark: '#2a5e34' } } } },
      { f: 0.5, p: 'desertNear', o: { seed: 27, base: 568, amp: 26, terms: [[2, 0.6], [5, 0.4]], spires: 4, lit: '#e98a54', mid: '#c0623a', shade: '#7e3426', top: '#d8854c', bot: '#b0603a', rim: '#ffc58a', trees: { kind: 'cactus', count: 7, min: 80, max: 130, c: { light: '#8fd06a', mid: '#3d8a40', dark: '#1e4e2a' } } } },
    ],
    fg: { f: 1.35, p: 'fgRocks', h: 150, o: { seed: 6, light: '#5a2a2a', dark: '#2a1018' } },
    music: { id: 'desert', bpm: 110, root: 62, prog: [[0, 4, 7], [5, 9, 12], [9, 12, 16], [7, 11, 14]], seed: 19 },
  },

  snow: {
    key: 'snow',
    sky: [[0, '#0c1d48'], [0.4, '#1f4a8a'], [0.75, '#679fd4'], [1, '#d9eeff']],
    aurora: true,
    stars: 0.55,
    cloud: { light: '#f2f8ff', base: '#cadcf0', shade: '#8aa6c8', count: 4, alpha: 0.65 },
    ambient: 'snow',
    ground: { style: 'snow', capTop: '#ffffff', capBot: '#d2e6fa', soil: '#5f7fa2', soil2: '#4a6688', speck: '#88a6c4', stone: '#a6bed6', stoneDark: '#3e5674', edge: '#2a3e58' },
    brick: { style: 'ice', base: '#a8dcff', dark: '#4a92cc', light: '#eaf8ff', mortar: '#3a78b0' },
    plank: { base: '#8f6a52', dark: '#5a3e2e', light: '#b48e72', top: '#ffffff' },
    wall: { base: '#a4b8cf', dark: '#5a7090', light: '#e2edf8', rune: '#ff7af0' },
    block: { top: '#ffb8f6', bot: '#9636f0', glow: '#ff9cf5', line: '#3b0f6a' },
    slime: { light: '#ffb8a6', base: '#f0503a', dark: '#841c10' },
    boss: { light: '#a6f8ff', base: '#1fb2d0', dark: '#0a546a' },
    decor: ['snowman', 'pineS', 'crystal', 'pineS'],
    layers: [
      { f: 0.04, p: 'mountains', o: { seed: 12, base: 430, amp: 170, terms: [[2, 0.5, 1], [4, 0.35, 1], [9, 0.15, 1]], lit: '#f4f9ff', shadeTop: '#8fa8cf', shadeBot: '#b9cde6', shift: 30, snow: '#ffffff', snowLine: 420, haze: '#cfe4f7', hazeA: 0.85 } },
      { f: 0.11, p: 'mountains', o: { seed: 17, base: 480, amp: 110, terms: [[3, 0.55, 1], [6, 0.3, 1], [13, 0.15, 0]], lit: '#dfeaf7', shadeTop: '#7390bb', shadeBot: '#9fb8d8', shift: 24, snow: '#ffffff', snowLine: 430, haze: '#cfe4f7', hazeA: 0.65 } },
      { f: 0.26, p: 'hills', o: { seed: 23, base: 520, amp: 36, terms: [[3, 0.6], [5, 0.3], [9, 0.1]], top: '#e8f2fc', bot: '#b6cce4', rim: '#ffffff', haze: '#cfe4f7', hazeA: 0.35, trees: { kind: 'pine', count: 40, min: 34, max: 56, c: { light: '#6f9fae', mid: '#4b7a8e', dark: '#2f5468', trunk: '#3a3a4a', snow: '#f4faff' } } } },
      { f: 0.5, p: 'hills', o: { seed: 38, base: 562, amp: 32, terms: [[2, 0.5], [4, 0.35], [7, 0.15]], top: '#ffffff', bot: '#c6daf0', rim: '#ffffff', rimW: 2, trees: { kind: 'pine', count: 13, min: 90, max: 150, c: { light: '#3f8a7a', mid: '#2a6660', dark: '#173f44', trunk: '#4a3428', snow: '#ffffff' } } } },
    ],
    fg: { f: 1.35, p: 'fgSnow', h: 190, o: { seed: 4, light: '#f4faff', shade: '#a8c4e2', dark: '#16364a', pineL: '#2f6466', pineM: '#1f4a50' } },
    music: { id: 'snow', bpm: 112, root: 65, prog: [[5, 9, 12], [7, 11, 14], [4, 7, 11], [9, 12, 16]], seed: 23 },
  },

  night: {
    key: 'night',
    sky: [[0, '#05061e'], [0.45, '#160f44'], [0.78, '#3a1868'], [1, '#7a2f78']],
    moon: { x: 0.8, y: 135, r: 52 },
    stars: 1,
    cloud: { light: '#7a62b0', base: '#3f2c70', shade: '#22164a', count: 4, alpha: 0.5, thin: true },
    ambient: 'neon',
    ground: { style: 'metal', capTop: '#6a70a0', capBot: '#2e3160', neon: '#3ff6ff', soil: '#26244c', soil2: '#1b1a3a', speck: '#36345f', stone: '#3f3d72', stoneDark: '#14132c', edge: '#0c0b20' },
    brick: { style: 'tech', base: '#3d2f86', dark: '#1c1450', light: '#6c5ccc', mortar: '#ff4fd8' },
    plank: { base: '#4a4f7a', dark: '#24274a', light: '#8a90c0', top: '#ff4fd8' },
    wall: { base: '#4c527e', dark: '#232648', light: '#8f96c6', rune: '#3ff6ff' },
    block: { top: '#ffd76e', bot: '#ff4f8e', glow: '#ff9ad0', line: '#5a0a3a' },
    slime: { light: '#d6ffa0', base: '#66de38', dark: '#25721a' },
    boss: { light: '#cfa8ff', base: '#7a3af0', dark: '#2c0c78' },
    decor: ['lamp', 'cone', 'bench', 'lamp'],
    layers: [
      { f: 0.03, p: 'skyline', o: { seed: 2, base: 520, wMin: 40, wMax: 90, hMin: 60, hMax: 230, top: '#2a1f5e', bot: '#3a2368', win: ['#8a7ad8', '#c08ad8'], winW: 3, winH: 4, winGap: 7, winGapX: 6, winP: 0.25, haze: '#5a2a7a', hazeA: 0.8 } },
      { f: 0.1, p: 'skyline', o: { seed: 5, base: 545, wMin: 60, wMax: 130, hMin: 90, hMax: 300, top: '#1e1648', bot: '#2c1a56', rim: '#8a6ad8', win: ['#ffd27a', '#7ae8ff', '#ff9ad8'], winW: 5, winH: 6, winGap: 9, winGapX: 7, winP: 0.3, haze: '#4a1f6e', hazeA: 0.6 } },
      { f: 0.24, p: 'neonCity', o: { seed: 9, base: 560, wMin: 90, wMax: 170, hMin: 120, hMax: 330, top: '#160f36', bot: '#1e1240', rim: '#b07aff', win: ['#ffe08a', '#8af0ff'], winW: 8, winH: 10, winGap: 12, winGapX: 9, winP: 0.22, haze: '#3a1660', hazeA: 0.35 } },
      { f: 0.5, p: 'rooftops', o: { seed: 13, base: 540, body: '#0f0a26', detail: '#0b071c', rim: '#c27aff' } },
    ],
    fg: { f: 1.35, p: 'fgFence', h: 150, o: { seed: 3, dark: '#05030f', rim: '#ff4fd8' } },
    music: { id: 'night', bpm: 126, root: 58, prog: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], seed: 31 },
  },
};

// ステージの ちけい・はいけい だけを きめる（けいさんの しゅるいは quiz.js の STAGE_MIX、かずの はんいは LEVELS）
const STAGES = [
  { theme: 'meadow', name: 'あさの くさはら', mark: '＋', enemyRate: 0.35, pitMax: 2 },
  { theme: 'desert', name: 'ゆうやけ さばく', mark: '－', enemyRate: 0.45, pitMax: 2 },
  { theme: 'snow', name: 'オーロラの ゆきやま', mark: '＋－', enemyRate: 0.5, pitMax: 3 },
  { theme: 'night', name: 'よぞらの ネオンシティ', mark: '－＋', enemyRate: 0.6, pitMax: 3 },
];
