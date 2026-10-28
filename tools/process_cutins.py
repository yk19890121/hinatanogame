"""正解カットイン画像（緑背景）を 透過WebP に する

つかいかた:  python tools/process_cutins.py <PNG の フォルダ> [手なおし版の フォルダ] [番号 ...]
  - 1〜20 は ファイル名の 末尾「-番号.png」、21〜45 は build_media.py の 表の 画像名で 特定
  - 緑背景を 除去（文字の すきま・腕の 内側の 緑も）、輪郭の 緑の にじみを 軽減
  - 余白を けずって 高さ 1000px に 縮小 → assets/cutin/cutin01.webp …
  - 確認用に 明るい背景・暗い背景 に 重ねた 一覧を tools/out/ に 出力
ひつよう: pip install pillow numpy
"""
import glob, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, "assets", "cutin")
DBG = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
os.makedirs(DBG, exist_ok=True)
H_OUT = 1000

# 緑らしさ = G - max(R, B)。背景は ≒240。黄色(R≧G)・白・肌・水色の ふちどりは ≦0 付近
LO, HI = 40, 120


def key(rgb):
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = 1.0 - np.clip((green - LO) / (HI - LO), 0, 1)
    # にじみ取り: 緑が ほかの色より 強い ぶんを けずる（緑以外の いろは かわらない）
    spill = np.clip(green, 0, None)
    g2 = g - spill * np.clip((green - 8) / 40, 0, 1)
    out = np.stack([r, np.minimum(g, g2), b], axis=-1)
    # 半とうめいの ふちは まわりの 暗い りんかく色に よせて 緑っぽさを なくす
    edge = (alpha > 0) & (alpha < 1)
    out[edge, 1] = np.minimum(out[edge, 1], np.maximum(out[edge, 0], out[edge, 2]))
    a8 = (alpha * 255).round().astype(np.uint8)
    a8[a8 < 10] = 0
    return np.dstack([out.clip(0, 255).astype(np.uint8), a8])


def process(path, n):
    rgb = np.array(Image.open(path).convert("RGB"))
    rgba = key(rgb)
    al = rgba[..., 3]
    # 小さな ノイズ（ぽつんと のこった 点）を けす
    ys, xs = np.nonzero(al > 0)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    pad = 6
    y0, x0 = max(0, y0 - pad), max(0, x0 - pad)
    y1, x1 = min(al.shape[0], y1 + pad), min(al.shape[1], x1 + pad)
    im = Image.fromarray(rgba[y0:y1, x0:x1], "RGBA")
    scale = H_OUT / im.height
    im = im.resize((round(im.width * scale), H_OUT), Image.LANCZOS)
    dst = os.path.join(OUT, f"cutin{n:02d}.webp")
    im.save(dst, "WEBP", quality=88, alpha_quality=95, method=6)
    left_green = ((rgba[..., 3] > 200) & (rgba[..., 1].astype(int) - np.maximum(rgba[..., 0], rgba[..., 2]).astype(int) > 60)).sum()
    return im, os.path.getsize(dst), left_green


def sheet(ims, bg, name):
    th = 300
    tw = max(round(i.width * th / i.height) for i in ims)
    W = tw * 10 + 11 * 8
    S = Image.new("RGBA", (W, (th + 8) * ((len(ims) + 9) // 10) + 8), bg)
    d = ImageDraw.Draw(S)
    for k, i in enumerate(ims):
        t = i.resize((round(i.width * th / i.height), th), Image.LANCZOS)
        x, y = 8 + (k % 10) * (tw + 8), 8 + (k // 10) * (th + 8)
        S.alpha_composite(t, (x, y))
        d.text((x + 2, y + 2), str(k + 1), fill=(255, 0, 255, 255))
    S.convert("RGB").save(os.path.join(DBG, name), quality=90)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    import unicodedata
    from build_media import CHEERS_ADD, RARE  # 21〜45 の 画像の 名前は build_media.py の 表に きめうち
    files = {}
    for p in glob.glob(os.path.join(sys.argv[1], "*.png")):
        m = re.search(r"-(\d+)\.png$", p)
        if m:
            files[int(m.group(1))] = p
    names = {unicodedata.normalize("NFC", os.path.basename(p)): p for p in glob.glob(os.path.join(sys.argv[1], "*.png"))}
    for n, row in list(CHEERS_ADD.items()) + list(RARE.items()):
        img = unicodedata.normalize("NFC", row[-2])
        if img in names:
            files[n] = names[img]
    # 2つめの フォルダ: 手なおし版（例: …-3_できるぞ.png）が あれば そちらを つかう
    if len(sys.argv) > 2:
        for p in glob.glob(os.path.join(sys.argv[2], "*.png")):
            m = re.search(r"-(\d+)_[^\\/]*\.png$", p)
            if m:
                files[int(m.group(1))] = p
    ids = list(range(1, 21)) + list(CHEERS_ADD) + list(RARE)
    missing = [n for n in ids if n not in files]
    if missing:
        sys.exit(f"見つからない 番号: {missing}")
    only = [int(a) for a in sys.argv[3:]]  # 3つめ いこう: その 番号だけ つくりなおす
    ims = []
    for n in ids:
        if only and n not in only:
            ims.append(Image.open(os.path.join(OUT, f"cutin{n:02d}.webp")).convert("RGBA"))
            continue
        im, size, green = process(files[n], n)
        ims.append(im)
        print(f"{n:2d} {os.path.basename(files[n])} -> cutin{n:02d}.webp {im.size} {size // 1024}KB  残った緑px={green}")
    sheet(ims, (250, 246, 236, 255), "cutins_light.jpg")
    sheet(ims, (24, 22, 40, 255), "cutins_dark.jpg")


if __name__ == "__main__":
    main()
