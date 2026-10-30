"""ボス20体・レア仲間5体の 素材ZIPを 展開した フォルダから、ゲーム用の 画像と 一覧（js/chara-data.js）を つくる

つかいかた:  python tools/build_chara.py <macho_boss_assets フォルダ> <rare_ally_assets フォルダ>
  - 14コマシート（2688×768、7列×2段、1コマ384×384、透過PNG）は そのまま assets/boss/<ID>.png・assets/ally/<ID>.png へ
  - 攻撃弾も 透過PNG の まま。ただし ボスの 弾の 画像に まじっている「ひだり下の はなれた かけら」
    （ボス本体の きれはし など。弾とは つながっていない 小さな 点）だけ けして assets/boss/<ID>_shot.png へ
  - JSON（boss_manifest.json / ally_manifest.json）の アニメ定義（コマ・fps・弾を だす コマ）を そのまま 書きうつす
  - みための 大きさ（待機コマの 上の はし・はば）を はかって 書く（HP の ハートの いち・かげの 大きさ用）
  - ボスの 弾の 系統（物理・炎・氷・雷・魔法）は 弾の 見た目から 下の 表で きめうち
ひつよう: pip install pillow numpy
"""
import json, os, shutil, sys
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CELL = 384

# 弾の 見た目 → 発射音の 系統
SHOT_KIND = {
    "L1_S1": "physical",  # どんぐり
    "L1_S2": "physical",  # いわ
    "L1_S3": "physical",  # はっぱの つぶて
    "L1_S4": "fire",      # みどりの ほのお
    "L2_S1": "physical",  # サボテンの とげ
    "L2_S2": "magic",     # むらさきの たま
    "L2_S3": "magic",     # きんの みかづき
    "L2_S4": "physical",  # すなあらし
    "L3_S1": "ice",       # こおりの きば
    "L3_S2": "physical",  # ドリル
    "L3_S3": "ice",       # こおりの けっしょう
    "L3_S4": "ice",       # こおりの りゅう
    "L4_S1": "thunder",   # いなずま
    "L4_S2": "fire",      # ほのおの わ
    "L4_S3": "magic",     # むらさきの やいば
    "L4_S4": "thunder",   # かみなりの たま
    "L5_S1": "physical",  # こくようせきの いわ
    "L5_S2": "magic",     # まけんの ざんげき
    "L5_S3": "fire",      # あかい ほのおの たま
    "L5_S4": "magic",     # しゅうえんの たま
}
# レアの カットイン（MEDIA.cheers の id）→ 仲間
ALLY_OF_CHEER = {43: "R01_gold", 41: "R02_robot", 42: "R03_god", 45: "R04_gorilla", 44: "R05_tower"}
ALLY_SFX = {"R01_gold": "allyAtkGold", "R02_robot": "allyAtkRobot", "R03_god": "allyAtkGod", "R04_gorilla": "allyAtkGorilla", "R05_tower": "allyAtkTower"}
ALLY_VOICE = {"R01_gold": "allyJoinGold", "R02_robot": "allyJoinRobot", "R03_god": "allyJoinGod", "R04_gorilla": "allyJoinGorilla", "R05_tower": "allyJoinTower"}


def components(mask, region):
    """region（x0, y0, x1, y1）の なかに ある 点から つながる かたまりを しらべ、region の そとに でない ものだけ かえす"""
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    x0, y0, x1, y1 = region
    out = []
    for sy in range(y0, y1):
        for sx in range(x0, x1):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            pts, inside = [], True
            while q:
                y, x = q.popleft()
                pts.append((y, x))
                if not (x0 <= x < x1 and y0 <= y < y1):
                    inside = False
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
            if inside:
                out.append(pts)
    return out


def clean_shot(src, dst):
    """ひだり下（x<112, y>212）に とじた 小さな かけらだけ けす。弾の 本体・ちかくの 火の粉は のこす"""
    im = Image.open(src).convert("RGBA")
    a = np.array(im)
    alpha = a[:, :, 3]
    mask = alpha > 20  # ごく うすい もや では つながって いる ことに しない
    removed = 0
    for pts in components(mask, (0, 212, 112, CELL)):
        ys, xs = zip(*pts)
        a[list(ys), list(xs), 3] = 0
        removed += len(pts)
        # かけらの まわりの うすい もやも けす
        y0, y1, x0, x1 = max(0, min(ys) - 4), min(CELL, max(ys) + 5), max(0, min(xs) - 4), min(CELL, max(xs) + 5)
        box = a[y0:y1, x0:x1, 3]
        box[box <= 20] = 0
    Image.fromarray(a).save(dst, optimize=True)
    bb = Image.fromarray(a).getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
    return removed, list(bb)


def frame_box(sheet, f):
    c = sheet.crop(((f % 7) * CELL, (f // 7) * CELL, (f % 7 + 1) * CELL, (f // 7 + 1) * CELL))
    return c.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    bdir, adir = sys.argv[1], sys.argv[2]
    with open(os.path.join(bdir, "boss_manifest.json"), encoding="utf-8") as fp:
        bm = json.load(fp)
    with open(os.path.join(adir, "ally_manifest.json"), encoding="utf-8") as fp:
        am = json.load(fp)
    os.makedirs(os.path.join(REPO, "assets", "boss"), exist_ok=True)
    os.makedirs(os.path.join(REPO, "assets", "ally"), exist_ok=True)
    data = {"cell": CELL, "cols": 7, "bosses": {}, "allies": {}, "allyOfCheer": ALLY_OF_CHEER}
    for b in bm["bosses"]:
        bid = b["id"]
        sheet_src = os.path.join(bdir, *b["sheet"].split("/"))
        shutil.copyfile(sheet_src, os.path.join(REPO, "assets", "boss", f"{bid}.png"))
        removed, shot_box = clean_shot(os.path.join(bdir, *b["projectile"].split("/")), os.path.join(REPO, "assets", "boss", f"{bid}_shot.png"))
        sheet = Image.open(sheet_src).convert("RGBA")
        idle = [frame_box(sheet, f) for f in b["animations"]["idle"]["frames"]]
        data["bosses"][bid] = {
            "name": b["name"], "level": b["level"], "stage": b["stage"], "type": b["type"],
            "sheet": f"assets/boss/{bid}.png", "shot": f"assets/boss/{bid}_shot.png", "shotBox": shot_box, "shotKind": SHOT_KIND[bid],
            "anchor": [round(b["anchor"]["x"] * CELL), round(b["anchor"]["y"] * CELL)], "facing": b["facing"],
            "anims": b["animations"],
            "top": min(x[1] for x in idle), "left": min(x[0] for x in idle), "right": max(x[2] for x in idle),
        }
        print(f"{bid} {b['type']:9s} {SHOT_KIND[bid]:8s} 弾の かけら {removed:4d}px けした  待機 上{data['bosses'][bid]['top']} はば{data['bosses'][bid]['right'] - data['bosses'][bid]['left']}  {b['name']}")
    for a in am["allies"]:
        aid = a["id"]
        sheet_src = os.path.join(adir, *a["sheet"].split("/"))
        shutil.copyfile(sheet_src, os.path.join(REPO, "assets", "ally", f"{aid}.png"))
        shot_src = os.path.join(adir, *a["projectile"].split("/"))
        shutil.copyfile(shot_src, os.path.join(REPO, "assets", "ally", f"{aid}_shot.png"))
        sheet = Image.open(sheet_src).convert("RGBA")
        idle = [frame_box(sheet, f) for f in a["animations"]["idle"]["frames"]]
        shot_box = Image.open(shot_src).convert("RGBA").getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
        data["allies"][aid] = {
            "name": a["name"], "sheet": f"assets/ally/{aid}.png", "shot": f"assets/ally/{aid}_shot.png", "shotBox": list(shot_box),
            "anchor": [round(a["anchor"]["x"] * CELL), round(a["anchor"]["y"] * CELL)], "facing": a["facing"],
            "anims": a["animations"], "sfx": ALLY_SFX[aid], "voice": ALLY_VOICE[aid],
            "top": min(x[1] for x in idle), "left": min(x[0] for x in idle), "right": max(x[2] for x in idle),
        }
        print(f"{aid} 待機 上{data['allies'][aid]['top']}  {a['name']}")
    js = "'use strict';\n/* ボス・レア仲間の 画像と アニメ（tools/build_chara.py で 自動生成。元: boss_manifest.json / ally_manifest.json） */\nconst CHARA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
    with open(os.path.join(REPO, "js", "chara-data.js"), "w", encoding="utf-8", newline="\n") as fp:
        fp.write(js)


if __name__ == "__main__":
    main()
