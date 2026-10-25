"""スプライトシート（6列×5段）を はいけい除去・コマ分割・基準点そろえ して アトラスに する

つかいかた:  python tools/process_sprites.py <ヒーローの シート> <ボスの シート>
  -> assets/hero.webp, assets/boss.webp, js/sprite-meta.js を つくりなおす
  （かくにん用の アトラス画像は tools/out/ に でる）
ひつよう: pip install pillow numpy
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SCR = os.path.join(HERE, "out")
OUT = os.path.join(REPO, "assets")
os.makedirs(SCR, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
DS = 4  # ラベリング用の しゅくしょう りつ


def clean_alpha(a):
    al = a[..., 3].astype(np.int32)
    al[al < 24] = 0          # はいけいに のこった うすい ノイズ
    al[al >= 232] = 255      # からだは ふとうめいに
    a = a.copy()
    a[..., 3] = al.astype(np.uint8)
    a[al == 0, :3] = 0
    return a


def label(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)])
                lab[y, x] = n
                while q:
                    cy, cx = q.popleft()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n
                                q.append((ny, nx))
    return lab, n


def split(a, name):
    H, W = a.shape[:2]
    op = a[..., 3] > 0
    small = op[: H - H % DS, : W - W % DS].reshape(H // DS, DS, W // DS, DS).any(axis=(1, 3))
    lab, n = label(small)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        comps.append({"id": i, "area": len(ys), "x0": xs.min() * DS, "x1": (xs.max() + 1) * DS, "y0": ys.min() * DS, "y1": (ys.max() + 1) * DS, "cx": xs.mean() * DS, "cy": ys.mean() * DS})
    comps.sort(key=lambda c: -c["area"])
    big = [c for c in comps if c["area"] >= 300]
    rest = [c for c in comps if c["area"] < 300]
    print(f"[{name}] components: {n}, big: {len(big)}, small: {len(rest)}; big areas min={min(c['area'] for c in big) if big else 0}")
    if len(big) != 30:
        print("  !! big component count is not 30:", [ (c['area'], int(c['cx']), int(c['cy'])) for c in big])
    # 5段に わける（y の すきまで）
    big.sort(key=lambda c: c["cy"])
    rows = [big[i * 6:(i + 1) * 6] for i in range(5)]
    frames = []
    for r, row in enumerate(rows):
        row.sort(key=lambda c: c["cx"])
        for c in row:
            frames.append({"parts": [c["id"]], **{k: c[k] for k in ("x0", "x1", "y0", "y1")}})
    # ちいさい かけらは いちばん ちかい キャラへ（ちかくに なければ すてる）
    dropped = 0
    for c in rest:
        best, bd = None, 1e9
        for f in frames:
            dx = max(f["x0"] - c["x1"], c["x0"] - f["x1"], 0)
            dy = max(f["y0"] - c["y1"], c["y0"] - f["y1"], 0)
            d = max(dx, dy)
            if d < bd:
                bd, best = d, f
        if bd <= 12:
            best["parts"].append(c["id"])
            for k, fn in (("x0", min), ("y0", min), ("x1", max), ("y1", max)):
                best[k] = fn(best[k], c[k])
        else:
            dropped += 1
    print(f"  small pieces merged: {len(rest) - dropped}, dropped (far noise): {dropped}")
    # フル解像度の マスク と ほそい bbox
    labup = np.kron(lab, np.ones((DS, DS), np.int32))
    labup = np.pad(labup, ((0, H - labup.shape[0]), (0, W - labup.shape[1])))
    for i, f in enumerate(frames):
        m = np.isin(labup, f["parts"]) & op
        ys, xs = np.nonzero(m)
        f.update(x0=int(xs.min()), x1=int(xs.max()) + 1, y0=int(ys.min()), y1=int(ys.max()) + 1, mask=m, idx=i)
    # となりの コマと かさなって いないか
    for f in frames:
        for g in frames:
            if f is g:
                continue
            ox = min(f["x1"], g["x1"]) - max(f["x0"], g["x0"])
            oy = min(f["y1"], g["y1"]) - max(f["y0"], g["y0"])
            if ox > 0 and oy > 0 and f["idx"] < g["idx"]:
                print(f"  !! bbox overlap frame {f['idx']} & {g['idx']}: {ox}x{oy}")
    # シートの ふちで きれて いないか
    for f in frames:
        if f["x0"] <= 0 or f["y0"] <= 0 or f["x1"] >= W or f["y1"] >= H:
            print(f"  !! frame {f['idx']} touches sheet edge")
    return frames


def hero_anchor(a, f, airborne, D):
    x0, x1, y0, y1 = f["x0"], f["x1"], f["y0"], f["y1"]
    sub = a[y0:y1, x0:x1].astype(np.int32)
    m = f["mask"][y0:y1, x0:x1]
    dark = m & (sub[..., :3].max(axis=2) < 70)
    # りんかく線を けして かみの けの かたまり だけ のこす
    er = dark.copy()
    for _ in range(3):
        e = er.copy()
        e[1:, :] &= er[:-1, :]; e[:-1, :] &= er[1:, :]; e[:, 1:] &= er[:, :-1]; e[:, :-1] &= er[:, 1:]
        er = e
    top = int((y1 - y0) * 0.5)
    ys, xs = np.nonzero(er[:top])
    if len(xs) < 30:
        ys, xs = np.nonzero(dark[:top])
    hx, hy = x0 + xs.mean(), y0 + ys.mean()
    ay = (hy + D) if airborne else y1
    return hx, hy, ay


def boss_anchor(a, f):
    x0, x1, y0, y1 = f["x0"], f["x1"], f["y0"], f["y1"]
    sub = a[y0:y1, x0:x1].astype(np.int32)
    m = f["mask"][y0:y1, x0:x1]
    pink = m & (sub[..., 0] > 170) & (sub[..., 1] < 150) & (sub[..., 2] > 90)
    h = y1 - y0
    ys, xs = np.nonzero(pink[int(h * 0.55):])
    return x0 + xs.mean(), y1


def build(sheet, name, kind, air=()):
    a = clean_alpha(np.array(Image.open(sheet).convert("RGBA")))
    frames = split(a, name)
    if kind == "hero":
        tmp = [hero_anchor(a, f, False, 0) for f in frames]
        D = float(np.median([f["y1"] - t[1] for f, t in zip(frames[:6], tmp[:6])]))
        anchors = []
        for f, t in zip(frames, tmp):
            hx, hy, ay = hero_anchor(a, f, f["idx"] in air, D)
            anchors.append((hx, ay))
    else:
        anchors = [boss_anchor(a, f) for f in frames]
    pad = 4
    L = max(ax - f["x0"] for f, (ax, ay) in zip(frames, anchors))
    R = max(f["x1"] - ax for f, (ax, ay) in zip(frames, anchors))
    U = max(ay - f["y0"] for f, (ax, ay) in zip(frames, anchors))
    Dn = max(f["y1"] - ay for f, (ax, ay) in zip(frames, anchors))
    cw, ch = int(np.ceil(L + R)) + pad * 2, int(np.ceil(U + Dn)) + pad * 2
    axc, ayc = pad + int(np.ceil(L)), pad + int(np.ceil(U))
    atlas = Image.new("RGBA", (cw * 6, ch * 5), (0, 0, 0, 0))
    src = Image.fromarray(a)
    meta = []
    for i, (f, (ax, ay)) in enumerate(zip(frames, anchors)):
        crop = np.array(src.crop((f["x0"], f["y0"], f["x1"], f["y1"])))
        crop[~f["mask"][f["y0"]:f["y1"], f["x0"]:f["x1"]]] = 0  # となりの キャラの まじりを けす
        cx, cy = (i % 6) * cw, (i // 6) * ch
        px, py = int(round(cx + axc - (ax - f["x0"]))), int(round(cy + ayc - (ay - f["y0"])))
        atlas.alpha_composite(Image.fromarray(crop), (px, py))
        meta.append({"x": px - cx, "y": py - cy, "w": f["x1"] - f["x0"], "h": f["y1"] - f["y0"]})
    atlas.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=92, alpha_quality=100, method=6)
    atlas.save(os.path.join(SCR, f"{name}_atlas.png"))
    # かくにん用: セル わく と 基準点
    dbg = Image.new("RGBA", atlas.size, (200, 220, 240, 255))
    dbg.alpha_composite(atlas)
    d = ImageDraw.Draw(dbg)
    for i in range(30):
        cx, cy = (i % 6) * cw, (i // 6) * ch
        d.rectangle([cx, cy, cx + cw - 1, cy + ch - 1], outline=(255, 0, 0, 255))
        d.line([cx + axc - 8, cy + ayc, cx + axc + 8, cy + ayc], fill=(0, 0, 255, 255), width=2)
        d.line([cx + axc, cy + ayc - 8, cx + axc, cy + ayc + 8], fill=(0, 0, 255, 255), width=2)
        d.text((cx + 4, cy + 2), str(i), fill=(0, 0, 0, 255))
    dbg.convert("RGB").save(os.path.join(SCR, f"{name}_debug.jpg"), quality=88)
    info = {"cellW": cw, "cellH": ch, "ax": axc, "ay": ayc, "cols": 6, "rows": 5, "frames": meta}
    print(f"  cell {cw}x{ch}, anchor ({axc},{ayc}), atlas {atlas.size}, webp {os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024} KB")
    return info


if len(sys.argv) < 3:
    sys.exit(__doc__)
# 14〜19 は くうちゅうの コマ（あしもとではなく からだで いちあわせ）
hero = build(sys.argv[1], "hero", "hero", air={14, 15, 16, 17, 18, 19})
boss = build(sys.argv[2], "boss", "boss")
lines = ["'use strict';", "/* スプライトの コマ情報（tools/process_sprites.py で じどう生成）: セルの おおきさ と 基準点（ヒーロー=あしもと中央 / ボス=そこの中央） */", "const SPRITE_META = {"]
for k, v in (("hero", hero), ("boss", boss)):
    lines.append(f"  {k}: {{ src: 'assets/{k}.webp', cellW: {v['cellW']}, cellH: {v['cellH']}, ax: {v['ax']}, ay: {v['ay']}, cols: 6, count: 30 }},")
lines.append("};")
with open(os.path.join(REPO, "js", "sprite-meta.js"), "w", encoding="utf-8", newline="\n") as fp:
    fp.write("\n".join(lines) + "\n")
print("wrote js/sprite-meta.js")
