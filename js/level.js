'use strict';
/* =========================================================
   あたりはんてい と ステージづくり
   タイル: 0=そら 1=じめん 2=ブロック 3=のれる いた（したから すりぬけ）
   ========================================================= */
const Physics = {
  tile(L, c, r) {
    if (c < 0 || c >= L.cols) return 1;
    if (r < 0 || r >= ROWS) return 0;
    return L.tiles[c * ROWS + r];
  },
  solidTile(L, c, r) {
    const t = this.tile(L, c, r);
    return t === 1 || t === 2;
  },
  standable(L, c, r) {
    const t = this.tile(L, c, r);
    return t === 1 || t === 2 || t === 3;
  },
  overlap(b, s) {
    return b.x - b.w / 2 < s.x + s.w && b.x + b.w / 2 > s.x && b.y - b.h < s.y + s.h && b.y > s.y;
  },
  bodies(a, b, shrink = 4) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - shrink && a.y - a.h < b.y && b.y - b.h < a.y;
  },
  moveX(b, dx, L, solids) {
    if (dx === 0) return false;
    b.x += dx;
    let blocked = false;
    const r0 = Math.floor((b.y - b.h + 1) / T), r1 = Math.floor((b.y - 1) / T);
    if (dx > 0) {
      const c = Math.floor((b.x + b.w / 2) / T);
      for (let r = r0; r <= r1; r++) {
        if (this.solidTile(L, c, r)) {
          b.x = c * T - b.w / 2 - 0.01;
          blocked = true;
          break;
        }
      }
    } else {
      const c = Math.floor((b.x - b.w / 2) / T);
      for (let r = r0; r <= r1; r++) {
        if (this.solidTile(L, c, r)) {
          b.x = (c + 1) * T + b.w / 2 + 0.01;
          blocked = true;
          break;
        }
      }
    }
    for (const s of solids) {
      if (!s.solid || !this.overlap(b, s)) continue;
      b.x = dx > 0 ? s.x - b.w / 2 - 0.01 : s.x + s.w + b.w / 2 + 0.01;
      blocked = true;
    }
    if (blocked) b.vx = 0;
    return blocked;
  },
  moveY(b, dy, L, solids, prevBottom, prevTop) {
    const res = { head: null, onEntity: false };
    b.y += dy;
    b.onGround = false;
    const c0 = Math.floor((b.x - b.w / 2 + 2) / T), c1 = Math.floor((b.x + b.w / 2 - 2) / T);
    if (dy > 0) {
      const row = Math.floor(b.y / T), rowTop = row * T;
      for (let c = c0; c <= c1; c++) {
        const t = this.tile(L, c, row);
        if (t === 1 || t === 2 || (t === 3 && prevBottom <= rowTop + 0.5)) {
          b.y = rowTop;
          b.vy = 0;
          b.onGround = true;
          break;
        }
      }
      for (const s of solids) {
        if (!s.solid || !this.overlap(b, s) || prevBottom > s.y + 0.5) continue;
        b.y = s.y;
        b.vy = 0;
        b.onGround = true;
        res.onEntity = true;
      }
    } else if (dy < 0) {
      const row = Math.floor((b.y - b.h) / T);
      for (let c = c0; c <= c1; c++) {
        if (this.solidTile(L, c, row)) {
          b.y = (row + 1) * T + b.h;
          b.vy = 0;
          res.head = { tile: true, x: b.x, y: (row + 1) * T };
          break;
        }
      }
      let best = null, bestOv = 0;
      for (const s of solids) {
        if (!s.solid || !this.overlap(b, s) || prevTop < s.y + s.h - 0.5) continue;
        const ov = Math.min(b.x + b.w / 2, s.x + s.w) - Math.max(b.x - b.w / 2, s.x);
        if (ov > bestOv) {
          bestOv = ov;
          best = s;
        }
      }
      if (best) {
        b.y = best.y + best.h + b.h;
        b.vy = 0;
        res.head = best;
      }
    }
    return res;
  },
  safeGround(L, b) {
    const row = Math.floor((b.y + 2) / T);
    const c0 = Math.floor((b.x - b.w / 2 - 24) / T), c1 = Math.floor((b.x + b.w / 2 + 24) / T);
    for (let c = c0; c <= c1; c++) if (!this.standable(L, c, row)) return false;
    return true;
  },
  groundBelow(L, x, y) {
    const c = Math.floor(x / T);
    for (let r = Math.max(0, Math.floor((y - 1) / T)); r < ROWS; r++) if (this.standable(L, c, r)) return r * T;
    return null;
  },
};

function newLevel(themeKey, stage) {
  return { stage, theme: THEMES[themeKey], gates: [], blocks: [], enemies: [], dumbbells: [], proteins: [], springs: [], decor: [], signs: [], podium: [], goal: null, busy: new Set(), colsData: [] };
}

function finishLevel(L, rng) {
  const cols = L.colsData;
  L.cols = cols.length;
  L.width = L.cols * T;
  L.tiles = new Uint8Array(L.cols * ROWS);
  cols.forEach((col, i) => {
    if (col.g != null) for (let r = col.g; r < ROWS; r++) L.tiles[i * ROWS + r] = 1;
    for (const [r, t] of col.t) L.tiles[i * ROWS + r] = t;
  });
  const keys = L.theme.decor;
  for (let i = 2; i < L.cols - 2; i++) {
    const col = cols[i];
    if (L.busy.has(i) || col.g == null || cols[i - 1].g !== col.g || cols[i + 1].g !== col.g) continue;
    if (rng() < 0.24) L.decor.push({ x: i * T + T / 2 + (rng() - 0.5) * 24, y: col.g * T, key: keys[Math.floor(rng() * keys.length)] });
  }
  return L;
}

function buildLevel(stageIdx) {
  const st = STAGES[stageIdx];
  const rng = mulberry32(9001 + stageIdx * 131);
  const ri = (a, b) => Math.floor(a + rng() * (b - a + 1));
  const L = newLevel(st.theme, st);
  const cols = L.colsData;
  let c = 0;
  const ground = (n, row = GROUND_ROW) => { for (let i = 0; i < n; i++) cols.push({ g: row, t: [] }); c += n; };
  const pit = (n) => { for (let i = 0; i < n; i++) cols.push({ g: null, t: [] }); c += n; };
  const put = (col, row, type) => cols[col].t.push([row, type]);
  const db = (col, row) => L.dumbbells.push({ x: col * T + T / 2, y: row * T + T / 2, taken: false, phase: rng() * TAU });
  const dbRow = (col, row, n) => { for (let i = 0; i < n; i++) db(col + i, row); };
  const enemy = (col, row = GROUND_ROW) => L.enemies.push(new Slime(col * T + T / 2, row * T));
  const busy = (a, b) => { for (let i = a; i <= b; i++) L.busy.add(i); };

  const chunks = {
    flat() {
      const s = c, n = ri(8, 11);
      ground(n);
      if (rng() < 0.7) dbRow(s + 2, rng() < 0.5 ? 7 : 6, ri(3, 5));
      if (rng() < st.enemyRate) enemy(s + ri(5, n - 2));
    },
    pit() {
      const s = c, w = ri(2, st.pitMax);
      ground(3);
      pit(w);
      ground(3);
      busy(s + 2, s + 3 + w);
      for (let i = 0; i < w + 2; i++) db(s + 2 + i, 6 - Math.sin(((i + 0.5) / (w + 2)) * Math.PI) * 1.6);
    },
    hill() {
      const s = c;
      ground(2); ground(2, 8); ground(4, 7); ground(2, 8); ground(2);
      dbRow(s + 4, 5.4, 4);
      if (rng() < st.enemyRate) enemy(s + 6, 7);
    },
    platforms() {
      const s = c;
      ground(12);
      for (let i = 2; i <= 4; i++) put(s + i, 7, 3);
      for (let i = 6; i <= 8; i++) put(s + i, 5, 3);
      dbRow(s + 2, 6, 3);
      dbRow(s + 6, 4, 3);
      if (rng() < st.enemyRate + 0.2) enemy(s + 10);
    },
    bricks() {
      const s = c;
      ground(10);
      // おおきい マッチョが したを とおれる たかさ（そこ y=384）
      for (let i = 3; i <= 6; i++) put(s + i, 5, 2);
      dbRow(s + 3, 7.2, 4);
      if (rng() < 0.45) L.proteins.push({ x: (s + 8) * T + T / 2, y: 7.4 * T, taken: false });
      if (rng() < st.enemyRate) enemy(s + 8);
    },
    spring() {
      const s = c;
      ground(11);
      L.springs.push(new Spring((s + 3) * T + T / 2));
      busy(s + 2, s + 4);
      for (let r = 2; r <= 6; r++) db(s + 3, r);
      for (let i = 5; i <= 8; i++) put(s + i, 3, 2);
      dbRow(s + 5, 2, 4);
    },
    stairs() {
      const s = c;
      ground(2); ground(2, 8); ground(2, 7); ground(3, 6); ground(2, 7); ground(2, 8); ground(2);
      dbRow(s + 6, 4.6, 3);
      if (rng() < st.enemyRate) enemy(s + 13);
    },
    enemies() {
      const s = c;
      ground(13);
      enemy(s + 5);
      enemy(s + 10);
      dbRow(s + 4, 6.5, 2);
      dbRow(s + 9, 6.5, 2);
    },
  };

  const mathZone = () => {
    const s = c;
    ground(15);
    busy(s, s + 14);
    const gate = new Gate((s + 11) * T + (T - 72) / 2, 'wall', (s + 1) * T);
    for (let k = 0; k < 3; k++) {
      const b = new AnswerBlock((s + 3) * T + k * BLOCK_GAP, 6 * T - BLOCK, gate);
      gate.blocks.push(b);
      L.blocks.push(b);
    }
    L.gates.push(gate);
  };

  const bossZone = () => {
    const s = c;
    ground(28);
    busy(s, s + 27);
    const gate = new Gate((s + 11) * T, 'boss', (s + 1) * T);
    for (let k = 0; k < 3; k++) {
      const b = new AnswerBlock((s + 3) * T + k * BLOCK_GAP, 6 * T - BLOCK, gate);
      gate.blocks.push(b);
      L.blocks.push(b);
    }
    gate.boss = new Boss(gate);
    L.gates.push(gate);
    const gx = (s + 20) * T;
    L.goal = { x: gx, reached: false };
    L.podium = [
      { x: gx - 96, y: GROUND_Y - 36, w: 192, h: 36, solid: true },
      { x: gx - 75, y: GROUND_Y - 68, w: 150, h: 32, solid: true },
      { x: gx - 55, y: GROUND_Y - 98, w: 110, h: 30, solid: true },
    ];
  };

  const pool = stageIdx === 0
    ? ['flat', 'platforms', 'bricks', 'hill', 'spring', 'pit', 'flat']
    : ['flat', 'platforms', 'bricks', 'hill', 'spring', 'pit', 'stairs', 'enemies'];
  let prev = '';
  const run = (n) => {
    for (let i = 0; i < n; i++) {
      let k;
      do { k = pool[Math.floor(rng() * pool.length)]; } while (k === prev);
      prev = k;
      chunks[k]();
    }
  };

  ground(12);
  busy(0, 8);
  L.signs.push({ x: 7 * T, text: 'すすめ！ →' });
  for (let g = 0; g < 4; g++) {
    run(g === 0 ? 2 : 3);
    ground(3);
    mathZone();
  }
  L.gates[0].hint = true;
  run(2);
  ground(4);
  L.signs.push({ x: (c - 2) * T, text: 'ボス ちゅうい！' });
  busy(c - 4, c);
  bossZone();
  return finishLevel(L, rng);
}

// タイトルがめんの はいけい用（たいらな みち）
function buildDemoLevel(themeKey) {
  const rng = mulberry32(5);
  const L = newLevel(themeKey, null);
  for (let i = 0; i < 400; i++) L.colsData.push({ g: GROUND_ROW, t: [] });
  finishLevel(L, rng);
  // 300マスごとに おなじ けしきに する（ループ用）
  L.decor = L.decor.filter((d) => d.x < 300 * T);
  L.decor = L.decor.concat(L.decor.filter((d) => d.x < 100 * T).map((d) => ({ ...d, x: d.x + 300 * T })));
  return L;
}
