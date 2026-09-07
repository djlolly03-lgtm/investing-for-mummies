/** PW r1 critic — what does a LANDING actually deliver, per material? Raw vs scaled impulse. */
export default async ({ game }) => {
  await game(`SS.freeze();`);
  const res = await game(`
    const out = [];
    for (const fall of [0.80, 1.60, 2.60]) {
      for (const matName of ['wood','glass','stone']) {
        await SS.loadLevel('_crit-pw-fall');
        const w = SS.__world;
        const all = w.blocks.slice();
        const subject = all.find(b => b.matName === matName);
        for (const b of all) { if (b !== subject) { b.body.setTranslation({x:b.body.translation().x,y:-80,z:0}, true); b.body.setLinvel({x:0,y:0,z:0},true);} }
        subject.damage = 0; subject.crackStep = -1; subject.scarFloor = 0;
        subject.body.setTranslation({ x: 12, y: subject.h/2 + fall, z: 0 }, true);
        subject.body.setRotation({x:0,y:0,z:0,w:1}, true);
        subject.body.setLinvel({x:0,y:0,z:0}, true); subject.body.setAngvel({x:0,y:0,z:0}, true);

        const massKg = subject.body.mass();
        const log = [];
        const proto = Object.getPrototypeOf(subject);
        const orig = proto.onImpact;
        proto.onImpact = function (impulse, other, point, approach = 0) {
          if (this === subject) {
            const before = this.damage;
            const r = orig.call(this, impulse, other, point, approach);
            log.push({ raw:+impulse.toFixed(3), tag: other?.tag ?? 'ground', ap:+approach.toFixed(2),
                       dmgAdded:+(this.damage - before).toFixed(3), dmg:+this.damage.toFixed(3),
                       scaled:+(this.lastImpulse||0).toFixed(3) });
            return r;
          }
          return orig.call(this, impulse, other, point, approach);
        };
        for (let i = 0; i < 200; i++) {
          await SS.seek(1000/120);
          if (subject.broken) break;
        }
        proto.onImpact = orig;
        out.push({ fall, matName, thr: subject.material.physics.breakImpulse,
                   mass:+massKg.toFixed(3), broken: !!subject.broken,
                   dmg:+(subject.damage||0).toFixed(2), crack: subject.crackStep,
                   log: log.slice(0, 8), nEvents: log.length,
                   rawPeak: log.length ? Math.max(...log.map(l=>l.raw)) : 0,
                   scaledPeak: log.length ? Math.max(...log.map(l=>l.scaled)) : 0 });
      }
    }
    return out;
  `);
  for (const r of res) {
    console.log(`fall ${r.fall}  ${r.matName.padEnd(6)} mass ${r.mass}  thr ${r.thr}  ` +
      `rawPeak ${r.rawPeak.toFixed(2).padStart(6)}  scaledPeak ${r.scaledPeak.toFixed(2).padStart(6)}  ` +
      `dmg ${String(r.dmg).padStart(6)}  crack ${r.crack}  BROKEN=${r.broken}  events=${r.nEvents}`);
    console.log('     first events: ' + JSON.stringify(r.log.slice(0,4)));
  }
  console.log('IMP_JSON ' + JSON.stringify(res.map(({log,...x})=>x)));
};
