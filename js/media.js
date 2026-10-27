'use strict';
/* 音声・画像の 一覧（tools/build_media.py で 自動生成。元ファイル名との 対応つき） */
const MEDIA = {
  "bgm": {
    "select": {
      "src": "assets/bgm/menu.mp3",
      "orig": "ステージ選択 2.mp3"
    },
    "stage1": {
      "src": "assets/bgm/stage1.mp3",
      "orig": "ステージ1_お願いマッスル.mp3"
    },
    "stage2": {
      "src": "assets/bgm/stage2.mp3",
      "orig": "ステージ2_マッチョメン.mp3"
    },
    "stage3": {
      "src": "assets/bgm/stage3.mp3",
      "orig": "ステージ3_ボンジョビ.mp3"
    },
    "stage4": {
      "src": "assets/bgm/stage4.mp3",
      "orig": "ステージ4_アイオブザタイガー.mp3"
    },
    "clear": {
      "src": "assets/bgm/afterclear.mp3",
      "orig": "ステージクリア後(ステージ選ぶ.mp3"
    }
  },
  "sfx": {
    "fireworks": {
      "src": "assets/sfx/fireworks.mp3",
      "orig": "ステージクリアの花時の音_花火大会.mp3"
    }
  },
  "voice": {
    "start": {
      "src": "assets/voice/start.wav",
      "orig": "スタート.wav",
      "duration": 1.605,
      "trim": [
        0.18,
        1.785
      ],
      "origDuration": 2.0
    },
    "clear": {
      "src": "assets/voice/clear.wav",
      "orig": "ステージクリア！！やったね！.wav",
      "duration": 2.75,
      "trim": [
        0.14,
        2.89
      ],
      "origDuration": 2.96
    },
    "correct": {
      "src": "assets/voice/correct.wav",
      "orig": "正解.wav",
      "duration": 1.075,
      "trim": [
        0.21,
        1.285
      ],
      "origDuration": 1.48
    },
    "bossAppear": {
      "src": "assets/voice/bossAppear.wav",
      "orig": "ボス登場_ボスが現れたぞ.wav",
      "duration": 1.865,
      "trim": [
        0.215,
        2.08
      ],
      "origDuration": 2.32
    },
    "bossDown": {
      "src": "assets/voice/bossDown.wav",
      "orig": "ボス倒した時_すげー！ボス倒したよ！ゴールに進もう！.wav",
      "duration": 4.03,
      "trim": [
        0.205,
        4.235
      ],
      "origDuration": 4.4
    },
    "wrongRetry": {
      "src": "assets/voice/wrongRetry.wav",
      "orig": "間違えたとき_大丈夫！大丈夫！もう一回！.wav",
      "duration": 2.025,
      "trim": [
        0.205,
        2.23
      ],
      "origDuration": 2.36
    },
    "wrongNext": {
      "src": "assets/voice/wrongNext.wav",
      "orig": "間違えたとき_大丈夫！大丈夫！次行こう！.wav",
      "duration": 2.03,
      "trim": [
        0.325,
        2.355
      ],
      "origDuration": 2.56
    },
    "power": {
      "src": "assets/voice/power.wav",
      "orig": "パワー全開.wav",
      "duration": 1.75,
      "trim": [
        0.295,
        2.045
      ],
      "origDuration": 2.28
    },
    "itemDb1": {
      "src": "assets/voice/itemDb1.wav",
      "orig": "キレてるよ！キレてるよ！.wav",
      "duration": 2.17,
      "trim": [
        0.22,
        2.39
      ],
      "origDuration": 2.72
    },
    "itemDb2": {
      "src": "assets/voice/itemDb2.wav",
      "orig": "仕上がってる仕上がってる.wav",
      "duration": 2.23,
      "trim": [
        0.2,
        2.43
      ],
      "origDuration": 2.6
    },
    "itemDb3": {
      "src": "assets/voice/itemDb3.wav",
      "orig": "はーい！！サイドチェストーーー！！！.wav",
      "duration": 2.265,
      "trim": [
        0.185,
        2.45
      ],
      "origDuration": 2.72
    },
    "itemProtein": {
      "src": "assets/voice/itemProtein.wav",
      "orig": "ハイ、ここでプロテイン.wav",
      "duration": 2.11,
      "trim": [
        0.175,
        2.285
      ],
      "origDuration": 2.44
    }
  },
  "cheers": [
    {
      "id": 1,
      "image": "assets/cutin/cutin01.webp",
      "voice": "assets/voice/cheer01.wav",
      "line": "肩にちっちゃいジープ乗せてんのかい！",
      "duration": 3.895,
      "trim": [
        0.22,
        4.115
      ],
      "origDuration": 4.32,
      "enabled": true,
      "origImage": "爆発文字と本気顔の筋肉選手-1.png",
      "origVoice": "肩にちっちゃいジープ乗せてんのかーい！.wav"
    },
    {
      "id": 2,
      "image": "assets/cutin/cutin02.webp",
      "voice": "assets/voice/cheer02.wav",
      "line": "腹筋が板チョコ！",
      "duration": 2.71,
      "trim": [
        0.155,
        2.865
      ],
      "origDuration": 3.08,
      "enabled": true,
      "origImage": "板チョコ腹筋の本気ポーズ-2.png",
      "origVoice": "cheer 腹筋が板チョコー！！！.wav"
    },
    {
      "id": 3,
      "image": "assets/cutin/cutin03.webp",
      "voice": "assets/voice/cheer03.wav",
      "line": "背中、飛行機が着陸できるぞ！",
      "duration": 4.27,
      "trim": [
        0.075,
        4.345
      ],
      "origDuration": 4.44,
      "enabled": true,
      "origImage": "本気の背中と爆発的な文字-3.png",
      "origVoice": "叫ぶ 背中、飛行機が着陸できるぞーー！！！.wav"
    },
    {
      "id": 4,
      "image": "assets/cutin/cutin04.webp",
      "voice": "assets/voice/cheer04.wav",
      "line": "肩の上で高層ビル建ててんのかい！",
      "duration": 3.085,
      "trim": [
        0.26,
        3.345
      ],
      "origDuration": 3.48,
      "enabled": true,
      "origImage": "無表情マッチョと爆発する日本語文字-4.png",
      "origVoice": "cheer 肩の上で高層ビル建ててんのかい！.wav"
    },
    {
      "id": 5,
      "image": "assets/cutin/cutin05.webp",
      "voice": "assets/voice/cheer05.wav",
      "line": "胸に分厚い辞書入ってる！",
      "duration": 2.42,
      "trim": [
        0.26,
        2.68
      ],
      "origDuration": 2.92,
      "enabled": true,
      "origImage": "本気の筋肉男、熱血チア文字-5.png",
      "origVoice": "cheer 胸に分厚い辞書入ってる！.wav"
    },
    {
      "id": 6,
      "image": "assets/cutin/cutin06.webp",
      "voice": "assets/voice/cheer06.wav",
      "line": "その脚、歩く大木だよ！",
      "duration": 3.68,
      "trim": [
        0.19,
        3.87
      ],
      "origDuration": 4.12,
      "enabled": true,
      "origImage": "本気の筋肉ポーズと熱血応援-6.png",
      "origVoice": "cheer その脚、歩く大木だよ！.wav"
    },
    {
      "id": 7,
      "image": "assets/cutin/cutin07.webp",
      "voice": "assets/voice/cheer07.wav",
      "line": "その腕、丸太だよ！",
      "duration": 3.285,
      "trim": [
        0.17,
        3.455
      ],
      "origDuration": 3.64,
      "enabled": true,
      "origImage": "丸太腕の本気ポーズ-7.png",
      "origVoice": "cheer その腕、丸太だよ！.wav"
    },
    {
      "id": 8,
      "image": "assets/cutin/cutin08.webp",
      "voice": "assets/voice/cheer08.wav",
      "line": "ふくらはぎが子持ちししゃも！",
      "duration": 2.985,
      "trim": [
        0.25,
        3.235
      ],
      "origDuration": 3.52,
      "enabled": true,
      "origImage": "真剣なボディビルダーと熱血応援文字-8.png",
      "origVoice": "ふくらはぎが子持ちししゃも！.wav"
    },
    {
      "id": 9,
      "image": "assets/cutin/cutin09.webp",
      "voice": "assets/voice/cheer09.wav",
      "line": "筋肉のテーマパークだよ！",
      "duration": 2.49,
      "trim": [
        0.18,
        2.67
      ],
      "origDuration": 2.88,
      "enabled": true,
      "origImage": "本気の筋肉テーマパーク-9.png",
      "origVoice": "筋肉のテーマパークだよ！.wav"
    },
    {
      "id": 10,
      "image": "assets/cutin/cutin10.webp",
      "voice": "assets/voice/cheer10.wav",
      "line": "背中に鬼が宿ってる！",
      "duration": 2.7,
      "trim": [
        0.02,
        2.72
      ],
      "origDuration": 2.88,
      "enabled": true,
      "origImage": "背中に鬼が宿る熱血ボディビルダー-10.png",
      "origVoice": "cheer 背中に鬼が宿ってる！.wav"
    },
    {
      "id": 11,
      "image": "assets/cutin/cutin11.webp",
      "voice": "assets/voice/cheer11.wav",
      "line": "その力こぶ、山脈かい！",
      "duration": 3.33,
      "trim": [
        0.21,
        3.54
      ],
      "origDuration": 3.72,
      "enabled": true,
      "origImage": "本気の筋肉、熱血応援！-11.png",
      "origVoice": "その力こぶ、山脈かい！.wav"
    },
    {
      "id": 12,
      "image": "assets/cutin/cutin12.webp",
      "voice": "assets/voice/cheer12.wav",
      "line": "腹筋で大根おろせそう！",
      "duration": 2.77,
      "trim": [
        0.12,
        2.89
      ],
      "origDuration": 3.04,
      "enabled": true,
      "origImage": "真剣マッチョの大根おろしポーズ-12.png",
      "origVoice": "腹筋で大根おろせそう！.wav"
    },
    {
      "id": 13,
      "image": "assets/cutin/cutin13.webp",
      "voice": "assets/voice/cheer13.wav",
      "line": "肩メロン、特大サイズ！",
      "duration": 3.125,
      "trim": [
        0.225,
        3.35
      ],
      "origDuration": 3.48,
      "enabled": true,
      "origImage": "本気顔の筋肉チアポスター-13.png",
      "origVoice": "肩メロン、特大サイズ！.wav"
    },
    {
      "id": 14,
      "image": "assets/cutin/cutin14.webp",
      "voice": "assets/voice/cheer14.wav",
      "line": "背中がデカすぎて日が暮れる！",
      "duration": 3.165,
      "trim": [
        0.225,
        3.39
      ],
      "origDuration": 3.52,
      "enabled": true,
      "origImage": "本気の背中ポーズと熱血文字-14.png",
      "origVoice": "背中がデカすぎて日が暮れる！.wav"
    },
    {
      "id": 15,
      "image": "assets/cutin/cutin15.webp",
      "voice": "assets/voice/cheer15.wav",
      "line": "筋肉が服を追い越してる！",
      "duration": 3.33,
      "trim": [
        0.225,
        3.555
      ],
      "origDuration": 3.72,
      "enabled": true,
      "origImage": "本気すぎる筋肉ポーズ-15.png",
      "origVoice": "筋肉が服を追い越してる！.wav"
    },
    {
      "id": 16,
      "image": "assets/cutin/cutin16.webp",
      "voice": "assets/voice/cheer16.wav",
      "line": "胸板が分厚い鉄板だよ！",
      "duration": 3.745,
      "trim": [
        0.17,
        3.915
      ],
      "origDuration": 4.12,
      "enabled": true,
      "origImage": "本気のボディビルダー、分厚い胸板-16.png",
      "origVoice": "胸板が分厚い鉄板だよ！.wav"
    },
    {
      "id": 17,
      "image": "assets/cutin/cutin17.webp",
      "voice": "assets/voice/cheer17.wav",
      "line": "二頭筋が二世帯住宅！",
      "duration": 2.72,
      "trim": [
        0.195,
        2.915
      ],
      "origDuration": 3.2,
      "enabled": true,
      "origImage": "真剣ボディビルダーの二頭筋応援-17.png",
      "origVoice": "二頭筋が二世帯住宅！.wav"
    },
    {
      "id": 18,
      "image": "assets/cutin/cutin18.webp",
      "voice": "assets/voice/cheer18.wav",
      "line": "筋肉の大渋滞だよ！",
      "duration": 2.695,
      "trim": [
        0.11,
        2.805
      ],
      "origDuration": 3.0,
      "enabled": true,
      "origImage": "真剣な筋肉チャンピオンの勝利ポーズ-18.png",
      "origVoice": "筋肉の大渋滞だよ！.wav"
    },
    {
      "id": 19,
      "image": "assets/cutin/cutin19.webp",
      "voice": "assets/voice/cheer19.wav",
      "line": "そのポーズで地球揺らす気かい！",
      "duration": 3.68,
      "trim": [
        0.195,
        3.875
      ],
      "origDuration": 4.0,
      "enabled": true,
      "origImage": "本気の筋肉応援ポーズ-19.png",
      "origVoice": "そのポーズで地球揺らす気かい！.wav"
    },
    {
      "id": 20,
      "image": "assets/cutin/cutin20.webp",
      "voice": "assets/voice/cheer20.wav",
      "line": "デカすぎて画面に収まらない！",
      "duration": 3.12,
      "trim": [
        0.17,
        3.29
      ],
      "origDuration": 3.44,
      "enabled": true,
      "origImage": "真顔ボディビルダーの爆熱応援文字-20.png",
      "origVoice": "デカすぎて画面に収まらない！.wav"
    }
  ]
};
