'use strict';
/* =========================================================
   ボス20体・レア仲間5体の え（14コマシート）と、仲間・ボスの 弾
   シート: 7列×2段、1コマ384×384、透過PNG。コマ・fps・弾を だす コマは CHARA（js/chara-data.js）の まま
   ========================================================= */

// オトナモードの きまり（ここ 1か所で かえる）
const ADULT = {
  LIVES: 3,
  TIME: 180,                  // 1ステージの せいげん じかん（びょう）
  BOSS_HP: [4, 5, 6, 7, 8],   // レベル1〜5
  ATTACK_EVERY: 10,           // ボスの 発射から つぎの 発射まで（びょう）
  WARN: 0.8,                  // 予告の 音から 発射まで
  GRACE: 1.0,                 // 操作できる ように なってから 予告まで 最低 これだけ まつ（演出あけの ふいうち なし）
  INVULN: 1.0,                // 接触・被弾の あとの むてき
  SHOT_SPEED: 430,
  SHOT_R: 20,                 // 弾の あたり（はんけい）
  SHOT_Y: 40,                 // 弾の たかさ（じめんから）。ジャンプで とびこせる
};

const CharaArt = (() => {
  const cache = {};
  const C = CHARA.cell, COLS = CHARA.cols;
  let scratch = null;

  // kind: 'boss' | 'ally'。おなじ ものは 1かい だけ よむ
  function load(kind, id) {
    const key = kind + ':' + id;
    if (cache[key]) return cache[key];
    const d = kind === 'boss' ? CHARA.bosses[id] : CHARA.allies[id];
    const a = { kind, id, d, img: new Image(), shot: new Image(), ready: false, failed: false };
    const one = (im, src) => new Promise((res) => {
      im.decoding = 'async';
      im.onload = () => (im.decode ? im.decode().then(() => res(true), () => res(true)) : res(true)); // はじめて かく ときに もたつかない ように
      im.onerror = () => { console.warn('[chara] がぞうを よみこめません:', src); res(false); };
      im.src = src;
    });
    a.promise = Promise.all([one(a.img, d.sheet), one(a.shot, d.shot)]).then(([s, p]) => {
      a.ready = s;
      a.shotReady = p;
      a.failed = !s;
      return s;
    });
    cache[key] = a;
    return a;
  }
  const boss = (id) => load('boss', id);
  const ally = (id) => load('ally', id);

  function frameAt(anim, t) {
    const n = anim.frames.length;
    let i = Math.max(0, Math.floor(t * anim.fps));
    i = anim.loop ? i % n : Math.min(i, n - 1);
    return anim.frames[i];
  }
  const done = (anim, t) => !anim.loop && t * anim.fps >= anim.frames.length;

  // (x, y) = あしもと（anchor）。scale は ぜんコマ きょうつう。flash: しろく ひかる つよさ
  function draw(ctx, a, frame, x, y, scale, flip, alpha = 1, flash = 0) {
    if (!a || !a.ready) return false;
    const sx = (frame % COLS) * C, sy = Math.floor(frame / COLS) * C;
    const [ax, ay] = a.d.anchor;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -scale : scale, scale);
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(a.img, sx, sy, C, C, -ax, -ay, C, C);
    if (flash > 0) {
      // その コマだけ しろく ぬった え（シート ぜんたいの コピーは つくらない）
      if (!scratch) scratch = makeCanvas(C, C);
      const s = scratch.getContext('2d');
      s.globalCompositeOperation = 'source-over';
      s.clearRect(0, 0, C, C);
      s.drawImage(a.img, sx, sy, C, C, 0, 0, C, C);
      s.globalCompositeOperation = 'source-atop';
      s.fillStyle = '#ffffff';
      s.fillRect(0, 0, C, C);
      ctx.globalAlpha *= Math.min(1, flash) * 0.85;
      ctx.drawImage(scratch, -ax, -ay, C, C);
    }
    ctx.restore();
    return true;
  }

  // 弾の え（よけいな すきまを のぞいた はんいだけ）。(x, y) が 弾の まんなか、w が よこはば
  function drawShot(ctx, a, x, y, w, alpha = 1) {
    if (!a || !a.shotReady) return false;
    const [x0, y0, x1, y1] = a.d.shotBox;
    const s = w / (x1 - x0), h = (y1 - y0) * s;
    ctx.save();
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(a.shot, x0, y0, x1 - x0, y1 - y0, x - w / 2, y - h / 2, w, h);
    ctx.restore();
    return true;
  }

  return { boss, ally, frameAt, done, draw, drawShot };
})();

/* ---------------- レア仲間（プレイヤーの うしろを ついてくる） ---------------- */
const ALLY_H = 150;      // みための たかさ（ヒーローと おなじ くらい）
const ALLY_GAP = 104;    // プレイヤーとの きょり
const ALLY_SUPPORT = 0.3; // 攻撃の ときに「助太刀するぞ！」などを いう わりあい（ほかの こえが ない ときだけ）

class Ally {
  constructor(id) {
    this.id = id;
    this.d = CHARA.allies[id];
    this.art = CharaArt.ally(id);
    this.scale = ALLY_H / (this.d.anchor[1] - this.d.top);
    this.float = id === 'R03_god'; // 神様は 雲に のって ういている
    this.joined = false; // 加入が おわった（つぎの 正解から こうげきに くわわる）
    this.x = 0;
    this.y = GROUND_Y;
    this.vx = 0;
    this.facing = 1;
    this.sAnim = 'join';
    this.sT = 0;
    this.attackT = -1;
    this.gone = false;
    this.appear = 0;
  }

  // 絵が よめたら プレイヤーの うしろに あらわれる（加入SE ＋ 本人の セリフ）
  update(dt, game) {
    const h = game.hero;
    if (!this.joined) {
      if (!this.art.ready) return;
      this.join(game);
    }
    this.sT += dt;
    this.appear = Math.min(1, this.appear + dt * 4);
    const prev = this.x;
    const tx = h.x - h.facing * ALLY_GAP;
    this.x = damp(this.x, tx, 7, dt);
    this.vx = dt > 0 ? (this.x - prev) / dt : 0;
    this.y = damp(this.y, h.y, h.onGround ? 14 : 9, dt);
    this.facing = h.facing;
    const A = this.d.anims;
    if (this.attackT >= 0) {
      this.attackT += dt;
      const fireAt = A.attack.frames.indexOf(A.attack.projectileFrame) / A.attack.fps;
      if (!this.fired && this.attackT >= fireAt) this.fire(game);
      if (CharaArt.done(A.attack, this.attackT)) this.attackT = -1;
      return;
    }
    let s;
    if (this.sAnim === 'join' && !CharaArt.done(A.join, this.sT)) s = 'join';
    else if (!h.onGround) s = 'jump';
    else if (Math.abs(this.vx) > 40) s = 'move';
    else s = 'idle';
    if (s !== this.sAnim) {
      this.sAnim = s;
      this.sT = 0;
    }
  }

  join(game, again = false) {
    const h = game.hero;
    this.joined = true;
    if (!again) {
      this.x = h.x - h.facing * ALLY_GAP;
      this.y = h.y;
      this.appear = 0;
    }
    // おなじ レアを もういちど ひいた ときは、いま うっている こうげきは そのまま（あいさつの うごきは そのあと）
    this.sAnim = 'join';
    this.sT = 0;
    game.fx.sparkle(this.x, this.y - 70, 22, '#ffe14a', 300);
    game.fx.ring(this.x, this.y - 70, '#ffffff', 20, 120, 0.5, 6);
    game.fx.text('なかまに なった！', this.x, this.y - ALLY_H - 40, { size: 30, life: 1.4 });
    MediaAudio.Sfx.play('allyJoin');            // ついた しゅんかん
    MediaAudio.Voice.play(this.d.voice);         // 本人の 加入セリフ（ほかの こえの あとに。ゲームは またない）
  }

  // 正解で いっしょに こうげき（ダメージは かぞえない。ダメージは 回答の ときに きまる）
  attack(targetX, targetY, onHit) {
    if (!this.joined) return;
    this.attackT = 0;
    this.fired = false;
    this.target = { x: targetX, y: targetY, onHit };
  }

  fire(game) {
    if (this.fired || !this.target) return;
    this.fired = true;
    const s = this.scale, y = this.y - (this.d.anchor[1] - this.d.top) * s * 0.55 + (this.float ? -14 : 0);
    const T = this.target;
    game.projectiles.push(new AllyShot(this, this.x + this.facing * 40, y, T.x, T.y, T.onHit));
    MediaAudio.Sfx.play(this.d.sfx); // 発射した しゅんかん
    if (Math.random() < ALLY_SUPPORT) MediaAudio.Item.play(pick(['allySupport1', 'allySupport2', 'allySupport3'])); // ほかの こえが あれば はぶく
  }

  // 交代・リセットで いなくなる（とちゅうの こうげきは その ばで うってから）
  leave(game) {
    if (this.attackT >= 0 && !this.fired) this.fire(game);
    this.gone = true;
    if (this.joined) {
      game.fx.sparkle(this.x, this.y - 70, 16, '#ffffff', 240);
      game.fx.dust(this.x, this.y, 8, 0);
    }
  }

  draw(ctx, t) {
    if (!this.joined || this.gone) return;
    const A = this.d.anims;
    const anim = this.attackT >= 0 ? A.attack : A[this.sAnim] || A.idle;
    const frame = CharaArt.frameAt(anim, this.attackT >= 0 ? this.attackT : this.sT);
    const lift = this.float ? -16 + Math.sin(t * 2.4) * 6 : 0;
    const s = this.scale * (0.6 + 0.4 * Ease.outBack(this.appear));
    const gy = Physics.groundBelow(Game.level, this.x, this.y - 4);
    drawShadow(ctx, this.x, gy == null ? this.y : gy, (this.d.right - this.d.left) * this.scale * 0.36, 0.22);
    CharaArt.draw(ctx, this.art, frame, this.x, this.y + lift, s, this.facing < 0, 1, 0);
  }
}

/* ---------------- 仲間の 弾（みぎへ とんで 壁・ボスに あたる） ---------------- */
class AllyShot {
  constructor(ally, x, y, tx, ty, onHit) {
    this.art = ally.art;
    this.x = x;
    this.y = y;
    this.ty = ty;
    this.target = tx;
    this.onHit = onHit;
    this.vx = 380;
    this.done = false;
    this.t = 0;
  }
  update(dt, game) {
    this.t += dt;
    this.vx = Math.min(1900, this.vx + 4800 * dt);
    this.x += this.vx * dt;
    this.y = damp(this.y, this.ty, 4, dt);
    if (Math.random() < 0.6) game.fx.add({ type: 'spark', x: this.x - 40, y: this.y + rand(-12, 12), vx: -rand(80, 240), vy: rand(-50, 50), life: 0.3, max: 0.3, size: rand(3, 6), color: '#fff2b0', g: 0 });
    if (this.x >= this.target) {
      this.done = true;
      MediaAudio.Sfx.play('allyHit'); // あたった しゅんかん
      game.fx.flash(this.x, this.y, '#ffffff', 150, 0.3);
      game.fx.stars(this.x, this.y, 6, '#fff2a0');
      if (this.onHit) this.onHit(this.x, this.y);
    }
  }
  draw(ctx) {
    if (!CharaArt.drawShot(ctx, this.art, this.x, this.y, 130)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(Assets.glow('#ffe58a'), this.x - 50, this.y - 50, 100, 100);
      ctx.restore();
    }
  }
}

/* ---------------- ボスの 弾（オトナモードだけ。ひだりへ とぶ。ジャンプで よける） ---------------- */
class BossShot {
  constructor(art, x) {
    this.art = art;
    this.x = x;
    this.y = GROUND_Y - ADULT.SHOT_Y;
    this.r = ADULT.SHOT_R;
    this.vx = -ADULT.SHOT_SPEED;
    this.t = 0;
    this.done = false;
  }
  update(dt) {
    this.t += dt;
    // でた ところは ゆっくり → すぐ 本来の はやさ（ボスの すぐ まえに いても とぶ タイミングが ある）
    this.vx = -Math.min(ADULT.SHOT_SPEED, 180 + this.t * 700);
    this.x += this.vx * dt;
  }
  hits(h) {
    // あしの さき 8px は ゆるす（ちいさな ジャンプでも よけられる）
    const cx = clamp(this.x, h.x - h.w / 2, h.x + h.w / 2), cy = clamp(this.y, h.y - h.h, h.y - 8);
    return (cx - this.x) ** 2 + (cy - this.y) ** 2 < this.r * this.r;
  }
  draw(ctx, t) {
    // 弾の あたまが あたりの まんなか（しっぽは みぎへ のびる）
    const w = 120;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(Assets.glow('#ffffff'), this.x - 40, this.y - 40, 80, 80);
    ctx.restore();
    if (!CharaArt.drawShot(ctx, this.art, this.x + w * 0.32, this.y + Math.sin(t * 20) * 1.5, w)) {
      ctx.fillStyle = '#ff4a6a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, TAU);
      ctx.fill();
    }
  }
}
