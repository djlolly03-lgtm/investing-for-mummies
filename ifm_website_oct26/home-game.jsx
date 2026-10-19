// ═══ SWAYAMVAR — marry / date / 2 AM call, like the real class game ═══
function Swayamvar() {
  const SUITORS = [
    { emoji: '💵', img: 'assets/suitor-cash.png', name: 'Mr. Cash Khan', tag: 'Always Available', bio: 'Need me at 2 AM? I\'m already downstairs. No waiting, no drama — and no ambition whatsoever.',
      best: 'call', roomSays: 'Keep his number for emergencies — he\'s there at 2 AM when no one else is. But marry him and inflation slowly eats your future.' },
    { emoji: '📜', img: 'assets/suitor-debt.png', name: 'Mr. Debt Sharma', tag: 'The Green Flag', bio: 'Pays you back on schedule, every time. Steady, sensible, writes everything down. Don\'t expect fireworks.',
      best: 'date', roomSays: 'Date him seriously — he keeps your life steady while the exciting ones misbehave. Just don\'t expect him to take you places alone.' },
    { emoji: '🥇', img: 'assets/suitor-gold.png', name: 'Mr. Gold Malhotra', tag: 'Family Favourite Since 3000 BC', bio: 'Gorgeous, traditional, dramatic in a crisis. Your mother-in-law has already said yes.',
      best: 'date', roomSays: 'A lovely date — in small doses. He shines brightest when everything else is falling apart. The family insists, and the family is not entirely wrong.' },
    { emoji: '🏠', img: 'assets/suitor-realestate.png', name: 'Mr. Real Estate Singh', tag: 'Owns Property', bio: 'Solid, dependable, needs a huge dowry upfront — and is famously hard to break up with in a hurry.',
      best: 'marry', roomSays: 'Marriage material — but only when you\'re truly ready for the dowry and the commitment. Never on a first impression, never in a hurry.' },
    { emoji: '📈', img: 'assets/suitor-equity.png', name: 'Mr. Equity Mehta', tag: 'Serial Entrepreneur', bio: 'Moody on Mondays, brilliant over decades. The longer you stay, the better he treats you.',
      best: 'marry', roomSays: 'Marry him — for the long haul. He\'ll test your patience weekly and reward it richly over decades. The worst thing you can do is leave mid-argument.' },
    { emoji: '🕶️', img: 'assets/suitor-alt.png', name: 'Mr. Alt Investments Oberoi', tag: 'Influencer', bio: 'Crypto, startups, art, a friend\'s "sure thing". Dazzling stories. Occasionally disappears entirely.',
      best: 'call', roomSays: 'A 2 AM story, not a life plan. Fun to know, never with money you can\'t afford to lose — and never, ever introduce him to your retirement fund.' },
  ];
  const CHOICES = {
    marry: { emoji: '💍', label: 'Marry' },
    date:  { emoji: '☕', label: 'Date' },
    call:  { emoji: '📞', label: '2 AM call' },
  };

  const [i, setI] = React.useState(0);
  const [picks, setPicks] = React.useState([]);
  const [drag, setDrag] = React.useState(null);
  const [fly, setFly] = React.useState(null);   // 'marry' | 'date' | 'call'
  const dragRef = React.useRef(null);

  const done = i >= SUITORS.length;

  const commit = (choice) => {
    if (fly || done) return;
    setFly(choice);
    setTimeout(() => {
      setPicks(p => { const n = [...p]; n[i] = choice; return n; });
      setI(x => x + 1);
      setFly(null); setDrag(null);
    }, 380);
  };

  // drag: right = marry, left = 2 AM call, tap ☕ to date
  const onDown = (e) => {
    if (fly || done) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (d) setDrag({ x: ev.clientX - d.sx, y: ev.clientY - d.sy });
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const d = dragRef.current; dragRef.current = null;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      if (dx > 90) commit('marry');
      else if (dx < -90) commit('call');
      else setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const reset = () => { setI(0); setPicks([]); setDrag(null); setFly(null); };

  const dx = drag ? drag.x : 0;
  const rot = dx / 14;
  const stamp = dx > 40 ? 'marry' : dx < -40 ? 'call' : null;

  const counts = ['marry','date','call'].map(c => picks.filter(p => p === c).length);

  return (
    <div className="swy2">
      {/* tally strip */}
      <div className="swy2-meter">
        <div className="swy2-meter-row tally">
          {['marry','date','call'].map((c, k) => (
            <span className="swy2-tally" key={c}>
              <b>{CHOICES[c].emoji}</b> {CHOICES[c].label} <i>{counts[k]}</i>
            </span>
          ))}
        </div>
      </div>

      {!done ? (
        <>
          <div className="swy2-deck">
            {SUITORS.slice(i + 1, i + 3).map((s, k) => (
              <div className="swy2-card back" key={s.name} style={{ transform: 'translateY(' + ((k + 1) * 12) + 'px) scale(' + (1 - (k + 1) * 0.045) + ')', zIndex: 2 - k }}/>
            ))}
            <div
              className={'swy2-card' + (fly ? ' fly-' + (fly === 'call' ? 'no' : 'yes') : '')}
              key={i}
              onPointerDown={onDown}
              style={!fly ? { transform: 'translate(' + dx + 'px,' + (drag ? drag.y * 0.15 : 0) + 'px) rotate(' + rot + 'deg)', transition: drag ? 'none' : 'transform .3s cubic-bezier(.2,.9,.3,1.2)' } : undefined}
            >
              <div className={'swy2-stamp st-yes' + (stamp === 'marry' ? ' show' : '')}>💍 MARRY</div>
              <div className={'swy2-stamp st-no' + (stamp === 'call' ? ' show' : '')}>📞 2 AM</div>
              <div className="swy2-photo">
                <img src={SUITORS[i].img} alt={SUITORS[i].name} draggable="false"/>
                <span className="swy2-photo-badge">{SUITORS[i].emoji}</span>
              </div>
              <div className="swy2-name">{SUITORS[i].name}</div>
              <div className="swy2-tag">“{SUITORS[i].tag}”</div>
              <div className="swy2-bio">{SUITORS[i].bio}</div>
            </div>
          </div>
          <div className="swy2-controls three">
            <button className="swy2-btn no" onClick={() => commit('call')} title="Keep for emergencies">📞<small>2 AM</small></button>
            <button className="swy2-btn mid" onClick={() => commit('date')} title="See him sometimes">☕<small>Date</small></button>
            <button className="swy2-btn yes" onClick={() => commit('marry')} title="Long haul">💍<small>Marry</small></button>
          </div>
          <div className="swy2-hintline center">drag right to marry · left for 2 AM · tap ☕ to date</div>
          <div className="swy2-progress">
            {SUITORS.map((_, k) => <span key={k} className={k < i ? 'p-yes' : k === i ? 'p-cur' : ''}/>)}
          </div>
        </>
      ) : (
        (() => {
          const score = SUITORS.filter((s, k) => picks[k] === s.best).length;
          const title = score === 6 ? 'Perfect match-maker.' : score >= 4 ? 'You read the room.' : score >= 2 ? 'A few surprises.' : 'Plot twist.';
          return (
            <div className="swr">
              <div className="swr-top">
                <div className="swr-ring" style={{ '--pct': (score / 6 * 100) + '%' }}>
                  <div><b>{score}</b><span>/ 6</span></div>
                </div>
                <div className="swr-head">
                  <div className="swr-kick">Your swayamvar</div>
                  <h3>{title}</h3>
                  <p>{score} of 6 matched how the room sees them.</p>
                </div>
              </div>
              <div className="swr-grid">
                {SUITORS.map((s, k) => {
                  const ok = picks[k] === s.best;
                  return (
                    <div className={'swr-card' + (ok ? ' ok' : ' miss')} key={k}>
                      <div className="swr-card-pic">
                        <img src={s.img} alt={s.name}/>
                        <span className="swr-flag">{ok ? '✓ Match' : '✗ Miss'}</span>
                      </div>
                      <b className="swr-card-name">{s.name.replace(/^Mr\.\s*/, '')}</b>
                      <div className="swr-picks">
                        <div><small>You</small><span>{CHOICES[picks[k]].emoji}</span><em>{picks[k] === 'call' ? '2 AM' : CHOICES[picks[k]].label}</em></div>
                        <div className={ok ? 'same' : ''}><small>Room</small><span>{CHOICES[s.best].emoji}</span><em>{s.best === 'call' ? '2 AM' : CHOICES[s.best].label}</em></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="swr-foot">
                <p>No wrong hearts, only wrong roles.</p>
                <div className="swr-btns">
                  <button className="btn swr-again" onClick={reset}>Play again ↺</button>
                  <a className="btn swr-join" href="https://register.investingformummies.com">Play it live in class →</a>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

// ═══ PLAYGROUND section wrapper ═══
function Playground() {
  return (
    <section className="cr" id="play" data-screen-label="Swayamvar game">
      <div className="wrap">
        <div className="shead" style={{marginBottom: 36}}>
          <div className="reveal">
            <div className="eyebrow on-teal">Play one, right now</div>
            <h2>Marry? Date? <em>Or just a 2 AM call?</em></h2>
          </div>
          <p className="reveal">A taste of Swayamvar — the matchmaking game we play in class. Six suitors, each an investment in disguise. Decide what role each one deserves in your life. Then see how the room votes.</p>
        </div>
        <div className="reveal"><Swayamvar/></div>
      </div>
    </section>
  );
}
window.Playground = Playground;
window.Swayamvar = Swayamvar;
