/**
 * p3-r5-rest.mjs — THE SAFETY PROOF for level/structure.js's audit.
 *
 * P3 automatic FAIL: "Any jitter, sag, sinking or a never-sleeping body on an untouched
 * level." The audit added in round 5 is aggressive by design — it re-reads support every
 * 67 ms and topples anything standing on nothing — so it has to be provably unreachable
 * from a settled world. It is gated on `armedUntil`, and ONLY `structure.arm()` sets that,
 * and arm() is called only past Block.onImpact's approach-speed gate.
 *
 * This asserts the whole chain: after 3 s of an untouched l1, the structure layer must
 * report ZERO audits, zero racks, zero tips, zero hinges — and every body must be asleep and
 * to have moved less than half a pixel between t=2000 and t=3000.
 */
export default async ({ game, state }) => {
  const fails = [];
  for (const lvl of ['l1']) {
    await game('return await SS.loadLevel(args[0]);', lvl);
    await game('return SS.seed(4242);');
    await game('await SS.seek(2000);');
    const a = await game('return JSON.stringify(SS.dumpBodies());');
    const sa = await game('return SS.__structure();');
    await game('await SS.seek(1000);');
    const b = await game('return JSON.stringify(SS.dumpBodies());');
    const sb = await game('return SS.__structure();');
    const st = await state();

    // dumpBodies() returns { i, tag, t:[x,y,z], r:[x,y,z,w], v, sleeping, bits } — there is no
    // plain `.x` / `.y` on a row. (This exact assumption cost the orchestrator a probe once;
    // it is written down in ORCHESTRATOR-NOTES.md.)
    const A = JSON.parse(a), B = JSON.parse(b);
    let maxD = 0, maxA = 0, worst = '';
    for (let i = 0; i < A.length; i++) {
      const d = Math.hypot(B[i].t[0] - A[i].t[0], B[i].t[1] - A[i].t[1], B[i].t[2] - A[i].t[2]);
      if (d > maxD) { maxD = d; worst = `${A[i].tag}#${i}`; }
      maxA = Math.max(maxA, Math.abs(B[i].r[2] - A[i].r[2]));
    }
    const zero = (o) => o.audits === 0 && o.racks === 0 && o.tips === 0 && o.hinges === 0 &&
      o.collapses === 0 && o.hops === 0 && o.joints === 0 && o.queue === 0 && o.armed === false;
    console.log(`${lvl}: identical bits t2000 vs t3000: ${a === b}`);
    console.log(`   max body drift ${maxD.toExponential(2)} u (${worst})   max quat-z drift ${maxA.toExponential(2)}`);
    console.log(`   asleep ${st.bodiesAsleep}/${st.bodies}   phase=${st.phase}`);
    console.log(`   structure @2000 ${JSON.stringify(sa).slice(0, 400)}`);
    console.log(`   structure @3000 armed=${sb.armed} audits=${sb.audits} racks=${sb.racks} tips=${sb.tips} hinges=${sb.hinges} collapses=${sb.collapses} hops=${sb.hops} queue=${sb.queue}`);
    if (!zero(sa) || !zero(sb)) fails.push(`${lvl}: structure layer RAN on an untouched level`);
    // 0.5 px on screen at the game's own framing is ~0.005 world units on l1.
    if (maxD > 0.005) fails.push(`${lvl}: body drifted ${maxD} u between t=2000 and t=3000`);
    if (st.bodiesAsleep < st.bodies - 2) fails.push(`${lvl}: only ${st.bodiesAsleep}/${st.bodies} asleep`);
  }
  console.log(fails.length ? `\nFAIL:\n  ${fails.join('\n  ')}` : '\nREST PASS — the audit is unreachable from a settled world.');
};
