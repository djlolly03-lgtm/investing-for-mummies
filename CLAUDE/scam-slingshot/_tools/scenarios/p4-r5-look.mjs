/** p4-r5-look.mjs — the pictures. The arrival composition, and the pan that gets there. */
import { PRE } from './p4-r5-lead.mjs';
const SETUP = 'await SS.seed(3); await SS.seek(2600); SS.aim({ angle: 0.30, power: 0.90 }); await SS.seek(300); SS.release(); SS.freeze();';
export default async ({ game, shot, filmstrip }) => {
  const g = (b, ...a) => game(PRE + b, ...a);
  await g('await SS.seed(3); await SS.seek(2600);');
  await shot('aim-nohud');
  await g(SETUP);
  await filmstrip('flight-pan', { from: 100, to: 660, step: 40, cols: 3 });
  await g(SETUP + 'await SS.seek(620);');
  await shot('arrival-CONTACT');
  await g(SETUP + 'await SS.seek(900);');
  await shot('collapse-t900');
  await g(SETUP + 'await SS.seek(1400);');
  await shot('collapse-t1400');
  await g(SETUP);
  await filmstrip('collapse', { from: 620, to: 2220, step: 200, cols: 3 });
  console.log('errors ' + JSON.stringify(await g('return SS.errors.map(e => e.text);')));
};
