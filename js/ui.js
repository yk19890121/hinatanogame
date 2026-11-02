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
    for (const k of ['title', 'select', 'settings', 'pause', 'clear', 'over', 'read']) screens[k] = $('scr' + k[0].toUpperCase() + k.slice(1));
    initReading();
    initChoices();
    click('btnPlay', () => {
      Sound.play('select');
      game.openSelect();
    });
    // モード（さんすう・こくご・おとな）。「あそぶ」で その モードの ステージえらびへ
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
    // 1〜5: けいさん、6〜8: ぶんしょうもんだい（いろと くぎりで わける。オトナモードでは 6〜8 を かくす）
    $('levelSel').innerHTML = [...LEVELS, ...WORD_LEVELS].map((L) => `<button data-lv="${L.lv}"${L.lv >= WORD_LV0 ? ' class="word"' : ''}><b>${L.label}</b><small>${L.sub}</small></button>`).join('');
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
    // さいしょから・つぎへ・もういちど: こくごモードは 物語を よむ 画面から（enterStage）
    click('btnRetry', () => game.enterStage(game.stageIdx));
    click('btnToSelect', () => game.toSelect());
    click('btnNext', () => {
      const last = game.stageIdx >= STAGES.length - 1;
      if (last) game.toSelect();
      else game.enterStage(game.stageIdx + 1);
    });
    click('btnAgain', () => game.enterStage(game.stageIdx));
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
  const onScreen = (name) => screens[name].classList.contains('on');

  // えらんでいる モードを 色・わくで しめす（こくご・おとなは せつめいも）
  function syncMode() {
    const mode = game.playMode;
    $('modeSel').querySelectorAll('button').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    document.querySelectorAll('.mode-note').forEach((n) => n.classList.toggle('on', n.dataset.mode === mode));
    document.body.classList.toggle('adult', mode === 'adult');
    document.body.classList.toggle('kokugo', mode === 'kokugo');
  }

  /* ---------------- こくご: 物語を よむ 画面 ----------------
     1ページ 300文字 くらいまで、画面に おさまる ぶんだけ（文字は ちいさく しない）。データの ページの くぎりは まもり、
     そのなかは 段落・文の くぎりで わける。「まえへ」「つぎへ」、さいごの ページに「スタート」。じどうで すすまない */
  const read = { story: null, pages: [], i: 0 };
  function initReading() {
    click('btnReadPrev', () => turn(-1));
    click('btnReadNext', () => turn(1));
    click('btnReadStart', () => {
      Sound.play('select');
      game.startStage(game.stageIdx); // よむ 曲は ここで おわり、プレイの 曲へ
    });
    click('btnReadBack', () => {
      Sound.play('select');
      game.toSelect();
    });
    window.addEventListener('resize', () => { if (screens.read.classList.contains('on')) layoutReading(true); });
  }
  function turn(d) {
    const n = clamp(read.i + d, 0, read.pages.length - 1);
    if (n === read.i) return;
    Sound.play('select');
    read.i = n;
    drawPage();
  }
  const paraHtml = (paras) => paras.map((p) => `<p>${esc(p)}</p>`).join('');
  function layoutReading(keep) {
    const body = $('readBody');
    // いま よんでいる ページの さいしょの 文を おぼえて、わけなおした あとも その ページへ
    const first = keep && read.pages[read.i] ? read.pages[read.i][0].slice(0, 12) : null;
    const probe = $('readProbe');
    probe.style.width = body.clientWidth + 'px';
    probe.style.height = body.clientHeight + 'px';
    read.pages = Kokugo.paginate(read.story, (paras) => {
      probe.innerHTML = paraHtml(paras.map((p) => p.join('')));
      return probe.scrollHeight <= probe.clientHeight + 1;
    });
    probe.innerHTML = '';
    read.i = first ? Math.max(0, read.pages.findIndex((p) => p.join('').includes(first))) : 0;
    drawPage();
  }
  function drawPage() {
    const n = read.pages.length, last = read.i >= n - 1;
    $('readBody').innerHTML = paraHtml(read.pages[read.i] || []);
    $('readPage').textContent = `${read.i + 1}／${n}`;
    $('btnReadPrev').hidden = read.i === 0;
    $('btnReadNext').hidden = last;
    $('btnReadStart').hidden = !last;
  }
  function showReading(story, lv, i) {
    read.story = story;
    $('readLevel').textContent = `こくご・レベル${lv}・ステージ${i + 1}`;
    $('readTitle').textContent = story.title || '';
    show('read');
    layoutReading(false);
  }

  /* ---------------- こくご: 3択（たてに 3つ。1〜3キー・タップ） ---------------- */
  function initChoices() {
    $('qKokugo').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-n]');
      if (!b) return;
      e.preventDefault();
      b.blur();
      game.answerChoice(Number(b.dataset.n));
      Input.reset(); // タップを ジャンプに しない
    });
  }
  const quizOpen = () => $('quiz').classList.contains('show') && !$('quiz').classList.contains('solved');
  function markChoice(n, ok) {
    const b = $('qKokugo').querySelector(`button[data-n="${n}"]`);
    if (b) b.classList.add(ok ? 'ok' : 'ng');
    if (b && !ok) b.disabled = true;
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
        if (!b.classList.contains('locked')) Sound.play('select');
        game.enterStage(Number(b.dataset.i)); // こくごは 物語を よむ 画面へ（じゅんびちゅう なら はじめない）
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
    const lv = game.levelNo, adult = game.adult, kokugo = game.kokugo, AL = ADULT_LEVELS[lv - 1];
    $('selMode').textContent = adult ? 'おとなモード（さんすう）' : kokugo ? 'こくごモード' : 'さんすうモード';
    $('selMode').classList.toggle('adult', adult);
    $('selMode').classList.toggle('kokugo', kokugo);
    const levelsOf = adult ? ADULT_LEVELS : kokugo ? KOKUGO_LEVELS : [...LEVELS, ...WORD_LEVELS];
    const word = !adult && !kokugo && lv >= WORD_LV0;
    $('levelSel').querySelectorAll('button').forEach((b) => {
      const L = levelsOf[Number(b.dataset.lv) - 1];
      b.hidden = !L;
      b.classList.toggle('on', Number(b.dataset.lv) === lv);
      if (L) b.querySelector('small').textContent = L.sub;
    });
    grid.dataset.lv = lv;
    grid.querySelectorAll('.stage-card').forEach((b) => {
      const i = Number(b.dataset.i);
      const n = game.starsFor(lv, i);
      b.querySelector('.card-stars').innerHTML = [0, 1, 2].map((j) => `<i class="${j < n ? 'got' : ''}">★</i>`).join('');
      b.querySelector('.num').textContent = `${lv}-${i + 1}`;
      // オトナは 4ステージとも その レベルの もんだい。こくごは 物語の だいめい（ない ときは じゅんびちゅう）
      let label = adult ? AL.sub : word ? `ぶんしょう ${STAGE_LABEL[i]}` : STAGE_LABEL[i], locked = false;
      if (kokugo) {
        const r = Kokugo.get(lv, i + 1);
        if (!r) { label = 'よみこみちゅう…'; waitCards(lv, i); }
        else if (r.status === 'ok') label = r.data.title || `ものがたり ${i + 1}`;
        else { label = r.status === 'error' ? 'データ エラー' : 'じゅんびちゅう'; locked = true; }
      }
      b.querySelector('.op').textContent = adult ? AL.mark : kokugo ? 'あ' : STAGES[i].mark;
      b.querySelector('.card-label').textContent = label;
      b.classList.toggle('word', word);
      b.classList.toggle('kokugo', kokugo);
      b.classList.toggle('locked', locked);
      b.setAttribute('aria-label', `${adult ? 'おとなモード ' : kokugo ? 'こくごモード ' : ''}レベル${lv} ステージ${i + 1} ${kokugo ? label : STAGES[i].name}`);
    });
  }
  // こくご: 物語の よみこみが おわったら カードを かきなおす（おなじ ステージは 1かい だけ）
  const waiting = new Set();
  function waitCards(lv, i) {
    const key = `${lv}-${i}`;
    if (waiting.has(key)) return;
    waiting.add(key);
    Kokugo.load(lv, i + 1).then(() => setTimeout(() => {
      waiting.delete(key);
      if (game.kokugo && game.levelNo === lv) refreshCards();
    }, 0));
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
  function setModeTag(mode, sec) {
    const el = $('modeTag'), adult = mode === 'adult';
    el.classList.toggle('adult', adult);
    el.classList.toggle('kokugo', mode === 'kokugo');
    el.querySelector('.mode-name').textContent = adult ? 'おとな' : mode === 'kokugo' ? 'こくごモード' : 'さんすうモード';
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
    // 文章問題: 文を 1ぶんずつ 行に わけて 出す（式・こたえは こたえた あとに だけ）
    el.classList.toggle('word', !!q.word);
    el.classList.toggle('kokugo', !!q.kokugo);
    if (q.kokugo) return showKokugo(el, q);
    $('qWord').innerHTML = q.word ? q.lines.map((s, i) => `<span class="ql${i === q.lines.length - 1 ? ' ask' : ''}">${s}</span>`).join('') + '<span class="ql q-word-ans" id="qWordAns"></span>' : '';
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

  // こくご: 質問文 ＋ 選択肢 3つ（たてに ならべ、ながい 文は おりかえす。きらない）
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function showKokugo(el, q) {
    $('qWord').innerHTML = '';
    // 左右の ハート・ひとやすみ ボタンに かからない はばに する
    const hl = $('hud').querySelector('.hud-left').getBoundingClientRect(), hr = $('hud').querySelector('.hud-right').getBoundingClientRect();
    el.style.setProperty('--kl', `${Math.round(hl.right + 8)}px`);
    el.style.setProperty('--kr', `${Math.round(window.innerWidth - hr.left + 8)}px`);
    $('qKokugo').innerHTML = `<div class="kq">${q.bossLeft ? `<small class="k-boss">ボス のこり ${q.bossLeft}もん</small>` : `<small class="k-no">${q.no}もんめ</small>`}${esc(q.text)}</div>`
      + `<div class="k-choices">${q.opts.map((o, i) => `<button type="button" data-n="${i + 1}"><b>${i + 1}</b><span>${esc(o.text)}</span></button>`).join('')}</div>`;
    el.classList.remove('big', 'huge', 'adult', 'solved', 'wrong');
    $('qLegend').classList.remove('on');
    $('qHelp').textContent = '1・2・3 の キーか、こたえを タッチ！';
    el.classList.add('show');
    document.body.classList.add('quizzing');
  }

  function quizWrong() {
    const el = $('quiz');
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
    $('qHelp').textContent = el.classList.contains('kokugo') ? 'おしい！ ものがたりを おもいだして もういちど'
      : el.classList.contains('word') ? 'おしい！ もういちど よんで みよう'
      : el.classList.contains('adult') ? 'おしい！ もういちど けいさん しよう'
      : $('qLegend').classList.contains('on') ? 'おしい！ まとまりと ●を かぞえて みよう' : 'おしい！ ●を ゆびで かぞえて みよう';
  }

  function quizSolved(q) {
    const el = $('quiz');
    if (q.kokugo) { // せいかいの 選択肢を みどりに（もう おせない）
      markChoice(q.answer, true);
      $('qKokugo').querySelectorAll('button').forEach((b) => { b.disabled = true; });
    } else $('qAns').textContent = q.answer;
    if (q.kokugo) ; // 式・●は ない
    else if (q.word) $('qWordAns').textContent = `こたえ　${q.answer}（しき　${Word.formulaText(q)}）`; // こたえた あとに 式を みせる
    else if (!q.adult) amount($('dAns'), q.answer, 'ans'); // のこった かず（こたえ）
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
    if (r.kokugo) msgs[1] = 'すごい！ きんにくも こくごも ばっちり！';
    $('cMsg').textContent = r.last ? `レベル${r.lv} ぜんぶ クリア！ きみは ${r.kokugo ? 'こくご' : 'さんすう'}の チャンピオン！` : msgs[r.stars - 1];
    $('btnNext').textContent = r.last ? 'むずかしさを えらぶ' : 'つぎの ステージへ';
    $('clearLevel').textContent = `${r.adult ? 'おとなモード・' : r.kokugo ? 'こくごモード・' : ''}レベル${r.lv}${!r.adult && !r.kokugo && r.lv >= WORD_LV0 ? `（${WORD_LEVELS[r.lv - WORD_LV0].sub}）` : ''}・ステージ${game.stageIdx + 1}`;
    $('cTimeBox').hidden = !r.adult;
    if (r.adult) $('cTime').textContent = `${Math.floor(r.left / 60)}:${String(r.left % 60).padStart(2, '0')}`;
    renderLog(r.log || []);
    show('clear');
  }

  /* ---------------- ゲームオーバー（オトナモード） ---------------- */
  function showOver(r) {
    $('overLevel').textContent = `おとなモード・レベル${r.lv}・ステージ${r.stage + 1}`;
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
    const boss = (e) => (e.boss ? '<small class="boss-tag">ボス</small>' : '');
    // 文章問題: 文の ぜんぶ ＋ 式・せいかい・えらんだ こたえ（じゅんに）
    const word = (e) => `<li class="word${e.miss ? ' miss' : ''}"><div class="wq">${e.lines.join('')}${boss(e)}</div>`
      + `<div class="wa"><span class="wf">${e.formula}</span><span class="wp">きみの こたえ　${e.picks.length ? e.picks.join(' → ') : 'ー'}</span><span class="r">${mark(e)}</span></div></li>`;
    // こくご: 質問文 ＋ きみの こたえ（じゅんに）・せいかい。○×は さいしょの こたえで きめる
    const optText = (e, id) => esc((e.opts.find((o) => o.id === id) || { text: id }).text);
    const kokugo = (e) => `<li class="word kokugo${e.miss ? ' miss' : ''}"><div class="wq">${esc(e.text)}${boss(e)}</div>`
      + `<div class="wa"><span class="wp">きみの こたえ　${e.picks.length ? e.picks.map((id) => optText(e, id)).join(' → ') : 'ー'}</span>`
      + `<span class="wf">せいかい　${optText(e, e.answerId)}</span><span class="r">${mark(e)}</span></div></li>`;
    list.innerHTML = log.map((e) => (e.kokugo ? kokugo(e) : e.word ? word(e) : `<li${e.miss ? ' class="miss"' : ''}><span class="q">${e.a} ${Quiz.opMark(e.op)} ${e.b} ＝ ${e.answer}${boss(e)}</span><span class="r">${mark(e)}</span></li>`)).join('');
    list.scrollTop = 0;
  }

  return { init, show, hud, setHearts, setDb, setStage, setModeTag, showQuiz, quizWrong, quizSolved, hideQuiz, setHint, banner, showClear, showOver, showReading, quizOpen, markChoice, onScreen };
})();
