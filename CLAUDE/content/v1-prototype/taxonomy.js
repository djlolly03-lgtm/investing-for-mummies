/* IFM Content Hub — V1 controlled taxonomy.
 *
 * THE POINT OF THIS FILE: it is the ONLY place taxonomy values are defined. Filter
 * dropdowns build from it, the tagger validates against it, and anything not in here
 * cannot be rendered as a tag. That is what stops the vocabulary drifting back into the
 * 13-value free-for-all `type` field the v1 schema replaces.
 *
 * Agreed with the user 16 Sep 2026. Do not add values without asking.
 */
window.IFM_TAXONOMY = {

  // What the file IS. Deliberately three values — distribution format (Reel/Story) is an
  // attribute, not a type, and belongs in V2 if it is ever needed at all.
  type: ['Video', 'Image', 'Carousel'],

  // What the content SHOWS. "Hiral Speaking" covers teaching and explaining alike.
  // "B-roll" is supporting footage, real or AI-generated.
  // "Social / Promotional" was added for the 43 game/product promo assets (Money Map,
  // Stock Rush, Swayamvar...) which fit none of the original eight.
  format: ['Hiral Speaking', 'Testimonial', 'Classroom Moment', 'Student Question',
           'B-roll', 'Portrait', 'Certificate', 'Social Graphic', 'Social / Promotional'],

  // Grouped only for the filter UI. An asset may carry several.
  // NOTE: specific terms (SIP, XIRR, NAV, CAGR, RBI, repo rate) deliberately do NOT get
  // their own topic — they are found through transcript and search terms instead.
  topic: {
    'Money': ['Managing Money', 'Saving', 'Saving vs Investing', 'Financial Planning',
              'Wealth', 'Money Mindset', 'Money Conversations', 'Financial Independence',
              'Women & Money', 'Family & Money'],
    'Investing': ['Investing', '3-Bucket Investing', 'Compounding', 'Asset Allocation',
                  'Diversification', 'Risk & Returns'],
    'Insurance': ['Insurance'],
    'Asset classes': ['Stocks / Equity', 'Mutual Funds', 'ETFs', 'Fixed Income',
                      'Real Estate / REITs', 'Gold', 'Silver', 'PMS / AIFs'],
    'Markets': ['Stock Market', 'IPOs', 'Markets & Economy', 'Inflation & Interest Rates'],
  },

  // Who is in frame. Sakshi / Aakara / Aditya are NOT people — they are Source.
  person: ['Hiral', 'Student', 'Other Person', 'No Person'],

  // Where the asset came FROM. 'Unknown' was added because 199 existing rows are marked
  // "Event", which says where it was shot, not who produced it. Per the user: Unknown is
  // preferable to incorrect, and the source must NOT be inferred from the event.
  source: ['Sakshi', 'Aakara', 'IFM / In-house', 'External', 'AI Generated', 'Unknown'],

  // V1 status is about usability, not workflow. In Production / On Hold both fold to Raw.
  status: ['Raw', 'Ready', 'Published', 'Do Not Use'],
};

// Flat topic list, for validation and for the "any topic" filter.
window.IFM_TOPICS_FLAT = Object.values(window.IFM_TAXONOMY.topic).flat();

// Legacy → V1 migration map, used by the backfill. TYPE maps 100% mechanically.
window.IFM_LEGACY_MAP = {
  type: {
    'Session Photo': 'Image', 'Photo': 'Image', 'Game Screen': 'Image',
    'Brand Asset': 'Image', 'Static': 'Image',
    'Session Video': 'Video', 'Reel': 'Video', 'AI Video': 'Video', 'Story': 'Video',
    'Game Teaser': 'Video', 'Motion Graphic': 'Video', 'Game': 'Video',
    'Carousel': 'Carousel',
  },
  status: {
    'Raw': 'Raw', 'In Production': 'Raw', 'On Hold': 'Raw',
    'Ready': 'Ready', 'Published': 'Published', 'Do Not Use': 'Do Not Use',
  },
  // 'Event' is intentionally absent — it maps to Unknown unless real evidence says otherwise.
  source: { 'Aakara': 'Aakara', 'In-house': 'IFM / In-house' },
  // `shot` was the closest thing to FORMAT. Present on only 55/384 rows.
  shot: {
    'Hiral — portrait': 'Portrait', 'Hiral — teaching': 'Hiral Speaking',
    'Certificate moment': 'Certificate', 'Testimonial — video': 'Testimonial',
    'Testimonial — text': 'Testimonial', 'Students': 'Classroom Moment',
    'Group with Hiral': 'Classroom Moment', 'Room/venue wide': 'B-roll',
    'Detail': 'B-roll', 'No people': null,
  },
};
