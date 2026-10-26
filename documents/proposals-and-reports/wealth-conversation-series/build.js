// The Wealth Conversation — five-module workshop series proposal deck.
//
// Builds "IFM Wealth Conversation Series — Proposal.pptx" one folder up, from the copy in
// content.js. Run prep_assets.py first if a photo changes, and icons/render-icons.js if an
// icon changes. pptxgenjs comes from deck-build/node_modules:
//
//   NODE_PATH="../../../deck-build/node_modules" node build.js
//
// Brand: IFM Brand Guidelines 2026 — §3 palette, §4 Lora headings + Nunito body,
// §6 radius hierarchy, §24 art direction (real classrooms, rounded outline icons with
// brand-colour accents, alternating section backgrounds, a hero moment every slide or two).
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const { applyTheme } = require('./apply_theme.js');
const COPY = require('./content.js');

const HERE = __dirname;
// WC_OUT renders a preview somewhere else, so a draft slide never touches the real deck.
const OUT = process.env.WC_OUT || path.join(HERE, '..', 'IFM Wealth Conversation Series — Proposal.pptx');
const A = f => path.join(HERE, 'assets', f);
const ICON = (id, v = 'light') => path.join(HERE, 'icons', 'png', `${id}-${v}.png`);

// §3 palette. ICE and MINT_TXT are light tints of navy/mint for text on navy.
const C = {
  navy: '1A3A5C', navyLt: '264D78', navyDeep: '12293F', teal: '2A9D8F', muted: '5A7D8A',
  cream: 'F7FAF9', white: 'FFFFFF', mint: 'BDE9E4', mintLt: 'E0F3F0', gold: 'C9A84C',
  goldLt: 'F5F0E0', ice: 'D3E2EC', mintTxt: '8FD9CE',
};
const HEAD = 'Lora';
const BODY = 'Nunito';
const W = 13.333, H = 7.5, M = 0.6;   // LAYOUT_WIDE, outer margin

const THEME = {
  name: 'Investing for Mummies',
  colors: {
    dk1: C.navy, lt1: C.white, dk2: C.navyLt, lt2: C.cream,
    accent1: C.teal, accent2: C.gold, accent3: C.navy, accent4: C.muted, accent5: C.mint, accent6: C.mintLt,
    hlink: C.teal, folHlink: C.muted,
  },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
pres.author = 'Investing for Mummies';
pres.company = 'Investing for Mummies';
pres.title = 'The Wealth Conversation — Workshop Series Proposal';
pres.subject = 'Proposal for The Wealth Conversation, a five-module workshop series';
const SH = pres.shapes;

// ---------- helpers ----------
const missing = new Set();
function T(s, text, o) {
  s.addText(text, Object.assign({ fontFace: BODY, color: C.navy, margin: 0, isTextBox: true, valign: 'top' }, o));
}
// Join the last two words with a no-break space so no line ends on one stranded word.
const keep = t => t.replace(/ (\S+)$/, '\u00A0$1');
// Narrow columns: only glue a short last word ("life cover", "they do"); longer pairs force bad breaks.
const keepShort = t => t.replace(/ (\S+) (\S{1,5})$/, (m, a, b) => (a.length + b.length < 13 ? ` ${a}\u00A0${b}` : m));
function label(s, text, x, y, w, color) {
  T(s, text, { x, y, w, h: 0.28, fontSize: 10.5, bold: true, color, charSpacing: 3, valign: 'middle' });
}
const shadow = () => ({ type: 'outer', color: C.navy, opacity: 0.10, blur: 10, offset: 2, angle: 90 });
function card(s, x, y, w, h, o = {}) {
  s.addShape(SH.ROUNDED_RECTANGLE, Object.assign({
    x, y, w, h, rectRadius: 0.15, fill: { color: C.white }, line: { type: 'none' },
  }, o));
}
function icon(s, id, variant, x, y, size) {
  const p = ICON(id, variant);
  if (!fs.existsSync(p)) { missing.add(`${id}-${variant}`); return; }
  s.addImage({ path: p, x, y, w: size, h: size, altText: `${id.replace(/^[a-z0-9]+-/, '').replace(/-/g, ' ')} icon` });
}
// Icon centred in a filled circle — the deck's repeated motif.
function bubble(s, id, variant, x, y, d, fill, o = {}) {
  s.addShape(SH.OVAL, Object.assign({ x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' } }, o));
  const k = o.iconScale || 0.62;
  icon(s, id, variant, x + d * (1 - k) / 2, y + d * (1 - k) / 2, d * k);
}
function pill(s, text, x, y, w, h, fill, color, o = {}) {
  s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: fill }, line: o.line || { type: 'none' } });
  T(s, text, Object.assign({ x, y, w, h, align: 'center', valign: 'middle', fontSize: 11.5, bold: true, color }, o.text || {}));
}
function decoCircles(s, spots) {
  for (const [x, y, d, t] of spots) {
    s.addShape(SH.OVAL, { x, y, w: d, h: d, fill: { color: C.navyLt, transparency: t || 45 }, line: { type: 'none' } });
  }
}

// ---------- layouts (one per slide frame) ----------
const footer = (dark, x0 = M) => [
  { text: { text: 'THE WEALTH CONVERSATION  ·  INVESTING FOR MUMMIES', options: {
    x: x0, y: 7.06, w: 6.5, h: 0.24, margin: 0, fontFace: BODY, fontSize: 7.5, bold: true, charSpacing: 1.5,
    color: dark ? '9DB8CC' : C.muted } } },
];
const slideNo = (dark, right = W - M) => ({ x: right - 0.6, y: 7.11, w: 0.6, h: 0.24, margin: 0, fontFace: BODY, fontSize: 8, bold: true,
  color: dark ? '9DB8CC' : C.muted, align: 'right' });
const titlePh = (o) => ({ placeholder: { options: Object.assign({
  name: 'title', type: 'title', x: M, y: 0.72, w: 10.2, h: 0.72, margin: 0, fontFace: HEAD, fontSize: 32, bold: true,
  color: C.navy, valign: 'top', align: 'left' }, o), text: '' } });

pres.defineSlideMaster({ title: 'IFM Cover', background: { color: C.navy },
  objects: [titlePh({ x: M, y: 2.28, w: 6.0, h: 1.95, fontSize: 56, color: C.white, valign: 'top' })] });
pres.defineSlideMaster({ title: 'IFM Light', background: { color: C.white },
  objects: [...footer(false), { image: { path: A('logo-colour.png'), x: W - M - 1.3, y: 0.4, w: 1.3, h: 0.524, altText: 'Investing for Mummies logo' } }, titlePh({})],
  slideNumber: slideNo(false) });
pres.defineSlideMaster({ title: 'IFM Cream', background: { color: C.cream },
  objects: [...footer(false), { image: { path: A('logo-colour.png'), x: W - M - 1.3, y: 0.4, w: 1.3, h: 0.524, altText: 'Investing for Mummies logo' } }, titlePh({})],
  slideNumber: slideNo(false) });
pres.defineSlideMaster({ title: 'IFM Mint', background: { color: C.mintLt },
  objects: [...footer(false), { image: { path: A('logo-colour.png'), x: W - M - 1.3, y: 0.4, w: 1.3, h: 0.524, altText: 'Investing for Mummies logo' } }, titlePh({})],
  slideNumber: slideNo(false) });
pres.defineSlideMaster({ title: 'IFM Dark', background: { color: C.navy },
  objects: [...footer(true), { image: { path: A('logo-white.png'), x: W - M - 1.3, y: 0.4, w: 1.3, h: 0.524, altText: 'Investing for Mummies logo' } },
    titlePh({ color: C.white })],
  slideNumber: slideNo(true) });
pres.defineSlideMaster({ title: 'IFM Module', background: { color: C.white },
  objects: [
    { rect: { x: 0, y: 0, w: 4.2, h: H, fill: { color: C.navy } } },
    ...footer(false, 4.7),
    titlePh({ x: 0.5, y: 1.55, w: 3.5, h: 0.95, fontSize: 22.5, color: C.white, valign: 'bottom' }),
  ],
  slideNumber: slideNo(false, W - M + 0.1) });
pres.defineSlideMaster({ title: 'IFM Closing', background: { color: C.navy }, objects: [] });

let s;

// =====================================================================
// 1. COVER
// =====================================================================
pres.addSection({ title: 'Introduction' });
s = pres.addSlide({ masterName: 'IFM Cover', sectionTitle: 'Introduction' });
decoCircles(s, [[-1.9, 4.9, 5.0, 50], [10.9, -2.4, 4.8, 50]]);
s.addImage({ path: A('logo-white.png'), x: M, y: 0.5, w: 1.8, h: 1.8 / 2.479, altText: 'Investing for Mummies logo' });
label(s, COPY.cover.eyebrow, M + 0.02, 1.9, 5.6, C.mint);
s.addText([
  { text: 'The Wealth', options: { breakLine: true } },
  { text: 'Conversation', options: { italic: true, color: C.mintTxt } },
], { placeholder: 'title' });
T(s, COPY.cover.tagline, { x: M + 0.02, y: 4.32, w: 5.4, h: 0.85, fontSize: 19, color: C.ice, lineSpacingMultiple: 1.1 });
s.addImage({ path: A('cover-main.png'), x: W - M - 5.9, y: 0.75, w: 5.9, h: 4.05, altText: 'Hiral Goel teaching a full corporate workshop room' });
s.addImage({ path: A('cover-inset.png'), x: 6.25, y: 3.3, w: 2.05, h: 2.6, altText: 'Hiral explaining market orders and limit orders at a corporate workshop' });
COPY.modules.forEach((m, i) => {
  const x = M + i * 2.455, y = 6.25, w = 2.3, h = 0.72;
  s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: C.navyLt },
    line: { color: C.white, transparency: 75, width: 0.75 } });
  T(s, m.num, { x: x + 0.14, y, w: 0.46, h, fontFace: HEAD, fontSize: 16, bold: true, color: C.gold, valign: 'middle' });
  T(s, m.title, { x: x + 0.6, y, w: w - 0.7, h, fontSize: 10.5, bold: true, color: C.white, valign: 'middle', lineSpacingMultiple: 0.95 });
});

// =====================================================================
// 2. WHY THE WEALTH CONVERSATION?
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Light', sectionTitle: 'Introduction' });
const why = COPY.why;
label(s, why.eyebrow, M, 0.42, 6, C.teal);
s.addText(why.title, { placeholder: 'title' });
T(s, why.lead, { x: M, y: 1.72, w: 6.0, h: 1.45, fontFace: HEAD, fontSize: 18.5, lineSpacingMultiple: 1.12 });
T(s, why.turn, { x: M, y: 3.25, w: 6.0, h: 0.42, fontSize: 15.5, bold: true, color: C.teal });
T(s, why.body, { x: M, y: 3.75, w: 6.0, h: 1.3, fontSize: 12.5, lineSpacingMultiple: 1.15 });
card(s, M, 5.22, 6.0, 1.58, { fill: { color: C.mintLt } });
bubble(s, 'q-target', 'gold', M + 0.22, 5.22 + (1.58 - 0.62) / 2, 0.62, C.white);
T(s, why.aim, { x: M + 1.08, y: 5.42, w: 4.72, h: 1.2, fontFace: HEAD, fontSize: 14.5, italic: true, valign: 'middle', lineSpacingMultiple: 1.12 });
{ // the intersection: six overlapping circles around "Money decisions"
  const cx = 9.85, cy = 4.15, off = 1.0, r = 1.17, fills = [C.teal, C.navyLt, C.gold];
  why.forces.forEach((f, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    const x = cx + off * Math.cos(a), y = cy + off * Math.sin(a);
    s.addShape(SH.OVAL, { x: x - r, y: y - r, w: 2 * r, h: 2 * r, fill: { color: fills[i % 3], transparency: 82 },
      line: { color: fills[i % 3], transparency: 35, width: 1.25 } });
  });
  why.forces.forEach((f, i) => {
    const a = (-90 + i * 60) * Math.PI / 180;
    const lx = cx + 1.68 * Math.cos(a), ly = cy + 1.68 * Math.sin(a);
    const pw = 0.24 + f.length * 0.105;
    pill(s, f, lx - pw / 2, ly - 0.18, pw, 0.36, C.white, C.navy, { text: { fontSize: 12.5 } });
  });
  s.addShape(SH.OVAL, { x: cx - 0.8, y: cy - 0.8, w: 1.6, h: 1.6, fill: { color: C.navy }, line: { color: C.white, width: 2.5 }, shadow: shadow() });
  T(s, why.centre, { x: cx - 0.72, y: cy - 0.5, w: 1.44, h: 1.0, fontFace: HEAD, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle' });
}

// =====================================================================
// 2b. WHO IT'S FOR — draft, only built when COPY.audience.include is true (or WC_AUDIENCE=1)
// =====================================================================
if (COPY.audience.include || process.env.WC_AUDIENCE) {
  s = pres.addSlide({ masterName: 'IFM Cream', sectionTitle: 'Introduction' });
  const au = COPY.audience;
  label(s, au.eyebrow, M, 0.42, 6, C.teal);
  s.addText(au.title, { placeholder: 'title' });
  // left: the two audiences
  const LW = 4.55;
  au.who.forEach((w, i) => {
    const h = (6.81 - 1.72 - 0.2) / 2, y = 1.72 + i * (h + 0.2);
    card(s, M, y, LW, h, { shadow: shadow(), fill: { color: i ? C.white : C.mintLt } });
    bubble(s, w.icon, 'teal', M + 0.28, y + 0.28, 0.84, C.teal);
    T(s, w.label, { x: M + 1.3, y: y + 0.28, w: LW - 1.42, h: 0.84, fontFace: HEAD, fontSize: 18, bold: true, valign: 'middle' });
    T(s, keep(w.text), { x: M + 0.3, y: y + 1.25, w: LW - 0.5, h: h - 1.35, fontSize: 14.5, lineSpacingMultiple: 1.08 });
  });
  // right: how deep the workshops go, one card per point
  const RX = M + LW + 0.4, RW = W - M - RX;
  T(s, au.deepLead, { x: RX, y: 1.66, w: RW, h: 0.7, fontFace: HEAD, fontSize: 17, bold: true, valign: 'top', lineSpacingMultiple: 1.05 });
  au.deep.forEach((d, i) => {
    const ch = 0.8, y = 2.42 + i * (ch + 0.12);
    card(s, RX, y, RW, ch, { shadow: shadow() });
    bubble(s, d.icon, 'teal', RX + 0.14, y + 0.1, ch - 0.2, C.teal);
    T(s, keep(d.text), { x: RX + 0.92, y: y + 0.04, w: RW - 1.08, h: ch - 0.08, fontSize: 14.5, valign: 'middle', lineSpacingMultiple: 1.05 });
  });
  // the visual promise, as a navy band
  const by = 6.1, bh = 0.71;
  s.addShape(SH.ROUNDED_RECTANGLE, { x: RX, y: by, w: RW, h: bh, rectRadius: 0.14, fill: { color: C.navy }, line: { type: 'none' } });
  bubble(s, au.visual.icon, 'teal', RX + 0.16, by + (bh - 0.52) / 2, 0.52, C.teal);
  T(s, au.visual.runs.map(([t, hl]) => ({ text: t, options: hl ? { color: C.gold, bold: true } : {} })),
    { x: RX + 0.86, y: by + 0.04, w: RW - 1.0, h: bh - 0.08, fontSize: 14, color: C.white, valign: 'middle', lineSpacingMultiple: 1.08 });
}

// =====================================================================
// 3. THE QUESTIONS THAT MATTER
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Dark', sectionTitle: 'Introduction' });
const q = COPY.questions;
label(s, q.eyebrow, M, 0.42, 6, C.mint);
s.addText(q.title, { placeholder: 'title' });
T(s, q.intro, { x: M, y: 1.52, w: 10.4, h: 0.5, fontSize: 15, color: C.ice });
{
  // four standard cards and a wider gold one for the question the series builds to
  const g = 0.155, wHi = 3.05, wStd = (W - 2 * M - wHi - 4 * g) / 4;
  let x = M;
  q.items.forEach((it, i) => {
    // icon top-left, number top-right, question anchored to a shared baseline at the foot of the card
    const hi = i === q.items.length - 1, w = hi ? wHi : wStd, y = 2.38, h = 4.3;
    s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.15,
      fill: hi ? { color: C.gold } : { color: C.white, transparency: 91 },
      line: hi ? { type: 'none' } : { color: C.white, transparency: 78, width: 0.75 } });
    bubble(s, it.icon, 'light', x + 0.24, y + 0.26, 0.82, hi ? C.white : C.mintLt);
    T(s, String(i + 1).padStart(2, '0'), { x: x + w - 1.04, y: y + 0.24, w: 0.8, h: 0.6, fontFace: HEAD, fontSize: 30, bold: true,
      align: 'right', color: hi ? C.navy : C.mintTxt });
    T(s, keep(it.text), { x: x + 0.24, y: y + 1.4, w: w - 0.42, h: h - 1.68, fontFace: HEAD, fontSize: 21, italic: true, valign: 'bottom',
      color: hi ? C.navy : C.white, lineSpacingMultiple: 1.05 });
    x += w + g;
  });
}

// =====================================================================
// 4. THE LEARNING EXPERIENCE
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Light', sectionTitle: 'Introduction' });
const le = COPY.learning;
label(s, le.eyebrow, M, 0.42, 6, C.teal);
s.addText(le.title, { placeholder: 'title' });
s.addImage({ path: A('learn-a.png'), x: M, y: 1.78, w: 3.0, h: 4.0, altText: 'A participant answering a live in-class game on her phone' });
s.addImage({ path: A('learn-b.png'), x: M + 3.18, y: 1.78, w: 2.45, h: 4.0, altText: 'Handwritten notes in a participant’s workbook' });
T(s, le.chipsLabel, { x: M, y: 6.0, w: 3.0, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 2.5, color: C.teal });
{
  let x = M;
  le.chips.forEach(([c, w]) => { pill(s, c, x, 6.36, w, 0.42, C.mintLt, C.navy, { text: { fontSize: 10.5 } }); x += w + 0.1; });
}
const RX = 6.95, RW = W - M - RX;
le.blocks.forEach((b, i) => {
  const y = [1.78, 3.62][i];
  bubble(s, b.icon, 'light', RX, y, 0.66, C.mintLt);
  T(s, b.runs.map(([t, strong], k) => ({ text: k === b.runs.length - 1 ? keep(t) : t, options: strong ? { bold: true, color: C.teal } : {} })),
    { x: RX + 0.9, y: y - 0.02, w: RW - 0.9, h: i ? 1.2 : 1.65, fontSize: 13, lineSpacingMultiple: 1.17 });
});
card(s, RX, 5.08, RW, 1.72, { fill: { color: C.mintLt } });
bubble(s, le.focus.icon, 'light', RX + 0.25, 5.1 + 0.53, 0.66, C.white);
T(s, le.focus.runs.map(([t, strong]) => ({ text: t, options: strong ? { bold: true, color: C.teal } : {} })),
  { x: RX + 1.15, y: 5.25, w: RW - 1.4, h: 1.38, fontFace: HEAD, fontSize: 17, italic: true, valign: 'middle', lineSpacingMultiple: 1.12 });


// =====================================================================
// 5. PAST SESSIONS — corporates, communities and forums (as on investingformummies.com)
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Mint', sectionTitle: 'Introduction' });
const cw = COPY.corporate;
label(s, cw.eyebrow, M, 0.42, 6, C.teal);
s.addText([
  { text: cw.title[0], options: { fontSize: 28, breakLine: true } },
  { text: cw.title[1], options: { fontSize: 28, italic: true, color: C.teal } },
], { placeholder: 'title' });
T(s, keep(cw.intro), { x: M, y: 1.82, w: 10.6, h: 0.6, fontSize: 13.5, lineSpacingMultiple: 1.15 });
{
  const n = cw.sessions.length, cwW = 2.88, g = (W - 2 * M - n * cwW) / (n - 1), y = 2.62, h = 3.45;
  cw.sessions.forEach((c, i) => {
    const x = M + i * (cwW + g);
    s.addImage({ path: A(c.img), x, y, w: cwW, h, altText: `${c.name} workshop group photo` });
    T(s, [
      { text: c.name, options: { fontFace: HEAD, fontSize: 16, bold: true, breakLine: true, paraSpaceAfter: 2 } },
      { text: c.kind, options: { fontSize: 10.5, color: C.ice } },
    ], { x: x + 0.18, y: y + h - 0.95, w: cwW - 0.26, h: 0.8, color: C.white, valign: 'bottom' });
  });
}
T(s, cw.alsoHosted.map(([t, b]) => ({ text: t, options: b ? { bold: true, color: C.navy } : {} })),
  { x: M, y: 6.3, w: 11, h: 0.36, fontSize: 12.5, color: C.muted });

// =====================================================================
// 6. THE WORKSHOP SERIES — the staircase
// =====================================================================
pres.addSection({ title: 'The Series' });
const ws = COPY.series;
// Backdrop: the IFM tree, large and faint, centred behind the staircase.
// 'centre' = navy tree on the cream slide; 'dark' = the slide turns navy with a white tree.
const seriesBg = process.env.WC_SERIES_BG || ws.backdrop;
const dk = seriesBg === 'dark';
s = pres.addSlide({ masterName: dk ? 'IFM Dark' : 'IFM Cream', sectionTitle: 'The Series' });
if (seriesBg) {
  const L = 7.6, lw = L * 560 / 616;
  s.addImage({ path: A(dk ? 'logo-round-white.png' : 'logo-round-navy.png'), x: (W - lw) / 2 + 0.6, y: 0.05, w: lw, h: L,
    transparency: dk ? 92 : 95, altText: '' });
}
label(s, ws.eyebrow, M, 0.42, 6, dk ? C.mint : C.teal);
s.addText(ws.title, { placeholder: 'title' });
T(s, ws.intro, { x: M, y: 1.5, w: 7.6, h: 0.8, fontSize: 13.5, lineSpacingMultiple: 1.15, color: dk ? C.ice : C.navy });
// flexibility callout: the full series, or only the modules a group needs
{
  const bx = M, by = 2.36, bw = 4.75, bh = 0.64;
  s.addShape(SH.ROUNDED_RECTANGLE, { x: bx, y: by, w: bw, h: bh, rectRadius: 0.14, fill: { color: C.goldLt }, line: { color: C.gold, width: 1 } });
  bubble(s, 'ui-check', 'gold', bx + 0.13, by + (bh - 0.44) / 2, 0.44, C.white);
  T(s, keep(ws.choice), { x: bx + 0.7, y: by + 0.04, w: bw - 0.82, h: bh - 0.08, fontSize: 12, bold: true, valign: 'middle', lineSpacingMultiple: 1.05 });
}
// stat callouts
[['5', 'workshops'], [String(COPY.modules.reduce((t, m) => t + m.hours, 0)), 'hours in total']].forEach(([n, l], i) => {
  const x = W - M - 1.5 - (1 - i) * 1.62;
  T(s, n, { x, y: 1.05, w: 1.5, h: 0.62, fontFace: HEAD, fontSize: 36, bold: true, color: dk ? C.mintTxt : C.teal, align: 'right' });
  T(s, l, { x, y: 1.66, w: 1.5, h: 0.3, fontSize: 10.5, bold: true, color: dk ? C.ice : C.muted, align: 'right' });
});
COPY.modules.forEach((m, i) => {
  const x = M + i * 2.455, w = 2.3, top = 3.5 - i * 0.32, ch = 2.68, base = 6.9;
  const rTop = top + ch + 0.15;
  card(s, x, top, w, ch, { shadow: shadow() });
  T(s, m.num, { x: x + 0.2, y: top + 0.16, w: 0.9, h: 0.55, fontFace: HEAD, fontSize: 24, bold: true, color: C.teal });
  bubble(s, m.icon, 'light', x + w - 0.74, top + 0.17, 0.54, C.mintLt);
  // title and line share one box so the line follows a one- or two-line title without a gap
  T(s, [
    { text: m.title, options: { fontFace: HEAD, fontSize: 13, bold: true, breakLine: true, paraSpaceAfter: 5, lineSpacingMultiple: 0.98 } },
    { text: keep(m.seriesLine), options: { fontSize: 10.5, lineSpacingMultiple: 1.1 } },
  ], { x: x + 0.2, y: top + 0.8, w: w - 0.36, h: ch - 0.92 });
  const stairArt = process.env.WC_STAIR_ART || ws.stairArt;   // 'giant' | 'pattern' | undefined
  if (!stairArt) s.addShape(SH.ROUNDED_RECTANGLE, { x, y: rTop, w, h: base - rTop, rectRadius: 0.1, fill: { color: C.teal }, line: { type: 'none' } });
  else if (i === 0) {
    // all five steps as one image (stair_backdrop.py), so the IFM mark can run across them
    const top0 = 3.5 - 4 * 0.32 + ch + 0.15;
    s.addImage({ path: A(`stairs-${stairArt}.png`), x: M, y: top0, w: 4 * 2.455 + 2.3, h: base - top0, altText: '' });
  }
  icon(s, 'ui-clock', 'teal', x + 0.2, rTop + 0.12, 0.28);
  T(s, `${m.hours} hours`, { x: x + 0.55, y: rTop + 0.08, w: 1.6, h: 0.36, fontFace: HEAD, fontSize: 14, bold: true, color: C.white, valign: 'middle' });
  // IFM mark in the teal steps. 'each' = a faint watermark in every step, sized to the step; 'top' = one solid white mark crowning the last, tallest step.
  const mode = process.env.WC_STAIR_LOGO || ws.logo || 'none';
  const LA = 560 / 616, rh = base - rTop;
  if (mode === 'each') {
    const L = Math.min(rh - 0.12, 1.55), lw = L * LA;
    s.addImage({ path: A('logo-round-white.png'), x: x + w - lw - 0.1, y: base - L - 0.06, w: lw, h: L, transparency: 75, altText: '' });
  }
  if (mode === 'top' && i === COPY.modules.length - 1) {
    const L = Math.min(1.25, rh - 0.6), lw = L * LA;
    s.addImage({ path: A('logo-round-white.png'), x: x + (w - lw) / 2, y: rTop + 0.52 + (rh - 0.6 - L) / 2, w: lw, h: L, altText: 'Investing for Mummies logo' });
  }
});

// =====================================================================
// 7. THE VALUE OF THE FULL SERIES — the flow
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Dark', sectionTitle: 'The Series' });
const v = COPY.value;
label(s, v.eyebrow, M, 0.42, 6, C.mint);
s.addText(v.title, { placeholder: 'title' });
T(s, [{ text: v.lead[0] }, { text: v.lead[1], options: { color: C.gold, italic: true } }],
  { x: M, y: 1.55, w: 11.3, h: 0.85, fontFace: HEAD, fontSize: 19, color: C.white, lineSpacingMultiple: 1.1 });
T(s, v.connect, { x: M, y: 2.45, w: 12.1, h: 0.5, fontSize: 13, color: C.ice });
{
  const n = v.flow.length, gap = 2.6, d = 1.45, cy = 2.98;
  const x0 = (W - gap * (n - 1)) / 2;
  v.flow.forEach((f, i) => {
    const cx = x0 + i * gap;
    if (i < n - 1) s.addShape(SH.LINE, { x: cx + d / 2 + 0.14, y: cy + d / 2, w: gap - d - 0.28, h: 0,
      line: { color: C.mint, width: 2, endArrowType: 'triangle' } });
    bubble(s, f.icon, 'light', cx - d / 2, cy, d, i === n - 1 ? C.gold : C.white, { iconScale: 0.66 });
    T(s, f.label, { x: cx - 1.15, y: cy + d + 0.1, w: 2.3, h: 0.36, fontSize: 14, bold: true, color: C.white, align: 'center' });
  });
}
label(s, v.knowLabel, M, 5.12, 6, C.mint);
{
  const n = v.know.length, g = 0.18, tw = (W - 2 * M - g * (n - 1)) / n, y = 5.48, h = 1.32;
  v.know.forEach((k, i) => {
    const x = M + i * (tw + g), hi = i === n - 1;
    s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w: tw, h, rectRadius: 0.14,
      fill: hi ? { color: C.gold } : { color: C.white, transparency: 91 },
      line: hi ? { type: 'none' } : { color: C.white, transparency: 78, width: 0.75 } });
    bubble(s, k.icon, 'light', x + 0.18, y + (h - 0.52) / 2, 0.52, hi ? C.white : C.mintLt);
    T(s, keep(k.text), { x: x + 0.82, y: y + 0.1, w: tw - 1.04, h: h - 0.2, fontSize: 13, bold: true, valign: 'middle',
      color: hi ? C.navy : C.white, lineSpacingMultiple: 1.05 });
  });
}

// =====================================================================
// 8–12. ONE PAGE PER MODULE — identical frame
// =====================================================================
pres.addSection({ title: 'The Modules' });
COPY.modules.forEach((m, mi) => {
  s = pres.addSlide({ masterName: 'IFM Module', sectionTitle: 'The Modules' });
  // left panel: navy duotone of a real session, then the module's identity and story
  s.addImage({ path: A(`panel-m${mi + 1}.jpg`), x: 0, y: 0, w: 4.2, h: H, altText: m.panelAlt });
  label(s, 'MODULE', 0.5, 0.48, 2, C.mint);
  T(s, m.num, { x: 0.46, y: 0.66, w: 2.2, h: 0.95, fontFace: HEAD, fontSize: 60, bold: true, color: C.gold });
  bubble(s, m.icon, 'teal', 3.8 - 0.8, 0.74, 0.8, C.teal);
  s.addText(m.title, { placeholder: 'title' });
  // subtitle and intro in one box, so the gap between them is the same on every module
  T(s, [
    { text: keep(m.subtitle), options: { fontFace: HEAD, fontSize: 13, italic: true, color: C.mint, lineSpacingMultiple: 1.05, breakLine: true, paraSpaceAfter: 16 } },
    ...m.intro.map((p, k) => ({ text: keep(p), options: Object.assign(
      { breakLine: k < m.intro.length - 1, paraSpaceAfter: 7, lineSpacingMultiple: 1.1 },
      k === 0 ? { bold: true, color: C.white, fontSize: 10.5 } : { color: C.ice, fontSize: 10 }) })),
  ], { x: 0.5, y: 2.58, w: 3.3, h: 4.45 });

  // right: what we'll cover (titled items) + walk-away card + duration badge
  const CW = 2.25, CX = W - M + 0.1 - CW, RX = 4.7, IW = CX - 0.3 - RX;
  T(s, m.coverHeading, { x: RX, y: 0.4, w: 5.4, h: 0.56, fontFace: HEAD, fontSize: 21, bold: true, valign: 'middle' });
  s.addShape(SH.ROUNDED_RECTANGLE, { x: CX, y: 0.37, w: CW, h: 0.62, rectRadius: 0.31, fill: { color: C.gold }, line: { type: 'none' } });
  bubble(s, 'ui-clock', 'light', CX + 0.08, 0.47, 0.42, C.white);
  T(s, [
    { text: 'SUGGESTED DURATION', options: { fontSize: 7.5, bold: true, charSpacing: 1, breakLine: true } },
    { text: `${m.hours} hours`, options: { fontFace: HEAD, fontSize: 15, bold: true } },
  ], { x: CX + 0.6, y: 0.4, w: CW - 0.66, h: 0.56, valign: 'middle', color: C.navy });

  // Each item is a band: icon and text both centred in it, hairline between bands.
  // Title and subtitle share the heading line ("Term Insurance — Protecting Your Family’s Future"),
  // which is how Hiral wrote them and what lets five long items fit on one page.
  // Band heights follow each item's length (heading line + estimated description lines), so a
  // four-line description gets the same breathing room as a two-line one.
  const top = 1.12, bottom = 7.0, n = m.items.length;
  const need = m.items.map(it => 0.5 + 0.18 * Math.ceil(it.desc.length / 70));
  const spare = (bottom - top - need.reduce((a, b) => a + b, 0)) / n;
  let y = top;
  m.items.forEach((it, k) => {
    const pitch = need[k] + spare;
    if (k) s.addShape(SH.LINE, { x: RX, y, w: IW, h: 0, line: { color: C.mint, width: 0.75 } });
    bubble(s, it.icon, 'light', RX, y + pitch / 2 - 0.25, 0.5, C.mintLt);
    const head = [{ text: it.title, options: { fontFace: HEAD, fontSize: 13, bold: true, breakLine: !it.sub, paraSpaceAfter: 3 } }];
    if (it.sub) head.push({ text: ` — ${it.sub}`, options: { fontFace: HEAD, fontSize: 11.5, italic: true, color: C.teal, breakLine: true, paraSpaceAfter: 3 } });
    T(s, [...head, { text: keep(it.desc), options: { fontSize: 10, lineSpacingMultiple: 1.08 } }],
      { x: RX + 0.68, y: y + 0.05, w: IW - 0.68, h: pitch - 0.1, valign: 'middle' });
    y += pitch;
  });

  card(s, CX, top, CW, bottom - top, { fill: { color: C.mintLt } });
  T(s, m.walkHeading, { x: CX + 0.2, y: top + 0.18, w: CW - 0.35, h: 0.56, fontFace: HEAD, fontSize: 14, bold: true, lineSpacingMultiple: 1.0 });
  const ty = top + 0.95, tp = (bottom - 0.15 - ty) / m.takeaways.length;
  m.takeaways.forEach((t, k) => {
    const y = ty + k * tp;
    icon(s, 'ui-check', 'light', CX + 0.18, y, 0.3);
    T(s, keepShort(t), { x: CX + 0.54, y: y + 0.02, w: CW - 0.72, h: tp - 0.08, fontSize: 10, bold: true, lineSpacingMultiple: 1.05 });
  });
});

// =====================================================================
// 13. OUR MISSION
// =====================================================================
pres.addSection({ title: 'Close' });
s = pres.addSlide({ masterName: 'IFM Light', sectionTitle: 'Close' });
const mi = COPY.mission;
label(s, mi.eyebrow, M, 0.42, 6, C.teal);
s.addText(mi.title, { placeholder: 'title' });
T(s, mi.statement.map(([t, hl]) => ({ text: t, options: hl ? { color: C.teal, italic: true } : {} })),
  { x: M, y: 1.62, w: 7.1, h: 1.3, fontFace: HEAD, fontSize: 28, bold: true, lineSpacingMultiple: 1.05 });
T(s, keep(mi.enough), { x: M, y: 3.05, w: 7.1, h: 0.85, fontSize: 14, lineSpacingMultiple: 1.15 });
{
  let x = M;
  mi.verbs.forEach(([t, w]) => { pill(s, t, x, 4.08, w, 0.44, C.teal, C.white, { text: { fontSize: 12 } }); x += w + 0.12; });
}
card(s, M, 4.76, 7.1, 2.04, { fill: { color: C.mintLt } });
T(s, keep(mi.journey), { x: M + 0.3, y: 4.92, w: 6.5, h: 0.78, fontSize: 12.5, lineSpacingMultiple: 1.12 });
mi.fromTo.forEach(([a, b], i) => {
  const y = 5.74 + i * 0.47, pw = 2.92;
  pill(s, a, M + 0.3, y, pw, 0.4, C.white, C.muted, { text: { fontSize: 11 } });
  s.addShape(SH.LINE, { x: M + 0.3 + pw + 0.12, y: y + 0.2, w: 0.42, h: 0, line: { color: C.teal, width: 2, endArrowType: 'triangle' } });
  pill(s, b, M + 0.3 + pw + 0.66, y, pw, 0.4, C.teal, C.white, { text: { fontSize: 11 } });
});
s.addImage({ path: A('mission.png'), x: W - M - 4.3, y: 1.25, w: 4.3, h: 5.55, altText: 'Hiral Goel at the workshop table under the Investing for Mummies title screen' });

// =====================================================================
// 14. CLOSING — sign-off and the Franklin quote
// =====================================================================
s = pres.addSlide({ masterName: 'IFM Closing', sectionTitle: 'Close' });
const cl = COPY.closing;
decoCircles(s, [[10.35, -2.1, 6.0, 55]]);
T(s, '\u201C', { x: M - 0.05, y: 0.55, w: 1.2, h: 1.3, fontFace: HEAD, fontSize: 120, bold: true, color: C.gold });
T(s, cl.quote, { x: M, y: 1.75, w: 9.0, h: 1.65, fontFace: HEAD, fontSize: 38, italic: true, color: C.white, lineSpacingMultiple: 1.05 });
T(s, cl.author, { x: M, y: 3.5, w: 6, h: 0.4, fontSize: 15, bold: true, color: C.mint });
s.addImage({ path: A('hiral-circle.png'), x: M, y: 4.72, w: 1.55, h: 1.55, altText: 'Hiral Goel' });
s.addShape(SH.OVAL, { x: M - 0.04, y: 4.68, w: 1.63, h: 1.63, fill: { type: 'none' }, line: { color: C.gold, width: 2 } });
T(s, cl.name, { x: M + 1.9, y: 4.82, w: 6, h: 0.5, fontFace: HEAD, fontSize: 24, bold: true, color: C.white });
T(s, cl.role, { x: M + 1.9, y: 5.32, w: 6, h: 0.36, fontSize: 14, bold: true, color: C.mint });
T(s, cl.contact, { x: M + 1.9, y: 5.78, w: 7.5, h: 0.36, fontSize: 12, color: C.ice });
s.addImage({ path: A('logo-white.png'), x: W - M - 2.2, y: 4.72 + 1.55 - 2.2 / 2.479, w: 2.2, h: 2.2 / 2.479, altText: 'Investing for Mummies logo' });

// ---------- write ----------
(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  if (missing.size) console.warn('MISSING ICONS:', [...missing].join(', '));
  console.log('wrote', OUT);
})();
