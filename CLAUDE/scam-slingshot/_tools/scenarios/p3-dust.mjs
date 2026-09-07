/** How many dust balls does a full l1 collapse actually emit, and how big? */
export default async ({ game, shot, filmstrip }) => {
  await game(`
    await SS.seed(7);
    window.__dust = [];
    const fx = SS.__world.fx;
    const real = fx.smoke.bind(fx);
    fx.smoke = (at, size, n, kind) => { window.__dust.push({ t:+SS.__world.simTime.toFixed(2),
       x:+at.x.toFixed(1), y:+at.y.toFixed(1), size:+(size??1).toFixed(2), n, kind }); return real(at,size,n,kind); };
    window.__imp = { total:0, dusty:0, maxImp:0, ground:0 };
    const ev = await import('/scam-slingshot/src/events.js');
    ev.on('impact', ({impulse, a, b, material}) => {
      window.__imp.total++;
      window.__imp.maxImp = Math.max(window.__imp.maxImp, +impulse.toFixed(2));
      if (a?.tag==='ground'||b?.tag==='ground') window.__imp.ground++;
      if (material==='stone') window.__imp.dusty++;
    });
    await SS.seek(900); SS.aim({angle:0.22,power:1.0}); SS.release();
  `);
  await game('await SS.seek(4000);');
  const d = await game('return { dust: window.__dust, imp: window.__imp };');
  console.log('impacts:', JSON.stringify(d.imp));
  console.log('dust bursts:', d.dust.length);
  for (const x of d.dust.slice(0, 20)) console.log('   ', JSON.stringify(x));
};
