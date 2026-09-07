/**
 * The one-way event bus. ARCHITECTURE.md: "FX, audio, score and camera are ALL pure
 * subscribers. No FX code inside physics or gameplay code."
 *
 *   import { on, emit, off, clearAll } from './events.js';
 *   on('impact', ({ impulse, point, material }) => { ... });
 *
 * Handlers are called synchronously in subscription order. A throwing handler is caught,
 * logged into SS.errors and does not break the emitter — one bad FX subscriber must never
 * take down the physics frame.
 */

const map = new Map();

export function on(type, fn) {
  if (!map.has(type)) map.set(type, new Set());
  map.get(type).add(fn);
  return () => off(type, fn);
}

export function off(type, fn) { map.get(type)?.delete(fn); }

export function emit(type, payload) {
  const set = map.get(type);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); }
    catch (e) {
      console.error(`[events] handler for "${type}" threw:`, e);
      globalThis.SS?.errors?.push({ type: 'event-handler', text: `${type}: ${e && e.stack || e}` });
    }
  }
}

/** Called on level teardown so subscribers from a dead level never leak into the next one. */
export function clearAll() { map.clear(); }

/** Debug: which events currently have listeners. */
export function listenerCounts() {
  return Object.fromEntries([...map].map(([k, v]) => [k, v.size]));
}
