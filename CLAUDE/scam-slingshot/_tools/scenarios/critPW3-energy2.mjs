/**
 * PW ROUND 3 — INDEPENDENT CRITIC ENERGY AUDIT  (v2: honest contact detection + cohort-only
 * authored-write ledger + propagation in the same run, so both are measured on the SAME shot).
 */
const G = 9.81 * 2.4;

const PAGE_SETUP = `
window.__CR = (() => {
  const SS = window.SS, ph = SS.__physics, w = SS.__world;
  const G = ${G};
  function E(b) {
    const m = b.mass(), v = b.linvel(), av = b.angvel(), t = b.translation(), pi = b.principalInertia();
    return 0.5*m*(v.x*v.x+v.y*v.y+v.z*v.z)
         + 0.5*(pi.z*av.z*av.z + pi.x*av.x*av.x + pi.y*av.y*av.y)
         + m*G*b.gravityScale()*t.y;
  }
  function KE(b){ const m=b.mass(), v=b.linvel(), av=b.angvel(), pi=b.principalInertia();
    return 0.5*m*(v.x*v.x+v.y*v.y+v.z*v.z)+0.5*pi.z*av.z*av.z; }

  const anyBody = w.entities.find(e => e.body).body;
  const proto = Object.getPrototypeOf(anyBody);
  const VEL = ['setLinvel','setAngvel','applyImpulse','applyImpulseAtPoint','applyTorqueImpulse',
               'setTranslation','setRotation'];
  const DEF = ['addForce','addForceAtPoint','addTorque'];
  let ledger = null, cohortHandles = null;
  const orig = {};
  const fresh = () => ({ dEall:0, dEcoh:0, dEcohPos:0, n:0, sites:[] });
  const site = (st) => {
    const L = st.split('\\n').slice(2,7).map(s=>s.trim().replace(/^at\\s+/,'')
      .replace(/https?:\\/\\/[^/]+\\/scam-slingshot\\//,''));
    return L.join(' <- ');
  };
  for (const fn of VEL) {
    orig[fn] = proto[fn];
    proto[fn] = function (...a) {
      if (!ledger) return orig[fn].apply(this, a);
      let before, ok = true;
      try { before = E(this); } catch(_) { ok = false; }
      const r = orig[fn].apply(this, a);
      if (!ok) return r;
      let after; try { after = E(this); } catch(_) { return r; }
      const d = after - before;
      ledger.dEall += d; ledger.n++;
      const inC = cohortHandles && cohortHandles.has(this.handle);
      if (inC) {
        ledger.dEcoh += d; if (d > 0) ledger.dEcohPos += d;
        if (Math.abs(d) > 0.01) ledger.sites.push({ fn, d:+d.toFixed(3), st: site((new Error()).stack) });
      }
      return r;
    };
  }
  for (const fn of DEF) { orig[fn]=proto[fn];
    proto[fn]=function(...a){ if(ledger) ledger.n++; return orig[fn].apply(this,a); }; }

  let series=null, cohort=null, dart=null, unsub=null;
  function sample(tick) {
    const per={}, vel={}, pose={};
    let vmax=0;
    for (const e of cohort) {
      if (e.dead || !e.body) continue;
      try { if(!e.body.isValid()) continue;
        per[e.__ch]=E(e.body);
        const v=e.body.linvel(); const sp=Math.hypot(v.x,v.y); vel[e.__ch]=sp; if(sp>vmax)vmax=sp;
        const t=e.body.translation(), r=e.body.rotation();
        pose[e.__ch]=[t.x,t.y,2*Math.atan2(r.z,r.w)];
      } catch(_){}
    }
    let dE=null,dKE=null,dS=null;
    if (dart) { try { if(dart.isValid()){ dE=E(dart); dKE=KE(dart);
      const v=dart.linvel(); dS=Math.hypot(v.x,v.y);} } catch(_){} }
    const L = ledger||fresh(); ledger = fresh();
    series.push({ tick, per, pose, vmax, dE, dKE, dS,
      wAll:+L.dEall.toFixed(4), wCoh:+L.dEcoh.toFixed(4), wCohPos:+L.dEcohPos.toFixed(4),
      wN:L.n, sites:L.sites });
  }
  return {
    begin() {
      let i=0;
      cohort = w.entities.filter(e=>e.body && !e.dead && e.body.isDynamic() && e.tag!=='ammo');
      cohort.forEach(e=>{ e.__ch = e.tag+(i++); });
      cohortHandles = new Set(cohort.map(e=>e.body.handle));
      dart = (w.projectiles && w.projectiles[0] && w.projectiles[0].body) || null;
      series=[]; ledger=fresh(); unsub=ph.onStep(sample); sample(ph.tick);
      return { cohort: cohort.length, dart: !!dart, tick: ph.tick };
    },
    end(){ if(unsub)unsub(); unsub=null; ledger=null; cohortHandles=null;
           const s=series; series=null; return s; },
  };
})();
`;

function summarise(series) {
  const keys = Object.keys(series[0].per).filter(k => series.every(s => k in s.per));
  const tot = s => keys.reduce((a,k)=>a+s.per[k],0);
  const E = series.map(tot);
  return { keys, E };
}
const q=(a,p)=>{ if(!a.length)return NaN; const b=[...a].sort((x,y)=>x-y); return b[Math.min(b.length-1,Math.floor(p*b.length))]; };
const f=(n,k=2)=>(n===null||n===undefined||Number.isNaN(n)?'n/a':(+n).toFixed(k));

// main-tower load-bearing frame: 4 tall columns + the two beams they carry
const FRAME = ['block1','block2','block3','block4','block5','block8'];

export default async ({ game, dragShot }) => {
  const SHOTS = [[0.30,0.90],[0.32,0.94],[0.28,0.92],[0.34,0.92]];
  const out = [];
  for (const [angle, power] of SHOTS) {
    await game(`SS.freeze(); await SS.seed(7); SS.freeze();`);
    await game(PAGE_SETUP);

    // NOISE FLOOR A — 240 idle steps, settled level, nothing touched
    const idle = await game(`const C=window.__CR; C.begin(); for(let i=0;i<240;i++) SS.stepOnce(); return C.end();`);
    const si = summarise(idle);
    const idleD=[]; for(let i=1;i<si.E.length;i++) idleD.push(Math.abs(si.E[i]-si.E[i-1]));
    const idleFloor = { max:Math.max(...idleD), p99:q(idleD,0.99), net:si.E[si.E.length-1]-si.E[0],
                        writes:idle.reduce((a,s)=>a+s.wN,0), wCoh:idle.reduce((a,s)=>a+s.wCoh,0) };

    const drag = await dragShot(angle, power, { steps: 6 });
    const rel  = await game(`return SS.release();`);
    const raw  = await game(`
      const C=window.__CR; C.begin();
      for(let i=0;i<480;i++) SS.stepOnce();
      return { series: C.end(), st: await SS.state() };
    `);
    const S = raw.series, s = summarise(S);
    const D=[]; for(let i=1;i<s.E.length;i++) D.push({i, dE:s.E[i]-s.E[i-1], s:S[i]});

    // FIRST CONTACT = the first solver step at which the (asleep) cohort starts to move.
    let c=-1; for(let i=1;i<S.length;i++){ if(S[i].vmax>0.30){ c=i; break; } }
    const flight = D.filter(x=>x.i<c-1 && x.i>1).map(x=>Math.abs(x.dE));
    const flightFloor = { n:flight.length, max: flight.length?Math.max(...flight):NaN, p99:q(flight,0.99) };

    const endI = Math.min(S.length-1, c+240);
    const win  = D.filter(x=>x.i>c && x.i<=endI);
    const net  = s.E[endI]-s.E[c];
    const posSum = win.filter(x=>x.dE>0).reduce((a,x)=>a+x.dE,0);
    const big = win.reduce((m,x)=>x.dE>m.dE?x:m,{dE:-1e9,i:c,s:{}});
    const dartKEc = S[c] ? S[c].dKE : null;
    const dartMechDrop = (S[c]&&S[endI]&&S[c].dE!=null&&S[endI].dE!=null) ? S[c].dE-S[endI].dE : null;
    const wCoh = win.reduce((a,x)=>a+x.s.wCoh,0);
    const wCohPos = win.reduce((a,x)=>a+x.s.wCohPos,0);
    const allSites=[]; for(const x of win) for(const st of x.s.sites) allSites.push({tSince:Math.round((x.i-c)*1000/120), ...st});
    // roll up authored energy by call-site module
    const roll={};
    for(const st of allSites){
      const m = /(src\/[a-z/]+\.js)/.exec(st.st);
      const k = (m?m[1]:'?')+' '+st.fn;
      roll[k]=roll[k]||{n:0,sum:0,pos:0,max:0};
      roll[k].n++; roll[k].sum+=st.d; if(st.d>0)roll[k].pos+=st.d;
      if(Math.abs(st.d)>Math.abs(roll[k].max)) roll[k].max=st.d;
    }
    const top = [...win].sort((a,b)=>b.dE-a.dE).slice(0,6);

    // ---- PROPAGATION on the SAME shot ------------------------------------------------
    const i800 = Math.min(S.length-1, c+96);
    const p0 = S[c].pose, p8 = S[i800].pose;
    let moved=0, movedList=[]; let frameReact=0, frameList=[];
    for (const k of Object.keys(p0)) {
      if (!p8[k]) continue;                       // died -> counts as destroyed, not "moved"
      const dx=p8[k][0]-p0[k][0], dy=p8[k][1]-p0[k][1], da=p8[k][2]-p0[k][2];
      const dist=Math.hypot(dx,dy);
      const m = dist>0.05 || Math.abs(da)>0.03;
      if (m) { moved++; movedList.push(`${k} d=${dist.toFixed(3)}m a=${da.toFixed(3)}rad`); }
      if (FRAME.includes(k)) { if(m){frameReact++; frameList.push(k);} }
    }
    const died = Object.keys(p0).length - Object.keys(p8).length;

    out.push({ shot:`${angle}@${power}`, idleFloor, flightFloor, contact:c,
      cohort:s.keys.length, net2s:net, posSum, biggest:big.dE,
      dartKEc, dartMechDrop, wCoh, wCohPos, moved, frameReact, died, st:raw.st });

    console.log(`\n===== SHOT ${angle}@${power}  (drag angle ${f(drag.angle,4)}, clamped ${JSON.stringify(drag.clamped)}) =====`);
    console.log(`cohort ${s.keys.length} identity-stable bodies; first contact at solver step ${c} (${Math.round(c*1000/120)} ms after release)`);
    console.log(`NOISE FLOOR A (240 idle steps, settled): max|dE| ${f(idleFloor.max,4)} J | p99 ${f(idleFloor.p99,4)} J | net ${f(idleFloor.net,4)} J | ${idleFloor.writes} writes worth ${f(idleFloor.wCoh,4)} J`);
    console.log(`NOISE FLOOR B (dart in flight, n=${flightFloor.n}): max|dE| ${f(flightFloor.max,4)} J | p99 ${f(flightFloor.p99,4)} J`);
    console.log(`DART at contact: KE ${f(dartKEc)} J, speed ${f(S[c].dS)} m/s ; total mech energy it sheds over the 2 s ${f(dartMechDrop)} J`);
    console.log(`COHORT net mechanical change, contact -> contact+2000 ms : ${f(net)} J`);
    console.log(`   sum of POSITIVE steps in that window                  : ${f(posSum)} J`);
    console.log(`   largest SINGLE solver-step gain                       : ${f(big.dE,3)} J at contact+${Math.round((big.i-c)*1000/120)} ms  = ${f(big.dE/idleFloor.max,0)}x the idle floor`);
    console.log(`AUTHORED WRITES landing ON COHORT BODIES in the window   : net ${f(wCoh,3)} J, positive ${f(wCohPos,3)} J`);
    console.log('top gaining steps  [dE | authored-write energy that step]:');
    for (const t of top) console.log(`   +${f(t.dE,3)} J @ +${Math.round((t.i-c)*1000/120)} ms | writes on cohort ${f(t.s.wCoh,3)} J (+${f(t.s.wCohPos,3)}) | ${t.s.sites.slice(0,2).map(x=>x.fn+' '+x.d+' '+x.st.split(' <- ')[0]).join(' ; ')}`);
    console.log('authored write energy rolled up by call site (cohort bodies only):');
    for (const [k,v] of Object.entries(roll).sort((a,b)=>b[1].pos-a[1].pos))
      console.log(`   ${k.padEnd(46)} n=${String(v.n).padStart(4)}  net ${f(v.sum,2).padStart(9)} J  positive ${f(v.pos,2).padStart(8)} J  biggest ${f(v.max,2)} J`);
    console.log(`PROPAGATION @ contact+800 ms: blocks/villains MOVED ${moved} of ${Object.keys(p0).length} survivors (${died} destroyed) | load-bearing frame members reacting ${frameReact}/6 ${JSON.stringify(frameList)}`);
    console.log('   moved: ' + movedList.join(' | '));
    console.log(`FINAL: phase ${raw.st.phase} score ${raw.st.score} villainsAlive ${raw.st.villainsAlive} blocks ${raw.st.blocks} debris ${raw.st.debris}`);
  }
  console.log('\nSUMMARY ' + JSON.stringify(out.map(o=>({shot:o.shot, contact:o.contact, idleMax:+f(o.idleFloor.max,4),
    flightMax:+f(o.flightFloor.max,4), dartKE:+f(o.dartKEc), net2s:+f(o.net2s), pos2s:+f(o.posSum),
    biggest:+f(o.biggest,3), authoredPos:+f(o.wCohPos,2), moved:o.moved, frame:o.frameReact, died:o.died,
    phase:o.st.phase, score:o.st.score})), null, 1));
};
