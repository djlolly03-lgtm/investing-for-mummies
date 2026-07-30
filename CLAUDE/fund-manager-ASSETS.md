# Mutual Fund Manager LIVE — Asset Manifest

How to fill: open `fund-manager.html`, find `const MEDIA = { ... }` and paste a URL
(Vercel-hosted image/video, or a full https URL) against the matching `ASSET-NN` key.
Empty string = a labelled dashed placeholder shows in-game. Numbers run **chronologically
by screen order**, so each asset maps unambiguously to where it appears.

Live meters/gauges (AUM gauge, NAV ticker + sparkline, unit jars, portfolio card) are
**coded** and dynamic — they are NOT in this list and need no art.

| # | Screen | Where it shows | View | Aspect | Suggested content |
|---|--------|----------------|------|--------|-------------------|
| ASSET-01 | S1 Launch | Lobby hero banner behind the fund name | Host | 16:9 | Premium "launch the fund" hero — control-room / trading-desk vibe, dark, on-theme |
| ASSET-02 | S1 Launch | Equity fund-type crest | Both | 1:1 | Equity fund emblem (🔵 blue) — shares/growth motif |
| ASSET-03 | S1 Launch | Debt fund-type crest | Both | 1:1 | Debt fund emblem (🟢 green) — bonds/stability motif |
| ASSET-04 | S1 Launch | Hybrid fund-type crest | Both | 1:1 | Hybrid fund emblem (🟡 gold) — 60/40 blend motif |
| ASSET-05 | S2 Invest | Top of the student invest screen | Player | 4:3 | "Your money at work" — coins/seed-to-tree, warm, motivating |
| ASSET-06 | S4 Market | Equity Rally event card | Host | 16:9 | 📈 bullish rally scene (+10%) |
| ASSET-07 | S4 Market | Market Crash event card | Host | 16:9 | 📉 market crash scene (−15%) |
| ASSET-08 | S4 Market | IT Stocks Boom event card | Host | 16:9 | 💥 tech/IT boom scene (+25%) |
| ASSET-09 | S4 Market | Bonds Rise event card | Host | 16:9 | 🏦 bonds rising scene (+4%) |
| ASSET-10 | S5 NAV | NAV Discovery side panel backdrop | Host | 16:9 | Calm "price of one unit" explainer backdrop |
| ASSET-11 | S7 Fees | Feezilla side panel | Host | 1:1 | 👹 **Feezilla** the expense-ratio monster — characterful, animated-friendly, chomping returns |
| ASSET-12 | S9 STP | "Liquid → Equity" side panel | Host | 16:9 | Water flowing from a safe (blue) tank into a growth (green) tank |
| ASSET-13 | S10 SWP | "Draining & refilling" side panel | Host | 16:9 | Retirement corpus tank — income draining out, growth refilling |

## Reserved for future (continue the numbering)
- Optional per-asset company logos (Reliance/HDFC/Infosys/TCS/bonds) — the asset chips already
  render as styled text; logos would be an upgrade, add as `ASSET-NN` slots if wanted.

## Notes
- Video works too: if a URL ends in a video the `slot()` helper currently renders `<img>`;
  for video swap to a `<video>` tag in `slot()` (one-line change) when you add motion assets.
- Keep host assets dark/premium to match the "Fund Control Room" theme; player assets can be
  a touch warmer/brighter.
