## IFM Website Daily Check — 30 August 2026

### ✅ Fixed Since Last Check
- Nothing newly fixed today.

### 🔄 Improved (not fully fixed)
- No partial improvements detected.

### ❌ Still Pending
- **BUG-01** — Duplicated footer legal bar *(regressed — marked FIXED, broken live for 20 days)*
- **BUG-02** — Workshop video thumbnails blank/black *(regressed — same rollback)*
- **BUG-04** — Bullet points rendered as letter "o" *(regressed — same rollback)*
- **BUG-05** — WhatsApp button and TrustSite badge overlapping
- **SEO-01** — No meta description on homepage *(regressed — same rollback)*
- **SEO-04** — Homepage title tag is generic *(regressed — same rollback)*
- **SEO-05** — Missing alt text on images
- **SEO-06** — /resources page live but says "Coming Soon"
- **UX-01** — Footer "PRODUCTS" heading is wrong *(regressed — same rollback)*
- **UX-02** — No contact details in footer *(regressed — same rollback)*
- **UX-03** — "5+ More Batches" claim with no details
- **UX-05** — No email/waitlist capture for full batches
- **UX-06** — Testimonial section hidden behind carousel
- **UX-07** — Seat availability / urgency missing from batch cards
- **NICE-01** — Schema markup (rich snippets) — *in progress*
- **NICE-03** — Payment/EMI option mentioned on site

### 📊 Progress Summary
- Fixed: 12 of 18 items
- Remaining: 6 items *(plus 7 of the 12 "fixed" items are regressed and broken live)*
- **Effectively live and correct: 5 of 18.**

---

### ⚠️ The one thing that matters today

**The homepage has not been redeployed for 20 days.** It is still serving the pre-8-August snapshot:

- 255,614 bytes, `etag: "a7ff9af0d010c975ec945e50c9bb29d4"` — **unchanged since 11 August**
- Body is byte-for-byte identical to yesterday's fetch
- `last-modified` moves each day, but that is the CDN regenerating its cache, not a build

Seven checklist items were fixed on 8 August and un-fixed by the 10 August rollback: **BUG-01, BUG-02, BUG-04, SEO-01, SEO-04, UX-01, UX-02.** Re-deploying the 8 August build fixes all seven at once. This remains a single action, now three weeks overdue.

**New this run:** the "deploys are happening, just not to the homepage" signal from last week has gone quiet too. /registernow (`etag 09f9fd92…`, 27 Aug) and /resources (`etag 9a94c23f…`, 10 Aug) are both unchanged — **nothing at all has been deployed since 27 August.**

### Verification detail

| Check | Result |
|---|---|
| Footer legal bar | "Privacy Policy" ×2, "Share Your Feedback" ×2, "Terms & Conditions" ×2 |
| Workshop videos | 7 `<video>` tags, **0** `poster=`, **0** `#t=0.5` fragments |
| Curriculum images | 38 sources swept, **4** hard 404s (all variants of `Gemini_Generated_Image_ee4fu7…`) — **33 days** unfixed. 0 broken `<img>` in rendered DOM |
| "o" bullets | "mutual o funds" ×1, "o How money grows over time" ×1, **0** `list-style` rules |
| Widget overlap | TrustedSite 1348–1440 × 862–900 (z 1000003) vs WhatsApp 1190–1430 × 810–890 (z 999999999) → **82×28px intersection**, pill on top. Screenshot re-confirmed |
| Meta description | **0** tags on homepage (present on /registernow — tooling works, build is stale) |
| Sitemap | ✅ 200, valid XML urlset |
| OG tags | Present but degraded: `og:title` = "Home - Investing For Mummies", `og:url` = `"/"`, `og:image` relative — no share preview |
| Title tag | "Home - Investing For Mummies", appearing **twice** |
| Alt text | 35 `<img>`, **33 empty `alt=""`** — only the logo and `alt="💬"` carry text |
| /resources | 200, **471 visible characters**: nav → "Coming Soon" → old "Products" footer. Still in sitemap.xml |
| Footer heading | "Products" — **0** occurrences of "Quick Links" or "Explore" |
| Footer contact | **0** `mailto:`, **0** `tel:`, **0** email addresses. Address only inside a hidden modal |
| Homepage batches | `#ifmHomeBatchGrid` **absent**, 0 cards. `/api/batches` = `"live":[]` + a July placeholder, now **9+ weeks stale** |
| Waitlist | **0** matches for "waitlist" / "notify me" on /registernow; 7× "Reserve →" |
| Testimonials | 4-slide track (1,512px) in a 748px viewport → **2 visible at a time**, 4 dot positions |
| Seat availability | **0** word-boundary matches for "seat"/"seats"; `/api/batches` exposes `"capacity":6` but nothing renders it |
| Schema | 1 `ld+json` on homepage, no LocalBusiness/Course/Event. /registernow: **0** blocks |
| EMI / instalments | **0** matches on either page |
| Games new-tab | ✅ 2 nav links patched. ⚠️ Footer Games link still has no `target="_blank"` |

*No check ran on 29 August — this run covers both days.*
