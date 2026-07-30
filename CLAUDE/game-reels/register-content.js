// Register the 11 game reels on the IFM content hub:
//  - copy reels into content/reels/
//  - generate poster thumbnails into content/thumbs/
//  - insert catalogue entries into content/data.js
const fs = require('fs');
const { execSync } = require('child_process');
const CL = '/Users/lollyg/Documents/investing for Mummies/CLAUDE';
const OUT = `${CL}/game-reels/out`;
const REELS = `${CL}/content/reels`;
const THUMBS = `${CL}/content/thumbs`;
const DATA = `${CL}/content/data.js`;
const VBASE = 'https://ifm-deploy.vercel.app/content/reels';

const R = [
  { key:'moneymap', file:'moneymap-15s.mp4', id:'IFM-R01', title:'Money Map — game reel',
    desc:"15s 9:16 promo reel. Opens on Seedance-animated real budgeting-workshop footage with the hook 'Where does your money actually go?', cuts to punch-ins of the purple Money Map budget tracker ('Every rupee, mapped'), closes on the round IFM end-card. Gen-Z budget tracker.",
    kw:'reel, money map, budget tracker, gen z, game promo, 9x16, vertical' },
  { key:'bbf', file:'bbf-15s.mp4', id:'IFM-R02', title:'Broke by Friday — game reel',
    desc:"15s 9:16 reel. Hook over real classroom footage — 'Survive the month on ₹10,000?' — into the Broke by Friday life-sim screens ('Will you make it?'), coral/gold theme, IFM end-card.",
    kw:'reel, broke by friday, life sim, gen z, game promo, vertical' },
  { key:'nwv', file:'nwv-15s.mp4', id:'IFM-R03', title:'Need / Want / Value — game reel',
    desc:"15s 9:16 reel. Workshop crane-shot hook 'Need it? Want it? Or gold?' into the Need·Want·Value sorting screens ('Build mindful habits'), navy/blue theme, IFM end-card.",
    kw:'reel, need want value, mindful spending, sorting game, vertical' },
  { key:'buckets', file:'buckets-15s.mp4', id:'IFM-R04', title:'3 Buckets — game reel',
    desc:"15s 9:16 reel. 'How should you split your salary?' over real workshop footage, into the 3 Buckets sorting game ('Find your ideal split'), green/gold theme, IFM end-card.",
    kw:'reel, 3 buckets, salary split, budgeting game, vertical' },
  { key:'stockrush', file:'stockrush-15s.mp4', id:'IFM-R05', title:'Stock Rush — game reel',
    desc:"15s 9:16 reel mixing teacher + student views. Real students watching a live leaderboard (Seedance) → host leaderboard screen ('Teacher view') → player trading screen ('Student view'), black/green market theme, IFM end-card.",
    kw:'reel, stock rush, stock market game, classroom, teacher student, vertical' },
  { key:'srpro', file:'srpro-15s.mp4', id:'IFM-R06', title:'Stock Rush PRO — game reel',
    desc:"15s 9:16 reel, premium black/gold. Mentor-at-whiteboard hook 'Think you can beat the market?' into advanced trading screens ('Trade like a pro'), IFM end-card. NOTE: uses Stock Rush board as stand-in — SR PRO app did not render at capture.",
    kw:'reel, stock rush pro, advanced trading, portfolio, vertical' },
  { key:'hidden', file:'hidden-15s.mp4', id:'IFM-R07', title:'Hidden Fortunes — game reel',
    desc:"15s 9:16 reel, teal/gold. 'What's hiding in your daily habits?' over real footage → Hidden Fortunes SIP-projection screens ('Watch it compound'), IFM end-card.",
    kw:'reel, hidden fortunes, sip, compounding, vertical' },
  { key:'swayamvar', file:'swayamvar-15s.mp4', id:'IFM-R08', title:'Swayamvar — game reel',
    desc:"15s 9:16 reel built from the festive Swayamvar teaser. Marigold/pink theme, photoreal suitors (Mr Equity, Miss Gold, Mr Debt), 'Your money needs the right rishta' → 'Pick the one', IFM end-card. Investment matchmaking game.",
    kw:'reel, swayamvar, matchmaking, festive, investment products, vertical' },
  { key:'fundgoal', file:'fundgoal-15s.mp4', id:'IFM-R09', title:'Fund YOUR Goal — game reel',
    desc:"15s 9:16 reel, teal. 'Got a goal? Get the plan.' over real footage → the Fund YOUR Goal SIP calculator + cost-of-delay screen ('Start today, not someday'), IFM end-card.",
    kw:'reel, fund your goal, sip calculator, goal based, vertical' },
  { key:'wealth', file:'wealth-15s.mp4', id:'IFM-R10', title:'The Wealth Conversation — game reel',
    desc:"15s 9:16 reel, premium gold. Cinematic chapter-hero footage, 'The conversation every family avoids' → 'Watch. Reflect. Talk.' → the Wealth Conversation title screen, IFM end-card.",
    kw:'reel, wealth conversation, legacy, reflection, premium, vertical' },
  { key:'ltm', file:'lifestyle-time-machine-15s.mp4', id:'IFM-R11', title:'Lifestyle Time Machine — game reel',
    desc:"15s 9:16 reel. Real class footage hook 'Can you afford your future?' → dream-life game screens → the 2031 inflation reveal ('Same dreams. Lakhs more.') → real students playing, purple/pink theme, IFM end-card.",
    kw:'reel, lifestyle time machine, inflation, compounding, classroom, vertical' },
];

fs.mkdirSync(REELS, { recursive:true });

const entries = R.map(r => {
  const src = `${OUT}/${r.file}`;
  if (!fs.existsSync(src)) { console.log('MISSING', r.file); return null; }
  // copy reel
  fs.copyFileSync(src, `${REELS}/${r.file}`);
  // poster thumb (hook frame ~1.4s, portrait w600)
  const thumb = `${THUMBS}/${r.id}.jpg`;
  execSync(`ffmpeg -y -ss 1.4 -i "${src}" -frames:v 1 -vf "scale=600:-1" "${thumb}"`, { stdio:'ignore' });
  console.log('ok', r.id, r.key);
  return {
    id: r.id, title: r.title, type: 'Reel', source: 'In-house', venue: 'In-house',
    status: 'Ready', keywords: r.kw, description: r.desc,
    'date created': '2026-06-20',
    notes: 'Auto-built game promo reel (Seedance 2.0 + real screens + IFM branding). 15s 9:16.',
    thumbnail: `thumbs/${r.id}.jpg`,
    video: `${VBASE}/${r.file}`,
  };
}).filter(Boolean);

// insert into data.js right after `"catalogue": [`
let data = fs.readFileSync(DATA, 'utf8');
const marker = '"catalogue": [';
const idx = data.indexOf(marker);
if (idx < 0) throw new Error('catalogue marker not found');
const insertAt = idx + marker.length;
const block = '\n' + entries.map(e => JSON.stringify(e, null, 1)).join(',\n') + ',';
data = data.slice(0, insertAt) + block + data.slice(insertAt);
fs.writeFileSync(DATA, data);
console.log(`\nInserted ${entries.length} reel entries into data.js`);
