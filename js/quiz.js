'use strict';
/* =========================================================
   さんすうの もんだいづくり
   むずかしさ（すうちの はんい）と ステージ（けいさんの しゅるい）は べつべつに きめる
   ========================================================= */

// むずかしさ: 上限（max）は たしざんの「こたえ」・ひきざんの「ひかれる かず」。
// ふだんの 出題は min〜max（かんたんな もんだい ばかりに ならないように）
const LEVELS = [
  { lv: 1, label: 'レベル1', sub: '1けた', min: 2, max: 9 },
  { lv: 2, label: 'レベル2', sub: '19まで', min: 10, max: 19 },
  { lv: 3, label: 'レベル3', sub: '39まで', min: 20, max: 39 },
  { lv: 4, label: 'レベル4', sub: '79まで', min: 40, max: 79 },
  { lv: 5, label: 'レベル5', sub: '110まで', min: 80, max: 110 },
];

// ステージ番号ごとの たしざんの わりあい（のこりは ひきざん）。どの むずかしさでも おなじ
const STAGE_MIX = [1, 0, 0.7, 0.3];
const STAGE_LABEL = ['たしざん', 'ひきざん', 'たしざん おおめ', 'ひきざん おおめ'];

// オトナモード: レベルごとに しゅるいを きめる（4ステージ ぜんぶ おなじ。ステージ1=たしざん などの きまりは つかわない）
// 2けた=10〜99、1けた=1〜9。レベル5の かけざん・わりざんは 2けた どうし
const ADULT_LEVELS = [
  { lv: 1, label: 'レベル1', sub: '2けたの たしざん', mark: '＋', ops: ['+'] },
  { lv: 2, label: 'レベル2', sub: '2けたの ひきざん', mark: '－', ops: ['-'] },
  { lv: 3, label: 'レベル3', sub: '2けた×1けた', mark: '×', ops: ['×'] },
  { lv: 4, label: 'レベル4', sub: '2けた÷1けた', mark: '÷', ops: ['÷'] },
  { lv: 5, label: 'レベル5', sub: 'しそく ミックス', mark: '＋－×÷', ops: ['+', '-', '×', '÷'] },
];

const Quiz = (() => {
  const recent = [];
  const RECENT_MAX = 6;
  const keyOf = (q) => q.a + q.op + q.b;

  function gen(op, L, rng) {
    const ri = (a, b) => Math.floor(a + rng() * (b - a + 1));
    if (op === '+') {
      const s = ri(L.min, L.max);
      const lo = Math.max(1, Math.floor(s * 0.15)); // 1 + 104 の ような かたよりを へらす
      const a = ri(lo, s - lo);
      return { a, b: s - a, op, answer: s };
    }
    const a = ri(L.min, L.max);
    const b = ri(Math.max(1, Math.floor(a * 0.1)), a); // ひく かずは 1 いじょう ひかれる かず いか（こたえ 0 も あり）
    return { a, b, op, answer: a - b };
  }

  function genAdult(op, lv, rng) {
    const ri = (a, b) => Math.floor(a + rng() * (b - a + 1));
    if (op === '+') {
      const a = ri(10, 99), b = ri(10, 99);
      return { a, b, op, answer: a + b };
    }
    if (op === '-') { // こたえが マイナスに ならない ように 大きい ほうから ひく
      const x = ri(10, 99), y = ri(10, 99);
      return { a: Math.max(x, y), b: Math.min(x, y), op, answer: Math.max(x, y) - Math.min(x, y) };
    }
    if (op === '×') {
      const a = ri(10, 99), b = lv === 5 ? ri(10, 99) : ri(1, 9);
      return { a, b, op, answer: a * b };
    }
    // ÷: わる かず（0 なし）と こたえを さきに きめて、わられる かずが 2けたに なる ものだけ（あまり なし）
    if (lv === 5) { // 2けた÷2けた（こたえ 1 ばかりに ならない ように わる かずは 49 まで）
      const b = ri(10, 49), q = ri(2, Math.floor(99 / b));
      return { a: b * q, b, op, answer: q };
    }
    const b = ri(1, 9), q = ri(Math.ceil(10 / b), Math.floor(99 / b));
    return { a: b * q, b, op, answer: q };
  }

  // レベル5は 4しゅるいを シャッフルして じゅんばんに（かたよらない）
  let adultBag = [];
  function adultOp(L, rng) {
    if (L.ops.length === 1) return L.ops[0];
    if (!adultBag.length) adultBag = shuffle(L.ops.slice(), rng);
    return adultBag.shift();
  }

  function makeAdult(lv, rng) {
    const L = ADULT_LEVELS[clamp(lv, 1, ADULT_LEVELS.length) - 1];
    const op = adultOp(L, rng);
    let q = null;
    for (let i = 0; i < 25; i++) {
      q = genAdult(op, L.lv, rng);
      if (!recent.includes(keyOf(q))) break;
    }
    recent.push(keyOf(q));
    if (recent.length > RECENT_MAX) recent.shift();
    q.choices = choicesFor(q.answer, 99 * 99, rng);
    q.lv = L.lv;
    q.adult = true;
    return q;
  }

  // lv: 1〜5、stage: 0〜3、adult: オトナモード
  function make(lv, stage, rng = Math.random, adult = false) {
    if (adult) return makeAdult(lv, rng);
    const L = LEVELS[clamp(lv, 1, LEVELS.length) - 1];
    const addRatio = STAGE_MIX[clamp(stage, 0, STAGE_MIX.length - 1)];
    // しゅるいは さきに 1かい だけ きめる（おなじ しきの さけかたで わりあいが ずれないように）
    const op = rng() < addRatio ? '+' : '-';
    let q = null;
    for (let i = 0; i < 25; i++) {
      q = gen(op, L, rng);
      if (!recent.includes(keyOf(q))) break; // 25かい で だめでも 範囲・しゅるいは まもった まま つかう
    }
    recent.push(keyOf(q));
    if (recent.length > RECENT_MAX) recent.shift();
    q.choices = choicesFor(q.answer, L.max, rng);
    q.lv = L.lv;
    return q;
  }

  // こたえ と ちかい かず。0〜上限 の なかで かならず 3つ ちがう かずに する
  function choicesFor(ans, max, rng = Math.random) {
    const ok = (v) => Number.isInteger(v) && v >= 0 && v <= max && v !== ans;
    const pickFrom = (arr) => arr[Math.floor(rng() * arr.length)];
    const near = [ans - 1, ans + 1, ans - 2, ans + 2].filter(ok);
    const far = [ans - 10, ans + 10, ans - 3, ans + 3, ans - 5, ans + 5].filter(ok);
    const out = [ans];
    if (near.length) out.push(pickFrom(near));
    const rest = far.concat(near).filter((v) => !out.includes(v));
    if (rest.length) out.push(pickFrom(rest));
    // たりなければ はんいの なかの べつの かず
    for (let guard = 0; out.length < 3 && guard < 500; guard++) {
      const v = Math.floor(rng() * (max + 1));
      if (!out.includes(v)) out.push(v);
    }
    return shuffle(out, rng);
  }

  const opWord = (op) => ({ '+': 'たす', '-': 'ひく', '×': 'かける', '÷': 'わる' }[op]);
  const opMark = (op) => ({ '+': '＋', '-': '－', '×': '×', '÷': '÷' }[op]);
  const askText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、いくつ？`;
  const answerText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、${q.answer}！`;

  return { make, choicesFor, opWord, opMark, askText, answerText };
})();
