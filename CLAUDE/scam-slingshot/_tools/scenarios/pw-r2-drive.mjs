/**
 * pw-r2-drive.mjs — THE MASS-RATIO MOMENTUM TEST, rebuilt. (PW r2)
 *
 * ── WHY THE OLD ONE HAD TO BE REPLACED ───────────────────────────────────────
 * `pw-gate.mjs` section 3 (`_pw-mass`) drops three hammers of different mass onto three
 * identical free-standing wood columns and reports the column's peak speed. PW round 1
 * recorded a 13.00x drive spread from it and put that number in ARCHITECTURE.md.
 *
 * That number was a FRACTURE, not a momentum transfer. Measured back to back on the same
 * tree (`_shots/PW/r2-gateinstr-OLD` vs `r2-gateinstr`), the stone hammer's own landing
 * speed reads **10.23 m/s in the old arm against 5.09 in the new one** — and 5.09 is what a
 * 0.55 m fall under this game's gravity actually produces. The old arm was measuring a stone
 * cube that SHATTERED on a wood column and then kept falling all the way to the ground, i.e.
 * the very inversion PW r2 exists to remove (the heaviest material was the one that broke).
 * With stone no longer disintegrating on impact, the same rig reads 1.95x — and the honest
 * reading is that `_pw-mass` never measured momentum at all: a vertical blow on the top of a
 * column standing on the ground is braced BY the ground, so the glass and wood hammers moved
 * their columns 0.37 and 0.88 m/s in BOTH arms. Only the fracture ever showed up.
 *
 * ── WHAT THIS MEASURES INSTEAD ───────────────────────────────────────────────
 * A billiard shot, horizontally, where nothing is braced and nothing is meant to break:
 * one hammer cube is given the SAME velocity every time and only its material — therefore
 * its mass — changes. The target is the same wood cube every time.
 *
 *   DRIVE      the target's peak speed. Heavier hammer must drive it harder.
 *   CARRY      the hammer's own speed after contact. A heavy thing does not stop; a light
 *              one is halted or thrown back. This is the half a viewer actually reads.
 *   Δp RATIO   momentum the target gained / momentum the hammer arrived with. It is the
 *              conservation check: it must fall as the hammer gets heavier (a heavy hammer
 *              keeps most of its own momentum and ploughs on).
 *
 * The TARGET is not allowed to break — that would invalidate the measurement the way it
 * invalidated `_pw-mass` — and it does not. The glass HAMMER does shatter on contact at
 * 6 m/s, which is its own material read rather than a defect; its drive number is taken from
 * the ticks before the break and the row says so.
 *
 * READ THE TWO COLUMNS TOGETHER. The DRIVE spread is bounded by conservation: a hammer can
 * hand a free target at most v(1+e), so 5.75x of mass can never buy 5.75x of target speed —
 * 2.0x is close to the ceiling. What actually puts mass on the screen is CARRY: the stone
 * hammer walks through the hit with 73 % of its speed and keeps going, the glass one is
 * stopped dead at 23 % and shatters. "It did not even slow down" is the read.
 */

const SPEED = 6.0;
const MATS = ['glass', 'wood', 'stone'];

export default async ({ game }) => {
  const out = [];
  const say = (s = '') => { out.push(s); console.log(s); };
  await game('return SS.freeze();');

  const rows = await game(`
    const out = [];
    for (const hm of ${JSON.stringify(MATS)}) {
      await SS.loadLevel('_crit-pw-fall');
      const w = SS.__world;
      const all = w.blocks.slice();
      const hammer = all.find(b => b.matName === hm);
      // the TARGET is always the same block: a second wood cube, identical every run
      const target = all.find(b => b.matName === 'wood' && b !== hammer);
      for (const b of all) {
        if (b === hammer || b === target) continue;
        b.body.setTranslation({ x: b.body.translation().x, y: -120, z: 0 }, true);
        b.body.setLinvel({x:0,y:0,z:0}, true); b.body.setAngvel({x:0,y:0,z:0}, true);
      }
      // BOTH BODIES ARE AIRBORNE AT CONTACT, and that is not a detail. Sliding them along
      // the lawn instead put the whole measurement inside the friction model: stone's
      // friction is 1.35 against the ground's 1.35, i.e. 31.8 m/s^2 of deceleration, so the
      // stone hammer arrived at the target 367 ms after launch having spent most of its
      // momentum on the grass, and the rig reported the HEAVY hammer as the feeble one.
      const half = target.h / 2 + 2.0;
      const put = (b, x, vx) => {
        b.damage = 0; b.crackStep = -1; b.scarFloor = 0;
        b.body.setTranslation({ x, y: half, z: 0 }, true);
        b.body.setRotation({ x:0, y:0, z:0, w:1 }, true);
        b.body.setLinvel({ x: vx, y: 0, z: 0 }, true);
        b.body.setAngvel({ x:0, y:0, z:0 }, true);
      };
      put(target, 12.0, 0);
      put(hammer, 12.0 - (hammer.w/2 + target.w/2) - 0.60, ${SPEED});
      const mh = hammer.body.mass(), mt = target.body.mass();

      let drive = 0, carry = null, hitAt = null, broke = null, dx0 = target.body.translation().x;
      const STEP = 1000/120;
      for (let i = 0; i < 60; i++) {                  // 0.5 s — over before anything lands
        await SS.seek(STEP);
        if (hammer.broken || target.broken) { broke = hammer.broken ? hm : 'target'; break; }
        const tv = target.body.linvel(), hv = hammer.body.linvel();
        if (hitAt === null && Math.abs(tv.x) > 0.05) { hitAt = +(i*STEP).toFixed(0); }
        drive = Math.max(drive, Math.abs(tv.x));
        if (hitAt !== null && carry === null && i*STEP > hitAt + 60) carry = hv.x;
      }
      const dx = target.body.translation().x - dx0;
      out.push({ hm, mh:+mh.toFixed(3), mt:+mt.toFixed(3), ratio:+(mh/mt).toFixed(2),
        hitAt, drive:+drive.toFixed(3), carry: carry === null ? null : +carry.toFixed(3),
        dp:+((mt*drive)/(mh*${SPEED})).toFixed(3), dx:+dx.toFixed(3), broke });
    }
    return out;
  `);

  say(`=== MASS-RATIO MOMENTUM TRANSFER — same ${SPEED} m/s, same wood target, only the hammer's material differs ===`);
  say('  hammer   ham kg  targ kg  m ratio  hit(ms)   DRIVE   CARRY   dp/p     target dx   broke');
  for (const r of rows) {
    say(`  ${r.hm.padEnd(7)} ${String(r.mh).padStart(7)} ${String(r.mt).padStart(8)} ` +
        `${String(r.ratio).padStart(8)} ${String(r.hitAt).padStart(8)} ${String(r.drive).padStart(7)} ` +
        `${String(r.carry).padStart(7)} ${String(r.dp).padStart(7)} ${String(r.dx).padStart(11)}    ` +
        (r.broke === 'target' ? '*** TARGET BROKE — measurement invalid ***'
          : r.broke ? `hammer shattered on contact (drive measured up to the break)` : 'no'));
  }
  const g = rows.find(r => r.hm === 'glass'), s = rows.find(r => r.hm === 'stone');
  if (g && s) {
    say('');
    say(`  DRIVE SPREAD  stone (${s.mh} kg) vs glass (${g.mh} kg): mass ${(s.mh/g.mh).toFixed(2)}x  ` +
        `-> target peak speed ${(s.drive/(g.drive||1e-6)).toFixed(2)}x, target travel ${(s.dx/(g.dx||1e-6)).toFixed(2)}x`);
    say(`  CARRY         the stone hammer keeps ${(100 * (s.carry ?? 0) / SPEED).toFixed(0)} % of its speed through the hit; ` +
        `the glass hammer keeps ${(100 * (g.carry ?? 0) / SPEED).toFixed(0)} %.`);
  }
  return out.join('\n');
};
