/** PW r3 CRITIC — the pictures. Motion is judged from filmstrips, never from a still. */
export default async ({ game, filmstrip, shot }) => {
  // 1. the winning demolition, from the blow onward, at the GAME's own framing
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  await game(`SS.aim({angle:0.30,power:0.90}); return SS.release();`);
  await game(`await SS.seek(460);`);                       // to just before contact (~467-560ms)
  await filmstrip('L1-030x090-impact-to-1200ms', { from: 0, to: 1200, step: 75, cols: 5 });

  // 2. the LIGHT shot: impact at ~492 ms, first authored write at ~808 ms.
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  await game(`SS.aim({angle:0.34,power:0.92}); return SS.release();`);
  await game(`await SS.seek(430);`);
  await filmstrip('L1-034x092-blow-then-the-late-lurch', { from: 0, to: 1200, step: 75, cols: 5 });

  // 3. same shot, camera parked on the struck bay so the delay is unambiguous
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  await game(`SS.aim({angle:0.34,power:0.92}); return SS.release();`);
  await game(`await SS.seek(430); SS.camLock({x:18.2,y:3.4,halfWidth:5.2});`);
  await filmstrip('L1-034x092-LOCKED-bay', { from: 0, to: 1000, step: 62, cols: 5 });

  // 4. late tail — is anything still starting to move long after the blow?
  await game(`SS.freeze(); await SS.loadLevel('l1'); await SS.seed(7); SS.freeze();`);
  await game(`SS.aim({angle:0.34,power:0.92}); return SS.release();`);
  await game(`await SS.seek(1800);`);
  await filmstrip('L1-034x092-tail-1800-3600ms', { from: 0, to: 1800, step: 150, cols: 4 });
};
