#!/usr/bin/env node
/**
 * Progress logger. Lock-protected read-modify-write so parallel agents never clobber each other.
 *   node prog.mjs --piece P1 --name "Launch feel" --status critique --round 3 \
 *        --verdict FAIL --gap "band does not deform under tension" --shot ../_shots/P1/r3/01-pull.png
 *   node prog.mjs --wave "Wave 1 — Feel"           # wave marker
 *   node prog.mjs --note "playthrough agent found audio ducking inconsistent"
 */
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STATE = path.join(HERE, '..', '_state');
const FILE = path.join(STATE, 'progress.json');
const LOCK = path.join(STATE, '.lock');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };

await mkdir(STATE, { recursive: true });
let fh = null;
for (let i = 0; i < 200; i++) {
  try { fh = await open(LOCK, 'wx'); break; }
  catch { await new Promise(r => setTimeout(r, 50 + Math.random() * 100)); }
}
try {
  let d;
  try { d = JSON.parse(await readFile(FILE, 'utf8')); }
  catch { d = { startedAt: new Date().toISOString(), wave: 'Wave 0 — reference & vertical slice', pieces: {}, events: [] }; }

  const ts = new Date().toISOString();
  if (arg('wave')) { d.wave = arg('wave'); d.events.unshift({ ts, kind: 'wave', text: arg('wave') }); }
  if (arg('note')) d.events.unshift({ ts, kind: 'note', text: arg('note') });

  const p = arg('piece');
  if (p) {
    const cur = d.pieces[p] ?? { id: p, rounds: 0, history: [] };
    if (arg('name')) cur.name = arg('name');
    if (arg('status')) cur.status = arg('status');
    if (arg('round')) cur.rounds = Math.max(cur.rounds, +arg('round'));
    if (arg('verdict')) cur.verdict = arg('verdict');
    if (arg('gap')) cur.gap = arg('gap');
    if (arg('shot')) cur.shot = path.relative(path.join(HERE, '..', '..'), path.resolve(arg('shot')));
    if (arg('blind')) cur.blind = path.relative(path.join(HERE, '..', '..'), path.resolve(arg('blind')));
    cur.updatedAt = ts;
    if (arg('verdict') || arg('gap')) cur.history.unshift({ ts, round: cur.rounds, verdict: arg('verdict'), gap: arg('gap') });
    d.pieces[p] = cur;
    d.events.unshift({ ts, kind: 'piece', piece: p, text:
      `${p} ${cur.name ?? ''} — ${arg('status') ?? cur.status ?? ''}${arg('round') ? ` r${arg('round')}` : ''}` +
      `${arg('verdict') ? ` → ${arg('verdict')}` : ''}${arg('gap') ? `: ${arg('gap')}` : ''}` });
  }
  d.updatedAt = ts;
  d.events = d.events.slice(0, 200);
  await writeFile(FILE, JSON.stringify(d, null, 2));
  console.log('logged');
} finally { if (fh) { await fh.close(); await (await import('node:fs/promises')).unlink(LOCK).catch(() => {}); } }
