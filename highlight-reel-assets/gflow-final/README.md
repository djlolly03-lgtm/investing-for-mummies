# IFM WhatsApp Workshop Video — Google Flow Rebuild Kit

17 files, flat (no subfolders), numbered 01–17 in the order they appear in the video —
attach them in Flow in this order. Rebuild target: 81.2s, 1080x1920 vertical.

---

## ⚠️ THINGS THAT WON'T WORK OUT OF THE BOX — READ THIS FIRST

1. **The QR code (shot #16, on the flyer end card) must be regenerated in Flow**, not
   reused as a screenshot. It links to **investingformummies.com/registernow**. Test
   that it still scans *after* Flow exports/compresses the final video — this exact
   QR broke once during this build when compressed too small. Keep it generous in
   size (roughly 250px+ wide in a 1080px-wide frame) and don't let Flow shrink it
   further in a "smart crop" or thumbnail pass.

2. **The music/ducking behavior likely won't carry over.** `17-full-audio-mix.wav`
   is the finished soundtrack — a synth pad + rhythm + chime, with the four real
   class-audio clips (files 03, 04, 11, 14) mixed in and "ducked" (music drops to
   ~10–18% under the live voices, then rises back). This was custom-built frame by
   frame, not something Flow will auto-generate. **Simplest fix: import this WAV
   directly as your soundtrack** rather than trying to recreate the mix. If you
   re-time any shot in Flow, the ducking points will no longer line up with the
   new cut and will need to shift.

3. **The staggered two-part text reveal won't exist in Flow by default** — on the
   "We cover Insurance, stocks, mutual funds..." card, the second line ("and every
   asset class in between") is meant to pop in about 1 second after the first.
   You'll need to build that as two separate text layers with offset timing.

4. **Caption auto-sizing won't carry over.** In the original build, longer lines of
   text automatically shrink to fit their card. In Flow you'll need to manually pick
   a smaller font size for the longer captions (marked below).

If anything else doesn't work as expected once you're rebuilding, that's worth
flagging back — this list covers what I already know breaks, not everything that could.

---

## FILE-BY-FILE TIMELINE

| File | Time in video | Type | On-screen text |
|---|---|---|---|
| 01-logo.png | 0.0–2.6s | Opening logo card + watermark badge (every shot) | "Investing *for* Mummies" (fade + scale in) |
| 02-hiral-portrait.jpg | 2.6–5.8s | Photo | Meet **Hiral Goel** / Founder, Investing for Mummies |
| *(no file — text-only navy card)* | 5.8–9.2s | Title card | New to investing? **Start here.** / *Here's a peek into our workshops* |
| 03-live-class-clip-a.mp4 | 9.2–12.8s | Video, LIVE audio | none — show "● LIVE FROM CLASS" pill only |
| 04-live-class-exchange-14s.mp4 | 12.8–26.8s | Video, LIVE audio, full 14s clip (ask → reply → laugh) | none — "● LIVE FROM CLASS" pill only |
| 05-hiral-teaching-expenses-slide.jpg | 26.8–29.6s | Photo | We start at the basics and **build a solid foundation**. |
| 06-student-asking-question.jpg | 29.6–32.4s | Photo | Ask anything. **Nothing is a silly question.** |
| *(no file — text-only card)* | 32.4–35.2s | Title card | We don't just teach. **We learn through interactive games and simulations.** *(long line — use smaller font)* |
| 07-kbc-leaderboard.png | 35.2–37.8s | Screenshot | **Live quizzes.** / Real-time leaderboard. |
| 08-mutual-fund-lobby.jpg | 37.8–40.4s | Screenshot | **Simulate a Mutual Fund.** |
| 09-stock-rush-teaser.mp4 | 40.4–43.0s | Video, silent — use ~1.2–3.8s of the clip | Fake money. **Real market conditions.** |
| 10-swayamvar-biodata-card.jpg | 43.0–45.6s | Screenshot | Play the **asset class Swayamvar.** |
| 11-live-class-clip-b.mov | 45.6–49.1s | Video, LIVE audio — use ~12.5–16.0s of the clip | none — "● LIVE FROM CLASS" pill only |
| 12-hiral-teaching-bidask-slide.jpg | 49.1–51.9s | Photo | Every concept, **broken down simply**. |
| 13-full-batch-group-photo.jpg | 51.9–55.1s | Photo | Batch after batch, **the room keeps filling.** |
| 14-beginner-testimonial-8s.mp4 | 55.1–63.1s | Video, LIVE audio, full 8s clip | none — "● IN HER WORDS" pill only |
| *(no file — text-only card)* | 63.1–66.2s | Title card | **8 sessions. 2 hours each.** / *Small batches · Nariman Point* |
| *(no file — text-only card, staggered reveal — see warning #3 above)* | 66.2–69.2s | Title card | We cover Insurance, stocks, mutual funds *(1s pause)* **and every asset class in between.** *(long line — use smaller font)* |
| 15-certificate-handover.jpg | 69.2–72.4s | Photo | You finish **financially empowered** with a certificate — and a handbook to refer to. *(long line — use smaller font)* |
| *(no file — text-only card)* | 72.4–75.4s | Title card | No finance background **required.** / *Just bring your questions.* |
| 16-flyer-endcard.jpg | 75.4–81.2s | End card + QR (see warning #1) | "SCAN TO REGISTER / investingformummies.com" |
| 17-full-audio-mix.wav | full 81.2s | Audio track (see warning #2) | — |

---

## BRAND SPECS

- **Navy background:** #0C548E
- **Gold accent (highlighted words):** #F2C75C
- **White:** everything else
- **Fonts:** Nunito (sans — all captions/UI) + Lora (serif — only the opening logo tagline)
- **Logo badge:** round IFM tree logo (file 01) on a white circle, top-center on every shot
