/** P1 resting-composition check: sling width and centre as a % of frame width. */
export default async ({ game }) => {
  await game('await SS.seed(7); await SS.seek(700);');
  const m = await game(`
    const cam = SS.__world.camera, el = SS.__world.renderer.domElement;
    const r = el.getBoundingClientRect();
    const tanH = Math.tan(cam.fov * Math.PI / 360);
    const d = cam.position.z;
    const px = (x) => (((x - cam.position.x) / (tanH * cam.aspect * d)) * 0.5 + 0.5);
    const s = SS.__world.sling;
    // widest thing the slingshot owns: the dirt mound (1.05 half-width) at the base
    const left = px(-1.10), right = px(1.10), centre = px(s.anchor.x);
    return { slingPctW: +(100 * (right - left)).toFixed(2),
             centrePctW: +(100 * centre).toFixed(2),
             clearRightPctW: +(100 * (1 - right)).toFixed(2),
             camX: +cam.position.x.toFixed(2), camDist: +cam.position.z.toFixed(2) };
  `);
  console.log('resting composition:', JSON.stringify(m));
};
