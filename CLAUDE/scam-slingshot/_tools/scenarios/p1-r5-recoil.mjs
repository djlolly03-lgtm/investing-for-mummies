export default async ({ game }) => {
  const say=(k,v)=>console.log('### '+k+' '+JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  await game('await SS.aim({angle:0.42, power:0.90}); await SS.seek(400);');
  const out = await game(`
    const w=SS.__world, s=w.sling;
    const a={x:s.anchor.x,y:s.anchor.y};
    const info=await SS.release();
    const ax=Math.cos(info.angle), ay=Math.sin(info.angle);
    // px per world unit, so the answer is in SCREEN pixels like the rubric reads it
    const cam=w.camera, VH=innerHeight;
    const halfH=Math.abs(cam.position.z)*Math.tan(cam.fov*Math.PI/360);
    const pxPerWorld=(VH/2)/halfH;
    const rows=[]; let t=0;
    for(let i=0;i<=80;i++){
      const d=((s.pouch.x-a.x)*ax+(s.pouch.y-a.y)*ay);
      rows.push({t:Math.round(t), px:+(d*pxPerWorld).toFixed(3), state:s.state});
      await SS.seek(10); t+=10;
    }
    return {pxPerWorld:+pxPerWorld.toFixed(2), rows};`);
  say('pxPerWorld', out.pxPerWorld);
  say('series', out.rows.filter(r=>[0,90,180,280,370,400,450,500,600,700,800].includes(r.t)));
  const tail = out.rows.filter(r=>r.t>=400);
  const rest = tail[tail.length-1].px;
  say('max_dev_px_after_400', +Math.max(...tail.map(r=>Math.abs(r.px-rest))).toFixed(3));
  const t500 = out.rows.filter(r=>r.t>=500);
  say('max_dev_px_after_500', +Math.max(...t500.map(r=>Math.abs(r.px-rest))).toFixed(3));
  say('state_at_400', out.rows.find(r=>r.t===400).state);
  console.log('### DONE');
};
