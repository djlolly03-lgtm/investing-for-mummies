// Host (teacher / projector) view

function HostView() {
  const [live, setLive] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [staleGame, setStaleGame] = React.useState(null); // {phase, humanCount}

  // On mount, peek the DB. If a recent game exists, ask the teacher whether
  // to resume or start fresh — don't silently auto-resume an abandoned game.
  // Otherwise auto-go-live so we skip the "Go Live →" splash and land the
  // teacher directly on the QR / room-code lobby (per user request 30 Jul).
  React.useEffect(() => {
    const ready = window.StockRush.ready || Promise.resolve(null);
    ready.then(() => {
      if (window.StockRush.hasExistingGame && window.StockRush.hasExistingGame()) {
        const state = window.StockRush.getState();
        const humanCount = state?.players
          ? Object.values(state.players).filter(p => !p.isBot).length
          : 0;
        setStaleGame({ phase: state.phase || 'lobby', humanCount, round: state.round || 0 });
      } else {
        window.StockRush.goLive();
        setLive(true);
      }
      setChecking(false);
    });
  }, []);

  function resume() {
    window.StockRush.goLive();
    setLive(true);
    setStaleGame(null);
  }

  function startFresh() {
    window.StockRush.goLive();
    // After goLive, force a reset so we get a new sessionId and clean state
    setTimeout(() => window.StockRush.reset(), 100);
    setLive(true);
    setStaleGame(null);
  }

  function goLive() {
    window.StockRush.goLive();
    setLive(true);
  }

  if (checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--muted)', fontFamily:'Geist, ui-sans-serif', fontSize:14, letterSpacing:'0.05em' }}>
        Checking for live game…
      </div>
    );
  }

  if (staleGame) return <StaleGameSplash info={staleGame} onResume={resume} onFresh={startFresh} />;

  if (!live) return <GoLiveScreen onGoLive={goLive} />;

  return <HostGame />;
}

function StaleGameSplash({ info, onResume, onFresh }) {
  const phaseLabel = info.phase === 'playing' ? `mid-game (Round ${info.round})` :
                     info.phase === 'ended'   ? 'finished' :
                     info.phase === 'lobby'   ? 'in lobby' : info.phase;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--line)',
        borderRadius: 14,
        padding: '26px 30px',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
          Existing game detected
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          There's already a game here.
        </div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 16 }}>
          {info.humanCount > 0
            ? <>It's <b>{phaseLabel}</b> with <b>{info.humanCount} student{info.humanCount !== 1 ? 's' : ''}</b> in it. Pick up where they left off, or start a brand-new game and kick everyone back to the join screen.</>
            : <>It's <b>{phaseLabel}</b> with no students. You can resume or start fresh — same effect.</>
          }
        </div>
        <div style={{ display: 'flex', gap: 9, flexDirection: 'column' }}>
          <button
            onClick={onResume}
            style={{
              padding: '11px 20px',
              background: 'var(--ink)', color: '#fff',
              border: 'none', borderRadius: 9,
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ▶  Resume this game
          </button>
          <button
            onClick={onFresh}
            style={{
              padding: '11px 20px',
              background: '#fff', color: '#dc2626',
              border: '1.5px solid #dc2626', borderRadius: 9,
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ↺  Start a fresh game
          </button>
        </div>
      </div>
    </div>
  );
}

function GoLiveScreen({ onGoLive }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1.5px solid var(--line)',
        borderRadius: 16, padding: '48px 52px', maxWidth: 480, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12,
          background: 'var(--ink)', color: '#fff',
          fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>SR</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10 }}>
          Stock Rush
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 32 }}>
          Project this screen for your class.<br />
          Students join from their phones — no app needed.
        </div>
        <button className="big-btn primary" style={{ width: '100%', fontSize: 17 }} onClick={onGoLive}>
          Go Live →
        </button>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
          Room code and QR code appear after you go live
        </div>
      </div>
    </div>
  );
}

// ── Round-flow reducer ─────────────────────────────────────────────────────
// Owns viewSnapshot + subPhase + seen counters. See ROUND_FLOW_REWRITE_PLAN.md.
//
//   subPhase  transitions:
//   'live' ──ROUND_ADVANCED──> 'popup-open'
//   'popup-open' ──CONTINUE_CLICKED──> 'popup-closing'
//   'popup-closing' ──POPUP_CLOSED──> 'live' (snapshot swapped atomically)
//
// The reducer never allows engine state to leak into viewSnapshot while a
// popup is on screen — that decoupling is the fix for the random glitches.
// Between-round choreography — every beat gets its own subphase so overlays
// can gate on it. The sequencer (a useEffect on subPhase) schedules the next
// transition via setTimeout, so beats fire in a deterministic order with
// bots + student trades frozen the whole way through (see engine.js gate on
// state.roundTimerStartsAt). Timings, in ms from CONTINUE_CLICKED:
//
//   0     'popup-fade'   — popup fades out over 300ms, view still frozen
//   300   'reveal-hold'  — snapshot swaps, FLIP fires; hold for 1200ms
//   1500  'big-moment'   — BigMoment hero card + confetti (2700ms)
//   4200  'countdown'    — "GET READY / 3 / 2 / 1 / GO TRADING!" (3200ms)
//   7400  'live'         — startRoundTimer(), bots + trades resume
function flowReducer(flow, action) {
  switch (action.type) {
    case 'ENGINE_STATE': {
      // Only refresh snapshot while nothing is on screen. In any non-live
      // subphase the reducer IGNORES engine ticks so the view stays frozen.
      if (flow.subPhase !== 'live') return flow;
      return { ...flow, viewSnapshot: structuredClone(action.state) };
    }
    case 'ROUND_ADVANCED': {
      // Freeze immediately. viewSnapshot stays at whatever it was (the
      // pre-advance state). Popup opens.
      return { ...flow, subPhase: 'popup-open', pendingRound: action.round };
    }
    case 'CONTINUE_CLICKED': {
      // Popup dismissed — start the fade. Snapshot is NOT swapped yet
      // (happens at REVEAL_HOLD_START, when the popup is fully gone).
      return {
        ...flow,
        subPhase: 'popup-fade',
        seenPopupRound: action.round,
        seenNewsRound: action.newsRound != null ? action.newsRound : flow.seenNewsRound,
        pendingRound: null,
      };
    }
    case 'REVEAL_HOLD_START': {
      // Popup fully faded. Swap snapshot → leaderboard rerenders → FLIP
      // useLayoutEffect fires within the same commit → rows slide.
      return {
        ...flow,
        subPhase: 'reveal-hold',
        viewSnapshot: structuredClone(action.state),
      };
    }
    case 'BIG_MOMENT_START': {
      return { ...flow, subPhase: 'big-moment' };
    }
    case 'COUNTDOWN_START': {
      return { ...flow, subPhase: 'countdown', countdownStartedAt: action.startedAt };
    }
    case 'REVEAL_COMPLETE': {
      // Choreography done. Engine mirroring resumes; startRoundTimer is
      // called from the same sequencer so bots + student trades unlock.
      return { ...flow, subPhase: 'live', countdownStartedAt: null };
    }
    case 'MARK_NEWS_SEEN': {
      // Standalone news popup dismissed (no round-transition popup).
      return { ...flow, seenNewsRound: action.round };
    }
    case 'GAME_RESET': {
      // Fresh game — clear seen counters + snapshot to current engine state.
      return {
        subPhase: 'live',
        viewSnapshot: structuredClone(action.state),
        seenPopupRound: 0,
        seenNewsRound: null,
        pendingRound: null,
        countdownStartedAt: null,
      };
    }
    default:
      return flow;
  }
}

function HostGame() {
  const [state, setState] = React.useState(() => window.StockRush.getState());

  // Play a news-drop sting when a new headline arrives
  const lastNewsSoundRef = React.useRef(null);
  React.useEffect(() => {
    const r = state.news?.[0]?.round;
    if (r && lastNewsSoundRef.current !== r) {
      lastNewsSoundRef.current = r;
      try { window.SR_AUDIO?.newsDrop?.(); } catch(e){}
    }
  }, [state.news?.[0]?.round]);

  React.useEffect(() => {
    return window.StockRush.subscribe(setState);
  }, []);

  // Popup fade-out: after Continue is clicked, snapshot swaps atomically
  // AND popupFading flips true. Popup stays rendered for 300ms with the
  // rtp-fade-out CSS animation so the view emerges smoothly behind it,
  // rather than a snap-disappear that reads as a "flash".
  const [popupFading, setPopupFading] = React.useState(false);
  const lastRoundPopupPropsRef = React.useRef(null);

  // Round-flow reducer — single owner of viewSnapshot + subPhase + seen
  // counters. Declared here so downstream popup gates can read from it.
  const [flow, dispatchFlow] = React.useReducer(flowReducer, null, () => ({
    subPhase: 'live',
    viewSnapshot: state.phase === 'lobby' ? state : structuredClone(state),
    seenPopupRound: 0,
    seenNewsRound: null,
    pendingRound: null,
    countdownStartedAt: null,
  }));

  // Auto-show popup when new news arrives. Popup stays mounted during the
  // 'popup-fade' subphase so the CSS fade-out animation can play; only after
  // fade completes (subPhase→'reveal-hold') does it actually unmount.
  const latestNews = state.news?.[0];
  const isFading = flow.subPhase === 'popup-fade';
  const showNewsPopup = state.phase === 'playing'
    && latestNews
    && (latestNews.round !== flow.seenNewsRound || isFading);

  // Round transition popup — shown at the start of rounds 2–5
  const roundNews = window.ROUND_NEWS?.[state.round - 1];
  const showRoundPopup = state.phase === 'playing'
    && state.round > 1
    && (state.round > flow.seenPopupRound || isFading)
    && roundNews != null;

  // ── ROUND-FLOW STATE MACHINE ─────────────────────────────────────────────
  // All round-transition state lives here. subPhase controls whether the view
  // reads live `state` or a frozen `viewSnapshot`:
  //   'live'          — view = viewSnapshot mirrors live state; normal play
  //   'popup-open'    — view frozen at pre-advance state, popup showing
  //   'popup-closing' — popup fading out, view still frozen
  //   'reveal'        — popup gone, viewSnapshot just swapped to live,
  //                     FLIP animation runs during this window
  //
  // Actions dispatched atomically so no partial-update flicker is possible.
  // See ROUND_FLOW_REWRITE_PLAN.md for the full architectural rationale.
  const popupUp = showRoundPopup || showNewsPopup;

  // ORDER MATTERS: the ROUND_ADVANCED effect must run BEFORE the ENGINE_STATE
  // mirror effect so the subPhase transitions to 'popup-open' first — then
  // the mirror sees subPhase !== 'live' and skips, leaving the pre-advance
  // snapshot intact.

  // Reset the reducer's seen counters when a fresh game starts (round goes
  // back to 0 or 1 from a higher number, or phase transitions to 'lobby').
  // Prevents Play Again from carrying over R5's popup-seen state.
  const prevPhaseForResetRef = React.useRef(state.phase);
  React.useLayoutEffect(() => {
    const prev = prevPhaseForResetRef.current;
    if (prev === 'ended' && state.phase === 'lobby') {
      dispatchFlow({ type: 'GAME_RESET', state });
    }
    prevPhaseForResetRef.current = state.phase;
  }, [state.phase, state]);

  // Detect a round advance and freeze the view via ROUND_ADVANCED. Also
  // guard against re-firing for the SAME round after a popup was dismissed —
  // React 18 concurrent mode can re-run effects with stale closure values,
  // and we don't want a spurious popup re-open flashing across the screen.
  const prevRoundForFlowRef = React.useRef(state.round);
  const lastDispatchedRoundRef = React.useRef(0);
  React.useLayoutEffect(() => {
    if (state.phase !== 'playing') return;
    const prev = prevRoundForFlowRef.current;
    if (
      state.round > prev &&
      state.round > flow.seenPopupRound &&
      state.round > lastDispatchedRoundRef.current &&
      window.ROUND_NEWS?.[state.round - 1] != null
    ) {
      lastDispatchedRoundRef.current = state.round;
      dispatchFlow({ type: 'ROUND_ADVANCED', round: state.round });
    }
    prevRoundForFlowRef.current = state.round;
  }, [state.round, state.phase, flow.seenPopupRound]);

  // Mirror engine ticks into viewSnapshot while we're in 'live'. During
  // popup subphases the reducer ignores ENGINE_STATE actions (see
  // flowReducer), so the view stays frozen no matter how many times the
  // engine notifies.
  React.useLayoutEffect(() => {
    if (state.phase === 'lobby') return;
    dispatchFlow({ type: 'ENGINE_STATE', state });
  }, [state]);

  // Between-round choreography sequencer. Each subphase auto-schedules the
  // next one via setTimeout. If the user resets mid-sequence, the cleanup
  // clears the pending timer and the reducer skips back to 'live'.
  //   popup-fade  → +300ms  → reveal-hold  (popup done fading)
  //   reveal-hold → +1200ms → big-moment   (FLIP + hold)
  //   big-moment  → +2700ms → countdown    (BigMoment done)
  //   countdown   → +3200ms → live         (fires startRoundTimer)
  React.useEffect(() => {
    if (flow.subPhase === 'popup-fade') {
      const t = setTimeout(() => {
        dispatchFlow({ type: 'REVEAL_HOLD_START', state: window.StockRush.getState() });
      }, 300);
      return () => clearTimeout(t);
    }
    if (flow.subPhase === 'reveal-hold') {
      const t = setTimeout(() => dispatchFlow({ type: 'BIG_MOMENT_START' }), 1200);
      return () => clearTimeout(t);
    }
    if (flow.subPhase === 'big-moment') {
      const t = setTimeout(
        () => dispatchFlow({ type: 'COUNTDOWN_START', startedAt: Date.now() }),
        2700
      );
      return () => clearTimeout(t);
    }
    if (flow.subPhase === 'countdown') {
      const t = setTimeout(() => {
        dispatchFlow({ type: 'REVEAL_COMPLETE' });
        try { window.StockRush.startRoundTimer(); } catch(e){}
      }, 3200);
      return () => clearTimeout(t);
    }
  }, [flow.subPhase]);

  const displayState = flow.viewSnapshot;
  // Bots are seeded by _initHost() — no extra setup needed here.

  const players = Object.values(displayState.players || {});
  const ranked = [...players]
    .map(p => ({ ...p, worth: window.netWorth(p, displayState.stocks) }))
    .sort((a, b) => b.worth - a.worth);

  // Notify parent page on round advance + play audio cues for round-start and game-over
  const prevRoundRef = React.useRef(state.round);
  const prevPhaseRef = React.useRef(state.phase);
  React.useEffect(() => {
    if (state.phase === 'playing' && state.round > prevRoundRef.current) {
      try { window.parent.postMessage({ type: 'stock-rush-round' }, '*'); } catch(e){}
      try { window.SR_AUDIO?.roundStart?.(); } catch(e){}
    }
    if (state.phase === 'ended' && prevPhaseRef.current !== 'ended') {
      try { window.SR_AUDIO?.gameOver?.(); } catch(e){}
    }
    prevRoundRef.current = state.round;
    prevPhaseRef.current = state.phase;
  }, [state.round, state.phase]);

  // Tell parent page when game is live so it can hide the "Chat with us"
  // widget — teacher's in class projecting, no chat needed.
  React.useEffect(() => {
    const live = state.phase !== 'lobby' && state.phase !== 'ended';
    try {
      window.parent.postMessage({ type: live ? 'stock-rush-live' : 'stock-rush-idle' }, '*');
    } catch (e) {}
  }, [state.phase]);

  // ── BIG MOMENT: when a stock jumps >50% on news, fire a confetti overlay ─
  // Two-phase now: (1) on round advance, COMPUTE which stock deserves the
  // celebration and stash it. (2) When subPhase enters 'big-moment', that's
  // when we actually mount the overlay + play the sting. The visibility gate
  // in JSX is subPhase-driven so no auto-clear timer is needed — the beat
  // ends when the sequencer moves to 'countdown'.
  const seenMomentRef = React.useRef(null);
  const [moment, setMoment] = React.useState(null);
  React.useEffect(() => {
    const news = state.news?.[0];
    if (!news || !news.impacts) return;
    if (seenMomentRef.current === news.round) return;
    seenMomentRef.current = news.round;
    // Find the single biggest mover by absolute % change, but ONLY among
    // stocks that are actually in this game's random 8. Otherwise the
    // biggest mover in the full 20-stock pool (e.g. DMART +299%) would win
    // the search and then fail the state.stocks lookup → no confetti fires.
    const activeIds = new Set((state.stocks || []).map(s => s.id));
    let best = null;
    for (const [tk, mult] of Object.entries(news.impacts)) {
      if (!activeIds.has(tk)) continue;
      const pct = (mult - 1) * 100;
      if (Math.abs(pct) >= 50 && (!best || Math.abs(pct) > Math.abs(best.pct))) {
        best = { tk, pct, mult };
      }
    }
    if (!best) { setMoment(null); return; }
    const stock = state.stocks?.find(s => s.id === best.tk);
    if (!stock) { setMoment(null); return; }
    setMoment({ id: news.round, stock, pct: best.pct });
  }, [state.news?.[0]?.round]);

  // Play the big-move audio sting exactly when the celebration beat starts,
  // not when the round advanced. Previously the sting fired several seconds
  // before the confetti was actually visible.
  const stungMomentRef = React.useRef(null);
  React.useEffect(() => {
    if (flow.subPhase !== 'big-moment') return;
    if (!moment) return;
    if (stungMomentRef.current === moment.id) return;
    stungMomentRef.current = moment.id;
    try { window.SR_AUDIO?.bigMove?.(); } catch(e){}
  }, [flow.subPhase, moment?.id]);

  // ── BIG BET: when a student bets ≥50% of their worth in one trade ────────
  const seenBigBetRef = React.useRef(null);
  const [bigBet, setBigBet] = React.useState(null);
  React.useEffect(() => {
    const top = state.activity?.[0];
    if (!top || !top.big) return;
    if (top.id === seenBigBetRef.current) return;
    seenBigBetRef.current = top.id;
    const player = state.players?.[top.playerId];
    if (!player || player.isBot) return; // only humans get the spotlight
    const stock = state.stocks?.find(s => s.id === top.ticker);
    if (!stock) return;
    setBigBet({
      id: top.id, player, stock, kind: top.kind,
      qty: top.qty, total: top.total, pct: top.bigPct || 50,
    });
    try { window.SR_AUDIO?.bigBet?.(); } catch(e){}
    const t = setTimeout(() => setBigBet(null), 4800);
    return () => clearTimeout(t);
  }, [state.activity?.[0]?.id]);

  // Track when the round last advanced so we can silence noisy overlays for
  // ~2.5s afterwards (BigMoment owns that window — no ActionPop stacking on
  // top of the celebration).
  const roundAdvancedAtRef = React.useRef(0);
  React.useEffect(() => {
    roundAdvancedAtRef.current = Date.now();
  }, [state.round]);

  // ── Live action popups — flash on every human trade or lock ──────────────
  const lastActIdRef = React.useRef(null);
  const [actionPops, setActionPops] = React.useState([]); // stack of {id, ...}
  React.useEffect(() => {
    if (state.phase !== 'playing') return;
    const top = state.activity?.[0];
    if (!top || !top.id || top.id === lastActIdRef.current) return;
    lastActIdRef.current = top.id;
    // Quiet window right after a round advance — the BigMoment celebration
    // owns the screen for ~2.5s; stacking bot-trade chips on top made the
    // whole transition read as glitchy visual noise.
    if (Date.now() - roundAdvancedAtRef.current < 2500) return;
    // Popup for trades + locks from ANYONE (humans + bots) — news/joins skip.
    const player = top.playerId ? state.players?.[top.playerId] : null;
    if (!player) return;
    if (!['buy', 'sell', 'lock'].includes(top.kind)) return;
    const stock = top.ticker ? state.stocks?.find(s => s.id === top.ticker) : null;
    const pop = { id: top.id, kind: top.kind, player, stock, qty: top.qty, total: top.total };
    setActionPops(prev => [...prev, pop].slice(-4)); // keep last 4 stacked
    const t = setTimeout(() => {
      setActionPops(prev => prev.filter(x => x.id !== pop.id));
    }, 3000); // total lifespan — animation handles the fade in CSS
    return () => clearTimeout(t);
  }, [state.activity?.[0]?.id, state.phase]);

  // Lock stats (only humans count toward "all locked")
  const humans = players.filter(p => !p.isBot);
  const lockedHumans = humans.filter(p => state.locks?.[p.id]);
  const allLocked = humans.length > 0 && lockedHumans.length === humans.length;

  return (
    <div className="host-shell sr-race-mode">
      {/* BIG MOMENT — celebration beat in the choreographed round transition.
         Gated on subPhase='big-moment' so it fires AFTER the FLIP reveal has
         settled, not simultaneously with the leaderboard shuffle. */}
      {moment && flow.subPhase === 'big-moment' && <BigMoment moment={moment} />}

      {/* BIG BET — student commits ≥50% of their worth in one trade */}
      {bigBet && <BigBetMoment data={bigBet} />}

      {/* Stack of live action popups — top-right, BELOW the header so the
         "Force R(N) →" button is never blocked. Click-through so nothing
         steals clicks from the controls underneath. */}
      {actionPops.length > 0 && (
        <div style={{
          position: 'fixed', top: 96, right: 16, zIndex: 1900,
          display: 'flex', flexDirection: 'column', gap: 8,
          pointerEvents: 'none',
          maxWidth: 340,
        }}>
          {actionPops.map(p => <ActionPop key={p.id} pop={p} />)}
        </div>
      )}
      <HostHeader state={state} lockedHumans={lockedHumans} humans={humans} allLocked={allLocked} popupOpen={popupUp} />
      <div className="sr-checker" aria-hidden="true" />
      {state.phase === 'playing' && <StockTickerMarquee stocks={displayState.stocks} />}
      <div className="host-body">
        {/* HERO — leaderboard + headlines (room to breathe).
           Every child here reads from displayState so nothing shifts under
           an open popup. See "Frozen display state" pattern in build doc. */}
        <div className="host-main">
          <HeroLeaderboard ranked={ranked} stocks={displayState.stocks} locks={displayState.locks} phase={state.phase} />
          <NewsPanel news={displayState.news} phase={state.phase} stocks={displayState.stocks} />
        </div>
        {/* SIDEBAR — live feed + compact market */}
        <div className="host-sidebar">
          <ActivityFeed activity={displayState.activity} reactions={displayState.reactions} players={displayState.players} />
          <CompactStockTicker stocks={displayState.stocks} />
        </div>
      </div>
      {state.phase === 'lobby' && <LobbyOverlay state={state} />}
      {state.phase === 'ended' && <EndedOverlay ranked={ranked} />}
      {showRoundPopup ? (
        <RoundTransitionPopup
          round={state.round}
          year={window.ROUND_YEARS?.[state.round - 1]}
          news={roundNews}
          stocks={state.stocks}
          closing={isFading}
          onDismiss={() => {
            // Kick off the choreographed sequence. Sequencer effect above
            // schedules reveal-hold → big-moment → countdown → live, calling
            // startRoundTimer at the very end so bots + trades stay frozen
            // throughout.
            dispatchFlow({
              type: 'CONTINUE_CLICKED',
              round: state.round,
              newsRound: latestNews?.round,
            });
          }}
        />
      ) : (
        showNewsPopup && (
          <NewsPopup news={latestNews} stocks={state.stocks} onDismiss={() => {
            dispatchFlow({ type: 'MARK_NEWS_SEEN', round: latestNews.round });
            try { window.StockRush.startRoundTimer(); } catch(e){}
          }} />
        )
      )}
      {flow.subPhase === 'countdown' && (
        <CountdownOverlay startedAt={flow.countdownStartedAt} />
      )}
    </div>
  );
}

// Full-screen countdown overlay — the final beat of the between-round
// choreography. Beats: 0-500 "GET READY" · 500-1200 "3" · 1200-1900 "2" ·
// 1900-2600 "1" · 2600-3200 "GO TRADING!". Re-renders every 100ms driven by
// setInterval so the text advances cleanly through the beats.
function CountdownOverlay({ startedAt }) {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const i = setInterval(() => force(n => n + 1), 100);
    return () => clearInterval(i);
  }, []);
  const elapsed = Date.now() - (startedAt || Date.now());
  let text;
  let tone = 'ready';
  if (elapsed < 500)        { text = 'GET READY'; tone = 'ready'; }
  else if (elapsed < 1200)  { text = '3'; tone = 'num'; }
  else if (elapsed < 1900)  { text = '2'; tone = 'num'; }
  else if (elapsed < 2600)  { text = '1'; tone = 'num'; }
  else                      { text = 'GO TRADING!'; tone = 'go'; }
  // Key on `text` so React remounts the display element every beat — that
  // restarts the pop animation clean instead of interpolating between beats.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(7,26,16,0.85) 0%, rgba(7,26,16,0.55) 60%, rgba(7,26,16,0.35) 100%)',
      pointerEvents: 'none',
    }}>
      <div
        key={text}
        style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontWeight: 800,
          letterSpacing: tone === 'num' ? '-0.02em' : '0.04em',
          color: tone === 'go' ? '#4ade80' : tone === 'num' ? '#fff5b7' : '#fff',
          fontSize: tone === 'num' ? 'clamp(240px, 34vw, 480px)' : 'clamp(80px, 10vw, 160px)',
          textShadow: tone === 'go'
            ? '0 0 40px rgba(74,222,128,0.7), 0 8px 24px rgba(0,0,0,0.5)'
            : tone === 'num'
              ? '0 0 32px rgba(255,224,120,0.6), 0 8px 24px rgba(0,0,0,0.5)'
              : '0 4px 18px rgba(0,0,0,0.5)',
          animation: 'sr-count-pop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.4) both',
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
      <style>{`
        @keyframes sr-count-pop {
          0%   { opacity: 0; transform: scale(0.55); }
          55%  { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function ConnectionChip() {
  const [online, setOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  React.useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={online ? 'Connection: online' : 'Connection: offline'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
        padding: '2px 8px',
        borderRadius: 999,
        background: online ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.12)',
        color: online ? '#15803d' : '#b91c1c',
        border: '1px solid ' + (online ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.4)'),
      }}
    >
      {online ? '● CONNECTED' : '⚠ OFFLINE'}
    </span>
  );
}

function HostHeader({ state, lockedHumans, humans, allLocked, popupOpen }) {
  const total = window.GAME_CONFIG.rounds;
  const year = window.ROUND_YEARS?.[state.round - 1];
  const [resetOpen, setResetOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [audioMuted, setAudioMuted] = React.useState(false);
  React.useEffect(() => {
    if (window.SR_AUDIO) window.SR_AUDIO.mute = audioMuted;
  }, [audioMuted]);

  function handleAdvance() {
    window.StockRush.advanceRound();
  }

  return (
    <div className="host-header">
      {/* Brand + new game */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <div className="brand">
          <div className="brand-mark">SR</div>
          <div>
            <div className="brand-title">Stock Rush</div>
            <div className="brand-sub">8 stocks. 10 years. ₹1L. Last one standing. · Room <b>{window.GAME_CONFIG.roomCode}</b></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <ConnectionChip />
          <button
            onClick={() => setAudioMuted(m => !m)}
            aria-label={audioMuted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={audioMuted}
            style={{
              background: audioMuted ? '#fff' : 'transparent',
              border: '1px solid rgba(0,0,0,0.15)',
              color: 'rgba(0,0,0,0.55)',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
            title={audioMuted ? 'Audio muted — click to enable' : 'Audio on — click to mute'}
          >
            {audioMuted ? '🔇 Muted' : '🔊 Sound on'}
          </button>
          <button
            onClick={() => setResetOpen(true)}
            aria-label="End current game and start a fresh one"
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,0,0,0.15)',
              color: 'rgba(0,0,0,0.55)',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
            title="End the current game and start fresh"
          >
            ↺ New game
          </button>
        </div>
      </div>
      {resetOpen && (
        <ResetConfirmModal
          phase={state.phase}
          studentCount={humans.length}
          onCancel={() => setResetOpen(false)}
          onConfirm={() => { setResetOpen(false); window.StockRush.reset(); }}
        />
      )}

      {/* Center — round info + lock status */}
      <div className="header-center">
        {state.phase === 'playing' && (
          <>
            {/* Big projector-friendly round badge (matches Pro): black pill
                for the round number, muted-green year pill, timer alongside. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{
                background: '#071a10', color: '#fff',
                fontFamily: 'Geist Mono, ui-monospace',
                fontSize: 30, fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '6px 18px', borderRadius: 8,
                lineHeight: 1.05,
              }}>
                ROUND {state.round} / {total}
              </div>
              <span className="sr-lap-chip" title="Racing edition">
                LAP {state.round}/{total}
              </span>
              {year && (
                <div style={{
                  background: 'rgba(15,58,36,0.10)',
                  color: '#0f3a24',
                  fontFamily: 'Geist Mono, ui-monospace',
                  fontSize: 22, fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '5px 14px', borderRadius: 6,
                  border: '1.5px solid rgba(15,58,36,0.25)',
                  lineHeight: 1.05,
                }}>
                  {year}
                </div>
              )}
              <RoundTimer
                startedAt={state.roundTimerStartsAt}
                durationSec={(window.GAME_CONFIG.roundDurations || [])[state.round - 1]}
                pausedMs={state.pausedMs || 0}
                isPaused={!!state.paused}
                pausedAt={state.pausedAt}
              />
            </div>
            {(() => {
              // Era headline pulled from the previous round's news. Always
              // render the container (with a non-breaking space when empty)
              // so the header keeps a constant height and R1→R2 doesn't
              // push everything below it down under the popup as it fades.
              const rn = window.ROUND_NEWS?.[state.round - 1];
              const short = rn ? rn.headline.split('—')[0].trim() : '';
              return (
                <div style={{
                  marginTop: 2,
                  fontSize: 13, fontWeight: 600,
                  color: '#92400e',
                  letterSpacing: '-0.01em',
                  textTransform: 'none',
                  minHeight: '1.4em',
                  visibility: short ? 'visible' : 'hidden',
                }}>
                  {short ? '📰 ' + short : ' '}
                </div>
              );
            })()}

            {/* Lock status chips */}
            <div className="lock-strip">
              {humans.length === 0
                ? <span className="muted" style={{ fontSize: '0.75rem' }}>No students yet</span>
                : humans.map(p => (
                    <KickableLockChip key={p.id} player={p} locked={!!state.locks?.[p.id]} />
                  ))
              }
            </div>

            <div className="lock-count">
              {lockedHumans.length} / {humans.length} locked
            </div>
          </>
        )}
        {state.phase === 'lobby' && <div className="round-label">Lobby</div>}
        {state.phase === 'ended' && <div className="round-label">Final results</div>}
      </div>

      {/* Right — join pill + Next Round button */}
      <div className="header-right" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <button
          type="button"
          className="join-pill"
          onClick={() => setShareOpen(true)}
          aria-label="Show full-screen QR code for students to scan"
          style={{
            background: 'inherit', border: 'none', padding: 0, font: 'inherit',
            color: 'inherit', cursor: 'pointer', textAlign: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <JoinPillQR />
            <div style={{ textAlign: 'right' }}>
              <div className="join-label">📱 JOIN ON YOUR PHONE</div>
              <div className="join-url">ifm-deploy.vercel.app/stock-rush</div>
              <div className="join-code">{window.GAME_CONFIG.roomCode}</div>
              <div style={{ fontSize: 10, color: '#0f3a24', fontWeight: 700, marginTop: 4, letterSpacing: '0.04em' }}>
                Tap to show full QR →
              </div>
            </div>
          </div>
        </button>
        {shareOpen && (
          <ShareQRModal
            round={state.round}
            phase={state.phase}
            humanCount={humans.length}
            onClose={() => setShareOpen(false)}
          />
        )}

        {state.phase === 'playing' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => window.StockRush.togglePause()}
              aria-label={state.paused ? 'Resume game' : 'Pause game'}
              aria-pressed={!!state.paused}
              title={state.paused ? 'Resume the round' : 'Pause to discuss something'}
              style={{
                padding: '9px 14px',
                background: state.paused ? '#d97706' : '#fff',
                color: state.paused ? '#fff' : '#0f172a',
                border: '1.5px solid ' + (state.paused ? '#d97706' : '#cbd5e1'),
                borderRadius: 10,
                fontFamily: 'Geist Mono, ui-monospace',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: state.paused ? '0 0 0 4px rgba(217,119,6,0.18)' : 'none',
                animation: state.paused ? 'pause-pulse 1.5s infinite' : 'none',
              }}
            >
              {state.paused ? '▶ RESUME' : '⏸ PAUSE'}
              <style>{`
                @keyframes pause-pulse {
                  0%,100% { box-shadow: 0 0 0 4px rgba(217,119,6,0.18); }
                  50%     { box-shadow: 0 0 0 8px rgba(217,119,6,0.32); }
                }
              `}</style>
            </button>
            {!(popupOpen && !allLocked) && (
              <button
                className={'next-round-btn ' + (allLocked ? 'ready' : 'force')}
                onClick={handleAdvance}
                aria-label={allLocked ? 'Advance round' : 'Force advance round'}
                title={allLocked
                  ? 'All students locked in — advance the round'
                  : 'Not all locked yet — force-advance anyway (in case a student walked out)'}
              >
                {state.round >= window.GAME_CONFIG.rounds
                  ? (allLocked ? 'End game →' : '⚡ Force end →')
                  : (allLocked ? `Next R${state.round + 1} →` : `⚡ Force R${state.round + 1} →`)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact sidebar stock list — prices at a glance
function CompactStockTicker({ stocks }) {
  return (
    <div className="panel compact-ticker">
      <div className="panel-head">
        <span>Market</span>
        <span className="muted">{stocks.length} stocks</span>
      </div>
      <div className="ticker-list">
        {stocks.map(s => {
          const prev = s.history[s.history.length - 2] || s.history[0];
          const pct  = prev ? ((s.price - prev) / prev * 100) : 0;
          const up   = pct >= 0;
          const sectorCol = (window.SECTOR_COLORS?.[s.sector]?.border) || '#cbd5e1';
          return (
            <div className="ticker-row" key={s.id} style={{ borderLeft: `4px solid ${sectorCol}` }}>
              <span className="ticker-emoji" style={{ fontSize: 18 }}>{s.emoji}</span>
              <div className="ticker-ident">
                <span className="ticker-id" style={{ fontSize: 14 }}>{s.id}</span>
                <span className="ticker-name" style={{ fontSize: 11 }}>{s.name}</span>
              </div>
              <div className="ticker-right">
                <span className="ticker-price" style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(s.price)}</span>
                {Math.abs(pct) >= 0.01 && (
                  <span className={'ticker-delta ' + (up ? 'up' : 'down')} style={{ fontSize: 12, fontWeight: 700 }}>
                    {up ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stock ticker marquee ─────────────────────────────────────────────────────
// TV-style horizontal scrolling price ticker under the host header. Ported
// from Stock Rush Pro. Only renders during 'playing' phase.
function StockTickerMarquee({ stocks }) {
  const list = (stocks || []).filter(s => s && s.price != null);
  if (list.length === 0) return null;
  const doubled = [...list, ...list];
  return (
    <div className="sr-ticker-wrap">
      <div className="sr-ticker-track">
        {doubled.map((s, i) => {
          const diff = s.price - (s.prevPrice || s.price);
          const pct  = s.prevPrice ? (diff / s.prevPrice) * 100 : 0;
          const flat = !s.prevPrice || s.prevPrice === s.price;
          const up   = diff >= 0;
          // Reserve constant width for the delta pill so its
          // appear/disappear on round transitions doesn't reflow the
          // track mid-scroll (the source of the visible "jerk").
          return (
            <div key={s.id + '-' + Math.floor(i / list.length)} className="sr-ticker-item">
              <span className="sr-ticker-emoji">{s.emoji || s.mono || '•'}</span>
              <span className="sr-ticker-id">{s.id}</span>
              <span className="sr-ticker-price">₹{s.price.toLocaleString('en-IN')}</span>
              <span className={'sr-ticker-delta' + (flat ? ' flat' : up ? ' up' : ' down')}>
                {flat ? '' : (up ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(1) + '%'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewsPanel({ news, phase, stocks }) {
  const latest = news[0];
  const older  = news.slice(1);
  // Only show impact chips for stocks actually in play this session.
  // Without this filter the sidebar news card was showing all 20 tickers
  // when only 8 are being traded.
  const activeIds = new Set((stocks || []).map(s => s.id));

  const [isFresh, setIsFresh] = React.useState(false);
  React.useEffect(() => {
    if (!latest) return;
    setIsFresh(true);
    const t = setTimeout(() => setIsFresh(false), 10000);
    return () => clearTimeout(t);
  }, [latest?.round]);

  if (phase === 'lobby') return null;

  return (
    <div className="panel news-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="panel-head" style={{ padding: '12px 18px', borderBottom: '1.5px solid var(--line)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: '#dc2626', boxShadow: isFresh ? '0 0 0 4px rgba(220,38,38,0.18)' : 'none',
            animation: isFresh ? 'pulse 1.6s infinite' : 'none',
            opacity: isFresh ? 1 : 0.7,
          }} />
          <span style={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            {isFresh ? 'BREAKING NEWS' : 'HEADLINES'}
          </span>
        </span>
        <span className="muted">{news.length} headline{news.length !== 1 ? 's' : ''}</span>
      </div>

      {news.length === 0 && (
        <div style={{ padding: 32, color: 'var(--muted)', fontSize: 14, textAlign: 'center', minHeight: 220 }}>
          📰  No news yet. Watch this space.
        </div>
      )}

      {/* HERO headline — latest, full-bleed. Dark racing amber to match the
         F1 pit-wall aesthetic while still reading as an urgent breaking-news
         card. */}
      {latest && (
        <div style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #2a1a0a 0%, #1a0f05 100%)',
          borderBottom: '1px solid rgba(220,150,0,0.28)',
          borderLeft: '4px solid var(--racing-red)',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              display: 'inline-block', padding: '3px 9px',
              background: 'var(--racing-red)', color: '#fff',
              fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 11,
              letterSpacing: '0.08em', borderRadius: 4,
              boxShadow: '0 0 12px rgba(220,0,0,0.5)',
            }}>
              LAP {latest.round}
            </span>
            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#facc15', fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>
              ⚡ BREAKING
            </span>
          </div>

          <div style={{
            fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: '#fff',
            letterSpacing: '-0.01em', marginBottom: 8,
          }}>
            {latest.headline}
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)', marginBottom: 14 }}>
            {latest.body}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(latest.impacts).filter(([tk]) => activeIds.has(tk)).map(([tk, mult]) => {
              const up = mult >= 1;
              const pct = ((mult - 1) * 100).toFixed(0);
              const stockName = (window.STOCKS || []).find(s => s.id === tk)?.name || tk;
              return (
                <div key={tk}
                  title={`${stockName} ${up ? 'up' : 'down'} ${Math.abs(pct)}%`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px',
                    background: up ? '#16a34a' : '#dc2626',
                    color: '#fff',
                    fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.02em',
                    borderRadius: 6,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}>
                  <span>{tk}</span>
                  <span style={{ opacity: 0.85 }}>{up ? '▲' : '▼'} {up ? '+' : ''}{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Older headlines — compact list */}
      {older.length > 0 && (
        <div style={{ padding: '8px 18px 14px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', margin: '6px 0 8px' }}>
            Earlier
          </div>
          {older.map(n => (
            <div key={n.round} style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr auto',
              gap: 12, alignItems: 'start',
              padding: '10px 0',
              borderTop: '1px solid var(--line)',
            }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 11,
                padding: '2px 6px', background: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: 4, textAlign: 'center', color: 'var(--muted)',
              }}>
                R{n.round}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: 'var(--ink)' }}>
                  {n.headline}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 220 }}>
                {Object.entries(n.impacts).filter(([tk]) => activeIds.has(tk)).map(([tk, mult]) => {
                  const up = mult >= 1;
                  return (
                    <span key={tk} style={{
                      fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                      padding: '2px 6px', borderRadius: 4,
                      background: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                      color: up ? '#15803d' : '#b91c1c',
                    }}>
                      {tk} {up ? '+' : ''}{((mult - 1) * 100).toFixed(0)}%
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];
const RANK_BG = ['#f5e642', '#d4d4d4', '#e8a96e'];

function HeroLeaderboard({ ranked, stocks, locks, phase }) {
  // FLIP animation: only fires when a player's RANK POSITION changes
  // (not on every render, and not when the user scrolls). We track rank
  // INDEX per player id — comparing rank-order is stable regardless of
  // viewport scroll, and only fires when someone genuinely leapfrogs.
  const listRef = React.useRef(null);
  const rankMapRef = React.useRef(new Map());
  const rankKey = ranked.map(p => p.id).join('|');

  // Track previous rank so we can render F1-style position-change arrows
  // (▲2, ▼1, ★ NEW). This survives across re-renders via useRef.
  const prevRankByIdRef = React.useRef(new Map());
  // Build new snapshot AFTER we've computed the display delta.
  const posChangeById = new Map();
  ranked.forEach((p, i) => {
    const prev = prevRankByIdRef.current.get(p.id);
    if (prev == null) posChangeById.set(p.id, 'new');
    else if (prev > i) posChangeById.set(p.id, prev - i);   // moved UP
    else if (prev < i) posChangeById.set(p.id, -(i - prev)); // moved DOWN
    else posChangeById.set(p.id, 0);
  });
  React.useEffect(() => {
    const m = new Map();
    ranked.forEach((p, i) => m.set(p.id, i));
    prevRankByIdRef.current = m;
  }, [rankKey]);

  // Gap-to-leader for each row (F1 timing tower's core column)
  const leaderWorth = ranked[0]?.worth || 0;
  React.useLayoutEffect(() => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll('[data-player-id]');
    const newRankMap = new Map();
    rows.forEach((row, idx) => {
      newRankMap.set(row.dataset.playerId, idx);
    });
    // Rank-1 has extra padding (14px vs 10px = ~8px taller), so sampling
    // rows[0].offsetHeight overshoots dy for non-podium swaps. Sum the
    // ACTUAL row heights between prevIdx and newIdx per row so each FLIP
    // lands exactly on its final position.
    const heights = Array.from(rows).map(r => r.offsetHeight);
    // distanceBetween(from, to) = signed vertical offset FROM row-at-from TO
    // row-at-to. Positive means `to` is below `from` in the leaderboard.
    // (Bug fix 2026-07-30: sign was flipped — every FLIP was translating the
    // wrong direction and snapping back, most visibly on R4→R5 when big
    // rank shuffles happen.)
    function distanceBetween(fromIdx, toIdx) {
      if (fromIdx === toIdx) return 0;
      const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
      let sum = 0;
      for (let k = lo; k < hi; k++) sum += heights[k] || 0;
      return fromIdx < toIdx ? sum : -sum;
    }
    rows.forEach((row, newIdx) => {
      const id = row.dataset.playerId;
      const prevIdx = rankMapRef.current.get(id);
      if (prevIdx != null && prevIdx !== newIdx) {
        // dy = "distance from where I am NOW to where I WAS", i.e. the offset
        // that visually restores my previous position. Applied as translateY
        // then animated to 0 so I appear to slide from my old slot to my new.
        const dy = distanceBetween(newIdx, prevIdx);
        if (Math.abs(dy) > 2000) { row.style.transform = ''; return; }
        row.style.transform = 'translateY(' + dy + 'px)';
        row.style.transition = 'none';
        // Force a layout read to commit the current transform BEFORE we
        // enable the transition. Without this the browser batches both
        // style writes into the same frame and the row snaps to its final
        // position with no animation. Classic FLIP gotcha.
        // eslint-disable-next-line no-unused-expressions
        row.offsetHeight;
        // Clean ease-out — NO overshoot. The previous bezier ended with
        // y2 = 1.1, which meant every row bounced ~5-7px past its target
        // and settled back. All 5 rows wobbling at once at the end of the
        // slide is what read as "glitching" on the projector.
        row.style.transition = 'transform 550ms cubic-bezier(0.25, 0.1, 0.25, 1)';
        // MUST set an explicit target (translateY(0)) rather than '' —
        // an empty string just removes the inline style, and browsers
        // won't animate a transition with no explicit "to" value. The
        // result was rows stuck at their FLIP starting offsets (e.g.
        // translateY(442px)) FOREVER after the animation "started" —
        // no interpolation ever fired. That was the residual glitch
        // showing up as rows sitting in wrong positions between rounds.
        row.style.transform = 'translateY(0)';
      }
    });
    rankMapRef.current = newRankMap;
  }, [rankKey]);

  if (ranked.length === 0) {
    return (
      <div className="panel hero-lb">
        <div className="panel-head"><span>Leaderboard</span></div>
        <div className="news-empty" style={{ padding: 40 }}>Waiting for players…</div>
      </div>
    );
  }

  return (
    <div className="panel hero-lb">
      <div className="panel-head">
        <span>Leaderboard</span>
        <span className="muted">{ranked.filter(p => !p.isBot).length} students · {ranked.filter(p => p.isBot).length} bots</span>
      </div>
      <div className="hero-lb-list" ref={listRef}>
        {ranked.map((p, i) => {
          const pnl    = p.worth - window.GAME_CONFIG.startingCash;
          const pnlPct = (pnl / window.GAME_CONFIG.startingCash * 100).toFixed(1);
          const up     = pnl >= 0;
          const isLocked = locks?.[p.id];

          // Build holdings list
          const holdings = Object.entries(p.holdings || {})
            .filter(([, qty]) => qty > 0)
            .map(([ticker, qty]) => {
              const stock = stocks.find(s => s.id === ticker);
              const cost  = (p.holdingsCost || {})[ticker];
              const stockUp = cost ? stock?.price >= cost : null;
              return { ticker, qty, stock, stockUp };
            });

          const investedVal = holdings.reduce((sum, { stock, qty }) =>
            sum + (stock?.price || 0) * qty, 0);

          return (
            <div
              key={p.id}
              data-player-id={p.id}
              className={
                'hero-row' +
                (p.isBot ? ' is-bot' : '') +
                (i === 0 ? ' top-dog rank-1' :
                 i === 1 ? ' rank-2' :
                 i === 2 ? ' rank-3' :
                 i === ranked.length - 1 && ranked.length > 4 ? ' rank-bottom' :
                 i < 6 ? ' rank-mid' : '')
              }
              style={{
                '--rank-bg': i < 3 ? RANK_BG[i] : 'transparent',
                // Tint lower ranks with the player's avatar colour. Do NOT
                // change padding-left across the rank-3/4 boundary — that
                // 4px horizontal jump caused a diagonal jerk during the
                // FLIP animation when someone crossed the podium boundary.
                ...(i >= 3 ? {
                  background: `linear-gradient(90deg, ${p.color || '#cbd5e1'}14 0%, ${p.color || '#cbd5e1'}06 50%, transparent 100%)`,
                  borderLeft: `4px solid ${p.color || '#cbd5e1'}`,
                } : {}),
              }}
            >
              {/* Rank — F1 podium chips for P1/P2/P3 during the game */}
              <div className="hr-rank">
                {i < 3
                  ? <span className={'sr-podium sr-podium-lg p' + (i + 1)}>{'P' + (i + 1)}</span>
                  : <span className="hr-num">{i + 1}</span>
                }
              </div>

              {/* Avatar + name */}
              <div className="hr-identity">
                <Avatar name={p.name} color={p.color} avatar={p.avatar} size={i === 0 ? 66 : 51} />
                <div>
                  <div className="hr-name" style={{ fontSize: i === 0 ? '1.15rem' : '0.95rem' }}>
                    {p.name}
                    {p.isBot && <span className="bot-tag">bot</span>}
                    {isLocked && !p.isBot && <span className="hr-lock">🔒</span>}
                  </div>
                  <div className="hr-cash">
                    <span className="pill cash">💵 {formatMoney(p.cash)}</span>
                    {investedVal > 0 && <span className="pill invested">📈 {formatMoney(investedVal)}</span>}
                  </div>
                </div>
              </div>

              {/* Portfolio chips */}
              <div className="hr-portfolio">
                {holdings.length === 0
                  ? <span className="hr-no-holds muted">All cash</span>
                  : holdings.map(({ ticker, qty, stock, stockUp }) => (
                      <div
                        key={ticker}
                        className={'hr-chip' + (stockUp === true ? ' chip-up' : stockUp === false ? ' chip-down' : '')}
                      >
                        <span className="hr-chip-emoji">{stock?.emoji}</span>
                        <span className="hr-chip-ticker">{ticker}</span>
                        <span className="hr-chip-qty">×{qty}</span>
                      </div>
                    ))
                }
              </div>

              {/* F1 timing tower — GAP to leader (P1 shows LEADER) */}
              {(() => {
                const gap = leaderWorth - p.worth;
                const isLeader = i === 0;
                return (
                  <div className="sr-gap-col">
                    <div className="sr-gap-label">GAP</div>
                    <div className={'sr-gap-value ' + (isLeader ? 'leader' : gap === 0 ? 'even' : 'behind')}>
                      {isLeader ? '— LEADER —' : gap > 0 ? '−' + formatMoney(gap) : '+' + formatMoney(-gap)}
                    </div>
                  </div>
                );
              })()}

              {/* Worth + P&L */}
              <div className="hr-worth-block">
                <div className={'hr-worth' + (i === 0 ? ' hero-worth' : '')}>
                  {formatMoney(p.worth)}
                </div>
                <div className={'hr-pnl ' + (up ? 'up' : 'down')}>
                  {up ? '▲' : '▼'} {Math.abs(pnlPct)}%
                  <span className="hr-pnl-abs"> · {up ? '+' : ''}{formatMoney(pnl)}</span>
                </div>
                {/* Position change arrow — F1 style */}
                {(() => {
                  const posChange = posChangeById.get(p.id);
                  if (posChange === 'new') {
                    return <div className="sr-pos-change new">★ NEW</div>;
                  }
                  if (typeof posChange === 'number' && posChange !== 0) {
                    const up = posChange > 0;
                    return (
                      <div className={'sr-pos-change ' + (up ? 'up' : 'down')}>
                        {up ? '▲' : '▼'} {Math.abs(posChange)} POS
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityFeed({ activity, reactions, players }) {
  // Categorise each activity line by keywords for colour-coding
  function classify(text) {
    if (/bought/i.test(text))         return { kind: 'buy',   bg: 'rgba(22,163,74,0.10)',  fg: '#15803d', icon: '🟢', border: 'rgba(22,163,74,0.35)' };
    if (/sold/i.test(text))           return { kind: 'sell',  bg: 'rgba(220,38,38,0.10)',  fg: '#b91c1c', icon: '🔴', border: 'rgba(220,38,38,0.35)' };
    if (/locked in/i.test(text))      return { kind: 'lock',  bg: 'rgba(99,102,241,0.10)', fg: '#4338ca', icon: '🔒', border: 'rgba(99,102,241,0.35)' };
    if (/joined/i.test(text))         return { kind: 'join',  bg: 'rgba(20,184,166,0.10)', fg: '#0f766e', icon: '👋', border: 'rgba(20,184,166,0.35)' };
    if (/removed/i.test(text))        return { kind: 'kick',  bg: 'rgba(100,116,139,0.10)',fg: '#475569', icon: '🚪', border: 'rgba(100,116,139,0.35)' };
    if (/^📰|begins/i.test(text))     return { kind: 'news',  bg: 'rgba(217,119,6,0.12)',  fg: '#92400e', icon: '📣', border: 'rgba(217,119,6,0.4)' };
    if (/Game over|🏁/i.test(text))   return { kind: 'end',   bg: 'rgba(245,158,11,0.14)', fg: '#92400e', icon: '🏁', border: 'rgba(245,158,11,0.4)' };
    return { kind: 'other', bg: 'rgba(0,0,0,0.03)', fg: '#475569', icon: '•', border: 'rgba(0,0,0,0.08)' };
  }

  return (
    <div className="panel activity-panel">
      <div className="panel-head" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#dc2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.18)',
          animation: 'lf-pulse 1.4s infinite',
        }} />
        <span style={{ fontWeight: 700, letterSpacing: '0.08em' }}>LIVE FEED</span>
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 11, fontFamily: 'Geist Mono, ui-monospace' }}>
          {activity.length}
        </span>
      </div>

      {(reactions.length > 0 || true) && (
        <div className="reaction-strip" style={{
          background: reactions.length > 0
            ? 'linear-gradient(180deg, rgba(252,211,77,0.08), transparent)'
            : 'transparent',
          minHeight: 44,
        }}>
          {reactions.length === 0 && (
            <span className="muted" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
              👀 Students tap 🔥 😱 🎉 on news to react — they'll show up here
            </span>
          )}
          {reactions.slice(-12).map(r => {
            const p = players[r.playerId];
            return (
              <span key={r.id} className="reaction-chip" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#fff',
                border: '1.5px solid rgba(217,119,6,0.3)',
                borderRadius: 14,
                padding: '3px 8px 3px 4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                {p && <Avatar name={p.name} color={p.color} avatar={p.avatar} size={18} />}
                <span style={{ fontSize: 14 }}>{r.emoji}</span>
                <span style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>{p?.name || '?'}</span>
              </span>
            );
          })}
        </div>
      )}

      <div className="activity-list" style={{ padding: '6px 8px' }}>
        {activity.length === 0 && (
          <div style={{
            padding: '20px 12px', textAlign: 'center',
            color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.55,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📈</div>
            <div style={{ fontWeight: 600, color: '#475569' }}>Trading hasn't started yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Every buy, sell and lock will pop up here.</div>
          </div>
        )}
        {activity.slice(0, 20).map((a, i) => {
          const cat = classify(a.text);
          const isNewest = i === 0;
          return (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px',
                margin: '3px 0',
                background: cat.bg,
                borderLeft: `3px solid ${cat.border}`,
                borderRadius: '0 6px 6px 0',
                fontSize: 12,
                fontFamily: 'Geist, ui-sans-serif',
                color: cat.fg,
                fontWeight: isNewest ? 600 : 500,
                animation: isNewest ? 'lf-slide 0.32s ease-out' : 'none',
                boxShadow: isNewest ? `0 1px 4px ${cat.border}` : 'none',
              }}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>{cat.icon}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.text}
              </span>
              {isNewest && activity.length > 1 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                  color: cat.fg, opacity: 0.7,
                }}>NEW</span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes lf-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes lf-slide {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function LobbyOverlay({ state }) {
  const humans = Object.values(state.players).filter(p => !p.isBot);
  const qrUrl = window.location.origin + window.location.pathname +
    '?role=player&room=' + window.GAME_CONFIG.roomCode;
  const qrRef = React.useRef(null);
  const qrInst = React.useRef(null);
  const QR_SIZE = 320;
  // Pre-round-1 briefing modal — teacher clicks Start, sees a 5-slide
  // walkthrough for the class (how to buy, how to sell, the real-history
  // arc, the leaderboard drama), then hits "Let's play →" which actually
  // starts the game. Keeps Round 1 predictable and gives the teacher
  // narration material.
  const [briefingOpen, setBriefingOpen] = React.useState(false);

  React.useEffect(() => {
    function makeQR() {
      if (!qrRef.current || !window.QRCode) return;
      if (qrInst.current) { try { qrInst.current.clear(); } catch(e){} qrInst.current = null; }
      qrRef.current.innerHTML = '';
      qrInst.current = new QRCode(qrRef.current, {
        text: qrUrl,
        width: QR_SIZE, height: QR_SIZE,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
    }
    const t = setTimeout(makeQR, 100);
    return () => { clearTimeout(t); if (qrInst.current) { try { qrInst.current.clear(); } catch(e){} qrInst.current = null; } };
  }, [qrUrl]);

  // ── "Player joined!" pop-up — fires whenever a new human appears ─────────
  const prevIdsRef = React.useRef(new Set(humans.map(p => p.id)));
  const [arrival, setArrival] = React.useState(null);
  React.useEffect(() => {
    const prevIds = prevIdsRef.current;
    const newcomer = humans.find(p => !prevIds.has(p.id));
    if (newcomer) {
      setArrival({ id: Date.now(), player: newcomer });
      try { window.SR_AUDIO?.playerJoin?.(); } catch(e){}
      const t = setTimeout(() => setArrival(null), 3500);
      return () => clearTimeout(t);
    }
    prevIdsRef.current = new Set(humans.map(p => p.id));
  }, [humans.map(p => p.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the ref synced after the arrival has been processed
  React.useEffect(() => {
    prevIdsRef.current = new Set(humans.map(p => p.id));
  }, [humans.length]);

  // Teacher-controlled start only — no auto-start countdown. Teacher clicks
  // the primary CTA to begin so the game always waits for them.

  return (
    <div className="overlay">
      <div className="overlay-card sr-racing" style={{ maxWidth: 960, padding: 0 }}>
        <div className="sr-checker" aria-hidden="true" />

        {/* Top brand strip with race plate */}
        <div className="sr-race-topstrip">
          <div style={{ flex: 1 }}>
            <div className="sr-race-tag">SR · SILVERSTONE EDITION</div>
            <div className="sr-race-title">Stock Rush · Grid</div>
          </div>
          <div className="sr-race-plate" title="Room code — students join with this">
            <span className="plate-eyebrow">RACE&nbsp;Nº</span>
            <span className="plate-code">{window.GAME_CONFIG.roomCode}</span>
          </div>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>

          {/* PIT WALL — the driver list and start button */}
          <div className="sr-race-panel">
            <div className="sr-panel-label">Pit Wall · Host Controls</div>
            <div className="sr-panel-title">
              {humans.length === 0
                ? 'Waiting for drivers'
                : `${humans.length} driver${humans.length === 1 ? '' : 's'} on grid`}
            </div>
            <div className="sr-panel-sub">
              Start when your students are ready. Bots fill empty seats so the race is always five wide.
            </div>

            {/* Driver bibs */}
            <div style={{ flex: 1, minHeight: 120, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {humans.length === 0
                ? <div className="sr-grid-empty">GRID EMPTY — SHARE THE QR</div>
                : humans.map((p, i) => (
                    <div key={p.id} className="sr-driver-chip">
                      <div className="bib">{String(i + 1).padStart(2, '0')}</div>
                      <Avatar name={p.name} color={p.color} avatar={p.avatar} size={28} />
                      <div className="name">{p.name}</div>
                      <button
                        className="kick-x"
                        title="Kick from grid"
                        onClick={() => {
                          if (window.confirm(`Remove ${p.name} from the grid?`)) {
                            try { window.StockRush.kick(p.id); } catch(e){}
                          }
                        }}
                      >✕</button>
                    </div>
                  ))
              }
            </div>

            {/* Race start button */}
            <button
              className={'sr-lights-btn' + (humans.length === 0 ? ' subtle' : '')}
              onClick={() => setBriefingOpen(true)}
            >
              🏁 {humans.length === 0 ? 'Start with just bots →' : 'Lights out & away we go →'}
            </button>
          </div>

          {/* STARTING GRID — QR panel */}
          <div className="sr-race-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div className="sr-panel-label" style={{ alignSelf: 'flex-start' }}>Starting Grid · Player Join</div>
            <div className="sr-panel-title" style={{ textAlign: 'center', width: '100%' }}>Scan to join</div>
            <div className="sr-panel-sub" style={{ textAlign: 'center' }}>
              Point your phone camera at the code — no app needed.
            </div>
            <div className="sr-pit-board">
              <div ref={qrRef} style={{ width: QR_SIZE, height: QR_SIZE }}></div>
            </div>
            <div className="sr-pit-board-tag">
              OR ROOM Nº&nbsp;<b style={{ color: '#fff', letterSpacing: '0.18em' }}>{window.GAME_CONFIG.roomCode}</b>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="sr-race-stats">
          <span><b>{window.GAME_CONFIG.rounds}</b>&nbsp;LAPS</span>
          <span><b>8</b>&nbsp;STOCKS</span>
          <span><b>{formatMoney(window.GAME_CONFIG.startingCash)}</b>&nbsp;STARTING&nbsp;CASH</span>
          <span style={{ marginLeft: 'auto' }}>2016&nbsp;→&nbsp;MAR&nbsp;2026&nbsp;·&nbsp;10&nbsp;YEARS</span>
        </div>

        <div className="sr-checker" aria-hidden="true" />
      </div>

      {/* "Player joined!" celebratory pop-up */}
      {arrival && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 3000,
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 22px 14px 16px',
          background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
          color: '#fff',
          borderRadius: 16,
          boxShadow: '0 16px 40px rgba(22,163,74,0.35), 0 6px 14px rgba(0,0,0,0.12)',
          animation: 'pj-pop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
          maxWidth: 'min(90vw, 460px)',
        }}>
          <Avatar
            name={arrival.player.name}
            color={arrival.player.color}
            avatar={arrival.player.avatar}
            size={48}
          />
          <div>
            <div style={{
              fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
              fontFamily: 'Geist Mono, ui-monospace', opacity: 0.85, fontWeight: 700,
            }}>
              🎉 NEW PLAYER
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>
              {arrival.player.name} joined!
            </div>
          </div>
          <style>{`
            @keyframes pj-pop {
              0%   { opacity: 0; transform: translateX(-50%) translateY(-24px) scale(0.85); }
              60%  { opacity: 1; transform: translateX(-50%) translateY(2px)   scale(1.04); }
              100% { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1); }
            }
          `}</style>
        </div>
      )}

      {briefingOpen && (
        <PreGameBriefing
          onCancel={() => setBriefingOpen(false)}
          onStart={() => { setBriefingOpen(false); window.StockRush.startGame(); }}
        />
      )}
    </div>
  );
}

// ── Pre-round-1 briefing modal ────────────────────────────────────────────────
// Teacher-facing 5-slide walkthrough shown right before the game starts.
// Slides paginate with Next/Back; last slide "Let's play →" triggers the
// engine's startGame(). Designed so the teacher can narrate the game to the
// class in ~30 seconds before dropping into R1.
function PreGameBriefing({ onCancel, onStart }) {
  const [i, setI] = React.useState(0);
  const slides = [
    {
      emoji: '📱',
      title: 'One race. Two screens.',
      body: (
        <>
          You're on the pit-wall projector — everyone sees the leaderboard, live
          prices, and breaking news. Students race on their phones. Their trades
          and reactions flow back to the timing tower live.
        </>
      ),
    },
    {
      emoji: '💸',
      title: 'How to buy.',
      body: (
        <>
          Students tap any stock on their <b>Trade</b> tab, punch in a quantity
          with the +/− buttons or a preset (25% / 50% / MAX), and hit
          <b> Confirm Buy</b>. Cost gets deducted from their cash the moment
          it's confirmed.
        </>
      ),
    },
    {
      emoji: '💵',
      title: 'How to sell.',
      body: (
        <>
          Every stock they own shows a <b>SELL</b> button next to Buy. Same
          quantity picker, same instant confirmation. Selling banks cash but
          also locks in whatever gain or loss they've booked so far.
        </>
      ),
    },
    {
      emoji: '📈',
      title: 'Real Indian markets, 2016 → 2026.',
      body: (
        <>
          Eight real Indian stocks. Five laps spanning ten years. Every lap's
          price move is drawn from what actually happened — demonetisation,
          Jio, Yes Bank, COVID, the 2024–26 rally. Students are trading real
          history.
        </>
      ),
    },
    {
      emoji: '🏆',
      title: 'Podium drama.',
      body: (
        <>
          The leaderboard reshuffles live as prices move. P2 slides up to P1
          when someone catches a wave. Last driver standing with the biggest
          bank wins the Grand Prix — and the reveal at the end is the loudest
          moment of the class.
        </>
      ),
    },
  ];
  const last = i === slides.length - 1;
  const slide = slides[i];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(10, 12, 15, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="sr-racing" style={{
        borderRadius: 14,
        maxWidth: 680, width: '100%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 4px rgba(220,0,0,0.06)',
        overflow: 'hidden',
      }}>
        <div className="sr-checker" aria-hidden="true" />

        {/* Header — pit briefing eyebrow */}
        <div className="sr-race-topstrip">
          <div style={{ flex: 1 }}>
            <div className="sr-race-tag">PIT BRIEFING · SLIDE {i + 1} / {slides.length}</div>
            <div className="sr-race-title">Before lights out</div>
          </div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.5)',
            padding: '6px 12px',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
          }}>
            {i + 1} / {slides.length}
          </div>
        </div>

        {/* Slide body — dark carbon panel */}
        <div style={{ padding: '32px 36px 8px', minHeight: 240, color: '#fff' }}>
          <div style={{ fontSize: 60, lineHeight: 1, marginBottom: 14 }}>{slide.emoji}</div>
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
            color: '#fff', marginBottom: 12,
          }}>
            {slide.title}
          </div>
          <div style={{
            fontSize: 16, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)',
            maxWidth: 560,
          }}>
            {slide.body}
          </div>
        </div>

        {/* Progress dots — red racing lights */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10,
          padding: '20px 0 8px',
        }}>
          {slides.map((_, k) => (
            <span key={k} style={{
              width: k === i ? 28 : 10, height: 10, borderRadius: 5,
              background: k === i ? 'var(--racing-red)' : 'rgba(255,255,255,0.15)',
              boxShadow: k === i ? '0 0 8px rgba(220,0,0,0.7)' : 'none',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        {/* Footer with Back / Next or Lights out */}
        <div style={{
          padding: '18px 24px 22px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0a0c0f',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700,
              padding: '8px 12px', cursor: 'pointer',
              fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            Skip briefing
          </button>
          <div style={{ flex: 1 }} />
          {i > 0 && (
            <button
              type="button"
              onClick={() => setI(i - 1)}
              style={{
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                padding: '11px 18px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Geist Mono, ui-monospace',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              ← Back
            </button>
          )}
          {!last && (
            <button
              type="button"
              onClick={() => setI(i + 1)}
              style={{
                background: '#fff', color: '#000',
                border: '2px solid #000', borderRadius: 8,
                padding: '11px 22px', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'Geist Mono, ui-monospace',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                boxShadow: '0 3px 0 #000',
              }}
            >
              Next →
            </button>
          )}
          {last && (
            <button
              type="button"
              className="sr-lights-btn"
              onClick={onStart}
              style={{ padding: '13px 24px' }}
            >
              🏁 Lights out & away we go →
            </button>
          )}
        </div>
        <div className="sr-checker" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Round transition popup ────────────────────────────────────────────────────
// Shown to the teacher at the START of rounds 2–5, before news popup appears.
// Explains what happened to each stock's price and why.

function RoundTransitionPopup({ round, year, news, stocks, onDismiss, closing }) {
  // Filter notes to only stocks that are actually in play this session
  // (we have 20 in the data pool but each game uses a random 8)
  const activeIds = new Set((stocks || []).map(s => s.id));
  const entries = Object.entries(news.notes || {}).filter(([id]) => activeIds.has(id));
  const handleDismiss = onDismiss;

  // Defer the "closing" style application by one animation frame so the
  // browser paints opacity: 1 first, then transitions to opacity: 0. Applying
  // both in the same commit gives the browser no start value → no fade.
  const [visualClosing, setVisualClosing] = React.useState(false);
  React.useEffect(() => {
    if (!closing) { setVisualClosing(false); return; }
    const raf = requestAnimationFrame(() => setVisualClosing(true));
    return () => cancelAnimationFrame(raf);
  }, [closing]);

  return (
    <div
      className={'event-phase-backdrop' + (closing ? ' rtp-closing' : '')}
      style={{
        zIndex: 2500,
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        // Fade-out on close via visualClosing (deferred by 1 rAF so the
        // browser paints opacity: 1 first, then transitions to 0).
        opacity: visualClosing ? 0 : 1,
        transition: 'opacity 0.28s ease-in-out',
        animation: visualClosing ? 'none' : 'rtp-fade 0.35s ease-out',
        pointerEvents: closing ? 'none' : 'auto',
      }}
    >
      <div
        className="event-phase-card"
        style={{
          maxWidth: 1520, width: '96vw',
          maxHeight: '94vh', minHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          padding: '30px 44px 0',
          background: 'linear-gradient(180deg, #15161a 0%, #0c0d10 100%)',
          borderRadius: 18,
          border: '2px solid rgba(217,119,87,0.55)',
          animation: closing
            ? 'rtp-drop 0.28s ease-in forwards'
            : 'rtp-rise 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.05), rtp-glow 3.2s ease-in-out infinite',
          overflow: 'hidden',
        }}
      >

        {/* Round label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <span style={{
            background: '#d97757', color: '#fff',
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 17, fontWeight: 800,
            letterSpacing: '0.18em', padding: '7px 16px', borderRadius: 6,
            boxShadow: '0 0 22px rgba(217,119,87,0.55)',
          }}>
            ◉ BREAKING · ROUND {round} · {year}
          </span>
        </div>

        {/* Headline + subhead — cinematic (bumped 35%+) */}
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginBottom: 14, color: '#fff', letterSpacing: '-0.02em' }}>
          {news.headline}
        </div>
        <div style={{
          fontSize: 20, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5,
          marginBottom: 22, paddingBottom: 18,
          borderBottom: '1px solid rgba(255,255,255,0.14)',
        }}>
          {news.subhead}
        </div>

        {/* Stock grid — bigger cards, larger text */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 14, marginBottom: 20,
          paddingRight: 6,
        }}>
          {entries.map(([ticker, note]) => {
            const stock  = (stocks || []).find(s => s.id === ticker);
            const up     = note.dir === 'up';
            const pct    = note.pct;
            const pctStr = pct >= 100 ? Math.round(pct) + '%' : pct.toFixed(1) + '%';
            return (
              <div key={ticker} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderLeft: `5px solid ${up ? '#1f7a4d' : '#c24a3a'}`,
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{stock?.emoji || '•'}</span>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                    fontSize: 20, color: '#fff', letterSpacing: '0.04em',
                  }}>
                    {ticker}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{
                    color: up ? '#4ade80' : '#f87171',
                    fontFamily: 'Geist Mono, ui-monospace',
                    fontWeight: 800, fontSize: 22,
                  }}>
                    {up ? '▲' : '▼'} {pctStr}
                  </span>
                </div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
                  {note.why}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue bar — sticky bottom, full-bleed, big projector-friendly */}
        <button
          className="rtp-continue-bar"
          onClick={handleDismiss}
          aria-label={`Continue to round ${round}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            width: 'calc(100% + 88px)',
            marginLeft: -44, marginRight: -44,
            marginTop: 'auto',
            padding: '24px 32px',
            fontSize: 26, fontWeight: 800, letterSpacing: '0.02em',
            color: '#fff',
            background: 'linear-gradient(90deg, #b04a1e 0%, #d97757 45%, #d97757 55%, #b04a1e 100%)',
            border: 'none',
            borderTop: '2px solid rgba(255,255,255,0.15)',
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            cursor: 'pointer',
            boxShadow: '0 -8px 32px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            flexShrink: 0,
            transition: 'filter 0.15s, transform 0.08s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(1px)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: 22, opacity: 0.9 }}>🏁</span>
          Continue — Start Round {round} →
        </button>
      </div>
    </div>
  );
}

function NewsPopup({ news, stocks, onDismiss }) {
  const scriptEntry = (window.NEWS_SCRIPT || []).find(n => n.round === news.round);
  const notes = scriptEntry?.stockNotes || {};
  // Filter to ONLY the 8 stocks in play this session — news.impacts covers
  // all 20 in the pool. Without the filter the popup was showing every
  // ticker whether it was in the game or not.
  const activeIds = new Set((stocks || []).map(s => s.id));

  const affected = Object.entries(news.impacts)
    .filter(([ticker]) => activeIds.has(ticker))
    .map(([ticker, mult]) => {
      const stock = stocks.find(s => s.id === ticker);
      const note  = notes[ticker];
      const movePct = ((mult - 1) * 100);
      return { ticker, stock, mult, movePct, note };
    }).sort((a, b) => b.movePct - a.movePct);

  return (
    <div className="event-phase-backdrop" style={{
      zIndex: 300,
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      animation: 'rtp-fade 0.35s ease-out',
    }} onClick={onDismiss}>
      <div className="event-phase-card" style={{
        maxWidth: 1520, width: '96vw', maxHeight: '94vh', minHeight: '80vh',
        padding: '30px 44px 0',
        background: 'linear-gradient(180deg, #15161a 0%, #0c0d10 100%)',
        borderRadius: 18,
        border: '2px solid rgba(217,119,87,0.55)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <span style={{
            background: '#d97757', color: '#fff',
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 17, fontWeight: 800,
            letterSpacing: '0.18em', padding: '7px 16px', borderRadius: 6,
            boxShadow: '0 0 22px rgba(217,119,87,0.55)',
          }}>
            ◉ ROUND {news.round} · BREAKING NEWS
          </span>
        </div>

        <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 14, letterSpacing: '-0.02em' }}>
          {news.headline}
        </div>

        <div style={{
          fontSize: 20, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5,
          marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.14)',
        }}>
          {news.body}
        </div>

        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 800,
          letterSpacing: '0.16em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
          marginBottom: 12,
        }}>How it moved the market</div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: 14, marginBottom: 20,
        }}>
          {affected.map(({ ticker, stock, movePct, note }) => {
            const up = movePct >= 0;
            return (
              <div key={ticker} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderLeft: `5px solid ${up ? '#1f7a4d' : '#c24a3a'}`,
                borderRadius: 10, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{stock?.emoji || '📈'}</span>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                    fontSize: 20, color: '#fff', letterSpacing: '0.04em',
                  }}>{ticker}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{stock?.name}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{
                    color: up ? '#4ade80' : '#f87171',
                    fontFamily: 'Geist Mono, ui-monospace', fontWeight: 800, fontSize: 22,
                  }}>{up ? '▲' : '▼'} {Math.abs(movePct).toFixed(0)}%</span>
                </div>
                {note?.why && <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{note.why}</div>}
              </div>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            width: 'calc(100% + 88px)', marginLeft: -44, marginRight: -44, marginTop: 'auto',
            padding: '24px 32px',
            fontSize: 26, fontWeight: 800, letterSpacing: '0.02em',
            color: '#fff',
            background: 'linear-gradient(90deg, #b04a1e 0%, #d97757 45%, #d97757 55%, #b04a1e 100%)',
            border: 'none',
            borderTop: '2px solid rgba(255,255,255,0.15)',
            borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
            cursor: 'pointer',
            boxShadow: '0 -8px 32px rgba(217,119,87,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 22, opacity: 0.9 }}>🏁</span>
          Students are now trading at new prices →
        </button>
      </div>
    </div>
  );
}

function EndedOverlay({ ranked }) {
  const start = window.GAME_CONFIG.startingCash;
  const stocks = window.StockRush.getState().stocks || [];
  const stockById = Object.fromEntries(stocks.map(s => [s.id, s]));
  const [confirmPlay, setConfirmPlay] = React.useState(false);
  // B8.3 — default Keep, but only meaningful if the engine supports it AND there are humans
  const [keepPlayers, setKeepPlayers] = React.useState(true);

  const humans = ranked.filter(p => !p.isBot);
  const bots   = ranked.filter(p =>  p.isBot);
  const humansRanked = [...humans].sort((a,b) => b.worth - a.worth);

  const pct = w => ((w - start) / start) * 100;

  // ── Per-player behavioural analysis ────────────────────────────────────
  function analysePlayer(p) {
    const holdings = Object.entries(p.holdings || {}).filter(([,q]) => q > 0);
    const positions = holdings.map(([tk, qty]) => {
      const s = stockById[tk];
      const price = s?.price || 0;
      const value = qty * price;
      const cost  = (p.holdingsCost?.[tk] || price);
      const change = cost > 0 ? ((price - cost) / cost) * 100 : 0;
      return { tk, qty, price, value, cost, change, emoji: s?.emoji };
    });
    const invested = positions.reduce((s, x) => s + x.value, 0);
    const totalCostBasis = positions.reduce((s, x) => s + x.cost * x.qty, 0);

    // Best/worst pick by % gain vs cost basis
    const winners = positions.filter(x => x.change > 0);
    const losers  = positions.filter(x => x.change < 0);
    const bestPick  = positions.length ? positions.reduce((a,b) => b.change > a.change ? b : a) : null;
    const worstPick = positions.length ? positions.reduce((a,b) => b.change < a.change ? b : a) : null;
    const hitRate   = positions.length ? winners.length / positions.length : 0;

    // Style classification
    const cashPct = p.cash / Math.max(p.worth, 1);
    const distinct = positions.length;
    const topPos = positions.length ? Math.max(...positions.map(x => x.value)) : 0;
    const concentration = invested > 0 ? topPos / invested : 0;

    let style, styleColor;
    if (cashPct > 0.6)              { style = '💰 Mostly cash';        styleColor = '#64748b'; }
    else if (distinct === 1)        { style = '🎯 One big bet';        styleColor = '#dc2626'; }
    else if (concentration > 0.6)   { style = '⚡ Heavy in one stock'; styleColor = '#d97706'; }
    else if (distinct >= 4)         { style = '🌐 Spread out';         styleColor = '#0891b2'; }
    else                             { style = '⚖️ Balanced';           styleColor = '#16a34a'; }

    // ── Round journey: find biggest jump and biggest drop between rounds ──
    const wh = p.worthHistory || [];
    let bestRound = null, worstRound = null;
    for (let i = 1; i < wh.length; i++) {
      const delta = wh[i] - wh[i - 1];
      if (bestRound  === null || delta > bestRound.delta)  bestRound  = { round: i, delta };
      if (worstRound === null || delta < worstRound.delta) worstRound = { round: i, delta };
    }
    const totalDelta = wh.length ? wh[wh.length - 1] - wh[0] : 0;

    // ── Two-line lesson with specifics ───────────────────────────────────
    const playerReturn = ((p.worth - start) / start) * 100;
    let lessonLine1, lessonLine2;

    if (cashPct > 0.6) {
      lessonLine1 = `Sat on ${(cashPct * 100).toFixed(0)}% cash — playing safe cost them.`;
      lessonLine2 = bestPick
        ? `The market moved without ${p.name}. Even ${bestPick.tk} would have helped.`
        : `When the market moves, cash sitting still feels like falling behind.`;
    } else if (bestPick && bestPick.change > 50) {
      lessonLine1 = `Bet big on ${bestPick.emoji} ${bestPick.tk} — and it paid off ${bestPick.change.toFixed(0)}%!`;
      lessonLine2 = worstPick && worstPick.change < -10
        ? `But ${worstPick.tk} (${worstPick.change.toFixed(0)}%) pulled them back. ${distinct >= 3 ? 'Spreading out saved them.' : 'A wider mix might have helped.'}`
        : `Big bets win when you pick the right stock. Their risk paid off.`;
    } else if (playerReturn < 0) {
      lessonLine1 = worstPick
        ? `${worstPick.emoji} ${worstPick.tk} (${worstPick.change.toFixed(0)}%) was the painful one.`
        : `Tough market — lost ${Math.abs(playerReturn).toFixed(0)}% overall.`;
      lessonLine2 = winners.length > 0
        ? `Had some wins (${winners.length} of ${positions.length} picks), but the losses were bigger.`
        : `Every pick lost money — worth thinking about which stocks to pick next time.`;
    } else if (distinct >= 4) {
      lessonLine1 = `Spread money across ${distinct} stocks — playing it safe with variety.`;
      lessonLine2 = `Caught some winners (${winners.length}/${positions.length}). Smaller gains, but less risk too.`;
    } else {
      lessonLine1 = `Mixed approach — ${distinct} stocks, ${(cashPct * 100).toFixed(0)}% kept in cash.`;
      lessonLine2 = winners.length === positions.length && positions.length > 0
        ? `Every pick a winner. Good stock-picking.`
        : `Balanced between taking risk and staying safe. A textbook game.`;
    }

    // Missed opportunity — biggest gainer among stocks in this game that the
    // student did NOT hold at end. Powerful teaching moment.
    const heldSet = new Set(Object.keys(p.holdings || {}).filter(tk => (p.holdings[tk] || 0) > 0));
    let missedTop = null;
    for (const s of stocks) {
      if (heldSet.has(s.id)) continue;
      const startPr = (s.history && s.history[0]) || s.price;
      const endPr = s.price;
      const pctGain = startPr > 0 ? ((endPr - startPr) / startPr) * 100 : 0;
      if (!missedTop || pctGain > missedTop.pct) missedTop = { stock: s, pct: pctGain };
    }
    if (missedTop && missedTop.pct <= 0) missedTop = null; // only surface real winners

    return {
      positions, invested, cashPct, distinct, concentration, bestPick, worstPick, hitRate,
      style, styleColor, lessonLine1, lessonLine2,
      winners: winners.length, losers: losers.length,
      bestRound, worstRound, totalDelta, missedTop,
    };
  }

  const playerAnalysis = humansRanked.map(p => ({ player: p, ...analysePlayer(p) }));

  // ── Class-wide headline stats ──────────────────────────────────────────
  const avgReturn = humans.length
    ? humans.reduce((s,p) => s + pct(p.worth), 0) / humans.length
    : 0;
  const bestBot   = bots.length ? Math.max(...bots.map(b => b.worth)) : 0;
  const beatBots  = humans.filter(h => h.worth > bestBot).length;
  const topReturn = humans.length ? Math.max(...humans.map(h => pct(h.worth))) : 0;

  // Most popular stock among students
  const stockHolders = {};
  for (const p of humans) {
    for (const [tk, q] of Object.entries(p.holdings || {})) {
      if (q > 0) stockHolders[tk] = (stockHolders[tk] || 0) + 1;
    }
  }
  const popularStock = Object.entries(stockHolders).sort((a,b) => b[1] - a[1])[0];

  // Counterfactual — "if you'd just bought the best stock at the start and slept"
  const bestStockCF = (() => {
    let best = null;
    for (const s of stocks) {
      const startPrice = (s.history && s.history[0]) || s.price;
      if (!startPrice) continue;
      const mult = s.price / startPrice;
      const shares = Math.floor(start / startPrice);
      const finalWorth = shares * s.price + (start - shares * startPrice);
      if (!best || finalWorth > best.finalWorth) {
        best = { stock: s, mult, finalWorth, shares };
      }
    }
    return best;
  })();
  const cfBeatHowMany = bestStockCF
    ? humans.filter(h => bestStockCF.finalWorth > h.worth).length
    : 0;

  return (
    <div className="overlay sr-ended-overlay" style={{ alignItems: 'flex-start', paddingTop: 0, padding: 0, background: 'rgba(0,0,0,0.95)' }}>
      <div className="overlay-card wide sr-racing sr-ended-card" style={{ maxWidth: 1520, width: '96vw', maxHeight: '96vh', overflowY: 'auto', padding: 0 }}>
        <div className="sr-checker" aria-hidden="true" />
        <div style={{ padding: '24px 36px' }}>

        {/* Header strip — compact */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
              Game over · {humans.length} student{humans.length !== 1 ? 's' : ''} · {window.GAME_CONFIG.rounds} rounds
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Final results
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 6,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              fontFamily: 'Geist Mono, ui-monospace',
              padding: '4px 10px',
              background: 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(252,211,77,0.18))',
              border: '1px solid rgba(217,119,6,0.32)',
              borderRadius: 6,
              color: '#92400e',
            }}>
              📅 MAR 2026 REVEAL · prices shifted one final time
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <HeadlineStat label="Top return"     value={`${topReturn >= 0 ? '+' : ''}${topReturn.toFixed(1)}%`} tone={topReturn >= 0 ? 'up' : 'down'} />
            <HeadlineStat label="Class average"  value={`${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(1)}%`} tone={avgReturn >= 0 ? 'up' : 'down'} />
            <HeadlineStat label="Beat the bots"  value={`${beatBots}/${humans.length}`} tone={beatBots > 0 ? 'up' : 'neutral'} />
            {popularStock && (
              <HeadlineStat label="Most owned" value={`${stockById[popularStock[0]]?.emoji || ''} ${popularStock[0]}`} tone="neutral" hint={`${popularStock[1]} held it`} />
            )}
          </div>
        </div>

        {/* The "buy and sleep" counterfactual */}
        {bestStockCF && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14,
            marginBottom: 14,
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(252,211,77,0.06) 100%)',
            border: '1.5px solid rgba(245,158,11,0.35)',
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>💤</div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#92400e', fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>
                What if you'd bought {bestStockCF.stock.emoji} {bestStockCF.stock.id} in 2016 and just slept?
              </div>
              <div style={{ fontSize: 14, color: '#1e293b', marginTop: 4, lineHeight: 1.45 }}>
                Buying <b>{bestStockCF.shares} shares of {bestStockCF.stock.name}</b> at the start would now be worth <b>{formatMoney(bestStockCF.finalWorth)}</b> — a <b>{bestStockCF.mult.toFixed(1)}× return</b>. Beats <b>{cfBeatHowMany} of {humans.length}</b> students.
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic', marginTop: 6, lineHeight: 1.4 }}>
                *Assumes 100% in one stock from start. Real investing diversifies.
              </div>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: '#92400e',
              fontFamily: 'Geist Mono, ui-monospace',
              padding: '8px 14px',
              background: '#fef3c7',
              border: '2px solid #d97706',
              borderRadius: 10,
            }}>
              ×{bestStockCF.mult.toFixed(1)}
            </div>
          </div>
        )}

        {/* Story ribbon — what happened each round */}
        <GameStoryStrip stockById={stockById} />

        {/* Full-width stock movers table — the "what actually moved" answer */}
        <StockMoversTable stocks={stocks} humans={humans} startingCash={start} />

        {/* Multi-player race chart — only meaningful with 2+ humans */}
        <ClassRaceChart humans={humans} startingCash={start} />

        {/* Big podium for the top 3 humans — hero celebration moment */}
        {humansRanked.length > 0 && (
          <PodiumTop3 players={humansRanked.slice(0, 3)} startCash={start} pct={pct} />
        )}

        {/* TWO-COLUMN: leaderboard left, per-student breakdown right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>

          {/* LEFT — leaderboard */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, fontFamily: 'Geist Mono, ui-monospace' }}>
              Leaderboard
            </div>
            {humansRanked.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>No students played this round.</div>
            )}
            {humansRanked.length > 0 && humansRanked.length <= 3 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0', fontFamily: 'Geist Mono, ui-monospace' }}>
                All ranks shown on the podium above.
              </div>
            )}
            {humansRanked.slice(3).map((p, offset) => {
              const i = offset + 3;
              const change = pct(p.worth);
              const up = change >= 0;
              const podiumLabel = ['P1','P2','P3'][i];
              const medal = podiumLabel
                ? <span className={'sr-podium p' + (i + 1)}>{podiumLabel}</span>
                : (i + 1);
              const podiumBg = i === 0 ? 'linear-gradient(90deg, rgba(245,209,66,0.28), rgba(255,251,232,0.4) 60%, transparent)' :
                               i === 1 ? 'linear-gradient(90deg, rgba(192,196,204,0.32), rgba(242,243,246,0.45) 60%, transparent)' :
                               i === 2 ? 'linear-gradient(90deg, rgba(232,169,110,0.28), rgba(253,240,224,0.45) 60%, transparent)' :
                               'transparent';
              const podiumColor = i === 0 ? '#f5a142' :
                                  i === 1 ? '#a3a3a3' :
                                  i === 2 ? '#b97b4a' :
                                  'transparent';
              return (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 30px 1fr auto auto',
                  alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                  background: podiumBg,
                  borderRadius: i < 3 ? 6 : 0,
                  margin: i < 3 ? '0 -8px 2px' : 0,
                  paddingLeft: i < 3 ? 14 : 0,
                  paddingRight: i < 3 ? 8 : 0,
                  borderLeft: i < 3 ? `4px solid ${podiumColor}` : 'none',
                  position: 'relative',
                }}>
                  <div style={{ fontSize: i < 3 ? 18 : 13, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, textAlign: 'center', color: i < 3 ? '#0f172a' : '#94a3b8' }}>
                    {medal}
                  </div>
                  <Avatar name={p.name} color={p.color} avatar={p.avatar} size={28} />
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 14 }}>
                    {formatMoney(p.worth)}
                  </div>
                  <div style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                    color: up ? '#15803d' : '#b91c1c',
                    background: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                    padding: '3px 7px', borderRadius: 4,
                    minWidth: 64, textAlign: 'right',
                  }}>
                    {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — per-student educational breakdown */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, fontFamily: 'Geist Mono, ui-monospace' }}>
              How each student played
            </div>

            {playerAnalysis.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Nothing to analyse — bots only.</div>
            )}

            {playerAnalysis.map(({ player, positions, invested, cashPct, distinct, concentration, bestPick, worstPick, hitRate, style, styleColor, lessonLine1, lessonLine2, winners, losers, bestRound, worstRound, missedTop }, i) => (
              <div key={player.id} style={{
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              }}>
                {/* Name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Avatar name={player.name} color={player.color} avatar={player.avatar} size={26} />
                  <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{player.name}</div>
                  <div style={{
                    padding: '3px 9px', borderRadius: 12,
                    fontSize: 11, fontWeight: 700,
                    background: styleColor + '18', color: styleColor,
                    border: '1px solid ' + styleColor + '40',
                  }}>
                    {style}
                  </div>
                </div>

                {/* Big worth chart — replaces the tiny sparkline */}
                {player.worthHistory && player.worthHistory.length > 1 && (
                  <div style={{
                    background: 'var(--bg)', border: '1px solid var(--line)',
                    borderRadius: 8, padding: '6px 10px', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
                        Worth over rounds
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
                        {formatMoney(player.worthHistory[0])} → {formatMoney(player.worth)}
                      </div>
                    </div>
                    <WorthChart data={player.worthHistory} startValue={start} width={340} height={72} />
                  </div>
                )}

                {/* Donut + key stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <PortfolioDonut positions={positions} cash={player.cash} totalWorth={player.worth} stockById={stockById} />

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
                    <MiniStat label="Stocks" value={distinct} />
                    <MiniStat label="Cash" value={`${(cashPct * 100).toFixed(0)}%`} />
                    <MiniStat label="Hit rate"
                      value={positions.length ? `${winners}/${positions.length}` : '—'}
                      tone={hitRate >= 0.5 ? 'up' : hitRate > 0 ? 'neutral' : 'down'} />
                    <MiniStat label="Top pos." value={`${(concentration * 100).toFixed(0)}%`} />
                  </div>
                </div>

                {/* Best round / worst round / best pick / worst pick — quick chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                  {bestRound && bestRound.delta > 0 && (
                    <RoundChip label="Best round" round={bestRound} tone="up" />
                  )}
                  {worstRound && worstRound.delta < 0 && (
                    <RoundChip label="Worst round" round={worstRound} tone="down" />
                  )}
                  {positions.length > 0 && bestPick && (
                    <PickPill label="Best pick" pick={bestPick} tone="up" />
                  )}
                  {positions.length > 0 && worstPick && losers > 0 && (
                    <PickPill label="Worst pick" pick={worstPick} tone="down" />
                  )}
                  {positions.length > 0 && losers === 0 && (
                    <div style={{ fontSize: 11, color: '#15803d', padding: '6px 10px', background: 'rgba(22,163,74,0.06)', borderRadius: 6, border: '1px dashed rgba(22,163,74,0.25)', textAlign: 'center' }}>
                      🎉 No losing picks
                    </div>
                  )}
                </div>

                {/* Missed opportunity chip — the biggest game-winner they didn't own */}
                {missedTop && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', marginBottom: 8,
                    background: 'linear-gradient(90deg, rgba(217,119,6,0.10), rgba(252,211,77,0.06))',
                    border: '1px dashed rgba(217,119,6,0.35)',
                    borderRadius: 6, fontSize: 12,
                  }}>
                    <span style={{ fontSize: 16 }}>👀</span>
                    <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400e', fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700 }}>Missed</span>
                    <span style={{ color: '#1e293b' }}>
                      Didn't hold <b>{missedTop.stock.emoji} {missedTop.stock.id}</b> — it went <b style={{ color: '#15803d' }}>+{missedTop.pct.toFixed(0)}%</b>.
                    </span>
                  </div>
                )}

                {/* Two-line lesson takeaway */}
                <div style={{
                  fontSize: 12.5, color: '#1e293b',
                  padding: '8px 12px',
                  background: 'rgba(15,23,42,0.03)',
                  borderRadius: 6,
                  borderLeft: '3px solid ' + styleColor,
                  lineHeight: 1.5,
                }}>
                  <div style={{ fontWeight: 600 }}>{lessonLine1}</div>
                  <div style={{ color: '#475569', fontStyle: 'italic', marginTop: 2 }}>{lessonLine2}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 14,
          display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap',
        }}>
          <button
            className="big-btn"
            style={{ flex: '1 1 260px' }}
            onClick={() => setConfirmPlay(true)}
            aria-label={humans.length === 0 ? 'Play again' : (keepPlayers ? 'Play again, keep current players' : 'Play again with a fresh roster')}
          >
            ↻  Play again{humans.length > 0 ? (keepPlayers ? ' (keep players)' : ' (fresh game)') : ''}
          </button>
          {humans.length > 0 && (
            <div
              role="group"
              aria-label="Player roster mode"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: 3, gap: 3,
                background: 'rgba(15,23,42,0.06)',
                border: '1px solid var(--line)',
                borderRadius: 10,
              }}
            >
              <button
                onClick={() => setKeepPlayers(true)}
                aria-pressed={keepPlayers}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 700,
                  background: keepPlayers ? 'var(--ink)' : 'transparent',
                  color: keepPlayers ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.04em',
                }}
              >Keep players</button>
              <button
                onClick={() => setKeepPlayers(false)}
                aria-pressed={!keepPlayers}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 700,
                  background: !keepPlayers ? 'var(--ink)' : 'transparent',
                  color: !keepPlayers ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.04em',
                }}
              >Fresh game</button>
            </div>
          )}
        </div>
        {keepPlayers && humans.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            Players keep their seat & avatar. Cash + holdings reset to start.
          </div>
        )}
        </div>
        <div className="sr-checker" aria-hidden="true" />
      </div>
      {confirmPlay && (
        <ResetConfirmModal
          phase="ended"
          studentCount={humans.length}
          onCancel={() => setConfirmPlay(false)}
          onConfirm={() => {
            setConfirmPlay(false);
            if (keepPlayers && humans.length > 0 && typeof window.StockRush.replayWithSamePlayers === 'function') {
              window.StockRush.replayWithSamePlayers();
            } else {
              window.StockRush.reset();
            }
          }}
        />
      )}
    </div>
  );
}

// Podium top-3 hero visualization for the ended overlay.
// Big pill-shaped cards, winner in the middle at max height + gold gradient,
// runner-up and 3rd on either side. Trophies at the bottom, name + return %
// + worth. Inspired by the Predictr.ca-style leaderboard the user shared.
function PodiumTop3({ players, startCash, pct }) {
  const p1 = players[0];
  const p2 = players[1];
  const p3 = players[2];
  // Display order left→right: silver, gold, bronze. Center is the winner.
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 20,
      padding: '18px 0 28px',
      marginBottom: 12,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {p2 && <PodiumPill place={2} player={p2} startCash={startCash} pct={pct} />}
      {p1 && <PodiumPill place={1} player={p1} startCash={startCash} pct={pct} />}
      {p3 && <PodiumPill place={3} player={p3} startCash={startCash} pct={pct} />}
    </div>
  );
}
function PodiumPill({ place, player, startCash, pct }) {
  const gradients = {
    1: 'linear-gradient(180deg, #fff5b7 0%, #ffd54a 30%, #d97706 100%)',
    2: 'linear-gradient(180deg, #f4f4fa 0%, #d4d4dc 35%, #8a8a94 100%)',
    3: 'linear-gradient(180deg, #ffddb0 0%, #d99760 35%, #8b4513 100%)',
  };
  const glow = {
    1: '0 0 60px rgba(255,215,0,0.55), 0 12px 40px rgba(0,0,0,0.4)',
    2: '0 0 40px rgba(220,220,240,0.30), 0 10px 30px rgba(0,0,0,0.35)',
    3: '0 0 40px rgba(217,151,96,0.30), 0 10px 30px rgba(0,0,0,0.35)',
  };
  const trophies = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const change = pct ? pct(player.worth) : 0;
  const up = change >= 0;
  const size = place === 1 ? { w: 260, h: 420, avatar: 120, name: 30 } : { w: 220, h: 360, avatar: 96, name: 24 };
  return (
    <div style={{
      width: size.w, height: size.h,
      borderRadius: 130,
      background: gradients[place],
      boxShadow: glow[place],
      border: '2.5px solid rgba(0,0,0,0.45)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: place === 1 ? '32px 16px 24px' : '26px 16px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Avatar name={player.name} color={player.color} avatar={player.avatar} size={size.avatar} />
      <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          color: '#0a0a0a',
          fontFamily: 'Geist, sans-serif',
          fontWeight: 800,
          fontSize: size.name,
          letterSpacing: '-0.01em',
          textShadow: '0 1px 0 rgba(255,255,255,0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: size.w - 40,
        }}>{player.name}</div>
        <div style={{
          color: up ? '#166534' : '#7f1d1d',
          fontFamily: 'Geist Mono, ui-monospace',
          fontWeight: 800,
          fontSize: place === 1 ? 18 : 15,
          letterSpacing: '-0.01em',
        }}>
          {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.22)',
        borderRadius: 24,
        padding: place === 1 ? '10px 22px' : '8px 18px',
        color: '#fff',
        fontFamily: 'Geist Mono, ui-monospace',
        fontWeight: 800,
        fontSize: place === 1 ? 24 : 20,
        textShadow: '0 1px 0 rgba(0,0,0,0.4)',
        letterSpacing: '-0.01em',
        border: '1px solid rgba(0,0,0,0.35)',
      }}>
        💵 {formatMoney(player.worth)}
      </div>
      <div style={{ fontSize: place === 1 ? 72 : 60, lineHeight: 1, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' }}>
        {trophies[place]}
      </div>
    </div>
  );
}

function HeadlineStat({ label, value, tone, hint }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace' }}>{value}</div>
      {hint && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 8px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace' }}>{value}</div>
    </div>
  );
}

function RoundChip({ label, round, tone }) {
  const up = tone === 'up';
  const fg = up ? '#15803d' : '#b91c1c';
  const bg = up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)';
  return (
    <div style={{ padding: '5px 9px', background: bg, borderRadius: 6, border: `1px solid ${fg}30` }}>
      <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: fg, fontFamily: 'Geist Mono, ui-monospace' }}>
        Round {round.round + 1} · {up ? '+' : ''}{formatMoney(round.delta)}
      </div>
    </div>
  );
}

function PortfolioDonut({ positions, cash, totalWorth, stockById }) {
  // Build slices: each holding + cash
  const slices = [];
  for (const p of positions) {
    if (p.value > 0) {
      const stock = stockById[p.tk];
      const sectorCol = window.SECTOR_COLORS?.[stock?.sector];
      slices.push({ tk: p.tk, value: p.value, color: sectorCol?.border || '#64748b' });
    }
  }
  if (cash > 0) slices.push({ tk: 'CASH', value: cash, color: '#cbd5e1' });

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 32, cy = 32, r = 28, strokeW = 8;

  // Convert each slice to arc length on the circle's circumference
  const C = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices.map(s => {
    const frac = s.value / total;
    const arc = { ...s, dash: frac * C, offset };
    offset += frac * C;
    return arc;
  });

  return (
    <div style={{ position: 'relative', width: 64, height: 64 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={a.color} strokeWidth={strokeW}
            strokeDasharray={`${a.dash.toFixed(2)} ${C.toFixed(2)}`}
            strokeDashoffset={(-a.offset).toFixed(2)}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
        textAlign: 'center', lineHeight: 1,
      }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--muted)' }}>WORTH</div>
          <div style={{ fontSize: 10 }}>{formatMoney(totalWorth)}</div>
        </div>
      </div>
    </div>
  );
}

function PickPill({ label, pick, tone }) {
  if (!pick) return null;
  const up = tone === 'up';
  const bg = up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)';
  const fg = up ? '#15803d' : '#b91c1c';
  return (
    <div style={{ padding: '5px 9px', background: bg, borderRadius: 6, border: `1px solid ${fg}30` }}>
      <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: fg, fontFamily: 'Geist Mono, ui-monospace' }}>
        {pick.emoji} {pick.tk} {up ? '▲' : '▼'} {Math.abs(pick.change).toFixed(1)}%
      </div>
    </div>
  );
}

function InsightStat({ label, value, tone, hint }) {
  const color = tone === 'up' ? '#16a34a' : tone === 'down' ? '#dc2626' : 'var(--ink)';
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

// Bigger, richer replacement for the tiny <Sparkline/> — used inside per-student
// cards. Shows an area-fill worth curve + a dashed start baseline + start/end
// labels + round dots. Much easier to read than the 80x26 sparkline.
function WorthChart(props) {
  // Bulletproof outer guard — the whole body is wrapped in try/catch so any
  // exception (Babel spread quirks, Supabase proxy weirdness, unexpected
  // prop shapes) fails silently to `return null` instead of tearing down
  // the entire ErrorBoundary. Losing a chart is fine; losing the recap isn't.
  try {
    return _WorthChartInner(props);
  } catch (e) {
    try { console.warn('[WorthChart] render failed:', e); } catch(_) {}
    return null;
  }
}
function _WorthChartInner({ data, width = 240, height = 68, startValue }) {
  // Build a plain finite-number array without spread / .filter — Babel's
  // spread helper reads .length on suspect data and array iterators can trip
  // on proxies. Manual for-loop with defensive index access is the safest.
  const arr = [];
  if (data != null) {
    const len = (typeof data.length === 'number' && isFinite(data.length)) ? data.length : 0;
    for (let i = 0; i < len; i++) {
      const v = data[i];
      if (typeof v === 'number' && isFinite(v)) arr.push(v);
    }
  }
  if (arr.length < 2) return null;
  const baseline = typeof startValue === 'number' && isFinite(startValue) ? startValue : arr[0];
  const range = max - min || 1;
  const padX = 6, padT = 8, padB = 14;
  const w = width - padX * 2;
  const h = height - padT - padB;
  const pts = arr.map((v, i) => ({
    x: padX + (i / (arr.length - 1)) * w,
    y: padT + (1 - (v - min) / range) * h,
  }));
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `M ${pts[0].x},${padT + h} L ${pts.map(p => `${p.x},${p.y}`).join(' L ')} L ${pts[pts.length-1].x},${padT + h} Z`;
  const up = arr[arr.length - 1] >= baseline;
  const stroke = up ? '#15803d' : '#b91c1c';
  const fill   = up ? 'rgba(22,163,74,0.14)' : 'rgba(220,38,38,0.14)';
  const baseY  = padT + (1 - (baseline - min) / range) * h;
  const finalPt = pts[pts.length - 1];
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <line x1={padX} x2={width - padX} y1={baseY} y2={baseY} stroke="#cbd5e1" strokeDasharray="3,3" strokeWidth={1} />
      <path d={areaPath} fill={fill} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 2} fill={stroke} stroke="#fff" strokeWidth={i === pts.length - 1 ? 1.5 : 0} />
      ))}
      <text x={padX} y={height - 2} fontSize="9" fill="#94a3b8" fontFamily="Geist Mono, ui-monospace">R1</text>
      <text x={finalPt.x} y={height - 2} fontSize="9" fill="#94a3b8" fontFamily="Geist Mono, ui-monospace" textAnchor="end">R{pts.length}</text>
      <text x={finalPt.x - 2} y={Math.max(finalPt.y - 5, padT + 2)} fontSize="10" fill={stroke} fontFamily="Geist Mono, ui-monospace" fontWeight="700" textAnchor="end">
        ₹{(data[data.length - 1] / 1000).toFixed(0)}k
      </text>
    </svg>
  );
}

// Full-width panel — ranks every played stock by total gain across the game,
// with a per-stock sparkline and how many students held it at end. Answers
// "what actually moved" and "did I even own the winners?".
function StockMoversTable({ stocks, humans, startingCash }) {
  if (!stocks || !stocks.length) return null;
  const rows = stocks.map(s => {
    const start = (s.history && s.history[0]) || s.price;
    const end = s.price;
    const pct = start > 0 ? ((end - start) / start) * 100 : 0;
    const holders = humans.filter(p => (p.holdings?.[s.id] || 0) > 0).length;
    return { s, start, end, pct, holders };
  }).sort((a, b) => b.pct - a.pct);
  const maxAbs = Math.max(...rows.map(r => Math.abs(r.pct)), 1);
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
          Stock movers · 2016 → Mar 2026
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Ranked by total return</div>
      </div>
      <div style={{ display: 'grid', gap: 3 }}>
        {rows.map((r, i) => {
          const up = r.pct >= 0;
          const barW = Math.min(100, (Math.abs(r.pct) / maxAbs) * 100);
          const isTop = i === 0;
          const isBot = i === rows.length - 1 && r.pct < 0;   // only mark as "worst" if it actually lost money
          const isLagger = i === rows.length - 1 && !isBot;   // smallest gainer but still positive
          return (
            <div key={r.s.id} style={{
              display: 'grid',
              gridTemplateColumns: '22px 30px 130px 84px 84px 100px 1fr 78px',
              alignItems: 'center', gap: 10,
              padding: '6px 6px',
              borderRadius: 6,
              background: isTop ? 'rgba(22,163,74,0.06)' : isBot ? 'rgba(220,38,38,0.06)' : 'transparent',
              border: isTop ? '1px solid rgba(22,163,74,0.25)' : isBot ? '1px solid rgba(220,38,38,0.25)' : '1px solid transparent',
            }}>
              <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>
                {isTop ? '🏆' : isBot ? '💥' : isLagger ? '🐌' : i + 1}
              </div>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{r.s.emoji}</div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.s.id}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.s.name}
                </div>
              </div>
              <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                ₹{r.start.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700, textAlign: 'right' }}>
                ₹{r.end.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                color: up ? '#15803d' : '#b91c1c',
                background: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                padding: '4px 8px', borderRadius: 4, textAlign: 'center',
              }}>
                {up ? '▲ +' : '▼ '}{Math.abs(r.pct).toFixed(0)}%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: 24 }}>
                <Sparkline data={r.s.history || [r.start, r.end]} width={220} height={32} stroke={up ? '#15803d' : '#b91c1c'} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right', fontFamily: 'Geist Mono, ui-monospace' }}>
                {r.holders}/{humans.length} held
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span>🏆 = biggest gainer of the game</span>
        <span>🐌 = slowest gainer</span>
        <span>💥 = biggest loser</span>
      </div>
    </div>
  );
}

// Horizontal 4-card strip — one card per round transition, showing the
// headline + biggest gainer and biggest loser IN THIS GAME'S STOCKS.
function GameStoryStrip({ stockById }) {
  const script = window.NEWS_SCRIPT || [];
  const years  = window.ROUND_YEARS || [];
  if (!script.length) return null;
  const cards = script.map((ev, idx) => {
    const notes = ev.stockNotes || {};
    const inPlay = Object.keys(notes).filter(tk => stockById[tk]);
    if (!inPlay.length) return null;
    const sorted = inPlay.map(tk => ({ tk, ...notes[tk], stock: stockById[tk] })).sort((a, b) => b.move - a.move);
    const top = sorted[0];
    const bot = sorted[sorted.length - 1];
    const yr1 = years[idx] || `R${ev.round}`;
    const yr2 = years[idx + 1] || `R${ev.round + 1}`;
    return { ev, top, bot, yr1, yr2, idx };
  }).filter(Boolean);
  if (!cards.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, fontFamily: 'Geist Mono, ui-monospace' }}>
        Story of the game — 10 years in 5 rounds
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, 1fr)`, gap: 8 }}>
        {cards.map(({ ev, top, bot, yr1, yr2, idx }) => (
          <div key={idx} style={{
            border: '1px solid var(--line)', borderRadius: 8, padding: '10px 11px',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.02), transparent)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
              Round {ev.round} · {yr1} → {yr2}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: '#0f172a' }}>
              {ev.headline}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', fontSize: 11, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, marginTop: 'auto' }}>
              {top && (
                <span style={{ padding: '3px 6px', borderRadius: 4, background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
                  {top.stock.emoji} {top.tk} {top.move >= 0 ? '+' : ''}{top.move}%
                </span>
              )}
              {bot && bot.tk !== top?.tk && (
                <span style={{ padding: '3px 6px', borderRadius: 4, background: 'rgba(220,38,38,0.12)', color: '#b91c1c' }}>
                  {bot.stock.emoji} {bot.tk} {bot.move >= 0 ? '+' : ''}{bot.move}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Multi-player race chart — all students' worth curves overlaid so the class
// can see WHO overtook WHOM and WHEN. Skipped when only 1 human is playing.
function ClassRaceChart(props) {
  try { return _ClassRaceChartInner(props); }
  catch (e) { try { console.warn('[ClassRaceChart] render failed:', e); } catch(_){} return null; }
}
function _ClassRaceChartInner({ humans, startingCash }) {
  if (!Array.isArray(humans) || humans.length < 2) return null;
  const cleanWH = p => {
    const wh = p && p.worthHistory;
    const out = [];
    if (wh != null) {
      const len = (typeof wh.length === 'number' && isFinite(wh.length)) ? wh.length : 0;
      for (let i = 0; i < len; i++) {
        const v = wh[i];
        if (typeof v === 'number' && isFinite(v)) out.push(v);
      }
    }
    return out;
  };
  let rounds = 0;
  for (const p of humans) { const n = cleanWH(p).length; if (n > rounds) rounds = n; }
  if (rounds < 2) return null;
  const width = 900, height = 240, padL = 54, padR = 88, padT = 14, padB = 26;
  const all = humans.flatMap(cleanWH);
  if (all.length === 0) return null;
  const base = typeof startingCash === 'number' && isFinite(startingCash) ? startingCash : all[0];
  const min = Math.min.apply(null, all.concat([base]));
  const max = Math.max.apply(null, all.concat([base]));
  const range = max - min || 1;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const x = i => padL + (i / (rounds - 1)) * w;
  const y = v => padT + (1 - (v - min) / range) * h;
  const gridSteps = 4;
  const gridVals = Array.from({ length: gridSteps + 1 }, (_, i) => min + range * (i / gridSteps));
  const sorted = [...humans].sort((a, b) => (b.worthHistory?.[b.worthHistory.length - 1] || 0) - (a.worthHistory?.[a.worthHistory.length - 1] || 0));
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
          The race · Worth per round
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Dashed line = start cash ({formatMoney(startingCash)})</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', minWidth: 640 }}>
          {gridVals.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={i === 0 ? '0' : '3,3'} strokeWidth={i === 0 ? 1 : 0.8} />
              <text x={padL - 8} y={y(v) + 3} fontSize="10" textAnchor="end" fill="#94a3b8" fontFamily="Geist Mono, ui-monospace">
                {v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}k`}
              </text>
            </g>
          ))}
          <line x1={padL} x2={width - padR} y1={y(startingCash)} y2={y(startingCash)} stroke="#94a3b8" strokeDasharray="5,4" strokeWidth={1.2} />
          {Array.from({ length: rounds }).map((_, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={padT} y2={height - padB} stroke="#f1f5f9" strokeWidth={0.8} />
              <text x={x(i)} y={height - 8} fontSize="10" textAnchor="middle" fill="#94a3b8" fontFamily="Geist Mono, ui-monospace">
                {window.ROUND_YEARS?.[i] || `R${i + 1}`}
              </text>
            </g>
          ))}
          {sorted.map(p => {
            const wh = p.worthHistory || [];
            if (wh.length < 2) return null;
            const pts = wh.map((v, i) => `${x(i)},${y(v)}`).join(' ');
            const finalV = wh[wh.length - 1];
            const stroke = p.color || '#64748b';
            return (
              <g key={p.id}>
                <polyline points={pts} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" opacity={0.9} />
                {wh.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={stroke} stroke="#fff" strokeWidth={1} />)}
                <text x={x(wh.length - 1) + 6} y={y(finalV) + 4} fontSize="11" fontWeight="700" fill={stroke} fontFamily="Geist, ui-sans-serif">
                  {p.avatar || ''} {p.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ResetConfirmModal({ phase, studentCount, onCancel, onConfirm }) {
  const playing = phase === 'playing';
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter')  onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(7, 26, 16, 0.62)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'sr-fade-in 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 440, width: '100%',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          overflow: 'hidden',
          animation: 'sr-pop-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        }}
      >
        {/* Brand header strip */}
        <div style={{
          background: 'linear-gradient(135deg, #071a10 0%, #0f3a24 100%)',
          padding: '14px 20px',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 9,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19,
          }}>↺</div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.7, fontFamily: 'Geist Mono, ui-monospace' }}>
              Stock Rush
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>
              Start a new game?
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 20px 6px' }}>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: '#333' }}>
            {playing
              ? <>This will <b>end the current game</b> and reset the leaderboard.{studentCount > 0 ? <> <b>{studentCount} student{studentCount !== 1 ? 's' : ''}</b> will be sent back to the join screen.</> : ''}</>
              : <>A fresh lobby will be created.{studentCount > 0 ? <> Any students already on the join screen will need to <b>re-enter the room code</b>.</> : ''}</>
            }
          </div>

          <div style={{
            marginTop: 10, padding: '8px 11px',
            background: '#fef3c7', border: '1px solid #fde68a',
            borderRadius: 7,
            fontSize: 12, color: '#92400e', lineHeight: 1.45,
          }}>
            ⚠️  This can&rsquo;t be undone — all current scores and trades are wiped.
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', gap: 9, justifyContent: 'flex-end',
          padding: '10px 16px 14px',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              color: '#333',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep playing
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              background: '#071a10',
              color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(7,26,16,0.32)',
            }}
          >
            ↺  Start new game
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sr-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sr-pop-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96) }
          to   { opacity: 1; transform: translateY(0)   scale(1) }
        }
      `}</style>
    </div>
  );
}

// Big celebratory overlay — fires once per round when a stock moves >=50%
function BigMoment({ moment }) {
  const { stock, pct } = moment;
  const up = pct >= 0;
  const PARTICLES = 32;
  const particles = React.useMemo(() => {
    return Array.from({ length: PARTICLES }, (_, i) => ({
      id: i,
      // spread across the width
      left: 5 + Math.random() * 90,
      delay: Math.random() * 0.4,
      duration: 1.4 + Math.random() * 1.6,
      // up-news = greens/golds, down-news = reds
      emoji: up
        ? ['🎉', '🟢', '⭐', '✨', '💰', '🎊'][Math.floor(Math.random() * 6)]
        : ['🔻', '💥', '⚠️', '🚨', '💣'][Math.floor(Math.random() * 5)],
      drift: -40 + Math.random() * 80, // horizontal drift
      rotate: Math.random() * 720 - 360,
    }));
  }, [moment.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2500,
      pointerEvents: 'none',
      animation: 'bm-fade 4.5s ease-out forwards',
      overflow: 'hidden',
    }}>
      {/* Backdrop dim */}
      <div style={{
        position: 'absolute', inset: 0,
        background: up
          ? 'radial-gradient(circle at center, rgba(22,163,74,0.18) 0%, rgba(22,163,74,0) 70%)'
          : 'radial-gradient(circle at center, rgba(220,38,38,0.20) 0%, rgba(220,38,38,0) 70%)',
      }} />

      {/* Confetti particles */}
      {particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute',
          left: p.left + '%',
          top: '-40px',
          fontSize: 28 + Math.random() * 14,
          animation: `bm-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          ['--bm-drift']: p.drift + 'px',
          ['--bm-rot']: p.rotate + 'deg',
        }}>{p.emoji}</span>
      ))}

      {/* Hero card — zooms in centre */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: up
          ? 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)'
          : 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
        color: '#fff',
        padding: '28px 44px',
        borderRadius: 20,
        boxShadow: up
          ? '0 25px 60px rgba(22,163,74,0.4), 0 0 0 8px rgba(74,222,128,0.18)'
          : '0 25px 60px rgba(220,38,38,0.4), 0 0 0 8px rgba(248,113,113,0.18)',
        textAlign: 'center',
        animation: 'bm-zoom 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.3) forwards',
      }}>
        <div style={{ fontSize: 88, lineHeight: 1, marginBottom: 4 }}>
          {stock.emoji}
        </div>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.18em',
          opacity: 0.85, marginBottom: 6,
        }}>
          {up ? '🚀 BIG MOVE' : '💥 BIG DROP'}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 4 }}>
          {stock.id}
        </div>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontSize: 64, fontWeight: 800, lineHeight: 1,
          letterSpacing: '-0.03em',
          animation: 'bm-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.5) 0.15s both',
        }}>
          {up ? '+' : ''}{pct.toFixed(0)}%
        </div>
      </div>

      <style>{`
        @keyframes bm-fade {
          0%   { opacity: 0; }
          6%   { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bm-zoom {
          0%   { transform: translate(-50%, -50%) scale(0.4) rotate(-6deg); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
        }
        @keyframes bm-pop {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes bm-fall {
          0%   { transform: translateY(0)   translateX(0) rotate(0deg);  opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--bm-drift)) rotate(var(--bm-rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// BIG BET — full-screen "in your face" overlay when a student commits 50%+
function BigBetMoment({ data }) {
  const { player, stock, kind, qty, total, pct } = data;
  const buy = kind === 'buy';
  const bg = buy
    ? 'linear-gradient(135deg, #fb923c 0%, #dc2626 100%)'   // bold orange→red for big buys (confident bet)
    : 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)';  // crimson for big sells (taking profit / cutting)

  const verb = buy ? 'WENT ALL IN ON' : 'CASHED OUT OF';
  const headline = buy
    ? ['Big bet!', 'Going all in!', 'Conviction trade!', 'Bold move!']
    : ['Cashing out!', 'Taking profits!', 'Cutting loose!', 'Done with it!'];
  const tagline = React.useMemo(() => headline[Math.floor(Math.random() * headline.length)], [data.id]);

  const PARTICLES = 24;
  const particles = React.useMemo(() => {
    const set = buy ? ['💰','🔥','💸','⚡','🚀','💎'] : ['💰','📤','💸','🍃','🪙','📉'];
    return Array.from({ length: PARTICLES }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 0.35,
      duration: 1.4 + Math.random() * 1.4,
      emoji: set[Math.floor(Math.random() * set.length)],
      drift: -40 + Math.random() * 80,
      rotate: Math.random() * 720 - 360,
    }));
  }, [data.id, buy]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2700,
      pointerEvents: 'none',
      animation: 'bb-fade 4.8s ease-out forwards',
      overflow: 'hidden',
    }}>
      {/* Backdrop wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, rgba(220,38,38,0.22) 0%, rgba(220,38,38,0) 70%)',
      }} />

      {/* Coin/money particles raining down */}
      {particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute',
          left: p.left + '%',
          top: '-44px',
          fontSize: 30 + Math.random() * 16,
          animation: `bb-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          ['--bb-drift']: p.drift + 'px',
          ['--bb-rot']: p.rotate + 'deg',
        }}>{p.emoji}</span>
      ))}

      {/* Hero card — centred */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: bg,
        color: '#fff',
        padding: '32px 44px',
        borderRadius: 22,
        boxShadow: '0 30px 80px rgba(220,38,38,0.5), 0 0 0 10px rgba(248,113,113,0.18)',
        textAlign: 'center',
        animation: 'bb-zoom 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.3) forwards',
        minWidth: 380,
        maxWidth: '88vw',
      }}>
        {/* Eyebrow */}
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontSize: 13, fontWeight: 800, letterSpacing: '0.2em',
          opacity: 0.85, marginBottom: 14,
        }}>
          🚨 {tagline.toUpperCase()}
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
          <Avatar
            name={player.name}
            color={player.color}
            avatar={player.avatar}
            size={64}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              {player.name}
            </div>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, opacity: 0.8, letterSpacing: '0.12em', fontWeight: 700 }}>
              {verb}
            </div>
          </div>
        </div>

        {/* Stock + quantity */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '14px 22px',
          background: 'rgba(0,0,0,0.18)',
          borderRadius: 16,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 48, lineHeight: 1 }}>{stock.emoji}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {qty} × {stock.id}
            </div>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 16, opacity: 0.85 }}>
              {formatMoney(total)}
            </div>
          </div>
        </div>

        {/* THE big % */}
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontSize: 72, fontWeight: 900, lineHeight: 1,
          letterSpacing: '-0.04em',
          animation: 'bb-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.5) 0.15s both',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {pct}% of worth
        </div>
        <div style={{
          fontSize: 14, opacity: 0.8, marginTop: 6, fontWeight: 600, letterSpacing: '0.04em',
        }}>
          in a single trade
        </div>
      </div>

      <style>{`
        @keyframes bb-fade {
          0%   { opacity: 0; }
          6%   { opacity: 1; }
          82%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bb-zoom {
          0%   { transform: translate(-50%, -50%) scale(0.4) rotate(-4deg); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.06) rotate(1.5deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
        }
        @keyframes bb-pop {
          0%   { transform: scale(0.55); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes bb-fall {
          0%   { transform: translateY(0)   translateX(0) rotate(0deg);  opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--bb-drift)) rotate(var(--bb-rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Flash popup for live trades / locks — slides in from the right
function ActionPop({ pop }) {
  const palette = {
    buy:  { bg: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', ring: 'rgba(22,163,74,0.35)',  badge: 'BUY',  emoji: '🟢' },
    sell: { bg: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', ring: 'rgba(220,38,38,0.35)',  badge: 'SELL', emoji: '🔴' },
    lock: { bg: 'linear-gradient(135deg, #a5b4fc 0%, #4f46e5 100%)', ring: 'rgba(99,102,241,0.35)', badge: 'LOCKED', emoji: '🔒' },
  }[pop.kind] || { bg: '#64748b', ring: 'rgba(0,0,0,0.2)', badge: '', emoji: '•' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px 10px 10px',
      background: palette.bg,
      color: '#fff',
      borderRadius: 14,
      boxShadow: `0 10px 24px ${palette.ring}, 0 4px 10px rgba(0,0,0,0.12)`,
      animation: 'ap-life 3s ease-out forwards',
      pointerEvents: 'none', // decorative — never steal clicks from controls beneath
    }}>
      <Avatar
        name={pop.player.name}
        color={pop.player.color}
        avatar={pop.player.avatar}
        size={40}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10, letterSpacing: '0.14em', fontWeight: 800,
          fontFamily: 'Geist Mono, ui-monospace',
          opacity: 0.95, marginBottom: 2,
        }}>
          <span style={{
            padding: '2px 6px', borderRadius: 3,
            background: 'rgba(255,255,255,0.18)',
          }}>{palette.badge}</span>
          <span style={{ opacity: 0.9 }}>{palette.emoji} {pop.player.name}</span>
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pop.kind === 'lock'
            ? '🔒 Locked in their trades'
            : (
              <>
                {pop.kind === 'buy' ? 'bought' : 'sold'} {pop.qty} × {pop.stock?.emoji} <span style={{ fontFamily: 'Geist Mono, ui-monospace' }}>{pop.stock?.id || pop.ticker}</span>
              </>
            )
          }
        </div>
        {pop.kind !== 'lock' && pop.total != null && (
          <div style={{
            fontSize: 12, fontFamily: 'Geist Mono, ui-monospace',
            opacity: 0.88, marginTop: 1,
          }}>
            {pop.kind === 'buy' ? '−' : '+'}{formatMoney(pop.total)}
          </div>
        )}
      </div>
      <style>{`
        @keyframes ap-life {
          0%   { opacity: 0; transform: translateX(40px) scale(0.92); }
          10%  { opacity: 1; transform: translateX(0)    scale(1); }
          70%  { opacity: 1; transform: translateX(0)    scale(1); }
          100% { opacity: 0; transform: translateX(20px) scale(0.97); }
        }
      `}</style>
    </div>
  );
}

// Kickable chip for the LOBBY player list — hover reveals an × button
function KickableChip({ player }) {
  const [hover, setHover] = React.useState(false);
  function handleKick(e) {
    e.stopPropagation();
    if (window.confirm(`Remove ${player.name} from the game?\nThey'll be sent back to the join screen.`)) {
      window.StockRush.kick(player.id);
    }
  }
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px 5px 5px',
        background: '#fff',
        border: `2px solid ${player.color || '#cbd5e1'}`,
        borderRadius: 999,
        boxShadow: `0 2px 8px ${player.color || '#cbd5e1'}30`,
        margin: 3,
        animation: 'lc-bounce 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.4)',
        transition: 'transform .15s',
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px) rotate(-1deg)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0) rotate(0)'}
    >
      <Avatar name={player.name} color={player.color} avatar={player.avatar} size={30} />
      <span style={{
        fontSize: 13, fontWeight: 700, color: '#0f172a',
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{player.name}</span>
      {hover && (
        <button
          onClick={handleKick}
          aria-label={'Remove ' + player.name}
          title={'Remove ' + player.name}
          style={{
            position: 'absolute', top: -8, right: -8,
            width: 24, height: 24, borderRadius: '50%',
            background: '#dc2626', color: '#fff',
            border: '2px solid #fff', cursor: 'pointer',
            fontSize: 14, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >×</button>
      )}
      <style>{`@keyframes lc-bounce { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

// Kickable lock chip for the PLAYING-phase header lock strip
function KickableLockChip({ player, locked }) {
  const [hover, setHover] = React.useState(false);
  function handleKick(e) {
    e.stopPropagation();
    if (window.confirm(`Remove ${player.name} from the game?\nThey'll be sent back to the join screen.`)) {
      window.StockRush.kick(player.id);
    }
  }
  return (
    <div
      className={'lock-chip ' + (locked ? 'locked' : 'unlocked')}
      title={locked ? `${player.name} locked` : `${player.name} still trading`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      <Avatar name={player.name} color={player.color} avatar={player.avatar} size={18} />
      <span>{player.name}</span>
      {locked
        ? <span className="lock-icon">🔒</span>
        : <span className="lock-icon pending">⏳</span>
      }
      {hover && (
        <button
          onClick={handleKick}
          aria-label={'Remove ' + player.name}
          title={'Remove ' + player.name}
          style={{
            position: 'absolute', right: -6, top: -6,
            width: 18, height: 18, borderRadius: '50%',
            background: '#dc2626', color: '#fff',
            border: '2px solid #fff', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >×</button>
      )}
    </div>
  );
}

// Small QR thumbnail inside the JOIN pill — teacher sees it WITHOUT clicking,
// so they know the pill is the join target. Click expands to full-screen modal.
function JoinPillQR() {
  const qrRef = React.useRef(null);
  React.useEffect(() => {
    if (!qrRef.current || !window.QRCode) return;
    const url = `${window.location.origin}${window.location.pathname}?role=player&room=${window.GAME_CONFIG.roomCode}`;
    qrRef.current.innerHTML = '';
    new window.QRCode(qrRef.current, {
      text: url, width: 52, height: 52,
      correctLevel: window.QRCode.CorrectLevel.L,
    });
  }, []);
  return (
    <div style={{
      background: '#fff', padding: 4, borderRadius: 6,
      border: '1px solid rgba(0,0,0,0.12)',
      flexShrink: 0, lineHeight: 0,
    }}>
      <div ref={qrRef} style={{ display: 'flex' }} />
    </div>
  );
}

// ── ShareQRModal — full-screen QR pop-up triggered from the join pill ──────
// Teacher taps the join pill on ANY screen to show a big QR so a late joiner
// (or a refresh-rejoiner) can scan from across the classroom.
function ShareQRModal({ round, phase, humanCount, onClose }) {
  const qrRef = React.useRef(null);
  const url = `${window.location.origin}${window.location.pathname}?role=player&room=${window.GAME_CONFIG.roomCode}`;

  React.useEffect(() => {
    if (qrRef.current && window.QRCode) {
      qrRef.current.innerHTML = '';
      new window.QRCode(qrRef.current, {
        text: url, width: 260, height: 260,
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    }
  }, [url]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isLobby = phase === 'lobby';
  const subline = isLobby
    ? `Lobby open · ${humanCount} in`
    : `Round ${round} · ${humanCount} playing`;
  const blurb = isLobby
    ? 'Students scan to join.'
    : 'Late joiners get ₹1L. Refresh/rescan keeps your portfolio.';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(7, 26, 16, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 480, width: '100%',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 28px 70px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #071a10 0%, #0f3a24 100%)',
          padding: '16px 22px', color: '#fff', flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
          }}>
            Room {window.GAME_CONFIG.roomCode}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginTop: 2 }}>
            📱 Scan to join
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {subline}
          </div>
        </div>

        <div style={{ padding: '18px 22px', textAlign: 'center', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{
            background: '#fff', padding: 12, borderRadius: 12,
            border: '2px solid #e6e3dc', display: 'inline-block', marginBottom: 12,
          }}>
            <div ref={qrRef} style={{ display: 'flex' }} />
          </div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 600,
            fontSize: 13, color: '#0f172a', wordBreak: 'break-all',
          }}>
            {url.replace(/^https?:\/\//, '')}
          </div>
          <div style={{
            fontSize: 34, color: '#0f172a',
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 800,
            letterSpacing: '0.08em', marginTop: 4,
          }}>
            {window.GAME_CONFIG.roomCode}
          </div>
          <div style={{
            fontSize: 12.5, color: '#5b6470', lineHeight: 1.45,
            marginTop: 10, maxWidth: 340, marginInline: 'auto',
          }}>
            {blurb}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          padding: '12px 20px 16px',
          borderTop: '1px solid #f0ede5', flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#0f3a24', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HostView });
