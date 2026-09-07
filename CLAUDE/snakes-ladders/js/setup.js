/* setup.js — the first screen.
 *
 * DESIGN.md §2 "First 30 Seconds" and §11 "Player Setup".
 *
 * The whole job in one sentence: a 45-year-old who has never played a game on a
 * phone is PLAYING within about three taps, having typed nothing at all.
 *
 * So the required path is exactly ONE tap on ONE giant plaque — you and Mithu,
 * the brass parrot — and every other decision (2/3/4 people, names, pieces,
 * language, the two §11 toggles) is either one more tap on the same card or
 * folded away behind one quiet line most people will never open.
 *
 * Beat sheet, obeyed:
 *   0 ms    card in over the already-lit board (timing.setupIn 260, ease out)
 *   frame 1 हिं / EN and the speaker sit top-right, 44dp, and never gate anything
 *   TAP 1   players are created, pre-named, pre-pieced. initAudio() fires HERE,
 *           on this gesture, and nothing else in the product may call it first.
 *   +300    the equal-start line, held 2600 ms over the live board, once per
 *           install, tap-skippable (§9 #3)
 *   then    resolve({ players, options, lang }) and game.js takes the handoff.
 *
 * Owns only '#snl-overlay > .snl-setup'. All CSS via injectCss('setup').
 */

import {
  injectCss, prefersReducedMotion, setReducedMotion, wait, esc, clamp,
} from './util.js';
import {
  timing, layout, tokens as TOK, game as GAME, rules as RULES,
} from './config.js';
import {
  t, getLang, setLang, langChipLabel, otherLang, LANG_NAMES, onLangChange,
} from './i18n.js';
import { initAudio, sfx, isMuted, setMuted } from './audio.js';

/* ═══════════════════════════════════════════════════════════════════════════
   0. Strings this screen needs that i18n.js does not carry.
      i18n.js is FINAL, so the handful of setup-only lines live here — same two
      languages, same spoken register (§13: Hinglish is the default, not a
      translation). Everything that DOES exist in i18n.js is read from there.
   ═══════════════════════════════════════════════════════════════════════════ */

const LOCAL = {
  en: {
    lead:        'Snakes are money traps. Ladders are habits that hold.',
    goMain:      'Start playing',
    goSub:       'Just me',
    people:      'players',
    orPick:      'or, with people in the room',
    more:        'Names, pieces and settings',
    trust:       'Free. No signup, no ads, nothing to install.',
    howTitle:    'How to play',
    how1:        'Tap the dice. Walk that many.',
    how2:        'A ladder is one small job.',
    how3:        'A snake’s back shows the cost.',
    how4:        'First to 100. Nobody is out.',
    sheetTitle:  'Set it up your way',
    secPeople:   'How many of you?',
    secNames:    'Names and pieces',
    secLang:     'Language',
    secOptions:  'Settings',
    solo:        'Aap + Mithu',
    soloSub:     'One person, one parrot',
    tokenAria:   '{name} is playing the {token}. Tap for a different piece.',
    nameAria:    'Name for player {n}',
    botRow:      'Mithu plays too. She rolls the same dice as everyone else.',
    playNow:     'Start playing',
    changeLater: 'All of this can be changed later, mid-game.',
    lineGo:      'Chalo',
    lineGoAria:  'Chalo. Start playing.',
    lineSkip:    'or tap anywhere',
    defaults:    ['You', 'Priya', 'Ravi', 'Amma'],
  },
  hi: {
    lead:        'साँप पैसे के जाल हैं। सीढ़ियाँ वो आदतें जो टिकती हैं।',
    goMain:      'खेलना शुरू करो',
    goSub:       'सिर्फ़ मैं',
    people:      'खिलाड़ी',
    orPick:      'या घर के लोगों के साथ',
    more:        'नाम, गोटी और सेटिंग',
    trust:       'मुफ़्त। न साइनअप, न ऐड, कुछ इंस्टॉल नहीं।',
    howTitle:    'कैसे खेलें',
    how1:        'पासा दबाओ। उतने घर चलो।',
    how2:        'सीढ़ी यानी एक छोटा काम।',
    how3:        'साँप की पीठ पे दाम लिखा है।',
    how4:        'पहले 100 पर। कोई बाहर नहीं।',
    sheetTitle:  'अपने हिसाब से लगाओ',
    secPeople:   'कितने लोग हैं?',
    secNames:    'नाम और गोटी',
    secLang:     'भाषा',
    secOptions:  'सेटिंग',
    solo:        'आप + मिठू',
    soloSub:     'एक इंसान, एक तोता',
    tokenAria:   '{name} की गोटी {token} है। बदलने के लिए दबाओ।',
    nameAria:    'खिलाड़ी {n} का नाम',
    botRow:      'मिठू भी खेलेगी। पासा सबका एक जैसा है।',
    playNow:     'खेलना शुरू करो',
    changeLater: 'ये सब बाद में, खेल के बीच में भी बदल सकते हो।',
    lineGo:      'चलो',
    lineGoAria:  'चलो। खेलना शुरू करो।',
    lineSkip:    'या कहीं भी दबाओ',
    defaults:    ['आप', 'प्रिया', 'रवि', 'अम्मा'],
  },
};

const s = (k, vars) => {
  const table = LOCAL[getLang()] || LOCAL.en;
  let v = table[k];
  if (v === undefined) v = LOCAL.en[k];
  if (typeof v !== 'string') return v;
  return vars ? v.replace(/\{(\w+)\}/g, (_, n) => (vars[n] == null ? '' : String(vars[n]))) : v;
};
/* Exported because game.js's own quickStart roster used to keep a SECOND,
   English-only copy of this list. Two owners, one of them untranslated: a Hindi
   board came up with "You" and "Priya" on the plaques while every other word on
   the screen was Hindi. One list, one owner. */
export const defaultNames = () => (LOCAL[getLang()] || LOCAL.en).defaults;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Persistence — remembered, never required. Every touch inside try/catch:
      a locked-down browser loses the memory and nothing else.
   ═══════════════════════════════════════════════════════════════════════════ */

const KEY      = 'snl.setup.v1';
const LINE_KEY = 'snl.oneline.v1';   // the equal-start line is once per install

function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch { return null; }
}
function savePrefs(st) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      count: st.count, names: st.names, tokenIdx: st.tokenIdx,
      exactFinish: st.exactFinish, workshop: st.workshop, reduced: st.reduced,
    }));
  } catch { /* private mode — the game still plays, we just forget */ }
}
const seenOneLine = () => { try { return localStorage.getItem(LINE_KEY) === '1'; } catch { return false; } };
const markOneLine = () => { try { localStorage.setItem(LINE_KEY, '1'); } catch { /* fine */ } };

/* One frame — but never a dead end. A backgrounded tab stops firing rAF
   entirely, and a phone that got a call during the boot must not come back to
   a blank overlay, so every wait-for-a-frame here has a timer behind it. */
function nextFrame() {
  return new Promise(res => {
    let fired = false;
    const go = () => { if (!fired) { fired = true; res(); } };
    requestAnimationFrame(go);
    setTimeout(go, 90);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Art — inline SVG only. Nothing is fetched, and nothing depends on an
      emoji font: 🪔 and 🔔 are missing or unrecognisable on exactly the cheap
      five-year-old Android this game is built for. §6.4 rule 4 says a piece is
      identified by SILHOUETTE, so the setup screen shows the silhouette.
      Every icon is paired with a word (§7.4: no icon-only control, ever).
   ═══════════════════════════════════════════════════════════════════════════ */

const PIECE = {
  /* matka — wide-bellied pot, the widest silhouette */
  matka: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.3 4.7h7.4a.95.95 0 0 1 0 1.9h-.8c.12.8.5 1.25 1.2 1.85 1.75 1.45 2.9 3.45 2.9 5.75 0 4.05-3.5 6.8-7 6.8s-7-2.75-7-6.8c0-2.3 1.15-4.3 2.9-5.75.7-.6 1.08-1.05 1.2-1.85h-.8a.95.95 0 0 1 0-1.9Z" fill="currentColor"/></svg>`,
  /* diya — low, flared, with a flame tip; the lowest profile */
  diya: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.4c2 2.1 3 3.5 3 4.9a3 3 0 0 1-6 0c0-1.4 1-2.8 3-4.9Z" fill="currentColor" opacity=".5"/><path d="M2.9 13.1h18.2c0 3.6-3.6 6.3-9.1 6.3S2.9 16.7 2.9 13.1Z" fill="currentColor"/><path d="M2.4 12.1h19.2v1.6H2.4z" fill="currentColor"/></svg>`,
  /* chaabi — tall and thin, with a toothed head */
  chaabi: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.6 2.8a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4Zm0 2.7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill="currentColor"/><path d="m12.1 10.4 2 2-1.5 1.5 1.7 1.7 1.5-1.5 1.5 1.5-1.5 1.5 1.7 1.7 1.5-1.5 1.6 1.6v1.9h-1.9L11.2 13.3l.9-2.9Z" fill="currentColor"/></svg>`,
  /* ghanti — domed, with a handle on top */
  ghanti: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.9a1.7 1.7 0 0 1 1.1 3c3.3 1 5.7 4 5.7 7.6v4.1l1.4 1.7a.6.6 0 0 1-.45 1H4.25a.6.6 0 0 1-.45-1l1.4-1.7v-4.1c0-3.6 2.4-6.6 5.7-7.6A1.7 1.7 0 0 1 12 1.9Z" fill="currentColor"/><path d="M9.4 20.1h5.2a2.6 2.6 0 0 1-5.2 0Z" fill="currentColor"/></svg>`,
  /* mithu — the brass parrot, in profile: round head, hooked beak, long tail */
  mithu: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14.5 2.3c3.2 0 5.6 2.4 5.6 5.6 0 2-.7 3.4-2.1 4.9-1.6 1.7-2.4 3.2-2.9 5.4-.3 1.4-1.3 2.2-2.7 2.5l-7 1.5a.85.85 0 0 1-.85-1.35l4.05-5.1C7.3 14.4 6.6 12.6 6.6 10.6c0-4.4 3.5-8.3 7.9-8.3Z" fill="currentColor"/><circle cx="16.1" cy="6.7" r="1.15" fill="var(--cream)"/><path d="m19.7 5.2 2.9 1.55-2.75 1.5c.35-1 .3-2.05-.15-3.05Z" fill="var(--gold)"/></svg>`,
};

const ICON = {
  dice: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" fill="#efe3cb" stroke="var(--navy)" stroke-width="1.7"/>
    <circle cx="8.7" cy="8.7" r="1.75" fill="var(--navy)"/><circle cx="12" cy="12" r="1.75" fill="var(--navy)"/>
    <circle cx="15.3" cy="15.3" r="1.75" fill="var(--navy)"/></svg>`,
  ladder: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <g fill="none" stroke="var(--teal)" stroke-width="2.3" stroke-linecap="round">
    <path d="M8.4 21 10.6 3"/><path d="M16.4 21 14.2 3"/>
    <path d="M9 16.9h6.7"/><path d="M9.55 12.4h5.9"/><path d="M10.1 7.9h5.1"/></g></svg>`,
  snake: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8 21.2c0-3.3 4.6-3.3 4.6-6.6S8 11.3 8 8" fill="none" stroke="var(--clay)"
      stroke-width="2.7" stroke-linecap="round"/>
    <circle cx="9.6" cy="5.6" r="3.15" fill="var(--clay)"/>
    <circle cx="8.5" cy="4.9" r=".74" fill="var(--cream)"/>
    <path d="M12.6 5.2h3.1" stroke="var(--clay)" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  goal: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6.6 21.4V3.2" stroke="var(--navy)" stroke-width="2.3" stroke-linecap="round"/>
    <path d="M7.9 4.3h9.6l-2.6 3.4 2.6 3.4H7.9z" fill="var(--gold)"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4z" fill="currentColor"/>
    <path d="M15.4 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M18.1 6.6a7.7 7.7 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 9.4h3.4L12 5.2v13.6L7.4 14.6H4z" fill="currentColor"/>
    <path d="M15.6 9.6 20.4 14.4M20.4 9.6 15.6 14.4" fill="none" stroke="currentColor"
      stroke-width="2.1" stroke-linecap="round"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M9 5.5 15.5 12 9 18.5" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  tick: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M5 12.6 10 17.4 19 6.9" fill="none" stroke="currentColor" stroke-width="3"
      stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4.6 9.2h12.2l-3-3M19.4 14.8H7.2l3 3" fill="none" stroke="currentColor"
      stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const LOGO = './ifm-mark.png';

/* ═══════════════════════════════════════════════════════════════════════════
   3. CSS. Namespaced '.snl-setup', brand custom properties only, no new
      colours. Sized so the required path fits 390x844 — and 375x667 — with
      NO scrolling. Only the options sheet ever scrolls, and only when the OS
      text size is cranked (§13: grow and scroll, never truncate).
   ═══════════════════════════════════════════════════════════════════════════ */

const CSS = `
.snl-setup{
  /* The setup screen used to be the ONE screen that never scaled: every size
     in this file was a raw pixel, so a 1920x1080 projector got a 392px card
     with 16px body text floating in the middle of a hall screen, while the
     in-game HUD next to it scaled to 22-40px. --ss is the same scale the HUD
     and the lesson ribbon use (main.js publishes it at boot, before this
     screen paints, and again on every resize). A 390px phone resolves it to
     exactly 1, so the phone layout is bit-identical to before. */
  --ss:var(--snl-text-scale,1);
  position:fixed; inset:0; z-index:2;
  display:flex; flex-direction:column; align-items:center;
  padding:calc(6px + var(--sat)) calc(12px + var(--sar)) calc(8px + var(--sab)) calc(12px + var(--sal));
  font-family:var(--ui); color:var(--navy);
  -webkit-user-select:none; user-select:none;
}

/* The board is already built and lit behind this. We soften it, never hide it —
   and "never hide it" has to be true in the measured pixels, not just in a
   comment: the first screen must be a picture of the game (§2, REF-LUDOKING). */
.snl-setup__veil{
  position:absolute; inset:0; pointer-events:none;
  /* Two layers. The mint wash reads the card's ground into the top of the
     frame. Under it, a warm bottom vignette to the table's own falloff colour
     (#4e3524, ART-DIRECTION §"Table"): the camera parks the board high and
     leaves a band of bare plank at the foot of the phone which otherwise reads
     as "the page did not finish". Vignetted, the same band reads as depth. */
  background:
    linear-gradient(0deg,
      rgba(78,53,36,.42) 0%, rgba(78,53,36,.24) 11%, rgba(78,53,36,.09) 22%, rgba(78,53,36,0) 34%),
    radial-gradient(132% 78% at 50% 0%,
      rgba(255,255,255,.72) 0%, rgba(247,250,249,.58) 44%, rgba(224,243,240,.42) 100%);
  -webkit-backdrop-filter:blur(1.5px) saturate(1.04); backdrop-filter:blur(1.5px) saturate(1.04);
  opacity:0;
}
.snl-setup.is-in .snl-setup__veil{opacity:1; transition:opacity ${timing.setupIn}ms ease-out}

/* ── the two persistent chips (§2): visible in this frame and forever after ── */
.snl-setup__chips{
  position:relative; z-index:2; flex:0 0 auto;
  width:100%; max-width:calc(392px * var(--ss));
  display:flex; justify-content:flex-end; align-items:center; gap:8px;
  min-height:calc(${layout.chip}px * var(--ss));
}
.snl-setup__chip{
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  min-height:calc(${layout.chip}px * var(--ss)); min-width:calc(${layout.chip}px * var(--ss));
  padding:0 calc(13px * var(--ss));
  border:1.5px solid var(--mint); border-radius:22px;
  background:var(--white); color:var(--navy);
  font-family:var(--ui); font-weight:800; font-size:calc(16px * var(--ss)); line-height:1;
  box-shadow:var(--shadow-sm); cursor:pointer;
}
.snl-setup__chip svg{width:calc(19px * var(--ss)); height:calc(19px * var(--ss)); display:block}
.snl-setup__chip:active{transform:translateY(1px); background:var(--mint-lt)}

/* ── the card ──────────────────────────────────────────────────────── */
.snl-setup__card{
  /* Content-sized, never viewport-filling: the card sits high and the board
     reads in the band beneath it. It still shrinks-and-scrolls (min-height:0 +
     overflow-y:auto) when the OS text size is cranked. */
  position:relative; z-index:1; flex:0 1 auto; min-height:0;
  width:100%; max-width:calc(392px * var(--ss)); margin:calc(5px * var(--ss)) 0 0;
  overflow-y:auto; overscroll-behavior:contain; scrollbar-width:none;
  display:flex; flex-direction:column; align-items:center; gap:calc(9px * var(--ss));
  /* "safe" packing, so a 200% OS text size overflows DOWNWARD and the top
     stays reachable. Browsers without it fall back to flex-start — also safe. */
  justify-content:safe flex-start;
  padding:calc(15px * var(--ss)) calc(15px * var(--ss)) calc(13px * var(--ss));
  background:var(--cream);
  /* a brass keyline and a lit top edge, the same two moves the board frame
     makes (ART-DIRECTION §4) — so the card reads as part of the same object */
  border:1px solid rgba(176,141,63,.30);
  border-radius:var(--radius-lg);
  box-shadow:var(--shadow-lg), inset 0 1px 0 rgba(255,255,255,.9);
  opacity:0; transform:translateY(14px) scale(.966);
}
.snl-setup__card::-webkit-scrollbar{display:none}
.snl-setup.is-in .snl-setup__card{
  opacity:1; transform:none;
  transition:opacity ${timing.setupIn}ms cubic-bezier(.22,.84,.36,1),
             transform ${timing.setupIn}ms cubic-bezier(.22,.84,.36,1);
}
.snl-setup.is-out .snl-setup__card,
.snl-setup.is-out .snl-setup__chips{
  opacity:0; transform:translateY(10px) scale(.976);
  transition:opacity ${timing.setupOut}ms ease-in-out, transform ${timing.setupOut}ms ease-in-out;
}
.snl-setup.is-out .snl-setup__veil{opacity:0; transition:opacity 300ms ease-out}

/* ── hero ──────────────────────────────────────────────────────────── */
.snl-setup__logo{
  height:calc(clamp(38px,12vw,52px) * var(--ss)); width:auto; object-fit:contain;
  mix-blend-mode:multiply; flex:0 0 auto;
}
.snl-setup__title{
  font-family:var(--display); font-style:italic; font-weight:600;
  font-size:calc(clamp(29px,8.8vw,37px) * var(--ss)); line-height:1.04;
  color:var(--navy); text-align:center; margin:-3px 0 0;
}
.snl-setup__rule{width:calc(46px * var(--ss)); height:calc(3px * var(--ss)); border-radius:2px; background:var(--mint); flex:0 0 auto}
.snl-setup__lead{
  font-size:calc(16px * var(--ss)); line-height:1.4; font-weight:600; text-align:center;
  color:var(--navy); max-width:33ch; margin:-1px 0 0;
}

/* ── the one giant button. This is the whole required path. ────────── */
.snl-setup__go{
  width:100%; min-height:calc(80px * var(--ss)); padding:calc(12px * var(--ss)) calc(16px * var(--ss));
  display:flex; align-items:center; justify-content:center; gap:calc(12px * var(--ss));
  /* A lit top edge falling to --teal-d. Two brand colours, no new ones — and
     it is what puts the 16sp subline on --teal-d, where white clears 4.5:1.
     (On flat --teal, white is 3.4:1: fine for the 22sp/900 title, not for a
     small line. The plaque still reads as the same teal primary as elsewhere.) */
  background:linear-gradient(180deg,var(--teal) 0%,var(--teal-d) 62%);
  color:var(--white);
  border:0; border-bottom:${layout.primaryBtnEdge}px solid var(--teal-d);
  border-radius:18px; cursor:pointer; font-family:var(--ui);
  /* the lacquered top highlight every raised object on the board has */
  box-shadow:0 8px 20px rgba(42,157,143,.26), inset 0 1px 0 rgba(255,255,255,.3);
  animation:snl-setup-breathe 2600ms ease-in-out infinite;
}
.snl-setup__go .av{
  flex:0 0 auto; width:44px; height:44px; border-radius:50%;
  background:rgba(255,255,255,.94); color:var(--brass);
  display:inline-flex; align-items:center; justify-content:center;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.6);
}
.snl-setup__go .av svg{width:30px; height:30px}
.snl-setup__go .tx{display:flex; flex-direction:column; align-items:flex-start; gap:2px; text-align:left}
.snl-setup__go .m{font-size:calc(22px * var(--ss)); font-weight:900; line-height:1.14; letter-spacing:.005em}
.snl-setup__go .sb{font-size:calc(16px * var(--ss)); font-weight:700; line-height:1.24}
.snl-setup__go:active{
  transform:translateY(2px) scale(.995); border-bottom-width:2px;
  background:var(--teal-d); animation:none;
}
@keyframes snl-setup-breathe{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.018)}
}

/* ── the §2 plaque row, for people actually in the room ────────────── */
.snl-setup__or{
  font-size:calc(16px * var(--ss)); font-weight:700; color:var(--navy); opacity:.72;
  text-align:center; margin:1px 0 -3px;
}
.snl-setup__row{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; width:100%}
.snl-setup__plaque{
  min-height:${layout.setupPlaqueH}px; padding:8px 4px 6px;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0;
  /* A filled plaque with a real under-edge, never a hairline ghost button
     (§7.4 "no hairlines", REF-LUDOKING §4). */
  background:var(--mint-lt); color:var(--navy);
  border:0; border-bottom:5px solid var(--teal);
  border-radius:16px; cursor:pointer; font-family:var(--ui);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85), var(--shadow-sm);
}
.snl-setup__plaque .n{font-size:calc(27px * var(--ss)); font-weight:900; line-height:1.06}
.snl-setup__plaque .l{font-size:calc(16px * var(--ss)); font-weight:700; line-height:1.15}
.snl-setup__plaque:active{transform:translateY(3px); border-bottom-width:2px; background:var(--mint)}

/* ── the quiet door to everything else ─────────────────────────────── */
.snl-setup__more{
  width:100%; min-height:${layout.touchMinHard}px; padding:8px 14px;
  display:flex; align-items:center; justify-content:center; gap:7px;
  background:transparent; border:0; cursor:pointer;
  color:var(--teal-d); font-family:var(--ui); font-weight:800; font-size:calc(16px * var(--ss));
  text-decoration:underline; text-underline-offset:4px; text-decoration-thickness:2px;
}
.snl-setup__more svg{width:16px; height:16px}

/* ── how to play: four steps, icon + six words, no reading required ── */
.snl-setup__how{
  /* 12px of top padding, not 9: the step-1 badge is offset -5px and would
     otherwise sit on the panel's own edge. */
  width:100%; padding:12px 11px 10px; border-radius:16px;
  background:var(--mint-lt); border:1.5px solid rgba(189,233,228,.85);
}
.snl-setup__how h2{
  font-size:calc(16px * var(--ss)); font-weight:900; line-height:1.2; margin-bottom:7px; color:var(--navy);
}
.snl-setup__steps{display:grid; grid-template-columns:1fr; gap:6px}
.snl-setup__step{display:flex; align-items:center; gap:9px}
.snl-setup__step .ic{
  position:relative; flex:0 0 34px; width:34px; height:34px; border-radius:11px;
  background:var(--white); box-shadow:var(--shadow-sm);
  display:inline-flex; align-items:center; justify-content:center;
}
.snl-setup__step .ic>svg{width:22px; height:22px}
.snl-setup__step .ic>b{
  position:absolute; top:-5px; left:-5px;
  width:18px; height:18px; border-radius:50%;
  background:var(--teal); color:var(--white);
  font-size:calc(12px * var(--ss)); font-weight:900; line-height:18px; text-align:center;
}
.snl-setup__step p{font-size:calc(16px * var(--ss)); font-weight:600; line-height:1.24; color:var(--navy)}

/* ── trust. Contrast held above 4.5:1 — never grey-on-grey (§7.4). ─── */
.snl-setup__trust{
  font-size:calc(16px * var(--ss)); font-weight:400; line-height:1.34; text-align:center;
  color:var(--navy); opacity:.78; max-width:32ch; margin:0;
}

/* ── the options sheet ─────────────────────────────────────────────── */
.snl-setup__scrim{
  position:fixed; inset:0; z-index:3; background:rgba(26,58,92,.30);
  opacity:0; pointer-events:none; transition:opacity 200ms ease-out;
}
.snl-setup__scrim.is-open{opacity:1; pointer-events:auto}
.snl-setup__sheet{
  position:fixed; z-index:4; left:0; right:0; bottom:0;
  width:100%; max-width:520px; margin:0 auto;
  max-height:min(92%,800px);
  display:flex; flex-direction:column;
  background:var(--cream); color:var(--navy);
  border-radius:var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow:var(--shadow-lg);
  transform:translateY(102%); transition:transform 260ms cubic-bezier(.22,.84,.36,1);
}
.snl-setup__sheet.is-open{transform:none}
.snl-setup__grip{width:44px; height:5px; border-radius:3px; background:var(--mint); margin:9px auto 2px; flex:0 0 auto}
.snl-setup__sheet-hd{
  flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:6px 14px 8px;
}
.snl-setup__sheet-hd h2{
  font-family:var(--display); font-style:italic; font-weight:600; font-size:calc(22px * var(--ss)); line-height:1.2;
}
.snl-setup__x{
  min-height:${layout.touchMinHard}px; min-width:${layout.touchMinHard}px; padding:0 15px;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid var(--mint); border-radius:22px; background:var(--white);
  font-family:var(--ui); font-weight:800; font-size:calc(16px * var(--ss)); color:var(--navy); cursor:pointer;
}
.snl-setup__body{
  flex:1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch;
  padding:2px 14px 14px; overscroll-behavior:contain;
}
.snl-setup__sec{
  font-size:calc(16px * var(--ss)); font-weight:900; letter-spacing:.05em; text-transform:uppercase;
  color:var(--teal-d); margin:15px 0 8px;
}
.snl-setup__sec:first-child{margin-top:4px}

.snl-setup__tiles{display:grid; grid-template-columns:repeat(2,1fr); gap:9px}
.snl-setup__tile{
  min-height:76px; padding:10px;
  display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:2px;
  background:var(--white); border:2px solid var(--mint); border-radius:16px;
  cursor:pointer; font-family:var(--ui); color:var(--navy); text-align:left;
}
.snl-setup__tile .n{font-size:calc(20px * var(--ss)); font-weight:900; line-height:1.14}
.snl-setup__tile .sb{font-size:calc(16px * var(--ss)); font-weight:600; line-height:1.2; opacity:.8}
.snl-setup__tile[aria-pressed="true"]{
  background:var(--mint-lt); border-color:var(--teal); box-shadow:inset 0 0 0 1.5px var(--teal);
}

.snl-setup__plr{display:flex; align-items:center; gap:10px; margin-bottom:9px}
.snl-setup__tok{
  position:relative; flex:0 0 auto; width:54px; height:54px; border-radius:16px;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--tok,var(--navy));
  border:2.5px solid var(--tok,var(--navy)); background:var(--white);
  box-shadow:var(--shadow-sm);
}
.snl-setup__tok>svg{width:32px; height:32px}
.snl-setup__tok .sw{
  position:absolute; right:-4px; bottom:-4px; width:20px; height:20px; border-radius:50%;
  background:var(--teal); color:var(--white); display:inline-flex; align-items:center; justify-content:center;
}
.snl-setup__tok .sw svg{width:13px; height:13px}
.snl-setup__tok:active{transform:scale(.95)}
.snl-setup__nm{
  flex:1 1 auto; min-width:0; min-height:54px; padding:10px 14px;
  border:1.5px solid var(--mint); border-radius:14px; background:var(--white);
  font-family:var(--ui); font-weight:700; font-size:calc(17px * var(--ss)); color:var(--navy);
}
.snl-setup__nm::placeholder{color:var(--muted); font-weight:600}
.snl-setup__bot{
  display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:14px;
  background:var(--mint-lt); font-size:calc(16px * var(--ss)); font-weight:600; line-height:1.3;
}
.snl-setup__bot .b{
  flex:0 0 auto; width:42px; height:42px; border-radius:14px; background:var(--white);
  border:2.5px solid var(--brass); color:var(--brass);
  display:inline-flex; align-items:center; justify-content:center;
}
.snl-setup__bot .b svg{width:26px; height:26px}
.snl-setup__hint{font-size:calc(16px * var(--ss)); font-weight:400; opacity:.78; line-height:1.34; margin-top:3px}

.snl-setup__segs{display:grid; grid-template-columns:1fr 1fr; gap:9px}
.snl-setup__seg{
  min-height:56px; border-radius:14px; border:2px solid var(--mint); background:var(--white);
  font-family:var(--ui); font-weight:800; font-size:calc(17px * var(--ss)); color:var(--navy); cursor:pointer;
}
.snl-setup__seg[aria-pressed="true"]{
  background:var(--mint-lt); border-color:var(--teal); box-shadow:inset 0 0 0 1.5px var(--teal);
}

.snl-setup__opt{
  width:100%; display:flex; align-items:center; gap:12px; text-align:left;
  min-height:66px; padding:11px 13px; margin-bottom:9px;
  background:var(--white); border:1.5px solid var(--mint); border-radius:16px;
  cursor:pointer; font-family:var(--ui); color:var(--navy);
}
.snl-setup__opt .tx{flex:1 1 auto; min-width:0}
.snl-setup__opt .tt{display:block; font-size:calc(17px * var(--ss)); font-weight:800; line-height:1.2}
.snl-setup__opt .ss{display:block; font-size:calc(16px * var(--ss)); font-weight:400; line-height:1.3; opacity:.8; margin-top:2px}
.snl-setup__box{
  flex:0 0 auto; width:34px; height:34px; border-radius:10px;
  border:2.5px solid var(--muted); background:var(--white);
  display:inline-flex; align-items:center; justify-content:center; color:var(--white);
}
.snl-setup__box svg{width:20px; height:20px; opacity:0}
.snl-setup__opt[aria-checked="true"]{border-color:var(--teal); background:var(--mint-lt)}
.snl-setup__opt[aria-checked="true"] .snl-setup__box{background:var(--teal); border-color:var(--teal)}
.snl-setup__opt[aria-checked="true"] .snl-setup__box svg{opacity:1}

.snl-setup__foot{
  flex:0 0 auto; padding:10px 14px calc(12px + var(--sab));
  border-top:1px solid rgba(189,233,228,.9); background:var(--cream);
}
.snl-setup__foot .snl-setup__go{animation:none; min-height:68px}

/* ── the equal-start line, held over the live board (§2 / §9 #3) ─────
   It is a TITLE CARD, not a wait, and it has exactly one job beyond saying its
   sentence: never for one frame to look like a page that has hung. Measured,
   the old version took 3.7 s from the tap on "Start playing" to a live board,
   and for the first 1.3 s of that there was nothing on screen but a dissolving
   card — the exact shape of a freeze. So:
     • the pane paints on the SAME tick as the tap, not two rAFs later;
     • the hold is capped at 2000 ms here, not 2600;
     • the countdown lives INSIDE the button, so the object that is counting
       and the object you tap to stop it are the same object;
     • two words under it say the whole screen is tappable.
   Tapping anywhere still skips; the button only makes that legible.
   'display:flex' here beats the 'hidden' attribute, so this pane MUST be told
   twice that it is not there: '[hidden]' kills the box, and the base rule is
   pointer-transparent so a mid-fade frame can never eat a tap on the card. */
.snl-setup__line{
  position:fixed; inset:0; z-index:5;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:0; padding:28px calc(26px + var(--sar)) 28px calc(26px + var(--sal));
  text-align:center; opacity:0; pointer-events:none;
  background:radial-gradient(128% 74% at 50% 44%,
    rgba(26,58,92,.90) 0%, rgba(22,49,79,.88) 56%, rgba(12,28,45,.93) 100%);
}
.snl-setup__line[hidden]{display:none!important}
.snl-setup__line.is-in{opacity:1; pointer-events:auto; transition:opacity ${timing.oneLineIn}ms ease-out}
.snl-setup__line.is-off{opacity:0; transition:opacity ${timing.oneLineOut}ms ease-out}
/* the brass keyline of the board, borrowed as the card's top rule */
.snl-setup__line .key{
  width:54px; height:2px; border-radius:2px; flex:0 0 auto;
  background:linear-gradient(90deg,rgba(255,245,214,0),var(--gold-lt),rgba(255,245,214,0));
  margin-bottom:20px;
}
/* The board is still lit under this, and its ivory tiles and navy numerals sit
   directly behind the words. The drop shadow is what keeps the sentence on ink
   rather than on square 87. */
.snl-setup__line .hd{
  font-family:var(--display); font-style:italic; font-weight:600;
  font-size:calc(clamp(24px,6.8vw,30px) * var(--ss)); line-height:1.26; color:var(--cream);
  max-width:15em; text-wrap:balance; text-shadow:0 2px 14px rgba(8,20,34,.72);
}
.snl-setup__line .bd{
  font-family:var(--display); font-style:italic; font-weight:400;
  font-size:calc(clamp(17px,4.6vw,19px) * var(--ss)); line-height:1.5; color:var(--cream);
  opacity:.92; max-width:21em; margin-top:14px; text-shadow:0 2px 12px rgba(8,20,34,.7);
}
/* The button IS the countdown. Ivory pill, navy label — the highest-contrast
   pair on this screen, so it is never sacrificed to the timer. The gold leaf
   fills a band along the pill's own under-edge instead, which is the same
   brass under-edge every raised object in this product already has: it simply
   arrives over the hold, so the beat visibly has a beginning and an end. */
.snl-setup__linego{
  position:relative; overflow:hidden;
  min-height:56px; min-width:194px; margin-top:26px; padding:0 32px;
  display:inline-flex; align-items:center; justify-content:center; gap:9px;
  background:var(--cream); color:var(--navy);
  border:0; border-radius:28px;
  font-family:var(--ui); font-weight:900; font-size:calc(19px * var(--ss)); line-height:1;
  box-shadow:0 10px 26px rgba(0,0,0,.34); cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.snl-setup__linego .fill{
  position:absolute; left:0; right:0; bottom:0; height:5px; z-index:0;
  background:var(--gold); transform:scaleX(0); transform-origin:left center;
}
.snl-setup__linego .lb,
.snl-setup__linego svg{position:relative; z-index:1}
.snl-setup__linego svg{width:17px; height:17px}
.snl-setup__linego:active{transform:translateY(2px); background:var(--gold-lt)}
.snl-setup__lineskip{
  margin-top:11px; font-family:var(--ui); font-weight:700; font-size:calc(16px * var(--ss));
  line-height:1.2; color:var(--gold-lt); opacity:.92;
  text-shadow:0 1px 8px rgba(8,20,34,.7);
}
.snl-setup__line :focus-visible{outline-color:var(--gold-lt)}

/* ── keyboard focus is branded, and it is never painted on first load.
      A UA outline sitting on the hero button in the very first frame reads
      as a half-finished form, not as a product. (§7.4) ── */
.snl-setup :focus-visible{outline:3px solid var(--teal-d); outline-offset:3px; border-radius:6px}
.snl-setup__card:focus,.snl-setup__sheet:focus{outline:none}

/* ── reduced motion: nothing moves, everything still happens (§9) ──── */
@media (prefers-reduced-motion:reduce){
  .snl-setup *,
  .snl-setup__sheet,.snl-setup__scrim,.snl-setup__line{transition-duration:1ms!important}
  .snl-setup__card{transform:none}
  .snl-setup__go{animation:none}
}
.snl-setup.is-still *,
.snl-setup.is-still .snl-setup__card{transition-duration:1ms!important; transform:none}
.snl-setup.is-still .snl-setup__go{animation:none}

/* ── shorter phones. Everything shrinks EXCEPT the hit rects and the type,
      which never goes below 16sp (§13). Things leave in order of how little
      they teach: the logo first (the Lora title still carries the brand),
      then the rule, and the four steps only on a genuinely tiny screen. ── */
@media (max-height:790px){
  .snl-setup__card{gap:8px}
  .snl-setup__steps{gap:5px}
}
@media (max-height:720px){
  .snl-setup__card{gap:7px; padding:12px 14px 11px}
  .snl-setup__logo{height:calc(34px * var(--ss))}
  .snl-setup__title{font-size:calc(29px * var(--ss))}
  .snl-setup__go{min-height:calc(74px * var(--ss))}
  .snl-setup__step .ic{flex-basis:30px; width:30px; height:30px; border-radius:9px}
  .snl-setup__step .ic>svg{width:19px; height:19px}
  .snl-setup__how{padding:8px 10px 9px}
  .snl-setup__how h2{margin-bottom:5px}
}
@media (max-height:700px){
  .snl-setup__card{gap:6px}
  .snl-setup__logo{display:none}
  .snl-setup__title{margin-top:0}
  .snl-setup__steps{gap:4px}
  .snl-setup__step .ic{flex-basis:28px; width:28px; height:28px}
  .snl-setup__step .ic>svg{width:18px; height:18px}
}
@media (max-height:600px){
  .snl-setup__rule{display:none}
  /* '.snl-setup__how' is NOT hidden here any more: it now lives inside the
     scrolling options sheet, so a short screen scrolls to it instead of
     losing the only how-to-play in the product. */
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   4. showSetup — the whole module.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Mount the first screen. Resolves once a game has been chosen.
 * @param  {HTMLElement} [root]  usually '#snl-overlay'
 * @return {Promise<{players:Array, options:object, lang:string}>}
 */
export function showSetup(root) {
  injectCss('setup', CSS);

  const host = root || document.getElementById('snl-overlay') || document.body;
  const live = document.getElementById('snl-live');

  /* ── state ─────────────────────────────────────────────────────── */
  const saved = loadPrefs() || {};
  const st = {
    count: clampInt(saved.count, 1, 4, 1),          // 1 = you + Mithu, the default
    names: fixNames(saved.names),
    tokenIdx: fixTokens(saved.tokenIdx),
    exactFinish: !!saved.exactFinish,               // §11 Poora hisaab
    workshop: !!saved.workshop,                     // §11 Workshop mode
    reduced: saved.reduced === undefined ? prefersReducedMotion() : !!saved.reduced,
    sheet: false,
    done: false,
  };
  if (st.reduced) setReducedMotion(true);

  /* ── DOM skeleton. Repainted in pieces so a name field never loses focus. ── */
  const wrap = document.createElement('div');
  wrap.className = 'snl-setup' + (st.reduced ? ' is-still' : '');
  wrap.innerHTML = `
    <div class="snl-setup__veil"></div>
    <div class="snl-setup__chips"></div>
    <div class="snl-setup__card" role="group" tabindex="-1"></div>
    <div class="snl-setup__scrim" data-act="sheet-close"></div>
    <div class="snl-setup__sheet" role="dialog" aria-modal="true" tabindex="-1"></div>
    <div class="snl-setup__line" hidden>
      <div class="key" aria-hidden="true"></div>
      <p class="hd"></p>
      <p class="bd"></p>
      <button type="button" class="snl-setup__linego">
        <i class="fill" aria-hidden="true"></i><span class="lb"></span>
      </button>
      <p class="snl-setup__lineskip" aria-hidden="true"></p>
    </div>`;

  const $chips = wrap.querySelector('.snl-setup__chips');
  const $card  = wrap.querySelector('.snl-setup__card');
  const $veil  = wrap.querySelector('.snl-setup__veil');
  const $scrim = wrap.querySelector('.snl-setup__scrim');
  const $sheet = wrap.querySelector('.snl-setup__sheet');
  const $line  = wrap.querySelector('.snl-setup__line');

  host.appendChild(wrap);

  /* ── paint ─────────────────────────────────────────────────────── */

  function paintChips() {
    const off = isMuted();
    $chips.innerHTML = `
      <button type="button" class="snl-setup__chip" data-act="lang"
        aria-label="${esc(t('hud.langToggleAria', { lang: LANG_NAMES[otherLang()] }))}">
        ${esc(langChipLabel())}
      </button>
      <button type="button" class="snl-setup__chip" data-act="mute"
        aria-pressed="${off ? 'true' : 'false'}"
        aria-label="${esc(off ? t('hud.unmute') : t('hud.mute'))}">
        ${off ? ICON.mute : ICON.sound}<span>${esc(off ? t('settings.off') : t('settings.on'))}</span>
      </button>`;
  }

  function paintCard() {
    $card.setAttribute('aria-label', t('setup.aria'));
    $card.innerHTML = `
      <img class="snl-setup__logo" src="${LOGO}" alt="${esc(t('app.byline'))}"
           width="1064" height="1176" decoding="async">
      <h1 class="snl-setup__title">${esc(t('app.name'))}</h1>
      <div class="snl-setup__rule" aria-hidden="true"></div>
      <p class="snl-setup__lead">${esc(s('lead'))}</p>

      <button type="button" class="snl-setup__go" data-act="start"
        aria-label="${esc(s('goMain') + '. ' + s('goSub'))}">
        <span class="av" aria-hidden="true">${PIECE.mithu}</span>
        <span class="tx">
          <span class="m">${esc(s('goMain'))}</span>
          <span class="sb">${esc(s('goSub'))}</span>
        </span>
      </button>

      <p class="snl-setup__or">${esc(s('orPick'))}</p>
      <div class="snl-setup__row">
        ${[2, 3, 4].map(n => `
          <button type="button" class="snl-setup__plaque" data-act="count" data-n="${n}"
            aria-label="${esc(t('setup.players' + n))}">
            <span class="n" aria-hidden="true">${n}</span>
            <span class="l" aria-hidden="true">${esc(s('people'))}</span>
          </button>`).join('')}
      </div>

      <button type="button" class="snl-setup__more" data-act="sheet-open">
        ${esc(s('more'))}${ICON.chev}
      </button>

      <p class="snl-setup__trust">${esc(s('trust'))}</p>`;
    /* No rules panel here. §2: the how-to-play "is never shown unprompted" —
       it lives at the foot of the options sheet, one tap away. */
  }

  const step = (n, icon, text) => `
    <div class="snl-setup__step">
      <span class="ic" aria-hidden="true"><b>${n}</b>${icon}</span>
      <p>${esc(text)}</p>
    </div>`;

  function paintSheet() {
    $sheet.setAttribute('aria-label', s('sheetTitle'));
    $sheet.innerHTML = `
      <div class="snl-setup__grip" aria-hidden="true"></div>
      <div class="snl-setup__sheet-hd">
        <h2>${esc(s('sheetTitle'))}</h2>
        <button type="button" class="snl-setup__x" data-act="sheet-close">${esc(t('settings.close'))}</button>
      </div>
      <div class="snl-setup__body">
        <p class="snl-setup__sec">${esc(s('secPeople'))}</p>
        <div class="snl-setup__tiles">
          ${tileHtml(1, s('solo'), s('soloSub'))}
          ${[2, 3, 4].map(n => tileHtml(n, n + ' ' + s('people'), '')).join('')}
        </div>

        <p class="snl-setup__sec">${esc(s('secNames'))}</p>
        ${playerRows()}
        ${st.count === 1 ? `
          <div class="snl-setup__bot">
            <span class="b" aria-hidden="true">${PIECE.mithu}</span>
            <span>${esc(s('botRow'))}</span>
          </div>` : ''}
        <p class="snl-setup__hint">${esc(t('setup.nameHint'))}</p>

        <p class="snl-setup__sec">${esc(s('secLang'))}</p>
        <div class="snl-setup__segs">
          ${segHtml('en', 'English')}
          ${segHtml('hi', 'हिंदी')}
        </div>

        <p class="snl-setup__sec">${esc(s('secOptions'))}</p>
        ${optHtml('exactFinish', t('settings.exactFinish'),     t('settings.exactFinishSub'))}
        ${optHtml('workshop',    t('settings.workshop'),        t('settings.workshopSub'))}
        ${optHtml('reduced',     t('settings.reducedMotion'),   t('settings.reducedMotionSub'))}
        <p class="snl-setup__hint">${esc(s('changeLater'))}</p>

        <p class="snl-setup__sec">${esc(s('howTitle'))}</p>
        <section class="snl-setup__how" aria-label="${esc(s('howTitle'))}">
          <div class="snl-setup__steps">
            ${step(1, ICON.dice,   s('how1'))}
            ${step(2, ICON.ladder, s('how2'))}
            ${step(3, ICON.snake,  s('how3'))}
            ${step(4, ICON.goal,   s('how4'))}
          </div>
        </section>
      </div>
      <div class="snl-setup__foot">
        <button type="button" class="snl-setup__go" data-act="play"
          aria-label="${esc(s('playNow') + '. ' + rosterLine())}">
          <span class="tx">
            <span class="m">${esc(s('playNow'))}</span>
            <span class="sb">${esc(rosterLine())}</span>
          </span>
        </button>
      </div>`;
  }

  /* ── html fragments ────────────────────────────────────────────── */

  const tileHtml = (n, title, sub) => `
    <button type="button" class="snl-setup__tile" data-act="sheet-count" data-n="${n}"
      aria-pressed="${st.count === n ? 'true' : 'false'}"
      aria-label="${esc(n === 1 ? t('setup.withMithu') : t('setup.players' + n))}">
      <span class="n" aria-hidden="true">${esc(title)}</span>
      ${sub ? `<span class="sb" aria-hidden="true">${esc(sub)}</span>` : ''}
    </button>`;

  const segHtml = (code, label) => `
    <button type="button" class="snl-setup__seg" data-act="lang-set" data-lang="${code}"
      aria-pressed="${getLang() === code ? 'true' : 'false'}">${esc(label)}</button>`;

  const optHtml = (key, title, sub) => `
    <button type="button" class="snl-setup__opt" role="switch" data-act="opt" data-key="${key}"
      aria-checked="${st[key] ? 'true' : 'false'}">
      <span class="snl-setup__box" aria-hidden="true">${ICON.tick}</span>
      <span class="tx"><span class="tt">${esc(title)}</span><span class="ss">${esc(sub)}</span></span>
    </button>`;

  function playerRows() {
    let out = '';
    for (let i = 0; i < humanCount(); i++) {
      const tk = TOK.players[st.tokenIdx[i]];
      out += `
        <div class="snl-setup__plr">
          <button type="button" class="snl-setup__tok" data-act="token" data-i="${i}"
            style="--tok:${tk.css}"
            aria-label="${esc(s('tokenAria', { name: nameOf(i), token: t('token.' + tk.key) }))}">
            ${PIECE[tk.key]}
            <span class="sw" aria-hidden="true">${ICON.swap}</span>
          </button>
          <input class="snl-setup__nm" type="text" inputmode="text" autocomplete="off"
            spellcheck="false" maxlength="14" data-i="${i}"
            value="${esc(nameOf(i))}" placeholder="${esc(defaultNames()[i])}"
            aria-label="${esc(s('nameAria', { n: i + 1 }))}">
        </div>`;
    }
    return out;
  }

  const rosterLine = () => buildPlayers().map(p => p.name).join(' · ');

  /* ── players & options ─────────────────────────────────────────── */

  const humanCount = () => (st.count === 1 ? 1 : st.count);

  function nameOf(i) {
    const n = (st.names[i] || '').trim();
    return n || defaultNames()[i];
  }

  function buildPlayers() {
    const list = [];
    for (let i = 0; i < humanCount(); i++) {
      const tk = TOK.players[st.tokenIdx[i]];
      list.push({
        id: 'p' + (i + 1), name: nameOf(i), token: tk.key, isBot: false,
        color: tk.color, colorD: tk.colorD, css: tk.css,
        emoji: tk.emoji, label: tk.label, hue: tk.hue, material: tk.material,
      });
    }
    if (st.count === 1) {
      const b = TOK.bot;
      list.push({
        id: b.id, name: t('setup.mithuName'), token: b.key, isBot: true,
        color: b.color, colorD: b.colorD, css: b.css,
        emoji: b.emoji, label: b.label, hue: b.hue, material: b.material,
      });
    }
    return list;
  }

  function buildOptions() {
    return {
      /* rules.js options — spread over rules.OPTIONS by newGame() */
      exactFinish:         st.exactFinish,
      mercyAfter:          RULES.mercyAfter,
      sixExtraTurn:        RULES.sixExtraTurn,
      maxConsecutiveSixes: RULES.maxConsecutiveSixes,
      jhatka:              RULES.jhatka,
      shield:              RULES.shield,
      /* session options — game.js / ui.js read these; rules.js ignores them */
      workshop:        st.workshop,
      reducedMotion:   st.reduced,
      turnTimer:       st.workshop ? GAME.workshopMode.turnTimer : true,
      cardAutoAdvance: st.workshop ? GAME.workshopMode.cardAutoAdvance : true,
      cameraLocked:    st.workshop ? GAME.workshopMode.cameraLocked : false,
      muted:           isMuted(),
      solo:            st.count === 1,
      seed:            (Date.now() ^ ((Math.random() * 0xffffffff) >>> 0)) >>> 0,
    };
  }

  /* ── behaviour ─────────────────────────────────────────────────── */

  function announce(msg) {
    if (!live || !msg) return;
    live.textContent = '';
    setTimeout(() => { try { live.textContent = msg; } catch { /* gone */ } }, 30);
  }

  function haptic() {
    try { if (navigator.vibrate) navigator.vibrate(timing.diceHaptic); } catch { /* unsupported */ }
  }

  function refocus(container, selector) {
    const n = container.querySelector(selector);
    try { if (n) n.focus({ preventScroll: true }); } catch { /* older browsers */ }
  }

  function openSheet() {
    st.sheet = true;
    paintSheet();
    $scrim.classList.add('is-open');
    $sheet.classList.add('is-open');
    try { $sheet.focus({ preventScroll: true }); } catch { /* fine */ }
    announce(s('sheetTitle'));
  }

  function closeSheet(giveBackFocus = true) {
    if (!st.sheet) return;
    st.sheet = false;
    $scrim.classList.remove('is-open');
    $sheet.classList.remove('is-open');
    savePrefs(st);
    paintCard();
    if (giveBackFocus) refocus($card, '.snl-setup__more');
  }

  /* One tap takes the next piece. If somebody already holds it the two simply
     swap, so the tap always does something visible even at four players — and
     no two people can ever end up on the same silhouette. Never a menu. */
  function cycleToken(i) {
    const n = TOK.players.length;
    const next = (st.tokenIdx[i] + 1) % n;
    const holder = st.tokenIdx.findIndex((v, k) => k !== i && k < humanCount() && v === next);
    if (holder >= 0) st.tokenIdx[holder] = st.tokenIdx[i];
    st.tokenIdx[i] = next;
    ensureDistinctTokens();
    savePrefs(st);
    paintSheet();
    const tk = TOK.players[st.tokenIdx[i]];
    announce(t('token.aria', { name: nameOf(i), token: t('token.' + tk.key) }));
    refocus($sheet, '.snl-setup__tok[data-i="' + i + '"]');
  }

  /* ── the exit: TAP 1 → the one line → the game ─────────────────── */

  let resolveOuter;
  const done = new Promise(res => { resolveOuter = res; });

  async function begin(count) {
    if (st.done) return;
    st.done = true;
    st.count = clampInt(count, 1, 4, 1);
    ensureDistinctTokens();

    /* §2: initAudio() is called HERE, on this real gesture, before anything
       else. It is the one thing in this module that cannot be moved. */
    initAudio();
    sfx.click();
    haptic();
    savePrefs(st);

    const players = buildPlayers();
    const options = buildOptions();
    const lang = getLang();

    announce(players.map(p => p.name).join(', ') + '. ' + t('hud.turnOf', { name: players[0].name }));

    if (st.sheet) closeSheet(false);
    wrap.classList.add('is-out');
    const still = st.reduced || prefersReducedMotion();

    /* The title card is armed and starts rising on the SAME frame the setup
       card starts leaving, so the two crossfade. Awaiting the card out first
       bought half a second of an empty screen, which is the single thing that
       made this beat read as a hang. */
    const line = oneLine(still);

    await wait(still ? 60 : timing.setupOut);
    $card.remove(); $chips.remove(); $sheet.remove(); $scrim.remove(); $veil.remove();

    await line;

    cleanup();
    resolveOuter({ players, options, lang });
  }

  /* The equal-start line. §2: held 2600 ms over the live board, said once for
     the life of the install, and a tap anywhere kills it (§9 #3, amendment 10).

     Presented as a TITLE CARD, not as a wait — and the measurement that made
     that necessary is in the CSS comment above: 3.7 s tap-to-board, of which
     the first 1.3 s was a dissolving card and nothing else. Three things fix
     that, in order of how much they matter:

       1. The pane is on screen on the SAME tick as the tap. It used to await
          two rAFs, and under a 4x CPU throttle each of those cost ~90 ms of
          the fallback timer before a 300 ms fade even started. Now: unhide,
          force one layout read, add 'is-in' — the transition still runs,
          because the reflow between the two guarantees a start value.
       2. The hold is capped at 2000 ms here. config.js still says 2600; this
          module deliberately spends less of the player's very first minute on
          a sentence she did not ask for.
       3. The countdown is inside the button. The thing that is counting and
          the thing you tap to stop it are one object, with two words under it
          saying the rest of the screen works too.

     Tapping anywhere still skips. */
  async function oneLine(still) {
    if (seenOneLine()) return;
    markOneLine();

    const full = t('setup.equalStart');
    /* Split after the first full stop — Devanagari danda included, so the
       Hindi line breaks in the same place its author wrote it. */
    const cut  = full.search(/[.\u0964](\s|$)/);
    const head = cut > -1 ? full.slice(0, cut + 1).trim() : full;
    const body = cut > -1 ? full.slice(cut + 1).trim() : '';

    const $hd   = $line.querySelector('.hd');
    const $bd   = $line.querySelector('.bd');
    const $go   = $line.querySelector('.snl-setup__linego');
    const $fill = $go.querySelector('.fill');
    const $lb   = $go.querySelector('.lb');
    const $hint = $line.querySelector('.snl-setup__lineskip');

    $hd.textContent = head;
    $bd.textContent = body;
    $bd.hidden = !body;
    $lb.textContent = s('lineGo');
    $lb.insertAdjacentHTML('afterend', ICON.chev);
    $go.setAttribute('aria-label', s('lineGoAria'));
    $hint.textContent = s('lineSkip');
    announce(full);

    let skip;
    const skipped = new Promise(res => { skip = res; });
    /* On 'wrap', not '$line': the pane is pointer-transparent until 'is-in'
       lands, and a tap in that two-frame window must still skip. */
    const onSkipTap = () => skip();
    wrap.addEventListener('pointerdown', onSkipTap, { once: true });
    $go.addEventListener('click', onSkipTap);
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); skip(); }
    };
    window.addEventListener('keydown', onKey);

    /* Capped locally. config.js's 2600 is the design's stated hold; measured
       end to end it put a 3.7 s pause between the only tap on the screen and a
       playable board, which is the single thing that read as a hang. */
    const hold = still ? 1200 : Math.min(timing.oneLineHold, 2000);

    /* Same tick as the tap: unhide, read layout to lock in the opacity:0
       starting value, then flip the class. No rAF round trip, so nothing is
       hostage to a throttled frame budget. */
    $line.hidden = false;
    void $line.offsetHeight;
    $line.classList.add('is-in');
    /* The drain starts with the fade, not after it, so the button is already
       filling by the time the words are readable. Reduced motion pins every
       transition in this module to 1 ms, which simply parks the fill full:
       a static gold under-edge, no countdown, nothing lost. */
    $fill.style.transition = 'transform ' + (timing.oneLineIn + hold) + 'ms linear';
    void $fill.offsetHeight;
    $fill.style.transform = 'scaleX(1)';
    /* Put the keyboard and the screen reader on the one control here. After a
       touch tap Chrome does not treat programmatic focus as :focus-visible, so
       the person who tapped never sees a ring. */
    try { $go.focus({ preventScroll: true }); } catch { /* older browsers */ }

    /* With reduced motion there is no fade to sit through, so do not bill the
       player for one: the card is fully painted on the first frame. */
    await Promise.race([wait((still ? 0 : timing.oneLineIn) + hold), skipped]);

    window.removeEventListener('keydown', onKey);
    $go.removeEventListener('click', onSkipTap);
    /* Disarm the skip tap. 'once:true' only removes it once it FIRES — when the
       line times out on its own it stays armed forever and silently eats the
       player's first real tap, which on touch is the tap on "Start playing". */
    wrap.removeEventListener('pointerdown', onSkipTap);
    /* 'wrap' is a full-bleed fixed layer and it outlives this fade by the whole
       oneLineOut. With the skip listener gone it would spend that time eating
       taps on a board that is visibly live underneath — including the very
       first tap on Roll. Make it glass the instant it stops being useful. */
    wrap.style.pointerEvents = 'none';
    $line.classList.remove('is-in');
    $line.classList.add('is-off');
    await wait(still ? 40 : timing.oneLineOut);
  }

  /* ── one delegated handler for the whole screen ────────────────── */

  function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn || !wrap.contains(btn)) return;
    const act = btn.dataset.act;

    /* Any tap here is a real gesture — take it for the audio context. */
    initAudio();

    switch (act) {
      case 'start':       begin(1); break;
      case 'count':       begin(+btn.dataset.n || 2); break;
      case 'play':        begin(st.count); break;

      case 'sheet-open':  sfx.click(); openSheet(); break;
      case 'sheet-close': sfx.click(); closeSheet(); break;

      case 'sheet-count':
        sfx.click();
        st.count = clampInt(+btn.dataset.n, 1, 4, 1);
        ensureDistinctTokens();
        savePrefs(st);
        paintSheet();
        refocus($sheet, '.snl-setup__tile[data-n="' + st.count + '"]');
        break;

      case 'token':       sfx.click(); cycleToken(+btn.dataset.i || 0); break;

      case 'lang':        sfx.click(); setLang(otherLang()); break;
      case 'lang-set':    sfx.click(); setLang(btn.dataset.lang); break;

      case 'mute': {
        const off = !isMuted();
        setMuted(off);
        if (!off) sfx.click();
        paintChips();
        announce(off ? t('hud.soundIsOff') : t('hud.soundIsOn'));
        refocus($chips, '[data-act="mute"]');
        break;
      }

      case 'opt': {
        const k = btn.dataset.key;
        st[k] = !st[k];
        if (k === 'reduced') {
          setReducedMotion(st.reduced);
          wrap.classList.toggle('is-still', st.reduced);
        }
        sfx.click();
        savePrefs(st);
        paintSheet();
        refocus($sheet, '[data-key="' + k + '"]');
        break;
      }
      default: break;
    }
  }

  function onInput(e) {
    const f = e.target.closest('.snl-setup__nm');
    if (!f) return;
    st.names[+f.dataset.i || 0] = f.value.slice(0, 14);
  }

  /* Nobody must ever have to clear a field before typing their own name. */
  function onFocusIn(e) {
    const f = e.target.closest('.snl-setup__nm');
    if (!f) return;
    try { f.select(); } catch { /* fine */ }
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && st.sheet) { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab' || !st.sheet) return;
    /* keep the keyboard inside the sheet while it is open */
    const items = [...$sheet.querySelectorAll('button,input,[tabindex]:not([tabindex="-1"])')]
      .filter(n => !n.disabled && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === $sheet)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  const offLang = onLangChange(() => {
    /* A stored name that is only last session's default is not a name — drop
       it, so switching to Hindi does not leave "Priya" sitting in a Hindi row. */
    st.names = st.names.map(n => (isDefaultName(n) ? '' : n));
    paintChips(); paintCard();
    if (st.sheet) paintSheet();
    announce(t('a11y.langChanged', { lang: LANG_NAMES[getLang()] }));
  });

  wrap.addEventListener('click', onClick);
  wrap.addEventListener('input', onInput);
  wrap.addEventListener('focusin', onFocusIn);
  window.addEventListener('keydown', onKeydown);

  function cleanup() {
    wrap.removeEventListener('click', onClick);
    wrap.removeEventListener('input', onInput);
    wrap.removeEventListener('focusin', onFocusIn);
    window.removeEventListener('keydown', onKeydown);
    offLang();
    wrap.remove();
  }

  function ensureDistinctTokens() {
    const used = new Set();
    for (let i = 0; i < 4; i++) {
      let v = st.tokenIdx[i];
      while (used.has(v)) v = (v + 1) % TOK.players.length;
      st.tokenIdx[i] = v; used.add(v);
    }
  }

  /* ── go ────────────────────────────────────────────────────────── */
  paintChips();
  paintCard();
  nextFrame().then(() => {
    wrap.classList.add('is-in');
    /* Focus the card, not the hero button. Focusing a button before anybody has
       touched anything makes Chrome paint its default :focus-visible outline on
       the primary call to action in the very first frame — it reads as a
       half-finished form. The card announces its own label, and one Tab still
       lands on "Start playing". */
    try { $card.focus({ preventScroll: true }); } catch { /* older browsers */ }
  });
  announce(t('app.name') + '. ' + s('lead') + ' ' + s('goMain') + '. ' + s('goSub'));

  return done;
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. pure helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function clampInt(v, lo, hi, dflt) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? clamp(n, lo, hi) : dflt;
}

function isDefaultName(n) {
  if (!n) return true;
  const v = String(n).trim();
  return LOCAL.en.defaults.includes(v) || LOCAL.hi.defaults.includes(v);
}

function fixNames(arr) {
  const out = ['', '', '', ''];
  if (Array.isArray(arr)) {
    for (let i = 0; i < 4; i++) if (typeof arr[i] === 'string') out[i] = arr[i].slice(0, 14);
  }
  return out;
}

function fixTokens(arr) {
  const n = TOK.players.length;
  const out = [], used = new Set();
  for (let i = 0; i < 4; i++) {
    let v = Array.isArray(arr) && Number.isFinite(+arr[i]) ? ((+arr[i] % n) + n) % n : i % n;
    while (used.has(v)) v = (v + 1) % n;
    used.add(v); out.push(v);
  }
  return out;
}

/* The storage keys this screen owns, exported so game.js and any probe read
   the same names rather than re-typing string literals. 'save' is game.js's. */
export const SETUP_KEYS = Object.freeze({ prefs: KEY, oneLine: LINE_KEY, save: GAME.storageKey });
