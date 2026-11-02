'use strict';
/* =========================================================
   文章問題（通常モードの レベル6〜8）
   - 文・数・演算・正解・ふりかえりの 式は ぜんぶ おなじ もんだいデータ から つくる（くいちがわない）
   - もんだい文は ひらがな・カタカナ だけ（数は 全角の 算用数字）。読みあげは しない
   - 物ごとに 単位・できる 動作を きめておく（「シールを たべる」の ような 文に ならない）
   ========================================================= */

// 数の はんい（ここを かえれば 調整できる）
//   num: もんだいに でる 数（どれも この はんい）、ans: こたえ（レベル8は とちゅうの 計算も）
const WORD_LEVELS = [
  { lv: 6, label: 'レベル6', sub: 'ぶんしょうもんだい 1', steps: 1, num: [1, 9], ans: [0, 9] },
  { lv: 7, label: 'レベル7', sub: 'ぶんしょうもんだい 2', steps: 1, num: [10, 99], ans: [0, 99] },
  { lv: 8, label: 'レベル8', sub: 'ぶんしょうもんだい 3', steps: 2, num: [1, 9], ans: [0, 20] },
];
const WORD_LV0 = 6; // この レベルから 文章問題

const Word = (() => {
  // 物: 単位と、つかえる 動作（eat=たべる, use=つかう, buy=かう, pick=ひろう, box=はこに いれる・とりだす）
  const ITEMS = [
    { name: 'グミ', unit: 'こ', eat: true, buy: true },
    { name: 'アメ', unit: 'こ', eat: true, buy: true },
    { name: 'リンゴ', unit: 'こ', eat: true, buy: true, box: true },
    { name: 'ミカン', unit: 'こ', eat: true, buy: true, box: true },
    { name: 'クッキー', unit: 'まい', eat: true, buy: true },
    { name: 'シール', unit: 'まい', use: true, buy: true },
    { name: 'カード', unit: 'まい' },
    { name: 'えんぴつ', unit: 'ほん', buy: true, box: true },
    { name: 'ボール', unit: 'こ', box: true },
    { name: 'ドングリ', unit: 'こ', pick: true, box: true },
  ];
  const KIDS = ['ひなたくん', 'きほちゃん'];
  const GROWN = ['おかあさん', 'おとうさん', 'おばあちゃん', 'せんせい'];

  const zen = (n) => String(n).replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));

  /* 場面: start(n) と、たす・ひく ステップの 文（つかえる ものだけ）、さいごの しつもん
     ctx に つかった 人を おぼえて、2かいめは ちがう 人に する */
  const SCENES = {
    // ひとが 物を もっている
    have: {
      setup(rng) {
        const item = pickR(ITEMS, rng), [P, Q] = shuffle(KIDS.slice(), rng);
        return { item, P, Q, used: new Set() };
      },
      start: (c, n) => `${c.P}は、${c.item.name}を${zen(n)}${c.item.unit}もっていました。`,
      add(c, n, rng) {
        const u = c.item.unit, x = c.item.name, opts = [];
        if (!c.used.has('kid')) opts.push(['kid', `${c.Q}に、${x}を${zen(n)}${u}もらいました。`]);
        if (!c.used.has('grown')) opts.push(['grown', `${c.G || (c.G = pickR(GROWN, rng))}に、${x}を${zen(n)}${u}もらいました。`]);
        if (c.item.buy && !c.used.has('buy')) opts.push(['buy', `おみせで、${x}を${zen(n)}${u}かいました。`]);
        if (c.item.pick && !c.used.has('pick')) opts.push(['pick', `こうえんで、${x}を${zen(n)}${u}ひろいました。`]);
        return use(c, opts, rng);
      },
      sub(c, n, rng) {
        const u = c.item.unit, x = c.item.name, opts = [];
        if (!c.used.has('kid')) opts.push(['kid', `${c.Q}に、${x}を${zen(n)}${u}あげました。`]);
        if (!c.used.has('grown')) opts.push(['grown', `${c.G || (c.G = pickR(GROWN, rng))}に、${x}を${zen(n)}${u}あげました。`]);
        if (c.item.eat && !c.used.has('eat')) opts.push(['eat', `${x}を${zen(n)}${u}たべました。`]);
        if (c.item.use && !c.used.has('use')) opts.push(['use', `${x}を${zen(n)}${u}つかいました。`]);
        return use(c, opts, rng);
      },
      ask: (c, last) => (last === '+' ? `${c.P}は、${c.item.name}をなん${c.item.unit}もっていますか？` : `${c.P}の${c.item.name}は、なん${c.item.unit}のこっていますか？`),
    },
    // はこの なかの 物
    box: {
      setup(rng) { return { item: pickR(ITEMS.filter((i) => i.box), rng), used: new Set() }; },
      start: (c, n) => `はこに、${c.item.name}が${zen(n)}${c.item.unit}はいっていました。`,
      add: (c, n) => `はこに、${c.item.name}を${zen(n)}${c.item.unit}いれました。`,
      sub: (c, n) => `はこから、${c.item.name}を${zen(n)}${c.item.unit}とりだしました。`,
      ask: (c, last) => `はこには、${c.item.name}がなん${c.item.unit}${last === '+' ? 'はいっていますか？' : 'のこっていますか？'}`,
    },
    // こうえんの こども
    park: {
      setup: () => ({}),
      start: (c, n) => `こうえんで、こどもが${zen(n)}にんあそんでいました。`,
      add: (c, n) => `こどもが${zen(n)}にんあそびにきました。`,
      sub: (c, n) => `こどもが${zen(n)}にんかえりました。`,
      ask: (c, last) => (last === '+' ? 'こうえんにいるこどもは、なんにんになりましたか？' : 'こうえんにのこっているこどもは、なんにんですか？'),
    },
    // きの ことり（1本の きに とまる かずなので こたえが 20まで の レベルだけ）
    bird: {
      maxAns: 20,
      setup: () => ({}),
      start: (c, n) => `きに、ことりが${zen(n)}わとまっていました。`,
      add: (c, n) => `ことりが${zen(n)}わとんできました。`,
      sub: (c, n) => `ことりが${zen(n)}わとんでいきました。`,
      ask: (c, last) => (last === '+' ? 'きにとまっていることりは、なんわになりましたか？' : 'きにのこっていることりは、なんわですか？'),
    },
  };
  // 場面の でやすさ（ひとが もつ 場面を おおめに）
  const SCENE_BAG = ['have', 'have', 'have', 'have', 'box', 'park', 'bird'];

  function pickR(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function use(c, opts, rng) {
    const [k, s] = pickR(opts, rng);
    c.used.add(k);
    return s;
  }

  // 数を きめる: どの 数も num の はんい、とちゅう・さいごの こたえも ans の はんい（マイナスなし）
  function numbers(L, ops, rng) {
    const ri = (a, b) => Math.floor(a + rng() * (b - a + 1));
    for (let t = 0; t < 500; t++) {
      const n = [ri(L.num[0], L.num[1])];
      let v = n[0], ok = true;
      const mids = [];
      for (const op of ops) {
        const m = ri(L.num[0], L.num[1]);
        n.push(m);
        v = op === '+' ? v + m : v - m;
        if (v < L.ans[0] || v > L.ans[1]) { ok = false; break; }
        mids.push(v);
      }
      if (ok) return { n, mids };
    }
    return null;
  }

  // ステージごとの 演算: 1=たす、2=ひく、3=たす おおめ、4=ひく おおめ（STAGE_MIX と おなじ わりあい）
  // レベル8: 1=たす→たす、2=ひく→ひく、3・4は 1かいごとに わりあいで（たす→ひく・ひく→たす も でる）
  function opsFor(L, stage, rng) {
    const mix = STAGE_MIX[clamp(stage, 0, 3)];
    const one = () => (rng() < mix ? '+' : '-');
    return Array.from({ length: L.steps }, one);
  }

  const recent = [];
  let lastScene = null, lastItem = null;

  function make(lv, stage, rng = Math.random) {
    const L = WORD_LEVELS[clamp(lv, WORD_LV0, WORD_LV0 + WORD_LEVELS.length - 1) - WORD_LV0];
    let q = null;
    // たす・ひくは さきに 1かいだけ きめる（おなじ もんだいの よけなおしで えらびなおすと、くみあわせの すくない たしざんが へって わりあいが ずれる）
    const ops = opsFor(L, stage, rng);
    for (let t = 0; t < 40; t++) {
      const nm = numbers(L, ops, rng);
      if (!nm) continue;
      const bag = SCENE_BAG.filter((k) => !SCENES[k].maxAns || L.ans[1] <= SCENES[k].maxAns);
      let sk;
      do { sk = pickR(bag, rng); } while (sk === lastScene && rng() < 0.85);
      const S = SCENES[sk];
      let c;
      for (let k = 0; k < 6; k++) { c = S.setup(rng); if (!c.item || c.item.name !== lastItem) break; }
      const lines = [S.start(c, nm.n[0])];
      ops.forEach((op, i) => {
        const s = op === '+' ? S.add(c, nm.n[i + 1], rng) : S.sub(c, nm.n[i + 1], rng);
        lines.push(i > 0 ? 'そのあと、' + s : s);
      });
      lines.push(S.ask(c, ops[ops.length - 1]));
      const answer = nm.mids[nm.mids.length - 1];
      const key = lines.join('');
      q = {
        word: true, lv: L.lv, scene: sk, item: c.item ? c.item.name : null, lines, text: key, nums: nm.n, ops, answer, mid: ops.length > 1 ? nm.mids[0] : null,
        a: nm.n[0], op: ops[0], b: nm.n[1], // まえの 形と おなじ ところ（ログ・カード用）
        formula: nm.n.map((v, i) => (i ? ` ${ops[i - 1]} ` : '') + v).join(''),
      };
      if (!recent.includes(key) && !recent.includes(nm.n.join(ops.join('')))) break;
    }
    recent.push(q.text, q.nums.join(q.ops.join('')));
    while (recent.length > 16) recent.shift();
    lastScene = q.scene;
    lastItem = q.item;
    q.choices = choices(q, L, rng);
    return q;
  }

  // 選択肢: 正解 1つ ＋ まちがえやすい 2つ（レベル8は「1かいめの けいさんで とめた こたえ」、ほかは たす・ひくを ぎゃくに した こたえ・ちかい 数）
  function choices(q, L, rng) {
    const max = L.ans[1];
    const ok = (v, out) => Number.isInteger(v) && v >= 0 && v <= max && !out.includes(v);
    const out = [q.answer];
    const tricky = [];
    if (q.mid != null) tricky.push(q.mid);
    if (q.nums.length === 2) tricky.push(q.op === '+' ? q.nums[0] - q.nums[1] : q.nums[0] + q.nums[1]);
    else tricky.push(q.nums[0] + (q.ops[0] === '+' ? -q.nums[1] : q.nums[1]) + (q.ops[1] === '+' ? q.nums[2] : -q.nums[2]));
    const t = shuffle(tricky.filter((v) => ok(v, out)), rng);
    if (t.length && rng() < 0.7) out.push(t[0]);
    const near = shuffle([1, -1, 2, -2, ...(max > 20 ? [10, -10] : [3, -3])].map((d) => q.answer + d), rng);
    for (const v of [...near, ...t]) if (out.length < 3 && ok(v, out)) out.push(v);
    for (let g = 0; out.length < 3 && g < 500; g++) { const v = Math.floor(rng() * (max + 1)); if (ok(v, out)) out.push(v); }
    return shuffle(out, rng);
  }

  const formulaText = (q) => `${q.formula.replace(/\+/g, '＋').replace(/-/g, '－')} ＝ ${q.answer}`;

  return { make, choices, formulaText, ITEMS, SCENES };
})();
