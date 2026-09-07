/** PW r1 critic — the survivable fall height of a 0.90 m cube of each material, onto grass. */
export default async ({ game }) => {
  const res = await game(`
    const out = [];
    for (const m of ['wood','glass','stone']) {
      let lo = 0.05, hi = 12.0;                     // lo survives, hi assumed fatal
      const test = async (fall) => {
        SS.freeze(); await SS.loadLevel('_crit-pw-tilt');
        const w = SS.__world;
        const b = w.blocks.find(z=>z.matName===m);
        for (const o of w.blocks) if (o!==b) o.body.setTranslation({x:o.body.translation().x,y:-80,z:0}, true);
        b.damage=0; b.crackStep=-1; b.scarFloor=0;
        b.body.setTranslation({x:12,y:b.h/2+fall,z:0}, true);
        b.body.setRotation({x:0,y:0,z:0,w:1}, true);
        b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
        for (let i=0;i<260;i++){ await SS.seek(1000/120); if (b.broken) return { broke:true, crack:-1 }; }
        return { broke:false, crack:b.crackStep, dmg:+(b.damage||0).toFixed(2) };
      };
      const top = await test(hi);
      if (!top.broke) { out.push({ m, hmax: '>12', note:'survives a 12 m drop' }); continue; }
      for (let k=0;k<9;k++){ const mid=(lo+hi)/2; const r = await test(mid); if (r.broke) hi=mid; else lo=mid; }
      const at = await test(lo);
      out.push({ m, hmax:+lo.toFixed(2), impactV:+Math.sqrt(2*23.544*lo).toFixed(2),
                 crackAtHmax: at.crack, dmgAtHmax: at.dmg });
    }
    return out;
  `);
  console.log('SURVIVABLE FALL onto grass, identical 0.90 m cube:');
  for (const r of res) console.log('  ' + JSON.stringify(r));
};
