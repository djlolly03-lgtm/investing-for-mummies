/**
 * p0-aimmap.mjs — is the screen-space drag -> aim mapping correct, or are the scenarios stale?
 *
 * The acceptance run (final.mjs) started producing angle 1.6077 rad (straight up) from pixel
 * constants that used to give 0.36 rad. Two candidates: the mapping regressed, or the camera
 * framing moved under P4 and the constants no longer point where they used to.
 *
 * This probe answers it numerically, with no screenshots to interpret:
 *   A. geometry — where the sling anchor actually projects on screen NOW, and where final.mjs's
 *      two hard-coded points land in world space relative to it.
 *   B. round trip — worldToScreen(screenToWorld(px)) == px for a grid across the canvas.
 *   C. inverse   — a fan of pointer drags around the anchor: dragging down-left must fire up-right.
 *   D. monotone  — sweep the drag direction through 180 deg; launch angle must follow smoothly
 *                  and monotonically, with no jumps.
 *   E. agreement — SS.aim({angle,power}) and the pointer path must land on the same pouch.
 *   F. real DOM  — page.mouse (a genuine human path) must agree with SS.dragTo at the same pixels.
 *
 * Camera note: `CameraRig.update()` runs from the FIXED step, so in driven mode (which
 * SS.seed() enters) the camera cannot move between two dragTo calls. Every measurement below
 * therefore shares one byte-identical projection. Do not add a seek() inside the sweeps.
 */
export default async ({ page, game, OUT }) => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const out = {};
  const say = (k, v) => { out[k] = v; console.log(`  ${k}:`, JSON.stringify(v)); };
  const R2D = 180 / Math.PI;

  await game('await SS.seed(3); await SS.seek(1400);');

  // Helpers installed in the page: exact world<->screen using the game's own camera object.
  await game(`
    const w = SS.__world;
    const V3 = w.camera.position.constructor;          // THREE.Vector3, without importing three
    window.__P = {
      rect: () => w.renderer.domElement.getBoundingClientRect(),
      w2s(x, y) {
        const v = new V3(x, y, 0).project(w.camera), r = this.rect();
        return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
      },
      s2w(sx, sy) { const p = w.sling.screenToWorld(sx, sy); return { x: p.x, y: p.y }; },
      anchor: () => ({ x: w.sling.anchor.x, y: w.sling.anchor.y }),
      // launch direction = anchor - pouch (the sling fires opposite the pull)
      shot() {
        const s = w.sling, dx = s.anchor.x - s.pouch.x, dy = s.anchor.y - s.pouch.y;
        return { angle: Math.atan2(dy, dx), drawn: s.drawn, state: s.state,
                 pouch: { x: s.pouch.x, y: s.pouch.y } };
      },
      reset() { const s = w.sling; if (s.state === 'dragging') s.cancelDrag(); return s.state; },
    };
  `);

  // ---------------------------------------------------------------- A. geometry
  say('camera', await game(`
    const c = SS.__world.camera, r = window.__P.rect();
    return { pos: [+c.position.x.toFixed(3), +c.position.y.toFixed(3), +c.position.z.toFixed(3)],
             fov: c.fov, aspect: +c.aspect.toFixed(4),
             canvas: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) } };
  `));
  say('anchorWorld', await game('return window.__P.anchor();'));
  say('anchorScreenPct', await game(`
    const a = window.__P.anchor(), s = window.__P.w2s(a.x, a.y), r = window.__P.rect();
    return { px: [+s.x.toFixed(1), +s.y.toFixed(1)],
             wPct: +((s.x - r.left) / r.width * 100).toFixed(2),
             hPct: +((s.y - r.top) / r.height * 100).toFixed(2) };
  `));
  // Every hard-coded pixel constant in a SHARED scenario, measured against the live anchor.
  say('hardCodedConstants', await game(`
    const r = window.__P.rect(), a = window.__P.anchor(), o = [];
    const pts = [
      ['final.mjs      grab', 0.300, 0.600], ['final.mjs      drag', 0.155, 0.735],
      ['p0-hook-audit  grab', 0.300, 0.600], ['p0-hook-audit  drag', 0.155, 0.735],
      ['motion.mjs     grab', 0.300, 0.620], ['motion.mjs     drag', 0.170, 0.740],
      ['realinput.mjs  down', 0.220, 0.600], ['realinput.mjs  end ', 0.156, 0.760],
    ];
    for (const [nm, fx, fy] of pts) {
      const p = window.__P.s2w(r.left + r.width * fx, r.top + r.height * fy);
      const dx = p.x - a.x, dy = p.y - a.y;
      // what the sling will actually do with it
      window.__P.reset();
      SS.dragTo(r.left + r.width * fx, r.top + r.height * fy);
      const s = window.__P.shot();
      o.push({ point: nm, screenPct: [+(fx * 100).toFixed(1), +(fy * 100).toFixed(1)],
               world: [+p.x.toFixed(3), +p.y.toFixed(3)],
               fromAnchor: [+dx.toFixed(3), +dy.toFixed(3)],
               dist: +Math.hypot(dx, dy).toFixed(3),
               rearHemisphere: dx <= 0.10,
               resultingAngleDeg: +(s.angle * 180 / Math.PI).toFixed(2) });
    }
    window.__P.reset();
    return o;
  `));

  // ---------------------------------------------------------------- B. round trip
  say('roundTripMaxErrPx', await game(`
    const r = window.__P.rect(); let worst = 0, at = null;
    for (let fx = 0.1; fx <= 0.9; fx += 0.1) for (let fy = 0.1; fy <= 0.9; fy += 0.1) {
      const sx = r.left + r.width * fx, sy = r.top + r.height * fy;
      const w = window.__P.s2w(sx, sy), b = window.__P.w2s(w.x, w.y);
      const e = Math.hypot(b.x - sx, b.y - sy);
      if (e > worst) { worst = e; at = [+fx.toFixed(2), +fy.toFixed(2)]; }
    }
    return { maxErrPx: +worst.toFixed(6), at };
  `));

  // ---------------------------------------------------------------- C. inverse fan
  // Eight pointer offsets around the anchor's SCREEN position. Screen y grows downward, so a
  // drag to screen-down-left (dx<0, dy>0) must fire up-right (angle in (0, pi/2)).
  say('inverseFan', await game(`
    const P = window.__P, a = P.anchor(), c = P.w2s(a.x, a.y), rows = [];
    const RAD = 110;   // px
    for (let k = 0; k < 8; k++) {
      const th = k * Math.PI / 4;                       // screen-space drag direction
      const dx = Math.cos(th) * RAD, dy = Math.sin(th) * RAD;   // dy > 0 = down the screen
      P.reset();
      P.rect(); // no-op, keeps the read next to the drag
      SS.dragTo(c.x + dx * 0.15, c.y + dy * 0.15);      // grab first, near the pouch
      SS.dragTo(c.x + dx, c.y + dy);
      const s = P.shot();
      rows.push({ dragScreen: [Math.round(dx), Math.round(dy)],
                  dragDirDeg: Math.round(th * 180 / Math.PI),
                  angleDeg: +(s.angle * 180 / Math.PI).toFixed(2),
                  drawn: +s.drawn.toFixed(3),
                  pouchFromAnchor: [+(s.pouch.x - a.x).toFixed(3), +(s.pouch.y - a.y).toFixed(3)] });
    }
    P.reset();
    return rows;
  `));

  // ---------------------------------------------------------------- D. monotone sweep
  // Drag the pointer around an arc BEHIND the anchor (screen-left half) and watch the launch
  // angle. It must sweep smoothly with no discontinuity and be strictly monotone.
  say('monotoneSweep', await game(`
    const P = window.__P, a = P.anchor(), c = P.w2s(a.x, a.y), rows = [];
    const RAD = 120;
    for (let deg = -80; deg <= 80; deg += 10) {
      const th = deg * Math.PI / 180;                   // measured from screen-left (drag back)
      const dx = -Math.cos(th) * RAD, dy = Math.sin(th) * RAD;
      P.reset();
      SS.dragTo(c.x + dx * 0.15, c.y + dy * 0.15);
      SS.dragTo(c.x + dx, c.y + dy);
      const s = P.shot();
      rows.push({ dragDeg: deg, angleDeg: +(s.angle * 180 / Math.PI).toFixed(2), drawn: +s.drawn.toFixed(3) });
    }
    P.reset();
    const angs = rows.map(r => r.angleDeg);
    let mono = true, maxJump = 0;
    for (let i = 1; i < angs.length; i++) {
      const d = angs[i] - angs[i - 1];
      if (d <= 0) mono = false;
      maxJump = Math.max(maxJump, Math.abs(d));
    }
    return { rows, strictlyIncreasing: mono, maxStepDeg: +maxJump.toFixed(2) };
  `));

  // ---------------------------------------------------------------- E. aim() vs pointer path
  say('aimVsPointer', await game(`
    const P = window.__P, rows = [];
    for (const ang of [0.20, 0.36, 0.52, 0.80, 1.10]) {
      P.reset();
      SS.aim({ angle: ang, power: 0.9 });
      const A = P.shot();
      const px = P.w2s(A.pouch.x, A.pouch.y);           // project the exact pouch aim() chose
      P.reset();
      SS.dragTo(px.x, px.y); SS.dragTo(px.x, px.y);     // grab + move, real pointer maths
      const B = P.shot();
      rows.push({ wanted: ang,
                  aimDeg: +(A.angle * 180 / Math.PI).toFixed(3),
                  dragDeg: +(B.angle * 180 / Math.PI).toFixed(3),
                  angleErrDeg: +Math.abs((A.angle - B.angle) * 180 / Math.PI).toFixed(4),
                  pouchErrWorld: +Math.hypot(A.pouch.x - B.pouch.x, A.pouch.y - B.pouch.y).toFixed(5),
                  drawnErr: +Math.abs(A.drawn - B.drawn).toFixed(5) });
    }
    P.reset();
    return rows;
  `));

  // ---------------------------------------------------------------- F. genuine DOM pointer
  // page.mouse is the human path: real pointerdown/pointermove through main.js's listeners.
  // NOTE: pointer-UP fires the shot and the sling goes to 'recoil' with no ammo, so every
  // iteration must start from a freshly rebuilt level. Getting this wrong is exactly the class
  // of bug this whole probe is about: the second measurement silently reads a spent sling.
  const dom = [];
  for (const [dx, dy] of [[-40, 40], [-110, 60], [-150, 20], [-90, 130]]) {
    await game('await SS.seed(3); await SS.seek(1400);');
    const anchorPx = await game('const a = window.__P.anchor(); return window.__P.w2s(a.x, a.y);');
    await game('window.__P.reset();');
    await page.mouse.move(anchorPx.x, anchorPx.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(anchorPx.x + dx * i / 6, anchorPx.y + dy * i / 6);
    const s = await game('return window.__P.shot();');
    await page.mouse.up();
    // same pixels, same fresh level, through the hook instead
    await game('await SS.seed(3); await SS.seek(1400);');
    const viaHook = await game(`
      window.__P.reset();
      SS.dragTo(args[0], args[1]); SS.dragTo(args[2], args[3]);
      return window.__P.shot();
    `, anchorPx.x, anchorPx.y, anchorPx.x + dx, anchorPx.y + dy);
    dom.push({ dragPx: [dx, dy], slingState: s.state,
               domAngleDeg: +(s.angle * R2D).toFixed(3), hookAngleDeg: +(viaHook.angle * R2D).toFixed(3),
               diffDeg: +Math.abs((s.angle - viaHook.angle) * R2D).toFixed(4),
               domDrawn: +s.drawn.toFixed(4), hookDrawn: +viaHook.drawn.toFixed(4) });
  }
  say('domVsHook', dom);

  // ---------------------------------------------------------------- G. exitSpeed vs speed
  // Is `exitSpeed 58.0` next to `speed 23.2` two quantities, or a bug? Measure the projectile.
  const sp = [];
  for (const [ang, pow] of [[0.52, 1.0], [0.36, 0.6]]) {
    await game('await SS.seed(3); await SS.seek(1400);');
    const r = await game(`
      window.__P.reset();
      SS.aim({ angle: args[0], power: args[1] });
      const rel = SS.release();
      const a = SS.__world.projectiles.filter(p => p.launched).pop();
      const v0 = a.body.linvel();
      const at = [];
      for (const ms of [0, 50, 150, 400]) {
        if (ms) await SS.seek(ms - (at.length ? at[at.length-1].t : 0));
        const p = SS.__world.projectiles.filter(x => x.launched).pop();
        const v = p.body.linvel();
        at.push({ t: ms, speed: +Math.hypot(v.x, v.y).toFixed(2) });
      }
      return { rel, atLaunchTick0: +Math.hypot(v0.x, v0.y).toFixed(3), decay: at };
    `, ang, pow);
    sp.push({ aim: [ang, pow], claimedSpeed: r.rel.speed, claimedExitSpeed: r.rel.exitSpeed,
              claimedKick: r.rel.kick, ratio: +(r.rel.exitSpeed / r.rel.speed).toFixed(4),
              measuredAtRelease: r.atLaunchTick0, decayProfile: r.decay });
  }
  say('speedVsExitSpeed', sp);

  await fs.writeFile(path.join(OUT, 'aimmap.json'), JSON.stringify(out, null, 2));
};
