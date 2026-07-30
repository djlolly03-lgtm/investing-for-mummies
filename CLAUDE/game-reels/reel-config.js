// Per-game reel configs. Each game = distinct theme + copy + beats.
// beat kinds: 'video' (motion clip), 'ui' (portrait screenshot punch-in), 'end'
// overlay.pos: 'top' | 'bottom'. big: wrap gradient words in *stars*.
const R = '/Users/lollyg/Documents/investing for Mummies/CLAUDE/game-reels';
const C = `${R}/clips`, S = `${R}/shots`;
const CLAUDE = '/Users/lollyg/Documents/investing for Mummies/CLAUDE';

module.exports = {
  moneymap: {
    title: 'Money Map', url: 'investingformummies.com',
    theme: { a:'#2d1b69', b:'#160c33', accA:'#a06bff', accB:'#ff6ec7' },
    audio: `${C}/sd_moneymap.mp4`, endLines:['Money Map'],
    endCta:'Free Gen-Z budget tracker', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_moneymap.mp4`, dur:3.4, ov:{pos:'top', kicker:'A Gen-Z money game', big:'Where does your money *actually go?*', sub:'A budget tracker that never judges.'} },
      { kind:'ui', src:`${S}/moneymap_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Track it live', big:'Every rupee, *mapped*', sub:'Income in. Spending out. Instantly.'} },
      { kind:'ui', src:`${S}/moneymap_1.png`, dur:2.9, zdir:'down', ov:{pos:'bottom', kicker:'Spot the leaks', big:'Fix it *before payday*', sub:'See exactly where it slips away.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  bbf: {
    title: 'Broke by Friday', url:'investingformummies.com',
    theme:{ a:'#2a0f12', b:'#160a0c', accA:'#ff6b6b', accB:'#ffd23f' },
    audio:`${C}/sd_bbf.mp4`, endLines:['Broke by','Friday'],
    endCta:'Free chaotic life-sim', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_bbf.mp4`, dur:3.4, ov:{pos:'top', kicker:'A chaotic money sim', big:'Survive the month on *₹10,000?*', sub:'28 days. Surprise bills. Pure chaos.'} },
      { kind:'ui', src:`${S}/bbf_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'The challenge', big:'Broke by *Friday*', sub:'Make ₹10k last till payday.'} },
      { kind:'ui', src:`${S}/bbf_2.png`, dur:2.9, zdir:'up', ov:{pos:'bottom', kicker:'Every choice costs', big:'Will you *make it?*', sub:'One wrong swipe and you’re broke.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  nwv: {
    title: 'Need · Want · Value', url:'investingformummies.com',
    theme:{ a:'#0d1b2a', b:'#081019', accA:'#3a86ff', accB:'#34c6b3' },
    audio:`${C}/sd_nwv.mp4`, endLines:['Need · Want','· Value'],
    endCta:'Free mindful-spending game', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_nwv.mp4`, dur:3.4, ov:{pos:'top', kicker:'A spending game', big:'Need it? Want it? *Or gold?*', sub:'Sort your spending in seconds.'} },
      { kind:'ui', src:`${S}/nwv_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Three buckets', big:'Need · Want · *Value*', sub:'Where does each purchase belong?'} },
      { kind:'ui', src:`${S}/nwv_2.png`, dur:2.9, zdir:'down', ov:{pos:'bottom', kicker:'Swipe to sort', big:'Build *mindful habits*', sub:'Spot the wants hiding as needs.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  buckets: {
    title: '3 Buckets', url:'investingformummies.com',
    theme:{ a:'#0e2a22', b:'#08160f', accA:'#2ecc71', accB:'#ffd23f' },
    audio:`${C}/sd_buckets.mp4`, endLines:['The 3','Buckets'],
    endCta:'Free salary-split game', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_buckets.mp4`, dur:3.4, ov:{pos:'top', kicker:'A budgeting game', big:'How should you *split your salary?*', sub:'Needs, wants, savings — your mix.'} },
      { kind:'ui', src:`${S}/buckets_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Pour it out', big:'Into *3 buckets*', sub:'Needs. Wants. Savings.'} },
      { kind:'ui', src:`${S}/buckets_2.png`, dur:2.9, zdir:'up', ov:{pos:'bottom', kicker:'Sort every expense', big:'Find your *ideal split*', sub:'The 50/30/20 you actually live by.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  stockrush: {
    title: 'Stock Rush', url:'investingformummies.com',
    theme:{ a:'#0c1410', b:'#060a08', accA:'#00e676', accB:'#34c6b3' },
    audio:`${C}/sd_stockrush.mp4`, endLines:['Stock','Rush'],
    endCta:'Free live classroom market', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_stockrush.mp4`, dur:3.4, ov:{pos:'top', kicker:'A live classroom game', big:'Run a *real stock market* in class', sub:'Teacher projects. Students trade.'} },
      { kind:'ui', src:`${S}/stockrush_host.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'👩‍🏫 Teacher view', big:'The *live leaderboard*', sub:'Project it on the big screen.'} },
      { kind:'ui', src:`${S}/stockrush_player.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'📱 Student view', big:'Buy low, *sell high*', sub:'Beat the market in 5 rounds.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  srpro: {
    title: 'Stock Rush PRO', url:'investingformummies.com',
    theme:{ a:'#0a0a0a', b:'#000000', accA:'#ffd700', accB:'#c0a062' },
    audio:`${C}/sd_srpro.mp4`, endLines:['Stock Rush','PRO'],
    endCta:'The advanced trading sim', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_srpro.mp4`, dur:3.4, ov:{pos:'top', kicker:'Advanced mode', big:'Think you can *beat the market?*', sub:'A decade of India’s markets in 30 min.'} },
      { kind:'ui', src:`${S}/srpro_host.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Deeper mechanics', big:'6 *corporate actions*', sub:'Dividends, splits, IPOs, buybacks…'} },
      { kind:'ui', src:`${S}/srpro_player.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'11 years · 6 rounds', big:'Trade *real history*', sub:'COVID crash. Jio. Rate-hike storms.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  hidden: {
    title: 'Hidden Fortunes', url:'investingformummies.com',
    theme:{ a:'#0e2a2a', b:'#08161a', accA:'#ffd23f', accB:'#34c6b3' },
    audio:`${C}/sd_hidden.mp4`, endLines:['Hidden','Fortunes'],
    endCta:'Free SIP projection game', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_hidden.mp4`, dur:3.4, ov:{pos:'top', kicker:'A money game', big:'What’s hiding in your *daily habits?*', sub:'Your spare ₹ could be growing now.'} },
      { kind:'ui', src:`${S}/hidden_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Enter your habits', big:'Hidden *Fortunes*', sub:'That daily coffee adds up…'} },
      { kind:'ui', src:`${S}/hidden_2.png`, dur:2.9, zdir:'up', ov:{pos:'bottom', kicker:'Reveal', big:'Watch it *compound*', sub:'See your savings grow for decades.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  swayamvar: {
    title: 'Swayamvar', url:'investingformummies.com',
    theme:{ a:'#3a0a14', b:'#1c050a', accA:'#ffcb47', accB:'#ff5b8a' },
    audio:`${C}/sd_react.mp4`, endLines:['Swayamvar'],
    endCta:'Free investment matchmaking game', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${CLAUDE}/content/teasers/swayamvar-teaser.mp4`, ss:0.5, dur:3.6, ov:{pos:'top', kicker:'Investment matchmaking', big:'Your money needs the right *rishta*', sub:'Match each goal to the one.'} },
      { kind:'video', src:`${CLAUDE}/content/teasers/swayamvar-teaser.mp4`, ss:5.0, dur:3.2, ov:{pos:'bottom', kicker:'Meet the suitors', big:'Equity? Gold? *Debt?*', sub:'Who’s the perfect match?'} },
      { kind:'video', src:`${CLAUDE}/content/teasers/swayamvar-teaser.mp4`, ss:9.0, dur:3.0, ov:{pos:'bottom', kicker:'Vote live in class', big:'Pick *the one*', sub:'A festive money matchmaking game.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  fundgoal: {
    title: 'Fund YOUR Goal', url:'investingformummies.com',
    theme:{ a:'#0e2a3f', b:'#081826', accA:'#34c6b3', accB:'#3a86ff' },
    audio:`${C}/sd_fundgoal.mp4`, endLines:['Fund YOUR','Goal'],
    endCta:'Free goal-based SIP calculator', endSub:'One of 11 money games by IFM',
    beats:[
      { kind:'video', src:`${C}/sd_fundgoal.mp4`, dur:3.4, ov:{pos:'top', kicker:'A money tool', big:'Got a goal? *Get the plan.*', sub:'Tell us the target. We do the math.'} },
      { kind:'ui', src:`${S}/fundgoal_1.png`, dur:2.9, zdir:'in', ov:{pos:'bottom', kicker:'Goal-based SIP', big:'Fund YOUR *Goal*', sub:'Target amount + timeline → plan.'} },
      { kind:'ui', src:`${S}/fundgoal_2.png`, dur:2.9, zdir:'down', ov:{pos:'bottom', kicker:'The cost of waiting', big:'Start *today, not someday*', sub:'See what delay really costs you.'} },
      { kind:'end', dur:2.8 },
    ],
  },
  wealth: {
    title: 'The Wealth Conversation', url:'investingformummies.com',
    theme:{ a:'#14110a', b:'#080703', accA:'#c9a227', accB:'#e8d8a0' },
    audio:`${C}/sd_react.mp4`, endLines:['The Wealth','Conversation'],
    endCta:'An interactive reflection journey', endSub:'A special experience by IFM',
    beats:[
      { kind:'video', src:`${CLAUDE}/wealth-conversation/chapter1-hero.mp4`, dur:3.4, ov:{pos:'top', kicker:'A special experience', big:'The conversation every family *avoids*', sub:'Money, legacy, and what matters.'} },
      { kind:'video', src:`${CLAUDE}/wealth-conversation/chapter5-hero.mp4`, dur:3.2, ov:{pos:'bottom', kicker:'Interactive journey', big:'Watch. *Reflect.* Talk.', sub:'Guided video + reflection.'} },
      { kind:'ui', src:`${S}/wealth_1.png`, dur:3.0, zdir:'in', ov:{pos:'bottom', kicker:'Begin', big:'Start the *wealth conversation*', sub:'For you and the ones you love.'} },
      { kind:'end', dur:2.8 },
    ],
  },
};
