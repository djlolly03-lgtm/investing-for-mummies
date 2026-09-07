export default async ({ game }) => {
  for (let i=0;i<2;i++){
    const r = await game(`
      await SS.loadLevel('_p3-glass'); await SS.seed(5); await SS.seek(900);
      SS.aim({angle:0.18,power:0.86}); SS.release();
      let t=0; for(;t<3000;t+=10){ await SS.seek(10); if (SS.__world.debris.length>0) break; }
      const at = { t, debris: SS.__world.debris.length, blocks: SS.__world.blocks.length, score: SS.state().score };
      await SS.seek(480);
      return { ...at, after: { debris: SS.__world.debris.length, blocks: SS.__world.blocks.length,
               bits: SS.dumpBodies().map(b=>b.bits).join('').slice(0,64) } };
    `);
    console.log('### run'+i+' '+JSON.stringify(r));
  }
};
