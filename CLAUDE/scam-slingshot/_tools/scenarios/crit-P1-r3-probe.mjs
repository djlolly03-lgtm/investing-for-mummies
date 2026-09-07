/**
 * crit-P1-r3-probe.mjs — CRITIC discovery probe (round 3, P1).
 * Purely structural: what is in the scene at the release instant, so the real
 * measurement scenario can mask exactly the right thing and diff pixels.
 */
export default async ({ game, state, OUT }) => {
  const say = (k, v) => console.log('### ' + k + ' ' + JSON.stringify(v));

  await game('SS.seed(11); await SS.seek(2000);');
  say('state', await state());

  say('world_keys', await game('return Object.keys(SS.__world);'));
  say('fx_keys', await game('return SS.__world.fx ? Object.keys(SS.__world.fx) : null;'));
  say('fx_pools', await game(`
    const f = SS.__world.fx; if (!f || !f.pools) return null;
    return Object.keys(f.pools).map(k => ({ k, max: f.pools[k].max,
      hasMesh: !!f.pools[k].mesh, type: f.pools[k].mesh?.type ?? null,
      geo: f.pools[k].mesh?.geometry?.type ?? null }));
  `));
  say('scene_children', await game(`
    const sc = SS.__world.scene; if (!sc) return null;
    return sc.children.map(c => ({ name: c.name || '(unnamed)', type: c.type,
      visible: c.visible, kids: c.children.length }));
  `));
  say('sling_keys', await game('return Object.keys(SS.__world.sling);'));

  // fire and look again at t=0 and t=100
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400); await SS.release();');
  for (const t of [0, 50, 100]) {
    if (t) await game('await SS.seek(args[0]);', 50);
    say('after_release_t' + t, await game(`
      const w = SS.__world, sc = w.scene;
      const out = { sceneKids: sc.children.map(c => ({ n: c.name || '(unnamed)', t: c.type,
        v: c.visible, k: c.children.length })) };
      if (w.fx && w.fx.pools) {
        out.pools = {};
        for (const k of Object.keys(w.fx.pools)) {
          const P = w.fx.pools[k].p, max = w.fx.pools[k].max;
          let n = 0; for (let i=0;i<max;i++) if (P.life[i] > 0) n++;
          out.pools[k] = n;
        }
      }
      if (w.fx) out.fxOwnKeys = Object.keys(w.fx);
      return out;
    `));
  }
  console.log('### DONE');
};
