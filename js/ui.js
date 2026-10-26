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
    for (const k of ['title', 'select', 'settings', 'pause', 'clear']) screens[k] = $('scr' + k[0].toUpperCase() + k.slice(1));
    click('btnPlay', () => {
      Sound.play('select');
      game.openSelect();
    });
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
    // えらんでいる むずかしさ の ★ だけ を かきなおす（ふるい ひょうじを のこさない）
    const lv = game.levelNo;
    $('levelSel').querySelectorAll('button').forEach((b) => b.classList.toggle('on', Number(b.dataset.lv) === lv));
    grid.dataset.lv = lv;
    grid.querySelectorAll('.stage-card').forEach((b) => {
      const i = Number(b.dataset.i);
      const n = game.starsFor(lv, i);
      b.querySelector('.card-stars').innerHTML = [0, 1, 2].map((j) => `<i class="${j < n ? 'got' : ''}">★</i>`).join('');
      b.querySelector('.num').textContent = `${lv}-${i + 1}`;
      b.setAttribute('aria-label', `レベル${lv} ステージ${i + 1} ${STAGES[i].name}`);
    });
  }

  /* ---------------- HUD ---------------- */
  function hud(on) {
    $('hud').classList.toggle('on', on);
    document.body.classList.toggle('playing', on);
  }

  function setHearts(n, max) {
    const el = $('hearts');
    const prev = Number(el.dataset.n || max);
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="heart ${i < n ? 'full' : 'empty'}${i === n && n < prev ? ' lose' : ''}${i === n - 1 && n > prev ? ' gain' : ''}">${HEART}</span>`;
    el.innerHTML = html;
    el.dataset.n = n;
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
    // ひきざん: ひく かず は ✕ の まとまりで（9まで の ときは ひかれる ●の おしりを ✕）
    amount($('dA'), q.a, 'a', q.op === '-' && q.a <= 9 ? q.b : 0);
    amount($('dB'), q.b, q.op === '-' ? 'minus' : 'b');
    $('dAns').innerHTML = '';
    $('qLegend').classList.toggle('on', q.a >= 10 || q.b >= 10);
    el.classList.toggle('big', Math.max(q.a, q.b) >= 100 || String(q.a).length + String(q.b).length >= 5);
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
    $('qHelp').textContent = $('qLegend').classList.contains('on') ? 'おしい！ まとまりと ●を かぞえて みよう' : 'おしい！ ●を ゆびで かぞえて みよう';
  }

  function quizSolved(q) {
    const el = $('quiz');
    $('qAns').textContent = q.answer;
    amount($('dAns'), q.answer, 'ans'); // のこった かず（こたえ）
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
    $('clearLevel').textContent = `レベル${r.lv}・ステージ${game.stageIdx + 1}`;
    show('clear');
  }

  return { init, show, hud, setHearts, setDb, setStage, showQuiz, quizWrong, quizSolved, hideQuiz, setHint, banner, showClear };
})();
