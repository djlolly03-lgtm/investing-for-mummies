// LTM Live — Player View (student phone) v5

function PlayerView() {
  const urlRoom = new URLSearchParams(window.location.search).get('room');
  const MY_ID   = window.LTM_ENGINE.getMyId();

  const [state, setState]         = React.useState(() => window.LTM_ENGINE.getState());
  const [nameInput, setNameInput] = React.useState('');
  const [nameErr, setNameErr]     = React.useState('');
  const [dgFlash, setDgFlash]     = React.useState(null); // { id, leaving }
  const dgTimer = React.useRef(null);

  React.useEffect(() => {
    window.LTM_ENGINE.loadExistingState();
    return window.LTM_ENGINE.subscribe(setState);
  }, []);

  const phase  = state.phase;
  const me     = (state.players || {})[MY_ID];
  const myName = me ? me.name : '';

  // ── DOWNGRADE FLASH ─────────────────────────────────────────────────────────
  function showDowngrade(itemId) {
    clearTimeout(dgTimer.current);
    setDgFlash({ id: itemId, leaving: false });
    dgTimer.current = setTimeout(() => {
      setDgFlash(prev => prev ? { ...prev, leaving: true } : null);
      dgTimer.current = setTimeout(() => setDgFlash(null), 280);
    }, 2800);
  }

  function renderDgFlash() {
    if (!dgFlash) return null;
    const it = window.LTM_ITEMS.find(x => x.id === dgFlash.id);
    const dg = window.LTM_DOWNGRADE ? window.LTM_DOWNGRADE[dgFlash.id] : null;
    if (!it || !dg) return null;
    return (
      <div className={'dg-flash' + (dgFlash.leaving ? ' leaving' : '')}>
        <div className="dg-was">
          <div className="dg-was-emoji">{it.emoji}</div>
          <div className="dg-was-name">{it.name}</div>
        </div>
        <div className="dg-arrow">↓</div>
        <div className="dg-now-emoji">{dg.emoji}</div>
        <div className="dg-now-name">{dg.name}</div>
        <div className="dg-tag">Inflation downgrade</div>
      </div>
    );
  }

  // ── JOIN FORM ────────────────────────────────────────────────────────────────
  function handleJoin(e) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) { setNameErr('Enter your name'); return; }
    if (name.length > 24) { setNameErr('Max 24 characters'); return; }
    window.LTM_ENGINE.actions.join(name);
  }

  if (!me) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <span className="join-logo">🕰</span>
          <div className="join-title">Lifestyle Time Machine</div>
          <div className="join-room">Room <span>{urlRoom || '—'}</span></div>
          <form onSubmit={handleJoin}>
            <label className="join-label">Your name</label>
            <input
              className="join-input"
              placeholder="e.g. Priya"
              value={nameInput}
              maxLength={24}
              autoFocus
              onChange={e => { setNameInput(e.target.value); setNameErr(''); }}
            />
            {nameErr && <div className="join-err">{nameErr}</div>}
            <button type="submit" className="btn-primary">Join Game →</button>
          </form>
        </div>
      </div>
    );
  }

  // ── WAITING FOR GAME START ───────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="lobby-wait">
        <span style={{fontSize:60}}>👋</span>
        <div className="lobby-wait-title">You're in, {myName}!</div>
        <div className="lobby-wait-sub">Waiting for your teacher to start the game…</div>
        <div className="lobby-wait-room">{window.LTM_ENGINE.getRoomCode()}</div>
        <div className="lobby-wait-name">{myName}</div>
      </div>
    );
  }

  // ── PHASE: R1 PICKING ────────────────────────────────────────────────────────
  if (phase === 'r1_picking') return renderPicker();

  // ── WAIT: R1 REVEAL ─────────────────────────────────────────────────────────
  if (phase === 'r1_reveal') {
    const count = me ? (me.r1picks || []).length : 0;
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">📋</div>
        <div className="phase-wait-title">Wishlist locked in!</div>
        <div className="phase-wait-sub">You picked {count} item{count !== 1 ? 's' : ''}. Watch the big screen.</div>
        <div className="phase-wait-badge">Round 1 Results</div>
      </div>
    );
  }

  // ── WAIT: INFLATION 1 ────────────────────────────────────────────────────────
  if (phase === 'inflation1') {
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">📈</div>
        <div className="phase-wait-title">5 years later — 2031</div>
        <div className="phase-wait-sub">7% inflation hit every year. Watch prices rise on the big screen.</div>
        <div className="phase-wait-badge">Inflation Round</div>
      </div>
    );
  }

  // ── PHASE: R2 CUTTING ────────────────────────────────────────────────────────
  if (phase === 'r2_cutting') return renderCutter(2);

  // ── WAIT: R2 REVEAL ─────────────────────────────────────────────────────────
  if (phase === 'r2_reveal') {
    const kept = me ? (me.r2picks || []).length : 0;
    const cut  = me ? ((me.r1picks || []).length - kept) : 0;
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">✂️</div>
        <div className="phase-wait-title">Cuts confirmed</div>
        <div className="phase-wait-sub">
          Kept {kept}, sacrificed {cut}. Watch the big screen.
        </div>
        <div className="phase-wait-badge">Round 2 Results</div>
      </div>
    );
  }

  // ── WAIT: INFLATION 2 ────────────────────────────────────────────────────────
  if (phase === 'inflation2') {
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">📈</div>
        <div className="phase-wait-title">10 years later — 2036</div>
        <div className="phase-wait-sub">Prices have climbed even higher. Watch the big screen.</div>
        <div className="phase-wait-badge">Inflation Round</div>
      </div>
    );
  }

  // ── PHASE: R3 CUTTING ────────────────────────────────────────────────────────
  if (phase === 'r3_cutting') return renderCutter(3);

  // ── WAIT: R3 REVEAL ─────────────────────────────────────────────────────────
  if (phase === 'r3_reveal') {
    const kept = me ? (me.r3picks || []).length : 0;
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">🏁</div>
        <div className="phase-wait-title">Final round done!</div>
        <div className="phase-wait-sub">You ended with {kept} item{kept !== 1 ? 's' : ''}. Watch the big screen.</div>
        <div className="phase-wait-badge">Final Results</div>
      </div>
    );
  }

  // ── WAIT: R4 INTRO ───────────────────────────────────────────────────────────
  if (phase === 'r4_intro') {
    const r4meta  = state.r4meta || {};
    const corpus  = (r4meta.corpus || {})[MY_ID] || 0;
    const r4bud   = (r4meta.r4budgets || {})[MY_ID] || 0;
    const isInvestor = corpus > 0;
    return (
      <div className="phase-wait">
        <div className="phase-wait-emoji">{isInvestor ? '💰' : '😬'}</div>
        <div className="phase-wait-title">{isInvestor ? 'You saved — and invested!' : 'You spent it all…'}</div>
        <div className="phase-wait-sub">
          {isInvestor
            ? `Your savings grew to ${fmtL(Math.round(corpus))} at 14% p.a. over 10 years. Your 2036 budget: ${fmtL(Math.round(r4bud))}.`
            : 'You spent everything in 2026, so no investment corpus. Your lifestyle stays as-is.'}
        </div>
        <div className="phase-wait-badge">The Investor Reveal</div>
      </div>
    );
  }

  // ── PHASE: R4 PICKING ────────────────────────────────────────────────────────
  if (phase === 'r4_picking') return renderR4Picker();

  // ── ENDED ────────────────────────────────────────────────────────────────────
  if (phase === 'ended') return renderEndScreen();

  // Fallback
  return (
    <div className="phase-wait">
      <div className="phase-wait-emoji">⏳</div>
      <div className="phase-wait-title">One moment…</div>
    </div>
  );

  // ═══════════════════════════════════════
  // R1 PICKER — build your wishlist
  // ═══════════════════════════════════════
  function renderPicker() {
    const picks    = me ? (me.r1picks || []) : [];
    const picksSet = new Set(picks);
    const spent    = window.totalCost(picks, 1);
    const budget   = window.LTM_BUDGET;
    const over     = spent > budget;
    const pct      = Math.min(100, (spent / budget) * 100);
    const done     = me && me.r1done;
    const barClass = over ? 'over' : pct > 85 ? 'warn' : 'ok';
    const underBudgetAmt = budget - spent;

    function toggle(id) {
      if (done) return;
      const adding = !picksSet.has(id);
      const next = adding ? [...picks, id] : picks.filter(x => x !== id);
      if (adding && window.LTM_SOUNDS) window.LTM_SOUNDS.buy();
      window.LTM_ENGINE.actions.pick(next);
    }

    return (
      <div className="picker-screen">
        {renderDgFlash()}
        {over && (
          <div className="ob-flash">
            <span className="ob-flash-icon">🚨</span>
            <div className="ob-flash-amt">{fmtL(spent - budget)}</div>
            <div className="ob-flash-label">over budget</div>
          </div>
        )}

        <div className="picker-header">
          <div className="picker-phase-eyebrow">Round 1 — 2026</div>
          <div className="picker-phase-title">Build your dream wishlist</div>
          <div className="bbar-track">
            <div className={'bbar-fill ' + barClass} style={{width: pct + '%'}} />
          </div>
          <div className="bbar-meta">
            <span className={'bbar-spent' + (over ? ' over' : '')}>{fmtL(spent)} spent</span>
            <span className="bbar-limit">of {fmtL(budget)}</span>
          </div>
          {!over && !done && underBudgetAmt >= 50000 && (
            <div className="save-hint">💡 You don't have to spend it all — savings could work for you later</div>
          )}
        </div>

        <div className="picker-grid">
          {window.LTM_ITEMS.map(it => {
            const sel  = picksSet.has(it.id);
            const cant = !sel && over;
            return (
              <div
                key={it.id}
                className={'icard' + (sel ? ' sel' : '') + (cant ? ' cant' : '')}
                onClick={() => !cant && toggle(it.id)}
              >
                <div className="itick">✓</div>
                <div className="iemoji">{it.emoji}</div>
                <div className="iname">{it.name}</div>
                <div className="iprice">{fmtL(it.price)}</div>
              </div>
            );
          })}
        </div>

        <div className="picker-cta">
          <div className="picker-cta-inner">
            <div className="picker-count">{picks.length} item{picks.length !== 1 ? 's' : ''} selected</div>
            {done ? (
              <div className="picker-locked">✓ Wishlist confirmed — waiting for others</div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => { if (!over && picks.length > 0) window.LTM_ENGINE.actions.confirm(picks); }}
                disabled={over || picks.length === 0}
              >
                {over ? '⚠ Over budget — remove items' : picks.length === 0 ? 'Pick something first' : 'Lock in my wishlist →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // R2/R3 CUTTER — make your cuts
  // ═══════════════════════════════════════
  function renderCutter(round) {
    const picksKey = round === 2 ? 'r2picks' : 'r3picks';
    const doneKey  = round === 2 ? 'r2done'  : 'r3done';
    const prevKey  = round === 2 ? 'r1picks' : 'r2picks';
    const picks    = me ? (me[picksKey] || []) : [];
    const picksSet = new Set(picks);
    const spent    = window.totalCost(picks, round);
    const budget   = window.LTM_BUDGET;
    const over     = spent > budget;
    const pct      = Math.min(100, (spent / budget) * 100);
    const done     = me && me[doneKey];
    const year     = round === 2 ? '2031' : '2036';
    const barClass = over ? 'over' : pct > 85 ? 'warn' : 'ok';

    const prevPicks = new Set(me ? (me[prevKey] || []) : []);
    const myItems   = window.LTM_ITEMS.filter(it => prevPicks.has(it.id));

    function toggle(id) {
      if (done) return;
      const keeping = !picksSet.has(id); // adding back = keeping; removing = cutting
      const next = !picksSet.has(id) ? [...picks, id] : picks.filter(x => x !== id);
      if (!keeping) {
        // cutting — play sound and show downgrade flash
        if (window.LTM_SOUNDS) window.LTM_SOUNDS.cut();
        showDowngrade(id);
      }
      window.LTM_ENGINE.actions.pick(next);
    }

    return (
      <div className="cutter-screen">
        {renderDgFlash()}
        {over && (
          <div className="ob-flash">
            <span className="ob-flash-icon">🚨</span>
            <div className="ob-flash-amt">{fmtL(spent - budget)}</div>
            <div className="ob-flash-label">over budget</div>
          </div>
        )}

        <div className="cutter-header">
          <div className="picker-phase-eyebrow">Round {round} — {year} prices</div>
          <div className="picker-phase-title">
            {over ? '⚠ Over budget — tap items to sacrifice' : 'Tap items to keep or sacrifice'}
          </div>
          <div className="bbar-track">
            <div className={'bbar-fill ' + barClass} style={{width: pct + '%'}} />
          </div>
          <div className="bbar-meta">
            <span className={'bbar-spent' + (over ? ' over' : '')}>{fmtL(spent)} spent</span>
            <span className="bbar-limit">of {fmtL(budget)}</span>
          </div>
          {over && (
            <div className="cutter-over-banner">
              Over by {fmtL(spent - budget)} — remove more items ↓
            </div>
          )}
        </div>

        <div className="cut-list">
          {myItems.map(it => {
            const oldPrice = window.itemPrice(it.id, round - 1);
            const newPrice = window.itemPrice(it.id, round);
            const kept     = picksSet.has(it.id);
            const dg       = window.LTM_DOWNGRADE ? window.LTM_DOWNGRADE[it.id] : null;
            return (
              <div
                key={it.id}
                className={'cut-row ' + (kept ? 'kept' : 'cut')}
                onClick={() => toggle(it.id)}
              >
                <div className="cut-row-emoji">{it.emoji}</div>
                <div className="cut-row-info">
                  <div className="cut-row-name">{it.name}</div>
                  <div className="cut-row-prices">
                    <span className="cut-row-old">{fmtL(oldPrice)}</span>
                    <span className="cut-row-arrow">→</span>
                    <span className="cut-row-new">{fmtL(newPrice)}</span>
                  </div>
                  {!kept && dg && (
                    <div className="cut-row-dg">instead: {dg.emoji} {dg.name}</div>
                  )}
                </div>
                <div className="cut-row-x">{kept ? '✕' : '↩'}</div>
              </div>
            );
          })}
          {myItems.length === 0 && (
            <div style={{color:'var(--muted)',fontSize:'0.85rem',padding:'20px 0',textAlign:'center'}}>
              Nothing to cut — your previous picks are empty.
            </div>
          )}
        </div>

        <div className="picker-cta">
          <div className="picker-cta-inner">
            <div className="picker-count">{picks.length} items kept</div>
            {done ? (
              <div className="picker-locked">✓ Cuts confirmed — waiting for others</div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => { if (!over) window.LTM_ENGINE.actions.confirm(picks); }}
                disabled={over}
              >
                {over ? '⚠ Still over budget — cut more' : 'Confirm my cuts →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // R4 PICKER — investor buyback
  // ═══════════════════════════════════════
  function renderR4Picker() {
    const r4meta  = state.r4meta || {};
    const corpus  = (r4meta.corpus || {})[MY_ID] || 0;
    const r4bud   = (r4meta.r4budgets || {})[MY_ID] || 0;
    const isInvestor = corpus > 0;

    const r4picks    = me ? (me.r4picks || []) : [];
    const r4picksSet = new Set(r4picks);
    const r3picks    = new Set(me ? (me.r3picks || []) : []);
    const done       = me && me.r4done;

    // Spend in R4: base price at round 3 for items NOT already in r3picks
    const buybackCost = r4picks
      .filter(id => !r3picks.has(id))
      .reduce((sum, id) => sum + window.itemPrice(id, 3), 0);
    const r3cost = Array.from(r3picks).reduce((sum, id) => sum + window.itemPrice(id, 3), 0);
    const totalSpent = r3cost + buybackCost;
    const over = totalSpent > r4bud;
    const pct  = Math.min(100, (totalSpent / Math.max(r4bud, 1)) * 100);
    const barClass = over ? 'over' : pct > 85 ? 'warn' : 'ok';

    if (!isInvestor) {
      // Non-investors just see their current state
      return (
        <div className="phase-wait">
          <div className="phase-wait-emoji">😬</div>
          <div className="phase-wait-title">Nothing to buy back</div>
          <div className="phase-wait-sub">
            You spent your full budget in 2026, so there was no savings to invest.
            Your lifestyle stays as it was in 2036.
          </div>
          <div className="phase-wait-badge">Round 4 — Waiting</div>
        </div>
      );
    }

    function toggleR4(id) {
      if (done || r3picks.has(id)) return; // can't toggle already-owned items
      const adding = !r4picksSet.has(id);
      const next = adding ? [...r4picks, id] : r4picks.filter(x => x !== id);
      if (adding && window.LTM_SOUNDS) window.LTM_SOUNDS.buy();
      window.LTM_ENGINE.actions.r4pick(next);
    }

    // Items already owned (from R3) + all other items to potentially buy back
    const ownedItems  = window.LTM_ITEMS.filter(it => r3picks.has(it.id));
    const buyableItems = window.LTM_ITEMS.filter(it => !r3picks.has(it.id));

    return (
      <div className="picker-screen">
        {renderDgFlash()}
        {over && (
          <div className="ob-flash">
            <span className="ob-flash-icon">🚨</span>
            <div className="ob-flash-amt">{fmtL(totalSpent - r4bud)}</div>
            <div className="ob-flash-label">over budget</div>
          </div>
        )}

        <div className="picker-header">
          <div className="picker-phase-eyebrow">Round 4 — The Investor Buyback</div>
          <div className="picker-phase-title">Your 2036 corpus: {fmtL(Math.round(corpus))}</div>
          <div className="bbar-track">
            <div className={'bbar-fill ' + barClass} style={{width: pct + '%'}} />
          </div>
          <div className="bbar-meta">
            <span className={'bbar-spent' + (over ? ' over' : '')}>{fmtL(Math.round(totalSpent))} spent</span>
            <span className="bbar-limit">of {fmtL(Math.round(r4bud))}</span>
          </div>
        </div>

        {ownedItems.length > 0 && (
          <div>
            <div className="r4-section-eyebrow owned">✅ Already Yours (kept through inflation)</div>
            <div className="picker-grid" style={{padding:'6px 12px 0'}}>
              {ownedItems.map(it => (
                <div key={it.id} className="icard r4-owned">
                  <div className="itick">✓</div>
                  <div className="iemoji">{it.emoji}</div>
                  <div className="iname">{it.name}</div>
                  <div className="iprice">{fmtL(window.itemPrice(it.id, 3))}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {buyableItems.length > 0 && (
          <div style={{marginTop: ownedItems.length > 0 ? 16 : 0}}>
            <div className="r4-section-eyebrow buy">🔁 Buy Back (inflation took these — reclaim them!)</div>
            <div className="picker-grid" style={{padding:'6px 12px 0'}}>
              {buyableItems.map(it => {
                const sel  = r4picksSet.has(it.id);
                const price = window.itemPrice(it.id, 3);
                const cant = !sel && over;
                return (
                  <div
                    key={it.id}
                    className={'icard' + (sel ? ' r4-bought' : '') + (cant ? ' cant' : '')}
                    onClick={() => !cant && toggleR4(it.id)}
                  >
                    <div className="itick">✓</div>
                    <div className="iemoji">{it.emoji}</div>
                    <div className="iname">{it.name}</div>
                    <div className="iprice">{fmtL(price)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{height: 140}} />

        <div className="picker-cta">
          <div className="picker-cta-inner">
            <div className="picker-count">
              {r4picks.filter(id => !r3picks.has(id)).length} item{r4picks.filter(id => !r3picks.has(id)).length !== 1 ? 's' : ''} bought back
            </div>
            {done ? (
              <div className="picker-locked">✓ Buyback confirmed — waiting for others</div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => { if (!over) window.LTM_ENGINE.actions.r4confirm(r4picks); }}
                disabled={over}
              >
                {over ? '⚠ Over budget — remove items' : 'Confirm my buyback →'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // END SCREEN — personal journey
  // ═══════════════════════════════════════
  function renderEndScreen() {
    if (!me) {
      return (
        <div className="phase-wait">
          <div className="phase-wait-emoji">🏁</div>
          <div className="phase-wait-title">Game over!</div>
          <div className="phase-wait-sub">Check the big screen for the class summary.</div>
        </div>
      );
    }

    const r4meta  = state.r4meta || {};
    const corpus  = (r4meta.corpus || {})[MY_ID] || 0;
    const isSaver = corpus > 0;

    const r1 = new Set(me.r1picks || []);
    const r3 = new Set(me.r3picks || []);
    const r4 = new Set(me.r4picks || r3); // non-investors: r3 is their final

    const survived   = window.LTM_ITEMS.filter(it => r3.has(it.id));
    const boughtBack = window.LTM_ITEMS.filter(it => r4.has(it.id) && !r3.has(it.id));
    const cutIn36    = window.LTM_ITEMS.filter(it => r1.has(it.id) && !r3.has(it.id) && !r4.has(it.id));

    return (
      <div className="end-screen">
        <div className="end-header">
          <span className="end-hero-emoji">{isSaver ? '💰' : '😐'}</span>
          <div className="end-title">{myName}'s 2036 Lifestyle</div>
          <div className="end-sub">
            {isSaver
              ? `You invested your savings and earned a ${fmtL(Math.round(corpus))} corpus — and used it to buy back your dreams.`
              : 'You spent everything in 2026, so inflation ate your lifestyle uncontested.'}
          </div>
        </div>

        {isSaver && corpus > 0 && (
          <div className="end-corpus-box">
            <div className="end-corpus-title">Your 2036 Investment Corpus</div>
            <div className="end-corpus-num">{fmtL(Math.round(corpus))}</div>
            <div className="end-corpus-sub">14% p.a. × 10 years = {window.LTM_SAVE_FACTOR.toFixed(2)}× growth</div>
          </div>
        )}

        {survived.length > 0 && (
          <div className="end-section">
            <div className="end-section-label survived">✅ Survived inflation — still yours in 2036</div>
            {survived.map(it => (
              <div key={it.id} className="end-item survived">
                <div className="end-item-emoji">{it.emoji}</div>
                <div className="end-item-name">{it.name}</div>
                <div className="end-item-price">{fmtL(window.itemPrice(it.id, 3))}</div>
              </div>
            ))}
          </div>
        )}

        {boughtBack.length > 0 && (
          <div className="end-section">
            <div className="end-section-label bought">🏆 Bought back with your corpus</div>
            {boughtBack.map(it => (
              <div key={it.id} className="end-item bought">
                <div className="end-item-emoji">{it.emoji}</div>
                <div className="end-item-name">{it.name}</div>
                <div className="end-item-price">{fmtL(window.itemPrice(it.id, 3))}</div>
              </div>
            ))}
          </div>
        )}

        {cutIn36.length > 0 && (
          <div className="end-section">
            <div className="end-section-label cut36">✂️ Lost to inflation — gone forever</div>
            {cutIn36.map(it => (
              <div key={it.id} className="end-item cut36">
                <div className="end-item-emoji">{it.emoji}</div>
                <div className="end-item-name">{it.name}</div>
                {(window.LTM_DOWNGRADE || {})[it.id] && (
                  <div style={{fontSize:'0.65rem',color:'var(--red)',fontWeight:700}}>
                    → {(window.LTM_DOWNGRADE[it.id]).emoji} {(window.LTM_DOWNGRADE[it.id]).name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {survived.length === 0 && boughtBack.length === 0 && cutIn36.length === 0 && (
          <div style={{textAlign:'center',color:'var(--muted)',padding:'32px 0',fontSize:'0.9rem'}}>
            No items to show.
          </div>
        )}
      </div>
    );
  }
}
