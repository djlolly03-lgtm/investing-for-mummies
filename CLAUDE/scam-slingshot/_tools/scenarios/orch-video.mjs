/** Deterministic 30fps playthrough recorder: draw -> hold -> release -> flight -> collapse -> settle. */
export default async ({ page, game, state, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const dir = path.join(OUT, 'frames'); await fs.mkdir(dir, { recursive: true });
  let n = 0;
  const frame = async () => page.screenshot({ path: path.join(dir, `f${String(n++).padStart(4,'0')}.png`) });

  await game('await SS.restart(); await SS.seed(3); SS.audioMute(true);');
  await game('SS.freeze();');
  for (let i = 0; i < 8; i++) await frame();                       // beat on the level
  for (let i = 1; i <= 22; i++) {                                   // draw back
    await game('SS.aim({angle: 0.16 + 0.14*args[0], power: args[0]});', i / 22);
    await frame();
  }
  for (let i = 0; i < 10; i++) await frame();                       // hold at full draw
  await game('SS.resume(); SS.release();');
  for (let i = 0; i < 175; i++) { await game('await SS.seek(33);'); await frame(); }  // ~5.8s
  console.log('FRAMES:', n, 'STATE:', JSON.stringify(await state()));
};
