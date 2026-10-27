'use strict';
/* =========================================================
   ゲームの しんぞう（すすみかた・もんだい・カメラ）
   ========================================================= */
const DUST = { meadow: '#f4ead8', desert: '#ffe0b0', snow: '#ffffff', night: '#b8b0e8' };
// ダンベル声援: がめんの かず（stats.db）とは べつに かぞえる。10 → 20 → 35こ で 1しゅう（35で 0に もどす）
const DB_CHEER = { 10: 'itemDb1', 20: 'itemDb2', 35: 'itemDb3' }, DB_CYCLE = 35;
const BOSS_NEXT = 1.0; // ボスに あたってから つぎの もんだい まで（びょう）

const Game = {
  mode: 'boot',
  time: 0,
  camX: 0,
  zoom: 1,
  zoomTarget: 1,
  focus: { x: 0, y: 0 },
  shake: 0,
  flash: 0,
  projectiles: [],
  timers: [],
  fx: new FX(),
  solids: [],
  enemySolids: [],
  acc: 0,
  dprCap: 2,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.settings = Object.assign({ voice: true, music: true, sfx: true, hint: true }, Store.get('settings', {}));
    delete this.settings.maxNum; // ふるい「5まで/10まで/18まで」は むずかしさ に とうごう（つかわない）
    this.levelNo = clamp(Number(Store.get('level', 1)) || 1, 1, LEVELS.length);
    this.progress = this.loadProgress();
    this.applySettings();
    this.vignette = Render.edgeCanvas('rgba(10,0,30,0)', 'rgba(10,0,30,0.42)');
    this.powerEdge = Render.edgeCanvas('rgba(255,200,60,0)', 'rgba(255,190,40,0.9)');
    this.resize();
    window.addEventListener('resize', () => {
      clearTimeout(this._rt);
      this._rt = setTimeout(() => this.resize(), 150);
    });
    // ブラウザの 自動再生せいげん: さいしょの タップ・キーで おとを ゆるして もらう
    const unlock = () => {
      Sound.init();
      MediaAudio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('touchend', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.mode === 'play' && !this.ending) this.pause();
        MediaAudio.setHidden(true);
        Sound.suspend(true);
      } else {
        if (this.mode !== 'paused') Sound.suspend(false);
        MediaAudio.setHidden(false);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' && e.code !== 'KeyP') return;
      if (this.mode === 'play' && !this.ending) this.pause();
      else if (this.mode === 'paused') this.resume();
    });
    UI.init(this);
    this.startDemo();
    // タイトルから ステージえらびまで おなじ きょく（自動再生が だめな ときは さいしょの タップで ならす）
    MediaAudio.BGM.play('select');
    this.last = performance.now();
    requestAnimationFrame((n) => this.loop(n));
  },

  applySettings() {
    const s = this.settings;
    for (const k of ['voice', 'music', 'sfx']) {
      Sound.setOption(k, s[k]);
      MediaAudio.setOption(k, s[k]);
    }
  },

  // せいせき: 「むずかしさ-ステージ」ごとに ★を ほぞん（ふるい かたちは バックアップして うつさない）
  loadProgress() {
    const old = Store.get('progress', null);
    if (old && Store.get('progress_v1_backup', null) == null) Store.set('progress_v1_backup', old);
    const p = Store.get('progress2', null);
    return p && p.stars && typeof p.stars === 'object' && !Array.isArray(p.stars) ? p : { v: 2, stars: {} };
  },
  starKey(lv, stage) { return `${lv}-${stage + 1}`; },
  starsFor(lv, stage) { return this.progress.stars[this.starKey(lv, stage)] || 0; },

  setLevel(n) {
    this.levelNo = clamp(n, 1, LEVELS.length);
    Store.set('level', this.levelNo);
  },

  setSetting(k, v) {
    this.settings[k] = v;
    Store.set('settings', this.settings);
    this.applySettings();
    if (k === 'hint') UI.setHint(v);
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    // まどが まだ ひらいていない（たかさ 0）ときも こわれないように
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.scale = this.canvas.height / VIEW_H;
    this.viewW = this.canvas.width / this.scale;
    const AS = clamp(Math.round(this.scale * 4) / 4, 0.75, 2);
    if (AS !== this.AS) {
      this.AS = AS;
      if (this.themeKey) this.setTheme(this.themeKey);
    }
  },

  setTheme(key) {
    this.themeKey = key;
    this.theme = THEMES[key];
    this.A = Assets.get(key, this.AS, this.ctx);
    Render.initScenery(this);
    this.fx.dustColor = DUST[key];
  },

  after(t, fn) { this.timers.push({ t, fn }); },

  resetScene() {
    // まえの ステージの えんしゅつ・こえ・よやくを ぜんぶ とめる（あとから ならない ように）
    if (this.cutin) this.cutin.cancel();
    this.cutin = null;
    MediaAudio.Voice.cancel();
    MediaAudio.Fireworks.stop(0.25);
    MediaAudio.setHeld(false);
    this.fwSound = false;
    this.fwLeft = 0;
    this.fx = new FX();
    this.projectiles = [];
    this.timers = [];
    this.zoom = 1;
    this.zoomTarget = 1;
    this.shake = 0;
    this.flash = 0;
    this.activeGate = null;
    this.answering = false;
    this.ending = false;
    this.falling = false;
  },

  /* ---------------- タイトル ---------------- */
  startDemo() {
    this.resetScene();
    this.mode = 'demo';
    this.level = buildDemoLevel('meadow');
    this.setTheme('meadow');
    this.hero = new Hero(8 * T, GROUND_Y);
    this.hero.auto = { left: false, right: true, jump: false, jumpPressed: false };
    this.camX = 0;
    this.solids = [];
    this.enemySolids = [];
    this.demoT = 2;
    this.demoHold = 0;
    this.demoFlex = 7;
    UI.hud(false);
    UI.hideQuiz();
  },

  updateDemo(dt) {
    const h = this.hero, a = h.auto;
    a.jumpPressed = false;
    this.demoFlex -= dt;
    if (this.demoFlex <= 0 && h.onGround && !h.forced) {
      h.forced = 'flex';
      a.right = false;
      this.after(1.6, () => {
        h.forced = null;
        a.right = true;
      });
      this.demoFlex = 9;
    }
    this.demoT -= dt;
    if (this.demoT <= 0 && !h.forced) {
      a.jumpPressed = true;
      a.jump = true;
      this.demoHold = rand(0.12, 0.4);
      this.demoT = rand(1.8, 3.4);
    }
    if (this.demoHold > 0) {
      this.demoHold -= dt;
      if (this.demoHold <= 0) a.jump = false;
    }
    if (h.x > 330 * T) {
      const d = 300 * T;
      h.x -= d;
      h.safe.x -= d;
      this.camX -= d;
    }
  },

  // タイトル → ステージえらび（おなじ きょくを とめずに つづける）
  openSelect() {
    MediaAudio.BGM.play('select');
    UI.show('select');
  },

  // ゲーム中・クリア画面 → ステージえらび
  // クリアの あと: クリアの きょくを その いちから つづける / とちゅうで やめた: えらび画面の きょくへ
  toSelect() {
    const afterClear = this.mode === 'clear';
    if (this.mode !== 'demo') this.startDemo();
    else this.resetScene();
    Sound.suspend(false);
    MediaAudio.BGM.play(afterClear ? 'clear' : 'select');
    UI.show('select');
  },

  // ステージえらび → タイトル（えらび画面の きょく。もう ながれていれば その まま）
  toTitle() {
    MediaAudio.BGM.play('select');
    UI.show('title');
  },

  /* ---------------- ステージ ---------------- */
  startStage(i) {
    Sound.init();
    MediaAudio.unlock();
    Sound.suspend(false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    this.resetScene();
    this.stageIdx = i;
    const st = STAGES[i];
    const lv = this.levelNo;
    this.level = buildLevel(i);
    this.setTheme(st.theme);
    const L = this.level;
    this.solids = [...L.blocks, ...L.gates, ...L.podium];
    this.enemySolids = [...L.gates, ...L.podium];
    this.hero = new Hero(3 * T, GROUND_Y);
    this.camX = 0;
    this.checkpoint = { x: 3 * T, y: GROUND_Y };
    this.stats = { db: 0, correct: 0, first: 0, total: 0 };
    this.qlog = [];   // でた もんだいと けっか（おちても のこす。つぎの ステージ・さいしょから で からに）
    this.dbCheer = 0; // ダンベル声援の かず（がめんの かずとは べつ）
    this.mode = 'play';
    Input.reset();
    UI.show(null);
    UI.hud(true);
    UI.setStage(`レベル${lv}・ステージ${i + 1}`);
    UI.setHearts(3, 3);
    UI.setDb(0);
    UI.hideQuiz();
    UI.banner(`レベル${lv}・ステージ ${i + 1}`, st.name);
    // ステージ番号に あった きょくを あたまから（むずかしさが ちがっても おなじ きょく）
    MediaAudio.BGM.play(`stage${i + 1}`, { restart: true });
    Cheers.preload(3);
    this.after(0.4, () => MediaAudio.Voice.play('start'));
  },

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    UI.show('pause');
    MediaAudio.setHeld(true); // BGM・こえ・はなび を とめる（さいかいで つづきから）
    Sound.suspend(true);
  },

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'play';
    UI.show(null);
    Sound.suspend(false);
    MediaAudio.setHeld(false);
    Input.reset();
  },

  /* ---------------- まいフレーム ---------------- */
  loop(now) {
    const raw = (now - this.last) / 1000;
    const dt = Math.min(0.05, raw);
    this.last = now;
    // おそい きかいでは がしつを さげて なめらかに
    if (raw > 0 && raw < 0.1) {
      this.perfT = (this.perfT || 0) + raw;
      this.perfN = (this.perfN || 0) + 1;
      if (this.perfT > 3) {
        if (this.perfT / this.perfN > 0.026 && this.dprCap > 1) {
          this.dprCap = 1;
          this.resize();
        }
        this.perfT = 0;
        this.perfN = 0;
      }
    }
    Input.poll();
    this.acc += dt;
    const STEP = 1 / 120;
    let n = 0;
    while (this.acc >= STEP && n < 8) {
      this.update(STEP);
      Input.state.jumpPressed = false;
      this.acc -= STEP;
      n++;
    }
    if (n === 8) this.acc = 0;
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    if (this.mode === 'paused' || this.mode === 'boot') return;
    this.time += dt;
    // せいかいの カットイン中は せかいを とめる（てき・ボス・タイマー・パワーの のこりじかん）
    if (this.cutin) this.cutin.update(dt);
    const frozen = !!this.cutin;
    if (!frozen) {
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) {
          this.timers.splice(i, 1);
          tm.fn();
        }
      }
    }
    const L = this.level, h = this.hero;
    if (this.mode === 'demo') this.updateDemo(dt);
    const prevY = h.y;
    h.update(dt, this); // そうさは ロック中。ちゃくち だけ する
    if (this.mode === 'play' && !frozen) this.updatePlay(dt, prevY);
    else if (frozen) for (const b of L.blocks) b.update(dt);
    if (this.ending) this.updateFireworks(dt);
    for (const p of this.projectiles) p.update(dt, this);
    if (this.projectiles.length) this.projectiles = this.projectiles.filter((p) => !p.done);
    this.fx.update(dt);
    // カメラ
    const W = this.viewW;
    let target = h.x - W * (this.mode === 'demo' ? 0.28 : 0.4) + h.facing * 40;
    const g = this.activeGate;
    if (g && this.mode === 'play') target = Math.min(Math.max(target, g.x + g.w + (g.kind === 'boss' ? 170 : 90) - W), h.x - 90);
    target = clamp(target, 0, Math.max(0, L.width - W));
    if (!Number.isFinite(this.camX) || Math.abs(target - this.camX) > W) this.camX = target;
    const prev = this.camX;
    this.camX = damp(this.camX, target, 6, dt);
    Render.updateScenery(this, dt, this.camX - prev);
    this.zoom = damp(this.zoom, this.zoomTarget, 5, dt);
    this.shake = damp(this.shake, 0, 7, dt);
    this.flash = Math.max(0, this.flash - dt * 2.4);
  },

  updatePlay(dt, prevY) {
    const L = this.level, h = this.hero;
    let cheer = null; // この しゅんかんに ならす アイテム声援（プロテインが ゆうせん）
    for (const d of L.dumbbells) {
      if (d.taken || Math.abs(d.x - h.x) > 36 || d.y < h.y - h.h - 22 || d.y > h.y + 12) continue;
      d.taken = true;
      this.stats.db++;
      UI.setDb(this.stats.db);
      Sound.play('coin');
      this.fx.sparkle(d.x, d.y, 8, '#ffe14a', 200);
      this.fx.ring(d.x, d.y, '#fff2a0', 6, 34, 0.3, 4);
      this.dbCheer++;
      if (DB_CHEER[this.dbCheer]) cheer = DB_CHEER[this.dbCheer];
      if (this.dbCheer >= DB_CYCLE) this.dbCheer = 0; // ならせなくても ここで 1しゅう おわり
    }
    for (const p of L.proteins) {
      if (p.taken || Math.abs(p.x - h.x) > 38 || p.y < h.y - h.h - 24 || p.y > h.y + 14) continue;
      p.taken = true;
      h.hearts = Math.min(h.maxHearts, h.hearts + 1);
      UI.setHearts(h.hearts, h.maxHearts);
      Sound.play('heal');
      this.fx.sparkle(p.x, p.y, 16, '#ff7aa8', 260);
      this.fx.text('げんき もりもり！', p.x, p.y - 50, { size: 30, top: '#ffffff', bot: '#ff9ac0', stroke: '#5a0a2a' });
      cheer = 'itemProtein'; // たいりょくが まんタンでも とれたら ならす
    }
    // ほかの こえが なっている・まっている ときは はぶく（あとから ならさない）
    if (cheer) MediaAudio.Item.play(cheer);
    for (const s of L.springs) {
      s.update(dt);
      if (h.vy >= 0 && Math.abs(h.x - s.x) < 40 && prevY <= s.top + 14 && h.y >= s.top - 1) {
        h.y = s.top;
        h.jump(-1520);
        h.jumping = false;
        s.comp = 1;
        Sound.play('spring');
        this.fx.ring(s.x, s.top, '#ffffff', 10, 60, 0.35, 5);
      }
    }
    for (const e of L.enemies) {
      e.update(dt, this);
      if (!e.dead && Physics.bodies(h, e, 6)) this.heroVsEnemy(e, prevY);
    }
    for (const b of L.blocks) b.update(dt);
    for (const g of L.gates) {
      g.update(dt);
      if (g.boss) g.boss.update(dt, this);
      if (!g.active && g.state === 'locked' && h.x > g.triggerX && !this.ending) this.activateGate(g);
    }
    const G = L.goal;
    if (G && !G.reached) {
      const onTop = h.onGround && Math.abs(h.x - G.x) < 60 && h.y <= GROUND_Y - 97;
      if (onTop || h.x > G.x + 130) this.reachGoal();
    }
    if (h.y > VIEW_H + 120 && !this.falling) this.heroFell();
    if (h.power > 0 && Math.random() < 0.5) {
      this.fx.add({ type: 'spark', x: h.x + rand(-30, 30), y: h.y - rand(10, 110), vx: rand(-30, 30), vy: -rand(40, 120), life: 0.5, max: 0.5, size: rand(3, 5), color: '#ffd23f', g: 0 });
    }
  },

  /* ---------------- てき ---------------- */
  heroVsEnemy(e, prevY) {
    const h = this.hero;
    if (h.power > 0) {
      e.dead = true;
      e.launched = true;
      e.vx = (Math.sign(e.x - h.x) || 1) * 650;
      e.vy = -760;
      Sound.play('punch');
      this.fx.stars(e.x, e.y - 20, 8);
      this.fx.flash(e.x, e.y - 20, '#ffe9a0', 90, 0.3);
      this.fx.text('ドーン！', e.x, e.y - 70, { size: 34 });
      this.shake = Math.max(this.shake, 8);
      return;
    }
    if (h.vy > 0 && prevY <= e.y - e.h + 18) {
      e.dead = true;
      e.deathT = 0;
      h.vy = Input.state.jump ? -920 : -660;
      h.jumping = false;
      Sound.play('stomp');
      this.fx.stars(e.x, e.y - 16, 6);
      this.fx.ring(e.x, e.y - 10, '#ffffff', 8, 50, 0.3, 5);
      return;
    }
    this.heroHurt(e.x);
  },

  heroHurt(fromX) {
    const h = this.hero;
    if (h.invuln > 0 || h.power > 0 || h.lock > 0 || this.ending) return;
    h.hearts--;
    UI.setHearts(h.hearts, h.maxHearts);
    h.invuln = 1.8;
    h.vx = (Math.sign(h.x - fromX) || -1) * 420;
    h.vy = -560;
    h.forced = 'hurt';
    this.after(0.45, () => { if (h.forced === 'hurt') h.forced = null; });
    Sound.play('hurt');
    this.shake = Math.max(this.shake, 10);
    this.fx.stars(h.x, h.y - 60, 5, '#ffffff');
    if (h.hearts <= 0) this.after(0.7, () => this.respawn(true));
  },

  heroFell() {
    const h = this.hero;
    this.falling = true;
    h.hearts--;
    UI.setHearts(Math.max(0, h.hearts), h.maxHearts);
    Sound.play('hurt');
    this.after(0.5, () => {
      this.falling = false;
      this.respawn(h.hearts <= 0);
    });
  },

  respawn(full) {
    const h = this.hero;
    let pos = h.safe;
    if (full) {
      h.hearts = h.maxHearts;
      pos = this.checkpoint;
      UI.banner('だいじょうぶ！', 'もういっかい がんばろう！');
      MediaAudio.Voice.play('wrongRetry', { interrupt: true }); // 「大丈夫！大丈夫！もう一回！」
    }
    h.x = pos.x;
    h.y = pos.y - 1;
    h.vx = 0;
    h.vy = 0;
    h.invuln = 2.2;
    h.forced = null;
    h.lock = 0;
    UI.setHearts(h.hearts, h.maxHearts);
    this.fx.ring(h.x, h.y - 50, '#ffffff', 80, 10, 0.5, 6);
    this.fx.sparkle(h.x, h.y - 50, 14, '#9fe8ff', 220);
  },

  /* ---------------- さんすう ---------------- */
  activateGate(g) {
    if (this.activeGate && this.activeGate !== g) return;
    g.active = true;
    this.activeGate = g;
    if (g.kind === 'boss') {
      UI.banner('ボス あらわる！', 'さんすうパワーで やっつけろ！', 'boss');
      g.boss.play('roar');
      // BGM は ステージの きょくの まま。とうじょうボイス → もんだいの よみあげ の じゅん
      MediaAudio.Voice.play('bossAppear', { interrupt: true });
      this.after(2.6, () => this.newQuestion(g));
    } else this.newQuestion(g);
  },

  newQuestion(g) {
    if (g.state !== 'locked') return;
    const q = Quiz.make(this.levelNo, this.stageIdx);
    g.quiz = q;
    g.firstTry = true;
    g.qNo = (g.qNo || 0) + 1;
    // けっか画面の いちらん用（おなじ もんだいへの やりなおしは この 1ぎょうに まとめる）
    g.log = { a: q.a, op: q.op, b: q.b, answer: q.answer, boss: g.kind === 'boss', miss: false, solved: false };
    this.qlog.push(g.log);
    g.blocks.forEach((b, i) => {
      b.value = q.choices[i];
      b.state = 'idle';
      b.pop = 0;
    });
    Sound.play('pop');
    UI.showQuiz(q, this.settings.hint);
    MediaAudio.Voice.say(Quiz.askText(q)); // ほかの こえの あとに よむ（かさならない）
  },

  repeatQuestion() {
    const g = this.activeGate;
    if (g && g.quiz && !this.answering && !this.cutin) MediaAudio.Voice.say(Quiz.askText(g.quiz), { interrupt: true });
  },

  onHeadHit(h, what) {
    if (what.tile) {
      Sound.play('bump');
      this.fx.dust(what.x, what.y, 3, 0);
      return;
    }
    if (what instanceof AnswerBlock) this.hitBlock(what);
  },

  hitBlock(b) {
    b.bump = 1;
    const g = b.gate;
    g.hint = false;
    if (this.mode !== 'play') return;
    if (!g.active) this.activateGate(g);
    // 1かいの ジャンプで こたえられるのは 1かい だけ（ちゃくちしたら また こたえられる）
    if (b.state !== 'idle' || g.state !== 'locked' || this.answering || !g.quiz || b.value == null || !this.hero.canAnswer) {
      Sound.play('bump');
      return;
    }
    this.hero.canAnswer = false;
    if (b.value === g.quiz.answer) this.correct(b);
    else this.wrong(b);
  },

  correct(b) {
    const g = b.gate, q = g.quiz, h = this.hero;
    this.answering = true;
    this.stats.total++;
    this.stats.correct++;
    if (g.firstTry) this.stats.first++;
    g.log.solved = true;
    b.state = 'gone';
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    this.fx.sparkle(cx, cy, 26, this.theme.block.glow, 420);
    this.fx.flash(cx, cy, '#ffffff', 130, 0.4);
    this.fx.ring(cx, cy, '#ffffff', 20, 120, 0.45, 8);
    g.blocks.forEach((o) => {
      if (o !== b && o.state !== 'gone') {
        o.state = 'gone';
        this.fx.dust(o.x + o.w / 2, o.y + o.h / 2, 6, 0);
      }
    });
    UI.quizSolved(q);
    this.fx.text('せいかい！', h.x, GROUND_Y - 190, { size: 56, life: 1.6 });
    h.vx = 0;
    h.forced = 'flex';
    h.lock = 99;
    h.facing = 1;
    this.zoomTarget = 1.15;
    this.focus = { x: h.x - this.camX, y: GROUND_Y - 130 };
    this.fx.confetti(h.x, GROUND_Y - 110, 40);
    // 正解.wav → カットイン（え＋おうえんボイス）→ おわったら 1かいだけ こうげきへ
    const correctVoice = MediaAudio.Voice.play('correct', { interrupt: true });
    const pair = Cheers.next();
    if (!pair) console.warn('[cutin] つかえる えが ないので カットインを はぶきます');
    this.cutin = new CutIn(correctVoice, pair, () => this.afterCutin(g));
  },

  afterCutin(g) {
    const h = this.hero;
    this.cutin = null;
    h.forced = 'punch';
    Sound.play('whoosh');
    const tx = g.kind === 'boss' ? g.boss.x - g.boss.w * 0.4 : g.x;
    this.projectiles.push(new Projectile(h.x + 40, h.y - 74, tx, (x, y) => this.gateHit(g, x, y)));
  },

  wrong(b) {
    const g = b.gate;
    g.firstTry = false;
    g.log.miss = true; // さいしょの こたえで まちがえた（あとで せいかいしても「× → ○」）
    b.state = 'wrong';
    b.shake = 0.5;
    Sound.play('wrong');
    this.fx.text('おしい！', b.x + b.w / 2, b.y - 24, { size: 34, life: 1.1, top: '#ffffff', bot: '#ffb3c6', stroke: '#5a0a2a' });
    UI.quizWrong();
    // いまは おなじ もんだいを つづけるので「もう一回！」（「次行こう！」は もんだいを かえる ときよう）
    MediaAudio.Voice.play('wrongRetry', { interrupt: true });
  },

  gateHit(g, x, y) {
    Sound.play('punch');
    this.fx.flash(x, y, '#ffe9a0', 220, 0.4);
    this.fx.ring(x, y, '#ffffff', 20, 210, 0.5, 12);
    this.fx.stars(x, y, 10);
    this.shake = 22;
    this.flash = 0.35;
    if (g.kind === 'wall') {
      g.state = 'open';
      Sound.play('crash');
      const w = this.theme.wall;
      this.fx.rocks(g.x, GROUND_Y - 540, g.w, 540, [w.base, w.dark, w.light], 48);
      this.fx.dust(g.x + 36, GROUND_Y, 14, 1);
      this.fx.text('ドカーン！', g.x + 36, GROUND_Y - 300, { size: 60, life: 1.2 });
      this.checkpoint = { x: g.x + g.w + 90, y: GROUND_Y };
      this.after(0.5, () => this.finishAnswer(g, true));
      return;
    }
    const boss = g.boss;
    boss.hp--;
    boss.play('hurt');
    boss.flash = 1;
    boss.sq = 1;
    Sound.play('bossHit');
    this.fx.text(pick(['いたーい！', 'ぐはっ！', 'ひえ〜！']), boss.x, boss.y - boss.h - 20, { size: 42, top: '#ffffff', bot: '#ffb0c8', stroke: '#4a0a2a' });
    if (boss.hp > 0) {
      // ひるむ ところを みせて、あたってから やく 1びょうで つぎの もんだい（でた ときから こたえられる）
      const no = g.qNo;
      this.after(0.6, () => this.finishAnswer(g, false));
      this.after(BOSS_NEXT, () => {
        if (g.qNo !== no || g.state !== 'locked' || boss.dead) return; // もう つぎが でている・たおした
        this.newQuestion(g);
      });
    } else this.after(0.5, () => this.defeatBoss(g));
  },

  finishAnswer(g, opened, givePower = true) {
    const h = this.hero;
    h.forced = null;
    h.lock = 0;
    this.zoomTarget = 1;
    this.answering = false;
    if (!opened) return;
    this.activeGate = null;
    UI.hideQuiz();
    if (!givePower) return;
    const wasOn = h.power > 0;
    h.power = 6;
    Sound.play('power');
    this.fx.text('パワー アップ！', h.x, GROUND_Y - 200, { size: 40, top: '#fff6b0', bot: '#ffb21e' });
    if (!wasOn) MediaAudio.Voice.play('power'); // パワー全開に なった しゅんかんに 1かい だけ
  },

  defeatBoss(g) {
    const boss = g.boss, L = this.level;
    boss.dead = true;
    g.state = 'open';
    Sound.play('bossDown');
    this.shake = 30;
    this.flash = 0.8;
    this.fx.confetti(boss.x, boss.y - 100, 90, 1.4);
    this.fx.stars(boss.x, boss.y - 90, 16);
    this.fx.flash(boss.x, boss.y - 90, '#ffffff', 320, 0.6);
    for (let i = 0; i < 6; i++) this.fx.sparkle(boss.x + rand(-100, 100), boss.y - rand(40, 160), 10, pick(['#ffe14a', '#ff7af0', '#7ae8ff']), 360);
    this.fx.text('やったー！', boss.x, boss.y - 240, { size: 72, life: 2 });
    for (let i = 0; i < 9; i++) L.dumbbells.push({ x: boss.x - 160 + i * 40, y: GROUND_Y - 110 - Math.sin((i / 8) * Math.PI) * 90, taken: false, phase: i });
    this.checkpoint = { x: boss.x, y: GROUND_Y };
    this.after(0.7, () => {
      this.finishAnswer(g, true, false); // ボスの あとは パワー全開に しない（こえが かさならない）
      UI.banner('ボスを たおした！', 'ゴールへ すすめ！');
      MediaAudio.Voice.play('bossDown', { interrupt: true });
    });
  },

  reachGoal() {
    const L = this.level, h = this.hero, G = L.goal;
    G.reached = true;
    this.ending = true;
    if (Math.abs(h.x - G.x) > 60 || h.y > GROUND_Y - 97) {
      h.x = G.x;
      h.y = GROUND_Y - 98;
      this.fx.sparkle(h.x, h.y - 60, 20, '#ffe14a', 260);
    }
    h.lock = 999;
    h.forced = 'victory';
    h.vx = 0;
    h.facing = 1;
    h.invuln = 0;
    // クリア確定: プレイの きょく → クリアの きょく（あたまから）。クリアボイスは 1かい
    MediaAudio.BGM.play('clear', { restart: true });
    MediaAudio.Voice.play('clear', { interrupt: true });
    this.zoomTarget = 1.12;
    this.focus = { x: h.x - this.camX, y: h.y - 90 };
    this.fx.confetti(h.x, h.y - 110, 80, 1.3);
    this.fwT = 0.3;
    this.fwLeft = 9;      // はなびの えんしゅつの ながさ
    this.fwSound = false; // はなびの おとは さいしょの 1ぱつで 1かい だけ
    this.fwStopped = false;
    UI.hideQuiz();
    const st = this.stats;
    const ratio = st.total ? st.first / st.total : 1;
    const stars = ratio >= 0.85 ? 3 : ratio >= 0.5 ? 2 : 1;
    const key = this.starKey(this.levelNo, this.stageIdx);
    this.progress.stars[key] = Math.max(this.progress.stars[key] || 0, stars);
    Store.set('progress2', this.progress);
    this.after(2.8, () => {
      this.mode = 'clear';
      UI.hud(false);
      // けっか画面に きりかわっても BGM・こえ・はなびの おとは そのまま（やりなおさない）
      UI.showClear({ stars, correct: st.correct, db: st.db, last: this.stageIdx >= STAGES.length - 1, lv: this.levelNo, log: this.qlog });
    });
  },

  updateFireworks(dt) {
    if (this.fwLeft <= 0) {
      if (!this.fwStopped) { // えんしゅつが おわったら おとも みじかく フェードアウト
        this.fwStopped = true;
        MediaAudio.Fireworks.stop(1.0);
      }
      return;
    }
    this.fwLeft -= dt;
    this.fwT -= dt;
    if (this.fwT > 0) return;
    if (!this.fwSound) {
      this.fwSound = true;
      MediaAudio.Fireworks.start();
    }
    const x = this.camX + rand(0.15, 0.85) * this.viewW, y = rand(90, 300);
    const c = pick(['#ffe14a', '#ff4f8a', '#3fd4ff', '#7dff6a', '#ff8af0']);
    this.fx.sparkle(x, y, 44, c, 400);
    this.fx.flash(x, y, c, 130, 0.5);
    this.fwT = rand(0.35, 0.7);
  },

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (!this.A) return;
    Render.scene(ctx, this);
    Render.post(ctx, this);
  },

  /* ---------------- ステージえらびの え ---------------- */
  makeThumb(key) {
    const W = 1230, s = 0.32;
    const c = makeCanvas(W * s, VIEW_H * s);
    const ctx = c.getContext('2d');
    ctx.scale(s, s);
    const S = { theme: THEMES[key], A: Assets.get(key, 0.5, ctx), viewW: W, camX: 900, level: buildDemoLevel(key), fx: new FX(), projectiles: [], time: 3.2, zoom: 1, shake: 0, flash: 0 };
    Render.initScenery(S);
    const h = new Hero(900 + W * 0.5, GROUND_Y);
    h.anim = 'flex';
    h.sAnim = 'flex';
    h.sT = 1.1;
    h.onGround = true;
    for (let i = 0; i < 40; i++) h.updatePose(1 / 30, 0.2);
    S.hero = h;
    Render.scene(ctx, S);
    return c.toDataURL('image/jpeg', 0.85);
  },
};

window.addEventListener('load', () => {
  const go = () => Game.init();
  const fonts = document.fonts && document.fonts.load ? [document.fonts.load(`900 40px ${FONT}`), document.fonts.load(`800 20px ${FONT}`)] : [];
  // キャラの え と もじを まってから はじめる（ネットが おそくても 4びょうで スタート）
  Promise.race([
    Promise.all([...fonts, Sprites.load()]),
    new Promise((r) => setTimeout(r, 4000)),
  ]).then(go, go);
});
