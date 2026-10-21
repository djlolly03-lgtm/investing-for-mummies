// ═══ GAME NIGHT — self-running spectacle of a live class round ═══
// A projector screen runs a KBC-style question; phones answer; the
// leaderboard races; confetti when the crown changes hands. No audio.

const GN_PLAYERS = [
  { name: 'Neha',   color: '#2a9d8f' },
  { name: 'Celia',  color: '#c9a84c' },
  { name: 'Amisha', color: '#e07a9a' },
  { name: 'Sakshi', color: '#7a6ee0' },
  { name: 'Ritu',   color: '#4a90d9' },
  { name: 'Mansi',  color: '#3fae6a' },
];

const GN_QUESTIONS = [
  { q: 'A SIP is best described as…', opts: ['A type of tea break', 'Auto-investing monthly', 'A stock tip', 'A bank charge'], ans: 1 },
  { q: 'Inflation quietly makes your money…', opts: ['Heavier', 'Stronger', 'Worth less', 'Tax-free'], ans: 2 },
  { q: '“Diversification” means…', opts: ['Buying only gold', 'One hot stock', 'Spreading your eggs', 'Avoiding equity'], ans: 2 },
  { q: 'The magic behind long-term investing is…', opts: ['Timing the market', 'Compounding', 'Luck', 'Insider news'], ans: 1 },
];

function GameNight() {
  const [scores, setScores] = React.useState(() => GN_PLAYERS.map((p, i) => ({ ...p, score: 800 - i * 50, delta: 0 })));
  const [qi, setQi] = React.useState(0);
  const [phase, setPhase] = React.useState('ask'); // ask → lock → reveal
  const [answered, setAnswered] = React.useState([]);
  const [confetti, setConfetti] = React.useState(0);
  const leaderRef = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    let timers = [];
    const T = (fn, ms) => timers.push(setTimeout(() => alive && fn(), ms));

    const runRound = () => {
      setPhase('ask');
      setAnswered([]);
      // phones answer at staggered times
      GN_PLAYERS.forEach((p, k) => {
        T(() => setAnswered(a => [...a, k]), 700 + Math.random() * 2600);
      });
      T(() => setPhase('lock'), 3800);
      T(() => {
        setPhase('reveal');
        setScores(prev => {
          const prevLeader = [...prev].sort((a, b) => b.score - a.score)[0].name;
          const next = prev.map(p => {
            const correct = Math.random() > 0.35;
            const gain = correct ? (100 + Math.floor(Math.random() * 4) * 50) : 0;
            return { ...p, score: p.score + gain, delta: gain };
          });
          const newLeader = [...next].sort((a, b) => b.score - a.score)[0].name;
          if (newLeader !== prevLeader) setConfetti(c => c + 1);
          return next;
        });
      }, 4400);
      T(() => {
        setQi(q => (q + 1) % GN_QUESTIONS.length);
        setScores(prev => prev.map(p => ({ ...p, delta: 0 })));
        runRound();
      }, 7200);
    };
    runRound();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);

  const q = GN_QUESTIONS[qi];
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const rowH = 44;

  return (
    <div className="gn reveal">
      <div className="gn-marquee">
        {Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ animationDelay: (i * 0.09) + 's' }} />)}
      </div>

      <div className="gn-live"><span className="gn-live-dot"></span>THIS IS WHAT CLASS SOUNDS LIKE</div>

      <div className="gn-stage">
        {/* projector screen */}
        <div className="gn-screen">
          <div className="gn-screen-head">
            <img src="assets/logo-round.png" alt="" className="gn-logo"/>
            <span>KBC — Crorepati Edition · Q{qi + 1}</span>
            <span className={'gn-timer' + (phase === 'ask' ? ' run' : '')}></span>
          </div>
          <div className="gn-q" key={qi}>{q.q}</div>
          <div className="gn-opts">
            {q.opts.map((o, k) => (
              <div key={k} className={'gn-opt' + (phase === 'reveal' && k === q.ans ? ' win' : '') + (phase === 'lock' ? ' locked' : '')}>
                <b>{String.fromCharCode(65 + k)}</b> {o}
              </div>
            ))}
          </div>
          <div className="gn-status">
            {phase === 'ask' && <span>{answered.length} of 6 locked in…</span>}
            {phase === 'lock' && <span className="gn-flash">ANSWERS LOCKED 🔒</span>}
            {phase === 'reveal' && <span className="gn-flash gold">+points flying to the leaderboard →</span>}
          </div>
        </div>

        {/* leaderboard */}
        <div className="gn-board" ref={leaderRef}>
          <div className="gn-board-title">LIVE LEADERBOARD</div>
          <div className="gn-rows" style={{ height: ranked.length * rowH }}>
            {scores.map(p => {
              const rank = ranked.findIndex(r => r.name === p.name);
              return (
                <div key={p.name} className="gn-row" style={{ transform: `translateY(${rank * rowH}px)` }}>
                  <span className="gn-rank">{rank === 0 ? '👑' : rank + 1}</span>
                  <span className="gn-dot" style={{ background: p.color }}></span>
                  <span className="gn-name">{p.name}</span>
                  <span className="gn-bar"><i style={{ width: Math.min(100, p.score / (ranked[0].score || 1) * 100) + '%', background: p.color }}></i></span>
                  <span className="gn-score">{p.score.toLocaleString('en-IN')}{p.delta > 0 && <b className="gn-plus" key={p.score}>+{p.delta}</b>}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* phones */}
      <div className="gn-phones">
        {GN_PLAYERS.map((p, k) => (
          <div key={p.name} className={'gn-phone' + (answered.includes(k) ? ' in' : '')}>
            <span className="gn-phone-name" style={{ color: p.color }}>{p.name}</span>
            <div className="gn-phone-body">
              {answered.includes(k) ? <span className="gn-check">✓</span> : <span className="gn-dots"><i/><i/><i/></span>}
            </div>
          </div>
        ))}
      </div>

      {confetti > 0 && <ConfettiBurst key={confetti} />}

      <div className="gn-caption">Live from a real batch format — <b>every class ends with a game like this.</b> 30+ women have battled one leaderboard at our corporate edition.</div>
    </div>
  );
}

function ConfettiBurst() {
  const bits = React.useMemo(() => Array.from({ length: 36 }).map(() => ({
    l: Math.random() * 100,
    d: 0.6 + Math.random() * 1.2,
    s: 6 + Math.random() * 8,
    c: ['#c9a84c', '#2a9d8f', '#e07a9a', '#f0d9a8', '#bde9e4'][Math.floor(Math.random() * 5)],
    r: Math.random() * 360,
  })), []);
  return (
    <div className="gn-confetti">
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.l + '%', width: b.s, height: b.s * 0.6, background: b.c,
          animationDuration: b.d + 's', transform: `rotate(${b.r}deg)` }} />
      ))}
    </div>
  );
}

window.GameNight = GameNight;
