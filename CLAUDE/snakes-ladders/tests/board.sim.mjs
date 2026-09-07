/* board.sim.mjs — the board pacing GATE (DESIGN.md §10.1).
   Any change to SNAKES or LADDERS must re-run this and keep
   median ≤ 28 rounds and p99 ≤ 70.  node tests/board.sim.mjs   */
import { newGame, applyRoll, roll } from '../js/rules.js';

const BOARD = {
  ladders: [[3,22],[12,30],[17,36],[25,49],[41,62],[54,71],[68,85],[78,94]].map(([from,to])=>({from,to})),
  snakes:  [[27,9],[38,20],[46,28],[57,40],[66,47],[74,55],[89,79],[96,88]].map(([from,to])=>({from,to})),
};
const N = 40000;
const pct = (a, p) => a[Math.min(a.length-1, Math.floor(a.length*p))];

function sim(nPlayers, opts = {}) {
  const rounds = [], gaps = [], shieldSaves = [], jhatkas = [];
  for (let i = 0; i < N; i++) {
    const players = Array.from({length:nPlayers},(_,k)=>({id:'p'+k,name:'P'+k,token:k}));
    const s = newGame({ players, board: BOARD, seed: 1000000+i, options: opts });
    let saves = 0, jh = 0, guard = 0;
    while (!s.over && guard++ < 5000) {
      const ev = applyRoll(s, roll(s));
      saves += ev.filter(e=>e.type==='shield').length;
      jh    += ev.filter(e=>e.type==='event').length;
    }
    rounds.push(Math.ceil(s.turnCount / nPlayers));
    const sorted = [...s.players].sort((a,b)=>b.pos-a.pos);
    gaps.push(sorted[0].pos - sorted[sorted.length-1].pos);
    shieldSaves.push(saves); jhatkas.push(jh);
  }
  rounds.sort((a,b)=>a-b); gaps.sort((a,b)=>a-b);
  const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
  return {
    mean: +mean(rounds).toFixed(1), sd: +Math.sqrt(mean(rounds.map(r=>(r-mean(rounds))**2))).toFixed(1),
    median: pct(rounds,.5), p90: pct(rounds,.9), p99: pct(rounds,.99), max: rounds[rounds.length-1],
    finalGapMedian: pct(gaps,.5), shieldSaves: +mean(shieldSaves).toFixed(2), jhatkas: +mean(jhatkas).toFixed(2),
  };
}

console.log(`Saanp Seedhi board simulation — ${N.toLocaleString('en-IN')} games each\n`);
const rows = [
  ['2 players (shipped rules)', sim(2)],
  ['4 players (shipped rules)', sim(4)],
  ['2p, no shield',             sim(2,{shield:false})],
  ['2p, no Jhatka',             sim(2,{jhatka:false})],
  ['2p, exact finish + mercy',  sim(2,{exactFinish:true})],
];
console.log('scenario                     mean    sd  median  p90  p99  max  gap  saves  jhatka');
for (const [n,r] of rows)
  console.log(n.padEnd(28), String(r.mean).padStart(5), String(r.sd).padStart(5),
    String(r.median).padStart(6), String(r.p90).padStart(4), String(r.p99).padStart(4),
    String(r.max).padStart(4), String(r.finalGapMedian).padStart(4),
    String(r.shieldSaves).padStart(6), String(r.jhatkas).padStart(7));

const ship = rows[0][1];
let fail = 0;
const gate = (c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++; };
console.log('\nGATES (DESIGN.md §10.1):');
gate(ship.median <= 28, `median rounds ${ship.median} ≤ 28`);
gate(ship.p99 <= 70,    `p99 rounds ${ship.p99} ≤ 70`);
gate(ship.sd >= 6,      `SD ${ship.sd} ≥ 6 — the board still has drama`);
gate(BOARD.snakes.every(s=>s.from>s.to) && BOARD.ladders.every(l=>l.to>l.from), 'snakes go down, ladders go up');
gate(Math.max(...BOARD.snakes.map(s=>s.from)) <= 96, 'nothing bites above 96');
const lateBites = BOARD.snakes.filter(s=>s.from>=85);
gate(lateBites.every(s=>s.from-s.to<=10), 'late snakes (85+) drop at most 10 squares');
const heads=new Set(BOARD.snakes.map(s=>s.from)), feet=new Set(BOARD.ladders.map(l=>l.from));
gate(![...heads].some(h=>feet.has(h)), 'no square is both a snake head and a ladder foot');
gate(!BOARD.ladders.some(l=>heads.has(l.to)), 'no ladder drops you straight onto a snake head');
gate(!BOARD.snakes.some(s=>feet.has(s.to)),   'no snake drops you straight onto a ladder foot');

console.log(fail ? `\n${fail} GATE(S) FAILED` : '\nboard passes every pacing gate');
process.exit(fail?1:0);
