"""レア演出の「マッスル群」動画を、ブラウザで すけて みえる 形に する

つかいかた:
  python tools/process_muscle.py --fill <..._fill.mp4> --matte <..._matte.mp4>   … きほん（黒背景の 絵 ＋ 白黒マット）
  python tools/process_muscle.py --green <..._greenback.mp4> [--trim]             … 代わり（緑背景を ぬく）
  - 上半分 = いろ、下半分 = すけぐあい の 動画（H.264）に する
    （ゲームは WebGL で 上下を かさねて 表示。iPhone でも うごく ように すけた 動画形式は つかわない）
  - fill＋matte: マットの 白 = みえる・黒 = すける・灰色 = 半とうめい。黒背景を 色で けす ことは しないので
    キャラの 黒い ところや りんかくも のこる。いろは マットを かけて おく（マットの そとに 絵が はみださない）
  - 等倍・カット なし（--trim の ときだけ、さいしょと さいごの だれも いない コマを けずる）
  - おおきさは よこ 960（--size で かえられる）、30コマ/びょう（60コマの 動画は 1コマおき。じかんは かわらない）
  - 動画の 音は べつの mp3 に して、ゲームでは 効果音として 動画と いっしょに ならす
    （iPhone では 音つき 動画を タップの そと で 再生できない ため。動画そのものは 音なし）
    fill＋matte のときは fill の 音だけ、green のときは green の 音だけ（にじゅうに ならない）
  → assets/video/muscle.mp4・assets/sfx/muscle.mp3・assets/video/muscle.json（ながさ・おおきさ）、確認用の コマ一覧 tools/out/muscle_frames.jpg
ひつよう: pip install pillow numpy imageio-ffmpeg
"""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image
from process_cutins import key, DBG
from build_media import ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, "assets", "video")
FPS_OUT = 30


def probe(path):
    r = subprocess.run([ffmpeg(), "-hide_banner", "-i", path], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Stream #0:0.*?Video:.*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps", r.stderr)
    return int(m.group(1)), int(m.group(2)), float(m.group(3))


def decode(path, w, h):
    """w×h・30コマ/びょう の RGB コマ（じかんは そのまま）"""
    raw = subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-i", path, "-map", "0:v:0", "-vf", f"fps={FPS_OUT},scale={w}:{h}:flags=lanczos",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    fill, matte, green = arg("--fill"), arg("--matte"), arg("--green")
    if not (fill and matte) and not green:
        sys.exit(__doc__)
    src = fill or green
    sw, sh, _ = probe(src)
    w = int(arg("--size", 960))
    h = round(sh * w / sw / 2) * 2
    if fill:
        if probe(matte)[:2] != (sw, sh):
            sys.exit("fill と matte の おおきさが ちがう")
        f = decode(fill, w, h)
        m = decode(matte, w, h)
        n = min(len(f), len(m))
        if abs(len(f) - len(m)) > 1:
            sys.exit(f"fill と matte の コマ数が ちがう: {len(f)} / {len(m)}")
        alpha = [m[i].astype(np.float32).mean(axis=2, keepdims=True) / 255 for i in range(n)]  # 白 = みえる
        color = [(f[i].astype(np.float32) * alpha[i]).round().astype(np.uint8) for i in range(n)]  # マットの そとの 絵は けす
        a8 = [(al[..., 0] * 255).round().astype(np.uint8) for al in alpha]
    else:
        g = decode(green, w, h)
        keyed = [key(x) for x in g]
        n = len(keyed)
        a8 = [k[..., 3] for k in keyed]
        color = [(k[..., :3].astype(np.float32) * (k[..., 3:4] / 255)).round().astype(np.uint8) for k in keyed]
    a, b = 0, n
    if "--trim" in sys.argv:
        on = [i for i in range(n) if (a8[i] > 128).mean() > 0.003]
        a, b = on[0], on[-1] + 1
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, "muscle.mp4")
    enc = subprocess.Popen([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h * 2}", "-r", str(FPS_OUT), "-i", "-",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-profile:v", "main", "-movflags", "+faststart", "-an", dst], stdin=subprocess.PIPE)
    for i in range(a, b):
        enc.stdin.write(np.concatenate([color[i], np.repeat(a8[i][..., None], 3, axis=2)], axis=0).tobytes())
    enc.stdin.close()
    enc.wait()
    # 動画の 音（絵と おなじ はんい・等倍）
    os.makedirs(os.path.join(REPO, "assets", "sfx"), exist_ok=True)
    adst = os.path.join(REPO, "assets", "sfx", "muscle.mp3")
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a / FPS_OUT:.4f}", "-t", f"{(b - a) / FPS_OUT:.4f}", "-i", src, "-map", "0:a:0", "-vn",
                    "-c:a", "libmp3lame", "-q:a", "3", adst], check=True)
    # ファイル名は おなじ ままなので、中身の ハッシュを つけて ふるい キャッシュを つかわせない
    import hashlib
    ver = lambda p: hashlib.sha1(open(p, "rb").read()).hexdigest()[:8]
    # だれかが うつって いる さいごの じかん（おわりの からっぽの コマの まえ）。ゲームは ここに あわせて レアの え と かさねる
    shown = [i for i in range(a, b) if (a8[i] > 128).mean() > 0.005]
    visible_end = round((shown[-1] + 1 - a) / FPS_OUT, 3) if shown else round((b - a) / FPS_OUT, 3)
    meta = {"src": f"assets/video/muscle.mp4?h={ver(dst)}", "audio": f"assets/sfx/muscle.mp3?h={ver(adst)}", "width": w, "height": h, "duration": round((b - a) / FPS_OUT, 3), "visibleEnd": visible_end, "fps": FPS_OUT,
            "speed": 1, "mode": "fill+matte" if fill else "greenback", "trimmedFrames": [a, n - b], "orig": os.path.basename(src)}
    with open(os.path.join(OUT, "muscle.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False, indent=1)
    # 確認用: くらい背景に かさねた コマ
    th = 160
    picks = list(range(a, b, max(1, (b - a) // 12)))[:12]
    tiles = []
    for i in picks:
        rgba = np.dstack([np.clip(color[i].astype(np.float32) / np.maximum(a8[i][..., None] / 255, 1e-3), 0, 255).astype(np.uint8), a8[i]])
        tiles.append(Image.fromarray(rgba, "RGBA").resize((round(w * th / h), th)))
    S = Image.new("RGBA", (tiles[0].width * 4, th * 3), (60, 90, 160, 255))
    for j, t in enumerate(tiles):
        S.alpha_composite(t, ((j % 4) * t.width, (j // 4) * th))
    S.convert("RGB").save(os.path.join(DBG, "muscle_frames.jpg"), quality=88)
    print(json.dumps(meta, ensure_ascii=False), f"size {os.path.getsize(dst) // 1024}KB")


if __name__ == "__main__":
    main()
