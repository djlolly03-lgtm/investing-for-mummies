/* node tests/rules.test.mjs — the rules engine against DESIGN.md §10 */
import { newGame, applyRoll, roll, summarise, LAST, EVENT_SQUARES, EVENT_COST } from '../js/rules.js';
let fails = 0;
const ok = (c, m) => { if (!c) { console.log('  ✗ ' + m); fails++; } else console.log('  ✓ ' + m); };
const BOARD = {
  ladders: [[3,22],[12,30],[17,36],[25,49],[41,62],[54,71],[68,85],[78,94]].map(([from,to])=>({from,to})),
  snakes:  [[27,9],[38,20],[46,28],[57,40],[66,47],[74,55],[89,79],[96,88]].map(([from,to])=>({from,to})),
};
const P = (n=2) => ['a','b','c','d'].slice(0,n).map((id,i)=>({id,name:id.toUpperCase(),token:i}));
const g = (o={},n=2) => newGame({ players:P(n), board:BOARD, seed:7, options:o });
const at = (s,i,pos) => { s.players[i].pos = pos; return s; };

console.log('rules.js — DESIGN.md §10');
let s = g(); applyRoll(s,3);
ok(s.players[0].pos===22,'ladder 3→22 lifts');

s = at(g(),0,26); applyRoll(s,1);
ok(s.players[0].pos===9,'snake 27→9 bites');

// §10.3 overshoot wins
s = at(g(),0,98); const e = applyRoll(s,5);
ok(s.players[0].pos===LAST,'overshoot WINS by default — no exact-finish tax');
ok(e.some(x=>x.type==='win'),'win event fires');
ok(!e.some(x=>x.type==='blocked'),'no blocked event in the default rule');

// §10.3 exact finish + mercy
s = at(g({exactFinish:true}),0,98); 
let ev1 = applyRoll(s,5); ok(s.players[0].pos===98 && ev1.some(x=>x.type==='blocked'),'exactFinish: 1st overshoot blocked');
s.turn=0; let ev2 = applyRoll(s,5); ok(s.players[0].pos===98,'exactFinish: 2nd overshoot blocked');
s.turn=0; let ev3 = applyRoll(s,5);
ok(s.players[0].pos===LAST && ev3.some(x=>x.type==='mercy'),'mercy rule: 3rd attempt finishes anyway');

// §10.3 ends at first finish
s = g({},4); at(s,0,98); s.players[1].pos=10; s.players[2].pos=4; s.players[3].pos=60;
const e4 = applyRoll(s,2);
ok(s.over===true,'game ENDS the instant the first token reaches 100');
ok(s.players.every(p=>p.rank>0),'everyone gets a rank, nobody keeps rolling');
ok(s.players[3].rank===2 && s.players[1].rank===3 && s.players[2].rank===4,'others ranked by square');
ok(e4.some(x=>x.type==='ranked'),'ranked event carries the standings');
ok(applyRoll(s,6).length===0,'no further turns are possible after the game ends');

// §10.5 Jhatka
ok(EVENT_SQUARES.length===6,'six Jhatka squares');
s = at(g(),0,14); const e5 = applyRoll(s,1);
ok(s.players[0].pos===15-EVENT_COST,'Jhatka costs exactly 4 squares');
ok(e5.some(x=>x.type==='event'),'event fires');

// §10.6 shield
s = at(g(),0,24); applyRoll(s,1);
ok(s.players[0].pos===49 && s.players[0].shield===true,'the 25→49 ladder earns the Bura Waqt Fund');
at(s,0,26); s.turn=0; const e6 = applyRoll(s,1);
ok(s.players[0].pos===27 && s.players[0].shield===false,'the shield absorbs a snake bite completely — the token does not move');
ok(e6.some(x=>x.type==='shield' && x.against==='snake'),'shield event names what it absorbed');
at(s,0,14); s.turn=0; applyRoll(s,1);
ok(s.players[0].pos===15-EVENT_COST,'a spent shield no longer absorbs a Jhatka');

s = at(g(),0,14); s.players[0].shield=true; applyRoll(s,1);
ok(s.players[0].pos===15,'a shield absorbs a Jhatka too');

// auto-grant when 25 behind
s = g(); s.players[0].pos=60; s.players[1].pos=2; s.turn=0;
const e7 = applyRoll(s,1);
ok(s.players[1].shield===true,'a player 25+ behind is automatically given the Bura Waqt Fund');
ok(e7.some(x=>x.type==='shieldGranted' && x.reason==='behind'),'the grant is announced, openly');
const before = s.players[1].shieldGranted; s.turn=0; applyRoll(s,1);
ok(s.players[1].shieldGranted===before,'it is granted once, not every turn');

// §10.4 sixes
s = at(g(),0,10); ok(applyRoll(s,6).some(x=>x.type==='extraTurn'),'a six grants another roll');
ok(s.turn===0,'turn stays with the roller');
applyRoll(s,6); const e8 = applyRoll(s,6);
ok(s.turn===1,'a third six simply ends the turn');
ok(!e8.some(x=>/forfeit|punish|lose/i.test(x.reason||'')),'nothing in the third-six event calls it a punishment');

// §10.7 nobody is eliminated
s = g(); let guard=0; while(!s.over && guard++<3000) applyRoll(s, roll(s));
ok(s.over,'a full seeded game terminates');
ok(s.players.every(p=>p.pos>=0),'no negative position ever');
ok(summarise(s).winner,'summary names a winner');
ok(summarise(s).visited.length>0,'summary reports every square anybody stood on');

// determinism
const rl = (seed)=>{const x=newGame({players:P(),board:BOARD,seed});return Array.from({length:60},()=>roll(x));};
ok(JSON.stringify(rl(99))===JSON.stringify(rl(99)),'same seed → same dice, always');
ok(JSON.stringify(rl(99))!==JSON.stringify(rl(100)),'different seeds differ');
const d = rl(1).concat(rl(2),rl(3));
ok(new Set(d).size===6,'all six faces appear');
const counts=[1,2,3,4,5,6].map(f=>d.filter(x=>x===f).length);
ok(Math.max(...counts)/Math.min(...counts) < 1.6,'the die is fair (no face is >1.6× another over 180 rolls)');

console.log(fails ? `\n${fails} FAILED` : '\nall rules tests pass');
process.exit(fails?1:0);
