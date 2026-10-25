'use strict';
/* スプライトの コマ情報（tools/process_sprites.py で じどう生成）: セルの おおきさ と 基準点（ヒーロー=あしもと中央 / ボス=そこの中央） */
const SPRITE_META = {
  hero: { src: 'assets/hero.webp', cellW: 226, cellH: 206, ax: 132, ay: 202, cols: 6, count: 30 },
  boss: { src: 'assets/boss.webp', cellW: 286, cellH: 208, ax: 132, ay: 204, cols: 6, count: 30 },
};
