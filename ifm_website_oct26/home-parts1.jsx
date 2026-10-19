const { useState, useEffect, useRef } = React;

// image slot helper (renders the web component)
function Slot({ id, shape = 'rounded', radius, placeholder, style }) {
  const src = window.IFM.photoUrl && window.IFM.photoUrl(id);
  return React.createElement('image-slot', {
    id, shape, radius, placeholder, src,
    style: { width: '100%', height: '100%', display: 'block', ...style },
  });
}

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <a className="nav-brand" href="#top">
          <img src="assets/logo-round-clear.png" alt="Investing for Mummies"/>
          <b>Investing for Mummies</b>
        </a>
        <div className="nav-links">
          <a href="#games">In-class games</a>
          <a href="#batches">Batches</a>
          <a href="#stories">Stories</a>
          <a href="#corporate">Corporate</a>
          
        </div>
        <a className="btn btn-primary" href="https://register.investingformummies.com">Join a batch <span className="arw">→</span></a>
      </div>
    </nav>
  );
}

function Hero() {
  const U = (src) => src;
  const P = new Proxy({}, { get: (_, k) => window.IFM.photoUrl(k) });
  const rootRef = React.useRef(null);

  // cursor parallax on the inline photo chips
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = rootRef.current;
    if (!root) return;
    const chips = [...root.querySelectorAll('.hx-chip')];
    let raf, tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e) => {
      const r = root.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      chips.forEach((ch, i) => {
        const d = (i % 3 + 1) * 10;
        ch.style.transform = 'translate(' + (-cx * d) + 'px,' + (-cy * d) + 'px)';
      });
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);

  const Chip = ({ fid, cls }) => (
    <span className={'hx-chip ' + (cls || '')}><img src={U(fid)} alt=""/></span>
  );

  return (
    <header className="heroX" id="top" ref={rootRef} data-screen-label="Hero">
      <div className="hx-lines">
        <div className="hx-line l1"><span>Money</span> <Chip fid={P['hero-p2']}/> <span>talk,</span></div>
        <div className="hx-line l2"><span>finally in</span> <Chip fid={P['hero-p1']} cls="tall"/> <em>your</em></div>
        <div className="hx-line l3"><em>voice.</em> <Chip fid={P['hero-p3']} cls="round"/></div>
      </div>
      <div className="hx-fan" aria-hidden="true">
        <img className="f1" src={U(P['hero-p2'])} alt=""/>
        <img className="f2" src={U(P['hero-p1'])} alt=""/>
        <img className="f3" src={U(P['hero-p3'])} alt=""/>
      </div>
      <div className="hx-sub-row">
        <p className="hx-sub">Investing for Mummies is the room I wished I’d been invited into. Where questions are welcome, jargon is translated, and the confidence you build is yours to keep.</p>
        <div className="hero-trust">
          <div className="hx-proof-line hx-proof-box"><strong>200+ women</strong> have found their footing with us.</div>
        </div>
      </div>
      <div className="wrap hx-facts-wrap">
        <div className="stats">
          <div className="stat"><div className="num">8</div><div className="lab">In-person sessions</div></div>
          <div className="stat"><div className="num">2<span className="u">hrs</span></div><div className="lab">Each, twice a week</div></div>
          <div className="stat"><div className="num">10<span className="u">–20</span></div><div className="lab">Women per batch</div></div>
          <div className="stat"><div className="num">50<span className="u">+</span></div><div className="lab">Games in class</div></div>
        </div>
        <p className="hx-recommend">Almost every woman who has given us feedback would highly recommend it.</p>
        <div className="hx-facts-cta">
          <a className="btn btn-primary btn-lg" href="https://register.investingformummies.com">Find your batch <span className="arw">→</span></a>
        </div>
      </div>
    </header>
  );
}

function Intro() {
  const [phase, setPhase] = React.useState(() =>
    sessionStorage.getItem('ifm_intro_seen') || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 0
  );
  React.useEffect(() => {
    if (phase === 'off') return;
    const words = 4; // SIP? NAV? ELSS? P/E?
    if (phase < words) {
      const t = setTimeout(() => setPhase(phase + 1), 520);
      return () => clearTimeout(t);
    }
    if (phase === words) {
      const t = setTimeout(() => setPhase(words + 1), 1250);
      return () => clearTimeout(t);
    }
    // exit
    const t = setTimeout(() => { sessionStorage.setItem('ifm_intro_seen', '1'); setPhase('off'); }, 750);
    return () => clearTimeout(t);
  }, [phase]);
  if (phase === 'off') return null;
  const words = ['SIP?', 'NAV?', 'ELSS?', 'P/E?'];
  const exiting = phase > words.length;
  const skip = () => { sessionStorage.setItem('ifm_intro_seen', '1'); setPhase('off'); };
  return (
    <div className={'intro' + (exiting ? ' exit' : '')} onClick={skip}>
      {phase < words.length
        ? <div className="intro-word struck" key={phase}>{words[phase]}</div>
        : <div className="intro-final" key="final">Enough <em>nodding along.</em></div>}
      <button className="intro-skip" onClick={skip}>skip →</button>
    </div>
  );
}
window.Intro = Intro;

function Founder() {
  return (
    <section className="section-sand" id="founder">
      <div className="wrap">
        <div className="founder">
          <div className="founder-photo reveal" data-rv="left">
            <div className="frame" data-plx="0.08"><img src="assets/site/founder-photo.jpg" alt="Hiral Goel, founder of Investing for Mummies" loading="lazy"/></div>
            <div className="sig-badge">
              <div className="n">Hiral</div>
              <small>Founder</small>
            </div>
          </div>
          <div className="reveal" data-rv="right">
            <div className="eyebrow">A note from the founder</div>
            <h2>For years, money was <em>his</em> department.</h2>
            <p>I trusted my husband completely — that was never the problem. The problem was quieter. A small, persistent discomfort about not understanding something so central to my own life.</p>
            <p className="pull">“Having lost my father early, the thought of not knowing how to manage things if I ever had to, really unsettled me.”</p>
            <p>So I started learning. And what I found surprised me: <strong>the ideas weren’t hard — only the way they were explained.</strong></p>
            <p>Investing for Mummies is the room I wished I’d been invited into. Where questions are welcome, jargon is translated, and the confidence you build is yours to keep.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScreenTour({ title, tagline, screens, num, scrim }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setI(x => (x + 1) % screens.length), 4200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={'mfx' + (scrim ? ' mfx-' + scrim : '')}>
      {screens.map((s, k) => (
        <img key={k} src={s.src} alt={s.cap} loading="lazy" className={'mfx-shot' + (k === i ? ' on' : '')}/>
      ))}
      <div className="mfx-scrim"></div>
      <div className="mfx-copy">
        <h3>{title}</h3>
        <div className="game-try">{tagline}</div>
        <p key={i} className="mfx-cap">{screens[i].cap}</p>
      </div>
      <div className="mfx-steps">
        {screens.map((s, k) => (
          <button key={k} className={'mfx-step' + (k === i ? ' on' : '')} onClick={() => setI(k)}>{s.step}</button>
        ))}
      </div>
      <span className="game-stack-num mfx-num">{num}</span>
    </div>
  );
}

const MF_SCREENS = [
  { src: 'assets/mf-lobby.png',  step: '1 · Launch',  cap: 'Name the fund. Pick the stocks. 13 investors join by QR.' },
  { src: 'assets/mf-market.png', step: '6 · Market',  cap: 'The market moves — watch AUM and NAV react live.' },
  { src: 'assets/mf-withdraw.png', step: '8 · Withdraw', cap: 'Time to cash out — who takes profit, who stays in?' },
  { src: 'assets/mf-recap.png',  step: '🏁 Recap',   cap: 'Together, you started & ran a real mutual fund.' },
];

const STOCKRUSH_SCREENS = [
  { src: 'assets/stockrush-lobby.jpg',   step: '1 · Join by QR',  cap: 'Scan, pick a screen name — a decade of India’s markets in 30 minutes.' },
  { src: 'assets/stockrush-results.jpg', step: '🏁 Final results', cap: 'Six rounds later — the leaderboard, the top trader, and where everyone landed.' },
];

const TIMEMACHINE_SCREENS = [
  { src: 'assets/site/ltm-board.jpg', step: '⏳ On the big screen', cap: 'Walk up, pick your lifestyle — and watch inflation take its bite. Sound effects included.' },
];

const SWAYAMVAR_SCREENS = [
  { src: 'assets/swayamvar-lobby.jpg',   step: '1 · Be seated', cap: 'The Swayamvar is open — scan the card to take your seat.' },
  { src: 'assets/swayamvar-suitors.jpg', step: '2 · The suitors', cap: 'Meet six suitors — each one an investment in disguise.' },
  { src: 'assets/swayamvar-voting.jpg',  step: '3 · Vote',       cap: 'Who would you marry? Everyone votes from their phone.' },
  { src: 'assets/swayamvar-finale.jpg',  step: '💍 The reveal',  cap: 'The grand finale — who did everyone choose, and what was each suitor really?' },
];

function Games() {
  const D = window.IFM;
  const stackRef = React.useRef(null);

  // lxme-style depth: as the next card slides up, the pinned card recedes
  React.useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const cards = Array.from(stack.querySelectorAll('.game-stack-card'));
    let raf;
    const tick = () => {
      for (let i = 0; i < cards.length - 1; i++) {
        const card = cards[i];
        const next = cards[i + 1];
        const stickyTop = parseFloat(card.style.top) || 96;
        const nextTop = next.getBoundingClientRect().top;
        const range = Math.max(1, window.innerHeight - stickyTop);
        const p = Math.min(1, Math.max(0, 1 - (nextTop - stickyTop) / range));
        card.style.transform = `scale(${1 - p * 0.06}) translateY(${-p * 14}px)`;
        card.style.filter = `brightness(${1 - p * 0.12})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="section-teal" id="games">
      <div className="wrap">
        <div className="shead">
          <div className="reveal">
            <div className="eyebrow on-teal">What makes us different</div>
            <h2 className="on-teal">We don’t lecture. <em>We play.</em></h2>
          </div>
          <p className="reveal">Every concept comes alive as a game you play right there in class — on your phone, or up on the big screen. This is the part everyone talks about afterwards. It’s also entirely ours.</p>
        </div>

        {/* stacked deck — each game card pins and the next slides over it */}
        <div className="game-stack" ref={stackRef}>
          {D.games.map((g, i) => {
            const Mini = window.GAME_MINIS[i];
            const num = String(i+1).padStart(2,'0') + ' / ' + String(D.games.length + 2).padStart(2,'0');

            // Swayamvar — full-bleed tour of the real game screens
            if (i === 0) return (
              <div className="game-stack-slot" key={i}>
                <div className="game-card game-stack-card game-dark mfx-card" style={{ top: 96 }}>
                  <ScreenTour title="Swayamvar" tagline="marry, maybe, or run — the investment matchmaking game" screens={SWAYAMVAR_SCREENS} num={num} scrim="maroon"/>
                </div>
              </div>
            );

            // Stock Rush — gameplay trailer
            if (i === 1) return (
              <div className="game-stack-slot" key={i}>
                <div className="game-card game-stack-card gc-mf game-dark" style={{ top: 96 }}>
                  <div className="game-head">
                    <div>
                      <h3>{g.title}</h3>
                      <div className="game-try">watch the gameplay trailer — then play it in class</div>
                    </div>
                    <span className="game-stack-num">{num}</span>
                  </div>
                  <div className="kbc-video">
                    <video src="assets/stockrush-teaser.mp4" autoPlay muted loop playsInline controls preload="auto"
                      ref={(v) => { if (v) { v.muted = true; v.setAttribute('muted',''); } }}
                      onLoadedData={(e) => e.currentTarget.play().catch(() => {})}>
                    </video>
                  </div>
                </div>
              </div>
            );

            // Lifestyle Time Machine — gameplay trailer
            if (i === 2) return (
              <div className="game-stack-slot" key={i}>
                <div className="game-card game-stack-card gc-mf game-dark" style={{ top: 96 }}>
                  <div className="game-head">
                    <div>
                      <h3>{g.title}</h3>
                      <div className="game-try">watch the gameplay trailer — then play it in class</div>
                    </div>
                    <span className="game-stack-num">{num}</span>
                  </div>
                  <div className="kbc-video">
                    <video src="assets/ltm-teaser.mp4" autoPlay muted loop playsInline controls preload="auto"
                      ref={(v) => { if (v) { v.muted = true; v.setAttribute('muted',''); } }}
                      onLoadedData={(e) => e.currentTarget.play().catch(() => {})}>
                    </video>
                  </div>
                </div>
              </div>
            );

            // KBC — just the gameplay trailer
            if (i === 3) return (
              <div className="game-stack-slot" key={i}>
                <div className="game-card game-stack-card gc-kbc game-dark" style={{ top: 96 }}>
                  <div className="game-head">
                    <div>
                      <h3>{g.title}</h3>
                      <div className="game-try">watch the gameplay trailer — then play it in class</div>
                    </div>
                    <span className="game-stack-num">{num}</span>
                  </div>
                  <div className="kbc-video">
                    <video src="assets/kbc-teaser.mp4" autoPlay muted loop playsInline controls preload="auto"
                      ref={(v) => { if (v) { v.muted = true; v.setAttribute('muted',''); } }}
                      onLoadedData={(e) => e.currentTarget.play().catch(() => {})}>
                    </video>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="game-stack-slot" key={i}>
                <div className={'game-card game-stack-card ' + g.cls} style={{ top: 96 }}>
                  <div className="game-tag-pill">{g.tag}</div>
                  <div className="game-head">
                    <span className="game-emoji-big">{g.emoji}</span>
                    <div>
                      <h3>{g.title}</h3>
                      <div className="game-try">▶ playable — try it right here</div>
                    </div>
                    <span className="game-stack-num">{num}</span>
                  </div>
                  <div className="gm">
                    <Mini/>
                    <div className="gm-shot">
                      {window.IFM.photoUrl('game-shot-' + i)
                        ? <img src={window.IFM.photoUrl('game-shot-' + i)} alt={g.title + ' — actual game'} loading="lazy"/>
                        : <Slot id={'game-shot-' + i} shape="rounded" radius="8" placeholder={g.title + ' screengrab'}/>}
                    </div>
                  </div>
                  <div className="game-foot">
                    <span>Full version in class</span>
                    <a href="https://ifm-deploy.vercel.app/" target="_blank" rel="noopener">peek at all 40+ games ↗</a>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mutual Fund Manager LIVE — real screengrabs, rides the stack */}
          <div className="game-stack-slot">
            <div className="game-card game-stack-card gc-mf game-dark mfx-card" style={{ top: 96 }}>
              <ScreenTour title="Mutual Fund Manager LIVE" tagline="the class launches & runs a real fund — together" screens={MF_SCREENS} num={String(D.games.length + 1).padStart(2,'0') + ' / ' + String(D.games.length + 2).padStart(2,'0')}/>
            </div>
          </div>

          {/* Hidden Treasures rides the same stack as the finale */}
          <div className="game-stack-slot">
            <div className="game-card game-stack-card game-feature" style={{ top: 96 }}>
              <div className="game-feature-copy">
                <div className="game-tag-pill" style={{position:'static', display:'inline-block', marginBottom:10}}>New · video game</div>
                <div className="game-head">
                  <span className="game-emoji-big">💎</span>
                  <div>
                    <h3>Hidden Treasures</h3>
                    <div className="game-try">watch the trailer → play it in class</div>
                  </div>
                  <span className="game-stack-num">{String(D.games.length + 2).padStart(2,'0')} / {String(D.games.length + 2).padStart(2,'0')}</span>
                </div>
                <p style={{color:'var(--muted)', fontSize:15, lineHeight:1.55, margin:'12px 0 0'}}>What is your daily latte actually costing your future self? Pick your guilty pleasures, and watch small habits turn into hidden fortunes.</p>
              </div>
              <div className="game-feature-video">
                <video src="https://ifm-deploy.vercel.app/wealth-conversation-videos/chapter8-hidden-treasures/chap8hero.mp4"
                  autoPlay muted loop playsInline controls preload="auto"
                  ref={(v) => { if (v) { v.muted = true; v.setAttribute('muted',''); v.load(); } }}
                  onLoadedData={(e) => e.currentTarget.play().catch(() => {})}
                  onError={(e) => { const w = e.currentTarget.parentNode; e.currentTarget.style.display = 'none'; if (!w.querySelector('.vid-fallback')) { const d = document.createElement('div'); d.className = 'vid-fallback'; d.innerHTML = '<span>💎</span><b>Trailer coming soon</b>'; w.appendChild(d); } }}>
                </video>
              </div>
            </div>
          </div>
        </div>

        <div className="game-room reveal">
          <div className="game-room-copy">
            <div style={{fontFamily:'var(--serif)', fontStyle:'italic', fontSize:'26px', color:'#fff', lineHeight:1.25}}>The room, mid-game.</div>
            <div style={{fontSize:'14.5px', color:'var(--mint-lt)', opacity:.85, marginTop:8}}>Phones out, leaderboard up, someone yelling “SELL!” — this is what class actually looks like.</div>
          </div>
          {[0,1,2].map(k => (
            <div className="game-room-shot" key={k}><Slot id={'game-room-'+k} shape="rounded" radius="12" placeholder="Mid-game photo"/></div>
          ))}
        </div>

        <div className="games-lib reveal">
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <div className="big">40+</div>
            <div style={{maxWidth:280}}>
              <div style={{fontFamily:'var(--serif)', fontSize:'23px', color:'#fff', lineHeight:1.1}}>games &amp; playable tools</div>
              <div style={{fontSize:'14.5px', color:'var(--mint-soft)', opacity:.85, marginTop:4}}>and the library keeps growing every batch.</div>
            </div>
          </div>
          <div className="lib-chips">
            {D.gameLibrary.map((c,i) => <span className="lib-chip" key={i}>{c}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowLearn() {
  const D = window.IFM;
  return (
    <section id="learn">
      <div className="wrap">
        <div className="shead">
          <div className="reveal">
            <div className="eyebrow">How it works</div>
            <h2>Sixteen hours. A small circle. <em>Safe space.</em></h2>
          </div>
          <p className="reveal">A small room, a patient pace, and a founder who answers every question — however small it feels. Eight sessions of two hours, twice a week — or an intensive 4–5 day workshop, if that fits your life better.</p>
        </div>

        <div className="how-grid" style={{marginBottom:'72px'}}>
          <div className="how-card reveal" data-rv="pop">
            <div className="n">01</div>
            <h3>You arrive as you are</h3>
            <p>No prep, no prior knowledge. Chai, a warm room, and nine other women in exactly the same boat.</p>
          </div>
          <div className="how-card reveal" data-rv="pop">
            <div className="n">02</div>
            <h3>One idea, then you play it</h3>
            <p>Each concept is taught simply — then turned into a game you play on the spot. That’s when it sticks.</p>
          </div>
          <div className="how-card reveal" data-rv="pop">
            <div className="n">03</div>
            <h3>You leave able to decide</h3>
            <p>Not an expert — confident. Reading the factsheet, running the number, leading the conversation.</p>
          </div>
        </div>

        <div className="shead" style={{marginBottom:'28px'}}>
          <div className="reveal"><h2 style={{fontSize:'clamp(30px,3.4vw,44px)'}}>What you’ll walk away with</h2></div>
          <p className="reveal">Taught with Indian examples — SIPs, ELSS, NPS, gold — the way our families actually save.</p>
        </div>
        <div className="learn-list reveal">
          {D.learn.map((t,i) => (
            <div className="learn-item" key={i}><span className="tick">✓</span><span>{t}</span></div>
          ))}
        </div>

      </div>
    </section>
  );
}

Object.assign(window, { Slot, Nav, Hero, Founder, Games, HowLearn });
