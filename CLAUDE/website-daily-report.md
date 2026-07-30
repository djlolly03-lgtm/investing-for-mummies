## IFM Website Daily Check — 30 July 2026

### ✅ Fixed Since Last Check
- Nothing newly fixed today.

### 🔄 Improved (not fully fixed)
- No partial improvements detected.

### ❌ Still Pending
- **BUG-05** — WhatsApp button and TrustSite badge overlapping *(re-confirmed live in today's 1440×900 headless render — the green "Chat with us" pill sits on top of the TrustedSite badge, clipping its logo mid-word to "…dSite®")*
- **SEO-05** — Missing alt text on images *(35 `<img>` tags on the homepage, 33 with empty `alt=""`; only the logo and a 💬 emoji carry text)*
- **SEO-06** — /resources page live but says "Coming Soon" *(still just the shell — 145 KB file, real title tag, no content)*
- **UX-03** — "5+ More Batches" claim with no details *(`/api/batches` still returns `"live": []` and the `#ifmHomeBatchGrid` container still doesn't exist in the page, so zero batch cards render)*
- **UX-05** — No email/waitlist capture for full batches *(zero occurrences of "waitlist" on /registernow)*
- **UX-06** — Testimonial section hidden behind carousel *(still `testimonial-carousel` / `testimonial-track` markup, not a grid)*
- **UX-07** — Seat availability / urgency missing from batch cards *(zero matches for "seats" on /registernow)*
- **NICE-01** — Schema markup (rich snippets) — IN PROGRESS *(no LocalBusiness, Course or Event JSON-LD)*
- **NICE-03** — Payment/EMI option mentioned on site *(no instalment / EMI / payment-plan wording anywhere)*

### 📊 Progress Summary
- Fixed: 13 of 18 items
- Remaining: 5 items (4 pending core + NICE-01 in progress); NICE-03 also pending

---

### 🚨 Still live: the 28 July re-platforming regression (day 3)

`www.investingformummies.com` is still being served as a **static export from Vercel**, not WordPress
(`server: Vercel`, `content-disposition: inline; filename="home.html"`). `last-modified` is
**Thu, 30 Jul 2026 04:53:38 GMT** — the file was touched again today, but the content is unchanged.
The deployed snapshot still predates the 2 July rebuild, so **8 items marked FIXED on paper are broken
on the live site right now**:

| Item | Live state today |
|---|---|
| BUG-01 | Footer legal bar renders **twice** (2× "Privacy Policy", 2× "Share Your Feedback") |
| BUG-02 | 7 `<video>` tags, **0** with `poster=`, **0** `#t=0.5` fragments → black boxes |
| BUG-03 | Cover asset `Gemini_Generated_Image_ee4fu7ee4fu7ee4f-1024x572.png` still **404** |
| BUG-04 | Literal "o" bullets back ("o How money grows over time", "mutual o funds"); **0** `list-style` rules |
| SEO-01 | **Zero** `<meta name="description">` tags |
| SEO-04 | `<title>` back to "Home - Investing For Mummies" |
| UX-01 | Footer heading back to "Products"; **0** occurrences of "Quick Links" |
| UX-02 | No email, no `tel:` link in footer ("Nariman Point" only inside a hidden modal) |

Plus **SEO-03 degraded**: `og:url` is literally `/` and `og:image` is the relative path
`website-assets/images/WhatsApp-Image-2026-03-10-at-17.00.43.jpeg` — neither resolves for an external
scraper, so WhatsApp/LinkedIn shares will show no image. `og:title`/`og:description` are back to the
old auto-generated text.

All 8 left as FIXED per the do-not-revert-manual-statuses policy, but each carries a ⚠️ REGRESSION note
in the checklist.

**This is still the single highest-value fix:** redeploying the 2 July homepage build to Vercel would
restore 8 items at once. Three days of "no change" now come from the deployment, not from the fixes
themselves.

---

### Notes on today's open items

- **BUG-05 — overlap re-confirmed live.** Headless Chrome render at 1440×900: the green WhatsApp
  "Chat with us" pill sits on top of the TrustedSite badge in the bottom-right corner, clipping the
  badge's logo mid-word to "…dSite®" with only the "CERTIFIED SECURE" strip fully visible below.
  Unchanged from the 26–29 Jul renders. Both widgets are still runtime-injected with no repositioning CSS.
- **SEO-05** — 35 `<img>` tags on the homepage, **33** with empty `alt=""`. Only
  `alt="Investing for Mummies"` (logo) and `alt="💬"` carry any text.
- **SEO-06** — /resources returns 200 and is a 145 KB file with a cosmetic outer
  `<title>Resources — Investing for Mummies</title>`, but the visible body is still just
  "Coming Soon" / "Something exciting is on its way. Check back soon!" plus the old "Products" footer.
  Shell change only — no content, no redirect. (Yesterday's "improved" note now folded in; nothing
  further changed today.)
- **UX-03** — `/api/batches` still returns `"live": []` (only an `upcoming` entry: "July 2026 Batches —
  Dates & timings to be announced"), and `ifmHomeBatchGrid` still appears exactly once in the page,
  inside `renderBatchCards()`'s `getElementById`, with no matching container element. Zero batch cards
  render above "5+ More Batches that We Are Offering".
- **UX-05** — Zero occurrences of "waitlist" on /registernow. Buttons are "Reserve B1 →",
  "Reserve B2 →" and 3× plain "Reserve →".
- **UX-06** — Testimonials still carousel markup: 9× `testimonial-track`, 5× `carousel-dots`,
  3× `carousel-nav`, 2× `testimonial-carousel` (11 `carousel` references total). Not a grid.
- **UX-07** — Zero matches for "seats" on /registernow. Only the global FAQ line "Each batch is capped
  at **10–12 participants**". Prices: ₹21,000 / ₹12,000 / ₹9,500 / ₹8,000.
- **NICE-01** — JSON-LD `@type` set is WebPage, ImageObject ×2, BreadcrumbList, ListItem, WebSite,
  Organization, SearchAction, EntryPoint, ReadAction, PropertyValueSpecification. Still no
  LocalBusiness, Course or Event — the three types that actually drive rich results here.
- **NICE-03** — Word-boundary search for instalment / installment / EMI / "payment plan" / "pay in N"
  returns nothing on either the homepage or /registernow. (Raw "emi" hits are substrings like
  "premium" and "semi".)

### Sanity checks that remain good
- `/sitemap.xml` returns valid XML with 10 URLs (SEO-02 holding).
- The Games nav link still carries `target="_blank" rel="noopener noreferrer"` — and now points at the
  branded `https://games.investingformummies.com/` rather than the raw Vercel URL (NICE-04, NICE-05).
