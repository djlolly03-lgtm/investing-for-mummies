/**
 * pw-r3b-look.mjs — LOOK at the collapse the energy ledger produces.
 *
 * Two filmstrips of the same canonical l1 shot at the game's own framing: the 0-1200 ms
 * beat where the tower is struck and the frame goes over, and the 1200-3000 ms settle.
 * `filmstrip()`'s `from` is a RELATIVE seek (PW r1 §3), so the level is reloaded before
 * each strip.
 */
async function setup(game, ang, pow) {
  await game(`SS.freeze();`);
  await game(`await SS.loadLevel('l1');`);
  await game(`await SS.seed(4242);`);
  await game(`await SS.seek(1500);`);
  return game(`return SS.aimAndFire(args[0], args[1]);`, ang, pow);
}

export default async ({ game, filmstrip, state }) => {
  const [ang, pow] = [0.30, 0.90];

  await setup(game, ang, pow);
  await filmstrip('collapse-0-1200', { from: 0, to: 1200, step: 80, cols: 8 });

  await setup(game, ang, pow);
  await filmstrip('collapse-1200-3000', { from: 1200, to: 3000, step: 150, cols: 7 });

  await setup(game, ang, pow);
  await game('await SS.seek(6000);');
  console.log('settled:', JSON.stringify(await state()));
};
