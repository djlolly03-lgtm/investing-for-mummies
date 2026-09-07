/** Frame cost of a full structure collapse: draw calls, tris, body count, frame time. */
export default async ({ game }) => {
  await game('await SS.seed(7); await SS.seek(900);');
  console.log('at rest  ', JSON.stringify(await game('return SS.perf();')));
  await game('SS.aim({angle:0.22,power:1.0}); SS.release();');
  let worst = null, worstT = 0;
  for (let t = 0; t < 4000; t += 200) {
    await game('await SS.seek(200);');
    const p = await game('return { ...SS.perf(), debris: SS.__world.debris.length, particles: SS.__world.fx.liveCount };');
    if (!worst || p.drawCalls > worst.drawCalls) { worst = p; worstT = t + 200; }
    if (t % 800 === 0) console.log(`  +${t + 200}ms`, JSON.stringify(p));
  }
  console.log('PEAK draw calls at +' + worstT + 'ms:', JSON.stringify(worst));

  // real-time frame pacing, un-driven, through the same collapse
  const fps = await game(`
    await SS.seed(7); await SS.seek(900);
    SS.aim({angle:0.22,power:1.0}); SS.release();
    SS.resume();
    const dts = [];
    let last = performance.now();
    await new Promise(res => {
      const n = 200;
      let i = 0;
      const tick = () => {
        const now = performance.now(); dts.push(now - last); last = now;
        if (++i < n) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    dts.sort((a,b)=>a-b);
    return { median: +dts[Math.floor(dts.length/2)].toFixed(2),
             p99: +dts[Math.floor(dts.length*0.99)].toFixed(2),
             max: +dts[dts.length-1].toFixed(2),
             over100ms: dts.filter(d=>d>100).length };
  `);
  console.log('frame times (ms) over 200 rAF frames of the live collapse:', JSON.stringify(fps));
};
