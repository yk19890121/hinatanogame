'use strict';
/* =========================================================
   こくごモード: 物語と 7問の データ（content/kokugo/levelX_stageY.json）
   - 文章・正解は ゲームの 処理に かかず、データファイルだけで さしかえる
   - よみこむ ときに かくにん（本文・7問・選択肢3つ・正解IDが ある・IDの かさなり・漢字や 英字）
     → だめな ところは コンソールに ファイル名と 場所を だし、その ステージは「データ エラー」で はじめられない
   - "ready": false（まだ 物語が ない）の ステージは「じゅんびちゅう」
   - 開発用: URL に ?kokugo=sample で 全ステージを 仮の 物語（content/kokugo-sample/sample_story.json）に する（正式データとは べつ）
   ========================================================= */
const KOKUGO_LEVELS = [1, 2, 3, 4, 5].map((lv) => ({ lv, label: `レベル${lv}`, sub: `ものがたり ${lv}` }));
const KOKUGO_FORMAT = 1;          // データ形式の バージョン（この ゲームが よめる もの）
const KOKUGO_ROAD = 4;            // 道中の 問題（1〜4問め）
const KOKUGO_BOSS = 3;            // ボス戦の 問題（5〜7問め）

const Kokugo = (() => {
  const cache = {};
  const sample = new URLSearchParams(location.search).get('kokugo') === 'sample';
  const file = (lv, st) => (sample ? 'content/kokugo-sample/sample_story.json' : `content/kokugo/level${lv}_stage${st}.json`);

  // ひらがな・カタカナ・記号・数字 だけ（漢字・英字は だめ）
  const KANJI = /[㐀-䶿一-鿿豈-﫿]/;
  const LATIN = /[A-Za-zＡ-Ｚａ-ｚ]/;
  function badChars(s) {
    const out = [];
    for (const ch of s) if (KANJI.test(ch) || LATIN.test(ch)) out.push(ch);
    return [...new Set(out)].join('');
  }

  // データの かくにん → { ok, ready, errors: [...] }
  function validate(d, name) {
    const errors = [];
    const err = (where, msg) => errors.push(`${name} ${where}: ${msg}`);
    if (!d || typeof d !== 'object') return { ok: false, ready: false, errors: [`${name}: JSON の 形が ちがいます`] };
    if (d.ready === false) return { ok: false, ready: false, errors: [] }; // じゅんびちゅう
    if (d.formatVersion !== KOKUGO_FORMAT) err('formatVersion', `${KOKUGO_FORMAT} では ありません（${d.formatVersion}）`);
    if (!d.storyId) err('storyId', 'ありません');
    if (!Number.isInteger(d.contentVersion)) err('contentVersion', '整数では ありません');
    if (!d.title || !String(d.title).trim()) err('title', 'ありません');
    else if (badChars(d.title)) err('title', `漢字・英字が あります「${badChars(d.title)}」`);
    const pages = Array.isArray(d.pages) ? d.pages : typeof d.text === 'string' ? [d.text] : null;
    if (!pages || !pages.length || !pages.join('').trim()) err('pages', '本文が ありません');
    else pages.forEach((p, i) => { const b = badChars(String(p)); if (b) err(`pages[${i}]`, `漢字・英字が あります「${b}」`); });
    const qs = d.questions;
    if (!Array.isArray(qs) || qs.length !== KOKUGO_ROAD + KOKUGO_BOSS) err('questions', `${KOKUGO_ROAD + KOKUGO_BOSS}問 では ありません（${Array.isArray(qs) ? qs.length : 'なし'}）`);
    const qids = new Set();
    (Array.isArray(qs) ? qs : []).forEach((q, i) => {
      const at = `questions[${i}]${q && q.id ? `（${q.id}）` : ''}`;
      if (!q || !q.id) err(at, 'id が ありません');
      else if (qids.has(q.id)) err(at, `id「${q.id}」が かさなっています`);
      else qids.add(q.id);
      if (!q || !q.text || !String(q.text).trim()) err(at, '質問文が ありません');
      else if (badChars(q.text)) err(`${at}.text`, `漢字・英字が あります「${badChars(q.text)}」`);
      const cs = q && q.choices;
      if (!Array.isArray(cs) || cs.length !== 3) { err(`${at}.choices`, '選択肢が 3つ では ありません'); return; }
      const cids = new Set();
      cs.forEach((c, j) => {
        if (!c || !c.id) err(`${at}.choices[${j}]`, 'id が ありません');
        else if (cids.has(c.id)) err(`${at}.choices[${j}]`, `id「${c.id}」が かさなっています`);
        else cids.add(c.id);
        if (!c || !c.text || !String(c.text).trim()) err(`${at}.choices[${j}]`, '文が ありません');
        else if (badChars(c.text)) err(`${at}.choices[${j}]`, `漢字・英字が あります「${badChars(c.text)}」`);
      });
      if (!cids.has(q.answer)) err(`${at}.answer`, `正解ID「${q.answer}」が 選択肢に ありません`);
    });
    return { ok: !errors.length, ready: true, errors };
  }

  // { status: 'ok' | 'wait'（じゅんびちゅう）| 'error' | 'missing', data, errors }
  function load(lv, st) {
    const key = `${lv}-${st}`;
    if (cache[key]) return cache[key];
    const name = file(lv, st);
    cache[key] = (typeof fetch === 'function' ? fetch(name, { cache: 'no-cache' }) : Promise.reject(new Error('fetch なし')))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((d) => {
        const v = validate(d, name);
        if (!v.ready && !v.errors.length) return { status: 'wait', data: d, errors: [] };
        if (!v.ok) {
          console.warn(`[こくご] データに もんだいが あります（このステージは はじめられません）\n${v.errors.join('\n')}`);
          return { status: 'error', data: d, errors: v.errors };
        }
        if (d.level !== lv || d.stage !== st) console.warn(`[こくご] ${name}: level/stage が ${d.level}-${d.stage} に なっています（${lv}-${st} として つかいます）`);
        return { status: 'ok', data: d, errors: [] };
      }, (e) => {
        console.warn(`[こくご] ${name} を よみこめません（${e.message}）`);
        return { status: 'missing', data: null, errors: [`${name}: よみこめません（${e.message}）`] };
      });
    return cache[key];
  }
  // テスト・ステージえらび用: よみおわっている ものだけ すぐ かえす
  const peek = {};
  function get(lv, st) {
    const key = `${lv}-${st}`;
    if (!peek[key]) load(lv, st).then((r) => { peek[key] = r; });
    return peek[key] || null;
  }
  function set(lv, st, d) { // テスト用: データを じかに いれる
    const v = validate(d, `test ${lv}-${st}`);
    const r = { status: v.ok ? 'ok' : v.ready ? 'error' : 'wait', data: d, errors: v.errors };
    cache[`${lv}-${st}`] = Promise.resolve(r);
    peek[`${lv}-${st}`] = r;
  }

  // 本文の 単位: ページ（データの くぎり）→ 段落 → 文（。！？ の あと）。ページを またいで つなげない
  function units(d) {
    const pages = Array.isArray(d.pages) ? d.pages : [d.text];
    return pages.map((p) => String(p).split(/\n{2,}/).map((para) => para.replace(/\n/g, '').split(/(?<=[。！？!?」])/).filter((s) => s.trim())));
  }

  // 画面に はいる だけで ページを わける（文字を ちいさく しない。1ページ 300文字 くらいまで）
  // fits(html) が 画面に おさまるか を かえす（DOM で はかる）
  function paginate(d, fits, maxChars = 300) {
    const out = [];
    for (const page of units(d)) {
      let cur = [], curLen = 0;
      const flush = () => { if (cur.length) out.push(cur.map((p) => p.join('')).filter(Boolean)); cur = []; curLen = 0; };
      for (const para of page) {
        let paraOut = [];
        for (const s of para) {
          const tryCur = [...cur, [...paraOut, s]];
          if (cur.length + paraOut.length && (curLen + s.length > maxChars || !fits(tryCur))) {
            if (paraOut.length) cur.push(paraOut);
            flush();
            paraOut = [];
          }
          paraOut.push(s);
          curLen += s.length;
        }
        if (paraOut.length) cur.push(paraOut);
      }
      flush();
    }
    return out; // [ページ][段落] = 段落の 文
  }

  return { load, get, set, validate, paginate, badChars, file, get sample() { return sample; } };
})();
