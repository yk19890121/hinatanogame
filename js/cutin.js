'use strict';
/* =========================================================
   せいかいの カットイン（マッチョの え ＋ おうえんボイス）
   正解.wav → スライドイン かいし と どうじに 剣の「シュッ」と おうえんボイス → まんなかで とまって ボイスを つづける
   → ボイスが おわったら すぐ みぎうえへ スライドアウト → おわったら つぎの しょり
   ゲームの じかんで うごくので、ポーズ中は いっしょに とまる
   ========================================================= */

// えと こえは かならず ペアで えらぶ。20くみを シャッフルして じゅんばんに（つぎの ひとまわりの さいしょが まえと おなじに ならない）
const Cheers = {
  bag: [],
  last: null,
  img: {},
  failed: new Set(),
  byId(id) { return MEDIA.cheers.find((c) => c.id === id); },
  usable() { return MEDIA.cheers.filter((c) => c.enabled && !this.failed.has(c.id)).map((c) => c.id); },
  refill() {
    const ids = shuffle(this.usable());
    if (ids.length > 1 && ids[0] === this.last) [ids[0], ids[1]] = [ids[1], ids[0]];
    this.bag = this.bag.concat(ids);
  },
  load(id) {
    if (this.img[id]) return;
    const c = this.byId(id);
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { im.ok = true; };
    im.onerror = () => {
      this.failed.add(id);
      console.warn('[cutin] がぞうを よみこめません:', c.image, `(${c.origImage})`);
    };
    im.src = c.image;
    this.img[id] = im;
    // こえも さきに メモリへ（はじめての 正解でも よみこみ待ちが ない ように）
    MediaAudio.preload(c.voice);
  },
  preload(n = 3) {
    if (this.bag.length < n) this.refill();
    this.bag.slice(0, n).forEach((id) => this.load(id));
  },
  next() {
    if (!this.bag.length) this.refill();
    this.preload();
    const ready = this.bag.filter((id) => this.img[id] && this.img[id].ok && !this.failed.has(id));
    let id = ready.find((x) => x !== this.last);
    if (id == null) id = ready[0];
    if (id == null) return null; // まだ どれも よみこめていない → こんかいは えを はぶく
    this.bag.splice(this.bag.indexOf(id), 1);
    this.last = id;
    this.preload();
    return this.byId(id);
  },
};

const CUTIN_IN = 0.3, CUTIN_OUT = 0.25, CUTIN_FALLBACK = 3;

class CutIn {
  // correctHandle: 正解.wav の ハンドル、pair: Cheers.next() の けっか（null なら えを はぶく）
  constructor(correctHandle, pair, onDone) {
    this.correct = correctHandle;
    this.pair = pair;
    this.onDone = onDone;
    this.state = 'wait';
    this.t = 0;
    this.cheer = null;
    this.vt = 0; // こえを ならしはじめてからの じかん
    this.root = document.getElementById('cutin');
    this.el = document.getElementById('cutinImg');
    this.dim = this.root.querySelector('.cutin-dim');
    if (pair) {
      this.el.src = pair.image;
      this.el.alt = pair.line;
    }
    this.apply(-1);
  }

  // p: -1=まだ でない / 0〜1=はいる / 1=まんなか / 1〜2=でていく / 2=きえた
  apply(p) {
    if (p < 0 || p >= 2 || !this.pair) {
      this.root.classList.remove('on');
      return;
    }
    this.root.classList.add('on');
    let x, y, r, s, dim;
    if (p <= 1) {
      const e = 1 - Math.pow(1 - p, 3); // いきおいよく きて まんなかで とまる
      x = lerp(-82, 0, e); y = lerp(72, 0, e); r = lerp(-14, 0, e); s = lerp(0.72, 1, Ease.outBack(Math.min(1, p * 1.05)));
      dim = 0.85 * Math.min(1, p * 1.6);
    } else {
      const e = Math.pow(p - 1, 3); // だんだん はやく でていく
      x = lerp(0, 88, e); y = lerp(0, -84, e); r = lerp(0, 12, e); s = lerp(1, 1.06, e);
      dim = 0.85 * (1 - (p - 1));
    }
    this.el.style.transform = `translate(-50%, -50%) translate(${x}vw, ${y}vh) rotate(${r}deg) scale(${s})`;
    this.dim.style.opacity = dim;
  }

  update(dt) {
    this.t += dt;
    if (this.cheer) this.vt += dt;
    switch (this.state) {
      case 'wait': { // 正解.wav が おわるまで
        const lim = (MEDIA.voice.correct.duration || 1.5) + 1.2;
        if (this.correct.done || this.t > lim) {
          if (!this.pair) return this.finish();
          // スライドインの はじまりと いっしょに「シュッ」と 声援（まんなかで もういちど ならす ことは しない）
          MediaAudio.Sfx.play('cutinIn');
          this.cheer = MediaAudio.Voice.playSrc(this.pair.voice, this.pair.duration);
          this.go('in');
        }
        break;
      }
      case 'in':
        this.apply(Math.min(1, this.t / CUTIN_IN));
        if (this.t >= CUTIN_IN) {
          this.apply(1);
          this.go('hold'); // みじかい 声援が もう おわっていても hold で すぐ でていく
        }
        break;
      case 'hold': { // まんなかで おうえんボイスが おわるまで（じかんは こえを ならしはじめてから はかる）
        const h = this.cheer;
        let leave = false;
        if (h.done && h.ok) leave = true;                                                          // じっさいの さいせい しゅうりょう
        else if (h.done && h.skipped) leave = this.vt >= (this.pair.duration || CUTIN_FALLBACK); // こえ オフ: 音声の 長さぶん
        else if (h.done) leave = this.vt >= CUTIN_FALLBACK;                                        // さいせい エラー: 3びょう
        else if (this.vt > (this.pair.duration || CUTIN_FALLBACK) + 4) leave = true;              // ねんのため
        if (leave) this.go('out');
        break;
      }
      case 'out':
        this.apply(1 + Math.min(1, this.t / CUTIN_OUT));
        if (this.t >= CUTIN_OUT) this.finish();
        break;
    }
  }

  go(s) {
    this.state = s;
    this.t = 0;
  }

  finish() {
    if (this.state === 'done') return;
    this.state = 'done';
    this.apply(2);
    const fn = this.onDone;
    this.onDone = null;
    if (fn) fn();
  }

  // ステージを はなれる・やりなおす とき（つぎの しょりは しない）
  cancel() {
    this.state = 'done';
    this.onDone = null;
    this.apply(2);
    if (this.cheer && !this.cheer.done) MediaAudio.Voice.cancel();
    if (this.cheer) MediaAudio.Sfx.stop();
  }
}
