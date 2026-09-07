/* rules.js — the pure game. No DOM, no THREE, no timers.
   Every random comes from the seeded rng, so a probe can replay a game exactly.
   game.js turns the returned event list into animation.

   Conforms to DESIGN.md §10 and the contract amendments at the end of that file:
   overshoot wins · game ends at first finish · Bura Waqt Fund shield ·
   Jhatka event squares · a third six simply ends the turn (never a punishment). */

import { makeRng } from './util.js';

export const LAST = 100;

/** Jhatka — structural risk. Not the player's fault, and the code says so. §10.5 */
export const EVENT_SQUARES = [15, 31, 44, 59, 73, 86];
export const EVENT_COST = 4;

/** The ladder that earns the shield. §10.6 */
export const SHIELD_LADDER_FROM = 25;
/** Auto-grant once a player is this far behind the leader. §10.6 */
export const SHIELD_BEHIND_BY = 25;

export const OPTIONS = {
  exactFinish: false,     // false = OVERSHOOT WINS (default, measured in §10.3)
                          // true  = must land exactly, WITH the two-attempt mercy rule
  mercyAfter: 2,          // failed exact attempts before any roll finishes
  sixExtraTurn: true,
  maxConsecutiveSixes: 3, // a third six simply ends the turn — it forfeits nothing
  jhatka: true,           // the structural-risk squares
  shield: true,           // the Bura Waqt Fund
};

/**
 * @param {object} cfg
 * @param {Array}  cfg.players  [{ id, name, token, isBot }]
 * @param {object} cfg.board    { snakes:[{from,to,…}], ladders:[{from,to,…}] }
 * @param {number} cfg.seed
 * @param {object} cfg.options  partial OPTIONS
 */
export function newGame({ players, board, seed = 20260903, options = {} }) {
  const opts = { ...OPTIONS, ...options };
  return {
    seed,
    rngState: seed >>> 0,
    opts,
    snakes: new Map((board?.snakes || []).map(s => [s.from, s])),
    ladders: new Map((board?.ladders || []).map(l => [l.from, l])),
    events: new Set(opts.jhatka ? EVENT_SQUARES : []),
    players: players.map((p, i) => ({
      ...p, idx: i, pos: 0, moves: 0,
      laddersTaken: [], snakesBitten: [], eventsHit: [], squaresLearned: [],
      shield: false, shieldUsed: 0, shieldGranted: 0,
      best: 0, sixes: 0, exactTries: 0, finished: false, rank: 0,
    })),
    turn: 0,
    consecutiveSixes: 0,
    over: false,
    winner: null,
    turnCount: 0,
    history: [],
    lastRoll: null,
  };
}

export const currentPlayer = (s) => s.players[s.turn];
export const isOver = (s) => s.over;
export const playerById = (s, id) => s.players.find(p => p.id === id);
export const leaderPos = (s) => Math.max(...s.players.map(p => p.pos));

/** Roll the die. Deterministic; advances only the rng. */
export function roll(state) {
  const rng = makeRng(state.rngState);
  const v = 1 + rng.int(6);
  state.rngState = rng.state();
  return v;
}

/**
 * Play one die value for the current player. Mutates 'state', returns an ordered
 * event list for the animation layer.
 *
 *   roll          { value }
 *   blocked       { at, need, triesLeft }     exact-finish mode only
 *   mercy         { }                         the mercy rule opened the gate
 *   move          { from, to, path[] }
 *   ladder        { ladder, from, to }
 *   snake         { snake, from, to }
 *   shield        { against:'snake'|'event', at, snake?, event? }   absorbed, no movement
 *   shieldGranted { reason:'ladder'|'behind', behindBy? }
 *   event         { cell, from, to, cost }    Jhatka
 *   land          { cell }
 *   win           { playerId, rank }
 *   ranked        { standings }               everyone else, at first finish
 *   extraTurn     { reason:'six' }
 *   turn          { playerId, reason? }
 */
export function applyRoll(state, value) {
  const ev = [];
  if (state.over) return ev;
  const p = currentPlayer(state);
  const from = p.pos;
  ev.push({ type: 'roll', playerId: p.id, value });
  state.lastRoll = value;
  p.moves++;
  state.turnCount++;

  let target = from + value;
  let moved = false;

  if (target > LAST) {
    if (state.opts.exactFinish) {
      p.exactTries++;
      if (p.exactTries > state.opts.mercyAfter) {
        // Mercy rule: after two failed attempts any roll finishes. §10.3
        ev.push({ type: 'mercy', playerId: p.id });
        ev.push({ type: 'move', playerId: p.id, from, to: LAST, path: range(from + 1, LAST) });
        target = LAST; moved = true;
      } else {
        ev.push({ type: 'blocked', playerId: p.id, at: from, need: LAST - from,
                  value, triesLeft: state.opts.mercyAfter - p.exactTries + 1 });
        target = from;
      }
    } else {
      // OVERSHOOT WINS — walk only as far as 100 and stop there.
      ev.push({ type: 'move', playerId: p.id, from, to: LAST, path: range(from + 1, LAST) });
      target = LAST; moved = true;
    }
  } else if (target !== from) {
    ev.push({ type: 'move', playerId: p.id, from, to: target, path: range(from + 1, target) });
    moved = true;
  }
  p.pos = target;
  if (target > p.best) p.best = target;

  // ── what is on the square you landed on ──
  if (moved && target !== LAST) {
    const L = state.ladders.get(target);
    const S = state.snakes.get(target);
    if (L) {
      p.laddersTaken.push(L.from);
      p.pos = L.to;
      if (p.pos > p.best) p.best = p.pos;
      ev.push({ type: 'ladder', playerId: p.id, ladder: L, from: L.from, to: L.to });
      if (state.opts.shield && L.from === SHIELD_LADDER_FROM && !p.shield) {
        p.shield = true; p.shieldGranted++;
        ev.push({ type: 'shieldGranted', playerId: p.id, reason: 'ladder' });
      }
    } else if (S) {
      if (state.opts.shield && p.shield) {
        p.shield = false; p.shieldUsed++;
        ev.push({ type: 'shield', playerId: p.id, against: 'snake', at: target, snake: S });
      } else {
        p.snakesBitten.push(S.from);
        p.pos = S.to;
        ev.push({ type: 'snake', playerId: p.id, snake: S, from: S.from, to: S.to });
      }
    } else if (state.events.has(target)) {
      p.eventsHit.push(target);
      if (state.opts.shield && p.shield) {
        p.shield = false; p.shieldUsed++;
        ev.push({ type: 'shield', playerId: p.id, against: 'event', at: target });
      } else {
        const to = Math.max(1, target - EVENT_COST);
        p.pos = to;
        ev.push({ type: 'event', playerId: p.id, cell: target, from: target, to, cost: EVENT_COST });
      }
    }
  }

  if (!p.squaresLearned.includes(p.pos)) p.squaresLearned.push(p.pos);
  ev.push({ type: 'land', playerId: p.id, cell: p.pos });

  // ── the Bura Waqt Fund auto-grant, checked for everyone, after every turn ──
  if (state.opts.shield && !state.over) {
    const lead = leaderPos(state);
    for (const q of state.players) {
      const behind = lead - q.pos;
      if (!q.shield && !q.finished && behind >= SHIELD_BEHIND_BY && q.shieldGranted <= q.shieldUsed) {
        q.shield = true; q.shieldGranted++;
        ev.push({ type: 'shieldGranted', playerId: q.id, reason: 'behind', behindBy: behind });
      }
    }
  }

  // ── win: the game ends the instant the first token reaches 100 (§10.3) ──
  if (p.pos === LAST) {
    p.finished = true; p.rank = 1;
    state.winner = p.id;
    state.over = true;
    ev.push({ type: 'win', playerId: p.id, rank: 1 });
    const rest = state.players.filter(x => x !== p).sort((a, b) => b.pos - a.pos);
    rest.forEach((x, i) => { x.rank = i + 2; });
    ev.push({ type: 'ranked', standings: [p, ...rest].map(x => ({ id: x.id, rank: x.rank, pos: x.pos })) });
  }
  state.history.push({ turn: state.turnCount, playerId: p.id, value, from, to: p.pos });

  // ── whose turn next ──
  if (!state.over) {
    if (value === 6 && state.opts.sixExtraTurn) {
      state.consecutiveSixes++;
      if (state.consecutiveSixes >= state.opts.maxConsecutiveSixes) {
        state.consecutiveSixes = 0;
        ev.push({ type: 'turn', playerId: nextPlayer(state).id, reason: 'thirdSix' });
      } else {
        p.sixes++;
        ev.push({ type: 'extraTurn', playerId: p.id, reason: 'six' });
      }
    } else {
      state.consecutiveSixes = 0;
      ev.push({ type: 'turn', playerId: nextPlayer(state).id });
    }
  }
  return ev;
}

function nextPlayer(state) {
  state.turn = (state.turn + 1) % state.players.length;
  return state.players[state.turn];
}

const range = (a, b) => { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; };

/* ── the end screen ─────────────────────────────────────────────────── */
export function summarise(state) {
  return {
    winner: playerById(state, state.winner),
    turns: state.turnCount,
    rounds: Math.ceil(state.turnCount / Math.max(1, state.players.length)),
    players: [...state.players].sort((a, b) => (a.rank || 99) - (b.rank || 99))
      .map(p => ({
        id: p.id, name: p.name, token: p.token, isBot: !!p.isBot, rank: p.rank, pos: p.pos,
        moves: p.moves, ladders: p.laddersTaken.slice(), snakes: p.snakesBitten.slice(),
        events: p.eventsHit.slice(), shieldUsed: p.shieldUsed, shield: p.shield,
        learned: p.squaresLearned.slice().sort((a, b) => a - b),
      })),
    allLadders: [...new Set(state.players.flatMap(p => p.laddersTaken))].sort((a, b) => a - b),
    allSnakes:  [...new Set(state.players.flatMap(p => p.snakesBitten))].sort((a, b) => a - b),
    allEvents:  [...new Set(state.players.flatMap(p => p.eventsHit))].sort((a, b) => a - b),
    /** every square anybody stood on — "Jo chhoot gaya" is the complement of this */
    visited: [...new Set(state.players.flatMap(p => p.squaresLearned))].sort((a, b) => a - b),
  };
}

/** JSON-safe snapshot for window.__SNL.state() */
export function snapshot(state) {
  return {
    over: state.over, winner: state.winner, turn: state.turn, turnCount: state.turnCount,
    lastRoll: state.lastRoll, opts: state.opts,
    players: state.players.map(p => ({
      id: p.id, name: p.name, pos: p.pos, isBot: !!p.isBot, rank: p.rank, finished: p.finished,
      shield: p.shield, ladders: p.laddersTaken.length, snakes: p.snakesBitten.length,
      events: p.eventsHit.length,
    })),
    history: state.history.slice(-25),
  };
}
