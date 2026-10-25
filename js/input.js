'use strict';
/* =========================================================
   そうさ（キーボード・タッチ・ゲームパッド）
   ========================================================= */
const Input = (() => {
  const keys = {};
  const touch = { left: false, right: false, jump: false };
  const state = { left: false, right: false, jump: false, jumpPressed: false };
  let jumpPrev = false;
  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (GAME_KEYS.includes(e.code) && !(e.target instanceof HTMLButtonElement && e.code === 'Space')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    touch.left = touch.right = touch.jump = false;
  });

  function bindButton(el, name) {
    const on = (e) => {
      e.preventDefault();
      touch[name] = true;
      el.classList.add('pressed');
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    };
    const off = (e) => {
      e.preventDefault();
      touch[name] = false;
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function poll() {
    let gl = false, gr = false, gj = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      if (ax < -0.4 || b(14)) gl = true;
      if (ax > 0.4 || b(15)) gr = true;
      if (b(0) || b(1) || b(12)) gj = true;
    }
    state.left = !!(keys.ArrowLeft || keys.KeyA || touch.left || gl);
    state.right = !!(keys.ArrowRight || keys.KeyD || touch.right || gr);
    const j = !!(keys.Space || keys.ArrowUp || keys.KeyW || keys.KeyZ || touch.jump || gj);
    // つぎの こうしんで つかうまで おぼえておく
    state.jumpPressed = state.jumpPressed || (j && !jumpPrev);
    jumpPrev = j;
    state.jump = j;
  }

  function reset() {
    for (const k in keys) keys[k] = false;
    touch.left = touch.right = touch.jump = false;
    state.jumpPressed = false;
    jumpPrev = true; // メニューで おした ボタンで ジャンプしない
  }

  return { state, poll, bindButton, reset };
})();
