/**
 * crit-P3-r3-probe.mjs — critic-side introspection ONLY. No verdict comes from this file.
 * Learns the live shapes of world.blocks / world.debris / world.fx and finds impact times,
 * so the real capture (crit-P3-r3.mjs) can MEASURE instead of guess.
 */
export default async ({ game, state }) => {
  const P = (k, v) => console.log('PROBE ' + k + ' ' + JSON.stringify(v));

  P('state-keys', Object.keys(await state()));

  await game('return await SS.loadLevel("l1");');
  await game('return SS.seed(4242);');
  await game('await SS.seek(1500);');

  P('block0', await game(`
    const b = SS.__world.blocks[0];
    const flat = {};
    for (const k of Object.keys(b)) { const v = b[k];
      flat[k] = (v===null||['number','string','boolean'].includes(typeof v)) ? v
              : (Array.isArray(v) ? 'arr['+v.length+']' : typeof v + (v&&v.constructor?':'+v.constructor.name:'')); }
    return flat;`));

  P('fx-keys', await game(`
    const f = SS.__world.fx; if(!f) return null;
    const o = {};
    for (const k of Object.keys(f)) { const v=f[k];
      o[k] = (v===null||['number','string','boolean'].includes(typeof v)) ? v
           : (Array.isArray(v)?'arr['+v.length+']':typeof v+(v&&v.constructor?':'+v.constructor.name:'')); }
    return o;`));

  P('proj', await game(`
    const w=SS.__world, V3=w.camera.position.constructor;
    const r=w.renderer.domElement.getBoundingClientRect();
    const a=new V3(18,2,0).project(w.camera), b=new V3(19,2,0).project(w.camera);
    return { pxPerUnit: Math.abs((b.x-a.x)*0.5*r.width), rw:r.width, rh:r.height };`));

  // ---- impact-time probe on l1
  const fire = await game('return SS.aimAndFire(0.30, 0.90);');
  P('l1-release', fire);
  const walk = await game(`
    let t=0, first=null, rows=[];
    while (t < 3500) { await SS.seek(20); t += 20;
      const s = await SS.state();
      rows.push([t, s.debris, s.blocks]);
      if (first===null && s.debris>0) { first=t; break; } }
    return { first, tail: rows.slice(-6) };`);
  P('l1-impact', walk);

  P('debris0', await game(`
    const d = SS.__world.debris; if(!d || !d.length) return null;
    const b = d[0]; const flat={};
    for (const k of Object.keys(b)) { const v=b[k];
      flat[k] = (v===null||['number','string','boolean'].includes(typeof v)) ? v
              : (Array.isArray(v)?'arr['+v.length+']':typeof v+(v&&v.constructor?':'+v.constructor.name:'')); }
    return { n:d.length, flat };`));

  P('body0', await game('const b = SS.dumpBodies(); return { n:b.length, sample:b[0], tags:[...new Set(b.map(x=>x.tag))] };'));

  // ---- probe levels: does (0.30,0.90) actually break the column?
  for (const id of ['_p3-wood','_p3-glass','_p3-stone']) {
    await game('return await SS.loadLevel(args[0]);', id);
    await game('return SS.seed(4242);');
    const r = await game('return SS.aimAndFire(0.30, 0.90);');
    const w = await game(`
      let t=0, first=null;
      while (t<3500){ await SS.seek(20); t+=20; const s=await SS.state(); if(first===null&&s.debris>0){first=t;break;} }
      await SS.seek(2500);
      const s = await SS.state();
      return { first, blocks:s.blocks, debris:s.debris, phase:s.phase };`);
    P('probe-' + id, { ok: r.ok, ...w });
  }
};
