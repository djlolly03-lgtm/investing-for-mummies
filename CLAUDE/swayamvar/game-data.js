/* Swayamvar — game data v2
   Six asset classes. Four questions. One portfolio. */

window.SHAADI_CONFIG = {
  joinUrl:      'ifm.game/swayamvar',
  roomCode:     '1995',
  gameKey:      'shaadi',
};

/* ── Six Suitors (asset classes as matrimonial prospects) ─────────── */
window.SUITORS = [
  {
    id:        'cash',
    monogram:  '💵',
    bioCard: {
      tagline:    'Always Available',
      occupation: 'Emergency Response Specialist',
      bio:        ['📞 Need me at 2 AM?', "I'm already downstairs.", '🚕 No waiting.', 'No drama.', 'No questions asked.'],
      strengths:  ['Always available', 'Extremely dependable', 'Loves emergencies', 'Never ghosts'],
      redFlags:   ['Zero ambition', 'Career growth stalled years ago', 'Inflation keeps stealing his confidence'],
      friendsSay: "Wonderful person. Just don't ask about future plans.",
      represents: 'CASH',
      badge:      { tag: '24/7', l1: 'EMERGENCY CONTACT', l2: 'ALWAYS ONLINE' },
    },
    portrait:  'img/cash.webp',
    name:      'Mr. Cash Khan',
    aka:       '"Always Available"',
    accent:    '#059669',
    accentLt:  '#34d399',
    cardBg:    'linear-gradient(135deg,#064e3b,#065f46)',
    profession:'Emergency Response Specialist',
    family:    'Always at home. Never makes you wait.',
    age:       'Loses value quietly every single year',
    tagline:   "Wonderful person. Just don't ask about future plans.",
    bio:       'Need me at 2 AM? I\'m already downstairs. No waiting. No drama. No questions asked. Leave me in a savings account too long and inflation eats me alive — quietly, every single month.',
    greenFlags:['Always available — zero lock-in, no KYC','Extremely dependable — never ghosts','Perfect for emergencies: instantly liquid'],
    redFlags:  ['Zero ambition — career growth stalled years ago','Inflation keeps quietly stealing his confidence every month','Too easy to spend "just this once"'],
    returnLabel:'~3–4%',
    riskLabel:  'Near zero',
    bucket:    'emergency',
  },
  {
    id:        'debt',
    monogram:  '📜',
    bioCard: {
      tagline:    'The Green Flag',
      occupation: 'Senior Manager, Stability Department',
      bio:        ['📊 Colour-coded spreadsheets.', '⏰ Sleeps by 10 PM.', '📅 Plans vacations six months in advance.'],
      strengths:  ['Responsible', 'Predictable', 'Delivers on promises', 'Rarely causes stress'],
      redFlags:   ['Not exciting', 'Never trends on social media', "Doesn't believe in drama"],
      friendsSay: 'The guy we ignored in our twenties.',
      represents: 'DEBT',
      badge:      { tag: 'AAA', l1: 'STABILITY DEPT', l2: 'NEVER DEFAULTS' },
    },
    portrait:  'img/debt.webp',
    name:      'Mr. Debt Sharma',
    aka:       '"The Green Flag" · FDs, Bonds, Debt Funds',
    accent:    '#1d4ed8',
    accentLt:  '#60a5fa',
    cardBg:    'linear-gradient(135deg,#1e1b4b,#1e3a8a)',
    profession:'Senior Manager, Stability Department',
    family:    'Three generations of bank employees.',
    age:       'Reliable to a fault',
    tagline:   'The guy we ignored in our twenties.',
    bio:       'Colour-coded spreadsheets. Sleeps by 10 PM. Plans vacations six months in advance. He delivers on every promise and rarely causes stress. He\'s the backbone any portfolio needs — he just won\'t make you rich.',
    greenFlags:['Responsible — delivers on every promise','Predictable — you get exactly what was agreed','Rarely causes stress or volatility'],
    redFlags:  ['Not exciting — never trends on social media','Doesn\'t believe in drama (or outsized returns)','Barely beats inflation over the long run'],
    returnLabel:'6–8%',
    riskLabel:  'Low',
    bucket:    'stability',
  },
  {
    id:        'gold',
    monogram:  '🥇',
    bioCard: {
      tagline:    'Family Favourite Since 3000 BC',
      occupation: 'Wedding Guest Of Honour',
      bio:        ['👵 Grandma approves.', '👩 Mom approves.', '👩‍🦳 Bua definitely approves.'],
      strengths:  ['Universally trusted', 'Survives crises', 'Always invited', 'Timeless appeal'],
      redFlags:   ['Sometimes just sits there looking pretty', 'Relatives may overhype him'],
      friendsSay: 'Excellent references.',
      represents: 'GOLD',
      badge:      { tag: '24K', l1: 'FAMILY APPROVED', l2: 'SINCE 3000 BC' },
    },
    portrait:  'img/gold.webp',
    name:      'Mr. Gold Malhotra',
    aka:       '"Family Favourite Since 3000 BC"',
    accent:    '#b45309',
    accentLt:  '#fcd34d',
    cardBg:    'linear-gradient(135deg,#451a03,#78350f)',
    profession:'Wedding Guest Of Honour',
    family:    'Already lives in your locker.',
    age:       'Timeless. Literally.',
    tagline:   'Excellent references.',
    bio:       'Grandma approves. Mom approves. Bua definitely approves. Universally trusted, survives every crisis, and has timeless appeal. But let\'s be honest — he earns nothing, pays no rent, and just sits there looking expensive.',
    greenFlags:['Universally trusted across generations','Survives every crisis — rises when everything else falls','Timeless appeal — globally liquid'],
    redFlags:  ['Sometimes just sits there looking pretty','Relatives may significantly overhype him','Earns zero income — no dividends, no rent'],
    returnLabel:'8–10%*',
    riskLabel:  'Medium',
    bucket:    'stability',
  },
  {
    id:        'realestate',
    monogram:  '🏠',
    bioCard: {
      tagline:    'Owns Property',
      occupation: 'Landlord',
      bio:        ['🏠 Owns land.', 'Need I say more?'],
      strengths:  ['Tangible', 'Impressive', 'Makes family WhatsApp groups proud', 'Commands attention'],
      redFlags:   ['High maintenance', 'Requires commitment', 'Difficult breakup process'],
      friendsSay: 'Very attractive. Comes with paperwork.',
      represents: 'REAL ESTATE',
      badge:      { tag: 'SQ FT', l1: 'PRIME LOCATION', l2: 'TITLE VERIFIED' },
    },
    portrait:  'img/realestate.webp',
    name:      'Mr. Real Estate Singh',
    aka:       '"Owns Property"',
    accent:    '#7c3aed',
    accentLt:  '#c4b5fd',
    cardBg:    'linear-gradient(135deg,#2e1065,#4c1d95)',
    profession:'Landlord',
    family:    'Big house. Bigger loan.',
    age:       'Comes with a 20-year EMI',
    tagline:   'Very attractive. Comes with paperwork.',
    bio:       'Owns land. Need I say more? Tangible, impressive, and makes every family WhatsApp group very proud. High maintenance, requires serious commitment, and the breakup process takes months.',
    greenFlags:['Tangible — you can see it, touch it, show it off','Impressive — commands respect at every gathering','Makes the family WhatsApp group extremely proud'],
    redFlags:  ['High maintenance — stamp duty, brokerage, repairs add up','Requires commitment — 20-year EMIs are non-negotiable','Difficult breakup — months to sell, no quick exits'],
    returnLabel:'8–12%+',
    riskLabel:  'Medium–High',
    bucket:    'growth',
  },
  {
    id:        'equity',
    monogram:  '📈',
    bioCard: {
      tagline:    'Serial Entrepreneur',
      occupation: 'Founder & CEO',
      bio:        ['🚀 Dreams big.', '📈 Thinks bigger.', '📉 Occasionally has public breakdowns.'],
      strengths:  ['Ambitious', 'Wealth creator', 'Long-term winner', 'Loves growth'],
      redFlags:   ['Mood swings', 'Emotional rollercoaster', 'Not suitable for panic callers'],
      friendsSay: 'Exhausting. But worth it.',
      represents: 'EQUITY',
      badge:      { tag: 'IPO', l1: 'HIGH GROWTH', l2: 'BUCKLE UP' },
    },
    portrait:  'img/equity.webp',
    name:      'Mr. Equity Mehta',
    aka:       '"Serial Entrepreneur" · Stocks, Mutual Funds, SIPs',
    accent:    '#be185d',
    accentLt:  '#f9a8d4',
    cardBg:    'linear-gradient(135deg,#4c0519,#881337)',
    votePos:   'center center',
    profession:'Founder & CEO',
    family:    'Humble beginnings. Brilliant prospects.',
    age:       'Best after a 10-year courtship',
    tagline:   'Exhausting. But worth it.',
    bio:       'Dreams big. Thinks bigger. Occasionally has very public breakdowns. Up 40%, down 35%, back up again. But give him 10 years and a standing SIP and he quietly becomes the wealthiest suitor in the room. Nifty 50 CAGR since inception: ~12%.',
    greenFlags:['Ambitious wealth creator — 12–15% CAGR historically','Start with ₹500/month — no minimum required','Liquid: sell and receive money in 2 working days'],
    redFlags:  ['Mood swings — dropped 58% in 2008, 38% in 2020','Not suitable for panic callers who check every day','Needs 7+ year horizon — impatience destroys returns'],
    returnLabel:'12–15%',
    riskLabel:  'High (short), Low (long)',
    bucket:    'growth',
  },
  {
    id:        'alternatives',
    monogram:  '🎨',
    bioCard: {
      tagline:    'Influencer',
      occupation: 'Professional Trend',
      bio:        ['📸 Probably on Instagram.', '🎙 Or a podcast.', '🖼 Or launching an NFT collection.'],
      strengths:  ['Interesting', 'Unique', 'Occasionally brilliant', 'Great conversation starter'],
      redFlags:   ['Nobody fully understands him', 'Highly unpredictable', 'May disappear without notice'],
      friendsSay: 'Genius or disaster. No middle ground.',
      represents: 'ALT INVESTMENTS',
      badge:      { tag: 'NFT', l1: 'TRENDING NOW', l2: 'HANDLE WITH CARE' },
    },
    portrait:  'img/alternatives.webp',
    name:      'Mr. Alt Investments Oberoi',
    aka:       '"Influencer" · Crypto, Startups, Art, P2P',
    accent:    '#ea580c',
    accentLt:  '#fdba74',
    cardBg:    'linear-gradient(135deg,#431407,#7c2d12)',
    votePos:   'center center',
    profession:'Professional Trend',
    family:    'Lambo in the DP. Lives with parents.',
    age:       'Up 80% since breakfast',
    tagline:   'Genius or disaster. No middle ground.',
    bio:       'Probably on Instagram. Or a podcast. Or launching an NFT collection. Interesting, unique, occasionally brilliant — but nobody fully understands him, including him. Keep him to 5–10% of your portfolio at most.',
    greenFlags:['Interesting — great conversation starter at every party','Potential for outsized, asymmetric returns','True diversification from traditional assets'],
    redFlags:  ['Nobody fully understands him (including him)','Highly unpredictable — may disappear without any notice','Should only be money you can afford to lose entirely'],
    returnLabel:'Wild',
    riskLabel:  'Very High',
    bucket:    'growth',
  },
];

/* ── Gendered suitor variants ─────────────────────────────────────
   Each asset class has a Mr (male) and a Miss (female) presentation.
   Votes are always counted by asset-class id — gender only changes the
   portrait/name shown. Derived fields are added here so the six suitor
   objects above stay the single source of truth. */
// Asset version — bump when re-slicing portrait/card art so browsers and the
// CDN don't serve stale images (filenames stay the same on a re-slice).
const _IMGV = '20260601d';
window.SUITORS.forEach(s => {
  s.nameNeutral = s.name.replace(/^(Mr\.|Ms\.|Miss)\s+/, '');
  s.nameM       = s.name;                  // "Mr. Cash Khan"
  s.nameF       = 'Miss ' + s.nameNeutral; // "Miss Cash Khan"
  s.portraitM   = `img/port-m-${s.id}.webp?v=${_IMGV}`;
  s.portraitF   = `img/port-f-${s.id}.webp?v=${_IMGV}`;
  s.cardM       = `img/card-m-${s.id}.webp?v=${_IMGV}`;
  s.cardF       = `img/card-f-${s.id}.webp?v=${_IMGV}`;
});

/* Which gender of suitor a participant sees, by their own gender:
   M (male) → female suitors · F (female) → male suitors ·
   P (prefer not to say) → mixed set, one card per asset, gender by index
   (stable across gallery + voting, no re-randomisation). */
window.suitorVariant  = (gender, index) =>
  gender === 'M' ? 'f' : gender === 'F' ? 'm' : (index % 2 === 0 ? 'm' : 'f');
window.suitorName     = (s, v) => (v === 'f' ? s.nameF     : s.nameM);
window.suitorPortrait = (s, v) => (v === 'f' ? s.portraitF : s.portraitM);
window.suitorCard     = (s, v) => (v === 'f' ? s.cardF     : s.cardM);

/* ── Four Rounds ─────────────────────────────────────────────────── */
window.ROUNDS = [
  {
    id:         'marry',
    number:     1,
    emoji:      '💍',
    question:   'Who Would You Marry?',
    subtitle:   'You need one partner for the next 30 years.\nNot a fling. Not a situationship.\nA proper life partner.',
    cta:        'Who gets your vote?',
    animation:  'wedding',
    leaderboardTitle: 'Most Marriage Proposals Received',
    discussTitle: 'What made you choose them?',
    discuss:    [
      'What qualities mattered most? Trust? Growth? Stability? Security?',
      'Most people vote Equity for the long run — and the data agrees. Nifty 50 CAGR ~12% since inception.',
      'But notice: almost nobody voted Cash. Why? Because we know deep down that safety alone isn\'t enough.',
      'This is the Growth Bucket — your money\'s life partner for 10–30 years.',
    ],
    teachBucket: 'growth',
  },
  {
    id:         'date',
    number:     2,
    emoji:      '❤️',
    question:   'Who Would You Date?',
    subtitle:   'Exciting. Fun. Interesting.\nNot necessarily forever.',
    cta:        'Who would you swipe right for?',
    animation:  'hearts',
    leaderboardTitle: 'Most First Dates Secured',
    discussTitle: 'Why are we attracted to excitement?',
    discuss:    [
      'Why do we love the exciting ones when we\'re not "serious"?',
      'Alternatives are thrilling — crypto, startups, art. Just don\'t build your retirement plan the same way.',
      'The lesson: allocate your excitement. A small Alternatives slice (5–10%) gives you the thrill without the disaster.',
      'This is the Alternative Investments edge — exciting, speculative, and strictly limited.',
    ],
    teachBucket: 'growth',
  },
  {
    id:         'mum',
    number:     3,
    emoji:      '👩',
    question:   "Who Would Your Mother Choose?",
    subtitle:   "Let's be honest.\nYou don't get a vote.",
    cta:        'Who does Mum approve of?',
    animation:  'whatsapp',
    leaderboardTitle: "Mother's Choice Awards",
    discussTitle: 'Why did previous generations love these?',
    discuss:    [
      'Gold and Real Estate dominate Mum\'s list — and she\'s not wrong. They worked for her generation.',
      'From 1970–2000: high inflation, closed capital markets, no mutual funds. Gold and property made sense.',
      'Today: SIPs, index funds, digital gold. The tools have changed, but Mum\'s instincts are sound.',
      'Gold and Real Estate belong in the Stability Bucket — your portfolio\'s anchor against uncertainty.',
    ],
    teachBucket: 'stability',
  },
  {
    id:         'emergency',
    number:     4,
    emoji:      '📞',
    question:   'Who Would You Call at 2 AM?',
    subtitle:   'Financial emergency.\nNeed money immediately.\nWho answers first?',
    cta:        'Who\'s your emergency contact?',
    animation:  'phone',
    leaderboardTitle: 'Emergency Contact Rankings',
    discussTitle: 'The one nobody marries. Everyone calls.',
    discuss:    [
      'Nobody marries Cash. Nobody dates Cash. Yet everyone calls Cash at 2 AM.',
      'Liquidity: the ability to convert an asset to cash quickly, without losing value.',
      'Real Estate: 6 months to sell. Gold: okay. Equity: 2 days. Cash: instantly.',
      'Every portfolio needs 3–6 months of expenses in the Emergency Bucket — Cash and short-term Debt — before anything else.',
    ],
    teachBucket: 'emergency',
  },
];

/* ── Three Buckets (finale) ──────────────────────────────────────── */
window.BUCKETS = [
  {
    id:         'emergency',
    name:       'Emergency Bucket',
    emoji:      '🛟',
    color:      '#0369a1',
    colorLt:    '#38bdf8',
    bg:         'linear-gradient(135deg,#082f49,#0c4a6e)',
    suitorIds:  ['cash'],
    purpose:    '3–6 months of expenses. The layer you never invest.',
    rule:       'Fill this first — always.',
  },
  {
    id:         'stability',
    name:       'Stability Bucket',
    emoji:      '🛡️',
    color:      '#0f766e',
    colorLt:    '#5eead4',
    bg:         'linear-gradient(135deg,#042f2e,#134e4a)',
    suitorIds:  ['debt','gold','realestate'],
    purpose:    'Capital protection. Inflation hedge. 1–7 year goals.',
    rule:       'Anchors the portfolio when growth stumbles.',
  },
  {
    id:         'growth',
    name:       'Growth Bucket',
    emoji:      '🚀',
    color:      '#be185d',
    colorLt:    '#f9a8d4',
    bg:         'linear-gradient(135deg,#4a0010,#881337)',
    suitorIds:  ['equity','realestate','alternatives'],
    purpose:    'Wealth creation. 7+ year horizon. Beat inflation decisively.',
    rule:       'Time is the ingredient. Patience is the secret.',
  },
];

/* ── Lobby character titles (assigned by gender on join) ────────────
   Two pools, sliced from Participants (M/F).png. A joiner is given a
   random avatar from the pool matching their gender; "Prefer not to
   say" draws from both pools combined. Avatar is fixed for the session. */
window.PARTICIPANTS_F = [
  { emoji:'👑', title:'Maharani Ji',                     action:'has entered the Swayamvar',       img:'img/pf-0.webp'  },
  { emoji:'🏦', title:'Family CFO',                      action:'is reviewing biodatas',           img:'img/pf-1.webp'  },
  { emoji:'📲', title:'Family WhatsApp Admin',           action:'has joined the family group',     img:'img/pf-2.webp'  },
  { emoji:'🧠', title:'Emotional Blackmailer',           action:'requests a private conversation', img:'img/pf-3.webp'  },
  { emoji:'🌺', title:'Bua Supreme',                     action:'has concerns',                    img:'img/pf-4.webp'  },
  { emoji:'🪔', title:'Sanskaar Inspector',              action:'is checking references',          img:'img/pf-5.webp'  },
  { emoji:'🎯', title:'Future Grandchildren Strategist', action:'likes this match',                img:'img/pf-6.webp'  },
  { emoji:'📜', title:'Biodata Reviewer',                action:'has shortlisted a candidate',     img:'img/pf-7.webp'  },
  { emoji:'🏠', title:'Property Mom',                    action:'asks, "Own house?"',              img:'img/pf-8.webp'  },
  { emoji:'🥇', title:'Gold Mom',                        action:'has already made her decision',   img:'img/pf-9.webp'  },
  { emoji:'💪', title:'Shaadi Workout Mom',              action:'keeps raising the standards',     img:'img/pf-10.webp' },
  { emoji:'🤳', title:'Influencer Mom',                  action:'curates the perfect image',       img:'img/pf-11.webp' },
];
window.PARTICIPANTS_M = [
  { emoji:'🤵', title:'Quiet Billionaire',          action:"doesn't need to speak — it's handled", img:'img/pm-0.webp'  },
  { emoji:'🤝', title:'Networking Specialist',      action:'knows everyone. Especially you.',      img:'img/pm-1.webp'  },
  { emoji:'🚀', title:'Startup Exit Legend',        action:'did something once. Retired twice.',   img:'img/pm-2.webp'  },
  { emoji:'🛫', title:'Lounge Access Collector',    action:'has more lounges than relationships',  img:'img/pm-3.webp'  },
  { emoji:'💳', title:'Points Maximizer',           action:'turns expenses into life experiences', img:'img/pm-4.webp'  },
  { emoji:'🥃', title:'Single Malt Philosopher',    action:'overthinks everything. Especially whisky.', img:'img/pm-5.webp' },
  { emoji:'🏎️', title:'Supercar Reviewer',          action:'0 to 100 in 2.9 seconds. Content first.',   img:'img/pm-6.webp' },
  { emoji:'🏝️', title:'Holiday Home Owner',         action:'lives where you vacation',             img:'img/pm-7.webp'  },
  { emoji:'🎙️', title:'Podcast Guest',              action:'has an opinion on everything',         img:'img/pm-8.webp'  },
  { emoji:'⛳', title:'Weekend Golfer',             action:'claims a 7 handicap. Plays once a month.',  img:'img/pm-9.webp' },
  { emoji:'📊', title:'Macro Economist',            action:'explains everything. Understands nothing.', img:'img/pm-10.webp' },
  { emoji:'💎', title:'Old Money Representative',    action:"legacy isn't built — it's inherited",  img:'img/pm-11.webp' },
];
/* Backward-compat alias for any code still referencing the old name. */
window.LOBBY_CHARACTERS = window.PARTICIPANTS_F;

/* Pick a random avatar from the pool matching the given gender. */
window.pickAvatar = (gender) => {
  const pool = gender === 'M' ? window.PARTICIPANTS_M
             : gender === 'F' ? window.PARTICIPANTS_F
             : window.PARTICIPANTS_M.concat(window.PARTICIPANTS_F);
  return pool[Math.floor(Math.random() * pool.length)];
};

/* ── Voting choices labels ───────────────────────────────────────── */
window.VOTE_VERB = {
  marry:     'You\'d marry',
  date:      'You\'d date',
  mum:       'Mum would choose',
  emergency: 'You\'d call',
};
