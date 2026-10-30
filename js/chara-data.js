'use strict';
/* ボス・レア仲間の 画像と アニメ（tools/build_chara.py で 自動生成。元: boss_manifest.json / ally_manifest.json） */
const CHARA = {
 "cell": 384,
 "cols": 7,
 "bosses": {
  "L1_S1": {
   "name": "いばらの猪戦士",
   "level": 1,
   "stage": 1,
   "type": "boss",
   "sheet": "assets/boss/L1_S1.png",
   "shot": "assets/boss/L1_S1_shot.png",
   "shotBox": [
    89,
    103,
    322,
    255
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 91,
   "left": 56,
   "right": 328
  },
  "L1_S2": {
   "name": "ハンマーガメ",
   "level": 1,
   "stage": 2,
   "type": "boss",
   "sheet": "assets/boss/L1_S2.png",
   "shot": "assets/boss/L1_S2_shot.png",
   "shotBox": [
    50,
    114,
    333,
    269
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 127,
   "left": 71,
   "right": 312
  },
  "L1_S3": {
   "name": "森のオーガ隊長",
   "level": 1,
   "stage": 3,
   "type": "midboss",
   "sheet": "assets/boss/L1_S3.png",
   "shot": "assets/boss/L1_S3_shot.png",
   "shotBox": [
    67,
    123,
    316,
    260
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 93,
   "left": 48,
   "right": 336
  },
  "L1_S4": {
   "name": "翠竜王",
   "level": 1,
   "stage": 4,
   "type": "finalboss",
   "sheet": "assets/boss/L1_S4.png",
   "shot": "assets/boss/L1_S4_shot.png",
   "shotBox": [
    57,
    90,
    327,
    293
   ],
   "shotKind": "fire",
   "anchor": [
    192,
    364
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
   "top": 76,
   "left": 57,
   "right": 326
  },
  "L2_S1": {
   "name": "サボテン拳士",
   "level": 2,
   "stage": 1,
   "type": "boss",
   "sheet": "assets/boss/L2_S1.png",
   "shot": "assets/boss/L2_S1_shot.png",
   "shotBox": [
    57,
    116,
    326,
    267
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 95,
   "left": 58,
   "right": 326
  },
  "L2_S2": {
   "name": "砂鉄サソリ",
   "level": 2,
   "stage": 2,
   "type": "boss",
   "sheet": "assets/boss/L2_S2.png",
   "shot": "assets/boss/L2_S2_shot.png",
   "shotBox": [
    73,
    133,
    310,
    250
   ],
   "shotKind": "magic",
   "anchor": [
    192,
    364
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
   "top": 94,
   "left": 58,
   "right": 326
  },
  "L2_S3": {
   "name": "砂漠のアヌビス将軍",
   "level": 2,
   "stage": 3,
   "type": "midboss",
   "sheet": "assets/boss/L2_S3.png",
   "shot": "assets/boss/L2_S3_shot.png",
   "shotBox": [
    50,
    111,
    332,
    273
   ],
   "shotKind": "magic",
   "anchor": [
    192,
    364
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
   "top": 72,
   "left": 67,
   "right": 317
  },
  "L2_S4": {
   "name": "砂嵐の魔人王",
   "level": 2,
   "stage": 4,
   "type": "finalboss",
   "sheet": "assets/boss/L2_S4.png",
   "shot": "assets/boss/L2_S4_shot.png",
   "shotBox": [
    42,
    75,
    341,
    309
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 68,
   "left": 59,
   "right": 324
  },
  "L3_S1": {
   "name": "氷牙の白狼",
   "level": 3,
   "stage": 1,
   "type": "boss",
   "sheet": "assets/boss/L3_S1.png",
   "shot": "assets/boss/L3_S1_shot.png",
   "shotBox": [
    64,
    136,
    319,
    248
   ],
   "shotKind": "ice",
   "anchor": [
    192,
    364
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
   "top": 95,
   "left": 69,
   "right": 314
  },
  "L3_S2": {
   "name": "鋼角サイ兵",
   "level": 3,
   "stage": 2,
   "type": "boss",
   "sheet": "assets/boss/L3_S2.png",
   "shot": "assets/boss/L3_S2_shot.png",
   "shotBox": [
    57,
    101,
    326,
    282
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 91,
   "left": 81,
   "right": 303
  },
  "L3_S3": {
   "name": "氷山イエティ将軍",
   "level": 3,
   "stage": 3,
   "type": "midboss",
   "sheet": "assets/boss/L3_S3.png",
   "shot": "assets/boss/L3_S3_shot.png",
   "shotBox": [
    66,
    90,
    325,
    282
   ],
   "shotKind": "ice",
   "anchor": [
    192,
    364
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
   "top": 101,
   "left": 64,
   "right": 321
  },
  "L3_S4": {
   "name": "氷獄の竜皇",
   "level": 3,
   "stage": 4,
   "type": "finalboss",
   "sheet": "assets/boss/L3_S4.png",
   "shot": "assets/boss/L3_S4_shot.png",
   "shotBox": [
    40,
    90,
    352,
    269
   ],
   "shotKind": "ice",
   "anchor": [
    192,
    364
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
   "top": 85,
   "left": 39,
   "right": 345
  },
  "L4_S1": {
   "name": "雷爪の黒豹",
   "level": 4,
   "stage": 1,
   "type": "boss",
   "sheet": "assets/boss/L4_S1.png",
   "shot": "assets/boss/L4_S1_shot.png",
   "shotBox": [
    61,
    135,
    323,
    249
   ],
   "shotKind": "thunder",
   "anchor": [
    192,
    364
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
   "top": 90,
   "left": 68,
   "right": 316
  },
  "L4_S2": {
   "name": "紅蓮の甲冑鬼",
   "level": 4,
   "stage": 2,
   "type": "boss",
   "sheet": "assets/boss/L4_S2.png",
   "shot": "assets/boss/L4_S2_shot.png",
   "shotBox": [
    22,
    76,
    363,
    307
   ],
   "shotKind": "fire",
   "anchor": [
    192,
    364
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
   "top": 86,
   "left": 84,
   "right": 300
  },
  "L4_S3": {
   "name": "嵐翼ガーゴイル",
   "level": 4,
   "stage": 3,
   "type": "midboss",
   "sheet": "assets/boss/L4_S3.png",
   "shot": "assets/boss/L4_S3_shot.png",
   "shotBox": [
    46,
    116,
    338,
    268
   ],
   "shotKind": "magic",
   "anchor": [
    192,
    364
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
   "top": 54,
   "left": 53,
   "right": 331
  },
  "L4_S4": {
   "name": "雷帝バハムート",
   "level": 4,
   "stage": 4,
   "type": "finalboss",
   "sheet": "assets/boss/L4_S4.png",
   "shot": "assets/boss/L4_S4_shot.png",
   "shotBox": [
    46,
    109,
    337,
    273
   ],
   "shotKind": "thunder",
   "anchor": [
    192,
    364
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
   "top": 70,
   "left": 46,
   "right": 338
  },
  "L5_S1": {
   "name": "黒曜石ゴーレム",
   "level": 5,
   "stage": 1,
   "type": "boss",
   "sheet": "assets/boss/L5_S1.png",
   "shot": "assets/boss/L5_S1_shot.png",
   "shotBox": [
    47,
    88,
    336,
    295
   ],
   "shotKind": "physical",
   "anchor": [
    192,
    364
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
   "top": 92,
   "left": 62,
   "right": 323
  },
  "L5_S2": {
   "name": "深淵の魔剣騎士",
   "level": 5,
   "stage": 2,
   "type": "boss",
   "sheet": "assets/boss/L5_S2.png",
   "shot": "assets/boss/L5_S2_shot.png",
   "shotBox": [
    39,
    94,
    345,
    263
   ],
   "shotKind": "magic",
   "anchor": [
    192,
    364
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
   "top": 105,
   "left": 33,
   "right": 350
  },
  "L5_S3": {
   "name": "三眼の魔獣将軍",
   "level": 5,
   "stage": 3,
   "type": "midboss",
   "sheet": "assets/boss/L5_S3.png",
   "shot": "assets/boss/L5_S3_shot.png",
   "shotBox": [
    71,
    89,
    350,
    267
   ],
   "shotKind": "fire",
   "anchor": [
    192,
    364
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
   "top": 82,
   "left": 59,
   "right": 324
  },
  "L5_S4": {
   "name": "終焉の魔神王",
   "level": 5,
   "stage": 4,
   "type": "finalboss",
   "sheet": "assets/boss/L5_S4.png",
   "shot": "assets/boss/L5_S4_shot.png",
   "shotBox": [
    35,
    83,
    348,
    299
   ],
   "shotKind": "magic",
   "anchor": [
    192,
    364
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
   "top": 67,
   "left": 44,
   "right": 338
  }
 },
 "allies": {
  "R01_gold": {
   "name": "黄金マッチョ",
   "sheet": "assets/ally/R01_gold.png",
   "shot": "assets/ally/R01_gold_shot.png",
   "shotBox": [
    20,
    109,
    364,
    274
   ],
   "anchor": [
    192,
    364
   ],
   "facing": "right",
   "anims": {
    "join": {
     "frames": [
      0,
      1
     ],
     "fps": 4,
     "loop": false
    },
    "idle": {
     "frames": [
      2,
      3
     ],
     "fps": 3,
     "loop": true
    },
    "move": {
     "frames": [
      4,
      5,
      6,
      7
     ],
     "fps": 7,
     "loop": true
    },
    "attack": {
     "frames": [
      8,
      9,
      10,
      11
     ],
     "fps": 10,
     "loop": false,
     "projectileFrame": 10
    },
    "jump": {
     "frames": [
      12,
      13
     ],
     "fps": 5,
     "loop": false
    }
   },
   "sfx": "allyAtkGold",
   "voice": "allyJoinGold",
   "top": 46,
   "left": 104,
   "right": 280
  },
  "R02_robot": {
   "name": "巨大筋肉ロボ",
   "sheet": "assets/ally/R02_robot.png",
   "shot": "assets/ally/R02_robot_shot.png",
   "shotBox": [
    39,
    134,
    345,
    249
   ],
   "anchor": [
    192,
    364
   ],
   "facing": "right",
   "anims": {
    "join": {
     "frames": [
      0,
      1
     ],
     "fps": 4,
     "loop": false
    },
    "idle": {
     "frames": [
      2,
      3
     ],
     "fps": 3,
     "loop": true
    },
    "move": {
     "frames": [
      4,
      5,
      6,
      7
     ],
     "fps": 7,
     "loop": true
    },
    "attack": {
     "frames": [
      8,
      9,
      10,
      11
     ],
     "fps": 10,
     "loop": false,
     "projectileFrame": 10
    },
    "jump": {
     "frames": [
      12,
      13
     ],
     "fps": 5,
     "loop": false
    }
   },
   "sfx": "allyAtkRobot",
   "voice": "allyJoinRobot",
   "top": 71,
   "left": 95,
   "right": 288
  },
  "R03_god": {
   "name": "雲乗りの神様",
   "sheet": "assets/ally/R03_god.png",
   "shot": "assets/ally/R03_god_shot.png",
   "shotBox": [
    27,
    123,
    357,
    260
   ],
   "anchor": [
    192,
    364
   ],
   "facing": "right",
   "anims": {
    "join": {
     "frames": [
      0,
      1
     ],
     "fps": 4,
     "loop": false
    },
    "idle": {
     "frames": [
      2,
      3
     ],
     "fps": 3,
     "loop": true
    },
    "move": {
     "frames": [
      4,
      5,
      6,
      7
     ],
     "fps": 7,
     "loop": true
    },
    "attack": {
     "frames": [
      8,
      9,
      10,
      11
     ],
     "fps": 10,
     "loop": false,
     "projectileFrame": 10
    },
    "jump": {
     "frames": [
      12,
      13
     ],
     "fps": 5,
     "loop": false
    }
   },
   "sfx": "allyAtkGod",
   "voice": "allyJoinGod",
   "top": 79,
   "left": 51,
   "right": 334
  },
  "R04_gorilla": {
   "name": "銀のゴリラ",
   "sheet": "assets/ally/R04_gorilla.png",
   "shot": "assets/ally/R04_gorilla_shot.png",
   "shotBox": [
    33,
    99,
    350,
    285
   ],
   "anchor": [
    192,
    364
   ],
   "facing": "right",
   "anims": {
    "join": {
     "frames": [
      0,
      1
     ],
     "fps": 4,
     "loop": false
    },
    "idle": {
     "frames": [
      2,
      3
     ],
     "fps": 3,
     "loop": true
    },
    "move": {
     "frames": [
      4,
      5,
      6,
      7
     ],
     "fps": 7,
     "loop": true
    },
    "attack": {
     "frames": [
      8,
      9,
      10,
      11
     ],
     "fps": 10,
     "loop": false,
     "projectileFrame": 10
    },
    "jump": {
     "frames": [
      12,
      13
     ],
     "fps": 5,
     "loop": false
    }
   },
   "sfx": "allyAtkGorilla",
   "voice": "allyJoinGorilla",
   "top": 125,
   "left": 73,
   "right": 310
  },
  "R05_tower": {
   "name": "高層ビルマッチョ",
   "sheet": "assets/ally/R05_tower.png",
   "shot": "assets/ally/R05_tower_shot.png",
   "shotBox": [
    38,
    120,
    346,
    263
   ],
   "anchor": [
    192,
    364
   ],
   "facing": "right",
   "anims": {
    "join": {
     "frames": [
      0,
      1
     ],
     "fps": 4,
     "loop": false
    },
    "idle": {
     "frames": [
      2,
      3
     ],
     "fps": 3,
     "loop": true
    },
    "move": {
     "frames": [
      4,
      5,
      6,
      7
     ],
     "fps": 7,
     "loop": true
    },
    "attack": {
     "frames": [
      8,
      9,
      10,
      11
     ],
     "fps": 10,
     "loop": false,
     "projectileFrame": 10
    },
    "jump": {
     "frames": [
      12,
      13
     ],
     "fps": 5,
     "loop": false
    }
   },
   "sfx": "allyAtkTower",
   "voice": "allyJoinTower",
   "top": 57,
   "left": 92,
   "right": 292
  }
 },
 "allyOfCheer": {
  "43": "R01_gold",
  "41": "R02_robot",
  "42": "R03_god",
  "45": "R04_gorilla",
  "44": "R05_tower"
 }
};
