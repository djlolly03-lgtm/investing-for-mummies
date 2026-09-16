/* Ten DELIBERATELY DIFFICULT assets, tagged 16 Sep 2026 for sanity-check before backfill.
 *
 * These are not representative — they are the awkward ones: the types that map to no
 * Format, the rows with no usable description, the asset with no evidence at all, and the
 * one that is not a content asset in the first place.
 *
 * Rules applied, as agreed:
 *   - Classroom Moment = something happening. B-roll = establishing/contextual.
 *   - Source = who PRODUCED it. Hybrid AI/real is IFM / In-house, never AI-disclosure.
 *   - Person: Hiral only on visual confirmation. Otherwise blank.
 *   - Evidence over inference. Blank beats invented.
 *   - slide_text is read, never guessed.
 *
 * THREE assets below could not be tagged cleanly. They are marked _PROBLEM and are the
 * reason this file exists — see PROTOTYPE-FINDINGS.md "Backfill sanity-check".
 */
window.IFM_SAMPLE10 = [

/* ---- 1. Vision required: the row's description is pure boilerplate ------------ */
{
  id:'IFM-251', title:'Goa Workshop — photo 1',
  type:'Image', format:'Hiral Speaking',
  topic:[], person:['Hiral','Student'], source:'Unknown',
  session:'Goa — 17 Jul 2026', status:'Raw',
  description:'Open-air venue with women seated at cafe tables listening, Hiral standing at the far side in a blue dress presenting. A dog is asleep on the floor in the foreground — an unusually relaxed, non-corporate setting.',
  slide_text:'',
  search_terms:'goa workshop offsite retreat open air cafe relaxed informal casual dog seated audience listening women blue dress destination',
  _evidence:"Original description was 63 characters of boilerplate ('Photo from the IFM women's money workshop in Goa') and identical across six rows. Everything above came from looking at the 5712x4284 original. Hiral confirmed visually. Source not established -> Unknown.",
  _note:'Six Goa rows (IFM-251..256) share one boilerplate description. All six need vision, not text.',
},

/* ---- 2. Slide text is the whole value of the frame --------------------------- */
{
  id:'IFM-252', title:'Goa Workshop — photo 2',
  type:'Image', format:'Hiral Speaking',
  topic:['Financial Planning','Managing Money','Saving'],
  person:['Hiral'], source:'Unknown', session:'Goa — 17 Jul 2026', status:'Raw',
  description:'Hiral presenting from a laptop beside a large screen showing an emergency-fund diagram — a safety net catching a falling figure.',
  slide_text:'Secure Your Emergency Fund. Financial Safety Net.',
  search_terms:'emergency fund rainy day money safety net contingency months of expenses buffer savings goa workshop presenting laptop screen',
  _evidence:"Three topics came from reading the screen. The row's own text had none — it said only 'Photo from the IFM women's money workshop in Goa'. This is the slide_text case in miniature.",
},

/* ---- 3. Posed group photo — see _PROBLEM below ------------------------------- */
{
  id:'IFM-253', title:'Goa Workshop — photo 3',
  type:'Image', format:'Classroom Moment',
  topic:[], person:['Hiral','Student'], source:'Unknown',
  session:'Goa — 17 Jul 2026', status:'Raw',
  description:'Group photo on the steps of the Goa venue — around eight women with Hiral, several holding IFM workbooks, greenery and a tiled roof behind.',
  slide_text:'',
  search_terms:'group photo goa workshop cohort batch together posed steps outdoors workbooks smiling team alumni',
  _evidence:'Hiral confirmed visually (blue dress, matches IFM-251/252 same day).',
  _PROBLEM:'POSED GROUP PHOTO. Nothing is "happening" (no applause, laughter or interaction), so by the agreed rule it is not a Classroom Moment — but it is plainly not establishing B-roll either. Tagged Classroom Moment provisionally. Affects ~12 rows incl. IFM-080, 081, 316, 337, 338, 363, 365.',
},

/* ---- 4. No evidence at all. The conservative rule in action ------------------- */
{
  id:'IFM-028', title:'Story S2 — Words people secretly Google',
  type:'Video', format:'', topic:[], person:[], source:'Aakara',
  session:'Aakara June delivery', status:'Raw',
  description:'Not yet analysable — only a .psd source file was delivered, no rendered story.',
  slide_text:'',
  search_terms:'finance jargon glossary terms people google story psd not delivered',
  _evidence:"Format, Topic and Person ALL left blank. The only text is the title and a note that nothing was delivered. Guessing 'Social Graphic' from the title would be inventing metadata. Status In Production -> Raw per the mapping.",
  _note:'Shows the intended failure mode: an asset can be catalogued and findable by title while carrying almost no tags.',
},

/* ---- 5. Hybrid AI + real, resolved by the agreed Source rule ------------------ */
{
  id:'IFM-051', title:'Vedanta demerger explainer — 1 pizza → 5 companies',
  type:'Video', format:'Social Graphic',
  topic:['Stocks / Equity','Markets & Economy'],
  person:['No Person'], source:'IFM / In-house', session:'', status:'Ready',
  description:"White-background infographic animation: a pizza labelled 'VEDANTA' slices into five pieces that become Vedanta Aluminium, Power, Oil & Gas, Steel & Ferrous and Vedanta Ltd. 9:16, 5 seconds.",
  slide_text:'VEDANTA. 1 company. Vedanta Aluminium. Vedanta Power. Vedanta Oil & Gas. Vedanta Steel & Ferrous. Vedanta Ltd. 5 companies.',
  search_terms:'vedanta demerger spin off five companies aluminium power oil gas steel ferrous corporate action shareholding explainer infographic animation pizza analogy stock split',
  _evidence:"Built in-house using generated/animated material -> Source = IFM / In-house, per the agreed rule that Source records the producer, not AI involvement. Format Social Graphic rather than B-roll: it is a finished explainer post, not supporting footage.",
},

/* ---- 6. Static social post — clean once Type stops meaning five things -------- */
{
  id:'IFM-203', title:'July: Money is a tool',
  type:'Image', format:'Social Graphic',
  topic:['Money Mindset','Wealth'],
  person:['No Person'], source:'Aakara', session:'Aakara July delivery', status:'Ready',
  description:"Gold trophy on a black plinth stuffed with a fan of ₹500 notes against an off-white wall, with blue type alongside.",
  slide_text:"MONEY IS NOT THE GOAL, IT'S A TOOL TO CREATE YOUR DREAM LIFE.",
  search_terms:'money mindset reframe purpose dream life goal trophy cash notes motivational quote philosophy attitude to money',
  _evidence:"Legacy type 'Static' -> Image. Topic came from the on-image copy, which is exactly what slide_text captures for graphics as well as projector slides.",
},

/* ---- 7. Product screenshot used as marketing — Format is a stretch ------------ */
{
  id:'IFM-295', title:'Kaun Banega Crorepati — live question screen',
  type:'Image', format:'Social / Promotional',
  topic:['Money Mindset','Investing'],
  person:['No Person'], source:'IFM / In-house', session:'', status:'Ready',
  description:"Host/projector view of the live quiz mid-round: the question on screen with A–D options, a live class-answers breakdown, the prize ladder down the right and a scan-to-join QR.",
  slide_text:"Waiting for the 'perfect time' usually means… Class answers 67% correct. Prize Ladder. Scan to join.",
  search_terms:'kbc kaun banega crorepati quiz game screenshot host view projector prize ladder qr scan to join classroom game product screen perfect time market timing',
  _evidence:"Topic Money Mindset comes from the question itself ('waiting for the perfect time'), read off the screen. Format Social / Promotional is the closest available and the agreed home for game content.",
},

/* ---- 8. Game teaser — the clean case for Social / Promotional ----------------- */
{
  id:'IFM-308', title:'Kaun Banega Crorepati — 12s game teaser',
  type:'Video', format:'Social / Promotional',
  topic:[], person:['No Person'], source:'IFM / In-house', session:'', status:'Ready',
  description:'12-second silent screen-recorded teaser cutting through the quiz flow — round intros, live questions, winner podium. Teal TV-studio theme, no audio.',
  slide_text:'Fastest correct doubles up.',
  search_terms:'kbc teaser gameplay promo silent screen recording quiz game workshop classroom game trailer no audio add music',
  _evidence:'',
},

/* ---- 9. Brand furniture — see _PROBLEM --------------------------------------- */
{
  id:'IFM-312', title:'IFM logo — horizontal lockup',
  type:'Image', format:'Social Graphic',
  topic:[], person:['No Person'], source:'IFM / In-house', session:'', status:'Ready',
  description:"Full horizontal IFM lockup: the circular tree-and-woman mark beside 'INVESTING FOR MUMMIES' with the ™ and the tagline. Transparent PNG, 1818×792.",
  slide_text:'INVESTING FOR MUMMIES. Nurturing financially confident women.',
  search_terms:'logo brand mark lockup horizontal wordmark trademark transparent png brand asset identity letterhead deck slide',
  _evidence:'',
  _PROBLEM:"BRAND ASSET, NOT CONTENT. A logo file is not a Social Graphic — it is design furniture someone needs when building a deck. Tagging it Social Graphic makes it pollute genuine social-content searches. Affects IFM-312, 313, 314.",
},

/* ---- 10. Not a content asset at all — see _PROBLEM ---------------------------- */
{
  id:'IFM-038', title:'Crorepati Lane — investing board game',
  type:'', format:'', topic:['Investing','Asset Allocation','Real Estate / REITs','Gold','Mutual Funds','Stocks / Equity','Fixed Income'],
  person:['No Person'], source:'IFM / In-house', session:'', status:'Ready',
  description:'IFM-styled Monopoly: pass-and-play for 2–4 players. Board of asset classes; buy assets, collect returns, SIP top-ups, market-event cards, Market Crash and Dividend Pool corners.',
  slide_text:'',
  search_terms:'crorepati lane board game monopoly pass and play multiplayer classroom game asset classes playable web game workshop activity',
  _evidence:'',
  _PROBLEM:"NOT Video, Image or Carousel. This is a playable web game at /crorepati-lane.html. TYPE left blank because forcing it into one of the three would be false. Affects IFM-038 and IFM-039 (2 rows).",
},
];
