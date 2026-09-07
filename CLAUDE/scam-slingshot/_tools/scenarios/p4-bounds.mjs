export default async ({ game }) => {
  await game('await SS.seed(3); await SS.seek(1200);');
  console.log('BOUNDS', JSON.stringify(await game(`
    const r = SS.__world.rig;
    return { bounds: r.bounds, aim: r._aim, extent: r._extent, mode: r.mode,
             sling: SS.__world.sling?.anchor?.x };`)));
};
