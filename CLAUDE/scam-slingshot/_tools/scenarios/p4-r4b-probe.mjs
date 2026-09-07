/**
 * p4-r4b-probe.mjs — read-only geometry probe for the round-4 builder.
 * What does the aim solve actually see, and where does the real top of the level land?
 */
export default async ({ game }) => {
  const out = await game(`
    const W = SS.__world, cam = W.camera, rig = W.rig;
    await SS.seed(3); await SS.seek(2600);
    const V3 = cam.position.constructor;
    const proj = (x, y, z) => { const v = new V3(x, y, z || 0); v.project(cam);
      return { w: +((v.x*0.5+0.5)*100).toFixed(2), h: +((1-(v.y*0.5+0.5))*100).toFixed(2) }; };
    const e = rig.measureLevel();
    const a = rig.aimFraming();
    // the REAL top: live bodies, rotation included, villain heads included
    let realTop = -Infinity, who = null;
    for (const b of W.blocks) if (!b.dead) {
      const t = b.body.translation(), r = b.body.rotation();
      const ang = Math.atan2(2*(r.w*r.z+r.x*r.y), 1-2*(r.y*r.y+r.z*r.z));
      const hh = (b.w*Math.abs(Math.sin(ang)) + b.h*Math.abs(Math.cos(ang)))/2;
      if (t.y + hh > realTop) { realTop = t.y + hh; who = 'block ' + b.mat; }
    }
    for (const v of W.villains) if (v.alive) {
      const t = v.body.translation();
      const h = (v.radius || 0.6) + 0.35;                 // head + prop
      if (t.y + h > realTop) { realTop = t.y + h; who = 'villain ' + v.type; }
    }
    // where does the visible mesh top actually sit? use the render bbox of the level group
    const box = new (Object.getPrototypeOf(cam).constructor === Function ? Object : Object)();
    return {
      extent: e, aim: { vw:+a.vw.toFixed(3), vh:+a.vh.toFixed(3), cx:+a.cx.toFixed(3), cy:+a.cy.toFixed(3) },
      aspect: +cam.aspect.toFixed(4),
      groundPct: rig.groundPct(),
      realTop: +realTop.toFixed(3), realTopWho: who,
      realTopPctH: proj(0, realTop).h,
      solvedTopPctH: proj(0, e.top).h,
      skyRuleBinds: (e.top / (rig.groundPct() - 0.400)) > a.vh,
      minVhIfGround75: +(e.top / (0.75 - 0.400)).toFixed(3),
      minVhNow: +(e.top / (rig.groundPct() - 0.400)).toFixed(3),
      levelBlocks: W.level.blocks.length,
      rots: W.level.blocks.map(b => b.rot || 0).filter(r => r !== 0),
      hills: (() => { const o = []; W.environment?.traverse?.(m => {
        if (m.isMesh && m.geometry && m.geometry.type === 'CircleGeometry')
          o.push({ z:+m.position.z.toFixed(1), y:+m.position.y.toFixed(2), sy:+m.scale.y.toFixed(2),
                   apex:+(m.position.y+m.scale.y).toFixed(2), pctH: proj(m.position.x, m.position.y+m.scale.y, m.position.z).h });
      }); return o.sort((p,q)=>q.z-p.z).slice(0,6); })(),
    };
  `);
  console.log(JSON.stringify(out, null, 1));
};
