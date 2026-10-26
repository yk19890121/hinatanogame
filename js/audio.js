'use strict';
/* =========================================================
   おと（こうかおん・BGM・よみあげ こえ）
   ファイルを つかわず、ぜんぶ その場で つくる
   ========================================================= */
const Sound = (() => {
  let ac = null, out, sfxBus, musBus, delayIn, noiseBuf;
  const opt = { sfx: true, music: true, voice: true };
  const MUSIC_VOL = 0.15;

  // iPhone / iPad は さいしょの よみあげを タップの なかで しないと しゃべらない
  let speechUnlocked = false;
  function unlockSpeech() {
    if (speechUnlocked || !('speechSynthesis' in window)) return;
    speechUnlocked = true;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) { /* noop */ }
  }

  function init() {
    unlockSpeech();
    if (ac) {
      if (ac.state === 'suspended') ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.connect(ac.destination);
    out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    sfxBus = ac.createGain();
    sfxBus.gain.value = opt.sfx ? 0.55 : 0;
    sfxBus.connect(out);
    musBus = ac.createGain();
    musBus.gain.value = opt.music ? MUSIC_VOL : 0;
    musBus.connect(out);
    // メロディ用の やまびこ
    delayIn = ac.createDelay(1);
    delayIn.delayTime.value = 0.27;
    const fb = ac.createGain();
    fb.gain.value = 0.3;
    const wet = ac.createGain();
    wet.gain.value = 0.32;
    delayIn.connect(fb);
    fb.connect(delayIn);
    delayIn.connect(wet);
    wet.connect(musBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (pendingSong) startMusic(pendingSong);
  }

  function tone(o) {
    if (!ac) return;
    const t0 = o.at != null ? o.at : ac.currentTime + (o.when || 0);
    const dur = o.dur || 0.2;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    const v = o.vol == null ? 0.3 : o.vol;
    const a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (o.lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus || sfxBus);
    if (o.send) g.connect(delayIn);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    if (!ac) return;
    const t0 = o.at != null ? o.at : ac.currentTime + (o.when || 0);
    const dur = o.dur || 0.2;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.ft || 'lowpass';
    f.frequency.setValueAtTime(o.ff || 1200, t0);
    if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t0 + dur);
    f.Q.value = o.q || 0.7;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  const sfx = {
    jump() {
      tone({ f: 330, f2: 720, type: 'triangle', dur: 0.16, vol: 0.22 });
      tone({ f: 660, f2: 1300, type: 'sine', dur: 0.1, vol: 0.06 });
    },
    land() { noise({ dur: 0.07, vol: 0.06, ff: 900 }); },
    coin() {
      tone({ f: 1175, type: 'triangle', dur: 0.08, vol: 0.18 });
      tone({ f: 1760, type: 'triangle', dur: 0.3, vol: 0.18, when: 0.06 });
      tone({ f: 3520, type: 'sine', dur: 0.2, vol: 0.04, when: 0.06 });
    },
    stomp() {
      tone({ f: 520, f2: 140, type: 'sine', dur: 0.2, vol: 0.4 });
      noise({ dur: 0.08, vol: 0.12, ff: 2200 });
    },
    bump() { tone({ f: 170, f2: 90, type: 'triangle', dur: 0.12, vol: 0.32 }); },
    hurt() {
      tone({ f: 620, f2: 180, type: 'sawtooth', dur: 0.32, vol: 0.06, lp: 1800 });
      tone({ f: 320, f2: 100, type: 'triangle', dur: 0.4, vol: 0.28 });
    },
    correct() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.24, vol: 0.24, when: i * 0.075 }));
      [1047, 1319, 1568].forEach((f) => tone({ f, type: 'sine', dur: 0.7, vol: 0.06, when: 0.3 }));
    },
    wrong() {
      tone({ f: 233, type: 'triangle', dur: 0.16, vol: 0.22 });
      tone({ f: 196, type: 'triangle', dur: 0.32, vol: 0.22, when: 0.17 });
    },
    whoosh() { noise({ dur: 0.35, vol: 0.22, ff: 500, ff2: 3500, ft: 'bandpass', q: 1.2 }); },
    crash() {
      noise({ dur: 0.7, vol: 0.45, ff: 3200, ff2: 160 });
      tone({ f: 130, f2: 38, type: 'sine', dur: 0.55, vol: 0.6 });
      noise({ dur: 0.3, vol: 0.2, ff: 6000, ft: 'highpass', when: 0.05 });
    },
    punch() {
      noise({ dur: 0.16, vol: 0.35, ff: 1500, ft: 'bandpass' });
      tone({ f: 220, f2: 55, type: 'sine', dur: 0.24, vol: 0.55 });
    },
    spring() {
      tone({ f: 180, f2: 950, type: 'sine', dur: 0.36, vol: 0.28, slide: 0.32 });
      tone({ f: 270, f2: 1400, type: 'triangle', dur: 0.3, vol: 0.08, when: 0.04 });
    },
    power() {
      for (let i = 0; i < 8; i++) tone({ f: 392 * Math.pow(1.15, i), type: 'sine', dur: 0.16, vol: 0.09, when: i * 0.035 });
    },
    heal() {
      [784, 988, 1175, 1568].forEach((f, i) => tone({ f, type: 'sine', dur: 0.25, vol: 0.14, when: i * 0.06 }));
    },
    pop() { tone({ f: 600, f2: 1400, type: 'sine', dur: 0.09, vol: 0.16 }); },
    select() { tone({ f: 880, type: 'triangle', dur: 0.1, vol: 0.18 }); tone({ f: 1320, type: 'sine', dur: 0.12, vol: 0.06, when: 0.04 }); },
    bossHit() {
      noise({ dur: 0.4, vol: 0.35, ff: 2500, ff2: 300 });
      tone({ f: 160, f2: 50, type: 'square', dur: 0.3, vol: 0.12, lp: 900 });
    },
    bossDown() {
      noise({ dur: 1.2, vol: 0.5, ff: 4000, ff2: 120 });
      tone({ f: 90, f2: 30, type: 'sine', dur: 1.0, vol: 0.6 });
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, type: 'triangle', dur: 0.3, vol: 0.18, when: 0.5 + i * 0.09 }));
    },
    clear() {
      const seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [988, 0.6], [1047, 0.72], [1319, 0.84]];
      seq.forEach(([f, w]) => tone({ f, type: 'triangle', dur: 0.32, vol: 0.24, when: w }));
      [523, 659, 784, 1047].forEach((f) => tone({ f, type: 'sine', dur: 1.6, vol: 0.06, when: 0.84 }));
    },
    firework() {
      noise({ dur: 0.5, vol: 0.16, ff: 3000, ff2: 400, when: 0 });
      tone({ f: 900, f2: 300, type: 'sine', dur: 0.25, vol: 0.05 });
    },
  };

  /* ---------- BGM（かんたんな シーケンサー） ---------- */
  let song = null, pendingSong = null, step = 0, nextTime = 0, timer = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function buildSong(def) {
    const rng = mulberry32(def.seed || 1);
    const penta = [0, 2, 4, 7, 9];
    const notes = [];
    const bars = def.prog.length;
    let prev = def.root + 12 + 4;
    for (let bar = 0; bar < bars; bar++) {
      const ch = def.prog[bar];
      for (let s = 0; s < 16; s += 2) {
        const p = s === 0 ? 0.95 : s === 8 ? 0.8 : 0.55;
        if (rng() > p) continue;
        const cands = [];
        for (let o = 0; o < 2; o++) {
          ch.forEach((c) => cands.push(def.root + 12 + c + o * 12));
          penta.forEach((c) => cands.push(def.root + 12 + c + o * 12));
        }
        cands.sort((x, y) => Math.abs(x - prev) - Math.abs(y - prev) + (rng() - 0.5) * 6);
        let m = cands[(rng() * 3) | 0];
        if (s === 0) m = def.root + 12 + ch[(rng() * 3) | 0] + (prev > def.root + 20 ? 12 : 0);
        m = clamp(m, def.root + 7, def.root + 26);
        prev = m;
        notes.push({ step: bar * 16 + s, m, len: rng() < 0.3 ? 4 : 2 });
      }
    }
    // 2ばんめは さいごを ルートで おわらせる
    const second = notes.map((n) => ({ ...n, step: n.step + bars * 16 }));
    const lastBar = (bars * 2 - 1) * 16;
    const filtered = second.filter((n) => n.step < lastBar + 8);
    filtered.push({ step: lastBar + 8, m: def.root + 12, len: 8 });
    return { ...def, melody: notes.concat(filtered), length: bars * 32 };
  }

  function playStep(st, t) {
    const sp = 60 / song.bpm / 4;
    const bars = song.prog.length;
    const bar = Math.floor(st / 16) % bars;
    const s = st % 16;
    const ch = song.prog[bar];
    const root = song.root;
    const B = musBus;
    // ドラム
    if (s === 0 || s === 8 || (song.boss && s === 10)) tone({ at: t, f: 150, f2: 45, type: 'sine', dur: 0.22, vol: 0.9, bus: B });
    if (s === 4 || s === 12) noise({ at: t, dur: 0.14, vol: 0.32, ff: 1800, ft: 'bandpass', q: 0.8, bus: B });
    if (s % 2 === 0) noise({ at: t, dur: 0.04, vol: s % 4 === 2 ? 0.14 : 0.07, ff: 7000, ft: 'highpass', bus: B });
    // ベース
    const bassPat = song.boss ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 3, 6, 8, 11, 14];
    if (bassPat.includes(s)) {
      const m = root - 24 + ch[0];
      tone({ at: t, f: mtof(m), type: 'triangle', dur: sp * 1.8, vol: 0.55, bus: B });
      tone({ at: t, f: mtof(m + 12), type: 'square', dur: sp * 1.2, vol: 0.05, lp: 700, bus: B });
    }
    // アルペジオ
    if (s % 2 === 0) {
      const m = root + ch[(s / 2) % 3] + (s >= 8 ? 12 : 0);
      tone({ at: t, f: mtof(m), type: 'sine', dur: sp * 1.6, vol: 0.12, bus: B });
    }
    // メロディ
    for (const n of song.melody) {
      if (n.step === st) {
        tone({ at: t, f: mtof(n.m), type: 'triangle', dur: sp * n.len * 0.95, vol: 0.32, bus: B, send: true, attack: 0.01 });
        tone({ at: t, f: mtof(n.m), type: 'square', dur: sp * n.len * 0.8, vol: 0.035, bus: B, detune: 7, lp: 2600 });
      }
    }
  }

  function schedule() {
    if (!ac || !song) return;
    const sp = 60 / song.bpm / 4;
    while (nextTime < ac.currentTime + 0.12) {
      playStep(step, nextTime);
      nextTime += sp;
      step = (step + 1) % song.length;
    }
  }

  function startMusic(def) {
    pendingSong = def;
    if (!ac) return;
    if (song && song.id === def.id && timer) return;
    stopMusic();
    pendingSong = def;
    song = buildSong(def);
    song.id = def.id;
    step = 0;
    nextTime = ac.currentTime + 0.08;
    timer = setInterval(schedule, 25);
  }

  function stopMusic() {
    if (timer) clearInterval(timer);
    timer = null;
    song = null;
    pendingSong = null;
  }

  /* ---------- よみあげ ---------- */
  let voice = null;
  function chooseVoice() {
    if (!('speechSynthesis' in window)) return;
    const list = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang));
    const prefer = ['Nanami', 'Google', 'Kyoko', 'O-Ren', 'Haruka', 'Ayumi', 'Sayaka'];
    for (const p of prefer) {
      const v = list.find((x) => x.name.includes(p));
      if (v) { voice = v; return; }
    }
    voice = list[0] || null;
  }
  if ('speechSynthesis' in window) {
    chooseVoice();
    speechSynthesis.onvoiceschanged = chooseVoice;
  }

  function duck(on) {
    if (!ac || !opt.music) return;
    musBus.gain.setTargetAtTime(on ? MUSIC_VOL * 0.35 : MUSIC_VOL, ac.currentTime, 0.08);
  }

  function speak(text) {
    if (!opt.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1.1;
      u.onstart = () => duck(true);
      u.onend = () => duck(false);
      u.onerror = () => duck(false);
      speechSynthesis.speak(u);
    } catch (e) { /* よみあげ できない きかい でも あそべる */ }
  }

  function setOption(k, v) {
    opt[k] = v;
    if (!ac) return;
    if (k === 'music') musBus.gain.setTargetAtTime(v ? MUSIC_VOL : 0, ac.currentTime, 0.05);
    if (k === 'sfx') sfxBus.gain.setTargetAtTime(v ? 0.55 : 0, ac.currentTime, 0.05);
    if (k === 'voice' && !v && 'speechSynthesis' in window) speechSynthesis.cancel();
  }

  function suspend(on) {
    if (!ac) return;
    if (on) ac.suspend();
    else ac.resume();
  }

  const play = (name) => { if (sfx[name]) sfx[name](); };
  // ファイルの おと（media-audio.js）と AudioContext を きょうゆう する
  const context = () => ac;
  const output = () => out;
  const musicPlaying = () => !!timer;
  const getVoice = () => voice;
  return { init, play, startMusic, stopMusic, speak, setOption, suspend, duck, context, output, musicPlaying, voice: getVoice };
})();
