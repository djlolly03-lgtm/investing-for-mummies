// Stock Rush Pro — Host (teacher / projector) view

const EVENT_TYPE_META = {
  dividend:  { label: 'DIVIDEND',     cls: 'evt-dividend' },
  split:     { label: 'STOCK SPLIT',  cls: 'evt-split'    },
  ipo:       { label: 'IPO',          cls: 'evt-ipo'       },
  bonus:     { label: 'BONUS SHARES', cls: 'evt-bonus'     },
  buyback:   { label: 'BUYBACK',      cls: 'evt-buyback'   },
  rights:    { label: 'RIGHTS ISSUE', cls: 'evt-rights'    },
};

// Detailed teaching content for the teacher's full-screen event popup.
// Used by EventPhaseOverlay so the teacher can pause and explain each concept
// before students decide. Each entry has: emoji, title, what it is (definition),
// how it works (mechanics), why it matters (investor lens).
const EVENT_EDU = {
  dividend: {
    emoji: '💰',
    title: 'What is a Dividend?',
    what: 'A dividend is a slice of a company\'s profits paid directly to shareholders as cash.',
    how: 'The board declares an amount per share (here ₹5). Anyone holding the stock on the record date receives that cash automatically in their bank account — no action needed.',
    why: 'Dividends turn a stock into a regular income stream. Mature, profitable companies like ITC use them to reward loyal shareholders even when the share price isn\'t moving. This is how "boring" stocks can quietly compound wealth over decades.',
    talkAbout: 'Ask: would you rather own a stock that doubles in five years but pays nothing, or one that pays 5% a year as cash you can reinvest? There\'s no single right answer.',
  },
  split: {
    emoji: '✂️',
    title: 'What is a Stock Split?',
    what: 'A stock split divides each existing share into multiple smaller shares.',
    how: 'A 1:5 split means every 1 share becomes 5 shares. The price drops to one-fifth of what it was, so your total holding value stays exactly the same in the moment of the split. Nothing changes economically.',
    why: 'Companies split when the price gets so high that small investors can\'t afford even one share. After a split, the lower price tag attracts more buyers, which often pushes the price up over time. It signals confidence — companies usually don\'t split a falling stock.',
    talkAbout: 'Ask: if your wealth didn\'t change in the split, why does the market often react positively? (Hint: psychology + access.)',
  },
  bonus: {
    emoji: '🎁',
    title: 'What is a Bonus Issue?',
    what: 'A bonus issue gives existing shareholders extra free shares from the company\'s reserves.',
    how: 'A 1:1 bonus doubles every shareholder\'s share count for free. The share price adjusts down (typically halves), so your total holding value stays the same the moment it happens — but you now own more shares.',
    why: 'A bonus is funded by retained profits, not new investor money. Companies do this when they\'re sitting on a mountain of cash and want to reward shareholders without paying cash dividends (which would be taxed). It\'s a strong signal of financial health.',
    talkAbout: 'Compare to a stock split. The end state looks similar, but the mechanism is different — a bonus uses the company\'s reserves, a split is just a relabelling.',
  },
  ipo: {
    emoji: '🎫',
    title: 'What is an IPO?',
    what: 'IPO stands for Initial Public Offering — the first time a private company sells shares to the public on a stock exchange.',
    how: 'Investors apply for a fixed amount of money worth of shares. If the IPO is oversubscribed (more demand than supply), each investor gets only a fraction of what they applied for. The rest of their money is refunded.',
    why: 'IPOs let you bet on a company at the moment it goes public — sometimes catching huge upside, sometimes paying too much. Zomato\'s IPO at ₹76 was 38× oversubscribed. Reading the prospectus and understanding the business matter more than the hype.',
    talkAbout: 'Ask: a stock can list at a premium and still fall 50% in two years. Why? (Hint: hype vs. fundamentals.) Also discuss: if you only get 30–45% of what you apply for, should you apply for more to compensate?',
  },
  buyback: {
    emoji: '🔄',
    title: 'What is a Share Buyback?',
    what: 'A buyback is the company offering to buy back its own shares from investors — usually at a premium to the current market price.',
    how: 'Infosys offers a 15% premium: if the market price is ₹1,500, the buyback price is ₹1,725. You can accept (sell up to 25% of your holding at the premium) or reject (keep all your shares). The shares the company buys are taken out of circulation.',
    why: 'Companies buy back when they think their own shares are undervalued and they have spare cash. It signals confidence and reduces total share count, boosting earnings per share for everyone who keeps holding. It\'s often more tax-efficient than a dividend for shareholders.',
    talkAbout: 'Ask: if the company thinks its shares are cheap, should you sell them in the buyback or hold? There\'s an argument both ways — pocket the premium now vs. trust management\'s judgment.',
  },
  rights: {
    emoji: '📜',
    title: 'What is a Rights Issue?',
    what: 'A rights issue offers existing shareholders the right (but not the obligation) to buy new shares at a steep discount to the market price.',
    how: 'Dixon offers 1 new share for every 5 you hold, at 70% of the market price. If you accept, you pay cash and receive new shares — your stake in the company grows. If you reject, your stake gets diluted as new shares are issued to others.',
    why: 'Rights issues raise capital from existing shareholders, usually for expansion. The discount is the reward for putting in more money. Accepting requires conviction in the company\'s growth plan; rejecting protects your cash but accepts dilution.',
    talkAbout: 'Ask: is a rights issue good news or bad news? (Hint: depends on what the money is for. New factories = bullish. Plugging losses = bearish.)',
  },
};

// ── Root component ────────────────────────────────────────────────────────────

function HostView() {
  const [live, setLive] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [existing, setExisting] = React.useState(null);

  // On mount, peek the DB so the splash can pick the right primary CTA:
  //   - mid-game in progress       → "Resume game"
  //   - lobby with waiting students → "Open lobby (N students)"
  //   - empty / nothing            → "Go Live →"
  //
  // We never silently auto-resume — the teacher always picks. But the splash
  // now distinguishes a non-destructive "open lobby" from a destructive
  // "start fresh" so the teacher can't accidentally wipe a populated lobby.
  React.useEffect(() => {
    const ready = window.StockRush.ready || Promise.resolve(null);
    ready.then(() => {
      if (window.StockRush.hasExistingGame && window.StockRush.hasExistingGame()) {
        setExisting(window.StockRush.existingGameInfo
          ? window.StockRush.existingGameInfo()
          : { round: null, humanCount: 0, ageMs: null, phase: 'lobby' });
      }
      setChecking(false);
    });
  }, []);

  // All three "enter" buttons share the same non-destructive engine call —
  // goLive() just claims host of whatever state is already in the DB.
  function handleEnter() {
    window.StockRush.goLive();
    setLive(true);
  }

  // Destructive: wipes everything. Splash gates this behind ResetConfirmModal
  // when humans are present, so a single click can never bump live students.
  function handleStartFresh() {
    if (window.StockRush.forceNewGame) {
      window.StockRush.forceNewGame();
    } else {
      window.StockRush.goLive();
    }
    setLive(true);
  }

  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
        color: 'var(--muted)', fontFamily: 'Geist, ui-sans-serif',
        fontSize: 14, letterSpacing: '0.05em',
      }}>
        Checking for live game…
      </div>
    );
  }

  if (!live) return <GoLiveScreen existing={existing} onEnter={handleEnter} onStartFresh={handleStartFresh} />;
  return <HostGame />;
}

function GoLiveScreen({ existing, onEnter, onStartFresh }) {
  // Three modes:
  //   live    — trading/events/finale already running → "Resume game" primary
  //   lobby   — lobby with humans waiting             → "Open lobby" primary
  //   empty   — nothing usable                        → "Go Live →" primary
  //
  // For live + lobby modes we also surface a SECONDARY "Start fresh" button
  // that's gated behind a confirmation modal — so a teacher can't bump
  // students with one accidental click. This was the #1 cause of the
  // "lobby keeps getting wiped" complaint.
  const [confirmFresh, setConfirmFresh] = React.useState(false);

  const ageMin = existing?.ageMs != null ? Math.round(existing.ageMs / 60000) : null;
  const ageLabel = ageMin == null ? 'unknown'
    : ageMin < 1 ? 'just now'
    : ageMin < 60 ? `${ageMin} min ago`
    : ageMin < 1440 ? `${Math.round(ageMin / 60)} h ago`
    : `${Math.round(ageMin / 1440)} d ago`;

  const humans = existing?.humanCount || 0;
  const phase  = existing?.phase;
  const mode = !existing ? 'empty'
    : (phase === 'lobby' ? 'lobby' : 'live');

  // Tries the destructive path. Skips the confirm modal if there are no
  // humans at risk (an empty stale lobby can be wiped with one click).
  function requestStartFresh() {
    if (humans > 0) setConfirmFresh(true);
    else onStartFresh();
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1.5px solid var(--line)',
        borderRadius: 16, padding: '52px 56px', maxWidth: 620, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 14,
          background: 'var(--ink)', color: '#fff',
          fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>SR<sup style={{ fontSize: 11, marginLeft: 1 }}>PRO</sup></div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Stock Rush Pro
        </div>
        <div style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 28 }}>
          {window.IFM_TAGLINE}<br />
          Project this screen — students join from their phones, no app needed.
        </div>

        {mode === 'live' && (
          <>
            {/* Live session in progress — primary CTA is resume (non-destructive). */}
            <button
              className="big-btn primary"
              style={{ width: '100%', fontSize: 20, marginBottom: 14 }}
              onClick={onEnter}
            >
              Resume game →
            </button>
            <div style={{
              padding: '10px 14px',
              background: 'rgba(15,58,36,0.05)',
              border: '1px solid rgba(15,58,36,0.18)',
              borderRadius: 10,
              fontSize: 14, color: '#0f172a', lineHeight: 1.5,
              marginBottom: 16,
            }}>
              <b>Round {existing.round || '?'}</b> · {humans} student{humans !== 1 ? 's' : ''} connected · last touched <b>{ageLabel}</b>
            </div>
            <button
              onClick={requestStartFresh}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: 'transparent',
                border: '1.5px solid rgba(180,30,30,0.35)',
                color: '#991b1b', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: 'Geist, ui-sans-serif',
              }}
              title={humans > 0 ? `Wipes ${humans} student${humans !== 1 ? 's' : ''} and the leaderboard` : 'Wipes the stale game'}
            >
              ↺ Start a fresh game instead (wipes everyone)
            </button>
          </>
        )}

        {mode === 'lobby' && (
          <>
            {/* Students already waiting — primary CTA must be non-destructive.
                "Open lobby" preserves everyone who's already joined. */}
            <button
              className="big-btn primary"
              style={{ width: '100%', fontSize: 20, marginBottom: 14 }}
              onClick={onEnter}
            >
              Open lobby ({humans} student{humans !== 1 ? 's' : ''} waiting) →
            </button>
            <div style={{
              padding: '10px 14px',
              background: 'rgba(15,58,36,0.05)',
              border: '1px solid rgba(15,58,36,0.18)',
              borderRadius: 10,
              fontSize: 14, color: '#0f172a', lineHeight: 1.5,
              marginBottom: 16,
            }}>
              Lobby is open · {humans} student{humans !== 1 ? 's' : ''} signed in · last touched <b>{ageLabel}</b>
            </div>
            <button
              onClick={requestStartFresh}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: 'transparent',
                border: '1.5px solid rgba(180,30,30,0.35)',
                color: '#991b1b', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', fontFamily: 'Geist, ui-sans-serif',
              }}
              title={`Bumps ${humans} student${humans !== 1 ? 's' : ''} back to the join screen`}
            >
              ↺ Start a fresh lobby (kicks everyone)
            </button>
          </>
        )}

        {mode === 'empty' && (
          <>
            <button className="big-btn primary" style={{ width: '100%', fontSize: 20 }} onClick={onEnter}>
              Go Live →
            </button>
            <div style={{ fontSize: 15, color: 'var(--muted)', marginTop: 16 }}>
              Room code and QR code appear after you go live
            </div>
          </>
        )}
      </div>

      {confirmFresh && (
        <ResetConfirmModal
          studentCount={humans}
          onCancel={() => setConfirmFresh(false)}
          onConfirm={() => { setConfirmFresh(false); onStartFresh(); }}
        />
      )}
    </div>
  );
}

// ── Live leaderboard excitement overlays ─────────────────────────────────────

// Top-right stack of trade flashes — pops in/out every time anyone buys/sells.
function TradeFlashStack({ state }) {
  const [flashes, setFlashes] = React.useState([]);
  const seenIdRef = React.useRef(null);
  const initSeenRef = React.useRef(false);
  const players = state.players || {};
  const stocks  = state.stocks || [];

  React.useEffect(() => {
    const latest = state.activity?.[0];
    if (!latest) return;
    // First render — don't flash for the existing top activity
    if (!initSeenRef.current) {
      seenIdRef.current = latest.id;
      initSeenRef.current = true;
      return;
    }
    if (latest.id === seenIdRef.current) return;
    seenIdRef.current = latest.id;

    // Parse trade activity text. Patterns:
    //   "Maya bought 4 DIXON"  "Kai sold 1 INFY"
    const m = latest.text.match(/^([^\s].+?)\s+(bought|sold)\s+(\d+)\s+(\w+)\b/);
    if (!m) return;
    const [, name, action, qtyStr, ticker] = m;
    const qty = parseInt(qtyStr, 10);
    const isBuy = action === 'bought';
    const stock = stocks.find(s => s.id === ticker);
    if (!stock) return;
    const value = qty * (stock.price || 0);
    // Find player by name
    const player = Object.values(players).find(p => p.name === name);
    // Skip bot trades — only student moves get the spotlight
    if (player?.isBot) return;

    const flash = {
      id: latest.id,
      isBuy, qty, ticker, value,
      stockEmoji: stock.emoji,
      playerName: name,
      playerEmoji: player?.avatar || '👤',
      playerColor: player?.color || '#64748b',
      isBot: !!player?.isBot,
    };
    setFlashes(prev => [...prev.slice(-2), flash]);
    setTimeout(() => {
      setFlashes(prev => prev.filter(f => f.id !== flash.id));
    }, 2400);
  }, [state.activity?.[0]?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sizing helper — make big trades feel bigger
  const sizeOf = (value) => {
    if (value >= 100000) return 'huge';
    if (value >= 30000)  return 'big';
    return 'normal';
  };

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 18, zIndex: 750,
      display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none', maxWidth: 340,
    }}>
      {flashes.map((f) => {
        const size = sizeOf(f.value);
        const accent = f.isBuy ? '#15803d' : '#b91c1c';
        const bg     = f.isBuy ? 'linear-gradient(135deg,#dcfce7,#bbf7d0)'
                                : 'linear-gradient(135deg,#fee2e2,#fecaca)';
        const verb = f.isBuy ? 'BOUGHT' : 'SOLD';
        const scale = size === 'huge' ? 1.15 : size === 'big' ? 1.05 : 1;
        return (
          <div key={f.id} style={{
            background: bg,
            border: '2px solid ' + accent,
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 14px 36px rgba(15,23,42,0.18)',
            animation: 'sr-trade-flash 2.4s cubic-bezier(0.2, 0.9, 0.3, 1.1) both',
            transform: `scale(${scale})`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: f.playerColor, border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, lineHeight: 1, flexShrink: 0,
            }}>{f.playerEmoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.14em', color: accent, textTransform: 'uppercase',
              }}>
                {f.playerName}{f.isBot ? ' (bot)' : ''} · {verb}
                {size === 'huge' ? ' 🔥' : size === 'big' ? ' ⚡' : ''}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: 2 }}>
                <span style={{ marginRight: 4 }}>{f.stockEmoji}</span>
                {f.qty}× {f.ticker}
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 11.5, fontWeight: 700,
                color: accent, marginTop: 1,
              }}>
                {f.isBuy ? '−' : '+'}{window.formatMoney(f.value)}
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes sr-trade-flash {
          0%   { opacity: 0; transform: translateX(40px) scale(0.85); }
          12%  { opacity: 1; transform: translateX(-4px) scale(1.04); }
          18%  { transform: translateX(0) scale(1); }
          85%  { opacity: 1; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

// Snarky pool — picked at random when a lead change happens
const LEAD_COMMENTS = [
  "{leader} just stole the crown 👑",
  "{leader} overtook {prev} — bold move!",
  "And just like that, {leader} is in front 🚀",
  "Watch out {prev} — {leader} is gone! 🏃",
  "Drama in the leaderboard · {leader} takes #1",
  "{leader} just made it look easy 💪",
  "🔥 {leader} heated things up — new leader!",
  "{leader} is showing everyone how it's done",
  "Plot twist! {leader} jumps to first place",
  "{prev} did NOT see {leader} coming…",
  "{leader} just pulled ahead 😎",
  "The new boss in town: {leader}",
  "Hold my chai — {leader} just took over",
  "{leader} climbed the ranks · #1 now",
];

function LeadChangeBanner({ ranked, phase }) {
  const [banner, setBanner] = React.useState(null);
  const prevTopRef = React.useRef(null);
  const initRef    = React.useRef(false);

  React.useEffect(() => {
    const top = ranked[0];
    if (!top) return;
    // Skip first render — only fire on actual changes
    if (!initRef.current) {
      prevTopRef.current = top.id;
      initRef.current = true;
      return;
    }
    if (prevTopRef.current === top.id) return;
    const prevPlayer = ranked.find(p => p.id === prevTopRef.current);
    prevTopRef.current = top.id;
    const template = LEAD_COMMENTS[Math.floor(Math.random() * LEAD_COMMENTS.length)];
    const text = template
      .replace('{leader}', top.name)
      .replace('{prev}', prevPlayer?.name || 'the leader');

    const bann = {
      id: 'lead-' + Date.now(),
      text,
      leaderName: top.name,
      leaderEmoji: top.avatar || '👤',
      leaderColor: top.color || '#c9a84c',
    };
    setBanner(bann);
    setTimeout(() => setBanner(curr => (curr && curr.id === bann.id ? null : curr)), 3600);
  }, [ranked.map(p => p.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!banner || phase !== 'trading') return null;

  return (
    <div style={{
      position: 'fixed', top: '38%', left: '50%',
      transform: 'translate(-50%, -50%)', zIndex: 900,
      animation: 'sr-lead-pop 3.6s ease-out forwards',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#2a9d8f,#1f7a6f)',
        border: '4px solid #155b53',
        borderRadius: 24,
        padding: '22px 36px',
        display: 'flex', alignItems: 'center', gap: 22,
        boxShadow: '0 32px 90px rgba(31,122,111,0.4)',
        minWidth: 420, maxWidth: '85vw',
      }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%',
          background: banner.leaderColor, border: '4px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 46, lineHeight: 1, flexShrink: 0,
          boxShadow: '0 8px 22px rgba(0,0,0,0.2)',
          animation: 'sr-lead-crown 0.8s ease-out',
        }}>{banner.leaderEmoji}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.2em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase',
          }}>🥇 New leader</div>
          <div style={{
            fontSize: 30, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.01em', lineHeight: 1.15, marginTop: 4,
          }}>{banner.text}</div>
        </div>
      </div>
      <style>{`
        @keyframes sr-lead-pop {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          12%  { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
          18%  { transform: translate(-50%, -50%) scale(1); }
          85%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        @keyframes sr-lead-crown {
          0%   { transform: rotate(0deg); }
          25%  { transform: rotate(-8deg); }
          50%  { transform: rotate(8deg); }
          75%  { transform: rotate(-4deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

// ── Big Bet Moment — full-screen drama when someone bets ≥50% of their worth ──
function BigBetMoment({ data }) {
  const { player, stock, kind, qty, total, pct } = data;
  const buy = kind === 'buy';
  const bg = buy
    ? 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)';

  const verb = buy ? 'WENT ALL IN ON' : 'CASHED OUT OF';
  const headlines = buy
    ? ['Big bet!', 'Going all in!', 'Conviction trade!', 'Bold move!', 'High conviction!']
    : ['Cashing out!', 'Taking profits!', 'Cutting loose!', 'Done with it!', 'Locking in gains!'];
  const tagline = React.useMemo(
    () => headlines[Math.floor(Math.random() * headlines.length)],
    [data.id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const PARTICLES = 22;
  const particles = React.useMemo(() => {
    const set = buy
      ? ['💰', '🔥', '💸', '⚡', '🚀', '💎', '📈']
      : ['💰', '📤', '💸', '🍃', '🪙', '📉', '💵'];
    return Array.from({ length: PARTICLES }, (_, i) => ({
      id: i,
      left: 4 + Math.random() * 92,
      delay: Math.random() * 0.4,
      dur: 1.3 + Math.random() * 1.5,
      emoji: set[Math.floor(Math.random() * set.length)],
      drift: -50 + Math.random() * 100,
      rot: Math.random() * 720 - 360,
    }));
  }, [data.id, buy]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2700,
      pointerEvents: 'none',
      animation: 'bbm-fade 4.8s ease-out forwards',
      overflow: 'hidden',
    }}>
      {/* Radial wash */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, rgba(220,38,38,0.18) 0%, rgba(220,38,38,0) 68%)',
      }} />

      {/* Particles */}
      {particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute', left: p.left + '%', top: '-44px',
          fontSize: 28 + Math.random() * 18,
          animation: `bbm-fall ${p.dur}s ease-in ${p.delay}s forwards`,
          ['--bbm-drift']: p.drift + 'px',
          ['--bbm-rot']: p.rot + 'deg',
        }}>{p.emoji}</span>
      ))}

      {/* Hero card */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: bg, color: '#fff',
        padding: '30px 42px', borderRadius: 22,
        boxShadow: '0 30px 80px rgba(220,38,38,0.45), 0 0 0 8px rgba(248,113,113,0.15)',
        textAlign: 'center',
        animation: 'bbm-zoom 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.3) forwards',
        minWidth: 360, maxWidth: '88vw',
      }}>
        <div style={{
          fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.22em', opacity: 0.85, marginBottom: 14,
        }}>
          🚨 {tagline.toUpperCase()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: player.color || '#c9a84c',
            border: '3px solid rgba(255,255,255,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, lineHeight: 1, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            {player.avatar || '👤'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {player.name}
            </div>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, opacity: 0.8, letterSpacing: '0.14em', fontWeight: 700 }}>
              {verb}
            </div>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', background: 'rgba(0,0,0,0.18)',
          borderRadius: 14, marginBottom: 16,
        }}>
          <span style={{ fontSize: 44, lineHeight: 1 }}>{stock.emoji}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 20, fontWeight: 800 }}>
              {qty} × {stock.id}
            </div>
            <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 14, opacity: 0.85 }}>
              {window.formatMoney(total)}
            </div>
          </div>
        </div>

        <div style={{
          fontFamily: 'Geist Mono, ui-monospace',
          fontSize: 68, fontWeight: 900, lineHeight: 1,
          letterSpacing: '-0.04em',
          animation: 'bbm-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.5) 0.15s both',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {pct}%
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4, fontWeight: 600, letterSpacing: '0.05em' }}>
          of their portfolio in one trade
        </div>
      </div>

      <style>{`
        @keyframes bbm-fade {
          0%   { opacity: 0; } 6% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; }
        }
        @keyframes bbm-zoom {
          0%   { transform: translate(-50%, -50%) scale(0.4) rotate(-4deg); opacity: 0; }
          70%  { transform: translate(-50%, -50%) scale(1.06) rotate(1deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
        }
        @keyframes bbm-pop {
          0%   { transform: scale(0.55); opacity: 0; }
          60%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes bbm-fall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--bbm-drift)) rotate(var(--bbm-rot)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function HostGame() {
  const [state, setState] = React.useState(() => window.StockRush.getState());
  const [seenPopupRound, setSeenPopupRound] = React.useState(0);

  React.useEffect(() => window.StockRush.subscribe(setState), []);

  const players  = Object.values(state.players || {});
  const ranked   = [...players]
    .map(p => ({ ...p, worth: window.netWorth(p, state.stocks) }))
    .sort((a, b) => b.worth - a.worth);

  const humans       = players.filter(p => !p.isBot);
  const lockedHumans = humans.filter(p => state.locks?.[p.id]);
  const allLocked    = humans.length > 0 && lockedHumans.length === humans.length;

  // Notify the WP parent page on round advance so it auto-scrolls past the IFM header
  const prevRoundRef = React.useRef(state.round);
  React.useEffect(() => {
    if ((state.phase === 'trading' || state.phase === 'events') && state.round > prevRoundRef.current) {
      try { window.parent.postMessage({ type: 'stock-rush-round' }, '*'); } catch (e) {}
    }
    prevRoundRef.current = state.round;
  }, [state.round, state.phase]);

  // Tell the parent page (Squarespace homepage / WP) when the game is live so
  // it can hide the "Chat with us" widget — teacher is in class, no chat needed.
  React.useEffect(() => {
    const live = state.phase !== 'lobby' && state.phase !== 'ended';
    try {
      window.parent.postMessage({ type: live ? 'stock-rush-live' : 'stock-rush-idle' }, '*');
    } catch (e) {}
  }, [state.phase]);

  const inActiveRound = state.phase === 'trading' || state.phase === 'events';
  const roundNews     = window.ROUND_NEWS?.[state.round - 1];
  const showRoundPopup = inActiveRound
    && state.round > 1
    && state.round > seenPopupRound
    && roundNews != null;

  // ── Round timer: start only once leaderboard is visible (no popup on screen) ─
  // Round 1 has no RoundTransitionPopup, so we start the timer automatically
  // when trading phase opens. Rounds 2-5 are handled by onDismiss below.
  // This effect also covers the edge case where the popup was already seen
  // (e.g. page reload mid-round) but roundStartedAt was wiped.
  React.useEffect(() => {
    if (state.phase !== 'trading') return;
    if (showRoundPopup) return;           // popup still visible — onDismiss handles it
    if (state.roundStartedAt) return;     // already ticking
    window.StockRush.startRoundTimer?.();
  }, [state.phase, state.round, showRoundPopup, state.roundStartedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Big Bet detector ─────────────────────────────────────────────────────────
  // Scans the top 10 activity items (not just index 0) so a bot trade landing
  // right after a human's big bet — pushing it off position 0 — doesn't
  // silently swallow the overlay.
  const seenBigBetIdsRef = React.useRef(new Set());
  const bigBetTimerRef   = React.useRef(null);
  const [bigBet, setBigBet] = React.useState(null);
  React.useEffect(() => {
    const items = state.activity?.slice(0, 10) || [];
    for (const item of items) {
      if (!item.big) continue;
      if (seenBigBetIdsRef.current.has(item.id)) continue;
      seenBigBetIdsRef.current.add(item.id);
      if (seenBigBetIdsRef.current.size > 80) {           // keep Set bounded
        const [oldest] = seenBigBetIdsRef.current;
        seenBigBetIdsRef.current.delete(oldest);
      }
      const player = state.players?.[item.playerId];
      if (!player || player.isBot) continue;              // only humans get the spotlight
      const stock = state.stocks?.find(s => s.id === item.ticker);
      if (!stock) continue;
      clearTimeout(bigBetTimerRef.current);
      setBigBet({ id: item.id, player, stock, kind: item.kind, qty: item.qty, total: item.total, pct: item.bigPct || 50 });
      bigBetTimerRef.current = setTimeout(() => setBigBet(null), 4800);
      break;  // show one overlay at a time; next unprocessed big bet fires on next render
    }
  }, [state.activity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local UI toggle — teacher can mute the live drama for a quieter session
  const [dramaMuted, setDramaMuted] = React.useState(false);
  const excitementOn = state.phase === 'trading' && !dramaMuted;

  return (
    <div className="host-shell">
      {/* BigBetMoment — fires any time a big bet happens, drama-mute suppresses it */}
      {!dramaMuted && bigBet && <BigBetMoment data={bigBet} />}
      {/* Trade flashes + lead banners — only during trading */}
      {excitementOn && <TradeFlashStack state={state} />}
      {excitementOn && <LeadChangeBanner ranked={ranked} phase={state.phase} />}

      <HostHeader
        state={state}
        humans={humans}
        lockedHumans={lockedHumans}
        allLocked={allLocked}
        dramaMuted={dramaMuted}
        onToggleDrama={() => setDramaMuted(m => !m)}
      />

      {/* TV-style horizontal stock ticker — sits right under the hero banner,
          above the leaderboard, so live prices are always in view. */}
      <StockTickerMarquee stocks={state.stocks} />

      <div className="host-body">
        {/* HERO — leaderboard + events log (room to breathe, matches teen Stock Rush) */}
        <div className="host-main">
          <HeroLeaderboard
            ranked={ranked}
            stocks={state.stocks}
            locks={state.locks}
            phase={state.phase}
          />
          <EventsLog news={state.news} />
        </div>
        {/* SIDEBAR — live activity feed */}
        <div className="host-sidebar">
          <ActivityFeed
            activity={state.activity}
            reactions={state.reactions}
            players={state.players}
          />
        </div>
      </div>

      {/* Phase overlays — corporate-action events show FIRST, then the round
          transition popup. So end-of-R1 sequence is: ITC dividend → R2 starts →
          Titan split → "Next Round" transition popup → R2 trading. */}
      {state.phase === 'lobby' && <LobbyOverlay state={state} />}
      {state.phase === 'events' && state.currentEvent ? (
        <EventPhaseOverlay
          event={state.currentEvent}
          choices={state.eventChoices}
          players={state.players}
          stocks={state.stocks}
        />
      ) : (
        showRoundPopup && (
          <RoundTransitionPopup
            round={state.round}
            year={window.ROUND_YEARS?.[state.round - 1]}
            news={roundNews}
            stocks={state.stocks}
            recap={state.lastRoundEventRecap}
            players={state.players}
            onDismiss={() => {
              setSeenPopupRound(state.round);
              if (state.lastRoundEventRecap) state.lastRoundEventRecap = null;
              window.StockRush.startRoundTimer?.();
              window.scrollTo(0, 0);
              try { window.parent.postMessage({ type: 'stock-rush-top' }, '*'); } catch(e) {}
            }}
          />
        )
      )}
      {state.phase === 'finale' && <FinaleOverlay state={state} ranked={ranked} />}
      {state.phase === 'ended' && <EndedOverlay ranked={ranked} />}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function HostHeader({ state, humans, lockedHumans, allLocked, dramaMuted, onToggleDrama }) {
  const total = window.GAME_CONFIG.rounds;
  const year  = window.ROUND_YEARS?.[state.round - 1];
  const ctx   = window.ROUND_CONTEXT?.[state.round - 1];

  const inRound    = state.phase === 'trading' || state.phase === 'events';
  const inTrading  = state.phase === 'trading';

  const [advancing, setAdvancing] = React.useState(false);
  function handleAdvance() {
    if (advancing) return;
    setAdvancing(true);
    window.StockRush.advanceRound();
    setTimeout(() => setAdvancing(false), 1500);
  }
  function handleReset()   { window.StockRush.reset && window.StockRush.reset(); }

  const [resetOpen, setResetOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);

  return (
    <div className="host-header">
      {/* Brand + new game */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <div className="brand">
          <div className="brand-mark">SR<span style={{ fontSize: '8px', letterSpacing: 0, verticalAlign: 'super' }}>PRO</span></div>
          <div>
            <div className="brand-title">Stock Rush Pro</div>
            <div className="brand-sub">Classroom edition · Room <b>{window.GAME_CONFIG.roomCode}</b></div>
          </div>
        </div>
        <button
          onClick={() => setResetOpen(true)}
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
      {resetOpen && (
        <ResetConfirmModal
          studentCount={humans.length}
          onCancel={() => setResetOpen(false)}
          onConfirm={() => { setResetOpen(false); window.StockRush.reset(); }}
        />
      )}
      {shareOpen && (
        <ShareQRModal
          round={state.round}
          phase={state.phase}
          humanCount={humans.length}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Centre — round info + lock status */}
      <div className="header-center">
        {inRound ? (
          <>
            {/* Big, projector-friendly round badge */}
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
              {state.phase === 'events' && (
                <span className="phase-events-tag" style={{ fontSize: 13, padding: '4px 10px' }}>EVENTS</span>
              )}
            </div>

            {/* Sub-description (what's special this round) */}
            {(() => {
              const subtitle = window.ROUND_CONTEXT?.[state.round - 1]?.subtitle;
              if (!subtitle) return null;
              return (
                <div style={{
                  textAlign: 'center', marginBottom: 6,
                  fontSize: 13.5, color: 'rgba(0,0,0,0.65)',
                  fontWeight: 500, letterSpacing: '0.01em',
                }}>
                  {subtitle}
                </div>
              );
            })()}

            {/* Market sentiment banner — single chip with mood + one-line summary */}
            {(() => {
              const sent = window.ROUND_CONTEXT?.[state.round - 1]?.sentiment;
              if (!sent) return null;
              return (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'linear-gradient(135deg, #fff8e6 0%, #fef3c7 100%)',
                  border: '1.5px solid #f0d398',
                  borderRadius: 999,
                  padding: '6px 16px',
                  maxWidth: '90%',
                }}>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace',
                    fontSize: 12, fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#8b5e1a',
                  }}>{sent.tag}</span>
                  <span style={{
                    fontSize: 13.5, color: '#5b3d10',
                    fontWeight: 500, lineHeight: 1.4,
                  }}>{sent.text}</span>
                </div>
              );
            })()}

            {inTrading && (
              <>
                {/* Lock strip — 3× larger for presentation visibility */}
                <div className="lock-strip" style={{ marginTop: 12, gap: 10 }}>
                  {humans.length === 0
                    ? <span style={{ fontSize: 16, color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>No students yet</span>
                    : humans.map(p => (
                        <KickableLockChip key={p.id} player={p} locked={!!state.locks?.[p.id]} big />
                      ))
                  }
                </div>
                {humans.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    fontFamily: 'Geist Mono, ui-monospace',
                    fontSize: 28, fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: lockedHumans.length === humans.length ? '#15803d' : '#0f172a',
                  }}>
                    {lockedHumans.length} / {humans.length} <span style={{ color: 'rgba(0,0,0,0.45)' }}>LOCKED</span>
                  </div>
                )}
              </>
            )}
          </>
        ) : state.phase === 'lobby' ? (
          <div className="round-label">Lobby</div>
        ) : state.phase === 'finale' ? (
          <div className="round-label">🎬 One year later · 2026</div>
        ) : state.phase === 'ended' ? (
          <div className="round-label">Final results</div>
        ) : null}
      </div>

      {/* Right — join pill (click to show full-screen QR) + Next Round button */}
      <div className="header-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <button
          onClick={() => setShareOpen(true)}
          className="join-pill"
          title="Tap to show full-screen QR code · students can scan to join (or rejoin) any time"
          style={{
            cursor: 'pointer',
            background: '#fff',
            fontFamily: 'inherit',
            textAlign: 'right',
            transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0faf5';
            e.currentTarget.style.borderColor = '#0f3a24';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,58,36,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.borderColor = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <JoinPillQR />
            <div style={{ textAlign: 'right' }}>
              <div className="join-label">📱 JOIN ON YOUR PHONE</div>
              <div className="join-url">ifm-deploy.vercel.app/stock-rush-pro</div>
              <div className="join-code">{window.GAME_CONFIG.roomCode}</div>
              <div style={{
                fontSize: 11, color: '#0f3a24', fontWeight: 700,
                marginTop: 4, letterSpacing: '0.04em',
              }}>
                Tap to show full QR →
              </div>
            </div>
          </div>
        </button>

        {inTrading && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={onToggleDrama}
                title={dramaMuted ? 'Re-enable trade flashes and lead banners' : 'Hide trade flashes and lead banners for a quieter session'}
                style={{
                  background: dramaMuted ? '#dbeafe' : 'transparent',
                  border: '1.5px solid ' + (dramaMuted ? '#1d4ed8' : 'rgba(0,0,0,0.18)'),
                  color: dramaMuted ? '#1d4ed8' : 'rgba(0,0,0,0.65)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {dramaMuted ? '🔕 Drama muted' : '🔔 Drama on'}
              </button>
            </div>
            <button
              className={'next-round-btn ' + (allLocked ? 'ready' : 'force')}
              onClick={handleAdvance}
              disabled={advancing}
              style={advancing ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              {advancing
                ? '⏳ Advancing…'
                : state.round >= window.GAME_CONFIG.rounds
                  ? 'End game →'
                  : `Next R${state.round + 1} →`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── KickableLockChip ───────────────────────────────────────────────────────────

function KickableLockChip({ player, locked, big = false }) {
  const [hover, setHover] = React.useState(false);
  function handleKick(e) {
    e.stopPropagation();
    if (window.confirm(`Remove ${player.name} from the game?\nThey'll be sent back to the join screen.`)) {
      window.StockRush.kick(player.id);
    }
  }
  // Presentation-friendly sizing — pass `big` to scale ~3× for projector view.
  const avatarSize = big ? 36 : 18;
  const chipStyle = big ? {
    position: 'relative',
    gap: 10,
    padding: '7px 16px 7px 7px',
    fontSize: 22,
    fontWeight: 700,
  } : { position: 'relative' };
  const iconStyle = big ? { fontSize: 22, marginLeft: 2 } : {};
  const xBtnSize = big ? 26 : 18;
  return (
    <div
      className={'lock-chip ' + (locked ? 'locked' : 'unlocked')}
      title={locked ? `${player.name} locked` : `${player.name} still trading`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={chipStyle}
    >
      <Avatar name={player.name} color={player.color} avatar={player.avatar} size={avatarSize} />
      <span>{player.name}</span>
      {locked
        ? <span className="lock-icon" style={iconStyle}>🔒</span>
        : <span className="lock-icon pending" style={iconStyle}>⏳</span>
      }
      {hover && (
        <button
          onClick={handleKick}
          aria-label={'Remove ' + player.name}
          title={'Remove ' + player.name}
          style={{
            position: 'absolute', right: -8, top: -8,
            width: xBtnSize, height: xBtnSize, borderRadius: '50%',
            background: '#dc2626', color: '#fff',
            border: '2px solid #fff', cursor: 'pointer',
            fontSize: big ? 16 : 11, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >×</button>
      )}
    </div>
  );
}

// ── Round transition popup ────────────────────────────────────────────────────
// Shown to the teacher at the START of rounds 2–5, before event cards appear.
// Explains what happened to each stock's price and why.

function RoundTransitionPopup({ round, year, news, stocks, recap, players, onDismiss }) {
  // Only show notes for stocks that are active in this game session
  const activeIds = new Set((stocks || []).map(s => s.id));
  const entries = Object.entries(news.notes || {}).filter(([id]) => activeIds.has(id));
  const cardRef = React.useRef(null);
  React.useEffect(() => {
    // Always start at top — browser can preserve scroll from previous popup
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [round]); // re-run if round changes while popup is still mounted

  // Compute recap totals (class-wide dividend payout summary) if a recap was
  // attached by the engine when the previous round ended. Only renders for
  // dividend events with payouts — silently skipped otherwise.
  let recapStrip = null;
  if (recap && recap.event && recap.payouts) {
    const payouts = recap.payouts;
    const totalClass = Object.values(payouts).reduce((sum, x) => sum + (x || 0), 0);
    const entriesByPayout = Object.entries(payouts).sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const top = entriesByPayout[0];
    const topAmount = top ? (top[1] || 0) : 0;
    const topName = top && players && players[top[0]] ? players[top[0]].name : null;
    if (totalClass > 0) {
      recapStrip = (
        <div style={{
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 8,
          padding: '8px 14px',
          marginBottom: 10,
          fontSize: 13,
          color: '#bbf7d0',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>💰</span>
          <span>
            <b>Last round:</b> {recap.event.stockId} paid ₹{recap.event.perShare}/share.
            {' '}Class earned <b>₹{totalClass.toLocaleString('en-IN')}</b> total
            {topName && topAmount > 0 ? <>. Top: <b>{topName}</b> ₹{topAmount.toLocaleString('en-IN')}</> : null}.
          </span>
        </div>
      );
    }
  }

  return (
    <div className="event-phase-backdrop" style={{ zIndex: 300, padding: 16 }}>
      <div
        ref={cardRef}
        className="event-phase-card"
        style={{
          maxWidth: 1020,
          height: 'calc(100vh - 32px)',   // backdrop has 16px padding × 2
          maxHeight: 'none',
          overflowY: 'hidden',            // zero scroll — content sized to fit
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* Dividend recap strip — only present when last round had an end-of-
            round dividend event (R1 → R2 transition). */}
        {recapStrip}

        {/* Round label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
          <span style={{
            background: 'var(--ink)', color: '#fff',
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.12em', padding: '5px 12px', borderRadius: 4,
          }}>
            ROUND {round} · {year}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 13,
            padding: '5px 12px', borderRadius: 4,
          }}>
            TEACHER VIEW — MARKET UPDATE
          </span>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginBottom: 6, color: '#fff', flexShrink: 0 }}>
          {news.headline}
        </div>

        {/* Subhead */}
        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
          marginBottom: 12, paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          {news.subhead}
        </div>

        {/* Stock grid — fills remaining space, 3 columns, no scroll */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: '1fr',
          gap: 8,
          marginBottom: 10,
          overflow: 'hidden',
        }}>
          {entries.map(([ticker, note]) => {
            const stock  = (stocks || []).find(s => s.id === ticker);
            const up     = note.dir === 'up';
            const pct    = note.pct;
            const pctStr = pct >= 100 ? Math.round(pct) + '%' : pct.toFixed(1) + '%';
            return (
              <div key={ticker} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderLeft: `3px solid ${up ? '#1f7a4d' : '#c24a3a'}`,
                borderRadius: 8, padding: '8px 10px',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Ticker row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexShrink: 0 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{stock?.emoji || '•'}</span>
                  <span style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
                    fontSize: 16, color: '#fff', letterSpacing: '0.04em',
                  }}>
                    {ticker}
                  </span>
                  {(note.splitAdjusted || note.bonusAdjusted) && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                      background: note.bonusAdjusted ? 'rgba(180,83,9,0.25)' : 'rgba(59,130,196,0.25)',
                      color: note.bonusAdjusted ? '#fbbf24' : '#7ab8e8',
                      border: `1px solid ${note.bonusAdjusted ? 'rgba(180,83,9,0.5)' : 'rgba(59,130,196,0.4)'}`,
                      padding: '2px 6px', borderRadius: 3,
                    }}>
                      {note.bonusAdjusted ? 'BONUS' : 'SPLIT'}
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  <span style={{
                    color: up ? '#4ade80' : '#f87171',
                    fontFamily: 'Geist Mono, ui-monospace',
                    fontWeight: 700, fontSize: 17,
                  }}>
                    {up ? '▲' : '▼'} {pctStr}
                  </span>
                </div>
                {/* Why */}
                <div style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5,
                  overflow: 'hidden',
                }}>
                  {note.why}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          className="big-btn"
          style={{ width: '100%', fontSize: 15, flexShrink: 0 }}
          onClick={onDismiss}
        >
          Got it — Start Round {round} →
        </button>
      </div>
    </div>
  );
}

// ── Event phase overlay ───────────────────────────────────────────────────────

function EventPhaseOverlay({ event, choices, players, stocks }) {
  const meta      = EVENT_TYPE_META[event.type] || { label: event.type.toUpperCase(), cls: 'evt-dividend' };
  const stock     = stocks.find(s => s.id === event.stockId);
  const isChoice  = ['ipo', 'buyback', 'rights'].includes(event.type);
  const allPs     = Object.values(players || {});
  const responded = Object.keys(choices || {}).length;
  const total     = allPs.length;
  const cardRef   = React.useRef(null);
  React.useEffect(() => {
    if (cardRef.current) cardRef.current.scrollTop = 0;
  }, [event?.id ?? event?.type]); // reset when a new event slides in

  const isMid = !!event.isMidRound;

  return (
    <div
      className="event-phase-backdrop"
      style={isMid ? {
        background: 'radial-gradient(ellipse at center, rgba(120,53,15,0.25) 0%, rgba(10,10,10,0.96) 70%)',
      } : undefined}
    >
      <div
        ref={cardRef}
        className="event-phase-card"
        style={isMid ? {
          border: '2px solid rgba(245,158,11,0.55)',
          boxShadow: '0 0 60px rgba(245,158,11,0.25), 0 20px 60px rgba(0,0,0,0.5)',
          borderRadius: 14,
          background: 'linear-gradient(180deg, #1c1410 0%, #0e0a07 100%)',
          padding: '20px 26px',
        } : undefined}
      >

        {/* Mid-round banner — clearly distinct from start-of-round events */}
        {isMid && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.5)',
            borderRadius: 8, padding: '7px 12px',
            marginBottom: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 16 }}>⏸️</span>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace',
              fontSize: 12, fontWeight: 800,
              letterSpacing: '0.18em',
              color: '#fbbf24',
            }}>
              MID-ROUND INTERRUPTION
            </span>
            <span style={{ flex: 1 }} />
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace',
              fontSize: 11, color: 'rgba(251,191,36,0.7)',
              letterSpacing: '0.08em',
            }}>
              ⏱️ ROUND TIMER STILL TICKING
            </span>
          </div>
        )}

        {/* Type badge */}
        <div className="event-type-row">
          <span className={'event-type-badge ' + meta.cls}>{meta.label}</span>
          {stock && (
            <span className="event-stock-tag">
              {stock.emoji} {stock.name}
            </span>
          )}
          {isChoice && (
            <span className="event-waiting-tag">
              ⏳ {responded}/{total} responded
            </span>
          )}
        </div>

        {/* Headline */}
        <div className="event-phase-headline" style={isMid ? { color: '#fbbf24' } : undefined}>
          {isMid ? 'Breaking mid-round: ' : ''}{event.headline}
        </div>

        {/* Scrollable content region — keeps CTA pinned in view */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>

        {/* Educational body — the in-game flavor narrative */}
        <div className="event-phase-body">{event.body}</div>

        {/* Teaching panel — what is X, how it works, why it matters */}
        {EVENT_EDU[event.type] && (
          <EventTeachingPanel edu={EVENT_EDU[event.type]} />
        )}

        {/* Quick numbers for choice events */}
        {event.type === 'buyback' && stock && (
          <div className="event-quick-numbers">
            <div className="eqn-cell">
              <div className="eqn-label">CURRENT PRICE</div>
              <div className="eqn-val">₹{stock.price.toLocaleString('en-IN')}</div>
            </div>
            <div className="eqn-arrow">→</div>
            <div className="eqn-cell">
              <div className="eqn-label">BUYBACK PRICE (+{Math.round(event.premium * 100)}%)</div>
              <div className="eqn-val eqn-up">₹{Math.round(stock.price * (1 + event.premium)).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}
        {event.type === 'rights' && stock && (
          <div className="event-quick-numbers">
            <div className="eqn-cell">
              <div className="eqn-label">MARKET PRICE</div>
              <div className="eqn-val">₹{stock.price.toLocaleString('en-IN')}</div>
            </div>
            <div className="eqn-arrow">→</div>
            <div className="eqn-cell">
              <div className="eqn-label">RIGHTS PRICE ({Math.round((1 - event.discount) * 100)}% off)</div>
              <div className="eqn-val eqn-up">₹{Math.round(stock.price * (1 - event.discount)).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}
        {event.type === 'ipo' && (
          <div className="event-quick-numbers">
            <div className="eqn-cell">
              <div className="eqn-label">IPO PRICE</div>
              <div className="eqn-val">₹{event.ipoPrice}</div>
            </div>
            <div className="eqn-arrow">·</div>
            <div className="eqn-cell">
              <div className="eqn-label">SUBSCRIBED</div>
              <div className="eqn-val">{event.subscriptionX}×</div>
            </div>
            <div className="eqn-arrow">·</div>
            <div className="eqn-cell">
              <div className="eqn-label">ALLOCATION</div>
              <div className="eqn-val">30–45%</div>
            </div>
          </div>
        )}

        {/* Choice tracker */}
        {isChoice && (
          <div className="event-choice-tracker">
            <div className="ect-label">WAITING FOR DECISIONS</div>
            <div className="ect-players">
              {allPs.map(p => {
                const c = choices?.[p.id];
                let choiceLabel = null;
                if (c !== undefined) {
                  if (c === 'accept') choiceLabel = '✓ Accept';
                  else if (c === 'reject') choiceLabel = '✗ Pass';
                  else if (c && c.amount) choiceLabel = '₹' + window.formatMoney(c.amount);
                  else choiceLabel = '✓ Done';
                }
                return (
                  <div key={p.id} className={'ect-chip ' + (c !== undefined ? 'responded' : 'pending')}>
                    <Avatar name={p.name} color={p.color} avatar={p.avatar} size={24} />
                    <span className="ect-name">{p.name}</span>
                    {p.isBot && <span className="bot-tag">BOT</span>}
                    {c !== undefined
                      ? <span className="ect-choice">{choiceLabel}</span>
                      : <span className="ect-dot">⏳</span>}
                  </div>
                );
              })}
            </div>
            <div className="ect-progress">
              <div className="ect-progress-fill" style={{ width: `${total > 0 ? (responded / total) * 100 : 0}%` }} />
            </div>
            <div className="ect-count">{responded} of {total} players have decided</div>
          </div>
        )}

        </div>{/* end scroll region */}

        {/* Pinned footer CTA */}
        <div style={{
          flexShrink: 0,
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <button
            onClick={() => window.StockRush.dismissCurrentEvent()}
            className="big-btn"
            style={{
              width: '100%', maxWidth: 420,
              fontSize: 15, padding: '12px 22px', borderRadius: 10,
              background: isChoice && responded < total
                ? 'linear-gradient(135deg,#c24a3a,#8b3424)'
                : 'linear-gradient(135deg,#1f7a4d,#155b38)',
              border: 'none',
            }}
            title={isChoice && responded < total
              ? `Force-skip — non-responding students will be marked 'reject'`
              : 'Continue to the next event or open trading'}
          >
            {isChoice
              ? (responded < total
                  ? `⚡ Force advance (${total - responded} not responded)`
                  : 'Continue →')
              : 'Continue →'}
          </button>
          {isChoice && responded < total && (
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'Geist Mono, ui-monospace',
              textAlign: 'center', letterSpacing: '0.04em',
            }}>
              Non-responders auto-set to "reject"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Teaching panel rendered inside the teacher's EventPhaseOverlay.
// Gives the teacher a structured talking guide for the concept.
function EventTeachingPanel({ edu }) {
  return (
    <div style={{
      marginTop: 10, marginBottom: 10,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header strip */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(202,168,76,0.18), rgba(202,168,76,0.06))',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{edu.emoji}</span>
        <div>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', color: '#c9a84c', textTransform: 'uppercase',
          }}>
            Concept walkthrough
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em', marginTop: 2 }}>
            {edu.title}
          </div>
        </div>
      </div>

      {/* Three teaching sections */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 1,
        background: 'rgba(255,255,255,0.08)',
      }}>
        {[
          { label: 'WHAT IT IS',     body: edu.what,  accent: '#7ab8e8' },
          { label: 'HOW IT WORKS',   body: edu.how,   accent: '#4ade80' },
          { label: 'WHY IT MATTERS', body: edu.why,   accent: '#c9a84c' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'rgba(15,15,15,0.96)',
            padding: '10px 14px',
          }}>
            <div style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', color: s.accent, marginBottom: 5,
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 12.5, lineHeight: 1.45,
              color: 'rgba(255,255,255,0.9)',
            }}>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {/* Talking prompt for the teacher */}
      {edu.talkAbout && (
        <div style={{
          padding: '14px 22px',
          background: 'rgba(74,141,108,0.10)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 15.5,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.55,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>🗣️</span>
          <div>
            <span style={{
              fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.14em', color: '#4ade80', textTransform: 'uppercase',
              marginRight: 10,
            }}>
              Talk about
            </span>
            {edu.talkAbout}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hero leaderboard ──────────────────────────────────────────────────────────

const MEDAL = ['🥇', '🥈', '🥉'];

function HeroLeaderboard({ ranked, stocks, locks, phase }) {
  const start = window.GAME_CONFIG.startingCash;

  return (
    <div className="panel hero-lb">
      <div className="panel-head">
        <span>LEADERBOARD</span>
        <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
          {ranked.length} players
        </span>
      </div>
      <div className="hero-lb-list">
        {ranked.map((p, i) => {
          const pnl   = p.worth - start;
          const pnlUp = pnl >= 0;
          const holdings = Object.entries(p.holdings || {}).filter(([, q]) => q > 0);

          const podiumClass = i === 0 ? ' podium-1' : i === 1 ? ' podium-2' : i === 2 ? ' podium-3' : '';
          const podiumNameColor = i === 0 ? '#92400e' : i === 1 ? '#1e3a5f' : i === 2 ? '#7c2d12' : undefined;
          const avatarSize = i === 0 ? 74 : i < 3 ? 60 : 50;
          const medalSize  = i === 0 ? 64 : 56;
          const medalFontSize = i === 0 ? 46 : 38;
          return (
            <div
              key={p.id}
              className={'hero-row' + (i === 0 ? ' top-dog' : '') + podiumClass + (p.isBot ? ' is-bot' : '')}
              style={{ ['--row-accent']: p.color || '#cbd5e1', ['--row-color']: p.color || '#cbd5e1' }}
            >
              {/* Rank badge — colored circle for all positions */}
              <div className="hr-rank">
                {i < 3 ? (
                  <div style={{
                    width: medalSize, height: medalSize, borderRadius: '50%',
                    background: i === 0
                      ? 'linear-gradient(135deg,#fde68a 0%,#f59e0b 45%,#b45309 100%)'
                      : i === 1
                      ? 'linear-gradient(135deg,#e2e8f0 0%,#94a3b8 50%,#475569 100%)'
                      : 'linear-gradient(135deg,#fed7aa 0%,#d97706 45%,#92400e 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: medalFontSize, lineHeight: 1, flexShrink: 0,
                    boxShadow: i === 0
                      ? '0 6px 20px rgba(245,158,11,0.65), 0 0 0 3px rgba(245,209,66,0.35)'
                      : i === 1
                      ? '0 5px 16px rgba(71,85,105,0.50), 0 0 0 3px rgba(192,196,204,0.40)'
                      : '0 5px 16px rgba(146,64,14,0.55), 0 0 0 3px rgba(217,119,6,0.30)',
                    border: i === 0 ? '2px solid rgba(255,255,255,0.6)' : '2px solid rgba(255,255,255,0.4)',
                  }}>
                    {MEDAL[i]}
                  </div>
                ) : (
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${p.color || '#94a3b8'} 0%, ${p.color || '#64748b'}cc 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: 'Geist Mono, ui-monospace',
                    fontSize: 18, fontWeight: 900, flexShrink: 0,
                    border: '2.5px solid rgba(255,255,255,0.5)',
                    boxShadow: `0 4px 14px ${p.color || '#94a3b8'}66`,
                    textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  }}>
                    {i + 1}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="hr-identity">
                <Avatar name={p.name} color={p.color} avatar={p.avatar} size={avatarSize} />
                <div>
                  <div className="hr-name" style={podiumNameColor ? { color: podiumNameColor, fontSize: i === 0 ? 20 : 17 } : { fontSize: 15 }}>
                    {p.name}
                    {p.isBot && <span className="bot-tag">BOT</span>}
                    {locks?.[p.id] && <span className="hr-lock">🔒</span>}
                  </div>
                  <div className="hr-cash">
                    Cash {window.formatMoney(p.cash)}
                    {p.dividendsEarned > 0 && (
                      <span style={{ marginLeft: 6, color: 'var(--up)' }}>
                        +{window.formatMoney(p.dividendsEarned)} div
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Portfolio chips */}
              <div className="hr-portfolio">
                {holdings.length === 0
                  ? <span className="hr-no-holds muted">—</span>
                  : holdings.map(([ticker, qty]) => {
                      const s        = stocks.find(s => s.id === ticker);
                      const avgCost  = p.holdingsCost?.[ticker];
                      const stockUp  = s && avgCost != null ? s.price >= avgCost : null;
                      const sectorCol = (window.SECTOR_COLORS || {})[s?.sector];
                      const chipStyle = sectorCol ? {
                        background: sectorCol.bg,
                        borderColor: sectorCol.border,
                        color: sectorCol.text,
                      } : undefined;
                      return (
                        <div
                          key={ticker}
                          className={'hr-chip' + (stockUp === true ? ' chip-up' : stockUp === false ? ' chip-down' : '')}
                          style={chipStyle}
                          title={s ? `${s.name} · ${s.sector}` : ticker}
                        >
                          <span className="hr-chip-emoji">{s?.emoji || '•'}</span>
                          <span className="hr-chip-ticker">{ticker}</span>
                          <span className="hr-chip-qty">×{qty}</span>
                        </div>
                      );
                    })}
              </div>

              {/* Worth + P&L */}
              <div className="hr-worth-block">
                <div className={'hr-worth' + (i === 0 ? ' hero-worth' : '')}>
                  {window.formatMoney(p.worth)}
                </div>
                <div className={'hr-pnl ' + (pnlUp ? 'up' : 'down')}>
                  {pnlUp ? '▲' : '▼'} {window.formatMoney(Math.abs(pnl))}
                  <span className="hr-pnl-abs">
                    {' '}({pnlUp ? '+' : ''}{((pnl / start) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Compact stock ticker (sidebar) ────────────────────────────────────────────

// TV-style horizontal scrolling stock ticker — full-width band that lives
// at the bottom of the host view. Each item shows emoji + ticker + price +
// up/down delta. The list is rendered twice end-to-end so the keyframe
// animation can translate -50% for a seamless infinite loop. Hover pauses.
function StockTickerMarquee({ stocks }) {
  const list = (stocks || []).filter(s => s && s.price != null);
  if (list.length === 0) return null;
  const doubled = [...list, ...list];
  return (
    <div style={{
      background: 'linear-gradient(180deg, #071a10 0%, #0f3a24 100%)',
      borderTop: '2px solid #15803d',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      <style>{`
        @keyframes sr-ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .sr-ticker-track {
          display: flex;
          width: max-content;
          animation: sr-ticker-scroll 75s linear infinite;
        }
        .sr-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="sr-ticker-track">
        {doubled.map((s, i) => {
          const diff = s.price - (s.prevPrice || s.price);
          const pct  = s.prevPrice ? (diff / s.prevPrice) * 100 : 0;
          const flat = !s.prevPrice || s.prevPrice === s.price;
          const up   = diff >= 0;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 22px',
              borderRight: '1px solid rgba(255,255,255,0.10)',
              color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>{s.emoji || s.mono || '•'}</span>
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace',
                fontSize: 18, fontWeight: 800,
                color: 'rgba(255,255,255,0.95)',
                letterSpacing: '0.04em',
              }}>{s.id}</span>
              <span style={{
                fontFamily: 'Geist Mono, ui-monospace',
                fontSize: 20, fontWeight: 700,
                color: '#fff', fontVariantNumeric: 'tabular-nums',
              }}>₹{s.price.toLocaleString('en-IN')}</span>
              {!flat && (
                <span style={{
                  fontFamily: 'Geist Mono, ui-monospace',
                  fontSize: 15, fontWeight: 700,
                  color: up ? '#4ade80' : '#f87171',
                  background: up ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
                  padding: '3px 10px', borderRadius: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompactStockTicker({ stocks }) {
  return (
    <div className="panel compact-ticker">
      <div className="panel-head">
        <span>MARKET PRICES</span>
      </div>
      <div className="ticker-list">
        {(stocks || []).map(s => {
          const diff = s.price - (s.prevPrice || s.price);
          const pct  = s.prevPrice ? (diff / s.prevPrice) * 100 : 0;
          const up   = diff >= 0;
          return (
            <div key={s.id} className="ticker-row">
              <span className="ticker-emoji">{s.emoji || s.mono}</span>
              <div className="ticker-ident">
                <span className="ticker-id">{s.id}</span>
                <span className="ticker-name">{s.name}</span>
              </div>
              <div className="ticker-right">
                <span className="ticker-price">₹{s.price.toLocaleString('en-IN')}</span>
                {s.prevPrice && s.prevPrice !== s.price && (
                  <span className={'ticker-delta ' + (up ? 'up' : 'down')}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
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

// ── Events log (sidebar) ──────────────────────────────────────────────────────

function EventsLog({ news }) {
  if (!news || news.length === 0) return null;
  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-head"><span>EVENTS LOG</span></div>
      <div style={{ overflow: 'auto' }}>
        {news.map((n, i) => {
          const meta = EVENT_TYPE_META[n.type] || { label: n.type?.toUpperCase(), cls: 'evt-dividend' };
          return (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px dashed var(--faint)' }}>
              <span className={'event-type-badge event-type-badge-sm ' + meta.cls}>
                {meta.label}
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>
                {n.headline}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ activity, reactions, players }) {
  const recent   = (reactions || []).slice(0, 12);
  const feed     = (activity || []).slice(0, 20);
  const playersM = players || {};

  return (
    <div className="panel activity-panel">
      <div className="panel-head"><span>ACTIVITY</span></div>

      {recent.length > 0 && (
        <div className="reaction-strip">
          {recent.map(r => {
            const p = playersM[r.playerId];
            return (
              <div key={r.id} className="reaction-chip">
                <span className="reaction-emoji">{r.emoji}</span>
                <span className="reaction-name">{p?.name || '?'}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="activity-list">
        {feed.map((a, i) => <ActivityRow key={a.id || i} text={a.text} />)}
        {feed.length === 0 && (
          <div className="activity-item muted">Waiting for trades…</div>
        )}
      </div>
    </div>
  );
}

// One coloured row — parses the activity message and tints by event type.
function ActivityRow({ text }) {
  const t = text || '';
  let style = null;

  if (/\bbought\b/i.test(t)) {
    style = { bg: 'rgba(22,163,74,0.10)', fg: '#15803d', stripe: '#15803d', icon: '🟢' };
  } else if (/\bsold\b/i.test(t)) {
    style = { bg: 'rgba(220,38,38,0.10)', fg: '#b91c1c', stripe: '#b91c1c', icon: '🔴' };
  } else if (/locked\s+in/i.test(t) || /^🔒/.test(t)) {
    style = { bg: 'rgba(99,102,241,0.10)', fg: '#3730a3', stripe: '#4f46e5', icon: '🔒' };
  } else if (/^Round\s+\d+\b/i.test(t)) {
    style = { bg: 'rgba(180,83,9,0.10)', fg: '#7a3a08', stripe: '#b45309', icon: '🗞️' };
  } else if (/^📈\s+Trading/i.test(t)) {
    style = { bg: 'rgba(34,197,94,0.08)', fg: '#15803d', stripe: '#22c55e', icon: '📈' };
  } else if (/^📋/.test(t)) {
    style = { bg: 'rgba(124,58,237,0.10)', fg: '#5b21b6', stripe: '#7c3aed', icon: '📋' };
  } else if (/⏸/.test(t) || /▶/.test(t)) {
    style = { bg: 'rgba(180,83,9,0.10)', fg: '#7a3a08', stripe: '#b45309', icon: '⏸' };
  } else if (/joined|left|removed/i.test(t)) {
    style = { bg: 'rgba(14,165,233,0.10)', fg: '#0c4a6e', stripe: '#0ea5e9', icon: '👤' };
  }

  if (!style) {
    return <div className="activity-item">{t}</div>;
  }

  // Strip leading emoji from text so we don't double-show it
  const cleanedText = t.replace(/^([🔒📋📈🗞️👋⏸▶▶️📰])\s*/, '');

  return (
    <div className="activity-item" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 8px',
      background: style.bg,
      borderLeft: '3px solid ' + style.stripe,
      borderRadius: '0 6px 6px 0',
      color: style.fg,
      fontWeight: 600,
      fontSize: 12.5,
      lineHeight: 1.4,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{style.icon}</span>
      <span>{cleanedText}</span>
    </div>
  );
}

// ── Game rules modal — shown automatically when teacher first enters the lobby ─

function GameRulesModal({ onDismiss }) {
  const RULES = [
    {
      icon: '🎯',
      title: 'The goal',
      body: 'Each student starts with ₹2L. Trade real Indian stocks across 6 rounds (2014–2026). Most money wins.',
    },
    {
      icon: '📅',
      title: 'Real prices, real years',
      body: 'Each round jumps to actual historical prices — COVID crash, Jio revolution, rate-hike storm, recovery.',
    },
    {
      icon: '💼',
      title: '6 corporate actions',
      body: 'One per round, randomly chosen. All based on real Indian company actions.',
      chips: [
        { icon: '💰', label: 'Dividend' },
        { icon: '✂️', label: 'Split' },
        { icon: '🎫', label: 'IPO' },
        { icon: '🎁', label: 'Bonus' },
        { icon: '🔄', label: 'Buyback' },
        { icon: '📬', label: 'Rights' },
      ],
    },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(10,14,22,0.72)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fafaf7',
        borderRadius: 16,
        maxWidth: 640,
        width: '100%',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        border: '1.5px solid rgba(255,255,255,0.9)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1a3a5c 100%)',
          borderRadius: '14px 14px 0 0',
          padding: '16px 22px 14px',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', color: 'rgba(186,230,255,0.7)',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            TEACHER BRIEFING
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 4,
          }}>
            How the game works
          </div>
          <div style={{ fontSize: 13, color: 'rgba(186,230,255,0.75)', lineHeight: 1.4 }}>
            30 min · 11 years of Indian markets · real stocks, real prices.
          </div>
        </div>

        {/* Rules — scrollable */}
        <div style={{
          padding: '14px 18px',
          display: 'flex', flexDirection: 'column', gap: 8,
          flex: 1, minHeight: 0, overflowY: 'auto',
        }}>
          {RULES.map((r, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 12px',
              background: '#fff',
              border: '1.5px solid #e8edf2',
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 20, lineHeight: 1, flexShrink: 0,
                width: 34, height: 34, borderRadius: 8,
                background: 'linear-gradient(135deg,#f0f4f8,#e2e8f0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: '#0f172a',
                  marginBottom: 2, lineHeight: 1.2,
                }}>{r.title}</div>
                <div style={{
                  fontSize: 12.5, color: '#475569', lineHeight: 1.45,
                }}>{r.body}</div>
                {r.chips && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                    {r.chips.map(c => (
                      <span key={c.label} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', borderRadius: 14,
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        fontSize: 11.5, fontWeight: 600, color: '#334155',
                      }}>
                        {c.icon} {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Tip strip */}
          <div style={{
            padding: '8px 12px',
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1.5px solid #fcd34d',
            borderRadius: 8,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <span style={{ fontSize: 15 }}>💡</span>
            <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.45 }}>
              <b>Tip:</b> Tell students to skim company briefings on their phones while waiting.
            </div>
          </div>
        </div>

        {/* Pinned CTA footer */}
        <div style={{
          padding: '12px 18px 16px',
          borderTop: '1px solid #e8edf2',
          flexShrink: 0,
        }}>
          <button
            onClick={onDismiss}
            style={{
              width: '100%', padding: '12px 20px',
              background: 'linear-gradient(135deg, #0f172a, #1a3a5c)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 18px rgba(15,23,42,0.3)',
            }}
          >
            Got it — show lobby →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lobby overlay ─────────────────────────────────────────────────────────────

function LobbyOverlay({ state }) {
  const players = Object.values(state.players || {});
  const humans  = players.filter(p => !p.isBot);
  const qrRef   = React.useRef(null);
  const url     = `${window.location.origin}${window.location.pathname}?role=player&room=${window.GAME_CONFIG.roomCode}`;
  const [showRules, setShowRules] = React.useState(true);

  // Track which player IDs we've already seen, so newcomers can animate in
  const seenIds = React.useRef(new Set(humans.map(p => p.id)));
  const [latestArrival, setLatestArrival] = React.useState(null);

  React.useEffect(() => {
    // Find any human not yet in seenIds — that's a fresh arrival
    for (const p of humans) {
      if (!seenIds.current.has(p.id)) {
        seenIds.current.add(p.id);
        setLatestArrival({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, ts: Date.now() });
        setTimeout(() => setLatestArrival(curr => (curr && curr.id === p.id ? null : curr)), 3500);
        break;
      }
    }
    // Cleanup IDs of departed players
    const liveIds = new Set(humans.map(p => p.id));
    for (const id of [...seenIds.current]) {
      if (!liveIds.has(id)) seenIds.current.delete(id);
    }
  }, [humans.length, humans.map(p => p.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (qrRef.current && window.QRCode) {
      qrRef.current.innerHTML = '';
      new window.QRCode(qrRef.current, { text: url, width: 280, height: 280, correctLevel: window.QRCode.CorrectLevel.M });
    }
  }, [url]);

  return (
    <>
    {showRules && <GameRulesModal onDismiss={() => setShowRules(false)} />}
    <div className="overlay">
      <div className="overlay-card lobby-overlay wide" style={{ maxHeight: '92vh', overflowY: 'auto', position: 'relative', paddingBottom: 0 }}>
        <div className="overlay-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Stock Rush Pro · Room {window.GAME_CONFIG.roomCode}</span>
          <button
            onClick={() => setShowRules(true)}
            style={{
              marginLeft: 'auto',
              padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'rgba(255,255,255,0.8)',
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            📋 Rules
          </button>
        </div>
        <div className="overlay-title">Stock Rush Pro</div>
        <div className="overlay-sub">
          {window.IFM_TAGLINE}
        </div>

        {/* Arrival flash banner — overlays the lobby when a new human joins */}
        {latestArrival && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 5000,
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '3px solid #b45309',
            borderRadius: 24,
            padding: '20px 36px',
            display: 'flex', alignItems: 'center', gap: 18,
            boxShadow: '0 30px 80px rgba(146,64,14,0.4)',
            animation: 'sr-arrival 3.4s ease-out forwards',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: latestArrival.color, border: '4px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 46, lineHeight: 1, flexShrink: 0, overflow: 'hidden',
              boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
            }}>
              {latestArrival.avatar || '👤'}
            </div>
            <div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.18em', color: '#92400e', textTransform: 'uppercase',
              }}>🎉 New player</div>
              <div style={{
                fontSize: 36, fontWeight: 800, color: '#5b3d10',
                letterSpacing: '-0.01em', lineHeight: 1.05, marginTop: 4,
              }}>{latestArrival.name}</div>
              <div style={{ fontSize: 14, color: '#7a3a08', marginTop: 4, fontWeight: 600 }}>
                joined the room
              </div>
            </div>
          </div>
        )}

        <div className="how-grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          {/* QR card — much bigger now */}
          <div className="how-card real" style={{ padding: '22px 22px 18px', alignItems: 'center', textAlign: 'center' }}>
            <div className="how-tag" style={{ alignSelf: 'flex-start' }}>STUDENTS JOIN VIA QR · SCAN FROM PHONE</div>
            <div style={{
              background: '#fff', padding: 16, borderRadius: 16,
              border: '2px solid var(--line)',
              boxShadow: '0 6px 22px rgba(0,0,0,0.08)',
              display: 'inline-block', marginTop: 8,
            }}>
              <div ref={qrRef} style={{ display: 'flex' }} />
            </div>
            <div className="join-url-big" style={{
              marginTop: 16, color: 'var(--ink)', fontSize: 18,
            }}>
              ifm-deploy.vercel.app/stock-rush-pro
            </div>
            <div className="join-code-big" style={{ marginTop: 8, fontSize: 32, color: 'var(--ink)' }}>
              {window.GAME_CONFIG.roomCode}
            </div>
            <div className="how-body" style={{ marginTop: 14, fontSize: 15, color: 'var(--muted)' }}>
              Open camera, point at QR. Or go to the URL and enter room code <b style={{ color: 'var(--ink)' }}>{window.GAME_CONFIG.roomCode}</b>.
            </div>
          </div>

          {/* Player list with fun animated chips */}
          <div className="how-card demo">
            <div className="how-tag">PLAYERS IN ROOM ({humans.length})</div>
            {humans.length === 0 ? (
              <div className="how-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: 16 }}>
                <span style={{ opacity: 0.6 }}>Waiting for the first student to scan…</span>
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 14, marginTop: 6,
              }}>
                {humans.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '14px 8px',
                    background: 'rgba(255,255,255,0.10)',
                    border: '1.5px solid rgba(255,255,255,0.22)',
                    borderRadius: 16,
                    animation: 'sr-chip-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.3) both',
                  }}>
                    <div style={{
                      width: 68, height: 68, borderRadius: '50%',
                      background: p.color, border: '3px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 38, lineHeight: 1, flexShrink: 0, overflow: 'hidden',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                      animation: `sr-chip-bob 3.${(i * 17) % 9}s ease-in-out ${i * 0.3}s infinite`,
                    }}>
                      {p.avatar || '👤'}
                    </div>
                    <span style={{
                      fontWeight: 700, fontSize: 16, color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: '100%', textAlign: 'center',
                    }}>{p.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="how-foot" style={{ marginTop: 'auto', paddingTop: 12 }}>
              5 bots added automatically if fewer than 5 humans join.
            </div>
          </div>
        </div>

        <style>{`
          @keyframes sr-chip-in {
            0%   { opacity: 0; transform: translateY(-12px) scale(0.85); }
            60%  { opacity: 1; transform: translateY(2px)   scale(1.05); }
            100% { opacity: 1; transform: translateY(0)     scale(1); }
          }
          @keyframes sr-chip-bob {
            0%, 100% { transform: translateY(0) rotate(-1.5deg); }
            50%      { transform: translateY(-5px) rotate(1.5deg); }
          }
          @keyframes sr-arrival {
            0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.55); }
            15%  { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
            22%  { transform: translate(-50%, -50%) scale(1); }
            85%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          }
        `}</style>

        {/* Sticky CTA footer — Start button is ALWAYS reachable no matter how
            many human chips fill the player panel. The lobby-overlay card now
            scrolls internally (maxHeight: 92vh); this footer pins to the
            bottom of that scroll container so the button never disappears. */}
        <div
          className="lobby-divider"
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--surface, #fafaf7)',
            borderTop: '1.5px solid var(--line)',
            paddingTop: 16,
            paddingBottom: 18,
            marginTop: 12,
            marginLeft: -36, marginRight: -36, paddingLeft: 36, paddingRight: 36,
            zIndex: 10,
            boxShadow: '0 -8px 24px rgba(0,0,0,0.06)',
          }}
        >
          <button
            className="big-btn"
            onClick={() => window.StockRush.startGame()}
          >
            {(() => {
              const TARGET = 6;
              const bots = Math.max(0, TARGET - humans.length);
              const total = humans.length + bots;
              if (humans.length === 0) return `Start with ${bots} Bots →`;
              if (humans.length >= TARGET) return `Start Game with ${humans.length} Players →`;
              return `Start Game with ${humans.length} + ${bots} bots = ${total} players →`;
            })()}
          </button>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            ₹{(window.GAME_CONFIG.startingCash / 100000).toFixed(0)}L starting cash · {window.GAME_CONFIG.rounds} rounds spanning 2014–2026
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Ended overlay ─────────────────────────────────────────────────────────────

// ── Finale overlay — "One year later · 2026" reveal between R5 and ended ────
// Memoised so per-tick re-renders from the engine don't restart the entrance
// animations (which caused the whole screen to "flash" every second).
const FinaleOverlay = React.memo(function FinaleOverlay({ state, ranked }) {
  const news = window.FINAL_NEWS;
  if (!news) return null;
  // Only show notes for stocks that are active in this game session
  const activeIds = new Set((state.stocks || []).map(s => s.id));
  const entries = Object.entries(news.notes || {}).filter(([id]) => activeIds.has(id));

  // Split into top winners / top losers so the reveal is centred on the most
  // dramatic moves, not 16 cards of small wiggles.
  const enriched = entries.map(([ticker, note]) => {
    const stock = (state.stocks || []).find(s => s.id === ticker);
    return { ticker, note, stock, pct: note.pct, up: note.dir === 'up' };
  });
  const winners = enriched.filter(e => e.up).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const losers  = enriched.filter(e => !e.up).sort((a, b) => b.pct - a.pct).slice(0, 3);

  const humans = ranked.filter(p => !p.isBot);
  const topReturn = humans.length
    ? Math.max(...humans.map(p => ((p.worth - window.GAME_CONFIG.startingCash) / window.GAME_CONFIG.startingCash) * 100))
    : 0;

  function MoverCard({ entry, idx, side }) {
    const { ticker, stock, note, up, pct } = entry;
    const pctStr = pct >= 100 ? Math.round(pct) + '%' : pct.toFixed(0) + '%';
    return (
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderLeft: `4px solid ${up ? '#1f7a4d' : '#c24a3a'}`,
        borderRadius: 10, padding: '12px 16px',
        animation: `fin-card-in 0.5s ease-out ${0.35 + idx * 0.18}s both`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{stock?.emoji || '•'}</span>
          <span style={{
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700,
            fontSize: 16, color: '#fff', letterSpacing: '0.04em',
          }}>{ticker}</span>
          <span style={{ flex: 1 }} />
          <span style={{
            color: up ? '#4ade80' : '#f87171',
            fontFamily: 'Geist Mono, ui-monospace',
            fontWeight: 800, fontSize: 18,
          }}>
            {up ? '▲' : '▼'} {pctStr}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45 }}>
          {note.why}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at center, #1a1d24 0%, #050608 80%)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fin-fade-in 0.5s ease-out',
    }}>
      <style>{`
        @keyframes fin-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fin-title-in {
          0%   { opacity: 0; transform: translateY(-20px) scale(0.92); letter-spacing: 0.4em; }
          60%  { opacity: 1; letter-spacing: 0.22em; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.18em; }
        }
        @keyframes fin-year-in {
          0%   { opacity: 0; transform: scale(0.4); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fin-card-in {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fin-cta-in {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 1080,
        height: '94vh',
        display: 'flex', flexDirection: 'column',
        color: '#fff',
      }}>
        {/* Title block — centered, cinematic */}
        <div style={{ textAlign: 'center', flexShrink: 0, paddingBottom: 16 }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace',
            fontSize: 13, fontWeight: 700,
            letterSpacing: '0.22em',
            color: '#2a9d8f',
            marginBottom: 10,
            animation: 'fin-title-in 1.1s cubic-bezier(0.2, 0.8, 0.3, 1) both',
          }}>
            🎬 ONE YEAR LATER
          </div>
          <div style={{
            fontSize: 72, fontWeight: 800,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            marginBottom: 12,
            animation: 'fin-year-in 1.2s cubic-bezier(0.2, 0.8, 0.3, 1) 0.15s both',
            textShadow: '0 0 60px rgba(42,157,143,0.45)',
          }}>
            2026
          </div>
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#fff',
            letterSpacing: '-0.01em', marginBottom: 6,
            animation: 'fin-card-in 0.7s ease-out 0.45s both',
          }}>
            {news.headline}
          </div>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,0.62)',
            lineHeight: 1.5, maxWidth: 760, margin: '0 auto',
            animation: 'fin-card-in 0.7s ease-out 0.6s both',
          }}>
            {news.subhead}
          </div>
        </div>

        {/* Top movers — two columns: winners + losers */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 18,
          padding: '4px 0',
        }}>
          {winners.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 11,
                letterSpacing: '0.16em', color: '#4ade80', fontWeight: 700,
                animation: 'fin-card-in 0.5s ease-out 0.3s both',
              }}>
                ▲ TOP GAINERS
              </div>
              {winners.map((e, i) => <MoverCard key={e.ticker} entry={e} idx={i} side="win" />)}
            </div>
          )}
          {losers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 11,
                letterSpacing: '0.16em', color: '#f87171', fontWeight: 700,
                animation: 'fin-card-in 0.5s ease-out 0.3s both',
              }}>
                ▼ TOP LOSERS
              </div>
              {losers.map((e, i) => <MoverCard key={e.ticker} entry={e} idx={i + winners.length} side="loss" />)}
            </div>
          )}
        </div>

        {/* Pinned footer */}
        <div style={{
          flexShrink: 0, paddingTop: 14, marginTop: 4,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          animation: 'fin-cta-in 0.6s ease-out 1.3s both',
        }}>
          <div style={{
            background: 'rgba(42,157,143,0.12)',
            border: '1px solid rgba(42,157,143,0.35)',
            borderRadius: 8, padding: '9px 14px',
            fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4,
            marginBottom: 10, textAlign: 'center',
          }}>
            🗣️ <b>Discuss</b>: Whose R6 picks paid off? Top return: <b style={{ color: '#4ade80' }}>{topReturn >= 0 ? '+' : ''}{topReturn.toFixed(0)}%</b>
          </div>
          <button
            className="big-btn"
            style={{
              width: '100%', fontSize: 18, padding: '14px 22px', borderRadius: 12,
              background: 'linear-gradient(135deg, #2a9d8f, #1f7a6f)',
              color: '#fff', border: 'none', fontWeight: 800,
              letterSpacing: '0.02em', cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(42,157,143,0.5)',
            }}
            onClick={() => window.StockRush.endFromFinale()}
          >
            🏁 Reveal Final Results →
          </button>
        </div>
      </div>
    </div>
  );
}, () => true);  // never re-render once mounted — phase change unmounts via parent

function EndedOverlay({ ranked }) {
  const start = window.GAME_CONFIG.startingCash;
  const stocks = window.StockRush.getState().stocks || [];
  const stockById = Object.fromEntries(stocks.map(s => [s.id, s]));
  const [confirmPlay, setConfirmPlay] = React.useState(false);

  const humans = ranked.filter(p => !p.isBot);
  const bots   = ranked.filter(p =>  p.isBot);
  const isBotOnly = humans.length === 0;
  // When no humans joined, fall back to bots so the screen is never empty.
  const humansRanked = isBotOnly
    ? [...bots].sort((a, b) => b.worth - a.worth)
    : [...humans].sort((a, b) => b.worth - a.worth);

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

    const winners = positions.filter(x => x.change > 0);
    const losers  = positions.filter(x => x.change < 0);
    const bestPick  = positions.length ? positions.reduce((a,b) => b.change > a.change ? b : a) : null;
    const worstPick = positions.length ? positions.reduce((a,b) => b.change < a.change ? b : a) : null;
    const hitRate   = positions.length ? winners.length / positions.length : 0;

    const cashPct = p.cash / Math.max(p.worth, 1);
    const distinct = positions.length;
    const topPos = positions.length ? Math.max(...positions.map(x => x.value)) : 0;
    const concentration = invested > 0 ? topPos / invested : 0;

    let style, styleColor;
    if (cashPct > 0.6)              { style = '💰 Cash holder';   styleColor = '#64748b'; }
    else if (distinct === 1)        { style = '🎯 All-in';        styleColor = '#dc2626'; }
    else if (concentration > 0.6)   { style = '⚡ Concentrated';  styleColor = '#d97706'; }
    else if (distinct >= 4)         { style = '🌐 Diversified';   styleColor = '#0891b2'; }
    else                             { style = '⚖️ Balanced';      styleColor = '#16a34a'; }

    const wh = p.worthHistory || [];
    let bestRound = null, worstRound = null;
    for (let i = 1; i < wh.length; i++) {
      const delta = wh[i] - wh[i - 1];
      if (bestRound  === null || delta > bestRound.delta)  bestRound  = { round: i, delta };
      if (worstRound === null || delta < worstRound.delta) worstRound = { round: i, delta };
    }

    const playerReturn = ((p.worth - start) / start) * 100;
    let lessonLine1, lessonLine2;

    if (cashPct > 0.6) {
      lessonLine1 = `Sat on ${(cashPct * 100).toFixed(0)}% cash — the safety came at a price.`;
      lessonLine2 = bestPick
        ? `The market moved without ${p.name}. Even ${bestPick.tk} would've helped.`
        : `When the market moves, cash standing still feels like falling behind.`;
    } else if (bestPick && bestPick.change > 50) {
      lessonLine1 = `Backed ${bestPick.emoji} ${bestPick.tk} hard — and it paid off ${bestPick.change.toFixed(0)}%.`;
      lessonLine2 = worstPick && worstPick.change < -10
        ? `But ${worstPick.tk} (${worstPick.change.toFixed(0)}%) dragged. ${distinct >= 3 ? 'Diversification saved them.' : 'A wider net might have helped.'}`
        : `Conviction trades win when the thesis is right. Risk paid off here.`;
    } else if (playerReturn < 0) {
      lessonLine1 = worstPick
        ? `${worstPick.emoji} ${worstPick.tk} (${worstPick.change.toFixed(0)}%) was the painful one.`
        : `Tough market — losses on net by ${playerReturn.toFixed(0)}%.`;
      lessonLine2 = winners.length > 0
        ? `Some wins (${winners.length} of ${positions.length} picks), but the losses overwhelmed.`
        : `Every pick was underwater — timing or sector reading needs review.`;
    } else if (distinct >= 4) {
      lessonLine1 = `Spread across ${distinct} names — classic diversification.`;
      lessonLine2 = `Caught some winners (${winners.length}/${positions.length}). Lower ceiling, but lower risk too.`;
    } else {
      lessonLine1 = `Mixed approach — ${distinct} stocks, ${(cashPct * 100).toFixed(0)}% cash buffer.`;
      lessonLine2 = winners.length === positions.length && positions.length > 0
        ? `Every pick a winner. Disciplined stock selection.`
        : `Balanced between risk and safety. A textbook game.`;
    }

    // ── Two insight sentences (replace stats-grid in the UI) ──────────────────
    const playerReturnPct = pct(p.worth);

    // Insight 1 — how they built the portfolio
    let insight1;
    if (cashPct < 0.04) {
      insight1 = `Stayed ${(100 - cashPct * 100).toFixed(0)}% invested — zero cash sitting on the sidelines. Every rupee was put to work in the market.`;
    } else if (cashPct > 0.55) {
      insight1 = `Kept ${(cashPct * 100).toFixed(0)}% in cash throughout — the most defensive stance possible. Safe, but the opportunity cost was real.`;
    } else if (distinct === 1) {
      insight1 = `Single-stock portfolio — every rupee on one thesis. The highest-conviction (and highest-risk) approach in the room.`;
    } else if (concentration > 0.65 && bestPick) {
      insight1 = `Loaded ${(concentration * 100).toFixed(0)}% of equity into ${bestPick.emoji || ''} ${bestPick.tk}. A concentrated bet — this is how big wins (and big losses) happen.`;
    } else if (distinct >= 4) {
      insight1 = `Spread across ${distinct} stocks — classic diversification. Caught ${winners.length} winner${winners.length !== 1 ? 's' : ''} of ${positions.length} picks, which lowered both risk and ceiling.`;
    } else {
      insight1 = `Held ${distinct} stock${distinct !== 1 ? 's' : ''} with ${(cashPct * 100).toFixed(0)}% in reserve — a measured balance between conviction and caution.`;
    }

    // Insight 2 — the market call / return story
    let insight2;
    if (bestPick && bestPick.change > 500) {
      insight2 = `${bestPick.emoji || ''} ${bestPick.tk} returned ${bestPick.change.toFixed(0)}% — a multi-bagger. Identifying a stock before a 5× move is a skill most fund managers never achieve.`;
    } else if (bestPick && bestPick.change > 100) {
      insight2 = `${bestPick.emoji || ''} ${bestPick.tk} doubled at +${bestPick.change.toFixed(0)}% — a thesis that played out. That's what researched conviction looks like.`;
    } else if (playerReturnPct > 500) {
      insight2 = `+${playerReturnPct.toFixed(0)}% total — that's 5× the starting money. Compounding in great businesses over time is exactly this powerful.`;
    } else if (playerReturnPct > 100) {
      insight2 = `+${playerReturnPct.toFixed(0)}% total — more than doubled the starting ₹2L, outpacing most equity mutual funds over this period.`;
    } else if (losers.length === 0 && positions.length > 1) {
      insight2 = `Every single pick was profitable — no losers in the portfolio. Great selection, great timing, or both.`;
    } else if (winners.length === 0 && positions.length > 0) {
      insight2 = `Every stock in the portfolio lost ground — a reminder that sector, timing, and thesis all need to align.`;
    } else if (worstPick && worstPick.change < -25) {
      insight2 = `${worstPick.emoji || ''} ${worstPick.tk} fell ${Math.abs(worstPick.change).toFixed(0)}% — the costly lesson. Even quality companies can stay underwater for years.`;
    } else {
      const wh = p.worthHistory || [];
      const upRds = wh.length > 1 ? wh.slice(1).filter((w, ix) => w > wh[ix]).length : 0;
      insight2 = upRds > 0 && wh.length > 1
        ? `Positive in ${upRds} of ${wh.length - 1} rounds. Markets reward patience — the skill is staying in when it feels uncomfortable.`
        : `${playerReturnPct >= 0 ? '+' : ''}${playerReturnPct.toFixed(1)}% over 9 years of Indian markets — investing is a long game, and this is the beginning of understanding it.`;
    }

    return {
      positions, invested, cashPct, distinct, concentration, bestPick, worstPick, hitRate,
      style, styleColor, lessonLine1, lessonLine2, insight1, insight2,
      winners: winners.length, losers: losers.length,
      bestRound, worstRound,
    };
  }

  // In bot-only sessions, analyse bots so the breakdown is never empty.
  const playerAnalysis = humansRanked.map(p => ({ player: p, ...analysePlayer(p) }));

  // Class-wide stats — fall back to bots when no humans played
  const displayPlayers = isBotOnly ? bots : humans;
  const avgReturn = displayPlayers.length
    ? displayPlayers.reduce((s,p) => s + pct(p.worth), 0) / displayPlayers.length
    : 0;
  const bestBot   = bots.length ? Math.max(...bots.map(b => b.worth)) : 0;
  const beatBots  = humans.filter(h => h.worth > bestBot).length;
  const topReturn = displayPlayers.length ? Math.max(...displayPlayers.map(h => pct(h.worth))) : 0;

  const stockHolders = {};
  for (const p of humans) {
    for (const [tk, q] of Object.entries(p.holdings || {})) {
      if (q > 0) stockHolders[tk] = (stockHolders[tk] || 0) + 1;
    }
  }
  const popularStock = Object.entries(stockHolders).sort((a,b) => b[1] - a[1])[0];

  return (
    <div className="overlay" style={{ alignItems: 'flex-start', paddingTop: 18 }}>
      <div className="overlay-card wide" style={{ maxWidth: 1320, width: '96vw', maxHeight: '95vh', overflowY: 'auto', padding: '18px 22px' }}>

        {/* Header strip — headline stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
              Game over · {isBotOnly ? 'bots only' : `${humans.length} student${humans.length !== 1 ? 's' : ''}`} · {window.GAME_CONFIG.rounds} rounds · 6 corporate actions
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Final results
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <HeadlineStat label="Top return"     value={`${topReturn >= 0 ? '+' : ''}${topReturn.toFixed(1)}%`} tone={topReturn >= 0 ? 'up' : 'down'} />
            <HeadlineStat label={isBotOnly ? 'Bot average' : 'Class average'}  value={`${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(1)}%`} tone={avgReturn >= 0 ? 'up' : 'down'} />
            {!isBotOnly && <HeadlineStat label="Beat the bots"  value={`${beatBots}/${humans.length}`} tone={beatBots > 0 ? 'up' : 'neutral'} />}
            {popularStock && (
              <HeadlineStat label="Most owned" value={`${stockById[popularStock[0]]?.emoji || ''} ${popularStock[0]}`} tone="neutral" hint={`${popularStock[1]} held it`} />
            )}
          </div>
        </div>

        {/* ── Winner hero card — borrows visual language from the student 'Game Over' card ── */}
        {humansRanked.length > 0 && (() => {
          const winner = humansRanked[0];
          const wa = playerAnalysis[0];
          const profit = winner.worth - start;
          const returnPct = pct(winner.worth);
          const up = profit >= 0;
          return (
            <div style={{
              marginBottom: 16,
              padding: '20px 24px',
              background: 'linear-gradient(120deg, rgba(245,209,66,0.18) 0%, rgba(255,251,232,0.35) 50%, rgba(250,250,247,0.4) 100%)',
              border: '2px solid rgba(245,163,42,0.4)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Faded trophy watermark */}
              <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 110, opacity: 0.06, lineHeight: 1, pointerEvents: 'none', userSelect: 'none' }}>🏆</div>

              {/* Avatar column */}
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#92400e', fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, marginBottom: 6 }}>
                  {isBotOnly ? 'Top bot' : 'Top trader'}
                </div>
                <Avatar name={winner.name} color={winner.color} avatar={winner.avatar} size={72} />
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 18, color: '#92400e', marginTop: 6 }}>
                  #1 <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>of {humansRanked.length}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginTop: 2 }}>{winner.name}</div>
              </div>

              {/* Worth + analysis column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 38, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {window.formatMoney(winner.worth)}
                </div>
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 19, fontWeight: 700, color: up ? '#15803d' : '#b91c1c', marginTop: 4 }}>
                  {up ? '+' : ''}{window.formatMoney(profit)}&nbsp;<span style={{ fontSize: 15, fontWeight: 600 }}>({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%)</span>
                </div>
                {winner.dividendsEarned > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', fontFamily: 'Geist Mono, ui-monospace', fontWeight: 600 }}>
                    💰 {window.formatMoney(winner.dividendsEarned)} in dividends
                  </div>
                )}
                {wa && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    <div style={{
                      padding: '5px 13px', borderRadius: 14, flexShrink: 0,
                      fontSize: 13, fontWeight: 700,
                      background: wa.styleColor + '18', color: wa.styleColor,
                      border: '1px solid ' + wa.styleColor + '40',
                    }}>
                      {wa.style}
                    </div>
                    <div style={{
                      fontSize: 13, color: '#475569', fontStyle: 'italic',
                      padding: '6px 12px',
                      borderLeft: '3px solid ' + wa.styleColor,
                      background: 'rgba(15,23,42,0.03)',
                      borderRadius: '0 6px 6px 0',
                      lineHeight: 1.5,
                    }}>
                      {wa.lessonLine1}
                    </div>
                  </div>
                )}
              </div>

              {/* Journey sparkline */}
              {winner.worthHistory && winner.worthHistory.length > 1 && (
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>Journey</div>
                  <Sparkline data={winner.worthHistory} width={120} height={48} stroke={up ? '#15803d' : '#b91c1c'} />
                </div>
              )}
            </div>
          );
        })()}

        {/* TWO-COLUMN: leaderboard left, class return distribution right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 14, alignItems: 'start' }}>

          {/* LEFT — leaderboard */}
          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, fontFamily: 'Geist Mono, ui-monospace' }}>
              {isBotOnly ? 'Bot Leaderboard' : 'Leaderboard'}
            </div>
            {humansRanked.map((p, i) => {
              const change = pct(p.worth);
              const up = change >= 0;
              const medal = ['🥇','🥈','🥉'][i] || (i + 1);
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
                  <div style={{ fontSize: i < 3 ? 22 : 16, fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, textAlign: 'center', color: i < 3 ? '#0f172a' : '#94a3b8' }}>
                    {medal}
                  </div>
                  <Avatar name={p.name} color={p.color} avatar={p.avatar} size={32} />
                  <div style={{ fontWeight: 600, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 17 }}>
                    {window.formatMoney(p.worth)}
                  </div>
                  <div style={{
                    fontFamily: 'Geist Mono, ui-monospace', fontSize: 14, fontWeight: 700,
                    color: up ? '#15803d' : '#b91c1c',
                    background: up ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                    padding: '4px 8px', borderRadius: 4,
                    minWidth: 74, textAlign: 'right',
                  }}>
                    {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — class return distribution */}
          <ClassReturnsChart humans={displayPlayers} start={start} inline />
        </div>

        {/* FULL-WIDTH — per-student educational breakdown */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
                {isBotOnly ? 'How each bot played' : 'How each student played'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                Round-by-round breakdown &amp; teaching lessons
              </div>
            </div>
            {isBotOnly && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                No students joined — showing bot strategies as a reference.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 12 }}>
            {playerAnalysis.map(({ player, positions, cashPct, distinct, concentration, bestPick, worstPick, style, styleColor, insight1, insight2, winners, losers }, i) => {
              const rank = i + 1;
              const playerReturnPct = pct(player.worth);
              const pnlUp = playerReturnPct >= 0;
              const wh = player.worthHistory || [];
              const rounds = wh.slice(1).map((w, idx) => {
                const prev = wh[idx] || start;
                const pctDelta = prev > 0 ? (w - prev) / prev * 100 : 0;
                return { up: pctDelta >= 0, pct: pctDelta };
              });

              // ── One bold "Lesson:" line per player — themed for the teacher ──
              let lessonHeadline;
              if (cashPct > 0.6) {
                lessonHeadline = 'Stayed on the sidelines — safety had a real opportunity cost.';
              } else if (bestPick && bestPick.change > 100 && worstPick && worstPick.change < -10) {
                lessonHeadline = `Backed the right horse (${bestPick.tk}) — but ${worstPick.tk} dragged the score.`;
              } else if (bestPick && bestPick.change > 100 && cashPct > 0.25) {
                lessonHeadline = 'Picked a winner — but too much cash on the sidelines.';
              } else if (bestPick && bestPick.change > 50 && distinct <= 2) {
                lessonHeadline = 'Conviction paid off — concentration worked this time.';
              } else if (playerReturnPct < -10 && worstPick) {
                lessonHeadline = `Chased the wrong story — ${worstPick.tk} did the damage.`;
              } else if (distinct >= 4 && playerReturnPct > 0) {
                lessonHeadline = 'Stayed boring, stayed diversified — boring won.';
              } else if (winners > 0 && losers === 0 && positions.length > 1) {
                lessonHeadline = 'Every pick a winner — disciplined stock selection.';
              } else if (playerReturnPct > 30) {
                lessonHeadline = 'Read the market right — conviction rewarded.';
              } else if (playerReturnPct < 0) {
                lessonHeadline = 'Tough market — sector timing needs work.';
              } else {
                lessonHeadline = 'Balanced approach — modest reward, modest risk.';
              }

              return (
                <div key={player.id} style={{
                  background: '#fff',
                  border: '1.5px solid var(--line)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.05), 0 4px 14px rgba(15,23,42,0.04)',
                  display: 'flex', flexDirection: 'column',
                }}>

                  {/* ── Header band ── */}
                  <div style={{
                    background: `linear-gradient(105deg, ${styleColor}22 0%, ${styleColor}0b 55%, transparent 100%)`,
                    borderBottom: `1px solid ${styleColor}22`,
                    padding: '13px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {/* Avatar + rank badge */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <Avatar name={player.name} color={player.color} avatar={player.avatar} size={52} />
                      <div style={{
                        position: 'absolute', bottom: -3, right: -7,
                        background: rank === 1
                          ? 'linear-gradient(135deg,#f59e0b,#b45309)'
                          : rank === 2
                          ? 'linear-gradient(135deg,#94a3b8,#475569)'
                          : rank === 3
                          ? 'linear-gradient(135deg,#d97706,#92400e)'
                          : '#64748b',
                        color: '#fff', fontFamily: 'Geist Mono, ui-monospace',
                        fontSize: 10, fontWeight: 900,
                        padding: '2px 6px', borderRadius: 8,
                        border: '2px solid #fff', lineHeight: 1.2,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.20)',
                      }}>#{rank}</div>
                    </div>

                    {/* Name + worth row */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 800, fontSize: 18, color: '#0f172a',
                        letterSpacing: '-0.02em', lineHeight: 1.1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{player.name}</div>
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 14, color: '#0f172a',
                        }}>{window.formatMoney(player.worth)}</span>
                        <span style={{
                          fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700,
                          padding: '2px 8px', borderRadius: 5,
                          background: pnlUp ? 'rgba(22,163,74,0.16)' : 'rgba(220,38,38,0.16)',
                          color: pnlUp ? '#15803d' : '#b91c1c',
                          border: `1px solid ${pnlUp ? 'rgba(22,163,74,0.32)' : 'rgba(220,38,38,0.32)'}`,
                        }}>{pnlUp ? '▲' : '▼'} {Math.abs(playerReturnPct).toFixed(1)}%</span>
                        {player.dividendsEarned > 0 && (
                          <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                            💰 +{window.formatMoney(player.dividendsEarned)} div
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    {wh.length > 1 && (
                      <Sparkline data={wh} width={80} height={30}
                        stroke={pnlUp ? '#15803d' : '#b91c1c'} />
                    )}

                    {/* Style badge */}
                    <div style={{
                      flexShrink: 0, padding: '5px 13px', borderRadius: 18,
                      fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                      background: styleColor + '1c', color: styleColor,
                      border: `1.5px solid ${styleColor}42`,
                    }}>{style}</div>
                  </div>

                  {/* ── Round-by-round chips ── */}
                  {rounds.length > 0 && (
                    <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--faint)' }}>
                      <div style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', marginBottom: 6 }}>
                        Round by round
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rounds.length}, 1fr)`, gap: 5 }}>
                        {rounds.map((r, ri) => {
                          const fg = r.up ? '#15803d' : '#b91c1c';
                          const bg = r.up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)';
                          return (
                            <div key={ri} style={{
                              background: bg,
                              border: `1px solid ${fg}38`,
                              borderRadius: 7,
                              padding: '5px 4px',
                              textAlign: 'center',
                              lineHeight: 1.1,
                            }}>
                              <div style={{ fontSize: 9, letterSpacing: '0.08em', fontFamily: 'Geist Mono, ui-monospace', color: '#64748b', fontWeight: 700 }}>R{ri + 1}</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: fg, fontFamily: 'Geist Mono, ui-monospace', marginTop: 2 }}>
                                {r.up ? '▲' : '▼'}
                              </div>
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: fg, fontFamily: 'Geist Mono, ui-monospace', marginTop: 1 }}>
                                {r.up ? '+' : ''}{r.pct.toFixed(0)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Best / Worst pick + holdings meta ── */}
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 16px',
                    flexWrap: 'wrap', alignItems: 'stretch',
                    borderBottom: '1px solid var(--faint)',
                  }}>
                    {bestPick && (
                      <div style={{
                        flex: 1, minWidth: 130,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.30)',
                      }}>
                        <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#15803d', fontWeight: 700 }}>Biggest contributor</div>
                        <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 800, color: '#15803d', marginTop: 2 }}>
                          {bestPick.emoji} {bestPick.tk} <span style={{ marginLeft: 4 }}>▲ {bestPick.change.toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                    {worstPick && worstPick.change < -3 ? (
                      <div style={{
                        flex: 1, minWidth: 130,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.30)',
                      }}>
                        <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b91c1c', fontWeight: 700 }}>Biggest drag</div>
                        <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 13, fontWeight: 800, color: '#b91c1c', marginTop: 2 }}>
                          {worstPick.emoji} {worstPick.tk} <span style={{ marginLeft: 4 }}>▼ {Math.abs(worstPick.change).toFixed(0)}%</span>
                        </div>
                      </div>
                    ) : positions.length > 1 ? (
                      <div style={{
                        flex: 1, minWidth: 130,
                        padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(22,163,74,0.05)', border: '1px dashed rgba(22,163,74,0.30)',
                        display: 'flex', alignItems: 'center',
                      }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d' }}>🎉 No losing picks</div>
                      </div>
                    ) : null}
                    <div style={{
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(15,23,42,0.035)', border: '1px solid rgba(15,23,42,0.08)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Mix</div>
                      <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 2, whiteSpace: 'nowrap' }}>
                        {distinct} stock{distinct !== 1 ? 's' : ''} · {(cashPct * 100).toFixed(0)}% cash
                      </div>
                    </div>
                  </div>

                  {/* ── One bold teaching lesson ── */}
                  <div style={{
                    padding: '12px 16px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: `linear-gradient(180deg, ${styleColor}08 0%, transparent 100%)`,
                  }}>
                    <div style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>📚</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700 }}>
                        Lesson
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.4, marginTop: 3 }}>
                        {lessonHeadline}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="big-btn" style={{ marginTop: 14, width: '100%' }} onClick={() => setConfirmPlay(true)}>
          ↻  Play again
        </button>
      </div>
      {confirmPlay && (
        <ResetConfirmModal
          studentCount={humans.length}
          onCancel={() => setConfirmPlay(false)}
          onConfirm={() => { setConfirmPlay(false); window.StockRush.reset && window.StockRush.reset(); }}
        />
      )}
    </div>
  );
}

// ── Supporting components for the final-results view ─────────────────────────

function HeadlineStat({ label, value, tone, hint }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace' }}>{value}</div>
      {hint && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{hint}</div>}
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  const color = tone === 'up' ? '#15803d' : tone === 'down' ? '#b91c1c' : '#0f172a';
  return (
    <div style={{ background: 'var(--bg, #fafaf7)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 10px' }}>
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'Geist Mono, ui-monospace' }}>{value}</div>
    </div>
  );
}

function RoundChip({ label, round, tone }) {
  const up = tone === 'up';
  const fg = up ? '#15803d' : '#b91c1c';
  const bg = up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)';
  return (
    <div style={{ padding: '6px 10px', background: bg, borderRadius: 6, border: `1px solid ${fg}30` }}>
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: fg, fontFamily: 'Geist Mono, ui-monospace' }}>
        Round {round.round + 1} · {up ? '+' : ''}{window.formatMoney(round.delta)}
      </div>
    </div>
  );
}

function PortfolioDonut({ positions, cash, totalWorth, stockById }) {
  const slices = [];
  for (const p of positions) {
    if (p.value > 0) {
      slices.push({ tk: p.tk, value: p.value, color: '#1f7a4d' });
    }
  }
  if (cash > 0) slices.push({ tk: 'CASH', value: cash, color: '#cbd5e1' });

  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const cx = 32, cy = 32, r = 28, strokeW = 8;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices.map((s, idx) => {
    const frac = s.value / total;
    // Cycle colors for holdings, keep cash grey
    const color = s.tk === 'CASH' ? '#cbd5e1' :
      ['#1f7a4d', '#2a9d8f', '#d97706', '#0891b2', '#7c3aed', '#dc2626', '#0ea5e9', '#65a30d'][idx % 8];
    const arc = { ...s, color, dash: frac * C, offset };
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
          <div style={{ fontSize: 10 }}>{window.formatMoney(totalWorth)}</div>
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
    <div style={{ padding: '6px 10px', background: bg, borderRadius: 6, border: `1px solid ${fg}30` }}>
      <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: fg, fontFamily: 'Geist Mono, ui-monospace' }}>
        {pick.emoji} {pick.tk} {up ? '▲' : '▼'} {Math.abs(pick.change).toFixed(1)}%
      </div>
    </div>
  );
}

// ── Class-wide analysis panels for the teacher's end screen ─────────────────

// Horizontal bar chart of each student's % return — sorted, with the class
// average overlay. Useful for "where did most of you land?" discussion.
function ClassReturnsChart({ humans, start, inline }) {
  if (!humans || humans.length === 0) return null;
  const rows = humans
    .map(p => ({ ...p, pct: ((p.worth - start) / start) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  const avg = rows.reduce((s, r) => s + r.pct, 0) / rows.length;
  const maxAbs = Math.max(10, ...rows.map(r => Math.abs(r.pct)));

  // ── Takeaway: cluster detection (where did most of the class land?) ──
  const sortedAsc = [...rows].map(r => r.pct).sort((a, b) => a - b);
  const p25 = sortedAsc[Math.floor(sortedAsc.length * 0.25)];
  const p75 = sortedAsc[Math.floor(sortedAsc.length * 0.75)];
  const winners = rows.filter(r => r.pct > 0).length;
  const losers  = rows.filter(r => r.pct < 0).length;
  const fmt = v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
  let takeaway;
  if (rows.length === 1) {
    takeaway = `One player on the board at ${fmt(rows[0].pct)}.`;
  } else if (winners === rows.length) {
    takeaway = `Everyone finished green — the class clustered between ${fmt(sortedAsc[0])} and ${fmt(sortedAsc[sortedAsc.length-1])}.`;
  } else if (losers === rows.length) {
    takeaway = `Everyone finished red — a tough market for the whole class.`;
  } else if (Math.abs(p75 - p25) < 15) {
    takeaway = `Most of the class clustered between ${fmt(p25)} and ${fmt(p75)} — tight spread.`;
  } else {
    takeaway = `Wide spread: from ${fmt(sortedAsc[0])} at the bottom to ${fmt(sortedAsc[sortedAsc.length-1])} at the top.`;
  }

  // Bar geometry — 50% midpoint = zero
  const avgWidth = Math.abs(avg) / maxAbs * 50;
  const avgLeftPct = avg >= 0 ? 50 + avgWidth : 50 - avgWidth;

  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--line)',
      borderRadius: 12, padding: '14px 16px', marginTop: inline ? 0 : 14,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6, gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
            Class return distribution
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
            Where did everyone land?
          </div>
        </div>
        <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--muted)' }}>Avg</span>{' '}
          <span style={{ color: avg >= 0 ? '#15803d' : '#b91c1c' }}>
            {avg >= 0 ? '+' : ''}{avg.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Takeaway */}
      <div style={{
        fontSize: 12.5, color: '#475569', lineHeight: 1.5,
        background: 'rgba(15,23,42,0.03)',
        padding: '7px 10px', borderRadius: 6,
        borderLeft: '3px solid #94a3b8',
        marginBottom: 12,
      }}>
        {takeaway}
      </div>

      {/* Bars */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map((r, i) => {
          const up = r.pct >= 0;
          const width = Math.abs(r.pct) / maxAbs * 50;
          return (
            <div key={r.id} style={{
              display: 'grid',
              gridTemplateColumns: '22px 92px 1fr 56px',
              alignItems: 'center', gap: 8, fontSize: 12,
            }}>
              <Avatar name={r.name} color={r.color} avatar={r.avatar} size={20} />
              <div style={{
                fontWeight: 600, fontSize: 12.5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{r.name}</div>
              <div style={{ position: 'relative', height: 16, background: '#f1f5f9', borderRadius: 3 }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: up ? '50%' : `${50 - width}%`,
                  width: `${width}%`,
                  background: up ? '#15803d' : '#b91c1c',
                  borderRadius: 3,
                }} />
                {/* Zero line */}
                <div style={{
                  position: 'absolute', left: '50%', top: -2, bottom: -2,
                  width: 1, background: '#94a3b8',
                }} />
                {/* Average overlay line — drawn on every row so it reads as a vertical guide */}
                <div style={{
                  position: 'absolute', left: `${avgLeftPct}%`, top: -3, bottom: -3,
                  width: 0, borderLeft: '1.5px dashed ' + (avg >= 0 ? '#15803d' : '#b91c1c'),
                  opacity: 0.55,
                }} />
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 11.5,
                textAlign: 'right',
                color: up ? '#15803d' : '#b91c1c',
                background: up ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.10)',
                padding: '2px 6px', borderRadius: 4,
              }}>
                {up ? '+' : ''}{r.pct.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginTop: 10, fontSize: 10.5, color: 'var(--muted)',
        fontFamily: 'Geist Mono, ui-monospace', letterSpacing: '0.06em',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 2, background: '#94a3b8', display: 'inline-block' }} /> ZERO
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 0, borderTop: '1.5px dashed ' + (avg >= 0 ? '#15803d' : '#b91c1c'), display: 'inline-block' }} /> CLASS AVG
        </span>
      </div>
    </div>
  );
}

// Stock popularity — for each stock, how many students held it, total class
// shares, total class value. Anchors discussion: "why did so many of you back X?"
function StockPopularity({ humans, stocks }) {
  if (!humans || humans.length === 0 || !stocks || stocks.length === 0) return null;

  const rows = stocks.map(s => {
    let holders = 0;
    let totalShares = 0;
    for (const p of humans) {
      const q = p.holdings?.[s.id] || 0;
      if (q > 0) { holders++; totalShares += q; }
    }
    return {
      ...s,
      holders,
      totalShares,
      totalValue: totalShares * (s.price || 0),
      holderPct: humans.length > 0 ? (holders / humans.length) * 100 : 0,
    };
  })
  .filter(r => r.holders > 0)
  .sort((a, b) => b.holders - a.holders || b.totalValue - a.totalValue);

  if (rows.length === 0) return null;
  const maxValue = Math.max(...rows.map(r => r.totalValue), 1);
  const COLORS = window.SECTOR_COLORS || {};

  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--line)',
      borderRadius: 12, padding: '14px 16px', marginTop: 14,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'Geist Mono, ui-monospace' }}>
          Class portfolio at game end
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
          Which stocks did your class believe in?
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.map(r => {
          const col = COLORS[r.sector] || { border: '#64748b', bg: '#f1f5f9', text: '#334155' };
          const widthPct = (r.totalValue / maxValue) * 100;
          return (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 80px 100px 70px',
              alignItems: 'center', gap: 10,
              padding: '7px 10px',
              background: '#fff',
              border: '1px solid var(--line)',
              borderLeft: `4px solid ${col.border}`,
              borderRadius: 6,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${widthPct}%`,
                background: col.bg, opacity: 0.45, zIndex: 0,
              }} />
              <div style={{ fontSize: 20, lineHeight: 1, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {r.emoji}
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontFamily: 'Geist Mono, ui-monospace', fontWeight: 700, fontSize: 12, color: col.text }}>
                  {r.id}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 1 }}>
                  {r.name}
                </div>
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 11, color: '#0f172a',
                textAlign: 'right', position: 'relative', zIndex: 1,
              }}>
                <div style={{ fontWeight: 700 }}>{r.holders} held</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{r.holderPct.toFixed(0)}% of class</div>
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 12, color: '#0f172a',
                textAlign: 'right', position: 'relative', zIndex: 1,
              }}>
                <div style={{ fontWeight: 700 }}>{window.formatMoney(r.totalValue)}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{r.totalShares} shares</div>
              </div>
              <div style={{
                fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.04em', color: col.text,
                background: '#fff', border: `1px solid ${col.border}`,
                padding: '2px 6px', borderRadius: 3,
                textAlign: 'center', position: 'relative', zIndex: 1,
              }}>
                {r.sector?.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mid-game QR sharer — teacher pops this any time during lobby/events/trading
// so late arrivals or kicked-by-mistake students can scan and rejoin.
// New joiners get fresh ₹2L with a flat baseline; students whose localStorage
// retained their original id will restore their portfolio (engine handles it).
// Small QR thumbnail rendered inside the JOIN pill so the teacher knows the
// pill itself opens a scannable code. Click on the pill expands to full-screen.
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

function ShareQRModal({ round, phase, humanCount, onClose }) {
  const qrRef = React.useRef(null);
  const url = `${window.location.origin}${window.location.pathname}?role=player&room=${window.GAME_CONFIG.roomCode}`;

  React.useEffect(() => {
    if (qrRef.current && window.QRCode) {
      qrRef.current.innerHTML = '';
      new window.QRCode(qrRef.current, {
        text: url, width: 220, height: 220,
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
    : 'Late joiners get ₹2L. Re-joins restore old portfolio.';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(7, 26, 16, 0.62)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          maxWidth: 440, width: '100%',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #071a10 0%, #0f3a24 100%)',
          padding: '14px 20px',
          color: '#fff',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'Geist Mono, ui-monospace', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
          }}>
            Room {window.GAME_CONFIG.roomCode}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
            📱 Scan to join
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {subline}
          </div>
        </div>

        <div style={{ padding: '14px 20px', textAlign: 'center', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{
            background: '#fff',
            padding: 10,
            borderRadius: 10,
            border: '2px solid #e6e3dc',
            display: 'inline-block',
            marginBottom: 10,
          }}>
            <div ref={qrRef} style={{ display: 'flex' }} />
          </div>
          <div style={{
            fontSize: 13, color: '#0f172a',
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 600,
            wordBreak: 'break-all', marginBottom: 2,
          }}>
            {url.replace(/^https?:\/\//, '')}
          </div>
          <div style={{
            fontSize: 28, color: '#0f172a',
            fontFamily: 'Geist Mono, ui-monospace', fontWeight: 800,
            letterSpacing: '0.06em', marginTop: 2,
          }}>
            {window.GAME_CONFIG.roomCode}
          </div>
          <div style={{
            fontSize: 12, color: '#5b6470', lineHeight: 1.45,
            marginTop: 8, maxWidth: 320, marginInline: 'auto',
          }}>
            {blurb}
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          padding: '10px 18px 14px',
          borderTop: '1px solid #f0ede5',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 22px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#0f3a24',
              color: '#fff',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetConfirmModal({ studentCount, onCancel, onConfirm }) {
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 14,
          maxWidth: 440, width: '100%',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #071a10 0%, #0f3a24 100%)',
          padding: '14px 20px',
          color: '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>↺</div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, fontFamily: 'Geist Mono, ui-monospace' }}>
              Stock Rush Pro
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 1 }}>
              Start a new game?
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 20px 4px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: '#333' }}>
            Ends the current game and resets the leaderboard.
            {studentCount > 0 && <> <b>{studentCount} student{studentCount !== 1 ? 's' : ''}</b> go back to join screen.</>}
          </div>

          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: '#fef3c7', border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 12.5, color: '#92400e', lineHeight: 1.45,
          }}>
            ⚠️  Can&rsquo;t be undone — scores and trades wiped.
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          padding: '12px 18px 14px',
          borderTop: '1px solid #f0ede5',
          flexShrink: 0,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '11px 18px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#fff',
              color: '#333',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Keep playing
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            style={{
              padding: '11px 22px',
              borderRadius: 10,
              border: 'none',
              background: '#071a10',
              color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(7,26,16,0.32)',
            }}
          >
            ↺  Start new game
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
// Exposed globally so index.html can render it.
window.HostView = HostView;
