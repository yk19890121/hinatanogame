'use strict';
/* =========================================================
   ゲームの しんぞう（すすみかた・もんだい・カメラ）
   ========================================================= */
const DUST = { meadow: '#f4ead8', desert: '#ffe0b0', snow: '#ffffff', night: '#b8b0e8' };
// ダンベル声援: がめんの かず（stats.db）とは べつに かぞえる。10 → 20 → 35こ で 1しゅう（35で 0に もどす）
const DB_CHEER = { 10: 'itemDb1', 20: 'itemDb2', 35: 'itemDb3' }, DB_CYCLE = 35;
const BOSS_NEXT = 1.0; // ボスに あたってから つぎの もんだい まで（びょう）
const ALLY_FOLLOW = 0.1; // ヒーローの こぶしから 仲間の 攻撃 かいしまで（弾は その 0.2びょう あと → あわせて 0.3びょう）

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
  playMode: 'normal', // 'normal'（通常モード）| 'adult'（オトナモード）。ひらく たびに 通常から
  enemyShots: [],     // ボスの 弾（オトナモード）
  ally: null,         // レア仲間（1体 まで）
  bossAtk: null,      // ボスの こうげきの タイマー（オトナモード）
  clock: { left: 0, on: false, shown: -1 },
  jumpGuided: false,  // 「ボスの攻撃は、ジャンプでよけろ！」は さいしょの ボス戦で 1かい

  get adult() { return this.playMode === 'adult'; },

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
      MuscleFx.warm(); // レアの 動画も この タップで うごかせる ように
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
    // タイトル: BGM候補から ランダムに 1きょく（ステージえらびでも そのまま。自動再生が だめな ときは さいしょの タップで ならす）
    MediaAudio.BGM.shuffle();
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
  // モードごとの せいせき。オトナモードは べつに ほぞん（通常モードの きろく progress2 は そのまま）
  record() {
    if (!this.adult) return this.progress;
    if (!this.progressAdult) {
      const pa = Store.get('progressAdult', null);
      this.progressAdult = pa && pa.stars && typeof pa.stars === 'object' && !Array.isArray(pa.stars) ? pa : { v: 1, stars: {}, best: {} };
    }
    return this.progressAdult;
  },
  starsFor(lv, stage) { return this.record().stars[this.starKey(lv, stage)] || 0; },

  setPlayMode(m) { this.playMode = m === 'adult' ? 'adult' : 'normal'; },

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
    // 仲間・ボスの 弾・こうげきの よやく・じかんは ステージを はなれたら のこさない
    this.ally = null;
    this.waitJoin = null; // 加入セリフの あとの 攻撃まち
    this.enemyShots = [];
    this.bossAtk = null;
    this.over = null;
    this.clock = { left: ADULT.TIME, on: false, shown: -1 };
    MediaAudio.Sfx.stop('bossWarn');
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
    MediaAudio.BGM.refresh(); // おなじ きょくを つづける（えらびなおさない）
    UI.show('select');
  },

  // ゲーム中・クリア画面 → ステージえらび
  // クリアの あと: クリアの きょくを その いちから つづける / とちゅうで やめた: えらび画面の きょくへ
  toSelect() {
    const afterClear = this.mode === 'clear';
    if (this.mode !== 'demo') this.startDemo();
    else this.resetScene();
    Sound.suspend(false);
    if (afterClear) MediaAudio.BGM.play('clear');
    else MediaAudio.BGM.shuffle();
    UI.show('select');
  },

  // ステージえらび → タイトル（えらび画面の きょく。もう ながれていれば その まま）
  toTitle() {
    if (MediaAudio.BGM.cur === 'clear') MediaAudio.BGM.shuffle(); // クリアの きょくの ときだけ えらびなおす
    else MediaAudio.BGM.refresh();
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
    // ボス: レベル・ステージごとの え。ライフは 通常 3（いままで どおり）、オトナ 4〜8
    const bossGate = L.gates.find((g) => g.boss);
    const bossId = `L${lv}_S${i + 1}`;
    bossGate.boss.setup(bossId, this.adult ? ADULT.BOSS_HP[lv - 1] : 3);
    this.hero.hearts = this.hero.maxHearts = this.adult ? ADULT.LIVES : 3;
    Input.reset();
    UI.show(null);
    UI.hud(true);
    UI.setStage(`${this.adult ? 'オトナ・' : ''}レベル${lv}・ステージ${i + 1}`);
    UI.setHearts(this.hero.hearts, this.hero.maxHearts);
    UI.setDb(0);
    UI.setModeTag(this.adult, ADULT.TIME);
    UI.hideQuiz();
    UI.banner(`レベル${lv}・ステージ ${i + 1}`, this.adult ? `オトナモード　${st.name}` : st.name);
    // BGM候補から あたらしく ランダムに（やりなおし・つぎの ステージ でも）
    MediaAudio.BGM.shuffle();
    Cheers.preload(3);
    this.after(0.4, () => MediaAudio.Voice.play('start'));
    // この ステージの ボスの え → 仲間の え（レアが でた ときに つかう）の じゅんに よむ
    // オトナモードは ボスの え が よめるまで うごかさず、じかんも はからない（よみこみ中に 時計を すすめない）
    const art = bossGate.boss.art, stage = this.level;
    const ready = () => {
      if (this.level !== stage || this.clock.on) return;
      if (this.mode === 'paused') return void setTimeout(ready, 300);
      if (this.mode !== 'play') return;
      if (this.adult) {
        this.hero.lock = 0;
        this.clock.on = true;
      }
    };
    if (this.adult && !art.ready) {
      this.hero.lock = 99;
      UI.banner('じゅんび ちゅう…', 'もうすこし まってね');
      setTimeout(ready, 8000); // よめなくても 8びょうで はじめる（え は よめしだい でる）
    }
    art.promise.then(() => {
      ready();
      Object.keys(CHARA.allies).reduce((p, id) => p.then(() => CharaArt.ally(id).promise), Promise.resolve());
    });
  },

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    UI.show('pause');
    MediaAudio.setHeld(true); // BGM・こえ・はなび を とめる（さいかいで つづきから）
    if (this.cutin) this.cutin.setPaused(true); // レアの 動画も
    Sound.suspend(true);
  },

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'play';
    UI.show(null);
    Sound.suspend(false);
    MediaAudio.setHeld(false);
    if (this.cutin) this.cutin.setPaused(false);
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
    // オトナモードの じかん: えがく かい数 では なく じっさいの けいか じかんで へらす（演出中も とめない。ポーズ中は とめる）
    if (this.mode === 'play' && this.clock.on && !this.ending && raw > 0) this.tickClock(Math.min(raw, 0.25));
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

  tickClock(sec) {
    const c = this.clock;
    c.left = Math.max(0, c.left - sec);
    const s = Math.ceil(c.left);
    if (s !== c.shown) {
      c.shown = s;
      UI.setModeTag(true, s);
    }
    if (c.left <= 0) this.gameOver('time'); // 演出中でも ここで おわり
  },

  update(dt) {
    if (this.mode === 'paused' || this.mode === 'boot') return;
    this.time += dt;
    // せいかいの カットイン中は せかいを とめる（てき・ボス・タイマー・パワーの のこりじかん）
    if (this.cutin) this.cutin.update(dt);
    const frozen = !!this.cutin;
    if (this.bossAtk && this.mode === 'play' && !this.ending) this.updateBossAttack(dt);
    if (this.waitJoin && !frozen && this.mode === 'play' && !this.ending) this.updateWaitJoin(dt);
    if (this.ally) this.ally.update(dt, this);
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
      h.hearts += 1; // 上限なし（3より 多くも なる。やりなおし・つぎの ステージで 3に もどる）
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
    // ボスの 弾（オトナモード）。カットイン中は ここに こないので とまる
    h.grace = Math.max(0, (h.grace || 0) - dt);
    if (this.enemyShots.length) {
      for (const s of this.enemyShots) {
        s.update(dt);
        if (s.hits(h) && this.heroCanBeHit()) {
          s.done = true; // あたった 弾は けす（おなじ 弾で 2かい へらない）
          this.fx.flash(s.x, s.y, '#ffffff', 120, 0.3);
          this.fx.stars(s.x, s.y, 6, '#ffb0b0');
          this.loseLife('hit', s.x + 40);
        }
        if (s.x < this.camX - 300 || s.t > 8) s.done = true;
      }
      this.enemyShots = this.enemyShots.filter((s) => !s.done);
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

  // 接触・被弾で ライフが へる じょうたいか（むてき・パワー全開・操作できない あいだ・演出あけ すぐ は へらない）
  heroCanBeHit() {
    const h = this.hero;
    return !(h.invuln > 0 || h.power > 0 || h.lock > 0 || h.grace > 0 || this.ending || this.cutin);
  },

  /* オトナモード: ライフを 1 へらす
     cause: 'wrong'（まちがえ。むてき中でも へる・こえは「もう一回！」だけ）| 'hit'（雑魚・ボスの 弾）| 'fall' */
  loseLife(cause, fromX) {
    const h = this.hero;
    if (this.ending) return;
    h.hearts = Math.max(0, h.hearts - 1);
    UI.setHearts(h.hearts, h.maxHearts);
    if (cause === 'hit') {
      h.invuln = ADULT.INVULN; // 約1びょう（点滅）。おなじ てき・弾に かさなっていても まいフレーム へらない
      h.vx = (Math.sign(h.x - fromX) || -1) * 420;
      h.vy = -560;
      h.forced = 'hurt';
      this.after(0.45, () => { if (h.forced === 'hurt') h.forced = null; });
      MediaAudio.Sfx.play('playerDamage'); // じっさいに へった ときだけ
      this.shake = Math.max(this.shake, 10);
      this.fx.stars(h.x, h.y - 60, 5, '#ffffff');
    }
    if (h.hearts <= 0) return this.gameOver('life'); // ゲームオーバーの おと・こえを ゆうせん
    if (cause === 'wrong') {
      MediaAudio.Voice.play('wrongRetry', { interrupt: true }); // まちがえの こえを ゆうせん（「あと一回！」は かさねない）
      return;
    }
    // のこりの かずで きめる（プロテインで 4いじょうに なっても「まだいける！」は 2に なった とき だけ）
    if (h.hearts === 1) MediaAudio.Voice.play('playerLastLife', { interrupt: true });
    else if (cause === 'hit' && h.hearts === 2) MediaAudio.Voice.play('playerDamageVoice', { interrupt: true });
  },

  heroHurt(fromX) {
    const h = this.hero;
    if (h.invuln > 0 || h.power > 0 || h.lock > 0 || this.ending) return;
    if (this.adult) {
      if (this.heroCanBeHit()) this.loseLife('hit', fromX);
      return;
    }
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
    if (this.adult) { // オトナ: おちても ライフ −1（0 なら ゲームオーバー。まんタンで やりなおさない）
      Sound.play('hurt');
      this.loseLife('fall');
      if (this.ending) return;
      this.after(0.5, () => {
        this.falling = false;
        this.respawn(false);
      });
      return;
    }
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
    if (g.state !== 'locked' || this.ending) return;
    const q = Quiz.make(this.levelNo, this.stageIdx, Math.random, this.adult);
    // オトナモードの ボス: さいしょの もんだいが でて 操作できる ように なってから 約10びょうで はじめての こうげき
    if (this.adult && g.kind === 'boss' && !this.bossAtk) this.bossAtk = { gate: g, phase: 'wait', t: ADULT.ATTACK_EVERY - ADULT.WARN, ok: 0, w: 0 };
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
    UI.showQuiz(q, this.settings.hint && !this.adult); // オトナは ●の ヒントなし
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
    if (b.state !== 'idle' || g.state !== 'locked' || this.answering || !g.quiz || b.value == null || !this.hero.canAnswer || this.ending) {
      Sound.play('bump');
      return;
    }
    // ボスの 弾を よける ジャンプ（予告〜弾が とおりすぎる まで）で うっかり こたえない（ミスにも しない）
    if (this.dodging()) {
      Sound.play('bump');
      this.fx.text('よけて！', b.x + b.w / 2, b.y - 24, { size: 30, life: 0.8, top: '#ffffff', bot: '#ffd0a0', stroke: '#5a1a00' });
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
    // ダメージは ここ（回答の かくてい）で 1かいだけ きめる: プレイヤー 1（こぶし）＋ いまの 仲間 1（追撃。オトナモードだけ）
    // この 正解で レアを ひいても、あたらしい 仲間は つぎの 正解から
    const ally = this.ally && this.ally.joined && !this.ally.gone ? this.ally : null;
    g.dmgAlly = this.adult && ally ? 1 : 0;
    g.allyAtk = ally; // 追撃する（通常モードでも いっしょに 攻撃する 演出。ダメージは ふえない）
    g.waitAlly = false;
    this.fizzleShots(); // とんでいる ボスの 弾は けす（カットインの あとの ふいうち なし）
    // 正解.wav → カットイン（え＋おうえんボイス）→ おわったら 1かいだけ こうげきへ
    const correctVoice = MediaAudio.Voice.play('correct', { interrupt: true });
    const pair = Cheers.next();
    if (!pair) console.warn('[cutin] つかえる えが ないので カットインを はぶきます');
    this.cutin = new CutIn(correctVoice, pair, () => this.afterCutin(g, pair));
  },

  /* カットインの あと
     - レアを ひいた: その キャラが 仲間に（別の レアなら 交代、おなじ レアなら ふやさない）→ 加入セリフが おわってから ヒーローの 攻撃
     - それいがい: すぐ ヒーローの 攻撃 */
  afterCutin(g, pair) {
    this.cutin = null;
    const id = pair && pair.rare ? CHARA.allyOfCheer[pair.id] : null;
    if (id && !this.ending) {
      this.waitJoin = { g, ally: this.joinAlly(id), t: 0 };
      return;
    }
    this.heroAttack(g);
  },

  // 加入セリフの おわり（じっさいの 再生しゅうりょう）を まつ。こえ オフ なら すぐ、絵が よめない ときも ずっとは またない
  updateWaitJoin(dt) {
    const w = this.waitJoin, a = w.ally;
    w.t += dt;
    const voiceDone = a && a.joined && a.voice && a.voice.done;
    if (voiceDone || !a || a.gone || (!a.joined && w.t > 4) || w.t > 12) {
      this.waitJoin = null;
      this.heroAttack(w.g);
    }
  },

  // ヒーローの こぶし → 0.1びょう あとに 仲間の 攻撃が はじまり、0.3びょう あとに 仲間の 弾（同時に ださない）
  heroAttack(g) {
    const h = this.hero;
    h.forced = 'punch';
    Sound.play('whoosh'); // 打つ しゅんかんの 音
    const boss = g.kind === 'boss' ? g.boss : null;
    const tx = boss ? boss.x - boss.w * 0.4 : g.x, ty = boss ? GROUND_Y - boss.h * 0.5 : GROUND_Y - 230;
    this.projectiles.push(new Projectile(h.x + 40, h.y - 74, tx, (x, y) => this.gateHit(g, x, y)));
    // 回答の ときに 仲間が いた → いまの 仲間が 追撃（交代していたら あたらしい 仲間が かわりに うつ。ダメージは 回答の ときの まま）
    const carrier = g.allyAtk && this.ally && this.ally.joined && !this.ally.gone ? this.ally : null;
    g.allyAtk = null;
    g.waitAlly = !!(carrier && boss && g.dmgAlly > 0); // オトナの ボス: 仲間の 1ダメージは 追撃が あたった とき
    if (!carrier) return;
    this.after(ALLY_FOLLOW, () => {
      if (carrier.gone || (boss && boss.hp <= 0)) return; // ヒーローだけで たおした: 追撃なし
      carrier.attack(tx + 16, ty, (x, y) => this.allyHit(g, x, y), g);
    });
  },

  joinAlly(id) {
    if (!id || this.ending) return null;
    if (this.ally && this.ally.id === id && !this.ally.gone) {
      if (this.ally.joined) this.ally.join(this, true); // おなじ レア: 1体の まま（攻撃も 1）。加入の あいさつだけ もういちど
      return this.ally;
    }
    if (this.ally) this.ally.leave(this);
    this.ally = new Ally(id);
    this.ally.update(0, this); // 絵が よめていれば すぐ うしろに つく
    return this.ally;
  },

  // 仲間の 追撃が あたった。オトナの ボスだけ ここで 1ダメージ（回答の ときに きめた ぶん。1かい だけ）
  allyHit(g, x, y) {
    if (this.over) return;
    const boss = g.boss;
    if (boss && (boss.dead || boss.hp <= 0)) return; // もう たおれた
    this.shake = Math.max(this.shake, 12);
    this.fx.ring(x, y, '#ffffff', 16, 140, 0.4, 8);
    if (!boss) return;
    boss.flash = 1;
    boss.sq = 1;
    if (!g.waitAlly) return; // 通常モード: 見た目と 音だけ
    g.waitAlly = false;
    boss.hp = Math.max(0, boss.hp - 1);
    boss.play('hurt');
    this.fx.text('なかまの ついげき！', boss.x, boss.y - boss.h - 70, { size: 34, life: 1.2, top: '#ffffff', bot: '#9ae8ff', stroke: '#0a2a5a' });
    this.afterBossHit(g);
  },

  // ヒーローの こうげきで ボスが たおれた: まだ の 追撃は とりやめ（とんでいる 仲間の 弾も けす）
  cancelFollowUp(g) {
    g.waitAlly = false;
    const a = this.ally;
    if (a && a.target && a.target.gate === g) a.cancelAttack();
    for (const p of this.projectiles) {
      if (p instanceof AllyShot && p.gate === g && !p.done) {
        p.done = true;
        this.fx.sparkle(p.x, p.y, 10, '#ffffff', 220);
      }
    }
  },

  // ボスの 弾を ぜんぶ けす（キラッと きえる）
  fizzleShots() {
    for (const s of this.enemyShots) {
      this.fx.sparkle(s.x, s.y, 10, '#ffffff', 200);
      this.fx.dust(s.x, s.y, 4, 0);
    }
    this.enemyShots = [];
  },

  // ボスの 弾を よけている さいちゅう（予告中・まだ ヒーローの まえに 弾が ある）
  dodging() {
    const A = this.bossAtk, h = this.hero;
    return !!A && (A.phase === 'warn' || this.enemyShots.some((s) => s.x > h.x - h.w));
  },

  /* ---------------- ボスの こうげき（オトナモード） ----------------
     - 発射から つぎの 発射まで 約10びょう。発射の 0.8びょう まえに 予告（SE は まいかい、こえは ときどき）
     - カットイン・こたえ中・ダメージ中 など ジャンプ できない あいだは 予告も 発射も しない（たまった ぶんを まとめて うたない）
       ジャンプ できる ように なって 1びょう たってから あらためて 予告 → 1かいだけ うつ
     - 180びょうの 時計は この あいだも すすむ（loop で べつに へらす） */
  updateBossAttack(dt) {
    const A = this.bossAtk, g = A.gate, boss = g.boss, h = this.hero;
    if (boss.dead || g.state !== 'locked') return this.clearBossAttack();
    const canJump = !this.cutin && !this.answering && h.lock <= 0 && !h.forced && !this.falling;
    A.ok = canJump ? A.ok + dt : 0;
    if (A.phase === 'warn') {
      if (!canJump) { // 予告の とちゅうで 操作 できなく なった → この こうげきは やめて、あとで 予告しなおす
        A.phase = 'wait';
        A.t = 0;
        boss.warn = 0;
        MediaAudio.Sfx.fade('bossWarn', 0.08);
        return;
      }
      A.w += dt;
      boss.warn = A.w;
      // 攻撃アニメの 弾を だす コマ（0始まり 8番）が 発射の しゅんかんに くる ように はじめる
      const at = boss.d.anims.attack, lead = at.frames.indexOf(at.projectileFrame) / at.fps;
      if (!A.anim && A.w >= ADULT.WARN - lead) {
        A.anim = true;
        boss.play('attack');
      }
      if (A.w >= ADULT.WARN) this.fireBossShot();
      return;
    }
    A.t -= dt;
    if (!this.jumpGuided && A.t <= 4) { // さいしょの ボス戦: こうげきの まえに 1かい だけ
      this.jumpGuided = true;
      MediaAudio.Voice.play('adultJumpGuide');
      UI.banner('ボスの こうげきは', 'ジャンプで よけろ！', 'boss');
    }
    if (A.t <= 0 && A.ok >= ADULT.GRACE) {
      A.phase = 'warn';
      A.w = 0;
      A.anim = false;
      MediaAudio.Sfx.play('bossWarn'); // 予告SE は まいかい
      if (Math.random() < 0.4) MediaAudio.Item.play('bossWarnVoice'); // 「攻撃が来るぞ！」は ときどき（ほかの こえが あれば はぶく）
    }
  },

  fireBossShot() {
    const A = this.bossAtk, boss = A.gate.boss;
    A.phase = 'wait';
    A.t = ADULT.ATTACK_EVERY - ADULT.WARN;
    boss.warn = 0;
    const s = new BossShot(boss.art, boss.x - 70);
    this.enemyShots.push(s);
    const kind = boss.d.shotKind;
    MediaAudio.Sfx.play('bossShot' + kind[0].toUpperCase() + kind.slice(1)); // 弾の 見た目に あわせた 発射音
    this.fx.flash(s.x, s.y, '#ffffff', 90, 0.25);
  },

  // ボスを たおした・ゲームオーバー・ステージを はなれた: 弾・タイマー・予約を ぜんぶ けす
  clearBossAttack() {
    const A = this.bossAtk;
    if (A && A.gate.boss) A.gate.boss.warn = 0;
    this.bossAtk = null;
    this.enemyShots = [];
    MediaAudio.Sfx.fade('bossWarn', 0.08);
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
    // オトナ: 回答 1かいに つき ライフ −1（むてき中でも へる。こえは「もう一回！」）
    if (this.adult) return this.loseLife('wrong');
    // いまは おなじ もんだいを つづけるので「もう一回！」（「次行こう！」は もんだいを かえる ときよう）
    MediaAudio.Voice.play('wrongRetry', { interrupt: true });
  },

  gateHit(g, x, y) {
    if (this.over) return;
    MediaAudio.Sfx.play('blastHit'); // 爆発2（かべを こわす・ボスに 当たる。合成の パンチ音の かわり）
    this.fx.flash(x, y, '#ffe9a0', 220, 0.4);
    this.fx.ring(x, y, '#ffffff', 20, 210, 0.5, 12);
    this.fx.stars(x, y, 10);
    this.shake = 22;
    this.flash = 0.35;
    if (g.kind === 'wall') {
      g.state = 'open';
      const w = this.theme.wall;
      this.fx.rocks(g.x, GROUND_Y - 540, g.w, 540, [w.base, w.dark, w.light], 48);
      this.fx.dust(g.x + 36, GROUND_Y, 14, 1);
      this.fx.text('ドカーン！', g.x + 36, GROUND_Y - 300, { size: 60, life: 1.2 });
      this.checkpoint = { x: g.x + g.w + 90, y: GROUND_Y };
      this.after(0.5, () => this.finishAnswer(g, true));
      return;
    }
    const boss = g.boss;
    boss.hp = Math.max(0, boss.hp - 1); // ヒーローの こぶしは 1（仲間の ぶんは 追撃が あたった ときに allyHit で）
    boss.play('hurt');
    boss.flash = 1;
    boss.sq = 1;
    this.fx.text(pick(['いたーい！', 'ぐはっ！', 'ひえ〜！']), boss.x, boss.y - boss.h - 20, { size: 42, top: '#ffffff', bot: '#ffb0c8', stroke: '#4a0a2a' });
    if (boss.hp <= 0) {
      this.cancelFollowUp(g); // ヒーローだけで たおした
      this.after(0.5, () => this.defeatBoss(g));
      return;
    }
    if (g.waitAlly) {
      // 仲間の 追撃を まってから つぎへ（とどかなかった ときの ほけん: 1.5びょうで 追撃 あつかい）
      const no = g.qNo;
      this.after(1.5, () => { if (g.waitAlly && g.qNo === no && !this.ending) this.allyHit(g, boss.x - 60, boss.y - boss.h * 0.5); });
      return;
    }
    this.afterBossHit(g);
  },

  // ボスに 当たった あと（さいごの 1ぱつの あと）: たおれたか、約1びょうで つぎの もんだい
  afterBossHit(g) {
    const boss = g.boss;
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
    if (this.ending) return;
    const h = this.hero;
    h.forced = null;
    h.lock = 0;
    if (this.adult) h.grace = 0.8; // うごける ように なった すぐ あとの ふいうち（てき・弾）で へらない
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
    if (this.over || g.boss.dead) return; // 撃破は 1かい だけ
    const boss = g.boss, L = this.level;
    boss.dead = true;
    g.state = 'open';
    this.clearBossAttack(); // のこった 弾で ゲームオーバーに ならない ように
    MediaAudio.Sfx.fade('blastHit', 0.15); // 当たった ときの 爆発の よいんは みじかく けして
    MediaAudio.Sfx.play('blastDown');       // 爆発1（ボスを たおした）
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
    if (this.ending) return; // ゲームオーバー・時間切れが さきに きまっていたら うわがきしない
    G.reached = true;
    this.ending = true;
    this.clock.on = false; // クリア確定で 時計を とめる
    this.clearBossAttack();
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
    MediaAudio.Voice.play(this.adult ? 'adultClear' : 'clear', { interrupt: true }); // オトナは「頭脳も筋肉も、仕上がってる！」
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
    const rec = this.record();
    rec.stars[key] = Math.max(rec.stars[key] || 0, stars);
    const left = this.adult ? Math.ceil(this.clock.left) : null;
    if (this.adult) {
      rec.best = rec.best || {};
      rec.best[key] = Math.max(rec.best[key] || 0, left); // のこり じかんの さいこう
      Store.set('progressAdult', rec);
    } else Store.set('progress2', rec);
    this.after(2.8, () => {
      this.mode = 'clear';
      UI.hud(false);
      // けっか画面に きりかわっても BGM・こえ・はなびの おとは そのまま（やりなおさない）
      UI.showClear({ stars, correct: st.correct, db: st.db, last: this.stageIdx >= STAGES.length - 1, lv: this.levelNo, log: this.qlog, adult: this.adult, left });
    });
  },

  /* オトナモード: ライフ切れ（kind='life'）・時間切れ（'time'）。クリア・もう ひとつの おわりとは かさならない */
  gameOver(kind) {
    if (this.ending || this.mode !== 'play') return;
    this.ending = true;
    this.over = kind;
    this.clock.on = false;
    const h = this.hero;
    // 演出・こえ・よやく・弾を ぜんぶ とめてから おわりの 音
    if (this.cutin) {
      this.cutin.cancel();
      this.cutin = null;
    }
    this.clearBossAttack();
    this.timers = [];
    this.projectiles = [];
    this.waitJoin = null;
    if (this.ally) {
      this.ally.leave(this);
      this.ally = null;
    }
    MediaAudio.Voice.cancel();
    MediaAudio.Sfx.stop();
    MediaAudio.Item.stop(0.05);
    MediaAudio.Sfx.play(kind === 'time' ? 'timeUp' : 'gameOver');
    MediaAudio.Voice.play(kind === 'time' ? 'timeUpVoice' : 'gameOverVoice');
    MediaAudio.BGM.stop(1.5);
    this.answering = false;
    this.zoomTarget = 1;
    h.lock = 999;
    h.forced = 'hurt';
    h.vx = 0;
    h.invuln = 0;
    UI.hideQuiz();
    UI.banner(kind === 'time' ? 'タイムアップ！' : 'ゲームオーバー', kind === 'time' ? 'じかん ぎれ' : 'ライフが なくなった', 'boss');
    this.after(2.0, () => {
      this.mode = 'over';
      UI.hud(false);
      UI.showOver({ kind, lv: this.levelNo, stage: this.stageIdx, correct: this.stats.correct, log: this.qlog });
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
