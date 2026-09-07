# BRIEF — Investing for Mummies, registration page

Build a single-page registration/landing page for an in-person financial education
course. Everything below is final copy unless marked `[DECIDE]` or `[PLACEHOLDER]`.
Do not invent content, statistics, testimonials, or imagery.

---

## 1. What this is

**Investing for Mummies (IFM)** runs an 8-session, in-person investing course for
women in Mumbai. This page sells the flagship course and takes the booking.

- 8 sessions · 2 hours each · mornings · in person
- Venue: 107 Mittal Chambers, 10th Floor, Nariman Point, Mumbai 400 021
- Cohort capped at **12 people**
- Price: **September batches ₹21,000** · **October batches ₹19,000** (early bird, ends 20 Sep). Both incl. GST.

**Who arrives here:** mostly women referred by a friend or a past student — they
already trust the recommendation and want confirmation, dates, and price. Some
arrive from Instagram. Assume mid-range Android on mobile data.

**The single job of this page:** turn "someone told me about this" into a booking,
or into a 15-minute call with the founder.

---

## 2. Positioning

> The only money school built for mums — taught by a business journalist who was
> still shut out of her own money conversations.

**Voice:** a smart friend explaining something patiently. Warm, plain, specific.
No hype, no guru energy, no pressure tactics, no exclamation marks.

**The real objection to answer** is not "what's the syllabus" — it is
*"I'm bad with money and I'll feel stupid."* Everything on the page should be
disarming that.

---

## 3. HARD RULES — read before building

1. **Every link must work.** Batch cards link to the booking URL, the call CTA links
   to Calendly, footer policy links go to real pages. **No in-page anchors standing
   in for real destinations.** A previous build shipped with every href as `#section`
   and could not take a booking.
2. **No placeholder text in visible copy.** If something is undecided, leave the
   whole block out — do not print notes like "TBC" or "to confirm" on the page.
3. **No invented proof.** Do not write testimonials, seat counts, ratings, star
   ratings, or alumni numbers. Use only what is given below. If a section has no
   real content yet, omit it.
4. **Photos must match the claim.** Do not use photos of teenagers, staff, or stock
   people to illustrate adult alumnae.
5. **Weight budget: under 1.5 MB total.** Subset fonts to Latin only. Compress
   photos to ≤200 KB each. Lazy-load below the fold. Video behind a poster frame.
6. **No countdown timers, no fake urgency, no "price rises in X hours".**
7. This is **financial education, not advice.** Never imply returns, gains, or
   performance anywhere.

---

## 4. Required technical elements

- One `<h1>`. Proper `h2`/`h3` hierarchy throughout.
- `<title>` and `<meta name="description">`.
- **Open Graph + Twitter card tags with a 1200×630 share image.** Critical — this
  page is shared on WhatsApp constantly and currently previews as a bare URL.
- `<link rel="canonical">`.
- `Course` and `FAQPage` JSON-LD structured data.
- Placeholders in the `<head>` for **Meta Pixel** and **GA4** (I'll paste IDs in).
- Preserve any `utm_*`, `fbclid`, `gclid` query params through every outbound link.
- Responsive from 360px up. Sticky bottom CTA on mobile once past the hero.
- All images: `alt` text, `loading="lazy"` below the fold.
- Respect `prefers-reduced-motion`.

---

## 5. Brand

- **Fonts:** Nunito (body/UI, 400–800) + Lora (headings, incl. italic 600)
- **Colours:** teal `#2a9d8f` · navy `#1a3a5c` · muted `#5a7d8a` · cream `#f7faf9` ·
  mint `#bde9e4` · gold accent `#b8761f`
- Cards: 14px radius, soft shadow. Calm, uncluttered, generous whitespace.
- Use ONE navy (`#1a3a5c`) and ONE teal (`#2a9d8f`) throughout.

---

## 6. Page structure, in order

### Block 1 — Hero
Eyebrow: `Flagship · September & October 2026 · Nariman Point, Mumbai`

# You were never bad with money. You were just never taught.

Eight mornings. Twelve women in a room. By the end you'll know exactly where your
money is, what it's doing, and what to ask the person managing it.

Directly beneath, small, beside a circular founder photo:

> "I covered business for a living. I still let someone else handle my money.
> That's exactly why IFM exists."
> — **Hiral Goel**, founder · former business journalist

### Block 2 — CTAs + trust strip
- Primary button: **See September & October batches →**
- Secondary, visibly lighter: **Not sure yet? Talk to Hiral for 15 minutes →**

Strip of four, beneath:
- 116 people have taken an IFM workshop
- 12 seats per batch — never more
- 8 sessions · 2 hours each · in person
- Nariman Point, Mumbai

### Block 3 — "Sound familiar?"
Heading: **If money feels like someone else's subject, you're not alone**

- There's an insurance policy in your name and you couldn't say what it actually covers.
- Someone sold your family a SIP. You nod when it comes up. You've never seen the statement.
- You run a household budget better than most CFOs — and still feel unqualified to open a Demat account.
- You've decided you'll "get to it properly" once the children are older. That was four years ago.

Closing line: *None of this is a maths problem. It's a nobody-sat-down-and-explained-it
problem — and that's the entire premise of these eight mornings.*

### Block 4 — Interactive calculator
Heading: **Try the first thing we teach**
Sub: **What did last year cost the money in your savings account?**

Put in what's sitting there. We'll show you what inflation quietly took from it.
This is one of eleven games we play in the room — no lectures, no jargon, no slides
you can't follow.

- A text input, **Indian number formatting** (`5,00,000` not `500,000`), plus quick
  chips: ₹1,00,000 · ₹5,00,000 · ₹10,00,000 · ₹25,00,000. Default ₹5,00,000.
- Assume **2.5% savings interest** vs **5% inflation**.
- Headline number = the real shortfall: `amount × 2.5%` (₹12,500 on ₹5,00,000).
  **The server-rendered HTML must show the same number the script computes** — a
  previous build showed ₹12,500 static and ₹25,000 after JS.
- Caption: *Illustrative: 2.5% savings interest against 5% inflation. Education, not
  advice — we don't tell you what to buy.*

### Block 5 — Meet Hiral
Heading: **The person who'll be teaching you**
Sub: *She reported on money for a living — and still sat out her own money conversations.*

Hiral Goel spent years as a business journalist, reporting on markets, companies and
money. And she still found herself outside her own family's money conversations,
nodding along, quietly tuning out.

She started Investing for Mummies because **the problem was never intelligence.** It
was that nobody had ever sat down and explained it patiently, without jargon, without
making her feel slow for asking.

That's how she teaches: everyday analogies, real numbers, games instead of lectures,
and no question treated as too basic.

Then a short "what we are, plainly" note:
*Investing for Mummies is a financial education programme. We do not recommend
specific products, funds or stocks; you leave able to evaluate them yourself.*

`[DECIDE]` One line stating SEBI status — registered, or education-only.
**Leave this block out entirely until I give you the line. Do not print a note about it.**

### Block 6 — Curriculum
Heading: **What you'll cover — and what you'll be able to do**
Sub: *The topic says what we cover. The line beneath says what you walk out able to do.*

| # | Title | Covers | You'll be able to |
|---|---|---|---|
| 1 | Principles of Smart Investing | Financial health checklist · investor mindset · the 3-bucket approach · compounding · Rule of 72 | have your own money structured into three buckets — and know why time, not timing, does the heavy lifting |
| 2 | Insurance Made Simple | Types of insurance · term cover · health insurance checklist · corporate cover · endowment plans & ULIPs | know whether the policies you already own are protection or a badly sold investment — and what to do about each |
| 3 | Understanding Asset Classes (1) | Asset classes · allocation & diversification · real estate & REITs · gold and silver | look at what your family owns and say what each asset is actually doing there |
| 4 | Understanding Asset Classes (2) | FDs, PPF, Sukanya Yojana · bonds, G-secs, SGBs · intro to equity | know the safe options properly — what each pays, what it locks up, and where equity fits |
| 5 | Mutual Funds Made Easy | AMC, AUM, NAV, expense ratio, exit load · active vs passive · SIP, STP, SWP · how to read a fund | open a fund factsheet and read it without flinching — and know what you're being charged |
| 6 | Beyond Mutual Funds + Stocks (1) | ETFs, PMS, AIFs · IPOs · what owning a share means | understand what sits beyond a mutual fund — and what you actually own when you own a share |
| 7 | How the Stock Market Works | Market participants · market/limit/stop-loss orders · market cap · valuation basics | place and read an order, and explain what moves a share price |
| 8 | Making Smarter Decisions | Volatility · indices · CAGR, IRR, XIRR, TWRR · rolling returns · retirement & education planning | judge any investment on its real return — and plan a goal backwards from the number |

Close the section with two notes:
- **Games run through most sessions** — eleven, built in-house, played on phones and on the big screen.
- **A printed handbook you keep** — plus notes, slides and worksheets after every session, and WhatsApp access between sessions.

### Block 7 — The room
Heading: **Eight mornings, twelve women, one table in Nariman Point.**
Sub: *This is what it actually looks like.*

3–4 photographs. **Host them with the site — do not hotlink Google Drive**
(a previous build did and all twelve images returned 403).

### Block 8 — Games
Heading: **Eleven games, built in-house**
Played on phones, on the big screen, and against each other. Nobody else teaching
this in India has a single one.

Short muted video, captions burned in, poster frame, lazy-loaded.

### Block 9 — Testimonials
`[PLACEHOLDER]` **Build the layout, leave the content to me.**

Four written testimonials (name · "Flagship · [month] batch") and space for 3 short
vertical videos. **Do not write example quotes** — I will supply real ones.
If I haven't supplied them, omit the section rather than filling it.

Section framing when it does run: *What they could do after eight mornings that they
couldn't do before.* Nothing about returns or profit.

### Block 10 — What's included
Heading: **What ₹21,000 actually buys**
Sub: *No invented rupee values, no "total value" arithmetic. Just what you get.*

- 8 live sessions, 2 hours each, in person in Nariman Point
- A cohort capped at 12 — small enough to ask anything
- A printed handbook to keep and revisit
- Notes, slides and worksheets after every session
- Interactive games run through most sessions
- WhatsApp access for questions between sessions

Note beneath: *Prices are per batch and include GST. The October rate is a genuine
early bird — it ends on 20 September.*

### Block 11 — Batch cards
Heading: **Pick the mornings that fit your week**
Sub: *Four batches — two in September, two in October. Twelve seats each. When a
batch fills, it fills — we don't add chairs.*

| Batch | Days | Time | Dates | Note | Price |
|---|---|---|---|---|---|
| September · B1 | Tue & Thu | 11:30 AM – 1:30 PM | Sep 1, 3, 8, 10, 15, 17, 22, 24 | — | ₹21,000 incl. GST |
| September · B2 | Mon & Wed | 11:00 AM – 1:00 PM | Sep 2, 7, 9, 16, 21, 23, 28, 30 | No session Mon 14 Sep — holiday, planned | ₹21,000 incl. GST |
| October · B1 | Tue & Thu | 11:30 AM – 1:30 PM | Oct 1, 6, 8, 13, 15, 22, 27, 29 | No session Tue 20 Oct — holiday, planned | ₹19,000 incl. GST · early bird until 20 Sep |
| October · B2 | Mon & Wed | 11:00 AM – 1:00 PM | Oct 5, 7, 12, 14, 19, 21, 26, 28 | — | ₹19,000 incl. GST · early bird until 20 Sep |

- Each card needs a **Reserve →** button linking to the booking URL for that batch.
- Leave a slot for **seats remaining** ("4 of 12 seats left") — I'll wire it to live
  data. **Do not hard-code a number.**
- Every batch must show real dates. **No "to confirm" cards.**

### Block 12 — Book a call
Heading: **Still deciding? Talk to me for fifteen minutes.**

No pitch, and no obligation to book. Tell me where you're starting from and I'll tell
you honestly whether this course is the right thing for you right now — or whether
something else is.

Button: **Pick a time with Hiral →** (links to Calendly)

Four short notes beneath:
- Fifteen minutes, on the phone or on video — whichever you prefer.
- Two windows a week, capped. If they're gone, the next ones open Monday.
- One question I'll ask you: what's making you hesitate?
- You'll get a WhatsApp confirmation and a reminder before it.

### Block 13 — FAQ
**I'm not good with numbers. Will I keep up?**
Yes. There is no maths beyond what you already do running a household. We use
analogies and games, not formulas, and nobody in the room has a finance background either.

**Do I need to already have investments?**
No. Roughly half the room starts with nothing invested. The other half arrives with
things someone else chose for them and wants to understand what they own.

**Will you tell me which funds to buy?**
No — and that's deliberate. This is education, not advice. You'll leave able to
evaluate a fund yourself, which is the thing nobody can sell you.

**What if I miss a session?**
You'll get the notes and worksheets, and you can sit in on that session with the next
batch at no cost.

**Is it in English or Hindi?**
Both — the way we all actually speak in a Mumbai room.

**Where exactly is it, and how do I get there?**
Nariman Point, Mumbai. You'll get the full address and directions on WhatsApp as soon
as your seat is confirmed.

**What is the batch size?**
Every batch is capped at 12. Small enough that everyone gets attention and nobody
sits at the back.

### Block 14 — Close + footer
Eyebrow: `September starts on the 1st`
Heading: **You don't need to know everything to begin.**
Sub: *Twelve seats a batch. Pick the mornings that fit your week — or talk to Hiral first.*
Two buttons, same as the hero.

**Footer must contain real links:**
- Refund Policy · Privacy Policy · Terms & Conditions
- WhatsApp · Instagram · Email
- Mooga Tech Solutions India Pvt Ltd · GSTIN 27AAECM9012F1ZM
- 107 Mittal Chambers, 10th Floor, Nariman Point, Mumbai 400 021
- *Investing for Mummies is a financial education programme and provides no investment advice.*

---

## 7. Assets I will supply

- Founder photograph (headshot) and 1–2 of Hiral teaching
- 3–4 workshop photographs of the **adult flagship cohort**
- Short games video
- Logo (round watermark + wide wordmark)

Until I supply them, use neutral grey blocks at the right aspect ratio. **Do not
substitute stock photography or reuse a photo for a purpose it doesn't match.**

---

## 8. Do not

- Do not write testimonials, seat counts, ratings, or alumni figures.
- Do not print `[DECIDE]` / `[PLACEHOLDER]` notes as visible page copy.
- Do not use in-page anchors in place of real links.
- Do not hotlink images from Google Drive or any external host.
- Do not use countdown timers, fake scarcity, or price-rise threats.
- Do not mention returns, profits, or performance anywhere.
- Do not exceed 1.5 MB total page weight.

---

## 9. One open item

October B1's dates need confirming — one source has it starting **Oct 1**, another
starting **Oct 6 and running to Nov 3**. Build with the Oct 1 dates in the table
above; I'll confirm before it goes live.
