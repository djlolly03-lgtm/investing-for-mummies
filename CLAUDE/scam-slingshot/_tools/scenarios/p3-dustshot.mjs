/** Force one dust ball and one flash at a known point; look at them directly. */
export default async ({ game, filmstrip }) => {
  await game(`
    await SS.seed(7); await SS.seek(600);
    SS.camLock({x:18,y:3.0,halfWidth:5.0});
    document.getElementById('ui')?.style.setProperty('display','none');
    const fx = SS.__world.fx;
    fx.smoke({x:16.6,y:1.0,z:0}, 1.40, 2, 'earth');
    fx.smoke({x:19.4,y:2.6,z:0}, 2.20, 3, 'stone');
    fx.flash({x:19.4,y:2.6,z:0}, 1.2);
    fx.burst('pebble', {x:19.4,y:2.6,z:0}, 9, { cone: 1.15, scale: 0.7, dir:{x:1,y:0.3} });
  `);
  await filmstrip('forced-dust', { from: 0, to: 500, step: 100, cols: 3 });
  console.log(await game('return { smokeLive: SS.__world.fx.pools.smoke.live, z: SS.__world.fx.pools.smoke.p.z[0], renderOrder: SS.__world.fx.pools.smoke.mesh.renderOrder, visible: SS.__world.fx.pools.smoke.mesh.visible, count: SS.__world.fx.pools.smoke.mesh.count };'));
};
