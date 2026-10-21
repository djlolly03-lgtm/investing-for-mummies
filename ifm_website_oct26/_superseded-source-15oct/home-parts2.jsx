const GAL_FILE = {'1WaHQ95b4b0OUqvUStv8LxbFzd1Y3fvid':'gal-01','1e3_7h9ZiV-yj9TEEx7l_ms7m8PmATZzF':'gal-02','1_xooXBzgca-0ab3u0YDnwUL6HB5kaWJi':'gal-03','1xNAUtkPWuAgA6VLDTLGN9S1MVBsJnm66':'gal-04','1IKSiKVAyr84X6u3K3hyHS9iN4Pnia2Vk':'gal-05','16nlteZBGeDcl0oKX4-ukDecK8P3h6rTS':'gal-06','15UeP1UzVtRDN5sCL7RIkk0S3LKISSdTu':'gal-07','1ZZ0V14vZHgVh1IjcFpW2F2JTxII8du5K':'gal-08','18xZO7b8CULUt8EBW2lCAHyGtccIuGRXJ':'gal-09','177l6g5PsOHpMc7F67gf57qZ6czh9D6sw':'gal-10','1bKmybgb0uzW260qf3pCKcOZktiHvMXfV':'gal-11','1zwqvM8_rY3miD1m2NKM3aw3oOGbg1X6h':'gal-12'};
// Batches, Testimonials, Gallery, Corporate, Book, CTA, Footer

// photo wall — paths built at runtime so they load lazily as separate files
const WALL = ['assets', 'site', 'wall'].join('/') + '/';
const GAL_URL = (id) => WALL + id + '.jpg';
// similar shots share a row but sit five places apart, so no two look alike side by side
const GAL_ROW_1 = [
  { id: 'IFM-481', t: "hand up, mid-question" },
  { id: 'IFM-364', wide: true, t: "Flagship graduates" },
  { id: 'IFM-103', wide: true, t: "the cohort, to camera" },
  { id: 'IFM-526', t: "at the laptop, city behind" },
  { id: 'IFM-110', t: "heads together over a laptop" },
  { id: 'IFM-480', t: "listening under the world map" },
  { id: 'IFM-520', t: "two graduates in white" },
  { id: 'IFM-106', t: "close and warm" },
  { id: 'IFM-525', t: "over the city" },
  { id: 'IFM-080', wide: true, t: "the whole gang" },
  { id: 'IFM-482', t: "laughing over a worksheet" },
  { id: 'IFM-365', wide: true, t: "graduation day" },
  { id: 'IFM-112', t: "four in the wood-panelled room" },
  { id: 'IFM-063', t: "the workbook" },
  { id: 'IFM-384', t: "a live game, mid-answer" },
  { id: 'IFM-357', t: 'in the room', video: true },
];
const GAL_ROW_2 = [
  { id: 'IFM-316', wide: true, t: "the full corporate room" },
  { id: 'IFM-256', wide: true, t: "Goa, under the archway" },
  { id: 'IFM-090', t: "turning to the whiteboard" },
  { id: 'IFM-130', t: "teaching NAV" },
  { id: 'IFM-478', t: "smiling up from the laptop" },
  { id: 'IFM-317', t: "Hiral and the boardroom" },
  { id: 'IFM-251', wide: true, t: "Goa, the café session" },
  { id: 'IFM-091', t: "mutual funds, on the board" },
  { id: 'IFM-193', t: "fixed deposits, explained" },
  { id: 'IFM-501', wide: true, t: "the cohort on the steps" },
  { id: 'IFM-318', t: "the world-map room" },
  { id: 'IFM-253', wide: true, t: "Goa, certificates in hand" },
  { id: 'IFM-083', t: "walking through the course map" },
  { id: 'IFM-395', t: "notes in the margin" },
  { id: 'IFM-362', t: "certificate, beaming" },
  { id: 'IFM-380', t: 'in the room', video: true },
];

function GalVideo({ id }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const box = ref.current; if (!box) return;
    const v = box.querySelector('video');
    let inView = false, timer = null;
    const onEnd = () => { timer = setTimeout(() => { timer = null; if (inView) { v.currentTime = 0; v.play().catch(() => {}); } }, 6000); };
    v.addEventListener('ended', onEnd);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { inView = true; if (!v.src) v.src = WALL + id + '.mp4'; v.muted = true; if (!timer) v.play().catch(() => {}); }
      else { inView = false; v.pause(); }
    }, { rootMargin: '200px' });
    io.observe(box);
    return () => { io.disconnect(); v.removeEventListener('ended', onEnd); clearTimeout(timer); };
  }, [id]);
  return <div ref={ref} className="gal-vid-in" dangerouslySetInnerHTML={{ __html: '<video muted playsinline webkit-playsinline preload="none" aria-hidden="true"></video>' }}></div>;
}

function GalRow({ cards, dir, onOpen }) {
  return (
    <div className="marquee gal-row" data-mq={dir}>
      <div className="marquee-track">
        {[0,1,2].map(copy => (
          <span className="mq-row" key={copy}>
            {cards.map((c, i) => c.video ? (
              <figure className={'gal-card gal-vid shape' + (i % 4)} key={i}><GalVideo id={c.id}/></figure>
            ) : (
              <figure className={'gal-card ' + (c.wide ? 'shape-wide' : 'shape' + (i % 4))} key={i} onClick={() => onOpen(c)}>
                <img src={GAL_URL(c.id)} alt={c.t} loading="lazy"/>
              </figure>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

const GAL_ALL = GAL_ROW_1.concat(GAL_ROW_2).filter(c => !c.video);
function Gallery() {
  const [idx, setIdx] = React.useState(-1);
  const open = idx >= 0 ? GAL_ALL[idx] : null;
  const setOpen = (c) => setIdx(c ? GAL_ALL.findIndex(x => x.id === c.id) : -1);
  const step = (d) => setIdx(i => (i + d + GAL_ALL.length) % GAL_ALL.length);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIdx(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <section className="gal" id="gallery">
      <div className="wrap" style={{marginBottom: 40}}>
        <div className="shead" style={{marginBottom: 0}}>
          <div className="reveal">
            <div className="eyebrow on-teal">Real rooms, real women</div>
            <h2 style={{color:'#fff'}}>Scroll. <em style={{color:'var(--gold)', fontStyle:'italic'}}>Meet everyone.</em></h2>
          </div>
          <p className="reveal" style={{color:'rgba(224,243,240,.8)'}}>No stock photos. Every face here sat in one of our rooms — and left knowing more than she came with. Hover to pause, click to look closer.</p>
        </div>
      </div>
      <GalRow cards={GAL_ROW_1} dir={1} onOpen={setOpen}/>
      <GalRow cards={GAL_ROW_2} dir={-1} onOpen={setOpen}/>
      {open && (
        <div className="gal-lightbox" onClick={() => setIdx(-1)}>
          <img src={GAL_URL(open.id)} alt={open.t} onClick={(e) => e.stopPropagation()}/>
          <button type="button" className="gal-nav prev" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }}>←</button>
          <button type="button" className="gal-nav next" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }}>→</button>
          <div className="gal-count">{idx + 1} / {GAL_ALL.length}</div>
          <button type="button" className="gal-close" aria-label="Close">×</button>
        </div>
      )}
    </section>
  );
}
window.Gallery = Gallery;

function Batches() {
  const REG = 'https://register.investingformummies.com';
  const soon = [
    { code: 'Introductory', title: 'Introductory Course', who: 'Four mornings on the essentials, for women who want to test the water first.', facts: ['4 days', '2 hrs each', 'Nariman Point'] },
    { code: 'Teens & Young Adults', title: 'Teens & Young Adults', who: 'Pocket money, first salary, first SIP. The next generation gets its turn.', facts: ['Teens · 4 days', 'Young adults · 5 days', 'Nariman Point'] },
  ];
  return (
    <section className="section-sand bt-sec" id="batches">
      <div className="wrap">
        <div className="shead">
          <div className="reveal">
            <div className="eyebrow">Open batches</div>
            <h2>Pick a starting point. <em>Not a destination.</em></h2>
          </div>
          <p className="reveal">Same room, same games, same patience. Choose the course that fits where you are today.</p>
        </div>

        <div className="bt-grid">
          <article className="bt-main reveal">
            <div className="bt-main-top">
              <span className="bt-status open"><i></i>Enrolling now</span>
              <span className="bt-kicker">The flagship</span>
            </div>
            <h3>Investing for Mummies</h3>
            <p className="bt-who">For mums and working women starting from zero. Everything from your first budget to reading a fund factsheet, in eight unhurried mornings.</p>
            <dl className="bt-facts">
              <div><dt>Sessions</dt><dd>8 × 2 hrs</dd></div>
              <div><dt>Rhythm</dt><dd>Twice a week</dd></div>
              <div><dt>Batches</dt><dd>Oct &amp; Nov</dd></div>
              <div><dt>Where</dt><dd>Nariman Point</dd></div>
            </dl>
            <div className="bt-buy">
              <div className="bt-price"><b>₹19,000</b><span>Early bird till 20 Oct · ₹21,000 after · incl. GST</span></div>
              <a className="btn btn-gold btn-lg" href={REG}>Find your batch <span className="arw">→</span></a>
            </div>
          </article>

          <div className="bt-side">
            {soon.map((c) => (
              <article className="bt-soon reveal" key={c.code}>
                <span className="bt-status"><i></i>Dates soon</span>
                <h3>{c.title}</h3>
                <p>{c.who}</p>
                <ul className="bt-chips">{c.facts.map(f => <li key={f}>{f}</li>)}</ul>
                <a className="bt-link" href={REG}>Register your interest <span>→</span></a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const D = window.IFM;
  const [i, setI] = React.useState(0);
  const [vid, setVid] = React.useState(null);
  const railRef = React.useRef(null);
  const quoteRef = React.useRef(null);
  React.useEffect(() => {
    if (vid === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setVid(null);
      if (e.key === 'ArrowRight') setVid(v => (v + 1) % D.videos.length);
      if (e.key === 'ArrowLeft') setVid(v => (v - 1 + D.videos.length) % D.videos.length);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [vid]);
  const cur = vid !== null ? D.videos[vid] : null;
  const scrollRail = (dir) => { const r = railRef.current; if (r) r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <section id="stories" className="tp-sec">
      <div className="wrap">
        <div className="shead">
          <div className="reveal">
            <div className="eyebrow">Voices from our community</div>
            <h2>In their <em>own words.</em></h2>
          </div>
          <p className="reveal">Some wrote to us, some sat down on camera. All of it unscripted.</p>
        </div>

        <div className="tq-head reveal">
          <span>{D.feedback.length + D.written.length} written stories</span>
          <div className="tv-arrows">
            <button type="button" className="tst-arrow" onClick={() => { const r = quoteRef.current; if (r) r.scrollBy({ left: -r.clientWidth * 0.8, behavior: 'smooth' }); }} aria-label="Scroll quotes left">←</button>
            <button type="button" className="tst-arrow" onClick={() => { const r = quoteRef.current; if (r) r.scrollBy({ left: r.clientWidth * 0.8, behavior: 'smooth' }); }} aria-label="Scroll quotes right">→</button>
          </div>
        </div>
        <div className="fbq-row tq-rail reveal" ref={quoteRef}>
          {[...D.feedback, ...D.written].map((f, k) => (
            <figure className={'fbq' + (k === 0 ? ' lead' : '')} key={k}>
              <span className="fbq-tag">{f.tag}</span>
              <blockquote>“{f.quote}”</blockquote>
              <figcaption><b>{f.name}</b> · {f.role}</figcaption>
            </figure>
          ))}
        </div>

        <div className="tp-videos">
          <div className="tv-head reveal">
            <div className="tp-vh"><span className="tp-vh-dot"></span><b>On camera</b><span>{D.videos.length} alumnae · tap to watch</span></div>
            <div className="tv-arrows">
              <button type="button" className="tst-arrow" onClick={() => scrollRail(-1)} aria-label="Scroll videos left">←</button>
              <button type="button" className="tst-arrow" onClick={() => scrollRail(1)} aria-label="Scroll videos right">→</button>
            </div>
          </div>
          <div className="tv-rail reveal" ref={railRef}>
            {D.videos.map((v, k) => (
              <button type="button" className="tv-tile" key={v.id} onClick={() => setVid(k)} aria-label={'Play testimonial' + (v.label ? ' from ' + v.label : '')}>
                <img src={'assets/site/tv-' + v.id + '.jpg'} alt="" loading="lazy"/>
                <span className="tp-shade" aria-hidden="true"></span>
                <span className="tp-play" aria-hidden="true"><span className="tp-play-ring"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span><span className="tp-play-lab">Watch</span></span>
                {v.label && <span className="tv-name">{v.label}</span>}
              </button>
            ))}
          </div>
        </div>

      </div>
      {cur && (
        <div className="vid-modal" role="dialog" aria-modal="true" aria-label="Testimonial video" onClick={() => setVid(null)}>
          <div className="vid-box vid-box-tall" onClick={(e) => e.stopPropagation()}>
            <iframe key={cur.drive} src={'https://drive.google.com/file/d/' + cur.drive + '/preview'} title={'Testimonial ' + (cur.label || cur.id)} allow="autoplay; fullscreen" allowFullScreen></iframe>
            <div className="vid-bar"><b>{cur.label || 'In her words'}</b><span>{vid + 1} / {D.videos.length}</span></div>
          </div>
          <button type="button" className="gal-nav prev" aria-label="Previous video" onClick={(e) => { e.stopPropagation(); setVid((vid - 1 + D.videos.length) % D.videos.length); }}>←</button>
          <button type="button" className="gal-nav next" aria-label="Next video" onClick={(e) => { e.stopPropagation(); setVid((vid + 1) % D.videos.length); }}>→</button>
          <button type="button" className="gal-close" aria-label="Close">×</button>
        </div>
      )}
    </section>
  );
}

const CORP_WORK = [
  { img: 'assets/site/corp-stree-dhan.jpg',          name: 'Stree Dhan',            kind: 'Financial awareness workshop' },
  { img: 'assets/site/corp-k-phyto.jpg',             name: 'K-Phyto Extraction',    kind: 'Mutual funds and investing workshop' },
  { img: 'assets/site/corp-money-blueprint-goa.jpg', name: 'Money Blueprint, Goa',  kind: 'Introduction to investing' },
  { img: 'assets/site/corp-eo-forum.jpg',            name: 'EO Forum',              kind: 'Closed-room financial learning' },
];

function Corporate() {
  return (
    <section className="section-sand" id="corporate">
      <div className="wrap">
        <div className="cw-head">
          <div className="reveal">
            <div className="eyebrow">Corporate &amp; group workshops</div>
            <h2>Workshops for corporates, communities <em>and entrepreneurs’ forums.</em></h2>
          </div>
          <div className="reveal">
            <p>Past sessions for organisations, professional networks and curated groups, each adapted to the audience’s context and experience level. Same warmth, same games, tailored to your room.</p>
            <a className="btn btn-teal btn-lg" href="mailto:hello@investingformummies.com?subject=Workshop%20for%20our%20team">Book a session for your team <span className="arw">→</span></a>
          </div>
        </div>
        <div className="cw-grid">
          {CORP_WORK.map((c, k) => (
            <figure className="cw-card reveal" key={k} style={{ transitionDelay: (k * 80) + 'ms' }}>
              <img src={c.img} alt={c.name + ' workshop group photo'} loading="lazy"/>
              <figcaption><b>{c.name}</b><span>{c.kind}</span></figcaption>
            </figure>
          ))}
        </div>
        <p className="cw-more reveal">Also hosted by <b>Ascent Group</b>, <b>Pixel Mint Media</b> and several closed forums.</p>
      </div>
    </section>
  );
}

function Book() {
  const [email, setEmail] = React.useState('');
  const [done, setDone] = React.useState(false);
  return (
    <section id="book">
      <div className="wrap">
        <div className="book">
          <div className="book-cover-wrap reveal" data-rv="pop">
            <div className="book-cover">
              <div className="book-badge">Coming soon</div>
              <div className="spine-shine"></div>
              <div className="bk-kicker">Investing for Mummies</div>
              <div className="bk-title">The Money Conversation</div>
              <div className="bk-author">by Hiral</div>
              <img className="bk-logo" src="assets/logo-round-clear.png" alt=""/>
            </div>
          </div>

          <div className="reveal" data-rv="right">
            <div className="eyebrow">The book</div>
            <h2>180 pages, <em>same warm voice.</em></h2>
            <p>Everything Hiral teaches in the room — the analogies, the Indian examples, the judgement-free patience — is becoming a book. It’s written, and we’re publishing it this month.</p>
            <p style={{fontSize:'16px'}}>Leave your email and you’ll be the first to know the day it’s out.</p>
            {done ? (
              <div className="hand" style={{fontSize:'30px'}}>Thank you — you’re on the list! ✨</div>
            ) : (
              <form className="book-form" onSubmit={(e)=>{e.preventDefault(); if(email) setDone(true);}}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
                <button className="btn btn-primary" type="submit">Notify me <span className="arw">→</span></button>
              </form>
            )}
            <div className="book-meta">
              <div className="m"><div className="v">180</div><div className="l">Pages</div></div>
              <div className="m"><div className="v">This<br/>month</div><div className="l">Publishing</div></div>
              <div className="m"><div className="v">₹—</div><div className="l">Pre-order soon</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{paddingTop:0}}>
      <div className="wrap">
        <div className="cta-band reveal">
          <div>
            <div className="cta-logo-tile">
              <div dangerouslySetInnerHTML={{ __html: '<video src="assets/logo-gold-elegant.mp4" poster="assets/logo-round-clear.png" autoplay muted loop playsinline webkit-playsinline preload="auto" aria-label="Investing for Mummies"></video>' }}></div>
            </div>
            <h2>Start where you are. <em>We’ll meet you there.</em></h2>
          </div>
          <div>
            <p>Mums, teens, or young adults — there’s a batch for your house. Small groups, never more than twelve.</p>
            <a className="btn btn-gold btn-lg" href="https://register.investingformummies.com">See open batches <span className="arw">→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <div className="fbrand">
              <img src="assets/logo-round-clear.png" alt=""/>
              <b>Investing for Mummies</b>
            </div>
            <div className="ftag">Empowering women through financial literacy — one workshop at a time.</div>
            <div className="social">
              <a href="https://www.instagram.com/investingformummies/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <span style={{opacity:.4}}>·</span>
              <a href="https://www.linkedin.com/company/investing-for-mummies/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </div>
          </div>
          <div>
            <h4>Learn</h4>
            <ul>
              <li><a href="#games">In-class games</a></li>
              <li><a href="#learn">What you’ll learn</a></li>
              <li><a href="#batches">Batches</a></li>
              
            </ul>
          </div>
          <div>
            <h4>More</h4>
            <ul>
              <li><a href="#founder">About Hiral</a></li>
              <li><a href="#stories">Stories</a></li>
              <li><a href="#corporate">Corporate workshops</a></li>
              <li><a href="https://ifm-deploy.vercel.app/" target="_blank" rel="noopener">Play the games</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit</h4>
            <ul>
              <li style={{color:'var(--mint-soft)', opacity:.8}}>107 Mittal Chambers, 10th Floor</li>
              <li style={{color:'var(--mint-soft)', opacity:.8}}>Nariman Point, Mumbai 400 021</li>
              <li><a href="mailto:hello@investingformummies.com">hello@investingformummies.com</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© 2026 Investing for Mummies. All rights reserved.</div>
          <div>Made with care, in Mumbai.</div>
        </div>
      </div>
    </footer>
  );
}

function Faq() {
  const D = window.IFM;
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq" className="faq-sec">
      <div className="wrap faq-wrap">
        <div className="reveal">
          <div className="eyebrow">Before you book</div>
          <h2 className="faq-h">Two things women <em>ask us most.</em></h2>
        </div>
        <div className="faq-list reveal">
          {D.faq.map((f, k) => (
            <div className={'faq-item' + (open === k ? ' open' : '')} key={k}>
              <button type="button" className="faq-q" aria-expanded={open === k} onClick={() => setOpen(open === k ? -1 : k)}>
                <span>{f.q}</span><i aria-hidden="true"></i>
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Faq, Batches, Testimonials, Corporate, Book, CTA, Footer });
