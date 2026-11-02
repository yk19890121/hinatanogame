'use strict';
/* 通常モード レベル6〜8の ボス 12体（tools/build_boss68.py で 自動生成）。CHARA.bosses に くわえる */
const BOSS68 = {
 "L6_S1": {
  "name": "岩拳の武人",
  "level": 6,
  "stage": 1,
  "type": "boss",
  "sheet": "assets/boss/L6_S1.png",
  "shot": "assets/boss/boss_lv6_stage1_projectile.png",
  "shotBox": [
   0,
   0,
   306,
   205
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkMeteor",
  "source": "source/boss68/boss_lv6_stage1_atlas.png",
  "cellW": 393,
  "cellH": 300,
  "anchor": [
   185,
   291
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 26,
  "left": 68,
  "right": 286,
  "bodyH": 240.5,
  "scale": 1.0395
 },
 "L6_S2": {
  "name": "鋼角の闘士",
  "level": 6,
  "stage": 2,
  "type": "boss",
  "sheet": "assets/boss/L6_S2.png",
  "shot": "assets/boss/boss_lv6_stage2_projectile.png",
  "shotBox": [
   0,
   0,
   359,
   233
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkMammoth",
  "source": "source/boss68/boss_lv6_stage2_atlas.png",
  "cellW": 408,
  "cellH": 313,
  "anchor": [
   192,
   304
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 64,
  "right": 296,
  "bodyH": 283.0,
  "scale": 0.8834
 },
 "L6_S3": {
  "name": "黒鉄の大将",
  "level": 6,
  "stage": 3,
  "type": "midboss",
  "sheet": "assets/boss/L6_S3.png",
  "shot": "assets/boss/boss_lv6_stage3_projectile.png",
  "shotBox": [
   0,
   0,
   305,
   234
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkMammoth",
  "source": "source/boss68/boss_lv6_stage3_atlas.png",
  "cellW": 390,
  "cellH": 303,
  "anchor": [
   218,
   294
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 99,
  "right": 336,
  "bodyH": 265.0,
  "scale": 1.0189
 },
 "L6_S4": {
  "name": "黄金獅子王",
  "level": 6,
  "stage": 4,
  "type": "finalboss",
  "sheet": "assets/boss/L6_S4.png",
  "shot": "assets/boss/boss_lv6_stage4_projectile.png",
  "shotBox": [
   0,
   0,
   339,
   260
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkTrex",
  "source": "source/boss68/boss_lv6_stage4_atlas.png",
  "cellW": 456,
  "cellH": 306,
  "anchor": [
   212,
   298
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 94,
  "right": 351,
  "bodyH": 275.0,
  "scale": 1.1091
 },
 "L7_S1": {
  "name": "氷河の槍士",
  "level": 7,
  "stage": 1,
  "type": "boss",
  "sheet": "assets/boss/L7_S1.png",
  "shot": "assets/boss/boss_lv7_stage1_projectile.png",
  "shotBox": [
   0,
   0,
   370,
   117
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkAngel",
  "source": "source/boss68/boss_lv7_stage1_atlas.png",
  "cellW": 437,
  "cellH": 302,
  "anchor": [
   259,
   293
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 93,
  "right": 397,
  "bodyH": 275.5,
  "scale": 0.9074
 },
 "L7_S2": {
  "name": "雷鳴の拳士",
  "level": 7,
  "stage": 2,
  "type": "boss",
  "sheet": "assets/boss/L7_S2.png",
  "shot": "assets/boss/boss_lv7_stage2_projectile.png",
  "shotBox": [
   0,
   0,
   286,
   231
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkEngineer",
  "source": "source/boss68/boss_lv7_stage2_atlas.png",
  "cellW": 424,
  "cellH": 324,
  "anchor": [
   210,
   316
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 121,
  "right": 314,
  "bodyH": 295.5,
  "scale": 0.846
 },
 "L7_S3": {
  "name": "蒼鋼の騎将",
  "level": 7,
  "stage": 3,
  "type": "midboss",
  "sheet": "assets/boss/L7_S3.png",
  "shot": "assets/boss/boss_lv7_stage3_projectile.png",
  "shotBox": [
   0,
   0,
   248,
   102
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkJet",
  "source": "source/boss68/boss_lv7_stage3_atlas.png",
  "cellW": 495,
  "cellH": 321,
  "anchor": [
   276,
   312
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 143,
  "right": 398,
  "bodyH": 286.5,
  "scale": 0.9424
 },
 "L7_S4": {
  "name": "雷帝ヴォルト",
  "level": 7,
  "stage": 4,
  "type": "finalboss",
  "sheet": "assets/boss/L7_S4.png",
  "shot": "assets/boss/boss_lv7_stage4_projectile.png",
  "shotBox": [
   0,
   0,
   336,
   172
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkTrex",
  "source": "source/boss68/boss_lv7_stage4_atlas.png",
  "cellW": 467,
  "cellH": 325,
  "anchor": [
   242,
   316
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 113,
  "right": 397,
  "bodyH": 296.0,
  "scale": 1.0304
 },
 "L8_S1": {
  "name": "重力の闘士",
  "level": 8,
  "stage": 1,
  "type": "boss",
  "sheet": "assets/boss/L8_S1.png",
  "shot": "assets/boss/boss_lv8_stage1_projectile.png",
  "shotBox": [
   0,
   0,
   281,
   164
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkReaper",
  "source": "source/boss68/boss_lv8_stage1_atlas.png",
  "cellW": 413,
  "cellH": 316,
  "anchor": [
   223,
   307
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 133,
  "right": 326,
  "bodyH": 291.5,
  "scale": 0.8576
 },
 "L8_S2": {
  "name": "流星の剣士",
  "level": 8,
  "stage": 2,
  "type": "boss",
  "sheet": "assets/boss/L8_S2.png",
  "shot": "assets/boss/boss_lv8_stage2_projectile.png",
  "shotBox": [
   0,
   0,
   307,
   188
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkSamurai",
  "source": "source/boss68/boss_lv8_stage2_atlas.png",
  "cellW": 428,
  "cellH": 304,
  "anchor": [
   214,
   294
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 27,
  "right": 333,
  "bodyH": 279.0,
  "scale": 0.8961
 },
 "L8_S3": {
  "name": "黒曜の巨神兵",
  "level": 8,
  "stage": 3,
  "type": "midboss",
  "sheet": "assets/boss/L8_S3.png",
  "shot": "assets/boss/boss_lv8_stage3_projectile.png",
  "shotBox": [
   0,
   0,
   291,
   116
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkTrex",
  "source": "source/boss68/boss_lv8_stage3_atlas.png",
  "cellW": 420,
  "cellH": 325,
  "anchor": [
   229,
   315
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 12,
  "left": 105,
  "right": 355,
  "bodyH": 281.5,
  "scale": 0.9591
 },
 "L8_S4": {
  "name": "天覇皇アストラ",
  "level": 8,
  "stage": 4,
  "type": "finalboss",
  "sheet": "assets/boss/L8_S4.png",
  "shot": "assets/boss/boss_lv8_stage4_projectile.png",
  "shotBox": [
   0,
   0,
   330,
   180
  ],
  "shotKind": "physical",
  "shotSfx": "allyAtkAngel",
  "source": "source/boss68/boss_lv8_stage4_atlas.png",
  "cellW": 441,
  "cellH": 341,
  "anchor": [
   254,
   333
  ],
  "facing": "left",
  "anims": {
   "idle": {
    "frames": [
     0,
     1
    ],
    "fps": 3,
    "loop": true
   },
   "walk": {
    "frames": [
     2,
     3,
     4,
     5
    ],
    "fps": 6,
    "loop": true
   },
   "attack": {
    "frames": [
     6,
     7,
     8,
     9
    ],
    "fps": 8,
    "loop": false,
    "projectileFrame": 8
   },
   "hurt": {
    "frames": [
     10,
     11
    ],
    "fps": 7,
    "loop": false
   },
   "defeat": {
    "frames": [
     12,
     13
    ],
    "fps": 3,
    "loop": false
   }
  },
  "top": 6,
  "left": 153,
  "right": 389,
  "bodyH": 287.5,
  "scale": 1.0609
 }
};
