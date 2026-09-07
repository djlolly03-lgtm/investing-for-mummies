export default async ({ game }) => {
  await game('await SS.seed(7); await SS.seek(2600);');
  const o = await game(`
    const W = SS.__world;
    return {
      villainKeys: W.villains.map(v=>({k:Object.keys(v), alive:v.alive, t:v.body.translation(), w:v.w, h:v.h, r:v.radius, tag:v.tag})),
      levelKeys: W.level ? Object.keys(W.level) : null,
      levelId: W.level && W.level.id,
      blocks: W.blocks.map(b=>({tag:b.tag, mat:b.matName, w:b.w, h:b.h, x:+b.body.translation().x.toFixed(2), y:+b.body.translation().y.toFixed(2), fixed:b.fixed})),
      sling: { keys: Object.keys(W.sling), anchor: W.sling.anchor, state: W.sling.state },
      rigLead: W.rig._lead, rigStand: W.rig._stand, standBoxes: W.rig._standBoxes, compose: W.rig.compose, mode: W.rig.mode,
    };`);
  console.log(JSON.stringify(o, null, 2));
};
