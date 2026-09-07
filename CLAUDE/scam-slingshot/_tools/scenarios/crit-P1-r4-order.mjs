export default async ({ game, state }) => {
  const say=(k,v)=>console.log('### '+k+' '+JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  const dump = (label) => game(`
    const w=SS.__world,s=w.sling;
    const applyM=(m,p)=>{const e=m.elements;const iw=1/(e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]);
      return [(e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12])*iw,(e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13])*iw,(e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14])*iw];};
    const out=s.bands.map(b=>{const t=b.tube,P=t._pts,S=t.rings,M=t.group;M.updateWorldMatrix(true,true);
      const wp=i=>applyM(M.matrixWorld,[P[i*3],P[i*3+1],P[i*3+2]]);
      const p0=wp(0), pN=wp(S);
      const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
      return { side:b.side, rings:S,
        p0:p0.map(v=>+v.toFixed(3)), pN:pN.map(v=>+v.toFixed(3)),
        pouch:[+s.pouch.x.toFixed(3),+s.pouch.y.toFixed(3)],
        tipL:[+s.prongs[0].tip.x.toFixed(3),+s.prongs[0].tip.y.toFixed(3)],
        tipR:[+s.prongs[1].tip.x.toFixed(3),+s.prongs[1].tip.y.toFixed(3)],
        d_p0_pouch:+d(p0,[s.pouch.x,s.pouch.y]).toFixed(3),
        d_pN_pouch:+d(pN,[s.pouch.x,s.pouch.y]).toFixed(3),
        radFirst3: Array.from(t._rad.slice(0,3)).map(v=>+v.toFixed(4)),
        radLast3: Array.from(t._rad.slice(S-2,S+1)).map(v=>+v.toFixed(4)),
        radAll: Array.from(t._rad).map(v=>+v.toFixed(4)) };});
    return out;`);
  say('rest', await dump());
  await game('await SS.aim({angle:0.42,power:1.0}); await SS.seek(400);');
  say('full', await dump());
};
