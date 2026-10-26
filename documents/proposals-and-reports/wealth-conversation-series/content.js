// All deck copy, verbatim from Hiral Goel's email of 23 Oct 2026 ("The Wealth Conversation").
// Only changes: straight apostrophes made typographic (’), all-caps item titles in Module 01
// set in sentence case, and trailing full stops dropped from item subtitles (they are headings).
// Short navigation labels (eyebrows, "MODULE", "SUGGESTED DURATION") are deck furniture, not copy.
//
// Module ORDER follows the numbered module pages: 01 Blueprint, 02 Insurance, 03 Asset Classes,
// 04 Stock Market, 05 Mutual Fund Map (confirmed by the user 26 Oct 2026: Insurance is 02).
// The email's "Workshop Series" paragraph lists them in a different order; the deck does not follow it.
// Game names are deliberately absent: Hiral wants them unnamed in case they change.

module.exports = {
  cover: {
    eyebrow: 'A FIVE-PART WORKSHOP SERIES',
    tagline: 'From knowing you have money to understanding what it can do.',
  },

  why: {
    eyebrow: 'WHY THIS SERIES',
    title: 'Why The Wealth Conversation?',
    lead: 'Money decisions can feel complicated because they sit at the intersection of goals, markets, products, risk, protection and an overwhelming amount of financial jargon.',
    turn: 'The Wealth Conversation is designed to change that.',
    body: 'It is a series of practical, interactive workshops that takes you through the key building blocks of personal wealth — from understanding how to think about your money, to knowing where it can be invested, to learning how to evaluate the products and decisions that shape your portfolio.',
    aim: 'The aim is not to turn you into a financial expert. It is to give you the knowledge, frameworks and confidence to understand your financial world — and participate in it.',
    // the six things money decisions "sit at the intersection of", in the email's order
    forces: ['Goals', 'Markets', 'Products', 'Risk', 'Protection', 'Jargon'],
    centre: 'Money decisions',
  },

  // DRAFT 26 Oct 2026 — from the user's note, lightly tidied ("actually" dropped, list
  // items capitalised). Card labels, eyebrow and title are new. Approved and added 26 Oct 2026.
  audience: {
    include: true,  // approved by the user 26 Oct 2026
    eyebrow: 'WHO IT’S FOR',
    title: 'Built for beginners. Deep enough for everyone.',
    who: [
      { icon: 'i-grow', label: 'Complete beginners',
        text: 'It’s meant for beginners. We start at the absolute beginning level.' },
      { icon: 'ui-layers', label: 'Those with prior knowledge',  // Hiral 26 Oct: not 'a little'
        text: 'It is also very relevant for anybody who has knowledge about these things but has never learned it in a progressive, structured manner.' },
    ],
    deepLead: 'These workshops not only explain what the concepts are, but go deep into:',
    deep: [
      { icon: 'i-trend-up', text: 'What is happening in the economy' },
      { icon: 'i-book', text: 'How to use these terms and concepts based on what is happening in the economy' },
      { icon: 'v-allocation', text: 'How you can apply these concepts in your portfolio' },
      { icon: 'i-compass', text: 'How to use these concepts to think about investing in general in a structured or strategic manner' },
    ],
    visual: { icon: 'le-spark', runs: [
      ['We show a lot of this '], ['visually, on a graph or through analogies,', true], [' so the understanding is much deeper.'],
    ] },
  },

  questions: {
    eyebrow: 'ACROSS THE SERIES',
    title: 'The Questions That Matter',
    intro: 'Across the series, you will learn to look beyond product names and returns and ask the bigger questions:',
    items: [
      { text: 'What is this money for?', icon: 'q-target' },
      { text: 'Where should it be?', icon: 'q-signpost' },
      { text: 'What role does each investment play?', icon: 'q-puzzle' },
      { text: 'What risks am I taking?', icon: 'q-gauge' },
      { text: 'How do I know whether a financial decision makes sense for me?', icon: 'q-scale' },
    ],
  },

  learning: {
    eyebrow: 'HOW WE TEACH',
    title: 'The Learning Experience',
    chipsLabel: 'IN EVERY WORKSHOP',
    // the four activity types named in the first paragraph, with pill widths in inches
    chips: [['Games', 0.95], ['Simulations', 1.3], ['Real-life scenarios', 1.76], ['Discussions', 1.3]],
    blocks: [
      { icon: 'le-games', runs: [
        ['Every workshop combines practical learning with '],
        ['interactive games, simulations, real-life scenarios and discussions', true],
        [' that bring financial concepts to life. These activities help participants apply what they learn, challenge assumptions and reinforce key concepts in a memorable way.'],
      ] },
      { icon: 'le-handout', runs: [
        ['Participants also receive '],
        ['take-home handouts and reference guides', true],
        [' to revisit important concepts, record their insights and continue applying their learning beyond the workshop.'],
      ] },
    ],
    focus: { icon: 'le-spark', runs: [
      ['The focus is on making finance '],
      ['engaging, accessible and relevant', true],
      [' to real-life decisions.'],
    ] },
  },

  // Added 25 Oct 2026 at the user's request: real corporate / forum sessions, with the words the
  // "Wealth Conversations" section of investingformummies.com (#corporate) already uses, verbatim.
  // Not part of Hiral's 23 Oct email — delete the slide if she prefers the deck without it.
  corporate: {
    eyebrow: 'WEALTH CONVERSATIONS',
    title: ['Workshops for corporates, communities', 'and entrepreneurs’ forums.'],
    intro: 'Past sessions for organisations, professional networks and curated groups, each adapted to the audience’s context and experience level. Same warmth, same games, tailored to your room.',
    sessions: [
      { img: 'past-stree-dhan.png', name: 'Stree Dhan', kind: 'Financial awareness workshop' },          // IFM-338
      { img: 'past-k-phyto.png', name: 'K-Phyto Extraction', kind: 'Mutual funds and investing workshop' }, // IFM-316
      { img: 'past-goa.png', name: 'Money Blueprint, Goa', kind: 'Introduction to investing' },          // IFM-253
      { img: 'past-eo-forum.png', name: 'EO Forum', kind: 'Closed-room financial learning' },            // website only
    ],
    alsoHosted: [['Also hosted by '], ['Ascent Group', true], [', '], ['Pixel Mint Media', true], [' and several closed forums.']],
  },

  series: {
    eyebrow: 'AT A GLANCE',
    title: 'The Workshop Series',
    // Hiral, 26 Oct 2026: make clear clients need not take the whole series.
    choice: 'Opt for the full series, or for any module or modules that are relevant to your group.',
    intro: 'Each workshop builds on the previous one, taking you from the fundamentals of financial decision-making to a deeper understanding of the investments and protection products that shape your wealth.',
  },

  value: {
    eyebrow: 'WHY THE FULL SERIES',
    title: 'The Value of the Full Series',
    lead: [
      'By the end of The Wealth Conversation, you won’t simply know more financial terminology. You will have ',
      'a mental map of your financial world.',
    ],
    connect: 'You will be able to connect goals → risk → asset allocation → investment choices → portfolio, and understand how the pieces fit together.',
    flow: [
      { label: 'Goals', icon: 'v-goals' },
      { label: 'Risk', icon: 'q-gauge' },
      { label: 'Asset allocation', icon: 'v-allocation' },
      { label: 'Investment choices', icon: 'v-choices' },
      { label: 'Portfolio', icon: 'v-portfolio' },
    ],
    // "You will know what you own, what role it plays, what you need to investigate further
    //  and, most importantly, what questions to ask before making financial decisions."
    knowLabel: 'YOU WILL KNOW',
    know: [
      { text: 'What you own', icon: 'v-portfolio' },
      { text: 'What role it plays', icon: 'q-puzzle' },
      { text: 'What you need to investigate further', icon: 'i-magnify-chart' },
      { text: 'Most importantly, what questions to ask before making financial decisions', icon: 'le-chat' },
    ],
  },

  mission: {
    eyebrow: 'WHY WE DO THIS',
    title: 'Our Mission',
    statement: [['To make wealth conversations '], ['less intimidating', true], [' and '], ['more informed.', true]],
    enough: 'You don’t need to manage every investment yourself. But you should understand enough to question, evaluate, participate and make informed choices about your money.',
    verbs: [['Question', 1.3], ['Evaluate', 1.25], ['Participate', 1.45], ['Make informed choices', 2.4]],
    journey: 'The Wealth Conversation is about moving from financial uncertainty to financial clarity — and from being a spectator in your wealth journey to becoming an active participant.',
    fromTo: [['Financial uncertainty', 'Financial clarity'], ['Spectator', 'Active participant']],
  },

  closing: {
    quote: 'An investment in knowledge pays the best interest.',
    author: '— Benjamin Franklin',
    name: 'Hiral Goel',
    role: 'Founder | Investing for Mummies',
    // Contact line as used on the 31 July 2026 Wealth Conversation proposal.
    contact: 'hiral@investingformummies.com   ·   +91 98670 26583   ·   investingformummies.com',
  },

  modules: [
    {
      num: '01', panelAlt: 'Hiral teaching the power of compounding at a corporate workshop', hours: 3, icon: 'm1-blueprint',
      title: 'The Money Blueprint',
      subtitle: 'Build the foundation for smarter money decisions.',
      seriesLine: 'Money Blueprint gives you the foundation — goals, time, risk and a framework for thinking about your money.',
      intro: [
        'Having money and knowing how to make it work are two very different things.',
        'Money Blueprint is a practical, interactive workshop that helps you build the foundations of financial understanding. Through relatable analogies, games and hands-on exercises, we explore four essential questions that can change the way you think about money, investments and your financial future.',
      ],
      coverHeading: 'What we’ll explore',
      items: [
        { icon: 'i-grow', title: 'Why should my money work?',
          desc: 'Understand why simply saving money may not be enough. Explore inflation, compounding and the power of time to see how money can lose purchasing power — and how it can grow over time.' },
        { icon: 'i-compass', title: 'How should I think about my money?',
          desc: 'Learn how to set clear financial goals and use a simple framework based on goals, time horizon and risk to think through investment decisions.' },
        { icon: 'i-buckets', title: 'How do I make sense of my money?',
          desc: 'Discover the Protect, Stabilise & Grow framework to understand the different jobs your money needs to do, how investments fit into the bigger picture and how to look at your portfolio more strategically.' },
        { icon: 'le-chat', title: 'How do I join the conversation?',
          desc: 'Build the confidence to ask questions, understand financial terminology and participate meaningfully in decisions that affect your wealth.' },
      ],
      walkHeading: 'What you’ll walk away with',
      takeaways: [
        'Set clear, measurable financial goals',
        'Use a framework to evaluate investing decisions',
        'Organise money into Protect, Stabilise &\u00A0Grow',
        'Understand what your portfolio is doing',
        'Ask the right questions before investing',
      ],
    },
    {
      num: '02', panelAlt: 'Hiral teaching “Types of Insurance” to a corporate group', hours: 3, icon: 'm2-shield',
      title: 'Insurance Decoded',
      subtitle: 'Protect your wealth before you build it.',
      seriesLine: 'Insurance Decoded helps you understand how to protect your wealth and the people who depend on you.',
      intro: [
        'Building wealth isn’t just about growing your money; it’s also about protecting it from unexpected events. Insurance plays a crucial role in safeguarding your finances, your family and the wealth you build over time.',
        'This workshop cuts through the jargon to help you understand what insurance is designed to do, which types of cover matter and how to assess whether you have the right protection in place. From understanding life insurance to navigating health insurance policies, you’ll learn to distinguish genuine protection from products that combine insurance with investment.',
      ],
      coverHeading: 'What we’ll cover',
      items: [
        { icon: 'i-umbrella', title: 'Understanding Insurance', sub: 'Protection or Investment?',
          desc: 'Understand the purpose of insurance, the different types of cover and why protection should be distinguished from investing.' },
        { icon: 'i-home-heart', title: 'Term Insurance', sub: 'Protecting Your Family’s Future',
          desc: 'Discover who needs term insurance, how to estimate the right cover and policy term, and which features matter when choosing a policy. Compare term insurance with ULIPs and endowment plans.' },
        { icon: 'i-heart-pulse', title: 'Health Insurance', sub: 'Preparing for the Unexpected',
          desc: 'Understand who needs health insurance, how much cover may be appropriate, what to look for in a policy and which exclusions and pitfalls to watch out for.' },
        { icon: 'i-topup', title: 'Top-Ups & Super Top-Ups', sub: 'Extending Your Protection',
          desc: 'Learn how these plans work, how they differ and how they can help increase health insurance coverage cost-effectively.' },
      ],
      walkHeading: 'What you’ll walk away with',
      takeaways: [
        'Know what insurance is meant to protect',
        'Distinguish protection from investment',
        'Understand how to estimate the right life cover',
        'Know what to look for in health insurance',
        'Make more informed decisions about your insurance coverage',
      ],
    },
    {
      num: '03', panelAlt: 'Hiral drawing the bond-market diagram on the whiteboard', hours: 4, icon: 'm3-blocks',
      title: 'Asset Classes: The\u00A0Building Blocks',
      subtitle: 'Understand the landscape of investing and the role each asset can play.',
      seriesLine: 'Asset Classes: The Building Blocks helps you understand the different places your money can go and the role each can play in a portfolio.',
      intro: [
        'Before choosing an investment product, it helps to understand what sits underneath it.',
        'This workshop gives you the big picture of investing — the major asset classes, their characteristics, strengths and limitations, and the role each can play in a financial plan. Once you understand these building blocks, financial products become easier to understand because you can see what they are ultimately investing in and why they exist.',
      ],
      coverHeading: 'What we’ll cover',
      items: [
        { icon: 'i-wallet', title: 'Cash', sub: 'Your liquidity layer',
          desc: 'Understand what counts as cash, where to keep it and how much you may need for short-term needs and financial security.' },
        { icon: 'i-bond', title: 'Debt / Fixed Income', sub: 'Stability & income',
          desc: 'Understand bonds, debentures and other fixed-income investments, how yields work and how interest rates influence markets.' },
        { icon: 'i-gold', title: 'Gold', sub: 'The diversifier',
          desc: 'Explore why gold has held value, the different ways to invest in it, what drives its price and why it can play a role in a portfolio.' },
        { icon: 'i-building', title: 'Real Estate', sub: 'Beyond property ownership',
          desc: 'Understand REITs, how they work, how to invest in them, their potential returns and taxation.' },
        { icon: 'i-trend-up', title: 'Equity', sub: 'The growth engine',
          desc: 'Understand what owning equity means, why it can create long-term wealth and where it fits within a portfolio.' },
        { icon: 'v-allocation', title: 'Putting the pieces together', sub: 'Asset allocation',
          desc: 'See how different assets can be combined based on your goals, time horizon and risk appetite, with model portfolios to bring the concepts to life.' },
      ],
      walkHeading: 'What you’ll walk away with',
      takeaways: [
        'See the whole investing landscape',
        'Understand the role of each asset',
        'Look beyond the product to the underlying asset',
        'Connect economic forces to your portfolio',
        'Think strategically about your own asset allocation',
      ],
    },
    {
      num: '04', panelAlt: 'Hiral teaching “How to Buy/Sell a Share?” at a corporate workshop', hours: 4, icon: 'm4-candles',
      title: 'The Stock Market Demystified',
      subtitle: 'Understand how the stock market works, from IPOs and exchanges to buying, selling and corporate actions.',
      seriesLine: 'The Stock Market Demystified takes you behind the scenes of the stock market — from IPOs and exchanges to buying, selling and corporate actions.',
      intro: [
        'The stock market can seem like a complex world of numbers, jargon and constant price movements. But behind every trade is a system of companies, investors, exchanges and institutions working together.',
        'This workshop takes you behind the scenes of the stock market — from how companies enter the market and how shares are traded, to what drives stock prices and why companies take actions that affect their shareholders.',
        'The aim is to help you understand the mechanics, institutions and events that shape the stock market, so you can follow market developments, make sense of what happens to the shares you own and understand what it means for you as an investor.',
      ],
      coverHeading: 'What we’ll cover',
      items: [
        { icon: 'i-network', title: 'The Stock Market Ecosystem', sub: 'Who Does What?',
          desc: 'Understand the roles of stock exchanges, brokers, clearing corporations, depositories, Depository Participants (DPs) and Registrar and Transfer Agents (RTAs), and how they work together to make the market function.' },
        { icon: 'i-bell', title: 'The IPO Journey', sub: 'From Private Company to Public Listing',
          desc: 'Follow the complete journey of an IPO, from a company deciding to go public and setting a price band to investor bidding, allotment, listing and the beginning of trading on the stock exchange.' },
        { icon: 'i-price-tag', title: 'Stock Prices', sub: 'What Moves the Numbers?',
          desc: 'Understand what a stock price represents, how prices are discovered through buying and selling, and how company performance, investor expectations, demand and supply, interest rates and broader economic events influence prices.' },
        { icon: 'i-swap', title: 'Buying & Selling Shares', sub: 'How a Trade Works',
          desc: 'Follow the journey of a trade, from placing an order through a broker to execution, clearing, settlement and the shares or money reaching the relevant accounts. Understand market orders and limit orders.' },
        { icon: 'i-megaphone', title: 'Corporate Actions', sub: 'When Companies Make a Move',
          desc: 'Explore dividends, rights issues, stock splits, bonus shares, share buybacks and delisting — why companies undertake them, how they work and what they mean for existing shareholders.' },
      ],
      walkHeading: 'What you’ll walk away with',
      takeaways: [
        'Understand how the stock market works behind the scenes',
        'Know who the key market participants are and what they do',
        'Follow the journey of an IPO, from issue to listing',
        'Understand how stock prices are discovered and what influences them',
        'Decode corporate actions and understand their implications for investors',
      ],
    },
    {
      num: '05', panelAlt: 'Hiral teaching NAV to a workshop group', hours: 4, icon: 'm5-map',
      title: 'The Mutual Fund Map',
      subtitle: 'Navigate the vast world of mutual funds and learn what really matters when choosing one.',
      seriesLine: 'The Mutual Fund Map teaches you how to navigate the vast world of mutual funds and understand what really matters when choosing one.',
      intro: [
        'With thousands of mutual funds to choose from, how do you know where to begin — and how do you tell one fund from another?',
        'This workshop helps you navigate the mutual fund universe with clarity and confidence. Understand how mutual funds work, decode the terminology and learn how to compare funds using meaningful performance and risk metrics.',
        'The aim is to move beyond chasing returns or picking popular funds, and give you a framework to assess which funds may be suitable for your goals and risk appetite.',
      ],
      coverHeading: 'What we’ll cover',
      items: [
        { icon: 'i-basket', title: 'Understanding Mutual Funds', sub: 'The Big Picture',
          desc: 'Discover how mutual funds work, explore the different categories and understand how they serve different financial goals.' },
        { icon: 'i-book', title: 'The Mutual Fund Language', sub: 'Making Sense of the Jargon',
          desc: 'Decode essential terms such as NAV, expense ratio, AUM, SIP, STP, SWP, exit load and benchmark.' },
        { icon: 'i-funnel', title: 'Choosing a Mutual Fund', sub: 'What Should You Look For?',
          desc: 'Learn how to shortlist funds based on your goals, time horizon, risk appetite and investment needs.' },
        { icon: 'i-magnify-chart', title: 'Evaluating Performance', sub: 'Beyond Returns',
          desc: 'Understand absolute and annualised returns, rolling returns, alpha, capture ratios and volatility — and what these metrics reveal about a fund’s performance and risk.' },
      ],
      walkHeading: 'What you’ll walk away with',
      takeaways: [
        'Navigate the mutual fund universe with confidence',
        'Decode the language of mutual funds',
        'Know what to look for when choosing a fund',
        'Compare funds using meaningful metrics',
        'Look beyond returns to understand risk and performance',
      ],
    },
  ],
};
