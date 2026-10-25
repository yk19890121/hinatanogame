'use strict';
/* =========================================================
   キャラクターの え（スプライトシート 6れつ×5だん）
   コマ番号は ひだりうえから 0〜29
   ========================================================= */

// じょうたい ごとに つかう コマ（30コマを ぜんぶ ながさない）
const HERO_ANIM = {
  idle: { frames: [0, 1, 2, 3, 4, 5], fps: 6, loop: true },
  run: { frames: [6, 7, 8, 9, 10, 11], fps: 12, loop: true },
  takeoff: { frames: [13], fps: 1, loop: false },    // ふみきり（みため だけ・ほんの いっしゅん）
  rise: { frames: [14], fps: 1, loop: false },
  apex: { frames: [15], fps: 1, loop: false },
  fall: { frames: [18], fps: 1, loop: false },
  fallFast: { frames: [19], fps: 1, loop: false },
  land: { frames: [20, 22, 23], fps: 22, loop: false },
  punch: { frames: [16], fps: 1, loop: false },
  hurt: { frames: [19], fps: 1, loop: false },
  flex: { frames: [25, 26, 27, 27, 27, 28, 27, 27], fps: 6, loop: true, introLen: 3 },
  victory: { frames: [24, 25, 26, 27, 28, 27], fps: 4, loop: true },
};

const BOSS_ANIM = {
  idle: { frames: [0, 1, 2, 3, 4, 5], fps: 6, loop: true },
  hop: { frames: [6, 7, 8, 9, 10, 11], fps: 10, loop: false },
  roar: { frames: [12, 13, 15, 15, 17, 0], fps: 5, loop: false },
  hurt: { frames: [18, 19, 20, 21, 22, 23], fps: 10, loop: false },
  down: { frames: [24, 25, 26, 27, 28, 29], fps: 6, loop: false },
};

const BOSS_SPRITE_S = 1.36; // ボスの おおきさ（ぜんコマ おなじ）

const Sprites = (() => {
  const sheets = {};
  let ready = false;

  function tinted(img, color) {
    const c = makeCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  function loadOne(key) {
    const m = SPRITE_META[key];
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        const s = { ...m, img, tint: {} };
        // ひかり用の いろちがい（パワーアップ=きんいろ / ダメージ=しろ）
        s.tint.gold = tinted(img, 'rgba(255,196,40,0.5)');
        s.tint.white = tinted(img, 'rgba(255,255,255,0.85)');
        sheets[key] = s;
        res(true);
      };
      img.onerror = () => res(false);
      img.src = m.src;
    });
  }

  function load() {
    return Promise.all([loadOne('hero'), loadOne('boss')]).then((r) => {
      ready = r.every(Boolean);
      return ready;
    });
  }

  // (x, y) が きじゅんてん。scale は ぜんコマ きょうつう（コマごとに かえない）
  function draw(ctx, key, frame, x, y, scale, flip, variant, alpha = 1) {
    const s = sheets[key];
    if (!s) return false;
    const src = variant ? s.tint[variant] : s.img;
    const sx = (frame % s.cols) * s.cellW, sy = Math.floor(frame / s.cols) * s.cellH;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -scale : scale, scale);
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(src, sx, sy, s.cellW, s.cellH, -s.ax, -s.ay, s.cellW, s.cellH);
    ctx.restore();
    return true;
  }

  // アニメの じかん t（びょう）から コマを えらぶ
  function frameAt(anim, t) {
    const n = anim.frames.length;
    let i = Math.floor(t * anim.fps);
    if (anim.loop) {
      const intro = anim.introLen || 0;
      if (i >= n) i = intro + ((i - intro) % (n - intro));
    } else i = Math.min(i, n - 1);
    return anim.frames[i];
  }

  const done = (anim, t) => !anim.loop && t * anim.fps >= anim.frames.length;

  return { load, draw, frameAt, done, get ready() { return ready; } };
})();
