function Marquee({ items, dir = 1, className = '' }) {
  const seps = ['✦', '₹', '✨'];
  const renderRow = (key) => (
    <span className="mq-row" key={key}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <span className={'mq-i ' + (i % 2 ? 'mq-caps' : 'mq-serif') + ' c' + (i % 3)}>{it}</span>
          <span className="mq-sep">{seps[i % seps.length]}</span>
        </React.Fragment>
      ))}
    </span>
  );
  return (
    <div className={'marquee ' + className} data-mq={dir}>
      <div className="marquee-track">{[0,1,2].map(renderRow)}</div>
    </div>
  );
}
window.Marquee = Marquee;

const APP_TWEAKS = /*EDITMODE-BEGIN*/{
  "gamesSection": "shelf"
}/*EDITMODE-END*/;

function App() {
  const [tw, setTweak] = useTweaks(APP_TWEAKS);
  React.useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1) staggered directional reveals
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        // stagger siblings that reveal together
        const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains('reveal')) : [el];
        const idx = Math.max(0, sibs.indexOf(el));
        el.style.transitionDelay = (reduce ? 0 : Math.min(idx * 90, 360)) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    if (reduce) return () => io.disconnect();

    // 2) parallax + scroll-linked marquees, one rAF loop
    const plx = [...document.querySelectorAll('[data-plx]')];
    const mqs = [...document.querySelectorAll('[data-mq] .marquee-track')].map(track => {
      const holder = track.parentElement;
      const state = { track, holder, dir: parseFloat(holder.dataset.mq || '1'), x: 0, paused: false };
      holder.addEventListener('mouseenter', () => { state.paused = true; });
      holder.addEventListener('mouseleave', () => { state.paused = false; });
      // swipe / drag to move faster; a quick flick keeps gliding
      state.v = 0; state.drag = null;
      holder.addEventListener('pointerdown', e => { state.drag = { x: e.clientX, y: e.clientY, last: e.clientX, moved: 0, axis: null }; state.v = 0; });
      holder.addEventListener('pointermove', e => {
        const d = state.drag; if (!d) return;
        if (!d.axis) { const ax = Math.abs(e.clientX - d.x), ay = Math.abs(e.clientY - d.y); if (ax < 6 && ay < 6) return; d.axis = ax > ay ? 'x' : 'y'; }
        if (d.axis !== 'x') return;
        const dx = e.clientX - d.last; d.last = e.clientX; d.moved += Math.abs(dx);
        state.x += dx; state.v = dx;
      });
      const end = () => { if (state.drag && state.drag.moved > 8) { holder.dataset.dragged = '1'; setTimeout(() => { delete holder.dataset.dragged; }, 60); } state.drag = null; };
      holder.addEventListener('pointerup', end); holder.addEventListener('pointercancel', end); holder.addEventListener('pointerleave', end);
      holder.addEventListener('click', e => { if (holder.dataset.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
      return state;
    });
    let raf, lastY = window.scrollY;
    const loop = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      const vh = window.innerHeight;
      plx.forEach(el => {
        const sp = parseFloat(el.dataset.plx || '0.15');
        const r = el.getBoundingClientRect();
        const delta = (r.top + r.height / 2 - vh / 2) * sp;
        el.style.transform = 'translate3d(0,' + (-delta).toFixed(1) + 'px,0)';
      });
      mqs.forEach(s => {
        if (!s.drag) {
          if (!s.paused) s.x += (0.324 + dy * 0.153) * s.dir;
          if (Math.abs(s.v) > 0.1) { s.x += s.v; s.v *= 0.94; }
        }
        const w = s.track.scrollWidth / 3;
        if (!w) return;
        let x = s.x % w;
        if (x > 0) x -= w;
        s.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      });
      lastY = y;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <Nav/>
      <Hero/>
      <ScrollStory/>
      <Marquee items={['no jargon, ever','LEARN BY PLAYING 🎲','small batches, big laughs','CHAI INCLUDED ☕','ask anything','INDIAN EXAMPLES 🇮🇳']} dir={1} className="mq-cream"/>
      <Founder/>
      {tw.gamesSection === 'shelf' ? <GamesArcade/> : <Games/>}
      <HowLearn/>
      <Batches/>
      <Testimonials/>
      <Gallery/>
      <Corporate/>
      <Faq/>
      <CTA/>
      <Footer/>
      <TweaksPanel>
        <TweakSection label="Games section">
          <TweakRadio label="Version" value={tw.gamesSection} options={[{value:'shelf',label:'New shelf'},{value:'deck',label:'Original deck'}]} onChange={v => setTweak('gamesSection', v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
