// Playable micro-versions of the four signature games — each a 10-second taste.

// 💍 Swayamvar — marry / maybe / run
function SwayamvarMini() {
  const suitors = [
    { name: 'The ULIP', pitch: '“I\'m insurance AND investment. Two for one!”', verdict: 'RUN 🏃‍♀️', why: 'Charges eat your returns. We do the maths together in class.' },
    { name: 'The Index Fund', pitch: '“I\'m boring. Steady. Very cheap to keep.”', verdict: 'MARRY 💍', why: 'Boring is beautiful in investing. You\'ll see why.' },
    { name: 'The Hot IPO Tip', pitch: '“Your cousin says I\'m going to double!”', verdict: 'MAYBE… 🤔', why: 'Depends what the DRHP says. We read one together — really.' },
  ];
  const [i, setI] = React.useState(0);
  const [picked, setPicked] = React.useState(null);
  const s = suitors[i];
  return (
    <div className="gm-col">
      <div className="gm-stage">
        <div className="gm-suitor">Suitor {i + 1} of 3 — <b>{s.name}</b></div>
        <div className="gm-pitch">{s.pitch}</div>
        {!picked ? (
          <div className="gm-row">
            {['Marry 💍', 'Maybe 🤔', 'Run 🏃‍♀️'].map(o => (
              <button key={o} className="gm-opt" onClick={() => setPicked(o)}>{o}</button>
            ))}
          </div>
        ) : (
          <div className="gm-feedback ok">
            <b>The room says: {s.verdict}</b> {s.why}
            <button className="gm-next" onClick={() => { setPicked(null); setI((i + 1) % suitors.length); }}>next suitor →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 💹 Stock Rush — 3 headlines, buy or skip
function StockRushMini() {
  const rounds = [
    { h: '📰 RBI cuts repo rate by 50 bps', move: +8 },
    { h: '📰 Global tech selloff overnight', move: -6 },
    { h: '📰 Monsoon beats forecast, rural demand up', move: +5 },
  ];
  const [r, setR] = React.useState(0);
  const [cash, setCash] = React.useState(0);
  const [last, setLast] = React.useState(null);
  const [over, setOver] = React.useState(false);
  const act = (buy) => {
    const m = rounds[r].move;
    const delta = buy ? m * 700 : 0;
    setCash(c => c + delta);
    setLast({ buy, m, delta });
    setTimeout(() => {
      setLast(null);
      if (r + 1 >= rounds.length) setOver(true);
      else setR(r + 1);
    }, 1400);
  };
  return (
    <div className="gm-col">
      <div className="gm-stage">
        {!over ? <>
          <div className="gm-ticker"><span className="gm-cash">{cash >= 0 ? '+' : ''}₹{cash.toLocaleString('en-IN')}</span> <span className="gm-round">round {r + 1}/3</span></div>
          <div className="gm-pitch">{rounds[r].h}</div>
          {!last ? (
            <div className="gm-row">
              <button className="gm-opt buy" onClick={() => act(true)}>BUY 📈</button>
              <button className="gm-opt" onClick={() => act(false)}>SKIP 😶</button>
            </div>
          ) : (
            <div className={'gm-feedback ' + (last.buy ? (last.m > 0 ? 'ok' : 'bad') : 'ok')}>
              {last.buy
                ? (last.m > 0 ? <b>Stock jumped {last.m}% — you made ₹{last.delta.toLocaleString('en-IN')}! 🎉</b> : <b>Ouch, it fell {-last.m}% — that's ₹{(-last.delta).toLocaleString('en-IN')} gone.</b>)
                : <b>You sat out. {rounds[r].move > 0 ? `It rose ${rounds[r].move}% without you 😅` : `Smart — it dropped ${-rounds[r].move}%.`}</b>}
            </div>
          )}
        </> : (
          <div className="gm-feedback ok">
            <b>You finished at {cash >= 0 ? '+' : ''}₹{cash.toLocaleString('en-IN')}.</b> The class version: 8 rounds, IPOs, dividends, a live leaderboard — and a lot of yelling.
            <button className="gm-next" onClick={() => { setR(0); setCash(0); setOver(false); }}>run it back →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ⏳ Time Machine — today vs 2036
function TimeMachineMini() {
  const [future, setFuture] = React.useState(false);
  const items = [
    { icon: '☕', name: 'Your café coffee', now: '₹350', then: '₹755' },
    { icon: '🎓', name: 'School fees / year', now: '₹1.5 L', then: '₹3.2 L' },
    { icon: '📺', name: 'The streaming stack', now: '₹649', then: '₹1,400' },
  ];
  return (
    <div className="gm-col">
      <div className="gm-stage">
        <div className="gm-tm-head">
          <span className={!future ? 'on' : ''}>Today</span>
          <button className="gm-tm-lever" onClick={() => setFuture(f => !f)}>{future ? '⏪ come back' : '⏩ travel to 2036'}</button>
          <span className={future ? 'on' : ''}>2036</span>
        </div>
        {items.map(it => (
          <div className="gm-tm-row" key={it.name}>
            <span>{it.icon} {it.name}</span>
            <b className={future ? 'gm-tm-then' : ''}>{future ? it.then : it.now}</b>
          </div>
        ))}
        <div className="gm-tm-note">{future ? 'Same life. 8% inflation. In class you walk up and give one up — with sound effects. 💀' : 'Pull the lever. See what inflation does.'}</div>
      </div>
    </div>
  );
}

// 🏆 KBC — one real question
function KBCMini() {
  const opts = [
    { t: 'Cheap — grab it before it rises!', ok: false },
    { t: 'Probably a brand-new fund (NFO)', ok: false },
    { t: 'You can\'t judge a fund by NAV alone', ok: true },
    { t: 'A typo. Funds start at ₹100', ok: false },
  ];
  const [pick, setPick] = React.useState(null);
  return (
    <div className="gm-col">
      <div className="gm-stage">
        <div className="gm-suitor">Question 1 of 16 · ₹10,00,000 on the line 💰</div>
        <div className="gm-pitch">A mutual fund's NAV is just ₹10. That means…</div>
        <div className="gm-kbc-grid">
          {opts.map((o, i) => (
            <button key={i}
              className={'gm-opt kbc' + (pick !== null ? (o.ok ? ' correct' : (pick === i ? ' wrong' : ' dim')) : '')}
              onClick={() => pick === null && setPick(i)}>
              <span className="gm-letter">{String.fromCharCode(65 + i)}</span> {o.t}
            </button>
          ))}
        </div>
        {pick !== null && (
          <div className={'gm-feedback ' + (opts[pick].ok ? 'ok' : 'bad')}>
            {opts[pick].ok ? <b>Correct! 🎉 You'd still be in the game.</b> : <b>The room gasps 😱 — it's C.</b>} 15 more questions in class. Last corporate round: 30+ women, one champion.
            <button className="gm-next" onClick={() => setPick(null)}>try again →</button>
          </div>
        )}
      </div>
    </div>
  );
}

window.GAME_MINIS = [SwayamvarMini, StockRushMini, TimeMachineMini, KBCMini];
