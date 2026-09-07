/** pw-dmg.mjs — what the LANDING actually delivers, per material, on the drop rig. */
import { INSTALL, CUT } from './pw-probe.mjs';
export default async ({ game }) => {
  const out = []; const say = s => { out.push(s); console.log(s); };
  await game(INSTALL);
  await game(`
    const B = SS.__world.blocks[0]?.constructor?.prototype
      || Object.getPrototypeOf(SS.__world.blocks[0]);
    window.__D = [];
    if (!B.__pwdmg) {
      B.__pwdmg = true;
      const oi = B.onImpact, of = B.fracture;
      B.onImpact = function (imp, other, pt, app) {
        const before = this.damage;
        const r = oi.call(this, imp, other, pt, app);
        window.__D.push({ m:this.matName, id:this.id, raw:+imp.toFixed(3), app:+app.toFixed(2),
          src: other?.tag ?? 'null', dmg:+this.damage.toFixed(3), thr:this.material.physics.breakImpulse,
          took:+(this.damage-before).toFixed(3), t:SS.tick() });
        return r;
      };
      B.fracture = function (imp, pt) { window.__D.push({ FRACTURE:this.matName, id:this.id, t:SS.tick() });
        return of.call(this, imp, pt); };
    }
    return { patched: B.__pwdmg === true, blocks: SS.__world.blocks.length };`).then(r=>console.log('  patch:', JSON.stringify(r)));
  await game(CUT(1));
  await game('return await SS.loadLevel("_pw-drop");');
  await game('return SS.freeze();');
  await game('window.__D.length = 0; return true;');
  await game('return await SS.seek(2500);');
  const d = await game('return window.__D;');
  console.log('  events:', d.length);
  console.log('  after:', JSON.stringify(await game(`return { blocks: SS.__world.blocks.filter(b=>!b.dead).map(b=>({m:b.matName, dmg:+b.damage.toFixed(2), thr:b.material.physics.breakImpulse, crack:b.crackStep, y:+b.body.translation().y.toFixed(2)})), debris: SS.__world.debris.length, tick: SS.tick(), phase: SS.__world.phase };`)));
  const byId = {};
  for (const e of d) {
    if (e.FRACTURE) { say(`  FRACTURE ${e.FRACTURE} id=${e.id} at tick ${e.t}`); continue; }
    const k = `${e.m}#${e.id}`;
    byId[k] ??= { n: 0, rawSum: 0, peakRaw: 0, peakDmg: 0, thr: e.thr, src: {} };
    const b = byId[k];
    b.n++; b.rawSum += e.raw; b.peakRaw = Math.max(b.peakRaw, e.raw);
    b.peakDmg = Math.max(b.peakDmg, e.dmg); b.src[e.src] = (b.src[e.src] ?? 0) + 1;
  }
  for (const [k, b] of Object.entries(byId)) {
    say(`  ${k.padEnd(12)} contacts ${String(b.n).padStart(3)}  raw sum ${b.rawSum.toFixed(1)}  peak raw ${b.peakRaw.toFixed(2)}` +
        `  peak damage ${b.peakDmg.toFixed(2)} / ${b.thr}  = ${(b.peakDmg / b.thr).toFixed(2)} of threshold  src ${JSON.stringify(b.src)}`);
  }
  return out.join('\n');
};
