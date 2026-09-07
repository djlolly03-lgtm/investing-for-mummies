/**
 * ammo/base.js — shared projectile behaviour. One file per ammo type extends this.
 *
 * What every ammo gets for free:
 *   · a ball collider (balls tunnel less and roll believably; boxes catch on seams)
 *   · CCD, because a 24 m/s projectile crosses a 0.44 m plank in 2 solver steps
 *   · NOSE-FIRST FLIGHT: until first contact the body's rotation is driven to the velocity
 *     angle, so the arc reads as an arrow committing to a trajectory rather than a tumbling
 *     rock. After the first hit, physics takes the rotation back and it tumbles for real.
 *   · a two-part trail: a short tapered motion ribbon (speed) plus persistent breadcrumb
 *     dots along the path (so you can read WHERE the last shot went and correct)
 *   · a one-shot mid-air ability with a real input window
 *
 * Subclasses implement `buildMesh()` and (optionally) `ability()`.
 */

import * as THREE from 'three';
import { Entity, makeBody, shapes, quatZ } from '../level/entity.js';
import { mat } from '../art/materials.js';
import { emit } from '../events.js';
import { world } from '../world.js';
import { physics, FIXED } from '../physics.js';

const AXIS_Z = new THREE.Vector3(0, 0, 1);

export class Ammo extends Entity {
  static id = 'base';
  static label = 'Ammo';

  constructor({ x, y, radius = 0.40, matName = 'ammo', tag = 'ammo' }) {
    const m = mat(matName);
    const { body, collider } = makeBody({
      kind: 'dynamic', x, y, rot: 0, m,
      shape: shapes.ball(radius),
      ccd: true,
      linearDamping: 0.055,       // subtle air drag — the arc droops a touch at the far end
      angularDamping: 0.9,
      contactForce: 12,
      sleepy: true,
    });
    const mesh = new THREE.Group();
    super({ mesh, body, collider, material: m, tag });

    this.radius = radius;
    this.hasHit = false;
    this.abilityUsed = false;
    this.launched = false;
    this.restTicks = 0;
    this.spentEmitted = false;
    this.trail = null;          // shared breadcrumb dots, assigned by the level
    this.maxSpeedSeen = 0;
    // Launch kick (P1) — see setLaunchKick(). Zero until the slingshot fires this one.
    this._kick = 0; this._kickX = 1; this._kickY = 0; this._kickDecay = 0;
    // The motion smear is PER PROJECTILE. It was briefly shared, which meant a SIP Arrow
    // splitting into three fed one ribbon three interleaved position histories and drew a
    // zigzag between them. It happened to look like three arcs. It was not three arcs.
    this.ribbon = new Ribbon(world.scene);

    this.buildMesh(mesh);
    world.scene.add(mesh);
    world.projectiles.push(this);
  }

  /** Subclass hook. Add geometry to `group`. +X is forward. */
  buildMesh(/* group */) {}

  /** Subclass hook. Called once, mid-air, on tapAbility(). Return true if it did something. */
  ability() { return false; }

  launch(vx, vy) {
    this.launched = true;
    this.body.setLinvel({ x: vx, y: vy, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setRotation(quatZ(Math.atan2(vy, vx)), true);
    this.body.wakeUp();
  }

  /**
   * THE LAUNCH KICK (P1). `e0` m/s of extra speed along (ux,uy), already included in the
   * velocity `launch()` was given, which is then bled off over `ticks` SOLVER STEPS.
   *
   * ── WHY A SMOOTHERSTEP AND NOT AN EXPONENTIAL ────────────────────────────────
   * An exponential loses its steepest slice first: with the time constant that gives the
   * right amount of punch, the shot shed 13 % of its speed inside the FIRST solver step.
   * That made `release()`'s reported exit speed a lie by the time anything could sample it —
   * `p0-hook-audit` check 10 measures the projectile's real velocity one tick after release
   * and it caught exactly that. Fixing the report to say "cruise" instead would have been
   * fixing the label on a broken instrument.
   *
   * A smootherstep is flat at both ends. The kick is at FULL through the first couple of
   * rendered frames — which is where the punch belongs anyway, they are the frames the eye
   * uses to decide whether the thing was fired or dropped — then rolls off to zero with no
   * corner. So the number `release()` reports is the number you measure, and the launch is
   * harder in the frames that matter, from the same range budget.
   *
   * Counted in ticks, never in seconds, so a filmstrip of a release replays identically and
   * `SS.seek(50)` lands on the same world state every run. `Slingshot.updatePreview()` runs
   * this exact curve from this exact muzzle, so the dotted arc is a drawing of this motion
   * and not of a plain parabola.
   *
   * It stops dead on first contact: past that point the ammo's velocity belongs to the
   * collision, and continuing to subtract a launch-axis vector from it would be nonsense.
   */
  setLaunchKick(ux, uy, e0, ticks) {
    /**
     * THE UNIT GUARD. `ticks` is SOLVER STEPS. It was fed `SLING.kickTau = 0.034` — a
     * seconds value — for a whole round: `Math.round(0.034)` is 0, the clamp made it 1, and
     * the entire launch kick was unwound inside a single 8.3 ms step. Nothing threw, nothing
     * warned, `release()` still reported a 61 m/s exit speed that was true for one step, and
     * the launch quietly read as a lob for every frame after it. Anything under one step is
     * a seconds value wearing a tick count's name, so it dies here and loudly.
     */
    if (!Number.isFinite(ticks) || ticks < 1) {
      throw new Error(`Ammo.setLaunchKick: "ticks" is a SOLVER STEP COUNT, not seconds — got ${ticks}. ` +
        `At FIXED=1/120, 34 ms is 4 ticks, not 0.034.`);
    }
    this._kickX = ux; this._kickY = uy;
    this._kickE0 = e0 > 0 ? e0 : 0;
    this._kickTicks = Math.max(1, Math.round(ticks));
    this._kickT = 0;
    this._kick = this._kickE0;          // how much of it is still in the velocity
  }

  /** How much of `e0` survives after `t` of `n` solver steps. Shared with the preview. */
  static kickRemaining(t, n) {
    const x = Math.min(1, Math.max(0, t / n));
    return 1 - x * x * x * (x * (x * 6 - 15) + 10);   // 1 - smootherstep
  }

  /** One solver step of kick unwind. Returns the m/s removed this step (0 when idle). */
  _unwindKick() {
    if (!(this._kick > 0)) return 0;
    if (this.hasHit || this.dead) { this._kick = 0; return 0; }
    this._kickT++;
    const prev = this._kick;
    const next = this._kickE0 * Ammo.kickRemaining(this._kickT, this._kickTicks);
    this._kick = next;
    const d = prev - next;
    if (d === 0) return 0;
    const v = this.body.linvel();
    this.body.setLinvel({ x: v.x - this._kickX * d, y: v.y - this._kickY * d, z: 0 }, false);
    return d;
  }

  tryAbility() {
    if (this.abilityUsed || !this.launched || this.dead) {
      return { ok: false, reason: this.abilityUsed ? 'ability already used' : 'not in flight' };
    }
    const did = this.ability();
    if (did) {
      this.abilityUsed = true;
      const p = this.position(new THREE.Vector3());
      emit('abilityUsed', { ammo: this.constructor.id, point: { x: p.x, y: p.y, z: p.z } });
    }
    return { ok: !!did, reason: did ? undefined : 'ability did nothing' };
  }

  destroy() {
    this.ribbon?.dispose();
    this.ribbon = null;
    super.destroy();
  }

  onImpact(impulse) {
    if (impulse <= 0.6) return;
    if (!this.hasHit) {
      this.hasHit = true;
      // ROLLING RESISTANCE. A ball rolling without slipping feels no sliding friction, so a
      // spent projectile will happily trundle across the whole level at 3 m/s forever and
      // the level never settles. Real balls stop because they deform; ours stops because we
      // crank damping the moment it has done its job. Flight damping stays untouched — the
      // arc must not change.
      this.body.setLinearDamping(1.35);
      this.body.setAngularDamping(3.4);
    }
  }

  update(dt) {
    if (this.dead || !this.body) return;
    // Unwind first, so the nose-first rotation below reads the velocity the NEXT solver step
    // will actually integrate. (This is also the order the preview integrator uses.)
    this._unwindKick();
    const v = this.body.linvel();
    const sp = Math.hypot(v.x, v.y);
    this.maxSpeedSeen = Math.max(this.maxSpeedSeen, sp);

    // Nose-first until the first real contact.
    if (this.launched && !this.hasHit && sp > 0.6) {
      this.body.setRotation(quatZ(Math.atan2(v.y, v.x)), false);
      this.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    }

    if (this.launched) { this.trail?.feed(this); this.ribbon.feed(this); }

    // Spent detection: asleep, or has crawled to a stop, or fell off the world.
    const t = this.body.translation();
    if (this.launched) {
      if (sp < 0.9 && this.hasHit) this.restTicks++; else this.restTicks = 0;
      const offWorld = t.y < -6 || t.x > 62 || t.x < -34;
      if ((this.restTicks > 55 || offWorld) && !this.spentEmitted) {
        this.spentEmitted = true;
        emit('ammoSpent', { ammo: this, offWorld });
      }
      // Clear the board a beat after the shot resolves. Angry Birds removes the bird too:
      // a dead projectile lying in the rubble is one more body the next shot can snag on,
      // and the player reads it as clutter rather than as a trophy.
      if (offWorld || this.restTicks > 190) this.destroy();
    }
  }
}

// ---------------------------------------------------------------------------
// TRAIL — breadcrumb dots + a short tapered motion ribbon
// ---------------------------------------------------------------------------
const DOTS = 150;
const RIBBON = 22;

/** Solver steps between breadcrumbs. FIXED TIME, never distance — see feed(). */
const DOT_TICKS = 5;                 // 41.7 ms
/** How many stamps the trail lags the projectile by, so it never touches it. */
const DOT_LAG = 2;
/** Dot radius, world units. AD is 0.80, so this is 0.19 AD — inside the rubric's 1/6..1/3. */
const DOT_R = 0.076;

/**
 * One shared trail object per level (not per projectile) so a splitting ammo doesn't
 * multiply draw calls. `feed()` is called from the fixed step, so a filmstrip replays
 * the trail exactly.
 *
 * ── THREE RULES, ALL TAKEN STRAIGHT OFF THE REFERENCE FRAMES ─────────────────
 * 1. STAMPED BY TIME, NOT DISTANCE. `ab_launch_traceline-mid-arc_04` and
 *    `..._high-arc-two-trails_05` both show gaps that visibly tighten toward the apex: the
 *    dots go down on a metronome, so the gap between them IS the speed. Spacing them by
 *    distance instead makes every arc look identical whatever it was doing, which the rubric
 *    names as "the single commonest tell of amateur work in this genre".
 * 2. IT PERSISTS. A finished shot's line is a static record, never cleared, never faded,
 *    never animated. `beginShot()` starts a new run and leaves the old runs alone;
 *    `ab_launch_two-persisted-tracelines_07` has two whole shots on screen at once.
 * 3. IT STOPS SHORT. The newest dot is the one from DOT_LAG stamps ago, so the trail always
 *    ends two or three dots behind the projectile and never touches or overlaps it.
 */
export class Trail {
  constructor(scene) {
    // Hard-edged opaque discs. No glow, no sprite, no blur: a soft dot dies over bright sky,
    // and hardness is exactly why the reference dots stay legible over sky AND over stone.
    const dotGeo = new THREE.CircleGeometry(1, 14);
    this.dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({
      color: 0xfdfbf4, transparent: true, opacity: 0.94, toneMapped: false, depthWrite: false,
    }), DOTS);
    this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 3;
    this.dots.name = 'trail-dots';
    scene.add(this.dots);

    this.dotCount = 0;
    this.shots = 0;
    this.pending = [];           // positions waiting out the DOT_LAG
    this.nextTick = -1;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this.clear();
  }

  /** Wipe every shot. Level load and restart only — never between shots. */
  clear() {
    this.dotCount = 0;
    this.shots = 0;
    this.pending.length = 0;
    this.nextTick = -1;
    this._m.compose(this._v.set(0, -999, 0), this._q.identity(), this._s.set(0, 0, 0));
    for (let i = 0; i < DOTS; i++) this.dots.setMatrixAt(i, this._m);
    this.dots.instanceMatrix.needsUpdate = true;
  }

  /**
   * A new shot is leaving. Keep every dot already on screen; just start a new run.
   *
   * `origin` is the SLING, and the first dot of the run is planted there rather than at the
   * projectile's first sampled position. That is what `ab_launch_traceline-anchored-at-sling_06`
   * shows and it is load-bearing: a trail that starts wherever the projectile happened to be
   * reads as floating, and a trail that starts on the pouch reads as launched.
   */
  beginShot(origin, ammo = null) {
    this.shots++;
    this.pending.length = 0;
    this.nextTick = -1;
    if (!origin || this.dotCount >= DOTS) return;
    const stamp = (x, y) => {
      if (this.dotCount >= DOTS) return;
      const i = this.dotCount++;
      this._m.compose(this._v.set(x, y, 0.18), this._q.identity(), this._s.setScalar(DOT_R));
      this.dots.setMatrixAt(i, this._m);
    };
    stamp(origin.x, origin.y);

    /**
     * BRIDGE THE CUT. The release skips the ammo several units out of the fork on the frame
     * it fires (P1's hard cut, `SLING.muzzleBase`), and the projectile's own first breadcrumb
     * therefore lands out at the muzzle. One dot on the pouch and the next ten units away is
     * not a traceline, it is two unrelated marks — and `ab_launch_release-instant-band-recoil_03`
     * plainly shows the line CONTINUOUS from the pouch to the bird, dots thinning outward.
     *
     * So the skipped slice is stamped at the same fixed TIME cadence as the rest of the
     * trail, using the speed the ammo actually left at. Gap width still encodes speed — these
     * are the widest gaps on the arc because that is the fastest the shot ever goes — and the
     * criterion the trail exists for ("the first dot sits on the pouch") is unaffected.
     */
    if (!ammo || !ammo.body) { this.dots.instanceMatrix.needsUpdate = true; return; }
    const t = ammo.body.translation();
    const v = ammo.body.linvel();
    const dx = t.x - origin.x, dy = t.y - origin.y;
    const cut = Math.hypot(dx, dy);
    const perStamp = Math.hypot(v.x, v.y) * DOT_TICKS * FIXED;
    if (cut > 1e-3 && perStamp > 1e-3) {
      const n = Math.min(6, Math.floor(cut / perStamp));   // interior stamps only
      for (let k = 1; k <= n; k++) {
        const f = (k * perStamp) / cut;
        if (f >= 0.995) break;
        stamp(origin.x + dx * f, origin.y + dy * f);
      }
    }
    this.dots.instanceMatrix.needsUpdate = true;
  }

  /**
   * Drop a breadcrumb every DOT_TICKS solver steps — a fixed TIME interval, so the on-screen
   * gap between dots is proportional to speed. The dot that is actually written is the
   * position from DOT_LAG stamps ago, which is what keeps the line clear of the projectile.
   */
  feed(ammo) {
    if (ammo.hasHit || this.dotCount >= DOTS) return;
    const tick = physics.tick;
    if (this.nextTick < 0) this.nextTick = tick;      // first dot lands ON the muzzle
    if (tick < this.nextTick) return;
    this.nextTick = tick + DOT_TICKS;

    const p = ammo.position(this._v);
    this.pending.push(p.x, p.y);
    if (this.pending.length < (DOT_LAG + 1) * 2) return;

    const x = this.pending.shift(), y = this.pending.shift();
    const i = this.dotCount++;
    this._m.compose(this._v.set(x, y, 0.18), this._q.identity(), this._s.setScalar(DOT_R));
    this.dots.setMatrixAt(i, this._m);
    this.dots.instanceMatrix.needsUpdate = true;
  }

  /** Screen-agnostic gap measurements, for the "spacing encodes speed" criterion. */
  metrics() {
    const gaps = [];
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    let prev = null;
    for (let i = 0; i < this.dotCount; i++) {
      this.dots.getMatrixAt(i, m);
      v.setFromMatrixPosition(m);
      if (prev) gaps.push(+Math.hypot(v.x - prev.x, v.y - prev.y).toFixed(4));
      prev = { x: v.x, y: v.y };
    }
    if (gaps.length < 3) return { dots: this.dotCount, shots: this.shots, gaps };
    const third = Math.max(1, Math.floor(gaps.length / 3));
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const first = mean(gaps.slice(0, third));
    // The APEX third is the slowest third, which is not the LAST third: past the apex the
    // shot speeds up again on the way down, so a last-third measurement quietly reports the
    // descent and makes a perfectly good speed-encoded trail look evenly spaced.
    let apex = Infinity, apexAt = 0;
    for (let i = 0; i + third <= gaps.length; i++) {
      const m = mean(gaps.slice(i, i + third));
      if (m < apex) { apex = m; apexAt = i; }
    }
    return {
      dots: this.dotCount, shots: this.shots,
      dotDiameter: +(DOT_R * 2).toFixed(4),
      firstThirdMean: +first.toFixed(4),
      apexThirdMean: +apex.toFixed(4),
      apexThirdStart: apexAt,
      lastThirdMean: +mean(gaps.slice(-third)).toFixed(4),
      ratio: +(apex / first).toFixed(4),
      gaps,
    };
  }

  dispose() {
    this.dots.geometry.dispose();
    this.dots.material.dispose();
    this.dots.parent?.remove(this.dots);
  }
}

/**
 * A short tapered smear behind one projectile. Reads as speed without smearing the frame.
 * One per projectile — see the note in the Ammo constructor.
 */
export class Ribbon {
  constructor(scene) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(RIBBON * 2 * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let i = 0; i < RIBBON - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0xd8fbf4, transparent: true, opacity: 0.40, toneMapped: false,
      depthWrite: false, side: THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    this.mesh.name = 'trail-ribbon';
    scene.add(this.mesh);
    this.hist = [];
    this._v = new THREE.Vector3();
  }

  feed(ammo) {
    const p = ammo.position(this._v);
    const sp = ammo.speed();
    this.hist.unshift({ x: p.x, y: p.y, z: p.z });
    if (this.hist.length > RIBBON) this.hist.length = RIBBON;
    if (this.hist.length < 3 || sp < 3) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    const pos = this.pos;
    for (let i = 0; i < RIBBON; i++) {
      const a = this.hist[Math.min(i, this.hist.length - 1)];
      const b = this.hist[Math.min(i + 1, this.hist.length - 1)];
      let dx = a.x - b.x, dy = a.y - b.y;
      const L = Math.hypot(dx, dy) || 1;
      dx /= L; dy /= L;
      const taper = 1 - i / RIBBON;
      const wdt = 0.20 * taper * taper;
      const nx = -dy * wdt, ny = dx * wdt;
      pos[i * 6 + 0] = a.x + nx; pos[i * 6 + 1] = a.y + ny; pos[i * 6 + 2] = a.z;
      pos[i * 6 + 3] = a.x - nx; pos[i * 6 + 4] = a.y - ny; pos[i * 6 + 5] = a.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
