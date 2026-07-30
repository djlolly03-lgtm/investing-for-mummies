// v3 — Matrix / Barbie styled, <=0.7s cuts. Reuses footage + 2 B-roll clips.
const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const CL = '/Users/lollyg/Documents/investing for Mummies/CLAUDE';
const C = `${R}/clips`, S = `${R}/shots`;
const MX = `${C}/broll_matrix.mp4`, BB = `${C}/broll_barbie.mp4`;

// timeline generator: builds ~18 fast shots from clips+screens, places texts, intersperses B-roll.
function gen(o){
  const MOTV=['punchin','punchout','panR','punchin2','panL'];
  const MOTI=['punchin','shake','panU','punchin2','punchout','panL'];
  const frags=[]; (o.vids||[]).forEach(v=>(v.ins||[0]).forEach(i=>frags.push({src:v.src,in:i})));
  const imgs=o.imgs||[]; const texts=o.texts||[];
  const shots=[{type:'broll',dur:0.6,motion:'punchin',text:texts[0]}];
  let fi=0,ii=0,k=0;
  for(let n=0;n<17;n++){ const cyc=n%4; let s;
    if(cyc===3){ s={type:'broll',dur:0.4,motion:k%2?'punchin2':'punchin'}; }
    else if(cyc%2===0 && imgs.length){ s={type:'img',src:imgs[ii%imgs.length],dur:0.55,motion:MOTI[k%MOTI.length]}; ii++; }
    else if(frags.length){ const fr=frags[fi%frags.length]; s={type:'video',src:fr.src,in:fr.in,dur:0.48,motion:MOTV[k%MOTV.length]}; fi++; }
    else { s={type:'img',src:imgs[ii%Math.max(1,imgs.length)],dur:0.55,motion:MOTI[k%MOTI.length]}; ii++; }
    shots.push(s); k++;
  }
  // place texts[1..] on spaced non-broll shots
  const nb=shots.filter(s=>s.type!=='broll' && !s.text); let tj=1;
  for(let p=0;p<nb.length && tj<texts.length;p+=2){ nb[p].text=texts[tj++]; }
  return { styleKind:o.styleKind, title:o.title, url:'investingformummies.com', theme:{}, broll:o.broll,
    audio:o.audio, endDur:2.2, endLines:o.endLines, endCta:o.endCta, endSub:'One of 11 money games by IFM', shots };
}
const M = (id,pos,big,opt={}) => ({id,pos,big,...opt});

module.exports = {
  // ===== MATRIX (hand-tuned pilot) =====
  stockrush: {
    styleKind:'matrix', title:'Stock Rush', url:'investingformummies.com',
    theme:{}, broll:MX, audio:`${C}/sd_stockrush.mp4`, endDur:2.2,
    endLines:['STOCK','RUSH'], endCta:'> PLAY IT FREE IN CLASS', endSub:'One of 11 money games by IFM',
    shots:[
      { type:'broll', dur:0.6, motion:'punchin', text:M('hook','center','Run a *real* market',{kicker:'a live classroom game',size:120}) },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:0.2, dur:0.6, motion:'punchin' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.6, motion:'punchin', text:M('lead','bottom','The *live leaderboard*',{kicker:'teacher view',size:92}) },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.45, motion:'shake' },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:2.6, dur:0.5, motion:'punchout' },
      { type:'img', src:`${S}/stockrush_player.png`, dur:0.6, motion:'punchin', text:M('trade','bottom','*Buy low,* sell high',{kicker:'student view',size:96}) },
      { type:'img', src:`${S}/stockrush_player.png`, dur:0.45, motion:'panU' },
      { type:'broll', dur:0.4, motion:'punchin2' },
      { type:'video', src:`${C}/sd_react.mp4`, in:0.5, dur:0.55, motion:'punchin2' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.5, motion:'panL' },
      { type:'img', src:`${S}/stockrush_player.png`, dur:0.6, motion:'shake', text:M('beat','center','Beat the *market*',{size:112}) },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:3.6, dur:0.55, motion:'panR' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.45, motion:'punchout' },
      { type:'broll', dur:0.4, motion:'punchin' },
      { type:'video', src:`${C}/sd_react.mp4`, in:2.0, dur:0.55, motion:'punchin' },
      { type:'img', src:`${S}/stockrush_player.png`, dur:0.5, motion:'punchin2' },
      { type:'img', src:`${S}/stockrush_host.png`, dur:0.6, motion:'shake', text:M('win','bottom','Who *wins?*',{kicker:'last one standing',size:128}) },
      { type:'video', src:`${C}/sd_stockrush.mp4`, in:1.0, dur:0.5, motion:'punchout' },
      { type:'broll', dur:0.4, motion:'punchin2' },
      { type:'video', src:`${C}/sd_react.mp4`, in:3.2, dur:0.55, motion:'punchin' },
    ],
  },
  // ===== BARBIE (hand-tuned pilot) =====
  moneymap: {
    styleKind:'barbie', title:'Money Map', url:'investingformummies.com',
    theme:{}, broll:BB, audio:`${C}/sd_moneymap.mp4`, endDur:2.2,
    endLines:['MONEY','MAP'], endCta:'Play it free', endSub:'One of 11 money games by IFM',
    shots:[
      { type:'broll', dur:0.6, motion:'punchin', text:M('hook','center','Where did it all *go?*',{kicker:'gen-z money game',size:104}) },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:0.2, dur:0.6, motion:'punchin' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.6, motion:'punchin', text:M('track','bottom','Track *every ₹*',{kicker:'money map',size:104}) },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.45, motion:'shake' },
      { type:'broll', dur:0.4, motion:'punchin2' },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:2.0, dur:0.55, motion:'punchout' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.5, motion:'panU', text:M('leak','bottom','Fix it *fast*',{kicker:'spot the leaks',size:112}) },
      { type:'broll', dur:0.4, motion:'punchin' },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:1.0, dur:0.55, motion:'punchin2' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.5, motion:'panL' },
      { type:'broll', dur:0.45, motion:'shake', text:M('fun','center','Budgeting *but cute*',{size:98}) },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:3.0, dur:0.5, motion:'punchout' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.5, motion:'punchin' },
      { type:'broll', dur:0.4, motion:'punchin2' },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:0.5, dur:0.55, motion:'panR' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.5, motion:'punchin2' },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:1.8, dur:0.5, motion:'punchin' },
      { type:'img', src:`${S}/moneymap_1.png`, dur:0.6, motion:'shake', text:M('cta','bottom','Your *money map*',{kicker:'free · no judgement',size:102}) },
      { type:'broll', dur:0.4, motion:'punchin' },
      { type:'video', src:`${C}/sd_moneymap.mp4`, in:2.5, dur:0.5, motion:'punchin2' },
    ],
  },

  // ===== MATRIX (generated) =====
  'lifestyle-time-machine': gen({ styleKind:'matrix', title:'Lifestyle Time Machine', broll:MX, audio:`${C}/sd_hook.mp4`,
    endLines:['LIFESTYLE','TIME MACHINE'], endCta:'> PLAY IT FREE',
    vids:[{src:`${C}/sd_hook.mp4`,ins:[0.2,2.6]},{src:`${C}/sd_react.mp4`,ins:[1,3]}], imgs:[`${S}/ltm_hero.png`,`${S}/ltm_reveal.png`,`${S}/ltm_dreams.png`],
    texts:[ M('h','center','Can you afford *your future?*',{kicker:'a classroom money game',size:92}),
            M('d','bottom','Build your *dream life*',{kicker:'round 1',size:92}),
            M('r','bottom','Prices *explode*',{kicker:'5 years later',size:110}),
            M('i','center','Time-travel your *money*',{size:92}) ] }),

  nwv: gen({ styleKind:'matrix', title:'Need / Want / Value', broll:MX, audio:`${C}/sd_nwv.mp4`,
    endLines:['NEED·WANT','VALUE'], endCta:'> PLAY IT FREE',
    vids:[{src:`${C}/sd_nwv.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/nwv_1.png`,`${S}/nwv_2.png`],
    texts:[ M('h','center','Need it? Want it? *Or gold?*',{kicker:'a spending game',size:86}),
            M('a','bottom','Need · Want · *Value*',{kicker:'sort it',size:88}),
            M('b','bottom','Spot the *traps*',{size:112}) ] }),

  buckets: gen({ styleKind:'matrix', title:'3 Buckets', broll:MX, audio:`${C}/sd_buckets.mp4`,
    endLines:['THE 3','BUCKETS'], endCta:'> PLAY IT FREE',
    vids:[{src:`${C}/sd_buckets.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/buckets_1.png`,`${S}/buckets_2.png`],
    texts:[ M('h','center','Split your *salary*',{kicker:'a budgeting game',size:100}),
            M('a','bottom','Into *3 buckets*',{kicker:'pour it out',size:100}),
            M('b','bottom','Find your *mix*',{size:116}) ] }),

  srpro: gen({ styleKind:'matrix', title:'Stock Rush PRO', broll:MX, audio:`${C}/sd_srpro.mp4`,
    endLines:['STOCK RUSH','PRO'], endCta:'> THE ADVANCED SIM',
    vids:[{src:`${C}/sd_srpro.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/srpro_host.png`,`${S}/srpro_player.png`],
    texts:[ M('h','center','Beat the *market?*',{kicker:'advanced mode',size:104}),
            M('a','bottom','Trade *real history*',{kicker:'6 corporate actions',size:88}),
            M('b','center','PRO *mode*',{size:124}) ] }),

  hidden: gen({ styleKind:'matrix', title:'Hidden Fortunes', broll:MX, audio:`${C}/sd_hidden.mp4`,
    endLines:['HIDDEN','FORTUNES'], endCta:'> PLAY IT FREE',
    vids:[{src:`${C}/sd_hidden.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/hidden_1.png`,`${S}/hidden_2.png`],
    texts:[ M('h','center','What’s in your *habits?*',{kicker:'a money game',size:92}),
            M('a','bottom','Watch it *compound*',{kicker:'reveal',size:92}),
            M('b','bottom','Hidden *fortunes*',{size:104}) ] }),

  swayamvar: gen({ styleKind:'matrix', title:'Swayamvar', broll:MX, audio:`${C}/sd_react.mp4`,
    endLines:['SWAYAMVAR'], endCta:'> PLAY IT FREE',
    vids:[{src:`${CL}/content/teasers/swayamvar-teaser.mp4`,ins:[0.5,4,8,11]}], imgs:[],
    texts:[ M('h','center','Find the right *rishta*',{kicker:'investment matchmaking',size:90}),
            M('a','bottom','Equity? Gold? *Debt?*',{kicker:'meet the suitors',size:88}),
            M('b','center','Pick *the one*',{size:118}) ] }),

  fundgoal: gen({ styleKind:'matrix', title:'Fund YOUR Goal', broll:MX, audio:`${C}/sd_fundgoal.mp4`,
    endLines:['FUND YOUR','GOAL'], endCta:'> FREE SIP PLANNER',
    vids:[{src:`${C}/sd_fundgoal.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/fundgoal_1.png`,`${S}/fundgoal_2.png`],
    texts:[ M('h','center','Got a goal? *Get the plan.*',{kicker:'a money tool',size:84}),
            M('a','bottom','Fund *your goal*',{kicker:'goal-based sip',size:96}),
            M('b','bottom','Start *today*',{size:118}) ] }),

  wealth: gen({ styleKind:'matrix', title:'The Wealth Conversation', broll:MX, audio:`${C}/sd_react.mp4`,
    endLines:['THE WEALTH','CONVERSATION'], endCta:'> A SPECIAL EXPERIENCE',
    vids:[{src:`${CL}/wealth-conversation/chapter1-hero.mp4`,ins:[0,2]},{src:`${CL}/wealth-conversation/chapter5-hero.mp4`,ins:[0,2]}], imgs:[`${S}/wealth_1.png`],
    texts:[ M('h','center','The talk families *avoid*',{kicker:'a special experience',size:84}),
            M('a','bottom','Watch · *reflect* · talk',{kicker:'interactive',size:84}),
            M('b','bottom','Wealth *conversation*',{size:84}) ] }),

  // ===== BARBIE (generated) =====
  bbf: gen({ styleKind:'barbie', title:'Broke by Friday', broll:BB, audio:`${C}/sd_bbf.mp4`,
    endLines:['BROKE BY','FRIDAY'], endCta:'Play it free',
    vids:[{src:`${C}/sd_bbf.mp4`,ins:[0.2,2.6]}], imgs:[`${S}/bbf_1.png`,`${S}/bbf_2.png`],
    texts:[ M('h','center','Survive on *₹10,000?*',{kicker:'a chaotic money sim',size:96}),
            M('a','bottom','Broke by *Friday*',{kicker:'28 days',size:100}),
            M('b','bottom','One wrong *swipe*',{size:104}) ] }),
};
