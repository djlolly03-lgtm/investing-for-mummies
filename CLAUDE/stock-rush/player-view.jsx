// Player (student) view — phone-friendly
//
// Identity is stored in sessionStorage (not localStorage).
// sessionStorage is scoped to a single browser tab and is wiped when the tab
// closes, so old players from previous games can never auto-rejoin a new one.
// Every fresh QR scan opens a new tab → empty sessionStorage → name-entry screen.

const PLAYER_KEY = 'stockrush:me';

// SECTOR_COLORS lives in ui-common.jsx — pull from window
const SECTOR_COLORS = window.SECTOR_COLORS;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _loadMe() {
  try { return JSON.parse(sessionStorage.getItem(PLAYER_KEY) || 'null'); }
  catch { return null; }
}
function _saveMe(me) { sessionStorage.setItem(PLAYER_KEY, JSON.stringify(me)); }
function _clearMe()  { sessionStorage.removeItem(PLAYER_KEY); }

function getAllStocks(stateStocks) {
  return stateStocks || window.STOCKS || [];
}

// ── Root ──────────────────────────────────────────────────────────────────────

function PlayerView() {
  const [me,    setMe]    = React.useState(_loadMe);
  const [stateRaw, setState] = React.useState(() => window.StockRush.getState());

  // ── Sticky session memory ─────────────────────────────────────────────────
  // Once we've EVER seen a valid sessionId from the host, never flicker
  // back to the "waiting" screen. Stale events that briefly drop sessionId
  // would otherwise cause a 1-2s flash mid-game.
  const lastGoodRef = React.useRef(null);
  if (stateRaw?.sessionId) lastGoodRef.current = stateRaw;
  const state = stateRaw?.sessionId ? stateRaw : (lastGoodRef.current || stateRaw);

  // Subscribe to all engine state updates (host writes → DB → postgres_changes → here)
  React.useEffect(() => window.StockRush.subscribe(setState), []);

  // Listen for kick events from the host
  React.useEffect(() => {
    return window.StockRush.onKick?.((kickedId) => {
      if (me && me.id === kickedId) {
        _clearMe();
        setMe(null);
      }
    });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session guard (tolerant) ──────────────────────────────────────────────
  // Fires whenever the game's sessionId changes (teacher hard-refreshed and
  // started a fresh game). Clears stale identity so the name-entry screen
  // shows — even if the student's tab is still open from the old game.
  //
  // TOLERANCE: wait 3 seconds before wiping. If the sessionId flips back
  // (transient churn from a stale broadcast, Supabase reconnect, or briefly-
  // null state), the effect cleanup cancels the timer and the student stays
  // in the game. Only a sustained 3-second-plus mismatch actually triggers
  // the wipe — real "teacher started fresh" scenarios trip this easily, but
  // sub-second glitches don't kick students out any more.
  React.useEffect(() => {
    if (!me || !state.sessionId) return;
    if (me.sessionId === state.sessionId) return;
    const t = setTimeout(() => {
      _clearMe();
      setMe(null);
    }, 3000);
    return () => clearTimeout(t);
  }, [state.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join / retry ──────────────────────────────────────────────────────────
  // Broadcasts join every 3 s until the host confirms us in state.players.
  // The first broadcast often fires before the Realtime channel has fully
  // connected, so retrying is the only reliable approach.
  const inGame = !!(me && state.players?.[me.id]);
  React.useEffect(() => {
    if (!me || inGame || state.phase === 'ended') return;
    window.StockRush.join(me);                               // immediate attempt
    const t = setInterval(() => window.StockRush.join(me), 3000);
    return () => clearInterval(t);
  }, [me, inGame, state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join safety net ───────────────────────────────────────────────────────
  // After 15 seconds of retrying with no host confirmation, flip to a
  // "Still joining…" screen with a Retry button so the student knows the
  // teacher's tab may have crashed. Hooks MUST be declared before any
  // early return below so the hook order stays consistent — yesterday I
  // put them after the sessionId early return and broke every join.
  const [joinTimedOut, setJoinTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!me || inGame || state.phase === 'ended') { setJoinTimedOut(false); return; }
    const t = setTimeout(() => setJoinTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, [me, inGame, state.phase]);

  // ── Waiting for host ─────────────────────────────────────────────────────
  // state.sessionId is null until the host goes live and their state reaches us
  // via DB or broadcast. Don't render anything from old/stale DB state until then.
  if (!state.sessionId) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
        flexDirection: 'column', gap: 14,
        padding: 24, textAlign: 'center',
      }}>
        <div style={{
          fontSize: 56, animation: 'sw-bob 2s ease-in-out infinite',
        }}>⏳</div>
        <div style={{
          color: '#0f172a', fontFamily: 'Geist, ui-sans-serif',
          fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
        }}>
          Waiting for your teacher
        </div>
        <div style={{
          color: 'var(--muted)', fontSize: 13, lineHeight: 1.5,
          maxWidth: 280,
        }}>
          Your phone is connected. The game will start automatically — sit tight.
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#94a3b8',
              animation: `sw-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes sw-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          @keyframes sw-dot { 0%,80%,100%{opacity:0.3; transform:scale(0.9)} 40%{opacity:1; transform:scale(1.2)} }
        `}</style>
      </div>
    );
  }

  // ── Onboard ───────────────────────────────────────────────────────────────
  if (!me) {
    return (
      <PlayerOnboard
        state={state}
        onJoin={p => {
          // Stamp with the current game's sessionId.
          // The host validates this on every join — wrong session = rejected.
          const tagged = { ...p, sessionId: state.sessionId };
          _saveMe(tagged);
          setMe(tagged);
          window.StockRush.join(tagged);
        }}
      />
    );
  }

  // ── Joining wall ──────────────────────────────────────────────────────────
  // Student has an identity (me) but the host hasn't confirmed them in
  // state.players yet. Show a dedicated screen instead of the fake-player
  // in-game view — otherwise students see a ghost lobby/leaderboard for
  // the first few seconds after tapping Join. After 15 s of no admission,
  // upgrade to a Still joining… + Retry button.
  if (!inGame && state.phase !== 'ended') {
    if (joinTimedOut) {
      return (
        <div className="onboard">
          <div className="onboard-card" style={{ textAlign: 'center' }}>
            <div className="onboard-mark">SR</div>
            <div className="onboard-title" style={{ marginTop: 8 }}>Still joining…</div>
            <div className="onboard-sub" style={{ marginTop: 8 }}>
              This is taking longer than usual. Check that your teacher's screen is still open, then tap below to try again.
            </div>
            <button
              type="button"
              className="big-btn"
              style={{ marginTop: 14 }}
              onClick={() => window.location.reload()}
            >
              ↺ Retry
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="onboard">
        <div className="onboard-card" style={{ textAlign: 'center' }}>
          <div className="onboard-mark">SR</div>
          <div className="onboard-title" style={{ marginTop: 8 }}>Joining game…</div>
          <div className="onboard-sub" style={{ marginTop: 8 }}>
            Hang on — adding you to the game now.
          </div>
        </div>
      </div>
    );
  }

  // ── In-game ───────────────────────────────────────────────────────────────
  // Provide safe defaults so the view never crashes if the host hasn't
  // confirmed us yet (holdings/cash come from the host's authoritative state).
  const player    = state.players[me.id] || { holdings: {}, holdingsCost: {}, cash: window.GAME_CONFIG.startingCash, ...me };
  const allStocks = getAllStocks(state.stocks);
  const worth     = window.netWorth(player, allStocks);
  const ranked    = Object.values(state.players)
    .map(p => ({ ...p, worth: window.netWorth(p, getAllStocks(state.stocks)) }))
    .sort((a, b) => b.worth - a.worth);
  const myRank   = ranked.findIndex(p => p.id === me.id) + 1;
  const isLocked = !!(state.locks?.[me.id]);

  return (
    <div className="player-shell">
      <PlayerHeader me={player} state={state} worth={worth} rank={myRank} total={ranked.length} />
      {state.phase === 'lobby'   && <PlayerLobby   me={player} state={state} />}
      {state.phase === 'playing' && <PlayerPlaying  me={player} state={state} isLocked={isLocked} allStocks={allStocks} />}
      {state.phase === 'ended'   && <PlayerEnded    me={player} state={state} worth={worth} rank={myRank} total={ranked.length} allStocks={allStocks} />}
    </div>
  );
}

// ── Onboard ───────────────────────────────────────────────────────────────────

function PlayerOnboard({ state, onJoin }) {
  const urlRoom     = new URLSearchParams(window.location.search).get('room') || '';
  const codeFromUrl = urlRoom.toUpperCase() === window.GAME_CONFIG.roomCode;

  const [name,  setName]  = React.useState('');
  const [code,  setCode]  = React.useState(codeFromUrl ? window.GAME_CONFIG.roomCode : '');
  const [picked, setPicked] = React.useState(() => {
    const opts = window.AVATAR_OPTIONS || [];
    return opts[Math.floor(Math.random() * opts.length)];
  });
  // F1.1 — show a one-time 3-step tutorial after name+avatar, before Join.
  const [seenTutorial, setSeenTutorial] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);

  // Also require state.sessionId — it's null until the host's game state arrives
  // from Supabase. Prevents joining with a stale/wrong session ID.
  const trimmedName = name.trim();
  const existingNames = Object.values(state.players || {})
    .filter(p => !p.isBot)
    .map(p => (p.name || '').trim().toLowerCase());
  const isDuplicate = trimmedName.length >= 2 && existingNames.includes(trimmedName.toLowerCase());
  const valid = trimmedName.length >= 2 &&
                code.toUpperCase() === window.GAME_CONFIG.roomCode &&
                !!state.sessionId &&
                !isDuplicate;

  function doJoin() {
    onJoin({
      id: 'p-' + crypto.randomUUID().slice(0, 8),
      name: trimmedName,
      color: picked.color,
      avatar: picked.emoji,
    });
  }
  function submit() {
    if (!valid) return;
    // First-time players see the 3-step tutorial before joining.
    if (!seenTutorial) {
      setShowTutorial(true);
      return;
    }
    doJoin();
  }

  if (showTutorial) {
    const steps = [
      { n: 1, icon: '📖', text: 'Read the briefing — each round, 3 stocks have a story.' },
      { n: 2, icon: '💸', text: 'Buy or sell — split your cash across stocks you trust.' },
      { n: 3, icon: '🔒', text: 'Lock your picks — news drops, prices move, leaderboard updates.' },
    ];
    return (
      <div className="onboard">
        <div className="onboard-card" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setSeenTutorial(true); setShowTutorial(false); doJoin(); }}
            aria-label="Skip tutorial"
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'transparent', border: 'none',
              color: 'var(--muted)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', padding: 4,
              textDecoration: 'underline',
            }}
          >
            Skip tutorial
          </button>
          <div className="onboard-mark">SR</div>
          <div className="onboard-title">How it works</div>
          <div className="onboard-sub">3 quick things before you join</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '18px 0 12px' }}>
            {steps.map(s => (
              <div key={s.n} style={{
                display: 'grid',
                gridTemplateColumns: '36px 36px 1fr',
                gap: 12, alignItems: 'center',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: '#0f172a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 14,
                  fontFamily: 'Geist Mono, ui-monospace',
                }}>{s.n}</div>
                <div style={{ fontSize: 22, textAlign: 'center' }}>{s.icon}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.4, color: '#0f172a' }}>
                  {s.text}
                </div>
              </div>
            ))}
          </div>
          <button
            className="big-btn"
            onClick={() => { setSeenTutorial(true); setShowTutorial(false); doJoin(); }}
          >
            Got it, let me play →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-mark">SR</div>
        <div className="onboard-title">Stock Rush</div>
        <div className="onboard-sub">Join the game on your teacher's screen</div>

        {!codeFromUrl && (
          <label className="field">
            <div className="field-label">Room code</div>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0,4))}
              maxLength={4} className="input code-input" placeholder="ABCD" />
          </label>
        )}

        <label className="field">
          <div className="field-label">Your name</div>
          <input value={name} onChange={e => setName(e.target.value.slice(0,14))}
            className="input" placeholder="e.g. Sam"
            autoFocus onKeyDown={e => e.key === 'Enter' && submit()}
            style={isDuplicate ? { borderColor: '#dc2626' } : {}} />
          {isDuplicate && (
            <div style={{
              fontSize: 11.5, color: '#dc2626', marginTop: 4, fontWeight: 600,
            }}>
              ⚠️ "{trimmedName}" is already in the room — pick a different name
            </div>
          )}
        </label>

        <div className="field">
          <div className="field-label">Pick your avatar</div>

          {/* Trader identity preview card (matches Pro): big disc + label + subtitle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', marginBottom: 12,
            background: picked.color + '12',
            border: '2px solid ' + picked.color + '55',
            borderRadius: 14,
            transition: 'all 0.2s',
          }}>
            <div style={{
              width: 62, height: 62, borderRadius: '50%', flexShrink: 0,
              background: picked.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, lineHeight: 1, overflow: 'hidden',
              boxShadow: '0 4px 18px ' + picked.color + '88',
            }}>
              {picked.emoji}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', letterSpacing: '-0.01em' }}>
                {picked.label}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: picked.color, marginTop: 2 }}>
                Your trader identity
              </div>
            </div>
          </div>

          {/* 12-avatar grid — 4 × 3, matches Pro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {window.AVATAR_OPTIONS.map(opt => {
              const active = picked.emoji === opt.emoji;
              return (
                <button
                  key={opt.emoji}
                  type="button"
                  onClick={() => setPicked(opt)}
                  aria-label={'Pick ' + opt.label}
                  title={opt.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, padding: 0, borderRadius: '50%',
                    background: active ? opt.color : opt.color + '1a',
                    border: active ? '3px solid ' + opt.color : '2px solid ' + opt.color + '44',
                    boxShadow: active
                      ? '0 0 0 3px #fff, 0 0 0 5px ' + opt.color + ', 0 6px 18px ' + opt.color + '99'
                      : 'none',
                    fontSize: 32, lineHeight: 1, overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.2,0.9,0.3,1.3)',
                    transform: active ? 'scale(1.18)' : 'scale(1)',
                    outline: 'none',
                  }}
                >
                  {opt.emoji}
                </button>
              );
            })}
          </div>
        </div>

        <button className={'big-btn' + (valid ? '' : ' disabled')} onClick={submit}>
          Join game →
        </button>
        <div className="onboard-foot muted small">Room: <b>{window.GAME_CONFIG.roomCode}</b></div>
      </div>
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function PlayerHeader({ me, state, worth, rank, total }) {
  const cfg    = window.GAME_CONFIG;
  const total5 = cfg.rounds;
  const inPlay = state.phase === 'playing' || state.phase === 'ended';

  return (
    <div className="player-header">
      <div className="ph-top">
        <div className="ph-me">
          <Avatar name={me.name} color={me.color} avatar={me.avatar} size={32} />
          <div>
            <div className="ph-name">{me.name}</div>
            <div className="ph-rank">
              {inPlay ? <>Rank <b>{rank}</b> of {total}</> : 'In lobby'}
            </div>
          </div>
        </div>
        <div className="ph-worth">
          <div className="ph-worth-label">Net worth</div>
          <div className="ph-worth-val">{formatMoney(worth)}</div>
          <PriceDelta price={worth} prev={cfg.startingCash} />
        </div>
      </div>

      {inPlay && state.phase !== 'ended' && (() => {
        const rn = window.ROUND_NEWS?.[state.round - 1];
        const eraHeadline = rn ? rn.headline.split('—')[0].trim() : null;
        return (
          <>
            <div className="ph-progress" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: total5 }, (_, i) => (
                  <div key={i} className={
                    'progress-dot' +
                    (i < state.round - 1 ? ' done' : i === state.round - 1 ? ' active' : '')
                  } />
                ))}
              </div>
              <span className="ph-round-label">
                Round {state.round} / {total5}
                {window.ROUND_YEARS?.[state.round - 1] &&
                  <span style={{ opacity: 0.6 }}> · {window.ROUND_YEARS[state.round - 1]}</span>}
              </span>
              <span style={{ flex: 1 }} />
              <RoundTimer
                startedAt={state.roundTimerStartsAt}
                durationSec={(window.GAME_CONFIG.roundDurations || [])[state.round - 1]}
                pausedMs={state.pausedMs || 0}
                isPaused={!!state.paused}
                pausedAt={state.pausedAt}
                compact
              />
            </div>
            {eraHeadline && (
              <div style={{
                padding: '4px 16px 8px',
                fontSize: 12.5, fontWeight: 600,
                color: '#92400e',
                letterSpacing: '-0.01em',
              }}>
                📰 {eraHeadline}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function PlayerLobby({ me, state }) {
  const humans = Object.values(state.players).filter(p => !p.isBot);
  // Show only the 8 stocks actually in this game (selected from the 20-stock pool)
  const stocks = (state.stocks && state.stocks.length > 0) ? state.stocks : window.STOCKS;
  const cfg    = window.GAME_CONFIG;
  const [readIds, setReadIds] = React.useState(() => new Set());

  function markRead(id) {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div className="player-body">
      {/* Study prompt banner — matches Pro's onboarding energy. Dark card
          with a nudge to skim the briefings while the class fills up. */}
      <div style={{
        margin: '14px 14px 0',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        borderRadius: 14,
        border: '1.5px solid rgba(99,179,237,0.35)',
        boxShadow: '0 4px 18px rgba(15,23,42,0.18)',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ fontSize: 30, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>📱</div>
        <div>
          <div style={{
            fontWeight: 800, fontSize: 15.5, color: '#fff',
            letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 5,
          }}>
            Study up while you wait!
          </div>
          <div style={{ fontSize: 13, color: 'rgba(186,230,255,0.85)', lineHeight: 1.55 }}>
            Read each company card below. You'll be trading{' '}
            <b style={{ color: '#fff' }}>real Indian stocks</b> with{' '}
            <b style={{ color: '#fbbf24' }}>{formatMoney(cfg.startingCash)}</b> of virtual money
            — knowing the businesses before the game starts is your edge.
          </div>
        </div>
      </div>

      {/* Briefing intro */}
      <div style={{ padding: '14px 16px 8px', background: 'var(--paper)', borderBottom: '1.5px solid var(--line)', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'Geist, ui-sans-serif', fontWeight: 700, fontSize: 17 }}>
            📖 Company briefing
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', color: 'var(--muted)',
          }}>
            {readIds.size} / {stocks.length} READ
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
          Eight Indian stocks across 2016–2026. Tap each to read the story before trading begins.
        </div>
        {/* Glossary chips */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          marginTop: 8,
          fontSize: 11, color: '#475569', lineHeight: 1.4,
        }}>
          <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
            <b>Sector</b> = the kind of business (Tech / Retail / Finance…)
          </span>
          <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: 6 }}>
            <b>Risk</b> = how wild the price swings can be
          </span>
        </div>
        {/* Progress strip */}
        <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
          {stocks.map(s => (
            <div key={s.id} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: readIds.has(s.id) ? '#15803d' : '#e2e8f0',
              transition: 'background .2s',
            }} />
          ))}
        </div>
      </div>

      {/* Vertical scroll list of company cards */}
      <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stocks.map(s => (
          <BriefingCard key={s.id} stock={s} read={readIds.has(s.id)} onRead={markRead} />
        ))}
      </div>

      {/* Players ready strip */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1.5px solid var(--line)', marginTop: 10, background: 'var(--paper)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textAlign: 'center', fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.1em' }}>
          {humans.length === 0 ? 'WAITING FOR OTHERS…' : humans.length + ' PLAYER' + (humans.length === 1 ? '' : 'S') + ' READY'}
        </div>
        <div className="lobby-players-inline" style={{ justifyContent: 'center' }}>
          {humans.map(p => (
            <div className="lobby-chip" key={p.id}>
              <Avatar name={p.name} color={p.color} avatar={p.avatar} size={22} />
              <span>{p.name}</span>
              {p.id === me.id && <span className="me-tag">you</span>}
            </div>
          ))}
        </div>
        <div className="muted small" style={{ textAlign: 'center', marginTop: 8 }}>
          Starting cash: <b>{formatMoney(cfg.startingCash)}</b> · {cfg.rounds} rounds · 2016–2026
        </div>
      </div>
    </div>
  );
}

function BriefingCard({ stock, read, onRead }) {
  const [expanded, setExpanded] = React.useState(false);
  const col = SECTOR_COLORS[stock.sector] || SECTOR_COLORS.Tech;
  const risk = window.RISK_META[stock.risk] || window.RISK_META.medium;
  const capLabel = { large: 'Large cap', mid: 'Mid cap', small: 'Small cap' }[stock.cap] || '';

  function toggle() {
    setExpanded(e => {
      const next = !e;
      if (next) onRead(stock.id);
      return next;
    });
  }

  return (
    <div
      onClick={toggle}
      style={{
        background: expanded ? '#fff' : col.bg,
        border: `2px solid ${col.border}`,
        borderRadius: 14,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'background .15s, transform .12s',
        position: 'relative',
        boxShadow: expanded ? '0 4px 14px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {/* Read tick */}
      {read && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: '#15803d', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>✓</div>
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingRight: read ? 26 : 0 }}>
        <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{stock.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 13,
              color: col.text, letterSpacing: '0.04em',
            }}>{stock.id}</span>
            <SectorTag sector={stock.sector} />
            <RiskBadge risk={stock.risk} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: col.text, letterSpacing: '-0.01em', marginBottom: 2 }}>
            {stock.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
            {capLabel} · Starts at {formatMoney(stock.price)}
          </div>
        </div>
      </div>

      {/* Always-visible short blurb */}
      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginTop: 10 }}>
        {stock.desc}
      </div>

      {/* Teasers always visible — one line each for fun fact + watch-for */}
      {!expanded && (stock.fun || stock.watch) && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {stock.fun && (
            <div style={{
              fontSize: 11.5, color: col.text, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <b style={{ marginRight: 4 }}>💡</b>
              {stock.fun}
            </div>
          )}
          {stock.watch && (
            <div style={{
              fontSize: 11.5, color: '#0f172a', lineHeight: 1.4, opacity: 0.7,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <b style={{ marginRight: 4 }}>👀</b>
              {stock.watch}
            </div>
          )}
        </div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stock.fun && (
            <div style={{
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.6)',
              border: '1px dashed ' + col.border,
              borderRadius: 8,
              fontSize: 12, color: col.text, lineHeight: 1.45,
            }}>
              <b style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, letterSpacing: '0.1em' }}>💡 FUN FACT</b><br />
              {stock.fun}
            </div>
          )}
          {stock.watch && (
            <div style={{
              padding: '8px 10px',
              background: 'rgba(15,23,42,0.04)',
              borderLeft: `3px solid ${col.border}`,
              borderRadius: '0 8px 8px 0',
              fontSize: 12, color: '#0f172a', lineHeight: 1.45,
            }}>
              <b style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, letterSpacing: '0.1em' }}>👀 WATCH FOR</b><br />
              {stock.watch}
            </div>
          )}
        </div>
      )}

      {/* Tap hint */}
      <div style={{
        marginTop: 8, fontSize: 11, color: col.text, opacity: 0.65,
        fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.06em',
      }}>
        {expanded ? '— tap to collapse' : 'TAP TO LEARN MORE →'}
      </div>
    </div>
  );
}

// ── Playing phase ─────────────────────────────────────────────────────────────

function PlayerPlaying({ me, state, isLocked, allStocks }) {
  const [tab, setTab]           = React.useState('trade');
  const [tradeSheet, setTradeSheet] = React.useState(null); // { stock, mode }
  const [tradeToast, setTradeToast] = React.useState(null);
  const [lockConfirm, setLockConfirm] = React.useState(false);
  const [roundTrades, setRoundTrades] = React.useState([]);
  const player = state.players[me.id] || me;

  // E1.1 — Connection state chip. Just navigator.onLine — we don't probe the
  // Supabase channel since the engine already reconnects silently.
  const [online, setOnline] = React.useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true);
  React.useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Reset the round-trade log whenever the round advances
  const prevRound = React.useRef(state.round);
  React.useEffect(() => {
    if (state.round !== prevRound.current) {
      setRoundTrades([]);
      prevRound.current = state.round;
    }
  }, [state.round]);

  const myCash     = player.cash || 0;
  const currentVal = allStocks.reduce((s, stk) =>
    s + (player.holdings?.[stk.id] || 0) * stk.price, 0);
  const total = myCash + currentVal;
  const pnl   = total - window.GAME_CONFIG.startingCash;

  const latestNews = state.news?.[0];
  const [seenNewsRound, setSeenNewsRound] = React.useState(null);
  // The toast stays open until the student taps ✕ — no auto-dismiss.
  // A new round's news still re-opens the toast because seenNewsRound (from
  // the previous round's close) won't equal latestNews.round.
  const flashing = latestNews && latestNews.round !== seenNewsRound;

  const worthHistory = player.worthHistory || [window.GAME_CONFIG.startingCash];
  // Append the LIVE worth as the latest point so the chart's last node matches
  // the displayed Net Worth. Without this, the chart shows the worth snapshot
  // taken at the START of the round, which lags behind the live news-adjusted
  // price (causing visible mismatch e.g. chart ₹5.7L vs displayed ₹20L).
  const journey = (() => {
    const last = worthHistory[worthHistory.length - 1];
    return Math.abs(total - last) < 1 ? worthHistory : [...worthHistory, total];
  })();

  function openSheet(stock, mode) { setTradeSheet({ stock, mode }); }
  function handleTradeDone(result) {
    setTradeToast(result);
    setRoundTrades(prev => [...prev, result]);
  }

  // Current holdings as compact list
  const currentHoldings = allStocks
    .filter(s => (player.holdings?.[s.id] || 0) > 0)
    .map(s => ({ stock: s, qty: player.holdings[s.id], value: player.holdings[s.id] * s.price }));

  return (
    <div className="player-body">
      {/* E1.1 — connection chip, top-right floating */}
      <div
        aria-live="polite"
        aria-label={online ? 'Connection live' : 'You are offline'}
        style={{
          position: 'fixed', top: 8, right: 8, zIndex: 950,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 999,
          fontSize: 10, fontFamily: 'Geist Mono, ui-monospace',
          fontWeight: 700, letterSpacing: '0.04em',
          background: online ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.14)',
          color: online ? '#15803d' : '#b91c1c',
          border: '1px solid ' + (online ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.4)'),
          pointerEvents: 'none',
        }}
      >
        {online ? '● Live' : '⚠ Offline'}
      </div>
      {tradeToast && (
        <TradeToast trade={tradeToast} onDone={() => setTradeToast(null)} />
      )}
      {tradeSheet && (
        <TradeSheet
          stock={tradeSheet.stock}
          me={player}
          state={state}
          initialMode={tradeSheet.mode}
          onClose={() => setTradeSheet(null)}
          onDone={handleTradeDone}
        />
      )}
      {lockConfirm && (
        <LockConfirmModal
          trades={roundTrades}
          holdings={currentHoldings}
          cash={myCash}
          total={total}
          round={state.round}
          onCancel={() => setLockConfirm(false)}
          onConfirm={() => {
            setLockConfirm(false);
            window.StockRush.lock(me.id);
            try { window.SR_AUDIO?.lockIn?.(); } catch(e){}
            try { navigator.vibrate?.(40); } catch(e){}
            setTab('waiting'); // drop straight into the waiting-room experience
          }}
        />
      )}

      {flashing && (
        <NewsToast
          news={latestNews}
          onReact={e => window.StockRush.react(me.id, e)}
          onClose={() => {
            setSeenNewsRound(latestNews.round);
            // Round just started — always drop them onto the Trade tab so
            // they can act on the news, no matter what tab they were on before.
            setTab('trade');
          }}
        />
      )}

      {/* Pause banner intentionally removed — pause only freezes the timer,
          students keep trading during pause so a "sit tight" nudge is wrong. */}

      {/* Summary strip */}
      <div className="summary-strip">
        <div className="summary-cell">
          <div className="summary-label">Cash</div>
          <div className="summary-val">{formatMoney(myCash)}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Stocks</div>
          <div className="summary-val">{formatMoney(currentVal)}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Total</div>
          <div className="summary-val">{formatMoney(total)}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">P&amp;L</div>
          <div className={'summary-val ' + (pnl >= 0 ? 'up' : 'down')}>
            {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
          </div>
        </div>
      </div>

      {/* Always-visible compact holdings strip — empty state explains what it'll do */}
      {currentHoldings.length > 0
        ? <HoldingsStrip holdings={currentHoldings} onTap={() => setTab('portfolio')} />
        : (
          <div style={{
            padding: '8px 12px',
            background: '#f8fafc',
            borderBottom: '1.5px solid var(--line)',
            fontSize: 11.5,
            color: 'var(--muted)',
            fontStyle: 'italic',
          }}>
            💼 Your holdings will appear here once you buy a stock.
          </div>
        )
      }

      {journey.length >= 1 && <WorthChart history={journey} />}

      {/* Lock button — with a 5-second UNDO window after locking */}
      <div className="lock-zone">
        {isLocked
          ? <LockedBadge me={me} state={state} />
          : <button className="lock-btn" aria-label="Lock in my trades for this round" onClick={() => setLockConfirm(true)}>
              🔒 Lock in my trades
            </button>
        }
        {!isLocked && roundTrades.length > 0 && (
          <button
            aria-label="Undo last trade"
            onClick={() => {
              window.StockRush.undoLastTrade(me.id);
              setRoundTrades(prev => prev.slice(0, -1));
            }}
            style={{
              marginTop: 8,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1.5px solid var(--ink)',
              background: '#fff',
              color: 'var(--ink)',
              fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >↶ Undo last trade</button>
        )}
        <div className="lock-hint muted small">
          {isLocked
            ? 'Relax until the next round.'
            : roundTrades.length > 0
              ? `Press when done. ${roundTrades.length} trade${roundTrades.length !== 1 ? 's' : ''} this round.`
              : "Press when you're done trading."}
        </div>
      </div>

      {/* Tabs */}
      {!isLocked && (
        <>
          <div className="tab-row">
            <button className={'tab' + (tab === 'trade'     ? ' active' : '')} onClick={() => setTab('trade')}>Trade</button>
            <button className={'tab' + (tab === 'portfolio' ? ' active' : '')} onClick={() => setTab('portfolio')}>
              Portfolio {currentHoldings.length > 0 && <span className="badge">{currentHoldings.length}</span>}
            </button>
            <button className={'tab' + (tab === 'news'      ? ' active' : '')} onClick={() => setTab('news')}>
              News {state.news?.length > 0 && <span className="badge">{state.news.length}</span>}
            </button>
          </div>
          {tab === 'trade'     && <TradeList me={player} state={state} allStocks={allStocks} onTrade={openSheet} />}
          {tab === 'portfolio' && <PortfolioList me={player} state={state} allStocks={allStocks} />}
          {tab === 'news'      && <PlayerNewsList state={state} me={player} />}
        </>
      )}
      {isLocked && (
        <LockedExperience
          me={player}
          state={state}
          allStocks={allStocks}
          roundTrades={roundTrades}
          tab={tab}
          setTab={setTab}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCKED EXPERIENCE — what students see after locking in, while waiting
// ─────────────────────────────────────────────────────────────────────────────

function LockedExperience({ me, state, allStocks, roundTrades, tab, setTab }) {
  // Normalise tab — if the student was on 'trade' when locked, jump to 'waiting'
  const lockedTab = (tab === 'portfolio' || tab === 'news' || tab === 'waiting') ? tab : 'waiting';

  return (
    <>
      <div className="tab-row">
        <button className={'tab' + (lockedTab === 'waiting'   ? ' active' : '')} onClick={() => setTab('waiting')}>
          Waiting room
        </button>
        <button className={'tab' + (lockedTab === 'portfolio' ? ' active' : '')} onClick={() => setTab('portfolio')}>
          Portfolio
        </button>
        <button className={'tab' + (lockedTab === 'news'      ? ' active' : '')} onClick={() => setTab('news')}>
          News {state.news?.length > 0 && <span className="badge">{state.news.length}</span>}
        </button>
      </div>
      {lockedTab === 'waiting'   && <WaitingRoom me={me} state={state} allStocks={allStocks} roundTrades={roundTrades} />}
      {lockedTab === 'portfolio' && <PortfolioList me={me} state={state} allStocks={allStocks} canTrade={false} />}
      {lockedTab === 'news'      && <PlayerNewsList state={state} me={me} />}
    </>
  );
}

function WaitingRoom({ me, state, allStocks, roundTrades }) {
  // Compute live total + P&L so the recap card shows where the student ended
  const player = state.players?.[me.id] || me;
  const cash = player.cash || 0;
  const stocksVal = allStocks.reduce((s, stk) => s + (player.holdings?.[stk.id] || 0) * stk.price, 0);
  const total = cash + stocksVal;
  const pnl   = total - window.GAME_CONFIG.startingCash;
  return (
    <div style={{ padding: '12px 14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <YourRecapCard trades={roundTrades} me={me} total={total} pnl={pnl} />
      <ClassPulseCard state={state} allStocks={allStocks} me={me} />
      <DidYouKnowCard />
    </div>
  );
}

// ── Card 1: Your recap of the round just locked ─────────────────────────────
function YourRecapCard({ trades, me, total, pnl }) {
  const buyCount  = trades.filter(t => t.mode === 'buy').length;
  const sellCount = trades.filter(t => t.mode === 'sell').length;
  const spent     = trades.filter(t => t.mode === 'buy').reduce((s, t) => s + t.total, 0);
  const received  = trades.filter(t => t.mode === 'sell').reduce((s, t) => s + t.total, 0);
  const pnlUp     = (pnl ?? 0) >= 0;

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid var(--line)',
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>📋</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Your round, on rewind</span>
      </div>

      {trades.length === 0 ? (
        <div style={{
          padding: '12px 10px', background: '#fef3c7', border: '1px solid #fde68a',
          borderRadius: 8, fontSize: 12.5, color: '#92400e', lineHeight: 1.5,
        }}>
          You sat this round out — no trades made.<br />
          <span style={{ color: '#a16207' }}>Sometimes that’s the right call. Sometimes it’s a missed chance. The next round will tell.</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
            <RecapStat label="Trades" value={trades.length} />
            <RecapStat label="Buys"   value={buyCount}  tone={buyCount > 0 ? 'up' : 'neutral'} />
            <RecapStat label="Sells"  value={sellCount} tone={sellCount > 0 ? 'down' : 'neutral'} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {trades.map((t, i) => {
              const buy = t.mode === 'buy';
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '22px auto 1fr auto', gap: 8, alignItems: 'center',
                  fontSize: 12.5, padding: '4px 0',
                }}>
                  <span style={{ fontSize: 14, textAlign: 'center' }}>{t.stock.emoji}</span>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 3, letterSpacing: '0.06em',
                    color: buy ? '#15803d' : '#b91c1c',
                    background: buy ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                  }}>{buy ? 'BUY' : 'SELL'}</span>
                  <span style={{ color: '#334155' }}>{t.qty} × <b>{t.stock.id}</b></span>
                  <span style={{ fontFamily: 'Geist Mono, ui-monospace', color: buy ? '#b91c1c' : '#15803d', fontSize: 12 }}>
                    {buy ? '-' : '+'}{formatMoney(t.total)}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(15,23,42,0.03)', borderLeft: '3px solid #cbd5e1',
            borderRadius: '0 6px 6px 0',
            fontSize: 12, color: '#475569', fontStyle: 'italic', lineHeight: 1.5,
          }}>
            Spent <b>{formatMoney(spent)}</b>, received <b>{formatMoney(received)}</b>.{' '}
            {buyCount > 0 && sellCount > 0 ? 'You did both — repositioning.' :
             buyCount > sellCount ? 'You went on a buying spree.' :
             'You took some money off the table.'}
          </div>
          {total != null && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: pnlUp ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
              border: `1px solid ${pnlUp ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12.5,
            }}>
              <span style={{ color: '#475569' }}>You're now at</span>
              <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, color: '#0f172a' }}>
                {formatMoney(total)}
                <span style={{ marginLeft: 6, color: pnlUp ? '#15803d' : '#b91c1c', fontSize: 11 }}>
                  {pnlUp ? '▲' : '▼'} {formatMoney(Math.abs(pnl))}
                </span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecapStat({ label, value, tone }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace' }}>{value}</div>
    </div>
  );
}

// ── Card 2: Class pulse — anonymous aggregate of what classmates did ────────
function ClassPulseCard({ state, allStocks, me }) {
  // A5.2 — Delayed reveal. While the round is still live (player has locked,
  // but the round hasn't resolved yet → state.phase still 'playing'), hide the
  // raw counts behind a "Tap to peek (N of 3)" gate. After 3 peeks OR once the
  // round resolves (state.phase === 'ended'), counts are visible permanently.
  // Intent: stop students from copy-trading the herd before resolution.
  const [peeks, setPeeks] = React.useState(0);
  const PEEK_MAX = 3;
  const roundResolved = state.phase === 'ended';
  const revealed = roundResolved || peeks >= PEEK_MAX;

  // Aggregate this round's net buying / selling across all players (humans + bots)
  // using the roundStart snapshot we added in the engine.
  const tally = {}; // { tickerId: { buys: 0, sells: 0 } }
  const players = Object.values(state.players || {});
  for (const p of players) {
    const startH = p.roundStartHoldings || {};
    const curH   = p.holdings || {};
    const keys = new Set([...Object.keys(startH), ...Object.keys(curH)]);
    for (const k of keys) {
      const delta = (curH[k] || 0) - (startH[k] || 0);
      if (delta === 0) continue;
      if (!tally[k]) tally[k] = { buys: 0, sells: 0 };
      if (delta > 0) tally[k].buys += 1;
      else tally[k].sells += 1;
    }
  }
  // Rank by total activity
  const ranked = Object.entries(tally)
    .map(([id, v]) => ({ id, ...v, total: v.buys + v.sells, stock: allStocks.find(s => s.id === id) }))
    .filter(x => x.stock)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalPlayers = players.length;
  const tradedSomething = players.filter(p => {
    const startH = p.roundStartHoldings || {};
    const curH   = p.holdings || {};
    const keys = new Set([...Object.keys(startH), ...Object.keys(curH)]);
    for (const k of keys) if ((curH[k] || 0) !== (startH[k] || 0)) return true;
    return false;
  }).length;

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid var(--line)',
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>📊</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>What the class did</span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 10, fontFamily: 'Geist Mono, ui-monospace',
          color: 'var(--muted)', letterSpacing: '0.08em',
        }}>
          {tradedSomething}/{totalPlayers} TRADED
        </span>
      </div>

      {ranked.length === 0 ? (
        <div style={{ padding: 12, fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>
          Nobody traded this round. Classroom of cool heads, or sleepy fingers? 🤔
        </div>
      ) : !revealed && peeks === 0 ? (
        <button
          type="button"
          onClick={() => setPeeks(1)}
          aria-label="Peek at class pulse"
          style={{
            width: '100%',
            padding: '14px 12px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            border: '1.5px dashed #94a3b8',
            borderRadius: 10,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            👀 Tap to peek (1 of {PEEK_MAX})
          </span>
          <span style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
            Hidden so you trade your own head, not the herd.
          </span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranked.map(r => {
            const max = Math.max(...ranked.map(x => x.total));
            const buyW = (r.buys / max) * 100;
            const sellW = (r.sells / max) * 100;
            return (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '24px 56px 1fr 64px', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ fontSize: 14, textAlign: 'center' }}>{r.stock.emoji}</span>
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700 }}>{r.id}</span>
                <div style={{ display: 'flex', height: 14, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  {r.buys > 0 && <div style={{ width: buyW + '%', background: '#15803d' }} title={`${r.buys} bought`} />}
                  {r.sells > 0 && <div style={{ width: sellW + '%', background: '#b91c1c' }} title={`${r.sells} sold`} />}
                </div>
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                  {r.buys > 0 && <span style={{ color: '#15803d' }}>+{r.buys}</span>}
                  {r.buys > 0 && r.sells > 0 && ' '}
                  {r.sells > 0 && <span style={{ color: '#b91c1c' }}>-{r.sells}</span>}
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--line)' }}>
            <span style={{ color: '#15803d', fontWeight: 600 }}>Green</span> = bought · <span style={{ color: '#b91c1c', fontWeight: 600 }}>red</span> = sold. Just a snapshot of the room.
          </div>
          {!revealed && peeks > 0 && peeks < PEEK_MAX && (
            <button
              type="button"
              onClick={() => setPeeks(p => Math.min(PEEK_MAX, p + 1))}
              aria-label="Peek again at class pulse"
              style={{
                marginTop: 6,
                padding: '8px 10px',
                background: '#f8fafc',
                border: '1px dashed #94a3b8',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11.5,
                color: '#334155',
                fontWeight: 600,
              }}
            >
              👀 Peek again ({peeks + 1} of {PEEK_MAX})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Card 3: Did you know? — auto-rotating investing tips ───────────────────
function DidYouKnowCard() {
  const tips = window.WAITING_TIPS || [];
  const [i, setI] = React.useState(() => Math.floor(Math.random() * tips.length));
  React.useEffect(() => {
    if (tips.length < 2) return;
    const t = setInterval(() => setI(prev => (prev + 1) % tips.length), 8000);
    return () => clearInterval(t);
  }, [tips.length]);
  if (tips.length === 0) return null;
  const tip = tips[i];

  return (
    <div
      onClick={() => setI(prev => (prev + 1) % tips.length)}
      style={{
        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
        border: '1.5px solid #16a34a',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{tip.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{tip.title}</span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 10, fontFamily: 'Geist Mono, ui-monospace',
          color: '#15803d', letterSpacing: '0.08em', fontWeight: 700,
        }}>
          DID YOU KNOW?
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#334155' }}>
        {tip.body}
      </div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 10 }}>
        {tips.map((_, idx) => (
          <div key={idx} style={{
            width: idx === i ? 16 : 5, height: 5, borderRadius: 3,
            background: idx === i ? '#15803d' : '#cbd5e1',
            transition: 'width .25s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#15803d', textAlign: 'center', marginTop: 4, opacity: 0.7 }}>
        tap for next →
      </div>
    </div>
  );
}

// Locked badge with 5-second undo window — student can change their mind
function LockedBadge({ me, state }) {
  const lockedAt = state.lockTimes?.[me.id] || 0;
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const elapsed = (now - lockedAt) / 1000;
  const remaining = Math.max(0, Math.ceil(5 - elapsed));
  const canUndo = lockedAt > 0 && remaining > 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="locked-badge">🔒 Locked in — waiting for teacher</div>
      {canUndo && (
        <button
          onClick={() => window.StockRush.unlock(me.id)}
          aria-label="Undo lock and keep trading"
          style={{
            padding: '8px 12px',
            background: '#fff',
            border: '1.5px solid #d97706',
            borderRadius: 8,
            color: '#92400e',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            letterSpacing: '0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
          title="Change your mind and keep trading"
        >
          ↶ Undo lock ({remaining}s left)
        </button>
      )}
    </div>
  );
}

// Always-visible holdings strip — quick portfolio glance on every screen
function HoldingsStrip({ holdings, onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        background: '#f8fafc',
        borderBottom: '1.5px solid var(--line)',
        overflowX: 'auto',
        cursor: 'pointer',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <span style={{
        fontFamily: 'Geist Mono, ui-monospace', fontSize: 9,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--muted)', alignSelf: 'center', flexShrink: 0, marginRight: 4,
      }}>YOURS</span>
      {holdings.map(({ stock, qty, value }) => (
        <div key={stock.id} style={{
          flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 9px',
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
        }}>
          <span style={{ fontSize: 14 }}>{stock.emoji}</span>
          <span>{stock.id}</span>
          <span style={{ color: '#64748b', fontWeight: 600 }}>×{qty}</span>
          <span style={{ color: '#0f172a' }}>{formatMoney(value)}</span>
        </div>
      ))}
    </div>
  );
}

// Lock confirmation — review trades + portfolio before committing
function LockConfirmModal({ trades, holdings, cash, total, round, onCancel, onConfirm }) {
  const pnl = total - window.GAME_CONFIG.startingCash;
  const up  = pnl >= 0;

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
        position: 'fixed', inset: 0, zIndex: 1500,
        background: 'rgba(7,26,16,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
        animation: 'lc-fade 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          width: '100%', maxWidth: 520,
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.28)',
          animation: 'lc-rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: '#e2e8f0', borderRadius: 2,
          margin: '7px auto 4px', flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{ padding: '2px 16px 9px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 2 }}>
            Round {round} · Review
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Lock in your trades?
          </div>
        </div>

        {/* Scrollable middle content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {/* Trades this round */}
          <div style={{ padding: '10px 16px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
              This round ({trades.length} trade{trades.length !== 1 ? 's' : ''})
            </div>
            {trades.length === 0 ? (
              <div style={{
                padding: '10px 11px',
                background: '#fef3c7', border: '1px solid #fde68a',
                borderRadius: 7, fontSize: 12.5, color: '#92400e',
                textAlign: 'center',
              }}>
                ⚠️ You haven't traded yet this round. Sure you want to lock?
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(trades.length > 6 ? trades.slice(-6) : trades).map((t, i) => {
                  const buy = t.mode === 'buy';
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '24px auto 1fr auto', gap: 8,
                      alignItems: 'center',
                      padding: '6px 9px',
                      background: buy ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                      border: `1px solid ${buy ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                      borderRadius: 7,
                    }}>
                      <span style={{ fontSize: 16, textAlign: 'center' }}>{t.stock.emoji}</span>
                      <span style={{
                        fontFamily: 'Geist Mono, ui-monospace', fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: buy ? '#15803d' : '#b91c1c',
                        padding: '2px 5px', borderRadius: 3,
                        background: buy ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)',
                      }}>{buy ? 'BUY' : 'SELL'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {t.qty} × <span style={{ fontFamily: 'Geist Mono, ui-monospace' }}>{t.stock.id}</span>
                      </span>
                      <span style={{
                        fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                        color: buy ? '#b91c1c' : '#15803d',
                      }}>
                        {buy ? '-' : '+'}{formatMoney(t.total)}
                      </span>
                    </div>
                  );
                })}
                {trades.length > 6 && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '2px 0' }}>
                    + {trades.length - 6} earlier trade{trades.length - 6 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Portfolio summary */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
              After locking — your portfolio
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 7,
            }}>
              <div style={{ padding: '6px 9px', background: '#f1f5f9', borderRadius: 6 }}>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Cash</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>{formatMoney(cash)}</div>
              </div>
              <div style={{ padding: '6px 9px', background: '#f1f5f9', borderRadius: 6 }}>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>{formatMoney(total)}</div>
              </div>
              <div style={{
                padding: '6px 9px',
                background: up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>P&amp;L</div>
                <div style={{
                  fontSize: 13, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace',
                  color: up ? '#15803d' : '#b91c1c',
                }}>
                  {up ? '+' : ''}{formatMoney(pnl)}
                </div>
              </div>
            </div>

            {holdings.length === 0 ? (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', padding: 6 }}>
                No stocks held — you're 100% cash.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {holdings.map(({ stock, qty, value }) => (
                  <div key={stock.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 8px',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 5,
                    fontFamily: 'Geist Mono, ui-monospace', fontSize: 10.5, fontWeight: 700,
                  }}>
                    <span style={{ fontSize: 13 }}>{stock.emoji}</span>
                    <span>{stock.id}</span>
                    <span style={{ color: '#64748b' }}>×{qty}</span>
                    <span>· {formatMoney(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* News-incoming heads-up strip (pinned) */}
        <div style={{
          margin: '0 16px 7px',
          padding: '6px 11px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: 7,
          color: '#92400e',
          fontSize: 12,
          fontWeight: 600,
          textAlign: 'center',
          flexShrink: 0,
        }}>
          📰 News drops next — your portfolio rides on these choices.
        </div>

        {/* Actions (pinned) */}
        <div style={{
          display: 'flex', gap: 9,
          padding: '0 16px 14px',
          background: '#fff',
          flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 9,
              border: '2px solid var(--ink)',
              background: '#fff',
              color: 'var(--ink)',
              fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Keep trading
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 9,
              border: '2px solid var(--ink)',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(7,26,16,0.32)',
            }}
          >
            🔒 Lock in trades
          </button>
        </div>

        <style>{`
          @keyframes lc-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes lc-rise {
            from { transform: translateY(40px); opacity: 0 }
            to   { transform: translateY(0);     opacity: 1 }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Trade list ────────────────────────────────────────────────────────────────

function TradeList({ me, state, allStocks, onTrade }) {
  const [sortBy, setSortBy] = React.useState('default');

  // Look up cap from window.STOCKS if state.stocks doesn't carry it (old saved games)
  const capById = Object.fromEntries((window.STOCKS || []).map(s => [s.id, s.cap]));
  const capOf = s => s.cap || capById[s.id] || 'other';

  // Build a sorted copy of allStocks based on the active chip. When the user
  // chooses an explicit sort we render a single flat list (groups don't make
  // sense once order is overridden). Default keeps the cap-grouped layout.
  const sortedStocks = React.useMemo(() => {
    const arr = [...allStocks];
    if (sortBy === 'name')   arr.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    if (sortBy === 'price')  arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === 'sector') arr.sort((a, b) => (a.sector || '').localeCompare(b.sector || ''));
    return arr;
  }, [allStocks, sortBy]);

  let groups;
  if (sortBy !== 'default') {
    groups = [{ label: null, stocks: sortedStocks }];
  } else {
    groups = [
      { label: 'Large cap', stocks: allStocks.filter(s => capOf(s) === 'large') },
      { label: 'Mid cap',   stocks: allStocks.filter(s => capOf(s) === 'mid')   },
      { label: 'Small cap', stocks: allStocks.filter(s => capOf(s) === 'small') },
      { label: 'Other',     stocks: allStocks.filter(s => !['large','mid','small'].includes(capOf(s))) },
    ].filter(g => g.stocks.length > 0);

    // Final safety net — if everything still ungrouped, just dump all
    if (groups.length === 0 && allStocks.length > 0) {
      groups = [{ label: 'Stocks', stocks: allStocks }];
    }
  }

  const chipBase = {
    padding: '5px 11px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#475569',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: 'Geist Mono, ui-monospace',
  };
  const chipActive = {
    background: 'var(--ink)',
    color: '#fff',
    borderColor: 'var(--ink)',
  };
  const chips = [
    { id: 'default', label: 'Default' },
    { id: 'name',    label: 'Name' },
    { id: 'price',   label: 'Price' },
    { id: 'sector',  label: 'Sector' },
  ];

  return (
    <div className="trade-list">
      <div style={{
        display: 'flex', gap: 6, padding: '10px 12px 4px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginRight: 4,
        }}>Sort</span>
        {chips.map(c => (
          <button
            key={c.id}
            onClick={() => setSortBy(c.id)}
            aria-label={`Sort stocks by ${c.label}`}
            aria-pressed={sortBy === c.id}
            style={{ ...chipBase, ...(sortBy === c.id ? chipActive : {}) }}
          >{c.label}</button>
        ))}
      </div>
      {groups.map((g, gi) => (
        <div key={g.label || `g${gi}`}>
          {g.label && <div className="trade-group-label">{g.label}</div>}
          {g.stocks.map(s => (
            <TradeCard key={s.id} stock={s} me={me} state={state} onTrade={onTrade} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Trade card ────────────────────────────────────────────────────────────────

function TradeCard({ stock, me, state, onTrade }) {
  const [expanded, setExpanded] = React.useState(false);
  const held    = (me.holdings || {})[stock.id] || 0;
  const avgCost = (me.holdingsCost || {})[stock.id];
  const canBuy  = (me.cash || 0) >= stock.price;
  const prev    = stock.prevPrice || stock.price;
  const diff    = stock.price - prev;
  const pct     = prev ? (diff / prev) * 100 : 0;
  const priceUp = diff >= 0;
  const holdPnl = held > 0 && avgCost != null ? (stock.price - avgCost) * held : null;
  const holdUp  = holdPnl == null ? null : holdPnl >= 0;

  // "What's moving this stock this round" — pull from the latest news event
  const latestNews = state?.news?.[0];
  const thisRoundNote = latestNews?.stockNotes?.[stock.id];

  return (
    <div
      className={'trade-card' + (held > 0 ? ' holding' : '') + (expanded ? ' expanded' : '')}
      onClick={() => setExpanded(e => !e)}
      role="button"
      aria-expanded={expanded}
    >
      <div className="tc-left">
        <div className="tc-emoji">{stock.emoji}</div>
        <div className="tc-info">
          <div className="tc-id" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{stock.id}</span>
            <span className="tc-name" style={{ marginRight: 4 }}>{stock.name}</span>
            <SectorTag sector={stock.sector} />
          </div>
          <div className="tc-price-row">
            <span className="tc-price">₹{stock.price.toLocaleString('en-IN')}</span>
            {Math.abs(pct) > 0.01
              ? <span className={'tc-delta ' + (priceUp ? 'up' : 'down')}>
                  {priceUp ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
                </span>
              : <span className="tc-delta" style={{ color: 'var(--muted)' }}>—</span>
            }
            <span style={{
              marginLeft: 'auto', fontSize: 11, color: 'var(--muted)',
              fontFamily: 'Geist Mono, ui-monospace',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform .15s',
            }}>▾</span>
          </div>
          {held > 0 && (
            <div className={'tc-holding' + (holdUp === true ? ' profit' : holdUp === false ? ' loss' : '')}>
              {held} held
              {holdPnl != null && (
                <span className="tc-held-pnl">
                  {' '}{holdPnl >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(holdPnl))}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* BUY/SELL only show when card is collapsed — while reading the
         company details, the buttons are hidden so they don't distract. */}
      {!expanded && (
        <div className="tc-btns">
          <button
            className={'tc-buy-btn' + (!canBuy ? ' cant' : '')}
            onClick={(e) => { e.stopPropagation(); if (canBuy) onTrade(stock, 'buy'); }}
          >
            BUY
          </button>
          {held > 0 && (
            <button className="tc-sell-btn" onClick={(e) => { e.stopPropagation(); onTrade(stock, 'sell'); }}>
              SELL
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div style={{
          flexBasis: '100%',
          width: '100%',
          margin: '4px -16px -14px',
          padding: '10px 14px 12px',
          background: 'rgba(15,23,42,0.025)',
          borderTop: '1px dashed rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column', gap: 8,
          fontSize: 12.5, lineHeight: 1.5, color: '#334155',
        }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginRight: 6 }}>ABOUT</span>
            {stock.desc}
          </div>
          {stock.fun && (
            <div style={{ padding: '6px 9px', background: '#fef3c7', borderRadius: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: '#92400e', fontFamily: 'Geist Mono, ui-monospace', marginRight: 6 }}>💡 FUN FACT</span>
              {stock.fun}
            </div>
          )}
          {thisRoundNote?.why && (
            <div style={{ padding: '6px 9px', background: thisRoundNote.move >= 0 ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)', borderRadius: 6, borderLeft: `3px solid ${thisRoundNote.move >= 0 ? '#15803d' : '#b91c1c'}` }}>
              <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: thisRoundNote.move >= 0 ? '#15803d' : '#b91c1c', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 3 }}>
                📰 THIS ROUND · {thisRoundNote.move >= 0 ? '▲ +' : '▼ '}{thisRoundNote.move}%
              </div>
              <div style={{ color: '#334155' }}>{thisRoundNote.why}</div>
            </div>
          )}
          {stock.watch && !thisRoundNote && (
            <div style={{ padding: '6px 9px', borderLeft: '3px solid #cbd5e1', background: 'rgba(0,0,0,0.02)' }}>
              <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginRight: 6 }}>👀 WATCH FOR</span>
              {stock.watch}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Trade sheet (bottom drawer) ───────────────────────────────────────────────

function TradeSheet({ stock, me, state, initialMode, onClose, onDone }) {
  const [mode, setMode] = React.useState(initialMode || 'buy');
  const [qty,  setQty]  = React.useState(0);

  const held    = (me.holdings || {})[stock.id] || 0;
  const maxBuy  = stock.price > 0 ? Math.floor((me.cash || 0) / stock.price) : 0;
  const maxSell = held;
  const max     = mode === 'buy' ? maxBuy : maxSell;
  const effQty  = Math.min(qty, max);
  const total   = effQty * stock.price;
  const cashAfter = mode === 'buy' ? (me.cash || 0) - total : (me.cash || 0) + total;
  const canConfirm = effQty >= 1;

  function addQty(n)     { setQty(q => Math.min(q + n, max)); }
  function setMax()      { setQty(max); }
  function switchMode(m) { setMode(m); setQty(0); }

  function confirm() {
    if (!canConfirm) return;
    if (mode === 'buy')  window.StockRush.trade(me.id, stock.id,  effQty);
    if (mode === 'sell') window.StockRush.trade(me.id, stock.id, -effQty);
    onDone({ mode, stock, qty: effQty, total });
    onClose();
  }

  const prev    = stock.prevPrice || stock.price;
  const diff    = stock.price - prev;
  const pct     = prev ? (diff / prev) * 100 : 0;
  const priceUp = diff >= 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="trade-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle-bar" />

        {/* Stock header */}
        <div className="sheet-header">
          <span className="sheet-emoji">{stock.emoji}</span>
          <div className="sheet-stock-info">
            <div className="sheet-ticker" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{stock.id}</span>
              <span className="sheet-sname">· {stock.name}</span>
              <SectorTag sector={stock.sector} />
            </div>
            <div className="sheet-price-row">
              <span className="sheet-price">₹{stock.price.toLocaleString('en-IN')}</span>
              {Math.abs(pct) > 0.01 && (
                <span className={'sheet-delta ' + (priceUp ? 'up' : 'down')}>
                  {priceUp ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Balance bar */}
        <div className="sheet-balance">
          <span>💵 Cash: <b>{formatMoney(me.cash)}</b></span>
          {held > 0 && <span className="sheet-balance-held"> · {held} shares held</span>}
        </div>

        {/* BUY / SELL tab toggle */}
        <div className="sheet-tabs">
          <button
            className={'sheet-tab buy' + (mode === 'buy' ? ' active' : '')}
            onClick={() => switchMode('buy')}
          >BUY</button>
          <button
            className={'sheet-tab sell' + (mode === 'sell' ? ' active' : '') + (held === 0 ? ' dimmed' : '')}
            onClick={() => held > 0 && switchMode('sell')}
          >
            SELL{held > 0 ? ` · ${held} held` : ' · nothing held'}
          </button>
        </div>

        {/* % presets — quick-fill qty as a fraction of buying power (BUY) or holdings (SELL) */}
        <div style={{
          display: 'flex', gap: 5, padding: '5px 14px 0', flexWrap: 'wrap',
        }}>
          {[
            { label: '25%', pct: 0.25 },
            { label: '50%', pct: 0.50 },
            { label: '75%', pct: 0.75 },
            { label: 'ALL', pct: 1.00 },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => {
                const base = mode === 'buy'
                  ? (stock.price > 0 ? Math.floor(((me.cash || 0) * p.pct) / stock.price) : 0)
                  : Math.floor((((me.holdings || {})[stock.id]) || 0) * p.pct);
                setQty(Math.max(0, base));
              }}
              style={{
                flex: 1, minWidth: 50,
                padding: '5px 9px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: 11.5, fontWeight: 700,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                fontFamily: 'Geist Mono, ui-monospace',
              }}
            >{p.label}</button>
          ))}
        </div>

        {/* Big quantity picker */}
        <div className="sheet-qty-row">
          <button className="sheet-nudge" onClick={() => setQty(q => Math.max(0, q - 1))}>−</button>
          <div className="sheet-qty-num">{qty}</div>
          <button className="sheet-nudge" onClick={() => addQty(1)}>+</button>
        </div>

        {/* "What if news drops" preview — ±15% range for the qty currently picked */}
        {mode === 'buy' && effQty > 0 && (
          <div style={{
            padding: '2px 14px 0',
            fontSize: 10.5,
            color: '#64748b',
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}>
            If R{(state?.round || 1) + 1} brings news, your {formatMoney(total)} could become ~{formatMoney(Math.round(total * 1.15))} to ~{formatMoney(Math.round(total * 0.85))}
          </div>
        )}

        {/* Quick-add presets */}
        <div className="sheet-presets">
          {[1, 5, 10, 25].map(n => (
            <button key={n} className="sheet-preset" onClick={() => addQty(n)}>+{n}</button>
          ))}
          <button className="sheet-preset max" onClick={setMax}>MAX</button>
          <button
            className="sheet-preset clear"
            onClick={() => setQty(0)}
            style={{ visibility: qty > 0 ? 'visible' : 'hidden' }}
            aria-hidden={qty === 0}
            tabIndex={qty === 0 ? -1 : 0}
          >✕</button>
        </div>

        {/* Contextual hint */}
        <div className="sheet-hint">
          {mode === 'buy'
            ? (maxBuy === 0
                ? '⚠️ Not enough cash for 1 share'
                : `You can afford up to ${maxBuy} share${maxBuy !== 1 ? 's' : ''}`)
            : (held === 0
                ? 'You don\'t hold any ' + stock.id
                : `You hold ${held} shares`)}
        </div>

        {/* Cost summary — always rendered so layout doesn't jump */}
        <div
          className="sheet-summary"
          style={{ visibility: effQty > 0 ? 'visible' : 'hidden' }}
          aria-hidden={effQty === 0}
        >
          <div className="sheet-sum-row">
            <span>{mode === 'buy' ? 'Total cost' : 'You receive'}</span>
            <b>{effQty > 0 ? formatMoney(total) : ''}</b>
          </div>
          <div className="sheet-sum-row">
            <span>Cash after</span>
            <b className={effQty > 0 && cashAfter < 0 ? 'warn' : ''}>{effQty > 0 ? formatMoney(cashAfter) : ''}</b>
          </div>
        </div>

        {/* Confirm button */}
        <button
          className={'sheet-confirm ' + mode + (!canConfirm ? ' disabled' : '')}
          onClick={confirm}
          disabled={!canConfirm}
        >
          {canConfirm
            ? (mode === 'buy'
                ? `✓  Buy ${effQty} × ${stock.id}  ·  ${formatMoney(total)}`
                : `✓  Sell ${effQty} × ${stock.id}  ·  Receive ${formatMoney(total)}`)
            : 'Tap + to choose a quantity'}
        </button>
      </div>
    </div>
  );
}

// ── Trade toast (success flash) ───────────────────────────────────────────────

function TradeToast({ trade, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  const buy = trade.mode === 'buy';
  return (
    <div className={'trade-toast ' + (buy ? 'toast-buy' : 'toast-sell')}>
      <div className="tt-icon">{buy ? '✅' : '💰'}</div>
      <div className="tt-body">
        <div className="tt-headline">
          {buy ? 'Bought' : 'Sold'} {trade.qty} × {trade.stock.id}
        </div>
        <div className="tt-sub">
          {formatMoney(trade.total)} {buy ? 'spent' : 'received'}
        </div>
      </div>
    </div>
  );
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

function PortfolioList({ me, state, allStocks, canTrade = true }) {
  const holdings     = me.holdings || {};
  const holdingsCost = me.holdingsCost || {};

  const rows = allStocks
    .filter(s => (holdings[s.id] || 0) > 0)
    .map(s => {
      const qty      = holdings[s.id];
      const avgCost  = holdingsCost[s.id] || s.price;
      const curPrice = s.price;
      const pnlPer   = curPrice - avgCost;
      const pnlPct   = avgCost ? (pnlPer / avgCost) * 100 : 0;
      const totalVal = qty * curPrice;
      const totalPnl = qty * pnlPer;
      return { stock: s, qty, avgCost, curPrice, pnlPct, totalVal, totalPnl };
    });

  if (rows.length === 0) {
    return <div className="empty">No holdings yet. Go to Trade to buy something.</div>;
  }

  function sellAll(stockId, qty) {
    if (!canTrade) return;
    if (!window.confirm(`Sell all ${qty} shares of ${stockId} at the current price?`)) return;
    window.StockRush.trade(me.id, stockId, -qty);
  }

  return (
    <div className="portfolio-list">
      {rows.map(({ stock, qty, avgCost, curPrice, pnlPct, totalVal, totalPnl }) => {
        const up = totalPnl >= 0;
        return (
          <div className="portfolio-row" key={stock.id}>
            <div className="pf-top">
              <div className="trade-mark" style={{ fontSize: 22, lineHeight: 1 }}>{stock.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trade-ticker" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span>{stock.id}</span>
                  <span className="muted small">{stock.name}</span>
                  <SectorTag sector={stock.sector} />
                </div>
                <div className="pf-qty">{qty} share{qty !== 1 ? 's' : ''}</div>
              </div>
              <div className="pf-total">
                <div className="pf-total-val">{formatMoney(totalVal)}</div>
                <div className={'pf-pnl ' + (up ? 'up' : 'down')}>
                  {up ? '▲' : '▼'} {formatMoney(Math.abs(totalPnl))}
                </div>
              </div>
            </div>
            <div className="pf-prices">
              <div className="pf-price-cell">
                <div className="pf-price-label">Avg buy</div>
                <div className="pf-price-val">{formatMoney(avgCost)}</div>
              </div>
              <div className="pf-price-arrow">→</div>
              <div className="pf-price-cell">
                <div className="pf-price-label">Now</div>
                <div className={'pf-price-val ' + (up ? 'up' : 'down')}>{formatMoney(curPrice)}</div>
              </div>
              <div className={'pf-pct-badge ' + (up ? 'up' : 'down')}>
                {up ? '+' : ''}{pnlPct.toFixed(1)}%
              </div>
              {canTrade && (
                <button
                  onClick={() => sellAll(stock.id, qty)}
                  style={{
                    padding: '5px 9px',
                    background: '#fff',
                    border: '1.5px solid #dc2626',
                    color: '#dc2626',
                    borderRadius: 6,
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    marginLeft: 6,
                  }}
                  title={`Sell all ${qty} shares now`}
                >
                  SELL ALL
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── News list ─────────────────────────────────────────────────────────────────

function PlayerNewsList({ state, me }) {
  if (!state.news?.length) {
    return (
      <div style={{ padding: 28, textAlign: 'center', color: 'var(--muted)' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📰</div>
        <div style={{ fontSize: 13 }}>No headlines yet. Watch this space.</div>
      </div>
    );
  }
  const latest = state.news[0];
  const older = state.news.slice(1);

  return (
    <div style={{ padding: '8px 12px 16px' }}>
      {/* Hero — latest headline */}
      <NewsHero news={latest} me={me} />

      {older.length > 0 && (
        <>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: '18px 4px 8px', fontFamily: 'Geist Mono, ui-monospace' }}>
            Earlier headlines
          </div>
          {older.map(n => <NewsCompactItem key={n.round} news={n} />)}
        </>
      )}
    </div>
  );
}

function NewsHero({ news, me }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 60%, #fcd34d 100%)',
      borderRadius: 14,
      padding: '14px 16px',
      boxShadow: '0 6px 18px rgba(252,211,77,0.32)',
      border: '1px solid rgba(217,119,6,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#dc2626', animation: 'pn-pulse 1.6s infinite',
        }} />
        <span style={{ fontSize: 10, letterSpacing: '0.16em', fontWeight: 800, color: '#92400e', fontFamily: 'Geist Mono, ui-monospace' }}>
          BREAKING · ROUND {news.round}
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 8 }}>
        {news.headline}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#3f3f46', marginBottom: 12 }}>
        {news.body}
      </div>
      {news.impacts && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {Object.entries(news.impacts).map(([tk, mult]) => {
            const up = mult >= 1;
            return (
              <div key={tk} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 9px',
                background: up ? '#16a34a' : '#dc2626',
                color: '#fff',
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
                borderRadius: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}>
                {tk} {up ? '▲' : '▼'} {up ? '+' : ''}{((mult-1)*100).toFixed(0)}%
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 8, borderTop: '1px dashed rgba(146,64,14,0.25)' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#92400e', fontWeight: 600, marginRight: 4 }}>REACT</span>
        {['🔥','😱','🎉'].map(e => (
          <button
            key={e}
            onClick={() => window.StockRush.react(me.id, e)}
            style={{
              background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(146,64,14,0.2)',
              borderRadius: 8, padding: '3px 8px', fontSize: 16, cursor: 'pointer',
              transition: 'transform .12s',
            }}
            onMouseDown={(ev) => ev.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(ev) => ev.currentTarget.style.transform = 'scale(1)'}
          >{e}</button>
        ))}
      </div>
      <style>{`@keyframes pn-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}

function NewsCompactItem({ news }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: 10,
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontWeight: 700, fontSize: 10,
          padding: '2px 6px',
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: 4,
          color: 'var(--muted)',
        }}>R{news.round}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: 'var(--ink)', marginBottom: 6 }}>
        {news.headline}
      </div>
      {news.impacts && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Object.entries(news.impacts).map(([tk, mult]) => {
            const up = mult >= 1;
            return (
              <span key={tk} style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 4,
                background: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                color: up ? '#15803d' : '#b91c1c',
              }}>
                {tk} {up ? '+' : ''}{((mult-1)*100).toFixed(0)}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── News toast ────────────────────────────────────────────────────────────────

function NewsToast({ news, onReact, onClose }) {
  const [reacted, setReacted] = React.useState(null);
  // Buzz the phone on display — gives haptic feedback for big news drops
  React.useEffect(() => {
    try { navigator.vibrate?.([60, 40, 60]); } catch(e){}
  }, [news?.round]);
  return (
    <div role="alert" aria-live="assertive" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      maxHeight: '40vh',
      overflowY: 'auto',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      borderTopLeftRadius: 16, borderTopRightRadius: 16,
      padding: '12px 14px 14px',
      boxShadow: '0 -10px 30px rgba(0,0,0,0.18), 0 -4px 8px rgba(252,211,77,0.32)',
      borderTop: '1px solid rgba(217,119,6,0.3)',
      animation: 'nt-slide 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: '#dc2626', animation: 'pn-pulse 1.6s infinite',
        }} />
        <span style={{ fontSize: 10, letterSpacing: '0.16em', fontWeight: 800, color: '#92400e', fontFamily: 'Geist Mono, ui-monospace' }}>
          BREAKING · ROUND {news.round}
        </span>
        <span style={{ flex: 1 }} />
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close news"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#fff',
              border: '2px solid #92400e',
              color: '#92400e',
              fontSize: 16, fontWeight: 800,
              cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(146,64,14,0.25)',
            }}
            title="Tap when you've read this"
          >✕</button>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: '#0f172a', marginBottom: 10, letterSpacing: '-0.01em' }}>
        {news.headline}
      </div>
      {news.impacts && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {Object.entries(news.impacts).map(([tk, mult]) => {
            const up = mult >= 1;
            return (
              <div key={tk} style={{
                padding: '3px 8px',
                background: up ? '#16a34a' : '#dc2626',
                color: '#fff',
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                borderRadius: 5,
              }}>
                {tk} {up ? '+' : ''}{((mult-1)*100).toFixed(0)}%
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#92400e', fontWeight: 600, marginRight: 4 }}>REACT</span>
        {['🔥','😱','🎉'].map(e => (
          <button
            key={e}
            onClick={() => { setReacted(e); onReact(e); }}
            style={{
              background: reacted === e ? '#fff' : 'rgba(255,255,255,0.55)',
              border: reacted === e ? '1.5px solid #d97706' : '1px solid rgba(146,64,14,0.2)',
              borderRadius: 8, padding: '4px 9px', fontSize: 17, cursor: 'pointer',
              transform: reacted === e ? 'scale(1.05)' : 'scale(1)',
              transition: 'all .15s',
            }}
          >{e}</button>
        ))}
      </div>
      <style>{`
        @keyframes nt-slide {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Worth chart ───────────────────────────────────────────────────────────────

function WorthChart({ history }) {
  // Single-point case (R1, no rounds played yet): the line+gradient render
  // looks broken. Show a placeholder dot + label instead.
  if (history.length === 1) {
    const cfg = window.GAME_CONFIG;
    const v = history[0];
    return (
      <div className="worth-chart-wrap">
        <div className="worth-chart-head">
          <span className="worth-chart-title">Your journey</span>
          <span className="worth-chart-badge" style={{ color: 'var(--muted)' }}>
            {formatMoney(v)}
          </span>
        </div>
        <svg viewBox="0 0 320 80" width="100%" height="auto" style={{ display: 'block' }}>
          <circle cx="160" cy="32" r="6" fill="#fff" stroke="#94a3b8" strokeWidth="2" />
          <circle cx="160" cy="32" r="3" fill="#94a3b8" />
          <text x="160" y="60" textAnchor="middle"
            fontSize="11" fill="#64748b"
            fontFamily="Geist Mono, monospace">
            R1 — game just started
          </text>
        </svg>
      </div>
    );
  }

  const cfg        = window.GAME_CONFIG;
  const labels     = ['Start', ...(window.ROUND_YEARS || []).slice(0, history.length - 1)];
  const startVal   = cfg.startingCash;
  const currentVal = history[history.length - 1];
  const pnl        = currentVal - startVal;
  const pnlPct     = ((pnl / startVal) * 100).toFixed(1);
  const up         = pnl >= 0;
  const color      = up ? '#1f7a4d' : '#c24a3a';
  const gradId     = up ? 'wcg-up' : 'wcg-dn';

  const VW = 320, VH = 120, LABEL_H = 22;
  const plotH = VH - LABEL_H;
  const padX = 18, padY = 14;

  const allVals = [...history, startVal];
  const lo  = Math.min(...allVals) * 0.94;
  const hi  = Math.max(...allVals) * 1.06;
  const rng = hi - lo || 1;

  const pts = history.map((v, i) => ({
    x: padX + (i / Math.max(history.length - 1, 1)) * (VW - 2 * padX),
    y: padY + (1 - (v - lo) / rng) * (plotH - 2 * padY),
    v,
  }));
  const baseY  = padY + (1 - (startVal - lo) / rng) * (plotH - 2 * padY);
  const linePts = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillPts = linePts + ` L${pts[pts.length-1].x.toFixed(1)},${plotH} L${pts[0].x.toFixed(1)},${plotH} Z`;

  return (
    <div className="worth-chart-wrap">
      <div className="worth-chart-head">
        <span className="worth-chart-title">Your journey</span>
        <span className={'worth-chart-badge ' + (up ? 'up' : 'down')}>
          {up ? '▲' : '▼'} {Math.abs(pnlPct)}%
          <span className="worth-chart-badge-abs"> · {up ? '+' : ''}{formatMoney(pnl)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="auto" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <clipPath id="wc-clip"><rect x="0" y="0" width={VW} height={plotH} /></clipPath>
        </defs>
        <line x1={padX} y1={baseY} x2={VW - padX} y2={baseY}
          stroke="#d0ccc4" strokeWidth="1" strokeDasharray="5 4" />
        <text x={padX - 2} y={baseY - 4} fontSize="8" fill="#aaa" textAnchor="start" fontFamily="Geist Mono, monospace">START</text>
        <path d={fillPts} fill={`url(#${gradId})`} clipPath="url(#wc-clip)" />
        <path d={linePts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          return (
            <g key={i}>
              <text x={p.x} y={p.y - 10}
                textAnchor={i === 0 ? 'start' : isLast ? 'end' : 'middle'}
                fontSize="9" fontWeight="700" fill={isLast ? color : '#888'}
                fontFamily="Geist Mono, monospace">{formatMoney(p.v)}</text>
              <circle cx={p.x} cy={p.y} r={isLast ? 7 : 5} fill="white" stroke={color} strokeWidth={isLast ? 2.5 : 1.5} />
              <circle cx={p.x} cy={p.y} r={isLast ? 4 : 2.5} fill={color} />
              <text x={p.x} y={VH - 4}
                textAnchor={i === 0 ? 'start' : isLast ? 'end' : 'middle'}
                fontSize="9" fill="#888" fontFamily="Geist Mono, monospace"
                fontWeight={isLast ? '700' : '400'}>{labels[i] || `R${i}`}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Ended ─────────────────────────────────────────────────────────────────────

function PlayerEnded({ me, state, worth, rank, total, allStocks }) {
  const start = window.GAME_CONFIG.startingCash;
  const profit = worth - start;
  const pctVal = (profit / start) * 100;
  const pct    = pctVal.toFixed(1);
  const worthHistory = me.worthHistory || [];

  // Mirror host's per-student analysis
  const stockById = Object.fromEntries(allStocks.map(s => [s.id, s]));
  const positions = Object.entries(me.holdings || {})
    .filter(([,q]) => q > 0)
    .map(([tk, qty]) => {
      const s = stockById[tk];
      const price = s?.price || 0;
      const value = qty * price;
      const cost  = (me.holdingsCost?.[tk] || price);
      const change = cost > 0 ? ((price - cost) / cost) * 100 : 0;
      return { tk, qty, price, value, cost, change, emoji: s?.emoji, sector: s?.sector };
    });
  const bestPick  = positions.length ? positions.reduce((a,b) => b.change > a.change ? b : a) : null;
  const worstPick = positions.length && positions.some(p => p.change < 0)
    ? positions.reduce((a,b) => b.change < a.change ? b : a) : null;
  const winners = positions.filter(x => x.change > 0).length;
  const cashPct = me.cash / Math.max(worth, 1);
  const distinct = positions.length;
  const invested = positions.reduce((s, x) => s + x.value, 0);
  const concentration = invested > 0 ? Math.max(...positions.map(x => x.value)) / invested : 0;

  let style, styleColor, lesson;
  // Pick a flavour badge based on what the student actually did
  const playerPctVal = (worth - start) / start * 100;
  if (cashPct > 0.6)               { style = '💰 Mostly cash';        styleColor = '#64748b'; lesson = 'You played it safe — and missed the big moves.'; }
  else if (distinct === 1)         { style = '🎯 One big bet';        styleColor = '#dc2626'; lesson = 'A single bet — high risk, high reward.'; }
  else if (concentration > 0.6)    { style = '⚡ Heavy in one stock'; styleColor = '#d97706'; lesson = 'You went big on one stock — that was a bold call.'; }
  else if (distinct >= 5)          { style = '🌐 Spread out';         styleColor = '#0891b2'; lesson = 'You spread your money across many stocks.'; }
  else if (playerPctVal > 200)     { style = '🚀 Big winner';         styleColor = '#16a34a'; lesson = 'Massive gains — you bet on the right horse.'; }
  else if (playerPctVal < -20)     { style = '📉 Tough round';        styleColor = '#b91c1c'; lesson = 'The market turned against you. Tomorrow is another game.'; }
  else                              { style = '⚖️ Balanced';           styleColor = '#16a34a'; lesson = 'Mixed approach — balanced risk-taking.'; }

  // Beat the bots
  const players = Object.values(state.players);
  const bots = players.filter(p => p.isBot)
    .map(p => ({ ...p, worth: window.netWorth(p, allStocks) }));
  const beatenBots = bots.filter(b => worth > b.worth).length;

  const up = profit >= 0;
  const heroRef = React.useRef(null);
  const [sharing, setSharing] = React.useState(false);

  async function shareResult() {
    if (!heroRef.current || !window.html2canvas) {
      alert('Sharing not available right now.');
      return;
    }
    setSharing(true);
    try {
      const canvas = await window.html2canvas(heroRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return; }
        const file = new File([blob], `stock-rush-${me.name}.png`, { type: 'image/png' });
        const shareData = {
          files: [file],
          title: 'My Stock Rush result',
          text: `I scored ${formatMoney(worth)} (${up ? '+' : ''}${pct}%) in Stock Rush! Rank #${rank} of ${total}. ${rank === 1 ? '🏆' : '📈'}`,
        };
        try {
          if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
          } else {
            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-rush-${me.name}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (e) { /* user cancelled */ }
        setSharing(false);
      }, 'image/png');
    } catch (e) {
      setSharing(false);
      alert('Could not capture the result. Try refreshing.');
    }
  }

  return (
    <div className="player-body ended-body" style={{ paddingBottom: 40 }}>
      {/* Hero summary — wrapped in ref for screenshot capture */}
      <div ref={heroRef} className="ended-card">
        <div className="ended-eyebrow">Game over</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          fontFamily: 'Geist Mono, ui-monospace',
          padding: '3px 8px',
          background: 'linear-gradient(135deg, rgba(217,119,6,0.12), rgba(252,211,77,0.18))',
          border: '1px solid rgba(217,119,6,0.3)',
          borderRadius: 5,
          color: '#92400e',
          marginBottom: 6,
        }}>
          📅 MAR 2026 REVEAL APPLIED
        </div>
        <div className="ended-rank">#{rank} <span className="muted">of {total}</span></div>
        <Avatar name={me.name} color={me.color} avatar={me.avatar} size={72} />
        <div className="ended-name">{me.name}</div>
        <div className="ended-worth">{formatMoney(worth)}</div>
        <div className={'ended-profit ' + (up ? 'up' : 'down')}>
          {up ? '+' : ''}{formatMoney(profit)} ({pct}%)
        </div>
        {rank === 1 && <div className="ended-trophy">🏆 Top trader!</div>}

        {/* Style badge */}
        <div style={{
          marginTop: 12,
          padding: '6px 14px', borderRadius: 16,
          fontSize: 13, fontWeight: 700,
          background: styleColor + '18', color: styleColor,
          border: '1px solid ' + styleColor + '40',
        }}>
          {style}
        </div>
        <div style={{
          marginTop: 8, fontSize: 12.5, color: '#475569',
          fontStyle: 'italic', textAlign: 'center', maxWidth: 320,
          padding: '6px 10px',
          borderLeft: '3px solid ' + styleColor,
          background: 'rgba(15,23,42,0.03)',
          borderRadius: '0 6px 6px 0',
        }}>
          {lesson}
        </div>

        {worthHistory.length > 1 && (
          <div style={{ marginTop: 16, width: '100%' }}>
            <WorthChart history={worthHistory} />
          </div>
        )}
      </div>

      {/* Share button */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={shareResult}
          disabled={sharing}
          style={{
            width: '100%',
            padding: '14px 18px',
            background: sharing
              ? '#94a3b8'
              : 'linear-gradient(135deg, #16a34a 0%, #0891b2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16, fontWeight: 700,
            letterSpacing: '-0.01em',
            cursor: sharing ? 'wait' : 'pointer',
            boxShadow: '0 6px 16px rgba(22,163,74,0.32)',
          }}
        >
          {sharing ? 'Preparing image…' : '📤 Share my result'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
          Send your score to family on WhatsApp.
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        <EndedStat label="Stocks" value={distinct} />
        <EndedStat label="Hit rate" value={positions.length ? `${winners}/${positions.length}` : '—'} tone={winners > positions.length / 2 ? 'up' : 'neutral'} />
        <EndedStat label="Beat bots" value={`${beatenBots}/${bots.length}`} tone={beatenBots > bots.length / 2 ? 'up' : 'neutral'} />
      </div>

      {/* Best / worst pick */}
      {positions.length > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {bestPick && (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(22,163,74,0.10)',
              border: '1px solid rgba(22,163,74,0.3)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#15803d', fontWeight: 700 }}>Best pick</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d', marginTop: 2, fontFamily: 'Geist Mono, ui-monospace' }}>
                {bestPick.emoji} {bestPick.tk}
              </div>
              <div style={{ fontSize: 12, color: '#15803d', fontFamily: 'Geist Mono, ui-monospace' }}>
                ▲ {Math.abs(bestPick.change).toFixed(1)}%
              </div>
            </div>
          )}
          {worstPick ? (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(220,38,38,0.10)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b91c1c', fontWeight: 700 }}>Worst pick</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginTop: 2, fontFamily: 'Geist Mono, ui-monospace' }}>
                {worstPick.emoji} {worstPick.tk}
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', fontFamily: 'Geist Mono, ui-monospace' }}>
                ▼ {Math.abs(worstPick.change).toFixed(1)}%
              </div>
            </div>
          ) : (
            <div style={{
              padding: '10px 12px',
              background: 'rgba(22,163,74,0.06)',
              border: '1px dashed rgba(22,163,74,0.3)',
              borderRadius: 10,
              fontSize: 12, color: '#15803d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center',
            }}>
              🎉 No losing picks!
            </div>
          )}
        </div>
      )}

      {/* ── YOUR JOURNEY: round-by-round worth ───────────────────────────── */}
      {worthHistory.length > 1 && (
        <EndedJourney worthHistory={worthHistory} liveWorth={worth} />
      )}

      {/* ── COMPOSITION: sector donut + legend ──────────────────────────── */}
      <EndedComposition me={me} allStocks={allStocks} totalWorth={worth} />

      {/* ── COUNTERFACTUAL: what if you'd held one stock the whole time ── */}
      <EndedCounterfactual
        allStocks={allStocks}
        startingCash={start}
        actualWorth={worth}
        actualReturn={pctVal}
        playerStyle={style}
      />

      {/* ── EXIT QUIZ: 3 questions to test what they learnt ───────────── */}
      <ExitQuiz />
    </div>
  );
}

function ExitQuiz() {
  const questions = window.EXIT_QUIZ || [];
  const [answers, setAnswers] = React.useState({}); // { qIdx: optIdx }
  const allAnswered = questions.every((_, i) => answers[i] != null);
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0);

  function pick(qIdx, optIdx) {
    if (answers[qIdx] != null) return; // lock once answered
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  }

  if (questions.length === 0) return null;

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', textTransform: 'uppercase', marginBottom: 4 }}>
        Quick quiz
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
        What did you actually learn?
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
        Three quick questions. Tap the answer you think is right.
      </div>

      {questions.map((q, qi) => {
        const picked = answers[qi];
        const isAnswered = picked != null;
        return (
          <div key={qi} style={{
            marginBottom: 12,
            padding: '12px 14px',
            background: '#fff',
            border: '1.5px solid var(--line)',
            borderRadius: 12,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
              fontFamily: 'Geist Mono, ui-monospace', color: 'var(--muted)',
              marginBottom: 6,
            }}>
              Q{qi + 1}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 10, color: '#0f172a' }}>
              {q.q}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi;
                const isCorrect = oi === q.correct;
                const showResult = isAnswered;
                let bg = '#f8fafc', border = 'var(--faint)', color = '#0f172a';
                if (showResult && isCorrect)        { bg = 'rgba(22,163,74,0.12)'; border = '#15803d'; color = '#15803d'; }
                else if (showResult && isPicked)    { bg = 'rgba(220,38,38,0.10)'; border = '#b91c1c'; color = '#b91c1c'; }
                else if (!showResult)                { bg = '#f8fafc'; }
                return (
                  <button
                    key={oi}
                    onClick={() => pick(qi, oi)}
                    disabled={isAnswered}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      background: bg,
                      border: '1.5px solid ' + border,
                      borderRadius: 8,
                      fontSize: 13, lineHeight: 1.4,
                      color, cursor: isAnswered ? 'default' : 'pointer',
                      fontFamily: 'Geist, ui-sans-serif',
                      fontWeight: showResult && (isCorrect || isPicked) ? 700 : 500,
                      transition: 'background .15s',
                    }}
                  >
                    {showResult && isCorrect && '✓ '}
                    {showResult && isPicked && !isCorrect && '✗ '}
                    {opt}
                  </button>
                );
              })}
            </div>
            {isAnswered && q.why && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(15,23,42,0.04)',
                borderLeft: '3px solid #cbd5e1',
                borderRadius: '0 6px 6px 0',
                fontSize: 12, color: '#334155', lineHeight: 1.5,
              }}>
                <b style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, letterSpacing: '0.1em' }}>WHY</b><br />
                {q.why}
              </div>
            )}
          </div>
        );
      })}

      {allAnswered && (
        <div style={{
          padding: '14px 16px',
          background: score === questions.length
            ? 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)'
            : score >= 2
              ? 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)'
              : 'linear-gradient(135deg, #fca5a5 0%, #dc2626 100%)',
          color: '#fff',
          borderRadius: 12,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '-0.01em',
        }}>
          {score === questions.length && `🎉 Perfect score — you got all ${score}/${questions.length}!`}
          {score === 2 && `Nice — ${score}/${questions.length}. Almost a clean sweep.`}
          {score === 1 && `${score}/${questions.length} — back to the books!`}
          {score === 0 && `${score}/${questions.length} — but hey, you played the game.`}
        </div>
      )}
    </div>
  );
}

// ── Year-by-year worth journey ────────────────────────────────────────────
function EndedJourney({ worthHistory, liveWorth }) {
  // worthHistory is [startCash, endR1, endR2, endR3, endR4, endR5]
  // Combine with live worth for the final row (post-R5-news price)
  const years = window.ROUND_YEARS || [];
  const rows = [];
  for (let i = 1; i < worthHistory.length; i++) {
    const w = worthHistory[i];
    const prev = worthHistory[i - 1];
    const pct = prev > 0 ? ((w - prev) / prev) * 100 : 0;
    rows.push({ year: years[i - 1] || `R${i}`, worth: w, pct });
  }
  // Append live worth as the final node if it differs from the last snapshot
  const lastSnapshot = worthHistory[worthHistory.length - 1];
  if (Math.abs(liveWorth - lastSnapshot) >= 1) {
    const liveYear = years[worthHistory.length - 1] || `R${worthHistory.length}`;
    const pct = lastSnapshot > 0 ? ((liveWorth - lastSnapshot) / lastSnapshot) * 100 : 0;
    // Replace last row if same label; otherwise add
    if (rows.length > 0 && rows[rows.length - 1].year === liveYear) {
      rows[rows.length - 1] = { year: liveYear, worth: liveWorth, pct };
    } else {
      rows.push({ year: liveYear, worth: liveWorth, pct });
    }
  }

  const maxW = Math.max(...rows.map(r => r.worth), 1);

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', textTransform: 'uppercase', marginBottom: 4 }}>
        Your journey
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
        Where you stood at the end of each year
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
        Worth at every round transition, with the news-driven move between them.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const up = r.pct >= 0;
          const barW = Math.max(8, (r.worth / maxW) * 100);
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '54px 1fr 96px 72px',
              alignItems: 'center', gap: 8,
              padding: '10px 12px',
              background: '#fff',
              border: '1px solid var(--faint)',
              borderRadius: 10,
            }}>
              <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 700 }}>
                {r.year}
              </span>
              <div style={{ position: 'relative', height: 10, background: '#f1f5f9', borderRadius: 5 }}>
                <div style={{
                  width: barW + '%', height: '100%',
                  background: up ? '#16a34a' : '#dc2626',
                  borderRadius: 5,
                  transition: 'width .4s ease',
                }} />
              </div>
              <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                {formatMoney(r.worth)}
              </span>
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                padding: '3px 7px', borderRadius: 5,
                background: up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                color: up ? '#15803d' : '#b91c1c',
                textAlign: 'right',
              }}>
                {up ? '▲' : '▼'} {Math.abs(r.pct).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sector composition donut + legend ─────────────────────────────────────
function EndedComposition({ me, allStocks, totalWorth }) {
  // Aggregate by sector
  const byId = Object.fromEntries(allStocks.map(s => [s.id, s]));
  const sectorTotals = {};
  for (const [tk, qty] of Object.entries(me.holdings || {})) {
    if (qty <= 0) continue;
    const s = byId[tk];
    if (!s) continue;
    const value = qty * s.price;
    sectorTotals[s.sector] = (sectorTotals[s.sector] || 0) + value;
  }
  const cash = me.cash || 0;
  const slices = Object.entries(sectorTotals)
    .map(([sector, value]) => ({
      label: sector,
      value,
      color: (window.SECTOR_COLORS?.[sector]?.border) || '#64748b',
    }))
    .sort((a, b) => b.value - a.value);
  if (cash > 0) slices.push({ label: 'Cash', value: cash, color: '#cbd5e1' });

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

  // Donut SVG
  const SIZE = 140, R = 56, STROKE = 16;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = slices.map(s => {
    const frac = s.value / total;
    const arc = { ...s, dash: frac * C, offset };
    offset += frac * C;
    return arc;
  });

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', textTransform: 'uppercase', marginBottom: 4 }}>
        Composition
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
        Where your money sits
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
        Your portfolio mix at game end, sliced by sector.
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: `${SIZE}px 1fr`, gap: 16, alignItems: 'center',
        padding: '14px', background: '#fff', border: '1px solid var(--faint)', borderRadius: 12,
      }}>
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
            {arcs.map((a, i) => (
              <circle
                key={i}
                cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
                stroke={a.color} strokeWidth={STROKE}
                strokeDasharray={`${a.dash.toFixed(2)} ${C.toFixed(2)}`}
                strokeDashoffset={(-a.offset).toFixed(2)}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', textAlign: 'center', lineHeight: 1.1,
          }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>WORTH</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>{formatMoney(totalWorth)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
          {slices.map((s, i) => {
            const pct = ((s.value / total) * 100).toFixed(0);
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '14px 1fr auto auto', gap: 8,
                alignItems: 'center', padding: '4px 8px',
                background: '#f8fafc', borderRadius: 6,
                fontSize: 12,
              }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: s.color }} />
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.label}</span>
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 600 }}>{formatMoney(s.value)}</span>
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Counterfactual: what if you'd held one stock the whole time ───────────
function EndedCounterfactual({ allStocks, startingCash, actualWorth, actualReturn, playerStyle }) {
  // For each stock, compute the result if all starting cash was put in at R1 base price
  const lines = allStocks.map(s => {
    const startPrice = (s.history && s.history[0]) || s.price;
    if (!startPrice) return null;
    const shares = Math.floor(startingCash / startPrice);
    const leftover = startingCash - shares * startPrice;
    const finalWorth = shares * s.price + leftover;
    const ret = ((finalWorth - startingCash) / startingCash) * 100;
    return { stock: s, finalWorth, ret, shares };
  }).filter(Boolean).sort((a, b) => b.finalWorth - a.finalWorth);

  const bestId = lines[0]?.stock.id;

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', textTransform: 'uppercase', marginBottom: 4 }}>
        Counterfactual
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>
        What if you'd just bought one stock and slept for 10 years?
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 6 }}>
        {formatMoney(startingCash)} all-in on each stock at 2016 prices, held through Mar 2026.
      </div>
      <div style={{
        fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic',
        lineHeight: 1.45, marginBottom: 12,
      }}>
        *Assumes 100% in one stock from start. Real investing diversifies.
      </div>

      {/* Highlighted "you played" card */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 10,
        display: 'grid',
        gridTemplateColumns: '48px 1fr auto',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ fontSize: 28, opacity: 0.7 }}>👤</span>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.65, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700 }}>
            YOU PLAYED
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginTop: 2 }}>
            Active trading across 5 rounds
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 18, fontWeight: 700 }}>
            {formatMoney(actualWorth)}
          </div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
            color: actualReturn >= 0 ? '#4ade80' : '#f87171',
          }}>
            {actualReturn >= 0 ? '+' : ''}{actualReturn.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* All stocks ranked by counterfactual outcome */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lines.map(({ stock, finalWorth, ret }, i) => {
          const isBest = stock.id === bestId;
          const up = ret >= 0;
          return (
            <div key={stock.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr auto auto',
              gap: 10, alignItems: 'center',
              padding: '10px 12px',
              background: isBest ? 'rgba(22,163,74,0.08)' : '#fff',
              border: isBest ? '1.5px solid rgba(22,163,74,0.4)' : '1px solid var(--faint)',
              borderLeft: isBest ? '4px solid #15803d' : '1px solid var(--faint)',
              borderRadius: 10,
            }}>
              <span style={{ fontSize: 22, textAlign: 'center' }}>{stock.emoji}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                  {stock.id}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {stock.name}
                </div>
              </div>
              <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
                {formatMoney(finalWorth)}
              </span>
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                color: up ? '#15803d' : '#b91c1c',
                minWidth: 64, textAlign: 'right',
              }}>
                {up ? '+' : ''}{ret.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EndedStat({ label, value, tone }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{
      padding: '8px 10px',
      background: '#fff',
      border: '1px solid var(--faint)',
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace', marginTop: 2 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { PlayerView });
