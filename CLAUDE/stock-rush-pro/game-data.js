// Stock Rush Pro — game data
// 16-company rotating pool. Each game randomly picks 9 active stocks (8 + 1 IPO).
// 6 rounds spanning 2014–2026. Prices are historical snapshots in INR.
// One corporate action per round — R1's dividend fires at end of round so
// students get to buy first; R2–R6 events fire at start of round as normal.
// Starting cash ₹2,00,000. Corporate actions: 1 per round (rounds 2–7).

// ── Core "always-on" stocks (RELIANCE + YESBK always present) ────────────────

window.STOCKS = [
  {
    id: 'ITC', name: 'ITC', sector: 'FMCG', cap: 'large', risk: 'low', emoji: '🏭', mono: '◆',
    desc: "India's biggest FMCG company. Cigarettes, biscuits, soaps — and luxury hotels.",
    fun: "Sells 80% of India's legal cigarettes — and also makes Bingo chips and Sunfeast biscuits.",
    watch: "Cash-economy shocks hurt the retail spend. Lockdowns shut its hotels.",
  },
  {
    id: 'RELIANCE', name: 'Reliance', sector: 'Energy', cap: 'large', risk: 'medium', emoji: '⚡', mono: '▣',
    desc: 'Oil refineries, Jio telecom, and the largest retail chain in India.',
    fun: 'Owns Jio, JioMart, and over 18,000 retail stores across India.',
    watch: 'Anything digital → big jump. Oil prices crashing → headwind.',
  },
  {
    id: 'INFY', name: 'Infosys', sector: 'Tech', cap: 'large', risk: 'low', emoji: '💻', mono: '◉',
    desc: "The IT giant writing software for half the world's banks and insurers.",
    fun: 'Started in 1981 with just ₹10,000 of borrowed money. Now worth billions.',
    watch: 'Global IT spending up → wins. AI replacing services → wobble.',
  },
  {
    id: 'YESBK', name: 'Yes Bank', sector: 'Finance', cap: 'mid', risk: 'high', emoji: '🏦', mono: '▲',
    desc: 'A private bank that grew very fast — maybe too fast. High risk, high drama.',
    fun: 'Founder went to jail in 2020. Stock fell 99% from its peak.',
    watch: 'Any bad-loan or RBI news = freefall. The riskiest pick in the game.',
  },
  {
    id: 'TITAN', name: 'Titan', sector: 'Consumer', cap: 'mid', risk: 'medium', emoji: '💎', mono: '●',
    desc: "Tanishq jewellery + Fastrack watches. Backed by the Tata Group.",
    fun: 'Warren Buffett bought a stake in 2017 — and made millions on it.',
    watch: 'Wedding season + gold rush → soars. Lockdowns and recessions → hurts.',
  },
  {
    id: 'TRENT', name: 'Trent', sector: 'Retail', cap: 'mid', risk: 'medium', emoji: '🛍️', mono: '◐',
    desc: "Westside and Zudio — the Tata retail brands riding India's shopping boom.",
    fun: 'Zudio sells ₹999 jeans and opens a new store almost every week.',
    watch: 'Middle-class spending boom = rocket. Slowdown = slow grind.',
  },
  {
    id: 'DIXON', name: 'Dixon Tech', sector: 'Tech', cap: 'small', risk: 'high', emoji: '📱', mono: '◇',
    desc: "Makes electronics for major brands. India's answer to Foxconn.",
    fun: 'Assembles iPhones and Samsung phones in India under the PLI scheme.',
    watch: '"Make in India" policy = huge gains. Small cap = wild swings.',
  },
  {
    id: 'DMART', name: 'DMart', sector: 'Retail', cap: 'large', risk: 'low', emoji: '🛒', mono: '◈',
    desc: 'The supermarket chain with no fancy schemes — just the lowest prices in town.',
    fun: "Founder Radhakishan Damani is one of India's most secretive billionaires.",
    watch: 'Essential goods → defensive winner. Boring but reliable.',
  },
];

// ── Zomato — enters the game only for players who apply for the IPO ───────────

window.ZOMATO_STOCK = {
  id: 'ZOMATO', name: 'Zomato', sector: 'Tech', cap: 'large', risk: 'high', emoji: '🍕', mono: '◍',
  desc: "India's food delivery giant. IPO at ₹76, listed at a premium. Bet on India's urban appetite.",
  fun: "First Indian unicorn to list publicly. IPO was 38x oversubscribed in 2021.",
  watch: "Profitability swings + quick-commerce burn. New-age tech = volatile.",
};

// ── Full stock pool — all 16 companies that can appear in any game ─────────────

window.STOCK_POOL = [
  // ── 8 core stocks (always candidates) ────────────────────────────────────────
  ...window.STOCKS,
  // ── IPO option A ─────────────────────────────────────────────────────────────
  window.ZOMATO_STOCK,
  // ── Dividend alternative ──────────────────────────────────────────────────────
  {
    id: 'COALINDIA', name: 'Coal India', sector: 'Energy', cap: 'large', risk: 'low', emoji: '⛏️', mono: '◆',
    desc: "India's state-owned coal mining monopoly. Supplies 80% of the country's coal and pays enormous dividends.",
    fun: "Produces enough coal every year to fill Mumbai's Bandra-Worli Sea Link end-to-end — multiple times.",
    watch: "Energy-transition risk: faster solar adoption = lower coal volumes = pressure on the business.",
  },
  // ── Split alternative ─────────────────────────────────────────────────────────
  {
    id: 'HDFCBANK', name: 'HDFC Bank', sector: 'Finance', cap: 'large', risk: 'low', emoji: '🏦', mono: '◉',
    desc: "India's largest private sector bank. Twelve consecutive years of 20%+ profit growth. The steady compounder.",
    fun: "Processes more digital transactions than any other Indian bank. App used by 70+ million customers.",
    watch: "Rare CEO transitions can wobble the stock. The HDFC merger in 2023 brought integration risk.",
  },
  // ── IPO option B ──────────────────────────────────────────────────────────────
  {
    id: 'PAYTM', name: 'Paytm', sector: 'Tech', cap: 'large', risk: 'high', emoji: '📲', mono: '◇',
    desc: "India's largest digital payments app. 300 million users. QR codes at every chai stall. Still burning cash.",
    fun: "Demonetisation in 2016 made Paytm's founder a billionaire overnight — every cash-starved Indian downloaded the app.",
    watch: "Loss-making since founding. Revenue growth means nothing if costs grow faster. And the RBI is always watching.",
  },
  // ── Bonus alternative ─────────────────────────────────────────────────────────
  {
    id: 'HCLTECH', name: 'HCL Tech', sector: 'Tech', cap: 'large', risk: 'low', emoji: '🖥️', mono: '●',
    desc: "The IT company with both services AND software products. India's answer to IBM.",
    fun: "Bought Nokia's enterprise software business for $190M in 2015. That bet paid off — products now generate recurring revenue.",
    watch: "Slower-growing markets in engineering services. AI could commoditise its core outsourcing work.",
  },
  // ── Buyback alternative ───────────────────────────────────────────────────────
  {
    id: 'TCS', name: 'TCS', sector: 'Tech', cap: 'large', risk: 'low', emoji: '💻', mono: '◈',
    desc: "India's largest company by market cap. Writes software for half the world's banks. Cash machine.",
    fun: "TCS's cash pile has been larger than the GDP of some small countries. It runs buybacks because it literally can't invest fast enough.",
    watch: "US recession = IT budget freeze = TCS revenue miss. It's that simple. And that cyclical.",
  },
  // ── Rights alternative ────────────────────────────────────────────────────────
  {
    id: 'BHARTIARTL', name: 'Airtel', sector: 'Tech', cap: 'large', risk: 'medium', emoji: '📡', mono: '◐',
    desc: "India's second-largest telecom, fighting back after Jio's data tsunami destroyed margins.",
    fun: "Survived Jio's ₹19,000 crore free-data onslaught. Competitors who didn't: Aircel, Docomo, Videocon, MTNL.",
    watch: "AGR dues, spectrum costs, intense Jio competition. ARPU recovery is the bull thesis.",
  },
  // ── Background variable alternative ──────────────────────────────────────────
  {
    id: 'BAJFIN', name: 'Bajaj Finance', sector: 'Finance', cap: 'large', risk: 'high', emoji: '💳', mono: '◍',
    desc: "India's most profitable NBFC. Finances everything from TVs to tractors — a lending machine that grows in every economy.",
    fun: "Sells financial products the way FMCG companies sell soap: millions of small, repeated transactions across India.",
    watch: "Rising interest rates squeeze lending margins. Economic slowdown hits repayment rates. High-beta bet on India's credit story.",
  },
  // ── Underperformers — added so not every game is a winner ────────────────────
  {
    id: 'ONGC', name: 'ONGC', sector: 'Energy', cap: 'large', risk: 'medium', emoji: '🛢️', mono: '▽',
    desc: "India's largest oil producer. Pumps millions of barrels a day — and hands most of the profits to the government.",
    fun: "ONGC discovers oil, extracts it, refines it — then the government takes a dividend, imposes a cess, slaps a windfall tax, and waves goodbye. Every year.",
    watch: "PSU discount: government ownership means dividends get raided whenever the fiscal deficit widens. Great business, bad stock.",
  },
  {
    id: 'WIPRO', name: 'Wipro', sector: 'Tech', cap: 'large', risk: 'low', emoji: '🔌', mono: '◻',
    desc: "India's third-largest IT company. Solid business, steady dividends — just not TCS. Sometimes being third in a two-horse race is its own result.",
    fun: "Wipro started selling sunflower oil and soaps before pivoting to software in the 1980s. Best business pivot in Indian history. Stock returns, not so much.",
    watch: "In IT, third place shows. Clients give the largest deals to TCS, the best talent to Infosys. Wipro gets what's left — and charges less for it.",
  },
  {
    id: 'ZEEL', name: 'Zee Entertainment', sector: 'Consumer', cap: 'mid', risk: 'high', emoji: '📺', mono: '▿',
    desc: "India's biggest entertainment network — Zee TV, &TV, Zee News. Great content business, disastrous shareholder story.",
    fun: "At its 2018 peak, Zee was worth ₹50,000 crore. Then the founder borrowed against his shares to fund unrelated infrastructure projects. The rest is a tragedy.",
    watch: "Promoter share pledging is the original red flag. When the founder's other companies borrow against Zee shares, every dip triggers a forced sale — and then another.",
  },
];

// ── Historical price snapshots — ALL 16 stocks, 6 rounds ─────────────────────
// Rounds: 2014, 2018, 2020, 2022, 2023, 2025
// R1 (2014): ITC dividend fires at END of round (after first trades).
// R2 (2018): TITAN 1:5 split OR HDFCBANK 1:2 split fires at start.
// R3 (2020): ZOMATO IPO OR PAYTM IPO fires at start.
// R4 (2022): TRENT 1:1 bonus OR HCLTECH 1:1 bonus fires at start.
// R5 (2023): INFY buyback OR TCS buyback fires at start.
// R6 (2025): DIXON rights OR BHARTIARTL rights fires at start.
// Finale (2026): final price reveal.

window.ROUND_PRICES_ALL = [
  // Round 1 — 2014
  {
    ITC: 340, RELIANCE: 870, INFY: 1080, YESBK: 640,
    TITAN: 380, TRENT: 180, DIXON: 115, DMART: 270,
    COALINDIA: 355, HDFCBANK: 820, HCLTECH: 340, TCS: 1200,
    BHARTIARTL: 330, BAJFIN: 420,
    ONGC: 380, WIPRO: 540, ZEEL: 380,
  },
  // Round 2 — 2018  (TITAN 1:5 split OR HDFCBANK 1:2 split fires this round)
  {
    ITC: 280, RELIANCE: 1350, INFY: 1050, YESBK: 400,
    TITAN: 180, TRENT: 340, DIXON: 280, DMART: 1400,
    COALINDIA: 260, HDFCBANK: 1025, HCLTECH: 1020, TCS: 2000,
    BHARTIARTL: 350, BAJFIN: 2600,
    ONGC: 185, WIPRO: 295, ZEEL: 610,
  },
  // Round 3 — 2020  (ZOMATO IPO OR PAYTM IPO fires this round)
  {
    ITC: 150, RELIANCE: 900, INFY: 700, YESBK: 12,
    TITAN: 200, TRENT: 600, DIXON: 4500, DMART: 2000,
    ZOMATO: 76,     // IPO price — added to state.stocks by the IPO event
    COALINDIA: 120, HDFCBANK: 600, HCLTECH: 640, TCS: 2300,
    BHARTIARTL: 460, BAJFIN: 2100,
    PAYTM: 2150,    // IPO price — added to state.stocks by the IPO event
    ONGC: 70, WIPRO: 200, ZEEL: 150,
  },
  // Round 4 — 2022  (TRENT 1:1 bonus OR HCLTECH 1:1 bonus fires this round)
  {
    ITC: 310, RELIANCE: 2380, INFY: 1450, YESBK: 15,
    TITAN: 495, TRENT: 1380, DIXON: 4720, DMART: 4250,
    ZOMATO: 58, PAYTM: 420,
    COALINDIA: 235, HDFCBANK: 1550, HCLTECH: 1100, TCS: 3200,
    BHARTIARTL: 880, BAJFIN: 6200,
    ONGC: 155, WIPRO: 420, ZEEL: 225,
  },
  // Round 5 — 2023  (INFY buyback OR TCS buyback fires this round)
  {
    ITC: 450, RELIANCE: 2500, INFY: 1500, YESBK: 16,
    TITAN: 640, TRENT: 2100, DIXON: 4800, DMART: 3800,
    ZOMATO: 120, PAYTM: 780,
    COALINDIA: 320, HDFCBANK: 1620, HCLTECH: 1360, TCS: 3500,
    BHARTIARTL: 1120, BAJFIN: 7600,
    ONGC: 180, WIPRO: 385, ZEEL: 220,
  },
  // Round 6 — 2025  (DIXON rights OR BHARTIARTL rights fires this round)
  {
    ITC: 330, RELIANCE: 2600, INFY: 1400, YESBK: 18,
    TITAN: 680, TRENT: 6300, DIXON: 15000, DMART: 3600,
    ZOMATO: 220, PAYTM: 600,
    COALINDIA: 410, HDFCBANK: 1760, HCLTECH: 1680, TCS: 4200,
    BHARTIARTL: 1650, BAJFIN: 8800,
    ONGC: 270, WIPRO: 510, ZEEL: 135,
  },
];

// Alias — engine falls back to window.ROUND_PRICES for old saved games
window.ROUND_PRICES = window.ROUND_PRICES_ALL;

// ── Corporate action events — 6 slots, A/B options per slot ──────────────────
// The engine uses state.eventScript (set by pickGameStocks) — these globals are
// referenced by GAME_SLOTS and kept as fallback.

window.EVENT_SCRIPT = [

  // ── Round 1: ITC Dividend (option A) · fires at END of round 1 ─────────────
  {
    round: 1,
    fireAt: 'end',
    type: 'dividend',
    stockId: 'ITC',
    headline: '💰 ITC declares ₹5 dividend per share',
    body: "Even as ITC's share price dips on demonetisation fears, the company's cigarette and FMCG businesses are still generating enormous cash. The board announces a ₹5 dividend for every share you hold. A dividend is simply a company sharing a slice of its profits directly with shareholders — the cash arrives automatically in your account. You don't need to sell anything. This is why income investors love stable FMCG companies even when prices dip: a falling stock doesn't mean a failing business.",
    perShare: 5,
  },

  // ── Round 2: Titan 1:5 Stock Split (option A) ──────────────────────────────
  {
    round: 2,
    type: 'split',
    stockId: 'TITAN',
    headline: '✂️ Titan announces 1:5 stock split — one share becomes five',
    body: "Titan's share price has climbed high enough that small investors struggle to afford even a single share. To keep the stock accessible, Titan splits every 1 share into 5 shares — so the price drops to roughly one-fifth, but you own five times as many. Your total holding value doesn't change overnight, but the lower price tag attracts a new wave of retail buyers, which often pushes the price up over time. Splitting a stock is a signal of confidence — companies usually don't split a falling stock. After the split, Titan trades at a much more inviting price point.",
    ratio: 5,
  },

  // ── Round 3: Zomato IPO (option A) ─────────────────────────────────────────
  {
    round: 3,
    type: 'ipo',
    stockId: 'ZOMATO',
    headline: "🍕 Zomato IPO opens — India's food delivery giant hits the market",
    body: "Even as COVID swept through India, millions of people discovered food delivery for the first time. Zomato, the company delivering biryani and butter chicken to locked-down apartments, is now listing on the stock exchange at ₹76 per share. The IPO is 38 times oversubscribed — meaning for every share available, 38 investors are trying to buy it. An IPO is the first time a private company sells its shares to the public. Because demand is so much higher than supply, most investors get only a fraction of what they applied for. After the IPO resolves, Zomato will also be available on the open market — so even if you don't apply now, you can buy it next round.",
    ipoPrice: 76,
    subscriptionX: 38,
  },

  // ── Round 4: Trent 1:1 Bonus Shares (option A) ─────────────────────────────
  {
    round: 4,
    type: 'bonus',
    stockId: 'TRENT',
    headline: "🎁 Trent issues 1:1 bonus shares — your holding doubles overnight",
    body: "Zudio is on fire. Trent's share price has surged through the COVID recovery, and the company wants to reward long-term shareholders. It issues a 1:1 bonus — for every share you already own, you receive one more share completely free. This is funded from Trent's reserves (retained profits), not new investor money. The share price adjusts downward to reflect the extra shares, but your total stake is worth the same the moment it happens. Bonus issues are considered a strong signal of confidence — a company only does this when its books are healthy and growing. More shares, same value — but now you own more of the story.",
    ratio: 1,
  },

  // ── Round 5: Infosys Buyback (option A) ────────────────────────────────────
  {
    round: 5,
    type: 'buyback',
    stockId: 'INFY',
    headline: '🔄 Infosys buyback: sell up to 25% of your holding at a 15% premium',
    body: "Even as global IT spending slows, Infosys is sitting on a mountain of cash and believes its own shares are undervalued. It's offering to buy back shares directly from investors at a 15% premium to the current market price — meaning you get more than you'd get selling on the exchange today. A buyback is optional: you choose how much to participate. The company takes the shares out of circulation, which usually supports the share price. This is one of the most shareholder-friendly things a profitable company can do. You can accept (sell up to 25% of your Infosys at the premium price) or reject (hold everything at market price). Think carefully: is the 15% premium worth giving up potential future upside?",
    premium: 0.15,
    maxPct: 0.25,
  },

  // ── Round 6: Dixon Rights Issue (option A) ─────────────────────────────────
  {
    round: 6,
    type: 'rights',
    stockId: 'DIXON',
    headline: "📬 Dixon rights issue: buy 1 new share for every 5 you own, at 70% of market price",
    body: "Dixon is expanding rapidly — new Apple contracts, new factories, new clients — and needs fresh capital to fund the growth. It's offering existing shareholders the right (but not the obligation) to buy new shares at a steep 30% discount to the market price: you pay just 70% of what those shares would cost on the exchange. The ratio is 1 new share for every 5 you already hold. This is called a rights issue because the opportunity is reserved exclusively for existing shareholders — it's your right, not the general public's. If you don't have enough cash, you can sell other shares to fund it. If you don't want to invest more, you can reject it — but new shares will be issued to others, diluting your stake slightly.",
    ratio: 0.2,
    discount: 0.7,
  },
];

// ── Alternate corporate actions — one per slot (B options) ───────────────────

const _EVENTS_B = [

  // ── Round 1: Coal India Dividend (option B) · fires at END of round 1 ──────
  {
    round: 1,
    fireAt: 'end',
    type: 'dividend',
    stockId: 'COALINDIA',
    headline: '💰 Coal India declares ₹14 dividend per share',
    body: "Coal India Limited is India's state-owned coal mining monopoly — and one of the most generous dividend payers on the Nifty. Even as India debates its energy future, the company keeps mining record quantities and distributing its profits to shareholders. Today it announces a dividend of ₹14 per share for every share you hold. Dividends are the original passive income — you don't need to do anything. The cash simply arrives in your account. Coal India has paid dividends every single year for over a decade, often with a yield higher than a fixed deposit. This is why some investors hold unloved 'boring' businesses: not for price appreciation, but for the steady drip of income, regardless of what the market does.",
    perShare: 14,
  },

  // ── Round 2: HDFC Bank 1:2 Stock Split (option B) ───────────────────────────
  {
    round: 2,
    type: 'split',
    stockId: 'HDFCBANK',
    headline: '✂️ HDFC Bank announces 1:2 stock split — one share becomes two',
    body: "HDFC Bank is India's most consistently profitable private bank — twelve consecutive years of 20%+ profit growth. Its share price has climbed so high that smaller investors hesitate to buy even a single share. To keep the stock accessible, HDFC Bank announces a 1:2 stock split: every share you own becomes two shares at exactly half the price. Your total holding value is unchanged — the split is purely mechanical. But the lower price point attracts fresh retail investors, which often provides a demand-driven boost over the months that follow. Splits are a vote of confidence: management is signalling the growth will continue, and they want more retail investors on the journey with them.",
    ratio: 2,
  },

  // ── Round 3: Paytm IPO (option B) ──────────────────────────────────────────
  {
    round: 3,
    type: 'ipo',
    stockId: 'PAYTM',
    headline: "📲 Paytm IPO — India's payments giant goes public at ₹2,150",
    body: "As India's COVID lockdowns ease, the country's largest digital payments company is going public. Paytm processes hundreds of millions of transactions every month — from chai stalls to hospitals to five-star hotels. But unlike Zomato, which turned profitable before listing, Paytm is still burning cash at scale. The IPO is priced at ₹2,150 per share — a valuation that requires a very long view on when profits will arrive. Notably, the issue was only 1.89× oversubscribed: modest demand for an Indian tech IPO of this size. That's a signal. An IPO tells you what the company is worth TODAY — but you're betting on what it'll be worth years from now. Is this a world-changing payments platform, or an overpriced app? The market's lukewarm response gives you a hint.",
    ipoPrice: 2150,
    subscriptionX: 1.89,
  },

  // ── Round 4: HCL Tech 1:1 Bonus Shares (option B) ──────────────────────────
  {
    round: 4,
    type: 'bonus',
    stockId: 'HCLTECH',
    headline: "🎁 HCL Tech issues 1:1 bonus shares — your holding doubles overnight",
    body: "HCL Technologies has just had its best year since going public — record deal wins in cloud migration, semiconductor engineering, and enterprise software. To share this success with long-term shareholders, the company issues a 1:1 bonus: for every share you hold, you receive one more share completely free. The share count doubles. The price per share halves to reflect the extra shares in circulation. Your total holding value doesn't change in an instant — but you now own more shares of a company that's growing faster than almost any other in Indian tech. Bonus shares are funded from retained profits, not new money. This is the company saying: 'We've been profitable enough to build up reserves. Here — have some more shares.'",
    ratio: 1,
  },

  // ── Round 5: TCS Buyback (option B) ────────────────────────────────────────
  {
    round: 5,
    type: 'buyback',
    stockId: 'TCS',
    headline: '🔄 TCS buyback: sell up to 20% of your holding at a 15% premium',
    body: "Tata Consultancy Services is sitting on ₹52,000 crore of cash — more than the market cap of most Indian companies. Global IT spending has slowed, but TCS's margins remain the highest in the industry. The company has decided that the best investment it can make right now is in itself: it's buying back shares at a 15% premium to market price. You can tender up to 20% of your TCS holding and receive ₹3,680 per share — compared to the market price of ₹3,200. That 15% instant premium is guaranteed cash in your account. But there's a trade-off: by accepting, you reduce your exposure to TCS's future. If you believe TCS's AI-era growth is just beginning, you might hold. If you want to lock in gains, the buyback is your exit ramp.",
    premium: 0.15,
    maxPct: 0.20,
  },

  // ── Round 6: Airtel Rights Issue (option B) ────────────────────────────────
  {
    round: 6,
    type: 'rights',
    stockId: 'BHARTIARTL',
    headline: "📬 Airtel rights issue: buy 1 new share for every 5 you own, at 65% of market price",
    body: "Airtel has spent five years paying down a brutal debt burden — ₹1.6 lakh crore in liabilities at its worst. Today's rights issue marks a pivotal moment: Airtel is now strong enough to raise capital for GROWTH, not just survival. It's offering existing shareholders the right to buy 1 new share for every 5 they hold, at a 35% discount to market price — reserved for existing shareholders only. The capital raised will fund 5G spectrum and network infrastructure. Airtel's ARPU is recovering, margins are improving, and subscriber additions are back. This isn't a distress raise — it's a company on the offensive. The question is: do you believe in the turnaround story enough to double down?",
    ratio: 0.2,
    discount: 0.35,
  },
];

// ── Game slots — each slot has two options, one chosen randomly per game ──────

window.GAME_SLOTS = [
  { slotId: 'dividend', a: window.EVENT_SCRIPT[0], b: _EVENTS_B[0] },
  { slotId: 'split',    a: window.EVENT_SCRIPT[1], b: _EVENTS_B[1] },
  { slotId: 'ipo',      a: window.EVENT_SCRIPT[2], b: _EVENTS_B[2] },
  { slotId: 'bonus',    a: window.EVENT_SCRIPT[3], b: _EVENTS_B[3] },
  { slotId: 'buyback',  a: window.EVENT_SCRIPT[4], b: _EVENTS_B[4] },
  { slotId: 'rights',   a: window.EVENT_SCRIPT[5], b: _EVENTS_B[5] },
];

// ── Round year labels ─────────────────────────────────────────────────────────

window.ROUND_YEARS = ['2014', '2018', '2020', '2022', '2023', '2025'];

// ── Round context — story, lesson, and one-line sub-description ──────────────
// `subtitle` shows under the "Round X / 6" header on the host. Keep it short.

window.ROUND_CONTEXT = [
  {
    year: '2014',
    title: 'The Starting Gun — 8 Stocks, ₹2 Lakh',
    subtitle: 'First trades · dividend pays out at end of round',
    sentiment: { tag: '📈 BULLISH', text: 'Modi rally · Sensex up 25% on election results · retail money flooding in' },
    story: "It's 2014. Modi wins the biggest electoral majority India has seen in 30 years. The Sensex has already rallied 25% on the election result alone. Eight companies sit in front of you — from India's cigarette king to a tiny electronics manufacturer almost nobody has heard of yet. You have ₹2,00,000 to invest across a 12-year journey through one of the most dramatic decades in Indian market history. Tip: a dividend will pay out at the end of this round — make sure you hold the right stock to collect it.",
    lesson: "The most important decision in investing happens before you look at the price. Understand the business first. Who buys their product? Why would they keep buying it? Is the tailwind structural or just a trend? Start with the business, not the chart.",
  },
  {
    year: '2018',
    title: 'Jio\'s India — Demonetisation, Jio, Yes Bank Cracks',
    subtitle: 'Four years on · stock split signals confidence',
    sentiment: { tag: '⚠️ MIXED', text: "Jio's free-data revolution roars · Yes Bank's cracks hidden in the footnotes" },
    story: "Four years in. Modi cancelled 86% of India's currency overnight in 2016. Jio launched and signed 200 million users in 18 months with data so cheap it's almost free. Yes Bank's balance sheet looks fine in the annual reports — but private whispers at Dalal Street tell a darker story. Bad loans hidden across hundreds of corporate accounts. A founder under quiet investigation. The market, for now, isn't listening. Meanwhile, a stock split sends a signal of confidence. For those who understand corporate actions, signals are everywhere.",
    lesson: "Stocks can look fine right until they don't. Yes Bank was reporting 'strong profits' until the bailout. This is why investors should read the notes to the accounts, not just the headline numbers. Real economic value shows up in cash generation, not accounting entries.",
  },
  {
    year: '2020',
    title: 'COVID Crash — and One Unlikely IPO',
    subtitle: 'India locks down · an IPO opens',
    sentiment: { tag: '😱 PANIC', text: "COVID lockdown · Nifty -40% in weeks · Yes Bank collapses · maximum fear" },
    story: "Nobody saw this coming. India goes into one of the world's strictest lockdowns with four hours' notice. The market falls 40% in weeks. Yes Bank finally collapses — shareholders lose almost everything. Hotels, jewellery stores, fashion retail: all dark. But locked-down Indians are ordering food delivery in record numbers. A tech startup is about to go public — and the market's response will tell you everything about investor appetite at this moment.",
    lesson: "The best buying opportunities of your investing life will feel like the worst moments. The market prices in maximum fear, and fear is temporary. If you invested ₹1,00,000 in Nifty in March 2020, it was worth ₹2,00,000 by December 2020. Staying calm when everyone is panicking is the single hardest skill in investing.",
  },
  {
    year: '2022',
    title: 'V-Recovery + Rate Hike Storm',
    subtitle: 'Bounce back, then global rate shock · free bonus shares',
    sentiment: { tag: '🎢 WHIPLASH', text: 'V-recovery rally lifts everything · then a global rate-hike storm smashes loss-making tech' },
    story: "The lockdowns end. Vaccines roll out. India's GDP bounces back 8.4% in one year — one of the great comeback stories in market history. Then the mood snaps. US inflation hits 9.1%. The Federal Reserve begins the fastest rate hike cycle since 1980. Global capital floods out of 'risky' assets — emerging markets, loss-making tech companies, speculative IPOs. Defensive sectors hold. And one quietly thriving company rewards its long-term shareholders with bonus shares — doubling their count overnight.",
    lesson: "When global interest rates rise, money flows from growth stocks (valued on future profits) to defensive stocks (valued on current profits). Knowing where you are in the rate cycle is one of the most powerful tools an investor has. Not every year rewards the same kind of company.",
  },
  {
    year: '2023',
    title: 'India $3.5T — A Buyback Tells the Story',
    subtitle: 'Manufacturing tailwinds · cash-rich IT does a buyback',
    sentiment: { tag: '🚀 RESURGENT', text: 'India crosses $3.5T · manufacturing wins stack up · cash-rich IT buys back its own shares' },
    story: "India crosses $3.5 trillion in GDP. The PLI scheme is paying manufacturers to make things in India. Retail expansion continues at pace. IT sees a quiet recovery. A cash-rich tech giant offers to buy back its own shares at a premium — a signal that management believes the market is undervaluing the company.",
    lesson: "A buyback says the company thinks its own shares are cheap. It's one of the most shareholder-friendly things a profitable company can do — and often a quiet vote of confidence in the future.",
  },
  {
    year: '2025',
    title: 'India $4T — Final Round, A Rights Issue',
    subtitle: 'Last action · rights issue for existing holders',
    sentiment: { tag: '🏁 CRESTING', text: "India is now the world's 4th-largest economy · final round · twelve years of decisions come home" },
    story: "India is now the world's fourth-largest economy. From ₹2,00,000 in 2014, your portfolio has been shaped by eleven years of real decisions: demonetisation, a global pandemic, an IPO, a stock split, a bonus issue, a buyback — and dozens of trades in between. One last corporate action: a company raises capital from existing shareholders at a deep discount to fund the next phase of growth. Will you back the story?",
    lesson: "Corporate actions are signals. A rights issue says the company is growing and needs fuel. Different actions, different messages. The best investors weren't always right about everything — they were the ones who stayed invested, kept learning, and held long enough for the businesses they believed in to prove themselves.",
  },
];

// ── Bots ──────────────────────────────────────────────────────────────────────

window.BOT_NAMES = [
  { name: 'Maya',  color: '#1a5c47', emoji: '🦉' },
  { name: 'Theo',  color: '#3b82c4', emoji: '🐘' },
  { name: 'Zara',  color: '#7c3aed', emoji: '🦋' },
  { name: 'Kai',   color: '#dc2626', emoji: '🦊' },
  { name: 'Iris',  color: '#c44d8c', emoji: '🐝' },
  { name: 'Asha',  color: '#d4953a', emoji: '🦁' },
];

// ── Avatar colours for human players ─────────────────────────────────────────

window.AVATAR_COLORS = [
  '#1a5c47', '#1f7a4d', '#d4953a', '#7c3aed',
  '#c44d8c', '#3b82c4', '#dc2626', '#2a9d8f',
];

// ── Player avatars ────────────────────────────────────────────────────────────

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

// ── Brand tagline ─────────────────────────────────────────────────────────────
window.IFM_TAGLINE = 'A decade of India\'s markets · in 30 minutes';

// ── 2026 reveal finale — prices for ALL 16 stocks ────────────────────────────

window.FINAL_PRICES_ALL = {
  ITC: 380, RELIANCE: 2900, INFY: 1200, YESBK: 24,
  TITAN: 750, TRENT: 5800, DIXON: 18000, DMART: 3300,
  ZOMATO: 280,
  COALINDIA: 395, HDFCBANK: 1880, PAYTM: 520,
  HCLTECH: 1760, TCS: 4600, BHARTIARTL: 1920, BAJFIN: 9200,
  ONGC: 290, WIPRO: 480, ZEEL: 110,
};

// Alias for backward compat
window.FINAL_PRICES = window.FINAL_PRICES_ALL;

window.FINAL_NEWS = {
  headline: '2026 — One Year Later',
  subhead: "AI capex booms. India's services sector cools. Quick commerce reshapes retail. Here's how every stock closed your story.",
  notes: {
    ITC:        { dir: 'up',   pct: 15,  why: "Hotel demerger fully settled. FMCG margin recovery + cigarette pricing power. Patient holders rewarded." },
    RELIANCE:   { dir: 'up',   pct: 12,  why: "Jio launches AI-powered services; retail margins expand. The mega-cap quietly keeps compounding." },
    INFY:       { dir: 'down', pct: 14,  why: "Global IT spending freezes. Banks delay digital transformation contracts. AI replaces routine work." },
    YESBK:      { dir: 'up',   pct: 33,  why: "First profitable year since the bailout. Loyal holders from 2020 finally see the recovery." },
    TITAN:      { dir: 'up',   pct: 10,  why: "Gold prices stay elevated. Wedding-season demand + Tanishq pricing power. Steady wins again." },
    TRENT:      { dir: 'down', pct: 8,   why: "Zudio margin concerns surface. The market questions whether ₹999 fast fashion can keep its hot streak." },
    DIXON:      { dir: 'up',   pct: 20,  why: "Apple awards more iPhone assembly contracts. PLI tailwind continues. The decade's clearest winner cements its lead." },
    DMART:      { dir: 'down', pct: 8,   why: "Blinkit and Zepto eat into same-store sales. The 'boring grocery king' suddenly looks vulnerable." },
    ZOMATO:     { dir: 'up',   pct: 27,  why: "Blinkit IPO talks lift the whole company. Quick commerce becomes the new battleground — Zomato dominates." },
    COALINDIA:  { dir: 'down', pct: 4,   why: "India's solar capacity additions break records. Long-term coal demand concerns return. Dividend yield still attracts income investors — but growth is capped." },
    HDFCBANK:   { dir: 'up',   pct: 7,   why: "Post-merger synergies deliver. India's largest private bank quietly keeps compounding. Boring? Yes. Reliable? Absolutely." },
    PAYTM:      { dir: 'down', pct: 13,  why: "Still below IPO price after 5 years. A brutal reminder: even in a booming economy, valuation discipline matters more than growth rates." },
    HCLTECH:    { dir: 'up',   pct: 5,   why: "AI engineering projects land with global manufacturers. The product+services model weathers commoditisation of basic IT outsourcing." },
    TCS:        { dir: 'up',   pct: 10,  why: "AI services boom. TCS captures more enterprise AI projects than any other Indian IT firm. Scale and trust remain the ultimate moat." },
    BHARTIARTL: { dir: 'up',   pct: 16,  why: "5G monetisation now visible in the numbers. Enterprise contracts growing. Airtel's decade-long turnaround is now undeniable." },
    BAJFIN:     { dir: 'up',   pct: 5,   why: "New product launches in mortgages and SME lending. India's credit penetration still growing. The compounding machine keeps rolling." },
    ONGC:       { dir: 'up',   pct: 7,   why: "Modest bounce from Round 6. But from your 2014 entry price of ₹380, investors are still underwater after 12 years. A masterclass in how government ownership destroys long-term value creation." },
    WIPRO:      { dir: 'down', pct: 6,   why: "Slightly lower than Round 6. Twelve years of running to stand still while TCS did 3.5×. Third place in a two-horse IT race is a very real result." },
    ZEEL:       { dir: 'down', pct: 19,  why: "From ₹610 at its 2018 peak to ₹110 in 2026. A great content business destroyed by promoter share pledging and corporate governance failure. The original red flag, ignored." },
  },
};

// ── Round durations (seconds) — auto-advance is disabled ─────────────────────
window.ROUND_DURATIONS = [180, 150, 130, 120, 100, 90];

// ── Round transition news — teacher popup at START of each new round ──────────
// Index = round number − 1. null = no popup. Notes include ALL 16 possible
// stocks; the popup filters to only show stocks active in this game session.

window.ROUND_NEWS = [
  // Round 1 — 2014, no popup (game start)
  null,

  // Round 2 — 2018: combined 2014→2018 transition (4-year window)
  {
    headline: 'Four Years On — Demonetisation, Jio, Yes Bank Cracks',
    subhead: "2014 to 2018: Modi cancels 86% of cash overnight. Jio's free-data revolution. Yes Bank's slow-motion collapse begins. A stock split fires this round.",
    notes: {
      ITC:        { dir: 'down', pct: 18,  why: "Cigarette stocks dip on demonetisation cash shock + early ESG concerns. Steady FMCG holds underneath." },
      RELIANCE:   { dir: 'up',   pct: 55,  why: "Jio's data revolution begins. Investors start pricing in the digital decade ahead." },
      INFY:       { dir: 'down', pct: 3,   why: "CEO Sikka resigns amid boardroom conflict. US visa curbs add pressure on margins." },
      YESBK:      { dir: 'down', pct: 38,  why: "Slow-motion collapse begins. Hidden bad loans + founder under RBI scrutiny. Annual reports look fine — for now." },
      TITAN:      { dir: 'up',   pct: 137, splitAdjusted: true, why: "SPLIT ADJUSTED: Titan did a 1:5 split this round. Pre-split equivalent ₹900 vs ₹380 in 2014 — up 137% in real terms. Wedding-season jewellery demand stays strong." },
      TRENT:      { dir: 'up',   pct: 89,  why: "First Zudio stores open. ₹999 jeans find their audience fast." },
      DIXON:      { dir: 'up',   pct: 143, why: "Make-in-India momentum builds. Contract electronics wins pile up. The quiet compounder begins its run." },
      DMART:      { dir: 'up',   pct: 419, why: "DMart IPO'd at ₹295 in 2017. Listed at over ₹600 on Day 1. The lowest-price retail model is unstoppable." },
      COALINDIA:  { dir: 'down', pct: 27,  why: "Renewable shift creates long-term coal demand uncertainty. Demonetisation hurt cash-dependent distributors." },
      HDFCBANK:   { dir: 'up',   pct: 150, splitAdjusted: true, why: "SPLIT ADJUSTED: 1:2 split fires this round. Pre-split equivalent ₹2,050 vs ₹820 in 2014. India's best private bank keeps compounding." },
      HCLTECH:    { dir: 'up',   pct: 200, why: "Massive IT cloud + engineering cycle begins. Large infrastructure and cloud deals stack up." },
      TCS:        { dir: 'up',   pct: 67,  why: "BFSI sector spending boom in US and Europe. TCS wins record deals — the IT sector's premium player." },
      BHARTIARTL: { dir: 'up',   pct: 6,   why: "Jio's free-data offer devastates ARPU through 2016-17. Airtel barely holds, then starts fighting back with bundles." },
      BAJFIN:     { dir: 'up',   pct: 519, why: "Consumer credit takes off. Two-wheeler and electronics EMI captures middle India's aspiration economy." },
      ONGC:       { dir: 'down', pct: 51,  why: "Oil crash + petroleum cess + government dividend demands. Every rupee ONGC earns is partially handed back to Delhi. The PSU discount widens." },
      WIPRO:      { dir: 'down', pct: 45,  why: "Strategy unclear. Clients give the big deals to TCS and Infosys. Wipro loses market share quietly but consistently." },
      ZEEL:       { dir: 'up',   pct: 60,  why: "Zee hits its 2018 peak. Content is king — regional channels, Hindi soaps, sports. The pledge on the founder's shares is growing — buried in the fine print." },
    },
  },

  // Round 3 — 2020: COVID Crash (was R4)
  {
    headline: 'COVID Crash — India Locked Down',
    subhead: "2018 to 2020: a global pandemic arrives with four hours' notice. The market fell 40% in weeks. Yes Bank finally collapsed.",
    notes: {
      ITC:        { dir: 'down', pct: 46,   why: "Hotels shut. Cigarette consumption fell. The FMCG brand portfolio held up, but it wasn't enough." },
      RELIANCE:   { dir: 'down', pct: 33,   why: "The oil price crash crushed refining margins. Jio and retail offset some damage — but not all." },
      INFY:       { dir: 'down', pct: 33,   why: "IT projects were initially frozen. But digital transformation contracts were quietly beginning to surge." },
      YESBK:      { dir: 'down', pct: 97,   why: "The RBI stepped in, replaced the board, and forced a bailout. Shareholders lost almost everything. The most important lesson in this game." },
      TITAN:      { dir: 'up',   pct: 11,   why: "Post-split: ₹180 → ₹200. Jewellery stores shut for months — yet Titan barely moved. Pent-up demand was quietly building." },
      TRENT:      { dir: 'up',   pct: 76,   why: "Zudio's value fashion model survived lockdown better than expected. Store expansion resumed the moment restrictions lifted." },
      DIXON:      { dir: 'up',   pct: 1507, why: "The PLI (Production Linked Incentive) scheme is announced. Dixon becomes India's contract electronics manufacturer of choice. One of the decade's biggest single moves." },
      DMART:      { dir: 'up',   pct: 43,   why: "Essential goods meant DMart stayed open through lockdowns. Grocery demand surged. The 'boring' stock was suddenly brilliant." },
      COALINDIA:  { dir: 'down', pct: 54,   why: "COVID locked down construction and power demand. Coal usage fell sharply. Clean-energy narrative intensified." },
      HDFCBANK:   { dir: 'down', pct: 41,   why: "COVID crash. Loan moratoriums dented confidence. India's best bank still fell 41% at worst — quality doesn't protect you in a panic." },
      HCLTECH:    { dir: 'down', pct: 37,   why: "COVID freezes tech spending briefly. But HCL Tech's product business adds resilience vs peers." },
      TCS:        { dir: 'up',   pct: 15,   why: "COVID accelerated digital transformation. Every bank wanted TCS to migrate their systems to cloud. Remote delivery proved TCS could scale globally." },
      BHARTIARTL: { dir: 'up',   pct: 31,   why: "Rights issue completed. AGR dues settled with government. Balance sheet cleaned up. Airtel's turnaround story begins to attract believers." },
      BAJFIN:     { dir: 'down', pct: 19,   why: "COVID hit consumer spending hard. EMI moratoriums granted. But credit quality held better than peers — Bajaj Finance's underwriting standards paid off." },
      ONGC:       { dir: 'down', pct: 62,  why: "COVID wipes out oil demand overnight. The global price of oil briefly went negative. ONGC's upstream business is devastated, and the government still wants its dividend." },
      WIPRO:      { dir: 'down', pct: 32,  why: "IT spending freezes globally as clients scramble to manage COVID. Wipro is exposed to sectors hit hardest — manufacturing, hospitality, retail tech." },
      ZEEL:       { dir: 'down', pct: 75,  why: "The Essel Group crisis explodes. Promoter Subhash Chandra's infrastructure companies can't repay loans taken against Zee shares. Lenders sell. Shares collapse. From ₹610 to ₹150 in two years." },
    },
  },

  // Round 4 — 2022: combined V-recovery + rate hike (2020→2022, was old R5 + R6)
  {
    headline: 'V-Recovery, then Rate Hike Storm',
    subhead: "2020 to 2022: India's GDP bounces back 8.4%. Then US inflation hits 9.1% and the Fed begins the fastest rate-hike cycle in 40 years. Bonus shares fire this round.",
    notes: {
      ITC:        { dir: 'up',   pct: 107, why: "FMCG recovers strongly, then defensive sectors hold through the rate-hike storm. ITC's resilience finally gets recognised." },
      RELIANCE:   { dir: 'up',   pct: 164, why: "Jio monetises. Retail acquisitions accelerate. Three businesses firing simultaneously through the recovery and rate cycle." },
      INFY:       { dir: 'up',   pct: 107, why: "Digital transformation boom 2021, then a global IT freeze in 2022. Net result over the two years: still up." },
      YESBK:      { dir: 'up',   pct: 25,  why: "Slow recovery from bailout lows. Still a fraction of its peak — but green for the first time in years." },
      TITAN:      { dir: 'up',   pct: 148, why: "Pent-up jewellery demand. Gold prices stay high through inflation. Real-asset categories shine when paper assets wobble." },
      TRENT:      { dir: 'up',   pct: 130, bonusAdjusted: true, why: "BONUS ADJUSTED: 1:1 bonus may fire this round. Pre-bonus Trent ~₹2,760 vs ₹600 in 2020 — up 360% in real terms. Post-bonus price ₹1,380." },
      DIXON:      { dir: 'up',   pct: 5,   why: "PLI-driven surge already priced in. Modest gains as the market weighs global component supply concerns." },
      DMART:      { dir: 'up',   pct: 113, why: "Essential goods king through COVID. Then quick-commerce worries set in late 2022." },
      ZOMATO:     { dir: 'down', pct: 24,  why: "Post-IPO bounce to ₹155, then the rate-hike storm crushed loss-making tech. Brutal lesson in valuation risk." },
      PAYTM:      { dir: 'down', pct: 80,  why: "IPO crash from ₹2,150. Payments Bank ban devastates sentiment. The decade's biggest IPO disappointment." },
      COALINDIA:  { dir: 'up',   pct: 96,  why: "Global power crisis. Europe bans Russian coal, India's exports surge. The fossil fuel everyone dismissed is essential again." },
      HDFCBANK:   { dir: 'up',   pct: 158, why: "V-recovery + rate-hike margin tailwind. HDFC merger announced but synergies still ahead." },
      HCLTECH:    { dir: 'up',   pct: 72,  bonusAdjusted: true, why: "BONUS ADJUSTED: 1:1 bonus may fire this round. Pre-bonus HCL ~₹2,200 vs ₹640 in 2020 — up 244% in real terms. Post-bonus price ₹1,100." },
      TCS:        { dir: 'up',   pct: 39,  why: "Digital transformation peak 2021, slowdown 2022. Net: up modestly. The cash mountain grows." },
      BHARTIARTL: { dir: 'up',   pct: 91,  why: "5G spectrum won. ARPU recovery. Tariff hikes go through without losing subscribers — pricing power confirmed." },
      BAJFIN:     { dir: 'up',   pct: 195, why: "Consumer credit V-recovery. Nearly tripled from COVID lows. Rate hikes start squeezing margins late." },
      ONGC:       { dir: 'up',   pct: 121, why: "Oil demand roars back. Then a windfall tax takes the gains. ONGC rallies on paper; Delhi takes it back." },
      WIPRO:      { dir: 'up',   pct: 110, why: "IT boom lifts Wipro briefly, then rate-hike freeze hits. Still trails TCS and Infosys." },
      ZEEL:       { dir: 'up',   pct: 50,  why: "Sony merger hope drives a bounce. Then delays start eating shareholder patience. Volatile." },
    },
  },

  // Round 5 — 2023: "India Roars Back" (was R7)
  {
    headline: 'India Roars Back — GDP Clears $3.5 Trillion',
    subhead: "2022 to 2023: infrastructure spending soars, manufacturing wins stack up, the IPO stock turns the corner.",
    notes: {
      ITC:        { dir: 'up',   pct: 45,  why: "Hotel demerger rumours + FMCG margin recovery + ESG narrative. The market finally rewards patience." },
      RELIANCE:   { dir: 'up',   pct: 5,   why: "Steady growth. The mega-cap is so large now that percentage gains naturally slow. Quality compounding." },
      INFY:       { dir: 'up',   pct: 3,   why: "Quiet recovery. Some deal wins return. Market hasn't fully re-rated it yet." },
      YESBK:      { dir: 'up',   pct: 7,   why: "Slow and steady. Still 98% below its 2018 peak. A reminder of what mismanagement costs." },
      TITAN:      { dir: 'up',   pct: 29,  why: "India's gold rush continues. Tanishq expands aggressively. The consumer darling of the decade." },
      TRENT:      { dir: 'up',   pct: 52,  why: "Zudio everywhere. ₹999 kurtas, ₹599 T-shirts, packed stores. The growth story is real and accelerating." },
      DIXON:      { dir: 'up',   pct: 2,   why: "Rights issue raises fresh capital for expansion. Near-term dilution tempers the share price reaction." },
      DMART:      { dir: 'down', pct: 11,  why: "Quick commerce takes a bigger bite. Same-store sales slow further. The market reprices the risk." },
      ZOMATO:     { dir: 'up',   pct: 107, why: "Blinkit profitable ahead of schedule. Food delivery dominant. Zomato is the comeback story of the year." },
      PAYTM:      { dir: 'up',   pct: 86,  why: "New payment verticals and lending start showing results. Still far below the IPO price — but the worst may be over." },
      COALINDIA:  { dir: 'up',   pct: 36,  why: "India's power demand hits record highs. Coal India signs long-term contracts. The dividend yield stays exceptional." },
      HDFCBANK:   { dir: 'up',   pct: 5,   why: "HDFC merger completes. One of India's largest-ever corporate integrations. Temporary de-rating while market awaits synergies." },
      HCLTECH:    { dir: 'up',   pct: 24,  why: "Mid-size IT deal wins. Cloud migration keeps revenue growing even as larger peers face pressure." },
      TCS:        { dir: 'up',   pct: 9,   why: "Modest recovery. TCS still wins mega deals. The buyback this round reflects its confidence in its own shares." },
      BHARTIARTL: { dir: 'up',   pct: 27,  why: "5G rollout ahead of schedule. Enterprise contracts pick up. Rights issue fires this round — existing shareholders get discounted shares." },
      BAJFIN:     { dir: 'up',   pct: 23,  why: "Margin recovery as rate cycle peaks. New SME and mortgage verticals diversify revenue beyond consumer credit." },
      ONGC:       { dir: 'up',   pct: 16,  why: "PSU re-rating: the market starts valuing state-owned companies more fairly. ONGC gets a modest bump. But it's still trading below its 2014 price on a real-returns basis." },
      WIPRO:      { dir: 'down', pct: 8,   why: "Still struggling to close the gap on TCS and Infosys. Deal wins are smaller, margins are lower. The IT sector's perennial third place keeps finishing third." },
      ZEEL:       { dir: 'down', pct: 2,   why: "Sony merger drags on. The National Company Law Tribunal is still deliberating. Shareholders are exhausted. Every month of delay is another month of uncertainty discount." },
    },
  },

  // Round 6 — 2025: "India at $4 Trillion" (was R8) — final playable round
  {
    headline: 'India at $4 Trillion — Eleven Years of Decisions Come Home',
    subhead: "2023 to 2025: every portfolio choice you made since 2014 is now reflected in your final number. A rights issue fires this round — your last corporate action.",
    notes: {
      ITC:        { dir: 'down', pct: 27,  why: "Hotel demerger completed, but cigarette business faces long-term headwinds. The market corrects its earlier enthusiasm." },
      RELIANCE:   { dir: 'up',   pct: 4,   why: "Growth continues — but the company is so large now that doubling is no longer possible. Steady, not spectacular." },
      INFY:       { dir: 'down', pct: 7,   why: "Global IT slowdown deepens. US companies tighten tech budgets. Two consecutive revenue misses." },
      YESBK:      { dir: 'up',   pct: 13,  why: "Still alive. The quiet recovery continues. A decade-long lesson in the cost of financial mismanagement." },
      TITAN:      { dir: 'up',   pct: 6,   why: "Steady as ever. Gold prices remain high, brand remains strong. Growth is moderating but so is risk." },
      TRENT:      { dir: 'up',   pct: 200, why: "The decade's most surprising retailer. Every mall, every high street. ₹2,100 → ₹6,300 — Zudio's unstoppable march." },
      DIXON:      { dir: 'up',   pct: 213, why: "Apple chooses India. Dixon wins major iPhone assembly contracts. The decade's biggest Make-in-India winner — by a mile." },
      DMART:      { dir: 'down', pct: 5,   why: "Same-store sales growth is slowing. Premium grocery rivals are catching up. The easy growth years may be behind it." },
      ZOMATO:     { dir: 'up',   pct: 83,  why: "Blinkit profitable. Food delivery dominant. India's urban dinner is a Zomato story — and the market believes it." },
      PAYTM:      { dir: 'down', pct: 23,  why: "Regulatory headwinds continue. Still trading below IPO price after 4+ years. A painful lesson: growth stories need profitable businesses behind them." },
      COALINDIA:  { dir: 'up',   pct: 28,  why: "India is the last major economy still building coal plants. For now, Coal India's monopoly on domestic production keeps it profitable." },
      HDFCBANK:   { dir: 'up',   pct: 9,   why: "Post-merger benefits begin to flow. HDFC Bank is now one of the world's most valuable banks by market cap. Patience rewarded." },
      HCLTECH:    { dir: 'up',   pct: 24,  why: "AI services adoption accelerates. HCL Tech's engineering-led model well positioned for the automation era." },
      TCS:        { dir: 'up',   pct: 20,  why: "AI services boom. TCS captures more enterprise AI projects than any other Indian IT company. Scale and trust remain the ultimate moat." },
      BHARTIARTL: { dir: 'up',   pct: 47,  why: "5G monetisation kicks in. Airtel now rivals Jio in premium subscribers. A decade-long turnaround cementing itself." },
      BAJFIN:     { dir: 'up',   pct: 16,  why: "New product launches. India's credit penetration still growing. The compounding machine rolls on." },
      ONGC:       { dir: 'up',   pct: 50,  why: "From post-COVID lows, oil recovers. ONGC has a good year in absolute terms. But from your 2014 entry of ₹380, you've spent 11 years going backwards. That's the PSU story." },
      WIPRO:      { dir: 'up',   pct: 33,  why: "IT recovery lifts Wipro. The stock bounces — but TCS is at ₹4,200 and Infosys is at ₹1,400. Wipro: ₹510. The compounding gap, accumulated over a decade, is now impossible to ignore." },
      ZEEL:       { dir: 'down', pct: 39,  why: "Sony terminates the merger. After three years of waiting, the deal collapses over disagreements on terms. Zee is now independent again — and worth far less than when the talks started." },
    },
  },
];

// ── Game configuration ────────────────────────────────────────────────────────

window.GAME_CONFIG = {
  rounds: 6,
  startingCash: 200000,
  tickMs: 1000,
  roomCode: 'GO25',
  gameKey: 'pro',
  ipoApplyOptions: [10000, 25000, 50000],
  ipoAllocationMin: 30,
  ipoAllocationMax: 45,
};

// ── Stock picker — called once per fresh game, result stored in state ─────────
// Returns { stocks, roundPrices, eventScript, ipoStockMeta, finalPrices }
// where `stocks` = the 8 non-IPO active stocks for this session.

window.pickGameStocks = function () {
  // Pick one event per slot (A or B, 50/50)
  const selectedEvents = window.GAME_SLOTS.map(slot =>
    ({ ...(Math.random() < 0.5 ? slot.a : slot.b) })
  );

  // Background variable: one of 5 options (includes the 3 underperformers)
  const BG_POOL = ['DMART', 'BAJFIN', 'ONGC', 'WIPRO', 'ZEEL'];
  const bgExtra = BG_POOL[Math.floor(Math.random() * BG_POOL.length)];

  // Build active stock IDs
  const ipoEvent      = selectedEvents.find(ev => ev.type === 'ipo');
  const nonIpoIds     = selectedEvents.filter(ev => ev.type !== 'ipo').map(ev => ev.stockId);
  const alwaysIds     = ['RELIANCE', 'YESBK', bgExtra];
  const nonIpoActive  = [...alwaysIds, ...nonIpoIds]; // 8 stocks (no IPO stock yet)
  const allActiveIds  = [...nonIpoActive, ipoEvent.stockId];

  // Pull metadata from STOCK_POOL
  const getStock = id => (window.STOCK_POOL || []).find(s => s.id === id) || null;
  const stocks       = nonIpoActive.map(getStock).filter(Boolean);
  const ipoStockMeta = getStock(ipoEvent.stockId);

  // Build per-round price tables filtered to active stocks only
  const roundPrices = (window.ROUND_PRICES_ALL || []).map(row => {
    const out = {};
    for (const id of allActiveIds) {
      if (row[id] !== undefined) out[id] = row[id];
    }
    return out;
  });

  // Build finale prices filtered to active stocks
  const finalPrices = {};
  const FA = window.FINAL_PRICES_ALL || {};
  for (const id of allActiveIds) {
    if (FA[id] !== undefined) finalPrices[id] = FA[id];
  }

  return { stocks, roundPrices, eventScript: selectedEvents, ipoStockMeta, finalPrices };
};
