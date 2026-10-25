'use strict';
/* =========================================================
   さんすうの もんだいづくり（ひとけたの たしざん・ひきざん）
   ========================================================= */
const Quiz = (() => {
  let lastKey = '';

  // ops: ['+'] / ['-'] / ['+','-']   maxNum: こたえ（たしざん）や ひかれるかず の さいだい
  function make(ops, maxNum) {
    for (let i = 0; i < 60; i++) {
      const op = ops[(Math.random() * ops.length) | 0];
      let a, b;
      if (op === '+') {
        const sum = randInt(2, Math.max(2, maxNum));
        a = randInt(Math.max(1, sum - 9), Math.min(9, sum - 1));
        b = sum - a;
      } else {
        a = randInt(2, Math.max(2, maxNum));
        b = randInt(Math.max(1, a - 9), Math.min(9, a));
        if (a === b && Math.random() < 0.75) continue; // こたえ 0 は たまに だけ
      }
      const key = a + op + b;
      if (key === lastKey) continue;
      lastKey = key;
      const answer = op === '+' ? a + b : a - b;
      return { a, b, op, answer, choices: choicesFor(answer) };
    }
    return { a: 1, b: 1, op: '+', answer: 2, choices: shuffle([1, 2, 3]) };
  }

  // こたえ と ちかい かず を まぜて 3つ
  function choicesFor(ans) {
    const near = shuffle([ans - 1, ans + 1].filter((v) => v >= 0));
    const far = shuffle([ans - 2, ans + 2, ans + 3, ans - 3].filter((v) => v >= 0 && v !== near[0]));
    return shuffle([ans, near[0], far[0]]);
  }

  const opWord = (op) => (op === '+' ? 'たす' : 'ひく');
  const opMark = (op) => (op === '+' ? '＋' : '－');
  const askText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、いくつ？`;
  const answerText = (q) => `${q.a} ${opWord(q.op)} ${q.b} は、${q.answer}！`;

  return { make, opWord, opMark, askText, answerText };
})();
