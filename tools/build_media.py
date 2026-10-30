"""素材ZIPを 展開した フォルダから、ゲーム用の 音声・画像 一覧を つくる

つかいかた:  python tools/build_media.py --bgm <「BGM・SE」フォルダ> <素材フォルダ> [追加の素材フォルダ ...]
  - --bgm の フォルダで ファイル名に「BGM」「bgm」が ある 音楽 → ぜんぶ 共通の BGM候補（ランダム選曲）
  - 元の ファイル名（日本語）→ 英数字の ファイル名 に コピー（assets/bgm, assets/sfx, assets/voice）
  - 元の カットイン画像は source/cutin/ に そのまま 保管
  - WAV は 元を source/voice/ に 保管し、前後の 無音を けずった ゲーム用を assets/voice/ に（tools/trim_voices.py）
  - 効果音の あたまの 無音は けずらず「ここから ならす」位置（start）を しらべて 書く
  - BGM は 曲ごとの 大きさ（LUFS）を はかって、そろえる ための 音量（gain）を 書く
  - けずった あとの 長さ（と けずった 位置）を js/media.js（ID・パス・セリフ・元ファイル名・長さ・有効）に 書き出す
  - 声援の 画像と 声は 下の 表で 1対1 に きめうち（実行時の 推測や 部分一致は しない）
  - 濁点などの Unicode 表記ゆれ（NFC/NFD）は NFC に そろえて 照合
ひつよう: pip install numpy imageio-ffmpeg
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile, unicodedata, wave
import trim_voices

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
N = lambda s: unicodedata.normalize("NFC", s)

# ゴール → けっか → クリアごの ステージえらび（ランダム選曲には いれない）
BGM_CLEAR = ("ステージクリア後(ステージ選ぶ.mp3", "afterclear")
SFX = {
    "fireworks": ("ステージクリアの花時の音_花火大会.mp3", "fireworks", None),  # 「花時」は ZIP の じっさいの 名前
    # 正解カットインの スライドインの「シャキーン」（ZIP の Dry 版。Delay 版は 余韻が 3びょう ちかく 声援に かぶる）
    # 音の はじまりが 0.105びょう めなので、0.08びょう から ならす（mp3 の デコーダーの ずれ ぶん 余白を のこす）
    "cutinIn": ("Onoma-Syakiin02-1(Dry).mp3", "syakiin", 0.08),
    # レア演出（「BGM・SE」フォルダ）。"auto" = 音の はじまりを しらべて その 0.02びょう まえから ならす
    "rareHorn": ("ほら貝を吹き鳴らす.mp3", "horagai", "auto"),
    # レア画像の 登場（「ドーン.mp3」から さしかえ）
    "rareAppear": ("教会の祈り.mp3", "inori", "auto"),
    # 攻撃が 当たった とき（かべを こわす・ボスに 当たる）と ボスを たおした とき
    "blastHit": ("爆発2.mp3", "bakuhatsu2", "auto"),
    "blastDown": ("爆発1.mp3", "bakuhatsu1", "auto"),
    # 仲間・オトナモード（ZIP「SE」。ファイル名が「.mp3.mp3」なので ここで なおす）
    **{k: (f"{fn}.mp3.mp3", fn, "auto") for k, fn in {
        "allyJoin": "ally_join", "allyHit": "ally_hit",
        "allyAtkGold": "ally_attack_gold", "allyAtkRobot": "ally_attack_robot", "allyAtkGod": "ally_attack_god",
        "allyAtkGorilla": "ally_attack_gorilla", "allyAtkTower": "ally_attack_tower",
        "bossWarn": "boss_attack_warning", "bossShotPhysical": "boss_shot_physical", "bossShotFire": "boss_shot_fire",
        "bossShotIce": "boss_shot_ice", "bossShotThunder": "boss_shot_thunder", "bossShotMagic": "boss_shot_magic",
        "playerDamage": "player_damage", "gameOver": "game_over", "timeUp": "time_up",
    }.items()},
}
# 仲間・オトナモードの セリフ（ZIP「音声データ」は WAV だけ → 前後の 無音を けずって MP3 に する）
# ally_join_<なまえ>.wav（加入ナレーション）は つかわない（本人の 加入セリフだけ）
VOICE_MP3 = {
    "allyJoinGold": "ally_gold_join_character", "allyJoinRobot": "ally_robot_join_character", "allyJoinGod": "ally_god_join_character",
    "allyJoinGorilla": "ally_gorilla_join_character", "allyJoinTower": "ally_tower_join_character",
    "allySupport1": "ally_support_01", "allySupport2": "ally_support_02", "allySupport3": "ally_support_03",
    "adultJumpGuide": "adult_jump_guide", "bossWarnVoice": "boss_warning_voice", "playerDamageVoice": "player_damage_voice",
    "playerLastLife": "player_last_life", "gameOverVoice": "game_over_voice", "timeUpVoice": "time_up_voice",
    "adultClear": "adult_stage_clear",
}
VOICE_LUFS = -13.5
# レアの 声援・仲間の 加入セリフ（同時に 鳴る 登場の 音・加入SE に まけない ように）は ここまで 大きく する。
# もとの ピークが ほぼ いっぱい なので、ただ 音量を 上げると 音割れ → 音量を 上げて リミッター（ピーク 0.9）で おさえる。
# 短い セリフは loudnorm では ねらいどおりに ならないので、はかりながら 3〜4かいで あわせる
LEAD_LUFS = -11.0
LEAD_VOICE = ["allyJoinGold", "allyJoinRobot", "allyJoinGod", "allyJoinGorilla", "allyJoinTower"]


def lead_encode(src, dst, codec):
    """src（WAV）を LEAD_LUFS（±0.3）に して dst へ。codec: ['-acodec', 'pcm_s16le'] など"""
    db = LEAD_LUFS - loudness(src)
    for _ in range(5):
        db = max(0.0, min(12.0, db))
        subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", f"volume={db:.2f}dB,alimiter=limit=0.9:attack=2:release=50:level=disabled",
                        "-ar", "44100", *codec, dst], check=True)
        got = loudness(dst)
        if abs(got - LEAD_LUFS) <= 0.3:
            break
        db += LEAD_LUFS - got
    return got


def lead_wav(path):
    """WAV を その場で LEAD_LUFS に（44.1kHz・16bit の まま）"""
    fd, tmp = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    lead_encode(path, tmp, ["-acodec", "pcm_s16le"])
    shutil.move(tmp, path)
VOICE = {
    "start": "スタート.wav",
    "clear": "ステージクリア！！やったね！.wav",
    "correct": "正解.wav",
    "bossAppear": "ボス登場_ボスが現れたぞ.wav",
    "bossDown": "ボス倒した時_すげー！ボス倒したよ！ゴールに進もう！.wav",
    "wrongRetry": "間違えたとき_大丈夫！大丈夫！もう一回！.wav",
    "wrongNext": "間違えたとき_大丈夫！大丈夫！次行こう！.wav",
    "power": "パワー全開.wav",
    # プレイ中の アイテム声援（2つめの 素材）
    "itemDb1": "キレてるよ！キレてるよ！.wav",
    "itemDb2": "仕上がってる仕上がってる.wav",
    "itemDb3": "はーい！！サイドチェストーーー！！！.wav",
    "itemProtein": "ハイ、ここでプロテイン.wav",
}
# さいしょの 20体: 画像の 末尾番号 → (テロップ, 応援ボイスの ファイル名)
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
# 追加の 通常 20体（ZIP「マッチョ声援_追加20枚＋スーパーレア5枚」）: 番号 → (テロップ, 画像, 声)
# テロップは 画像の 文字を 目で みて たしかめた もの。声の ファイル名は ZIP の まま（表記ゆれは ここで 吸収）
CHEERS_ADD = {
    21: ("その肩、ボウリングの玉かい！", "その肩、ボウリングの玉かい！.png", "その肩、ボウリングの玉かい！.wav"),
    22: ("その背中、マンタもびっくり！", "その背中、マンタもびっくり！.png", "その背中、マンタもびっくり！.wav"),
    23: ("その背中、映画館のスクリーン！", "その背中、映画館のスクリーン！.png", "その背中、映画館のスクリーン！.wav"),
    24: ("その腕、クレーン車かい！", "その腕、クレーン車かい！.png", "その腕、クレーン車かい！.wav"),
    25: ("ふくらはぎにロケット積んでる！", "ふくらはぎにロケット積んでる！.png", "ふくらはぎにロケット積んでる！.wav"),
    26: ("ポーズの風圧で飛ばされる！", "ポーズの風圧で飛ばされる！.png", "ポーズの風圧で飛ばされる！.wav"),
    27: ("全身が筋肉の博覧会！", "全身が筋肉の博覧会！.png", "全身が筋肉の博覧会！.wav"),
    28: ("力こぶ、もちがふくらんでる！", "力こぶ、もちがふくらんでる！.png", "力こぶ、もちがふくらんでる！.wav"),
    29: ("力こぶ、富士山こえてる！", "力こぶ、富士山こえてる！.png", "力こぶ、富士山こえてる！.wav"),
    30: ("太もも、タイヤよりぶっとい！", "太もも、タイヤよりぶっとい！.png", "太もも、タイヤよりぶっとい！.wav"),
    31: ("太もも、新幹線よりパワフル！", "太もも、新幹線よりパワフル！.png", "太もも、新幹線よりパワフル！.wav"),
    32: ("筋肉だけで満員電車！", "筋肉だけで満員電車！.png", "筋肉だけで満員電車！.wav"),
    33: ("筋肉で天気変える気かい！", "筋肉で天気変える気かい！.png", "筋肉で天気変える気かい！.wav"),
    34: ("肩がデカすぎて傘に入らない！", "肩がデカすぎて傘に入らない！.png", "肩がデカすぎて傘に入らない！.wav"),
    35: ("肩幅、改札通れるかい！", "肩幅、改札通れるかい！.png", "肩幅、改札通れるかい！ (1).wav"),  # 声だけ 末尾に「 (1)」
    36: ("背中に大陸できてるよ！", "背中に大陸できてるよ！.png", "背中に大陸できてるよ！.wav"),
    37: ("胸筋、エアバッグ標準装備！", "胸筋、エアバッグ標準装備！.png", "胸筋、エアバッグ標準装備！.wav"),
    38: ("胸筋、座布団何枚分！", "胸筋、座布団何枚分！.png", "胸筋、座布団何枚分！.wav"),
    39: ("腹筋、とうもろこし大豊作！", "腹筋、とうもろこし大豊作！.png", "腹筋、とうもろこし大豊作！.wav"),
    40: ("腹筋、カレールーみたいに割れてる！", "腹筋、カレールーみたいに割れてる！.png", "腹筋、カレールーみたいに割れてる！.wav"),
}
# レア 5体: 番号 → (なまえ, テロップ, 画像, 声)
# 声が まだ ない ものは 絵だけで 出す。あとから 下の 名前の WAV を 素材フォルダに 入れて 実行しなおせば はいる
RARE = {
    41: ("巨大ロボ", "デカすぎる！筋肉、超巨大ロボ級！", "デカすぎる！筋肉、超巨大ロボ級！.png", "デカすぎる！筋肉、超巨大ロボ級！.wav"),
    42: ("神", "ムキムキじゃないのに、神レベル！", "ムキムキじゃないのに、神レベル！.png", "ムキムキじゃないのに、神レベル！.wav"),
    43: ("黄金マッチョ", "全身が純金！まぶしすぎる！", "全身が純金！まぶしすぎる！.png", "全身が純金！まぶしすぎる！.wav"),
    44: ("高層ビルマッチョ", "肩の上に高層ビル、建ってるよ！", "肩の上に高層ビル、建ってるよ！.png", "肩の上に高層ビル、建ってるよ！.wav"),
    45: ("銀のゴリラ", "銀のゴリラ！筋肉も規格外！", "銀のゴリラ！筋肉も規格外！.png", "銀のゴリラ！筋肉も規格外！.wav"),
}


def ffmpeg():
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def loudness(path):
    """きこえる 大きさ（LUFS, EBU R128 の Integrated）"""
    r = subprocess.run([ffmpeg(), "-hide_banner", "-nostats", "-i", path, "-map", "0:a:0", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    return float(m[-1])


def music_bounds(path):
    """曲の 音が ある はんい（あたま・おしりの 無音を のぞく）。-60dBFS を こえる ところ ±0.05びょう"""
    import numpy as np
    tmp = decode_wav(path)
    with wave.open(tmp) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), np.int16).reshape(-1, ch).astype(np.float32) / 32768
    os.remove(tmp)
    hop = int(sr * 0.05)
    fr = np.abs(x).max(axis=1)[: n // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)
    on = np.nonzero(db > -60)[0]
    start = max(0.0, on[0] * 0.05 - 0.05)
    end = min(n / sr, (on[-1] + 1) * 0.05 + 0.05)
    return round(start, 2), round(end, 2), round(n / sr, 2)


def decode_wav(path):
    """mp3 → 一時 WAV（44.1kHz・16bit）。ブラウザと おなじく エンコーダーの 遅延は ffmpeg が とりのぞく"""
    fd, tmp = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-map", "0:a:0", "-ar", "44100", "-acodec", "pcm_s16le", tmp], check=True)
    return tmp


def main():
    args = sys.argv[1:]
    if "--bgm" not in args or len(args) < 3:
        sys.exit(__doc__)
    i = args.index("--bgm")
    bgm_dir = args[i + 1]
    dirs = [bgm_dir] + args[:i] + args[i + 2:]
    files = {}
    for src in dirs:
        files.update({N(f): os.path.join(src, f) for f in os.listdir(src)})

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

    media = {"bgm": {}, "bgmPool": [], "sfx": {}, "voice": {}, "cheers": [], "rareCount": len(RARE)}

    # BGM: 候補を ぜんぶ はかって、まんなかの 大きさに そろえる
    pool = sorted((N(f) for f in os.listdir(bgm_dir) if re.search(r"bgm", f, re.I) and f.lower().endswith(".mp3")))
    rows = []
    for name in pool:
        p = need(name)
        fn = "bgm-" + hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]  # 元の 名前から きまる（曲が ふえても かわらない）
        rows.append((name, copy(name, f"assets/bgm/{fn}.mp3"), loudness(p)))
    clear_src = copy(BGM_CLEAR[0], f"assets/bgm/{BGM_CLEAR[1]}.mp3")
    clear_lufs = loudness(need(BGM_CLEAR[0]))
    target = sorted(r[2] for r in rows)[len(rows) // 2]
    gain = lambda L: round(min(1.6, max(0.25, 10 ** ((target - L) / 20))), 3)
    # start / end: 曲の あたま・おしりの 無音は とばす（フェードインが 無音の あいだに おわったり、ループの つなぎめが むおんに ならない ように）
    for name, src, L in rows:
        s, e, d = music_bounds(need(name))
        media["bgmPool"].append({"id": os.path.splitext(os.path.basename(src))[0], "src": src, "orig": name, "lufs": L, "gain": gain(L), "start": s, "end": e, "duration": d})
    s, e, d = music_bounds(need(BGM_CLEAR[0]))
    media["bgm"]["clear"] = {"src": clear_src, "orig": N(BGM_CLEAR[0]), "lufs": clear_lufs, "gain": gain(clear_lufs), "start": s, "end": e, "duration": d}
    media["bgmTargetLufs"] = target

    for k, (name, fn, start) in SFX.items():
        media["sfx"][k] = {"src": copy(name, f"assets/sfx/{fn}.mp3"), "orig": N(name)}
        if start == "auto":
            tmp = decode_wav(need(name))
            info = trim_voices.analyze(tmp)
            os.remove(tmp)
            start = round(max(0.0, info["onset"] - 0.02), 3)
            media["sfx"][k]["duration"] = round(info["dur"], 3)
        if start:
            media["sfx"][k]["start"] = start  # ここから ならす（あたまの 無音を とばす）

    # レア演出の 動画（tools/process_muscle.py で つくった もの）と その 音
    mpath = os.path.join(REPO, "assets", "video", "muscle.json")
    if os.path.exists(mpath):
        with open(mpath, encoding="utf-8") as fp:
            media["muscle"] = json.load(fp)
        media["sfx"]["rareMuscle"] = {"src": media["muscle"]["audio"], "orig": "マッスル群.MP4 の 音"}

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

    for k, base in VOICE_MP3.items():
        name = base + ".wav"
        copy(name, f"source/voice/{base}.wav")
        info = trim_voices.analyze(os.path.join(REPO, "source", "voice", f"{base}.wav"))
        fd, tmp = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        trim_voices.write(info, tmp)
        rel = f"assets/voice/{base}.mp3"
        # 声の 大きさを いままでの 声（-12〜-15 LUFS）に そろえる（ちいさい 加入セリフが BGM に うもれない ように）
        mp3 = ["-codec:a", "libmp3lame", "-b:a", "128k"]
        if k in LEAD_VOICE:
            lead_encode(tmp, os.path.join(REPO, rel), mp3)
        else:
            db = max(-10.0, min(10.0, VOICE_LUFS - loudness(tmp)))
            subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", tmp, "-af", f"volume={db:.2f}dB,alimiter=limit=0.95:level=disabled",
                            *mp3, os.path.join(REPO, rel)], check=True)
        dur = wav_len(tmp)
        os.remove(tmp)
        media["voice"][k] = {"src": rel, "orig": N(name), "duration": dur, "trim": [round(info["start"], 3), round(info["end"], 3)], "origDuration": round(info["dur"], 3)}

    os.makedirs(os.path.join(REPO, "source", "cutin"), exist_ok=True)

    def put_cheer(n, line, img_name, img_path, voice, rare=None):
        shutil.copyfile(img_path, os.path.join(REPO, "source", "cutin", N(img_name)))  # 元画像を 保管
        c = {"id": n, "image": f"assets/cutin/cutin{n:02d}.webp", "voice": None, "line": line, "duration": None, "rare": bool(rare)}
        if rare:
            c["rareName"] = rare
        if voice and files.get(N(voice)):
            rel, meta = put_voice(voice, f"cheer{n:02d}")
            if rare:
                lead_wav(os.path.join(REPO, rel))
            c.update({"voice": rel, "duration": meta["duration"], "trim": meta["trim"], "origDuration": meta["origDuration"]})
        c.update({"enabled": True, "origImage": N(img_name), "origVoice": N(voice) if c["voice"] else None})
        if not c["voice"]:
            c["waitingVoice"] = N(voice)  # まだ とどいていない 声（この 名前で おくと はいる）
        media["cheers"].append(c)

    pngs = {}
    for f, p in files.items():
        m = re.search(r"-(\d+)\.png$", f)
        if m:
            pngs[int(m.group(1))] = (f, p)
    for n, (line, voice) in CHEERS.items():
        if n not in pngs:
            sys.exit(f"画像 -{n}.png が ない")
        put_cheer(n, line, pngs[n][0], pngs[n][1], need(voice) and voice)
    for n, (line, img, voice) in CHEERS_ADD.items():
        need(voice)  # 通常キャラは 声が かならず ある
        put_cheer(n, line, img, need(img), voice)
    for n, (rname, line, img, voice) in RARE.items():
        put_cheer(n, line, img, need(img), voice, rare=rname)

    js = "'use strict';\n/* 音声・画像の 一覧（tools/build_media.py で 自動生成。元ファイル名との 対応つき） */\nconst MEDIA = " + json.dumps(media, ensure_ascii=False, indent=2) + ";\n"
    with open(os.path.join(REPO, "js", "media.js"), "w", encoding="utf-8", newline="\n") as fp:
        fp.write(js)
    print(f"bgm候補 {len(media['bgmPool'])}（基準 {target:.1f} LUFS）, sfx {len(media['sfx'])}, voice {len(media['voice'])}, cheers {len(media['cheers'])}（レア {len(RARE)}）")
    for b in media["bgmPool"] + [dict(media["bgm"]["clear"], id="clear")]:
        print(f"  {b['id']:14s} {b['lufs']:6.1f} LUFS  x{b['gain']:.2f}  音 {b['start']:5.2f}〜{b['end']:6.2f}/{b['duration']:6.2f}s  {b['orig']}")
    for k, v in media["sfx"].items():
        print(f"  sfx {k:10s} start {v.get('start', 0)}  {v['orig']}")
    for c in media["cheers"]:
        d = f"{c['duration']:5.2f}s" if c["duration"] else " 声なし"
        print(f"  {c['id']:2d}{' レア' if c['rare'] else '    '} {d}  {c['origImage']}  ↔  {c['origVoice'] or '（まだ: ' + c['waitingVoice'] + '）'}")


if __name__ == "__main__":
    main()
