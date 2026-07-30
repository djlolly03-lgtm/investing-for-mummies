/* Shaadi.com for your Money v2 — Host view */
const { useState: uS, useEffect: uE, useRef: uR } = React;

const VOTE_WISECRACKS = [
  'has made her decision 💅',
  'voted. Will not elaborate. 🤐',
  'has sealed her fate 💌',
  'voted faster than expected 👀',
  'has chosen… but isn\'t telling 🤫',
  'has given her verdict ⚖️',
  'maan gayi! 🎊',
  'se bol diya 🗳️',
  'filed her biodata preference 📜',
  'is ready to commit 💍',
  'has consulted the stars ⭐',
  'ne soch liya 🧠',
];

/* ══ COVER ═══════════════════════════════════════════════════ */
function HostCover({ onOpen }) {
  return (
    <div className="screen bg-bfiw-dark bfiw-screen fade" style={{alignItems:'center',justifyContent:'center',padding:'4vh 4vw',position:'relative',overflow:'hidden'}}>
      <Petals />
      <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(155,28,28,.35) 0%,transparent 70%)',pointerEvents:'none'}}></div>
      <div className="invite invite-bfiw fade" style={{
        position:'relative',zIndex:1,textAlign:'center',
        background:'linear-gradient(160deg,rgba(100,0,28,.55),rgba(8,0,0,.78))',
        backdropFilter:'blur(16px)',
        padding:'clamp(44px,7vh,90px) clamp(44px,9vw,130px)',
        maxWidth:1020,width:'100%',
      }}>
        <span className="corner tl" style={{fontSize:'1.4rem'}}>❦</span>
        <span className="corner tr" style={{fontSize:'1.4rem'}}>❦</span>
        <span className="corner bl" style={{fontSize:'1.4rem'}}>❦</span>
        <span className="corner br" style={{fontSize:'1.4rem'}}>❦</span>
        <div className="caps" style={{fontSize:'.65rem',color:'#fbbf24',marginBottom:28,letterSpacing:'.4em'}}>
          Investing for Mummies · cordially presents
        </div>
        <h1 className="display" style={{color:'#fbbf24',fontSize:'clamp(3.4rem,9vw,7rem)',fontWeight:700,lineHeight:.92,textShadow:'0 4px 40px rgba(155,28,28,.6)'}}>
          Swayamvar
        </h1>
        <div className="display ital" style={{color:'#fde68a',fontSize:'clamp(2rem,4.5vw,3.6rem)',marginTop:6}}>
          for your Money
        </div>
        <Ornament word="est. 1995" style={{margin:'32px auto 28px',maxWidth:520}} />
        <p className="serif ital" style={{color:'rgba(253,230,138,.92)',fontSize:'clamp(1.1rem,2.2vw,1.65rem)',fontWeight:500,lineHeight:1.45}}>
          Six prospects. Four questions. One portfolio.
        </p>
        <div style={{fontSize:'clamp(1rem,2vw,1.5rem)',letterSpacing:'0.22em',margin:'22px 0 4px',opacity:.9}}>
          🌸🪔🌼🪔🌸🪔🌼🪔🌸🪔🌼🪔🌸
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:20}}>
          <button className="btn-wedding" style={{fontSize:'1.1rem',padding:'18px 56px'}} onClick={onOpen}>
            Open the Swayamvar &nbsp;💍
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ LOBBY ════════════════════════════════════════════════════ */
function HostLobby({ state, onContinue }) {
  const players = Object.values(state.players || {});
  const enough  = players.length >= 1;
  return (
    <div className="screen bg-bfiw-ivory bfiw-screen fade" style={{padding:'4vh 4vw'}}>
      <div style={{textAlign:'center',flex:'0 0 auto'}}>
        <div style={{fontSize:'clamp(.8rem,1.5vw,1.1rem)',letterSpacing:'0.2em',marginBottom:4,opacity:.85}}>
          🌼🪔🌸🪔🌼🪔🌸🪔🌼🪔🌸🪔🌼
        </div>
        <div className="caps" style={{fontSize:'.6rem',color:'#b45309'}}>The Workshop · Matchmaking Round</div>
        <h2 className="display" style={{fontSize:'clamp(3.2rem,6vw,5.2rem)',color:'#9b1c1c',marginTop:4,textShadow:'0 2px 12px rgba(155,28,28,.25)'}}>The Swayamvar is Open</h2>
        <p className="serif ital" style={{color:'#78350f',fontSize:'clamp(1rem,2vw,1.4rem)',marginTop:4}}>Scan the card — we'll wait for everyone to be seated.</p>
      </div>
      <div style={{display:'flex',gap:40,alignItems:'stretch',justifyContent:'center',flex:'1 1 auto',flexWrap:'nowrap',marginTop:28,minHeight:0}}>
        {/* QR */}
        <div className="invite" style={{background:'#fff',padding:'30px 34px',textAlign:'center',boxShadow:'0 16px 50px rgba(28,10,0,.12)',flex:'0 0 auto',alignSelf:'center'}}>
          <span className="corner tl" style={{fontSize:'1rem',color:'#e11d48'}}>❦</span>
          <div className="caps" style={{fontSize:'.55rem',color:'#b45309',marginBottom:16}}>Scan to take your seat</div>
          <div className="qr-wrap" style={{display:'inline-block'}}><QRCode size={333} /></div>
          <div style={{marginTop:16}}>
            <div className="serif" style={{fontSize:'1.1rem',color:'#9b1c1c',fontWeight:600}}>{window.SHAADI_CONFIG.joinUrl}</div>
          </div>
        </div>
        {/* Players */}
        <div style={{flex:'1 1 420px',maxWidth:680,alignSelf:'stretch',display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:14,marginBottom:16}}>
            <span className="display" style={{fontSize:'3.2rem',fontWeight:700,color:'#9b1c1c'}}>{players.length}</span>
            <span className="serif" style={{fontSize:'1.2rem',color:'#78350f'}}>{players.length===1?'guest':'guests'} seated</span>
            <span className="pulse-dot" style={{marginLeft:'auto',fontSize:'.78rem',fontWeight:800,color:'#b45309'}}>● welcoming…</span>
          </div>
          {players.length > 0 && (
            <div style={{fontSize:'.75rem',color:'#78350f',fontStyle:'italic',marginBottom:8,fontWeight:600}}>
              {players[players.length-1].titleEmoji} {players[players.length-1].displayName || players[players.length-1].name} {players[players.length-1].titleAction}
            </div>
          )}
          <div className="scroll" style={{display:'flex',flexDirection:'column',gap:8,flex:'1 1 auto',minHeight:0,overflowY:'auto',paddingRight:4}}>
            {players.map(p=>(
              <div key={p.id} className="chip-pop" style={{
                display:'flex',alignItems:'center',gap:10,
                padding:'10px 18px 10px 10px',borderRadius:14,
                background:'#fff',
                border:`2px solid ${p.color}`,
                boxShadow:`0 2px 12px ${p.color}40`,
              }}>
                <div style={{
                  width:40,height:40,borderRadius:'50%',flexShrink:0,overflow:'hidden',
                  background:p.color,
                  border:`2px solid ${p.color}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                  {p.titleImg
                    ? <img src={p.titleImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
                    : <span style={{color:'#fff',fontSize:'.85rem',fontWeight:900}}>{(p.name||'?')[0].toUpperCase()}</span>
                  }
                </div>
                <div style={{minWidth:0}}>
                  {/* Student's real name — small, above character title */}
                  <div style={{fontSize:'.78rem',color:'#a16207',fontWeight:700,letterSpacing:'.04em',marginBottom:1}}>
                    {p.name}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    {p.titleEmoji && <span style={{fontSize:'1.25rem'}}>{p.titleEmoji}</span>}
                    <span style={{fontWeight:800,fontSize:'1.08rem',color:'#1c0a00',whiteSpace:'nowrap'}}>
                      {p.displayName || p.name}
                    </span>
                  </div>
                  {p.titleAction && (
                    <div style={{fontSize:'.85rem',color:'#78350f',fontStyle:'italic',marginTop:1}}>
                      {p.titleAction}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!players.length && <span className="serif ital" style={{color:'#a16207',opacity:.6}}>The hall is still empty…</span>}
          </div>
          <div style={{marginTop:22,padding:'14px 18px',background:'rgba(155,28,28,.06)',borderRadius:12,border:'1px solid rgba(155,28,28,.14)'}}>
            <div className="caps" style={{fontSize:'.48rem',color:'#b45309',marginBottom:8}}>Tonight's game</div>
            <div style={{fontSize:'.88rem',fontWeight:700,color:'#78350f',lineHeight:1.5}}>
              6 prospects · 4 rounds · Grand finale bucket reveal
            </div>
          </div>
        </div>
      </div>
      <div style={{textAlign:'center',flex:'0 0 auto',marginTop:12}}>
        <button className="btn-wedding" disabled={!enough} onClick={enough?onContinue:undefined} style={{fontSize:'1.05rem',padding:'16px 52px'}}>
          Meet the Suitors &nbsp;→
        </button>
        {!enough && <div style={{fontSize:'.75rem',color:'#78350f',marginTop:8,fontWeight:700}}>Waiting for at least 1 guest to join…</div>}
      </div>
    </div>
  );
}

/* ══ GALLERY — sequential reveal, one suitor at a time ══════ */
function HostGallery({ state, onBegin }) {
  const idx    = state?.galleryIndex || 0;
  const suitor = window.SUITORS[idx];
  const isLast = idx >= window.SUITORS.length - 1;

  return (
    <div className="screen bg-bfiw-ivory bfiw-screen fade" style={{padding:'2.5vh 3vw',overflow:'hidden'}}>

      {/* Header */}
      <div style={{flex:'0 0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div>
          <div className="caps" style={{fontSize:'.58rem',color:'#b45309'}}>Speed Dating · The Biodata Folder</div>
          <h2 className="display" style={{fontSize:'clamp(2rem,4vw,3.2rem)',color:'#9b1c1c',marginTop:2}}>
            Meet the Suitors
          </h2>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
          <div className="caps" style={{fontSize:'.52rem',color:'#9b1c1c',fontWeight:800}}>
            {idx + 1} of {window.SUITORS.length}
          </div>
          {/* Progress dots */}
          <div style={{display:'flex',gap:6}}>
            {window.SUITORS.map((s,i)=>(
              <div key={s.id} style={{
                width: i===idx ? 28 : 9, height:9, borderRadius:999,
                background: i<idx ? '#0f766e' : i===idx ? s.accent : 'rgba(28,10,0,.15)',
                transition:'all .35s ease',
                boxShadow: i===idx ? `0 2px 8px ${s.accent}88` : 'none',
              }}/>
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{display:'flex',gap:20,flex:'1 1 auto',minHeight:0}}>

        {/* Current suitor — live biodata card (male portrait | text | female portrait) */}
        <div style={{flex:1,minHeight:0,display:'flex',alignItems:'stretch',justifyContent:'center'}}>
          <window.SuitorBioCard suitor={suitor} variant="both" style={{maxWidth:1480}} />
        </div>

        {/* Right sidebar: already revealed + up next */}
        <div style={{flex:'0 0 186px',display:'flex',flexDirection:'column',gap:7,overflowY:'auto',minHeight:0}}>
          {idx > 0 && (
            <>
              <div className="caps" style={{fontSize:'.43rem',color:'#0f766e',marginBottom:1}}>✓ Introduced</div>
              {window.SUITORS.slice(0, idx).map(s=>(
                <div key={s.id} style={{
                  display:'flex',alignItems:'center',gap:9,padding:'9px 11px',
                  borderRadius:11, background:s.cardBg,
                  border:`1px solid ${s.accent}55`, opacity:.75,
                }}>
                  <span style={{fontSize:'1.2rem'}}>{s.monogram}</span>
                  <span style={{fontWeight:700,fontSize:'.78rem',color:'#fff',lineHeight:1.2}}>
                    {s.nameNeutral}
                  </span>
                </div>
              ))}
              <div style={{height:1,background:'rgba(28,10,0,.12)',margin:'3px 0'}}/>
            </>
          )}
          {!isLast && (
            <>
              <div className="caps" style={{fontSize:'.43rem',color:'#b45309',marginBottom:1}}>Up next</div>
              {window.SUITORS.slice(idx+1).map(s=>(
                <div key={s.id} style={{
                  display:'flex',alignItems:'center',gap:9,padding:'9px 11px',
                  borderRadius:11, background:'rgba(28,10,0,.05)',
                  border:'1px solid rgba(28,10,0,.1)', opacity:.5,
                }}>
                  <span style={{fontSize:'1.2rem',filter:'grayscale(1)'}}>{s.monogram}</span>
                  <span style={{fontWeight:700,fontSize:'.78rem',color:'#78350f',lineHeight:1.2}}>
                    {s.nameNeutral}
                  </span>
                </div>
              ))}
            </>
          )}
          {isLast && (
            <div style={{
              padding:'14px 12px',borderRadius:12,textAlign:'center',
              background:'rgba(155,28,28,.08)',border:'1px solid rgba(155,28,28,.25)',
            }}>
              <div style={{fontSize:'1.6rem',marginBottom:6}}>🎊</div>
              <div style={{fontSize:'.75rem',fontWeight:800,color:'#9b1c1c',lineHeight:1.3}}>
                All suitors introduced!
              </div>
              <div style={{fontSize:'.65rem',color:'#78350f',marginTop:4}}>Ready to begin.</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{flex:'0 0 auto',textAlign:'center',marginTop:14,display:'flex',gap:12,justifyContent:'center',alignItems:'center'}}>
        {!isLast ? (
          <>
            <button className="btn-wedding" onClick={()=>window.Shaadi.advanceGallery()} style={{fontSize:'1.05rem',padding:'16px 48px'}}>
              Next Suitor &nbsp;→
            </button>
            <button onClick={onBegin} style={{fontSize:'.82rem',padding:'10px 24px',background:'transparent',color:'rgba(120,53,15,.65)',border:'1.5px solid rgba(120,53,15,.3)',borderRadius:10,fontWeight:700,cursor:'pointer',letterSpacing:'.02em'}}>
              Skip — Begin Voting
            </button>
          </>
        ) : (
          <button className="btn-wedding" onClick={onBegin} style={{fontSize:'1.1rem',padding:'16px 60px'}}>
            Begin the Matchmaking &nbsp;💍
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ ROUND INTRO — question + animation hint ══════════════════ */
function HostRoundIntro({ state, onOpenVoting }) {
  const round   = window.ROUNDS[state.roundIndex];
  const players = Object.values(state.players||{});
  return (
    <div className="screen bg-bfiw-dark bfiw-screen fade" style={{padding:'2vh 4vw',overflow:'hidden'}}>
      <Petals />

      {/* ── Top bar: round pill + progress + room badge ── */}
      <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flex:'0 0 auto',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{padding:'5px 14px',borderRadius:999,background:'rgba(251,191,36,.18)',border:'1px solid rgba(251,191,36,.4)'}}>
            <span className="caps" style={{fontSize:'.7rem',color:'#fbbf24'}}>Round {round.number} of {window.ROUNDS.length}</span>
          </div>
          <div style={{display:'flex',gap:4}}>
            {window.ROUNDS.map((_,i)=>(
              <span key={i} className="progress-dot" style={{
                width:i===state.roundIndex?24:8,
                background:i<state.roundIndex?'#0f766e':i===state.roundIndex?'#fbbf24':'rgba(251,191,36,.25)',
              }}></span>
            ))}
          </div>
        </div>
        <RoomBadge dark compact />
      </div>

      {/* ── Question block ── */}
      <div style={{position:'relative',zIndex:1,textAlign:'center',flex:'0 0 auto',marginBottom:8}}>
        <div style={{fontSize:'clamp(.75rem,1.4vw,1rem)',letterSpacing:'0.18em',marginBottom:6,opacity:.7}}>
          🌸🪔🌼🪔🌸🪔🌼🪔🌸🪔🌼🪔🌸🪔🌼🪔🌸
        </div>
        <div style={{fontSize:'clamp(2.2rem,5vw,4rem)',marginBottom:6,filter:'drop-shadow(0 4px 20px rgba(255,255,255,.2))'}}>
          {round.emoji}
        </div>
        <h2 className="display" style={{color:'#fff',fontSize:'clamp(2.2rem,5vw,4rem)',fontWeight:700,lineHeight:.95,textShadow:'0 4px 40px rgba(0,0,0,.5)'}}>
          {round.question}
        </h2>
        <div style={{margin:'8px auto 0',maxWidth:620}}>
          {round.subtitle.split('\n').map((line,i)=>(
            <p key={i} className="serif ital" style={{color:'rgba(253,230,138,.9)',fontSize:'clamp(1.1rem,2vw,1.6rem)',lineHeight:1.35,fontWeight:500}}>
              {line}
            </p>
          ))}
        </div>
        <Ornament style={{maxWidth:360,margin:'6px auto 0'}} />
      </div>

      {/* ── Biodata cards — both gendered suitor sets, scrollable grid ── */}
      <div className="scroll" style={{
        position:'relative',zIndex:1,
        flex:'1 1 auto',minHeight:0,
        maxWidth:1040,width:'100%',margin:'0 auto',
        borderRadius:14,overflowY:'auto',
        boxShadow:'0 8px 48px rgba(0,0,0,.55)',
        border:'1.5px solid rgba(251,191,36,.25)',
        display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,padding:10,background:'rgba(0,0,0,.25)',
      }}>
        {window.SUITORS.map(s=>(
          <div key={'m'+s.id} style={{borderRadius:8,overflow:'hidden',border:'1.5px solid rgba(125,211,252,.3)'}}>
            <img src={s.cardM} alt={s.nameNeutral} style={{width:'100%',height:'auto',display:'block'}} />
          </div>
        ))}
        {window.SUITORS.map(s=>(
          <div key={'f'+s.id} style={{borderRadius:8,overflow:'hidden',border:'1.5px solid rgba(249,168,212,.3)'}}>
            <img src={s.cardF} alt={s.nameNeutral} style={{width:'100%',height:'auto',display:'block'}} />
          </div>
        ))}
      </div>

      {/* ── Open Voting button — always pinned at bottom ── */}
      <div style={{position:'relative',zIndex:1,flex:'0 0 auto',textAlign:'center',paddingTop:10}}>
        <button className="btn-gold" style={{fontSize:'1.1rem',padding:'16px 56px'}} onClick={onOpenVoting}>
          Open Voting &nbsp;🗳️
        </button>
        <div style={{marginTop:8,fontSize:'.72rem',color:'rgba(253,230,138,.5)',fontWeight:700}}>
          {players.length} guest{players.length!==1?'s':''} ready to vote
        </div>
      </div>
    </div>
  );
}

/* ══ Clean portrait reference tile for the voting screen ══════ */
function VoteSuitorTile({ suitor, variant, accent }) {
  const port = variant==='m' ? suitor.portraitM : suitor.portraitF;
  const honorific = variant==='m' ? 'Mr.' : 'Miss';
  const tag = (suitor.bioCard && suitor.bioCard.tagline) || suitor.tagline || '';
  return (
    <div style={{
      borderRadius:10,overflow:'hidden',
      border:`1.5px solid ${accent}59`,
      boxShadow:'0 3px 14px rgba(0,0,0,.45)',
      background:'linear-gradient(165deg,rgba(60,0,16,.5),rgba(8,0,0,.7))',
      display:'flex',flexDirection:'column',minHeight:0,
    }}>
      <div style={{width:'100%',aspectRatio:'1 / 1',overflow:'hidden',background:'#1a0606'}}>
        <img src={port} alt={suitor.nameNeutral}
          style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 24%',display:'block'}} />
      </div>
      <div style={{padding:'6px 8px',textAlign:'center'}}>
        <div className="display" style={{fontSize:'.92rem',color:'#fde68a',lineHeight:1.05}}>
          {honorific} {suitor.nameNeutral}
        </div>
        {tag && (
          <div className="serif ital" style={{fontSize:'.62rem',color:`${accent}cc`,lineHeight:1.2,marginTop:2}}>
            {tag}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ VOTING — live tally, vote popup ══════════════════════════ */
function HostVoting({ state, onForceClose }) {
  const round      = window.ROUNDS[state.roundIndex];
  const players    = Object.values(state.players||{});
  const roundVotes = (state.votes||{})[round.id]||{};
  const votedCount = Object.keys(roundVotes).length;
  const allVoted   = players.length>0 && votedCount>=players.length;

  /* ── Vote-in popup ── */
  const [votePopup, setVotePopup] = uS(null);
  const popupTimer = uR(null);
  const prevVotes  = uR(null); // null = uninitialised (first render)

  uE(()=>{
    if (prevVotes.current === null) {
      prevVotes.current = {...roundVotes};
      return;
    }
    const newcomer = players.find(p => roundVotes[p.id] && !prevVotes.current[p.id]);
    if (newcomer) {
      setVotePopup(newcomer);
      clearTimeout(popupTimer.current);
      popupTimer.current = setTimeout(()=>setVotePopup(null), 3000);
    }
    prevVotes.current = {...roundVotes};
  },[votedCount]);

  // Personalised, persona-aware vote-in line. Names the actual suitor the
  // participant picked and frames it with a round-specific verb, so every
  // popup reads as that character's own little story.
  const popupLine = (p) => {
    const suitor = window.SUITORS.find(s => s.id === (roundVotes[p.id]));
    const pick   = suitor ? suitor.nameNeutral : 'someone';
    const verb = {
      marry:     `said "I do" to ${pick}`,
      date:      `is swiping right on ${pick}`,
      mum:       `gives ${pick} the family seal`,
      emergency: `is calling ${pick} at 2 AM`,
    }[round.id] || `has chosen ${pick}`;
    const emoji = { marry:'💍', date:'❤️', mum:'📲', emergency:'📞' }[round.id] || '🎊';
    return `${verb} ${emoji}`;
  };

  return (
    <div className="screen bg-bfiw-dark bfiw-screen fade" style={{padding:'2.5vh 3vw',overflow:'hidden'}}>

      {/* ── Vote-in popup toast (2× — persona-forward) ── */}
      {votePopup && (
        <div key={votedCount} style={{
          position:'absolute',top:'9vh',left:0,right:0,
          display:'flex',justifyContent:'center',
          zIndex:999,pointerEvents:'none',
        }}>
          <style>{`@keyframes votePopIn{from{opacity:0;transform:scale(.72) translateY(-18px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          <div style={{
            display:'flex',alignItems:'center',gap:34,
            background:'linear-gradient(135deg,rgba(80,0,22,.97),rgba(6,0,0,.98))',
            border:'3.5px solid rgba(251,191,36,.8)',
            borderRadius:34,padding:'34px 48px',
            minWidth:560,maxWidth:780,
            boxShadow:'0 32px 110px rgba(0,0,0,.9),0 0 0 1px rgba(251,191,36,.14)',
            animation:'votePopIn .38s cubic-bezier(.34,1.56,.64,1) both',
            pointerEvents:'auto',
          }}>
            {/* Persona portrait */}
            <div style={{
              width:160,height:160,borderRadius:'50%',overflow:'hidden',flexShrink:0,
              border:`5px solid ${votePopup.color}`,
              boxShadow:`0 0 56px ${votePopup.color}88`,
            }}>
              {votePopup.titleImg
                ? <img src={votePopup.titleImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
                : <div style={{width:'100%',height:'100%',background:votePopup.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{color:'#fff',fontWeight:900,fontSize:'3.6rem'}}>{(votePopup.name||'?')[0]}</span>
                  </div>
              }
            </div>
            {/* Message */}
            <div style={{minWidth:0}}>
              <div className="caps" style={{color:'rgba(251,191,36,.6)',fontSize:'.7rem',letterSpacing:'.22em',marginBottom:6}}>
                {votePopup.name}
              </div>
              <div className="display" style={{color:'#fde68a',fontSize:'2.5rem',fontWeight:700,lineHeight:1.1}}>
                {votePopup.titleEmoji} {votePopup.displayName||votePopup.name}
              </div>
              <div className="serif ital" style={{color:'rgba(251,191,36,.9)',fontSize:'1.45rem',marginTop:10,lineHeight:1.3}}>
                {popupLine(votePopup)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flex:'0 0 auto',gap:16}}>
        <div>
          <div className="caps" style={{fontSize:'.72rem',color:'#fbbf24'}}>Round {round.number} · Voting Open</div>
          <h2 className="display" style={{fontSize:'clamp(2rem,3.5vw,3rem)',color:'#fff',lineHeight:1,marginTop:2}}>
            {round.emoji} {round.question}
          </h2>
        </div>
        <RoomBadge dark compact />
      </div>

      {/* Body: 6 gentlemen · votes · 6 ladies */}
      <div style={{display:'flex',gap:16,flex:'1 1 auto',marginTop:14,minHeight:0}}>

        {/* Left: 6 male suitors */}
        <div style={{flex:'1 1 0',minWidth:0,minHeight:0,display:'flex',flexDirection:'column',gap:6}}>
          <div className="caps" style={{fontSize:'.55rem',color:'#7dd3fc',textAlign:'center',letterSpacing:'.12em'}}>
            🤵 The Gentlemen
          </div>
          <div className="scroll" style={{
            flex:'1 1 auto',minHeight:0,overflowY:'auto',
            display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,padding:4,
          }}>
            {window.SUITORS.map(s=>(
              <VoteSuitorTile key={'m'+s.id} suitor={s} variant="m" accent="#7dd3fc" />
            ))}
          </div>
        </div>

        {/* Middle: vote feed — rich wedding-card panel */}
        <div className="scroll" style={{
          flex:'0 0 290px',minHeight:0,overflowY:'auto',
          padding:'20px 16px',borderRadius:20,
          background:'linear-gradient(165deg,rgba(90,0,24,.62),rgba(8,0,0,.82))',
          border:'1.5px solid rgba(251,191,36,.42)',
          boxShadow:'0 10px 44px rgba(0,0,0,.55),inset 0 1px 0 rgba(251,191,36,.14)',
        }}>
          {/* Heading + live count badge */}
          <div style={{textAlign:'center',marginBottom:16}}>
            <div className="display" style={{fontSize:'1.15rem',color:'#fde68a',lineHeight:1.1}}>The Verdicts Roll In</div>
            <div style={{
              display:'inline-flex',alignItems:'baseline',gap:6,marginTop:8,
              padding:'4px 14px',borderRadius:999,
              background:'rgba(251,191,36,.16)',border:'1px solid rgba(251,191,36,.4)',
            }}>
              <span className="display" style={{fontSize:'1.05rem',fontWeight:700,color:'#fbbf24'}}>{votedCount}</span>
              <span className="caps" style={{fontSize:'.46rem',color:'rgba(253,230,138,.7)',letterSpacing:'.12em'}}>of {players.length} voted</span>
            </div>
          </div>
          {votedCount === 0 && (
            <p className="serif ital" style={{color:'rgba(253,230,138,.5)',fontSize:'.9rem',lineHeight:1.5,textAlign:'center',marginTop:8}}>
              Votes will appear here as they come in…
            </p>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {players.filter(p=>!!roundVotes[p.id]).map((p,i)=>(
              <div key={p.id} className="chip-pop" style={{
                display:'flex',alignItems:'center',gap:13,
                padding:'12px 15px',borderRadius:14,
                background:`linear-gradient(135deg,${p.color}26,rgba(255,255,255,.04))`,
                border:`1.5px solid ${p.color}88`,
                boxShadow:`0 2px 14px ${p.color}33`,
              }}>
                <div style={{
                  width:52,height:52,borderRadius:'50%',overflow:'hidden',
                  flexShrink:0,border:`2.5px solid ${p.color}`,background:p.color,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:`0 0 16px ${p.color}66`,
                }}>
                  {p.titleImg
                    ? <img src={p.titleImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}} />
                    : <span style={{color:'#fff',fontWeight:900,fontSize:'.95rem'}}>{(p.name||'?')[0]}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                    {p.titleEmoji && <span style={{fontSize:'1rem',flexShrink:0}}>{p.titleEmoji}</span>}
                    <span style={{fontWeight:800,fontSize:'.95rem',color:'#fde68a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {p.displayName || p.name}
                    </span>
                  </div>
                  <div style={{fontSize:'.75rem',color:'rgba(253,230,138,.62)',fontStyle:'italic',lineHeight:1.3,marginTop:2}}>
                    {VOTE_WISECRACKS[i % VOTE_WISECRACKS.length]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: 6 female suitors */}
        <div style={{flex:'1 1 0',minWidth:0,minHeight:0,display:'flex',flexDirection:'column',gap:6}}>
          <div className="caps" style={{fontSize:'.55rem',color:'#f9a8d4',textAlign:'center',letterSpacing:'.12em'}}>
            👰 The Ladies
          </div>
          <div className="scroll" style={{
            flex:'1 1 auto',minHeight:0,overflowY:'auto',
            display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,padding:4,
          }}>
            {window.SUITORS.map(s=>(
              <VoteSuitorTile key={'f'+s.id} suitor={s} variant="f" accent="#f9a8d4" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: close button */}
      <div style={{flex:'0 0 auto',marginTop:12}}>
        <button className="btn-wedding" onClick={onForceClose}
          style={{width:'100%',padding:'14px 16px',fontSize:'.95rem'}}>
          {allVoted ? '🎊 Close & Reveal' : 'Close Voting'}
        </button>
      </div>
    </div>
  );
}

/* ══ RESULTS — instant: votes + discussion, confetti on arrive ═ */
function HostResults({ state, onNext }) {
  const round    = window.ROUNDS[state.roundIndex];
  const players  = Object.values(state.players||{});
  const roundVotes = (state.votes||{})[round.id]||{};
  const isLast   = state.roundIndex >= window.ROUNDS.length-1;

  uE(()=>{
    setTimeout(()=>window.triggerConfetti&&window.triggerConfetti(),400);
  },[]);

  /* ── Votes + discussion ── */
  return (
    <div className="screen bg-bfiw-ivory bfiw-screen fade" style={{padding:'2.5vh 3vw'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flex:'0 0 auto',gap:16,marginBottom:14}}>
        <div>
          <span className="caps" style={{fontSize:'.72rem',color:'#b45309'}}>{round.emoji} {round.question}</span>
          <h2 className="display" style={{fontSize:'clamp(2rem,3.2vw,2.8rem)',color:'#9b1c1c',lineHeight:1,marginTop:2}}>
            The Verdict
          </h2>
        </div>
        <RoomBadge compact />
      </div>

      <div style={{flex:'1 1 auto',display:'flex',gap:18,minHeight:0}}>

        {/* Left: who voted for whom */}
        <div className="scroll" style={{flex:'1 1 auto'}}>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {players.map((p,i)=>{
              const vid    = roundVotes[p.id];
              const suitor = window.SUITORS.find(s=>s.id===vid);
              return (
                <div key={p.id} className="float-in" style={{
                  display:'flex',alignItems:'center',gap:14,
                  padding:'5px 16px',borderRadius:16,
                  background:'#fff',
                  border:`2px solid ${p.color}22`,
                  boxShadow:`0 2px 10px ${p.color}15`,
                  animationDelay:`${i*.07}s`,
                }}>
                  {/* Student photo — round, prominent (2x) */}
                  <div style={{
                    width:76,height:76,borderRadius:'50%',overflow:'hidden',
                    flexShrink:0,border:`3px solid ${p.color}`,background:p.color,
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    {p.titleImg
                      ? <img src={p.titleImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}} />
                      : <span style={{color:'#fff',fontWeight:900,fontSize:'1.6rem'}}>{(p.name||'?')[0]}</span>
                    }
                  </div>
                  {/* Student NAME is primary; character title is the small flavour line */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:'1.3rem',color:'#1c0a00',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {p.name}
                    </div>
                    {(p.displayName && p.displayName !== p.name) && (
                      <div style={{fontSize:'.82rem',color:'#78350f',fontStyle:'italic',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {p.titleEmoji} {p.displayName}
                      </div>
                    )}
                  </div>
                  <span style={{fontSize:'1rem',color:'#9b1c1c',flexShrink:0,fontWeight:700}}>chose</span>
                  {suitor ? (() => {
                    const idx       = window.SUITORS.indexOf(suitor);
                    const variant   = window.suitorVariant(p.gender, idx);
                    const votePhoto = window.suitorPortrait(suitor, variant);
                    return (
                      <div style={{display:'flex',alignItems:'center',gap:11,flexShrink:0}}>
                        <div style={{fontWeight:800,fontSize:'1.05rem',color:suitor.accent,whiteSpace:'nowrap'}}>
                          {suitor.nameNeutral}
                        </div>
                        {/* The actual portrait the student voted for — matchmaking match */}
                        <div style={{
                          width:76,height:76,borderRadius:'50%',overflow:'hidden',
                          flexShrink:0,border:`3px solid ${suitor.accent}`,
                          boxShadow:`0 2px 12px ${suitor.accent}55`,
                        }}>
                          <img src={votePhoto} alt={suitor.nameNeutral}
                            style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
                        </div>
                      </div>
                    );
                  })() : (
                    <span style={{fontSize:'.8rem',color:'#a16207',fontStyle:'italic',flexShrink:0}}>No vote yet</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: discussion talking points */}
        <div className="invite" style={{
          flex:'0 0 clamp(240px,35%,380px)',alignSelf:'flex-start',
          background:'linear-gradient(160deg,rgba(90,0,0,.5),rgba(10,0,0,.75))',
          backdropFilter:'blur(12px)',padding:'22px 24px',
        }}>
          <span className="corner tl" style={{fontSize:'.9rem'}}>❦</span>
          <span className="corner br" style={{fontSize:'.9rem'}}>❦</span>
          <div className="caps" style={{fontSize:'.64rem',color:'#fbbf24',marginBottom:6}}>💬 Discussion</div>
          <h3 className="display" style={{color:'#fff',fontSize:'1.45rem',fontWeight:600,lineHeight:1.1,marginBottom:12}}>
            {round.discussTitle}
          </h3>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {round.discuss.map((pt,i)=>(
              <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start'}}>
                <span style={{color:'#fbbf24',fontWeight:900,fontSize:'.95rem',flexShrink:0,marginTop:1}}>❖</span>
                <p className="serif" style={{fontSize:'1.02rem',color:'rgba(253,230,138,.9)',lineHeight:1.5,fontWeight:500}}>
                  {pt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{flex:'0 0 auto',textAlign:'center',marginTop:14}}>
        <button className="btn-wedding" onClick={onNext} style={{fontSize:'1.1rem',padding:'16px 56px'}}>
          {isLast ? '🎊 Grand Finale' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}

/* ══ FINALE — spotlight + bucket reveal ══════════════════════ */
function HostFinale({ state, onReplay }) {
  const [step, setStep] = uS(0);
  // steps: 0=all suitors, 1=emergency revealed, 2=stability revealed, 3=growth revealed, 4=final message

  uE(()=>{
    if(step===0) setTimeout(()=>window.triggerConfetti&&window.triggerConfetti(),600);
  },[]);

  const votes   = state.votes || {};
  const players = Object.values(state.players || {});

  if(step===4) return (
    <div className="screen bg-bfiw-dark bfiw-screen fade" style={{alignItems:'center',justifyContent:'center',padding:'4vh 4vw',position:'relative',overflow:'hidden'}}>
      <Petals />
      <div className="invite fade" style={{
        position:'relative',zIndex:1,textAlign:'center',
        background:'linear-gradient(160deg,rgba(90,0,0,.5),rgba(10,0,0,.75))',
        backdropFilter:'blur(12px)',
        padding:'clamp(40px,6vh,80px) clamp(40px,8vw,100px)',
        maxWidth:960,width:'100%',
      }}>
        <span className="corner tl" style={{fontSize:'1.4rem'}}>❦</span><span className="corner tr" style={{fontSize:'1.4rem'}}>❦</span>
        <span className="corner bl" style={{fontSize:'1.4rem'}}>❦</span><span className="corner br" style={{fontSize:'1.4rem'}}>❦</span>
        <div style={{fontSize:'3.5rem',marginBottom:12}}>❤️</div>
        <h2 className="display" style={{color:'#fff',fontSize:'clamp(2.2rem,5vw,4rem)',lineHeight:.95}}>
          The secret to wealth isn't finding The One.
        </h2>
        <Ornament style={{margin:'22px auto',maxWidth:420}} />
        <p className="serif ital" style={{color:'rgba(253,230,138,.9)',fontSize:'clamp(1.1rem,2.2vw,1.6rem)',lineHeight:1.5,maxWidth:720,margin:'0 auto'}}>
          It's building a portfolio where every personality knows its role.
        </p>
        <div style={{
          marginTop:30,padding:'20px 28px',background:'rgba(255,255,255,.08)',
          borderRadius:16,border:'1.5px solid rgba(251,191,36,.4)',
          display:'inline-block',
        }}>
          <div className="display" style={{color:'#fbbf24',fontSize:'clamp(1.8rem,3.5vw,2.8rem)',fontWeight:700}}>
            Welcome to Asset Allocation.
          </div>
        </div>
        <div style={{marginTop:32,display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn-gold" onClick={onReplay} style={{fontSize:'1rem',padding:'14px 40px'}}>
            Play Again 💍
          </button>
        </div>
        <div style={{marginTop:18,fontSize:'.66rem',color:'rgba(253,230,138,.35)',fontWeight:700,letterSpacing:'.05em'}}>
          Investing for Mummies · Finding the Perfect Match Since 1995
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen bg-bfiw-dark bfiw-screen fade" style={{padding:'2.5vh 3vw'}}>
      {/* Header */}
      <div style={{flex:'0 0 auto',textAlign:'center',marginBottom:20}}>
        <div className="caps" style={{fontSize:'.62rem',color:'#fbbf24',letterSpacing:'.35em'}}>Grand Finale</div>
        {step===0&&<h2 className="display" style={{color:'#fff',fontSize:'clamp(2.2rem,4.5vw,3.6rem)',lineHeight:.95,marginTop:4}}>
          Who did everyone choose?
        </h2>}
        {step>0&&step<4&&<h2 className="display" style={{color:'#fff',fontSize:'clamp(2rem,4vw,3.2rem)',lineHeight:.95,marginTop:4}}>
          Now — everyone finds their bucket.
        </h2>}
        <Ornament style={{margin:'14px auto 0',maxWidth:400}} />
      </div>

      {step===0&&(
        <div className="scroll" style={{flex:'1 1 auto',minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingRight:4}}>
          {players.length===0 && (
            <p className="serif ital" style={{color:'rgba(253,230,138,.6)',textAlign:'center',marginTop:30,fontSize:'1.1rem'}}>
              No guests played this round.
            </p>
          )}
          {players.length>0 && (
            <>
              {/* Header: question columns */}
              <div style={{display:'grid',gridTemplateColumns:'minmax(170px,1.4fr) repeat(4,1fr)',gap:8,minWidth:820,position:'sticky',top:0,zIndex:2}}>
                <div style={{display:'flex',alignItems:'center',padding:'9px 14px',borderRadius:12,background:'rgba(8,0,0,.78)',border:'1px solid rgba(251,191,36,.28)'}}>
                  <span className="caps" style={{fontSize:'.58rem',color:'#fbbf24',letterSpacing:'.14em'}}>Guest</span>
                </div>
                {window.ROUNDS.map(r=>(
                  <div key={r.id} style={{textAlign:'center',padding:'8px 6px',borderRadius:12,background:'rgba(251,191,36,.13)',border:'1px solid rgba(251,191,36,.34)'}}>
                    <div style={{fontSize:'1.3rem',lineHeight:1}}>{r.emoji}</div>
                    <div className="caps" style={{fontSize:'.46rem',color:'#fde68a',marginTop:4,lineHeight:1.25}}>{r.question}</div>
                  </div>
                ))}
              </div>
              {/* One row per participant */}
              {players.map((p,pi)=>(
                <div key={p.id} className="float-in" style={{
                  display:'grid',gridTemplateColumns:'minmax(170px,1.4fr) repeat(4,1fr)',gap:8,
                  minWidth:820,animationDelay:`${pi*.05}s`,
                }}>
                  {/* Participant */}
                  <div style={{display:'flex',alignItems:'center',gap:11,padding:'8px 14px',borderRadius:12,background:'rgba(255,255,255,.05)',border:`1px solid ${p.color}66`}}>
                    <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:`2px solid ${p.color}`,background:p.color,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {p.titleImg
                        ? <img src={p.titleImg} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
                        : <span style={{color:'#fff',fontWeight:900,fontSize:'.95rem'}}>{(p.name||'?')[0]}</span>}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:'.88rem',color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                      {p.displayName && p.displayName!==p.name && (
                        <div style={{fontSize:'.6rem',color:'rgba(253,230,138,.6)',fontStyle:'italic',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {p.titleEmoji} {p.displayName}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Pick for each round */}
                  {window.ROUNDS.map(r=>{
                    const vid    = (votes[r.id]||{})[p.id];
                    const suitor = window.SUITORS.find(s=>s.id===vid);
                    if(!suitor) return (
                      <div key={r.id} style={{display:'flex',alignItems:'center',justifyContent:'center',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.14)',minHeight:62}}>
                        <span style={{color:'rgba(255,255,255,.3)',fontSize:'1.1rem'}}>—</span>
                      </div>
                    );
                    const sidx    = window.SUITORS.indexOf(suitor);
                    const variant = window.suitorVariant(p.gender, sidx);
                    const photo   = window.suitorPortrait(suitor, variant);
                    return (
                      <div key={r.id} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,padding:'7px 4px',borderRadius:12,background:suitor.cardBg,border:`1px solid ${suitor.accent}66`}}>
                        <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:`2px solid ${suitor.accent}`}}>
                          <img src={photo} alt={suitor.nameNeutral} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}} />
                        </div>
                        <div style={{fontSize:'.58rem',fontWeight:800,color:'#fff',textAlign:'center',lineHeight:1.1}}>{suitor.nameNeutral}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {step>0&&step<4&&(
        <div style={{flex:'1 1 auto',display:'flex',gap:16,minHeight:0}}>
          {window.BUCKETS.map((bucket,bi)=>{
            const show = bi<step;
            const suitors = window.SUITORS.filter(s=>bucket.suitorIds.includes(s.id));
            return(
              <div key={bucket.id} className="bucket-col" style={{
                background:show?bucket.bg:'rgba(255,255,255,.04)',
                border:show?`1.5px solid ${bucket.colorLt}44`:'1px solid rgba(255,255,255,.1)',
                opacity:show?1:.4,
                transition:'opacity .4s ease,background .4s ease',
                animationDelay:`${bi*.1}s`,
              }}>
                <div style={{textAlign:'center',marginBottom:4}}>
                  <div style={{fontSize:'2.5rem'}}>{bucket.emoji}</div>
                  <h3 className="serif" style={{fontWeight:600,fontSize:'1.3rem',color:show?'#fff':'rgba(255,255,255,.4)',marginTop:4}}>
                    {bucket.name}
                  </h3>
                  <p style={{fontSize:'.75rem',color:show?bucket.colorLt:'rgba(255,255,255,.3)',fontWeight:700,marginTop:4,lineHeight:1.3}}>
                    {bucket.purpose}
                  </p>
                </div>
                <div className="rule" style={{background:`linear-gradient(90deg,transparent,${bucket.colorLt},transparent)`,opacity:.4}}></div>
                {show&&suitors.map((s,si)=>(
                  <div key={s.id} className="bucket-suitor-chip" style={{animationDelay:`${si*.12}s`}}>
                    <div style={{
                      width:48, height:48, borderRadius:'50%', overflow:'hidden',
                      flexShrink:0, border:`2px solid ${bucket.colorLt}66`,
                      background:'rgba(0,0,0,.35)',
                    }}>
                      <img src={s.portrait} alt={s.name} style={{
                        width:'100%', height:'100%',
                        objectFit:'cover', objectPosition:'top center',
                      }} />
                    </div>
                    <div>
                      <div style={{fontWeight:800,fontSize:'.88rem',color:'#fff'}}>{s.nameNeutral}</div>
                      <div style={{fontSize:'.68rem',color:bucket.colorLt,fontWeight:700}}>{s.returnLabel} returns · {s.riskLabel} risk</div>
                    </div>
                  </div>
                ))}
                {show&&<div style={{marginTop:'auto',padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,.08)',border:`1px solid ${bucket.colorLt}33`}}>
                  <span style={{fontSize:'.72rem',fontWeight:800,color:bucket.colorLt}}>Rule: </span>
                  <span style={{fontSize:'.72rem',color:'rgba(255,255,255,.8)',fontWeight:700}}>{bucket.rule}</span>
                </div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{flex:'0 0 auto',textAlign:'center',marginTop:16,display:'flex',gap:14,justifyContent:'center',alignItems:'center'}}>
        {step===0&&(
          <button className="btn-wedding" onClick={()=>setStep(1)} style={{fontSize:'1.05rem',padding:'16px 52px'}}>
            Reveal Their Role &nbsp;🎊
          </button>
        )}
        {step===1&&(
          <button className="btn-wedding" onClick={()=>setStep(2)}>Stability Bucket →</button>
        )}
        {step===2&&(
          <button className="btn-wedding" onClick={()=>setStep(3)}>Growth Bucket →</button>
        )}
        {step===3&&(
          <button className="btn-gold" onClick={()=>setStep(4)} style={{padding:'16px 52px'}}>
            Final Message &nbsp;❤️
          </button>
        )}
      </div>
    </div>
  );
}

/* ══ HOST APP SHELL ══════════════════════════════════════════ */
function HostApp() {
  const [uiPhase, setUiPhase] = uS('cover');
  const [gameState, setGameState] = uS(null);
  const [confirmReset, setConfirmReset] = uS(false);

  uE(()=>{
    window.Shaadi.ready.then(()=>{
      const s = window.Shaadi.getState();
      setGameState(s);
      // Auto-resume: don't strand teacher on cover after a reload
      if (s.phase === 'lobby')   setUiPhase('lobby');
      else if (s.phase === 'gallery') setUiPhase('gallery');
      else if (s.phase && s.phase !== 'lobby') setUiPhase('game');
    });
    return window.Shaadi.subscribe(s=>setGameState(s));
  },[]);

  // Only reset if NOT mid-game — prevents accidental wipe on reload
  const open = async()=>{
    const cur = window.Shaadi.getState().phase;
    const active = ['roundIntro','voting','lock','results','finale'];
    if (!active.includes(cur)) await window.Shaadi.startFresh();
    setUiPhase('lobby');
  };
  const goGallery   = async()=>{ await window.Shaadi.showGallery(); setUiPhase('gallery'); };
  const beginGame   = async()=>{ await window.Shaadi.startRound(0); setUiPhase('game'); };
  const openVoting  = async()=>{ await window.Shaadi.openVoting(); };
  const forceClose  = async()=>{ await window.Shaadi.closeVoting(); };
  const goNext      = async()=>{ await window.Shaadi.nextRound(); };
  const onReplay    = async()=>{ await window.Shaadi.resetToLobby(); setUiPhase('lobby'); };
  const doReset     = async()=>{ setConfirmReset(false); await window.Shaadi.resetToLobby(); setUiPhase('lobby'); };

  if (!gameState && uiPhase !== 'cover') {
    return <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#1a0505',color:'#fbbf24',fontWeight:800}}>Loading…</div>;
  }

  const phase = gameState?.phase || 'lobby';

  let content;
  if      (uiPhase === 'cover')    content = <HostCover onOpen={open} />;
  else if (uiPhase === 'lobby')    content = <HostLobby state={gameState} onContinue={goGallery} />;
  else if (uiPhase === 'gallery')  content = <HostGallery state={gameState} onBegin={beginGame} />;
  else if (phase === 'roundIntro') content = <HostRoundIntro state={gameState} onOpenVoting={openVoting} />;
  else if (phase === 'voting')     content = <HostVoting state={gameState} onForceClose={forceClose} />;
  else if (phase === 'lock' || phase === 'results') content = <HostResults state={gameState} onNext={goNext} />;
  else if (phase === 'finale')     content = <HostFinale state={gameState} onReplay={onReplay} />;
  else                             content = <HostCover onOpen={open} />;

  return (
    <div className="stage" style={{position:'relative'}}>
      {content}
      {uiPhase !== 'cover' && (
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999}}>
          {confirmReset ? (
            <div style={{display:'flex',gap:8,alignItems:'center',background:'rgba(10,0,0,.92)',border:'1px solid #ef4444',borderRadius:12,padding:'10px 16px',boxShadow:'0 4px 24px rgba(0,0,0,.6)'}}>
              <span style={{color:'#fca5a5',fontSize:'.8rem',fontWeight:700,marginRight:4}}>Reset entire game?</span>
              <button onClick={doReset} style={{background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontWeight:800,fontSize:'.75rem',cursor:'pointer'}}>Yes, reset</button>
              <button onClick={()=>setConfirmReset(false)} style={{background:'rgba(255,255,255,.12)',color:'rgba(255,255,255,.7)',border:'1px solid rgba(255,255,255,.2)',borderRadius:8,padding:'7px 12px',fontWeight:800,fontSize:'.75rem',cursor:'pointer'}}>Cancel</button>
            </div>
          ) : (
            <button onClick={()=>setConfirmReset(true)} style={{background:'rgba(0,0,0,.55)',color:'rgba(255,255,255,.4)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',fontSize:'.72rem',fontWeight:700,cursor:'pointer',backdropFilter:'blur(8px)',transition:'all .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.color='rgba(255,255,255,.8)';e.currentTarget.style.borderColor='rgba(255,255,255,.35)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='rgba(255,255,255,.4)';e.currentTarget.style.borderColor='rgba(255,255,255,.15)';}}>
              ↩ Reset game
            </button>
          )}
        </div>
      )}
    </div>
  );
}

window.HostApp = HostApp;
