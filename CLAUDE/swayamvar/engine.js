/* Shaadi.com for your Money — engine v2 */
(function () {
  const SUPABASE_URL      = 'https://gkfldkytzfngwnkrwrga.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZmxka3l0emZuZ3dua3J3cmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MzI4NDksImV4cCI6MjA5NDUwODg0OX0.wwyFY0bhbGhCKCpAjgZ0oCS8gda21FHcvDdvlg9xCmU';

  const _params  = new URLSearchParams(window.location.search);
  const _urlRoom = _params.get('room');
  const _urlRole = _params.get('role');

  let ROOM_CODE = _urlRoom ? _urlRoom.toUpperCase() : window.SHAADI_CONFIG.roomCode;
  if (!_urlRoom) {
    const p = new URLSearchParams(window.location.search);
    p.set('room', ROOM_CODE);
    window.history.replaceState(null, '', '?' + p.toString());
  }
  window.SHAADI_CONFIG.roomCode = ROOM_CODE;

  const db     = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Persist identity across phone refresh / reconnect / tab-backgrounding /
  // full tab close + QR re-scan. Kept in localStorage keyed by room, matching
  // the player-view `joined` flag (also localStorage). WITHOUT this: a refreshed
  // or re-scanning phone gets a brand-new random id, skips re-join (because
  // `joined` is still set), then votes under the new id — which the host can't
  // match to any joined player. Result: the tally ticks up but no chip and no
  // popup appear (the ghost-vote bug). Same id on return = vote always maps to
  // the player.
  const _ID_KEY = `sm-myid-${ROOM_CODE}`;
  let MY_ID;
  try {
    // localStorage (NOT sessionStorage) so the id survives a full tab close /
    // browser reopen — a player who re-scans the QR mid-game is restored as the
    // SAME participant (votes are keyed by MY_ID). The id is a stable per-device
    // identifier and intentionally persists across a teacher reset; eviction is
    // driven by sessionId (the game generation), not by MY_ID, so a stable id
    // never blocks a reset from dropping the player back to the join screen.
    MY_ID = localStorage.getItem(_ID_KEY);
    if (!MY_ID) { MY_ID = crypto.randomUUID(); localStorage.setItem(_ID_KEY, MY_ID); }
  } catch (_e) { MY_ID = crypto.randomUUID(); }

  const GAME_KEY = `shaadi-${ROOM_CODE}`;

  const listeners = new Set();
  let currentState = _freshState();
  let _channel = null;
  let _lockTimer = null;

  /* ── State factory ─────────────────────────────────────────────── */
  function _freshState() {
    return {
      // A fresh generation id. Every startFresh()/resetToLobby() mints a new
      // one. Players store the sessionId they joined under; when they see a
      // DIFFERENT sessionId arrive (the teacher reset the game) they drop back
      // to the join screen instead of silently auto-rejoining the new game.
      // This is what makes "Reset game" actually evict the current players.
      sessionId:          (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      phase:              'lobby',
      // lobby | gallery | roundIntro | voting | lock | results | finale | ended
      roundIndex:         0,          // 0..3
      galleryIndex:       0,          // 0..5 which suitor is currently shown in gallery
      players:            {},         // { [id]: { id, name, color } }
      votes:              {},         // { [roundId]: { [playerId]: suitorId } }
      countdownStartedAt: null,       // ms timestamp when voting opened
      lastActivityAt:     Date.now(), // ms of last host action / vote — drives idle auto-reset
    };
  }

  /* ── Pub/sub ───────────────────────────────────────────────────── */
  function _notify() {
    const snap = JSON.parse(JSON.stringify(currentState));
    listeners.forEach(fn => fn(snap));
  }

  /* ── Supabase I/O ──────────────────────────────────────────────── */
  async function _save(state) {
    // Primary key column is room_code (Stock Rush Pro schema)
    await db.from('games').upsert({ room_code: GAME_KEY, state, updated_at: new Date().toISOString() });
  }

  async function _load() {
    const { data } = await db.from('games').select('state').eq('room_code', GAME_KEY).single();
    return data?.state || null;
  }

  async function _setupRealtime() {
    if (_channel) db.removeChannel(_channel);
    _channel = db.channel(`room:${window.SHAADI_CONFIG.gameKey}-${ROOM_CODE}`, {
      config: { presence: { key: MY_ID } },
    })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (!payload?.state) return;
        currentState = payload.state;
        _notify();
        // Players also need to schedule lock→results if they receive a lock state
        _maybeScheduleLockTransition(payload.state);
      })
      // Live presence — each open handset announces itself so the host can prune
      // players whose phone went away (closed tab / evicted storage / re-scanned
      // in another browser), stopping their old name from lingering in the list.
      .on('presence', { event: 'sync' }, () => _onPresenceSync())
      .on('presence', { event: 'join' }, () => _onPresenceSync())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try { await _channel.track({ id: MY_ID, at: Date.now() }); } catch (_e) {}
          // On (re)connect, pull the latest state so a client that missed
          // broadcasts while disconnected catches up to the current phase.
          _resync();
        }
      });
  }

  async function _broadcast(state) {
    if (_channel) await _channel.send({ type: 'broadcast', event: 'state', payload: { state } });
  }

  async function _push(state, opts) {
    // Any push counts as user activity (bumps the idle-reset clock) unless
    // flagged — the stale-player prune passes {activity:false} so a background
    // cleanup doesn't keep an abandoned game alive forever.
    if (!opts || opts.activity !== false) state.lastActivityAt = Date.now();
    currentState = state;
    _notify();
    await Promise.all([_save(state), _broadcast(state)]);
  }

  // Pull the authoritative state from the DB and apply it. Recovers from MISSED
  // broadcasts — e.g. a phone whose websocket was suspended during the long 6-8
  // min gallery never received the "voting started" push, so it stayed stuck on
  // the suitor sheet until a manual reload. Called on (re)connect, on tab
  // refocus, and on a short poll while visible.
  async function _resync() {
    try {
      const s = await _load();
      if (s) { currentState = s; _notify(); }
    } catch (_e) {}
  }

  /* ── Lock phase auto-advance (runs on all clients; idempotent) ─── */
  function _maybeScheduleLockTransition(state) {
    if (state.phase !== 'lock') return;
    clearTimeout(_lockTimer);
    _lockTimer = setTimeout(async () => {
      // Only advance if still in lock (prevents double-fire)
      if (currentState.phase === 'lock') {
        await window.Shaadi.showResults();
      }
    }, 2600);
  }

  /* ── Countdown auto-close (host side) ──────────────────────────── */
  function _scheduleAutoClose(startedAt) {
    const remaining = (window.SHAADI_CONFIG.timerSeconds * 1000) - (Date.now() - startedAt);
    setTimeout(async () => {
      if (currentState.phase === 'voting') await window.Shaadi.closeVoting();
    }, Math.max(0, remaining) + 300);
  }

  /* ── Presence + stale-player prune + idle auto-reset ───────────── */
  // Host = anyone who didn't open the player URL (?role=player). Only the host
  // writes prune / idle changes, so there is a single writer.
  const _isHost = (_urlRole !== 'player');
  const _presentSeen = {};        // id -> last ms this device was seen connected
  const _PRUNE_GRACE_MS = 300000;            // 5 min no presence → drop player (covers a bathroom break; kept under the 6-8 min gallery so re-scan ghosts still prune before voting)
  const _IDLE_RESET_MS  = 120 * 60 * 1000;   // 120 min idle → reset to lobby

  function _onPresenceSync() {
    if (!_channel) return;
    let st = {};
    try { st = _channel.presenceState() || {}; } catch (_e) { return; }
    const now = Date.now();
    Object.keys(st).forEach(key => {
      _presentSeen[key] = now;
      (st[key] || []).forEach(m => { if (m && m.id) _presentSeen[m.id] = now; });
    });
  }

  async function _pruneStalePlayers() {
    if (!_isHost) return;
    // Only tidy the roster while it's still being assembled — never churn it
    // mid-vote / reveal, which could disturb tallies or popups.
    if (currentState.phase !== 'lobby' && currentState.phase !== 'gallery') return;
    const players = currentState.players || {};
    const ids = Object.keys(players);
    if (!ids.length) return;
    const now = Date.now();
    const next = JSON.parse(JSON.stringify(currentState));
    let changed = false;
    ids.forEach(id => {
      // A player not yet seen in presence gets grace from now (covers the gap
      // between a join landing in state and the first presence sync).
      if (_presentSeen[id] == null) _presentSeen[id] = now;
      if (now - _presentSeen[id] > _PRUNE_GRACE_MS) {
        delete next.players[id];
        changed = true;
      }
    });
    if (changed) await _push(next, { activity: false });
  }

  async function _maybeIdleReset() {
    if (!_isHost) return;
    if (!currentState || currentState.phase === 'lobby') return;
    const last = currentState.lastActivityAt || 0;
    if (Date.now() - last > _IDLE_RESET_MS) {
      await window.Shaadi.resetToLobby();
    }
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  const _readyPromise = (async () => {
    await _setupRealtime();
    const saved = await _load();
    if (saved) {
      currentState = saved;
      _notify();
      // Auto lock→results disabled — teacher presses Reveal Results manually
      // _maybeScheduleLockTransition(saved);
      // Auto-close disabled — teacher advances all screens manually
      // if (saved.phase === 'voting' && saved.countdownStartedAt && _urlRole === 'host') {
      //   _scheduleAutoClose(saved.countdownStartedAt);
      // }
    }
  })();

  // Re-announce presence when a backgrounded tab returns to the foreground —
  // phones suspend timers/sockets while locked, so this refreshes our presence
  // the moment the student looks at their handset again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _channel) {
      try { _channel.track({ id: MY_ID, at: Date.now() }); } catch (_e) {}
      _resync();   // catch up on anything missed while the tab was backgrounded
    }
  });

  if (_isHost) {
    // Host housekeeping: prune ghost players + idle auto-reset, every 30s.
    setInterval(() => { _pruneStalePlayers(); _maybeIdleReset(); }, 30000);
  } else {
    // Player safety net: poll the DB while the tab is visible so a missed
    // broadcast never leaves the handset stuck on a stale screen (e.g. still on
    // the suitor sheet after voting opened) for more than ~12s.
    setInterval(() => { if (document.visibilityState === 'visible') _resync(); }, 12000);
  }

  /* ── Public API ────────────────────────────────────────────────── */
  window.Shaadi = {
    ready:     _readyPromise,
    getState:  () => JSON.parse(JSON.stringify(currentState)),
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    myId:      () => MY_ID,

    /* Host ──────────────────────────────────────────────────────── */

    async startFresh() {
      const s = _freshState();
      await _push(s);
    },

    async showGallery() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'gallery';
      s.galleryIndex = 0;
      await _push(s);
    },

    async advanceGallery() {
      const s = JSON.parse(JSON.stringify(currentState));
      if ((s.galleryIndex || 0) < window.SUITORS.length - 1) {
        s.galleryIndex = (s.galleryIndex || 0) + 1;
      }
      await _push(s);
    },

    async startRound(index) {
      // Round-intro screen removed — go straight into voting.
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'voting';
      s.roundIndex = index;
      s.countdownStartedAt = Date.now();
      await _push(s);
    },

    async openVoting() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'voting';
      s.countdownStartedAt = Date.now();
      await _push(s);
      // Auto-close disabled — teacher closes voting manually with Force Close button
      // _scheduleAutoClose(s.countdownStartedAt);
    },

    async closeVoting() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'results';
      s.countdownStartedAt = null;
      await _push(s);
    },

    async showResults() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'results';
      await _push(s);
    },

    async nextRound() {
      const s = JSON.parse(JSON.stringify(currentState));
      const next = s.roundIndex + 1;
      if (next >= window.ROUNDS.length) {
        s.phase = 'finale';
      } else {
        // Round-intro screen removed — go straight into voting.
        s.phase = 'voting';
        s.roundIndex = next;
        s.countdownStartedAt = Date.now();
      }
      await _push(s);
    },

    async showFinale() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'finale';
      await _push(s);
    },

    async endGame() {
      const s = JSON.parse(JSON.stringify(currentState));
      s.phase = 'ended';
      await _push(s);
    },

    async resetToLobby() {
      await _push(_freshState());
    },

    /* Player ─────────────────────────────────────────────────────── */

    async join(name, color, charData, gender) {
      // Write → verify → retry loop.
      // Two phones hitting join simultaneously both load the same empty
      // state, then last-write-wins clobbers the first. The fix: after
      // saving, read back and confirm we survived. If we were overwritten,
      // reload the latest merged state (which has the other player) and
      // re-add ourselves, then broadcast the combined result.
      const displayName = charData ? charData.title : name;
      const player = {
        id: MY_ID, name, color,
        gender:       gender || 'P',
        displayName,
        titleEmoji:   charData?.emoji   || '',
        titleAction:  charData?.action  || '',
        titleImg:     charData?.img     || '',
      };
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
        }
        // Load latest from DB so we don't clobber concurrent joins
        const fresh = await _load();
        if (fresh) currentState = fresh;
        const s = JSON.parse(JSON.stringify(currentState));
        s.players[MY_ID] = player;
        s.lastActivityAt = Date.now();   // a join counts as activity
        // Save to DB (no broadcast yet — wait to verify we survived)
        await _save(s);
        // Short settle pause
        await new Promise(r => setTimeout(r, 200));
        // Read back and verify we're still in the state
        const verified = await _load();
        if (verified?.players?.[MY_ID]) {
          // We made it — update local state and broadcast merged result
          currentState = verified;
          _notify();
          await _broadcast(verified);
          return MY_ID;
        }
        // Bumped by a concurrent write — loop will re-add us
      }
      return MY_ID;
    },

    async castVote(roundId, suitorId) {
      // Write → verify → retry, same pattern as join(). A single
      // fetch-modify-write loses votes when 20-30 phones submit inside the
      // same couple of seconds: each loads the same state, then last-write-wins
      // clobbers the others. Here we re-read after saving and confirm our vote
      // survived; if it was overwritten we reload the merged state (which has
      // the other votes) and re-apply ours, then broadcast the combined result.
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 120 + Math.random() * 220));
        }
        // Load latest so we don't clobber concurrent votes
        const fresh = await _load();
        if (fresh) currentState = fresh;
        const s = JSON.parse(JSON.stringify(currentState));
        if (!s.votes[roundId]) s.votes[roundId] = {};
        s.votes[roundId][MY_ID] = suitorId;
        s.lastActivityAt = Date.now();   // a vote counts as activity
        // Optimistic local update so the UI locks immediately
        currentState = s;
        _notify();
        // Save (no broadcast yet — wait to verify we survived)
        await _save(s);
        await new Promise(r => setTimeout(r, 180));
        // Read back and confirm our vote is still recorded
        const verified = await _load();
        if (verified?.votes?.[roundId]?.[MY_ID] === suitorId) {
          currentState = verified;
          _notify();
          await _broadcast(verified);
          return;
        }
        // Bumped by a concurrent write — loop re-applies our vote
      }
    },
  };
})();
