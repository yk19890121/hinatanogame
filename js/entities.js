'use strict';
/* =========================================================
   キャラクター・アイテム・エフェクト
   ========================================================= */

function drawShadow(ctx, x, y, w, a) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, TAU);
  ctx.fill();
}

/* ---------------- エフェクト ---------------- */
class FX {
  constructor() {
    this.list = [];
    this.texts = [];
    this.dustColor = '#ffffff';
  }
  add(p) {
    if (this.list.length < 800) this.list.push(p);
    return p;
  }
  dust(x, y, n, dir) {
    for (let i = 0; i < n; i++) {
      const l = rand(0.35, 0.6);
      this.add({ type: 'dust', x: x + rand(-14, 14), y: y - rand(0, 6), vx: dir * rand(30, 110) + rand(-50, 50), vy: -rand(20, 80), life: l, max: l, size: rand(5, 10), grow: 16, color: this.dustColor, g: -30 });
    }
  }
  sparkle(x, y, n, color, spd = 260) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(spd * 0.3, spd), l = rand(0.4, 0.8);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: rand(3, 6), color, g: 200, drag: 2.5 });
    }
  }
  confetti(x, y, n, spread = 1) {
    const cols = ['#ff4f6a', '#ffd23f', '#3fd4ff', '#7dff6a', '#ff8af0', '#ffffff', '#ff9a2a'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.1, 1.1) * spread, s = rand(350, 850), l = rand(1.4, 2.4);
      this.add({ type: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, max: l, size: rand(6, 11), color: pick(cols), g: 900, drag: 1.8, rot: rand(0, TAU), vr: rand(-12, 12) });
    }
  }
  rocks(x, y, w, h, cols, n) {
    for (let i = 0; i < n; i++) {
      const l = rand(1.2, 2);
      this.add({ type: 'rock', x: x + rand(0, w), y: y + rand(0, h), vx: rand(-200, 520), vy: rand(-700, -100), life: l, max: l, size: rand(8, 20), color: pick(cols), g: 1800, rot: rand(0, TAU), vr: rand(-10, 10), sides: randInt(4, 6) });
    }
  }
  stars(x, y, n, color = '#ffe14a') {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.2, 0.2), s = rand(180, 320), l = 0.6;
      this.add({ type: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: l, max: l, size: rand(7, 11), color, g: 700, rot: rand(0, TAU), vr: rand(-8, 8) });
    }
  }
  ring(x, y, color, r0, r1, life = 0.45, width = 8) {
    this.add({ type: 'ring', x, y, r0, r1, life, max: life, color, width, vx: 0, vy: 0, g: 0 });
  }
  flash(x, y, color, size, life = 0.3) {
    this.add({ type: 'flash', x, y, size, life, max: life, color, vx: 0, vy: 0, g: 0 });
  }
  text(str, x, y, o = {}) {
    this.texts.push({ str, x, y, life: o.life || 1.3, max: o.life || 1.3, size: o.size || 40, top: o.top || '#fff7a0', bot: o.bot || '#ff9a1a', stroke: o.stroke || '#3a1600', vy: o.vy == null ? -50 : o.vy });
  }
  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) {
        L[i] = L[L.length - 1];
        L.pop();
        continue;
      }
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.grow) p.size += p.grow * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = p.life / p.max;
      if (p.type === 'dust') {
        ctx.globalAlpha = k * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.type === 'confetti') {
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 2.3));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        ctx.restore();
      } else if (p.type === 'rock') {
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (let i = 0; i < p.sides; i++) {
          const a = (i / p.sides) * TAU, r = p.size * (0.7 + ((i * 37) % 5) * 0.08);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-p.size * 0.4, -p.size * 0.5, p.size * 0.5, p.size * 0.25);
        ctx.restore();
      } else if (p.type === 'star') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        starPath(ctx, p.x, p.y, p.size, p.size * 0.45, 5, p.rot);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const k = p.life / p.max;
      if (p.type === 'spark') {
        ctx.globalAlpha = k;
        const s = p.size * 4;
        ctx.drawImage(Assets.glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.7, p.size * 0.7);
      } else if (p.type === 'ring') {
        const t = 1 - k;
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * k + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, lerp(p.r0, p.r1, Ease.outCubic(t)), 0, TAU);
        ctx.stroke();
      } else if (p.type === 'flash') {
        ctx.globalAlpha = k;
        const s = p.size * (1.4 - k * 0.4);
        ctx.drawImage(Assets.glow(p.color), p.x - s, p.y - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  drawTexts(ctx) {
    for (const t of this.texts) {
      const age = (t.max - t.life) / t.max;
      const p = Math.min(1, age / 0.14);
      const s = p < 1 ? Ease.outBack(p) : 1;
      ctx.globalAlpha = t.life < 0.3 ? t.life / 0.3 : 1;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(s, s);
      const g = ctx.createLinearGradient(0, -t.size / 2, 0, t.size / 2);
      g.addColorStop(0, t.top);
      g.addColorStop(1, t.bot);
      outlinedText(ctx, t.str, 0, 0, t.size, g, t.stroke, 0.24);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------------- スライム（てき） ---------------- */
function blobPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, -h * 0.1);
  ctx.bezierCurveTo(-w * 0.53, -h * 0.75, -w * 0.28, -h, 0, -h);
  ctx.bezierCurveTo(w * 0.28, -h, w * 0.53, -h * 0.75, w * 0.5, -h * 0.1);
  ctx.quadraticCurveTo(w * 0.5, 0, w * 0.36, 0);
  ctx.lineTo(-w * 0.36, 0);
  ctx.quadraticCurveTo(-w * 0.5, 0, -w * 0.5, -h * 0.1);
  ctx.closePath();
}

function drawBlob(ctx, x, y, w, h, c, t, o) {
  const wob = Math.sin(t * 7 + (o.phase || 0));
  let sx = 1 + wob * 0.05, sy = 1 - wob * 0.05;
  if (o.flat) {
    sx = 1 + o.flat * 0.5;
    sy = 1 - o.flat * 0.72;
  }
  if (o.sq) {
    sx *= 1 + o.sq * 0.25;
    sy *= 1 - o.sq * 0.25;
  }
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) {
    ctx.translate(0, -h / 2);
    ctx.rotate(o.rot);
    ctx.translate(0, h / 2);
  }
  ctx.scale(sx, sy);
  blobPath(ctx, w, h);
  const g = ctx.createRadialGradient(-w * 0.15, -h * 0.72, w * 0.05, 0, -h * 0.4, w * 0.62);
  g.addColorStop(0, c.light);
  g.addColorStop(0.5, c.base);
  g.addColorStop(1, c.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = Math.max(2.2, w * 0.035);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.12, w * 0.36, h * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.2, -h * 0.74, w * 0.12, h * 0.075, -0.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-w * 0.04, -h * 0.84, w * 0.028, 0, TAU);
  ctx.fill();
  // め
  const ex = (o.dir || 0) * w * 0.07;
  const ink = '#1a1020';
  for (const s of [-1, 1]) {
    const cx = ex + s * w * 0.17, cy = -h * 0.52;
    if (o.dead) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = w * 0.04;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.06, cy - h * 0.06);
      ctx.lineTo(cx + w * 0.06, cy + h * 0.06);
      ctx.moveTo(cx + w * 0.06, cy - h * 0.06);
      ctx.lineTo(cx - w * 0.06, cy + h * 0.06);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.105, h * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(c.dark, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.ellipse(cx + (o.dir || 0) * w * 0.035, cy + h * 0.02, w * 0.06, h * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + (o.dir || 0) * w * 0.035 + w * 0.02, cy - h * 0.03, w * 0.022, 0, TAU);
    ctx.fill();
  }
  if (o.angry) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = w * 0.035;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.3, -h * 0.74);
    ctx.lineTo(ex - w * 0.08, -h * 0.66);
    ctx.moveTo(ex + w * 0.3, -h * 0.74);
    ctx.lineTo(ex + w * 0.08, -h * 0.66);
    ctx.stroke();
  }
  // くち
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.8, w * 0.03);
  ctx.beginPath();
  if (o.angry) {
    ctx.moveTo(ex - w * 0.12, -h * 0.3);
    ctx.quadraticCurveTo(ex, -h * 0.22, ex + w * 0.12, -h * 0.3);
    ctx.lineTo(ex - w * 0.12, -h * 0.3);
    ctx.fillStyle = '#5a0a1a';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(ex - w * 0.08, -h * 0.3);
    ctx.lineTo(ex - w * 0.05, -h * 0.26);
    ctx.lineTo(ex - w * 0.02, -h * 0.3);
    ctx.moveTo(ex + w * 0.08, -h * 0.3);
    ctx.lineTo(ex + w * 0.05, -h * 0.26);
    ctx.lineTo(ex + w * 0.02, -h * 0.3);
    ctx.fill();
  } else {
    ctx.arc(ex, -h * 0.34, w * 0.07, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (o.flash > 0) {
    ctx.globalAlpha = o.flash;
    blobPath(ctx, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

class Slime {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.home = x; // もんだいの ばしょへ はいりこまないように うろうろ する はんい
    this.w = 46;
    this.h = 38;
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.dead = false;
    this.deathT = 0;
    this.launched = false;
    this.rot = 0;
    this.phase = Math.random() * TAU;
    this.onGround = false;
    this.sq = 0;
  }
  update(dt, game) {
    if (this.dead) {
      this.deathT += dt;
      if (this.launched) {
        this.vy += 2000 * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rot += 14 * dt;
      }
      return;
    }
    if (Math.abs(this.x - game.camX - game.viewW / 2) > game.viewW) return;
    this.vx = this.dir * 58;
    this.vy = Math.min(this.vy + 2400 * dt, 1200);
    const pb = this.y, pt = this.y - this.h;
    if (Physics.moveX(this, this.vx * dt, game.level, game.enemySolids)) this.dir *= -1;
    if ((this.x - this.home) * this.dir > 150) this.dir *= -1;
    Physics.moveY(this, this.vy * dt, game.level, game.enemySolids, pb, pt);
    if (this.onGround) {
      const fx = this.x + this.dir * (this.w / 2 + 3);
      if (!Physics.standable(game.level, Math.floor(fx / T), Math.floor((this.y + 2) / T))) this.dir *= -1;
    }
    this.sq = damp(this.sq, 0, 8, dt);
    if (this.y > VIEW_H + 200) this.dead = true;
  }
  get gone() { return this.dead && (this.deathT > 0.6 || this.y > VIEW_H + 300); }
  draw(ctx, t, c) {
    if (this.gone) return;
    if (!this.launched) drawShadow(ctx, this.x, this.y, this.w * 0.5, 0.22);
    const a = this.dead && !this.launched ? Math.max(0, 1 - this.deathT / 0.6) : 1;
    ctx.globalAlpha = a;
    drawBlob(ctx, this.x, this.y, this.w, this.h, c, t, { dir: this.dir, phase: this.phase, flat: this.dead && !this.launched ? 1 : 0, rot: this.rot, dead: this.dead, sq: this.sq });
    ctx.globalAlpha = 1;
  }
}

/* ---------------- ボス ---------------- */
class Boss {
  constructor(gate) {
    this.gate = gate;
    this.x = gate.x + gate.w / 2;
    this.y = GROUND_Y;
    this.w = 280;
    this.h = 256; // スプライトの みための おおきさ（BOSS_SPRITE_S と あわせる）
    this.hp = 3;
    this.maxHp = 3;
    this.flash = 0;
    this.sq = 0;
    this.hopT = 1.5;
    this.hopY = 0;
    this.hopV = 0;
    this.dead = false;
    this.deadT = 0;
    this.say = 0;
    this.sAnim = 'idle';
    this.sT = 0;
  }
  play(name) {
    this.sAnim = name;
    this.sT = 0;
  }
  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt * 3);
    this.sq = damp(this.sq, 0, 6, dt);
    this.sT += dt;
    if (this.dead) {
      this.deadT += dt;
      return;
    }
    const busy = this.sAnim === 'hurt' || this.sAnim === 'roar';
    if (busy && Sprites.done(BOSS_ANIM[this.sAnim], this.sT)) this.play('idle');
    this.hopT -= dt;
    if (this.hopT <= 0 && this.hopY === 0 && !busy) {
      this.hopV = -520;
      this.hopT = 2.2 + Math.random() * 1.5;
      this.play('hop');
    }
    if (this.hopV !== 0 || this.hopY < 0) {
      this.hopV += 2200 * dt;
      this.hopY += this.hopV * dt;
      if (this.hopY >= 0) {
        this.hopY = 0;
        this.hopV = 0;
        this.sq = 0.8;
        game.shake = Math.max(game.shake, 6);
        game.fx.dust(this.x - 80, this.y, 5, -1);
        game.fx.dust(this.x + 80, this.y, 5, 1);
        Sound.play('land');
        if (this.sAnim === 'hop') this.play('idle');
      }
    }
  }
  draw(ctx, t, c, heroX) {
    if (Sprites.ready) {
      this.drawSprite(ctx, t);
      return;
    }
    if (this.dead && this.deadT > 0.5) return;
    const a = this.dead ? 1 - this.deadT / 0.5 : 1;
    ctx.globalAlpha = a;
    drawShadow(ctx, this.x, this.y, this.w * 0.48 * (1 + this.hopY / 600), 0.28);
    const dir = heroX < this.x ? -1 : 1;
    const y = this.y + this.hopY;
    const s = this.dead ? 1 + this.deadT * 1.5 : 1;
    ctx.save();
    ctx.translate(this.x, y);
    ctx.scale(s, s);
    drawBlob(ctx, 0, 0, this.w, this.h, c, t * 0.7, { dir, angry: true, flash: this.flash, sq: this.sq, dead: this.dead });
    // おうかん
    const cy = -this.h * (1 - this.sq * 0.2) - 6 + Math.sin(t * 3) * 2;
    ctx.save();
    ctx.translate(dir * 8, cy);
    ctx.rotate(dir * 0.08);
    ctx.beginPath();
    ctx.moveTo(-40, 6);
    ctx.lineTo(-46, -30);
    ctx.lineTo(-22, -12);
    ctx.lineTo(0, -42);
    ctx.lineTo(22, -12);
    ctx.lineTo(46, -30);
    ctx.lineTo(40, 6);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -42, 0, 6);
    g.addColorStop(0, '#fff6a0');
    g.addColorStop(0.5, '#ffc928');
    g.addColorStop(1, '#b8740a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#5a3400';
    ctx.lineWidth = 3;
    ctx.stroke();
    [[-46, -30, '#ff3b6a'], [0, -42, '#3fd4ff'], [46, -30, '#7dff6a'], [0, -8, '#ff3b6a']].forEach(([x, yy, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, yy, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(x - 2, yy - 2, 2, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
    ctx.restore();
    ctx.globalAlpha = 1;
    // HP
    if (!this.dead) {
      for (let i = 0; i < this.maxHp; i++) {
        const hx = this.x + (i - (this.maxHp - 1) / 2) * 40, hy = y - this.h - 74;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        heartPath(ctx, hx + 2, hy + 3, 34);
        ctx.fill();
        ctx.fillStyle = i < this.hp ? '#ff3b5c' : '#5a4a60';
        heartPath(ctx, hx, hy, 34);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }
  drawSprite(ctx, t) {
    // たおされたら しぼむ コマを ながしてから きえる
    const fade = this.dead ? clamp(1 - (this.deadT - 1.1) / 0.4, 0, 1) : 1;
    if (fade <= 0) return;
    const anim = BOSS_ANIM[this.dead ? 'down' : this.sAnim] || BOSS_ANIM.idle;
    const frame = Sprites.frameAt(anim, this.dead ? this.deadT : this.sT);
    const y = this.y + this.hopY;
    ctx.save();
    ctx.globalAlpha = fade;
    drawShadow(ctx, this.x, this.y, 136 * (1 + this.hopY / 600), 0.28);
    // ヒーロー（ひだり）の ほうを むく
    Sprites.draw(ctx, 'boss', frame, this.x, y, BOSS_SPRITE_S, true, null);
    if (this.flash > 0) Sprites.draw(ctx, 'boss', frame, this.x, y, BOSS_SPRITE_S, true, 'white', this.flash);
    ctx.restore();
    if (this.dead) return;
    for (let i = 0; i < this.maxHp; i++) {
      const hx = this.x + (i - (this.maxHp - 1) / 2) * 44, hy = y - this.h - 34;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      heartPath(ctx, hx + 2, hy + 3, 38);
      ctx.fill();
      ctx.fillStyle = i < this.hp ? '#ff3b5c' : '#5a4a60';
      heartPath(ctx, hx, hy, 38);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

/* ---------------- こたえの ブロック ---------------- */
class AnswerBlock {
  constructor(x, y, gate) {
    this.x = x;
    this.y = y;
    this.w = BLOCK;
    this.h = BLOCK;
    this.gate = gate;
    this.value = null;
    this.state = 'idle';
    this.bump = 0;
    this.pop = 1;
    this.shake = 0;
    this.phase = Math.random() * TAU;
  }
  get solid() { return this.state !== 'gone'; }
  update(dt) {
    this.bump = Math.max(0, this.bump - dt * 4);
    this.shake = Math.max(0, this.shake - dt);
    this.pop = Math.min(1, this.pop + dt * 2.8);
  }
  draw(ctx, t, th) {
    if (this.state === 'gone') return;
    const c = th.block;
    const bob = this.state === 'idle' ? Math.sin(t * 2.6 + this.phase) * 3 : 0;
    const bump = -Math.sin(this.bump * Math.PI) * 14;
    const sh = this.shake > 0 ? Math.sin(this.shake * 60) * 5 * this.shake : 0;
    const s = Ease.outBack(this.pop);
    const cx = this.x + this.w / 2 + sh, cy = this.y + this.h / 2 + bob + bump;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s * this.w / T, s * this.h / T); // 64マスの えを ブロックの おおきさに
    const wrong = this.state === 'wrong';
    if (!wrong) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(t * 4 + this.phase) * 0.15;
      ctx.drawImage(Assets.glow(c.glow), -70, -70, 140, 140);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rrect(ctx, -29, -25, 60, 60, 13);
    ctx.fill();
    const g = ctx.createLinearGradient(0, -30, 0, 30);
    if (wrong) {
      g.addColorStop(0, '#b4b9c4');
      g.addColorStop(1, '#666c7a');
    } else {
      g.addColorStop(0, c.top);
      g.addColorStop(1, c.bot);
    }
    ctx.fillStyle = g;
    rrect(ctx, -30, -30, 60, 60, 13);
    ctx.fill();
    ctx.strokeStyle = wrong ? '#3a3e48' : c.line;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2.5;
    rrect(ctx, -25, -25, 50, 50, 10);
    ctx.stroke();
    if (!wrong) {
      // ひかりの すじ
      ctx.save();
      rrect(ctx, -30, -30, 60, 60, 13);
      ctx.clip();
      const sweep = ((t * 0.6 + this.phase) % 2.2) - 0.6;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(-30 + sweep * 80, -30);
      ctx.lineTo(-10 + sweep * 80, -30);
      ctx.lineTo(-40 + sweep * 80, 30);
      ctx.lineTo(-60 + sweep * 80, 30);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(-12, -17, 11, 5, -0.3, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(40,40,50,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -30);
      ctx.lineTo(-6, -12);
      ctx.lineTo(-14, 4);
      ctx.moveTo(30, -6);
      ctx.lineTo(14, 2);
      ctx.lineTo(18, 18);
      ctx.stroke();
    }
    const label = this.value == null ? '？' : String(this.value);
    outlinedText(ctx, label, 0, 2, label.length > 2 ? 26 : label.length > 1 ? 34 : 40, wrong ? '#d9dce4' : '#ffffff', wrong ? '#3a3e48' : c.line, 0.24);
    ctx.restore();
    // はじめての ときは「したから ジャンプ」の やじるし
    if (this.gate.hint && this.gate.active && this.state === 'idle') {
      const ay = this.y + this.h + 32 + Math.sin(t * 7) * 8;
      ctx.save();
      ctx.translate(this.x + this.w / 2, ay);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1a2a6a';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 2);
      ctx.lineTo(6, 2);
      ctx.lineTo(6, 18);
      ctx.lineTo(-6, 18);
      ctx.lineTo(-6, 2);
      ctx.lineTo(-16, 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ---------------- いしの かべ / ボスの とおせんぼ ---------------- */
class Gate {
  constructor(x, kind, triggerX) {
    this.kind = kind;
    this.x = x;
    this.w = kind === 'boss' ? 200 : 72;
    this.y = -600;
    this.h = GROUND_Y + 600;
    this.state = 'locked';
    this.active = false;
    this.triggerX = triggerX;
    this.blocks = [];
    this.quiz = null;
    this.firstTry = true;
    this.shake = 0;
    this.boss = null;
  }
  get solid() { return this.state === 'locked'; }
  update(dt) { this.shake = Math.max(0, this.shake - dt); }
  draw(ctx, t, th, A) {
    if (this.kind !== 'wall' || this.state !== 'locked') return;
    const sh = this.shake > 0 ? Math.sin(this.shake * 70) * 6 * this.shake : 0;
    const x = this.x - 12 + sh, top = GROUND_Y - Assets.WALL_H;
    ctx.drawImage(A.wall, x, top, Assets.WALL_W, Assets.WALL_H);
    // もんしょう
    const cx = x + 48, cy = GROUND_Y - 194;
    const pulse = 0.6 + Math.sin(t * 3) * 0.25;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pulse;
    ctx.drawImage(Assets.glow(th.wall.rune), cx - 60, cy - 60, 120, 120);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const mark = this.active && this.quiz ? Quiz.opMark(this.quiz.op) : '？';
    outlinedText(ctx, mark, cx, cy + 2, 40, '#ffffff', mix(th.wall.rune, '#000000', 0.6), 0.22);
  }
}

/* ---------------- アイテム ---------------- */
function drawDumbbell(ctx, x, y, t, phase, scale = 1) {
  const spin = Math.cos(t * 3 + phase);
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3.2 + phase) * 3);
  ctx.scale(scale, scale);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  ctx.drawImage(Assets.glow('#ffd86a'), -32, -32, 64, 64);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.scale(0.35 + Math.abs(spin) * 0.65, 1);
  const bar = ctx.createLinearGradient(0, -3, 0, 3);
  bar.addColorStop(0, '#f2f4fa');
  bar.addColorStop(1, '#7a8094');
  ctx.fillStyle = bar;
  ctx.fillRect(-14, -3, 28, 6);
  for (const s of [-1, 1]) {
    const g = ctx.createLinearGradient(0, -13, 0, 13);
    g.addColorStop(0, '#6a6f86');
    g.addColorStop(0.3, '#3a3e52');
    g.addColorStop(1, '#14161f');
    ctx.fillStyle = g;
    rrect(ctx, s * 13 - 5, -13, 10, 26, 4);
    ctx.fill();
    rrect(ctx, s * 20 - 3.5, -9, 7, 18, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(s * 13 - 3, -11, 2, 20);
  }
  ctx.restore();
}

function drawProtein(ctx, x, y, t) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 3);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45;
  ctx.drawImage(Assets.glow('#ff7aa8'), -38, -38, 76, 76);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(-13, 0, 13, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#bcd4f0');
  ctx.fillStyle = g;
  rrect(ctx, -13, -14, 26, 32, 7);
  ctx.fill();
  ctx.strokeStyle = '#2a3a6a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2f5bd0';
  rrect(ctx, -11, -22, 22, 10, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff3b5c';
  heartPath(ctx, 0, 3, 18);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-9, -10, 3, 22);
  ctx.restore();
}

class Spring {
  constructor(x) {
    this.x = x;
    this.y = GROUND_Y;
    this.w = 56;
    this.comp = 0;
  }
  get top() { return this.y - 30 + this.comp * 12; }
  update(dt) { this.comp = damp(this.comp, 0, 9, dt); }
  draw(ctx, t) {
    const x = this.x, y = this.y, top = this.top;
    drawShadow(ctx, x, y, 30, 0.2);
    ctx.fillStyle = '#3a3e52';
    rrect(ctx, x - 26, y - 8, 52, 8, 3);
    ctx.fill();
    ctx.strokeStyle = '#c9d0e0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const n = 4, hh = y - 8 - (top + 8);
    for (let i = 0; i <= n * 2; i++) ctx.lineTo(x + (i % 2 ? 16 : -16), y - 8 - (hh * i) / (n * 2));
    ctx.stroke();
    const g = ctx.createLinearGradient(0, top - 6, 0, top + 8);
    g.addColorStop(0, '#ff8a8a');
    g.addColorStop(1, '#c81e2a');
    ctx.fillStyle = g;
    rrect(ctx, x - 30, top - 4, 60, 14, 7);
    ctx.fill();
    ctx.strokeStyle = '#5a0a10';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - 22, top - 1, 30, 3);
  }
}

class Projectile {
  constructor(x, y, target, onHit) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.onHit = onHit;
    this.vx = 300;
    this.done = false;
    this.t = 0;
  }
  update(dt, game) {
    this.t += dt;
    this.vx = Math.min(2200, this.vx + 6000 * dt);
    this.x += this.vx * dt;
    if (Math.random() < 0.9) game.fx.add({ type: 'spark', x: this.x - 20, y: this.y + rand(-14, 14), vx: -rand(100, 300), vy: rand(-60, 60), life: 0.35, max: 0.35, size: rand(4, 7), color: '#ffcf3a', g: 0 });
    if (this.x >= this.target) {
      this.done = true;
      this.onHit(this.x, this.y);
    }
  }
  draw(ctx, t) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(Assets.glow('#ffb43a'), -70, -70, 140, 140);
    ctx.globalCompositeOperation = 'source-over';
    // こぶし
    const pal = PAL.gold;
    ball(ctx, 0, 0, 24, pal, 3);
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(10, i * 9 - 3);
      ctx.quadraticCurveTo(22, i * 9, 10, i * 9 + 4);
      ctx.stroke();
    }
    limb(ctx, -40, 0, -14, 0, 14, 16, 0, 0, 0.5, { light: '#fff3a0', base: '#ffd23f', dark: '#c48a00', line: '#5a3a00' }, 2.5);
    ctx.restore();
  }
}

function drawGoal(ctx, g, t, A) {
  const x = g.x, y = GROUND_Y;
  ctx.drawImage(A.podium, x - 96, y - 120, 192, 120);
  // はた
  const px = x + 110;
  ctx.fillStyle = '#e8ecf4';
  ctx.fillRect(px - 3, y - 300, 6, 300);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(px, y - 304, 8, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + 3, y - 292);
  for (let i = 0; i <= 10; i++) {
    const fx = px + 3 + i * 9;
    ctx.lineTo(fx, y - 292 + Math.sin(t * 6 - i * 0.6) * 5 * (i / 10));
  }
  for (let i = 10; i >= 0; i--) {
    const fx = px + 3 + i * 9;
    ctx.lineTo(fx, y - 236 + Math.sin(t * 6 - i * 0.6) * 5 * (i / 10));
  }
  ctx.closePath();
  const fg = ctx.createLinearGradient(px, 0, px + 93, 0);
  fg.addColorStop(0, '#ff3b5c');
  fg.addColorStop(1, '#ff8a3a');
  ctx.fillStyle = fg;
  ctx.fill();
  drawDumbbell(ctx, px + 46, y - 264 + Math.sin(t * 6 - 3) * 2.5, 0, 0, 0.9);
  // トロフィー
  const ty = y - 120 - 4 + Math.sin(t * 2) * 3;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.6 + Math.sin(t * 3) * 0.2;
  ctx.drawImage(Assets.glow('#ffe58a'), x - 90, ty - 140, 180, 180);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const gg = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
  gg.addColorStop(0, '#fff6b0');
  gg.addColorStop(0.45, '#ffcc2a');
  gg.addColorStop(1, '#b4700a');
  ctx.fillStyle = gg;
  ctx.strokeStyle = '#5a3400';
  ctx.lineWidth = 3;
  rrect(ctx, x - 24, ty - 14, 48, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 6, ty - 34, 12, 22);
  ctx.beginPath();
  ctx.moveTo(x - 34, ty - 92);
  ctx.lineTo(x + 34, ty - 92);
  ctx.quadraticCurveTo(x + 32, ty - 36, x, ty - 32);
  ctx.quadraticCurveTo(x - 32, ty - 36, x - 34, ty - 92);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#d99a14';
  ctx.beginPath();
  ctx.arc(x - 34, ty - 72, 14, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + 34, ty - 72, 14, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(x - 22, ty - 86, 6, 36);
  ctx.fillStyle = '#ff3b5c';
  starPath(ctx, x, ty - 64, 12, 5, 5);
  ctx.fill();
}

function drawSign(ctx, s, t) {
  const x = s.x, y = GROUND_Y;
  ctx.fillStyle = '#7a4a28';
  ctx.fillRect(x - 4, y - 90, 8, 90);
  const g = ctx.createLinearGradient(0, y - 130, 0, y - 76);
  g.addColorStop(0, '#f2c486');
  g.addColorStop(1, '#c08848');
  ctx.fillStyle = g;
  rrect(ctx, x - 70, y - 132, 140, 56, 10);
  ctx.fill();
  ctx.strokeStyle = '#5a3418';
  ctx.lineWidth = 3;
  ctx.stroke();
  outlinedText(ctx, s.text, x, y - 103, 22, '#ffffff', '#5a3418', 0.3);
}
