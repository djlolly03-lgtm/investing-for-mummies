/** How far off the z=0 plane does anything actually get, at rest and through a full collapse? */
export default async ({ game }) => {
  const worst = async (label) => {
    const r = await game(`
      const b = SS.dumpBodies();
      let m = 0, tag = '';
      for (const x of b) if (Math.abs(x.t[2]) > m) { m = Math.abs(x.t[2]); tag = x.tag; }
      return { n: b.length, maxAbsZ: m, tag };
    `);
    console.log(label.padEnd(26), r.maxAbsZ.toExponential(3), `(${r.tag}, ${r.n} bodies)`);
    return r.maxAbsZ;
  };
  let peak = 0;
  await game('await SS.seed(7); await SS.seek(3000);');
  peak = Math.max(peak, await worst('untouched, 3 s'));
  await game('await SS.seed(7); await SS.seek(900); SS.aim({angle:0.22,power:1.0}); SS.release();');
  for (let t = 0; t < 5000; t += 250) {
    await game('await SS.seek(250);');
    peak = Math.max(peak, await worst(`collapse +${t + 250} ms`));
  }
  console.log('PEAK |z| over the whole run:', peak.toExponential(3));
};
