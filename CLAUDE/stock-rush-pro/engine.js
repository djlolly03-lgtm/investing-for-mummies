// Stock Rush Pro — game engine (Supabase Realtime, event-gated rounds)
//
// Round flow:
//   lobby → [startGame] → events (process corporate actions) → trading → [advanceRound] → …
//
// AUTO events (dividend, split, bonus) apply instantly to all players.
// CHOICE events (ipo, buyback, rights) collect a choice from every player/bot,
// then apply results and move on.
//
// State lives in Supabase `games` (one row per room). One client acts as host
// and runs the tick loop. Non-host actions travel via Realtime broadcast.
// Stale-host detection: if updated_at is >5 s old a new client claims host.

(function () {
  const SUPABASE_URL      = 'https://gkfldkytzfngwnkrwrga.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmxka3l0emZuZ3dua3J3cmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzI4NDksImV4cCI6MjA5NDUwODg0OX0.wwyFY0bhbGhCKCpAjgZ0oCS8gda21FHcvDdvlg9xCmU';

  // ── Room code ───────────────────────────────────────────────────────────────
  const _params  = new URLSearchParams(window.location.search);
  const _urlRoom = _params.get('room');
  const _urlRole = _params.get('role');

  // Room-code selection — matches teen's behaviour so parallel workshops don't
  // stomp each other, and yesterday's GO25 hard-fallback disaster can't repeat:
  //   • explicit ?room=XYZ → use it (host reload / student QR / shared link)
  //   • ?role=host or bare URL → mint a fresh 4-letter code, replaceState
  //   • ?role=player with no room → only path that keeps the GAME_CONFIG default
  //     (should never happen in practice; harmless dead-end fallback)
  let ROOM_CODE;
  if (_urlRoom) {
    ROOM_CODE = _urlRoom.toUpperCase();
  } else if (_urlRole === 'host' || !_urlRole) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ROOM_CODE = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * 26)]).join('');
    const p = new URLSearchParams(window.location.search);
    p.set('room', ROOM_CODE);
    if (!_urlRole) p.set('role', 'host');   // pin us as host for any later reload
    window.history.replaceState(null, '', '?' + p.toString());
  } else {
    ROOM_CODE = window.GAME_CONFIG.roomCode;
  }
  window.GAME_CONFIG.roomCode = ROOM_CODE;

  // ── Supabase client ─────────────────────────────────────────────────────────
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const MY_ID    = crypto.randomUUID();
  const listeners = new Set();
  const _kickListeners = new Set();
  let isHost     = false;
  let currentState = _freshState();
  let _tickTimer = null;

  // Mid-round event fires this many ms (pause-adjusted) into the trading phase.
  // Tuned to land in the middle of a typical 60-90s round.
  const MID_EVENT_DELAY_MS = 30000;

  // Idle auto-reset — 60 min matches teen. Stops a stale projector game
  // hanging around overnight; short enough that a teacher hitting the URL
  // fresh in the morning gets a clean lobby, long enough that a bathroom
  // break during a workshop won't wipe the class.
  let _lastActivity = Date.now();
  const _IDLE_MS = 60 * 60 * 1000;
  function _bumpActivity() { _lastActivity = Date.now(); }

  // ── Pure helpers ────────────────────────────────────────────────────────────

  function netWorth(player, stocks) {
    let v = 0;
    for (const s of stocks) v += (player.holdings[s.id] || 0) * s.price;
    return player.cash + v;
  }
  window.netWorth = netWorth;

  function formatStockPrice(price) {
    if (price >= 1000) return '₹' + (price / 1000).toFixed(2) + 'k';
    return '₹' + price;
  }
  window.formatStockPrice = formatStockPrice;

  function _pushActivity(state, msg, extra = {}) {
    state.activity.unshift({ id: crypto.randomUUID(), text: msg, t: Date.now(), ...extra });
    if (state.activity.length > 40) state.activity.length = 40;
  }

  function _pushReaction(state, playerId, emoji) {
    state.reactions.push({ id: crypto.randomUUID(), playerId, emoji, t: Date.now() });
    state.reactions = state.reactions.filter(r => r.t > Date.now() - 3500);
  }

  // ── State factory ───────────────────────────────────────────────────────────

  function _freshState() {
    // Pick a random game configuration (stocks + events) — stored in state so
    // all clients share the same selection for the lifetime of this game.
    const gameData = (typeof window.pickGameStocks === 'function')
      ? window.pickGameStocks() : null;
    const initStocks = gameData ? gameData.stocks : (window.STOCKS || []);
    const r1Prices   = gameData
      ? (gameData.roundPrices[0] || {})
      : ((window.ROUND_PRICES || [])[0] || {});

    return {
      phase: 'lobby',       // 'lobby' | 'events' | 'trading' | 'ended'
      round: 0,             // 1-indexed when playing
      roundStartedAt: null,
      paused: false,        // teacher can pause to discuss; blocks bot + human trades
      pausedAt: null,       // ms timestamp when pause began (cleared on resume)
      pausedMs: 0,          // accumulated paused milliseconds this round

      // ── Randomly-selected game data (set once, persisted in DB) ────────────
      roundPrices:  gameData?.roundPrices  ?? window.ROUND_PRICES  ?? [],
      eventScript:  gameData?.eventScript  ?? window.EVENT_SCRIPT  ?? [],
      ipoStockMeta: gameData?.ipoStockMeta ?? window.ZOMATO_STOCK  ?? null,
      finalPrices:  gameData?.finalPrices  ?? window.FINAL_PRICES  ?? {},

      // Event sub-system
      eventQueue: [],       // remaining events to process this round
      currentEvent: null,   // event being shown/processed right now
      eventChoices: {},     // { [playerId]: 'accept' | 'reject' | { amount: N } }

      stocks: initStocks.map(s => ({
        ...s,
        price: r1Prices[s.id] || 0,
        history: [],
        prevPrice: r1Prices[s.id] || 0,
      })),

      players: {},
      // { [id]: {
      //     id, name, color, isBot,
      //     cash, holdings, holdingsCost,
      //     worthHistory,    // [startingCash, ...worthAfterEachRound]
      //     dividendsEarned,
      //     zomatoAllocated, // boolean
      //   } }

      activity: [],
      reactions: [],
      news: [],
      locks: {},
      hostId: null,
      tickCount: 0,

      // Soft-deleted player archive — populated when teacher kicks a student
      // or a leave action is processed. If that same player ID rejoins later
      // (e.g. they refresh, get back online, or scan the QR again with their
      // localStorage intact), we restore their portfolio from here instead of
      // creating a fresh entry. Cleared on _freshState (true wipe).
      removedPlayers: {},
    };
  }

  // ── Seed bots ───────────────────────────────────────────────────────────────

  function _seedBots(state) {
    for (const b of window.BOT_NAMES) {
      const id = 'bot-' + b.name.toLowerCase();
      if (!state.players[id]) {
        state.players[id] = _makePlayer(id, b.name, b.color, true, b.emoji);
      }
    }
  }

  // Trim or add bots so total players = max(6, humanCount). Bots only fill
  // empty seats up to 6; if 7+ humans join, bots get evicted entirely.
  function _balanceBots(state) {
    const TARGET = 6;
    const humans = Object.values(state.players).filter(p => !p.isBot);
    const botEntries = Object.entries(state.players).filter(([, p]) => p.isBot);
    const botsNeeded = Math.max(0, TARGET - humans.length);

    // Too many bots → remove from the end
    if (botEntries.length > botsNeeded) {
      const toRemove = botEntries.slice(botsNeeded);
      for (const [id] of toRemove) {
        delete state.players[id];
        if (state.locks) delete state.locks[id];
        if (state.eventChoices) delete state.eventChoices[id];
      }
    }
    // Not enough bots → top up from BOT_NAMES in order
    if (botEntries.length < botsNeeded) {
      for (const b of window.BOT_NAMES) {
        if (humans.length + Object.values(state.players).filter(p => p.isBot).length >= TARGET) break;
        const id = 'bot-' + b.name.toLowerCase();
        if (!state.players[id]) {
          state.players[id] = _makePlayer(id, b.name, b.color, true, b.emoji);
        }
      }
    }
  }

  function _makePlayer(id, name, color, isBot, avatar) {
    return {
      id, name, color, avatar, isBot,
      cash: window.GAME_CONFIG.startingCash,
      holdings: {},
      holdingsCost: {},
      worthHistory: [],
      dividendsEarned: 0,
      zomatoAllocated: false,
    };
  }

  // ── DB helpers ──────────────────────────────────────────────────────────────

  async function _saveToDB(state) {
    await db.from('games').upsert({
      room_code:  ROOM_CODE,
      state,
      host_id:    MY_ID,
      updated_at: new Date().toISOString(),
    });
  }

  // ── Realtime channel ────────────────────────────────────────────────────────

  const _channel = db.channel(`room:${ROOM_CODE}`);

  _channel
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'games',
      filter: `room_code=eq.${ROOM_CODE}`,
    }, (payload) => {
      const s = payload.new?.state;
      // Host is the authoritative writer — it never reads back from DB via this
      // channel. _notify() now emits a shallow copy on every call, so React
      // always gets a new object reference and re-renders correctly without
      // relying on the postgres_changes echo. Letting the host read DB state
      // here risks a stale write from a previous session overwriting the
      // current in-memory state (e.g. an old trading-phase echo arriving while
      // the host is mid-lobby, causing the game to appear to "auto-start").
      if (s && !isHost) { currentState = s; _notify(s); }
    })
    .on('broadcast', { event: 'action' }, ({ payload }) => {
      if (isHost) _handleAction(payload);
    })
    .on('broadcast', { event: 'kick' }, ({ payload }) => {
      if (!payload || !payload.playerId) return;
      for (const fn of _kickListeners) fn(payload.playerId);
    })
    .subscribe();

  // ── Peek existing game (host UI calls this before goLive) ───────────────────

  // Games older than this are treated as abandoned — Go Live starts fresh.
  const STALE_GAME_MS = 30 * 60 * 1000;
  let _lastPeekUpdatedAt = null;

  async function _peekExistingGame() {
    try {
      const { data } = await db
        .from('games')
        .select('state, updated_at')
        .eq('room_code', ROOM_CODE)
        .single();
      _lastPeekUpdatedAt = data?.updated_at || null;
      if (data?.state) {
        currentState = data.state;
        _notify(currentState);
        return data.state;
      }
    } catch (e) {}
    return null;
  }

  function _peekIsStale() {
    if (!_lastPeekUpdatedAt) return false;
    const age = Date.now() - new Date(_lastPeekUpdatedAt).getTime();
    return age > STALE_GAME_MS;
  }

  // ── Host election ───────────────────────────────────────────────────────────

  async function _tryClaimHost() {
    const { data } = await db
      .from('games')
      .select('host_id, updated_at, state')
      .eq('room_code', ROOM_CODE)
      .single();

    if (!data) {
      const state = _freshState();
      state.hostId = MY_ID;
      _seedBots(state);
      await _saveToDB(state);
      currentState = state;
      isHost = true;
      _notify(state);
      return;
    }

    const stale = !data.updated_at ||
      (Date.now() - new Date(data.updated_at).getTime()) > 5000;

    if (!data.host_id || data.host_id === MY_ID || stale) {
      isHost = true;
      currentState = data.state || _freshState();
      currentState.hostId = MY_ID;
      await _saveToDB(currentState);
    } else {
      isHost = false;
      currentState = data.state || currentState;
    }
    _notify(currentState);
  }

  // ── Action dispatch (host only) ─────────────────────────────────────────────

  function _handleAction(msg) {
    if (!currentState) return;
    _bumpActivity(); // any incoming action counts as activity (resets idle timer)
    switch (msg.t) {
      case 'join':    _applyJoin(msg.player);                                break;
      case 'leave':   _applyLeave(msg.playerId);                             break;
      case 'buy':     _applyTrade(msg.playerId, msg.ticker,  Math.abs(msg.qty)); break;
      case 'sell':    _applyTrade(msg.playerId, msg.ticker, -Math.abs(msg.qty)); break;
      case 'react':   _applyReact(msg.playerId, msg.emoji);                  break;
      case 'lock':    _applyLock(msg.playerId);                              break;
      case 'choice':  _applyChoice(msg.playerId, msg.choice);                break;
      case 'advance': _advanceRound();                                        break;
      case 'start':   _startGame();                                           break;
      case 'reset':   _doReset();                                             break;
    }
  }

  // ── Player join / leave ─────────────────────────────────────────────────────

  function _applyJoin(player) {
    const state = currentState;

    // Game is truly over — no new joins or rejoins make sense after this point.
    if (state.phase === 'finale' || state.phase === 'ended') return;

    // Already in the game (e.g. tab refresh, lost connection) — no-op. Their
    // existing portfolio is preserved as-is.
    if (state.players[player.id]) return;

    // REJOIN PATH: if this id is in our soft-deleted archive (kicked / left
    // earlier), restore the original portfolio rather than starting fresh.
    // This is how students who got bumped out come back with their progress.
    if (state.removedPlayers && state.removedPlayers[player.id]) {
      state.players[player.id] = state.removedPlayers[player.id];
      // Refresh the display fields in case they re-onboarded with a new
      // name/avatar (rare — usually localStorage still has the original).
      state.players[player.id].name   = player.name   || state.players[player.id].name;
      state.players[player.id].color  = player.color  || state.players[player.id].color;
      state.players[player.id].avatar = player.avatar || state.players[player.id].avatar;
      delete state.removedPlayers[player.id];
      _pushActivity(state, `${player.name} rejoined`);
      _saveToDB(state);
      _notify(state);
      return;
    }

    // NEW JOINER PATH
    state.players[player.id] = _makePlayer(player.id, player.name, player.color, false, player.avatar);

    if (state.phase === 'lobby') {
      // Pre-game — they'll be initialised properly when teacher hits Start.
      _balanceBots(state);  // evict a bot to make room
      _pushActivity(state, `${player.name} joined`);
    } else {
      // Mid-game late joiner — give them the same ₹2L everyone else got at
      // round 1, and backfill their worthHistory with the starting cash for
      // each prior round so the leaderboard chart shows them flat at the
      // baseline before their join point.
      _initPlayerForRound1(state.players[player.id]);
      const startingCash = window.GAME_CONFIG.startingCash;
      const priorRounds  = Math.max(1, state.round);
      state.players[player.id].worthHistory = new Array(priorRounds).fill(startingCash);
      _pushActivity(state, `${player.name} joined (Round ${state.round})`);
    }

    _saveToDB(state);
    _notify(state);
  }

  function _applyLeave(playerId) {
    const player = currentState.players[playerId];
    if (!player) return;
    const name = player.name;
    // Archive humans so they can restore their portfolio if they rejoin.
    // Bots just get deleted (they don't rejoin via QR).
    if (!player.isBot) {
      if (!currentState.removedPlayers) currentState.removedPlayers = {};
      currentState.removedPlayers[playerId] = player;
    }
    delete currentState.players[playerId];
    _pushActivity(currentState, `${name} left`);
    _saveToDB(currentState);
    _notify(currentState);
  }

  // ── Trading ─────────────────────────────────────────────────────────────────

  function _applyTrade(playerId, ticker, qty) {
    // qty > 0 = buy, qty < 0 = sell
    const state = currentState;
    // Buys only during trading. Sells also allowed during 'events' phase
    // so players can sell holdings to fund an IPO application.
    const isSell = qty < 0;
    if (state.phase !== 'trading' && !(isSell && state.phase === 'events')) return;
    if (state.locks[playerId]) return;
    if (state.paused) return; // teacher paused for discussion — no trades

    const p = state.players[playerId];
    const s = _findStock(state, ticker);
    if (!p || !s) return;

    if (qty > 0) {
      const cost = s.price * qty;
      if (p.cash < cost) return;
      const worthBefore = netWorth(p, state.stocks);
      const prevQty  = p.holdings[ticker] || 0;
      const prevCost = (p.holdingsCost[ticker]) || s.price;
      p.holdingsCost[ticker] = (prevCost * prevQty + s.price * qty) / (prevQty + qty);
      p.cash -= cost;
      p.holdings[ticker] = prevQty + qty;
      const bigPct = worthBefore > 0 ? Math.round((cost / worthBefore) * 100) : 0;
      _pushActivity(state, `${p.name} bought ${qty} ${ticker}`, {
        kind: 'buy', playerId, ticker, qty, total: cost,
        ...(bigPct >= 30 ? { big: true, bigPct } : {}),
      });
    } else {
      const sellQty = Math.min(p.holdings[ticker] || 0, -qty);
      if (sellQty <= 0) return;
      const worthBefore = netWorth(p, state.stocks);
      const proceeds = s.price * sellQty;
      p.cash += proceeds;
      p.holdings[ticker] = (p.holdings[ticker] || 0) - sellQty;
      // holdingsCost avg unchanged on sell
      const bigPct = worthBefore > 0 ? Math.round((proceeds / worthBefore) * 100) : 0;
      _pushActivity(state, `${p.name} sold ${sellQty} ${ticker}`, {
        kind: 'sell', playerId, ticker, qty: sellQty, total: proceeds,
        ...(bigPct >= 25 ? { big: true, bigPct } : {}),
      });
    }

    _saveToDB(state);
    _notify(state);
  }

  // ── Reactions / lock ────────────────────────────────────────────────────────

  function _applyReact(playerId, emoji) {
    _pushReaction(currentState, playerId, emoji);
    _saveToDB(currentState);
    _notify(currentState);
  }

  function _applyLock(playerId) {
    const state = currentState;
    if (state.phase !== 'trading') return;
    if (state.locks[playerId]) return;
    state.locks[playerId] = true;
    const name = state.players[playerId]?.name || playerId;
    _pushActivity(state, `🔒 ${name} locked in`);
    _saveToDB(state);
    _notify(state);
  }

  // ── Choice events ───────────────────────────────────────────────────────────

  function _applyChoice(playerId, choice) {
    const state = currentState;
    if (state.phase !== 'events' || !state.currentEvent) return;
    if (state.eventChoices[playerId] !== undefined) return; // already submitted

    state.eventChoices[playerId] = choice;

    // NOTE: we deliberately DO NOT auto-resolve when all players have submitted.
    // The teacher controls progression — they hit "Force next round" (which calls
    // dismissCurrentEvent) to apply choice results and advance. This prevents the
    // game from cutting the teacher off mid-explanation when the last student
    // locks in their decision.

    _saveToDB(state);
    _notify(state);
  }

  function _applyChoiceResults(state) {
    const event = state.currentEvent;
    for (const [playerId, choice] of Object.entries(state.eventChoices)) {
      const p = state.players[playerId];
      if (!p) continue;
      _applyEventToPlayer(state, event, p, choice);
    }
    // For IPO events: always add the stock to state.stocks so it's tradeable
    // in subsequent rounds — even if every player rejected the IPO.
    if (event.type === 'ipo' && !_findStock(state, event.stockId)) {
      const ipoMeta = state.ipoStockMeta || window.ZOMATO_STOCK;
      if (ipoMeta) {
        state.stocks.push({
          ...ipoMeta,
          price: event.ipoPrice,
          prevPrice: event.ipoPrice,
          history: [event.ipoPrice],
        });
      }
    }
    // Log to news feed
    state.news.unshift({ ...event, t: Date.now() });
    _pushActivity(state, `📋 ${event.headline} — resolved`);
  }

  // ── Event application ───────────────────────────────────────────────────────

  function _applyEventToPlayer(state, event, p, choice) {
    const ticker = event.stockId;
    const s = _findStock(state, ticker);

    switch (event.type) {

      case 'dividend': {
        const qty = p.holdings[ticker] || 0;
        const payout = qty * event.perShare;
        p.cash += payout;
        p.dividendsEarned = (p.dividendsEarned || 0) + payout;
        break;
      }

      case 'split': {
        // Price is already set from ROUND_PRICES (which accounts for the split).
        // Just multiply the player's quantity.
        const prevQty = p.holdings[ticker] || 0;
        if (prevQty > 0) {
          p.holdings[ticker] = prevQty * event.ratio;
          // avg cost per share drops proportionally
          if (p.holdingsCost[ticker]) {
            p.holdingsCost[ticker] = p.holdingsCost[ticker] / event.ratio;
          }
        }
        break;
      }

      case 'bonus': {
        const prevQty = p.holdings[ticker] || 0;
        if (prevQty > 0) {
          const bonus = Math.floor(prevQty * event.ratio);
          p.holdings[ticker] = prevQty + bonus;
          // Price adjusts, avg cost adjusts proportionally
          if (p.holdingsCost[ticker]) {
            p.holdingsCost[ticker] = p.holdingsCost[ticker] / (1 + event.ratio);
          }
        }
        break;
      }

      case 'ipo': {
        // choice = { amount: N } (₹ to apply) or 'reject'
        if (!choice || choice === 'reject') break;
        const applyAmount = (typeof choice === 'object' && choice.amount) ? choice.amount : 0;
        if (applyAmount <= 0 || p.cash < applyAmount) break;

        const cfg = window.GAME_CONFIG;
        const gamePct = cfg.ipoAllocationMin +
          Math.random() * (cfg.ipoAllocationMax - cfg.ipoAllocationMin);
        const ipoId     = event.stockId;  // dynamic: ZOMATO or PAYTM (or future)
        const sharesApplied = Math.floor(applyAmount / event.ipoPrice);
        const allocated = Math.max(1, Math.floor(sharesApplied * gamePct / 100));
        const cost    = allocated * event.ipoPrice;
        const refund  = applyAmount - cost;

        p.cash -= applyAmount;
        p.cash += refund;  // refund for unallocated portion
        p.holdings[ipoId] = (p.holdings[ipoId] || 0) + allocated;
        p.holdingsCost[ipoId] = event.ipoPrice;
        p.zomatoAllocated = true;  // kept for backward compat; means "IPO stock allocated"

        // Ensure the IPO stock exists in state.stocks for trading.
        if (!_findStock(state, ipoId)) {
          const ipoMeta = state.ipoStockMeta || window.ZOMATO_STOCK;
          const zStock = { ...ipoMeta,
            price: event.ipoPrice,
            prevPrice: event.ipoPrice,
            history: [event.ipoPrice],
          };
          state.stocks.push(zStock);
        }

        _pushActivity(state,
          `${p.name} got ${allocated} ${ipoId} @ ₹${event.ipoPrice}`);
        break;
      }

      case 'buyback': {
        // choice = 'accept' | 'reject'
        if (choice !== 'accept') break;
        const held = p.holdings[ticker] || 0;
        if (held === 0 || !s) break;
        const maxShares = Math.max(1, Math.floor(held * event.maxPct));
        const buybackPrice = Math.round(s.price * (1 + event.premium));
        p.cash += maxShares * buybackPrice;
        p.holdings[ticker] = held - maxShares;
        // Avg cost stays the same for remaining shares
        _pushActivity(state,
          `${p.name} sold ${maxShares} ${ticker} in buyback @ ₹${buybackPrice}`);
        break;
      }

      case 'rights': {
        // choice = 'accept' | 'reject'
        if (choice !== 'accept') break;
        const heldR = p.holdings[ticker] || 0;
        if (heldR === 0 || !s) break;
        const rightsShares = Math.floor(heldR * event.ratio);
        if (rightsShares === 0) break;
        const rightsPrice = Math.round(s.price * (1 - event.discount));
        const totalCost = rightsShares * rightsPrice;
        if (p.cash < totalCost) break; // can't afford, skip silently
        p.cash -= totalCost;
        // Update avg cost
        const prevQ = p.holdings[ticker];
        const prevC = p.holdingsCost[ticker] || s.price;
        p.holdingsCost[ticker] = (prevC * prevQ + rightsPrice * rightsShares) / (prevQ + rightsShares);
        p.holdings[ticker] = prevQ + rightsShares;
        _pushActivity(state,
          `${p.name} exercised rights: +${rightsShares} ${ticker} @ ₹${rightsPrice}`);
        break;
      }
    }
  }

  // ── Auto events (no player choice needed) ──────────────────────────────────

  function _applyAutoEvent(state, event) {
    for (const p of Object.values(state.players)) {
      _applyEventToPlayer(state, event, p, 'accept');
    }
    state.news.unshift({ ...event, t: Date.now() });
    _pushActivity(state, `📋 ${event.headline}`);
  }

  // ── Event queue management ──────────────────────────────────────────────────

  const CHOICE_TYPES = new Set(['ipo', 'buyback', 'rights']);
  const AUTO_TYPES   = new Set(['dividend', 'split', 'bonus']);

  function _nextEvent(state) {
    if (state.eventQueue.length > 0) {
      state.currentEvent = state.eventQueue.shift();
      state.eventChoices = {};

      if (AUTO_TYPES.has(state.currentEvent.type)) {
        // Apply the effect to player portfolios IMMEDIATELY, but keep the
        // popup visible so the teacher can explain it. Advance only when the
        // teacher taps Continue (or force-advance).
        _applyAutoEvent(state, state.currentEvent);
      } else {
        // CHOICE event — bots submit immediately
        _botSubmitChoices(state);
        // If all players happened to be bots, resolve now (auto-advances)
        _checkAllChoicesIn(state);
      }
    } else {
      // Event queue is empty.
      state.currentEvent = null;
      state.eventChoices = {};
      if (state.pendingNextRound) {
        // We were processing END-OF-ROUND events for the previous round.
        // Now snap to the next round (prices update, R2+ events fire).
        const next = state.pendingNextRound;
        delete state.pendingNextRound;
        _startRound(state, next);
      } else {
        // Normal START-OF-ROUND events finished — open trading for this round.
        // (Or resuming trading after a mid-round event resolved — in that
        // case roundStartedAt is already set and we skip the activity log to
        // avoid a duplicate "Trading open" entry.)
        const resuming = !!state.roundStartedAt;
        state.phase = 'trading';
        if (!resuming) {
          _pushActivity(state, `📈 Trading open — Round ${state.round} (${window.ROUND_YEARS[state.round - 1]})`);
        } else {
          _pushActivity(state, `📈 Trading resumes — Round ${state.round}`);
        }
      }
    }
  }

  function _checkAllChoicesIn(state) {
    // Kept as a no-op for backward compat — teacher's dismissCurrentEvent is
    // now the only path that resolves a choice event and advances. See the
    // note in _applyChoice for why we don't auto-advance any more.
  }

  // ── Round start ─────────────────────────────────────────────────────────────

  function _startRound(state, roundNumber) {
    state.round          = roundNumber;
    state.roundStartedAt = null;   // host-view calls startRoundTimer() once leaderboard is visible
    state.locks          = {};
    state.eventChoices   = {};
    state.currentEvent   = null;
    // Reset pause-tracking — auto-advance countdown starts fresh each round
    state.paused         = false;
    state.pausedAt       = null;
    state.pausedMs       = 0;

    // Apply per-round price snapshot (uses state's selected prices; falls back
    // to window.ROUND_PRICES for games loaded from DB before rotation was added)
    const prices = (state.roundPrices || window.ROUND_PRICES || [])[roundNumber - 1] || {};
    for (const s of state.stocks) {
      if (prices[s.id] !== undefined) {
        s.prevPrice = s.price;
        s.price     = prices[s.id];
        s.history.push(s.price);
      }
    }

    // Build event queue from state's selected event script.
    // SKIP events marked `fireAt: 'end'` — those fire in _advanceRound at the
    // END of the round (after students have had a chance to trade), not here.
    const eventScript = state.eventScript || window.EVENT_SCRIPT || [];
    state.eventQueue = eventScript
      .filter(e => e.round === roundNumber && e.fireAt !== 'end')
      .map(e => ({ ...e }));  // shallow clone so we don't mutate game-data
    state.pendingMidEvents = [];

    _pushActivity(state, `Round ${roundNumber} — ${window.ROUND_YEARS[roundNumber - 1]}`);

    if (state.eventQueue.length > 0) {
      state.phase = 'events';
      state.currentEvent = state.eventQueue.shift();

      if (AUTO_TYPES.has(state.currentEvent.type)) {
        // Apply effect immediately but keep popup visible until teacher advances
        _applyAutoEvent(state, state.currentEvent);
      } else {
        _botSubmitChoices(state);
        _checkAllChoicesIn(state);
      }
    } else {
      state.phase = 'trading';
      _pushActivity(state, `📈 Trading open — Round ${roundNumber} (${window.ROUND_YEARS[roundNumber - 1]})`);
    }
  }

  // ── Game lifecycle ──────────────────────────────────────────────────────────

  function _initPlayerForRound1(p) {
    // Used to onboard a late joiner who arrives within the grace period of round 1.
    p.cash            = window.GAME_CONFIG.startingCash;
    p.holdings        = {};
    p.holdingsCost    = {};
    p.worthHistory    = [window.GAME_CONFIG.startingCash];
    p.dividendsEarned = 0;
    p.zomatoAllocated = false;
  }

  function _startGame() {
    if (!isHost) return;
    _bumpActivity();
    const state = currentState;
    // Adjust bot count to fill up to 6 total players (no bots if humans >= 6)
    _balanceBots(state);

    // Stamp game-start time so _applyJoin can allow a short grace-period for
    // students who submitted their join form just as the teacher hit Start.
    state.gameStartedAt = Date.now();

    // Initialise worthHistory with starting cash for everyone
    for (const p of Object.values(state.players)) {
      _initPlayerForRound1(p);
    }

    state.news    = [];
    state.activity = [];

    _startRound(state, 1);
    _saveToDB(state);
    _notify(state);
  }

  function _advanceRound() {
    if (!isHost) return;
    _bumpActivity();
    const state = currentState;
    if (state.phase !== 'trading') return;

    // Snapshot worth BEFORE prices change (using round-N closing prices)
    for (const p of Object.values(state.players)) {
      if (!p.worthHistory) p.worthHistory = [window.GAME_CONFIG.startingCash];
      p.worthHistory.push(netWorth(p, state.stocks));
    }

    if (state.round >= window.GAME_CONFIG.rounds) {
      // Apply the 2026 reveal finale instead of going straight to ended.
      // Snap prices to FINAL_PRICES, push the finale news, and enter the
      // 'finale' phase. Teacher taps "Reveal final results →" to advance.
      _applyFinale(state);
      _saveToDB(state);
      _notify(state);
      return;
    }

    // END-OF-ROUND events: events tagged with `fireAt: 'end'` fire NOW —
    // at the current round's prices, before snapping to the next round.
    // Used for R1's dividend so students get to buy stocks first, then the
    // dividend pays out to whoever held them. When the popup is dismissed
    // (_nextEvent), pendingNextRound triggers the snap to round N+1.
    const eventScript = state.eventScript || window.EVENT_SCRIPT || [];
    const endEvents = eventScript
      .filter(e => e.round === state.round && e.fireAt === 'end')
      .map(e => ({ ...e }));

    if (endEvents.length > 0) {
      state.eventQueue       = endEvents;
      state.pendingNextRound = state.round + 1;
      state.phase            = 'events';
      state.currentEvent     = state.eventQueue.shift();
      state.eventChoices     = {};
      if (AUTO_TYPES.has(state.currentEvent.type)) {
        _applyAutoEvent(state, state.currentEvent);
      } else {
        _botSubmitChoices(state);
        _checkAllChoicesIn(state);
      }
      _saveToDB(state);
      _notify(state);
      return;
    }

    _startRound(state, state.round + 1);
    _saveToDB(state);
    _notify(state);
  }

  // Apply the +1-year price reveal — used when round 8 wraps up.
  function _applyFinale(state) {
    const FINAL = state.finalPrices || window.FINAL_PRICES || {};
    for (const s of state.stocks) {
      if (FINAL[s.id] !== undefined) {
        s.prevPrice = s.price;
        s.price     = FINAL[s.id];
        if (s.history) s.history.push(s.price);
      }
    }
    if (window.FINAL_NEWS) {
      state.news.unshift({ ...window.FINAL_NEWS, round: state.round + 1, t: Date.now() });
    }
    // Snapshot worth AGAIN at 2026 prices — so worthHistory ends on the finale
    for (const p of Object.values(state.players)) {
      if (!p.worthHistory) p.worthHistory = [window.GAME_CONFIG.startingCash];
      p.worthHistory.push(netWorth(p, state.stocks));
    }
    state.phase = 'finale';
    state.roundStartedAt = Date.now();
    state.paused = false;
    state.pausedAt = null;
    state.pausedMs = 0;
    _pushActivity(state, '🎬 One year later — 2026');
  }

  function _doReset() {
    _bumpActivity();
    const state = _freshState();
    state.hostId = MY_ID;
    _seedBots(state);
    currentState = state;
    _saveToDB(state);
    _notify(state);
  }

  // ── Bot logic ───────────────────────────────────────────────────────────────

  function _botSubmitChoices(state) {
    if (!state.currentEvent) return;
    const event = state.currentEvent;

    for (const p of Object.values(state.players)) {
      if (!p.isBot) continue;
      if (state.eventChoices[p.id] !== undefined) continue;

      let choice;
      switch (event.type) {
        case 'ipo':
          // Bots always apply ₹25,000
          choice = { amount: 25000 };
          break;
        case 'buyback':
          choice = 'accept';
          break;
        case 'rights': {
          // Accept if they can afford it
          const held = p.holdings[event.stockId] || 0;
          const s    = _findStock(state, event.stockId);
          if (held > 0 && s) {
            const shares = Math.floor(held * event.ratio);
            const price  = Math.round(s.price * (1 - event.discount));
            choice = (p.cash >= shares * price) ? 'accept' : 'reject';
          } else {
            choice = 'reject';
          }
          break;
        }
        default:
          choice = 'accept';
      }
      state.eventChoices[p.id] = choice;
    }
  }

  function _botTrade(state) {
    if (state.phase !== 'trading') return;

    for (const p of Object.values(state.players)) {
      if (!p.isBot || state.locks[p.id]) continue;
      if (Math.random() > 0.35) continue; // ~35% chance to trade this tick

      // All stocks in state.stocks are tradeable (ZOMATO added once IPO resolves)
      const tradeable = state.stocks;
      if (tradeable.length === 0) continue;
      const s = tradeable[Math.floor(Math.random() * tradeable.length)];

      // Compare to start-of-round price (first entry in this round's history slice)
      const roundStartIdx = Math.max(0, s.history.length - 6);
      const roundStartPrice = s.history[roundStartIdx] || s.price;
      const priceUp = s.price >= roundStartPrice;
      const wantBuy = priceUp ? Math.random() < 0.65 : Math.random() < 0.3;

      if (wantBuy) {
        const maxAfford = Math.floor(p.cash / s.price);
        if (maxAfford < 1) continue;
        const qty = Math.max(1, Math.floor(Math.random() * Math.min(5, maxAfford)));
        const cost = qty * s.price;
        if (p.cash < cost) continue;
        const prevQty  = p.holdings[s.id] || 0;
        const prevCost = p.holdingsCost[s.id] || s.price;
        p.holdingsCost[s.id] = (prevCost * prevQty + s.price * qty) / (prevQty + qty);
        p.cash -= cost;
        p.holdings[s.id] = prevQty + qty;
        _pushActivity(state, `${p.name} bought ${qty} ${s.id}`);
      } else {
        const have = p.holdings[s.id] || 0;
        if (have <= 0) continue;
        const qty = Math.max(1, Math.floor(Math.random() * have));
        p.cash += qty * s.price;
        p.holdings[s.id] = have - qty;
        _pushActivity(state, `${p.name} sold ${qty} ${s.id}`);
      }
    }
  }

  function _botAutoLock(state) {
    if (state.phase !== 'trading') return;
    for (const p of Object.values(state.players)) {
      // Bots lock after 15–30 ticks (~2.2% chance per tick on average)
      if (p.isBot && !state.locks[p.id] && Math.random() < 0.022) {
        state.locks[p.id] = true;
        _pushActivity(state, `🔒 ${p.name} locked in`);
      }
    }
  }

  // ── Tick loop (host only) ───────────────────────────────────────────────────

  function _tick() {
    if (!isHost) return;
    const state = currentState;
    state.tickCount = (state.tickCount || 0) + 1;

    // ── Idle auto-reset ───────────────────────────────────────────────────────
    // Build rule: if no one has interacted for 120 minutes, wipe back to a fresh
    // lobby. Teacher walked off without ending the game → don't leave students
    // stuck on a stale projector.
    if (state.phase !== 'lobby' && Date.now() - _lastActivity > _IDLE_MS) {
      _bumpActivity(); // prevent re-fire while reset propagates
      _doReset();
      return;
    }

    if (state.phase === 'events' && !state.paused) {
      // If we're stuck on a choice event, prod bots to submit
      if (state.currentEvent && CHOICE_TYPES.has(state.currentEvent.type)) {
        _botSubmitChoices(state);
        _checkAllChoicesIn(state);
      }
    }

    if (state.phase === 'trading' && !state.paused) {
      // Auto-advance disabled — teacher controls round pacing via Force Next Round.
      if (state.tickCount % 3 === 0) _botTrade(state);
      _botAutoLock(state);
    }

    // Prune ephemeral reactions
    state.reactions = state.reactions.filter(r => r.t > Date.now() - 3500);

    _saveToDB(state);
    _notify(state);
  }

  // ── Notify subscribers ──────────────────────────────────────────────────────

  function _notify(state) {
    // Always emit a shallow copy so React's Object.is() check sees a new
    // reference and triggers a re-render, even when the engine mutated
    // currentState in place before calling _notify.
    const snap = Object.assign({}, state);
    for (const fn of listeners) fn(snap);
  }

  function _sendAction(msg) {
    _channel.send({ type: 'broadcast', event: 'action', payload: msg });
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  function _findStock(state, ticker) {
    return state.stocks.find(s => s.id === ticker) || null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  const StockRush = {
    myId: MY_ID,

    getState() { return currentState; },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    join(player) {
      if (isHost) _applyJoin(player);
      else _sendAction({ t: 'join', player });
    },

    leave(playerId) {
      if (isHost) _applyLeave(playerId);
      else _sendAction({ t: 'leave', playerId });
    },

    buy(playerId, ticker, qty) {
      if (isHost) _applyTrade(playerId, ticker, Math.abs(qty));
      else _sendAction({ t: 'buy', playerId, ticker, qty: Math.abs(qty) });
    },

    sell(playerId, ticker, qty) {
      if (isHost) _applyTrade(playerId, ticker, -Math.abs(qty));
      else _sendAction({ t: 'sell', playerId, ticker, qty: Math.abs(qty) });
    },

    react(playerId, emoji) {
      if (isHost) _applyReact(playerId, emoji);
      else _sendAction({ t: 'react', playerId, emoji });
    },

    // submitChoice: choice is 'accept', 'reject', or { amount: N } for IPO
    submitChoice(playerId, choice) {
      if (isHost) _applyChoice(playerId, choice);
      else _sendAction({ t: 'choice', playerId, choice });
    },

    lock(playerId) {
      if (isHost) _applyLock(playerId);
      else _sendAction({ t: 'lock', playerId });
    },

    advanceRound() {
      if (isHost) _advanceRound();
      else _sendAction({ t: 'advance' });
    },

    // Called by the host view once the leaderboard is actually visible
    // (after dismissing the RoundTransitionPopup). Idempotent.
    startRoundTimer() {
      if (!isHost) return;
      if (currentState.roundStartedAt) return; // already running
      currentState.roundStartedAt = Date.now();
      _saveToDB(currentState);
      _notify(currentState);
    },

    startGame() {
      if (isHost) _startGame();
      else _sendAction({ t: 'start' });
    },

    reset() {
      if (isHost) _doReset();
      else _sendAction({ t: 'reset' });
    },

    // Host UI calls this when teacher clicks the splash's primary CTA — whether
    // that's "Go Live" (no existing game), "Open lobby" (lobby with waiting
    // students), or "Resume game" (trading/events in progress).
    //
    // This is now ALWAYS non-destructive: it claims host of whatever state is
    // already in the DB, never wipes humans. The only path that wipes is
    // forceNewGame()/reset(), and those are gated behind explicit confirmation
    // in the UI. This eliminates the "teacher restarts → student bumped" loop.
    async goLive() {
      if (isHost) return;
      // Use whatever state we've loaded so far (from _peekExistingGame or
      // initial _freshState). currentState is never null at this point.
      const state = currentState || _freshState();
      state.hostId = MY_ID;
      // Top up bots only in lobby — _balanceBots already protects humans.
      // Skips entirely for trading/events/finale/ended phases.
      if (state.phase === 'lobby') _balanceBots(state);
      currentState = state;
      isHost = true;
      try { await _saveToDB(state); } catch (e) {}
      _notify(state);
      if (!_tickTimer) {
        _tickTimer = setInterval(_tick, window.GAME_CONFIG.tickMs);
      }
      if (!_staleCheckTimer) {
        _staleCheckTimer = setInterval(async () => {
          if (!isHost) {
            await _tryClaimHost();
            if (isHost && !_tickTimer) {
              _tickTimer = setInterval(_tick, window.GAME_CONFIG.tickMs);
            }
          }
        }, 4000);
      }
    },

    // Teacher's "pause for discussion" — freezes the round AND the auto-advance
    // countdown (bots stop trading, humans can't trade). Accumulates paused
    // milliseconds so the auto-advance timer doesn't expire while paused.
    togglePause() {
      if (!isHost || !currentState) return;
      const state = currentState;
      if (!state.paused) {
        state.paused = true;
        state.pausedAt = Date.now();
      } else {
        if (state.pausedAt) {
          state.pausedMs = (state.pausedMs || 0) + (Date.now() - state.pausedAt);
        }
        state.pausedAt = null;
        state.paused = false;
      }
      _pushActivity(state, state.paused ? '⏸ Paused for discussion' : '▶ Trading resumed');
      _saveToDB(state);
      _notify(state);
    },

    // Teacher's "force the next step" button — works at every stage:
    // - During an auto event (dividend/split/bonus): the effect is already
    //   applied to portfolios; this just moves to the next event/phase.
    // - During a choice event (IPO/buyback/rights): any human who hasn't
    //   responded gets auto-submitted as 'reject', then results apply and we
    //   advance. This is what unsticks a game when a student walks away.
    dismissCurrentEvent() {
      if (!isHost || !currentState) return;
      const state = currentState;
      if (state.phase !== 'events' || !state.currentEvent) return;
      if (CHOICE_TYPES.has(state.currentEvent.type)) {
        for (const id of Object.keys(state.players)) {
          if (state.eventChoices[id] === undefined) {
            state.eventChoices[id] = 'reject';
          }
        }
        _applyChoiceResults(state);
      }
      _nextEvent(state);
      _saveToDB(state);
      _notify(state);
    },

    // Explicit "start a brand-new game" — wipes the DB row and seeds a fresh
    // lobby with bots. Used by the splash screen's "Start fresh" button so the
    // teacher always has a way out of a stale session.
    async forceNewGame() {
      // If already host, actually wipe the state — do NOT early-return.
      // Without this, a teacher clicking "Start fresh" from their own tab
      // (which is already host) would see nothing happen and stale players
      // would remain in the lobby.
      const state = _freshState();
      state.hostId = MY_ID;
      _seedBots(state);
      currentState = state;
      isHost = true;
      try { await _saveToDB(state); } catch (e) {}
      _notify(state);
      if (!_tickTimer) {
        _tickTimer = setInterval(_tick, window.GAME_CONFIG.tickMs);
      }
      if (!_staleCheckTimer) {
        _staleCheckTimer = setInterval(async () => {
          if (!isHost) {
            await _tryClaimHost();
            if (isHost && !_tickTimer) {
              _tickTimer = setInterval(_tick, window.GAME_CONFIG.tickMs);
            }
          }
        }, 4000);
      }
    },

    // Get a description of the existing game (if any) so the splash can show it
    existingGameInfo() {
      if (!currentState) return null;
      const ageMs = _lastPeekUpdatedAt
        ? Date.now() - new Date(_lastPeekUpdatedAt).getTime()
        : null;
      return {
        phase: currentState.phase,
        round: currentState.round,
        humanCount: Object.values(currentState.players || {}).filter(p => !p.isBot).length,
        ageMs,
      };
    },

    // Reveal final results — called from the finale overlay's "Reveal" button.
    endFromFinale() {
      if (!isHost || !currentState) return;
      if (currentState.phase !== 'finale') return;
      currentState.phase = 'ended';
      _pushActivity(currentState, '🏁 Game over — final results');
      _saveToDB(currentState);
      _notify(currentState);
    },

    hasExistingGame() {
      // The splash uses this to decide which primary CTA to show:
      //   - mid-game (trading/events/finale) → "Resume game"
      //   - lobby with humans waiting        → "Open lobby (N students)"
      //   - empty lobby / nothing / stale    → "Go Live →" (fresh)
      // Anything non-stale with humans OR a live phase counts as existing.
      if (_peekIsStale()) return false;
      if (!currentState) return false;
      const phase = currentState.phase;
      if (phase === 'trading' || phase === 'events' || phase === 'finale') return true;
      const humans = Object.values(currentState.players || {}).filter(p => !p.isBot).length;
      if (phase === 'lobby' && humans > 0) return true;
      return false;
    },

    onKick(fn) {
      _kickListeners.add(fn);
      return () => _kickListeners.delete(fn);
    },

    // Host-only: remove a player from the game and broadcast a kick event so
    // their tab can bounce back to the join screen. Their portfolio is moved
    // to removedPlayers archive so if the teacher kicked by accident (or the
    // student talks them into rejoining), their progress is restored on
    // rejoin instead of starting fresh.
    kick(playerId) {
      const player = currentState?.players?.[playerId];
      if (!isHost || !player) return;
      const name = player.name;
      if (!player.isBot) {
        if (!currentState.removedPlayers) currentState.removedPlayers = {};
        currentState.removedPlayers[playerId] = player;
      }
      delete currentState.players[playerId];
      if (currentState.locks) delete currentState.locks[playerId];
      _pushActivity(currentState, `👋 ${name} was removed`);
      _saveToDB(currentState);
      _notify(currentState);
      try {
        _channel.send({ type: 'broadcast', event: 'kick', payload: { playerId } });
      } catch (e) {}
    },
  };

  let _staleCheckTimer = null;

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  // Host tab  → peek DB only, wait for UI to call goLive(). No DB churn.
  // Player tab → load state once, follow realtime, never claim host.

  const _isHostTab = _urlRole === 'host';

  if (_isHostTab) {
    StockRush.ready = _peekExistingGame();
  } else {
    (async () => {
      try {
        const { data } = await db
          .from('games')
          .select('state')
          .eq('room_code', ROOM_CODE)
          .single();
        if (data?.state) { currentState = data.state; _notify(currentState); }
      } catch (e) {}
    })();
  }

  window.StockRush = StockRush;
})();
