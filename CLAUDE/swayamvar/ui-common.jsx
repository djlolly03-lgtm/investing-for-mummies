/* Shaadi.com for your Money v2 — shared components */
const { useState, useEffect, useRef } = React;

/* ── Ornamental divider ──────────────────────────────── */
function Ornament({ word, style }) {
  return (
    <div className="orn" style={style}>
      <span className="line"></span>
      <span className="di">❖</span>
      {word && <span className="word">{word}</span>}
      <span className="di">❖</span>
      <span className="line r"></span>
    </div>
  );
}

/* ── Real scannable QR code (qrcodejs, saved as _QRLib) ─ */
// NOTE: _QRLib is stashed in index.html BEFORE Babel runs,
// because `function QRCode(...)` hoists to global scope and
// overwrites window.QRCode with our React component.
const _QRLib = window._QRLib;

function QRCode({ size = 150 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !_QRLib) return;
    ref.current.innerHTML = '';
    const url = `https://ifm-deploy.vercel.app/swayamvar/?role=player&room=${window.SHAADI_CONFIG.roomCode}`;
    new _QRLib(ref.current, {
      text: url,
      width: size,
      height: size,
      colorDark: '#1c0a00',
      colorLight: '#ffffff',
      correctLevel: _QRLib.CorrectLevel.M,
    });
  }, [size]);
  return <div ref={ref} style={{lineHeight:0,display:'inline-block',width:size,height:size}} />;
}

/* ── Room badge (tap to blow the QR up fullscreen) ───── */
function RoomBadge({ dark = false, compact = false }) {
  const [zoom, setZoom] = useState(false);
  const qrSz = compact ? 76 : 108;
  const fg = dark ? '#fde68a' : '#1c0a00';
  const sub = dark ? 'rgba(253,230,138,.7)' : '#78350f';

  // Close the blow-up on Escape
  useEffect(() => {
    if (!zoom) return;
    const onKey = e => { if (e.key === 'Escape') setZoom(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoom]);

  // Big QR sized to the viewport (recomputed each time it opens).
  const bigSz = Math.min(
    Math.round(Math.min(window.innerHeight * 0.6, window.innerWidth * 0.8)), 760
  );

  return (
    <>
      <div
        onClick={() => setZoom(true)}
        title="Tap to enlarge the QR"
        style={{
          display:'flex', alignItems:'center', gap:compact?12:16,
          padding:compact?'10px 12px':'14px 18px',
          background:dark?'rgba(10,0,0,.55)':'#fff',
          border:`1.5px solid ${dark?'rgba(251,191,36,.5)':'#fbbf24'}`,
          borderRadius:14, backdropFilter:dark?'blur(4px)':'none',
          boxShadow:dark?'none':'0 6px 20px rgba(28,10,0,.10)',
          cursor:'pointer',
        }}
      >
        <div className="qr-wrap"><QRCode size={qrSz} /></div>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <span className="caps" style={{fontSize:'.5rem',color:sub}}>Scan to join · tap to enlarge</span>
          <span className="serif" style={{fontWeight:600,fontSize:compact?'.9rem':'1.05rem',color:fg}}>
            {window.SHAADI_CONFIG.joinUrl}
          </span>
        </div>
      </div>

      {zoom && (
        <div
          onClick={() => setZoom(false)}
          style={{
            position:'fixed', inset:0, zIndex:99999, cursor:'pointer',
            background:'rgba(8,0,4,.94)', padding:'4vh',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'3vh',
          }}
        >
          <div className="caps" style={{fontSize:'clamp(.7rem,2vw,1.05rem)',color:'#fbbf24',letterSpacing:'.3em'}}>
            Scan to join the Swayamvar
          </div>
          <div onClick={e => e.stopPropagation()}
            style={{background:'#fff',padding:'min(4vh,34px)',borderRadius:24,boxShadow:'0 24px 90px rgba(0,0,0,.6)'}}>
            <div className="qr-wrap" style={{lineHeight:0}}><QRCode size={bigSz} /></div>
          </div>
          <div className="display" style={{fontSize:'clamp(1.4rem,4.5vw,2.8rem)',color:'#fde68a'}}>
            {window.SHAADI_CONFIG.joinUrl}
          </div>
          <div className="caps" style={{fontSize:'clamp(.55rem,1.6vw,.85rem)',color:'rgba(253,230,138,.7)',letterSpacing:'.2em'}}>
            Tap anywhere to close · the game keeps running
          </div>
        </div>
      )}
    </>
  );
}

/* ── Mum avatar chip ─────────────────────────────────── */
function MumChip({ name, color, small = false }) {
  const sz = small ? 34 : 44;
  return (
    <div className="mum-chip" style={{width:small?58:70}}>
      <div style={{width:sz,height:sz,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`inset 0 0 0 2px #fff,inset 0 0 0 3.5px ${color}88,0 4px 12px rgba(28,10,0,.13)`}}>
        <span className="serif" style={{fontWeight:600,fontSize:small?.76:.92+'rem',color:'#fff'}}>{name[0]}</span>
      </div>
      <span style={{fontSize:small?.58:.65+'rem',fontWeight:700,color:small?'#78350f':'#78350f',whiteSpace:'nowrap'}}>{name}</span>
    </div>
  );
}

/* ── Animated vote bar ───────────────────────────────── */
function VoteBar({ suitor, count, total, animate, rank }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const rankEmoji = ['🥇','🥈','🥉'][rank] || '';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {rankEmoji && <span style={{fontSize:'1.3rem'}}>{rankEmoji}</span>}
          <span style={{fontSize:'1.5rem'}}>{suitor.monogram}</span>
          <span className="serif" style={{fontWeight:600,fontSize:'1.3rem',color:'#1c0a00'}}>{suitor.name}</span>
        </div>
        <div style={{display:'flex',alignItems:'baseline',gap:6}}>
          <span className="display" style={{fontSize:'2rem',fontWeight:700,color:suitor.accent}}>{pct}%</span>
          <span style={{fontSize:'.8rem',fontWeight:800,color:'#78350f'}}>{count} voted</span>
        </div>
      </div>
      <div style={{height:16,borderRadius:999,background:'#fef3c7',overflow:'hidden',boxShadow:'inset 0 1px 3px rgba(0,0,0,.09)'}}>
        <div className="grow-bar" style={{
          height:'100%',borderRadius:999,
          width:animate?pct+'%':'0%',
          background:`linear-gradient(90deg,${suitor.accent},${suitor.accentLt})`,
          boxShadow:`0 2px 8px ${suitor.accent}66`,
        }}></div>
      </div>
    </div>
  );
}

/* ── Countdown ring ──────────────────────────────────── */
function CountdownRing({ secondsLeft, total = 20, size = 90 }) {
  const r   = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, secondsLeft / total);
  const dash = circ * (1 - pct);
  const color = secondsLeft > 10 ? '#fbbf24' : secondsLeft > 5 ? '#fb923c' : '#ef4444';
  return (
    <svg width={size} height={size} style={{display:'block'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={8} />
      <circle className="timer-ring" cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{transform:'rotate(-90deg)',transformOrigin:`${size/2}px ${size/2}px`,transition:'stroke-dashoffset .9s linear,stroke .3s ease'}}
      />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:size*.28+'px',fill:color}}>
        {Math.ceil(secondsLeft)}
      </text>
    </svg>
  );
}

/* ── Confetti burst ──────────────────────────────────── */
function triggerConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const COLORS = ['#e11d48','#d97706','#fbbf24','#0f766e','#6b21a8','#be185d','#c2410c','#fde68a'];
  const pieces = Array.from({length:180},() => ({
    x:Math.random()*canvas.width, y:-20-Math.random()*100,
    r:4+Math.random()*8, color:COLORS[Math.floor(Math.random()*COLORS.length)],
    vx:(Math.random()-.5)*6, vy:3+Math.random()*5,
    spin:(Math.random()-.5)*.3, angle:Math.random()*Math.PI*2,
    shape:Math.random()>.5?'rect':'circle',
  }));
  let frame, t = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=.14; p.angle+=p.spin;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle); ctx.fillStyle=p.color;
      if(p.shape==='rect') ctx.fillRect(-p.r,-p.r*.4,p.r*2,p.r*.8);
      else { ctx.beginPath(); ctx.arc(0,0,p.r*.6,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    });
    t++;
    if(t<220) frame=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  if(frame) cancelAnimationFrame(frame);
  draw();
}
window.triggerConfetti = triggerConfetti;

/* ── Petal rain (decorative) ─────────────────────────── */
function Petals() {
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
      {Array.from({length:14},(_,i)=>(
        <div key={i} style={{position:'absolute',left:(i*7.3+Math.sin(i*1.9)*4)+'%',top:'-8%',
          fontSize:['1rem','1.4rem','.7rem','1.2rem'][i%4],opacity:.3,
          animation:`petalFall ${5+(i%4)*1.5}s linear ${i*.55}s infinite`}}>
          {['🌸','🌺','❀','🌹'][i%4]}
        </div>
      ))}
      <style>{`@keyframes petalFall{from{transform:translateY(-5vh) rotate(0deg);opacity:.4}to{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

/* ── Detailed suitor card (gallery) ──────────────────── */
function SuitorDetailCard({ suitor, compact, style }) {
  return (
    <div style={{
      position:'relative', borderRadius:18, overflow:'hidden',
      background:suitor.cardBg, color:'#fff',
      boxShadow:'0 12px 40px rgba(0,0,0,.4)',
      border:'1.5px solid rgba(255,255,255,.15)',
      display:'flex',
      ...style,
    }}>
      {/* Portrait photo — left column */}
      {suitor.portrait && (
        <div style={{
          flexShrink:0,
          width: compact ? 108 : 162,
          position:'relative',
          overflow:'hidden',
          minHeight: compact ? 220 : 300,
        }}>
          <img
            src={suitor.portrait}
            alt={suitor.name}
            style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center',display:'block'}}
          />
          {/* fade right edge into card bg */}
          <div style={{position:'absolute',top:0,right:0,width:48,height:'100%',background:'linear-gradient(90deg,transparent,rgba(0,0,0,.75))',pointerEvents:'none'}}/>
        </div>
      )}

      {/* Text content — right column */}
      <div style={{flex:1,padding:compact?'14px 15px':'20px 22px 20px',minWidth:0}}>
        {/* Accent line top */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${suitor.accent}00,${suitor.accent},${suitor.accent}00)`}}/>

        {/* Header */}
        <div style={{marginBottom:10}}>
          <div className="serif" style={{fontWeight:700,fontSize:compact?'1rem':'1.4rem',color:'#fff',lineHeight:1.1}}>{suitor.name}</div>
          <div style={{fontSize:compact?'.74rem':'.92rem',color:suitor.accentLt,fontStyle:'italic',marginTop:3}}>{suitor.aka}</div>
          <div style={{display:'flex',gap:7,marginTop:7,flexWrap:'wrap'}}>
            <span style={{fontSize:compact?'.64rem':'.78rem',fontWeight:800,padding:'3px 10px',borderRadius:999,background:suitor.accent+'44',border:`1px solid ${suitor.accent}88`,color:suitor.accentLt}}>
              📈 {suitor.returnLabel}
            </span>
            <span style={{fontSize:compact?'.64rem':'.78rem',fontWeight:800,padding:'3px 10px',borderRadius:999,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.22)',color:'rgba(255,255,255,.82)'}}>
              ⚡ {suitor.riskLabel}
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="serif ital" style={{fontSize:compact?'.86rem':'1.12rem',color:'rgba(255,255,255,.92)',lineHeight:1.4,marginBottom:10,borderLeft:`3px solid ${suitor.accent}`,paddingLeft:10}}>
          "{suitor.tagline}"
        </p>

        {/* Bio */}
        <p style={{fontSize:compact?'.77rem':'1.02rem',color:'rgba(255,255,255,.76)',lineHeight:1.52,fontWeight:600,marginBottom:compact?0:14}}>
          {suitor.bio}
        </p>

        {/* Flags — full size only */}
        {!compact && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
            <div>
              <div className="caps" style={{fontSize:'.56rem',color:'#86efac',marginBottom:6}}>Green flags ♥</div>
              {suitor.greenFlags.map((f,i)=>(
                <div key={i} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:5}}>
                  <span style={{color:'#4ade80',fontWeight:900,fontSize:'.9rem',flexShrink:0}}>✦</span>
                  <span style={{fontSize:'.9rem',fontWeight:700,color:'rgba(255,255,255,.85)',lineHeight:1.3}}>{f}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="caps" style={{fontSize:'.56rem',color:'#fca5a5',marginBottom:6}}>Red flags ✦</div>
              {suitor.redFlags.map((f,i)=>(
                <div key={i} style={{display:'flex',gap:6,alignItems:'flex-start',marginBottom:5}}>
                  <span style={{color:'#f87171',fontWeight:900,fontSize:'.9rem',flexShrink:0}}>✦</span>
                  <span style={{fontSize:'.9rem',fontWeight:700,color:'rgba(255,255,255,.85)',lineHeight:1.3}}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Live biodata card (gallery) — text rendered as real HTML, ──
   never baked into an image, so it's always crisp + editable.
   variant 'both' = male portrait | text | female portrait (host projector)
   variant 'm' | 'f' = single gendered portrait + text (player phone). */
function SuitorBioCard({ suitor, variant = 'both', style }) {
  const bc     = suitor.bioCard || {};
  const both   = variant === 'both';
  const accent = suitor.accent || '#7c1d1d';
  // 'both' = the host projector card on a big screen → scale type up for
  // readability. The phone player card (m/f) keeps the compact sizes.
  // F(bigValue, smallValue) picks based on that.
  const big = both;
  const F = (b, s) => (big ? b : s);

  // Fit-to-box: on the host projector (both) scale the centre text to fill the
  // available panel height on ANY screen — fills tall screens, never clips short
  // ones. The clamp() sizes below are the base; this nudges them. Off for phones.
  const _panelRef = useRef(null);
  const _contentRef = useRef(null);
  const [bioScale, setBioScale] = useState(1);
  React.useLayoutEffect(() => {
    const panel = _panelRef.current, content = _contentRef.current;
    if (!panel || !content) return;
    // Host (both) can scale UP to fill a big projector; the phone card mostly
    // scales DOWN so the whole bio (incl. Friends Say + footer) fits without
    // being clipped.
    const maxS   = both ? 2.4 : 1.04;
    const origin = both ? 'center center' : 'top center';
    const fit = () => {
      const avail = panel.clientHeight - 4;
      // scrollHeight is the pre-transform layout height — measure at full width
      content.style.width = '100%';
      let nat = content.scrollHeight; if (!nat) return;
      let s = Math.max(0.55, Math.min(avail / nat, maxS));
      // re-measure at the scaled width (wrapping shifts a little)
      content.style.width = (100 / s) + '%';
      nat = content.scrollHeight;
      s = Math.max(0.55, Math.min(avail / nat, maxS));
      // apply imperatively so the DOM is correct even when state is unchanged
      content.style.width = (100 / s) + '%';
      content.style.transform = 'scale(' + s + ')';
      content.style.transformOrigin = origin;
      setBioScale(s);
    };
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return () => window.removeEventListener('resize', fit);
  }, [both, suitor]);

  const PANEL  = '#f6ecd6';
  const INK    = '#3a1d10';
  const MAROON = '#8a1c1c';
  const GOLD   = '#a9761f';
  const FRAME  = 'linear-gradient(160deg,#350909,#4a0d0d)';

  function PortraitPanel({ v }) {
    const src   = v === 'f' ? suitor.portraitF : suitor.portraitM;
    const label = v === 'f' ? 'Female Suitor' : 'Male Suitor';
    const name  = v === 'f' ? suitor.nameF : suitor.nameM;
    return (
      <div style={{
        position:'relative', background:'#160303',
        flex: both ? '0 0 27%' : '0 0 auto',
        height: both ? 'auto' : '44%',
        display:'flex', flexDirection:'column', minWidth:0, minHeight:0,
        ...(both ? (v === 'm'
          ? { borderRight: `3px solid ${GOLD}` }
          : { borderLeft:  `3px solid ${GOLD}` }) : {}),
      }}>
        <div className="caps" style={{
          flex:'0 0 auto', textAlign:'center', padding:'6px 4px',
          fontSize:F('.66rem','.5rem'), fontWeight:800, letterSpacing:'.18em',
          color:'#fcd34d', background:'rgba(0,0,0,.35)',
          borderBottom:`1px solid ${accent}66`,
        }}>★ {label} ★</div>
        <div style={{flex:'1 1 auto', position:'relative', overflow:'hidden', minHeight:0}}>
          <img src={src} alt={name}
            style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:both?'top center':'center 22%',display:'block'}} />
          {bc.badge && (
            <div style={{
              position:'absolute', top:8, right:8,
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              padding:'5px 8px', borderRadius:9,
              background:'linear-gradient(145deg,#7f1d1d,#450a0a)',
              border:'1px solid rgba(252,211,77,.55)',
              boxShadow:'0 3px 10px rgba(0,0,0,.5)',
            }}>
              <span className="caps" style={{fontSize:'.4rem',fontWeight:800,color:'#fde68a',letterSpacing:'.06em',lineHeight:1.15,textAlign:'center'}}>
                {bc.badge.l1}<br/>{bc.badge.l2}
              </span>
              <span style={{
                fontSize:'.52rem',fontWeight:900,color:'#052e16',
                background:'#34d399',borderRadius:999,padding:'1px 7px',marginTop:1,
              }}>{bc.badge.tag}</span>
            </div>
          )}
        </div>
        <div style={{
          flex:'0 0 auto', textAlign:'center', padding:'8px 6px',
          background:'linear-gradient(0deg,#160303,rgba(22,3,3,.85))',
          borderTop:`1px solid ${accent}66`,
        }}>
          <div className="display" style={{fontSize:F('1.18rem','.92rem'),color:'#fde68a',lineHeight:1.1}}>{name}</div>
          <div className="serif ital" style={{fontSize:F('.78rem','.62rem'),color:'rgba(253,230,138,.7)',marginTop:2}}>“{bc.tagline}”</div>
        </div>
      </div>
    );
  }

  const Section = ({ icon, title, children, flush }) => (
    <div style={{marginBottom: flush ? 0 : F(3,6)}}>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:F(3,3)}}>
        <span style={{fontSize:F('clamp(.8rem,1.95vh,1.12rem)','.92rem')}}>{icon}</span>
        <span className="caps" style={{fontSize:F('clamp(.54rem,1.35vh,.8rem)','.56rem'),fontWeight:800,color:MAROON,letterSpacing:'.08em'}}>{title}</span>
      </div>
      {children}
    </div>
  );
  const Divider = () => <div style={{height:1,background:`linear-gradient(90deg,transparent,${GOLD}66,transparent)`,margin:F('3px 0','6px 0')}} />;

  const FlagList = ({ items, ok }) => (
    <div style={{display:'flex',flexDirection:'column',gap:F(6,3)}}>
      {(items||[]).map((f,i)=>(
        <div key={i} style={{display:'flex',gap:F(8,6),alignItems:'flex-start'}}>
          <span style={{flexShrink:0,fontWeight:900,fontSize:F('clamp(.84rem,2.05vh,1.28rem)','.78rem'),color:ok?'#15803d':'#b91c1c',lineHeight:1.25}}>{ok?'✔':'✘'}</span>
          <span style={{fontSize:F('clamp(.8rem,1.95vh,1.22rem)','.74rem'),fontWeight:700,color:INK,lineHeight:1.25}}>{f}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      display:'flex', flexDirection: both ? 'row' : 'column',
      height:'100%', width: both ? '100%' : undefined, maxWidth:'100%',
      borderRadius:16, overflow:'hidden',
      background:FRAME, border:`2px solid ${accent}`,
      boxShadow:'0 12px 44px rgba(0,0,0,.45)',
      ...style,
    }}>
      {(both || variant === 'm') && <PortraitPanel v="m" />}

      {/* Center cream biodata panel */}
      <div ref={_panelRef} className="scroll" style={{
        flex:'1 1 auto', minWidth:0, minHeight:0, overflow:'hidden',
        background:PANEL, color:INK,
        padding: both ? '8px 22px' : '12px 14px',
        display:'flex', flexDirection:'column',
        justifyContent: both ? 'center' : 'flex-start',
        alignItems: 'center',
      }}>
       <div ref={_contentRef} style={{
         width:(100/bioScale)+'%',
         transform:`scale(${bioScale})`,
         transformOrigin: both ? 'center center' : 'top center',
       }}>
        {/* Title ribbon */}
        <div style={{
          textAlign:'center', marginBottom:F(5,7), padding:F('6px 12px','7px 10px'),
          borderRadius:12, background:'linear-gradient(145deg,#5a0e0e,#3a0808)',
          border:`1px solid ${GOLD}`, boxShadow: both ? '0 5px 20px rgba(0,0,0,.4)' : 'none',
        }}>
          <div style={{fontSize:F('clamp(.66rem,1.5vh,.85rem)','.66rem'),marginBottom:1}}>🌸 ❀ 🌸</div>
          <div className="display" style={{fontSize:F('clamp(.96rem,2.7vh,1.62rem)','1.28rem'),color:'#fde68a',lineHeight:1.05}}>
            {both ? `Mr. / Miss ${suitor.nameNeutral}` : (variant === 'f' ? suitor.nameF : suitor.nameM)}
          </div>
          <div className="serif ital" style={{fontSize:F('clamp(.68rem,1.6vh,1.0rem)','.78rem'),color:'rgba(253,230,138,.82)',marginTop:2}}>“{bc.tagline}”</div>
        </div>

        <Section icon="🧑‍💼" title="Occupation">
          <div style={{fontSize:F('clamp(.68rem,1.7vh,1.05rem)','.82rem'),fontWeight:700,color:INK,paddingLeft:2}}>{bc.occupation}</div>
        </Section>
        <Divider />

        <Section icon={suitor.monogram} title="Bio">
          <div style={{display:'flex',flexDirection:'column',gap:F(2,1),paddingLeft:2}}>
            {(bc.bio||[]).map((line,i)=>(
              <div key={i} style={{fontSize:F('clamp(.64rem,1.5vh,1.0rem)','.8rem'),fontWeight:600,color:INK,lineHeight:1.24}}>{line}</div>
            ))}
          </div>
        </Section>
        <Divider />

        {/* Green Flags vs Red Flags — the stars of the card */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:F(14,14)}}>
          <div style={{
            background:'rgba(21,128,61,.09)', border:'1px solid rgba(21,128,61,.3)',
            borderLeft:'5px solid #15803d', borderRadius:11, padding:F('7px 12px','8px 10px'),
          }}>
            <Section icon="💚" title="Green Flags" flush><FlagList items={bc.strengths} ok /></Section>
          </div>
          <div style={{
            background:'rgba(185,28,28,.09)', border:'1px solid rgba(185,28,28,.3)',
            borderLeft:'5px solid #b91c1c', borderRadius:11, padding:F('7px 12px','8px 10px'),
          }}>
            <Section icon="🚩" title="Red Flags" flush><FlagList items={bc.redFlags} /></Section>
          </div>
        </div>
        <Divider />

        <Section icon="💬" title="Friends Say">
          <div className="serif ital" style={{fontSize:F('clamp(.7rem,1.65vh,1.04rem)','.82rem'),color:MAROON,lineHeight:1.32,paddingLeft:2}}>“{bc.friendsSay}”</div>
        </Section>

        {/* Footer */}
        <div style={{
          marginTop:F(5,7), padding:F('6px 12px','7px 12px'), borderRadius:11, textAlign:'center',
          background:'linear-gradient(145deg,#3a0808,#5a0e0e)', border:`1px solid ${GOLD}`,
          boxShadow: both ? '0 5px 20px rgba(0,0,0,.4)' : 'none',
        }}>
          <span className="caps" style={{fontSize:F('.56rem','.46rem'),fontWeight:800,color:'rgba(253,230,138,.7)',letterSpacing:'.14em'}}>What this represents</span>
          <div className="display" style={{fontSize:F('clamp(.86rem,2.1vh,1.32rem)','1.05rem'),color:'#fde68a',marginTop:1}}>
            {suitor.monogram} {bc.represents}
          </div>
        </div>
       </div>{/* /fit-to-box content */}
      </div>

      {(both || variant === 'f') && <PortraitPanel v="f" />}
    </div>
  );
}

/* ── Lock animation overlay ──────────────────────────── */
function LockOverlay({ roundId, onReveal }) {
  const revealBtn = (
    <button className="btn-wedding" onClick={onReveal}
      style={{marginTop:32,fontSize:'1rem',padding:'14px 44px'}}>
      Reveal Results →
    </button>
  );

  if (roundId === 'marry') return (
    <div className="lock-overlay lock-wedding">
      <Petals />
      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div className="bell">🔔</div>
        <h2 className="display" style={{color:'#fff',fontSize:'3rem',marginTop:16}}>Votes Sealed!</h2>
        <div style={{fontSize:'3rem',marginTop:8}}>💍</div>
        <p className="serif ital" style={{color:'rgba(253,230,138,.9)',fontSize:'1.2rem',marginTop:10}}>The rishtas have been considered…</p>
        {revealBtn}
      </div>
    </div>
  );

  if (roundId === 'date') return (
    <div className="lock-overlay lock-hearts" style={{overflow:'hidden'}}>
      {Array.from({length:16},(_,i)=>(
        <span key={i} className="heart-float" style={{
          left:(5+i*6.2)+'%',
          animationDuration:(.9+Math.random()*1.4)+'s',
          animationDelay:(Math.random()*1.2)+'s',
          fontSize:(1.5+Math.random()*2)+'rem',
        }}>{'❤️'}</span>
      ))}
      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{fontSize:'5rem'}}>❤️</div>
        <h2 className="display" style={{color:'#fff',fontSize:'3rem',marginTop:14}}>Votes Sealed!</h2>
        <p className="serif ital" style={{color:'rgba(255,200,220,.9)',fontSize:'1.2rem',marginTop:10}}>See who stole the most hearts…</p>
        {revealBtn}
      </div>
    </div>
  );

  if (roundId === 'mum') return (
    <div className="lock-overlay lock-whatsapp">
      <div style={{textAlign:'center'}}>
        <div className="notif-bar" style={{marginBottom:20,display:'inline-block'}}>
          📱 Mum: "Beta, I've found someone perfect for your money!"
        </div>
        <br/>
        <span className="stamp" style={{fontSize:'4rem',border:'6px solid #22c55e',borderRadius:12,padding:'8px 20px',display:'inline-block',color:'#22c55e',fontWeight:900,letterSpacing:'.1em',fontFamily:'Nunito,sans-serif'}}>
          APPROVED ✓
        </span>
        <h2 className="display" style={{color:'#fff',fontSize:'2.6rem',marginTop:20}}>Votes Sealed!</h2>
        <p className="serif ital" style={{color:'rgba(200,255,200,.85)',fontSize:'1.1rem',marginTop:8}}>Mother knows best (apparently).</p>
        {revealBtn}
      </div>
    </div>
  );

  if (roundId === 'emergency') return (
    <div className="lock-overlay lock-phone">
      <div style={{position:'relative',textAlign:'center'}}>
        <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:140,height:140}}>
          <div className="call-pulse"></div>
          <div className="call-pulse"></div>
          <div className="call-pulse"></div>
          <div style={{position:'relative',zIndex:1,width:90,height:90,borderRadius:'50%',background:'#1c3f6e',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span className="phone-ring" style={{fontSize:'2.5rem'}}>📞</span>
          </div>
        </div>
        <h2 className="display" style={{color:'#fff',fontSize:'2.8rem',marginTop:20}}>Votes Sealed!</h2>
        <p className="serif ital" style={{color:'rgba(150,200,255,.9)',fontSize:'1.1rem',marginTop:10}}>Connecting your emergency contact…</p>
        {revealBtn}
      </div>
    </div>
  );

  return null;
}

Object.assign(window, {
  Ornament, QRCode, RoomBadge, MumChip,
  VoteBar, CountdownRing, Petals,
  SuitorDetailCard, SuitorBioCard, LockOverlay,
});
