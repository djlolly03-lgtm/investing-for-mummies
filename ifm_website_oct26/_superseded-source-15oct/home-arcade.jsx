// Games section v2 — three posters to start, an index of every public game, and a mosaic of the in-room ones.
const AR_BASE = 'https://games.investingformummies.com/';

const AR_TOPICS = [
  { id: 'mf',     label: 'Mutual funds',          e: '🍕' },
  { id: 'stocks', label: 'Stocks & markets',      e: '📈' },
  { id: 'assets', label: 'Gold, property & debt', e: '🪙' },
  { id: 'life',   label: 'Everyday money',        e: '🏠' },
  { id: 'teen',   label: 'For teens',             e: '🎒' },
  { id: 'all',    label: 'All games',             e: '🎮' },
];

// Featured — the three to play first.
const AR_START = [
  { slug: '3-buckets',         t: '3 Buckets',         e: '🪣', d: 'Sort each product into Emergency, Stability or Growth.', mins: 5, tone: 'teal' },
  { slug: 'hidden-fortunes',   t: 'Hidden Fortunes',   e: '💎', d: 'What your daily latte is really costing your future.',  mins: 4, tone: 'navy' },
  { slug: 'double-or-nothing', t: 'Double or Nothing', e: '⏱️', d: 'Rule of 72, rapid fire. Five rounds, beat the clock.', mins: 3, tone: 'gold' },
];

// Everything else that works solo. Descriptions are taken from the games site.
const AR_GAMES = [
  { slug: 'lifestyle-time-machine', t: 'Lifestyle Time Machine', e: '⏳', topic: 'life',   d: "See how today's choices shape life ten years from now.", mins: 5 },
  { slug: 'nav-pizza',              t: 'NAV Pizza',              e: '🍕', topic: 'mf',     d: 'Bust the myth that a low NAV means a better fund.', mins: 6 },
  { slug: 'one-crore-ladder',       t: '₹1 Crore Ladder',        e: '🪜', topic: 'mf',     d: 'Watch ₹10K a month climb towards a crore.', mins: 4 },
  { slug: 'three-investors',        t: '3 Investors',            e: '🔮', topic: 'mf',     d: 'SIP vs lump sum vs market timing. Who wins?', mins: 5 },
  { slug: 'radhas-mission',         t: "Radha's Mission",        e: '🎯', topic: 'mf',     d: 'Eight real situations: NAV, SIP, fund names and more.', mins: 8 },
  { slug: 'my-first-trade',         t: 'My First Trade',         e: '📊', topic: 'stocks', d: 'Buy and sell stocks in a safe, simulated market.', mins: 5 },
  { slug: 'cap-climber',            t: 'Cap Climber',            e: '🏔️', topic: 'stocks', d: 'Large, mid or small cap? Ten companies, six seconds each.', mins: 2 },
  { slug: 'market-pulse',           t: 'Market Pulse',           e: '📡', topic: 'stocks', d: 'Real headlines. Can you predict why stocks moved?', mins: 5 },
  { slug: 'ipo-bonanza',            t: 'IPO Bonanza',            e: '🔔', topic: 'stocks', d: 'Read the DRHP, set your bid, decide if you would invest.', mins: 7 },
  { slug: 'market-madness-2',       t: 'Market Madness',         e: '🎢', topic: 'stocks', d: 'Six rounds, four investor styles, one market.', mins: 8 },
  { slug: 'asset-boss',             t: 'Asset Boss',             e: '🧭', topic: 'assets', d: 'Split ₹10L across six assets and find your investor DNA.', mins: 6 },
  { slug: 'wheel-of-gold',          t: 'Wheel of Gold',          e: '🪙', topic: 'assets', d: 'Spin, predict and learn what moves the price of gold.', mins: 5 },
  { slug: 'wheel-of-silver',        t: 'Wheel of Silver',        e: '🥈', topic: 'assets', d: "Silver's double life: precious metal and industrial metal.", mins: 5 },
  { slug: 'reit-or-real',           t: 'REIT or Real?',          e: '🏙️', topic: 'assets', d: 'Real estate myths, true or false. Eight rounds.', mins: 4 },
  { slug: 'debt-detective',         t: 'Debt Detective',         e: '🕵️‍♀️', topic: 'assets', d: 'Who is borrowing your money? Crack eight debt products.', mins: 5 },
  { slug: 'debt-boss',              t: 'Debt Boss',              e: '💼', topic: 'assets', d: 'Lend ₹10L across debt instruments and survive four shocks.', mins: 6 },
  { slug: 'money-map',              t: 'Money Map',              e: '🗺️', topic: 'teen',   d: 'Track your allowance. See it, own it.', mins: 3 },
  { slug: 'need-want-value',        t: 'Need / Want / Value',    e: '🛡️', topic: 'teen',   d: 'Sort real spending into three buckets, then argue about it.', mins: 4 },
  { slug: 'swipe-right-sip',        t: 'Swipe Right on SIP',     e: '💚', topic: 'teen',   d: 'Your feed is full of fund advice. Swipe the keepers.', mins: 4 },
];

const AR_ROOM = [
  { t: 'Swayamvar',                img: 'assets/swayamvar-voting.jpg',  d: 'Marry, maybe or run. The room votes on every suitor.' },
  { t: 'Stock Rush',               img: 'assets/stockrush-results.jpg', d: 'Eight rounds of real headlines, one live leaderboard.' },
  { t: 'The IFM Crorepati',        img: 'assets/kbc-live-question.png', d: 'Sixteen questions, phones as buzzers, one champion.' },
  { t: 'Mutual Fund Manager LIVE', img: 'assets/mf-market.png',         d: 'The class launches and runs a fund together.' },
];
const AR_ROOM_MORE = ['Stock Rush PRO', 'Swipe Right LIVE', 'Broke by Friday LIVE'];
const AR_PUBLIC = AR_START.length + AR_GAMES.length;

function ArPlayer({ game, onClose }) {
  React.useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, []);
  const url = AR_BASE + game.slug;
  return (
    <div className="ar-player" role="dialog" aria-modal="true" aria-label={game.t} onClick={onClose}>
      <div className="ar-player-box" onClick={e => e.stopPropagation()}>
        <div className="ar-player-bar">
          <span className="ar-player-t"><span aria-hidden="true">{game.e}</span> {game.t}</span>
          <a href={url} target="_blank" rel="noopener">Open full screen ↗</a>
          <button type="button" className="ar-x" onClick={onClose} aria-label="Close">×</button>
        </div>
        <iframe src={url} title={game.t} allow="fullscreen"></iframe>
      </div>
    </div>
  );
}

const AR_KEY = 'ifm_games_played';
const arLoad = () => { try { return JSON.parse(localStorage.getItem(AR_KEY)) || []; } catch (e) { return []; } };

function GamesArcade() {
  const [topic, setTopic] = React.useState('mf');
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [playing, setPlaying] = React.useState(null);
  const [played, setPlayed] = React.useState(arLoad);
  const list = topic === 'all' ? AR_GAMES : AR_GAMES.filter(g => g.topic === topic);
  const count = id => id === 'all' ? AR_GAMES.length : AR_GAMES.filter(g => g.topic === id).length;
  const label = id => (AR_TOPICS.find(x => x.id === id) || {}).label;
  const has = slug => played.includes(slug);
  const done = played.filter(s => AR_START.some(g => g.slug === s) || AR_GAMES.some(g => g.slug === s)).length;
  const pct = Math.round(done / AR_PUBLIC * 100);

  const open = (g, e) => {
    if (!has(g.slug)) {
      const next = [...played, g.slug];
      setPlayed(next);
      try { localStorage.setItem(AR_KEY, JSON.stringify(next)); } catch (err) {}
    }
    if (window.matchMedia('(max-width: 640px)').matches) return; // phones: straight to the game
    e.preventDefault();
    setPlaying(g);
  };

  return (
    <section className="ar" id="games">
      <div className="wrap">
        <header className="ar-head">
          <div className="ar-insert"><span className="ar-blink"></span>Press play</div>
          <h2>Learn it by <em>playing</em> it.</h2>
          <p>40+ games, all built in-house. {AR_PUBLIC} you can play right now, on your phone, free. The best ones need a room full of people.</p>
        </header>

        <div className="ar-label"><span>Start here · three levels</span><i></i></div>
        <div className="ar-track" aria-hidden="true">
          {AR_START.map((g, i) => (
            <div key={g.slug} className={'ar-node' + (has(g.slug) ? ' done' : '')}>
              <span>{has(g.slug) ? '✓' : i + 1}</span>
            </div>
          ))}
        </div>
        <div className="ar-posters">
          {AR_START.map((g, i) => (
            <a key={g.slug} href={AR_BASE + g.slug} target="_blank" rel="noopener" className={'ar-poster tone-' + g.tone + (has(g.slug) ? ' done' : '')} onClick={e => open(g, e)}>
              <span className="ar-poster-n">Level {i + 1}</span>
              <span className="ar-poster-e" aria-hidden="true">{g.e}</span>
              <div className="ar-poster-body">
                <h3>{g.t}</h3>
                <p>{g.d}</p>
                <div className="ar-poster-foot"><span className="ar-pill">{has(g.slug) ? 'Play again' : 'Play now'} <span aria-hidden="true">▶</span></span><span className="ar-mins">~{g.mins} min</span></div>
              </div>
            </a>
          ))}
        </div>

        <button type="button" className={'ar-more' + (moreOpen ? ' open' : '')} aria-expanded={moreOpen} onClick={() => setMoreOpen(o => !o)}>
          <span className="ar-more-e" aria-hidden="true">🎮</span>
          <span className="ar-more-t"><b>{moreOpen ? 'Hide the game shelf' : 'Browse all ' + AR_PUBLIC + ' games'}</b><small>Mutual funds · stocks · gold · everyday money · teens</small></span>
          <span className="ar-more-c" aria-hidden="true">▾</span>
        </button>
        {moreOpen && (<div className="ar-more-body">
        <div className="ar-label"><span>Choose your world</span><i></i></div>
        <div className="ar-worlds" role="tablist" aria-label="Filter games by topic">
          {AR_TOPICS.map(x => (
            <button key={x.id} type="button" role="tab" aria-selected={topic === x.id}
              className={'ar-world' + (topic === x.id ? ' on' : '')} onClick={() => setTopic(x.id)}>
              <span className="ar-world-e" aria-hidden="true">{x.e}</span>{x.label}<sup>{count(x.id)}</sup>
            </button>
          ))}
        </div>

        <div className="ar-hud">
          <div className="ar-hud-l"><b>{done}</b><span>/ {AR_PUBLIC} played, levels included</span></div>
          <div className="ar-hud-bar" role="progressbar" aria-valuenow={done} aria-valuemin="0" aria-valuemax={AR_PUBLIC} aria-label="Games played"><i style={{ width: Math.max(pct, done ? 4 : 0) + '%' }}></i></div>
          <div className="ar-hud-r">{done === 0 ? 'Tap any game to start your collection' : done >= AR_PUBLIC ? 'Every single one. Come play the live ones.' : 'Saved on this phone. Keep going.'}</div>
        </div>

        <div className="ar-shelf">
          {list.map((g, i) => (
            <a key={g.slug} href={AR_BASE + g.slug} target="_blank" rel="noopener" className={'ar-cart t-' + g.topic + (has(g.slug) ? ' done' : '')} style={{ '--i': i }} onClick={e => open(g, e)}>
              <span className="ar-cart-screen">
                <span className="ar-cart-chip">~{g.mins} min</span>
                {has(g.slug) && <span className="ar-cart-stamp">✓ Played</span>}
                <span className="ar-cart-e" aria-hidden="true">{g.e}</span>
              </span>
              <span className="ar-cart-body">
                <em>{label(g.topic)}</em>
                <b>{g.t}</b>
                <span className="ar-cart-d">{g.d}</span>
                <span className="ar-cart-play">{has(g.slug) ? 'Again' : 'Play'} <span aria-hidden="true">▶</span></span>
              </span>
            </a>
          ))}
        </div>

        </div>)}

        <div className="ar-room">
          <div className="ar-room-copy">
            <div className="ar-mp"><span className="ar-live"></span>Multiplayer · only in the room</div>
            <h3>Some games need <em>twelve people shouting.</em></h3>
            <p>Played on phones and the big screen, against each other. You won't find these online.</p>
            <ul className="ar-room-more">{AR_ROOM_MORE.map(n => <li key={n}>{n}</li>)}</ul>
            <a className="btn btn-gold" href="https://register.investingformummies.com">Join a batch <span className="arw">→</span></a>
          </div>
          <div className="ar-mosaic">
            {AR_ROOM.map((r, i) => (
              <figure key={r.t} className={'ar-tile-' + i}>
                <img src={r.img} alt={r.t + ' on the classroom screen'} loading="lazy"/>
                <span className="ar-tag"><span className="ar-live"></span>Live</span>
                <figcaption><b>{r.t}</b><span>{r.d}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>

        <a className="ar-all" href={AR_BASE} target="_blank" rel="noopener">
          <span>Every game, calculator and planner</span><b>games.investingformummies.com ↗</b>
        </a>
      </div>
      {playing && <ArPlayer game={playing} onClose={() => setPlaying(null)}/>}
    </section>
  );
}

Object.assign(window, { GamesArcade });
