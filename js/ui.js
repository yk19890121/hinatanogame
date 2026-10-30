'use strict';
/* =========================================================
   がめんの ボタンや ひょうじ（HTML）
   ========================================================= */
const UI = (() => {
  const $ = (id) => document.getElementById(id);
  const screens = {};
  let game, settingsFrom = 'title', cardsBuilt = false;

  const HEART = '<svg viewBox="0 0 32 30" aria-hidden="true"><path d="M16 28C10 23 2 17.5 2 10.2 2 5.6 5.4 2 9.6 2c2.6 0 5 1.4 6.4 3.6C17.4 3.4 19.8 2 22.4 2 26.6 2 30 5.6 30 10.2 30 17.5 22 23 16 28z"/></svg>';

  function click(id, fn) {
    const el = $(id);
    if (el) el.addEventListener('click', (e) => {
      e.preventDefault();
      el.blur(); // スペースキーで もういちど おされないように
      Sound.init();
      fn(e);
    });
  }

  function init(g) {
    game = g;
    for (const k of ['title', 'select', 'settings', 'pause', 'clear', 'over']) screens[k] = $('scr' + k[0].toUpperCase() + k.slice(1));
    click('btnPlay', () => {
      Sound.play('select');
      game.openSelect();
    });
    // モード（通常・オトナ）。「あそぶ」で その モードの ステージえらびへ
    $('modeSel').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      b.blur();
      Sound.init();
      Sound.play('select');
      game.setPlayMode(b.dataset.mode);
      syncMode();
    });
    syncMode();
    click('btnOverRetry', () => game.startStage(game.stageIdx));
    click('btnOverSel', () => game.toSelect());
    click('btnSettings', () => openSettings('title'));
    click('btnFull', toggleFull);
    click('btnSelBack', () => {
      Sound.play('select');
      game.toTitle();
    });
    // むずかしさ（きりかえても BGM は あたまに もどさない）
    $('levelSel').innerHTML = LEVELS.map((L) => `<button data-lv="${L.lv}"><b>${L.label}</b><small>${L.sub}</small></button>`).join('');
    $('levelSel').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      b.blur();
      game.setLevel(Number(b.dataset.lv));
      Sound.play('select');
      refreshCards();
    });
    click('btnSetBack', () => {
      Sound.play('select');
      show(settingsFrom);
    });
    click('btnPause', () => game.pause());
    // 「♫ シャッフル」: いまの BGM を べつの 曲へ（ジャンプ・こたえには ならない。0.4びょうに 1かい まで）
    let bgmAt = 0;
    const bgmBtn = $('btnBgm');
    bgmBtn.disabled = !MediaAudio.BGM.canNext();
    bgmBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    click('btnBgm', () => {
      const now = performance.now();
      if (now - bgmAt < 400 || game.mode !== 'play') return;
      bgmAt = now;
      MediaAudio.unlock();
      if (MediaAudio.BGM.next()) {
        bgmBtn.classList.remove('spin');
        void bgmBtn.offsetWidth;
        bgmBtn.classList.add('spin');
      }
      Input.reset(); // おした タッチ・キーを ジャンプに しない
    });
    click('btnResume', () => game.resume());
    click('btnPauseSettings', () => openSettings('pause'));
    click('btnRetry', () => game.startStage(game.stageIdx));
    click('btnToSelect', () => game.toSelect());
    click('btnNext', () => {
      const last = game.stageIdx >= STAGES.length - 1;
      if (last) game.toSelect();
      else game.startStage(game.stageIdx + 1);
    });
    click('btnAgain', () => game.startStage(game.stageIdx));
    click('btnClearSel', () => game.toSelect());
    click('btnVoice', () => game.repeatQuestion());
    document.querySelectorAll('.seg').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        game.setSetting(seg.dataset.key, b.dataset.v === '1');
        syncSettings();
        Sound.init();
        Sound.play('select');
      });
    });
    syncSettings();
    Input.bindButton($('tLeft'), 'left');
    Input.bindButton($('tRight'), 'right');
    Input.bindButton($('tJump'), 'jump');
    const touchy = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    document.body.classList.toggle('touchy', !!touchy);
    window.addEventListener('touchstart', () => document.body.classList.add('touchy'), { once: true, passive: true });
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      if (screens.title.classList.contains('on') && document.activeElement === document.body) {
        e.preventDefault();
        $('btnPlay').click();
      }
    });
    show('title');
    document.body.classList.add('ready');
  }

  function show(name) {
    for (const k in screens) screens[k].classList.toggle('on', k === name);
    if (name === 'select') refreshCards();
    document.body.classList.toggle('in-menu', !!name);
  }

  // えらんでいる モードを 色・わくで しめす（オトナは せつめいも）
  function syncMode() {
    const adult = game.adult;
    $('modeSel').querySelectorAll('button').forEach((b) => {
      const on = (b.dataset.mode === 'adult') === adult;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    $('modeNote').classList.toggle('on', adult);
    document.body.classList.toggle('adult', adult);
  }

  function openSettings(from) {
    settingsFrom = from;
    Sound.play('select');
    show('settings');
  }

  function syncSettings() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const v = game.settings[seg.dataset.key];
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === v));
    });
  }

  function toggleFull() {
    const d = document;
    try {
      if (!d.fullscreenElement && d.documentElement.requestFullscreen) {
        d.documentElement.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        }).catch(() => {});
      } else if (d.exitFullscreen) d.exitFullscreen();
    } catch (e) { /* ぜんがめんに できない きかい */ }
  }

  /* ---------------- ステージえらび ---------------- */
  function refreshCards() {
    const grid = $('stageGrid');
    if (!cardsBuilt) {
      cardsBuilt = true;
      grid.innerHTML = STAGES.map((s, i) => `
        <button class="stage-card" data-i="${i}">
          <div class="thumb theme-${s.theme}"><img alt="" data-thumb="${s.theme}"><span class="num">${i + 1}</span><span class="op">${s.mark}</span></div>
          <div class="card-body"><div class="card-name">${s.name}</div><div class="card-label">${STAGE_LABEL[i]}</div><div class="card-stars"></div></div>
        </button>`).join('');
      grid.querySelectorAll('.stage-card').forEach((b) => b.addEventListener('click', () => {
        b.blur();
        Sound.init();
        Sound.play('select');
        game.startStage(Number(b.dataset.i));
      }));
      const imgs = [...grid.querySelectorAll('img[data-thumb]')];
      let k = 0;
      const next = () => {
        if (k >= imgs.length) return;
        const img = imgs[k++];
        try {
          img.src = game.makeThumb(img.dataset.thumb);
          img.classList.add('loaded');
        } catch (e) { /* え が つくれなくても いろで だいじょうぶ */ }
        setTimeout(next, 30);
      };
      setTimeout(next, 60);
    }
    // えらんでいる むずかしさ の ★ だけ を かきなおす（ふるい ひょうじを のこさない）。★は モードごと
    const lv = game.levelNo, adult = game.adult, AL = ADULT_LEVELS[lv - 1];
    $('selMode').textContent = adult ? 'オトナモード' : '通常モード';
    $('selMode').classList.toggle('adult', adult);
    const levelsOf = adult ? ADULT_LEVELS : LEVELS;
    $('levelSel').querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', Number(b.dataset.lv) === lv);
      b.querySelector('small').textContent = levelsOf[Number(b.dataset.lv) - 1].sub;
    });
    grid.dataset.lv = lv;
    grid.querySelectorAll('.stage-card').forEach((b) => {
      const i = Number(b.dataset.i);
      const n = game.starsFor(lv, i);
      b.querySelector('.card-stars').innerHTML = [0, 1, 2].map((j) => `<i class="${j < n ? 'got' : ''}">★</i>`).join('');
      b.querySelector('.num').textContent = `${lv}-${i + 1}`;
      // オトナは 4ステージとも その レベルの もんだい
      b.querySelector('.op').textContent = adult ? AL.mark : STAGES[i].mark;
      b.querySelector('.card-label').textContent = adult ? AL.sub : STAGE_LABEL[i];
      b.setAttribute('aria-label', `${adult ? 'オトナモード ' : ''}レベル${lv} ステージ${i + 1} ${STAGES[i].name}`);
    });
  }

  /* ---------------- HUD ---------------- */
  function hud(on) {
    $('hud').classList.toggle('on', on);
    document.body.classList.toggle('playing', on);
  }

  // ライフ（プロテインで 3より 多くも なる）: 5こ までは ハートを ならべ、それより 多い ときは「♥ × 6」
  const HEART_ROW_MAX = 5;
  function setHearts(n, max) {
    const el = $('hearts');
    const prev = Number(el.dataset.n || max);
    let html = '';
    if (n > HEART_ROW_MAX) {
      html = `<span class="heart full${n > prev ? ' gain' : n < prev ? ' lose' : ''}">${HEART}</span><b class="heart-count">× ${n}</b>`;
    } else {
      const slots = Math.max(n, max);
      for (let i = 0; i < slots; i++) html += `<span class="heart ${i < n ? 'full' : 'empty'}${i === n && n < prev ? ' lose' : ''}${i === n - 1 && n > prev ? ' gain' : ''}">${HEART}</span>`;
    }
    el.innerHTML = html;
    el.dataset.n = n;
    el.setAttribute('aria-label', `ライフ ${n}`);
  }

  function setDb(n) {
    const el = $('dbCount');
    el.textContent = n;
    const pill = el.parentElement;
    pill.classList.remove('bump');
    void pill.offsetWidth;
    if (n > 0) pill.classList.add('bump');
  }

  function setStage(name) { $('stageChip').textContent = name; }

  // プレイ中の モード表示。オトナは のこり じかん（30びょう から あかく）
  function setModeTag(adult, sec) {
    const el = $('modeTag');
    el.classList.toggle('adult', adult);
    el.querySelector('.mode-name').textContent = adult ? 'オトナ' : '通常モード';
    if (!adult) return;
    const s = Math.max(0, Math.ceil(sec));
    $('clockText').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.classList.toggle('low', s <= 30);
  }

  /* ---------------- もんだい ---------------- */
  function dots(el, n, cross, kind) {
    let html = '';
    for (let i = 0; i < n; i++) html += `<i class="dot ${kind}${i >= n - cross ? ' x' : ''}"></i>`;
    el.innerHTML = html;
    el.classList.remove('pv-wrap');
  }

  // かずの ヒント: 9までは ●、10いじょうは 百（100の しかく）・十（10の ぼう）・一（●）の まとまり
  function amount(el, n, kind, cross = 0) {
    if (n <= 9) return dots(el, n, cross, kind);
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
    let html = `<span class="pv${kind === 'minus' ? ' pv-minus' : ''}">`;
    for (let i = 0; i < h; i++) html += `<i class="pv-h ${kind}"><b>100</b></i>`;
    if (t) html += `<span class="pv-tens">${`<i class="pv-t ${kind}"></i>`.repeat(t)}</span>`;
    if (o) html += `<span class="pv-ones">${`<i class="dot ${kind}"></i>`.repeat(o)}</span>`;
    el.innerHTML = html + '</span>';
    el.classList.add('pv-wrap');
  }

  function showQuiz(q, hint) {
    const el = $('quiz');
    $('qA').textContent = q.a;
    $('qB').textContent = q.b;
    $('qOp').textContent = Quiz.opMark(q.op);
    const ans = $('qAns');
    ans.textContent = '？';
    if (q.adult) { // オトナ: ●の ヒントは ださない
      ['dA', 'dB', 'dAns'].forEach((id) => { $(id).innerHTML = ''; });
      $('qLegend').classList.remove('on');
    } else {
      // ひきざん: ひく かず は ✕ の まとまりで（9まで の ときは ひかれる ●の おしりを ✕）
      amount($('dA'), q.a, 'a', q.op === '-' && q.a <= 9 ? q.b : 0);
      amount($('dB'), q.b, q.op === '-' ? 'minus' : 'b');
      $('dAns').innerHTML = '';
      $('qLegend').classList.toggle('on', q.a >= 10 || q.b >= 10);
    }
    el.classList.toggle('big', Math.max(q.a, q.b) >= 100 || String(q.a).length + String(q.b).length >= 5);
    el.classList.toggle('huge', String(q.answer).length >= 4); // こたえが 4けた（2けた×2けた）: もっと ちいさく
    el.classList.toggle('adult', !!q.adult);
    $('qHelp').textContent = 'こたえの ブロックを ジャンプで たたこう！';
    el.classList.toggle('nohint', !hint);
    el.classList.remove('solved', 'wrong');
    el.classList.add('show');
    document.body.classList.add('quizzing');
  }

  function quizWrong() {
    const el = $('quiz');
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
    $('qHelp').textContent = el.classList.contains('adult') ? 'おしい！ もういちど けいさん しよう'
      : $('qLegend').classList.contains('on') ? 'おしい！ まとまりと ●を かぞえて みよう' : 'おしい！ ●を ゆびで かぞえて みよう';
  }

  function quizSolved(q) {
    const el = $('quiz');
    $('qAns').textContent = q.answer;
    if (!q.adult) amount($('dAns'), q.answer, 'ans'); // のこった かず（こたえ）
    $('qHelp').textContent = 'せいかい！ すごい！';
    el.classList.remove('wrong');
    el.classList.add('solved');
  }

  function hideQuiz() {
    $('quiz').classList.remove('show');
    document.body.classList.remove('quizzing');
  }
  function setHint(on) { $('quiz').classList.toggle('nohint', !on); }

  function banner(main, sub = '', cls = '') {
    const b = $('banner');
    const d = document.createElement('div');
    d.className = 'banner-item ' + cls;
    const m = document.createElement('div');
    m.className = 'b-main';
    m.textContent = main;
    d.appendChild(m);
    if (sub) {
      const s = document.createElement('div');
      s.className = 'b-sub';
      s.textContent = sub;
      d.appendChild(s);
    }
    b.innerHTML = '';
    b.appendChild(d);
    setTimeout(() => d.remove(), 2700);
  }

  /* ---------------- クリア ---------------- */
  function showClear(r) {
    const stars = $('clearStars').children;
    for (let i = 0; i < 3; i++) {
      stars[i].className = '';
      if (i < r.stars) setTimeout(() => {
        stars[i].className = 'got';
        Sound.play('coin');
      }, 500 + i * 380);
    }
    $('cCorrect').textContent = r.correct;
    $('cDb').textContent = r.db;
    const msgs = ['よく がんばったね！', 'すごい！ きんにくも さんすうも ばっちり！', 'かんぺき！ きみは さいきょうの マッチョだ！'];
    $('cMsg').textContent = r.last ? `レベル${r.lv} ぜんぶ クリア！ きみは さんすうの チャンピオン！` : msgs[r.stars - 1];
    $('btnNext').textContent = r.last ? 'むずかしさを えらぶ' : 'つぎの ステージへ';
    $('clearLevel').textContent = `${r.adult ? 'オトナモード・' : ''}レベル${r.lv}・ステージ${game.stageIdx + 1}`;
    $('cTimeBox').hidden = !r.adult;
    if (r.adult) $('cTime').textContent = `${Math.floor(r.left / 60)}:${String(r.left % 60).padStart(2, '0')}`;
    renderLog(r.log || []);
    show('clear');
  }

  /* ---------------- ゲームオーバー（オトナモード） ---------------- */
  function showOver(r) {
    $('overLevel').textContent = `オトナモード・レベル${r.lv}・ステージ${r.stage + 1}`;
    $('overTitle').textContent = r.kind === 'time' ? 'タイムアップ！' : 'ゲームオーバー';
    $('overMsg').textContent = `${r.correct}もん せいかい！ もう一回、挑戦だ！`;
    show('over');
  }

  // でた じゅんに「しき ＝ こたえ」と ○／× → ○
  function renderLog(log) {
    const list = $('clearLog');
    if (!log.length) {
      list.innerHTML = '<li class="empty">もんだいは なかったよ</li>';
      return;
    }
    const mark = (e) => {
      if (!e.solved) return '<span class="ng">ー</span>';
      if (e.miss) return '<span class="ng">×</span><span class="arrow">→</span><span class="ok">○</span>';
      return '<span class="ok">○</span>';
    };
    list.innerHTML = log.map((e) => `<li${e.miss ? ' class="miss"' : ''}><span class="q">${e.a} ${Quiz.opMark(e.op)} ${e.b} ＝ ${e.answer}${e.boss ? '<small class="boss-tag">ボス</small>' : ''}</span><span class="r">${mark(e)}</span></li>`).join('');
    list.scrollTop = 0;
  }

  return { init, show, hud, setHearts, setDb, setStage, setModeTag, showQuiz, quizWrong, quizSolved, hideQuiz, setHint, banner, showClear, showOver };
})();
