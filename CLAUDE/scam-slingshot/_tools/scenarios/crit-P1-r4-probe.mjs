export default async ({ game, state }) => {
  const say = (k,v)=>console.log('### '+k+' '+JSON.stringify(v));
  await game('SS.seed(11); await SS.seek(2000);');
  say('state', await state());
  say('worldKeys', await game('return Object.keys(SS.__world);'));
  say('slingKeys', await game('const s=SS.__world.sling; return Object.keys(s);'));
  say('bandsShape', await game(`const s=SS.__world.sling;
    return (s.bands||[]).map(b=>({keys:Object.keys(b), tubeKeys: b.tube?Object.keys(b.tube):null}));`));
  say('prongsShape', await game(`const s=SS.__world.sling;
    return (s.prongs||[]).map(b=>({keys:Object.keys(b), tubeKeys: b.tube?Object.keys(b.tube):null}));`));
  say('fxPools', await game('return Object.keys(SS.__world.fx?.pools||{});'));
  say('poolFields', await game(`const p=SS.__world.fx?.pools||{}; const o={};
    for (const k of Object.keys(p)) o[k]={max:p[k].max, fields:Object.keys(p[k].p||{})}; return o;`));
  say('sceneNames', await game(`const n=[]; SS.__world.scene.traverse(o=>{if(o.name)n.push(o.name);}); return n.slice(0,120);`));
  say('slingGroupChildren', await game(`const s=SS.__world.sling; return s.group? s.group.children.map(c=>({name:c.name,type:c.type,kids:c.children.length})):null;`));
  say('ammoDiameterFn', await game(`const s=SS.__world.sling; return typeof s.ammoDiameter==='function'? s.ammoDiameter():null;`));
  say('rel', await game(`await SS.aim({angle:0.42,power:0.9}); await SS.seek(300); const r= await SS.release(); return r;`));
  say('projKeys', await game(`const p=SS.__world.projectiles?.[0]; return p?Object.keys(p):null;`));
};
