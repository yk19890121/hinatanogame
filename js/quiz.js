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

  // lv: 1〜5、stage: 0〜3
  function make(lv, stage, rng = Math.random) {
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

  const opWord = (op) => (op === '+' ? 'たす' : 'ひく');
  const opMark = (op) => (op === '+' ? '＋' : '－');
  const askText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、いくつ？`;
  const answerText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、${q.answer}！`;

  return { make, choicesFor, opWord, opMark, askText, answerText };
})();
