/** crit-P1-r7d.mjs — how visible is the release event at the GAME's own framing?
 *  For t = 0/50/83/125 ms, render the frame twice: once as shipped, once with every FX pool
 *  hidden. The diff is exactly the launch VFX, and the second frame is exactly what each of
 *  those pixels is drawn over — so dL is measurable rather than asserted. Same for the band. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export default async ({ page, shot, filmstrip, game, state, aimPx, dragShot, OUT }) => {
  const M = path.join(OUT, 'masks'); await mkdir(M, { recursive: true });
  const png = (n) => page.screenshot({ path: path.join(M, n + '.png') });

  const setup = async () => {
    await game('SS.audioMute(true); return SS.seed(7);');
    await game('await SS.seek(700);');
  };
  const fxVis = (on) => game(`
    const w = SS.__world;
    for (const k in (w.fx?.pools ?? {})) w.fx.pools[k].mesh.visible = args[0];
    SS.__render(); return true;`, on);
  const bandVis = (on) => game(`
    const s = SS.__world.sling; for (const b of s.bands) b.tube.group.visible = args[0];
    SS.__render(); return true;`, on);

  const geom = [];
  for (const t of [0, 50, 83, 125]) {
    await setup();
    await dragShot(0.30, 1.0, { steps: 12 });
    await game('await SS.seek(250);');
    const rel = await game('return SS.release();');
    if (t > 0) await game('await SS.seek(args[0]);', t);
    const g = await game(`
      const w = SS.__world, s = w.sling, cam = w.camera;
      const r = w.renderer.domElement.getBoundingClientRect();
      const V3 = cam.position.constructor;
      const P = (x,y)=>{const v=new V3(x,y,0).project(cam);
        return {x:(v.x*0.5+0.5)*r.width, y:(-v.y*0.5+0.5)*r.height};};
      const ad = s.ammoDiameter();
      return { anchorPx: P(s.anchor.x, s.anchor.y),
               adPx: Math.abs(P(s.anchor.x+ad, s.anchor.y).x - P(s.anchor.x, s.anchor.y).x),
               vw: r.width, vh: r.height };`);
    geom.push({ t, ...g, rel: { ad: rel.ad } });
    await fxVis(true);  await bandVis(true);  await png(`t${t}-shipped`);
    await fxVis(false);                       await png(`t${t}-nofx`);
    await bandVis(false);                     await png(`t${t}-nofx-noband`);
    await fxVis(true); await bandVis(true);
  }
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(OUT, 'p1r7d.json'), JSON.stringify({ geom }, null, 2));
  console.log('WROTE p1r7d.json');
};
