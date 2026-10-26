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
    return { el, base, duck: 1, fade: 1, gain: null, src: null };
  }
  const bgmCh = channel(0.5), voiceCh = channel(1), fwCh = channel(0.75);

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
    const v = enabled ? ch.base * ch.duck * ch.fade : 0;
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
      const el = voiceCh.el;
      el.onended = () => this.finish(h, 'ok');
      el.onerror = () => this.finish(h, 'error');
      el.loop = false;
      setSrc(voiceCh, h.src);
      level(voiceCh, true, 0.01);
      const p = el.play();
      if (p && p.catch) p.catch((e) => { if (this.cur === h && e && e.name !== 'AbortError') this.finish(h, 'error'); });
      this.arm(h, (h.duration || 4) + 2);
    },
    cancel() {
      const all = this.q.splice(0);
      if (this.cur) all.push(this.cur);
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
      } else voiceCh.el.pause();
    },
    resume() {
      const h = this.cur;
      if (h && h.src) {
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
    bgmCh.duck = on ? 0.32 : 1;
    fwCh.duck = on ? 0.4 : 1;
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

  return { BGM, Voice, Fireworks, setOption, setHeld, setHidden, unlock, state, get ducked() { return ducked; } };
})();
