/**
 * realinput.mjs — drive the game with genuine DOM pointer events, not the SS input hooks.
 * This is the path a human uses; if it diverges from SS.dragTo the hooks are lying.
 *
 * Its pixels are derived from the live sling and the live camera (`aimPx`), not hard-coded.
 * The constants it used to carry (0.22 W down to 0.156 W) sat in FRONT of the fork once P4
 * re-solved the framing — 2.8 world units forward of the anchor — so this scenario spent a
 * round "proving" that the human path and the hook path agree on a shot neither of them was
 * asked for: both were being folded onto the rear-hemisphere clamp at ~92 deg, straight up.
 * Agreement between two paths is worthless as evidence unless the shot is the intended one.
 */
export default async ({ page, shot, game, state, aimPx }) => {
  const R2D = 180 / Math.PI;
  // POWER is 0.85, not 0.95: this scenario runs on the WALL CLOCK, so the camera is still
  // easing between the round trip that derives a pixel and the mouse.move that uses it. At 0.95
  // that few-millisecond drift is enough to push the pouch past maxStretch and trip the RADIUS
  // clamp, which pins the draw at 1.0 and bends the angle by ~2.4 deg. Leaving headroom keeps
  // the human path measuring the human path instead of measuring a clamp.
  const ANGLE = 0.42, POWER = 0.85;

  await game('await SS.seed(3); await SS.seek(1400); SS.resume();');
  console.log('  before:', JSON.stringify(await state()));

  // The human path: press at the pouch, pull to the shot, let go.
  // NOTE: this scenario runs on the WALL CLOCK (SS.resume above), and the camera pulls back as
  // the draw builds — so the pixel for a given shot MOVES during the drag. Re-derive it at every
  // step, exactly as a human's eye does, instead of interpolating toward a pixel measured before
  // the camera moved.
  const grab = await aimPx(ANGLE, 0);
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  console.log('  onDown:', JSON.stringify(await game(
    'return { sling: SS.__world.sling.state, drawn:+SS.__world.sling.drawn.toFixed(3) };')));
  for (let i = 1; i <= 8; i++) {
    const p = await aimPx(ANGLE, POWER * i / 8);
    await page.mouse.move(p.x, p.y);
  }
  // Let the draw-framing spring settle, then make one last corrected move — the same thing a
  // player's eye does when the view stops sliding under their finger.
  await new Promise(r => setTimeout(r, 300));
  const settled = await aimPx(ANGLE, POWER);
  await page.mouse.move(settled.x, settled.y);

  const readSling = `
    const s = SS.__world.sling;
    return { sling: s.state, drawn: +s.drawn.toFixed(3),
             pouch: { x: +s.pouch.x.toFixed(5), y: +s.pouch.y.toFixed(5) },
             angleDeg: +(Math.atan2(s.anchor.y - s.pouch.y, s.anchor.x - s.pouch.x) * 180 / Math.PI).toFixed(3),
             clamped: { ...s.clamped } };`;
  const drawn = await game(readSling);
  console.log('  dragged:', JSON.stringify(drawn), ' wantedDeg:', (ANGLE * R2D).toFixed(2));
  // The DOM path is only a test of the DOM path if it produced the shot it was aiming at.
  if (drawn.clamped.hemisphere || Math.abs(drawn.angleDeg - ANGLE * R2D) > 2.0) {
    throw new Error(`realinput.mjs: the human path did not draw the shot it asked for: ${JSON.stringify(drawn)}`);
  }

  /**
   * The comparison this file is named for, which it never actually performed: same sling, same
   * camera, same pixel — once through the DOM listeners and once through SS.dragTo. If the
   * hooks took a different code path to the pointer events, it shows up here.
   *
   * FREEZE FIRST. Two calls a CDP round trip apart see a camera that has moved in between, and
   * the same pixel then unprojects to a genuinely different world point — that is the camera
   * doing its job, not the paths disagreeing, but it makes the comparison unfalsifiable. On a
   * 1280x720 run the artefact is ~0.004 world units; at --mobile, where the camera sits ~104
   * units back and every pixel is worth ~3x more world, it is 0.25 units and 5.8 deg — big
   * enough to look exactly like a real mapping bug. Freezing pins ONE projection for both.
   */
  await game('SS.freeze();');
  const frozenPx = await aimPx(ANGLE, POWER);          // derived under the frozen camera
  await page.mouse.move(frozenPx.x, frozenPx.y);       // human path, frozen camera
  const domFrozen = await game(readSling);
  const viaHook = await game(`SS.dragTo(args[0], args[1]); ${readSling}`, frozenPx.x, frozenPx.y);
  await game('SS.resume();');
  const diverge = {
    angleDiffDeg: +Math.abs(domFrozen.angleDeg - viaHook.angleDeg).toFixed(5),
    pouchDiffWorld: +Math.hypot(domFrozen.pouch.x - viaHook.pouch.x, domFrozen.pouch.y - viaHook.pouch.y).toFixed(6),
    drawnDiff: +Math.abs(domFrozen.drawn - viaHook.drawn).toFixed(5),
  };
  console.log('  domVsHook (camera frozen):', JSON.stringify(diverge));
  if (diverge.angleDiffDeg > 0.01 || diverge.pouchDiffWorld > 1e-4) {
    throw new Error(`realinput.mjs: SS.dragTo and the DOM pointer path DISAGREE: ${JSON.stringify({ dom: domFrozen, hook: viaHook, diverge })}`);
  }

  await shot('real-drag');
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 60));
  console.log('  afterUp:', JSON.stringify(await state()));

  // mid-air ability via a tap, at the middle of the CANVAS — a hard-coded pixel here is off
  // screen entirely at --mobile (390x844), which would silently test nothing.
  await new Promise(r => setTimeout(r, 260));
  const mid = await game(`
    const r = SS.__world.renderer.domElement.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  `);
  await page.mouse.click(mid.x, mid.y);
  await new Promise(r => setTimeout(r, 60));
  console.log('  projectiles:', JSON.stringify(await game('return SS.__world.projectiles.filter(p=>!p.dead).length;')));

  // keyboard: R restarts
  await page.keyboard.press('KeyR');
  await new Promise(r => setTimeout(r, 400));
  console.log('  afterR:', JSON.stringify(await state()));
  console.log('  errors:', JSON.stringify(await game('return SS.errors.map(e=>e.text);')));
};
