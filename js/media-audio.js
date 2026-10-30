'use strict';
/* =========================================================
   ファイルの おと（BGM・ボイス・はなびの おと）
   BGM=おんがく / ボイス=よみあげ こえ / アイテム声援 / こうかおん / はなび
   - BGM は ランダム選曲。きりかえと ループは クロスフェード（かさなるのは 2きょく まで）。おなじ きょくの まま がめんを かえても とめない
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
  const voiceCh = channel(1), itemCh = channel(1), sfxCh = channel(1), fwCh = channel(0.75);
  // こえの あいだの BGM・はなび（うたも ある ていど きこえる くらいに さげる）
  const DUCK_BGM = 0.6, DUCK_FW = 0.5, DUCK_RARE = 0.3;

  function connectTo(ch, dest) {
    const ac = Sound.context();
    if (!useGraph || !ac || !dest || ch.gain) return;
    try {
      const node = ac.createMediaElementSource(ch.el);
      ch.gain = ac.createGain();
      node.connect(ch.gain);
      ch.gain.connect(dest);
      // ここからは 音量を WebAudio の つまみで きめる。つなぐ まえに <audio> の 音量を 0 に して いても もとに もどす
      //（<audio> の 音量は つないだ あとも かかる ため、0 の ままだと ずっと むおん）
      ch.el.volume = 1;
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

  /* ---------------- BGM（ランダム選曲・クロスフェード・ループ） ----------------
     - 候補（MEDIA.bgmPool）を シャッフルして じゅんばんに。ひとまわり したら シャッフルしなおし（つなぎめでも おなじ 曲は つづかない）
     - きりかえ: まえの 曲は 2びょうで フェードアウト、あたらしい 曲は すぐ 0.5びょうで フェードイン（むおんの すきま なし）
     - おなじ 曲の ループも おなじ（おわりの 2びょうを フェードアウト しながら、あたまを 0.5びょうで フェードイン）
     - <audio> 3つを つかいまわす。かさなるのは 2きょく まで（3きょくめが きたら いちばん ふるい フェードアウト中の 曲を すぐ とめる）
     - フェード（曲ごと）と こえの あいだの 音量さげ（BGM全体）は べつの つまみ なので ぶつからない */
  const FADE_IN = 0.5, FADE_OUT = 2;
  const LOOP_MIN = FADE_OUT * 2 + FADE_IN; // これより みじかい 曲は ふつうの ループ（フェードが かさならない ように）
  let bgmBus = null; // BGM全体の 音量（オン・オフ と こえの あいだの さげ）
  let bgmDuck = 1;
  const players = [0, 1, 2].map(() => Object.assign(channel(1), { id: null, role: 'idle', vol: 0, from: 0, to: 0, ft: 0, fdur: 0, looping: false, fresh: false }));
  const trackOf = (id) => (id === 'clear' ? MEDIA.bgm.clear : MEDIA.bgmPool.find((t) => t.id === id));
  // すすみぐあい 0→1。フェードアウトは はじめ はやめに さげる（2きょくの あいだ 大きく なりすぎない。のこりは (1-p)²）
  const curve = (p, out) => (out ? 1 - (1 - p) * (1 - p) : p);

  function applyPlayer(p, smooth = 0.03) {
    const v = p.vol * (p.track || 1);
    const ac = Sound.context();
    if (p.gain && ac) {
      p.gain.gain.setTargetAtTime(v, ac.currentTime, smooth);
      if (p.el.volume !== 1) p.el.volume = 1;
    } else p.el.volume = clamp(v * bgmDuck * (opt.music ? 1 : 0), 0, 1);
  }
  function applyBus(smooth = 0.12) {
    const ac = Sound.context();
    if (bgmBus && ac) bgmBus.gain.setTargetAtTime(opt.music ? bgmDuck : 0, ac.currentTime, smooth);
    players.forEach((p) => applyPlayer(p));
  }
  function stopPlayer(p) {
    p.role = 'idle';
    p.id = null;
    p.vol = 0;
    p.el.pause();
    applyPlayer(p, 0.01);
  }
  function fade(p, to, dur) {
    p.from = p.vol;
    p.to = to;
    p.ft = 0;
    p.fdur = dur;
  }

  const Bag = {
    list: [],
    pick(avoid) {
      const ids = MEDIA.bgmPool.map((t) => t.id);
      if (!this.list.length) {
        this.list = shuffle(ids);
        if (this.list.length > 1 && this.list[0] === avoid) this.list.push(this.list.shift());
      }
      return this.list.shift();
    },
  };

  const BGM = {
    cur: null,      // いま ながしている 曲（'clear' か 候補の id）
    lastPick: null, // さいごに ランダムで えらんだ 曲
    main() { return players.find((p) => p.role === 'main') || null; },
    // ランダムに あたらしい 曲へ（タイトル・ステージ開始・とちゅうで やめた とき）
    shuffle() {
      const id = Bag.pick(this.lastPick || this.cur);
      this.lastPick = id;
      this.switchTo(id);
    },
    // 'clear' など きまった 曲。おなじ 曲が ながれていれば つづける（restart で あたまから）
    play(id, { restart = false } = {}) {
      if (this.cur === id && !restart) return this.refresh();
      this.switchTo(id);
    },
    switchTo(id, { loop = false } = {}) {
      Sound.stopMusic(); // まえの じどう作曲の おんがくは もう つかわない
      const old = this.main();
      // 3きょく かさならない ように、まえから フェードアウト中の 曲は すぐ とめる
      players.filter((p) => p.role === 'out').forEach(stopPlayer);
      if (old) {
        old.role = 'out';
        fade(old, 0, FADE_OUT);
      }
      const p = players.find((x) => x.role === 'idle');
      const t = trackOf(id);
      this.cur = id;
      p.role = 'main';
      p.id = id;
      p.track = t.gain || 1;
      p.looping = false;
      p.vol = 0;
      fade(p, 1, FADE_IN);
      p.start = t.start || 0; // 曲の あたまの 無音は とばす（フェードインが 無音の あいだに おわらない ように）
      p.end = t.end || 0;
      if (p.src !== t.src) setSrc(p, t.src); // ループの ときは よみこみずみの おなじ ファイル
      const seek = () => { try { p.el.currentTime = p.start; } catch (e) { /* まだ よみこみ中 */ } };
      const token = (p.seekToken = {});
      if (p.el.readyState >= 1) seek();
      else p.el.addEventListener('loadedmetadata', () => { if (p.seekToken === token && p.el.currentTime < p.start) seek(); }, { once: true });
      p.el.loop = false;
      p.fresh = true;
      applyPlayer(p, 0.005);
      if (opt.music && !blocked()) tryPlay(p);
    },
    // 0.04びょう ごと（ポーズ中・タブが かくれている あいだは すすめない）
    tick(dt) {
      for (const p of players) {
        if (p.role === 'idle') continue;
        if (p.fresh) { // まだ なりはじめて いない（よみこみ中）: フェードインは なりはじめてから。消える がわは すぐ とめる
          if (p.role === 'out') stopPlayer(p);
          continue;
        }
        if (p.fdur > 0 && p.ft < p.fdur) {
          p.ft = Math.min(p.fdur, p.ft + dt);
          const k = curve(p.ft / p.fdur, p.to < p.from);
          p.vol = p.from + (p.to - p.from) * k;
          applyPlayer(p);
        }
        if (p.role === 'out' && (p.ft >= p.fdur || p.el.ended)) stopPlayer(p);
      }
      const m = this.main();
      if (!m) return;
      const d = m.el.duration;
      if (!Number.isFinite(d) || d <= 0) return;
      const end = m.end > 0 ? Math.min(m.end, d) : d; // おしりの 無音の まえを「おわり」と する
      if (end - (m.start || 0) < LOOP_MIN) { m.el.loop = true; return; }
      // おわりの 2びょう まえで おなじ 曲を あたまから かさねて ループ（つなぎめに 無音を つくらない）
      if (!m.el.paused && m.el.currentTime >= end - FADE_OUT) this.switchTo(m.id, { loop: true });
    },
    // いまの 曲を sec びょうで フェードアウトして とめる（ゲームオーバー。つぎは shuffle / play で ながす）
    stop(sec = 1.5) {
      const m = this.main();
      if (m) {
        m.role = 'out';
        fade(m, 0, sec);
      }
      this.cur = null;
    },
    refresh() { // せってい・ポーズ・タブ の じょうたいに あわせる
      applyBus();
      if (!opt.music || blocked()) {
        players.forEach((p) => p.el.pause());
        if (!opt.music) players.filter((p) => p.role === 'out').forEach(stopPlayer);
        return;
      }
      for (const p of players) {
        if (p.role === 'idle' || !p.el.paused) continue;
        // まだ いちども ならせて いなかった（自動再生の せいげん など）→ あたまから フェードイン
        if (p.role === 'main' && p.fresh && (p.el.currentTime || 0) < (p.start || 0) + 0.05) {
          p.vol = 0;
          fade(p, 1, FADE_IN);
        }
        tryPlay(p);
      }
    },
  };
  players.forEach((p) => p.el.addEventListener('playing', () => { p.fresh = false; }));
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(0.25, (now - lastTick) / 1000);
    lastTick = now;
    if (!blocked() && opt.music) BGM.tick(dt);
  }, 40);

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

  /* ---------------- こうかおん（カットインの「シャキーン」、レア演出の ほら貝・マッスル群・教会の祈り） ---------------- */
  // メモリに さきよみして すぐ ならす。こうかおん オフの ときは ならさない。ポーズで とめて、さいかいで つづきから
  // おおきさ（もとの 大きさ → ならす 大きさ）
  //   シャキーン ≒ -14 LUFS → 0.7（声援の ことばが かくれない ように）
  //   ほら貝 ≒ -15 LUFS → 1.3 ≒ -12.5 LUFS（めだたせる。ただし すぐ あとから 鳴る 動画の 音を かき消さない）
  //   マッスル群の 動画の 音 ≒ -16 LUFS → 1.3 ≒ -14 LUFS（ほら貝と ならんで きこえる）
  //   レア登場（教会の祈り）≒ -16 LUFS → 2.0 ≒ -10 LUFS（大きめ。セリフの ほうが すこし 大きい）
  //   爆発2（攻撃が 当たる）≒ -16.5 LUFS → 1.0 / 爆発1（ボスを たおす）≒ -19 LUFS → 1.3（あとの「すげー！」の こえより ひくい）
  //   仲間・オトナモードの SE は もとの 大きさが -3〜-17 LUFS と ばらばら → だいたい -15 LUFS に そろえる
  //   予告（-5.6）は 聞きのがさない ように -11 くらい、ゲームオーバー・時間切れは -13 くらい
  const SFX_GAIN = {
    cutinIn: 0.7, rareHorn: 1.3, rareAppear: 2.0, rareMuscle: 1.3, blastHit: 1.0, blastDown: 1.3,
    allyJoin: 0.85, allyHit: 1.1, allyAtkGold: 0.6, allyAtkRobot: 0.85, allyAtkGod: 0.28, allyAtkGorilla: 1.1, allyAtkTower: 0.85,
    bossWarn: 0.55, bossShotPhysical: 0.85, bossShotFire: 0.75, bossShotIce: 0.7, bossShotThunder: 0.28, bossShotMagic: 0.8,
    playerDamage: 0.9, gameOver: 1.6, timeUp: 1.2,
  };
  const Sfx = {
    cur: [], // { key, buf, node, gain, offset, startedAt }
    play(key) {
      const m = MEDIA.sfx[key];
      if (!m || !opt.sfx || blocked()) return null;
      const ac = Sound.context();
      const buf = Buffers.get(m.src);
      if (buf && ac && ac.state === 'running') {
        const h = { key, buf, offset: m.start || 0, vol: SFX_GAIN[key] || 1 }; // あたまの 無音は とばす
        this.cur.push(h);
        this.start(h);
        return h;
      }
      // まだ メモリに ない（file:// など）: <audio> で
      sfxCh.track = SFX_GAIN[key] || 1;
      sfxCh.key = key;
      setSrc(sfxCh, m.src);
      try { sfxCh.el.currentTime = m.start || 0; } catch (e) { /* まだ よみこみ中 */ }
      level(sfxCh, true, 0.01);
      tryPlay(sfxCh);
      return null;
    },
    start(h) {
      const ac = Sound.context();
      h.gain = ac.createGain();
      h.gain.gain.value = h.vol;
      h.gain.connect(Sound.output());
      const node = ac.createBufferSource();
      node.buffer = h.buf;
      node.connect(h.gain);
      node.onended = () => { if (h.node === node) this.cur = this.cur.filter((x) => x !== h); };
      h.node = node;
      h.startedAt = ac.currentTime - h.offset;
      node.start(0, h.offset);
    },
    // key の 音を sec びょうで けす（key なし = ぜんぶ、sec 0 = すぐ）
    fade(key, sec = 0) {
      const ac = Sound.context();
      for (const h of this.cur.filter((x) => !key || x.key === key)) {
        this.cur = this.cur.filter((x) => x !== h);
        const n = h.node;
        h.node = null;
        if (!n) continue;
        try {
          if (sec > 0 && ac.state === 'running') {
            h.gain.gain.setValueAtTime(h.gain.gain.value, ac.currentTime);
            h.gain.gain.linearRampToValueAtTime(0, ac.currentTime + sec);
            n.stop(ac.currentTime + sec + 0.02);
          } else n.stop();
        } catch (e) { /* もう とまっている */ }
      }
      if (!key || sfxCh.key === key) sfxCh.el.pause();
    },
    stop(key) { this.fade(key, 0); },
    pause() {
      const ac = Sound.context();
      for (const h of this.cur) {
        if (!h.node) continue;
        h.offset = Math.min(h.buf.duration, ac.currentTime - h.startedAt);
        const n = h.node;
        h.node = null;
        try { n.stop(); } catch (e) { /* もう とまっている */ }
      }
      sfxCh.el.pause();
    },
    resume() {
      const ac = Sound.context();
      if (!opt.sfx) return this.stop();
      if (this.cur.some((h) => !h.node) && (!ac || ac.state !== 'running')) {
        // AudioContext の さいかい まち（うごきだした しゅんかんに つづきから。動画も おなじ まちかたを する）
        if (ac) ac.resume().then(() => { if (!blocked()) this.resume(); }, () => {});
        else setTimeout(() => { if (!blocked()) this.resume(); }, 50);
        return;
      }
      for (const h of this.cur) if (!h.node) this.start(h);
      if (sfxCh.key && sfxCh.el.paused && sfxCh.el.currentTime > 0 && !sfxCh.el.ended) tryPlay(sfxCh);
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

  // ボイス・アイテム声援・レア演出の どれかが ある あいだ さげる
  const duckBy = { voice: false, item: false, rare: false };
  function setDuck(v, who = 'voice') {
    duckBy[who] = v;
    const on = duckBy.voice || duckBy.item || duckBy.rare;
    ducked = on;
    bgmDuck = duckBy.rare ? DUCK_RARE : on ? DUCK_BGM : 1; // レア演出の あいだは もっと さげて ほら貝・登場の 音を めだたせる
    fwCh.duck = on ? DUCK_FW : 1;
    // もどす ときも その ときの せってい を みる（オフに した おとを かってに ならさない）
    applyBus(0.12);
    level(fwCh, opt.sfx, 0.12);
    Sound.duck(on);
  }

  function setOption(k, v) {
    opt[k] = v;
    const m = BGM.main();
    if (k === 'music' && v && m) { // オンに もどしたら 0.5びょうで フェードイン
      m.vol = 0;
      fade(m, 1, FADE_IN);
    }
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
      BGM.refresh(); // BGM を とめる（フェードの すすみも とまる）
      Voice.pause();
      Item.pause();
      Sfx.pause();
      if (Fireworks.playing) fwCh.el.pause();
    } else {
      BGM.refresh();
      Voice.resume();
      Item.resume();
      Sfx.resume();
      if (Fireworks.playing && opt.sfx) tryPlay(fwCh);
    }
  }

  // さいしょの タップ・キー（ユーザー操作）の なかで よぶ
  function unlock() {
    const ac = Sound.context();
    if (useGraph && ac && !bgmBus) {
      bgmBus = ac.createGain();
      bgmBus.gain.value = opt.music ? bgmDuck : 0;
      bgmBus.connect(Sound.output());
    }
    players.forEach((p) => connectTo(p, bgmBus));
    [voiceCh, itemCh, sfxCh, fwCh].forEach((ch) => connectTo(ch, Sound.output()));
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
    const bp = players.filter((p) => p.role !== 'idle').map((p) => ({ role: p.role, id: p.id, vol: +p.vol.toFixed(2), ...s(p) }));
    const m = BGM.main();
    return { bgm: { cur: BGM.cur, src: m ? s(m).src : '', t: m ? s(m).t : 0, paused: m ? m.el.paused : true, players: bp }, sfx: Sfx.cur.map((h) => h.key), voice: { ...s(voiceCh), cur: Voice.cur && (Voice.cur.key || Voice.cur.src || 'tts'), queued: Voice.q.length }, item: Item.cur && Item.cur.key, fw: { playing: Fireworks.playing, ...s(fwCh) }, ducked, synthTitle: Sound.musicPlaying() };
  };

  // こえを さきよみ（イベントボイスは はじめに ぜんぶ、声援は つかう まえに すこしずつ）
  const preload = (src) => Buffers.load(src);
  Object.values(MEDIA.voice).forEach((v) => preload(v.src));
  Object.values(MEDIA.sfx).forEach((v) => { if (v !== MEDIA.sfx.fireworks) preload(v.src); });
  const isReady = (src) => !!Buffers.get(src);
  const duck = (who, on) => setDuck(on, who); // レア演出の あいだ BGM を さげる
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

  return { BGM, Voice, Item, Sfx, Fireworks, setOption, setHeld, setHidden, unlock, state, preload, isReady, tapVoice, duck, get ducked() { return ducked; } };
})();
