"""追加レア10体の 動作原稿（5列×3段、キャラ14ポーズ＋攻撃弾1枠、透過PNG）から、仲間用の 14コマシート・弾・データを つくる

つかいかた:  python tools/build_rare10.py <rare10_videos_voice_se フォルダ> [--check <確認画像の 出力先>]
  - 均等に 切ると 刀・ライフル・翼・斬撃が 切れたり 隣の コマが まざるので、
    つながった 絵の かたまり ごとに「いちばん 多く のっている コマ」へ わりあてて 切り出す（はみだした 武器も その コマの まま）
  - 2つの ポーズが くっついて 1つの かたまりに なって いたら、その かたまりだけ コマの 境目で 分ける（ログに 出す）
  - 足もと（いちばん 大きい かたまりの 下の はし）と 胴の まんなかで 14コマの 基準点を そろえて、
    同じ 大きさの マス 7列×2段に ならべなおす → assets/ally/<slug>.png。15枠めの 弾は assets/ally/<slug>_shot.png
  - 隕石マッチョは 人物と 隕石を べつに あつかう: 攻撃ポーズに 描かれた 小さな 隕石は 人物の コマから けし、
    隕石は 弾の 絵（assets/ally/meteor_shot.png）を 別の 大きさで 出す（ゲーム側）
  - 本体の 高さ（武器・翼・エフェクトを のぞいた 頭〜足）を はかって js/rare10-data.js に 書く（表示倍率は 主人公に たいして）
  - 登場カットインの 画像は 素材に ないので、本人の 動作原稿の ポーズ ＋ テロップで 仮の 画像を つくる
    （source/cutin/rare_<slug>_cutin.png を おけば そちらを つかう）→ assets/cutin/cutin46〜55.webp
ひつよう: pip install pillow numpy scipy
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# 番号（MEDIA.cheers の id）・管理用ID・なまえ・登場ナレーション（テロップ）・主人公に たいする 表示倍率
RARE10 = [
    (46, "meteor", "隕石マッチョ", "その隕石！片手で持つにはデカすぎる！", 1.5),
    (47, "sniper", "スナイパーマッチョ", "装備は一流！服装はパンイチ！", 1.5),
    (48, "angel", "マッチョエンジェラル", "大天使降臨！筋肉まで神々しい！", 1.5),
    (49, "mammoth", "マンモスロボ", "鋼の巨体！マンモス級のド迫力！", 2.0),
    (50, "trex", "ティラノサウルスロボ", "太古の王者！鋼のボディで復活！", 2.0),
    (51, "samurai", "サムライマッチョ", "長すぎる！刀も筋肉も規格外！", 1.5),
    (52, "reaper", "死神マッチョ", "細くてもムキムキ！鎌は超ド級！", 1.5),
    (53, "engineer", "エンジニアマッチョ", "頭脳も筋肉も！フルスペック！", 2.0),
    (54, "diamond", "横綱ダイヤモンド", "全身ダイヤ！硬さも強さも横綱級！", 2.0),
    (55, "jet", "戦闘機ロボ", "速すぎる！その巨体で音速突破！", 2.0),
]
METEOR_D = 3.0  # 隕石の 直径（主人公の 身長に たいして）
# 仮カットインに つかう ポーズ（0始まり。原稿の 左上から）
CUTIN_POSE = {"meteor": 9, "sniper": 10, "angel": 2, "mammoth": 2, "trex": 2, "samurai": 8, "reaper": 1, "engineer": 2, "diamond": 1, "jet": 2}
# 本体の 高さ（頭〜足）を 目で たしかめて きめた もの。頭より 上に つきでる 鎌・翼・光輪で 本体が ちいさく ならない ように
# （値は 待機コマの「足もと から 頭の てっぺん まで」の 原稿の ピクセル。tools/out の 確認画像で はかった）
BODY_H_FIX = {"reaper": 290, "angel": 293}  # 死神は 鎌の 先、エンジェラルは 翼と 光輪が 頭より 上に でる
# 攻撃の 速さ（コマ/秒）。隕石は 召喚の コマを すこし 長く みせる
ATTACK_FPS = {"meteor": 7}
# この SE には 衝撃音まで ふくまれる → 仲間の 弾が 当たった ときの 共通の 命中SE は かさねない
SFX_HAS_IMPACT = {"meteor", "mammoth", "diamond"}
ANIMS = {
    "join": {"frames": [0, 1], "fps": 4, "loop": False},
    "idle": {"frames": [2, 3], "fps": 3, "loop": True},
    "move": {"frames": [4, 5, 6, 7], "fps": 7, "loop": True},
    "attack": {"frames": [8, 9, 10, 11], "fps": 10, "loop": False, "projectileFrame": 10},
    "jump": {"frames": [12, 13], "fps": 5, "loop": False},
}
PAD = 6


def label(alpha):
    lab, n = ndimage.label(alpha > 10, structure=np.ones((3, 3)))
    return lab, n


def split_cells(img, slug, log):
    """15コマぶんの RGBA 画像（コマごとに 原稿 ぜんたいと 同じ 大きさ・ほかは 透明）"""
    a = np.array(img)
    H, W = a.shape[:2]
    cw, ch = W / 5, H / 3
    # こい ところ（alpha>110）だけで かたまりを わける（となりの ポーズと うすい 光で つながって いても 別に する）。
    # うすい 光・ふちは いちばん ちかい こい かたまりに つける
    strong = a[:, :, 3] > 110
    lab, n = ndimage.label(strong, structure=np.ones((3, 3)))
    weak = (a[:, :, 3] > 10) & ~strong
    if weak.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~strong, return_indices=True)
        near = lab[iy, ix]
        dist = np.hypot(iy - np.arange(H)[:, None], ix - np.arange(W)[None, :])
        lab = np.where(weak & (dist < 60), near, lab)
    ys, xs = np.nonzero(lab)
    cell = (np.minimum(4, (xs / cw).astype(int)) + 5 * np.minimum(2, (ys / ch).astype(int)))
    owner = np.full(lab.shape, -1, int)
    for k in range(1, n + 1):
        m = lab[ys, xs] == k
        cnt = np.bincount(cell[m], minlength=15)
        order = np.argsort(cnt)[::-1]
        tot = cnt.sum()
        if cnt[order[1]] > 0.25 * tot and cnt[order[1]] > 3000:
            # 2つの ポーズが くっついている → すこしずつ ほそらせて 2つに わかれた ところで、もとの ピクセルを ちかい ほうへ（境目で まっすぐ 切らない）
            mask = lab == k
            done = False
            for it in range(2, 40, 2):
                er = ndimage.binary_erosion(mask, structure=np.ones((3, 3)), iterations=it)
                el, en = ndimage.label(er, structure=np.ones((3, 3)))
                if en < 2:
                    continue
                ey, ex = np.nonzero(el)
                ecell = np.minimum(4, (ex / cw).astype(int)) + 5 * np.minimum(2, (ey / ch).astype(int))
                seeds = {}
                for j in range(1, en + 1):
                    mm = el[ey, ex] == j
                    if mm.sum() > 800:
                        seeds[j] = int(np.bincount(ecell[mm]).argmax())
                if len(set(seeds.values())) < 2:
                    continue
                keep = np.isin(el, list(seeds))
                _, (iy, ix) = ndimage.distance_transform_edt(~keep, return_indices=True)
                near = el[iy, ix]
                for j, c in seeds.items():
                    sel = mask & (near == j)
                    owner[sel] = c
                done = True
                log.append(f"{slug}: コマ{order[0] + 1}と コマ{order[1] + 1}が くっついていたので、ほそらせて（{it}px）わけた")
                break
            if not done:
                owner[ys[m], xs[m]] = cell[m]
                log.append(f"{slug}: コマ{order[0] + 1}と コマ{order[1] + 1}が くっついていたので 境目で 分けた（{tot}px）")
        else:
            owner[ys[m], xs[m]] = order[0]
    if slug == "reaper":
        # 死神: コマ12の 鎌の 刃（銀いろ）が コマ11の 紫の 斬撃に かさなって いる。
        # かさなった ところ（x>395・下の 段）の 銀いろ（彩度が ひくい）は コマ12へ もどす（コマ11 じしんの 鎌は x<385）
        rgb = a[:, :, :3].astype(int)
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        yy, xx = np.mgrid[0:H, 0:W]
        fix = (owner == 10) & (xx > 395) & (yy > 2 * ch) & (sat < 60)
        owner[fix] = 11
        log.append(f"reaper: コマ11に まざった コマ12の 鎌の 刃（{int(fix.sum())}px）を コマ12へ もどした")
    frames = []
    for c in range(15):
        f = a.copy()
        f[owner != c] = 0
        frames.append(f)
    if slug == "reaper":  # もどした ときに いっしょに きた 斬撃の 白い 芯（本体から はなれた 小さな かけら）を けす
        f = frames[11]
        fl, fn = ndimage.label(f[:, :, 3] > 10, structure=np.ones((3, 3)))
        sizes = np.bincount(fl.ravel())
        sizes[0] = 0
        main = fl == sizes.argmax()
        near = ndimage.binary_dilation(main, iterations=12)
        for j in range(1, fn + 1):
            if sizes[j] < 2500 and not (near & (fl == j)).any():
                f[fl == j] = 0
    return frames, lab


def erase_meteor(frames, log):
    """隕石マッチョ: 攻撃ポーズ（10・11コマめ）に 描かれた 小さな 隕石と 炎を けす（隕石は ゲームで べつに 大きく 出す）"""
    # 隕石・炎・岩くずは 人物と はなれた かたまり（こい ところで わけた とき）なので、人物（いちばん 大きい かたまり）だけ のこす。
    # 投げた 隕石は となりの コマ12へ はみだして いるので コマ12からも けす（いろで けすと はだも きえる）
    for c in (9, 10, 11):
        f = frames[c]
        al = f[:, :, 3]
        lab, n = ndimage.label(al > 110, structure=np.ones((3, 3)))
        sizes = np.bincount(lab.ravel())
        sizes[0] = 0
        main = lab == sizes.argmax()
        keep = ndimage.binary_dilation(main, iterations=3) & (al > 0)  # 人物の うすい ふちは のこす
        kill = (al > 0) & ~keep
        f[kill] = 0
        log.append(f"meteor: コマ{c + 1} の 隕石・炎（人物と はなれた 部分 {int(kill.sum())}px）を けした")


def frame_info(f):
    al = f[:, :, 3]
    lab, n = label(al)
    if not n:
        return None
    sizes = np.bincount(lab.ravel())[1:]
    main = lab == (np.argmax(sizes) + 1)
    solid = main & (al > 128)
    ys, xs = np.nonzero(solid)
    y0, y1 = ys.min(), ys.max()
    band = (ys > y0 + 0.25 * (y1 - y0)) & (ys < y0 + 0.75 * (y1 - y0))
    cx = float(np.median(xs[band]))  # 胴の まんなか（武器の 出っぱりに ひっぱられない）
    yy, xx = np.nonzero(al > 10)
    return {"bottom": int(y1), "cx": cx, "box": (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1), "mainTop": int(y0)}


def body_top(f, info):
    """本体の 上の はし: 行ごとの 不透明な はばが 本体の はばの 18% を こえる さいしょの 行（細い 槍・鎌の 柄・刀の 先は のぞく）"""
    al = f[:, :, 3] > 128
    rows = al.sum(axis=1)
    med = np.median(rows[rows > 0])
    for y in range(info["box"][1], info["bottom"]):
        if rows[y] >= 0.35 * med:
            return y
    return info["mainTop"]


def build(src_dir, check_dir):
    with open(os.path.join(src_dir, "manifest.json"), encoding="utf-8") as fp:
        man = {m["slug"]: m for m in json.load(fp)}
    hero = hero_height()
    out = {"heroVisH": round(hero, 1), "meteorD": METEOR_D, "allies": {}, "allyOfCheer": {}, "cheers": []}
    log = []
    os.makedirs(os.path.join(REPO, "assets", "ally"), exist_ok=True)
    for n, slug, name, line, mult in RARE10:
        img = Image.open(os.path.join(src_dir, "source_atlases", f"{slug}.png")).convert("RGBA")
        assert list(img.size) == man[slug]["atlas_size"], (slug, img.size)
        frames, _ = split_cells(img, slug, log)
        orig = [f.copy() for f in frames]
        if slug == "meteor":
            erase_meteor(frames, log)
        infos = [frame_info(f) for f in frames[:14]]
        # 14コマの 基準点（足もと・胴の まんなか）から 共通の マスの 大きさを きめる
        left = max(i["cx"] - i["box"][0] for i in infos)
        right = max(i["box"][2] - i["cx"] for i in infos)
        up = max(i["bottom"] - i["box"][1] for i in infos)
        down = max(i["box"][3] - i["bottom"] for i in infos)
        cw, chh = int(np.ceil(left + right)) + PAD * 2, int(np.ceil(up + down)) + PAD * 2
        ax, ay = int(np.ceil(left)) + PAD, int(np.ceil(up)) + PAD
        sheet = Image.new("RGBA", (cw * 7, chh * 2), (0, 0, 0, 0))
        boxes = []
        for k in range(14):
            i = infos[k]
            x0, y0, x1, y1 = i["box"]
            piece = Image.fromarray(frames[k]).crop((x0, y0, x1, y1))
            dx, dy = int(round(ax - i["cx"] + x0)), ay - i["bottom"] + y0
            sheet.alpha_composite(piece, ((k % 7) * cw + dx, (k // 7) * chh + dy))
            boxes.append((dx, dy, dx + x1 - x0, dy + y1 - y0))
        sheet.save(os.path.join(REPO, "assets", "ally", f"{slug}.png"), optimize=True)
        # 弾（15枠め）
        sf = Image.fromarray(frames[14])
        sb = sf.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
        shot = sf.crop(sb)
        shot.save(os.path.join(REPO, "assets", "ally", f"{slug}_shot.png"), optimize=True)
        # 本体の 高さ（待機 2コマの 平均）と はば
        tops = []
        for k in (2, 3):
            i = infos[k]
            tops.append(i["bottom"] - body_top(frames[k], i))
        body_h = float(BODY_H_FIX.get(slug, np.mean(tops)))
        idle = [boxes[2], boxes[3]]
        # 弾を だす いち（攻撃 11コマめの 右の はし。その 高さの まんなか）→ 基準点からの ずれ
        fi = infos[10]
        f10 = frames[10]
        al = f10[:, :, 3] > 128
        lab, nn = label(f10[:, :, 3])
        sizes = np.bincount(lab.ravel())[1:]
        big = np.isin(lab, [j + 1 for j, s in enumerate(sizes) if s > 600]) & al
        ys, xs = np.nonzero(big)
        rx = xs.max()
        near = xs > rx - 8
        muzzle = [round(float(rx - fi["cx"]), 1), round(float(np.median(ys[near]) - fi["bottom"]), 1)]
        if slug == "meteor":  # 隕石は 頭の 上に 召喚して そこから はなつ
            muzzle = [round(body_h * 0.35, 1), round(-body_h * 1.15, 1)]
        anims = json.loads(json.dumps(ANIMS))
        if slug in ATTACK_FPS:
            anims["attack"]["fps"] = ATTACK_FPS[slug]
        out["allies"][slug] = {
            "name": name, "sheet": f"assets/ally/{slug}.png", "shot": f"assets/ally/{slug}_shot.png", "shotBox": [0, 0, shot.width, shot.height],
            "cellW": cw, "cellH": chh, "anchor": [ax, ay], "facing": "right", "anims": anims,
            "top": int(round(ay - body_h)), "left": int(min(b[0] for b in idle)), "right": int(max(b[2] for b in idle)),
            "bodyH": round(body_h, 1), "heroMult": mult, "muzzle": muzzle,
            "sfx": "allyAtk" + slug[0].upper() + slug[1:], "voice": "allyJoin" + slug[0].upper() + slug[1:], "hitSfx": slug not in SFX_HAS_IMPACT,
        }
        if slug == "meteor":
            out["allies"][slug]["meteor"] = rock_box(shot)
        out["allyOfCheer"][n] = slug
        out["cheers"].append({"id": n, "slug": slug, "name": name, "line": line})
        make_cutin(n, slug, line, orig[CUTIN_POSE[slug]], log)
        if check_dir:
            check_sheet(check_dir, slug, sheet, cw, chh, ax, ay, body_h)
        print(f"{n} {slug:9s} マス {cw}×{chh} 基準 ({ax},{ay}) 本体の高さ {body_h:.0f}px → 表示 {hero * mult:.0f}px（×{hero * mult / body_h:.2f}） 弾 {shot.size} 発射点 {muzzle}")
    for line in log:
        print("  ", line)
    js = "'use strict';\n/* 追加レア10体（tools/build_rare10.py で 自動生成）。仲間の 14コマシート・本体の 高さ・弾・カットイン */\nconst RARE10 = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(REPO, "js", "rare10-data.js"), "w", encoding="utf-8", newline="\n") as fp:
        fp.write(js)


def rock_box(shot):
    """隕石の 弾の 絵の うち 岩の かたまり（炎の しっぽを のぞく）の はんい → 直径を そろえる ため"""
    a = np.array(shot)
    r, g, b, al = [a[:, :, i].astype(int) for i in range(4)]
    rock = (al > 200) & (r < 170) & (g < 90) & (b < 70)
    lab, n = ndimage.label(ndimage.binary_closing(rock, iterations=4))
    sizes = ndimage.sum(rock, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    ys, xs = np.nonzero(lab == k)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def hero_height():
    """主人公の 見えている 高さ（待機コマ・ゲームでの 大きさ）"""
    meta = {"src": "assets/hero.webp", "cellW": 226, "cellH": 206, "cols": 6}
    im = Image.open(os.path.join(REPO, meta["src"])).convert("RGBA")
    c = im.crop((0, 0, meta["cellW"], meta["cellH"]))
    bb = c.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
    return (bb[3] - bb[1]) * 0.76  # HERO_SPRITE_S


def make_cutin(n, slug, line, pose, log):
    """登場カットイン。source/cutin/rare_<slug>_cutin.(webp|png)（キャラ＋テロップ入りの 本番画像）が あれば それを つかう。
    なければ 仮の 画像（本人の ポーズ ＋ テロップ）"""
    dst = os.path.join(REPO, "assets", "cutin", f"cutin{n}.webp")
    for ext in ("webp", "png"):
        real = os.path.join(REPO, "source", "cutin", f"rare_{slug}_cutin.{ext}")
        if os.path.exists(real):
            im = Image.open(real).convert("RGBA")
            # まわりの 透明な よはくを けずる（よはくで 本体・テロップが 小さく ならない ように）。たてよこの わりあいは そのまま
            bb = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            pad = 6
            im = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))
            s = min(1.0, 1100 / max(im.size))
            if s < 1:
                im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
            im.save(dst, "WEBP", quality=90, method=6)
            log.append(f"{slug}: 登場カットイン ← source/cutin/rare_{slug}_cutin.{ext}（よはくを けずって {im.width}×{im.height}）")
            return
    W, H = 660, 1000
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    p = Image.fromarray(pose)
    p = p.crop(p.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox())
    s = min(620 / p.width, 690 / p.height)
    p = p.resize((int(p.width * s), int(p.height * s)), Image.LANCZOS)
    canvas.alpha_composite(p, ((W - p.width) // 2, 720 - p.height))
    # テロップ:「！」で 2行に わけて、金いろ＋こい あいの ふちどり（いままでの カットインに あわせる）
    parts = [x + "！" for x in line.split("！") if x]
    lines = [parts[0], "".join(parts[1:])] if len(parts) > 1 else [line]
    font_path = "C:/Windows/Fonts/HGRSGU.TTC"
    y = 735
    for t in lines:
        size = 96
        while size > 40:
            f = ImageFont.truetype(font_path, size)
            w = f.getbbox(t)[2]
            if w <= W - 40:
                break
            size -= 4
        f = ImageFont.truetype(font_path, size)
        bb = f.getbbox(t)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        x = (W - tw) // 2 - bb[0]
        layer = Image.new("RGBA", (W, th + 60), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.text((x, 30 - bb[1]), t, font=f, fill=(255, 255, 255, 255), stroke_width=16, stroke_fill=(255, 255, 255, 255))
        d.text((x, 30 - bb[1]), t, font=f, fill=(20, 26, 90, 255), stroke_width=11, stroke_fill=(20, 26, 90, 255))
        mask = Image.new("L", layer.size, 0)
        ImageDraw.Draw(mask).text((x, 30 - bb[1]), t, font=f, fill=255)
        grad = Image.new("RGBA", layer.size)
        gp = grad.load()
        for yy in range(layer.size[1]):
            k = yy / layer.size[1]
            col = (255, int(250 - 70 * k), int(170 - 160 * k), 255)
            for xx in range(layer.size[0]):
                gp[xx, yy] = col
        layer.paste(grad, (0, 0), mask)
        canvas.alpha_composite(layer, (0, y - 30))
        y += th + 18
    canvas.save(dst, "WEBP", quality=88, method=6)
    log.append(f"{slug}: 登場カットインの 画像が 素材に ないので、仮の 画像（本人の ポーズ{CUTIN_POSE[slug] + 1} ＋ テロップ）を つくった → assets/cutin/cutin{n}.webp")


def check_sheet(d, slug, sheet, cw, chh, ax, ay, body_h):
    os.makedirs(d, exist_ok=True)
    bg = Image.new("RGBA", sheet.size, (120, 180, 235, 255))
    bg.alpha_composite(sheet)
    dr = ImageDraw.Draw(bg)
    for k in range(14):
        ox, oy = (k % 7) * cw, (k // 7) * chh
        dr.rectangle([ox, oy, ox + cw - 1, oy + chh - 1], outline=(255, 0, 0, 255))
        dr.line([ox, oy + ay, ox + cw, oy + ay], fill=(0, 160, 0, 255), width=2)
        dr.line([ox + ax, oy, ox + ax, oy + chh], fill=(0, 160, 0, 255), width=1)
        dr.line([ox, oy + ay - body_h, ox + cw, oy + ay - body_h], fill=(255, 255, 0, 255), width=1)
    bg.convert("RGB").save(os.path.join(d, f"{slug}_sheet.jpg"), quality=85)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    chk = sys.argv[sys.argv.index("--check") + 1] if "--check" in sys.argv else None
    build(sys.argv[1], chk)
