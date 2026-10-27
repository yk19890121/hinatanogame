'use strict';
/* =========================================================
   ファイルの おと（BGM・ボイス・はなびの おと）
   3けいとう: BGM=おんがく / ボイス=よみあげ こえ / はなび=こうかおん
   - BGM は つねに 1きょく（ひとつの <audio> を つかいまわす）
   - ボイスは じゅんばんに 1ほんずつ（WAV と もんだいの よみあげを おなじ れつで）
   - こえの あいだは BGM と はなびを ちいさく する（つづけて しゃべる ときは もどさない）
   ========================================================= */
const MediaAudio = (() => {
  // http(s) の ときだけ WebAudio に つないで おとの おおきさを なめらかに かえる
  // （file:// で つなぐと ブラウザによっては むおんに なるため）
  const useGraph = /^https?:$/.test(location.protocol);
  const opt = { music: true, voice: true, sfx: true };
  let hidden = false;      // タブが かくれている
  let held = false;        // ゲームの ポーズ
  let ducked = false;
  let unlocked = false;

  // むおんの みじかい WAV（iPhone で さいしょの タップの ときに 再生を ゆるしてもらう ため）
  const SILENT = (() => {
    const n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    let s = '';
    new Uint8Array(buf).forEach((b) => { s += String.fromCharCode(b); });
    return 'data:audio/wav;base64,' + btoa(s);
  })();

  function channel(base) {
    const el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    return { el, base, track: 1, duck: 1, fade: 1, gain: null, src: null };
  }
  const bgmCh = channel(1), voiceCh = channel(1), fwCh = channel(0.75);
  // きょく ごとの おおきさ あわせ（はかった 平均音量: ステージ曲 ≒ -17.7dB、クリア曲だけ ≒ -14.8dB と おおきい）
  const TRACK_GAIN = { clear: 0.75 };
  // こえの あいだの BGM・はなび（うたも ある ていど きこえる くらいに さげる）
  const DUCK_BGM = 0.6, DUCK_FW = 0.5;

  function connect(ch) {
    const ac = Sound.context();
    if (!useGraph || !ac || ch.gain) return;
    try {
      const node = ac.createMediaElementSource(ch.el);
      ch.gain = ac.createGain();
      node.connect(ch.gain);
      ch.gain.connect(Sound.output());
    } catch (e) { ch.gain = null; }
  }

  function level(ch, enabled, smooth = 0.06) {
    const v = enabled ? ch.base * ch.track * ch.duck * ch.fade : 0;
    const ac = Sound.context();
    if (ch.gain && ac) ch.gain.gain.setTargetAtTime(v, ac.currentTime, smooth);
    else ch.el.volume = clamp(v, 0, 1);
  }

  function setSrc(ch, src) {
    ch.src = src;
    ch.el.src = src;
    try { ch.el.currentTime = 0; } catch (e) { /* まだ よみこみ中 */ }
  }

  function tryPlay(ch) {
    const p = ch.el.play();
    if (p && p.catch) p.catch(() => {}); // あたらしい おとに きりかわった・まだ さわっていない ときは むし
  }

  const blocked = () => hidden || held;

  /* ---------------- BGM ---------------- */
  const BGM = {
    want: null, // いまの がめんに あう きょく（'title' は じどう作曲の おんがく）
    cur: null,  // <audio> に はいっている きょく
    play(id, { restart = false } = {}) {
      this.want = id;
      if (id !== 'title') Sound.stopMusic(); // じどう作曲と ファイルの きょくを かさねない
      if (!id || id === 'title') {
        this.cur = null;
        bgmCh.el.pause();
        if (id === 'title') Sound.startMusic(THEMES.meadow.music);
        return;
      }
      if (this.cur === id && !restart) {
        if (opt.music && !blocked() && bgmCh.el.paused) tryPlay(bgmCh); // おなじ きょくは あたまに もどさない
        return;
      }
      this.cur = id;
      bgmCh.track = TRACK_GAIN[id] || 1;
      bgmCh.el.loop = true;
      setSrc(bgmCh, MEDIA.bgm[id].src); // まえの きょくの よみこみは ここで うちきり（あとから ならない）
      bgmCh.fade = 1;
      level(bgmCh, opt.music, 0.01);
      if (opt.music && !blocked()) tryPlay(bgmCh);
    },
    refresh() { // せってい・ポーズ・タブ の じょうたいに あわせる
      level(bgmCh, opt.music);
      if (!opt.music || blocked()) {
        bgmCh.el.pause();
        return;
      }
      if (this.want === 'title') {
        if (!Sound.musicPlaying()) Sound.startMusic(THEMES.meadow.music);
      } else if (this.want && this.cur !== this.want) this.play(this.want);
      else if (this.cur && bgmCh.el.paused) tryPlay(bgmCh);
    },
  };

  /* ---------------- ボイスの さきよみ（メモリに ほどいて おき、すぐ ならせる ように） ---------------- */
  let voiceBus = null; // ボイス用の おとの 出口（WebAudio）
  const Buffers = {
    map: new Map(),
    load(src) {
      if (!src || this.map.has(src)) return;
      const e = { buf: null, ab: null, failed: false };
      this.map.set(src, e);
      // file:// では fetch できないので そのときは <audio> で ならす（失敗あつかい）
      fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))).then((ab) => {
        e.ab = ab;
        this.decode(e);
      }).catch(() => { e.failed = true; });
    },
    decode(e) {
      const ac = Sound.context();
      if (!ac || !e.ab || e.decoding) return; // AudioContext は さいしょの タップで できる
      e.decoding = true;
      ac.decodeAudioData(e.ab.slice(0)).then((b) => { e.buf = b; }, () => { e.failed = true; });
    },
    decodeAll() { this.map.forEach((e) => this.decode(e)); },
    get(src) {
      const e = this.map.get(src);
      if (!e) return null;
      if (!e.buf) this.decode(e);
      return e.buf;
    },
  };
  function ensureVoiceBus() {
    const ac = Sound.context();
    if (!voiceBus && ac) {
      voiceBus = ac.createGain();
      voiceBus.gain.value = voiceCh.base;
      voiceBus.connect(Sound.output());
    }
    return voiceBus;
  }

  /* ---------------- ボイス（じゅんばんに 1ほんずつ） ---------------- */
  const Voice = {
    q: [],
    cur: null,
    watchdog: null,
    // item: { src | text, duration } → handle（done / ok / skipped / error を あとで みる）
    enqueue(item, { interrupt = false } = {}) {
      if (interrupt) this.cancel();
      const h = { ...item, done: false, ok: false, skipped: false, error: false, started: false };
      this.q.push(h);
      this.pump();
      return h;
    },
    play(key, opts) {
      const m = MEDIA.voice[key];
      return this.enqueue({ src: m.src, duration: m.duration, key }, opts);
    },
    playSrc(src, duration, opts) { return this.enqueue({ src, duration }, opts); },
    say(text, opts) { return this.enqueue({ text, duration: 4 }, opts); },
    finish(h, how) {
      if (h.done) return;
      h.done = true;
      h[how] = true;
      clearTimeout(this.watchdog);
      if (this.cur === h) this.cur = null;
      this.pump();
      if (!this.cur && !this.q.length) {
        // つぎの こえが すぐ くるかも しれないので すこし まってから もとの おおきさへ
        setTimeout(() => { if (!this.cur && !this.q.length) setDuck(false); }, 140);
      }
    },
    arm(h, sec) {
      clearTimeout(this.watchdog);
      this.watchdog = setTimeout(() => this.finish(h, 'error'), Math.max(1, sec) * 1000);
    },
    pump() {
      if (this.cur || !this.q.length || blocked()) return;
      const h = this.q.shift();
      if (!opt.voice) { // こえ オフ: ならさずに すぐ おわり（カットインは じぶんの じかんで すすむ）
        h.done = true;
        h.skipped = true;
        this.pump();
        return;
      }
      this.cur = h;
      h.started = true;
      setDuck(true);
      if (h.text != null) {
        if (!('speechSynthesis' in window)) return this.finish(h, 'error');
        try {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(h.text);
          u.lang = 'ja-JP';
          const v = Sound.voice && Sound.voice();
          if (v) u.voice = v;
          u.rate = 0.95;
          u.pitch = 1.1;
          u.onend = () => this.finish(h, 'ok');
          u.onerror = () => this.finish(h, 'error');
          h.utter = u;
          speechSynthesis.speak(u);
          this.arm(h, 9);
        } catch (e) { this.finish(h, 'error'); }
        return;
      }
      // さきよみ ずみなら メモリから すぐ ならす（よみこみ待ち なし）
      const ac = Sound.context();
      const buf = Buffers.get(h.src);
      if (buf && ac && ac.state === 'running' && ensureVoiceBus()) {
        h.buf = buf;
        h.offset = 0;
        this.startBuffer(h);
        return;
      }
      const el = voiceCh.el;
      el.onended = () => this.finish(h, 'ok');
      el.onerror = () => this.finish(h, 'error');
      el.onplaying = () => { if (h.audibleAt == null) h.audibleAt = performance.now(); };
      el.loop = false;
      setSrc(voiceCh, h.src);
      level(voiceCh, true, 0.01);
      const p = el.play();
      if (p && p.catch) p.catch((e) => { if (this.cur === h && e && e.name !== 'AbortError') this.finish(h, 'error'); });
      this.arm(h, (h.duration || 4) + 2);
    },
    startBuffer(h) {
      const ac = Sound.context();
      const node = ac.createBufferSource();
      node.buffer = h.buf;
      node.connect(voiceBus);
      node.onended = () => { if (h.node === node && this.cur === h) this.finish(h, 'ok'); }; // じっさいの さいせい しゅうりょう
      h.node = node;
      h.startedAt = ac.currentTime - h.offset;
      node.start(0, h.offset);
      if (h.audibleAt == null) h.audibleAt = performance.now();
      this.arm(h, h.buf.duration - h.offset + 2);
    },
    stopNode(h) {
      if (!h || !h.node) return;
      const n = h.node;
      h.node = null; // onended で おわり あつかい しない
      try { n.stop(); } catch (e) { /* もう とまっている */ }
    },
    cancel() {
      const all = this.q.splice(0);
      if (this.cur) all.push(this.cur);
      this.stopNode(this.cur);
      this.cur = null;
      clearTimeout(this.watchdog);
      voiceCh.el.onended = voiceCh.el.onerror = null;
      voiceCh.el.pause();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      for (const h of all) { if (!h.done) { h.done = true; h.cancelled = true; } }
      setDuck(false);
    },
    pause() {
      clearTimeout(this.watchdog);
      const h = this.cur;
      if (!h) return;
      if (h.text != null) { // よみあげは とちゅうから に できないので さいかいで いちから
        h.utter.onend = h.utter.onerror = null;
        speechSynthesis.cancel();
        this.cur = null;
        this.q.unshift(h);
        h.started = false;
      } else if (h.buf) { // メモリの おと: いまの いちを おぼえて とめる（さいかいで つづきから）
        if (h.node) {
          h.offset = Math.min(h.buf.duration, Sound.context().currentTime - h.startedAt);
          this.stopNode(h);
        }
      } else voiceCh.el.pause();
    },
    resume() {
      const h = this.cur;
      if (h && h.buf) {
        if (!h.node && Sound.context() && Sound.context().state === 'running') this.startBuffer(h);
        else if (!h.node) setTimeout(() => { if (!blocked() && this.cur === h) this.resume(); }, 50); // AudioContext の さいかい まち
      } else if (h && h.src) {
        tryPlay(voiceCh);
        const left = (h.duration || 4) - (voiceCh.el.currentTime || 0);
        this.arm(h, left + 2);
      } else this.pump();
    },
    get busy() { return !!this.cur || this.q.length > 0; },
  };

  /* ---------------- はなびの おと（1かい だけ・くりかえさない） ---------------- */
  let fwFade = null;
  const Fireworks = {
    playing: false,
    start() {
      clearInterval(fwFade);
      this.playing = true;
      fwCh.el.loop = false;
      fwCh.el.onended = () => { this.playing = false; };
      setSrc(fwCh, MEDIA.sfx.fireworks.src);
      fwCh.fade = 1;
      level(fwCh, opt.sfx, 0.01);
      if (opt.sfx && !blocked()) tryPlay(fwCh);
      else if (!opt.sfx) this.stop(0);
    },
    stop(sec = 0.4) {
      if (!this.playing && fwCh.el.paused) return;
      this.playing = false;
      clearInterval(fwFade);
      if (sec <= 0) {
        fwCh.el.pause();
        return;
      }
      const t0 = performance.now();
      fwFade = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
        fwCh.fade = 1 - k;
        level(fwCh, opt.sfx, 0.02);
        if (k >= 1) {
          clearInterval(fwFade);
          fwCh.el.pause();
        }
      }, 40);
    },
  };

  function setDuck(on) {
    ducked = on;
    bgmCh.duck = on ? DUCK_BGM : 1;
    fwCh.duck = on ? DUCK_FW : 1;
    // もどす ときも その ときの せってい を みる（オフに した おとを かってに ならさない）
    level(bgmCh, opt.music, 0.12);
    level(fwCh, opt.sfx, 0.12);
    Sound.duck(on);
  }

  function setOption(k, v) {
    opt[k] = v;
    if (k === 'music') BGM.refresh();
    if (k === 'voice' && !v) Voice.cancel();
    if (k === 'sfx' && !v) Fireworks.stop(0.2);
    if (k === 'sfx') level(fwCh, v);
  }

  // ゲームの ポーズ（held）と タブの かくれ（hidden）
  function setHeld(on) {
    held = on;
    sync();
  }
  function setHidden(on) {
    hidden = on;
    sync();
  }
  function sync() {
    if (blocked()) {
      bgmCh.el.pause();
      Voice.pause();
      if (Fireworks.playing) fwCh.el.pause();
    } else {
      BGM.refresh();
      Voice.resume();
      if (Fireworks.playing && opt.sfx) tryPlay(fwCh);
    }
  }

  // さいしょの タップ・キー（ユーザー操作）の なかで よぶ
  function unlock() {
    [bgmCh, voiceCh, fwCh].forEach(connect);
    ensureVoiceBus();
    Buffers.decodeAll();
    if (unlocked) return;
    unlocked = true;
    for (const ch of [voiceCh, fwCh]) {
      if (ch.src) continue;
      ch.el.src = SILENT;
      const p = ch.el.play();
      if (p && p.then) p.then(() => { if (ch.el.src === SILENT || !ch.src) ch.el.pause(); }).catch(() => {});
    }
    BGM.refresh(); // まだ ながせて いなかった きょくを ここで ならす
  }

  // かくにん用（よみとり だけ）
  const state = () => {
    const s = (ch) => ({ src: (ch.src || '').split('/').pop(), paused: ch.el.paused, t: +(ch.el.currentTime || 0).toFixed(2), vol: ch.gain ? +ch.gain.gain.value.toFixed(2) : +ch.el.volume.toFixed(2) });
    return { bgm: { want: BGM.want, cur: BGM.cur, ...s(bgmCh) }, voice: { ...s(voiceCh), cur: Voice.cur && (Voice.cur.key || Voice.cur.src || 'tts'), queued: Voice.q.length }, fw: { playing: Fireworks.playing, ...s(fwCh) }, ducked, synthTitle: Sound.musicPlaying() };
  };

  // こえを さきよみ（イベントボイスは はじめに ぜんぶ、声援は つかう まえに すこしずつ）
  const preload = (src) => Buffers.load(src);
  Object.values(MEDIA.voice).forEach((v) => preload(v.src));
  const isReady = (src) => !!Buffers.get(src);
  // かくにん用: ボイスの 出口に つないだ アナライザー（じっさいに 声が でているか はかる）
  const tapVoice = () => {
    const ac = Sound.context();
    if (!ac || !ensureVoiceBus()) return null;
    const an = ac.createAnalyser();
    an.fftSize = 512;
    voiceBus.connect(an);
    voiceCh.gain && voiceCh.gain.connect(an);
    return an;
  };

  return { BGM, Voice, Fireworks, setOption, setHeld, setHidden, unlock, state, preload, isReady, tapVoice, get ducked() { return ducked; } };
})();
