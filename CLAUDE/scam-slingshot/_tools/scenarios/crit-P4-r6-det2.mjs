/** crit-P4-r6-det2 — reproduce run-1's quiet sequence exactly, twice, and compare. */
const CAM = `const c=SS.__world.camera, v=2*Math.tan(c.fov*Math.PI/360)*c.position.z*c.aspect;
  return { x:+c.position.x.toFixed(6), y:+c.position.y.toFixed(6), z:+c.position.z.toFixed(6), vw:+v.toFixed(4), tick:SS.tick(), phase:(await SS.state()).phase, score:(await SS.state()).score };`;
export default async ({ game, dragShot, OUT }) => {
  const fs = await import('node:fs/promises'); const path = await import('node:path');
  const R = {};
  const quietRun = async (label) => {
    await game('await SS.restart(); SS.seed(11); await SS.seek(2000);');
    await dragShot(0.30, 0.90, { steps: 10 });
    await game('SS.release(); await SS.seek(600);');
    const rows = [];
    for (let t = 600; t <= 4200; t += 100) { rows.push({ t, ...(await game(CAM)) }); await game('await SS.seek(100);'); }
    R[label] = rows;
    return rows[rows.length-1];
  };
  await game('await SS.loadLevel("l1");');
  const a = await quietRun('A');
  const b = await quietRun('B');
  // now with the onImpact monkey patch installed, as run 1 had
  await game(`const W=SS.__world; const B=W.blocks[0].constructor;
    if(!B.__critPatched){ const o=B.prototype.onImpact; B.prototype.onImpact=function(){ return o.apply(this,arguments); }; B.__critPatched=true; } return true;`);
  const c = await quietRun('C');
  R.summary = { A: a, B: b, C_patched: c };
  await fs.writeFile(path.join(OUT,'DET2.json'), JSON.stringify(R,null,2));
  console.log(JSON.stringify(R.summary, null, 2));
};
