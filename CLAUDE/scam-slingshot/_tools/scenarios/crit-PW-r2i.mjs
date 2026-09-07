/** crit-PW-r2i.mjs — PW r2: single full-frame stills at the game's own framing, for the blind A/B. */
export default async ({ game, shot }) => {
  for (const [name, ms] of [['lean-340', 800], ['lean-420', 880], ['lean-560', 1020], ['settled', 4200]]) {
    await game(`SS.freeze();`);
    await game(`await SS.loadLevel('l1');`);
    await game(`await SS.seed(4242);`);
    await game(`return SS.aimAndFire(0.30, 0.90);`);
    await game(`await SS.seek(args[0]);`, ms);
    await shot(name);
  }
};
