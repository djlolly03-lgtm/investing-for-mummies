// Stock Rush — game data
// 8 real Indian stocks. 5 rounds spanning 2016–2025 real market history.
// Prices in INR. Starting cash ₹10,00,000. No splits/dividends/IPOs — pure trading.

window.STOCKS = [
  { id:'ITC',   name:'ITC',        sector:'FMCG',     cap:'large', risk:'low',    price:  330, mono:'◆', emoji:'🏭',
    desc:'India\'s biggest consumer-goods company. Makes cigarettes, biscuits, soaps — and owns fancy hotels.',
    fun:'Sells 80% of India\'s legal cigarettes — and also makes Bingo chips.',
    watch:'Hurts when people stop spending cash. Lockdowns shut its hotels.' },
  { id:'RIL',   name:'Reliance',   sector:'Energy',   cap:'large', risk:'medium', price: 1000, mono:'▣', emoji:'⚡',
    desc:'India\'s biggest company. Owns oil refineries, the Jio phone network, and 18,000+ stores.',
    fun:'Owns Jio, JioMart, and over 18,000 stores across India.',
    watch:'Anything digital pushes it up. Crashing oil prices drag it down.' },
  { id:'INFY',  name:'Infosys',    sector:'Tech',     cap:'large', risk:'low',    price: 1150, mono:'◉', emoji:'💻',
    desc:'India\'s big tech-services company. Writes software for banks and insurance firms around the world.',
    fun:'Started in 1981 with just ₹10,000 of borrowed money. Now worth billions.',
    watch:'Wins when big companies spend more on tech. Wobbles when AI starts doing the work instead.' },
  { id:'YESBK', name:'Yes Bank',   sector:'Finance',  cap:'mid',   risk:'high',   price:  800, mono:'▲', emoji:'🏦',
    desc:'A bank that grew super fast — maybe too fast. High risk, high drama. Tread carefully.',
    fun:'The founder went to jail in 2020. The stock fell 99% from its peak.',
    watch:'Any bad news = freefall. The riskiest pick in the game.' },
  { id:'TITAN', name:'Titan',      sector:'Consumer', cap:'mid',   risk:'medium', price:  420, mono:'●', emoji:'💎',
    desc:'Owns Tanishq jewellery and Fastrack watches. Part of the Tata group. India\'s luxury favourite.',
    fun:'Warren Buffett bought a stake in 2017 — and made millions on it.',
    watch:'Weddings and rising gold prices push it up. Lockdowns and bad times hurt it.' },
  { id:'TRENT', name:'Trent',      sector:'Retail',   cap:'mid',   risk:'medium', price:  230, mono:'◐', emoji:'🛍️',
    desc:'Owns Westside and Zudio clothing stores. Part of the Tata group. Riding India\'s shopping boom.',
    fun:'Zudio sells ₹999 jeans and opens a new store almost every week.',
    watch:'When India\'s middle class spends, it rockets. Slowdowns hurt.' },
  { id:'DIXON', name:'Dixon Tech', sector:'Tech',     cap:'small', risk:'high',   price:  160, mono:'◇', emoji:'📱',
    desc:'Makes electronics for big brands like Samsung and Motorola. Small company growing very fast.',
    fun:'Assembles iPhones and Samsung phones inside India.',
    watch:'When the government pushes "Make in India" it wins big. Small company = wild price swings.' },
  { id:'DMART', name:'DMart',      sector:'Retail',   cap:'large', risk:'low',    price:  300, mono:'◈', emoji:'🛒',
    desc:'The supermarket chain with no fancy tricks — just the lowest prices in town. Always.',
    fun:'The founder is one of India\'s most secretive billionaires — almost never gives interviews.',
    watch:'Sells everyday stuff, so it does well even in bad times. Boring but steady.' },

  // ── Extra 12 stocks — game picks 8 random per session ────────────────────
  { id:'HDFCBK', name:'HDFC Bank',  sector:'Finance',  cap:'large', risk:'low',    price: 1100, mono:'▤', emoji:'🏛️',
    desc:'India\'s biggest private bank. Famous for being super-safe and slow-growing.',
    fun:'For years it was the most valuable bank in India by far.',
    watch:'Bank stocks wobble when the economy slows. Otherwise: very steady winner.' },
  { id:'BAJFIN', name:'Bajaj Finance', sector:'Finance', cap:'mid', risk:'medium', price:  700, mono:'▥', emoji:'💳',
    desc:'Gives small loans to buy phones, fridges, two-wheelers. India\'s consumer-loan king.',
    fun:'In 2016 the stock was ₹700. By 2024 it had touched over ₹7,000.',
    watch:'When India shops more, this stock rockets. When loans go bad, it falls hard.' },
  { id:'TATMTR', name:'Tata Motors', sector:'Consumer', cap:'mid',  risk:'high',   price:  430, mono:'▦', emoji:'🚗',
    desc:'Makes Tata cars, owns Jaguar Land Rover. Big bet on electric cars in India.',
    fun:'Owns Jaguar and Land Rover since 2008 — bought them from Ford for $2.3 billion.',
    watch:'When Indians buy more cars (especially EVs), it soars. Recessions and lockdowns hurt.' },
  { id:'MARUTI', name:'Maruti Suzuki', sector:'Consumer', cap:'large', risk:'low', price: 3800, mono:'▧', emoji:'🚙',
    desc:'India\'s biggest carmaker. 1 in every 2 cars sold in India is a Maruti.',
    fun:'Joint venture started in 1981 between the Indian government and Japan\'s Suzuki.',
    watch:'Steady winner unless EVs disrupt it. They\'re late to the electric party.' },
  { id:'HUL',    name:'Hindustan Unilever', sector:'FMCG', cap:'large', risk:'low', price:  830, mono:'▨', emoji:'🧴',
    desc:'Makes Dove soap, Surf detergent, Lipton tea — stuff in every Indian household.',
    fun:'Sells products to 9 out of 10 Indian households.',
    watch:'Boring but reliable. Doesn\'t crash much, doesn\'t skyrocket much.' },
  { id:'NESTLE', name:'Nestle India', sector:'FMCG',    cap:'large', risk:'low',    price: 6400, mono:'▩', emoji:'☕',
    desc:'Maggi noodles, KitKat, Nescafe coffee. The brands you grew up with.',
    fun:'In 2015 the government banned Maggi for "lead". It came roaring back the next year.',
    watch:'Recession-proof — people keep buying their snacks. Steady grower.' },
  { id:'APAINT', name:'Asian Paints', sector:'Consumer', cap:'large', risk:'low',    price:  930, mono:'◢', emoji:'🎨',
    desc:'India\'s biggest paint company. When people paint houses, it wins.',
    fun:'Started in 1942 by four friends in a garage. Now worth billions.',
    watch:'Booms when real estate booms. New competitors (like Birla Opus) are a worry.' },
  { id:'AIRTEL', name:'Bharti Airtel', sector:'Tech',    cap:'large', risk:'medium', price:  360, mono:'◣', emoji:'📶',
    desc:'India\'s second-biggest phone network after Jio. Big in Africa too.',
    fun:'Was India\'s #1 phone network until Jio crushed it with free data in 2016.',
    watch:'Survived the Jio war. Phone tariff hikes = stock goes up. 5G is the next bet.' },
  { id:'TATSTL', name:'Tata Steel',  sector:'Energy',   cap:'mid',   risk:'high',   price:  320, mono:'◤', emoji:'⚙️',
    desc:'India\'s biggest steel company. Steel prices control its fate.',
    fun:'Founded in 1907 — one of India\'s oldest big companies. Owns mines and factories worldwide.',
    watch:'Wild rides. When global steel prices crash or spike, this stock follows.' },
  { id:'ADANI',  name:'Adani Enterprises', sector:'Energy', cap:'mid', risk:'high', price:   70, mono:'◥', emoji:'🏗️',
    desc:'Ports, airports, coal, green energy. India\'s most dramatic billionaire empire.',
    fun:'In 2023, a US short-seller called Hindenburg accused it of fraud and the stock crashed 60% in days.',
    watch:'Wildest ride in the game. Can multiply 10x or crash 60% on a single news headline.' },
  { id:'PVR',    name:'PVR Inox',    sector:'Consumer', cap:'small', risk:'high',   price:  900, mono:'◧', emoji:'🎬',
    desc:'India\'s biggest cinema chain. Bought rival Inox in 2022.',
    fun:'Started in 1997 with a single 4-screen multiplex in Saket, Delhi.',
    watch:'COVID nearly killed it. Now depends on Bollywood/Hollywood hits and merger benefits.' },
  { id:'WIPRO',  name:'Wipro',       sector:'Tech',    cap:'large', risk:'low',    price:  560, mono:'◨', emoji:'🖥️',
    desc:'IT services like Infosys, but smaller and slower-growing. Same business model.',
    fun:'Wipro used to make vegetable oil before becoming a tech giant in the 80s.',
    watch:'Slower than Infosys. AI taking away IT jobs hits Wipro harder.' },
  { id:'TCS',    name:'TCS',         sector:'Tech',    cap:'large', risk:'low',    price: 2500, mono:'◩', emoji:'🧑‍💻',
    desc:'India\'s biggest IT company. Writes software for the world\'s biggest banks and airlines.',
    fun:'Was India\'s first company to cross ₹10 lakh crore in market value.',
    watch:'Steady giant. Big global tech spending helps. AI is now a real threat to its old model.' },
  { id:'HCLTEC', name:'HCL Tech',    sector:'Tech',    cap:'large', risk:'low',    price:  740, mono:'◪', emoji:'💾',
    desc:'India\'s third-biggest tech-services company. Also owns some of its own software products.',
    fun:'Founded in a Delhi garage in 1976, before Infosys or Wipro existed.',
    watch:'Its own software products protect it a bit from the AI threat facing IT services.' },
  { id:'COALIN', name:'Coal India',  sector:'Energy',  cap:'large', risk:'medium', price:  320, mono:'⬢', emoji:'⛏️',
    desc:'World\'s biggest coal miner. A government-owned company that powers most of India\'s electricity.',
    fun:'Pays one of the biggest dividends of any Indian company — real cash to shareholders every year.',
    watch:'Coal demand spikes = stock flies. Push for clean energy is the long-term worry.' },
  { id:'KOTAK',  name:'Kotak Bank',  sector:'Finance', cap:'large', risk:'low',    price:  770, mono:'⬡', emoji:'🏧',
    desc:'A private bank known for playing it safe. Slow, steady, boring — the good kind.',
    fun:'Founder Uday Kotak turned a small finance company into a top-5 Indian bank.',
    watch:'Rarely blows up, rarely rockets. RBI has kept it on a short leash lately.' },
  { id:'SUNPHR', name:'Sun Pharma',  sector:'Consumer', cap:'large', risk:'medium', price:  770, mono:'⬣', emoji:'💊',
    desc:'India\'s biggest drug maker. Sells generic medicines around the world — especially the USA.',
    fun:'Started as a tiny company selling psychiatry medicines in Kolkata in 1983.',
    watch:'Big US business = wobbly. New specialty drugs (skin, eye) are its next-gen growth bet.' },
];

// 4 round transitions = 4 cumulative news events spanning 2-year periods.
// Each event fires when its round LOCKS, moving prices to match the year label
// of the NEXT round. So R1 lock fires 2016→2018 events, R2 lock fires
// 2018→2020 events, etc. R5 has no news fire — the game ends after R5 lock.
window.NEWS_SCRIPT = [
  {
    round: 1, dropAt: 25,
    headline: '🗓️ 2016 → 2018 — Cash ban, Jio explosion, DMart\'s record IPO',
    body: 'Three huge events shake India in two years. First, Modi cancels ₹500 & ₹1,000 notes overnight — cash-heavy shops are crushed but digital payments boom. Then Reliance Jio gives away free 4G data, hitting 200 million users in record time. DMart goes public at ₹295 and doubles on day one. Meanwhile, Yes Bank is caught hiding bad loans — its troubles are just starting.',
    impacts: {
      ITC: 0.97, RIL: 1.67, INFY: 1.12, YESBK: 0.47, TITAN: 1.40, TRENT: 1.50, DIXON: 1.47, DMART: 3.99,
      HDFCBK: 1.10, BAJFIN: 1.36, TATMTR: 0.74, MARUTI: 1.22, HUL: 1.37, NESTLE: 1.47,
      APAINT: 1.28, AIRTEL: 0.66, TATSTL: 1.71, ADANI: 1.72, PVR: 1.25, WIPRO: 1.07,
      TCS: 1.15, HCLTEC: 1.12, COALIN: 0.85, KOTAK: 1.35, SUNPHR: 0.60,
    },
    stockNotes: {
      DMART: { move: +299, why: 'DMart\'s stock-market debut at ₹295 listed at over ₹600 on day one and kept rising. The lowest-price supermarket model becomes a multi-bagger.' },
      RIL:   { move:  +67, why: '200 million Jio users in 18 months — cheap data lifts everything Reliance touches. Markets re-rate the whole company from oil to tech.' },
      YESBK: { move:  -53, why: 'First the cash crunch in 2016, then RBI finds Yes Bank hiding bad loans. Founder is removed. Investors panic — the slow-motion collapse begins.' },
      TRENT: { move:  +50, why: 'Zudio opens stores across smaller cities. ₹999 jeans find their audience — fast.' },
      DIXON: { move:  +47, why: 'Make-in-India momentum. Contract-electronics wins pile up as global brands look for Indian manufacturers.' },
      TITAN: { move:  +40, why: 'Indian gold demand surges. Tanishq becomes the wedding default. Warren Buffett quietly buys in.' },
      ITC:   { move:   -3, why: 'Cigarettes, biscuits and snacks survived the cash ban shock — but only just. Hotels and FMCG mostly held steady.' },
      AIRTEL:{ move:  -34, why: 'Jio destroyed Airtel\'s revenue with free data. Airtel is forced to slash prices to compete — and bleeds for it.' },
      TATMTR:{ move:  -26, why: 'Demonetisation hurt car sales. Plus JLR\'s China demand weakens. Tough two years.' },
      KOTAK: { move:  +35, why: 'Kotak\'s conservative-lending strategy shines as rivals hide bad loans. Trusted-name premium keeps growing.' },
      SUNPHR:{ move:  -40, why: 'US regulator FDA flags problems at Sun\'s Halol factory. Generic-drug prices in the US keep falling. Painful stretch.' },
    },
  },
  {
    round: 2, dropAt: 20,
    headline: '🦠 2018 → 2020 — COVID lockdown! Markets crash. Yes Bank collapses. Government pays companies to make in India',
    body: 'India shuts down with 4 hours\' notice. Schools, shops, flights — everything stops. The market crashes 40% in weeks. Yes Bank finally collapses; the central bank organises a rescue, but people who owned the stock lose almost everything. Hidden in the panic: the government starts paying companies to make products inside India instead of importing — and a small phone-maker called Dixon is first to benefit.',
    impacts: {
      ITC: 0.78, RIL: 0.85, INFY: 0.75, YESBK: 0.08, TITAN: 0.72, TRENT: 0.85, DIXON: 1.75, DMART: 1.30,
      HDFCBK: 0.88, BAJFIN: 0.72, TATMTR: 0.55, MARUTI: 0.72, HUL: 1.10, NESTLE: 1.15,
      APAINT: 0.85, AIRTEL: 1.35, TATSTL: 0.70, ADANI: 1.65, PVR: 0.30, WIPRO: 0.85,
      TCS: 1.10, HCLTEC: 0.90, COALIN: 0.60, KOTAK: 0.95, SUNPHR: 1.20,
    },
    stockNotes: {
      YESBK: { move: -92, why: 'Complete collapse. The central bank steps in to save Yes Bank from going bust. SBI leads the rescue — but ordinary shareholders lose almost everything. A warning about chasing risky growth.' },
      TITAN: { move: -28, why: 'Every jewellery store and watch shop is shut. Weddings cancelled. Nobody is thinking about Tanishq bangles right now. Titan\'s sales go to zero.' },
      ITC:   { move: -22, why: 'ITC\'s hotels are empty, restaurants are closed, and even cigarette sales crash as people stay home. Every part of the business is hit at once.' },
      RIL:   { move: -15, why: 'Oil demand collapses — nobody is driving or flying. Jio helps, but it can\'t make up for the huge drop in oil sales.' },
      DMART: { move: +30, why: 'Groceries are essential, so DMart stayed open. Demand jumped. The "boring" stock was suddenly brilliant.' },
      TRENT: { move: -15, why: 'Westside and Zudio shut for months. Fashion is one of the hardest-hit sectors — but Zudio\'s value model bounces back faster than rivals.' },
      DIXON: { move: +75, why: 'The government starts paying companies to make products in India. Dixon is first in line and the stock explodes — even during a crash.' },
      PVR:   { move: -70, why: 'Cinemas were literally closed for over a year. PVR almost went bankrupt.' },
      AIRTEL:{ move: +35, why: 'Work-from-home meant more data, more video calls. Airtel started its big comeback.' },
      TATMTR:{ move: -45, why: 'Car factories shut. Jaguar Land Rover sales fell off a cliff. One of the worst-hit stocks.' },
      COALIN:{ move: -40, why: 'Trains stopped, factories shut — power demand collapsed. Coal India\'s biggest customer (thermal power) went to sleep for months.' },
      SUNPHR:{ move: +20, why: 'Pharma is one of the few sectors that thrived. Everyone stockpiled medicines, and Sun Pharma\'s new specialty drugs finally clicked.' },
      TCS:   { move: +10, why: 'Global tech giants rushed to move online during lockdown — perfect timing for TCS. Work-from-home actually boosted its order book.' },
    },
  },
  {
    round: 3, dropAt: 20,
    headline: '🚀 2020 → 2023 — India roars back. Shopping & manufacturing boom',
    body: 'India\'s economy comes roaring back stronger than before. The government keeps paying companies to make things in India. Middle-class families are spending like crazy — new clothes, gold jewellery, the latest phones, big grocery runs. The small companies that survived COVID are now the biggest winners.',
    impacts: {
      ITC: 2.00, RIL: 1.80, INFY: 1.60, YESBK: 1.30, TITAN: 3.80, TRENT: 4.50, DIXON: 3.80, DMART: 2.20,
      HDFCBK: 1.55, BAJFIN: 3.80, TATMTR: 4.50, MARUTI: 2.20, HUL: 1.45, NESTLE: 1.60,
      APAINT: 2.30, AIRTEL: 2.10, TATSTL: 3.20, ADANI: 5.50, PVR: 3.50, WIPRO: 1.50,
      TCS: 1.55, HCLTEC: 2.10, COALIN: 3.20, KOTAK: 1.35, SUNPHR: 1.55,
    },
    stockNotes: {
      TRENT: { move: +350, why: 'Zudio becomes India\'s fastest-growing clothes brand — ₹999 jeans, ₹599 shirts, thousands of stores. People have money and want to spend it. Trent is in exactly the right place.' },
      DIXON: { move: +280, why: 'The government keeps paying companies to make stuff in India. Dixon wins big contracts from Samsung, Motorola and other phone brands.' },
      ADANI: { move: +450, why: 'Adani Group becomes one of India\'s biggest empires. Stock multiplies more than 5x in three years.' },
      TATMTR:{ move: +350, why: 'Electric vehicle pivot pays off — Tata Nexon EV becomes India\'s bestseller. Plus JLR finally turns profitable.' },
      BAJFIN:{ move: +280, why: 'Consumer credit on fire. Every phone, fridge, scooter bought on EMI helps Bajaj Finance.' },
      TITAN: { move: +280, why: 'Weddings are back in a huge way after COVID. Gold demand hits record highs. Tanishq is the jeweller everyone wants for their big day.' },
      PVR:   { move: +250, why: 'Cinemas reopen with vengeance. People rush back for big-screen movies. Merger with Inox makes it the giant.' },
      RIL:   { move:  +80, why: 'Reliance is now India\'s biggest retailer too. JioMart, physical stores, payment apps — Reliance is everywhere people spend money.' },
      INFY:  { move:  +60, why: 'Global tech spending picks up again. Infosys wins major AI and digital contracts. Indian tech is more important than ever.' },
      COALIN:{ move: +220, why: 'The global energy crunch (Ukraine war, gas shortages) sent coal prices sky-high. Coal India\'s dividends and profits both explode.' },
      HCLTEC:{ move: +110, why: 'HCL rides the same digital-services wave as TCS and Infy. Its software-products arm adds an extra kick.' },
      TCS:   { move:  +55, why: 'Digital-transformation orders pour in from banks and airlines worldwide. Order book at record highs.' },
      SUNPHR:{ move:  +55, why: 'Specialty drugs (skin, eye) hit their stride. India\'s pharma industry powers back into the US market.' },
    },
  },
  {
    round: 4, dropAt: 25,
    headline: '🏆 2023 → 2025 — India becomes the world\'s 4th biggest economy!',
    body: 'India overtakes Germany and Japan to become the world\'s fourth-largest economy. Zudio (Trent) is everywhere, Apple makes iPhones in India (Dixon), Tanishq (Titan) is in every wedding, and even Yes Bank is finally back from the brink. But not everything is up — Adani gets hit by a major short-seller report, AI worries pressure Infosys and Wipro, and the steel super-cycle reverses.',
    impacts: {
      ITC: 1.20, RIL: 1.20, INFY: 0.95, YESBK: 1.15, TITAN: 2.20, TRENT: 3.50, DIXON: 2.00, DMART: 1.30,
      HDFCBK: 1.15, BAJFIN: 2.20, TATMTR: 2.80, MARUTI: 1.55, HUL: 1.20, NESTLE: 1.30,
      APAINT: 1.15, AIRTEL: 2.20, TATSTL: 0.80, ADANI: 0.55, PVR: 1.30, WIPRO: 0.82,
      TCS: 0.95, HCLTEC: 1.10, COALIN: 1.35, KOTAK: 1.05, SUNPHR: 1.45,
    },
    stockNotes: {
      TRENT: { move: +250, why: 'Zudio now has 500+ stores. Fashion shops are the hottest part of the market. Anyone who spotted this early has made huge profits.' },
      TATMTR:{ move: +180, why: 'Tata is now the king of Indian EVs. Plus JLR profits at record highs. The full turnaround.' },
      AIRTEL:{ move: +120, why: '5G rollout. Africa business doing great. Telecom is now a 2-player race (Jio + Airtel).' },
      BAJFIN:{ move: +120, why: 'Consumer credit still booming. Now also doing fintech and digital payments.' },
      DIXON: { move: +100, why: 'Apple picks India. Dixon wins iPhone manufacturing contracts. The "Make in India" bet has paid off spectacularly.' },
      ADANI: { move:  -45, why: 'Hindenburg short-seller report accused Adani of fraud. Stock crashed 60% in a week. Partial recovery since.' },
      TATSTL:{ move:  -20, why: 'Commodity cycle reversed. Global steel prices fell. The super-cycle gains given back.' },
      INFY:  { move:   -5, why: 'AI is starting to do the work that companies used to pay Infosys for. Infosys is changing fast, but the market is worried about the future.' },
      WIPRO: { move:  -18, why: 'AI is starting to do what Wipro gets paid for. Bigger pain for smaller IT players.' },
      ITC:   { move:  +20, why: 'Consumer goods keep growing. The slow-but-steady winner rewards patience yet again.' },
      SUNPHR:{ move:  +45, why: 'Specialty drug launches (Ilumya, Winlevi) are firing on all cylinders. India\'s biggest pharma company just keeps winning.' },
      COALIN:{ move:  +35, why: 'Coal is still India\'s power backbone despite green-energy push. Record dividends keep flowing to shareholders.' },
      HCLTEC:{ move:  +10, why: 'Software-product revenue cushions HCL from the AI worries that are hurting pure IT services.' },
      TCS:   { move:   -5, why: 'AI is quietly starting to do what IT services used to charge for. Even the giant TCS wobbles.' },
      KOTAK: { move:   +5, why: 'RBI restrictions on the digital business have kept a lid on Kotak. Safe, steady, no fireworks.' },
    },
  },
];

// Round labels shown in the UI (host board + player header)
window.ROUND_YEARS = ['2016', '2018', '2020', '2023', '2025', 'Mar 2026'];

// Silent finale reveal — applied AFTER R5 locks, BEFORE the EndedOverlay
// shows. No popup, no news, no activity log — just one last price shake-up so
// students who locked in #1 might end up #2 (or vice versa). The drama of
// the reveal IS the point.
window.FINALE_PRICES = {
  // Winners keep winning (modestly)
  TRENT:  1.30,  // Zudio keeps adding stores
  DIXON:  1.35,  // Apple expansion continues
  TATMTR: 1.20,  // EV momentum
  BAJFIN: 1.20,  // Consumer credit cycle
  TITAN:  1.18,  // Gold prices stay strong
  AIRTEL: 1.15,  // 5G + Africa
  ADANI:  1.25,  // Continued recovery post-Hindenburg
  YESBK:  1.30,  // Slow-recovery story keeps grinding
  // Defensive grinders — small steady up
  RIL:    1.10,
  ITC:    1.05,
  HUL:    1.08,
  NESTLE: 1.12,
  HDFCBK: 1.10,
  DMART:  1.08,
  MARUTI: 1.05,
  PVR:    1.10,
  // Stories that turn against the holders — the "shock" picks
  INFY:   0.85,  // AI eats services
  WIPRO:  0.80,  // AI hits smaller IT harder
  APAINT: 0.82,  // Birla Opus competition bites
  TATSTL: 0.90,  // Commodity cycle weakness continues
  TCS:    0.88,  // AI worries hit even the giant
  HCLTEC: 1.05,  // Product mix cushions HCL
  COALIN: 1.20,  // Coal still needed while transition drags on
  KOTAK:  1.10,  // Steady Eddie, RBI restrictions gone
  SUNPHR: 1.25,  // Specialty drug launches keep firing
};

window.BOT_NAMES = [
  { name: 'Maya',  color: '#7c5cc9', avatar: '🦉' },
  { name: 'Theo',  color: '#2f9e6f', avatar: '🐢' },
  { name: 'Zara',  color: '#e85d4b', avatar: '🦁' },
  { name: 'Kai',   color: '#3b82c4', avatar: '🐬' },
  { name: 'Iris',  color: '#d4953a', avatar: '🐘' },
];

// Legacy colour list (kept for backwards-compat with any old code paths)
window.AVATAR_COLORS = [
  '#e85d4b', '#3b82c4', '#7c5cc9', '#2f9e6f', '#d4953a',
  '#c44d8c', '#5a8fb8', '#b8554d', '#4d9b8c', '#8b6fa8',
];

// 12 fun emoji avatars for student onboarding — each emoji paired with a
// matching background colour. Students pick one in the join screen. Matches
// Stock Rush Pro's roster so the two games feel like a family.
window.AVATAR_OPTIONS = [
  { emoji: '🦊', color: '#d97706', label: 'Fox'       },
  { emoji: '🦁', color: '#d4953a', label: 'Lion'      },
  { emoji: '🐝', color: '#c44d8c', label: 'Bee'       },
  { emoji: '🦉', color: '#1a5c47', label: 'Owl'       },
  { emoji: '🐘', color: '#3b82c4', label: 'Elephant'  },
  { emoji: '🦋', color: '#7c3aed', label: 'Butterfly' },
  { emoji: '🐯', color: '#c2410c', label: 'Tiger'     },
  { emoji: '🦈', color: '#0891b2', label: 'Shark'     },
  { emoji: '🐸', color: '#16a34a', label: 'Frog'      },
  { emoji: '🦅', color: '#1d4ed8', label: 'Eagle'     },
  { emoji: '🐉', color: '#dc2626', label: 'Dragon'    },
  { emoji: '🐺', color: '#4f46e5', label: 'Wolf'      },
];

// Quick 3-question quiz shown on PlayerEnded — students test what they learnt
// from the news events. Answers reference the specific things that happened
// in the game's 5 rounds (independent of which 8 stocks were picked).
window.EXIT_QUIZ = [
  {
    q: 'Why did Yes Bank lose almost all its value over the game?',
    options: [
      'The bank was caught hiding bad loans and collapsed in 2020',
      'The CEO retired and the stock got nervous',
      'A new bank with a similar name confused people',
    ],
    correct: 0,
    why: 'Yes Bank was forced into a rescue by the central bank. Shareholders lost almost everything — a warning about chasing risky growth.',
  },
  {
    q: 'What happened to the Indian stock market when COVID lockdown hit in March 2020?',
    options: [
      'It went up because people had nothing to do',
      'It crashed about 40% in weeks',
      'Nothing happened — markets were closed',
    ],
    correct: 1,
    why: 'India\'s market fell ~40% in a few weeks. But many "boring" stocks (groceries, essentials) actually went UP — and that was the buying opportunity of the decade.',
  },
  {
    q: 'What does "diversification" mean in investing?',
    options: [
      'Putting all your money in one stock you really like',
      'Trading every day to make quick profits',
      'Spreading your money across many different stocks',
    ],
    correct: 2,
    why: 'Diversification = don\'t put all your eggs in one basket. If one stock falls, the others can cushion the blow. Hard to make huge gains, but hard to lose everything too.',
  },
];

// Bite-sized investing tips shown while students are locked in, waiting for
// the teacher to advance the round. Rotate one every few seconds.
window.WAITING_TIPS = [
  { icon: '📊', title: 'What\'s a sector?',
    body: 'Sectors are groups of similar companies. Banks are "finance". Apple is "tech". When a sector booms, all stocks in it often rise together.' },
  { icon: '🧺', title: 'Don\'t put all your eggs in one basket',
    body: 'Spreading your money across many stocks is called diversification. If one falls, the others can cushion the blow.' },
  { icon: '🐂', title: 'Bull vs bear market',
    body: 'A "bull market" is when prices keep rising. A "bear market" is when they keep falling. Animal nicknames investors love.' },
  { icon: '📰', title: 'News moves prices',
    body: 'Stock prices change because of news, fear, greed — and what other people are doing. Reading the news is half the job.' },
  { icon: '⏳', title: 'Patience pays',
    body: 'Some of the world\'s richest investors got that way by buying good companies and holding for 20+ years — not by trading every day.' },
  { icon: '⚖️', title: 'Risk vs reward',
    body: 'Bigger possible gains usually mean bigger possible losses. A "high risk" stock can double — or crash by 90%.' },
  { icon: '🎲', title: 'Past results ≠ future results',
    body: 'Just because a stock went up last year doesn\'t mean it will next year. New news, new prices.' },
  { icon: '💰', title: 'Cash is also a choice',
    body: 'Sitting in cash isn\'t losing — it\'s waiting. Sometimes the best trade is no trade at all.' },
  { icon: '🏷️', title: 'A stock\'s price is just a number',
    body: 'A ₹100 stock isn\'t "cheaper" than a ₹1,000 stock. What matters is how that company\'s value will grow.' },
  { icon: '🔮', title: 'Nobody can predict the market perfectly',
    body: 'Even pros are right only about 60% of the time. Don\'t feel bad about a loss — it\'s part of the game.' },
  { icon: '🐌', title: 'Boring stocks can be brilliant',
    body: 'Companies that sell everyday stuff (groceries, soaps, cigarettes) might seem dull — but they often beat exciting tech stocks over time.' },
  { icon: '🚀', title: 'Small companies = wilder rides',
    body: 'Small companies can grow much faster than big ones. But they can also lose value much faster. Higher highs, lower lows.' },
  { icon: '💎', title: 'Buy low, sell high',
    body: 'Easy to say, hard to do. Most people buy AFTER prices have risen, and sell AFTER they\'ve fallen. Doing the opposite is the secret.' },
  { icon: '🌍', title: 'You\'re investing in real companies',
    body: 'Every stock is a tiny slice of a real business. Liking a brand isn\'t enough — but it\'s a good place to start your research.' },
  { icon: '📉', title: 'Crashes always happen',
    body: 'Markets fall hard every 5-10 years (2008, 2020). Smart investors expect it and don\'t panic — they sometimes even buy more.' },
  { icon: '🎯', title: 'Concentration vs spread',
    body: 'Putting most money in one stock = "concentration". Can pay off huge if you\'re right. Hurts a lot if you\'re wrong.' },
  { icon: '🧠', title: 'FOMO is a real thing',
    body: '"Fear of missing out" — when everyone is buying something, the urge to join is huge. That\'s often when it\'s too late.' },
  { icon: '📈', title: 'Compounding is magical',
    body: 'Earn 10% a year on ₹1L = ₹1.1L after year 1. Then 10% on ₹1.1L = ₹1.21L. Tiny gains stack up over time. Albert Einstein called it "the 8th wonder of the world".' },
];

window.GAME_CONFIG = {
  rounds: 5,
  roundSeconds: 60,
  startingCash: 100000,    // ₹1,00,000
  tickMs: 1000,
  roomCode: 'TEEN',        // overridden by engine.js at runtime
  gameKey: 'sr',           // namespace — 'sr' for Stock Rush, 'pro' for Pro
  // Per-round countdown in seconds. Auto-advances when it hits 0 even if
  // students haven't locked in. Timer starts when teacher dismisses the
  // round-transition popup (or at R1 game-start, since no popup there).
  roundDurations: [150, 130, 110, 90, 80],
};

// ── Round transition news — teacher popup at the start of each new round ──────
// Index matches round number (0-based). null = no popup for that round.
// pct: actual % change from previous round's price.

window.ROUND_NEWS = [
  // Round 1 — no popup (it's the opening, nothing to compare against)
  null,

  // Round 2 — Jio + Yes Bank cracks + DMart IPO
  {
    headline: 'Jio Changes Everything — DMart Sets a Record',
    subhead: "2016 → 2018. The cash ban shook the system, then Jio rewrote how India uses the internet. DMart's stock-market debut was the biggest in years. Yes Bank started to crack.",
    notes: {
      ITC:      { dir: 'down', pct: 3,    why: "Cigarettes and snacks held up okay, but the cash-ban shock took a small bite. Cash-heavy retail and hotels stayed weak for two years." },
      RIL:      { dir: 'up',   pct: 67,   why: "Jio signs 200 million users in 18 months. Cheap data lifts everything Reliance owns. Suddenly the market sees Reliance as tech, not just oil." },
      INFY:     { dir: 'up',   pct: 12,   why: "Companies around the world spend more on tech. Despite a messy CEO change, big contracts keep coming." },
      YESBK:    { dir: 'down', pct: 53,   why: "First the cash crunch in 2016, then RBI catches Yes Bank hiding bad loans. The boss is removed. People panic. The slow-motion collapse begins." },
      TITAN:    { dir: 'up',   pct: 40,   why: "Indian gold demand jumps. Tanishq becomes the go-to jeweller for weddings. Warren Buffett quietly buys in." },
      TRENT:    { dir: 'up',   pct: 50,   why: "Zudio opens stores across smaller cities. ₹999 jeans find their audience — fast." },
      DIXON:    { dir: 'up',   pct: 47,   why: "Make-in-India momentum. Big brands look for Indian manufacturers — Dixon is first in line." },
      DMART:    { dir: 'up',   pct: 299,  why: "DMart's stock-market debut at ₹295 in 2017. Listed at over ₹600 on Day 1 and kept climbing. The lowest-price supermarket model is unstoppable." },
      HDFCBK:   { dir: 'up',   pct: 10,   why: "Digital banking gets a boost from the cash ban. HDFC's strong tech wins customers." },
      BAJFIN:   { dir: 'up',   pct: 36,   why: "Consumer lending explodes — phones, fridges, scooters all bought on EMIs. Bajaj is the king of this." },
      TATMTR:   { dir: 'down', pct: 26,   why: "Demonetisation hurt car sales. Plus JLR's China demand weakens. A tough two years." },
      MARUTI:   { dir: 'up',   pct: 22,   why: "Recovery from the cash-ban hit. Premium models like Brezza sell well." },
      HUL:      { dir: 'up',   pct: 37,   why: "Steady consumer demand. Doesn't matter what happens — people keep buying soap and tea." },
      NESTLE:   { dir: 'up',   pct: 47,   why: "Maggi fully back after the 2015 ban. KitKat, Nescafe, Maggi all flying off shelves." },
      APAINT:   { dir: 'up',   pct: 28,   why: "Housing market picking up. People paint when they buy or renovate." },
      AIRTEL:   { dir: 'down', pct: 34,   why: "Jio destroyed Airtel's revenue with free data. Airtel is forced to slash prices to compete — and bleeds for it." },
      TATSTL:   { dir: 'up',   pct: 71,   why: "Global steel prices surging. Tata Steel rides the commodity wave." },
      ADANI:    { dir: 'up',   pct: 72,   why: "Big infrastructure bets — ports, mines, coal — start paying off." },
      PVR:      { dir: 'up',   pct: 25,   why: "Multiplex expansion continues. Bollywood blockbusters drive footfall." },
      WIPRO:    { dir: 'up',   pct: 7,    why: "Stable IT services growth. Slower than Infosys but still moving up." },
    },
  },

  // Round 3 — COVID crash
  {
    headline: 'COVID Crash — India Locked Down',
    subhead: "March 2020: lockdown with four hours' notice. The market fell 40% in weeks. Yes Bank collapsed. But a quiet new government scheme lit a rocket under Dixon.",
    notes: {
      ITC:      { dir: 'down', pct: 22,   why: "Hotels shut. Cigarette sales fell. Even the strong biscuit and snack business couldn't stop the slide." },
      RIL:      { dir: 'down', pct: 15,   why: "Oil sales collapsed as nobody could drive. Jio and shops helped — but not enough to fully make up for it." },
      INFY:     { dir: 'down', pct: 25,   why: "Tech projects got paused during the panic. The big AI and digital boom hadn't started yet." },
      YESBK:    { dir: 'down', pct: 92,   why: "The central bank kicked out the bosses and forced a rescue. People who owned the stock lost almost everything. The most important lesson in this game." },
      TITAN:    { dir: 'down', pct: 28,   why: "Jewellery stores shut for months. Weddings cancelled. Nobody is thinking about Tanishq bangles right now." },
      TRENT:    { dir: 'down', pct: 15,   why: "Westside and Zudio shut. Clothes shops were one of the hardest-hit — but Zudio's cheap prices made it bounce back faster than rivals." },
      DIXON:    { dir: 'up',   pct: 75,   why: "The government starts paying companies to make products in India. Dixon is first in line and the stock explodes — even during a crash." },
      DMART:    { dir: 'up',   pct: 30,   why: "Groceries are essential, so DMart stayed open. Demand jumped. The 'boring' stock was suddenly brilliant." },
      HDFCBK:   { dir: 'down', pct: 12,   why: "Banks worried about loan defaults during lockdown. But strong fundamentals kept HDFC steadier than most." },
      BAJFIN:   { dir: 'down', pct: 28,   why: "Consumer loans got nervous. People stopped buying phones and fridges during lockdown." },
      TATMTR:   { dir: 'down', pct: 45,   why: "Car factories shut. Jaguar Land Rover sales fell off a cliff. One of the worst-hit stocks." },
      MARUTI:   { dir: 'down', pct: 28,   why: "All car factories closed for months. Showrooms empty. Demand evaporated." },
      HUL:      { dir: 'up',   pct: 10,   why: "Soaps and disinfectants suddenly in huge demand. HUL benefited from the hygiene panic." },
      NESTLE:   { dir: 'up',   pct: 15,   why: "Maggi noodles became the lockdown comfort food. Sales boomed." },
      APAINT:   { dir: 'down', pct: 15,   why: "Nobody was painting during lockdown. Real estate frozen." },
      AIRTEL:   { dir: 'up',   pct: 35,   why: "Work-from-home meant more data, more video calls. Airtel started its big comeback." },
      TATSTL:   { dir: 'down', pct: 30,   why: "Factories shut, steel demand collapsed. Mills running at half capacity." },
      ADANI:    { dir: 'up',   pct: 65,   why: "Adani somehow boomed even in COVID — infrastructure projects kept getting awarded." },
      PVR:      { dir: 'down', pct: 70,   why: "Cinemas were literally closed for over a year. PVR almost went bankrupt." },
      WIPRO:    { dir: 'down', pct: 15,   why: "Initial COVID freeze paused IT projects. Recovered later in the year." },
    },
  },

  // Round 4 — India Roars Back
  {
    headline: 'India Roars Back — Economy Booms',
    subhead: "2020 → 2023: a strong recovery after COVID, powered by government spending, more 'Make in India' help, and people finally spending again. The companies that survived the crash become the biggest winners.",
    notes: {
      ITC:      { dir: 'up',   pct: 100,  why: "Hotels recover, consumer goods are strong, and investors finally give ITC the respect it deserves." },
      RIL:      { dir: 'up',   pct: 80,   why: "Shops, Jio, and clean energy — all three of Ambani's bets work at once." },
      INFY:     { dir: 'up',   pct: 60,   why: "Global tech spending booms again. Every major bank and insurance company wants an Infosys contract." },
      YESBK:    { dir: 'up',   pct: 30,   why: "Stabilising slowly after the rescue. Still a fraction of its 2016 peak. The recovery is real, but slow." },
      TITAN:    { dir: 'up',   pct: 280,  why: "India's gold rush. Tanishq sells out nationwide. Titan is the consumer favourite of the decade." },
      TRENT:    { dir: 'up',   pct: 350,  why: "Zudio's 'cool clothes at Indian prices' explodes. New stores open every week. Everyone wants a piece of Trent." },
      DIXON:    { dir: 'up',   pct: 280,  why: "'Make in India' payouts get huge. Samsung, Motorola and Apple suppliers all route business through Dixon." },
      DMART:    { dir: 'up',   pct: 120,  why: "Grocery shopping back to normal after COVID. DMart's cheap prices keep it as India's most-loved supermarket." },
      HDFCBK:   { dir: 'up',   pct: 55,   why: "Loans booming as India spends again. Merger with HDFC Ltd announced — bigger and stronger." },
      BAJFIN:   { dir: 'up',   pct: 280,  why: "Consumer credit on fire. Every phone, fridge, scooter bought on EMI helps Bajaj Finance." },
      TATMTR:   { dir: 'up',   pct: 350,  why: "Electric vehicle pivot pays off — Tata Nexon EV becomes India's bestseller. Plus JLR finally turns profitable." },
      MARUTI:   { dir: 'up',   pct: 120,  why: "Indians buying cars again. Maruti's volumes hit record highs." },
      HUL:      { dir: 'up',   pct: 45,   why: "Steady growth — consumers spending more on premium brands like Dove and Surf." },
      NESTLE:   { dir: 'up',   pct: 60,   why: "Premium-priced snacks doing well. People happy to pay more for Maggi and Nescafe." },
      APAINT:   { dir: 'up',   pct: 130,  why: "Real estate boom = paint boom. Asian Paints is the obvious winner." },
      AIRTEL:   { dir: 'up',   pct: 110,  why: "Phone tariff hikes finally happen — Jio's free-data era ends. Airtel profits surge." },
      TATSTL:   { dir: 'up',   pct: 220,  why: "Post-COVID steel super-cycle. Global construction boom = Tata Steel windfall." },
      ADANI:    { dir: 'up',   pct: 450,  why: "Adani Group becomes one of India's biggest empires. Stock multiplies 5x in two years." },
      PVR:      { dir: 'up',   pct: 250,  why: "Cinemas reopen with vengeance. People rush back for big-screen movies. Merger with Inox makes it the giant." },
      WIPRO:    { dir: 'up',   pct: 50,   why: "Digital projects flowing. But growth slower than Infosys — clients prefer the bigger name." },
    },
  },

  // Round 5 — India at $4 Trillion
  {
    headline: 'India Becomes World\'s 4th Biggest Economy',
    subhead: "2025: India is now the world's fourth-largest economy. Zudio is everywhere, Apple is making iPhones in India, and even the people who bought Yes Bank at the bottom finally smile.",
    notes: {
      ITC:      { dir: 'up',   pct: 20,   why: "Consumer goods keep growing. The slow-but-steady winner rewards patience yet again." },
      RIL:      { dir: 'up',   pct: 20,   why: "Steady growth across phones, shops and clean energy. Huge in size, slower in growth — but still a winner." },
      INFY:     { dir: 'down', pct: 5,    why: "Global tech slowdown. AI is starting to do the work Infosys gets paid to do. Infosys is changing, but the market is worried." },
      YESBK:    { dir: 'up',   pct: 15,   why: "Still alive. The quiet recovery continues. Loyal holders are finally inching back from disaster." },
      TITAN:    { dir: 'up',   pct: 120,  why: "Gold prices keep climbing. Tanishq adds new stores. The luxury story keeps getting better year after year." },
      TRENT:    { dir: 'up',   pct: 250,  why: "Zudio's unstoppable march. Every mall, every high street. The most surprising retail story of the decade." },
      DIXON:    { dir: 'up',   pct: 100,  why: "Apple picks India. Dixon wins iPhone manufacturing contracts. The 'Make in India' bet has paid off spectacularly." },
      DMART:    { dir: 'up',   pct: 30,   why: "Steady growth across stores. Posher rivals are catching up — but DMart's low prices keep customers loyal." },
      HDFCBK:   { dir: 'up',   pct: 15,   why: "Steady, boring, reliable — the way a big bank should be. The HDFC Ltd merger adds heft." },
      BAJFIN:   { dir: 'up',   pct: 120,  why: "Consumer credit still booming. Now also doing fintech and digital payments." },
      TATMTR:   { dir: 'up',   pct: 180,  why: "Tata is now the king of Indian EVs. Plus JLR profits at record highs. The full turnaround." },
      MARUTI:   { dir: 'up',   pct: 55,   why: "Steady growth, but EV worries linger — Maruti is late to the electric party while Tata races ahead." },
      HUL:      { dir: 'up',   pct: 20,   why: "Boring grower keeps growing. Premium products like Sunsilk, Lakme do well." },
      NESTLE:   { dir: 'up',   pct: 30,   why: "Premium-priced food stays premium. Maggi's pricing power keeps margins fat." },
      APAINT:   { dir: 'up',   pct: 15,   why: "Slowing — new rivals like Birla Opus eating into market share. The easy growth years may be over." },
      AIRTEL:   { dir: 'up',   pct: 120,  why: "5G rolled out. Africa business doing great. Telecom is now a 2-player race (Jio + Airtel)." },
      TATSTL:   { dir: 'down', pct: 20,   why: "Commodity cycle reversed. Global steel prices fell. The super-cycle gains given back." },
      ADANI:    { dir: 'down', pct: 45,   why: "Hindenburg short-seller report accused Adani of fraud. Stock crashed 60% in a week. Partial recovery since." },
      PVR:      { dir: 'up',   pct: 30,   why: "Steady post-merger. Bollywood is hit-or-miss but PVR-Inox now has scale." },
      WIPRO:    { dir: 'down', pct: 18,   why: "AI is starting to do what Wipro gets paid for. Bigger pain for smaller IT players." },
    },
  },
];
