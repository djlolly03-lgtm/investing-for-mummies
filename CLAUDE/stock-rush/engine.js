// Stock Rush — game engine (Supabase Realtime, lock-based rounds)
//
// Rounds are LOCK-gated, not timer-gated.
// Students press LOCK when they're done trading. The host sees who has locked
// and presses "Next Round →" when ready (or anytime to force-advance).
// Bots auto-lock a random time after the news drops.
//
// State lives in Supabase `games` (one row per room). Host runs the tick loop.
// Non-host actions travel via Realtime broadcast.

(function () {
  const SUPABASE_URL      = 'https://gkfldkytzfngwnkrwrga.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmxka3l0emZuZ3dua3J3cmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzI4NDksImV4cCI6MjA5NDUwODg0OX0.wwyFY0bhbGhCKCpAjgZ0oCS8gda21FHcvDdvlg9xCmU';

  // ── Room code + game namespace ─────────────────────────────────────────────
  // GAME_KEY is set in game-data.js (e.g. 'sr' for Stock Rush, 'pro' for the
  // Pro version). It gets prefixed onto the room code in the Supabase channel
  // name AND the DB filter so multiple games can share the same backend
  // without ever interfering with each other.
  const GAME_KEY = (window.GAME_CONFIG.gameKey || 'sr').toLowerCase();

  const _params  = new URLSearchParams(window.location.search);
  const _urlRoom = _params.get('room');
  const _urlRole = _params.get('role');

  let ROOM_CODE;
  if (_urlRoom) {
    ROOM_CODE = _urlRoom.toUpperCase();
  } else if (_urlRole === 'host') {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ROOM_CODE = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * 26)]).join('');
    const p = new URLSearchParams(window.location.search);
    p.set('room', ROOM_CODE);
    window.history.replaceState(null, '', '?' + p.toString());
  } else {
    ROOM_CODE = window.GAME_CONFIG.roomCode;
  }
  window.GAME_CONFIG.roomCode = ROOM_CODE;

  // Namespaced room key used for storage + channel — never user-visible.
  // Two games (sr-TEEN vs pro-TEEN) can run at the same time without collision.
  const NS_ROOM = `${GAME_KEY}-${ROOM_CODE}`;

  // ── Supabase client ────────────────────────────────────────────────────────
  if (!window.supabase) {
    document.getElementById('root').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#071a10;color:#fff;font-family:sans-serif;text-align:center;padding:24px">' +
      '<div><div style="font-size:22px;margin-bottom:12px">⚠️ Connection error</div>' +
      '<div style="color:rgba(255,255,255,0.6)">Could not connect to the game server.<br>Please check your internet and refresh.</div></div></div>';
    return;
  }
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const MY_ID   = crypto.randomUUID();
  const listeners = new Set();
  const _kickListeners = new Set();
  let isHost    = false;
  let currentState = _freshState();
  let _tickTimer = null;
  let _lastActivity = Date.now(); // idle timer — auto-reset after 60 min of no human action
  const _IDLE_MS = 60 * 60 * 1000;
  function _bumpActivity() { _lastActivity = Date.now(); }

  // Post-reset grace window — drop any join broadcasts that may have been
  // in-flight or queued from the previous session for a couple of seconds.
  let _resetGuardUntil = 0;

  // ── State shape ────────────────────────────────────────────────────────────

  // Deterministic random selection of N stocks from the full pool, keyed on
  // the game's sessionId. Host and every student tab compute the same 8.
  function _pickStocksForSession(sessionId, count) {
    const pool = (window.STOCKS || []).slice();
    if (pool.length <= count) return pool;
    // Seed a tiny PRNG from sessionId
    let seed = 0;
    const s = String(sessionId || '');
    for (let i = 0; i < s.length; i++) seed = ((seed * 31) + s.charCodeAt(i)) | 0;
    if (!seed) seed = 0x9E3779B9; // fallback
    function rand() {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function _freshState() {
    return {
      phase: 'lobby',
      sessionId: null, // set ONLY by the host in _initHost(); player tabs start with null
      round: 0,
      roundStartedAt: null,   // ms timestamp — for news timing
      paused: false,          // host can pause to discuss; blocks bots + auto-advance
      pausedAt: null,         // ms timestamp when current pause began
      pausedMs: 0,            // accumulated paused ms this round (subtracted from elapsed)
      locks: {},              // { [playerId]: true }  — set when player clicks LOCK
      newsDropped: {},        // { [round]: true }     — prevents double-fire
      stocks: window.STOCKS.map(s => ({ ...s, history: [s.price], prevPrice: s.price })),
      players: {},            // { [id]: { id,name,color,isBot,cash,holdings,worthHistory[] } }
      activity: [],
      reactions: [],
      news: [],
      tradesByRound: {},      // { [round]: { [playerId]: [{ ticker, qty, price }] } }  — for undo-last-trade
      removedPlayers: {},     // archive of humans kicked/left, keyed by id, so a refresh rescan rejoins with portfolio intact
      hostId: null,
      tickCount: 0,
    };
  }

  // ── Pure helpers ───────────────────────────────────────────────────────────

  function netWorth(p, stocks) {
    let v = 0;
    const h = p.holdings || {};
    for (const s of stocks) v += (h[s.id] || 0) * s.price;
    return (p.cash || 0) + v;
  }
  window.netWorth = netWorth;

  function _pushActivity(state, msg, meta) {
    // meta: { playerId, kind:'buy'|'sell'|'lock'|'join'|'news'|'system', ticker, qty, total }
    state.activity.unshift({
      id: crypto.randomUUID(),
      text: msg,
      t: Date.now(),
      ...(meta || {}),
    });
    if (state.activity.length > 30) state.activity.length = 30;
  }

  function _pushReaction(state, playerId, emoji) {
    state.reactions.push({ id: crypto.randomUUID(), playerId, emoji, t: Date.now() });
    state.reactions = state.reactions.filter(r => r.t > Date.now() - 3500);
  }

  function _seedBots(state, maxPlayers = 6) {
    // Only fill up to maxPlayers TOTAL. If there are already that many humans,
    // no bots are seeded. We never add more bots than we have names for.
    const existing  = Object.values(state.players);
    const humans    = existing.filter(p => !p.isBot).length;
    const botsNow   = existing.filter(p =>  p.isBot).length;
    const wantBots  = Math.max(0, Math.min(window.BOT_NAMES.length, maxPlayers - humans));

    // Remove excess bots first (in case a player joined late and pushed us over)
    if (botsNow > wantBots) {
      const botEntries = existing.filter(p => p.isBot);
      for (let i = wantBots; i < botEntries.length; i++) {
        delete state.players[botEntries[i].id];
      }
    }

    // Add bots up to the target count
    let added = 0;
    const currentBotIds = new Set(Object.keys(state.players).filter(id => state.players[id].isBot));
    for (const b of window.BOT_NAMES) {
      if (currentBotIds.size + added >= wantBots) break;
      const id = 'bot-' + b.name.toLowerCase();
      if (!state.players[id]) {
        state.players[id] = {
          id, name: b.name, color: b.color, avatar: b.avatar, isBot: true,
          cash: window.GAME_CONFIG.startingCash, holdings: {}, holdingsCost: {}, worthHistory: [],
        };
        added++;
      }
    }
  }

  // ── DB helpers ─────────────────────────────────────────────────────────────

  // Serialize all writes through a promise chain so concurrent callers
  // (tick loop + _advanceRound + _applyLock) never race each other.
  // Always snapshot currentState at flush time — never a stale capture.
  let _saveQueue = Promise.resolve();

  function _saveToDB() {
    _saveQueue = _saveQueue.then(async () => {
      try {
        await db.from('games').upsert({
          room_code:  NS_ROOM,
          state:      currentState,
          host_id:    MY_ID,
          updated_at: new Date().toISOString(),
        });
      } catch (e) { /* swallow — next tick will retry */ }
    });
  }

  // ── Realtime channel ───────────────────────────────────────────────────────

  const _channel = db.channel(`room:${NS_ROOM}`);

  _channel
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'games',
      filter: `room_code=eq.${NS_ROOM}`,
    }, (payload) => {
      // HOST tab is the writer — it must NEVER read its own DB events back.
      // Stale/queued Supabase events from old sessions would override the fresh lobby.
      // Only player tabs update their state from DB changes.
      if (_isHostTab) return;
      const s = payload.new?.state;
      if (s) { currentState = s; _notify(s); }
    })
    .on('broadcast', { event: 'action' }, ({ payload }) => {
      if (isHost) _handleAction(payload);
    })
    // Host broadcasts fresh state on go-live so open player tabs reset immediately
    // (faster and more reliable than waiting for postgres_changes).
    .on('broadcast', { event: 'reset' }, ({ payload }) => {
      if (_isHostTab) return;
      if (payload?.state) { currentState = payload.state; _notify(payload.state); }
    })
    // Direct state push from host — used for round advance, lock, etc.
    // Players don't have to wait for postgres_changes to catch up.
    .on('broadcast', { event: 'state' }, ({ payload }) => {
      if (_isHostTab) return;
      if (payload?.state) { currentState = payload.state; _notify(payload.state); }
    })
    // Host kicked a player — broadcast tells the player's tab to clear identity.
    .on('broadcast', { event: 'kick' }, ({ payload }) => {
      if (_isHostTab) return;
      if (payload?.playerId) {
        for (const fn of _kickListeners) fn(payload.playerId);
      }
    })
    .subscribe();

  // ── Host election ──────────────────────────────────────────────────────────

  // Host init — always wipes to a fresh lobby and claims ownership.
  // Never reads from DB. Host is the single source of truth.
  async function _initHost() {
    _bumpActivity(); // teacher just went live — reset the idle clock

    const state = _freshState();
    state.sessionId = crypto.randomUUID(); // only the host mints a real session ID
    state.hostId = MY_ID;
    // Pick 8 random stocks from the full pool of 20 — same 8 for every tab
    // because the pick is keyed off this sessionId.
    const picked = _pickStocksForSession(state.sessionId, 8);
    state.stocks = picked.map(s => ({ ...s, history: [s.price], prevPrice: s.price }));
    // Bots are NOT seeded here — they're added at _startGame based on how
    // many students actually joined (filling up to 6 total).
    currentState = state;   // set in-memory first — React can render immediately
    isHost = true;          // claim host BEFORE the async save
    _notify(state);
    try { _saveToDB(); } catch(e) { /* retry on next heartbeat */ }
    // Broadcast fresh state to all open player tabs immediately.
    // This is faster and more reliable than waiting for postgres_changes to propagate.
    try { _channel.send({ type: 'broadcast', event: 'reset', payload: { state } }); } catch(e) {}
  }

  // Host resume — preserves sessionId, players, round, holdings, etc.
  // Used when the teacher refreshes mid-game so students aren't kicked.
  function _resumeHost() {
    if (!currentState || !currentState.sessionId) return false;
    _bumpActivity();
    currentState.hostId = MY_ID;
    isHost = true;
    _notify(currentState);
    try { _saveToDB(); } catch(e) {}
    return true;
  }

  // Peek at DB to see if a game is already in progress for this room.
  // Doesn't claim host — just loads state so the host UI can decide what to do.
  async function _peekExistingGame() {
    try {
      const { data } = await db
        .from('games')
        .select('state')
        .eq('room_code', NS_ROOM)
        .single();
      if (data?.state && data.state.sessionId) {
        currentState = data.state;
        _notify(currentState);
        return data.state;
      }
    } catch(e) {}
    return null;
  }

  // ── Action handling (host only) ────────────────────────────────────────────

  function _handleAction(msg) {
    if (!currentState) return;
    _bumpActivity(); // any incoming action counts as activity
    switch (msg.t) {
      case 'join':    _applyJoin(msg.player);                        break;
      case 'trade':   _applyTrade(msg.playerId, msg.ticker, msg.qty); break;
      case 'undoLastTrade': _applyUndoLastTrade(msg.playerId);        break;
      case 'react':   _applyReact(msg.playerId, msg.emoji);          break;
      case 'lock':    _applyLock(msg.playerId);                      break;
      case 'unlock':  _applyUnlock(msg.playerId);                    break;
      case 'advance': _advanceRound();                               break;
      case 'start':   _startGame();                                  break;
      case 'reset':   _doReset();                                    break;
    }
  }

  function _applyJoin(player) {
    // Reject joins from old sessions — sessionId must match the current game.
    if (currentState.sessionId && player.sessionId !== currentState.sessionId) return;
    // Drop ALL joins for a brief window right after a reset.
    if (Date.now() < _resetGuardUntil) return;
    // Game's done — no joins or rejoins make sense.
    if (currentState.phase === 'ended') return;

    // Already in the game (refresh, lost connection, retry broadcast) — no-op.
    // This is what makes a tab refresh "just work": their portfolio stays put.
    if (currentState.players[player.id]) return;

    // REJOIN: this id is in the soft-deleted archive (kicked, host-refreshed,
    // briefly dropped). Restore their portfolio so they don't lose progress.
    if (currentState.removedPlayers && currentState.removedPlayers[player.id]) {
      currentState.players[player.id] = currentState.removedPlayers[player.id];
      // Refresh display fields in case they came back with a new name/avatar.
      currentState.players[player.id].name   = player.name   || currentState.players[player.id].name;
      currentState.players[player.id].color  = player.color  || currentState.players[player.id].color;
      currentState.players[player.id].avatar = player.avatar || currentState.players[player.id].avatar;
      delete currentState.removedPlayers[player.id];
      _pushActivity(currentState, `${player.name} rejoined`, { kind: 'join', playerId: player.id });
      _saveToDB();
      _notify(currentState);
      return;
    }

    // NEW JOINER — accept during lobby OR mid-game (late join with full ₹1L).
    const startingCash = window.GAME_CONFIG.startingCash;
    currentState.players[player.id] = {
      ...player,
      cash: startingCash,
      holdings: {},       // { [ticker]: qty }
      holdingsCost: {},   // { [ticker]: avgCostPerShare }
      worthHistory: [],
    };
    if (currentState.phase === 'playing') {
      // Late joiner: backfill worthHistory so the leaderboard sparkline shows
      // them flat at the baseline before their entry point.
      const priorRounds = Math.max(1, currentState.round);
      currentState.players[player.id].worthHistory = new Array(priorRounds).fill(startingCash);
      _pushActivity(currentState, `${player.name} joined (Round ${currentState.round})`,
        { kind: 'join', playerId: player.id });
    } else {
      _pushActivity(currentState, `${player.name} joined`, { kind: 'join', playerId: player.id });
    }
    _saveToDB();
    _notify(currentState);
  }

  function _applyTrade(playerId, ticker, qty) {
    const state = currentState;
    const p = state.players[playerId];
    const s = state.stocks.find(s => s.id === ticker);
    if (!p || !s || state.phase !== 'playing') return;
    if (state.locks[playerId]) return; // locked players can't trade

    // Pre-trade net worth — used to detect "big bets" (>=50% of worth in one trade)
    const preWorth = (p.cash || 0) + state.stocks.reduce(
      (sum, st) => sum + ((p.holdings?.[st.id] || 0) * st.price), 0);

    // Record this trade in the per-round journal so undoLastTrade can reverse it.
    function _journalPush(rec) {
      if (!state.tradesByRound) state.tradesByRound = {};
      if (!state.tradesByRound[state.round]) state.tradesByRound[state.round] = {};
      const bucket = state.tradesByRound[state.round][playerId] || [];
      bucket.push(rec);
      state.tradesByRound[state.round][playerId] = bucket;
    }

    if (qty > 0) {
      const cost = s.price * qty;
      if (p.cash < cost) return;
      // Update average cost before adjusting qty
      const prevQty  = p.holdings[ticker] || 0;
      const prevCost = (p.holdingsCost || {})[ticker] || s.price;
      if (!p.holdingsCost) p.holdingsCost = {};
      p.holdingsCost[ticker] = (prevCost * prevQty + s.price * qty) / (prevQty + qty);
      p.cash -= cost;
      p.holdings[ticker] = prevQty + qty;
      const isBig = preWorth > 0 && (cost / preWorth) >= 0.5;
      _pushActivity(state, `${p.name} bought ${qty} ${ticker}`,
        { kind: 'buy', playerId, ticker, qty, total: cost,
          big: isBig, bigPct: isBig ? Math.round((cost / preWorth) * 100) : 0 });
      _journalPush({ ticker, qty, price: s.price, prevAvgCost: prevCost, prevQty });
    } else {
      const have = p.holdings[ticker] || 0;
      const sellQty = Math.min(have, -qty);
      if (sellQty <= 0) return;
      const proceeds = s.price * sellQty;
      p.cash += proceeds;
      p.holdings[ticker] = have - sellQty;
      const isBig = preWorth > 0 && (proceeds / preWorth) >= 0.5;
      // Keep holdingsCost as-is (avg cost doesn't change on sell)
      _pushActivity(state, `${p.name} sold ${sellQty} ${ticker}`,
        { kind: 'sell', playerId, ticker, qty: sellQty, total: proceeds,
          big: isBig, bigPct: isBig ? Math.round((proceeds / preWorth) * 100) : 0 });
      _journalPush({ ticker, qty: -sellQty, price: s.price });
    }
    _saveToDB();
    _notify(state);
  }

  // Reverse the last trade made by this player in the current round.
  // Pops the journal entry, refunds/recharges cash, restores holdings and
  // (for buys) the previous avg cost. Disallowed once the player has locked.
  function _applyUndoLastTrade(playerId) {
    const state = currentState;
    if (!state || state.phase !== 'playing') return;
    if (state.locks?.[playerId]) return;
    const p = state.players[playerId];
    if (!p) return;
    const bucket = state.tradesByRound?.[state.round]?.[playerId];
    if (!bucket || bucket.length === 0) return;
    const last = bucket.pop();
    const s = state.stocks.find(st => st.id === last.ticker);
    if (!s) return;
    if (last.qty > 0) {
      // Undo a BUY: refund cash, remove shares, restore prev avg cost.
      const cost = last.price * last.qty;
      p.cash = (p.cash || 0) + cost;
      p.holdings[last.ticker] = Math.max(0, (p.holdings[last.ticker] || 0) - last.qty);
      if (p.holdingsCost) {
        if ((last.prevQty || 0) > 0) p.holdingsCost[last.ticker] = last.prevAvgCost;
        else delete p.holdingsCost[last.ticker];
      }
    } else {
      // Undo a SELL: take back cash, restore shares.
      const sellQty = -last.qty;
      const proceeds = last.price * sellQty;
      p.cash = (p.cash || 0) - proceeds;
      p.holdings[last.ticker] = (p.holdings[last.ticker] || 0) + sellQty;
    }
    _pushActivity(state, `↶ ${p.name} undid last trade`, { kind: 'system', playerId });
    _saveToDB();
    _notify(state);
  }

  function _applyReact(playerId, emoji) {
    _pushReaction(currentState, playerId, emoji);
    _saveToDB();
    _notify(currentState);
  }

  function _applyLock(playerId) {
    const state = currentState;
    if (state.phase !== 'playing') return;
    if (state.locks[playerId]) return; // already locked
    state.locks[playerId] = true;
    if (!state.lockTimes) state.lockTimes = {};
    state.lockTimes[playerId] = Date.now(); // for the 5-second undo window
    const name = state.players[playerId]?.name || playerId;
    _pushActivity(state, `🔒 ${name} locked in`, { kind: 'lock', playerId });
    _saveToDB();
    _notify(state);
    _pushState();
  }

  // Undo a lock — only allowed within 5 seconds of locking, and only by the
  // same player. After the window expires, the lock is final.
  function _applyUnlock(playerId) {
    const state = currentState;
    if (state.phase !== 'playing') return;
    if (!state.locks[playerId]) return;
    const lockedAt = state.lockTimes?.[playerId];
    if (!lockedAt || Date.now() - lockedAt > 5000) return; // too late
    delete state.locks[playerId];
    if (state.lockTimes) delete state.lockTimes[playerId];
    const name = state.players[playerId]?.name || playerId;
    _pushActivity(state, `↶ ${name} unlocked (back to trading)`, { kind: 'system', playerId });
    _saveToDB();
    _notify(state);
    _pushState();
  }

  // ── News helper — fires immediately at round start ─────────────────────────
  // Call this after state.round is set to the new round number.

  function _applyRoundNews(state) {
    const newsEvent = window.NEWS_SCRIPT.find(n => n.round === state.round);
    if (!newsEvent) return;
    if (!state.newsDropped) state.newsDropped = {};
    if (state.newsDropped[state.round]) return; // already fired (shouldn't happen)
    state.newsDropped[state.round] = true;
    state.news.unshift({ ...newsEvent, t: Date.now() });
    for (const s of state.stocks) {
      const mult = newsEvent.impacts[s.id];
      if (mult) {
        s.prevPrice = s.price;
        s.price     = +(s.price * mult).toFixed(2);
        s.history.push(s.price);
      }
    }
    _pushActivity(state, `📰 ${newsEvent.headline}`);
  }

  // Silent finale price reveal — fires once after R5 locks. No popup, no news
  // entry, no activity log. Just one last price shake-up so two students who
  // looked neck-and-neck during R5 trade could swap places on the results
  // screen. The reveal IS the drama.
  function _applyFinaleReveal(state) {
    const reveals = window.FINALE_PRICES || {};
    if (state.finaleApplied) return;
    state.finaleApplied = true;
    for (const s of state.stocks) {
      const mult = reveals[s.id];
      if (mult) {
        s.prevPrice = s.price;
        s.price     = +(s.price * mult).toFixed(2);
        s.history.push(s.price);
      }
    }
  }

  function _startGame() {
    if (!isHost) return;
    _bumpActivity(); // teacher clicked Start — reset idle clock
    const state = currentState;
    _seedBots(state);
    for (const p of Object.values(state.players)) {
      p.worthHistory = [window.GAME_CONFIG.startingCash];
    }
    state.phase          = 'playing';
    state.round          = 1;
    state.roundStartedAt = Date.now();
    state.locks          = {};
    state.newsDropped    = {};
    state.news           = [];
    const year = window.ROUND_YEARS?.[0] || '';
    state.activity = [{ id: crypto.randomUUID(), text: `Round 1 begins — ${year}`, t: Date.now() }];
    // R1 starts with BASE prices (May 2016). No news yet — the news that
    // belongs to a round fires when that round LOCKS, not when it begins.
    // Snapshot starting cash + holdings so we can compute per-round deltas
    // for the "class pulse" feature on the locked screen.
    for (const p of Object.values(state.players)) {
      p.roundStartCash     = p.cash;
      p.roundStartHoldings = { ...(p.holdings || {}) };
    }
    // R1 has no transition popup, so the countdown starts immediately.
    state.roundTimerStartsAt = Date.now();
    _saveToDB();
    _notify(state);
    _pushState();
  }

  function _advanceRound() {
    if (!isHost) return;
    _bumpActivity(); // teacher clicked Next Round — reset idle clock
    const state = currentState;
    if (state.phase !== 'playing') return;
    const cfg = window.GAME_CONFIG;

    // Snapshot worth at END of the round, BEFORE this round's news moves prices
    for (const p of Object.values(state.players)) {
      if (!p.worthHistory) p.worthHistory = [cfg.startingCash];
      p.worthHistory.push(netWorth(p, state.stocks));
    }

    // Fire THIS round's news — the events of the year that just finished.
    // Demon hits when R1 locks, Jio+DMart hits when R2 locks, etc.
    _applyRoundNews(state);

    if (state.round >= cfg.rounds) {
      // Silent Mar 2026 price reveal — no popup, no news, no activity log.
      // Just one last price shake-up so neck-and-neck students might swap
      // places when EndedOverlay shows. Drama-by-reveal.
      _applyFinaleReveal(state);
      // Push the post-finale worth so the journey chart shows the 2026 leg.
      for (const p of Object.values(state.players)) {
        if (!p.worthHistory) p.worthHistory = [cfg.startingCash];
        p.worthHistory.push(netWorth(p, state.stocks));
      }
      state.phase = 'ended';
      _pushActivity(state, '🏁 Game over — final results');
    } else {
      state.round++;
      state.roundStartedAt = Date.now();
      state.locks          = {};
      // Countdown timer is PAUSED until the teacher dismisses the round
      // transition popup. Cleared here, set by startRoundTimer().
      state.roundTimerStartsAt = null;
      // Clear any pause state from the previous round — pausedMs accumulates
      // PER-ROUND wall time and doesn't carry over. Without this, a teacher
      // who paused in R2 and clicked Force Next R3 would land in R3 with
      // paused=true stuck; clicking Resume wouldn't visibly unpause because
      // the timer was already null waiting for startRoundTimer.
      state.paused    = false;
      state.pausedAt  = null;
      state.pausedMs  = 0;
      const year = window.ROUND_YEARS?.[state.round - 1] || '';
      _pushActivity(state, `Round ${state.round} begins — ${year}`);
      // (News for this NEW round will fire when IT locks, not at its start.)
      // Snapshot fresh round-start cash + holdings for the class-pulse feature.
      for (const p of Object.values(state.players)) {
        p.roundStartCash     = p.cash;
        p.roundStartHoldings = { ...(p.holdings || {}) };
      }
    }

    _saveToDB();
    _notify(state);
    _pushState();
  }

  function _doReset() {
    _bumpActivity();
    _resetGuardUntil = Date.now() + 2500; // drop incoming joins for 2.5s
    const state = _freshState();
    state.sessionId = crypto.randomUUID(); // must always mint a new session on reset
    state.hostId = MY_ID;
    state.players = {}; // belt-and-suspenders: ensure no carryover
    // Pick a fresh random 8 stocks for the new session
    const picked = _pickStocksForSession(state.sessionId, 8);
    state.stocks = picked.map(s => ({ ...s, history: [s.price], prevPrice: s.price }));
    // Bots get added when the game actually starts, not on reset.
    currentState = state;
    _saveToDB();
    _notify(state);
    // Rebroadcast a few times so any player tab that missed the first
    // packet (mobile background, weak signal) still gets reset.
    const send = () => { try { _channel.send({ type: 'broadcast', event: 'reset', payload: { state } }); } catch(e) {} };
    send();
    setTimeout(send, 400);
    setTimeout(send, 1200);
  }

  // Replay with the same human roster — preserves player identities (id, name,
  // color, avatar, sessionId) but resets cash/holdings/journal so they start
  // round 1 clean. Bots are dropped (re-seeded at _startGame).
  function _doReplaySamePlayers() {
    _bumpActivity();
    _resetGuardUntil = Date.now() + 2500;
    const prior = currentState || _freshState();
    const startingCash = window.GAME_CONFIG.startingCash;
    // Carry over only humans, stripped down to identity + fresh wallet.
    const preservedPlayers = {};
    for (const p of Object.values(prior.players || {})) {
      if (p.isBot) continue;
      preservedPlayers[p.id] = {
        id: p.id,
        name: p.name,
        color: p.color,
        avatar: p.avatar,
        isBot: false,
        sessionId: p.sessionId, // keep so existing player tabs aren't rejected by sessionId guard
        cash: startingCash,
        holdings: {},
        holdingsCost: {},
        worthHistory: [],
      };
    }
    const state = _freshState();
    state.sessionId = prior.sessionId || crypto.randomUUID(); // KEEP sessionId so player tabs stay valid
    state.hostId = MY_ID;
    state.players = preservedPlayers;
    // Fresh stock pick keyed off the (preserved) sessionId — same 8 stocks again
    // so the deterministic pick matches what the player tabs already know about.
    const picked = _pickStocksForSession(state.sessionId, 8);
    state.stocks = picked.map(s => ({ ...s, history: [s.price], prevPrice: s.price }));
    currentState = state;
    _saveToDB();
    _notify(state);
    const send = () => { try { _channel.send({ type: 'broadcast', event: 'reset', payload: { state } }); } catch(e) {} };
    send();
    setTimeout(send, 400);
    setTimeout(send, 1200);
  }

  // ── Tick loop (host only) ──────────────────────────────────────────────────
  // News now fires at round start — tick only handles bots and reactions.

  function _tick() {
    if (!isHost) return;
    const state = currentState;
    state.tickCount = (state.tickCount || 0) + 1;

    // ── Idle auto-reset ───────────────────────────────────────────────────────
    // If no one has interacted for 60 minutes, wipe back to a fresh lobby so
    // the next teacher (or the same one returning later) starts clean. Any
    // teacher click, student trade, or player broadcast bumps _lastActivity
    // via _bumpActivity, so an active class never trips this.
    if (Date.now() - _lastActivity > _IDLE_MS) {
      _bumpActivity(); // prevent re-fire while reset propagates
      _doReset();
      return;
    }

    // ── Lobby: do nothing except a quiet heartbeat every 30 s ─────────────────
    // No game logic, no React re-renders, no DB spam until teacher starts.
    if (state.phase !== 'playing') {
      if (state.tickCount % 30 === 0) _saveToDB(); // heartbeat only
      return;
    }

    // ── Playing only ──────────────────────────────────────────────────────────
    // PAUSED: don't trade for bots, don't auto-lock, don't tick the round.
    if (state.paused) {
      // Still prune reactions so they don't linger forever
      state.reactions = state.reactions.filter(r => r.t > Date.now() - 3500);
      _saveToDB();
      _notify(state);
      return;
    }

    // Bot trades every 3rd tick
    if (state.tickCount % 3 === 0) _botTrade(state);

    // Bots auto-lock gradually — ~2% chance per tick (~50s average)
    for (const p of Object.values(state.players)) {
      if (p.isBot && !state.locks?.[p.id] && Math.random() < 0.02) {
        state.locks[p.id] = true;
      }
    }

    // Prune ephemeral reactions
    state.reactions = state.reactions.filter(r => r.t > Date.now() - 3500);

    _saveToDB();
    _notify(state);
  }

  function _botTrade(state) {
    if (!state.locks) state.locks = {};
    for (const p of Object.values(state.players)) {
      if (!p.isBot || state.locks[p.id] || Math.random() > 0.35) continue;
      const s      = state.stocks[Math.floor(Math.random() * state.stocks.length)];
      const change = s.price - (s.history[s.history.length - 6] || s.price);
      const wantBuy = change > 0 ? Math.random() < 0.7 : Math.random() < 0.3;
      if (wantBuy) {
        const qty  = Math.max(1, Math.floor(Math.random() * 5));
        const cost = qty * s.price;
        if (p.cash >= cost) {
          const prevQty  = p.holdings[s.id] || 0;
          const prevCost = (p.holdingsCost || {})[s.id] || s.price;
          if (!p.holdingsCost) p.holdingsCost = {};
          p.holdingsCost[s.id] = (prevCost * prevQty + s.price * qty) / (prevQty + qty);
          p.cash -= cost;
          p.holdings[s.id] = prevQty + qty;
          _pushActivity(state, `${p.name} bought ${qty} ${s.id}`,
            { kind: 'buy', playerId: p.id, ticker: s.id, qty, total: cost });
        }
      } else {
        const have = p.holdings[s.id] || 0;
        if (have > 0) {
          const qty = Math.max(1, Math.floor(Math.random() * have));
          const proceeds = qty * s.price;
          p.cash += proceeds;
          p.holdings[s.id] = have - qty;
          _pushActivity(state, `${p.name} sold ${qty} ${s.id}`,
            { kind: 'sell', playerId: p.id, ticker: s.id, qty, total: proceeds });
        }
      }
    }
  }

  function _notify(state) {
    // Spread to a new object so React's useState detects the change.
    // The engine mutates currentState in-place; without this spread
    // React sees the same reference and skips the re-render.
    const snap = { ...state };
    for (const fn of listeners) fn(snap);
  }

  // Host-only: push the latest state to all player tabs immediately
  // via broadcast. This is faster and more reliable than relying on
  // postgres_changes — important for round transitions and locks.
  function _pushState() {
    if (!isHost || !currentState) return;
    try { _channel.send({ type: 'broadcast', event: 'state', payload: { state: currentState } }); } catch(e) {}
  }

  function _sendAction(msg) {
    _channel.send({ type: 'broadcast', event: 'action', payload: msg });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const StockRush = {
    myId: MY_ID,

    getState() { return currentState; },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // Player tab subscribes to kick events — callback receives the kicked playerId.
    onKick(fn) {
      _kickListeners.add(fn);
      return () => _kickListeners.delete(fn);
    },

    join(player) {
      if (isHost) _applyJoin(player);
      else _sendAction({ t: 'join', player });
    },

    leave(playerId) {
      if (!currentState?.players[playerId]) return;
      delete currentState.players[playerId];
      if (isHost) { _saveToDB(); _notify(currentState); }
    },

    // Host-only: remove a player from the game and notify their tab to
    // bounce back to the join screen (so they can pick a new name/avatar).
    kick(playerId) {
      if (!isHost) return;
      if (!currentState?.players[playerId]) return;
      const player = currentState.players[playerId];
      const name   = player.name;
      // Archive humans into removedPlayers so a rescan/refresh restores their
      // portfolio. Bots never come back so don't bother archiving them.
      if (!player.isBot) {
        if (!currentState.removedPlayers) currentState.removedPlayers = {};
        currentState.removedPlayers[playerId] = player;
      }
      delete currentState.players[playerId];
      if (currentState.locks)  delete currentState.locks[playerId];
      _pushActivity(currentState, `👋 ${name} was removed`);
      _saveToDB();
      _notify(currentState);
      _pushState();
      try {
        _channel.send({ type: 'broadcast', event: 'kick', payload: { playerId } });
      } catch(e) {}
    },

    trade(playerId, ticker, qty) {
      if (isHost) _applyTrade(playerId, ticker, qty);
      else _sendAction({ t: 'trade', playerId, ticker, qty });
    },

    undoLastTrade(playerId) {
      if (isHost) _applyUndoLastTrade(playerId);
      else _sendAction({ t: 'undoLastTrade', playerId });
    },

    react(playerId, emoji) {
      if (isHost) _applyReact(playerId, emoji);
      else _sendAction({ t: 'react', playerId, emoji });
    },

    lock(playerId) {
      if (isHost) _applyLock(playerId);
      else _sendAction({ t: 'lock', playerId });
    },

    unlock(playerId) {
      if (isHost) _applyUnlock(playerId);
      else _sendAction({ t: 'unlock', playerId });
    },

    advanceRound() {
      if (isHost) _advanceRound();
      else _sendAction({ t: 'advance' });
    },

    // Host-only: kick off the round's countdown timer. Called when the
    // teacher dismisses the round-transition popup, NOT when the round itself
    // begins. Lets the teacher discuss the news for as long as they need
    // without the clock ticking down behind them.
    startRoundTimer() {
      if (!isHost) return;
      if (!currentState || currentState.phase !== 'playing') return;
      if (currentState.roundTimerStartsAt) return; // already running
      _bumpActivity(); // teacher started round timer — reset idle clock
      currentState.roundTimerStartsAt = Date.now();
      _saveToDB();
      _notify(currentState);
      _pushState();
    },

    // Host-only — toggle a global pause. Freezes bots, auto-advance, and
    // accumulates pausedMs so the round timer resumes from exactly where it
    // stopped. Trades from students are still allowed during pause.
    togglePause() {
      if (!isHost) return;
      if (!currentState || currentState.phase !== 'playing') return;
      _bumpActivity(); // teacher toggled pause — reset idle clock
      const now = Date.now();
      if (currentState.paused) {
        // Resume: bank the elapsed paused time
        const pauseSpan = now - (currentState.pausedAt || now);
        currentState.pausedMs = (currentState.pausedMs || 0) + pauseSpan;
        currentState.pausedAt = null;
        currentState.paused = false;
        _pushActivity(currentState, '▶️ Game resumed', { kind: 'system' });
      } else {
        currentState.paused = true;
        currentState.pausedAt = now;
        _pushActivity(currentState, '⏸ Game paused', { kind: 'system' });
      }
      _saveToDB();
      _notify(currentState);
      _pushState();
    },

    goLive() {
      // Resume the in-progress game if one exists (teacher refreshed mid-game),
      // otherwise start a fresh lobby. Either way the teacher ends up as host.
      if (isHost) return;
      const resumable = currentState && currentState.sessionId && currentState.phase !== 'ended';
      if (resumable) _resumeHost();
      else _initHost();
      if (!_tickTimer) _tickTimer = setInterval(_tick, window.GAME_CONFIG.tickMs);
    },

    // Has an in-progress game already been loaded from DB for this room?
    hasExistingGame() {
      return !!(currentState && currentState.sessionId && currentState.phase !== 'ended');
    },

    startGame() {
      if (isHost) _startGame();
      else _sendAction({ t: 'start' });
    },

    reset() {
      if (isHost) _doReset();
      else _sendAction({ t: 'reset' });
    },

    // Host-only: end the game and reopen the lobby with the SAME human
    // players (id, name, avatar, sessionId preserved; cash/holdings reset).
    replayWithSamePlayers() {
      if (!isHost) return;
      _doReplaySamePlayers();
    },
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  // Host tab  → resets to fresh lobby, owns the tick loop, can start/advance.
  // Player tab → read-only follower; NEVER becomes host, NEVER resets state.

  // Host mode requires an explicit ?role=host in the URL. Any other value
  // (or no role at all) means "not host" — so random tabs hitting the URL
  // won't race the real teacher for host of the shared TEEN room.
  const _isHostTab = _urlRole === 'host';

  if (_isHostTab) {
    // Peek at the DB so we know whether a game is already in progress
    // (teacher refreshed mid-game). UI can decide to auto-resume vs show Go Live.
    StockRush.ready = _peekExistingGame();

  } else {
    // Student tab: load current state once, then rely on realtime subscription.
    // Never becomes host, never writes state to DB.
    (async () => {
      try {
        const { data } = await db
          .from('games')
          .select('state')
          .eq('room_code', NS_ROOM)
          .single();
        if (data?.state) { currentState = data.state; _notify(currentState); }
      } catch(e) {}
    })();
  }

  window.StockRush = StockRush;
})();
