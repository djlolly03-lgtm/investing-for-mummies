/* Shaadi.com for your Money v2 — Player View */
const { useState, useEffect, useRef } = React;

const JOIN_COLORS = [
  '#dc2626','#ea580c','#d97706','#16a34a',
  '#0891b2','#7c3aed','#be185d','#0f766e',
];

const _ROOM = window.SHAADI_CONFIG?.roomCode || '1995';

/* ── Join screen ──────────────────────────────────────── */
function PlayerJoin({ onJoin }) {
  const [name, setName]       = useState('');
  const [gender, setGender]   = useState(null); // 'M' | 'F' | 'P'
  const [step, setStep]       = useState('form'); // 'form' | 'avatar'
  const [avatar, setAvatar]   = useState(null);   // the chosen character (was auto-random before)
  const [joining, setJoining] = useState(false);
  const [reveal, setReveal]   = useState(null);

  // Gender-matched avatar pool for the chooser — same mapping as pickAvatar():
  // M → male persona pool, F → female pool, P → both combined.
  const pool = gender === 'M' ? window.PARTICIPANTS_M
             : gender === 'F' ? window.PARTICIPANTS_F
             : window.PARTICIPANTS_M.concat(window.PARTICIPANTS_F);

  // Advance from name/sex to the avatar chooser. Pre-select a random avatar so
  // "Join" always works and nobody is forced to decide — preserves the old
  // behaviour for anyone who doesn't care which character they get.
  function goToAvatar() {
    if (!name.trim() || !gender) return;
    setAvatar(window.pickAvatar(gender));
    setStep('avatar');
  }

  async function handleJoin() {
    const n = name.trim();
    if (!n || !gender || joining) return;
    setJoining(true);

    // Random colour + the CHOSEN avatar (falls back to random if somehow unset).
    const color = JOIN_COLORS[Math.floor(Math.random() * JOIN_COLORS.length)];
    const char  = avatar || window.pickAvatar(gender);
    // displayName = character title only (e.g. "Maharani Ji") — used as the player's identity through the game
    const displayName = char ? char.title : n;

    const revealData = { ...char, displayName, baseName: n, color, gender };
    setReveal(revealData);
    await window.Shaadi.join(n, color, char, gender);

    // Brief reveal, then transition to character lobby screen
    setTimeout(() => onJoin(displayName, revealData, gender), 1500);
  }

  /* ── Full-screen character reveal ── */
  if (reveal) {
    return (
      <div className="player-bg screen" style={{padding:0}}>
        {/* Full-bleed image */}
        {reveal.img && (
          <img src={reveal.img} alt={reveal.title}
            style={{
              position:'absolute', inset:0,
              width:'100%', height:'100%',
              objectFit:'cover', objectPosition:'top center',
              display:'block',
            }} />
        )}
        {/* Gradient: transparent top → dark bottom */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to bottom, transparent 35%, rgba(8,0,10,.88) 68%, #08000a 90%)',
        }} />
        {/* Text pinned to bottom */}
        <div className="float-in" style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'14px 24px 44px', textAlign:'center',
        }}>
          <div className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.85)',letterSpacing:'.3em',marginBottom:3}}>
            {reveal.baseName} · you are
          </div>
          <h2 className="display" style={{
            fontSize:'clamp(1.6rem,7vw,2.1rem)',
            color:'#fde68a', lineHeight:1.1, marginBottom:5,
            textShadow:'0 2px 20px rgba(0,0,0,.8)',
          }}>
            {reveal.emoji} {reveal.title}
          </h2>
          <p className="serif ital" style={{
            fontSize:'.9rem', color:'rgba(253,230,138,.9)', marginBottom:14,
            textShadow:'0 1px 8px rgba(0,0,0,.9)',
          }}>
            {reveal.action}
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'7px 18px', borderRadius:999,
            background:'rgba(251,191,36,.12)', border:'1px solid rgba(251,191,36,.35)',
          }}>
            <div style={{width:8,height:8,borderRadius:'50%',background:reveal.color}}/>
            <span className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.82)',letterSpacing:'.2em'}}>
              Entering the Swayamvar…
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Avatar chooser (step 2) ── */
  if (step === 'avatar') {
    return (
      <div className="player-bg screen" style={{alignItems:'center',padding:'20px 16px',overflowY:'auto'}}>
        <div style={{width:'100%',maxWidth:440,display:'flex',flexDirection:'column',gap:16,margin:'auto 0'}}>
          <div style={{textAlign:'center'}}>
            <h1 className="display" style={{fontSize:'1.9rem',color:'#fde68a',lineHeight:1.1}}>
              Choose your character
            </h1>
            <p className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.85)',marginTop:6,letterSpacing:'.25em'}}>
              Pick the avatar that's most you
            </p>
          </div>

          {/* Avatar grid — gender-matched pool */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:10}}>
            {pool.map(a => {
              const on = avatar && avatar.title === a.title;
              return (
                <button
                  key={a.title}
                  type="button"
                  onClick={() => setAvatar(a)}
                  style={{
                    position:'relative',padding:0,borderRadius:14,overflow:'hidden',
                    border:`2px solid ${on ? '#fbbf24' : 'rgba(251,191,36,.25)'}`,
                    background:'rgba(10,0,0,.5)',cursor:'pointer',
                    boxShadow: on ? '0 0 0 3px rgba(251,191,36,.25)' : 'none',
                    transition:'all .15s',
                  }}
                >
                  <div style={{position:'relative',width:'100%',aspectRatio:'3/4',background:'#1a0505'}}>
                    <img src={a.img} alt={a.title} loading="lazy"
                      style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center',display:'block',opacity: on ? 1 : .82}} />
                    {on && (
                      <div style={{
                        position:'absolute',top:5,right:5,width:20,height:20,borderRadius:'50%',
                        background:'#fbbf24',color:'#3a0a0a',fontSize:'.7rem',fontWeight:900,
                        display:'flex',alignItems:'center',justifyContent:'center',
                      }}>✓</div>
                    )}
                  </div>
                  <div style={{padding:'5px 4px 7px',textAlign:'center'}}>
                    <div style={{fontSize:'.92rem',lineHeight:1}}>{a.emoji}</div>
                    <div className="serif" style={{fontSize:'.56rem',color:'#fde68a',lineHeight:1.15,marginTop:3,fontWeight:600}}>
                      {a.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Surprise me — random pick from the same pool */}
          <button
            type="button"
            onClick={() => setAvatar(window.pickAvatar(gender))}
            style={{
              alignSelf:'center',display:'inline-flex',alignItems:'center',gap:8,
              padding:'8px 18px',borderRadius:999,border:'1px solid rgba(251,191,36,.4)',
              background:'rgba(251,191,36,.08)',color:'#fde68a',cursor:'pointer',
              fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:'.8rem',
            }}
          >
            🎲 Surprise me
          </button>

          {/* Back + Join */}
          <div style={{display:'flex',gap:10}}>
            <button
              type="button"
              onClick={() => setStep('form')}
              style={{
                flex:'0 0 auto',padding:'14px 18px',borderRadius:12,
                border:'1.5px solid rgba(251,191,36,.35)',background:'rgba(255,255,255,.06)',
                color:'#fde68a',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,
              }}
            >
              ← Back
            </button>
            <button
              className="btn-gold"
              onClick={handleJoin}
              disabled={!avatar || joining}
              style={{flex:1}}
            >
              {joining ? 'Joining…' : 'Join the Party 💍'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Join form (name + gender) ── */
  const GENDERS = [
    { id:'M', emoji:'🤵', label:'Male' },
    { id:'F', emoji:'👰', label:'Female' },
    { id:'P', emoji:'🙂', label:'Prefer not to say' },
  ];
  return (
    <div className="player-bg screen" style={{alignItems:'center',justifyContent:'center',padding:24,overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:400,display:'flex',flexDirection:'column',gap:28}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'2.8rem',marginBottom:8}}>💍</div>
          <h1 className="display" style={{fontSize:'2.4rem',color:'#fde68a',lineHeight:1.1}}>
            Swayamvar
          </h1>
          <p className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.85)',marginTop:8,letterSpacing:'.3em'}}>
            Your invitation awaits
          </p>
        </div>

        <div className="invite" style={{padding:'28px 24px',background:'rgba(10,0,0,.55)',backdropFilter:'blur(8px)'}}>
          <div className="corner tl">✦</div>
          <div className="corner tr">✦</div>
          <div className="corner bl">✦</div>
          <div className="corner br">✦</div>

          <div style={{display:'flex',flexDirection:'column',gap:18}}>
            <div>
              <label className="caps" style={{fontSize:'.48rem',color:'rgba(253,230,138,.88)',display:'block',marginBottom:8}}>
                Your name
              </label>
              <input
                type="text"
                placeholder="Enter your name…"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={24}
                autoFocus
                style={{
                  width:'100%', padding:'14px 18px', borderRadius:12,
                  border:'1.5px solid rgba(251,191,36,.4)',
                  background:'rgba(255,255,255,.14)', color:'#fde68a',
                  fontSize:'1rem', fontFamily:'Nunito,sans-serif', outline:'none',
                  boxSizing:'border-box',
                }}
              />
            </div>

            <div>
              <label className="caps" style={{fontSize:'.48rem',color:'rgba(253,230,138,.88)',display:'block',marginBottom:8}}>
                You are
              </label>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {GENDERS.map(g => {
                  const on = gender === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        width:'100%', padding:'12px 16px', borderRadius:12,
                        border:`1.5px solid ${on ? 'rgba(251,191,36,.85)' : 'rgba(251,191,36,.3)'}`,
                        background: on ? 'rgba(251,191,36,.24)' : 'rgba(255,255,255,.1)',
                        color:'#fde68a', cursor:'pointer', textAlign:'left',
                        fontFamily:'Nunito,sans-serif', fontWeight:on?800:600, fontSize:'.95rem',
                        transition:'all .15s',
                      }}
                    >
                      <span style={{fontSize:'1.3rem',lineHeight:1}}>{g.emoji}</span>
                      <span>{g.label}</span>
                      {on && <span style={{marginLeft:'auto',color:'#fbbf24'}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="btn-gold"
              onClick={goToAvatar}
              disabled={!name.trim() || !gender}
              style={{width:'100%',marginTop:4}}
            >
              Choose your character →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Generic waiting screen ───────────────────────────── */
function PlayerWaiting({ phase, roundIndex, playerName }) {
  const round = window.ROUNDS[roundIndex];

  const msgs = {
    lobby:      { emoji:'💌', text:'Waiting for the host to begin…' },
    gallery:    { emoji:'👀', text:'Take a look at the suitors on the big screen!' },
    roundIntro: { emoji: round?.emoji || '🎯', text: `Round ${round?.number||''} is starting…` },
    lock:       { emoji:'🔒', text:'Votes are locked! Watch the screen…' },
    results:    { emoji:'📊', text:'Results coming up on screen…' },
    finale:     { emoji:'🎊', text:'Grand Finale — watch the big screen!' },
    ended:      { emoji:'🙏', text:'Thanks for playing!' },
  };
  const m = msgs[phase] || { emoji:'⏳', text:'Stand by…' };

  return (
    <div className="player-bg screen" style={{alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
        <div style={{fontSize:'4rem'}} className="pulse-dot">{m.emoji}</div>
        <p className="serif ital" style={{fontSize:'1.2rem',color:'#fde68a',maxWidth:300}}>{m.text}</p>
        {playerName && (
          <p className="caps" style={{fontSize:'.46rem',color:'rgba(253,230,138,.78)',letterSpacing:'.28em'}}>
            Playing as {playerName}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Gallery: synced to host's reveal pace ────────────── */
function PlayerGallery({ state, playerName, gender }) {
  const idx     = state?.galleryIndex || 0;
  const suitor  = window.SUITORS[idx] || window.SUITORS[0];
  const variant = window.suitorVariant(gender, idx);

  return (
    <div className="player-bg screen" style={{overflow:'hidden'}}>
      {/* Header */}
      <div style={{
        padding:'12px 16px 8px',borderBottom:'1px solid rgba(251,191,36,.2)',
        display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,
      }}>
        <span className="display" style={{fontSize:'1.1rem',color:'#fde68a'}}>Meet the Suitors</span>
        <span className="caps" style={{fontSize:'.4rem',color:'rgba(253,230,138,.8)',letterSpacing:'.2em'}}>
          {idx + 1} / {window.SUITORS.length}
        </span>
      </div>

      {/* Synced progress bar */}
      <div style={{display:'flex',gap:4,padding:'8px 14px',flexShrink:0}}>
        {window.SUITORS.map((s,i)=>(
          <div key={s.id} style={{
            flex: i===idx ? 3 : 1, height:4, borderRadius:999,
            background: i<=idx ? s.accent : 'rgba(255,255,255,.15)',
            transition:'all .35s ease',
          }}/>
        ))}
      </div>

      {/* Current suitor — live biodata card (gender-matched portrait + text) */}
      <div style={{flex:1,minHeight:0,padding:'8px 10px 12px',display:'flex'}}>
        <window.SuitorBioCard suitor={suitor} variant={variant} />
      </div>

      <div style={{
        padding:'8px 16px',textAlign:'center',
        borderTop:'1px solid rgba(251,191,36,.12)',flexShrink:0,
      }}>
        <p className="caps" style={{fontSize:'.4rem',color:'rgba(253,230,138,.74)',letterSpacing:'.22em'}}>
          Host presenting · voting opens soon · {playerName}
        </p>
      </div>
    </div>
  );
}

/* ── Voting screen ────────────────────────────────────── */
function PlayerVoting({ roundIndex, onVoted, gender }) {
  const round = window.ROUNDS[roundIndex];
  const [chosen, setChosen] = useState(null);
  const [locked, setLocked] = useState(false);

  const chosenSuitor  = window.SUITORS.find(s => s.id === chosen);
  const chosenVariant = window.suitorVariant(gender, window.SUITORS.findIndex(s => s.id === chosen));

  async function castVote(suitorId) {
    if (locked) return;
    setChosen(suitorId);
    setLocked(true);
    onVoted(suitorId, round.id);
    await window.Shaadi.castVote(round.id, suitorId);
  }

  return (
    <div className="player-bg screen" style={{overflow:'hidden'}}>
      {/* Header — big, centred question (fills the blank space) */}
      <div style={{
        padding:'16px 16px 14px',flexShrink:0,textAlign:'center',
        borderBottom:'1px solid rgba(251,191,36,.2)',
      }}>
        <span style={{
          display:'inline-block',marginBottom:10,
          fontSize:'.5rem',fontWeight:800,padding:'4px 14px',borderRadius:999,
          background:'rgba(251,191,36,.18)',color:'#fbbf24',letterSpacing:'.14em',
        }} className="caps">
          Round {round.number} of {window.ROUNDS.length}
        </span>
        <div style={{fontSize:'2.4rem',lineHeight:1,marginBottom:8}}>{round.emoji}</div>
        <p className="display" style={{fontSize:'clamp(1.8rem,9vw,2.8rem)',color:'#fde68a',lineHeight:1.05}}>{round.question}</p>
        <p className="caps" style={{fontSize:'.52rem',color:'rgba(253,230,138,.82)',marginTop:10,letterSpacing:'.12em'}}>{round.cta}</p>
      </div>

      {/* Body */}
      <div className="scroll" style={{flex:1,padding:'12px'}}>
        {locked ? (
          <div style={{
            display:'flex',flexDirection:'column',alignItems:'center',
            gap:16,paddingTop:24,textAlign:'center',
          }}>
            <div style={{fontSize:'5.5rem',lineHeight:1}}>✅</div>
            <p className="display" style={{fontSize:'2.2rem',color:'#4ade80',textShadow:'0 0 28px rgba(74,222,128,.55)'}}>Vote Cast!</p>
            <div style={{
              display:'flex',alignItems:'center',gap:12,padding:'14px 20px',
              borderRadius:14,background:'rgba(255,255,255,.12)',
              border:'1.5px solid rgba(251,191,36,.4)',
            }}>
              <span style={{fontSize:'2rem'}}>
                {chosenSuitor?.monogram}
              </span>
              <div style={{textAlign:'left'}}>
                <p style={{color:'rgba(253,230,138,.85)',fontSize:'.65rem'}}>Your choice</p>
                <p className="serif" style={{color:'#fde68a',fontWeight:600}}>
                  {chosenSuitor && window.suitorName(chosenSuitor, chosenVariant)}
                </p>
              </div>
            </div>
            <p className="caps" style={{fontSize:'.42rem',color:'rgba(253,230,138,.74)',letterSpacing:'.22em'}}>
              Waiting for others…
            </p>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
            {window.SUITORS.map((s,i) => {
              const variant  = window.suitorVariant(gender, i);
              const portrait = window.suitorPortrait(s, variant);
              return (
              <button
                key={s.id}
                onClick={() => castVote(s.id)}
                disabled={locked}
                style={{
                  background: s.cardBg,
                  border: `2px solid ${s.accent}55`,
                  borderRadius: 12,
                  padding: 0,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform .12s, box-shadow .12s',
                }}
                onTouchStart={e => e.currentTarget.style.transform='scale(.97)'}
                onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
              >
                {/* Portrait */}
                <div style={{height:104,overflow:'hidden',position:'relative'}}>
                  {portrait
                    ? <img src={portrait} alt={s.nameNeutral} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center',display:'block'}} />
                    : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.4rem'}}>{s.monogram}</div>
                  }
                  <div style={{position:'absolute',bottom:0,left:0,right:0,height:36,background:'linear-gradient(transparent,rgba(0,0,0,.7))'}}/>
                </div>
                {/* Name + return */}
                <div style={{padding:'7px 10px 9px'}}>
                  <div style={{fontWeight:800,fontSize:'.72rem',color:'#fde68a',lineHeight:1.2}}>
                    {(variant==='f'?'Miss ':'Mr. ')+s.nameNeutral}
                  </div>
                  <div style={{fontSize:'.57rem',color:s.accentLt,fontWeight:700,marginTop:2}}>
                    {s.returnLabel}
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Finale: personal scorecard ───────────────────────── */
function PlayerFinale({ myVotes, playerName, gender }) {
  return (
    <div className="player-bg screen" style={{overflow:'hidden'}}>
      <div className="scroll" style={{flex:1,padding:'24px 16px 32px'}}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:'2.4rem',marginBottom:6}}>🎊</div>
          <h2 className="display" style={{fontSize:'1.9rem',color:'#fde68a',lineHeight:1.1}}>
            Your Report Card
          </h2>
          <p className="caps" style={{fontSize:'.44rem',color:'rgba(253,230,138,.8)',marginTop:6,letterSpacing:'.24em'}}>
            {playerName}'s choices
          </p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {window.ROUNDS.map(r => {
            const chosenId = myVotes[r.id];
            const suitor = window.SUITORS.find(s => s.id === chosenId);
            const variant = suitor ? window.suitorVariant(gender, window.SUITORS.indexOf(suitor)) : null;
            return (
              <div
                key={r.id}
                className="float-in"
                style={{
                  borderRadius:14,padding:'13px 15px',
                  background:'rgba(255,255,255,.06)',
                  border:'1px solid rgba(251,191,36,.22)',
                  display:'flex',alignItems:'center',gap:13,
                }}
              >
                <div style={{
                  width:42,height:42,borderRadius:10,flexShrink:0,
                  background: suitor ? suitor.cardBg : 'rgba(255,255,255,.1)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'1.4rem',
                }}>
                  {suitor?.monogram || '—'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:'.6rem',color:'rgba(253,230,138,.8)',marginBottom:2}}>
                    {r.emoji} {r.question}
                  </p>
                  <p className="serif" style={{color:'#fde68a',fontWeight:600,fontSize:'.88rem'}}>
                    {suitor ? window.suitorName(suitor, variant) : 'No vote'}
                  </p>
                  {suitor && (
                    <p style={{fontSize:'.57rem',color:'rgba(253,230,138,.78)',fontStyle:'italic'}}>
                      {suitor.returnLabel} · {suitor.riskLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop:28,padding:'20px 18px',borderRadius:16,textAlign:'center',
          background:'rgba(251,191,36,.1)',border:'1.5px solid rgba(251,191,36,.35)',
        }}>
          <p className="display ital" style={{fontSize:'1.25rem',color:'#fbbf24',lineHeight:1.35}}>
            "The secret to wealth isn't finding The One.<br/>
            It's building a portfolio where every<br/>personality knows its role."
          </p>
          <p className="caps" style={{fontSize:'.43rem',color:'rgba(251,191,36,.65)',marginTop:12,letterSpacing:'.22em'}}>
            Welcome to Asset Allocation
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Character waiting screen (lobby) ─────────────────── */
function PlayerCharacterWait({ charData }) {
  if (!charData) return <PlayerWaiting phase="lobby" roundIndex={0} playerName="" />;
  return (
    <div className="player-bg screen" style={{padding:0}}>
      {/* Full-bleed image */}
      {charData.img && (
        <img src={charData.img} alt={charData.title}
          style={{
            position:'absolute', inset:0,
            width:'100%', height:'100%',
            objectFit:'cover', objectPosition:'top center',
            display:'block',
          }} />
      )}
      {/* Gradient: transparent top → dark bottom */}
      <div style={{
        position:'absolute', inset:0,
        background:'linear-gradient(to bottom, transparent 35%, rgba(8,0,10,.88) 68%, #08000a 90%)',
      }} />
      {/* Text pinned to bottom */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        padding:'14px 24px 44px', textAlign:'center',
      }}>
        <div className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.84)',letterSpacing:'.3em',marginBottom:3}}>
          {charData.baseName}
        </div>
        <h2 className="display" style={{
          fontSize:'clamp(1.6rem,7vw,2.1rem)',
          color:'#fde68a', lineHeight:1.1, marginBottom:4,
        }}>
          {charData.emoji} {charData.title}
        </h2>
        <p className="serif ital" style={{
          fontSize:'.88rem', color:'rgba(253,230,138,.86)', marginBottom:14,
        }}>
          {charData.action}
        </p>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:7,
          padding:'7px 18px', borderRadius:999,
          background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.28)',
        }}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#fbbf24',flexShrink:0,display:'inline-block'}}/>
          <span className="caps" style={{fontSize:'.48rem',color:'rgba(253,230,138,.78)',letterSpacing:'.22em'}}>
            Waiting for the Swayamvar to begin…
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Live results on the handset (who picked what) ────── */
function PlayerResults({ state, roundIndex, gender, myVotes }) {
  const round  = window.ROUNDS[roundIndex];
  const votes  = (state.votes && state.votes[round.id]) || {};
  const counts = {};
  Object.values(votes).forEach(sid => { counts[sid] = (counts[sid] || 0) + 1; });
  const total  = Object.values(counts).reduce((a, b) => a + b, 0);
  const myPick = myVotes[round.id];
  const ranked = window.SUITORS
    .map(s => ({ s, n: counts[s.id] || 0, i: window.SUITORS.findIndex(x => x.id === s.id) }))
    .sort((a, b) => b.n - a.n);

  return (
    <div className="player-bg screen" style={{overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'16px 16px 12px',flexShrink:0,textAlign:'center',
        borderBottom:'1px solid rgba(251,191,36,.2)'}}>
        <span className="caps" style={{display:'inline-block',marginBottom:8,
          fontSize:'.5rem',fontWeight:800,padding:'4px 14px',borderRadius:999,
          background:'rgba(251,191,36,.18)',color:'#fbbf24',letterSpacing:'.14em'}}>
          Round {round.number} · The Verdict
        </span>
        <p className="display" style={{fontSize:'clamp(1.3rem,6.5vw,2rem)',color:'#fde68a',lineHeight:1.05}}>
          {round.question}
        </p>
      </div>

      {/* Tally */}
      <div className="scroll" style={{flex:1,padding:'12px',display:'flex',flexDirection:'column',gap:8}}>
        {ranked.map(({ s, n, i }, idx) => {
          const variant = window.suitorVariant(gender, i);
          const pct  = total ? Math.round((n / total) * 100) : 0;
          const mine = myPick === s.id;
          return (
            <div key={s.id} style={{
              background:'rgba(255,255,255,.08)', borderRadius:12, padding:'10px 12px',
              border: mine ? '2px solid #fbbf24' : '1.5px solid rgba(251,191,36,.22)',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:'1.25rem'}}>{idx === 0 && n > 0 ? '👑' : s.monogram}</span>
                <span className="serif" style={{flex:1,color:'#fde68a',fontWeight:600,fontSize:'.92rem',lineHeight:1.15}}>
                  {window.suitorName(s, variant)}
                  {mine && <span style={{color:'#fbbf24',fontWeight:800}}> · You</span>}
                </span>
                <span className="display" style={{color:'#fde68a',fontSize:'1.15rem'}}>{n}</span>
              </div>
              <div style={{height:9,borderRadius:999,background:'rgba(0,0,0,.28)',overflow:'hidden'}}>
                <div style={{height:'100%',width:pct+'%',borderRadius:999,
                  background:`linear-gradient(90deg,${s.accent},${s.accentLt || s.accent})`,
                  transition:'width .6s ease'}}/>
              </div>
            </div>
          );
        })}
        <p className="caps" style={{textAlign:'center',marginTop:6,
          fontSize:'.44rem',color:'rgba(253,230,138,.72)',letterSpacing:'.2em'}}>
          {total} vote{total === 1 ? '' : 's'} so far · full reveal on the big screen
        </p>
      </div>
    </div>
  );
}

/* ── Player App shell ─────────────────────────────────── */
function PlayerApp() {
  const [state, setState]       = useState(window.Shaadi.getState());

  // Persist join + votes across phone refresh AND full tab close / re-scan.
  // localStorage (not sessionStorage) so a player who closes the browser and
  // re-scans the QR mid-game is restored as the same character with their votes
  // intact — instead of landing on the join screen as a duplicate participant.
  // On a teacher reset the eviction effect below clears every one of these keys.
  const [joined, setJoined]     = useState(() => !!localStorage.getItem(`sm-joined-${_ROOM}`));
  const [playerName, setPlayerName] = useState(() => localStorage.getItem(`sm-name-${_ROOM}`) || '');
  const [gender, setGender]     = useState(() => localStorage.getItem(`sm-gender-${_ROOM}`) || 'P');
  const [charData, setCharData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`sm-char-${_ROOM}`) || 'null'); } catch { return null; }
  });
  const [myVotes, setMyVotes]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(`sm-votes-${_ROOM}`) || '{}'); } catch { return {}; }
  });
  // The game generation we joined under. If a DIFFERENT one arrives, the
  // teacher reset the game and we should leave — see the eviction effect below.
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(`sm-session-${_ROOM}`) || null);

  // Gate the eviction / auto-rejoin logic until the engine has loaded the real
  // saved state from Supabase. Before that, `state` is the local placeholder
  // _freshState() (a throwaway generation id) — reacting to it would wrongly
  // evict a player who is simply refreshing mid-game.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = window.Shaadi.subscribe(s => setState(s));
    window.Shaadi.ready.then(() => {
      setState(window.Shaadi.getState());
      setReady(true);
    });
    return unsub;
  }, []);

  // ── Reset eviction ──────────────────────────────────────────────
  // When the teacher hits "Reset game", the engine mints a brand-new
  // sessionId. If the live state's sessionId differs from the one we joined
  // under, the old game is over: wipe our local join/vote record and drop
  // back to the join screen. WITHOUT this, the auto-rejoin safety net below
  // would silently re-register us into the fresh lobby — which is exactly the
  // "reset doesn't evict players" bug.
  function _clearSession() {
    // Clear the join/vote record (localStorage). Note: sm-myid is intentionally
    // NOT cleared — it's a stable per-device id; the next join reuses it under
    // the new game generation.
    ['joined','name','gender','char','votes','session'].forEach(k => {
      try { localStorage.removeItem(`sm-${k}-${_ROOM}`); } catch {}
    });
  }
  useEffect(() => {
    if (!ready || !joined) return;
    const liveSid = state && state.sessionId;
    // Evict whenever the live generation isn't the one we joined under. This
    // covers (a) the teacher pressing Reset — a brand-new sessionId arrives —
    // and (b) a stale pre-fix session that never recorded a generation
    // (sessionId === null): once the engine is ready, any real live generation
    // that isn't ours means this game is not the one we joined, so drop back to
    // the join screen instead of letting auto-rejoin silently re-add us.
    if (liveSid && liveSid !== sessionId) {
      _clearSession();
      setJoined(false);
      setMyVotes({});
      setCharData(null);
      setPlayerName('');
      setSessionId(null);
    }
  }, [ready, state.sessionId, joined, sessionId]);

  // Safety net: if we believe we've joined but the host's state doesn't list
  // our id (record lost to a teacher reset, or a join that never propagated),
  // silently re-register so our votes always map to a known player. With the
  // persisted id in engine.js this is rarely needed, but it guarantees a vote
  // is never orphaned (which would show as a ghost tally with no chip/popup).
  useEffect(() => {
    if (!ready || !joined || !charData) return;
    // Only re-register within the EXACT generation we joined under. If we have
    // no recorded generation (sessionId === null), or the live generation has
    // moved on (teacher reset), do NOT rejoin — the eviction effect above
    // handles leaving. This is what stops a reset-out player from silently
    // re-appearing in the fresh lobby ("player from previous round still in
    // lobby" bug).
    if (!sessionId || !state.sessionId || state.sessionId !== sessionId) return;
    const myId = window.Shaadi.myId();
    if (state && state.players && !state.players[myId]) {
      const base = charData.baseName || playerName || 'Guest';
      const col  = charData.color || '#e11d48';
      window.Shaadi.join(base, col, charData, charData.gender || gender);
    }
  }, [ready, joined, charData, state.players, state.sessionId, sessionId]);

  function handleJoin(displayName, char, g) {
    setPlayerName(displayName);
    setJoined(true);
    if (char) setCharData(char);
    if (g) setGender(g);
    // Capture the generation we're joining under so a later reset evicts us.
    const sid = (window.Shaadi.getState() || {}).sessionId || null;
    setSessionId(sid);
    try {
      localStorage.setItem(`sm-joined-${_ROOM}`, '1');
      localStorage.setItem(`sm-name-${_ROOM}`, displayName);
      if (char) localStorage.setItem(`sm-char-${_ROOM}`, JSON.stringify(char));
      if (g) localStorage.setItem(`sm-gender-${_ROOM}`, g);
      if (sid) localStorage.setItem(`sm-session-${_ROOM}`, sid);
    } catch {}
  }

  function handleVoted(suitorId, roundId) {
    setMyVotes(v => {
      const next = { ...v, [roundId]: suitorId };
      try { localStorage.setItem(`sm-votes-${_ROOM}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  if (!joined) {
    const { phase: _phase, roundIndex: _ri } = state;
    const canJoin = !_phase || _phase === 'lobby' || _phase === 'gallery' ||
      (_ri === 0 && (_phase === 'roundIntro' || _phase === 'voting'));
    if (!canJoin) return (
      <div className="player-bg screen" style={{alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:20}}>
          <div style={{fontSize:'4rem',lineHeight:1}}>🔒</div>
          <p className="display" style={{fontSize:'1.5rem',color:'#fde68a'}}>Game in progress</p>
          <p className="caps" style={{fontSize:'.5rem',color:'rgba(253,230,138,.7)',letterSpacing:'.18em'}}>Joining is closed</p>
        </div>
      </div>
    );
    return <PlayerJoin onJoin={handleJoin} />;
  }

  const { phase, roundIndex } = state;
  const round = window.ROUNDS[roundIndex];

  if (phase === 'lobby') {
    return <PlayerCharacterWait charData={charData} />;
  }
  if (phase === 'gallery') {
    return <PlayerGallery state={state} playerName={playerName} gender={gender} />;
  }
  if (phase === 'roundIntro') {
    return <PlayerWaiting phase="roundIntro" roundIndex={roundIndex} playerName={playerName} />;
  }
  if (phase === 'voting') {
    if (round && myVotes[round.id]) {
      // Already voted this round — show confirmation waiting
      return <PlayerWaiting phase="lock" roundIndex={roundIndex} playerName={playerName} />;
    }
    return <PlayerVoting roundIndex={roundIndex} onVoted={handleVoted} gender={gender} />;
  }
  if (phase === 'lock') {
    return <PlayerWaiting phase="lock" roundIndex={roundIndex} playerName={playerName} />;
  }
  if (phase === 'results') {
    return <PlayerResults state={state} roundIndex={roundIndex} gender={gender} myVotes={myVotes} />;
  }
  if (phase === 'finale' || phase === 'ended') {
    return <PlayerFinale myVotes={myVotes} playerName={playerName} gender={gender} />;
  }

  return <PlayerWaiting phase={phase} roundIndex={roundIndex} playerName={playerName} />;
}

window.PlayerApp = PlayerApp;
