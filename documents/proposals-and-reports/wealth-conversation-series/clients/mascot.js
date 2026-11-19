// Client edition: Mascot Spincontrol (19 Nov 2026).
// Scope chosen by the user: pilot + roll-out, all ~150 staff, deck PDF + editable PPT.
// Fees from the standard fee card (module-detail/commercial-terms-phone.html, 4 Nov 2026):
// ₹75,000 + GST per module per session, up to 4 hours, up to 40 participants.
//
//   WC_CLIENT=mascot NODE_PATH="../../../deck-build/node_modules" node build.js
module.exports = {
  name: 'Mascot Spincontrol',
  out: 'IFM Wealth Conversation — Proposal for Mascot Spincontrol.pptx',
  coverLine: 'Mascot Spincontrol  ·  November 2026',
  logo: 'client-mascot-logo.png', logoAspect: 846 / 775,

  intro: {
    eyebrow: 'PREPARED FOR MASCOT SPINCONTROL',
    title: 'A money workshop for a growing team',
    lead: 'Mascot’s team has grown to around 150 people this year, many of them early in their careers. That is exactly when money habits are formed, and most people have no one to ask.',
    cards: [
      { icon: 'ui-users', title: 'For everyone on the team',
        text: 'Lab, clinical, tech and sales alike. No finance background needed: every concept is built from the ground up.' },
      { icon: 'le-games', title: 'Hands-on, not a lecture',
        text: 'Live games on every participant’s phone, real-life scenarios, discussion and take-home handouts.' },
      { icon: 'ui-check', title: 'Education only',
        text: 'No products sold and no advice given. Just the knowledge and frameworks to make better money decisions.' },
    ],
    band: [['Recommended start: '], ['one pilot session of The Money Blueprint for 40 people', true], [', then the rest of the team.']],
  },

  plan: {
    eyebrow: 'THE PLAN FOR MASCOT',
    title: 'Start small, then roll out',
    phases: [
      { tag: 'PHASE 1  ·  PILOT', icon: 'm1-blueprint', title: 'The Money Blueprint',
        facts: ['1 session', 'Best with ~40 people', '3 hours'],
        text: 'Goals, inflation and compounding, and the Protect, Stabilise & Grow framework. See how your team responds before committing further.' },
      { tag: 'PHASE 2  ·  ROLL-OUT', icon: 'ui-users', title: 'The Money Blueprint for everyone',
        facts: ['3 more sessions', '~40 people each', 'All ~150 covered'],
        text: 'Every employee gets the same foundation, in groups small enough for the games to work.' },
      { tag: 'PHASE 3  ·  OPTIONAL', icon: 'm2-shield', title: 'Go deeper',
        facts: ['Insurance Decoded next', 'Any module after that'],
        text: 'Protect before you build: what insurance is for, how much cover is enough and what to watch out for. Further modules for those who want more.' },
    ],
  },

  investment: {
    eyebrow: 'INVESTMENT',
    title: 'Fees',
    rows: [
      ['Phase 1  ·  Pilot', 'The Money Blueprint, 1 session', '₹75,000'],
      ['Phase 2  ·  Roll-out', 'The Money Blueprint, 3 sessions', '₹2,25,000'],
      ['All ~150 staff', 'The Money Blueprint, 4 sessions', '₹3,00,000', 'total'],
      ['Phase 3  ·  Optional', 'Any further module, per session', '₹75,000'],
    ],
    note: 'All fees + GST at 18%. Sessions work best for groups of about 40.',
    knowTitle: 'Good to know',
    know: [
      'Each session is paid 7 working days ahead',
      'Free to reschedule with 14 days’ notice',
      'Mascot arranges the room, projector, screen, Wi-Fi for all and a mic',
      'Hiral and one IFM team member run every session',
      'Full commercial terms are attached',
    ],
    next: [['Next step: '], ['pick a date for the pilot and share your first group', true], ['. We’ll send the invoice to confirm.']],
  },
};
