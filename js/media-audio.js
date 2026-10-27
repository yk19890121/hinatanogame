'use strict';
/* =========================================================
   ファイルの おと（BGM・ボイス・はなびの おと）
   BGM=おんがく / ボイス=よみあげ こえ / アイテム声援 / はなび=こうかおん
   - BGM は つねに 1きょく（ひとつの <audio> を つかいまわす）。おなじ きょくの まま がめんを かえても とめない
   - ボイスは じゅんばんに 1ほんずつ（WAV と もんだいの よみあげを おなじ れつで）
   - アイテム声援は ボイスより うしろ（ボイスが あれば はぶく・ボイスが きたら ゆずる）
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
  const bgmCh = channel(1), voiceCh = channel(1), itemCh = channel(1), sfxCh = channel(1), fwCh = channel(0.75);
  // きょく ごとの おおきさ あわせ（はかった 平均音量: ステージ曲 ≒ -18.4dB、えらび画面の 曲 ≒ -16.4dB、クリアごの 曲 ≒ -19.0dB）
  const TRACK_GAIN = { select: 0.8 };
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
    want: null, // いまの がめんに あう きょく
    cur: null,  // <audio> に はいっている きょく
    play(id, { restart = false } = {}) {
      this.want = id;
      Sound.stopMusic(); // まえの じどう作曲の おんがくは もう つかわない（かさねない）
      if (!id) {
        this.cur = null;
        bgmCh.el.pause();
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
      if (this.want && this.cur !== this.want) this.play(this.want);
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
      Item.stop(ITEM_CUT); // ゆうせんの こえが きたら アイテム声援は みじかく けして ゆずる
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
      Item.stop(ITEM_CUT);
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

  /* ---------------- アイテム声援（ダンベル・プロテイン） ---------------- */
  // とった しゅんかんに 1かい だけ。まてない ときは はぶく（あとから おくれて ならさない・れつに ならべない）
  // - ボイス（正解・ボス・クリア・もんだいの よみあげ・カットインの 声援 など）が なっている／まっている → はぶく
  // - アイテム声援の あいだに ボイスが きたら → みじかく けして ボイスへ
  // - アイテム声援どうし → まえの を みじかく フェードアウトして あたらしい ほうへ
  const ITEM_FADE = 0.12, ITEM_CUT = 0.06;
  const Item = {
    cur: null,
    play(key) {
      const m = MEDIA.voice[key];
      const h = { key, src: m.src, duration: m.duration, done: false, ok: false, skipped: false, error: false };
      if (!opt.voice || blocked() || Voice.busy) {
        h.done = h.skipped = true;
        return h;
      }
      this.stop(ITEM_FADE);
      this.cur = h;
      setDuck(true, 'item');
      // さきよみ ずみなら メモリから すぐ（よみこみ待ち なし）
      const ac = Sound.context();
      const buf = Buffers.get(h.src);
      if (buf && ac && ac.state === 'running' && ensureVoiceBus()) {
        h.buf = buf;
        h.offset = 0;
        this.startBuffer(h);
        return h;
      }
      const el = itemCh.el;
      h.el = true;
      el.onended = () => this.end(h, 'ok');
      el.onerror = () => this.end(h, 'error');
      el.onplaying = () => { if (h.audibleAt == null) h.audibleAt = performance.now(); };
      el.loop = false;
      setSrc(itemCh, h.src);
      level(itemCh, true, 0.01);
      const p = el.play();
      if (p && p.catch) p.catch((e) => { if (this.cur === h && e && e.name !== 'AbortError') this.end(h, 'error'); });
      return h;
    },
    startBuffer(h) {
      const ac = Sound.context();
      const g = ac.createGain(); // フェードアウト用（1かいごとに つくる）
      g.connect(voiceBus);
      const node = ac.createBufferSource();
      node.buffer = h.buf;
      node.connect(g);
      node.onended = () => { if (h.node === node) this.end(h, 'ok'); };
      h.node = node;
      h.gain = g;
      h.startedAt = ac.currentTime - h.offset;
      node.start(0, h.offset);
      if (h.audibleAt == null) h.audibleAt = performance.now();
    },
    end(h, how) {
      if (h.done) return;
      h.done = true;
      h[how] = true;
      h.node = null;
      if (this.cur !== h) return;
      this.cur = null;
      setTimeout(() => { if (!this.cur) setDuck(false, 'item'); }, 140);
    },
    // sec びょうで フェードアウトして おわり（0 なら すぐ）
    stop(sec = 0) {
      const h = this.cur;
      if (!h) return;
      this.cur = null;
      h.done = true;
      h.cancelled = true;
      const n = h.node, ac = Sound.context();
      h.node = null;
      if (n) {
        try {
          if (sec > 0 && ac.state === 'running') {
            h.gain.gain.setValueAtTime(1, ac.currentTime);
            h.gain.gain.linearRampToValueAtTime(0, ac.currentTime + sec);
            n.stop(ac.currentTime + sec + 0.02);
          } else n.stop();
        } catch (e) { /* もう とまっている */ }
      } else if (h.el) {
        itemCh.el.onended = itemCh.el.onerror = itemCh.el.onplaying = null;
        itemCh.el.pause();
      }
      setDuck(false, 'item');
    },
    pause() {
      const h = this.cur;
      if (!h) return;
      if (h.buf) { // いまの いちを おぼえて とめる（さいかいで つづきから）
        if (h.node) {
          h.offset = Math.min(h.buf.duration, Sound.context().currentTime - h.startedAt);
          const n = h.node;
          h.node = null;
          try { n.stop(); } catch (e) { /* もう とまっている */ }
        }
      } else itemCh.el.pause();
    },
    resume() {
      const h = this.cur;
      if (!h) return;
      if (h.buf) {
        if (h.node) return;
        if (Sound.context() && Sound.context().state === 'running') this.startBuffer(h);
        else setTimeout(() => { if (!blocked() && this.cur === h) this.resume(); }, 50); // AudioContext の さいかい まち
      } else tryPlay(itemCh);
    },
  };

  /* ---------------- みじかい こうかおん（カットインの「シュッ」など） ---------------- */
  // メモリに さきよみして すぐ ならす。こうかおん オフ・ポーズ中は ならさない（ポーズで とめて つづきは ならさない）
  // おおきさ: 剣の 音は もとが とても 大きい（はじめの 0.2びょう ≒ -2dB）ので、声援の ことばが かくれない ように さげる
  const SFX_GAIN = { cutinIn: 0.3 };
  const Sfx = {
    cur: [],
    play(key) {
      const m = MEDIA.sfx[key];
      if (!opt.sfx || blocked()) return;
      const ac = Sound.context();
      const buf = Buffers.get(m.src);
      if (buf && ac && ac.state === 'running') {
        const g = ac.createGain();
        g.gain.value = SFX_GAIN[key] || 1;
        g.connect(Sound.output());
        const node = ac.createBufferSource();
        node.buffer = buf;
        node.connect(g);
        node.onended = () => { this.cur = this.cur.filter((n) => n !== node); };
        this.cur.push(node);
        node.start();
        return;
      }
      // まだ メモリに ない（file:// など）: <audio> で
      sfxCh.track = SFX_GAIN[key] || 1;
      setSrc(sfxCh, m.src);
      level(sfxCh, true, 0.01);
      tryPlay(sfxCh);
    },
    stop() {
      this.cur.splice(0).forEach((n) => { try { n.stop(); } catch (e) { /* もう とまっている */ } });
      sfxCh.el.pause();
    },
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

  // ボイス・アイテム声援の どちらかが なっている あいだ さげる
  const duckBy = { voice: false, item: false };
  function setDuck(v, who = 'voice') {
    duckBy[who] = v;
    const on = duckBy.voice || duckBy.item;
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
    if (k === 'sfx' && !v) {
      Fireworks.stop(0.2);
      Sfx.stop();
    }
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
      Item.pause();
      Sfx.stop();
      if (Fireworks.playing) fwCh.el.pause();
    } else {
      BGM.refresh();
      Voice.resume();
      Item.resume();
      if (Fireworks.playing && opt.sfx) tryPlay(fwCh);
    }
  }

  // さいしょの タップ・キー（ユーザー操作）の なかで よぶ
  function unlock() {
    [bgmCh, voiceCh, itemCh, sfxCh, fwCh].forEach(connect);
    ensureVoiceBus();
    Buffers.decodeAll();
    if (unlocked) return;
    unlocked = true;
    for (const ch of [voiceCh, itemCh, sfxCh, fwCh]) {
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
    return { bgm: { want: BGM.want, cur: BGM.cur, ...s(bgmCh) }, voice: { ...s(voiceCh), cur: Voice.cur && (Voice.cur.key || Voice.cur.src || 'tts'), queued: Voice.q.length }, item: Item.cur && Item.cur.key, fw: { playing: Fireworks.playing, ...s(fwCh) }, ducked, synthTitle: Sound.musicPlaying() };
  };

  // こえを さきよみ（イベントボイスは はじめに ぜんぶ、声援は つかう まえに すこしずつ）
  const preload = (src) => Buffers.load(src);
  Object.values(MEDIA.voice).forEach((v) => preload(v.src));
  preload(MEDIA.sfx.cutinIn.src);
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

  return { BGM, Voice, Item, Sfx, Fireworks, setOption, setHeld, setHidden, unlock, state, preload, isReady, tapVoice, get ducked() { return ducked; } };
})();
