export default async ({ game }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
  const info = await game('return await SS.release();');
  const out = [];
  let t = 0;
  for (const want of [0,90,180,280,370,400,440,480,520,600,800]) {
    if (want > t) { await game('await SS.seek(args[0]);', want - t); t = want; }
    out.push(await game(`
      const s = SS.__world.sling, a = s.anchor, p = s.pouch;
      const dx = p.x - a.x, dy = p.y - a.y;
      return { t: args[0], pouchAD: +(Math.hypot(dx,dy)/args[1]).toFixed(5),
               px: +(Math.hypot(dx,dy) * 32.366).toFixed(3), state: s.state };`, want, info.ad));
  }
  say('series', out);
  console.log('### DONE');
};
