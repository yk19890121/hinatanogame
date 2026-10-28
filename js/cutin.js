'use strict';
/* =========================================================
   せいかいの カットイン（マッチョの え ＋ おうえんボイス）
   通常: 正解.wav → スライドイン かいし と どうじに「シャキーン」と おうえんボイス → まんなかで とまって ボイスを つづける
         → ボイスが おわったら すぐ みぎうえへ スライドアウト → おわったら つぎの しょり
   レア: 正解.wav → すこし くらく ＋ ほら貝 → マッスル群の 動画 → 動画の おわりと かさねて あかるく しながら
         レアの え が スライドイン ＋ 登場の 音（教会の祈り）＋ セリフ → セリフが おわったら スライドアウト
   ゲームの じかんで うごくので、ポーズ中は いっしょに とまる
   ========================================================= */

// レアの 出現率（レア 5体 ぜんたいで）。ここ 1か所で かえる
const RARE_RATE = 0.10;

// えと こえは かならず ペアで えらぶ。通常・レアごとに シャッフルして じゅんばんに（つぎの ひとまわりの さいしょが まえと おなじに ならない）
// 開発用: URL に ?rare=1〜5 で その レアを まいかい、?rare=all で まいかい レア、?rare=normal で レアなし
//        （コンソールで Cheers.force = 3 なども 可。ふだんは null）
const Cheers = {
  bags: { normal: [], rare: [] },
  last: null,
  img: {},
  failed: new Set(),
  force: (() => {
    const v = new URLSearchParams(location.search).get('rare');
    return v == null ? null : v === 'all' || v === 'normal' ? v : Number(v) || null;
  })(),
  byId(id) { return MEDIA.cheers.find((c) => c.id === id); },
  rares() { return MEDIA.cheers.filter((c) => c.rare); },
  usable(kind) { return MEDIA.cheers.filter((c) => c.enabled && !!c.rare === (kind === 'rare') && !this.failed.has(c.id)).map((c) => c.id); },
  refill(kind) {
    const ids = shuffle(this.usable(kind));
    if (ids.length > 1 && ids[0] === this.last) ids.push(ids.shift());
    this.bags[kind] = this.bags[kind].concat(ids);
  },
  load(id) {
    if (this.img[id]) return;
    const c = this.byId(id);
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      im.ok = true;
      if (im.decode) im.decode().catch(() => {}); // はじめて でる ときに 絵の 展開で もたつかない ように
    };
    im.onerror = () => {
      this.failed.add(id);
      console.warn('[cutin] がぞうを よみこめません:', c.image, `(${c.origImage})`);
    };
    im.src = c.image;
    this.img[id] = im;
    // こえも さきに メモリへ（はじめての 正解でも よみこみ待ちが ない ように）
    if (c.voice) MediaAudio.preload(c.voice);
  },
  // 通常は つぎに でる 3体ぶん、レアは 5体 ぜんぶと 動画を さきに よむ
  preload(n = 3) {
    if (this.bags.normal.length < n) this.refill('normal');
    this.bags.normal.slice(0, n).forEach((id) => this.load(id));
    this.rares().forEach((c) => this.load(c.id));
    MuscleFx.init();
  },
  ready(id) { return this.img[id] && this.img[id].ok && !this.failed.has(id); },
  pick(kind) {
    if (!this.bags[kind].length) this.refill(kind);
    const ready = this.bags[kind].filter((id) => this.ready(id));
    let id = ready.find((x) => x !== this.last);
    if (id == null) id = ready[0];
    if (id == null) return null;
    this.bags[kind].splice(this.bags[kind].indexOf(id), 1);
    return id;
  },
  next() {
    this.preload();
    let id = null;
    const f = this.force;
    if (typeof f === 'number') { // 開発用: きまった レア
      const c = this.rares()[f - 1];
      if (c && this.ready(c.id)) id = c.id;
    }
    // まず 通常か レアかを ひいてから、その なかで えらぶ
    if (id == null && f !== 'normal' && (f === 'all' || Math.random() < RARE_RATE)) id = this.pick('rare');
    if (id == null) id = this.pick('normal'); // まだ どれも よみこめていない レアは 通常に
    if (id == null) return null; // まだ どれも よみこめていない → こんかいは えを はぶく
    this.last = id;
    this.preload();
    return this.byId(id);
  },
};

/* ---------------- マッスル群の 動画（上半分 = いろ、下半分 = すけぐあい の 動画を WebGL で かさねる） ---------------- */
const MuscleFx = {
  state: 'off', // off → loading → ready（つかえない ときは failed）
  active: false,
  opacity: 1,
  init() {
    if (this.state !== 'off') return;
    const m = MEDIA.muscle;
    this.canvas = document.getElementById('muscleFx');
    const gl = m && this.canvas && this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) {
      this.state = 'failed';
      console.warn('[rare] 動画を すかして だせないので はぶきます');
      return;
    }
    this.gl = gl;
    // スマホが WebGL を とりあげた ときは 動画を はぶく（まっしろ・まっくらに しない）
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.state = 'failed';
      this.broken = true;
    });
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }'));
    // いろは すけぐあいを かけて ある（ふちが 黒く にじまない）。うすい 圧縮ノイズは すけさせる
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, [
      'precision mediump float; varying vec2 v; uniform sampler2D t; uniform float o, edge;',
      'void main(){',
      '  vec3 c = texture2D(t, vec2(v.x, min(v.y * 0.5, 0.5 - edge))).rgb;',
      '  float a = texture2D(t, vec2(v.x, max(0.5 + v.y * 0.5, 0.5 + edge))).r;',
      '  float a2 = smoothstep(0.08, 0.92, a);',
      '  gl_FragColor = vec4(min(c * (a2 / max(a, 0.08)), vec3(a2)), a2) * o;',
      '}'].join('\n')));
    gl.linkProgram(pr);
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
    this.uO = gl.getUniformLocation(pr, 'o');
    gl.uniform1f(gl.getUniformLocation(pr, 'edge'), 1 / (m.height * 2));
    const v = document.createElement('video');
    v.muted = true; // 動画の 音は 効果音（MediaAudio）で べつに ならす
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'auto';
    v.addEventListener('loadeddata', () => { if (this.state === 'loading') this.state = 'ready'; });
    v.addEventListener('error', () => {
      this.state = 'failed';
      console.warn('[rare] 動画を よみこめません:', m.src);
    });
    this.video = v;
    this.state = 'loading';
    // はじめに ぜんぶ メモリへ（はじめての レアでも よみこみ待ちが ない ように）
    fetch(m.src).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => { v.src = URL.createObjectURL(b); v.load(); })
      .catch(() => { v.src = m.src; v.load(); });
  },
  // さいしょの タップの なかで いちど うごかして おく（iPhone は ここで はじめて よみこむ）
  warm() {
    const v = this.video;
    if (!v || this.warmed || this.active || !v.src) return;
    this.warmed = true;
    const p = v.play();
    if (p && p.then) p.then(() => { if (!this.active) { v.pause(); v.currentTime = 0; } }).catch(() => { this.warmed = false; });
  },
  start() {
    if (this.state !== 'ready') return false;
    const v = this.video;
    this.active = true;
    this.broken = false;
    this.opacity = 1;
    try { v.currentTime = 0; } catch (e) { /* よみこみ中 */ }
    const p = v.play();
    if (p && p.catch) p.catch(() => { if (this.active) this.broken = true; }); // さいせい できない → すぐ つぎへ
    const c = this.canvas;
    c.classList.add('on');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    c.width = Math.max(2, Math.round(c.clientWidth * dpr));
    c.height = Math.max(2, Math.round(c.clientHeight * dpr));
    this.gl.viewport(0, 0, c.width, c.height);
    const loop = () => {
      if (!this.active) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
    return true;
  },
  draw() {
    const gl = this.gl, v = this.video;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (v.readyState < 2 || this.opacity <= 0) return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
    gl.uniform1f(this.uO, this.opacity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  },
  pause() { if (this.active) this.video.pause(); },
  resume() {
    if (!this.active) return;
    const p = this.video.play();
    if (p && p.catch) p.catch(() => {});
  },
  stop() {
    if (!this.video) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.video.pause();
    try { this.video.currentTime = 0; } catch (e) { /* よみこみ中 */ }
    this.canvas.classList.remove('on');
  },
};

const CUTIN_IN = 0.3, CUTIN_OUT = 0.25, CUTIN_FALLBACK = 3;
// レア演出: くらさ・ほら貝から 動画まで・動画の おわりと え の かさなり・動画が ない ときの ま・セリフが ない ときの ながさ
const RARE_DIM = 0.45, RARE_DIM_IN = 0.2, RARE_VIDEO_AT = 0.15, RARE_CROSS = 0.25, RARE_NOVIDEO = 0.45, RARE_NOVOICE = 2.6;

class CutIn {
  // correctHandle: 正解.wav の ハンドル、pair: Cheers.next() の けっか（null なら えを はぶく）
  constructor(correctHandle, pair, onDone) {
    this.correct = correctHandle;
    this.pair = pair;
    this.rare = !!(pair && pair.rare);
    this.onDone = onDone;
    this.state = 'wait';
    this.t = 0;
    this.cheer = null;
    this.vt = 0; // こえを ならしはじめてからの じかん
    this.rt = 0; // レア演出の じかん
    this.cross = -1; // レア: 動画から え への かさなりの じかん
    this.root = document.getElementById('cutin');
    this.el = document.getElementById('cutinImg');
    this.dim = this.root.querySelector('.cutin-dim');
    this.root.classList.toggle('rare', this.rare);
    if (pair) {
      this.el.src = pair.image;
      this.el.alt = pair.line;
    }
    this.apply(-1);
  }

  // p: -1=まだ でない / 0〜1=はいる / 1=まんなか / 1〜2=でていく / 2=きえた
  apply(p) {
    const showRoot = this.pair && (p >= 0 && p < 2 || (this.rare && this.state !== 'wait' && this.state !== 'done'));
    this.root.classList.toggle('on', !!showRoot);
    if (!showRoot) return;
    this.el.style.visibility = p >= 0 && p < 2 ? 'visible' : 'hidden';
    if (p < 0 || p >= 2) return;
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
    if (!this.rare) this.dim.style.opacity = dim; // レアは あかるさを べつに うごかす（rareDim）
  }

  rareDim(a) { this.dim.style.opacity = a; }

  // え の 登場と いっしょに こえ（と 効果音）
  startCheer() {
    if (this.rare) {
      MediaAudio.Sfx.fade('rareHorn', 0.2); // ほら貝の よいんは みじかく けす
      MediaAudio.Sfx.fade('rareMuscle', RARE_CROSS);
      MediaAudio.Sfx.play('rareAppear');
      this.cross = 0;
    } else MediaAudio.Sfx.play('cutinIn');
    this.cheer = this.pair.voice
      ? MediaAudio.Voice.playSrc(this.pair.voice, this.pair.duration)
      : { done: true, ok: false, skipped: false, error: false, none: true }; // まだ セリフが ない レア: 絵だけ
    this.go('in');
  }

  update(dt) {
    this.t += dt;
    if (this.cheer) this.vt += dt;
    if (this.cross >= 0 && this.cross < RARE_CROSS) { // 動画を けしながら あかるく もどす（え は もう はいってくる）
      this.cross = Math.min(RARE_CROSS, this.cross + dt);
      const k = 1 - this.cross / RARE_CROSS;
      MuscleFx.opacity = k;
      this.rareDim(RARE_DIM * k);
      if (this.cross >= RARE_CROSS) MuscleFx.stop();
    }
    switch (this.state) {
      case 'wait': { // 正解.wav が おわるまで
        const lim = (MEDIA.voice.correct.duration || 1.5) + 1.2;
        if (this.correct.done || this.t > lim) {
          if (!this.pair) return this.finish();
          if (this.rare) {
            // すこし くらく しはじめる と どうじに ほら貝
            MediaAudio.duck('rare', true);
            MediaAudio.Sfx.play('rareHorn');
            this.video = false;
            this.tried = false;
            this.crossAt = RARE_NOVIDEO;
            this.go('rare');
            this.apply(-1);
            return;
          }
          // スライドインの はじまりと いっしょに「シャキーン」と 声援（まんなかで もういちど ならす ことは しない）
          this.startCheer();
        }
        break;
      }
      case 'rare': { // くらく → マッスル群（え の 登場まで）
        this.rt += dt;
        this.rareDim(RARE_DIM * Math.min(1, this.rt / RARE_DIM_IN));
        if (!this.tried && this.rt >= RARE_VIDEO_AT) {
          // ほら貝の すぐ あと（まちきらない）に 動画。よめていない・すかせない ときは すぐ え へ
          this.tried = true;
          if (MuscleFx.start()) {
            this.video = true;
            MediaAudio.Sfx.play('rareMuscle');
            this.crossAt = this.rt + MEDIA.muscle.duration - RARE_CROSS;
          }
        }
        if (this.video && MuscleFx.broken) this.crossAt = Math.min(this.crossAt, this.rt); // さいせい できなかった
        if (this.rt >= this.crossAt) this.startCheer();
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
        if (h.none) leave = this.vt >= RARE_NOVOICE;                                               // セリフが まだ ない レア
        else if (h.done && h.ok) leave = true;                                                     // じっさいの さいせい しゅうりょう
        else if (h.done && h.skipped) leave = this.vt >= (this.pair.duration || CUTIN_FALLBACK); // こえ オフ: 音声の 長さぶん
        else if (h.done) leave = this.vt >= CUTIN_FALLBACK;                                        // さいせい エラー: 3びょう
        else if (this.vt > (this.pair.duration || CUTIN_FALLBACK) + 4) leave = true;              // ねんのため
        if (leave) {
          this.go('out');
          // 登場の 音（教会の祈り）は セリフより ながいので、退場に あわせて みじかく けす
          if (this.rare) MediaAudio.Sfx.fade('rareAppear', 0.6);
        }
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

  // ゲームの ポーズ（動画も とめる。音は MediaAudio が とめる）
  setPaused(on) {
    if (on) MuscleFx.pause();
    else MuscleFx.resume();
  }

  cleanup() {
    if (this.rare) {
      MuscleFx.stop();
      MediaAudio.duck('rare', false);
      this.rareDim(0);
      this.root.classList.remove('rare');
    }
  }

  finish() {
    if (this.state === 'done') return;
    this.state = 'done';
    this.apply(2);
    this.cleanup();
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
    if (this.cheer || this.rare) MediaAudio.Sfx.stop();
    this.cleanup();
  }
}
