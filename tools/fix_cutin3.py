"""画像3「…着陸できるよ！」の「よ」を、音声に あわせて「ぞ」に かきかえる

つかいかた:  python tools/fix_cutin3.py <元画像-3.png> <出力.png> [フォントファイル]
  - 人物・ほかの 文字は さわらない（「よ」の まわりだけ）
  - もとの「よ」の 色（行ごとの グラデーション）と 筆の もようを うつす
  - 紺の ふちどり・白い ふち・ななめの かたむきを もとの 文字に あわせる
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC, DST = sys.argv[1], sys.argv[2]
FONT = sys.argv[3] if len(sys.argv) > 3 else r"C:\Windows\Fonts\HGRSGU.TTC"  # HG創英角ゴシックUB（3種で ためして いちばん にていた）
BOX = (762, 1296, 894, 1492)   # 「よ」の はんい（もとの 1024x1536 画像の ざひょう）
NAVY_W, WHITE_W = 9, 5         # ふちどりの ふとさ（もとの 文字から はかった）

img = np.array(Image.open(SRC).convert("RGB")).astype(np.int32)
H, W = img.shape[:2]
x0, y0, x1, y1 = BOX
r, g, b = img[..., 0], img[..., 1], img[..., 2]
green = (g - np.maximum(r, b)) > 60
white = (r > 215) & (g > 215) & (b > 215)
dark = np.maximum(np.maximum(r, g), b) < 90
fill = (r > 150) & (b < 140) & ~white & ~green

# 「よ」の ぬりの 部分（BOX の 中で つながっている ぬり）
inbox = np.zeros((H, W), bool)
inbox[y0:y1, x0:x1] = True
seed = fill & inbox
from collections import deque
lab = np.zeros((H, W), bool)
q = deque()
for sy, sx in [(1360, 850), (1420, 800), (1330, 845)]:
    yy, xx = np.nonzero(seed[sy - 6:sy + 6, sx - 6:sx + 6])
    for a, c in zip(yy, xx):
        q.append((sy - 6 + a, sx - 6 + c))
while q:
    y, x = q.popleft()
    if lab[y, x] or not seed[y, x]:
        continue
    lab[y, x] = True
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if 0 <= y + dy < H and 0 <= x + dx < W and not lab[y + dy, x + dx]:
                q.append((y + dy, x + dx))
old = lab
oy, ox = np.nonzero(old)
print("old glyph px", old.sum(), "bbox", ox.min(), oy.min(), ox.max(), oy.max())

# もとの いろ（行ごとの へいきん）と 筆もよう（へいきん からの ずれ）
row_col = {}
for y in range(oy.min(), oy.max() + 1):
    m = old[y]
    if m.sum() > 3:
        row_col[y] = img[y][m].mean(axis=0)
ys_known = np.array(sorted(row_col))
cols_known = np.array([row_col[y] for y in ys_known])
navy = np.median(img[dark & inbox], axis=0)

def row_color(yrel):
    yy = oy.min() + yrel * (oy.max() - oy.min())
    return np.array([np.interp(yy, ys_known, cols_known[:, k]) for k in range(3)])

# 1) 古い「よ」を 紺に そめる（ふちどりと いっしょに なる）
out = img.copy()
big_old = np.array(Image.fromarray((old * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
out[big_old & inbox] = navy

# 2) 新しい「ぞ」の かたち（かたむき つき）。もとの「よ」の わくに おさめる（「！」に かぶらない）
gw, gh = ox.max() - ox.min(), oy.max() - oy.min()
TX0, TY0, TX1, TY1 = 754, 1316, 884, 1482
big = Image.new("L", (600, 600), 0)
d = ImageDraw.Draw(big)
font = ImageFont.truetype(FONT, 400)
d.text((100, 60), "ぞ", font=font, fill=255)
# もとの 文字と おなじく すこし みぎに かたむける
big = big.transform(big.size, Image.AFFINE, (1, 0.14, -0.14 * 300, 0, 1, 0), resample=Image.BICUBIC)
bx0, by0, bx1, by1 = big.getbbox()
glyph = big.crop((bx0, by0, bx1, by1)).resize((TX1 - TX0, TY1 - TY0), Image.LANCZOS)
gl = Image.new("L", (W, H), 0)
gl.paste(glyph, (TX0, TY0))
# ふでの ように ふとく、ふちを すこし ギザギザに
gl = gl.filter(ImageFilter.MaxFilter(5))
rng = np.random.default_rng(3)
G = np.array(gl) > 110
noise = rng.random((H, W))
edge = G ^ (np.array(gl.filter(ImageFilter.MinFilter(3))) > 110)
G[edge & (noise < 0.25)] = False
G = np.array(Image.fromarray((G * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))) > 127
gy, gx = np.nonzero(G)
print("new glyph bbox", gx.min(), gy.min(), gx.max(), gy.max())

def dil(m, n):
    im = Image.fromarray((m * 255).astype(np.uint8))
    for _ in range(n // 2):
        im = im.filter(ImageFilter.MaxFilter(5))
    if n % 2:
        im = im.filter(ImageFilter.MaxFilter(3))
    return np.array(im) > 0

navy_m = dil(G, NAVY_W)
white_m = dil(G, NAVY_W + WHITE_W)
# 白い ふちは もともと 背景（緑）だった ところだけ（となりの 文字の 上には かかない）
out[white_m & ~navy_m & green] = [255, 255, 255]
out[navy_m & ~G] = navy

# 3) ぬり（行ごとの グラデーション ＋ ななめの 筆の すじ）
# となりの 文字と おなじ むきの すじ（したほど こい）
streak = np.zeros((H, W))
for k in range(26):
    sx0 = rng.uniform(TX0 - 20, TX1)
    sy0 = rng.uniform(TY0 + 30, TY1)
    ln = rng.uniform(25, 70)
    for t in np.linspace(0, 1, 60):
        xx, yy = int(sx0 + t * ln * 0.55), int(sy0 - t * ln)
        if 0 <= xx < W and 0 <= yy < H:
            streak[yy, xx:xx + 2] = rng.uniform(0.5, 1)
streak = np.array(Image.fromarray((streak * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255
for y, x in zip(gy, gx):
    yrel = (y - gy.min()) / max(1, gy.max() - gy.min())
    c = row_color(yrel)
    # したの ほうの すじは あかく、うえの ほうは うすく
    s = streak[y, x] * (0.25 + 0.75 * yrel)
    c = c * (1 - s * 0.35) + np.array([215, 40, 20]) * s * 0.35
    out[y, x] = np.clip(c, 0, 255)

Image.fromarray(out.astype(np.uint8)).save(DST)
print("saved", DST)
