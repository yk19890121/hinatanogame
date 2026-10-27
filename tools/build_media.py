"""素材ZIPを 展開した フォルダから、ゲーム用の 音声・画像 一覧を つくる

つかいかた:  python tools/build_media.py <素材フォルダ>
  - 元の ファイル名（日本語）→ 英数字の ファイル名 に コピー（assets/bgm, assets/sfx, assets/voice）
  - 元の カットイン画像は source/cutin/ に そのまま 保管
  - WAV は 元を source/voice/ に 保管し、前後の 無音を けずった ゲーム用を assets/voice/ に（tools/trim_voices.py）
  - けずった あとの 長さ（と けずった 位置）を js/media.js（ID・パス・セリフ・元ファイル名・長さ・有効）に 書き出す
  - ファイル名は 下の 表で 1対1 に きめうち（実行時の 推測や 部分一致は しない）
  - 濁点などの Unicode 表記ゆれ（NFC/NFD）は NFC に そろえて 照合
"""
import json, os, re, shutil, sys, unicodedata, wave
import trim_voices

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
N = lambda s: unicodedata.normalize("NFC", s)

BGM = {
    "select": "ステージセレクトBGM.mp3",
    "stage1": "ステージ1_お願いマッスル.mp3",
    "stage2": "ステージ2_マッチョメン.mp3",
    "stage3": "ステージ3_ボンジョビ.mp3",
    "stage4": "ステージ4_アイオブザタイガー.mp3",
    "clear": "ステージクリアしたときのBGM.mp3",
}
SFX = {"fireworks": "ステージクリアの花時の音_花火大会.mp3"}  # 「花時」は ZIP の じっさいの 名前
VOICE = {
    "start": "スタート.wav",
    "clear": "ステージクリア！！やったね！.wav",
    "correct": "正解.wav",
    "bossAppear": "ボス登場_ボスが現れたぞ.wav",
    "bossDown": "ボス倒した時_すげー！ボス倒したよ！ゴールに進もう！.wav",
    "wrongRetry": "間違えたとき_大丈夫！大丈夫！もう一回！.wav",
    "wrongNext": "間違えたとき_大丈夫！大丈夫！次行こう！.wav",
    "power": "パワー全開.wav",
}
# 画像の 末尾番号 → (テロップ, 応援ボイスの ファイル名)
CHEERS = {
    1: ("肩にちっちゃいジープ乗せてんのかい！", "肩にちっちゃいジープ乗せてんのかーい！.wav"),
    2: ("腹筋が板チョコ！", "cheer 腹筋が板チョコー！！！.wav"),
    3: ("背中、飛行機が着陸できるぞ！", "叫ぶ 背中、飛行機が着陸できるぞーー！！！.wav"),
    4: ("肩の上で高層ビル建ててんのかい！", "cheer 肩の上で高層ビル建ててんのかい！.wav"),
    5: ("胸に分厚い辞書入ってる！", "cheer 胸に分厚い辞書入ってる！.wav"),
    6: ("その脚、歩く大木だよ！", "cheer その脚、歩く大木だよ！.wav"),
    7: ("その腕、丸太だよ！", "cheer その腕、丸太だよ！.wav"),
    8: ("ふくらはぎが子持ちししゃも！", "ふくらはぎが子持ちししゃも！.wav"),
    9: ("筋肉のテーマパークだよ！", "筋肉のテーマパークだよ！.wav"),
    10: ("背中に鬼が宿ってる！", "cheer 背中に鬼が宿ってる！.wav"),
    11: ("その力こぶ、山脈かい！", "その力こぶ、山脈かい！.wav"),
    12: ("腹筋で大根おろせそう！", "腹筋で大根おろせそう！.wav"),
    13: ("肩メロン、特大サイズ！", "肩メロン、特大サイズ！.wav"),
    14: ("背中がデカすぎて日が暮れる！", "背中がデカすぎて日が暮れる！.wav"),
    15: ("筋肉が服を追い越してる！", "筋肉が服を追い越してる！.wav"),
    16: ("胸板が分厚い鉄板だよ！", "胸板が分厚い鉄板だよ！.wav"),
    17: ("二頭筋が二世帯住宅！", "二頭筋が二世帯住宅！.wav"),
    18: ("筋肉の大渋滞だよ！", "筋肉の大渋滞だよ！.wav"),
    19: ("そのポーズで地球揺らす気かい！", "そのポーズで地球揺らす気かい！.wav"),
    20: ("デカすぎて画面に収まらない！", "デカすぎて画面に収まらない！.wav"),
}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    files = {N(f): os.path.join(src, f) for f in os.listdir(src)}

    def need(name):
        p = files.get(N(name))
        if not p:
            sys.exit(f"見つからない: {name}")
        return p

    def wav_len(p):
        with wave.open(p) as w:
            return round(w.getnframes() / w.getframerate(), 3)

    def copy(name, rel):
        dst = os.path.join(REPO, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(need(name), dst)
        return rel.replace(os.sep, "/")

    media = {"bgm": {}, "sfx": {}, "voice": {}, "cheers": []}
    for k, name in BGM.items():
        media["bgm"][k] = {"src": copy(name, f"assets/bgm/{k}.mp3"), "orig": N(name)}
    for k, name in SFX.items():
        media["sfx"][k] = {"src": copy(name, f"assets/sfx/{k}.mp3"), "orig": N(name)}
    def put_voice(name, key):
        copy(name, f"source/voice/{key}.wav")  # 元の 音（そのまま）
        info = trim_voices.analyze(os.path.join(REPO, "source", "voice", f"{key}.wav"))
        rel = f"assets/voice/{key}.wav"
        os.makedirs(os.path.join(REPO, "assets", "voice"), exist_ok=True)
        trim_voices.write(info, os.path.join(REPO, rel))           # まえ・うしろの 無音を けずった ゲーム用
        return rel, {"duration": wav_len(os.path.join(REPO, rel)), "trim": [round(info["start"], 3), round(info["end"], 3)], "origDuration": round(info["dur"], 3)}

    for k, name in VOICE.items():
        rel, meta = put_voice(name, k)
        media["voice"][k] = {"src": rel, "orig": N(name), **meta}
    pngs = {}
    for f, p in files.items():
        m = re.search(r"-(\d+)\.png$", f)
        if m:
            pngs[int(m.group(1))] = (f, p)
    os.makedirs(os.path.join(REPO, "source", "cutin"), exist_ok=True)
    for n, (line, voice) in CHEERS.items():
        if n not in pngs:
            sys.exit(f"画像 -{n}.png が ない")
        img_name, img_path = pngs[n]
        shutil.copyfile(img_path, os.path.join(REPO, "source", "cutin", img_name))  # 元画像を 保管
        rel, meta = put_voice(voice, f"cheer{n:02d}")
        media["cheers"].append({
            "id": n,
            "image": f"assets/cutin/cutin{n:02d}.webp",
            "voice": rel,
            "line": line,
            "duration": meta["duration"],
            "trim": meta["trim"],
            "origDuration": meta["origDuration"],
            "enabled": True,
            "origImage": img_name,
            "origVoice": N(voice),
        })
    js = "'use strict';\n/* 音声・画像の 一覧（tools/build_media.py で 自動生成。元ファイル名との 対応つき） */\nconst MEDIA = " + json.dumps(media, ensure_ascii=False, indent=2) + ";\n"
    with open(os.path.join(REPO, "js", "media.js"), "w", encoding="utf-8", newline="\n") as fp:
        fp.write(js)
    print(f"bgm {len(media['bgm'])}, sfx {len(media['sfx'])}, voice {len(media['voice'])}, cheers {len(media['cheers'])}")
    for c in media["cheers"]:
        print(f"  {c['id']:2d} {c['duration']:5.2f}s  {c['origImage']}  ↔  {c['origVoice']}")


if __name__ == "__main__":
    main()
