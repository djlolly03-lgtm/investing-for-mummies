/** P4 — "translation stops within 600 ms of the last body sleeping". Measured, not asserted. */
const S = `
  const w=SS.__world, c=w.camera;
  return { t:+(w.simTime*1000).toFixed(0), mode:w.rig.mode,
           x:c.position.x, y:c.position.y, z:c.position.z, shake:w.rig.shake,
           awake:w.entities.filter(e=>e.body&&!e.dead&&e.body.isDynamic?.()&&!e.body.isSleeping()).length };
`;
export default async ({ game, filmstrip, shot }) => {
  for (const [ang, pow, tag] of [[0.30,0.75,'clear'],[0.50,0.60,'miss']]) {
    await game('await SS.seed(3); await SS.seek(1400);');
    await game(`SS.aim({angle:${ang},power:${pow}}); await SS.seek(350); SS.release();`);
    const rows = [];
    for (let i = 0; i < 220; i++) { rows.push(await game(S)); await game('await SS.seek(25);'); }
    let lastAwake = null, lastMove = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].awake > 0) lastAwake = rows[i].t;
      const d = Math.abs(rows[i].x - rows[i-1].x) + Math.abs(rows[i].y - rows[i-1].y)
              + Math.abs(rows[i].z - rows[i-1].z);
      if (d > 1e-6) lastMove = rows[i].t;
    }
    const peakShake = Math.max(...rows.map(r => r.shake));
    // shake decay: from peak to below 0.2/2.4 of full
    const pi = rows.findIndex(r => r.shake === peakShake);
    let decayMs = null;
    for (let i = pi; i < rows.length; i++) if (rows[i].shake * 2.4 < 0.2) { decayMs = rows[i].t - rows[pi].t; break; }
    console.log(tag, JSON.stringify({
      lastBodyAwakeMs: lastAwake, lastCameraMoveMs: lastMove,
      cameraStopsAfterQuietMs: lastMove !== null && lastAwake !== null ? lastMove - lastAwake : null,
      peakShakePctH: +(peakShake * 2.4).toFixed(2), shakeToUnder02PctH_ms: decayMs,
      endMode: rows[rows.length-1].mode }));
  }
  // and a filmstrip of the return itself
  await game('await SS.seed(3); await SS.seek(1400);');
  await game('SS.aim({angle:0.50,power:0.60}); await SS.seek(350); SS.release();');
  await game('await SS.seek(2600);');
  await filmstrip('return', { from: 0, to: 1400, step: 100, cols: 5 });
  await shot('back-at-sling');
};
