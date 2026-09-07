/**
 * p3-r8-nanshot.mjs — is the mid-flight camera NaN survivable for a P3 capture?
 * (The NaN itself is camera.js's and is reported to the orchestrator; this only checks that
 * SS.camLock() gives P3 a usable lens while it is live.)
 */
export default async ({ game, shot }) => {
  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');
  await game('return SS.aimAndFire(0.26, 0.95);');
  await game('return SS.camLock({ x: 18.0, y: 3.0, halfWidth: 7.0 });');
  await game('await SS.seek(300);');
  console.log('t+300 LOCKED', JSON.stringify(await game(
    'const c = SS.__world.camera; return { pos: c.position.toArray(), mode: SS.__world.rig.mode };')));
  await shot('locked-fire+300ms');
  await game('await SS.seek(400);');
  await shot('locked-fire+700ms');
};
