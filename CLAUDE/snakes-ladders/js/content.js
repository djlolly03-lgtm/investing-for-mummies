/* content.js — the curriculum, as data. Pure data + three lookups. No logic, no DOM.
   Transcribed from docs/CONTENT.md. Every rupee figure re-checked by hand; the working
   lives inside the 'deep' text so anyone can re-derive it.

   House rules, obeyed here and gated by tests/content.test.mjs:
   · No return is ever promised. Growth carries the literal words "not guaranteed".
   · No percentage without a rupee amount in the same field.
   · Indian digit grouping everywhere — ₹1,00,000, never ₹100,000.
   · Snakes indict the mechanism and name the counterparty. Never the player.
   · Weddings, medical care, education and parents are never a snake.
   · Numbers go stale. Sources and vintage live in docs/CONTENT.md §6. Review annually. */

/* ── zones (DESIGN §4) ──────────────────────────────────────────────── */
export const ZONES = [
  { id: 1, from: 1,  to: 20,  name: 'Ghar ka hisaab',        teaches: 'Where the money goes; mehngai; the first ₹500.' },
  { id: 2, from: 21, to: 40,  name: 'Bura waqt aur kaagaz',  teaches: 'The buffer, the paperwork, insurance vs investment, the card.' },
  { id: 3, from: 41, to: 60,  name: 'Suraksha aur dhokha',   teaches: 'Health cover, term cover, chain systems, pledged gold.' },
  { id: 4, from: 61, to: 80,  name: 'Badhna',                teaches: 'SIP, cost, trading vs investing, patience.' },
  { id: 5, from: 81, to: 100, name: 'Kaagaz aur manzil',     teaches: 'Scams, nominee, telling the family, the goal.' },
];
export const zoneOf = (n) => ZONES.find(z => n >= z.from && n <= z.to) || null;

/* ── the 100 squares ────────────────────────────────────────────────────
   kind: 'plain' | 'lesson' | 'quiz' | 'event' | 'milestone' | 'finish'
   Ladder feet and snake heads carry kind:'lesson' and are resolved through
   ladderAt() / snakeAt() — the card text lives on the LADDER/SNAKE object. */
export const SQUARES = [
  { n: 1, kind: 'plain', title: 'Pehla kadam',
    lesson: 'Everyone here starts on the same square. No money knowledge needed. Just roll.' },

  { n: 2, kind: 'plain', title: 'Paisa aata, chala jaata',
    lesson: 'Salary comes on the 1st and is gone by the 20th. Today we find out where.' },

  { n: 3, kind: 'lesson', title: 'Saat din ka hisaab',
    lesson: 'Write down every rupee that goes out, for seven days. Only that.' },

  { n: 4, kind: 'plain', title: 'Do chai roz',
    lesson: 'Two ₹30 chais a day is ₹21,900 a year. Not a sin. Just worth knowing.' },

  { n: 5, kind: 'plain', title: 'Ghar ka kharcha',
    lesson: 'Rent, ration, fees, bijli, dawai. These come first, and nobody need feel bad.' },

  { n: 6, kind: 'plain', title: 'Shauk bhi zaroori',
    lesson: 'Everything else is a want. Not wrong — just what you can pause in a bad month.' },

  { n: 7, kind: 'plain', title: 'Mehngai chupke se', term: 'Inflation',
    lesson: 'A ₹50 plate this year is about ₹53 next year. This board uses 6% mehngai all through.' },

  { n: 8, kind: 'quiz', title: 'Andaza lagao', term: 'Inflation',
    lesson: 'Guess first: a cinema ticket cost ₹60 in 2006. What is it today?',
    quiz: {
      question: 'A cinema ticket cost ₹60 in 2006. Today?',
      chips: ['About ₹120', 'About ₹250'],
      reveal: 'Zyaadatar log kam bataate hain. About ₹250 — roughly four times in twenty years. Tickets rose faster than the 6% mehngai this board uses. Nothing went wrong.',
    } },

  { n: 9, kind: 'plain', title: 'Neeche se phir se',
    lesson: 'Back near the bottom. Everybody stands here once. Nothing is lost yet.' },

  { n: 10, kind: 'milestone', title: 'Dus ka nishaan', term: 'Inflation',
    lesson: 'Ten squares. You already know one true thing: quiet money quietly shrinks.',
    bullets: [
      'Money left alone does not stay still.',
      'Mehngai moves it quietly, every single year.',
      'That is why "bas safe rakho" was never a plan.',
    ],
    action: 'Pick one thing you buy every month and ask what it cost ten years ago.',
    deep: 'At about 6% mehngai, ₹1,00,000 kept in a steel dabba for twenty years buys roughly ₹31,000 worth of things. The working is ₹1,00,000 divided by 1.06, twenty times over, and that comes to about 3.21. A cinema ticket that cost ₹60 in 2006 is around ₹250 today. Nothing went wrong and nobody stole anything. The rupees simply bought less each year.' },

  { n: 11, kind: 'plain', title: 'Dabbe mein paisa',
    lesson: 'Cash at home feels safest. It is also the only money that never grows.' },

  { n: 12, kind: 'lesson', title: 'Pehli SIP — ₹500', term: 'SIP',
    lesson: '₹500 a month, one date, one fund. The first one is the hardest.',
    heritage: 'The old board called this square shraddha — faith. The hardest step is still the first one.' },

  { n: 13, kind: 'plain', title: 'Kisi ko bataya nahi',
    lesson: 'You started quietly. That is allowed. Money needs nobody’s permission.' },

  { n: 14, kind: 'plain', title: 'Byaj pe byaj', term: 'Compound interest',
    lesson: 'Your byaj starts earning its own byaj. Slow for years, then not slow.' },

  { n: 15, kind: 'event', title: 'Jhatka',
    lesson: 'Something broke this month. Nobody planned it. Draw a card.',
    event: {
      name: 'Scooter kharab',
      line: 'A ₹4,000 repair, no warning.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. Yeh wahi hai jiske liye buffer hota hai.',
    } },

  { n: 16, kind: 'plain', title: 'Chhota shuru karo',
    lesson: '₹500 a month is a real start. Waiting for a big amount is how ten years pass.' },

  { n: 17, kind: 'lesson', title: 'Aadhaar se mobile jodo', term: 'KYC',
    lesson: 'Your Aadhaar must carry the phone you use today, or nothing online opens.' },

  { n: 18, kind: 'plain', title: 'Bank ki line',
    lesson: 'You have stood in that line for everyone else. Today it is for this.' },

  { n: 19, kind: 'plain', title: 'Naam ek jaisa ho', term: 'PAN',
    lesson: 'PAN, Aadhaar and bank must show the same spelling. One letter stops everything.' },

  { n: 20, kind: 'plain', title: 'Phir chalo',
    lesson: 'You lost squares, not the game. The ones who keep rolling reach 100.' },

  { n: 21, kind: 'plain', title: 'Hisaab saaf hai',
    lesson: 'Income, kharcha, and the gap between them. Most people never write it down.' },

  { n: 22, kind: 'plain', title: 'Leak mil gaya',
    lesson: 'You found the leak. The same salary now goes further, with no raise.' },

  { n: 23, kind: 'plain', title: 'Bacchon ki fees',
    lesson: 'School fees rise every year, so money kept for them has to grow too.' },

  { n: 24, kind: 'lesson', title: 'Safe ka matlab', term: 'FD',
    lesson: 'A ₹1,00,000 FD earns ₹6,500 a year. Mehngai quietly eats about ₹6,000 of it.',
    why: 'Safe means nothing can go wrong. Mehngai is the thing going wrong, quietly.',
    action: 'Keep three months of kharcha where you can reach it in a day. Stop calling the rest safe.',
    deep: '₹1,00,000 in an FD at 6.5% earns ₹6,500 in a year. At 6% mehngai, about ₹6,000 of buying power quietly disappears. What is really left is around ₹500. If the house also pays income tax on that ₹6,500, there is nothing left at all. The FD did its job and protected the rupees. It was never built to protect what the rupees can buy.' },

  { n: 25, kind: 'lesson', title: 'Bura Waqt Fund', term: 'Emergency fund',
    lesson: 'Three months of kharcha, reachable in one day. This is your shield.' },

  { n: 26, kind: 'plain', title: 'Kahan rakhein', term: 'Liquidity',
    lesson: 'Emergency money belongs in a bank, not a lock-in. Speed beats return here.' },

  { n: 27, kind: 'lesson', title: 'FD se better scheme', term: 'Endowment / money-back',
    lesson: 'Sold as better than FD. A 15-year policy paying about ₹4,000 a year per ₹1,00,000.' },

  { n: 28, kind: 'plain', title: 'Sabak mila',
    lesson: 'That fall cost squares. It also taught the most expensive lesson here.' },

  { n: 29, kind: 'quiz', title: 'Kya hota agar', term: 'Emergency fund',
    lesson: 'Guess: if income stopped tomorrow, how many months could this house run?',
    quiz: {
      question: 'If income stopped tomorrow, how long could this house run?',
      chips: ['One month or less', 'Three months or more'],
      reveal: 'Most households answer "one month or less", and they are being honest. Three months of kharcha set aside is the target.',
    } },

  { n: 30, kind: 'plain', title: 'SIP chalu hai', term: 'SIP',
    lesson: 'Your ₹500 is now working every single day, without you doing anything.' },

  { n: 31, kind: 'event', title: 'Jhatka',
    lesson: 'Somebody at home is ill. Nobody planned this. Draw a card.',
    event: {
      name: 'Ghar mein beemari',
      line: '₹80,000 in two days. Nobody planned it.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. A buffer is what buys the time.',
    } },

  { n: 32, kind: 'plain', title: 'Ek file, ek shelf',
    lesson: 'PAN, Aadhaar, policies, passbooks. One folder. Somebody will need it.' },

  { n: 33, kind: 'plain', title: 'KYC ek hi baar', term: 'KYC',
    lesson: 'KYC is done once for all mutual funds. Twenty minutes, and usually not again for years.' },

  { n: 34, kind: 'plain', title: 'Video mein PAN', term: 'PAN',
    lesson: 'Good light, PAN facing the camera. Most rejections are only bad light.' },

  { n: 35, kind: 'lesson', title: 'Do alag cheezein', term: 'Term insurance',
    lesson: 'Bundled plans return about ₹3,000 to ₹5,500 a year per ₹1,00,000. Never one for both.',
    why: 'Insurance protects the family. Investment grows money. One product is never good at both.',
    action: 'If a product promises protection and returns, price the two separately and compare.',
    deep: 'Bundled savings-and-insurance plans — endowment, money-back, ULIP — have historically returned about ₹3,000 to ₹5,500 a year on ₹1,00,000. They give cover of roughly ten times the premium, when a family needs ten to fifteen times the income. Indian households put ₹5.3 lakh crore into life insurance in FY25. That was ₹15 of every ₹100 they saved, more than went into mutual funds.' },

  { n: 36, kind: 'plain', title: 'Ab shuru ho sakta hai',
    lesson: 'Your paperwork works. Most people in India never get past this one step.' },

  { n: 37, kind: 'plain', title: 'Tareekh badal do', term: 'Mandate / auto-debit',
    lesson: 'SIP on the 2nd, not the 28th. Save first, spend what is left.' },

  { n: 38, kind: 'lesson', title: 'Card ka minimum due', term: 'Minimum due',
    lesson: 'Paying only the minimum costs about ₹3,500 a month on a ₹1,00,000 balance.' },

  { n: 39, kind: 'plain', title: 'Poora bill bharo',
    lesson: 'A card is fine if the whole bill is paid on the date. Otherwise it is a loan.' },

  { n: 40, kind: 'plain', title: 'Saans lo',
    lesson: 'You slipped. Sixty squares are still ahead. Nobody is ever out of this game.' },

  { n: 41, kind: 'lesson', title: 'Apna health cover', term: 'Health cover / floater',
    lesson: 'Office cover ends the day the job ends. Keep one in your own name.' },

  { n: 42, kind: 'plain', title: 'Kitne ka cover',
    lesson: 'One serious admission costs ₹3,00,000 to ₹5,00,000. Cover for that.' },

  { n: 43, kind: 'plain', title: 'Family floater', term: 'Health cover / floater',
    lesson: 'One policy for the whole family usually costs less than four separate ones.' },

  { n: 44, kind: 'event', title: 'Jhatka',
    lesson: 'The rent went up. Decided by somebody else. Draw a card.',
    event: {
      name: 'Kiraya badh gaya',
      line: '₹2,000 more a month, decided by somebody else.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. Adjust the amount — never stop the SIP.',
    } },

  { n: 45, kind: 'quiz', title: 'Guarantee kitni?',
    lesson: 'Guess: above what yearly return should the word "guaranteed" scare you?',
    quiz: {
      question: 'Above what guaranteed yearly return on ₹1,00,000 should you walk away?',
      chips: ['Above ₹8,000 a year', 'Above ₹12,000 a year'],
      reveal: 'Above ₹12,000 a year per ₹1,00,000. Careful — the government’s SCSS guarantees ₹8,200 a year on ₹1,00,000, and it is completely real. Guaranteed is not the problem. Guaranteed, high, and from a stranger is.',
    } },

  { n: 46, kind: 'lesson', title: '3% = ₹6,000 mahina', term: 'Ponzi / chain system',
    lesson: '₹6,000 a month on ₹2,00,000 is ₹72,000 a year. No honest business pays that.' },

  { n: 47, kind: 'plain', title: 'Paisa chala gaya',
    lesson: 'The neighbour was paid on time for eight months. That is how the trap is built.' },

  { n: 48, kind: 'plain', title: 'Number maango',
    lesson: 'Ask for the registration number and check it on the regulator’s own site. Free.' },

  { n: 49, kind: 'plain', title: 'Shield taiyaar', term: 'Emergency fund',
    lesson: 'Three months of kharcha in the bank. One bad month can no longer break you.' },

  { n: 50, kind: 'milestone', title: 'Aadha raasta',
    lesson: 'Halfway. A SIP, a buffer and cover — that is most of good money sense.',
    bullets: [
      'A ₹500 SIP now runs on its own.',
      'Three months of kharcha sit in the bank.',
      'Cover exists in your own name, not the office’s.',
    ],
    action: 'List what you own on one page. Mark each as buffer, cover, or growing money.',
    deep: 'Of every ₹100 Indian households saved in FY25, ₹35 went into deposits and ₹22 into provident fund and pension. ₹15 went into life insurance, ₹13 into mutual funds and ₹2 into shares. The other ₹13 sat in cash, small savings and other places. That ₹15 is, to us, the costliest ₹15 in the country. Most of it is savings bought inside an insurance policy, at a price nobody was shown.' },

  { n: 51, kind: 'lesson', title: 'Machine ko yaad hai', term: 'Mandate / auto-debit',
    lesson: '₹2,000 moved to the 2nd is ₹24,000 a year that leaves before the month can.',
    why: 'Auto-debit on salary day. A machine never forgets and never has a bad month.',
    action: 'Move your SIP date to a day or two after salary lands. It is one click in the app.',
    heritage: 'The old board called this square reliability. Now it is a machine that never forgets.',
    deep: 'Nothing about willpower changes when the SIP date moves. The money simply leaves before the month can eat it. ₹2,000 a month saved before spending is ₹24,000 a year. Over twenty years that is ₹4,80,000 of your own money going in. A SIP you have to remember is a SIP you will skip in the month you could least afford to.' },

  { n: 52, kind: 'plain', title: 'Nominee bhar do', term: 'Nominee',
    lesson: 'More than ₹73,000 crore lies unclaimed in India. An empty nominee box is one big reason.' },

  { n: 53, kind: 'plain', title: 'Ghar mein batao',
    lesson: 'One person must know where the money is. A locked secret helps nobody.' },

  { n: 54, kind: 'lesson', title: 'Term insurance', term: 'Term insurance',
    lesson: 'Pure cover, no money back. That is exactly why it costs so little.' },

  { n: 55, kind: 'plain', title: 'Neeche aa gaye',
    lesson: 'You are behind, not beaten. From here the buffer keeps you standing.' },

  { n: 56, kind: 'plain', title: 'Sach likho form pe',
    lesson: 'Write your real health and habits on the form. A small lie is how claims die.' },

  { n: 57, kind: 'lesson', title: 'Sona girvi rakha', term: 'Gold loan',
    lesson: 'The family gold went to the lender. Miss the payments and it is auctioned.' },

  { n: 58, kind: 'plain', title: 'Shaadi galti nahi hai',
    lesson: 'The wedding is never the mistake. A loan costing ₹20,000 a year per ₹1,00,000 is.' },

  { n: 59, kind: 'event', title: 'Jhatka',
    lesson: 'The work stopped for three months. Not your fault. Draw a card.',
    event: {
      name: 'Teen mahine kaam nahi',
      line: 'Work stopped. This is a risk, not a mistake.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. Three months of kharcha is exactly this.',
    } },

  { n: 60, kind: 'plain', title: 'Ek jagah nahi', term: 'Diversification',
    lesson: 'Saare ande ek tokri mein mat rakho. Some safe, some growing, always both.' },

  { n: 61, kind: 'quiz', title: 'Kaunsa pehle',
    lesson: 'Guess: buffer, insurance, or investing — which one comes first?',
    quiz: {
      question: 'Which comes first?',
      chips: ['Investing', 'Buffer'],
      reveal: 'Buffer, then insurance, then investing. In that order, every time, for everyone. It is the only order that survives a bad month.',
    } },

  { n: 62, kind: 'plain', title: 'Parivar surakshit',
    lesson: 'If something happens, this house does not fall apart. That is what cover buys.' },

  { n: 63, kind: 'plain', title: 'Sona kitna',
    lesson: 'Gold is fine. Jewellery is not: making charges take ₹8,000 to ₹25,000 per ₹1,00,000.' },

  { n: 64, kind: 'plain', title: 'Utaar chadhav', term: 'Volatility',
    lesson: 'Markets go up and down. That movement is the price of growth, not a fault.' },

  { n: 65, kind: 'plain', title: 'Trading alag hai', term: 'Trading',
    lesson: 'Buying to sell this week is trading. Buying to keep ten years is investing.' },

  { n: 66, kind: 'lesson', title: 'F&O ka chakkar', term: 'F&O / derivatives',
    lesson: 'SEBI counted it: almost 88 of every 100 F&O traders lost money last year.' },

  { n: 67, kind: 'plain', title: 'Padosi ki tip',
    lesson: 'The neighbour tells you his wins and never his losses. Everybody does.' },

  { n: 68, kind: 'lesson', title: 'Direct plan', term: 'Direct plan',
    lesson: 'Same fund, two prices. Direct has no agent’s cut sitting inside it.' },

  { n: 69, kind: 'lesson', title: 'Kaun kama raha hai', term: 'Commission',
    lesson: 'A regular plan takes about ₹500 a year from every ₹1,00,000 you hold.',
    why: 'Every product pays somebody. Ask who gets paid, and how much, before you sign.',
    action: 'Ask the seller, out loud, what they earn if you say yes. The answer tells you plenty.',
    heritage: 'The old board called this square debt. Now it asks who is getting paid.',
    deep: '"Meri fees kuch nahi hai" almost always means the fee is inside the product. A regular mutual-fund plan pays a trail of about ₹500 a year per ₹1,00,000. An endowment policy pays a large first-year commission instead. IRDAI’s own annual report calls mis-selling a significant concern. Complaints about unfair business practices rose 14% in FY25, to 26,667.' },

  { n: 70, kind: 'plain', title: '"Meri fees kuch nahi"', term: 'Commission',
    lesson: '"My service is free" means the fee already sits inside your returns.' },

  { n: 71, kind: 'plain', title: 'Ghar wale safe', term: 'Term insurance',
    lesson: 'Term cover done. The cheapest and most loving thing on this whole board.' },

  { n: 72, kind: 'plain', title: 'Paanch saal ho gaye',
    lesson: 'Sixty auto-debits, never missed, never thought about. The machine did it.' },

  { n: 73, kind: 'event', title: 'Jhatka',
    lesson: 'A parent needs care now. Nobody’s fault. Draw a card.',
    event: {
      name: 'Maa-baap ki dekhbhaal',
      line: 'Care now costs ₹15,000 a month.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. Family kharcha is never the mistake.',
    } },

  { n: 74, kind: 'lesson', title: 'SIP band kar di', term: 'SIP',
    lesson: 'When prices fall, most people stop the SIP. That means buying only at the high prices.' },

  { n: 75, kind: 'milestone', title: 'Pauna raasta',
    lesson: 'Three-quarters. Notice: nothing so far needed a big salary.',
    bullets: [
      'A written hisaab, and a mobile linked to Aadhaar.',
      'A buffer, health cover and term cover.',
      'A fund that does not pay an agent every year.',
    ],
    action: 'Check the one thing you most suspect is broken — the Aadhaar mobile, or the name match.',
    deep: 'About 63 in every 100 Indian households know of at least one market product. Fewer than 10 in every 100 actually use one. The gap is almost never the money. It is the mobile number that no longer gets the OTP. It is the name spelled differently on the PAN, or the mandate that timed out. Everything climbed on this board so far is plumbing, not virtue.' },

  { n: 76, kind: 'lesson', title: 'Kharcha padho', term: 'Expense ratio',
    lesson: 'A 1% yearly cut on ₹1,00,000 is ₹1,000 — ₹2.74 taken every single day.',
    why: 'Every fund takes a yearly cut, whether the fund went up or down that year.',
    action: 'Look up the expense ratio of every fund you own. Ten minutes, once a year.',
    heritage: 'The old board called this square gyana — knowledge. Read the yearly cut before you sign.',
    deep: 'A 1% expense ratio on ₹1,00,000 is ₹1,000 a year. That is about ₹2.74 taken every single day. It is not billed to you; it comes out of the NAV before you ever see it. It is charged in a year the fund falls, too. Knowing the number is the whole skill, and you do not need the regulation behind it.' },

  { n: 77, kind: 'plain', title: 'Waqt sabse bada',
    lesson: '₹2,000 a month from 25 beats ₹5,000 from 35: ₹1.3 crore against ₹94 lakh, not guaranteed.' },

  { n: 78, kind: 'lesson', title: 'Kuch nahi kiya',
    lesson: 'Prices fell and ₹5,00,000 showed as ₹3,50,000. You did nothing. Good.',
    heritage: 'The old board called this square tapas — sitting still. You sat through a fall and did nothing.' },

  { n: 79, kind: 'plain', title: 'Thoda peeche',
    lesson: 'A small slip this late. Annoying, not serious. Pick up the dice.' },

  { n: 80, kind: 'plain', title: 'Laal number',
    lesson: 'When the screen shows red the money has really fallen. Selling makes it permanent.' },

  { n: 81, kind: 'plain', title: 'Bank se call aaya', term: 'Lock-in',
    lesson: '"FD se better scheme hai." Ask one thing: policy kitne saal ki hai?' },

  { n: 82, kind: 'lesson', title: 'Guaranteed kitna?',
    lesson: 'A guaranteed 8.2% is real: ₹8,200 a year on ₹1,00,000. A stranger’s 12% is not.',
    why: 'SCSS pays ₹8,200 a year on ₹1,00,000, backed by an Act. PACL collected ₹49,100 crore promising more.',
    action: 'Above ₹8,000 a year per ₹1,00,000, ask for the registration number and check it.',
    deep: 'The government’s Senior Citizens’ Savings Scheme pays a guaranteed 8.2%, which is ₹8,200 a year on ₹1,00,000. It is backed by an Act of Parliament and completely real, and the government resets the rate every quarter. So the word guaranteed is not the red flag on its own. The rate is. Anything promising a guaranteed 12% or more from a stranger is either a mislabelled insurance product or illegal.' },

  { n: 83, kind: 'plain', title: 'Lock-in poochho', term: 'Lock-in',
    lesson: 'Ask how many years the money is stuck. Nobody tells you this on their own.' },

  { n: 84, kind: 'plain', title: 'Kharcha kam hua', term: 'Expense ratio',
    lesson: 'Same fund, about ₹500 a year less taken per ₹1,00,000. Every year, for twenty.' },

  { n: 85, kind: 'plain', title: 'Boring hi sahi',
    lesson: 'Good money habits are boring. Excitement is usually the expensive option.' },

  { n: 86, kind: 'event', title: 'Jhatka',
    lesson: 'A bill arrived that nobody could have seen coming. Draw a card.',
    event: {
      name: 'Bina bataye bill',
      line: 'Something arrived that nobody could have seen.',
      shielded: 'Bura waqt fund ne sambhal liya.',
      setback: '4 ghar peeche. Life does not check your calendar.',
    } },

  { n: 87, kind: 'quiz', title: 'Kaun poochta hai', term: 'Digital arrest',
    lesson: 'Guess: which officer may ask you to transfer money "for verification"?',
    quiz: {
      question: 'Which officer may ask you to transfer money for verification?',
      chips: ['CBI on a video call', 'None. Not one.'],
      reveal: 'None. Not one. No police, court, CBI, RBI or income-tax officer has ever asked anyone to transfer money to verify it. Cut the call, then dial 1930.',
    } },

  { n: 88, kind: 'plain', title: 'Aath kadam',
    lesson: 'Eight squares back. You can still finish first. Roll.' },

  { n: 89, kind: 'lesson', title: 'Ek aur premium', term: 'Persistency / lapse',
    lesson: '"Bhar do, sab wapas mil jayega." It is usually a brand new policy.' },

  { n: 90, kind: 'plain', title: '1930 yaad rakho', term: '1930',
    lesson: 'Cheated online? Call 1930 within the hour. Money can still be frozen then.' },

  { n: 91, kind: 'plain', title: 'Screen share nahi',
    lesson: 'Nobody needs a screen-share app or your OTP to fix your account. Nobody. Ever.' },

  { n: 92, kind: 'milestone', title: 'Bas thoda aur', term: 'Nominee',
    lesson: 'Look back: SIP, buffer, cover, direct plan, nominee. That is a whole plan.',
    bullets: [
      'SIP, buffer, health cover, term cover, direct plan, nominee.',
      'Six things. Together they are a whole plan.',
      'What is left is not being fooled, and telling your family.',
    ],
    action: 'Add a nominee to every account this week, and say which folder the papers are in.',
    deep: 'More than ₹73,000 crore is unclaimed in India. About ₹60,518 crore sits with public sector banks, ₹8,974 crore with life insurers and ₹3,749 crore in mutual funds. A national campaign returned only ₹5,777 crore of it. Money nobody can find is money that was never really earned. One empty nominee box is how most of it got there.' },

  { n: 93, kind: 'plain', title: 'Bacchon ke saamne',
    lesson: 'Children learn money by watching. Let them see the SIP go out every month.' },

  { n: 94, kind: 'plain', title: 'Wahi paisa bada hua',
    lesson: 'You added nothing. You just did not run. That is what gave it the time.' },

  { n: 95, kind: 'plain', title: 'Ghar walon se baat',
    lesson: 'Tell the family where the money is kept. This is the last real risk left.' },

  { n: 96, kind: 'lesson', title: '"CBI bol raha hoon"', term: 'Digital arrest',
    lesson: 'A uniform on a video call and a transfer "for verification". Both are a costume.' },

  { n: 97, kind: 'plain', title: 'Naa keh diya',
    lesson: 'You said no. That was the real test on this board, and you passed.' },

  { n: 98, kind: 'plain', title: 'Sab likha hua hai', term: 'Nominee',
    lesson: 'Accounts, nominee, and one person who knows. Your money will reach them.' },

  { n: 99, kind: 'plain', title: 'Ek kadam',
    lesson: 'One square left. The old board put a snake here. We took it out.',
    heritage: 'The old board put a snake on 99, one step from moksha. We took it out, and we say so.' },

  { n: 100, kind: 'finish', title: 'Manzil: lakshya poora',
    lesson: 'Not the richest. The one who reached what they were saving for. That was the game.',
    bullets: [
      'Ek SIP, chahe ₹500 ki ho.',
      'Teen mahine ka kharcha, bank mein.',
      'Health cover aur term cover, apne naam pe.',
      'Har account mein nominee.',
      'Ghar mein ek insaan ko pata ho ki kya kahan hai.',
    ],
    action: 'Pick the one of these five you do not have. Do that one this week.',
    deep: 'This board covered five things. A SIP, three months of kharcha, cover in your own name, a direct plan and a nominee. It did not cover tax, home loans or retirement, which need a longer sitting and your own numbers. Nothing here is advice about any one product. It is the order in which most Indian houses find their footing.' },
];

/* ── the eight snakes ───────────────────────────────────────────────────
   'cost' is the rupee figure painted along the spine and drives body
   thickness (DESIGN §4). 'counterparty' names who got paid — this line is
   the whole ethics of the game. */
export const SNAKES = [
  {
    from: 27, to: 9, name: 'Endowment policy', cost: 50000,
    costNote: 'FD se itna kam',
    why: '₹50,000 a year for 15 years is ₹7,50,000 in. It matures near ₹10,41,000 — at least ₹50,000 less than an FD.',
    escape: 'Ask before signing: policy kitne saal ki hai? If the answer is 15 or 20, it is not an FD.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — woh 15-saal ki policy thi, FD nahi.',
    counterparty: 'the bank branch and the agent, from a large first-year commission.',
    term: 'Endowment / money-back',
    deep: 'A savings-plus-insurance policy is sold as a five-year deposit. The five years is only how long you pay. The policy itself runs fifteen or twenty years. Pay ₹50,000 a year for 15 years. That is ₹7,50,000 in, and at about ₹4,000 a year per ₹1,00,000 it matures near ₹10,41,000. The same money in a 6.5% FD, after tax on the interest, is about ₹10,91,000. Banks do not sell a 15-year FD, so that means a ladder of shorter ones.',
  },
  {
    from: 38, to: 20, name: 'Card ka minimum due', cost: 21000,
    costNote: 'ek saal ka byaj',
    why: 'A ₹50,000 bill left running on the card costs about ₹21,000 of interest in a year.',
    escape: 'Pay the full bill on the date. If you cannot, ask the bank to convert it to a normal loan.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — ₹50,000 baaki chhoda toh saal mein ₹21,000 byaj.',
    counterparty: 'the card issuer. Interest on unpaid balances is most of what a card earns.',
    term: 'Minimum due',
    deep: 'A credit card is genuinely free if the whole bill is paid on the due date. The moment it is not, the unpaid amount costs about ₹3,500 a month on every ₹1,00,000. That is roughly ₹42,000 a year per ₹1,00,000, before compounding. On ₹50,000 it is about ₹21,000 of interest in twelve months, on top of the ₹50,000. Clear the highest-rate card first, even if it is the smallest.',
  },
  {
    from: 46, to: 28, name: 'Chain system', cost: 152000,
    costNote: 'net gaya, 8 mahine baad',
    why: '₹2,00,000 in. It paid ₹6,000 a month for eight months, then stopped. ₹1,52,000 gone.',
    escape: 'Ask where the profit comes from. If the answer is new members, walk away and warn the neighbour.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — chain system 8 mahine deta hai, phir ₹1,52,000 le jaata hai.',
    counterparty: 'the organiser and the earliest members, paid out of the newer members’ money.',
    term: 'Ponzi / chain system',
    deep: '₹6,000 a month on ₹2,00,000 is ₹72,000 a year, before compounding. No lawful business in India pays that to a stranger. A chain system pays its early members out of the newer members’ money. It looks perfect for eight or ten months, then stops the day recruiting stops. Eight months of ₹6,000 is ₹48,000 back, so ₹1,52,000 of the ₹2,00,000 is gone. SEBI put the PACL collection at ₹49,100 crore.',
  },
  {
    from: 57, to: 40, name: 'Sona girvi rakha', cost: 80000,
    costNote: 'saal ka byaj',
    why: '₹4,00,000 borrowed against the family gold at ₹20,000 a year per ₹1,00,000 is ₹80,000 of interest a year.',
    escape: 'Save for known kharcha months ahead. Gold is the last door to open, never the first.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — girvi rakha sona ₹80,000 saal ka byaj maangta hai.',
    counterparty: 'the gold-loan company or the local lender, and whoever buys the auctioned gold.',
    term: 'Gold loan',
    deep: 'Gold loans are fast because your gold is the security. Banks lend against gold at roughly ₹9,000 to ₹12,000 a year per ₹1,00,000. Gold-loan companies and local lenders often charge ₹18,000 to ₹24,000. On ₹4,00,000 at that higher rate it is ₹80,000 a year. India’s gold-loan book has roughly tripled in three years, increasingly for spending rather than emergencies. For a known expense, start a separate fund the year before.',
  },
  {
    from: 66, to: 47, name: 'F&O ka chakkar', cost: 117000,
    costNote: 'ek saal mein, average',
    why: 'SEBI counted it: almost 88 of every 100 F&O traders lost money. The average loss was ₹1,17,000.',
    escape: 'That is trading, not investing. If you want the market, use a SIP and give it years.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — 100 mein se 88 F&O traders haare, average ₹1,17,000.',
    counterparty: 'the broker and the exchange, who are paid on every trade either way.',
    term: 'F&O / derivatives',
    deep: 'SEBI has studied individual equity-derivatives traders every year since 2024. The answer does not move: close to nine in ten of them lose money. In the latest year 87.7 of every 100 lost, and the average loss was about ₹1,17,000. Among traders under 30, who are more than four in ten of the total, the share losing is higher still. Keep this completely separate from the family’s money, and never from the bura waqt fund.',
  },
  {
    from: 74, to: 55, name: 'SIP band kar di', cost: 40000,
    costNote: 'jo kabhi nahi laga',
    why: 'Prices fell, so ₹5,000 a month paused for eight months. That is ₹40,000 that never went in.',
    escape: 'If money is tight, cut the SIP to ₹500. Cutting is fine. Stopping is what hurts.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — 8 mahine ki band SIP ₹40,000 hai jo kabhi nahi laga.',
    counterparty: 'nobody. This one costs you and pays no one, which is why nobody warns you.',
    term: 'SIP',
    deep: 'A SIP buys more units when prices are low. Stopping it during a fall means you only ever bought at the high prices. Eight paused months at ₹5,000 is ₹40,000 that never went in. In India, SIP closures spike during every fall; in January 2025 more SIPs were closed than opened. Nobody had prepared those investors for the number turning red. Decide now, while things are calm, what you will do when prices fall.',
  },
  {
    from: 89, to: 79, name: 'Revival call', cost: 30000,
    costNote: 'naye policy mein gaya',
    why: 'A call says one more premium unlocks your stuck money. ₹30,000 paid — for a new 15-year policy.',
    escape: 'Ask for the old policy number and its maturity date, in writing, before paying anything.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — ₹30,000 ka woh premium ek nayi policy tha.',
    counterparty: 'the agent, who earns a fresh first-year commission on a "revival".',
    term: 'Persistency / lapse',
    deep: 'This one preys on money that is genuinely stuck. About ₹8,974 crore of unclaimed money sits with Indian life insurers. Roughly half of a large insurer’s policies, counted by number, are no longer being paid by year five. So there are millions of lapsed policies to call about. A revival call very often sells a new policy with a new start date. Ask for the policy number, the start date and the maturity date in writing.',
  },
  {
    from: 96, to: 88, name: 'Digital arrest', cost: 8000,
    costNote: '"release fee"',
    why: 'A video call, a police backdrop, your Aadhaar "found in a parcel", then ₹8,000 as a release fee.',
    escape: 'Cut the call, tell one family member, dial 1930 within the hour. No officer asks for a transfer.',
    shielded: 'Bura waqt fund ne sambhal liya. Par yaad rakho — koi bhi afsar verification ke liye paisa nahi maangta.',
    counterparty: 'organised scam centres, most of them run from outside India.',
    term: 'Digital arrest',
    deep: 'Digital arrest produced about 2,41,537 complaints and roughly ₹3,012 crore of losses between 2022 and 2025. The uniform, the police station behind the caller and the papers on screen are a costume and a backdrop. One line defeats this whole family of scams. No genuine police, court, CBI, RBI or income-tax officer has ever asked anyone to transfer money for verification. Cut the call, say it out loud to one person, then dial 1930.',
  },
];

/* ── the eight ladders ──────────────────────────────────────────────────
   Plumbing, not virtue. 'how' is the concrete first step and is what the
   card shows mid-climb; 'why' is the argument and lives in Aur padho. */
export const LADDERS = [
  {
    from: 3, to: 22, name: 'Saat din ka hisaab', amount: 24000,
    amountNote: 'saal mein mila',
    why: 'Seven days of writing every rupee down usually finds ₹1,500 to ₹3,000 a month leaking away.',
    how: 'Notes app or the back of a bill. Seven days only. Cut nothing yet — read it once at the end.',
    term: 'Savings',
    deep: 'Nobody remembers their own kharcha correctly. That is why "paisa jaata kahan hai?" has no answer in most houses. Seven days is enough to see the shape of it. A ₹100-a-day habit is ₹36,500 a year, and two ₹30 chais a day is ₹21,900. Families who write it down typically find ₹1,500 to ₹3,000 a month they never chose to spend.',
  },
  {
    from: 12, to: 30, name: 'Pehli SIP — ₹500', amount: 120000,
    amountNote: 'aapka apna paisa, 20 saal mein',
    why: '₹500 a month for twenty years is ₹1,20,000 of your own money going in, ₹500 at a time.',
    how: 'One index fund, direct plan, ₹500, auto-debit dated two days after salary. Fifteen minutes, once.',
    term: 'SIP',
    heritage: 'The old board called this square shraddha — faith. The hardest step is still the first one.',
    deep: '₹500 a month for twenty years is ₹1,20,000 of your own money. If it grew at 12% a year — not guaranteed — that would be roughly ₹4,99,000. At 8% it would be closer to ₹2,95,000. The range is the honest part. What is not in doubt is the ₹1,20,000, and that nobody waiting for a lump sum ever put it in. Start one SIP of ₹500 today.',
  },
  {
    from: 17, to: 36, name: 'Aadhaar se mobile jodo', amount: 50,
    amountNote: 'poori fees',
    why: 'This costs about ₹50 and one morning. It is the commonest reason a first attempt to invest fails.',
    how: 'Take your Aadhaar and the phone number you use today to an Aadhaar Seva Kendra. That is the job.',
    term: 'KYC',
    deep: 'Every online KYC sends its OTP to the mobile number linked to your Aadhaar. If that is a number you stopped using in 2018, nothing will open. No mutual fund, no demat, no mandate, no claim — and the error message never tells you why. The fix is one physical visit and a fee of about ₹50. It is the dullest, highest-leverage thing on this whole board.',
  },
  {
    from: 25, to: 49, name: 'Bura Waqt Fund', amount: 75000,
    amountNote: 'teen mahine ka kharcha',
    why: 'If the house spends ₹25,000 a month, three months is ₹75,000. That stops a bill becoming card debt.',
    how: 'Open a separate savings account with no card linked. Send ₹2,000 a month until it holds three months.',
    term: 'Emergency fund',
    deep: 'Three months of kharcha, reachable the same day. On ₹25,000 a month that is ₹75,000; six months is ₹1,50,000. At ₹2,000 a month you get there in a bit over three years. At ₹5,000 a month it takes about fifteen months. It belongs in a bank, not in gold and not in a lock-in. Speed matters more than return here, because the point is the afternoon you need it.',
  },
  {
    from: 41, to: 62, name: 'Apna health cover', amount: 1000000,
    amountNote: 'ka floater',
    why: 'One serious admission costs ₹3,00,000 to ₹5,00,000. A ₹10,00,000 floater costs ₹20,000 to ₹30,000 a year.',
    how: 'Buy a ₹10,00,000 family floater in your own name, separate from office cover, while everyone is healthy.',
    term: 'Health cover / floater',
    deep: 'About 30 to 40 crore Indians have no health cover at all. One hospital stay is the commonest route from lower-middle class into debt. Company cover ends on the day the job ends, which is often the week you need it. Waiting periods for existing conditions restart when you finally buy your own. A five-day city admission already crosses ₹1,00,000; a serious one runs ₹3,00,000 to ₹5,00,000.',
  },
  {
    from: 54, to: 71, name: 'Term insurance', amount: 10000000,
    amountNote: 'ka cover',
    why: 'For a healthy 30-year-old, ₹1,00,00,000 of cover often costs ₹12,000 to ₹15,000 a year.',
    how: 'Take 10 to 15 times your yearly income. Term only, bought online, nothing bundled with it.',
    term: 'Term insurance',
    deep: 'Term insurance pays only if you die during the term. That is the whole product. It is why ₹1,00,00,000 of cover costs a fraction of a money-back policy giving a tenth of it. Premiums depend on age, health and insurer. At 30, roughly ₹12,000 to ₹15,000 a year; at 40 it is often double. If you earn ₹6,00,000 a year, aim for ₹60,00,000 to ₹90,00,000 of cover.',
  },
  {
    from: 68, to: 85, name: 'Direct plan', amount: 500,
    amountNote: 'har saal, har ₹1,00,000 pe',
    why: 'Same fund, two prices. Direct keeps about ₹500 a year in your hands for every ₹1,00,000 you hold.',
    how: 'In the app, choose the Direct version. Check the exit load before you move old money.',
    term: 'Direct plan',
    deep: 'A regular plan pays a yearly commission to the distributor out of your returns. It sits inside the NAV, so you never see a bill. One large Indian equity fund has run about 1.28% direct against 1.78% regular. That gap is roughly ₹500 a year per ₹1,00,000, or ₹2,500 a year on ₹5,00,000. It compounds against you for decades. This does not make regular plans bad; just know that you are paying.',
  },
  {
    from: 78, to: 94, name: 'Kuch nahi kiya', amount: 350000,
    amountNote: 'screen pe dikha',
    why: 'Prices fell and ₹5,00,000 showed as ₹3,50,000. You changed nothing, and your ₹5,000 kept buying.',
    how: 'Decide today, in writing, while things are calm: when it falls, I do nothing. Show it to your family.',
    term: 'Volatility',
    heritage: 'The old board called this square tapas — sitting still. You sat through a fall and did nothing.',
    deep: 'About 40 in every 100 investors SEBI surveyed have gone dormant, and most of them blame poor performance. They started, saw a fall, and froze. A 30% drop turns ₹5,00,000 into ₹3,50,000 on the screen. That is a real fall, not an illusion. What makes it permanent is selling. The people who kept the SIP running through it bought their cheapest units of the decade.',
  },
];

/* ── glossary — every financial term the game says out loud.
      'hinglish' is what the game actually says; 'plain' is under 15 words. */
export const GLOSSARY = [
  { term: 'Inflation',              hinglish: 'mehngai',                             plain: 'Prices rise every year, so the same rupees buy less.' },
  { term: 'Investment',             hinglish: 'paisa lagana',                        plain: 'Putting money somewhere so it grows over years.' },
  { term: 'Savings',                hinglish: 'bachat',                              plain: 'Money kept aside, not spent.' },
  { term: 'Interest',               hinglish: 'byaj',                                plain: 'The rent money earns, or the rent you pay to borrow.' },
  { term: 'Compound interest',      hinglish: 'byaj pe byaj',                        plain: 'Your interest starts earning its own interest.' },
  { term: 'Returns',                hinglish: 'kitna badhkar mila',                  plain: 'How much more you got back, said in rupees.' },
  { term: 'Risk',                   hinglish: 'paisa doob sakta hai',                plain: 'The money can fall in value, or be lost.' },
  { term: 'Volatility',             hinglish: 'utaar-chadhav',                       plain: 'The up-and-down movement of prices along the way.' },
  { term: 'Diversification',        hinglish: 'paisa alag-alag jagah rakho',         plain: 'Never keep everything in one place.' },
  { term: 'Liquidity',              hinglish: 'kitni jaldi paisa nikal sakte ho',    plain: 'How fast you can turn it back into cash.' },
  { term: 'Lock-in',                hinglish: 'kitne saal paisa nahi nikal sakte',   plain: 'Years during which you cannot take the money out.' },
  { term: 'Emergency fund',         hinglish: 'bura waqt fund',                      plain: 'Three to six months of expenses, reachable the same day.' },
  { term: 'Mutual fund',            hinglish: 'sabka paisa ek jagah, manager chalata hai', plain: 'Many people’s money pooled; a manager buys many companies.' },
  { term: 'SIP',                    hinglish: 'har mahine thoda-thoda',              plain: 'A standing instruction to invest a fixed amount monthly.' },
  { term: 'NAV',                    hinglish: 'ek unit ka aaj ka bhaav',             plain: 'Today’s price of one unit of a fund.' },
  { term: 'Direct plan',            hinglish: 'bina agent wala plan',                plain: 'The same fund without the agent’s yearly cut inside.' },
  { term: 'Regular plan',           hinglish: 'agent wale plan',                     plain: 'The same fund with a commission taken from your returns.' },
  { term: 'Expense ratio',          hinglish: 'fund har saal kitna kaat leta hai',   plain: 'The yearly cut a fund takes, in rupees per lakh.' },
  { term: 'Commission',             hinglish: 'bechne wale ko kitna mila',           plain: 'What the seller earns when you say yes.' },
  { term: 'Equity / shares',        hinglish: 'share, company mein hissa',           plain: 'A small ownership piece of a company.' },
  { term: 'Stock market',           hinglish: 'share bazaar',                        plain: 'Where company shares are bought and sold.' },
  { term: 'Trading',                hinglish: 'jaldi khareedna-bechna',              plain: 'Buying to sell within days or weeks.' },
  { term: 'F&O / derivatives',      hinglish: 'F&O',                                 plain: 'A fast bet on price direction. Almost 9 in 10 lose.' },
  { term: 'Index fund',             hinglish: 'poore bazaar wala fund',              plain: 'A fund that simply holds the whole market.' },
  { term: 'FD',                     hinglish: 'FD',                                  plain: 'Money kept with a bank for a fixed time at fixed interest.' },
  { term: 'Term insurance',         hinglish: 'sirf suraksha wali policy',           plain: 'Pure cover. No money back. Family gets a large amount.' },
  { term: 'Endowment / money-back', hinglish: 'bachat wali policy',                  plain: 'Insurance and savings bundled. Low returns, long lock-in.' },
  { term: 'ULIP',                   hinglish: 'market wali policy',                  plain: 'Insurance plus market investment in one, with charges.' },
  { term: 'Premium',                hinglish: 'premium, policy ki kist',             plain: 'The amount you pay for an insurance policy.' },
  { term: 'Sum assured',            hinglish: 'claim mein kitna milega',             plain: 'The amount the family receives on a claim.' },
  { term: 'Maturity',               hinglish: 'maturity pe kitna milega',            plain: 'What you get back when the policy or deposit ends.' },
  { term: 'Persistency / lapse',    hinglish: 'policy band ho gayi',                 plain: 'The policy stopped because premiums were not paid.' },
  { term: 'Health cover / floater', hinglish: 'health cover',                        plain: 'Insurance that pays hospital bills for the family.' },
  { term: 'Nominee',                hinglish: 'nominee',                             plain: 'The person who receives the money if you are gone.' },
  { term: 'KYC',                    hinglish: 'KYC',                                 plain: 'The one-time identity check before you can invest.' },
  { term: 'PAN',                    hinglish: 'PAN',                                 plain: 'The tax number every investment needs.' },
  { term: 'Demat account',          hinglish: 'share rakhne wala khaata',            plain: 'The account that holds shares in electronic form.' },
  { term: 'Mandate / auto-debit',   hinglish: 'auto-debit',                          plain: 'Permission for the bank to take a fixed amount monthly.' },
  { term: 'EMI',                    hinglish: 'EMI',                                 plain: 'A fixed monthly instalment on a loan.' },
  { term: 'Minimum due',            hinglish: 'minimum due',                          plain: 'The smallest card payment allowed — and the costliest.' },
  { term: 'No-cost EMI',            hinglish: 'no-cost EMI',                          plain: 'Instalments where the interest is hidden in the price.' },
  { term: 'Gold loan',              hinglish: 'sona girvi rakhna',                   plain: 'Borrowing against your gold. Miss payments, it is sold.' },
  { term: 'Ponzi / chain system',   hinglish: 'chain system',                        plain: 'Old members paid from new members’ money. It always stops.' },
  { term: 'Capital gains tax',      hinglish: 'munafe pe tax',                       plain: 'Tax on the profit when you sell.' },
  { term: 'Credit score',           hinglish: 'CIBIL score',                         plain: 'A number showing how reliably you repay.' },
  { term: 'Corpus / portfolio',     hinglish: 'aapka paisa kahan-kahan laga hai',    plain: 'Everything you own, taken together.' },
  { term: 'Asset allocation',       hinglish: 'kitna kahan rakha hai',               plain: 'How your money is split across safe and growing.' },
  { term: 'Digital arrest',         hinglish: '"CBI bol raha hoon"',                 plain: 'A fake officer on a video call demanding a transfer.' },
  { term: '1930',                   hinglish: '1930',                                plain: 'The cyber-fraud helpline. Call within the hour.' },
  { term: 'Compounding',            hinglish: 'byaj pe byaj lagna',                  plain: 'Growth that starts growing on itself, year after year.' },
  { term: 'Debt',                   hinglish: 'karza',                               plain: 'Money you owe — a loan, a card balance, an EMI.' },
  { term: 'Exit load',              hinglish: 'jaldi nikaalne ki fees',              plain: 'A fee for taking money out of a fund too soon.' },
  { term: 'Growth option',          hinglish: 'growth wala option',                  plain: 'Profits stay inside the fund instead of being paid out.' },
  { term: 'Trail commission',       hinglish: 'har saal ka commission',              plain: 'A cut the agent is paid every year you stay invested.' },
  { term: 'SEBI',                   hinglish: 'SEBI',                                plain: 'The government body that watches the share market.' },
  { term: 'IRDAI',                  hinglish: 'IRDAI',                               plain: 'The government body that watches insurance companies.' },
  { term: 'SCSS',                   hinglish: 'senior citizen wali scheme',          plain: 'A government savings scheme for people over sixty.' },
];

/* ── lookups ────────────────────────────────────────────────────────── */
const _sq = new Map(SQUARES.map(s => [s.n, s]));
const _sn = new Map(SNAKES.map(s => [s.from, s]));
const _ld = new Map(LADDERS.map(l => [l.from, l]));
const _gl = new Map(GLOSSARY.map(g => [g.term.toLowerCase(), g]));

export const squareAt = (n) => _sq.get(n) || null;
export const snakeAt  = (n) => _sn.get(n) || null;
export const ladderAt = (n) => _ld.get(n) || null;
export const glossaryTerm = (t) => (t ? _gl.get(String(t).toLowerCase()) || null : null);

/** What rules.js consumes. */
export const BOARD = { snakes: SNAKES, ladders: LADDERS };

/* ── the Hindi curriculum ────────────────────────────────────────────────
   DESIGN §13 / REF-INDIA: the हिं chip must change the TEACHING, not only the
   chrome. Every player-facing string above has a Devanagari twin here, keyed by
   'sq.<n>' | 'snake.<from>' | 'ladder.<from>' | 'gl.<term>'. Rupee figures stay
   in Latin digits with Indian grouping — that is what Indian readers expect on
   a price. graftHi() below hangs each one on its English object as a '<field>_hi'
   sibling, so consumers read one object and resolve with pick(). */
export const HI = {
  'sq.1': { title: 'पहला कदम', lesson: 'यहाँ सब एक ही घर से शुरू करते हैं। पैसे की समझ नहीं चाहिए। बस पासा फेंको।' },
  'sq.2': { title: 'पैसा आता, चला जाता', lesson: 'तनख़्वाह 1 तारीख़ को आती है और 20 तक ख़त्म। आज पता करेंगे कहाँ जाती है।' },
  'sq.3': { title: 'सात दिन का हिसाब', lesson: 'सात दिन तक हर रुपया लिखो जो बाहर जाता है। बस इतना ही।' },
  'sq.4': { title: 'दो चाय रोज़', lesson: 'रोज़ ₹30 की दो चाय यानी साल के ₹21,900। ग़लत नहीं। बस जानना ज़रूरी है।' },
  'sq.5': { title: 'घर का ख़र्चा', lesson: 'किराया, राशन, फ़ीस, बिजली, दवाई। ये पहले आते हैं, और इसमें शर्म की बात नहीं।' },
  'sq.6': { title: 'शौक़ भी ज़रूरी', lesson: 'बाक़ी सब शौक़ है। ग़लत नहीं — बस यही है जो बुरे महीने में रोका जा सकता है।' },
  'sq.7': { title: 'महँगाई चुपके से', lesson: 'आज ₹50 की थाली अगले साल क़रीब ₹53 की। यह बोर्ड हर जगह 6% महँगाई मानता है।' },
  'sq.8': { title: 'अंदाज़ा लगाओ', lesson: 'पहले अंदाज़ा लगाओ: 2006 में सिनेमा टिकट ₹60 का था। आज कितने का?',
    quiz: { question: '2006 में सिनेमा टिकट ₹60 का था। आज?',
      chips: ['लगभग ₹120', 'लगभग ₹250'],
      reveal: 'ज़्यादातर लोग कम बताते हैं। लगभग ₹250 — बीस साल में क़रीब चार गुना। टिकट इस बोर्ड की 6% महँगाई से भी तेज़ बढ़े। कुछ ग़लत नहीं हुआ।' } },
  'sq.9': { title: 'नीचे से फिर से', lesson: 'फिर नीचे के पास। हर कोई यहाँ एक बार खड़ा होता है। अभी कुछ नहीं गया।' },
  'sq.10': { title: 'दस का निशान', lesson: 'दस घर। एक सच अब पता है: चुपचाप रखा पैसा चुपचाप छोटा होता है।',
    bullets: ['अकेला छोड़ा हुआ पैसा वहीं नहीं रहता।', 'महँगाई उसे हर साल चुपचाप हिलाती है।', 'इसीलिए "बस सेफ़ रखो" कभी प्लान नहीं था।'],
    action: 'हर महीने ख़रीदी जाने वाली एक चीज़ चुनो और पूछो कि दस साल पहले उसका दाम क्या था।',
    deep: 'क़रीब 6% महँगाई पर, स्टील के डिब्बे में रखा ₹1,00,000 बीस साल बाद क़रीब ₹31,000 का सामान ख़रीदता है। हिसाब यह है: ₹1,00,000 को 1.06 से बीस बार भाग दो, जो लगभग 3.21 आता है। 2006 में ₹60 का सिनेमा टिकट आज क़रीब ₹250 का है। कुछ ग़लत नहीं हुआ और किसी ने चोरी नहीं की। रुपयों ने बस हर साल कम सामान ख़रीदा।' },
  'sq.11': { title: 'डिब्बे में पैसा', lesson: 'घर का कैश सबसे सुरक्षित लगता है। यही वो पैसा भी है जो कभी बढ़ता नहीं।' },
  'sq.12': { title: 'पहली SIP — ₹500', lesson: 'महीने के ₹500, एक तारीख़, एक फ़ंड। पहली बार सबसे मुश्किल होती है।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम श्रद्धा था। पहला क़दम आज भी सबसे मुश्किल है।' },
  'sq.13': { title: 'किसी को बताया नहीं', lesson: 'तुमने चुपचाप शुरू किया। यह ठीक है। पैसे को किसी की इजाज़त नहीं चाहिए।' },
  'sq.14': { title: 'ब्याज पे ब्याज', lesson: 'तुम्हारा ब्याज अपना ब्याज कमाने लगता है। सालों तक धीरे, फिर धीरे नहीं।' },
  'sq.15': { title: 'झटका', lesson: 'इस महीने कुछ टूट गया। किसी ने प्लान नहीं किया था। एक कार्ड निकालो।',
    event: { name: 'स्कूटर ख़राब', line: '₹4,000 की मरम्मत, बिना किसी चेतावनी के।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। बुरा वक़्त फ़ंड इसी दिन के लिए होता है।' } },
  'sq.16': { title: 'छोटा शुरू करो', lesson: 'महीने के ₹500 भी असली शुरुआत है। बड़ी रक़म के इंतज़ार में दस साल निकल जाते हैं।' },
  'sq.17': { title: 'आधार से मोबाइल जोड़ो', lesson: 'आधार पर वही फ़ोन नंबर होना चाहिए जो आज चलता है, वरना ऑनलाइन कुछ नहीं खुलेगा।' },
  'sq.18': { title: 'बैंक की लाइन', lesson: 'तुम सबके लिए उस लाइन में खड़े हुए हो। आज यह अपने लिए है।' },
  'sq.19': { title: 'नाम एक जैसा हो', lesson: 'PAN, आधार और बैंक में एक ही स्पेलिंग होनी चाहिए। एक अक्षर सब रोक देता है।' },
  'sq.20': { title: 'फिर चलो', lesson: 'घर गए हैं, खेल नहीं। जो चलते रहते हैं वही 100 तक पहुँचते हैं।' },
  'sq.21': { title: 'हिसाब साफ़ है', lesson: 'आमदनी, ख़र्चा, और बीच का फ़र्क़। ज़्यादातर लोग इसे कभी लिखते ही नहीं।' },
  'sq.22': { title: 'लीक मिल गया', lesson: 'लीक मिल गया। उतनी ही तनख़्वाह अब ज़्यादा चलती है, बिना किसी बढ़ोतरी के।' },
  'sq.23': { title: 'बच्चों की फ़ीस', lesson: 'स्कूल की फ़ीस हर साल बढ़ती है, तो उनके लिए रखा पैसा भी बढ़ना चाहिए।' },
  'sq.24': { title: 'सेफ़ का मतलब', lesson: '₹1,00,000 की FD साल में ₹6,500 देती है। महँगाई उसमें से क़रीब ₹6,000 खा जाती है।',
    why: 'सेफ़ का मतलब है कुछ ग़लत नहीं हो सकता। महँगाई ही वो चीज़ है जो चुपचाप ग़लत हो रही है।',
    action: 'तीन महीने का ख़र्चा वहाँ रखो जहाँ एक दिन में हाथ आ जाए। बाक़ी को सेफ़ कहना बंद करो।',
    deep: '₹1,00,000 की FD 6.5% पर साल में ₹6,500 देती है। 6% महँगाई पर ख़रीदने की क़रीब ₹6,000 की ताक़त चुपचाप ग़ायब हो जाती है। असल में क़रीब ₹500 बचते हैं। अगर घर उस ₹6,500 पर टैक्स भी भरता है, तो कुछ भी नहीं बचता। FD ने अपना काम किया और रुपये बचाए। वह कभी इसलिए नहीं बनी थी कि रुपये जो ख़रीदते हैं उसे बचाए।' },
  'sq.25': { title: 'बुरा वक़्त फ़ंड', lesson: 'तीन महीने का ख़र्चा, एक दिन में हाथ आने वाला। यही तुम्हारी ढाल है।' },
  'sq.26': { title: 'कहाँ रखें', lesson: 'इमरजेंसी का पैसा बैंक में रहता है, लॉक-इन में नहीं। यहाँ रफ़्तार रिटर्न से बड़ी है।' },
  'sq.27': { title: 'FD से बेहतर स्कीम', lesson: 'FD से बेहतर बताकर बेची गई। 15 साल की पॉलिसी, ₹1,00,000 पर साल के क़रीब ₹4,000।' },
  'sq.28': { title: 'सबक़ मिला', lesson: 'उस गिरावट में घर गए। सबसे महँगा सबक़ भी उसी ने दिया।' },
  'sq.29': { title: 'क्या होता अगर', lesson: 'अंदाज़ा लगाओ: कल आमदनी रुक जाए तो यह घर कितने महीने चलेगा?',
    quiz: { question: 'कल आमदनी रुक जाए तो यह घर कितने दिन चलेगा?',
      chips: ['एक महीना या कम', 'तीन महीने या ज़्यादा'],
      reveal: 'ज़्यादातर घर कहते हैं "एक महीना या कम", और वे सच बोल रहे होते हैं। तीन महीने का ख़र्चा अलग रखना ही लक्ष्य है।' } },
  'sq.30': { title: 'SIP चालू है', lesson: 'तुम्हारे ₹500 अब हर दिन काम कर रहे हैं, बिना तुम्हारे कुछ किए।' },
  'sq.31': { title: 'झटका', lesson: 'घर में कोई बीमार है। किसी ने यह प्लान नहीं किया था। एक कार्ड निकालो।',
    event: { name: 'घर में बीमारी', line: 'दो दिन में ₹80,000। किसी ने सोचा नहीं था।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। वक़्त बुरा वक़्त फ़ंड ही ख़रीदता है।' } },
  'sq.32': { title: 'एक फ़ाइल, एक शेल्फ़', lesson: 'PAN, आधार, पॉलिसी, पासबुक। एक फ़ोल्डर। किसी को कभी न कभी ज़रूरत पड़ेगी।' },
  'sq.33': { title: 'KYC एक ही बार', lesson: 'KYC सब म्यूचुअल फ़ंड के लिए एक बार होती है। बीस मिनट, फिर सालों तक नहीं।' },
  'sq.34': { title: 'वीडियो में PAN', lesson: 'अच्छी रोशनी, PAN कैमरे की तरफ़। ज़्यादातर रिजेक्शन सिर्फ़ ख़राब रोशनी से होते हैं।' },
  'sq.35': { title: 'दो अलग चीज़ें', lesson: 'मिली-जुली पॉलिसी ₹1,00,000 पर साल के क़रीब ₹3,000 से ₹5,500 देती है। दोनों काम एक से नहीं।',
    why: 'बीमा परिवार को बचाता है। निवेश पैसा बढ़ाता है। एक ही चीज़ दोनों काम अच्छे से नहीं करती।',
    action: 'कोई प्रोडक्ट सुरक्षा और रिटर्न दोनों का वादा करे, तो दोनों का दाम अलग-अलग पूछो और तोलो।',
    deep: 'बचत और बीमा को मिलाने वाली पॉलिसी — एंडोमेंट, मनी-बैक, ULIP — ने अब तक ₹1,00,000 पर साल के क़रीब ₹3,000 से ₹5,500 दिए हैं। कवर प्रीमियम का क़रीब दस गुना मिलता है, जबकि परिवार को आमदनी का दस से पंद्रह गुना चाहिए। FY25 में भारतीय घरों ने ₹5.3 लाख करोड़ जीवन बीमा में डाले। यह हर ₹100 की बचत में से ₹15 था, म्यूचुअल फ़ंड से भी ज़्यादा।' },
  'sq.36': { title: 'अब शुरू हो सकता है', lesson: 'तुम्हारे काग़ज़ चलते हैं। भारत में ज़्यादातर लोग इस एक क़दम से आगे नहीं बढ़ पाते।' },
  'sq.37': { title: 'तारीख़ बदल दो', lesson: 'SIP 2 तारीख़ को, 28 को नहीं। पहले बचाओ, जो बचे उसे ख़र्च करो।' },
  'sq.38': { title: 'कार्ड का मिनिमम ड्यू', lesson: 'सिर्फ़ मिनिमम भरने पर ₹1,00,000 के बक़ाया पर महीने के क़रीब ₹3,500 लगते हैं।' },
  'sq.39': { title: 'पूरा बिल भरो', lesson: 'कार्ड ठीक है अगर पूरा बिल तारीख़ पर भर दिया जाए। वरना वह एक क़र्ज़ है।' },
  'sq.40': { title: 'साँस लो', lesson: 'तुम फिसले हो। साठ घर अभी बाक़ी हैं। इस खेल से कोई कभी बाहर नहीं होता।' },
  'sq.41': { title: 'अपना हेल्थ कवर', lesson: 'ऑफ़िस का कवर उसी दिन ख़त्म जिस दिन नौकरी। एक कवर अपने नाम पर रखो।' },
  'sq.42': { title: 'कितने का कवर', lesson: 'एक गंभीर भर्ती ₹3,00,000 से ₹5,00,000 तक ले जाती है। कवर उतने का लो।' },
  'sq.43': { title: 'फ़ैमिली फ़्लोटर', lesson: 'पूरे परिवार की एक पॉलिसी आम तौर पर चार अलग पॉलिसियों से सस्ती पड़ती है।' },
  'sq.44': { title: 'झटका', lesson: 'किराया बढ़ गया। फ़ैसला किसी और का था। एक कार्ड निकालो।',
    event: { name: 'किराया बढ़ गया', line: 'महीने के ₹2,000 ज़्यादा, फ़ैसला किसी और का।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। रक़म कम करो — SIP बंद कभी मत करो।' } },
  'sq.45': { title: 'गारंटी कितनी?', lesson: 'अंदाज़ा लगाओ: साल में कितने से ऊपर की गारंटी पर डर जाना चाहिए?',
    quiz: { question: '₹1,00,000 पर साल की कितनी गारंटी पर वहाँ से चले जाना चाहिए?',
      chips: ['₹8,000 साल से ऊपर', '₹12,000 साल से ऊपर'],
      reveal: '₹1,00,000 पर साल के ₹12,000 से ऊपर। ध्यान दो — सरकार की SCSS ₹1,00,000 पर साल के ₹8,200 देती है, और वह पूरी तरह असली है। दिक़्क़त गारंटी में नहीं है। दिक़्क़त गारंटी, ऊँची, और किसी अजनबी से — इसमें है।' } },
  'sq.46': { title: '3% = ₹6,000 महीना', lesson: '₹2,00,000 पर महीने के ₹6,000 यानी साल के ₹72,000। कोई ईमानदार धंधा इतना नहीं देता।' },
  'sq.47': { title: 'पैसा चला गया', lesson: 'पड़ोसी को आठ महीने वक़्त पर पैसे मिले। जाल ऐसे ही बनाया जाता है।' },
  'sq.48': { title: 'नंबर माँगो', lesson: 'रजिस्ट्रेशन नंबर माँगो और रेगुलेटर की अपनी साइट पर जाँचो। यह मुफ़्त है।' },
  'sq.49': { title: 'ढाल तैयार', lesson: 'तीन महीने का ख़र्चा बैंक में। अब एक बुरा महीना तुम्हें तोड़ नहीं सकता।' },
  'sq.50': { title: 'आधा रास्ता', lesson: 'आधा हो गया। एक SIP, बुरा वक़्त फ़ंड और कवर — यही ज़्यादातर अच्छी समझ है।',
    bullets: ['₹500 की SIP अब अपने आप चलती है।', 'तीन महीने का ख़र्चा बैंक में पड़ा है।', 'कवर अपने नाम पर है, ऑफ़िस के नाम पर नहीं।'],
    action: 'जो तुम्हारे पास है वह एक पन्ने पर लिखो। हर एक पर लिखो: बुरा वक़्त, कवर, या बढ़ता पैसा।',
    deep: 'FY25 में भारतीय घरों की हर ₹100 की बचत में से ₹35 जमा में गए और ₹22 प्रॉविडेंट फ़ंड और पेंशन में। ₹15 जीवन बीमा में, ₹13 म्यूचुअल फ़ंड में और ₹2 शेयरों में। बाक़ी ₹13 कैश, छोटी बचत और दूसरी जगहों में रहे। हमारी नज़र में वह ₹15 देश के सबसे महँगे ₹15 हैं। उसमें से ज़्यादातर बचत ही है, जो बीमा पॉलिसी के अंदर बेची गई, ऐसे दाम पर जो किसी ने दिखाया नहीं।' },
  'sq.51': { title: 'मशीन को याद है', lesson: '₹2,000 दूसरी तारीख़ पर यानी साल के ₹24,000, जो महीने से पहले निकल जाते हैं।',
    why: 'तनख़्वाह वाले दिन ऑटो-डेबिट। मशीन कभी नहीं भूलती और उसका कोई बुरा महीना नहीं होता।',
    action: 'अपनी SIP की तारीख़ तनख़्वाह आने के एक-दो दिन बाद कर दो। ऐप में यह एक क्लिक है।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम भरोसा था। अब यह वह मशीन है जो कभी नहीं भूलती।',
    deep: 'SIP की तारीख़ बदलने से इच्छाशक्ति में कुछ नहीं बदलता। पैसा बस महीने के खा जाने से पहले निकल जाता है। ख़र्च से पहले बचाए गए ₹2,000 महीना यानी साल के ₹24,000। बीस साल में यह तुम्हारा अपना ₹4,80,000 अंदर जाता है। जो SIP याद रखनी पड़े, वह उसी महीने छूटेगी जिस महीने छूटना सबसे महँगा है।' },
  'sq.52': { title: 'नॉमिनी भर दो', lesson: 'भारत में ₹73,000 करोड़ से ज़्यादा लावारिस पड़ा है। ख़ाली नॉमिनी का ख़ाना एक बड़ी वजह है।' },
  'sq.53': { title: 'घर में बताओ', lesson: 'एक इंसान को पता होना चाहिए कि पैसा कहाँ है। बंद राज़ किसी के काम नहीं आता।' },
  'sq.54': { title: 'टर्म इंश्योरेंस', lesson: 'सिर्फ़ कवर, पैसा वापस नहीं। ठीक इसीलिए यह इतनी सस्ती पड़ती है।' },
  'sq.55': { title: 'नीचे आ गए', lesson: 'तुम पीछे हो, हारे नहीं। यहाँ से बुरा वक़्त फ़ंड तुम्हें खड़ा रखता है।' },
  'sq.56': { title: 'सच लिखो फ़ॉर्म पे', lesson: 'फ़ॉर्म पर अपनी असली सेहत और आदतें लिखो। छोटा झूठ ही क्लेम मारता है।' },
  'sq.57': { title: 'सोना गिरवी रखा', lesson: 'घर का सोना क़र्ज़ देने वाले के पास चला गया। किश्तें छूटीं तो नीलाम हो जाएगा।' },
  'sq.58': { title: 'शादी ग़लती नहीं है', lesson: 'शादी कभी ग़लती नहीं होती। ₹1,00,000 पर साल के ₹20,000 वाला क़र्ज़ ग़लती है।' },
  'sq.59': { title: 'झटका', lesson: 'तीन महीने काम बंद रहा। यह तुम्हारी ग़लती नहीं। एक कार्ड निकालो।',
    event: { name: 'तीन महीने काम नहीं', line: 'काम रुक गया। यह जोखिम है, ग़लती नहीं।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। तीन महीने का ख़र्चा ठीक इसी दिन के लिए है।' } },
  'sq.60': { title: 'एक जगह नहीं', lesson: 'सारे अंडे एक टोकरी में मत रखो। कुछ सुरक्षित, कुछ बढ़ता — हमेशा दोनों।' },
  'sq.61': { title: 'कौन सा पहले', lesson: 'अंदाज़ा लगाओ: बुरा वक़्त फ़ंड, बीमा, या निवेश — पहले कौन सा?',
    quiz: { question: 'इनमें पहले कौन सा आता है?',
      chips: ['निवेश', 'बुरा वक़्त फ़ंड'],
      reveal: 'पहले बुरा वक़्त फ़ंड, फिर बीमा, फिर निवेश। यही क्रम, हर बार, सबके लिए। सिर्फ़ यही क्रम एक बुरे महीने में टिकता है।' } },
  'sq.62': { title: 'परिवार सुरक्षित', lesson: 'कुछ हो जाए तो यह घर बिखरेगा नहीं। कवर यही ख़रीदता है।' },
  'sq.63': { title: 'सोना कितना', lesson: 'सोना ठीक है। गहने नहीं: मेकिंग चार्ज ₹1,00,000 पर ₹8,000 से ₹25,000 ले लेते हैं।' },
  'sq.64': { title: 'उतार चढ़ाव', lesson: 'बाज़ार ऊपर-नीचे होता है। वह हलचल बढ़ने की क़ीमत है, कोई ख़राबी नहीं।' },
  'sq.65': { title: 'ट्रेडिंग अलग है', lesson: 'इस हफ़्ते बेचने के लिए ख़रीदना ट्रेडिंग है। दस साल रखने के लिए ख़रीदना निवेश।' },
  'sq.66': { title: 'F&O का चक्कर', lesson: 'SEBI ने गिना: पिछले साल हर 100 में से क़रीब 88 F&O ट्रेडर घाटे में रहे।' },
  'sq.67': { title: 'पड़ोसी की टिप', lesson: 'पड़ोसी अपनी जीत बताता है, हार कभी नहीं। सब यही करते हैं।' },
  'sq.68': { title: 'डायरेक्ट प्लान', lesson: 'वही फ़ंड, दो दाम। डायरेक्ट में एजेंट का हिस्सा अंदर बैठा नहीं होता।' },
  'sq.69': { title: 'कौन कमा रहा है', lesson: 'रेगुलर प्लान तुम्हारे हर ₹1,00,000 में से साल के क़रीब ₹500 ले लेता है।',
    why: 'हर प्रोडक्ट किसी न किसी को पैसा देता है। दस्तख़त से पहले पूछो किसे मिलता है और कितना।',
    action: 'बेचने वाले से खुलकर पूछो कि तुम्हारे हाँ कहने पर उसे क्या मिलेगा। जवाब बहुत कुछ बता देगा।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम क़र्ज़ था। अब यह पूछता है कि पैसा किसे मिल रहा है।',
    deep: '"मेरी फ़ीस कुछ नहीं है" का मतलब लगभग हमेशा यह होता है कि फ़ीस प्रोडक्ट के अंदर है। रेगुलर म्यूचुअल फ़ंड प्लान हर ₹1,00,000 पर साल के क़रीब ₹500 का ट्रेल देता है। एंडोमेंट पॉलिसी उसकी जगह पहले साल का बड़ा कमीशन देती है। IRDAI की अपनी सालाना रिपोर्ट ग़लत बिक्री को बड़ी चिंता कहती है। FY25 में अनुचित कारोबारी तरीक़ों की शिकायतें 14% बढ़कर 26,667 हो गईं।' },
  'sq.70': { title: '"मेरी फ़ीस कुछ नहीं"', lesson: '"मेरी सेवा मुफ़्त है" का मतलब है फ़ीस पहले से तुम्हारे रिटर्न के अंदर बैठी है।' },
  'sq.71': { title: 'घर वाले सेफ़', lesson: 'टर्म कवर हो गया। इस पूरे बोर्ड की सबसे सस्ती और सबसे प्यार भरी चीज़।' },
  'sq.72': { title: 'पाँच साल हो गए', lesson: 'साठ ऑटो-डेबिट, एक भी नहीं छूटा, एक बार भी सोचा नहीं। मशीन ने कर दिया।' },
  'sq.73': { title: 'झटका', lesson: 'माँ-बाप को अब देखभाल चाहिए। किसी की ग़लती नहीं। एक कार्ड निकालो।',
    event: { name: 'माँ-बाप की देखभाल', line: 'देखभाल पर अब महीने के ₹15,000।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। परिवार का ख़र्चा कभी ग़लती नहीं होता।' } },
  'sq.74': { title: 'SIP बंद कर दी', lesson: 'दाम गिरते हैं तो ज़्यादातर लोग SIP बंद कर देते हैं। यानी सिर्फ़ महँगे दाम पर ख़रीदना।' },
  'sq.75': { title: 'पौना रास्ता', lesson: 'तीन-चौथाई। ध्यान दो: अब तक किसी भी चीज़ के लिए बड़ी तनख़्वाह नहीं चाहिए थी।',
    bullets: ['लिखा हुआ हिसाब, और आधार से जुड़ा मोबाइल।', 'बुरा वक़्त फ़ंड, हेल्थ कवर और टर्म कवर।', 'ऐसा फ़ंड जो हर साल एजेंट को पैसा नहीं देता।'],
    action: 'जो एक चीज़ सबसे ज़्यादा टूटी लगती है उसे जाँचो — आधार का मोबाइल, या नाम का मिलान।',
    deep: 'हर 100 भारतीय घरों में से क़रीब 63 को किसी न किसी बाज़ार प्रोडक्ट का पता है। 10 से भी कम असल में उसे इस्तेमाल करते हैं। यह फ़ासला लगभग कभी पैसे का नहीं होता। यह वह मोबाइल नंबर है जिस पर अब OTP नहीं आता। यह PAN पर अलग लिखा हुआ नाम है, या वह मैंडेट जो टाइम आउट हो गया। इस बोर्ड पर अब तक चढ़ा हुआ सब कुछ प्लंबिंग है, पुण्य नहीं।' },
  'sq.76': { title: 'ख़र्चा पढ़ो', lesson: '₹1,00,000 पर 1% सालाना कटौती यानी ₹1,000 — रोज़ ₹2.74 निकल जाते हैं।',
    why: 'हर फ़ंड हर साल एक हिस्सा काटता है, चाहे उस साल फ़ंड ऊपर गया हो या नीचे।',
    action: 'अपने हर फ़ंड का एक्सपेंस रेशियो देखो। साल में एक बार, दस मिनट का काम।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम ज्ञान था। दस्तख़त से पहले सालाना कटौती पढ़ो।',
    deep: '₹1,00,000 पर 1% एक्सपेंस रेशियो यानी साल के ₹1,000। यानी हर दिन क़रीब ₹2.74। इसका बिल तुम्हें नहीं आता; यह NAV में से पहले ही निकल जाता है। जिस साल फ़ंड गिरता है, उस साल भी यह कटता है। असली हुनर यही नंबर जान लेना है, और इसके लिए क़ानून जानने की ज़रूरत नहीं।' },
  'sq.77': { title: 'वक़्त सबसे बड़ा', lesson: '25 से ₹2,000 महीना, 35 से ₹5,000 से आगे: क़रीब ₹1.3 करोड़ बनाम ₹94 लाख, गारंटी नहीं।' },
  'sq.78': { title: 'कुछ नहीं किया', lesson: 'दाम गिरे और ₹5,00,000 स्क्रीन पर ₹3,50,000 दिखे। तुमने कुछ नहीं किया। अच्छा किया।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम तप था — चुपचाप बैठे रहना। तुम गिरावट में बैठे रहे और कुछ नहीं किया।' },
  'sq.79': { title: 'थोड़ा पीछे', lesson: 'इतनी देर से एक छोटी फिसलन। चिढ़ होगी, गंभीर नहीं। पासा उठाओ।' },
  'sq.80': { title: 'लाल नंबर', lesson: 'जब स्क्रीन लाल दिखाए तो पैसा सच में गिरा है। बेच देने से वह गिरावट पक्की हो जाती है।' },
  'sq.81': { title: 'बैंक से कॉल आया', lesson: '"FD से बेहतर स्कीम है।" एक चीज़ पूछो: पॉलिसी कितने साल की है?' },
  'sq.82': { title: 'गारंटीड कितना?', lesson: 'गारंटीड 8.2% असली है: ₹1,00,000 पर साल के ₹8,200। अजनबी का 12% नहीं।',
    why: 'SCSS ₹1,00,000 पर साल के ₹8,200 देती है, क़ानून के भरोसे। PACL ने इससे ज़्यादा का वादा करके ₹49,100 करोड़ इकट्ठा किए।',
    action: '₹1,00,000 पर साल के ₹8,000 से ऊपर हो तो रजिस्ट्रेशन नंबर माँगो और ख़ुद जाँचो।',
    deep: 'सरकार की सीनियर सिटिज़न सेविंग्स स्कीम गारंटीड 8.2% देती है, यानी ₹1,00,000 पर साल के ₹8,200। यह संसद के क़ानून के भरोसे है और पूरी तरह असली, और सरकार हर तिमाही यह दर तय करती है। तो अकेला "गारंटीड" लाल झंडा नहीं है। दर लाल झंडा है। किसी अजनबी से गारंटीड 12% या उससे ऊपर का वादा या तो ग़लत नाम वाली बीमा पॉलिसी है या ग़ैरक़ानूनी।' },
  'sq.83': { title: 'लॉक-इन पूछो', lesson: 'पूछो कि कितने साल पैसा फँसा रहेगा। यह कोई अपने आप नहीं बताता।' },
  'sq.84': { title: 'ख़र्चा कम हुआ', lesson: 'वही फ़ंड, ₹1,00,000 पर साल के क़रीब ₹500 कम कटते हैं। हर साल, बीस साल तक।' },
  'sq.85': { title: 'बोरिंग ही सही', lesson: 'पैसे की अच्छी आदतें बोरिंग होती हैं। रोमांच आम तौर पर महँगा विकल्प होता है।' },
  'sq.86': { title: 'झटका', lesson: 'ऐसा बिल आया जो कोई पहले से नहीं देख सकता था। एक कार्ड निकालो।',
    event: { name: 'बिना बताए बिल', line: 'ऐसा कुछ आया जो कोई पहले से नहीं देख सकता था।',
      shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया।', setback: '4 घर पीछे। ज़िंदगी तुम्हारा कैलेंडर नहीं देखती।' } },
  'sq.87': { title: 'कौन पूछता है', lesson: 'अंदाज़ा लगाओ: कौन सा अफ़सर "जाँच के लिए" पैसे भेजने को कह सकता है?',
    quiz: { question: 'कौन सा अफ़सर जाँच के लिए पैसे भेजने को कह सकता है?',
      chips: ['वीडियो कॉल पर CBI', 'कोई नहीं। एक भी नहीं।'],
      reveal: 'कोई नहीं। एक भी नहीं। किसी पुलिस, अदालत, CBI, RBI या इनकम-टैक्स अफ़सर ने आज तक जाँच के लिए पैसे भेजने को नहीं कहा। कॉल काटो, फिर 1930 मिलाओ।' } },
  'sq.88': { title: 'आठ क़दम', lesson: 'आठ घर पीछे। तुम अब भी पहले पहुँच सकते हो। पासा फेंको।' },
  'sq.89': { title: 'एक और प्रीमियम', lesson: '"भर दो, सब वापस मिल जाएगा।" यह आम तौर पर बिलकुल नई पॉलिसी होती है।' },
  'sq.90': { title: '1930 याद रखो', lesson: 'ऑनलाइन ठगे गए? एक घंटे के अंदर 1930 मिलाओ। तब पैसा रोका जा सकता है।' },
  'sq.91': { title: 'स्क्रीन शेयर नहीं', lesson: 'खाता ठीक करने के लिए किसी को स्क्रीन-शेयर ऐप या OTP नहीं चाहिए। किसी को नहीं। कभी नहीं।' },
  'sq.92': { title: 'बस थोड़ा और', lesson: 'पीछे देखो: SIP, बुरा वक़्त फ़ंड, कवर, डायरेक्ट प्लान, नॉमिनी। यह पूरा प्लान है।',
    bullets: ['SIP, बुरा वक़्त फ़ंड, हेल्थ कवर, टर्म कवर, डायरेक्ट प्लान, नॉमिनी।', 'छह चीज़ें। मिलकर यही एक पूरा प्लान हैं।', 'अब बचा है ठगे न जाना, और घर वालों को बता देना।'],
    action: 'इस हफ़्ते हर खाते में नॉमिनी जोड़ो, और बताओ कि काग़ज़ किस फ़ोल्डर में हैं।',
    deep: 'भारत में ₹73,000 करोड़ से ज़्यादा लावारिस पड़ा है। क़रीब ₹60,518 करोड़ सरकारी बैंकों के पास है, ₹8,974 करोड़ जीवन बीमा कंपनियों के पास और ₹3,749 करोड़ म्यूचुअल फ़ंड में। एक राष्ट्रीय अभियान उसमें से सिर्फ़ ₹5,777 करोड़ लौटा पाया। जो पैसा किसी को मिल ही न सके, वह कभी सच में कमाया ही नहीं गया। ख़ाली नॉमिनी का ख़ाना उसकी सबसे बड़ी वजह है।' },
  'sq.93': { title: 'बच्चों के सामने', lesson: 'बच्चे पैसा देखकर सीखते हैं। उन्हें हर महीने SIP जाते हुए देखने दो।' },
  'sq.94': { title: 'वही पैसा बड़ा हुआ', lesson: 'तुमने कुछ जोड़ा नहीं। बस भागे नहीं। इसी ने उसे वक़्त दिया।' },
  'sq.95': { title: 'घर वालों से बात', lesson: 'घर वालों को बताओ कि पैसा कहाँ रखा है। बचा हुआ आख़िरी असली जोखिम यही है।' },
  'sq.96': { title: '"CBI बोल रहा हूँ"', lesson: 'वीडियो कॉल पर वर्दी, और "जाँच के लिए" ट्रांसफ़र। दोनों एक कॉस्ट्यूम हैं।' },
  'sq.97': { title: 'ना कह दिया', lesson: 'तुमने ना कह दिया। इस बोर्ड की असली परीक्षा यही थी, और तुम पास हुए।' },
  'sq.98': { title: 'सब लिखा हुआ है', lesson: 'खाते, नॉमिनी, और एक इंसान जिसे पता है। तुम्हारा पैसा उन तक पहुँचेगा।' },
  'sq.99': { title: 'एक क़दम', lesson: 'एक घर बचा। पुराने बोर्ड ने यहाँ साँप रखा था। हमने उसे हटा दिया।',
    heritage: 'पुराने बोर्ड ने 99 पर साँप रखा था, मोक्ष से एक क़दम पहले। हमने उसे हटा दिया, और यह कहते भी हैं।' },
  'sq.100': { title: 'मंज़िल: लक्ष्य पूरा', lesson: 'सबसे अमीर नहीं। वह जो अपनी बचत की मंज़िल तक पहुँचा। खेल हमेशा यही था।',
    bullets: ['एक SIP, चाहे ₹500 की हो।', 'तीन महीने का ख़र्चा, बैंक में।', 'हेल्थ कवर और टर्म कवर, अपने नाम पर।', 'हर खाते में नॉमिनी।', 'घर में एक इंसान को पता हो कि क्या कहाँ है।'],
    action: 'इन पाँच में से जो तुम्हारे पास नहीं है वह एक चुनो। इसी हफ़्ते वही करो।',
    deep: 'इस बोर्ड ने पाँच चीज़ें बताईं। एक SIP, तीन महीने का ख़र्चा, अपने नाम पर कवर, डायरेक्ट प्लान और नॉमिनी। इसने टैक्स, होम लोन या रिटायरमेंट नहीं बताया — उनके लिए लंबी बैठक और तुम्हारे अपने नंबर चाहिए। यहाँ किसी एक प्रोडक्ट की सलाह नहीं है। यह वह क्रम है जिससे ज़्यादातर भारतीय घर अपने पैर जमाते हैं।' },

  'snake.27': { name: 'एंडोमेंट पॉलिसी', costNote: 'FD से इतना कम',
    why: '₹50,000 साल के, 15 साल तक — यानी ₹7,50,000 अंदर। वापस क़रीब ₹10,41,000, जो FD से कम से कम ₹50,000 कम है।',
    escape: 'दस्तख़त से पहले पूछो: पॉलिसी कितने साल की है? जवाब 15 या 20 हो तो यह FD नहीं है।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — वह 15 साल की पॉलिसी थी, FD नहीं।',
    counterparty: 'बैंक की शाखा और एजेंट, पहले साल के बड़े कमीशन से।',
    deep: 'बचत और बीमा वाली पॉलिसी पाँच साल की जमा बताकर बेची जाती है। पाँच साल सिर्फ़ इतना है कि तुम कितने साल भरोगे। पॉलिसी ख़ुद पंद्रह या बीस साल चलती है। ₹50,000 साल के, 15 साल तक भरो। यह ₹7,50,000 अंदर है, और ₹1,00,000 पर साल के क़रीब ₹4,000 की दर से यह क़रीब ₹10,41,000 पर पकती है। वही पैसा 6.5% की FD में, ब्याज पर टैक्स के बाद, क़रीब ₹10,91,000 होता। बैंक 15 साल की FD नहीं देते, तो यह छोटी-छोटी FD की सीढ़ी होगी।' },
  'snake.38': { name: 'कार्ड का मिनिमम ड्यू', costNote: 'एक साल का ब्याज',
    why: 'कार्ड पर चलता छोड़ा हुआ ₹50,000 का बिल साल भर में क़रीब ₹21,000 ब्याज ले लेता है।',
    escape: 'पूरा बिल तारीख़ पर भरो। न भर सको तो बैंक से कहो कि उसे आम लोन में बदल दे।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — ₹50,000 बाक़ी छोड़ा तो साल में ₹21,000 ब्याज।',
    counterparty: 'कार्ड जारी करने वाला बैंक। बक़ाया रक़म का ब्याज ही कार्ड की ज़्यादातर कमाई है।',
    deep: 'क्रेडिट कार्ड सच में मुफ़्त है, अगर पूरा बिल तारीख़ पर भर दिया जाए। जिस पल ऐसा नहीं होता, बक़ाया रक़म पर हर ₹1,00,000 पर महीने के क़रीब ₹3,500 लगते हैं। यानी ₹1,00,000 पर साल के क़रीब ₹42,000, ब्याज पर ब्याज जोड़े बिना। ₹50,000 पर यह बारह महीनों में क़रीब ₹21,000 ब्याज है, ₹50,000 के ऊपर। सबसे ऊँची दर वाला कार्ड पहले ख़त्म करो, चाहे वह सबसे छोटा हो।' },
  'snake.46': { name: 'चेन सिस्टम', costNote: 'नेट गया, 8 महीने बाद',
    why: '₹2,00,000 अंदर। आठ महीने ₹6,000 महीना मिला, फिर बंद। ₹1,52,000 चला गया।',
    escape: 'पूछो मुनाफ़ा कहाँ से आता है। जवाब "नए मेंबर" हो तो चले जाओ और पड़ोसी को भी बताओ।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — चेन सिस्टम 8 महीने देता है, फिर ₹1,52,000 ले जाता है।',
    counterparty: 'चलाने वाला और सबसे पुराने मेंबर, जिन्हें नए मेंबरों के पैसे से भुगतान होता है।',
    deep: '₹2,00,000 पर महीने के ₹6,000 यानी साल के ₹72,000, ब्याज पर ब्याज जोड़े बिना। भारत में कोई जायज़ धंधा किसी अजनबी को इतना नहीं देता। चेन सिस्टम अपने पुराने मेंबरों को नए मेंबरों के पैसे से भरता है। आठ-दस महीने सब बढ़िया दिखता है, फिर जिस दिन नए लोग आने बंद, उसी दिन सब बंद। आठ महीने के ₹6,000 यानी ₹48,000 वापस, तो ₹2,00,000 में से ₹1,52,000 गया। SEBI ने PACL की वसूली ₹49,100 करोड़ बताई।' },
  'snake.57': { name: 'सोना गिरवी रखा', costNote: 'साल का ब्याज',
    why: 'घर के सोने पर ₹1,00,000 पर साल के ₹20,000 की दर से लिया ₹4,00,000 का क़र्ज़ यानी साल का ₹80,000 ब्याज।',
    escape: 'पता ख़र्चों के लिए महीनों पहले से बचाओ। सोना आख़िरी दरवाज़ा है, पहला कभी नहीं।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — गिरवी रखा सोना साल का ₹80,000 ब्याज माँगता है।',
    counterparty: 'गोल्ड-लोन कंपनी या मोहल्ले का साहूकार, और वह जो नीलाम हुआ सोना ख़रीदता है।',
    deep: 'गोल्ड लोन इसलिए तेज़ है क्योंकि तुम्हारा सोना ही ज़मानत है। बैंक सोने पर ₹1,00,000 पर साल के क़रीब ₹9,000 से ₹12,000 लेते हैं। गोल्ड-लोन कंपनियाँ और साहूकार अक्सर ₹18,000 से ₹24,000 लेते हैं। ₹4,00,000 पर उस ऊँची दर से यह साल का ₹80,000 है। भारत का गोल्ड-लोन बही तीन साल में क़रीब तिगुना हुआ है, और ज़्यादातर ख़र्च के लिए, इमरजेंसी के लिए नहीं। पता ख़र्च के लिए एक साल पहले से अलग फ़ंड शुरू करो।' },
  'snake.66': { name: 'F&O का चक्कर', costNote: 'एक साल में, औसत',
    why: 'SEBI ने गिना: हर 100 में से क़रीब 88 F&O ट्रेडर घाटे में रहे। औसत घाटा ₹1,17,000 था।',
    escape: 'वह ट्रेडिंग है, निवेश नहीं। बाज़ार चाहिए तो SIP लो और उसे साल दो।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — 100 में से 88 F&O ट्रेडर हारे, औसत ₹1,17,000।',
    counterparty: 'ब्रोकर और एक्सचेंज, जिन्हें हर सौदे पर पैसा मिलता है, जीत हो या हार।',
    deep: 'SEBI 2024 से हर साल इक्विटी डेरिवेटिव ट्रेडरों को गिनता है। जवाब बदलता नहीं: दस में से क़रीब नौ घाटे में रहते हैं। पिछले साल हर 100 में से 87.7 हारे, और औसत घाटा क़रीब ₹1,17,000 था। 30 साल से कम उम्र वालों में, जो कुल का दस में से चार से ज़्यादा हैं, हारने वालों का हिस्सा और भी बड़ा है। इसे घर के पैसे से पूरी तरह अलग रखो, और बुरा वक़्त फ़ंड से तो कभी मत छुओ।' },
  'snake.74': { name: 'SIP बंद कर दी', costNote: 'जो कभी नहीं लगा',
    why: 'दाम गिरे, तो ₹5,000 महीने की SIP आठ महीने रुकी। यह ₹40,000 है जो कभी अंदर गया ही नहीं।',
    escape: 'पैसा तंग है तो SIP ₹500 कर दो। कम करना ठीक है। बंद करना ही चोट देता है।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — 8 महीने बंद SIP यानी ₹40,000 जो कभी नहीं लगा।',
    counterparty: 'कोई नहीं। इसमें नुक़सान तुम्हारा है और कमाई किसी की नहीं, इसीलिए कोई चेताता नहीं।',
    deep: 'SIP दाम गिरने पर ज़्यादा यूनिट ख़रीदती है। गिरावट में उसे रोकने का मतलब है कि तुमने सिर्फ़ महँगे दामों पर ख़रीदा। ₹5,000 के आठ रुके महीने यानी ₹40,000 जो कभी अंदर नहीं गया। भारत में हर गिरावट पर SIP बंद होना बढ़ जाता है; जनवरी 2025 में खुलने से ज़्यादा SIP बंद हुईं। किसी ने उन निवेशकों को नंबर लाल होने के लिए तैयार नहीं किया था। अभी, शांति में तय करो कि दाम गिरने पर तुम क्या करोगे।' },
  'snake.89': { name: 'रिवाइवल कॉल', costNote: 'नई पॉलिसी में गया',
    why: 'कॉल कहती है एक और प्रीमियम भरो तो फँसा पैसा खुल जाएगा। ₹30,000 भरे — एक नई 15 साल की पॉलिसी के लिए।',
    escape: 'कुछ भी भरने से पहले पुरानी पॉलिसी का नंबर और उसकी मैच्योरिटी तारीख़ लिखित में माँगो।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — ₹30,000 का वह प्रीमियम एक नई पॉलिसी थी।',
    counterparty: 'एजेंट, जिसे "रिवाइवल" पर पहले साल का नया कमीशन मिलता है।',
    deep: 'यह जाल उसी पैसे को घेरता है जो सच में फँसा हुआ है। भारतीय जीवन बीमा कंपनियों के पास क़रीब ₹8,974 करोड़ लावारिस पड़ा है। किसी बड़ी कंपनी की क़रीब आधी पॉलिसियाँ, गिनती के हिसाब से, पाँचवें साल तक भरी ही नहीं जा रहीं। यानी फ़ोन करने के लिए लाखों बंद पॉलिसियाँ मौजूद हैं। रिवाइवल कॉल अक्सर नई तारीख़ वाली नई पॉलिसी बेच देती है। पॉलिसी नंबर, शुरू होने की तारीख़ और मैच्योरिटी तारीख़ लिखित में माँगो।' },
  'snake.96': { name: 'डिजिटल अरेस्ट', costNote: '"रिलीज़ फ़ीस"',
    why: 'एक वीडियो कॉल, पीछे पुलिस स्टेशन, तुम्हारा आधार "एक पार्सल में मिला", और फिर ₹8,000 रिलीज़ फ़ीस।',
    escape: 'कॉल काटो, घर के एक इंसान को बताओ, एक घंटे के अंदर 1930 मिलाओ। कोई अफ़सर पैसा नहीं माँगता।',
    shielded: 'बुरा वक़्त फ़ंड ने सँभाल लिया। पर याद रखो — कोई अफ़सर जाँच के लिए पैसे नहीं माँगता।',
    counterparty: 'संगठित ठगी के केंद्र, जिनमें से ज़्यादातर भारत के बाहर से चलते हैं।',
    deep: 'डिजिटल अरेस्ट से 2022 और 2025 के बीच क़रीब 2,41,537 शिकायतें और क़रीब ₹3,012 करोड़ का नुक़सान हुआ। वर्दी, कॉल करने वाले के पीछे का पुलिस स्टेशन और स्क्रीन पर दिखते काग़ज़ — सब कॉस्ट्यूम और सेट हैं। एक ही लाइन इस पूरे ख़ानदान की ठगी को हरा देती है। किसी असली पुलिस, अदालत, CBI, RBI या इनकम-टैक्स अफ़सर ने आज तक जाँच के लिए पैसे भेजने को नहीं कहा। कॉल काटो, एक इंसान को ज़ोर से बताओ, फिर 1930 मिलाओ।' },

  'ladder.3': { name: 'सात दिन का हिसाब', amountNote: 'साल में मिला',
    why: 'सात दिन हर रुपया लिखने पर आम तौर पर महीने के ₹1,500 से ₹3,000 का रिसाव पकड़ में आता है।',
    how: 'नोट्स ऐप या बिल के पीछे। सिर्फ़ सात दिन। अभी कुछ मत काटो — आख़िर में एक बार पढ़ लो।',
    deep: 'अपना ख़र्चा किसी को ठीक-ठीक याद नहीं रहता। इसीलिए "पैसा जाता कहाँ है?" का जवाब ज़्यादातर घरों में नहीं होता। सात दिन उसकी शक्ल देखने के लिए काफ़ी हैं। रोज़ ₹100 की आदत साल के ₹36,500 है, और रोज़ ₹30 की दो चाय ₹21,900। जो घर लिखते हैं उन्हें आम तौर पर महीने के ₹1,500 से ₹3,000 ऐसे मिलते हैं जो उन्होंने चुनकर ख़र्च ही नहीं किए थे।' },
  'ladder.12': { name: 'पहली SIP — ₹500', amountNote: 'आपका अपना पैसा, 20 साल में',
    why: 'बीस साल तक महीने के ₹500 यानी तुम्हारा अपना ₹1,20,000, ₹500 करके अंदर जाता हुआ।',
    how: 'एक इंडेक्स फ़ंड, डायरेक्ट प्लान, ₹500, तनख़्वाह के दो दिन बाद ऑटो-डेबिट। एक बार, पंद्रह मिनट।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम श्रद्धा था। पहला क़दम आज भी सबसे मुश्किल है।',
    deep: 'बीस साल तक महीने के ₹500 यानी तुम्हारा अपना ₹1,20,000। अगर यह साल के 12% से बढ़े — गारंटी नहीं — तो क़रीब ₹4,99,000 होता। 8% पर यह क़रीब ₹2,95,000 के पास रहता। यह फ़ासला ही ईमानदार हिस्सा है। जिसमें कोई शक नहीं वह है ₹1,20,000, और यह कि एकमुश्त रक़म का इंतज़ार करने वाले ने उसे कभी डाला ही नहीं। आज ₹500 की एक SIP शुरू करो।' },
  'ladder.17': { name: 'आधार से मोबाइल जोड़ो', amountNote: 'पूरी फ़ीस',
    why: 'इसमें क़रीब ₹50 और एक सुबह लगती है। निवेश की पहली कोशिश सबसे ज़्यादा इसी वजह से फ़ेल होती है।',
    how: 'अपना आधार और आज चलने वाला फ़ोन नंबर लेकर आधार सेवा केंद्र जाओ। बस यही काम है।',
    deep: 'हर ऑनलाइन KYC का OTP उसी मोबाइल नंबर पर जाता है जो आधार से जुड़ा है। अगर वह नंबर 2018 में छूट गया था, तो कुछ नहीं खुलेगा। न म्यूचुअल फ़ंड, न डीमैट, न मैंडेट, न क्लेम — और एरर कभी वजह नहीं बताता। इलाज एक बार ख़ुद जाकर आना और क़रीब ₹50 की फ़ीस है। यह पूरे बोर्ड का सबसे नीरस और सबसे ताक़तवर काम है।' },
  'ladder.25': { name: 'बुरा वक़्त फ़ंड', amountNote: 'तीन महीने का ख़र्चा',
    why: 'घर महीने का ₹25,000 ख़र्च करता है तो तीन महीने यानी ₹75,000। यही बिल को कार्ड का क़र्ज़ बनने से रोकता है।',
    how: 'बिना कार्ड वाला अलग बचत खाता खोलो। हर महीने ₹2,000 भेजो जब तक तीन महीने का ख़र्चा न हो जाए।',
    deep: 'तीन महीने का ख़र्चा, उसी दिन हाथ आने वाला। महीने के ₹25,000 पर यह ₹75,000 है; छह महीने ₹1,50,000। महीने के ₹2,000 से वहाँ पहुँचने में तीन साल से थोड़ा ज़्यादा लगता है। महीने के ₹5,000 से क़रीब पंद्रह महीने। यह बैंक में रहता है, सोने में नहीं और लॉक-इन में नहीं। यहाँ रिटर्न से ज़्यादा रफ़्तार मायने रखती है, क्योंकि बात उस दोपहर की है जब यह चाहिए।' },
  'ladder.41': { name: 'अपना हेल्थ कवर', amountNote: 'का फ़्लोटर',
    why: 'एक गंभीर भर्ती ₹3,00,000 से ₹5,00,000 की पड़ती है। ₹10,00,000 का फ़्लोटर साल के ₹20,000 से ₹30,000 में आता है।',
    how: 'अपने नाम पर ₹10,00,000 का फ़ैमिली फ़्लोटर लो, ऑफ़िस के कवर से अलग, जब तक सब स्वस्थ हैं।',
    deep: 'क़रीब 30 से 40 करोड़ भारतीयों के पास कोई हेल्थ कवर नहीं है। अस्पताल में एक बार भर्ती होना निचले-मध्यम वर्ग से क़र्ज़ तक जाने का सबसे आम रास्ता है। कंपनी का कवर उसी दिन ख़त्म होता है जिस दिन नौकरी, और अक्सर वही हफ़्ता होता है जब वह चाहिए। पहले से मौजूद बीमारियों का इंतज़ार अपना कवर लेने पर दोबारा शुरू होता है। शहर में पाँच दिन की भर्ती ही ₹1,00,000 पार कर जाती है।' },
  'ladder.54': { name: 'टर्म इंश्योरेंस', amountNote: 'का कवर',
    why: 'स्वस्थ 30 साल के इंसान के लिए ₹1,00,00,000 का कवर अक्सर साल के ₹12,000 से ₹15,000 में आता है।',
    how: 'सालाना आमदनी का 10 से 15 गुना लो। सिर्फ़ टर्म, ऑनलाइन ख़रीदा, उसके साथ कुछ भी जोड़े बिना।',
    deep: 'टर्म इंश्योरेंस तभी पैसा देता है जब उस अवधि में मौत हो जाए। पूरा प्रोडक्ट यही है। इसीलिए ₹1,00,00,000 का कवर उस मनी-बैक पॉलिसी के एक हिस्से में आ जाता है जो इसका दसवाँ हिस्सा देती है। प्रीमियम उम्र, सेहत और कंपनी पर निर्भर करता है। 30 पर क़रीब ₹12,000 से ₹15,000 साल के; 40 पर अक्सर दोगुना। साल के ₹6,00,000 कमाते हो तो ₹60,00,000 से ₹90,00,000 का कवर रखो।' },
  'ladder.68': { name: 'डायरेक्ट प्लान', amountNote: 'हर साल, हर ₹1,00,000 पे',
    why: 'वही फ़ंड, दो दाम। डायरेक्ट तुम्हारे हर ₹1,00,000 पर साल के क़रीब ₹500 तुम्हारे ही हाथ में रखता है।',
    how: 'ऐप में डायरेक्ट वाला रूप चुनो। पुराना पैसा हटाने से पहले एक्ज़िट लोड ज़रूर देख लो।',
    deep: 'रेगुलर प्लान तुम्हारे रिटर्न में से हर साल डिस्ट्रिब्यूटर को कमीशन देता है। वह NAV के अंदर बैठा है, इसलिए तुम्हें कोई बिल नहीं दिखता। भारत के एक बड़े इक्विटी फ़ंड में यह क़रीब 1.28% डायरेक्ट बनाम 1.78% रेगुलर रहा है। वह फ़र्क़ हर ₹1,00,000 पर साल के क़रीब ₹500 है, यानी ₹5,00,000 पर साल के ₹2,500। यह दशकों तक तुम्हारे ख़िलाफ़ जुड़ता है। इससे रेगुलर प्लान बुरे नहीं हो जाते; बस पता होना चाहिए कि तुम भर रहे हो।' },
  'ladder.78': { name: 'कुछ नहीं किया', amountNote: 'स्क्रीन पे दिखा',
    why: 'दाम गिरे और ₹5,00,000 स्क्रीन पर ₹3,50,000 दिखा। तुमने कुछ नहीं बदला, और तुम्हारे ₹5,000 ख़रीदते रहे।',
    how: 'आज, शांति में, लिखकर तय करो: गिरावट आने पर मैं कुछ नहीं करूँगा। इसे घर वालों को दिखाओ।',
    heritage: 'पुराने बोर्ड पर इस घर का नाम तप था — चुपचाप बैठे रहना। तुम गिरावट में बैठे रहे और कुछ नहीं किया।',
    deep: 'SEBI के सर्वे में हर 100 में से क़रीब 40 निवेशक सुस्त पड़ चुके हैं, और ज़्यादातर ख़राब प्रदर्शन को वजह बताते हैं। उन्होंने शुरू किया, गिरावट देखी, और जम गए। 30% की गिरावट स्क्रीन पर ₹5,00,000 को ₹3,50,000 कर देती है। वह गिरावट असली है, कोई धोखा नहीं। उसे पक्का बेच देना करता है। जिन्होंने उस दौर में SIP चलती रखी, उन्होंने दशक की सबसे सस्ती यूनिट ख़रीदीं।' },

  'gl.Inflation': { plain: 'दाम हर साल बढ़ते हैं, तो उतने ही रुपये कम सामान ख़रीदते हैं।' },
  'gl.Investment': { plain: 'पैसा कहीं ऐसी जगह रखना जहाँ वह सालों में बढ़े।' },
  'gl.Savings': { plain: 'अलग रखा हुआ पैसा, जो ख़र्च नहीं हुआ।' },
  'gl.Interest': { plain: 'पैसे को मिलने वाला किराया, या उधार लेने पर तुम्हारा दिया किराया।' },
  'gl.Compound interest': { plain: 'तुम्हारा ब्याज ख़ुद अपना ब्याज कमाने लगता है।' },
  'gl.Returns': { plain: 'कितना ज़्यादा वापस मिला, रुपयों में कहा हुआ।' },
  'gl.Risk': { plain: 'पैसे की क़ीमत गिर सकती है, या पैसा जा भी सकता है।' },
  'gl.Volatility': { plain: 'रास्ते में दामों का ऊपर-नीचे होते रहना।' },
  'gl.Diversification': { plain: 'सब कुछ कभी एक ही जगह मत रखो।' },
  'gl.Liquidity': { plain: 'कितनी जल्दी उसे वापस नक़द बनाया जा सकता है।' },
  'gl.Lock-in': { plain: 'वे साल जिनमें पैसा निकाला नहीं जा सकता।' },
  'gl.Emergency fund': { plain: 'तीन से छह महीने का ख़र्चा, उसी दिन हाथ आने वाला।' },
  'gl.Mutual fund': { plain: 'कई लोगों का पैसा एक जगह; मैनेजर उससे कई कंपनियाँ ख़रीदता है।' },
  'gl.SIP': { plain: 'हर महीने एक तय रक़म लगाने का पक्का निर्देश।' },
  'gl.NAV': { plain: 'फ़ंड की एक यूनिट का आज का दाम।' },
  'gl.Direct plan': { plain: 'वही फ़ंड, जिसमें एजेंट की सालाना कटौती अंदर नहीं होती।' },
  'gl.Regular plan': { plain: 'वही फ़ंड, जिसमें तुम्हारे रिटर्न से कमीशन निकलता है।' },
  'gl.Expense ratio': { plain: 'फ़ंड की सालाना कटौती, हर लाख पर रुपयों में।' },
  'gl.Commission': { plain: 'तुम्हारे हाँ कहने पर बेचने वाले को क्या मिलता है।' },
  'gl.Equity / shares': { plain: 'किसी कंपनी में मालिकाना हक़ का एक छोटा हिस्सा।' },
  'gl.Stock market': { plain: 'जहाँ कंपनियों के शेयर ख़रीदे और बेचे जाते हैं।' },
  'gl.Trading': { plain: 'दिनों या हफ़्तों में बेचने के लिए ख़रीदना।' },
  'gl.F&O / derivatives': { plain: 'दाम की दिशा पर तेज़ दाँव। 10 में से क़रीब 9 हारते हैं।' },
  'gl.Index fund': { plain: 'ऐसा फ़ंड जो बस पूरा बाज़ार रखता है।' },
  'gl.FD': { plain: 'बैंक में तय समय के लिए तय ब्याज पर रखा पैसा।' },
  'gl.Term insurance': { plain: 'सिर्फ़ कवर। पैसा वापस नहीं। परिवार को बड़ी रक़म मिलती है।' },
  'gl.Endowment / money-back': { plain: 'बीमा और बचत एक साथ। कम रिटर्न, लंबा लॉक-इन।' },
  'gl.ULIP': { plain: 'बीमा और बाज़ार का निवेश एक में, चार्ज के साथ।' },
  'gl.Premium': { plain: 'बीमा पॉलिसी के लिए तुम जो रक़म भरते हो।' },
  'gl.Sum assured': { plain: 'क्लेम पर परिवार को मिलने वाली रक़म।' },
  'gl.Maturity': { plain: 'पॉलिसी या जमा ख़त्म होने पर वापस क्या मिलता है।' },
  'gl.Persistency / lapse': { plain: 'प्रीमियम न भरने से पॉलिसी बंद हो गई।' },
  'gl.Health cover / floater': { plain: 'ऐसा बीमा जो परिवार के अस्पताल के बिल भरता है।' },
  'gl.Nominee': { plain: 'वह इंसान जिसे तुम्हारे न रहने पर पैसा मिलेगा।' },
  'gl.KYC': { plain: 'निवेश से पहले एक बार होने वाली पहचान की जाँच।' },
  'gl.PAN': { plain: 'वह टैक्स नंबर जो हर निवेश के लिए चाहिए।' },
  'gl.Demat account': { plain: 'वह खाता जो शेयरों को इलेक्ट्रॉनिक रूप में रखता है।' },
  'gl.Mandate / auto-debit': { plain: 'बैंक को हर महीने तय रक़म काटने की इजाज़त।' },
  'gl.EMI': { plain: 'लोन की तय मासिक किश्त।' },
  'gl.Minimum due': { plain: 'कार्ड की सबसे छोटी अनुमति वाली भरपाई — और सबसे महँगी।' },
  'gl.No-cost EMI': { plain: 'ऐसी किश्तें जिनका ब्याज दाम के अंदर छिपा है।' },
  'gl.Gold loan': { plain: 'सोने के बदले क़र्ज़। किश्तें छूटीं तो वह बिक जाता है।' },
  'gl.Ponzi / chain system': { plain: 'पुराने मेंबरों को नए मेंबरों के पैसे से भरा जाता है। यह हमेशा रुकता है।' },
  'gl.Capital gains tax': { plain: 'बेचने पर हुए मुनाफ़े पर लगने वाला टैक्स।' },
  'gl.Credit score': { plain: 'एक नंबर जो बताता है तुम कितने भरोसे से चुकाते हो।' },
  'gl.Corpus / portfolio': { plain: 'तुम्हारे पास जो कुछ है, सब मिलाकर।' },
  'gl.Asset allocation': { plain: 'तुम्हारा पैसा सुरक्षित और बढ़ते हिस्सों में कैसे बँटा है।' },
  'gl.Digital arrest': { plain: 'वीडियो कॉल पर नक़ली अफ़सर, जो पैसे भेजने को कहता है।' },
  'gl.Compounding': { plain: 'ऐसी बढ़त जो हर साल ख़ुद अपने ऊपर बढ़ने लगती है।' },
  'gl.Debt': { plain: 'जो पैसा तुम पर चढ़ा है — लोन, कार्ड का बक़ाया, EMI।' },
  'gl.Exit load': { plain: 'फ़ंड से जल्दी पैसा निकालने पर लगने वाली फ़ीस।' },
  'gl.Growth option': { plain: 'मुनाफ़ा बाहर देने के बजाय फ़ंड के अंदर ही रहता है।' },
  'gl.Trail commission': { plain: 'हर उस साल एजेंट को मिलने वाला हिस्सा जब तक पैसा लगा है।' },
  'gl.SEBI': { plain: 'वह सरकारी संस्था जो शेयर बाज़ार पर नज़र रखती है।' },
  'gl.IRDAI': { plain: 'वह सरकारी संस्था जो बीमा कंपनियों पर नज़र रखती है।' },
  'gl.SCSS': { plain: 'साठ साल से ऊपर के लोगों के लिए सरकारी बचत योजना।' },
  'gl.1930': { plain: 'साइबर ठगी की हेल्पलाइन। एक घंटे के अंदर फ़ोन करो।' },
};

/* Hang every Hindi twin on its English object as a '<field>_hi' sibling, nested
   objects included (quiz.reveal_hi, event.setback_hi). Pure data assembly. */
function graftHi(target, hi) {
  if (!target || !hi) return;
  for (const [k, v] of Object.entries(hi)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) graftHi(target[k], v);
    else target[k + '_hi'] = v;
  }
}
for (const s of SQUARES) graftHi(s, HI['sq.' + s.n]);
for (const s of SNAKES)  graftHi(s, HI['snake.' + s.from]);
for (const l of LADDERS) graftHi(l, HI['ladder.' + l.from]);
for (const g of GLOSSARY) graftHi(g, HI['gl.' + g.term]);

/** Resolve one field in one language. Falls back to English whenever the Hindi
 *  twin is missing, so a half-translated field can never blank the card.
 *  Usage: pick(squareAt(24), 'lesson', lang) */
export function pick(obj, field, lang) {
  if (!obj) return undefined;
  const hi = obj[field + '_hi'];
  return (lang === 'hi' && hi) ? hi : obj[field];
}

/** Every square, snake, ladder and glossary entry has a Hindi twin. Read by
 *  tests/content.test.mjs and by any module deciding whether to offer हिं. */
export const hasHindi = (id) => Object.prototype.hasOwnProperty.call(HI, id);
