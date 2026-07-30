// Stock Rush Pro — Player (student/parent) view

const PLAYER_KEY = 'stockrushpro:me';

const SECTOR_COLORS = {
  Tech:     { bg: '#e8f0ff', border: '#4f80f7', text: '#1a3a8f' },
  FMCG:     { bg: '#fff8e6', border: '#f59e0b', text: '#92400e' },
  Energy:   { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  Finance:  { bg: '#e8fff4', border: '#10b981', text: '#065f46' },
  Consumer: { bg: '#fdf4ff', border: '#a855f7', text: '#6b21a8' },
  Retail:   { bg: '#e8f5ff', border: '#0ea5e9', text: '#0c4a6e' },
};

// ── Root ─────────────────────────────────────────────────────────────────────

function PlayerView() {
  const [me, setMe] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null'); }
    catch { return null; }
  });
  const [state, setState] = React.useState(() => window.StockRush.getState());

  React.useEffect(() => window.StockRush.subscribe(setState), []);

  // If the host kicks me, clear my local identity and reload to onboarding.
  React.useEffect(() => {
    if (!window.StockRush.onKick) return;
    return window.StockRush.onKick(kickedId => {
      if (me && kickedId === me.id) {
        localStorage.removeItem(PLAYER_KEY);
        setTimeout(() => window.location.reload(), 100);
      }
    });
  }, [me]);

  // Retry join on every state update — not just once when `me` changes.
  // The engine allows joins any time during round 1, so repeated retries are
  // harmless and ensure the player gets in even if the first broadcast was sent
  // before the host's DB load completed. Once admitted, `state.players[me.id]`
  // is truthy and the effect short-circuits immediately.
  React.useEffect(() => {
    if (!me) return;
    if (state.players?.[me.id]) return;  // already in — stop retrying
    window.StockRush.join(me);
  }, [state, me]);

  // IPO result tracking — captures a snapshot when the student submits an IPO
  // application, then computes the allocation / refund / shares result when
  // the IPO resolves (teacher dismisses the event). Shows a result modal.
  const [ipoResult, setIpoResult] = React.useState(null);
  const pendingIpoRef = React.useRef(null);
  React.useEffect(() => {
    if (!me) return;
    const ev = state.currentEvent;
    const myChoice = state.eventChoices?.[me.id];
    const player = state.players?.[me.id];
    const isIpoApplication = ev && ev.type === 'ipo'
      && myChoice && typeof myChoice === 'object' && myChoice.amount > 0;

    // SNAPSHOT: first frame after student submitted IPO with an amount.
    // Cash/holdings haven't changed yet (engine charges at resolution time).
    if (isIpoApplication && !pendingIpoRef.current && player) {
      pendingIpoRef.current = {
        stockId:      ev.stockId,
        stockEmoji:   ev.stockEmoji || null,
        ipoPrice:     ev.ipoPrice,
        subscriptionX: ev.subscriptionX,
        amount:       myChoice.amount,
        cashBefore:   player.cash || 0,
        sharesBefore: player.holdings?.[ev.stockId] || 0,
      };
    }

    // RESOLUTION: pending snapshot exists, but the current IPO event is gone
    // (either resolved by teacher's dismiss → next event, or trading opened).
    const stillPending = ev && ev.type === 'ipo'
      && ev.stockId === pendingIpoRef.current?.stockId;
    if (pendingIpoRef.current && !stillPending && player) {
      const snap          = pendingIpoRef.current;
      const sharesAfter   = player.holdings?.[snap.stockId] || 0;
      const sharesAlloc   = Math.max(0, sharesAfter - snap.sharesBefore);
      const cashAfter     = player.cash || 0;
      const cashSpent     = Math.max(0, snap.cashBefore - cashAfter);
      const refund        = Math.max(0, snap.amount - cashSpent);
      const allocPct      = snap.amount > 0
        ? Math.round((cashSpent / snap.amount) * 100)
        : 0;
      setIpoResult({
        stockId:       snap.stockId,
        ipoPrice:      snap.ipoPrice,
        subscriptionX: snap.subscriptionX,
        amount:        snap.amount,
        sharesAlloc,
        cashSpent,
        refund,
        allocPct,
      });
      pendingIpoRef.current = null;
    }
  }, [state, me]);

  // Wall screen: only block when the game is truly over (finale/ended).
  // For lobby/events/trading phases, keep showing "Joining…" — the retry
  // effect above will keep sending join broadcasts until the engine admits
  // them (which it will, since joins are now allowed any time before finale).
  if (me && !state.players?.[me.id]) {
    const gameOver = state.phase === 'finale' || state.phase === 'ended';
    if (!gameOver) {
      return (
        <div className="onboard">
          <div className="onboard-card" style={{ textAlign: 'center' }}>
            <div className="onboard-mark">SR<sup style={{ fontSize: '0.55em', verticalAlign: 'super', letterSpacing: '-1px' }}>PRO</sup></div>
            <div className="onboard-title" style={{ marginTop: 8 }}>Joining game…</div>
            <div className="onboard-sub" style={{ marginTop: 8 }}>
              Hang on — adding you to the game now.
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="onboard">
        <div className="onboard-card" style={{ textAlign: 'center' }}>
          <div className="onboard-mark">SR<sup style={{ fontSize: '0.55em', verticalAlign: 'super', letterSpacing: '-1px' }}>PRO</sup></div>
          <div className="onboard-title" style={{ marginTop: 8 }}>Game over</div>
          <div className="onboard-sub" style={{ marginTop: 8 }}>
            The game has finished.<br />Ask your teacher to start a new game.
          </div>
        </div>
      </div>
    );
  }

  if (!me) {
    return <PlayerOnboard state={state} onJoin={p => {
      localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
      setMe(p);
      window.StockRush.join(p);
    }} />;
  }

  const player   = state.players[me.id] || me;
  const allStocks = getAllStocks(player, state.stocks);
  const worth    = netWorth(player, allStocks);
  const ranked   = Object.values(state.players)
    .map(p => ({ ...p, worth: window.netWorth(p, getAllStocks(p, state.stocks)) }))
    .sort((a, b) => b.worth - a.worth);
  const myRank   = ranked.findIndex(p => p.id === me.id) + 1;
  const isLocked = !!(state.locks?.[me.id]);

  return (
    <div className="player-shell">
      <PlayerHeader me={player} state={state} worth={worth} rank={myRank} total={ranked.length} />

      {state.phase === 'lobby'   && <PlayerLobby me={player} state={state} />}
      {state.phase === 'events'  && <PlayerEvents me={player} state={state} />}
      {state.phase === 'trading' && <PlayerTrading me={player} state={state} isLocked={isLocked} allStocks={allStocks} />}
      {state.phase === 'finale'  && <PlayerFinale me={player} worth={worth} />}
      {state.phase === 'ended'   && <PlayerEnded me={player} state={state} worth={worth} rank={myRank} total={ranked.length} allStocks={allStocks} />}

      {/* IPO allocation result modal — pops once the IPO resolves so the student
          sees what their application actually bought them. */}
      {ipoResult && (
        <IpoResultModal result={ipoResult} onDismiss={() => setIpoResult(null)} />
      )}
    </div>
  );
}

// ── IPO Result Modal ──────────────────────────────────────────────────────────
// Pops AFTER the IPO event resolves so the student can see exactly what
// happened to their application: how much they applied, how many shares were
// allocated (allocation %), how much cash was spent, how much was refunded.
function IpoResultModal({ result, onDismiss }) {
  const gotShares = result.sharesAlloc > 0;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') onDismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(7, 26, 16, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14,
          maxWidth: 380, width: '100%',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.36)',
        }}
      >
        {/* Header */}
        <div style={{
          background: gotShares
            ? 'linear-gradient(135deg, #15803d 0%, #0a5a32 100%)'
            : 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
          color: '#fff',
          padding: '14px 18px',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.65)',
          }}>
            🎫 IPO Result · {result.stockId}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {gotShares
              ? `Got ${result.sharesAlloc} share${result.sharesAlloc !== 1 ? 's' : ''} of ${result.stockId}`
              : `No allocation`}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3, lineHeight: 1.4 }}>
            {gotShares
              ? `${result.subscriptionX}× oversubscribed — got ${result.allocPct}% of your bid.`
              : `${result.subscriptionX}× oversubscribed — lottery missed you.`}
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ padding: '10px 18px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <BreakdownRow label="Applied" value={'₹' + result.amount.toLocaleString('en-IN')} bold />
          <BreakdownRow
            label={`Allocated (${result.allocPct}%)`}
            value={result.sharesAlloc > 0
              ? `${result.sharesAlloc} @ ₹${result.ipoPrice}`
              : '— none —'}
            tint={gotShares ? '#15803d' : '#475569'}
          />
          <BreakdownRow
            label="Cash used"
            value={'−₹' + result.cashSpent.toLocaleString('en-IN')}
            tint="#c24a3a"
          />
          <BreakdownRow
            label="Refunded"
            value={'+₹' + result.refund.toLocaleString('en-IN')}
            tint="#15803d"
            isLast
          />

          {/* Lesson box */}
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            background: '#fafaf7',
            border: '1px solid #e6e3dc',
            borderRadius: 8,
            fontSize: 11.5, color: '#475569', lineHeight: 1.45,
          }}>
            <b style={{ color: '#0f172a' }}>Why partial?</b> When demand &gt; shares on offer, everyone gets a slice. Extra cash refunds automatically.
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          padding: '10px 18px 14px',
          borderTop: '1px solid #f0ede5',
          flexShrink: 0,
        }}>
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: '#0f3a24',
              color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Got it →
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, tint, bold, isLast }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '6px 0',
      borderBottom: isLast ? 'none' : '1px solid #f0ede5',
    }}>
      <span style={{ fontSize: 12, color: '#475569', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: 14, fontWeight: 700,
        color: tint || '#0f172a',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
    </div>
  );
}

// Returns the stocks visible to this player, with live prices from state.stocks.
// stateStocks = state.stocks from the engine (has prices). Falls back to window.STOCKS if omitted.
// Zomato is hidden until the IPO event resolves — after that, the engine adds it
// to state.stocks so it appears here for ALL players, not just IPO applicants.
function getAllStocks(player, stateStocks) {
  return stateStocks || window.STOCKS || [];
}

function netWorth(p, stocks) {
  if (!p) return 0;
  return (p.cash || 0) + stocks.reduce((s, stk) => s + (p.holdings?.[stk.id] || 0) * (stk.price || 0), 0);
}

// ── Onboard ──────────────────────────────────────────────────────────────────

function PlayerOnboard({ state, onJoin }) {
  // Allow signup any time the teacher hasn't ended the game. Late joiners get
  // ₹2L starting cash and appear flat at the baseline on the leaderboard chart
  // until the round they joined — the engine handles this in _applyJoin.
  const gameOver = state.phase === 'finale' || state.phase === 'ended';
  if (gameOver) {
    return (
      <div className="onboard">
        <div className="onboard-card" style={{ textAlign: 'center' }}>
          <div className="onboard-mark">SR<sup style={{ fontSize: '0.55em', verticalAlign: 'super', letterSpacing: '-1px' }}>PRO</sup></div>
          <div className="onboard-title" style={{ marginTop: 8 }}>Game over</div>
          <div className="onboard-sub" style={{ marginTop: 8 }}>
            This game has finished.<br />Ask your teacher to start a new game.
          </div>
        </div>
      </div>
    );
  }

  const urlRoom     = new URLSearchParams(window.location.search).get('room') || '';
  const codeFromUrl = urlRoom.toUpperCase() === window.GAME_CONFIG.roomCode;

  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState(codeFromUrl ? window.GAME_CONFIG.roomCode : '');
  const opts = window.AVATAR_OPTIONS || [];
  const [pickIdx, setPickIdx] = React.useState(() => Math.floor(Math.random() * opts.length));
  const picked = opts[pickIdx] || { emoji: '👤', color: '#888' };
  const valid = name.trim().length >= 2
    && code.toUpperCase() === window.GAME_CONFIG.roomCode;

  function submit() {
    if (!valid) return;
    onJoin({
      id: 'p-' + crypto.randomUUID().slice(0, 8),
      name: name.trim(),
      color: picked.color,
      avatar: picked.emoji,
    });
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-mark">SR</div>
        <div className="onboard-title">Stock Rush Pro</div>
        <div className="onboard-sub">The full market experience — splits, IPOs, buybacks and more.</div>

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
            className="input" placeholder="e.g. Priya"
            autoFocus onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        <div className="field">
          <div className="field-label">Pick your avatar</div>

          {/* Selected avatar preview */}
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

          {/* Avatar grid — 4 × 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {opts.map((opt, i) => {
              const sel = pickIdx === i;
              return (
                <button
                  key={opt.emoji}
                  type="button"
                  onClick={() => setPickIdx(i)}
                  title={opt.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, padding: 0, borderRadius: '50%',
                    background: sel ? opt.color : opt.color + '1a',
                    border: sel ? '3px solid ' + opt.color : '2px solid ' + opt.color + '44',
                    boxShadow: sel
                      ? '0 0 0 3px #fff, 0 0 0 5px ' + opt.color + ', 0 6px 18px ' + opt.color + '99'
                      : 'none',
                    fontSize: 32, lineHeight: 1, overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.2,0.9,0.3,1.3)',
                    transform: sel ? 'scale(1.18)' : 'scale(1)',
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
  const cfg   = window.GAME_CONFIG;
  const total5 = cfg.rounds;
  const inPlay = state.phase === 'trading' || state.phase === 'events' || state.phase === 'ended';

  return (
    <div className="player-header">
      <div className="ph-top">
        <div className="ph-me">
          <Avatar name={me.name} color={me.color} avatar={me.avatar} size={32} />
          <div>
            <div className="ph-name">
              {me.name}
              <button
                onClick={() => {
                  if (confirm('Leave this game and join with a different name / avatar?')) {
                    try { window.StockRush.leave(me.id); } catch (e) {}
                    localStorage.removeItem(PLAYER_KEY);
                    setTimeout(() => window.location.reload(), 150);
                  }
                }}
                style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 6,
                  border: '1px solid #d4d0c4', background: '#fafaf7',
                  color: '#6b6b6b', cursor: 'pointer',
                  fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.04em',
                  verticalAlign: '2px',
                }}
              >NOT YOU?</button>
            </div>
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

      {inPlay && state.phase !== 'ended' && (
        <div className="ph-progress">
          {Array.from({ length: total5 }, (_, i) => (
            <div key={i} className={
              'progress-dot' +
              (i < state.round - 1 ? ' done' : i === state.round - 1 ? ' active' : '')
            } />
          ))}
          <span className="ph-round-label">
            Round {state.round} / {total5}
            {window.ROUND_YEARS?.[state.round - 1] &&
              <span style={{ opacity: 0.6 }}> · {window.ROUND_YEARS[state.round - 1]}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────

function PlayerLobby({ me, state }) {
  const humans = Object.values(state.players).filter(p => !p.isBot);
  const cfg    = window.GAME_CONFIG;
  const stocks = window.STOCKS;
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

      {/* ── Study prompt banner ── */}
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
            <b style={{ color: '#fbbf24' }}>₹2 lakh</b> of virtual money
            — knowing the businesses before the game starts is your edge.
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6 }}>
          📋 What you'll experience
        </div>
        <div className="concept-chips">
          {[
            { icon: '✂️', label: 'Stock Split' },
            { icon: '💰', label: 'Dividend' },
            { icon: '🎫', label: 'IPO' },
            { icon: '🎁', label: 'Bonus Shares' },
            { icon: '🔄', label: 'Buyback' },
            { icon: '📜', label: 'Rights Issue' },
          ].map(c => (
            <div key={c.label} className="concept-chip">
              <span>{c.icon}</span> {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* Briefing intro */}
      <div style={{ padding: '14px 16px 8px', background: 'var(--paper)', borderTop: '1.5px solid var(--line)', borderBottom: '1.5px solid var(--line)' }}>
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
          Tap each card to read the story. Real companies, real prices, real history.
        </div>
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

      <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stocks.map(s => (
          <BriefingCard key={s.id} stock={s} read={readIds.has(s.id)} onRead={markRead} />
        ))}
      </div>

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
          Starting cash: <b>{formatMoney(cfg.startingCash)}</b> · {cfg.rounds} rounds · 2014–2026
        </div>
      </div>
    </div>
  );
}

function BriefingCard({ stock, read, onRead }) {
  const [expanded, setExpanded] = React.useState(false);
  const col = SECTOR_COLORS[stock.sector] || SECTOR_COLORS.Tech;
  const capLabel = { large: 'Large Cap', mid: 'Mid Cap', small: 'Small Cap' }[stock.cap] || '';

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
      {read && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 20, height: 20, borderRadius: '50%',
          background: '#15803d', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>✓</div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{stock.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 13,
              color: col.text, letterSpacing: '0.04em',
            }}>{stock.id}</span>
            <span style={{
              display: 'inline-block', padding: '2px 7px',
              background: col.border, color: '#fff',
              fontFamily: 'Geist Mono, ui-monospace',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              borderRadius: 4,
            }}>{String(stock.sector).toUpperCase()}</span>
            {stock.risk && <RiskBadge risk={stock.risk} />}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: col.text, letterSpacing: '-0.01em', marginBottom: 2 }}>
            {stock.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
            {capLabel} · Starts at {formatMoney(stock.price)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginTop: 10 }}>
        {stock.desc}
      </div>

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
    </div>
  );
}

// ── Events phase ─────────────────────────────────────────────────────────────

function PlayerEvents({ me, state }) {
  const ev = state.currentEvent;
  if (!ev) {
    return <div className="player-body"><div className="empty">Waiting for event…</div></div>;
  }

  const myChoice = state.eventChoices?.[me.id];
  const isChoice = ['ipo', 'buyback', 'rights'].includes(ev.type);
  const hasChosen = myChoice !== undefined && myChoice !== null;

  if (hasChosen) {
    return (
      <div className="player-body">
        <div className="event-waiting">
          <div className="event-waiting-icon">✅</div>
          <div className="event-waiting-title">Choice submitted</div>
          <div className="event-waiting-sub muted">Waiting for everyone else…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-body">
      {ev.type === 'dividend' && <DividendEvent ev={ev} me={me} state={state} />}
      {ev.type === 'split'    && <SplitEvent    ev={ev} me={me} state={state} />}
      {ev.type === 'bonus'    && <BonusEvent    ev={ev} me={me} state={state} />}
      {ev.type === 'ipo'      && <IpoEvent      ev={ev} me={me} state={state} />}
      {ev.type === 'buyback'  && <BuybackEvent  ev={ev} me={me} state={state} />}
      {ev.type === 'rights'   && <RightsEvent   ev={ev} me={me} state={state} />}
    </div>
  );
}

// Auto event card wrapper — just shows info, no choice needed
const AUTO_EVENT_THEME = {
  dividend: { tint: '#15803d', bg: '#f0faf5', border: '#b9e0c8', soft: 'rgba(22,163,74,0.08)', deep: '#0a5a32' },
  split:    { tint: '#3b82c4', bg: '#eaf3fb', border: '#b3d2ec', soft: 'rgba(59,130,196,0.08)', deep: '#1f4e79' },
  bonus:    { tint: '#b45309', bg: '#fdf4e3', border: '#f0d398', soft: 'rgba(180,83,9,0.08)',  deep: '#7a3a08' },
};

// Shared header for every auto-event card: big icon disc + theme badge + stock name
function AutoEventHeader({ icon, badge, theme, stock }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: theme.bg, border: '2.5px solid ' + theme.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, flexShrink: 0, lineHeight: 1,
      }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.16em', color: theme.tint, textTransform: 'uppercase',
        }}>{badge}</div>
        <div style={{
          fontWeight: 700, fontSize: 18, lineHeight: 1.25, color: '#111', marginTop: 3,
        }}>
          <span style={{ marginRight: 6, fontSize: 22 }}>{stock?.emoji}</span>
          {stock?.name}
        </div>
      </div>
    </div>
  );
}

// Big hero "what happened to YOU" panel — the visual centrepiece of an auto event
function ImpactHero({ theme, label, valueLine, hint }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, ' + theme.bg + ' 0%, #ffffff 100%)',
      border: '2px solid ' + theme.border,
      borderRadius: 14,
      padding: '18px 18px 16px',
      marginBottom: 14,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.16em', color: theme.tint, textTransform: 'uppercase',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 700, color: theme.deep, lineHeight: 1.15,
        letterSpacing: '-0.01em',
      }}>{valueLine}</div>
      {hint && (
        <div style={{
          fontSize: 13, color: '#5b7080', marginTop: 8, lineHeight: 1.4,
        }}>{hint}</div>
      )}
    </div>
  );
}

// Visual "X → Y" before/after used for split + bonus
function BeforeAfter({ theme, beforeLabel, beforeValue, afterLabel, afterValue, badge }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center', gap: 10,
      padding: '14px 4px', marginBottom: 14,
    }}>
      <div style={{
        background: '#fff', border: '1.5px solid var(--faint)', borderRadius: 12,
        padding: '12px 10px', textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em', color: '#94a3b8', textTransform: 'uppercase',
        }}>{beforeLabel}</div>
        <div style={{
          fontSize: 26, fontWeight: 700, color: '#475569', marginTop: 4, lineHeight: 1,
        }}>{beforeValue}</div>
      </div>
      <div style={{
        fontSize: 24, color: theme.tint, fontWeight: 700, lineHeight: 1,
      }}>→</div>
      <div style={{
        background: theme.bg, border: '2px solid ' + theme.border, borderRadius: 12,
        padding: '12px 10px', textAlign: 'center', position: 'relative',
      }}>
        {badge && (
          <div style={{
            position: 'absolute', top: -8, right: -4,
            background: theme.tint, color: '#fff',
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', padding: '3px 7px', borderRadius: 4,
            transform: 'rotate(4deg)',
          }}>{badge}</div>
        )}
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em', color: theme.tint, textTransform: 'uppercase',
        }}>{afterLabel}</div>
        <div style={{
          fontSize: 28, fontWeight: 700, color: theme.deep, marginTop: 4, lineHeight: 1,
        }}>{afterValue}</div>
      </div>
    </div>
  );
}

function NotHeldHint({ stockId, theme, kind = 'event' }) {
  // Friendlier "you don't hold it" message tailored to the event type.
  // Always leads with the impact-on-you ("nothing changed") then a one-line
  // action hint so the student knows what to do next round.
  const KIND_HINTS = {
    dividend: 'Buy ' + stockId + ' next round to receive future dividends.',
    split:    'You can buy ' + stockId + ' next round at the new lower price.',
    bonus:    'You can buy ' + stockId + ' next round.',
    buyback:  'You don\'t need to do anything — just continue.',
    rights:   'You don\'t need to do anything — only existing shareholders qualify.',
    ipo:      'IPOs are open to anyone with cash, even if you don\'t hold the stock yet.',
    event:    'You can buy ' + stockId + ' next round if you want in.',
  };
  return (
    <div style={{
      padding: '14px 16px',
      background: '#fafaf7',
      border: '1px dashed #d4d0c4',
      borderRadius: 10,
      textAlign: 'center',
      color: '#475569',
      fontSize: 14.5, lineHeight: 1.5,
      marginBottom: 12,
    }}>
      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 3 }}>
        Nothing changes for you this time
      </div>
      <div style={{ fontSize: 13, color: '#64748b' }}>
        You don't own <b>{stockId}</b>. {KIND_HINTS[kind] || KIND_HINTS.event}
      </div>
    </div>
  );
}

// "What this means" — one plain-English sentence directly under the impact hero.
function MeaningLine({ children }) {
  return (
    <div style={{
      fontSize: 14, color: '#0f172a', lineHeight: 1.55,
      padding: '10px 14px',
      background: '#fafaf7',
      border: '1px solid #e6e3dc',
      borderRadius: 10,
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// "What to do now" — coloured action callout so the student knows the next step.
function NextStep({ theme, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 14px',
      background: theme.soft,
      border: '1.5px solid ' + theme.border,
      borderRadius: 10,
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>👉</div>
      <div style={{ fontSize: 14, color: theme.deep, lineHeight: 1.5, fontWeight: 600 }}>
        {children}
      </div>
    </div>
  );
}

// Yellow "watch out" callout used on choice events to surface the key trade-off.
function CatchCallout({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '12px 14px',
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 35%, #fef3c7 100%)',
      border: '1.5px solid #f59e0b',
      borderRadius: 10,
      marginBottom: 12,
      fontSize: 14, color: '#78350f', lineHeight: 1.55,
    }}>
      <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠️</div>
      <div>{children}</div>
    </div>
  );
}

// Demoted "the story behind it" — collapsed by default so the popup stays
// action-focused. Curious students can expand to read the company narrative.
function StoryBlock({ headline, body }) {
  return (
    <details style={{ marginTop: 4, marginBottom: 6 }}>
      <summary style={{
        cursor: 'pointer', padding: '6px 0',
        fontFamily: 'Geist Mono, ui-monospace',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
        color: '#94a3b8', textTransform: 'uppercase',
        userSelect: 'none',
      }}>
        📖 The story behind it →
      </summary>
      <div style={{
        fontSize: 14, fontWeight: 700, color: '#0f172a',
        marginTop: 10, marginBottom: 6, lineHeight: 1.35,
      }}>{headline}</div>
      <div style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6 }}>
        {body}
      </div>
    </details>
  );
}

function DividendEvent({ ev, me, state }) {
  const player = state.players[me.id];
  const held   = player?.holdings?.[ev.stockId] || 0;
  const earned = held * ev.perShare;
  const stock  = state.stocks.find(s => s.id === ev.stockId) || state.ipoStockMeta;
  const theme  = AUTO_EVENT_THEME.dividend;

  return (
    <div className="event-card">
      <AutoEventHeader icon="💰" badge="Dividend Paid" theme={theme} stock={stock} />

      {held > 0 ? (
        <>
          <ImpactHero
            theme={theme}
            label="Cash just landed in your account"
            valueLine={'+' + formatMoney(earned)}
            hint={`₹${ev.perShare} per share × ${held} share${held !== 1 ? 's' : ''} you hold`}
          />
          <MeaningLine>
            A dividend is a company sending you <b>cash from its profits</b>, just for owning the stock. You didn't have to do anything.
          </MeaningLine>
          <NextStep theme={theme}>
            Nothing to do — your cash is already there. Wait for the teacher.
          </NextStep>
        </>
      ) : (
        <>
          <NotHeldHint stockId={ev.stockId} theme={theme} kind="dividend" />
          <NextStep theme={theme}>
            Just wait — the teacher will move on. Buy {ev.stockId} next round to collect future dividends.
          </NextStep>
        </>
      )}

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

function SplitEvent({ ev, me, state }) {
  const player     = state.players[me.id];
  const heldAfter  = player?.holdings?.[ev.stockId] || 0;
  const heldBefore = Math.round(heldAfter / ev.ratio);
  const stock      = state.stocks.find(s => s.id === ev.stockId) || state.ipoStockMeta;
  const theme      = AUTO_EVENT_THEME.split;

  return (
    <div className="event-card">
      <AutoEventHeader icon="✂️" badge={`Stock Split · 1:${ev.ratio}`} theme={theme} stock={stock} />

      {heldAfter > 0 ? (
        <>
          <BeforeAfter
            theme={theme}
            beforeLabel="Before split"
            beforeValue={heldBefore + ' share' + (heldBefore !== 1 ? 's' : '')}
            afterLabel="After split"
            afterValue={heldAfter + ' share' + (heldAfter !== 1 ? 's' : '')}
            badge={`×${ev.ratio}`}
          />
          <MeaningLine>
            <b>Your wealth right now: unchanged.</b> You have {ev.ratio}× more shares, but each one is worth 1/{ev.ratio} of its old price. Same total value.
          </MeaningLine>
          <NextStep theme={theme}>
            Nothing to do now. Cheaper per-share prices often attract more buyers — watch if the price rises over the next few rounds.
          </NextStep>
        </>
      ) : (
        <>
          <NotHeldHint stockId={ev.stockId} theme={theme} kind="split" />
          <NextStep theme={theme}>
            Just wait — the teacher will move on. {ev.stockId} is now cheaper per share if you want to buy in next round.
          </NextStep>
        </>
      )}

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

function BonusEvent({ ev, me, state }) {
  const player     = state.players[me.id];
  const heldAfter  = player?.holdings?.[ev.stockId] || 0;
  const heldBefore = Math.round(heldAfter / (1 + ev.ratio));
  const bonusShares = heldAfter - heldBefore;
  const stock      = state.stocks.find(s => s.id === ev.stockId) || state.ipoStockMeta;
  const theme      = AUTO_EVENT_THEME.bonus;

  return (
    <div className="event-card">
      <AutoEventHeader icon="🎁" badge={`Free Bonus Shares · ${ev.ratio}:1`} theme={theme} stock={stock} />

      {heldAfter > 0 ? (
        <>
          <BeforeAfter
            theme={theme}
            beforeLabel="You had"
            beforeValue={heldBefore + ' share' + (heldBefore !== 1 ? 's' : '')}
            afterLabel="You now have"
            afterValue={heldAfter + ' share' + (heldAfter !== 1 ? 's' : '')}
            badge={`+${bonusShares} FREE`}
          />
          <MeaningLine>
            <b>Cost to you: ₹0.</b> {stock?.name} had extra profit lying around and gave you {bonusShares} free share{bonusShares !== 1 ? 's' : ''}. The price per share halves to balance the new share count, so your total wealth today is unchanged.
          </MeaningLine>
          <div style={{
            padding: '10px 14px',
            background: '#fafaf7',
            border: '1px solid #e6e3dc',
            borderRadius: 10,
            fontSize: 13, color: '#475569', lineHeight: 1.5,
            marginBottom: 10,
          }}>
            <b style={{ color: '#0f172a' }}>Bonus vs split — what's the difference?</b><br />
            • <b>Split</b> = a company cuts each share into smaller pieces (purely mechanical).<br />
            • <b>Bonus</b> = the company hands out free shares from its retained profits.<br />
            Both leave your wealth unchanged today, but a bonus is a stronger signal the company is thriving.
          </div>
          <NextStep theme={theme}>
            Nothing to do now. Free shares of a growing company — usually a good sign for future rounds.
          </NextStep>
        </>
      ) : (
        <>
          <NotHeldHint stockId={ev.stockId} theme={theme} kind="bonus" />
          <NextStep theme={theme}>
            Just wait — the teacher will move on. {ev.stockId} is now cheaper per share if you want to buy in next round.
          </NextStep>
        </>
      )}

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

function IpoEvent({ ev, me, state }) {
  const [selected, setSelected] = React.useState(null);
  const player = state.players[me.id] || {};
  const cfg    = window.GAME_CONFIG;
  const cash   = player.cash || 0;
  const allOpts = cfg.ipoApplyOptions || [10000, 25000, 50000];
  const minAmount = Math.min(...allOpts);
  const canAffordMin = cash >= minAmount;

  const holdings = (state.stocks || [])
    .map(s => ({ stock: s, qty: player.holdings?.[s.id] || 0 }))
    .filter(h => h.qty > 0);
  const totalHoldingValue = holdings.reduce((sum, h) => sum + h.qty * h.stock.price, 0);
  const cashGapToMin = Math.max(0, minAmount - cash);

  function submit(amount) {
    window.StockRush.submitChoice(me.id, { amount });
    setSelected(amount);
  }
  function skip() {
    window.StockRush.submitChoice(me.id, 'reject');
    setSelected(0);
  }
  // Sell only what's needed to bridge the gap to the minimum IPO tier.
  // If selling everything still falls short, sell everything (best effort).
  function sellToFund(stockId, qty, price) {
    const sharesNeeded = Math.ceil(cashGapToMin / price);
    const sellQty = Math.min(sharesNeeded, qty);
    window.StockRush.sell(me.id, stockId, sellQty);
  }
  // Full sell — used in the optional "free up more cash" section only
  function sellAll(stockId, qty) {
    window.StockRush.sell(me.id, stockId, qty);
  }

  const ipoTheme = { tint: '#c8333a', bg: '#ffeae9', border: '#f4a99e', soft: 'rgba(200,51,58,0.08)', deep: '#7a1c20' };

  return (
    <div className="event-card">
      <AutoEventHeader
        icon="🎫"
        badge="IPO · Apply Now"
        theme={ipoTheme}
        stock={state.ipoStockMeta || state.stocks.find(s => s.id === ev.stockId)}
      />

      {/* Top: cash vs price (kept tight) */}
      <div style={{
        background: 'linear-gradient(135deg,#fdf3eb 0%,#fbe9d6 100%)',
        border: '1.5px solid #e8c89a',
        borderRadius: 12, padding: '12px 14px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.1em', color: '#8b5e1a', fontWeight: 700 }}>YOUR CASH</div>
          <div style={{ fontSize: 22, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, color: '#5b3d10', marginTop: 2 }}>
            {formatMoney(cash)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.1em', color: '#8b5e1a', fontWeight: 700 }}>IPO PRICE</div>
          <div style={{ fontSize: 22, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, color: '#5b3d10', marginTop: 2 }}>
            ₹{ev.ipoPrice}
          </div>
          <div style={{ fontSize: 10, color: '#8b5e1a', marginTop: 1 }}>per share · {ev.subscriptionX}× subscribed</div>
        </div>
      </div>

      {/* The catch — this is THE thing students miss */}
      <CatchCallout>
        This IPO is <b>{ev.subscriptionX}× oversubscribed</b> — meaning {ev.subscriptionX} investor{ev.subscriptionX !== 1 ? 's want' : ' wants'} every 1 share. <b>You'll only get 30–45% of what you apply for.</b> The rest refunds back to your cash.
      </CatchCallout>

      {/* What to do */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: '#0f172a',
        marginBottom: 4,
      }}>
        How much do you want to apply for?
      </div>
      <div style={{
        fontSize: 13, color: '#5b6470', lineHeight: 1.5, marginBottom: 10,
      }}>
        Bigger application = more shares allocated, but more cash locked up. Skipping is also fine — {ev.stockId} will be on the open market next round.
      </div>

      <div className="ipo-options">
        {allOpts.map(a => {
          const affordable = a <= cash;
          const estShares = Math.floor(a / ev.ipoPrice * 0.375);
          return (
            <button
              key={a}
              className={'ipo-opt' + (selected === a ? ' picked' : '')}
              onClick={() => affordable && submit(a)}
              disabled={!affordable}
              style={!affordable ? {
                opacity: 0.45, cursor: 'not-allowed',
                background: '#f5f3ec', borderStyle: 'dashed',
              } : undefined}
              title={!affordable ? `Need ${formatMoney(a - cash)} more` : undefined}
            >
              <div className="ipo-opt-amount">{formatMoney(a)}</div>
              <div className="ipo-opt-sub">
                {affordable ? `likely ~${estShares} shares` : `need ${formatMoney(a - cash)} more`}
              </div>
            </button>
          );
        })}
      </div>

      {/* sell-to-fund (only when player can't afford min apply) */}
      {!canAffordMin && holdings.length > 0 && (
        <>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: '#6b6b6b', margin: '14px 0 6px',
          }}>
            SELL HOLDINGS TO FREE UP CASH
          </div>
          <div style={{
            background: '#fff7f5',
            border: '1.5px solid #f0c1b6', borderRadius: 12, padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, color: '#5a2920', lineHeight: 1.45, marginBottom: 8 }}>
              You need <b>{formatMoney(cashGapToMin)}</b> more to apply for the smallest tier ({formatMoney(minAmount)}).
              Sell some holdings below — cash arrives instantly.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {holdings.map(({ stock, qty }) => {
                const sharesNeeded = Math.ceil(cashGapToMin / stock.price);
                const sellQty     = Math.min(sharesNeeded, qty);
                const proceeds    = sellQty * stock.price;
                const coversGap   = proceeds >= cashGapToMin;
                return (
                  <button
                    key={stock.id}
                    onClick={() => sellToFund(stock.id, qty, stock.price)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#fff', border: '1.5px solid #e8c5be',
                      borderRadius: 10, padding: '9px 11px',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = ''}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{stock.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Geist Mono, ui-monospace',
                        fontSize: 12, fontWeight: 700, color: '#111',
                      }}>{stock.id}</div>
                      <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 1 }}>
                        Sell <b>{sellQty}</b>{sellQty < qty ? ` of ${qty}` : ''} share{sellQty !== 1 ? 's' : ''}
                        {coversGap ? ' · covers the gap ✓' : ' · still short after'}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                      fontSize: 13, color: '#c24a3a',
                    }}>
                      +{formatMoney(proceeds)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#8a5a52', marginTop: 8, textAlign: 'center' }}>
              You can also do nothing and skip the IPO.
            </div>
          </div>
        </>
      )}

      {/* When player CAN afford but has holdings: keep an optional sell affordance */}
      {canAffordMin && holdings.length > 0 && (
        <details style={{
          marginTop: 6, marginBottom: 12,
          fontSize: 12, color: '#6b6b6b',
        }}>
          <summary style={{ cursor: 'pointer', padding: '6px 2px' }}>
            Want to free up more cash? Sell holdings →
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {holdings.map(({ stock, qty }) => (
              <button
                key={stock.id}
                onClick={() => sellAll(stock.id, qty)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', border: '1.5px solid #e6e3dc',
                  borderRadius: 10, padding: '8px 10px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 20 }}>{stock.emoji}</span>
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700, color: '#111' }}>
                  {stock.id} ×{qty}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 12, color: '#c24a3a' }}>
                  +{formatMoney(qty * stock.price)}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}

      <button className="skip-btn" onClick={skip}>
        Skip — buy {ev.stockId} on the open market next round
      </button>

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

// Theme for the two choice corporate actions
const CHOICE_EVENT_THEME = {
  buyback: { tint: '#7c3aed', bg: '#f3eaff', border: '#d4b6f5', soft: 'rgba(124,58,237,0.08)', deep: '#5a1ea8' },
  rights:  { tint: '#0891b2', bg: '#e6f6fb', border: '#a8d8e7', soft: 'rgba(8,145,178,0.08)',  deep: '#08576c' },
};

// Reusable big choice button row
function BigChoiceRow({ accept, reject }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
      <button
        onClick={accept.onClick}
        disabled={accept.disabled}
        style={{
          padding: '16px 12px',
          background: accept.disabled ? '#cfd8de' : 'linear-gradient(135deg, #15803d, #0a5a32)',
          color: '#fff',
          border: 'none', borderRadius: 12,
          fontFamily: 'inherit', cursor: accept.disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center', boxShadow: accept.disabled ? 'none' : '0 4px 12px rgba(22,163,74,0.25)',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{accept.title}</div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>{accept.sub}</div>
      </button>
      <button
        onClick={reject.onClick}
        style={{
          padding: '16px 12px',
          background: '#fff',
          color: '#475569',
          border: '2px solid #cbd5e1', borderRadius: 12,
          fontFamily: 'inherit', cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{reject.title}</div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>{reject.sub}</div>
      </button>
    </div>
  );
}

function BuybackEvent({ ev, me, state }) {
  const player = state.players[me.id];
  const held   = player?.holdings?.[ev.stockId] || 0;
  // Use state.stocks (live prices), not window.STOCKS (static definitions, no price)
  const stock  = (state.stocks || []).find(s => s.id === ev.stockId);
  const price  = stock?.price || 0;
  const bbPrice = Math.round(price * (1 + ev.premium));
  const maxShares = held > 0 ? Math.max(1, Math.floor(held * ev.maxPct)) : 0;
  const cashOut = maxShares * bbPrice;
  const profit  = maxShares * (bbPrice - price);
  const theme   = CHOICE_EVENT_THEME.buyback;

  if (held === 0) {
    return (
      <div className="event-card">
        <AutoEventHeader icon="🔄" badge="Buyback Offer" theme={theme} stock={stock} />
        <NotHeldHint stockId={ev.stockId} theme={theme} kind="buyback" />
        <NextStep theme={theme}>
          You don't own {ev.stockId}, so this offer isn't for you. Tap below to continue.
        </NextStep>
        <button className="big-btn" style={{ width: '100%' }}
          onClick={() => window.StockRush.submitChoice(me.id, 'reject')}>Continue →</button>
        <StoryBlock headline={ev.headline} body={ev.body} />
      </div>
    );
  }

  return (
    <div className="event-card">
      <AutoEventHeader icon="🔄" badge={`Buyback · +${Math.round(ev.premium * 100)}% over market`} theme={theme} stock={stock} />

      {/* Hero: the premium and what you'd receive */}
      <div style={{
        background: 'linear-gradient(135deg, ' + theme.bg + ' 0%, #ffffff 100%)',
        border: '2px solid ' + theme.border,
        borderRadius: 14, padding: '16px', marginBottom: 12,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'baseline' }}>
          <div>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.14em', color: '#64748b', textTransform: 'uppercase',
            }}>Market price</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#475569', marginTop: 2, lineHeight: 1 }}>
              {formatMoney(price)}
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.14em', color: theme.tint, textTransform: 'uppercase',
            }}>Buyback price · +{Math.round(ev.premium * 100)}%</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: theme.deep, marginTop: 2, lineHeight: 1 }}>
              {formatMoney(bbPrice)}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + theme.border,
          fontSize: 14, color: '#0f172a', lineHeight: 1.55, textAlign: 'center',
        }}>
          If you accept, you sell <b>{maxShares}</b> of your <b>{held}</b> shares
          (the most they allow) for <b style={{ color: theme.deep, fontSize: 17 }}>{formatMoney(cashOut)}</b>.
          {profit > 0 && <> That's <b style={{ color: '#15803d' }}>{formatMoney(profit)} more</b> than selling on the market right now.</>}
        </div>
      </div>

      {/* The catch — the trade-off, front and centre */}
      <CatchCallout>
        <b>Sell at premium</b> = guaranteed extra cash now, but you own fewer {ev.stockId} shares from this round on. <b>Keep holding</b> = stay fully invested if you think {ev.stockId} will rise further. There's no half-measure — you sell all {maxShares} or none.
      </CatchCallout>

      <div style={{
        fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 10,
      }}>
        Your decision:
      </div>

      <BigChoiceRow
        accept={{
          title: `✅ Sell ${maxShares} at +${Math.round(ev.premium * 100)}%`,
          sub: `Get ${formatMoney(cashOut)}${profit > 0 ? ` · +${formatMoney(profit)} bonus` : ''}`,
          onClick: () => window.StockRush.submitChoice(me.id, 'accept'),
        }}
        reject={{
          title: `❌ Hold all ${held}`,
          sub: 'Bet on more upside',
          onClick: () => window.StockRush.submitChoice(me.id, 'reject'),
        }}
      />

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

function RightsEvent({ ev, me, state }) {
  const player = state.players[me.id];
  const held   = player?.holdings?.[ev.stockId] || 0;
  // Use state.stocks (live prices), not window.STOCKS (static definitions, no price)
  const stock  = (state.stocks || []).find(s => s.id === ev.stockId);
  const price  = stock?.price || 0;
  const rightsShares = held > 0 ? Math.floor(held * ev.ratio) : 0;
  const rightsPrice  = Math.round(price * (1 - ev.discount));
  const totalCost    = rightsShares * rightsPrice;
  const marketCost   = rightsShares * price;
  const savings      = marketCost - totalCost;
  const cash         = player?.cash || 0;
  const canAfford    = cash >= totalCost;
  const cashGap      = Math.max(0, totalCost - cash);
  const theme        = CHOICE_EVENT_THEME.rights;

  // All holdings that can be sold to free up cash (sells are allowed during events phase)
  const sellableHoldings = (state.stocks || [])
    .map(s => ({ stock: s, qty: player?.holdings?.[s.id] || 0 }))
    .filter(h => h.qty > 0);

  function sellToFundRights(stockId, qty, stockPrice) {
    const sharesNeeded = Math.ceil(cashGap / stockPrice);
    const sellQty = Math.min(sharesNeeded, qty);
    window.StockRush.sell(me.id, stockId, sellQty);
  }

  if (held === 0) {
    return (
      <div className="event-card">
        <AutoEventHeader icon="📜" badge="Rights Issue · Holders Only" theme={theme} stock={stock} />
        <NotHeldHint stockId={ev.stockId} theme={theme} kind="rights" />
        <NextStep theme={theme}>
          Rights issues are only for existing shareholders. Tap below to continue.
        </NextStep>
        <button className="big-btn" style={{ width: '100%' }}
          onClick={() => window.StockRush.submitChoice(me.id, 'reject')}>Continue →</button>
        <StoryBlock headline={ev.headline} body={ev.body} />
      </div>
    );
  }

  return (
    <div className="event-card">
      <AutoEventHeader icon="📜" badge={`Rights Issue · ${Math.round(ev.discount * 100)}% off`} theme={theme} stock={stock} />

      {/* Hero: discounted price + total cost */}
      <div style={{
        background: 'linear-gradient(135deg, ' + theme.bg + ' 0%, #ffffff 100%)',
        border: '2px solid ' + theme.border,
        borderRadius: 14, padding: '16px', marginBottom: 12,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'baseline' }}>
          <div>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.14em', color: '#64748b', textTransform: 'uppercase',
            }}>Market price</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#475569', marginTop: 2, lineHeight: 1, textDecoration: 'line-through' }}>
              {formatMoney(price)}
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.14em', color: theme.tint, textTransform: 'uppercase',
            }}>Your price · {Math.round(ev.discount * 100)}% off</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: theme.deep, marginTop: 2, lineHeight: 1 }}>
              {formatMoney(rightsPrice)}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + theme.border,
          fontSize: 14, color: '#0f172a', lineHeight: 1.55, textAlign: 'center',
        }}>
          You can buy <b>{rightsShares}</b> new share{rightsShares !== 1 ? 's' : ''} for <b style={{ color: theme.deep, fontSize: 17 }}>{formatMoney(totalCost)}</b>.
          {savings > 0 && <> That's <b style={{ color: '#15803d' }}>{formatMoney(savings)} less</b> than buying on the market.</>}
        </div>
        {!canAfford && (
          <div style={{
            marginTop: 12, padding: '8px 12px',
            background: 'rgba(220,38,38,0.10)', color: '#b91c1c',
            border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8,
            fontSize: 13, textAlign: 'center', fontWeight: 600,
          }}>
            ⚠️ Not enough cash — you have {formatMoney(player?.cash)}, need {formatMoney(totalCost)}
          </div>
        )}
      </div>

      {/* The catch — what each choice costs */}
      <CatchCallout>
        <b>Buy discounted shares</b> = put more cash in, get {ev.stockId} cheaper than anyone on the market. <b>Skip</b> = keep your cash, but your stake in {ev.stockId} gets smaller because new shares go to other investors (this is called dilution).
      </CatchCallout>

      <div style={{
        fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 10,
      }}>
        Your decision:
      </div>

      {/* Sell to fund — shown when player can't afford the rights issue */}
      {!canAfford && sellableHoldings.length > 0 && (
        <>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: '#6b6b6b', margin: '0 0 6px',
          }}>
            SELL HOLDINGS TO FREE UP CASH
          </div>
          <div style={{
            background: '#fff7f5',
            border: '1.5px solid #f0c1b6', borderRadius: 12, padding: '10px 12px',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 12, color: '#5a2920', lineHeight: 1.45, marginBottom: 8 }}>
              You need <b>{formatMoney(cashGap)}</b> more to accept.
              Sell some holdings below — cash arrives instantly.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sellableHoldings.map(({ stock: s, qty }) => {
                const sharesNeeded = Math.ceil(cashGap / s.price);
                const sellQty      = Math.min(sharesNeeded, qty);
                const proceeds     = sellQty * s.price;
                const coversGap    = proceeds >= cashGap;
                return (
                  <button
                    key={s.id}
                    onClick={() => sellToFundRights(s.id, qty, s.price)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: '#fff', border: '1.5px solid #e8c5be',
                      borderRadius: 10, padding: '9px 11px',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={e => e.currentTarget.style.transform = ''}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1 }}>{s.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700, color: '#111' }}>
                        {s.id}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b6b6b', marginTop: 1 }}>
                        Sell <b>{sellQty}</b>{sellQty < qty ? ` of ${qty}` : ''} share{sellQty !== 1 ? 's' : ''}
                        {coversGap ? ' · covers the gap ✓' : ' · still short after'}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 13, color: '#c24a3a' }}>
                      +{formatMoney(proceeds)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#8a5a52', marginTop: 8, textAlign: 'center' }}>
              You can also skip and decline the offer.
            </div>
          </div>
        </>
      )}

      {/* Optional sell for players who can afford but want more cash */}
      {canAfford && sellableHoldings.length > 0 && (
        <details style={{ marginBottom: 12, fontSize: 12, color: '#6b6b6b' }}>
          <summary style={{ cursor: 'pointer', padding: '6px 2px' }}>
            Want to free up more cash first? Sell holdings →
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sellableHoldings.map(({ stock: s, qty }) => (
              <button
                key={s.id}
                onClick={() => window.StockRush.sell(me.id, s.id, qty)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', border: '1.5px solid #e6e3dc',
                  borderRadius: 10, padding: '8px 10px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700, color: '#111' }}>
                  {s.id} ×{qty}
                </span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 12, color: '#c24a3a' }}>
                  +{formatMoney(qty * s.price)}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}

      <BigChoiceRow
        accept={{
          title: `✅ Buy ${rightsShares} discounted share${rightsShares !== 1 ? 's' : ''}`,
          sub: `Pay ${formatMoney(totalCost)}${savings > 0 ? ` · save ${formatMoney(savings)}` : ''}`,
          disabled: !canAfford,
          onClick: () => canAfford && window.StockRush.submitChoice(me.id, 'accept'),
        }}
        reject={{
          title: '❌ Skip',
          sub: 'Keep cash, accept some dilution',
          onClick: () => window.StockRush.submitChoice(me.id, 'reject'),
        }}
      />

      <StoryBlock headline={ev.headline} body={ev.body} />
    </div>
  );
}

// ── Trading phase ─────────────────────────────────────────────────────────────

function PlayerTrading({ me, state, isLocked, allStocks }) {
  const [tab, setTab]               = React.useState('trade');
  const [tradeSheet, setTradeSheet] = React.useState(null); // { stock, mode }
  const [tradeToast, setTradeToast] = React.useState(null);
  const [lockConfirm, setLockConfirm] = React.useState(false);
  const [roundTrades, setRoundTrades] = React.useState([]);
  const player = state.players[me.id] || me;

  // Reset round-trade log whenever round changes
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
  const [newsClosed, setNewsClosed] = React.useState(false);
  // No auto-dismiss any more — student decides when to close the popup.
  const flashing = latestNews && latestNews.round !== seenNewsRound && !newsClosed;
  React.useEffect(() => {
    if (latestNews && latestNews.round !== seenNewsRound) {
      setNewsClosed(false);
    }
  }, [latestNews?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const worthHistory = player.worthHistory || [window.GAME_CONFIG.startingCash];
  // Smart-append: only add live worth as trailing point if it differs from last snapshot
  const journey = (() => {
    const last = worthHistory[worthHistory.length - 1];
    return Math.abs(total - last) < 1 ? worthHistory : [...worthHistory, total];
  })();

  // Current holdings as compact list
  const currentHoldings = allStocks
    .filter(s => (player.holdings?.[s.id] || 0) > 0)
    .map(s => ({ stock: s, qty: player.holdings[s.id], value: player.holdings[s.id] * s.price }));

  function openSheet(stock, mode) { setTradeSheet({ stock, mode }); }
  function handleTradeDone(result) {
    setTradeToast(result);
    setRoundTrades(prev => [...prev, result]);
  }

  return (
    <div className="player-body">
      {tradeToast && (
        <TradeToast trade={tradeToast} onDone={() => setTradeToast(null)} />
      )}
      {tradeSheet && (
        <TradeSheet
          stock={tradeSheet.stock}
          me={player}
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
          onConfirm={() => { setLockConfirm(false); window.StockRush.lock(me.id); }}
        />
      )}

      {flashing && (
        <NewsToast
          news={latestNews}
          onReact={e => window.StockRush.react(me.id, e)}
          onClose={() => { setNewsClosed(true); setSeenNewsRound(latestNews.round); }}
        />
      )}

      {/* Paused banner — teacher has paused for discussion */}
      {state.paused && (
        <div style={{
          background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
          border: '2px solid #b45309',
          borderRadius: 12,
          padding: '12px 16px',
          margin: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'sr-pause-pulse 1.8s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>⏸</span>
          <div>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.14em', color: '#7a3a08', textTransform: 'uppercase',
            }}>Paused for discussion</div>
            <div style={{ fontSize: 13, color: '#5b3d10', fontWeight: 600 }}>
              Trading is locked. Listen to your teacher — back in a moment.
            </div>
          </div>
          <style>{`
            @keyframes sr-pause-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(180,83,9,0.20); }
              50%      { box-shadow: 0 0 0 6px rgba(180,83,9,0); }
            }
          `}</style>
        </div>
      )}

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

      {/* Always-visible holdings strip */}
      {currentHoldings.length > 0 && (
        <HoldingsStrip holdings={currentHoldings} onTap={() => setTab('portfolio')} />
      )}

      {journey.length > 1 && <WorthChart history={journey} />}

      {/* Lock button */}
      <div className="lock-zone">
        {isLocked
          ? <div className="locked-badge">🔒 Locked in — waiting for teacher</div>
          : <button className="lock-btn" onClick={() => setLockConfirm(true)}>
              🔒 Lock in my trades
            </button>
        }
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
        <>
          <div className="tab-row">
            <button className={'tab' + (tab !== 'news' ? ' active' : '')} onClick={() => setTab('portfolio')}>Portfolio</button>
            <button className={'tab' + (tab === 'news' ? ' active' : '')} onClick={() => setTab('news')}>
              News {state.news?.length > 0 && <span className="badge">{state.news.length}</span>}
            </button>
          </div>
          {tab !== 'news' && <PortfolioList me={player} state={state} allStocks={allStocks} />}
          {tab === 'news'  && <PlayerNewsList state={state} me={player} />}
        </>
      )}
    </div>
  );
}

// ── Trade list ────────────────────────────────────────────────────────────────

function TradeList({ me, state, allStocks, onTrade }) {
  return (
    <div className="trade-list">
      {allStocks.map(s => (
        <TradeCard key={s.id} stock={s} me={me} onTrade={onTrade} round={state.round} />
      ))}
    </div>
  );
}

// ── Trade card ────────────────────────────────────────────────────────────────

function TradeCard({ stock, me, onTrade, round }) {
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

  // Where this company is heading THIS round (from ROUND_NEWS).
  // ROUND_NEWS[round-1].notes is the round we're CURRENTLY in (showing the move INTO this round).
  const roundNote = window.ROUND_NEWS?.[(round || 1) - 1]?.notes?.[stock.id] || null;

  return (
    <div style={{
      background: 'white',
      borderBottom: '1px solid var(--faint)',
      borderLeft: held > 0 ? '3px solid var(--up)' : 'none',
    }}>
      {/* The trade row — flex layout preserved exactly */}
      <div
        className={'trade-card' + (held > 0 ? ' holding' : '')}
        style={{ borderBottom: 'none', borderLeft: 'none', paddingLeft: held > 0 ? 13 : 16 }}
      >
        <div
          className="tc-left"
          onClick={() => setExpanded(e => !e)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
          title="Tap for company briefing"
        >
          <div className="tc-emoji">{stock.emoji}</div>
          <div className="tc-info">
            <div className="tc-id">
              {stock.id}
              <span className="tc-name"> {stock.name}</span>
              {stock.cap && <span className={'tc-cap tc-cap-' + stock.cap}>{stock.cap[0].toUpperCase() + stock.cap.slice(1)} cap</span>}
              <span style={{
                marginLeft: 6, fontSize: 10, color: '#94a3b8',
                transition: 'transform .15s', display: 'inline-block',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>▾</span>
            </div>
            <div className="tc-price-row">
              <span className="tc-price">₹{stock.price.toLocaleString('en-IN')}</span>
              {Math.abs(pct) > 0.01 && (
                <span className={'tc-delta ' + (priceUp ? 'up' : 'down')}>
                  {priceUp ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
                </span>
              )}
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
        <div className="tc-btns">
          <button
            className={'tc-buy-btn' + (!canBuy ? ' cant' : '')}
            onClick={() => canBuy && onTrade(stock, 'buy')}
          >
            BUY
          </button>
          {held > 0 && (
            <button className="tc-sell-btn" onClick={() => onTrade(stock, 'sell')}>
              SELL
            </button>
          )}
        </div>
      </div>

      {/* Briefing — rendered BELOW the row (as a sibling), not inside the flex container */}
      {expanded && (
        <div style={{
          padding: '12px 16px 14px',
          background: '#fafaf7',
          borderTop: '1px dashed var(--faint)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Close button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', color: '#64748b', textTransform: 'uppercase',
              flex: 1,
            }}>
              📖 Company briefing · {stock.id}
            </span>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close briefing"
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#fff', border: '1.5px solid var(--faint)',
                color: '#64748b', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>

          {/* Description */}
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
            {stock.desc}
          </div>

          {/* This-round movement note */}
          {roundNote && (
            <div style={{
              padding: '10px 12px',
              background: roundNote.dir === 'up' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
              borderLeft: `3px solid ${roundNote.dir === 'up' ? '#15803d' : '#b91c1c'}`,
              borderRadius: '0 6px 6px 0',
              fontSize: 12.5, lineHeight: 1.5,
            }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', color: roundNote.dir === 'up' ? '#15803d' : '#b91c1c',
                textTransform: 'uppercase', marginBottom: 4,
              }}>
                {roundNote.dir === 'up' ? '▲' : '▼'} {window.ROUND_YEARS?.[(round || 1) - 1] || 'This round'} · {Math.abs(roundNote.pct).toFixed(0)}%
              </div>
              <div style={{ color: '#0f172a' }}>{roundNote.why}</div>
            </div>
          )}

          {/* Fun fact + watch-for */}
          {stock.fun && (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <b style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, letterSpacing: '0.12em', color: '#64748b' }}>💡 FUN FACT</b><br />
              {stock.fun}
            </div>
          )}
          {stock.watch && (
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <b style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, letterSpacing: '0.12em', color: '#64748b' }}>👀 WATCH FOR</b><br />
              {stock.watch}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Trade sheet (bottom drawer) ───────────────────────────────────────────────

function TradeSheet({ stock, me, initialMode, onClose, onDone }) {
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
    if (mode === 'buy')  window.StockRush.buy(me.id, stock.id, effQty);
    if (mode === 'sell') window.StockRush.sell(me.id, stock.id, effQty);
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
            <div className="sheet-ticker">
              {stock.id}<span className="sheet-sname"> · {stock.name}</span>
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

        {/* Scroll region — keeps confirm above keyboard */}
        <div className="sheet-scroll">

        {/* Big quantity picker */}
        <div className="sheet-qty-row">
          <button className="sheet-nudge" onClick={() => setQty(q => Math.max(0, q - 1))}>−</button>
          <div className="sheet-qty-num">{qty}</div>
          <button className="sheet-nudge" onClick={() => addQty(1)}>+</button>
        </div>

        {/* % presets — adult-friendly position sizing */}
        <div className="sheet-presets">
          {[0.25, 0.5, 0.75].map(pct => (
            <button
              key={pct}
              className="sheet-preset pct"
              onClick={() => setQty(Math.max(1, Math.floor(max * pct)))}
              disabled={max === 0}
            >{Math.round(pct * 100)}%</button>
          ))}
          <button className="sheet-preset max" onClick={setMax} disabled={max === 0}>MAX</button>
          {qty > 0 && <button className="sheet-preset clear" onClick={() => setQty(0)}>✕</button>}
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

        {/* Cost summary */}
        {effQty > 0 && (
          <div className="sheet-summary">
            <div className="sheet-sum-row">
              <span>{mode === 'buy' ? 'Total cost' : 'You receive'}</span>
              <b>{formatMoney(total)}</b>
            </div>
            <div className="sheet-sum-row">
              <span>Cash after</span>
              <b className={cashAfter < 0 ? 'warn' : ''}>{formatMoney(cashAfter)}</b>
            </div>
          </div>
        )}

        </div>{/* end sheet-scroll */}

        {/* Confirm button */}
        <button
          className={'sheet-confirm ' + mode + (!canConfirm ? ' disabled' : '')}
          onClick={confirm}
          disabled={!canConfirm}
        >
          {canConfirm
            ? (mode === 'buy'
                ? `✓ Buy ${effQty} × ${stock.id} · ${formatMoney(total)}`
                : `✓ Sell ${effQty} × ${stock.id} · ${formatMoney(total)}`)
            : 'Tap + to pick quantity'}
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

function PortfolioList({ me, state, allStocks }) {
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

  const divEarned = me.dividendsEarned || 0;

  return (
    <div className="portfolio-list">
      {rows.map(({ stock, qty, avgCost, curPrice, pnlPct, totalVal, totalPnl }) => {
        const up = totalPnl >= 0;
        return (
          <div className="portfolio-row" key={stock.id}>
            <div className="pf-top">
              <div className="trade-mark">{stock.mono}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trade-ticker">{stock.id} <span className="muted small">{stock.name}</span></div>
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
            </div>
          </div>
        );
      })}
      {divEarned > 0 && (
        <div style={{ padding: '10px 18px', background: '#fffdf0', borderTop: '1px dashed #e6e3dc',
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 12 }}>
          💰 Dividends earned this game: <b>{formatMoney(divEarned)}</b>
        </div>
      )}
    </div>
  );
}

// ── News list ─────────────────────────────────────────────────────────────────

function PlayerNewsList({ state, me }) {
  if (!state.news?.length) return <div className="empty">No headlines yet.</div>;
  return (
    <div className="player-news">
      {state.news.map(n => (
        <div className="player-news-item" key={n.round}>
          <div className="pn-round">ROUND {n.round}</div>
          <div className="pn-headline">{n.headline}</div>
          <div className="pn-body">{n.body}</div>
          {n.impacts && (
            <div className="toast-impacts">
              {Object.entries(n.impacts).map(([tk, mult]) => (
                <div key={tk} className={'impact ' + (mult >= 1 ? 'up' : 'down')}>
                  {tk} {mult >= 1 ? '+' : ''}{((mult-1)*100).toFixed(0)}%
                </div>
              ))}
            </div>
          )}
          <div className="pn-react">
            {['🔥','😱','💸','🎉','😬'].map(e => (
              <button key={e} className="react-btn" onClick={() => window.StockRush.react(me.id, e)}>{e}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── News toast ────────────────────────────────────────────────────────────────

function NewsToast({ news, onReact, onClose }) {
  const [reacted, setReacted] = React.useState(null);
  // Pull title (before em-dash) and rest of headline for richer layout
  const parts = (news.headline || '').split('—');
  const tag   = (parts[0] || 'NEWS').trim();
  const rest  = parts.length > 1 ? parts.slice(1).join('—').trim() : null;
  const yearLabel = window.ROUND_YEARS?.[news.round - 1] || `R${news.round}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(7, 26, 16, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 18,
        animation: 'sr-news-fade 0.22s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: 18,
          width: '100%', maxWidth: 460,
          boxShadow: '0 24px 60px rgba(146,64,14,0.32)',
          border: '1.5px solid rgba(217,119,6,0.35)',
          overflow: 'hidden',
          animation: 'sr-news-rise 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15)',
        }}
      >
        {/* Header strip */}
        <div style={{
          background: 'linear-gradient(135deg, #92400e 0%, #b45309 100%)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          color: '#fff',
        }}>
          <span style={{
            display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
            background: '#fff', animation: 'sr-news-pulse 1.4s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.18em', opacity: 0.85,
            }}>
              BREAKING · ROUND {news.round} · {yearLabel}
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
              marginTop: 2, lineHeight: 1.2,
            }}>
              {tag}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Dismiss"
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              fontSize: 18, fontWeight: 700, lineHeight: 1,
              cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 14px' }}>
          {rest && (
            <div style={{
              fontSize: 17, fontWeight: 700, color: '#0f172a',
              lineHeight: 1.35, letterSpacing: '-0.01em', marginBottom: 10,
            }}>
              {rest}
            </div>
          )}
          {news.subhead && (
            <div style={{
              fontSize: 13.5, color: '#5b3d10', lineHeight: 1.55, marginBottom: 4,
            }}>
              {news.subhead}
            </div>
          )}
        </div>

        {/* Reactions strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 18px 16px', flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: '#92400e', marginRight: 4,
          }}>REACT</span>
          {['🔥','😱','💸','🎉','😬'].map(e => (
            <button
              key={e}
              onClick={() => { setReacted(e); onReact(e); }}
              style={{
                width: 40, height: 40, fontSize: 22,
                borderRadius: 10,
                background: reacted === e ? '#fff' : 'rgba(255,255,255,0.55)',
                border: reacted === e ? '2px solid #b45309' : '1.5px solid rgba(146,64,14,0.25)',
                cursor: 'pointer', lineHeight: 1, padding: 0,
                transform: reacted === e ? 'scale(1.08)' : 'scale(1)',
                transition: 'all .15s',
              }}
            >{e}</button>
          ))}
        </div>

        {/* Footer — explicit instruction to close */}
        <div style={{
          padding: '10px 18px 14px',
          background: 'rgba(146,64,14,0.06)',
          borderTop: '1px solid rgba(146,64,14,0.15)',
          fontSize: 12, color: '#7a3a08', textAlign: 'center', fontWeight: 600,
        }}>
          Tap <b>✕</b> or anywhere outside when you're ready to start trading
        </div>

        <style>{`
          @keyframes sr-news-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes sr-news-rise {
            from { opacity: 0; transform: translateY(20px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes sr-news-pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.4; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Worth chart (reused from Stock Rush) ──────────────────────────────────────

function WorthChart({ history }) {
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

// ── PlayerFinale — between R5 and ended, show the "one year later" reveal ──
function PlayerFinale({ me, worth }) {
  const start = window.GAME_CONFIG.startingCash;
  const profit = worth - start;
  const pct = (profit / start) * 100;
  const up = profit >= 0;
  return (
    <div className="player-body" style={{ paddingBottom: 40 }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #264d78 55%, #2a9d8f 100%)',
        color: '#fff',
        margin: '20px 16px',
        padding: '24px 20px',
        borderRadius: 18,
        textAlign: 'center',
        boxShadow: '0 14px 40px rgba(15,23,42,0.18)',
      }}>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.8,
        }}>
          🎬 One year later · 2026
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, margin: '8px 0 4px' }}>
          The year played out…
        </div>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 18, lineHeight: 1.5 }}>
          Prices snapped forward to 2026. Watch the projector for the full breakdown.
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.10)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', opacity: 0.7,
          }}>YOUR FINAL WORTH</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: '-0.01em' }}>
            {formatMoney(worth)}
          </div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 15, fontWeight: 700, marginTop: 6,
            color: up ? '#4ade80' : '#f87171',
          }}>
            {up ? '▲' : '▼'} {up ? '+' : ''}{formatMoney(profit)} ({pct.toFixed(1)}%)
          </div>
        </div>

        <div style={{ fontSize: 13, opacity: 0.7, marginTop: 16, lineHeight: 1.5 }}>
          Hold tight — the teacher is about to reveal final results.
        </div>
      </div>
    </div>
  );
}

// ── HoldingsStrip — always-visible holdings row ──────────────────────────────

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

// ── LockConfirmModal — review before locking ─────────────────────────────────

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
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.28)',
          animation: 'lc-rise 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        }}
      >
        <div style={{
          width: 36, height: 4, background: '#e2e8f0', borderRadius: 2,
          margin: '8px auto 4px',
          flexShrink: 0,
        }} />

        <div style={{ padding: '2px 16px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 2 }}>
            Round {round} · Review
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Lock in your trades?
          </div>
        </div>

        {/* Scroll region */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '10px 16px 4px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
            This round ({trades.length} trade{trades.length !== 1 ? 's' : ''})
          </div>
          {trades.length === 0 ? (
            <div style={{
              padding: '10px 12px',
              background: '#fef3c7', border: '1px solid #fde68a',
              borderRadius: 8, fontSize: 12.5, color: '#92400e',
              textAlign: 'center',
            }}>
              ⚠️ No trades yet — lock anyway?
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trades.slice(0, 6).map((t, i) => {
                const buy = t.mode === 'buy';
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '24px auto 1fr auto', gap: 8,
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: buy ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                    border: `1px solid ${buy ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                    borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 15, textAlign: 'center' }}>{t.stock.emoji}</span>
                    <span style={{
                      fontFamily: 'Geist Mono, ui-monospace', fontSize: 9.5, fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: buy ? '#15803d' : '#b91c1c',
                      padding: '1px 5px', borderRadius: 3,
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
                <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '4px 0', fontFamily: 'Geist Mono, ui-monospace' }}>
                  +{trades.length - 6} more
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '4px 16px 10px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
            After locking
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 6,
          }}>
            <div style={{ padding: '6px 8px', background: '#f1f5f9', borderRadius: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Cash</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>{formatMoney(cash)}</div>
            </div>
            <div style={{ padding: '6px 8px', background: '#f1f5f9', borderRadius: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Total</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace' }}>{formatMoney(total)}</div>
            </div>
            <div style={{
              padding: '6px 8px',
              background: up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
              borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>P&amp;L</div>
              <div style={{
                fontSize: 12.5, fontWeight: 700, fontFamily: 'Geist Mono, ui-monospace',
                color: up ? '#15803d' : '#b91c1c',
              }}>
                {up ? '+' : ''}{formatMoney(pnl)}
              </div>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: 4 }}>
              100% cash.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {holdings.slice(0, 8).map(({ stock, qty, value }) => (
                <div key={stock.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 7px',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontFamily: 'Geist Mono, ui-monospace', fontSize: 10.5, fontWeight: 700,
                }}>
                  <span style={{ fontSize: 12 }}>{stock.emoji}</span>
                  <span>{stock.id}</span>
                  <span style={{ color: '#64748b' }}>×{qty}</span>
                </div>
              ))}
              {holdings.length > 8 && (
                <span style={{ fontSize: 10.5, color: 'var(--muted)', alignSelf: 'center', fontFamily: 'Geist Mono, ui-monospace' }}>
                  +{holdings.length - 8} more
                </span>
              )}
            </div>
          )}
        </div>
        </div>{/* end scroll region */}

        <div style={{
          display: 'flex', gap: 8,
          padding: '10px 16px 14px',
          borderTop: '1px solid #e2e8f0',
          background: '#fff',
          flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 10,
              border: '1.5px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Keep trading
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              flex: 1.3,
              padding: '11px 16px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--ink)',
              color: '#fff',
              fontSize: 13, fontWeight: 700,
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

// ── EndedStat — small stat card for ended screen ──────────────────────────────

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

// ── Ended ─────────────────────────────────────────────────────────────────────

function PlayerEnded({ me, state, worth, rank, total, allStocks }) {
  const start  = window.GAME_CONFIG.startingCash;
  const profit = worth - start;
  const pctVal = (profit / start) * 100;
  const pct    = pctVal.toFixed(1);
  const worthHistory = me.worthHistory || [];

  // Per-player analysis
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
  if (cashPct > 0.6)               { style = '💰 Cash holder';   styleColor = '#64748b'; lesson = 'You played it safe — you missed market moves.'; }
  else if (distinct === 1)         { style = '🎯 All-in';        styleColor = '#dc2626'; lesson = 'Single bet — high risk, high reward.'; }
  else if (concentration > 0.6)    { style = '⚡ Concentrated'; styleColor = '#d97706'; lesson = 'Heavy in one stock — that was a conviction trade.'; }
  else if (distinct >= 4)          { style = '🌐 Diversified';   styleColor = '#0891b2'; lesson = 'You spread risk across many names.'; }
  else                              { style = '⚖️ Balanced';      styleColor = '#16a34a'; lesson = 'Mixed approach — a measured risk.'; }

  const players = Object.values(state.players);
  const bots = players.filter(p => p.isBot)
    .map(p => ({ ...p, worth: window.netWorth(p, allStocks) }));
  const beatenBots = bots.filter(b => worth > b.worth).length;

  const up = profit >= 0;

  const heroRef = React.useRef(null);
  const [sharing, setSharing] = React.useState(false);

  async function shareResults() {
    if (sharing) return;
    setSharing(true);
    const shareText = `I just played Stock Rush Pro on Investing for Mummies — finished #${rank} of ${total} with ${formatMoney(worth)} (${up ? '+' : ''}${pct}%)! 9 years of India's markets in 30 minutes. https://investingformummies.com/stock-rush-pro`;
    try {
      if (window.html2canvas && heroRef.current) {
        const canvas = await window.html2canvas(heroRef.current, {
          backgroundColor: '#fafaf7', scale: 2, useCORS: true, logging: false,
        });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        if (blob && navigator.share && navigator.canShare?.({ files: [new File([blob], 'stock-rush-pro.png', { type: 'image/png' })] })) {
          await navigator.share({
            title: 'My Stock Rush Pro result',
            text: shareText,
            files: [new File([blob], 'stock-rush-pro.png', { type: 'image/png' })],
          });
        } else if (blob) {
          // Fallback — download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `stock-rush-pro-${me.name}.png`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      } else if (navigator.share) {
        await navigator.share({ title: 'Stock Rush Pro', text: shareText });
      } else {
        await navigator.clipboard?.writeText(shareText);
        alert('Result copied to clipboard!');
      }
    } catch (e) { /* user cancelled or browser blocked — silent */ }
    setSharing(false);
  }

  return (
    <div className="player-body ended-body" style={{ paddingBottom: 40 }}>
      <div className="ended-card" ref={heroRef}>
        <div className="ended-eyebrow">Game over</div>
        <div className="ended-rank">#{rank} <span className="muted">of {total}</span></div>
        <Avatar name={me.name} color={me.color} avatar={me.avatar} size={72} />
        <div className="ended-name">{me.name}</div>
        <div className="ended-worth">{formatMoney(worth)}</div>
        <div className={'ended-profit ' + (up ? 'up' : 'down')}>
          {up ? '+' : ''}{formatMoney(profit)} ({pct}%)
        </div>
        {rank === 1 && <div className="ended-trophy">🏆 Top trader!</div>}
        {me.dividendsEarned > 0 && (
          <div className="muted small" style={{ marginTop: 8 }}>
            💰 Dividends earned: {formatMoney(me.dividendsEarned)}
          </div>
        )}

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

      {/* Share my results — capture the hero card as PNG, drop into WhatsApp / native share */}
      <div style={{ padding: '12px 16px 0' }}>
        <button
          onClick={shareResults}
          disabled={sharing}
          style={{
            width: '100%',
            padding: '14px 16px',
            background: sharing ? '#cfd8de' : 'linear-gradient(135deg,#2a9d8f,#1f7a6f)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontFamily: 'inherit',
            fontSize: 16, fontWeight: 700, letterSpacing: '0.02em',
            cursor: sharing ? 'wait' : 'pointer',
            boxShadow: sharing ? 'none' : '0 6px 18px rgba(31,122,111,0.32)',
          }}
        >
          {sharing ? 'Preparing image…' : '📤 Share my result'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
          Generates a PNG of your card · works with WhatsApp, Instagram, anywhere
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        <EndedStat label="Stocks" value={distinct} />
        <EndedStat label="Hit rate" value={positions.length ? `${winners}/${positions.length}` : '—'} tone={winners > positions.length / 2 ? 'up' : 'neutral'} />
        <EndedStat label="Beat bots" value={`${beatenBots}/${bots.length}`} tone={beatenBots > bots.length / 2 ? 'up' : 'neutral'} />
      </div>

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

      {/* === DEEPER ANALYSIS === */}
      {worthHistory.length > 1 && <RoundByRoundJourney history={worthHistory} />}
      {(positions.length > 0 || me.cash > 0) && <SectorComposition positions={positions} cash={me.cash} worth={worth} />}
      <WhatIfComparison worth={worth} state={state} />
    </div>
  );
}

// ── End-screen analysis components ──────────────────────────────────────────

// Section title used by all the new analytical panels
function EndedSectionTitle({ eyebrow, title, hint }) {
  return (
    <div style={{ padding: '4px 18px 0' }}>
      <div style={{
        fontFamily: 'Geist Mono, ui-monospace', fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.14em', color: '#9aa3ad', textTransform: 'uppercase',
      }}>{eyebrow}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginTop: 2, lineHeight: 1.25 }}>
        {title}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.45 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// Round-by-round journey — what your worth was at the end of each round
function RoundByRoundJourney({ history }) {
  const years = window.ROUND_YEARS || [];
  const start = window.GAME_CONFIG.startingCash;
  // history[0] is starting cash; rows are end-of-round-i for i=1..N
  const rows = history.slice(1).map((worth, i) => {
    const prev = history[i] || start;
    const delta = worth - prev;
    const pct = prev > 0 ? (delta / prev) * 100 : 0;
    return {
      year: years[i] || `R${i + 1}`,
      roundIdx: i + 1,
      worth,
      delta,
      pct,
      up: delta >= 0,
    };
  });
  if (rows.length === 0) return null;
  const maxAbs = Math.max(1, ...rows.map(r => Math.abs(r.delta)));

  return (
    <div style={{ marginTop: 22 }}>
      <EndedSectionTitle
        eyebrow="Your journey"
        title="Where you stood at the end of each year"
        hint="Worth at every round transition, with the news-driven move between them."
      />
      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => {
          const barWidth = Math.abs(r.delta) / maxAbs * 100;
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '54px 1fr 92px 78px',
              alignItems: 'center', gap: 10,
              padding: '8px 12px',
              background: '#fff',
              border: '1px solid var(--faint)',
              borderRadius: 8,
            }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                fontSize: 13, color: '#0f172a',
              }}>{r.year}</div>
              {/* Delta bar */}
              <div style={{ position: 'relative', height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: r.up ? '50%' : `${50 - barWidth / 2}%`,
                  width: `${barWidth / 2}%`,
                  background: r.up ? '#15803d' : '#b91c1c',
                  borderRadius: 3,
                }} />
                <div style={{
                  position: 'absolute', left: '50%', top: -2, bottom: -2,
                  width: 1, background: '#cbd5e1',
                }} />
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                fontSize: 13, textAlign: 'right', color: '#0f172a',
              }}>{formatMoney(r.worth)}</div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                fontSize: 11, textAlign: 'right',
                color: r.up ? '#15803d' : '#b91c1c',
                background: r.up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                padding: '3px 6px', borderRadius: 4,
              }}>
                {r.up ? '▲' : '▼'} {Math.abs(r.pct).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sector composition — donut + sector chips
function SectorComposition({ positions, cash, worth }) {
  const COLORS = window.SECTOR_COLORS || {};
  const bySector = {};
  for (const p of positions) {
    const sec = p.sector || 'Other';
    bySector[sec] = (bySector[sec] || 0) + p.value;
  }
  const slices = Object.entries(bySector)
    .map(([sec, val]) => ({
      label: sec, value: val,
      color: COLORS[sec]?.border || '#64748b',
      bg: COLORS[sec]?.bg || '#f1f5f9',
      text: COLORS[sec]?.text || '#334155',
    }))
    .sort((a, b) => b.value - a.value);

  if (cash > 0) {
    slices.push({ label: 'Cash', value: cash, color: '#cbd5e1', bg: '#f1f5f9', text: '#475569' });
  }

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

  // Donut SVG
  const cx = 50, cy = 50, r = 38, sw = 14;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices.map(s => {
    const frac = s.value / total;
    const arc = { ...s, dash: frac * C, offset };
    offset += frac * C;
    return arc;
  });

  return (
    <div style={{ marginTop: 22 }}>
      <EndedSectionTitle
        eyebrow="Composition"
        title="Where your money sits"
        hint="Your portfolio mix at game end, sliced by sector."
      />
      <div style={{
        padding: '12px 16px 0',
        display: 'grid', gridTemplateColumns: '108px 1fr', gap: 14, alignItems: 'center',
      }}>
        <div style={{ position: 'relative', width: 108, height: 108 }}>
          <svg width={108} height={108} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
            {arcs.map((a, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={a.color} strokeWidth={sw}
                strokeDasharray={`${a.dash.toFixed(2)} ${C.toFixed(2)}`}
                strokeDashoffset={(-a.offset).toFixed(2)}
                strokeLinecap="butt" />
            ))}
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Geist Mono, ui-monospace',
          }}>
            <div style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.1em' }}>WORTH</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>{formatMoney(worth)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {slices.map((s, i) => {
            const pctVal = (s.value / total) * 100;
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '12px 1fr 56px 44px',
                alignItems: 'center', gap: 8,
                fontFamily: 'Geist Mono, ui-monospace',
                padding: '5px 8px', borderRadius: 6,
                background: s.bg, color: s.text,
                fontSize: 11.5, fontWeight: 700,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span>{s.label}</span>
                <span style={{ textAlign: 'right' }}>{formatMoney(s.value)}</span>
                <span style={{ textAlign: 'right' }}>{pctVal.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// "What if you'd just bought one stock and held"
// Compares the student's actual worth against pure buy-and-hold of each stock
// from round 1 to the final round. Auto corporate actions (splits/bonus) are
// derived from state.eventScript so any game configuration works correctly.
function WhatIfComparison({ worth, state }) {
  const cfg   = window.GAME_CONFIG;
  const start = cfg.startingCash;

  // Use state's round prices (fall back to window for old games without rotation)
  const roundPrices = state?.roundPrices || window.ROUND_PRICES || [];
  const r1    = roundPrices[0] || {};
  const rLast = roundPrices[roundPrices.length - 1] || {};

  // Build share-quantity multipliers from the event script (split × bonus)
  const SPLITS = {};
  const evScript = state?.eventScript || window.EVENT_SCRIPT || [];
  for (const ev of evScript) {
    if (ev.type === 'split') SPLITS[ev.stockId] = ev.ratio;        // 1→ratio shares
    if (ev.type === 'bonus') SPLITS[ev.stockId] = 1 + ev.ratio;    // 1→(1+ratio) shares
  }

  // Use stocks from state (excludes IPO stock — it has no R1 price)
  const stockList = state?.stocks || window.STOCKS || [];

  const scenarios = stockList
    .map(stk => {
      const buy = r1[stk.id];
      const sell = rLast[stk.id];
      if (!buy || !sell) return null;
      const shares = Math.floor(start / buy);
      const finalShares = shares * (SPLITS[stk.id] || 1);
      const finalValue = finalShares * sell;
      const ret = ((finalValue - start) / start) * 100;
      return { ...stk, finalValue, ret };
    })
    .filter(Boolean)
    .sort((a, b) => b.finalValue - a.finalValue);

  if (scenarios.length === 0) return null;
  const maxValue = Math.max(worth, ...scenarios.map(s => s.finalValue));
  const youPct = (worth / maxValue) * 100;

  return (
    <div style={{ marginTop: 22 }}>
      <EndedSectionTitle
        eyebrow="Counterfactual"
        title="What if you'd just bought one stock and slept for 11 years?"
        hint="₹2L all-in on each stock at 2014 prices, held through 2025. Splits and bonus shares applied."
      />
      <div style={{ padding: '10px 16px 0' }}>
        {/* YOUR result row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '38px 1fr 96px 60px',
          alignItems: 'center', gap: 8, padding: '8px 10px',
          background: 'linear-gradient(135deg,#1a3a5c,#264d78)',
          color: '#fff', borderRadius: 10, marginBottom: 8,
        }}>
          <div style={{ fontSize: 20, lineHeight: 1, textAlign: 'center' }}>👤</div>
          <div>
            <div style={{ fontSize: 9.5, opacity: 0.7, letterSpacing: '0.12em', fontFamily: 'Geist Mono, ui-monospace' }}>YOU PLAYED</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Active trading across 6 rounds</div>
          </div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 14,
            textAlign: 'right',
          }}>{formatMoney(worth)}</div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 12,
            textAlign: 'right', color: worth >= start ? '#4ade80' : '#f87171',
          }}>{worth >= start ? '+' : ''}{(((worth - start) / start) * 100).toFixed(0)}%</div>
        </div>

        {/* Buy-and-hold scenarios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scenarios.map((s, i) => {
            const widthPct = (s.finalValue / maxValue) * 100;
            const beatYou = s.finalValue > worth;
            return (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '38px 1fr 96px 60px',
                alignItems: 'center', gap: 8, padding: '6px 10px',
                background: '#fff', border: '1px solid var(--faint)', borderRadius: 8,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Background fill bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0,
                  width: `${widthPct}%`,
                  background: beatYou ? 'rgba(22,163,74,0.07)' : 'rgba(15,23,42,0.04)',
                  borderRight: `2px solid ${beatYou ? 'rgba(22,163,74,0.3)' : 'rgba(15,23,42,0.10)'}`,
                  zIndex: 0,
                }} />
                <div style={{ fontSize: 18, lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  {s.emoji}
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 11.5, color: '#0f172a',
                  }}>{s.id}</div>
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                    {s.name} {SPLITS[s.id] && <span style={{ color: '#b45309' }}> · ×{SPLITS[s.id]} shares from corporate action</span>}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 13,
                  textAlign: 'right', color: '#0f172a', position: 'relative', zIndex: 1,
                }}>{formatMoney(s.finalValue)}</div>
                <div style={{
                  fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 11,
                  textAlign: 'right',
                  color: s.ret >= 0 ? '#15803d' : '#b91c1c',
                  position: 'relative', zIndex: 1,
                }}>{s.ret >= 0 ? '+' : ''}{s.ret.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlayerView });
