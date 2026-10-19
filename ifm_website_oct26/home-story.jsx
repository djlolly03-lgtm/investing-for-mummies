// Scroll-driven showstopper: ₹10,000/month → ₹1.9 Cr as you scroll.
const STORY_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "storyMonthly": 10000,
  "storyRate": 12,
  "storyYears": 25,
  "storyTickEvery": 5,
  "storyEnergy": true
}/*EDITMODE-END*/;

function ScrollStory() {
  const wrapRef = React.useRef(null);
  const [state, setState] = React.useState({ p: 0, years: 0, value: 0, invested: 0, pin: 'top', vh: 0 });
  const [t, setTweak] = useTweaks(STORY_TWEAK_DEFAULTS);

  const MONTHLY = t.storyMonthly, RATE = t.storyRate / 100, YEARS = t.storyYears;
  const fv = (months) => {
    const r = RATE / 12;
    return months > 0 ? MONTHLY * ((Math.pow(1 + r, months) - 1) / r) * (1 + r) : 0;
  };
  const MAXV = fv(YEARS * 12);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let raf;
    const tick = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const p = Math.min(1, Math.max(0, -rect.top / (total * 0.78)));
      const years = p * YEARS;
      const months = Math.round(years * 12);
      // pin with JS instead of CSS sticky — iPhone Safari drops sticky in some layouts
      const pin = rect.top > 0 ? 'top' : rect.bottom < vh ? 'bottom' : 'fixed';
      setState(prev => (prev.p === p && prev.pin === pin && prev.vh === vh) ? prev : { p, years, value: fv(months), invested: MONTHLY * months, pin, vh });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [MONTHLY, RATE, YEARS]);

  const inr = (n) => {
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  };

  const milestones = [
    { at: 0.00, txt: 'Say you put away ' + inr(MONTHLY) + ' a month.' },
    { at: 0.22, txt: 'Year ' + Math.round(YEARS * 0.2) + '. It feels slow. Most people quit here.' },
    { at: 0.45, txt: 'Year ' + Math.round(YEARS * 0.44) + '. It now earns more than you put in.' },
    { at: 0.68, txt: 'Year ' + Math.round(YEARS * 0.68) + '. It grows in a month what once took a year.' },
    { at: 0.88, txt: 'Year ' + YEARS + '. You put in ' + inr(MONTHLY * YEARS * 12) + '. Look at the number.' },
  ];
  const current = milestones.reduce((acc, m) => (state.p >= m.at ? m : acc), milestones[0]);

  // ── chart geometry ──
  const W = 1000, H = 460, PADB = 4;
  const xOf = (t) => t * W;
  const yOf = (v) => (H - PADB) - (v / MAXV) * (H - PADB - 20);
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    pts.push([xOf(t), yOf(fv(t * YEARS * 12))]);
  }
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L ${W} ${H - PADB} L 0 ${H - PADB} Z`;
  const investedY0 = yOf(0), investedY1 = yOf(MONTHLY * YEARS * 12);
  // moving tip
  const tipX = xOf(state.p), tipY = yOf(state.value);
  const clipW = Math.max(0, state.p * W);
  const done = state.p > 0.985;

  return (
    <div className="story" ref={wrapRef} id="story">
      <div className={"story-stick pin-" + state.pin} style={state.vh ? { height: state.vh + "px" } : undefined}>
        <svg className="story-curve" viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none">
          <defs>
            <linearGradient id="storyArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9a84c" stopOpacity="0.55"/>
              <stop offset="0.6" stopColor="#2a9d8f" stopOpacity="0.18"/>
              <stop offset="1" stopColor="#2a9d8f" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="storyStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2a9d8f"/>
              <stop offset="0.55" stopColor="#c9a84c"/>
              <stop offset="1" stopColor="#f0d9a8"/>
            </linearGradient>
            <filter id="storyGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="storyClip"><rect x="0" y="0" width={clipW} height={H}/></clipPath>
          </defs>
          {/* grid + year ticks (including final year) */}
          {Array.from({length: Math.ceil(YEARS / t.storyTickEvery)}, (_, k) => (k + 1) * t.storyTickEvery).filter(y => y < YEARS).concat([YEARS]).map(y => (
            <g key={y}>
              <line x1={xOf(y/YEARS)} x2={xOf(y/YEARS)} y1={20} y2={H-PADB} stroke="rgba(224,243,240,.08)" strokeWidth="1"/>
              
            </g>
          ))}
          <line x1="0" x2={W} y1={H-PADB} y2={H-PADB} stroke="rgba(224,243,240,.18)" strokeWidth="1"/>
          <g clipPath="url(#storyClip)">
            {/* growth = gap between what it becomes and what you put in */}
            <path d={line + ` L ${W} ${investedY1} L 0 ${investedY0} Z`} fill="url(#storyArea)"/>
            {/* what you put in — solid, filled to the axis */}
            <path d={`M 0 ${investedY0} L ${W} ${investedY1} L ${W} ${H - PADB} L 0 ${H - PADB} Z`} fill="rgba(159,179,200,.28)"/>
            <line x1="0" y1={investedY0} x2={W} y2={investedY1} stroke="#c3d3e2" strokeWidth="3.5" strokeLinecap="round"/>
            <path d={line} fill="none" stroke={t.storyEnergy ? 'url(#storyStroke)' : '#c9a84c'} strokeWidth={t.storyEnergy ? 6 : 5} strokeLinecap="round" filter={t.storyEnergy ? 'url(#storyGlow)' : undefined}/>
          </g>
          {/* invested tip label */}
          {state.p > 0.08 && <circle cx={tipX} cy={investedY0 + (investedY1-investedY0)*state.p} r="4.5" fill="rgba(224,243,240,.7)"/>}
        </svg>

        {/* comet head — IFM round logo (HTML overlay so it stays round) */}
        <div className="story-comet-layer story-axis" aria-hidden="true">
          {state.p >= 0.03 && <span className="story-axis-lab">Years</span>}
          {Array.from({length: Math.ceil(YEARS / t.storyTickEvery)}, (_, k) => (k + 1) * t.storyTickEvery).filter(y => y < YEARS).concat([YEARS]).map(y => (
            <span key={y} className={'story-yr' + (state.years >= y ? ' on' : '') + (y === YEARS ? ' last' : '')} style={{ left: (y / YEARS * 100) + '%' }}>{y}</span>
          ))}
        </div>
        {state.p > 0.005 && (
          <div className="story-comet-layer">
            <div className="story-inv-tag" style={{ left: (tipX / W * 100) + '%', top: ((investedY0 + (investedY1-investedY0)*state.p) / H * 100) + '%' }}>Invested <b>{inr(state.invested)}</b></div>
            <div className="story-comet" style={{ left: (tipX / W * 100) + '%', top: (tipY / H * 100) + '%' }}>
              {t.storyEnergy && <span className="story-comet-pulse"></span>}
              <span className="story-rupee">₹</span>
            </div>
          </div>
        )}

        <div className="story-inner">
          <div className="story-kicker">The one idea that changes everything</div>
          <div className="story-big">{inr(state.value)}</div>
          <div className="story-cap" key={current.at}>{current.txt}</div>
          
          <div className={'story-end' + (done ? ' show' : '')}>
            <div className="story-end-line">That's compounding. We make it <em>click</em> — by playing.</div>
            <a className="btn btn-gold btn-lg" href="#games">See how we teach it <span className="arw">→</span></a>
          </div>
        </div>
        <div className="story-hint">{state.p < 0.03 ? 'keep scrolling ↓' : ''}</div>
      </div>

      <TweaksPanel>
        <TweakSection label="The one idea — numbers" />
        <TweakSlider label="Monthly SIP" value={t.storyMonthly} min={1000} max={100000} step={1000} unit="₹"
                     onChange={(v) => setTweak('storyMonthly', v)} />
        <TweakSlider label="Expected return" value={t.storyRate} min={4} max={18} step={0.5} unit="%"
                     onChange={(v) => setTweak('storyRate', v)} />
        <TweakSlider label="Years" value={t.storyYears} min={10} max={40} step={1}
                     onChange={(v) => setTweak('storyYears', v)} />
        <TweakSection label="Graph" />
        <TweakRadio label="Year markers" value={String(t.storyTickEvery)} options={['2','5','10']}
                    onChange={(v) => setTweak('storyTickEvery', +v)} />
        <TweakToggle label="Energetic graph" value={t.storyEnergy}
                     onChange={(v) => setTweak('storyEnergy', v)} />
      </TweaksPanel>
    </div>
  );
}
window.ScrollStory = ScrollStory;
