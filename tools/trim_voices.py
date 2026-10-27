"""声援などの WAV の まえ（と うしろ）の 無音を けずった ゲーム用ファイルを つくる

つかいかた:  python tools/trim_voices.py            … しらべるだけ（けずる 位置を ひょうじ）
            python tools/trim_voices.py --write    … source/voice/ の 元ファイルから assets/voice/ に 書き出す

- ファイルごとに 声の はじまり・おわりを しらべる（一律に 何秒 とばす ことは しない）
- 子音が かけないように はじまりの 手前に 余白（PRE）、おわりの あとに 余白（POST）を のこす
- サンプルを けずる だけ（速さ・高さ・中身は かえない）。つなぎめは 数ミリ秒の フェードで プチっと しないように
"""
import json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SRC = os.path.join(REPO, "source", "voice")
DST = os.path.join(REPO, "assets", "voice")
PRE, POST = 0.03, 0.08          # のこす 余白（びょう）
WIN = 0.005                     # 5ms ごとに しらべる
FADE = 0.004


def analyze(path):
    with wave.open(path) as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    x = np.frombuffer(raw, dtype=np.int16).reshape(-1, ch).astype(np.float32) / 32768
    mono = x.mean(axis=1)
    hop = int(sr * WIN)
    fr = mono[: len(mono) // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)
    db -= db.max()                                  # ピークを 0dB に
    floor = np.percentile(db, 10)                   # しずかな ところ（ノイズの ゆか）
    k = int(0.03 / WIN)                              # 30ms つづいたら「声」（プチっという 音は むし）
    sus = np.convolve(10 ** (db / 10), np.ones(k) / k, mode="valid")
    sus_db = 10 * np.log10(sus + 1e-12)
    body = np.nonzero(sus_db > -32)[0]
    i0, i1 = body[0], body[-1] + k - 1
    # ちいさな 子音（「そ」の s、「ふ」など）の ぶん まえへ もどる（ノイズより はっきり 大きい あいだ・さいだい 0.15秒）
    back = int(0.15 / WIN)
    j = i0
    while j > 0 and i0 - j < back and db[j - 1] > floor + 10:
        j -= 1
    fwd = int(0.25 / WIN)
    m = i1
    while m < len(db) - 1 and m - i1 < fwd and db[m + 1] > floor + 10:
        m += 1
    on, off = j * hop / sr, (m + 1) * hop / sr
    start = max(0.0, on - PRE)
    end = min(n / sr, off + POST)
    return dict(sr=sr, ch=ch, sw=sw, n=n, dur=n / sr, onset=on, offset=off, start=start, end=end, x=x)


def write(info, dst):
    sr = info["sr"]
    a, b = int(info["start"] * sr), int(info["end"] * sr)
    y = info["x"][a:b].copy()
    f = int(FADE * sr)
    if info["start"] > 0:
        y[:f] *= np.linspace(0, 1, f)[:, None]
    if info["end"] < info["dur"]:
        y[-f:] *= np.linspace(1, 0, f)[:, None]
    with wave.open(dst, "wb") as w:
        w.setnchannels(info["ch"]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((y * 32767).clip(-32768, 32767).astype(np.int16).tobytes())


def main():
    names = sorted(f for f in os.listdir(SRC) if f.endswith(".wav"))
    report = {}
    for f in names:
        info = analyze(os.path.join(SRC, f))
        if "--write" in sys.argv:
            write(info, os.path.join(DST, f))
        new = info["end"] - info["start"]
        report[f] = {"start": round(info["start"], 3), "end": round(info["end"], 3), "orig": round(info["dur"], 3), "duration": round(new, 3)}
        print(f"{f:16s} 元 {info['dur']:5.2f}s  声 {info['onset']:5.3f}〜{info['offset']:5.3f}s  → {info['start']:5.3f}〜{info['end']:5.3f}s ({new:4.2f}s, まえ -{info['start']:.2f}s / うしろ -{info['dur'] - info['end']:.2f}s)")
    if "--write" in sys.argv:
        with open(os.path.join(HERE, "out", "trim_report.json"), "w", encoding="utf-8") as fp:
            json.dump(report, fp, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
