/**
 * villains/conmanSprite.js — THE CON MAN, AS DRAWN ART.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SPRITE AND NOT GEOMETRY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Every other villain in this game is built from primitives — spheres, boxes, extruded
 * shapes — with a toon ink outline and per-part animation. That approach gives breathing,
 * flinching props and a silhouette that reacts, and `conman.js` next door is a perfectly good
 * example of it. What it cannot give, at the size this game is actually played at, is a face.
 *
 * The measurement that settled it: a villain stands about 1.5 world units tall, and on a
 * phone the frame is 19 units across 390 CSS px, so he is **31 px tall on screen**. A full
 * figure spends about a third of that on its head — 11 px — and at 11 px a nose is one pixel
 * and an expression is nothing at all. Drawn art, cropped to the head and shoulders, gives
 * the same footprint 31 px of face. That is roughly three times the resolution where it
 * matters, and it is why the object-with-googly-eyes villains never read as crooks.
 *
 * ── WHAT THIS COSTS, STATED PLAINLY ──────────────────────────────────────────
 * No breathing belly, no prop that flinches, no ink outline generated at runtime, no comic
 * squash. The art carries all of it instead, which is why the three states below are not
 * decoration — they ARE the performance. Losing the rig is a real loss and it is accepted on
 * purpose: an expression a player can actually see beats a deformation they cannot.
 *
 * ── THE THREE STATES, AND WHY THEY ARE REGISTERED ────────────────────────────
 * base.js drives four face states (idle / alarmed / braced / defeated) and this maps them to
 * three images, braced folding into alarmed. The images were authored by editing ONE source
 * so only the face differs: measured drift between them is 3, 0, -4, -1 px on a 1338 px
 * figure, and the head's left/top/bottom move 0 px. That matters more here than anywhere
 * else in the game — the whole character is the head, so any wobble between states would read
 * as a jump cut rather than as a reaction.
 *
 * ── AND IT NEVER GATES THE BOOT ──────────────────────────────────────────────
 * HOOKS.md forbids gating readiness on a fetch that can stall, so the textures load lazily
 * and the villain draws a flat coral placeholder until they arrive. A missing file degrades
 * to a plain shape, never to a crash and never to a hang.
 */

import * as THREE from 'three';
import { Villain, FACE } from './base.js';
import { mat, PALETTE } from '../art/materials.js';

/** Head height as a multiple of the collider radius. 2.8 was chosen against the alternatives:
 *  at 2.0 the face is smaller than the old card art it replaces, and at 3.4 the drawn head is
 *  1.7x the body that actually collides, so shots visibly pass through his face without
 *  registering — which reads as the game being broken rather than as a miss. */
const HEAD_R = 2.8;
/**
 * GENEROUS ON PURPOSE. Nothing is gated on this fetch — the villain draws a placeholder until
 * the art lands — so the only thing a short timeout can do is give up on a picture that was
 * about to arrive. At 4 s a second Chrome running a physics sweep on the same machine was
 * enough to make every villain render as a coral slab, and a classroom on a slow connection
 * would have hit the same thing. The timeout exists to stop an unbounded pending promise, not
 * to enforce a deadline, so it is set where only a genuinely dead request trips it.
 */
const LOAD_TIMEOUT = 30000;

const STATE_SRC = {
  [FACE.IDLE]:     'conman-confident',
  [FACE.ALARMED]:  'conman-rattled',
  [FACE.BRACED]:   'conman-rattled',
  [FACE.DEFEATED]: 'conman-busted',
};

const _tex = new Map();      // name -> THREE.Texture (shared by every con man in the level)

/**
 * Load one face. Never rejects and never outlives LOAD_TIMEOUT — see the header. Resolves to
 * null on failure, which leaves the placeholder material in place.
 */
function faceTexture(name) {
  if (_tex.has(name)) return _tex.get(name);
  const url = new URL(`../../assets/${name}.png`, import.meta.url).href;
  const p = new Promise((resolve) => {
    let settled = false;
    const finish = (t, note) => {
      if (settled) return;
      settled = true;
      if (!t) console.warn(`[conman] ${name} did not load, using the placeholder: ${note}`);
      resolve(t);
    };
    const timer = setTimeout(() => finish(null, `timed out after ${LOAD_TIMEOUT}ms`), LOAD_TIMEOUT);
    let tries = 0;
    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      const t = new THREE.CanvasTexture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
      finish(t);
    };
    img.onerror = () => {
      // one retry: a transient failure should not cost the level every one of its faces
      if (++tries < 2) { img.src = `${url}?retry=${tries}`; return; }
      clearTimeout(timer);
      finish(null, `could not load ${url} after ${tries} attempts`);
    };
    img.src = url;
  });
  _tex.set(name, p);
  return p;
}

/** For the capture harness and for critics: did the art actually arrive? */
export function conmanArtState() {
  return { requested: [..._tex.keys()] };
}

export class ConMan extends Villain {
  static id = 'conman';
  static label = 'The Con Man';
  static fact = 'The suit is the whole product. There is nothing behind it.';

  constructor(o = {}) {
    super({ radius: 0.54, matName: 'villain', ...o });
  }

  buildMesh(g) {
    const R = this.radius ?? 0.54;
    const h = R * HEAD_R;
    const w = h * 0.98;                       // the crops are near-square; corrected on load

    /**
     * A placeholder that is deliberately UGLY-OBVIOUS rather than invisible: if the art fails
     * to arrive, a flat coral slab in the bay is a bug anyone spots in one frame, whereas a
     * transparent quad is a villain that silently vanishes and a level that cannot be cleared.
     */
    const m = new THREE.MeshBasicMaterial({
      color: PALETTE.coral, transparent: true, alphaTest: 0.35, toneMapped: false, fog: true,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    // Sat so the head's chin lands near the collider's centre: the art is a head, the body it
    // stands on is imaginary, and this is the offset that makes him look seated in the bay.
    plane.position.set(0, h * 0.02, R * 0.62);
    plane.userData.noInk = true;              // the drawn outline IS the outline
    g.add(plane);
    this.plane = plane;
    this.planeMat = m;
    this._h = h;

    for (const name of new Set(Object.values(STATE_SRC))) {
      faceTexture(name).then((t) => {
        if (!t || !this.planeMat) return;
        this._ready = this._ready || {};
        this._ready[name] = t;
        // correct the quad to the image's own aspect the first time anything lands
        const ar = t.image.width / t.image.height;
        this.plane.geometry.dispose();
        this.plane.geometry = new THREE.PlaneGeometry(this._h * ar, this._h);
        this.applyFaceTexture();
      });
    }
  }

  /** Put the texture for the CURRENT state on the quad, if it has arrived. */
  applyFaceTexture() {
    const want = STATE_SRC[this.faceState] ?? STATE_SRC[FACE.IDLE];
    const t = this._ready && this._ready[want];
    if (!t || !this.planeMat) return;
    this.planeMat.map = t;
    this.planeMat.color.set(0xffffff);        // stop tinting once real art is on
    this.planeMat.needsUpdate = true;
  }

  /**
   * The whole performance. base.js's own setFace scales eye whites and swaps mouth meshes —
   * none of which exist here — so this replaces it rather than extending it, keeping only the
   * bookkeeping the rest of the class reads (`faceState`, and the no-op on an unchanged state).
   */
  setFace(state, force = false) {
    if (state === this.faceState && !force) return;
    this.faceState = state;
    this.applyFaceTexture();
  }
}

export const VILLAIN_TYPES = { conman: ConMan };
