// LTM Live — Host View (projector screen) v3

function HostView() {
  const [state, setState] = React.useState(() => window.LTM_ENGINE.getState());
  const [timerMs, setTimerMs] = React.useState(window.LTM_ROUND_MS);
  const qrRef      = React.useRef(null);
  const qrInstance = React.useRef(null);
  const timerRef   = React.useRef(null);

  React.useEffect(() => {
    window.LTM_ENGINE.initHost();
    return window.LTM_ENGINE.subscribe(setState);
  }, []);

  // Timer tick
  React.useEffect(() => {
    clearInterval(timerRef.current);
    const active = ['r1_picking','r2_cutting','r3_cutting','r4_picking'].includes(state.phase);
    if (!active || !state.timerStart) { setTimerMs(window.LTM_ROUND_MS); return; }
    const tick = () => setTimerMs(window.LTM_ROUND_MS - (Date.now() - state.timerStart));
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current);
  }, [state.timerStart, state.phase]);

  // QR code
  React.useEffect(() => {
    if (state.phase !== 'lobby' || !qrRef.current) return;
    if (qrInstance.current) { try { qrRef.current.innerHTML = ''; } catch(e){} qrInstance.current = null; }
    const url = window.location.origin + window.location.pathname + '?room=' + window.LTM_ENGINE.getRoomCode();
    try {
      qrInstance.current = new QRCode(qrRef.current, {
        text: url, width: 164, height: 164,
        colorDark: '#000000', colorLight: '#ffffff',
      });
    } catch(e) {}
  }, [state.phase]);

  const players = Object.values(state.players || {});
  const n = players.length;
  const phase = state.phase;
  const E = window.LTM_ENGINE.actions;

  // Timer helpers
  const timerNeg   = timerMs < 0;
  const timerClass = timerMs > 30000 ? 'ok' : timerMs > 0 ? 'warn' : 'negative';
  function fmtTimer(ms) {
    const sign = ms < 0 ? '-' : '';
    const abs  = Math.abs(ms);
    const m    = Math.floor(abs / 60000);
    const s    = Math.floor(abs / 1000) % 60;
    return sign + m + ':' + String(s).padStart(2, '0');
  }

  const activePicking = ['r1_picking','r2_cutting','r3_cutting','r4_picking'].includes(phase);

  // Sidebar dot + label
  function dotClass(p) {
    if (phase === 'r1_picking') return p.r1done ? 'done' : 'pending';
    if (phase === 'r2_cutting') return p.r2done ? 'done' : 'pending';
    if (phase === 'r3_cutting') return p.r3done ? 'done' : 'pending';
    if (phase === 'r4_picking') return p.r4done ? 'done' : 'pending';
    return 'idle';
  }
  function statusLabel(p) {
    if (phase === 'r1_picking') return p.r1done ? '✓ done' : 'picking…';
    if (phase === 'r2_cutting') return p.r2done ? '✓ done' : 'cutting…';
    if (phase === 'r3_cutting') return p.r3done ? '✓ done' : 'cutting…';
    if (phase === 'r4_picking') return p.r4done ? '✓ done' : 'buying…';
    return '';
  }

  function renderSidebar() {
    return (
      <div className="host-sidebar">
        <div className="host-sidebar-title">{n} PLAYER{n !== 1 ? 'S' : ''}</div>
        {players.map(p => (
          <div key={p.id} className="prow">
            <div className={'pdot ' + dotClass(p)} />
            <div className="prow-name">{p.name}</div>
            <div className={'prow-status ' + (dotClass(p) === 'done' ? 'done' : '')}>
              {statusLabel(p)}
            </div>
          </div>
        ))}
        {n === 0 && <div className="host-empty-sidebar">Waiting for players…</div>}
      </div>
    );
  }

  function renderMain() {
    if (phase === 'lobby')      return renderLobby();
    if (phase === 'r1_picking') return renderPicking(1);
    if (phase === 'r1_reveal')  return renderReveal(1);
    if (phase === 'inflation1') return renderInflation(1);
    if (phase === 'r2_cutting') return renderCutting(2);
    if (phase === 'r2_reveal')  return renderReveal(2);
    if (phase === 'inflation2') return renderInflation(2);
    if (phase === 'r3_cutting') return renderCutting(3);
    if (phase === 'r3_reveal')  return renderReveal(3);
    if (phase === 'r4_intro')   return renderR4Intro();
    if (phase === 'r4_picking') return renderR4Picking();
    if (phase === 'ended')      return renderEnded();
    return null;
  }

  function renderLobby() {
    const url = window.location.origin + window.location.pathname + '?room=' + window.LTM_ENGINE.getRoomCode();
    return (
      <div className="host-lobby">
        <div>
          <div className="qr-box"><div id="host-qr" ref={qrRef} /></div>
          <div className="qr-label">Scan to join</div>
        </div>
        <div className="lobby-right">
          <div className="lobby-code">{window.LTM_ENGINE.getRoomCode()}</div>
          <div className="lobby-url">{url}</div>
          <div className="lobby-count">
            <strong>{n}</strong> {n === 1 ? 'player' : 'players'} joined
          </div>
          <div className="lobby-names">
            {players.map(p => <span key={p.id} className="name-chip">{p.name}</span>)}
          </div>
          <button
            className="btn-primary large"
            onClick={E.start}
            disabled={n === 0}
            style={{minWidth: 200}}
          >
            {n === 0 ? 'Waiting for players…' : 'Start Game →'}
          </button>
        </div>
      </div>
    );
  }

  function renderPicking(round) {
    const done = players.filter(p => p.r1done).length;
    const pct  = n > 0 ? (done / n) * 100 : 0;
    return (
      <div>
        <div className="host-stage-title">Round 1 — Build Your Wishlist</div>
        <div className="host-stage-sub">
          Students pick items they want to buy by 2026. Budget: {fmtL(window.LTM_BUDGET)} each.
        </div>
        <div className="done-big">
          <span className="done-num">{done}</span>
          <span className="done-den"> / {n}</span>
        </div>
        <div className="done-label">students confirmed their wishlist</div>
        <div className="pbar-track">
          <div className="pbar-fill" style={{width: pct + '%'}} />
        </div>
        <div className="stage-hint">
          Wait for everyone to confirm, then click <strong>End Round →</strong>
        </div>
      </div>
    );
  }

  function renderCutting(round) {
    const doneKey = round === 2 ? 'r2done' : 'r3done';
    const done    = players.filter(p => p[doneKey]).length;
    const pct     = n > 0 ? (done / n) * 100 : 0;
    const year    = round === 2 ? '2031' : '2036';
    return (
      <div>
        <div className="host-stage-title">Round {round} — Make Your Cuts</div>
        <div className="host-stage-sub">
          Prices are now at <strong>{year}</strong> levels (7% inflation × {round === 2 ? '5' : '10'} years).
          Students must remove items they can no longer afford.
        </div>
        <div className="done-big">
          <span className="done-num">{done}</span>
          <span className="done-den"> / {n}</span>
        </div>
        <div className="done-label">students confirmed their cuts</div>
        <div className="pbar-track">
          <div className="pbar-fill" style={{width: pct + '%'}} />
        </div>
        <div className="stage-hint">
          Students who are still over budget must remove more items.
        </div>
      </div>
    );
  }

  function renderReveal(round) {
    const picksKey = round === 1 ? 'r1picks' : round === 2 ? 'r2picks' : 'r3picks';
    const counts = {};
    window.LTM_ITEMS.forEach(it => { counts[it.id] = 0; });
    players.forEach(p => {
      (p[picksKey] || []).forEach(id => { if (counts[id] !== undefined) counts[id]++; });
    });
    const maxCount = Math.max(1, ...Object.values(counts));
    const sorted = window.LTM_ITEMS
      .filter(it => counts[it.id] > 0)
      .sort((a, b) => counts[b.id] - counts[a.id]);

    // Lesson banners per reveal round
    const lessonBanner = round === 2 ? (
      <div className="lesson-banner">
        <div className="lesson-eyebrow">💡 Lesson Moment — Round 2</div>
        <div className="lesson-title">
          "Inflation doesn't ask permission. It just makes your money worth less every single year."
        </div>
      </div>
    ) : round === 3 ? (
      <div className="lesson-banner r3">
        <div className="lesson-eyebrow">💡 Lesson Moment — Round 3</div>
        <div className="lesson-title">
          "A ₹15L salary in 2026 sounds great. But in 2036, it buys 30% less. That's 10 years of inflation eating your dreams."
        </div>
      </div>
    ) : null;

    return (
      <div>
        {lessonBanner}
        <div className="host-stage-title">Round {round} Results</div>
        <div className="host-stage-sub">
          What {n} students picked — most popular first
        </div>
        {sorted.map((it, i) => {
          const pickers = players.filter(p => (p[picksKey] || []).includes(it.id)).map(p => p.name);
          const price   = window.itemPrice(it.id, round);
          return (
            <div key={it.id} className="reveal-row">
              <div className="reveal-rank">#{i+1}</div>
              <div className="reveal-emoji">{it.emoji}</div>
              <div className="reveal-info">
                <div className="reveal-name">{it.name} <span style={{fontSize:'0.7rem',color:'var(--muted)',fontFamily:'Nunito'}}>— {fmtL(price)}</span></div>
                <div className="reveal-pickers">
                  {pickers.map(nm => <span key={nm} className="reveal-nchip">{nm}</span>)}
                </div>
              </div>
              <div className="reveal-count">{counts[it.id]}</div>
              <div className="reveal-bar-wrap">
                <div className="reveal-bar-fill" style={{width: (counts[it.id]/maxCount*100)+'%'}} />
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="stage-hint">No picks recorded yet.</div>}
      </div>
    );
  }

  function renderInflation(round) {
    const year     = round === 1 ? '2031' : '2036';
    const years    = round === 1 ? '5 years' : '10 years';
    const inf      = round === 1 ? window.LTM_INF1 : window.LTM_INF2;
    const nextRound = round + 1;
    const picksKey  = round === 1 ? 'r1picks' : 'r2picks';

    let overCount = 0;
    players.forEach(p => {
      if (window.totalCost(p[picksKey] || [], nextRound) > window.LTM_BUDGET) overCount++;
    });

    return (
      <div>
        <div className="host-stage-title">Inflation Hits — {year} Prices</div>
        <div className="host-stage-sub">
          7% annual inflation for {years}. The same ₹15L buys less now.
        </div>
        <div className="inf-year-badge">×{inf.toFixed(4)} multiplier — {year}</div>

        {window.LTM_ITEMS.map(it => {
          const oldP = window.itemPrice(it.id, round);
          const newP = window.itemPrice(it.id, nextRound);
          return (
            <div key={it.id} className="inf-row">
              <div className="inf-emoji">{it.emoji}</div>
              <div className="inf-name">{it.name}</div>
              <div className="inf-old">{fmtL(oldP)}</div>
              <div className="inf-arrow">→</div>
              <div className="inf-new">{fmtL(newP)}</div>
            </div>
          );
        })}

        <div className="over-count-box">
          <div className="over-count-num">{overCount}</div>
          <div className="over-count-label">
            {overCount === 1 ? 'student is' : 'students are'} over budget and must cut
          </div>
        </div>
      </div>
    );
  }

  // ── R4 INTRO ────────────────────────────────────────────────────────────────
  function renderR4Intro() {
    const r4meta = state.r4meta || {};
    const budgets = r4meta.r4budgets || {};
    const savings = r4meta.savings || {};
    const corpus  = r4meta.corpus  || {};
    const simulated = r4meta.simulated || [];

    const hasAnySaver = Object.values(savings).some(s => s > 0);

    return (
      <div>
        <div className="lesson-banner r4">
          <div className="lesson-eyebrow">🏆 The Big Reveal — Round 4</div>
          <div className="lesson-title">
            "The students who didn't spend everything in 2026 just got a superpower: 14% annual returns for 10 years. Same starting line — very different finish."
          </div>
        </div>

        <div className="r4-narrative-box">
          <div className="r4-narrative-title">⚡ The Investor Buyback</div>
          <div className="r4-narrative-sub">
            It's now 2036. Students who saved in 2026 invested their surplus at 14% p.a.
            That ₹4L saved became {fmtL(Math.round(4e5 * window.LTM_SAVE_FACTOR))} today.
            They can use that corpus to buy back the lifestyle inflation took from them.
          </div>
        </div>

        {simulated.length > 0 && (
          <div style={{background:'rgba(251,191,36,.08)',border:'1px solid rgba(251,191,36,.25)',borderRadius:12,padding:'10px 16px',marginBottom:16,fontSize:'0.78rem',color:'var(--amber)',fontWeight:700}}>
            ⚡ Simulated investors: since everyone spent their full budget, we're pretending {simulated.map(id => (state.players[id]||{}).name).filter(Boolean).join(' & ')} saved ₹3–4L to demonstrate the power of compounding.
          </div>
        )}

        <div className="r4i-grid">
          {players.map(p => {
            const saved  = savings[p.id]  || 0;
            const corp   = corpus[p.id]   || 0;
            const r4bud  = budgets[p.id]  || 0;
            const r1spent = window.LTM_BUDGET - saved;
            const isInvestor = corp > 0;
            return (
              <div key={p.id} className={'r4i-card' + (isInvestor ? ' investor' : ' no-invest')}>
                <div className="r4i-name">
                  {isInvestor ? '💰' : '😬'} {p.name}
                  {isInvestor && <span className="r4i-badge">INVESTOR</span>}
                </div>
                <div className="r4i-row">
                  <span className="r4i-label">2026 savings</span>
                  <span className={'r4i-val' + (saved > 0 ? ' up' : ' red')}>{fmtL(saved)}</span>
                </div>
                {isInvestor && (
                  <div className="r4i-row">
                    <span className="r4i-label">×{window.LTM_SAVE_FACTOR.toFixed(2)} in 10 yrs</span>
                    <span className="r4i-val up r4i-corpus">{fmtL(Math.round(corp))}</span>
                  </div>
                )}
                <div className="r4i-divider" />
                <div className="r4i-row">
                  <span className="r4i-label">2036 budget</span>
                  <span className={'r4i-val' + (r4bud > window.LTM_BUDGET ? ' up' : '')}>{fmtL(Math.round(r4bud))}</span>
                </div>
                {!isInvestor && (
                  <div className="r4i-none">Spent everything — no corpus</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── R4 PICKING ──────────────────────────────────────────────────────────────
  function renderR4Picking() {
    const done = players.filter(p => p.r4done).length;
    const pct  = n > 0 ? (done / n) * 100 : 0;
    const r4meta = state.r4meta || {};
    const budgets = r4meta.r4budgets || {};
    const corpus  = r4meta.corpus   || {};

    return (
      <div>
        <div className="host-stage-title">Round 4 — The Investor Buyback</div>
        <div className="host-stage-sub">
          Investors are choosing what to buy back. Non-investors get the same items they ended with.
        </div>
        <div className="done-big">
          <span className="done-num">{done}</span>
          <span className="done-den"> / {n}</span>
        </div>
        <div className="done-label">students finalised their 2036 lifestyle</div>
        <div className="pbar-track">
          <div className="pbar-fill" style={{width: pct + '%'}} />
        </div>

        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:16}}>
          {players.map(p => {
            const corp   = corpus[p.id] || 0;
            const r4bud  = budgets[p.id] || 0;
            const r4picks = p.r4picks || [];
            const isInvestor = corp > 0;
            return (
              <div key={p.id} style={{
                background: isInvestor ? 'rgba(218,165,32,.1)' : 'var(--surface)',
                border: '1.5px solid ' + (isInvestor ? 'var(--gold)' : 'rgba(255,255,255,.08)'),
                borderRadius: 12, padding: '10px 14px', minWidth: 160,
              }}>
                <div style={{fontWeight:800,fontSize:'0.88rem',marginBottom:4}}>
                  {p.name} {p.r4done ? '✓' : '…'}
                </div>
                {isInvestor && (
                  <div style={{fontSize:'0.72rem',color:'var(--gold)',fontWeight:700}}>
                    Budget: {fmtL(Math.round(r4bud))}
                  </div>
                )}
                <div style={{fontSize:'0.72rem',color:'var(--muted)',marginTop:2}}>
                  {r4picks.length} item{r4picks.length !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ENDED — Final scoreboard ─────────────────────────────────────────────────
  function renderEnded() {
    const r4meta = state.r4meta || {};
    const corpus = r4meta.corpus || {};

    return (
      <div>
        <div className="lesson-banner r4">
          <div className="lesson-eyebrow">🎯 The Final Word</div>
          <div className="lesson-title">
            "Investing isn't about being rich. It's about buying future choices. Every rupee you save today buys tomorrow's freedom."
          </div>
        </div>

        <div className="ended-title">🏁 Game Over — 2036</div>
        <div className="ended-sub">
          Here's how everyone's lifestyle turned out after 10 years and one good investment decision.
        </div>

        <div className="final-grid">
          {players.map(p => {
            const r1 = new Set(p.r1picks || []);
            const r3 = new Set(p.r3picks || []);
            const r4 = new Set(p.r4picks || []);
            const corp = corpus[p.id] || 0;
            const isSaver = corp > 0;

            // Categorise items
            const survived = window.LTM_ITEMS.filter(it => r3.has(it.id));
            const boughtBack = window.LTM_ITEMS.filter(it => r4.has(it.id) && !r3.has(it.id));
            const cutIn3 = window.LTM_ITEMS.filter(it => r1.has(it.id) && !r3.has(it.id) && !r4.has(it.id));

            // All items in final lifestyle
            const allFinal = [...survived, ...boughtBack];

            return (
              <div key={p.id} className={'final-card' + (isSaver ? ' saver' : '')}>
                <div className="final-card-head">
                  <div className="final-card-name">{isSaver ? '💰' : '😐'} {p.name}</div>
                  {isSaver && <div className="final-card-badge">INVESTOR</div>}
                </div>
                <div className="final-card-body">
                  {survived.map(it => (
                    <div key={it.id} className="final-row">
                      <div className="final-row-emoji">{it.emoji}</div>
                      <div className="final-row-name">{it.name}</div>
                      <div className="final-row-tag kept">kept</div>
                    </div>
                  ))}
                  {boughtBack.map(it => (
                    <div key={it.id} className="final-row">
                      <div className="final-row-emoji">{it.emoji}</div>
                      <div className="final-row-name">{it.name}</div>
                      <div className="final-row-tag bought">buyback</div>
                    </div>
                  ))}
                  {cutIn3.map(it => (
                    <div key={it.id} className="final-row cut">
                      <div className="final-row-emoji">{it.emoji}</div>
                      <div className="final-row-name">{it.name}</div>
                      <div className="final-row-tag cut36">lost</div>
                    </div>
                  ))}
                  {isSaver && corp > 0 && (
                    <div className="final-corpus">💰 Corpus: {fmtL(Math.round(corp))}</div>
                  )}
                  {allFinal.length === 0 && cutIn3.length === 0 && (
                    <div style={{color:'var(--muted)',fontSize:'0.75rem',textAlign:'center',padding:'8px 0'}}>
                      Picked nothing
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-secondary" onClick={E.reset}>↺ New Game</button>
      </div>
    );
  }

  // Control bar
  const NEXT_LABELS = {
    lobby:      null,
    r1_picking: 'End Picking →',
    r1_reveal:  'Show Inflation →',
    inflation1: 'Start Cuts →',
    r2_cutting: 'End Cutting →',
    r2_reveal:  'Show Inflation →',
    inflation2: 'Start Cuts →',
    r3_cutting: 'End Final Cuts →',
    r3_reveal:  'Reveal Investors →',
    r4_intro:   'Start Buyback →',
    r4_picking: 'End Buyback →',
    ended:      null,
  };
  const ctrlLabel = NEXT_LABELS[phase];

  const doneKey =
    phase === 'r1_picking' ? 'r1done' :
    phase === 'r2_cutting' ? 'r2done' :
    phase === 'r3_cutting' ? 'r3done' :
    phase === 'r4_picking' ? 'r4done' : null;
  const doneCount = doneKey ? players.filter(p => p[doneKey]).length : 0;
  const allDone   = n > 0 && doneCount === n;

  return (
    <div className="host-wrap">
      {timerNeg && activePicking && <div className="flash-overlay" />}

      <div className="host-topbar">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="host-brand">🕰 Lifestyle Time Machine <em style={{fontStyle:'normal',color:'var(--teal)'}}>Live</em></div>
          <div className="host-phase-pill">{phase.replace(/_/g,' ')}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          {activePicking && (
            <div className={'host-timer ' + timerClass}>{fmtTimer(timerMs)}</div>
          )}
          <div className="host-room-code">{window.LTM_ENGINE.getRoomCode()}</div>
          <button className="btn-secondary" onClick={E.reset} style={{fontSize:'0.72rem',padding:'6px 12px'}}>↺ Reset</button>
        </div>
      </div>

      <div className="host-body">
        {renderSidebar()}
        <div className="host-main">{renderMain()}</div>
      </div>

      {ctrlLabel && (
        <div className="host-ctrl">
          <div>
            {doneKey && (
              <span className={allDone ? 'ctrl-hint' : 'ctrl-warn'}>
                {doneCount}/{n} confirmed{!allDone ? ' — not everyone done yet' : ''}
              </span>
            )}
          </div>
          <div className="ctrl-right">
            {!allDone && doneKey && n > 0 && (
              <button className="btn-secondary" onClick={E.advance}>
                Force advance anyway
              </button>
            )}
            <button className="btn-primary" onClick={E.advance} style={{minWidth:160}}>
              {ctrlLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
