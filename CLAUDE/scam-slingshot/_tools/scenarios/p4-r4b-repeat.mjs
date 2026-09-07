/**
 * p4-r4b-repeat.mjs — is the canonical l1 shot reproducible ACROSS THE WHOLE COLLAPSE, not just
 * the 240 ticks the determinism gate checks? Two identical seeded runs inside one page, compared
 * on body bits at 600 / 1800 / 3600 ms, plus the tick and hit-stop counts.
 * (Written because two runs of the same scenario on unchanged source put the first block death at
 *  640 ms and at 1840 ms.)
 */
export default async ({ game }) => {
  const RUN = `
    await SS.seed(3); await SS.seek(2600);
    SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300);
    SS.release(); SS.freeze();
    const out = { marks: [] };
    for (const ms of [600, 1200, 2400, 3600]) {
      await SS.seek(ms - (out.marks.length ? [600,1200,2400,3600][out.marks.length-1] : 0));
      const b = SS.dumpBodies();
      out.marks.push({ ms, tick: SS.tick(), n: b.length,
        blocks: b.filter(x => x.tag === 'block').length,
        bits: b.map(x => x.bits).join('').slice(0, 160) });
    }
    return out;
  `;
  const a = await game(RUN);
  const b = await game(RUN);
  const rows = a.marks.map((m, i) => {
    const n = b.marks[i];
    return `t=${String(m.ms).padStart(5)}  A tick=${m.tick} bodies=${m.n} blocks=${m.blocks}` +
           `   B tick=${n.tick} bodies=${n.n} blocks=${n.blocks}   bits ${m.bits === n.bits ? 'MATCH' : '*** DIFFER ***'}`;
  });
  console.log(rows.join('\n'));
};
