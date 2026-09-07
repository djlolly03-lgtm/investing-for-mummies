/** p4-r3-vw.mjs — the visible-width curve: rest -> draw -> release push-in -> arrival open-out. */
export default async ({ game }) => {
  for (const [a, p, tag] of [[0.30, 0.90, 'hit'], [0.55, 1.0, 'over']]) {
    await game('await SS.seed(3); await SS.seek(2600);');
    const rest = await game('const c=SS.__world.camera; return +(2*Math.tan(c.fov*Math.PI/360)*c.position.z*c.aspect).toFixed(3);');
    await game('SS.aim({angle:args[0],power:args[1]}); await SS.seek(600);', a, p);
    const drawn = await game('const c=SS.__world.camera; return +(2*Math.tan(c.fov*Math.PI/360)*c.position.z*c.aspect).toFixed(3);');
    await game('SS.release(); SS.freeze();');
    const row = [];
    for (let t = 0; t <= 900; t += 50) {
      row.push(await game(`const W=SS.__world, c=W.camera; const q=(W.projectiles||[]).filter(x=>!x.dead)[0];
        return { vw:+(2*Math.tan(c.fov*Math.PI/360)*c.position.z*c.aspect).toFixed(2),
                 px: q? +q.body.translation().x.toFixed(2):null, mode: W.rig.mode,
                 g:+((()=>{const v=new (c.position.constructor)(0,0,0); v.project(c); return (1-(v.y*0.5+0.5))*100;})()).toFixed(2) };`));
      row[row.length-1].t = t;
      if (t < 900) await game('await SS.seek(50);');
    }
    console.log(`\n--- ${tag} --- rest=${rest} drawn=${drawn} (+${(((drawn/rest)-1)*100).toFixed(1)}%)`);
    console.log('  ' + row.map(r => `${r.t}:${r.vw}`).join('  '));
    console.log('  ground%H ' + row.map(r => `${r.t}:${r.g}`).join(' '));
    const min = Math.min(...row.map(r => r.vw));
    const below = row.find(r => r.vw <= rest);
    console.log(`  minAfterRelease=${min}  firstBelowRest=${below ? below.t + 'ms' : 'NEVER'}  max=${Math.max(...row.map(r=>r.vw))}`);
  }
};
