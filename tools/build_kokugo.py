"""こくごモードの 物語と問題（Excel）→ content/kokugo/level{L}_stage{S}.json

使い方:
  python tools/build_kokugo.py <マッチョRUN_こくごモード_物語と問題.xlsx> [--check]
    --check  かくにん だけ（ファイルを 書かない）

Excel の シート:
  本文  : storyId / Level / Stage / タイトル / ページ / 本文（1行 = 1ページ）
  問題  : storyId / Level / Stage / タイトル / 問No / 出題（道中・ボス戦）/ 問題ID / 質問文 /
          選択肢1〜3 ID・文 / 正解ID / 正解番号 / 正解の文 / 本文の根拠（根拠は JSON に 出さない）
  ステージ一覧: storyId / Level / Stage / contentVersion / schemaVersion

ゲームと おなじ きまりで かくにんし（js/kokugo.js の validate）、だめな ところが あれば 書かずに おわる。
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'content' / 'kokugo'
FORMAT = 1
ROAD, BOSS = 4, 3
KANJI = re.compile(r'[㐀-䶿一-鿿豈-﫿]')
LATIN = re.compile(r'[A-Za-zＡ-Ｚａ-ｚ]')


def rows(ws):
    it = ws.iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else '' for h in next(it)]
    for r in it:
        if r and any(c is not None and str(c).strip() for c in r):
            yield {h: (str(v).strip() if v is not None else '') for h, v in zip(head, r)}


def bad_chars(s):
    return ''.join(sorted({c for c in s if KANJI.match(c) or LATIN.match(c)}))


def flat(s):
    return re.sub(r'\s+', '', s)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check_only = '--check' in sys.argv
    if not args:
        sys.exit(__doc__)
    wb = openpyxl.load_workbook(args[0], data_only=True)
    errors, warns = [], []

    meta = {r['storyId']: r for r in rows(wb['ステージ一覧'])}
    stories = {}
    for r in rows(wb['本文']):
        sid = r['storyId']
        s = stories.setdefault(sid, {'storyId': sid, 'level': int(r['Level']), 'stage': int(r['Stage']), 'title': r['タイトル'], 'pages': {}})
        s['pages'][int(r['ページ'])] = r['本文']
    qs = defaultdict(list)
    for r in rows(wb['問題']):
        qs[r['storyId']].append(r)

    out = {}
    for sid, s in stories.items():
        at = f"{sid}（レベル{s['level']}・ステージ{s['stage']}）"
        err = lambda where, msg: errors.append(f'{at} {where}: {msg}')
        m = meta.get(sid, {})
        ver = int(m.get('schemaVersion') or FORMAT)
        if ver != FORMAT:
            err('schemaVersion', f'{FORMAT} では ありません（{ver}）')
        pages = [s['pages'][k] for k in sorted(s['pages'])]
        if not pages or not ''.join(pages).strip():
            err('本文', 'ありません')
        for i, p in enumerate(pages):
            if bad_chars(p):
                err(f'本文 {i + 1}ページ', f'漢字・英字「{bad_chars(p)}」')
        if bad_chars(s['title']):
            err('タイトル', f'漢字・英字「{bad_chars(s["title"])}」')
        body = flat(''.join(pages))
        items = sorted(qs.get(sid, []), key=lambda r: int(r['問No']))
        if len(items) != ROAD + BOSS:
            err('問題', f'{ROAD + BOSS}問 では ありません（{len(items)}）')
        questions, qids, texts = [], set(), set()
        for n, r in enumerate(items, 1):
            w = f'{n}問め（{r["問題ID"]}）'
            if int(r['問No']) != n:
                err(w, f'問No が {r["問No"]}')
            phase = 'route' if r['出題'] == '道中' else 'boss' if r['出題'] == 'ボス戦' else None
            if phase != ('route' if n <= ROAD else 'boss'):
                err(w, f'出題「{r["出題"]}」（1〜4問め=道中、5〜7問め=ボス戦）')
            if not r['問題ID'] or r['問題ID'] in qids:
                err(w, '問題ID が ない／かさなり')
            qids.add(r['問題ID'])
            if r['質問文'] in texts:
                err(w, 'おなじ 質問文')
            texts.add(r['質問文'])
            choices = [{'id': r[f'選択肢{k} ID'], 'text': r[f'選択肢{k}']} for k in (1, 2, 3)]
            ids = [c['id'] for c in choices]
            if any(not c['id'] or not c['text'] for c in choices) or len(set(ids)) != 3:
                err(w, '選択肢の ID・文が ない／かさなり')
            for t in [r['質問文']] + [c['text'] for c in choices]:
                if bad_chars(t):
                    err(w, f'漢字・英字「{bad_chars(t)}」: {t}')
            ans = r['正解ID']
            if ans not in ids:
                err(w, f'正解ID「{ans}」が 選択肢に ない')
            else:
                pos = ids.index(ans) + 1
                if r.get('正解番号') and int(r['正解番号']) != pos:
                    err(w, f'正解番号 {r["正解番号"]} と 正解ID（{pos}番め）が ちがう')
                if r.get('正解の文') and r['正解の文'] != choices[pos - 1]['text']:
                    err(w, f'正解の文「{r["正解の文"]}」と 選択肢「{choices[pos - 1]["text"]}」が ちがう')
                # 答えが 本文に あるか（言いかえも あるので 注意だけ）
                if flat(choices[pos - 1]['text']) not in body and flat(r.get('本文の根拠', '')) not in body:
                    warns.append(f'{at} {w}: 正解「{choices[pos - 1]["text"]}」が 本文に そのままは ない（根拠: {r.get("本文の根拠", "")}）')
            questions.append({'id': r['問題ID'], 'phase': phase, 'text': r['質問文'], 'choices': choices, 'answer': ans})
        out[(s['level'], s['stage'])] = {
            'formatVersion': FORMAT,
            'storyId': sid,
            'contentVersion': int(m.get('contentVersion') or 1),
            'level': s['level'],
            'stage': s['stage'],
            'title': s['title'],
            'pages': pages,
            'questions': questions,
        }

    for L in range(1, 6):
        for S in range(1, 5):
            if (L, S) not in out:
                warns.append(f'レベル{L}・ステージ{S}: 物語が ない（じゅんびちゅうの まま）')

    for w in warns:
        print('注意:', w)
    if errors:
        print('\n'.join('エラー: ' + e for e in errors))
        sys.exit(f'{len(errors)}件の エラー（ファイルは 書きません）')
    for (L, S), d in sorted(out.items()):
        chars = len(flat(''.join(d['pages'])))
        pos = ''.join(str([c['id'] for c in q['choices']].index(q['answer']) + 1) for q in d['questions'])
        print(f'L{L}S{S} {d["storyId"]} v{d["contentVersion"]} 「{d["title"]}」 {len(d["pages"])}ページ {chars}字 正解の位置 {pos}')
        if not check_only:
            (OUT / f'level{L}_stage{S}.json').write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(('かくにん OK' if check_only else f'{len(out)}ファイル 書きました → {OUT}'))


if __name__ == '__main__':
    main()
