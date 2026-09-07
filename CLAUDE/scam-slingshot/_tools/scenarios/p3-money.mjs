/**
 * The three frames this piece is actually judged on, at full resolution rather than as
 * filmstrip tiles — dust structure and shard silhouettes do not survive a 640 px tile.
 */
export default async ({ game, shot }) => {
  const HIDE = `document.getElementById('ui')?.style.setProperty('display','none');
                document.getElementById('fx-layer')?.style.setProperty('display','none');`;
  await game(`await SS.seed(7); await SS.seek(900);
              SS.aim({angle:0.22,power:1.0}); SS.release();
              SS.camLock({x:19.0,y:3.4,halfWidth:8.2}); ${HIDE}`);
  await game('await SS.seek(1000);');
  await shot('a-first-break');
  await game('await SS.seek(700);');
  await shot('b-mid-collapse');
  await game('await SS.seek(500);');
  await shot('c-chain');
  await game('await SS.seek(600);');
  await shot('d-chain2');
  await game('await SS.seek(2500);');
  await shot('e-settled');
  console.log('debris', await game('return SS.__world.debris.length;'));
};
