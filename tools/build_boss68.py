"""通常モード レベル6〜8（ぶんしょうもんだい）の ボス 12体を、ZIP「boss_lv6-8_assets」の シートから つくる

つかいかた:  python tools/build_boss68.py <boss_lv6-8_assets フォルダ> [--check <確認画像の 出力先>]
  - シートは 5列×3段（14ポーズ ＋ 右下に 攻撃の 弾）。均等に 切らず、tools/build_rare10.py と おなじ やりかたで
    つながった 絵の かたまり ごとに 切り出す（武器・髪・マント・光が 欠けない／隣の コマが まざらない）
  - 足もとと 胴の まんなかで 14コマを そろえて 7列×2段 → assets/boss/L6_S1.png など（ボスの アニメの しくみは そのまま）
  - 15枠めの 弾 → assets/boss/boss_lv6_stage1_projectile.png（左むき。通常モードでは うたない。開発用 プレビューで 確認）
  - 元の シートは source/boss68/ に のこす
  - 透明な ところは そのまま（黒を 透明に する 処理は しない）。え は もともと 左むき（主人公の ほう）なので 反転しない
  - 表示の 大きさは 本体の 高さで そろえる（ボス 250px・中ボス 270px・ラスボス 305px。レベル1〜5の ボスと おなじ くらい）
  → js/boss68-data.js（CHARA.bosses に くわえる）
"""
import json, os, shutil, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_rare10 import split_cells, frame_info, pack, body_top  # noqa: E402

# レベル・ステージ → (分類, なまえ, 攻撃SE（いまある 効果音を つかう。通常モードでは ならさない）)
BOSS68 = {
    (6, 1): ("boss", "岩拳の武人", "allyAtkMeteor"),
    (6, 2): ("boss", "鋼角の闘士", "allyAtkMammoth"),
    (6, 3): ("midboss", "黒鉄の大将", "allyAtkMammoth"),
    (6, 4): ("finalboss", "黄金獅子王", "allyAtkTrex"),
    (7, 1): ("boss", "氷河の槍士", "allyAtkAngel"),
    (7, 2): ("boss", "雷鳴の拳士", "allyAtkEngineer"),
    (7, 3): ("midboss", "蒼鋼の騎将", "allyAtkJet"),
    (7, 4): ("finalboss", "雷帝ヴォルト", "allyAtkTrex"),
    (8, 1): ("boss", "重力の闘士", "allyAtkReaper"),
    (8, 2): ("boss", "流星の剣士", "allyAtkSamurai"),
    (8, 3): ("midboss", "黒曜の巨神兵", "allyAtkTrex"),
    (8, 4): ("finalboss", "天覇皇アストラ", "allyAtkAngel"),
}
TARGET_H = {"boss": 250, "midboss": 270, "finalboss": 305}  # 本体の みための たかさ（ゲームの 768px の たかさで）
ANIMS = {
    "idle": {"frames": [0, 1], "fps": 3, "loop": True},
    "walk": {"frames": [2, 3, 4, 5], "fps": 6, "loop": True},
    "attack": {"frames": [6, 7, 8, 9], "fps": 8, "loop": False, "projectileFrame": 8},  # 構え・ためる・放つ・もどり
    "hurt": {"frames": [10, 11], "fps": 7, "loop": False},
    "defeat": {"frames": [12, 13], "fps": 3, "loop": False},
}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    chk = sys.argv[sys.argv.index("--check") + 1] if "--check" in sys.argv else None
    os.makedirs(os.path.join(REPO, "assets", "boss"), exist_ok=True)
    os.makedirs(os.path.join(REPO, "source", "boss68"), exist_ok=True)
    out, log = {}, []
    for (lv, st), (kind, name, sfx) in BOSS68.items():
        base = f"boss_lv{lv}_stage{st}"
        path = os.path.join(src, f"{base}_atlas.png")
        shutil.copyfile(path, os.path.join(REPO, "source", "boss68", f"{base}_atlas.png"))  # 元の シートを のこす
        img = Image.open(path).convert("RGBA")
        bid = f"L{lv}_S{st}"
        frames, _ = split_cells(img, bid, log)
        infos = [frame_info(f) for f in frames[:14]]
        sheet, cw, chh, ax, ay, boxes = pack(frames, infos)
        sheet.save(os.path.join(REPO, "assets", "boss", f"{bid}.png"), optimize=True)
        sf = Image.fromarray(frames[14])
        shot = sf.crop(sf.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox())
        shot_rel = f"assets/boss/{base}_projectile.png"
        shot.save(os.path.join(REPO, shot_rel), optimize=True)
        body_h = sum(infos[k]["bottom"] - body_top(frames[k], infos[k]) for k in (0, 1)) / 2
        idle = [boxes[0], boxes[1]]
        scale = round(TARGET_H[kind] / body_h, 4)
        out[bid] = {
            "name": name, "level": lv, "stage": st, "type": kind,
            "sheet": f"assets/boss/{bid}.png", "shot": shot_rel, "shotBox": [0, 0, shot.width, shot.height], "shotKind": "physical", "shotSfx": sfx,
            "source": f"source/boss68/{base}_atlas.png", "cellW": cw, "cellH": chh, "anchor": [ax, ay], "facing": "left", "anims": ANIMS,
            # top: ハート・もじの いち（武器・髪を ふくむ みための 上の はし）、bodyH: 大きさを そろえる ための 本体の たかさ
            "top": int(min(b[1] for b in idle)), "left": int(min(b[0] for b in idle)), "right": int(max(b[2] for b in idle)),
            "bodyH": round(body_h, 1), "scale": scale,
        }
        if chk:
            check_sheet(chk, bid, sheet, cw, chh, ax, ay, body_h)
        print(f"{bid} {kind:9s} {name:8s} マス {cw}×{chh} 基準 ({ax},{ay}) 本体 {body_h:.0f}px ×{scale:.2f} → {TARGET_H[kind]}px  弾 {shot.size}  SE {sfx}")
    for line in log:
        print("  ", line)
    js = "'use strict';\n/* 通常モード レベル6〜8の ボス 12体（tools/build_boss68.py で 自動生成）。CHARA.bosses に くわえる */\nconst BOSS68 = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(REPO, "js", "boss68-data.js"), "w", encoding="utf-8", newline="\n") as fp:
        fp.write(js)


def check_sheet(d, bid, sheet, cw, chh, ax, ay, body_h):
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
    bg.convert("RGB").resize((bg.width // 2, bg.height // 2)).save(os.path.join(d, f"{bid}_sheet.jpg"), quality=85)


if __name__ == "__main__":
    main()
