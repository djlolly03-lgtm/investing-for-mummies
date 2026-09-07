/** PW r1 critic — does a SURVIVED landing emit dust, and for which materials? */
export default async ({ game, shot, filmstrip }) => {
  for (const m of ['wood','glass']) {
    const info = await game(`
      const m = args[0];
      SS.freeze(); await SS.loadLevel('_crit-pw-tilt');
      const w = SS.__world;
      const b = w.blocks.find(z=>z.matName===m);
      for (const o of w.blocks) if (o!==b) o.body.setTranslation({x:o.body.translation().x,y:-80,z:0}, true);
      b.damage=0; b.crackStep=-1;
      b.body.setTranslation({x:12,y:b.h/2+1.60,z:0}, true);
      b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
      SS.camLock({ x: 12, y: 1.2, halfWidth: 3.2 });
      return { mat:m, fxKeys: Object.keys(w.fx || {}) };
    `, m);
    console.log(JSON.stringify(info));
    await filmstrip(`landing-${m}`, { from: 340, to: 700, step: 40, cols: 5 });
  }
};
