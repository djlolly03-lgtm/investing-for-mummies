export default async ({ game }) => {
  for (const [ang, pow] of [[0.30,0.75],[0.35,0.70],[0.40,0.68],[0.45,0.65],[0.25,0.80],[0.55,0.62],[0.20,0.85],[0.50,0.60]]) {
    await game('await SS.seed(3); await SS.seek(1200);');
    await game(`SS.aim({angle:${ang},power:${pow}}); await SS.seek(300); SS.release();`);
    await game('await SS.seek(4500);');
    const st = await game('const w=SS.__world; return {phase:w.phase, alive:w.villains.filter(v=>v.alive).length, dead:w.blocks.filter(b=>b.dead).length, score:w.score};');
    console.log(ang, pow, JSON.stringify(st));
  }
};
