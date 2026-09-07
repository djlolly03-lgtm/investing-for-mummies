/**
 * PW r1 CRITIC — Weight & gravity. Visual evidence pack.
 *
 * Every drop below is built by LIFTING the three cubes of _crit-pw-tilt to an identical
 * height with identical rotation and zero velocity, so the only variable in the frame is
 * the material. camLock is used for the drop rigs (they are material-read frames, not
 * composition frames); the l1 strips are shot at the game's own framing.
 */
const LIFT = (fall, rot = 0.45) => `
  SS.freeze();
  await SS.loadLevel('_crit-pw-tilt');
  const w = SS.__world;
  for (const b of w.blocks) {
    b.damage = 0; b.crackStep = -1; b.scarFloor = 0; b.lastImpulse = 0;
    b.body.setTranslation({ x: b.body.translation().x, y: b.h/2 + ${fall}, z: 0 }, true);
    const h = ${rot}/2;
    b.body.setRotation({ x:0, y:0, z: Math.sin(h), w: Math.cos(h) }, true);
    b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
  }
  SS.camLock({ x: 14, y: 2.0, halfWidth: 9 });
  return w.blocks.map(b => b.matName);
`;

export default async ({ game, shot, filmstrip, state }) => {
  // ---------- 1. the material read: 1.6 m onto grass, all three survive-or-not ----------
  console.log('rig A mats', await game(LIFT(1.60)));
  await shot('dropA-1p6m-t0');
  await filmstrip('dropA-1p6m-wood-glass-stone', { from: 0, to: 1300, step: 100, cols: 4 });
  console.log('rig A after', JSON.stringify(await game(`
    const w = SS.__world;
    return { blocks: w.blocks.map(b=>b.matName), debris: w.debris.length };`)));
  await shot('dropA-1p6m-settled');

  // ---------- 2. the same rig from 2.6 m ----------
  console.log('rig B mats', await game(LIFT(2.60)));
  await filmstrip('dropB-2p6m-wood-glass-stone', { from: 0, to: 1300, step: 100, cols: 4 });
  console.log('rig B after', JSON.stringify(await game(`
    const w = SS.__world;
    return { blocks: w.blocks.map(b=>b.matName), debris: w.debris.length };`)));
  await shot('dropB-2p6m-settled');

  // ---------- 3. arc weight, at the game's own framing ----------
  await game(`SS.camUnlock(); SS.freeze(); await SS.loadLevel('l1'); await SS.seed(4242); SS.aim({ angle: 0.30, power: 0.90 });`);
  await shot('l1-aim');
  await game(`SS.release();`);
  await filmstrip('l1-release-arc', { from: 0, to: 480, step: 40, cols: 4 });

  // ---------- 4. the collapse: does the mass read ----------
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(4242); SS.aim({ angle: 0.30, power: 0.90 }); SS.release(); await SS.seek(430);`);
  await shot('l1-impact');
  await filmstrip('l1-collapse', { from: 0, to: 1320, step: 120, cols: 4 });
  await game(`await SS.seek(2600);`);
  await shot('l1-settled');
  console.log('l1 final', JSON.stringify(await state()));

  // ---------- 5. one clean mid-collapse still for the blind pair ----------
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(4242); SS.aim({ angle: 0.30, power: 0.90 }); SS.release(); await SS.seek(900);`);
  await shot('l1-midcollapse-blindcandidate');
  await game(`await SS.seek(300);`);
  await shot('l1-midcollapse-b');
};
