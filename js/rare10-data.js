'use strict';
/* 追加レア10体（tools/build_rare10.py で 自動生成）。仲間の 14コマシート・本体の 高さ・弾・カットイン */
const RARE10 = {
 "heroVisH": 145.2,
 "meteorD": 3.0,
 "allies": {
  "meteor": {
   "name": "隕石マッチョ",
   "sheet": "assets/ally/meteor.png",
   "shot": "assets/ally/meteor_shot.png",
   "shotBox": [
    0,
    0,
    297,
    178
   ],
   "cellW": 325,
   "cellH": 340,
   "anchor": [
    161,
    332
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
     "fps": 7,
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
   "top": 18,
   "left": 6,
   "right": 287,
   "bodyH": 314.0,
   "heroMult": 1.5,
   "muzzle": [
    109.9,
    -361.1
   ],
   "sfx": "allyAtkMeteor",
   "voice": "allyJoinMeteor",
   "hitSfx": false,
   "meteor": [
    158,
    54,
    276,
    150
   ]
  },
  "sniper": {
   "name": "スナイパーマッチョ",
   "sheet": "assets/ally/sniper.png",
   "shot": "assets/ally/sniper_shot.png",
   "shotBox": [
    0,
    0,
    265,
    64
   ],
   "cellW": 473,
   "cellH": 339,
   "anchor": [
    160,
    331
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
   "top": 12,
   "left": 67,
   "right": 321,
   "bodyH": 319.0,
   "heroMult": 1.5,
   "muzzle": [
    292.0,
    -208.0
   ],
   "sfx": "allyAtkSniper",
   "voice": "allyJoinSniper",
   "hitSfx": true
  },
  "angel": {
   "name": "マッチョエンジェラル",
   "sheet": "assets/ally/angel.png",
   "shot": "assets/ally/angel_shot.png",
   "shotBox": [
    0,
    0,
    271,
    145
   ],
   "cellW": 442,
   "cellH": 378,
   "anchor": [
    171,
    358
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
   "top": 65,
   "left": 64,
   "right": 310,
   "bodyH": 293.0,
   "heroMult": 1.5,
   "muzzle": [
    257.0,
    -159.0
   ],
   "sfx": "allyAtkAngel",
   "voice": "allyJoinAngel",
   "hitSfx": true
  },
  "mammoth": {
   "name": "マンモスロボ",
   "sheet": "assets/ally/mammoth.png",
   "shot": "assets/ally/mammoth_shot.png",
   "shotBox": [
    0,
    0,
    270,
    190
   ],
   "cellW": 396,
   "cellH": 341,
   "anchor": [
    205,
    332
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
   "top": 58,
   "left": 95,
   "right": 329,
   "bodyH": 274.0,
   "heroMult": 2.0,
   "muzzle": [
    181.0,
    -186.0
   ],
   "sfx": "allyAtkMammoth",
   "voice": "allyJoinMammoth",
   "hitSfx": false
  },
  "trex": {
   "name": "ティラノサウルスロボ",
   "sheet": "assets/ally/trex.png",
   "shot": "assets/ally/trex_shot.png",
   "shotBox": [
    0,
    0,
    272,
    119
   ],
   "cellW": 470,
   "cellH": 340,
   "anchor": [
    232,
    318
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
   "top": 24,
   "left": 74,
   "right": 348,
   "bodyH": 294.0,
   "heroMult": 2.0,
   "muzzle": [
    225.0,
    -199.0
   ],
   "sfx": "allyAtkTrex",
   "voice": "allyJoinTrex",
   "hitSfx": true
  },
  "samurai": {
   "name": "サムライマッチョ",
   "sheet": "assets/ally/samurai.png",
   "shot": "assets/ally/samurai_shot.png",
   "shotBox": [
    0,
    0,
    305,
    159
   ],
   "cellW": 455,
   "cellH": 323,
   "anchor": [
    200,
    314
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
   "top": 28,
   "left": 91,
   "right": 385,
   "bodyH": 286.5,
   "heroMult": 1.5,
   "muzzle": [
    202.0,
    -140.0
   ],
   "sfx": "allyAtkSamurai",
   "voice": "allyJoinSamurai",
   "hitSfx": true
  },
  "reaper": {
   "name": "死神マッチョ",
   "sheet": "assets/ally/reaper.png",
   "shot": "assets/ally/reaper_shot.png",
   "shotBox": [
    0,
    0,
    223,
    164
   ],
   "cellW": 450,
   "cellH": 345,
   "anchor": [
    183,
    337
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
   "top": 47,
   "left": 46,
   "right": 274,
   "bodyH": 290.0,
   "heroMult": 1.5,
   "muzzle": [
    252.0,
    -168.0
   ],
   "sfx": "allyAtkReaper",
   "voice": "allyJoinReaper",
   "hitSfx": true
  },
  "engineer": {
   "name": "エンジニアマッチョ",
   "sheet": "assets/ally/engineer.png",
   "shot": "assets/ally/engineer_shot.png",
   "shotBox": [
    0,
    0,
    249,
    94
   ],
   "cellW": 367,
   "cellH": 295,
   "anchor": [
    165,
    278
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
   "top": 50,
   "left": 41,
   "right": 301,
   "bodyH": 228.5,
   "heroMult": 2.0,
   "muzzle": [
    190.0,
    -142.0
   ],
   "sfx": "allyAtkEngineer",
   "voice": "allyJoinEngineer",
   "hitSfx": true
  },
  "diamond": {
   "name": "横綱ダイヤモンド",
   "sheet": "assets/ally/diamond.png",
   "shot": "assets/ally/diamond_shot.png",
   "shotBox": [
    0,
    0,
    300,
    228
   ],
   "cellW": 345,
   "cellH": 348,
   "anchor": [
    165,
    339
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
   "top": 52,
   "left": 41,
   "right": 285,
   "bodyH": 286.5,
   "heroMult": 2.0,
   "muzzle": [
    164.0,
    -171.0
   ],
   "sfx": "allyAtkDiamond",
   "voice": "allyJoinDiamond",
   "hitSfx": false
  },
  "jet": {
   "name": "戦闘機ロボ",
   "sheet": "assets/ally/jet.png",
   "shot": "assets/ally/jet_shot.png",
   "shotBox": [
    0,
    0,
    280,
    96
   ],
   "cellW": 422,
   "cellH": 347,
   "anchor": [
    199,
    328
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
   "top": 20,
   "left": 46,
   "right": 295,
   "bodyH": 307.5,
   "heroMult": 2.0,
   "muzzle": [
    206.0,
    -181.0
   ],
   "sfx": "allyAtkJet",
   "voice": "allyJoinJet",
   "hitSfx": true
  }
 },
 "allyOfCheer": {
  "46": "meteor",
  "47": "sniper",
  "48": "angel",
  "49": "mammoth",
  "50": "trex",
  "51": "samurai",
  "52": "reaper",
  "53": "engineer",
  "54": "diamond",
  "55": "jet"
 },
 "cheers": [
  {
   "id": 46,
   "slug": "meteor",
   "name": "隕石マッチョ",
   "line": "その隕石！片手で持つにはデカすぎる！"
  },
  {
   "id": 47,
   "slug": "sniper",
   "name": "スナイパーマッチョ",
   "line": "装備は一流！服装はパンイチ！"
  },
  {
   "id": 48,
   "slug": "angel",
   "name": "マッチョエンジェラル",
   "line": "大天使降臨！筋肉まで神々しい！"
  },
  {
   "id": 49,
   "slug": "mammoth",
   "name": "マンモスロボ",
   "line": "鋼の巨体！マンモス級のド迫力！"
  },
  {
   "id": 50,
   "slug": "trex",
   "name": "ティラノサウルスロボ",
   "line": "太古の王者！鋼のボディで復活！"
  },
  {
   "id": 51,
   "slug": "samurai",
   "name": "サムライマッチョ",
   "line": "長すぎる！刀も筋肉も規格外！"
  },
  {
   "id": 52,
   "slug": "reaper",
   "name": "死神マッチョ",
   "line": "細くてもムキムキ！鎌は超ド級！"
  },
  {
   "id": 53,
   "slug": "engineer",
   "name": "エンジニアマッチョ",
   "line": "頭脳も筋肉も！フルスペック！"
  },
  {
   "id": 54,
   "slug": "diamond",
   "name": "横綱ダイヤモンド",
   "line": "全身ダイヤ！硬さも強さも横綱級！"
  },
  {
   "id": 55,
   "slug": "jet",
   "name": "戦闘機ロボ",
   "line": "速すぎる！その巨体で音速突破！"
  }
 ]
};
