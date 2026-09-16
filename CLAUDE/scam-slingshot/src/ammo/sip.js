/**
 * ammo/sip.js — DEPRECATED SHIM.  The SIP Arrow became the IFM medallion.
 *
 * The branding wave replaced the projectile: the teal dart with a face is now a struck IFM
 * medallion that tumbles in flight (`ammo/medallion.js`). Nothing about the PHYSICS changed —
 * same collider radius, same `'ammo'` material preset, same launch kick, same split ability —
 * so every level, probe fixture and scenario that names `'sip'` still works, and the registry
 * below still answers to that id.
 *
 * This file exists only so an import of `./ammo/sip.js` does not 404. New code should import
 * `./ammo/medallion.js` directly. Delete this once nothing reaches for it.
 */
export { IfmMedallion, IfmMedallion as SipArrow, AMMO_TYPES,
         preloadMedallionFace, medallionFaceState, disposeMedallion } from './medallion.js';
