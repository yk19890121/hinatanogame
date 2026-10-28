"""レア演出の「マッスル群」動画（緑背景）を、ブラウザで すけて みえる 形に する

つかいかた:  python tools/process_muscle.py <マッスル群.mp4> [--speed 1 | --duration 秒]
  - 緑背景を ぬいて（カットイン画像と おなじ しくみ）、上半分 = いろ、下半分 = すけぐあい の 動画（H.264）に する
    （ゲームは WebGL で 上下を かさねて 表示。iPhone でも うごく ように すけた 動画形式は つかわない）
  - さいしょと さいごの だれも いない コマは けずる（音も おなじ ぶん けずって ずれない ように する）
  - はやさ: きほん 等倍（--speed 倍、または --duration 秒に おさまる はやさ も えらべる）
  - 動画の 音は べつの mp3 に して、ゲームでは 効果音として 動画と いっしょに ならす
    （iPhone では 音つき 動画を タップの そと で 再生できない ため。動画そのものは 音なし）
  → assets/video/muscle.mp4・assets/sfx/muscle.mp3・assets/video/muscle.json（ながさ・おおきさ）、確認用の コマ一覧 tools/out/muscle_frames.jpg
ひつよう: pip install pillow numpy imageio-ffmpeg
"""
import json, os, subprocess, sys
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
    import re
    m = re.search(r"Stream #0:0.*?Video:.*?(\d{2,5})x(\d{2,5}).*?([\d.]+) fps", r.stderr)
    return int(m.group(1)), int(m.group(2)), float(m.group(3))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    duration = float(sys.argv[sys.argv.index("--duration") + 1]) if "--duration" in sys.argv else None
    speed = float(sys.argv[sys.argv.index("--speed") + 1]) if "--speed" in sys.argv else None
    w, h, fps = probe(src)
    raw = subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-i", src, "-map", "0:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    keyed = [key(f) for f in frames]
    cover = [float((k[..., 3] > 128).mean()) for k in keyed]
    on = [i for i, c in enumerate(cover) if c > 0.003]
    a, b = on[0], on[-1] + 1
    content = (b - a) / fps
    if speed is None:
        speed = content / duration if duration else 1.0
    fps_out = fps if speed == 1 else FPS_OUT  # 等倍なら 元の コマを そのまま
    n_out = max(2, round(content / speed * fps_out))
    # 動画の 音: 絵と おなじ ところを きりだす（はやさを かえた ときは 音の 高さは そのまま で はやく）
    tempo, t = [], speed
    while t > 2.0:
        tempo.append("atempo=2.0")
        t /= 2.0
    if abs(t - 1) > 1e-3:
        tempo.append(f"atempo={t:.4f}")
    os.makedirs(os.path.join(REPO, "assets", "sfx"), exist_ok=True)
    adst = os.path.join(REPO, "assets", "sfx", "muscle.mp3")
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a / fps:.4f}", "-t", f"{content:.4f}", "-i", src, "-map", "0:a:0", "-vn"]
                   + (["-af", ",".join(tempo)] if tempo else []) + ["-c:a", "libmp3lame", "-q:a", "3", adst], check=True)
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, "muscle.mp4")
    enc = subprocess.Popen([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h * 2}", "-r", f"{fps_out:g}", "-i", "-",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-profile:v", "main", "-movflags", "+faststart", "-an", dst], stdin=subprocess.PIPE)
    picks = []
    for k in range(n_out):
        i = min(b - 1, a + int(round(k / fps_out * speed * fps)))
        picks.append(i)
        rgba = keyed[i].astype(np.float32)
        al = rgba[..., 3:4] / 255
        top = (rgba[..., :3] * al).round().astype(np.uint8)          # いろは すけぐあいを かけた もの（ふちが 黒く にじまない）
        bot = np.repeat(keyed[i][..., 3:4], 3, axis=2)                 # すけぐあい（白 = みえる）
        enc.stdin.write(np.concatenate([top, bot], axis=0).tobytes())
    enc.stdin.close()
    enc.wait()
    meta = {"src": "assets/video/muscle.mp4", "audio": "assets/sfx/muscle.mp3", "width": w, "height": h, "duration": round(n_out / fps_out, 3), "fps": fps_out,
            "speed": round(speed, 3), "contentSeconds": round(content, 3), "trimmedFrames": [a, len(frames) - b], "orig": os.path.basename(src)}
    with open(os.path.join(OUT, "muscle.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False, indent=1)
    # 確認用: くらい背景に かさねた コマ
    th = 160
    tiles = [Image.fromarray(keyed[i], "RGBA").resize((round(w * th / h), th)) for i in picks[:: max(1, len(picks) // 12)]][:12]
    S = Image.new("RGBA", (tiles[0].width * 4, th * 3), (24, 22, 40, 255))
    for j, t in enumerate(tiles):
        S.alpha_composite(t, ((j % 4) * t.width, (j // 4) * th))
    S.convert("RGB").save(os.path.join(DBG, "muscle_frames.jpg"), quality=88)
    left = sum(int(((k[..., 3] > 200) & (k[..., 1].astype(int) - np.maximum(k[..., 0], k[..., 2]).astype(int) > 60)).sum()) for k in keyed[a:b])
    print(json.dumps(meta, ensure_ascii=False), f"size {os.path.getsize(dst) // 1024}KB  残った緑px(全コマ)={left}")


if __name__ == "__main__":
    main()
