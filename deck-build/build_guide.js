const pptxgen = require('pptxgenjs');
const fs = require('fs');

const NAVY='1A3A5C', TEAL='2A9D8F', TEALD='0E7A6E', CREAM='F7FAF9', AMBER='E9C46A',
      CORAL='E76F51', WHITE='FFFFFF', MUTED='5A7D8A', MINT='E0F3F0', INKDK='12293F',
      LINE='E2EBE8', REDBG='FDECEA', REDINK='A13A2D', GOLDINK='96650F';
const HEAD='Cambria', BODY='Calibri';
// Assets live next to this script so the deck stays rebuildable after a session restart.
// (The old version read them from the session scratchpad, which is wiped between sessions
//  and broke the build twice on 31 Aug / 7 Sep.)
const SP=__dirname+'/assets/';
const THUMBS='/Users/lollyg/Documents/investing for Mummies/CLAUDE/content/thumbs/';
const b64=f=>'image/jpeg;base64,'+fs.readFileSync(THUMBS+f).toString('base64');
const png64=f=>'image/png;base64,'+fs.readFileSync(SP+f).toString('base64');
const LOGO='image/png;base64,'+fs.readFileSync(SP+'ifm-logo-circ.png').toString('base64');

const pres = new pptxgen();
pres.layout='LAYOUT_WIDE';
const T=(s,t,o)=>s.addText(t,Object.assign({fontFace:BODY,isTextBox:true},o));
const logo=s=>s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
const card=(s,x,y,w,h,fill)=>s.addShape('roundRect',{x,y,w,h,rectRadius:.1,fill:{color:fill||CREAM},line:{color:LINE,width:1}});
// section divider slide
function section(n,title,sub){
  const s=pres.addSlide(); s.background={color:NAVY};
  s.addShape('ellipse',{x:10.4,y:-1.5,w:5.2,h:5.2,fill:{color:INKDK}});
  s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
  T(s,'PART '+n,{x:.9,y:2.7,w:4,h:.4,fontSize:13,bold:true,color:'8FD1C7',charSpacing:2.5});
  T(s,title,{x:.85,y:3.15,w:10.5,h:1.1,fontFace:HEAD,fontSize:42,bold:true,color:WHITE});
  T(s,sub,{x:.9,y:4.35,w:9.5,h:.8,fontSize:16,color:'CADCE8'});
  return s;
}
let s;

/* ============ 1. TITLE ============ */
s=pres.addSlide(); s.background={color:NAVY};
s.addShape('ellipse',{x:10.1,y:-1.4,w:5.4,h:5.4,fill:{color:INKDK}});
s.addShape('ellipse',{x:-1.6,y:5.2,w:4.6,h:4.6,fill:{color:INKDK}});
s.addImage({data:LOGO,x:.9,y:.75,w:1.0,h:1.0});
T(s,'INVESTING FOR MUMMIES · SEPTEMBER 2026',{x:2.05,y:1.05,w:10,h:.4,fontSize:13,bold:true,color:'8FD1C7',charSpacing:2});
T(s,'The Content Hub',{x:.85,y:2.15,w:11.6,h:1.1,fontFace:HEAD,fontSize:54,bold:true,color:WHITE});
T(s,'Operating guide — how we capture, tag, publish and measure everything we make.',{x:.9,y:3.4,w:9.6,h:.9,fontSize:20,color:'CADCE8'});
T(s,'ifm-deploy.vercel.app/content/',{x:.9,y:5.55,w:9,h:.45,fontSize:15,bold:true,color:AMBER});
T(s,'What the hub is · Why it changed · How each tab works · Who does what',{x:.9,y:6.05,w:10,h:.45,fontSize:14,italic:true,color:'8FD1C7'});
s.addNotes('This is the complete operating guide — replaces the old change-briefing. Walk the team through Parts 1-4.');

/* ============ 2. THE HUB AT A GLANCE ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'One place, six views',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
T(s,'Everything IFM makes, everything competitors publish, and everything still to do — behind one password.',{x:.9,y:1.32,w:11,h:.45,fontSize:15,color:MUTED});
const tabs=[
 ['🎯','On Deck','What Sakshi does right now: outbound queue, daily targets, items needing review.','Sakshi'],
 ['📚','Library','All 382 assets, tagged and filterable. The searchable archive of everything we own.','Everyone'],
 ['🎨','Creator Tracker','Aakara deliveries by month — what is planned, delivered, published, or sitting unused.','Aditya'],
 ['🏅','Certificates','Course-completion photos matched to students and handles, with consent tracked.','Sakshi'],
 ['📊','Competitors','23 tracked accounts, their engagement, and what it means for us.','Aditya · Hiral'],
 ['📲','Published','What is actually live on Instagram, how it performed, and follower growth.','Aditya · Hiral'],
];
tabs.forEach((t,i)=>{
  const x=.9+(i%3)*3.87, y=2.0+Math.floor(i/3)*2.35;
  card(s,x,y,3.6,2.1);
  T(s,t[0],{x:x+.22,y:y+.18,w:.6,h:.5,fontSize:22,margin:0});
  T(s,t[1],{x:x+.85,y:y+.18,w:2.5,h:.5,fontSize:17,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,t[2],{x:x+.24,y:y+.78,w:3.15,h:.95,fontSize:11.5,color:MUTED,lineSpacingMultiple:1.12});
  T(s,t[3],{x:x+.24,y:y+1.68,w:3.15,h:.32,fontSize:10,bold:true,color:TEALD,charSpacing:.6,margin:0});
});
T(s,'Password-protected · data lives in Google Sheets the team can edit directly · refreshes without a rebuild',{x:.9,y:6.75,w:11.5,h:.4,fontSize:12.5,italic:true,color:TEALD});

/* ============ 3. PART 1 DIVIDER ============ */
section('ONE','Why the system changed','Three failures this quarter — and the principle behind every fix.');

/* ============ 4. WHY (problems) ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'Why we had to change',{x:.85,y:.55,w:11,h:.85,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
T(s,'Three real failures — not hypotheticals. All three happened this quarter.',{x:.9,y:1.4,w:10.5,h:.45,fontSize:15,color:MUTED});
[['35+','files per class, unfindable','Sakshi shoots 10–15 videos and ~20 photos every class. They went into a different folder each time — when we needed one for a story, nobody could find it.'],
 ['29','finished posts, invisible for 2 months','Aakara delivered 29 fully finished posts (July–August). Our tracking watched the wrong folder — their planning deck — so the hub never saw them.'],
 ['0','useful tags on older photos','Earlier shoots were catalogued with loose keywords. Searching “Hiral teaching” or “group photo” returned nothing.']
].forEach((p,i)=>{
  const x=.9+i*4.03;
  s.addShape('roundRect',{x,y:2.05,w:3.72,h:4.35,rectRadius:.12,fill:{color:CREAM},line:{color:LINE,width:1},shadow:{type:'outer',color:'1A3A5C',opacity:.12,blur:8,offset:2,angle:90}});
  T(s,p[0],{x:x+.25,y:2.35,w:3.2,h:1.0,fontFace:HEAD,fontSize:52,bold:true,color:CORAL});
  T(s,p[1],{x:x+.25,y:3.4,w:3.25,h:.85,fontSize:16,bold:true,color:NAVY});
  T(s,p[2],{x:x+.25,y:4.3,w:3.25,h:2.0,fontSize:12.5,color:MUTED,lineSpacingMultiple:1.15});
});

/* ============ 5. THE LOGIC ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'The logic of the change',{x:.85,y:.55,w:11,h:.85,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
T(s,'Every fix follows the same principle: replace “someone remembers” with “the system does it”.',{x:.9,y:1.4,w:11,h:.45,fontSize:15,color:MUTED});
s.addShape('roundRect',{x:.9,y:2.05,w:5.6,h:.62,rectRadius:.09,fill:{color:REDBG}});
T(s,'BEFORE — depended on memory',{x:1.15,y:2.05,w:5.1,h:.62,fontSize:14,bold:true,color:REDINK,valign:'middle',margin:0});
s.addShape('roundRect',{x:6.8,y:2.05,w:5.6,h:.62,rectRadius:.09,fill:{color:MINT}});
T(s,'NOW — runs on its own',{x:7.05,y:2.05,w:5.1,h:.62,fontSize:14,bold:true,color:TEALD,valign:'middle',margin:0});
let ly=2.85;
[['Each person picked their own folder, each time','ONE drop folder, shared with everyone'],
 ['Content was catalogued when someone asked','A processor scans every folder, every morning'],
 ['Tags = loose keywords typed in a hurry','Tags = fixed choices, written by looking at the file'],
 ['“Can we post this?” lived in people’s heads','Consent and sign-off are tags — blocked is blocked'],
 ['Aakara tracking watched their planning deck','It watches the folders their real files land in']
].forEach(r=>{
  card(s,.9,ly,5.6,.68);
  T(s,r[0],{x:1.15,y:ly,w:5.15,h:.68,fontSize:12.5,color:MUTED,valign:'middle',margin:0});
  T(s,'→',{x:6.42,y:ly,w:.45,h:.68,fontSize:16,bold:true,color:TEAL,valign:'middle',align:'center',margin:0});
  s.addShape('roundRect',{x:6.8,y:ly,w:5.6,h:.68,rectRadius:.07,fill:{color:WHITE},line:{color:'BDE9E4',width:1.25}});
  T(s,r[1],{x:7.05,y:ly,w:5.15,h:.68,fontSize:12.5,bold:true,color:NAVY,valign:'middle',margin:0});
  ly+=.82;
});
T(s,'At 300 pieces of content, memory sort of coped. We’re headed for 3,000 — memory doesn’t scale, systems do.',{x:.9,y:ly+.1,w:11.5,h:.5,fontSize:13.5,italic:true,color:TEALD});

/* ============ 6. BEFORE / AFTER ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'The same library, before and after',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:36,bold:true,color:NAVY});
s.addShape('roundRect',{x:.7,y:1.5,w:6.0,h:.5,rectRadius:.08,fill:{color:REDBG}});
T(s,'BEFORE — pretty cards, hidden details',{x:.95,y:1.5,w:5.5,h:.5,fontSize:13,bold:true,color:REDINK,valign:'middle',margin:0});
s.addImage({data:png64('before-library.png'),x:.7,y:2.1,w:6.0,h:3.58});
T(s,'To find anything you clicked “Details” on cards one by one. No tags, no way to filter for “Hiral shots” or “safe to post”.',{x:.7,y:5.8,w:6.0,h:.85,fontSize:12,color:MUTED,lineSpacingMultiple:1.15});
s.addShape('roundRect',{x:7.0,y:1.5,w:6.0,h:.5,rectRadius:.08,fill:{color:MINT}});
T(s,'AFTER — everything visible, one-click filters',{x:7.25,y:1.5,w:5.5,h:.5,fontSize:13,bold:true,color:TEALD,valign:'middle',margin:0});
s.addImage({data:png64('after-library.png'),x:7.0,y:2.1,w:6.0,h:3.58});
T(s,'Every asset in a row: type, shot, quality, session, status. Chips filter to Social-ready, Testimonials, Hiral shots instantly.',{x:7.0,y:5.8,w:6.0,h:.85,fontSize:12,color:MUTED,lineSpacingMultiple:1.15});

/* ============ 7. PART 2 DIVIDER ============ */
section('TWO','How content gets in','One folder, a daily processor, and a tag on every file.');

/* ============ 8. PIPELINE ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'The content pipeline',{x:.85,y:.55,w:11,h:.85,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
T(s,'Five stages. Only the first involves a person — everything after it is automatic.',{x:.9,y:1.4,w:10.5,h:.45,fontSize:15,color:MUTED});
[{ic:'1',t:'IFM Content Drop',d:'ONE shared Drive folder. Everyone adds everything here — photos, videos, screenshots. No naming, no subfolders.',hl:true},
 {ic:'2',t:'Daily processor',d:'Every morning at 7:38 each new file is reviewed, tagged and checked for duplicates. Automatically.'},
 {ic:'3',t:'Catalogue sheet',d:'Every asset is one row the team can edit. Correct a tag directly — no request needed.'},
 {ic:'4',t:'The Hub library',d:'Search and filter by real tags: Hiral shots, testimonials, social-ready. One click.'},
 {ic:'5',t:'Hiral Media Kit',d:'Approved portraits copy across automatically. That one link goes to media agencies.'}
].forEach((p,i)=>{
  const x=.62+i*2.5, bg=p.hl?TEAL:CREAM, fg=p.hl?WHITE:NAVY, dfg=p.hl?'D8F0EC':MUTED;
  s.addShape('roundRect',{x,y:2.2,w:2.3,h:4.1,rectRadius:.1,fill:{color:bg},line:{color:p.hl?TEAL:LINE,width:1}});
  s.addShape('ellipse',{x:x+.85,y:2.5,w:.62,h:.62,fill:{color:p.hl?WHITE:TEAL}});
  T(s,p.ic,{x:x+.85,y:2.5,w:.62,h:.62,align:'center',valign:'middle',fontSize:22,bold:true,color:p.hl?TEAL:WHITE,margin:0});
  T(s,p.t,{x:x+.15,y:3.35,w:2.0,h:.75,fontSize:15.5,bold:true,color:fg,align:'center'});
  T(s,p.d,{x:x+.16,y:4.1,w:2.0,h:2.05,fontSize:11,color:dfg,align:'center',lineSpacingMultiple:1.12});
});
T(s,'Existing folders continue to work — nothing was moved. The daily processor watches those too.',{x:.9,y:6.65,w:11.5,h:.45,fontSize:13,italic:true,color:TEALD});

/* ============ 9. ONE RULE ============ */
s=pres.addSlide(); s.background={color:NAVY};
s.addShape('ellipse',{x:10.6,y:4.6,w:4.4,h:4.4,fill:{color:INKDK}});
s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
T(s,'THE ONLY THING THAT CHANGES FOR YOU',{x:.9,y:.9,w:11,h:.4,fontSize:13,bold:true,color:'8FD1C7',charSpacing:2});
T(s,'Everything goes in one folder:',{x:.85,y:1.5,w:11.5,h:.9,fontFace:HEAD,fontSize:34,bold:true,color:WHITE});
s.addShape('roundRect',{x:.9,y:2.6,w:11.5,h:1.15,rectRadius:.12,fill:{color:TEAL}});
T(s,'📁  IFM Content Drop',{x:1.25,y:2.6,w:6.4,h:1.15,fontFace:HEAD,fontSize:28,bold:true,color:WHITE,valign:'middle',margin:0});
T(s,'shared with Sakshi, Hiral and Asba',{x:7.6,y:2.6,w:4.6,h:1.15,fontSize:13,italic:true,color:'D8F0EC',valign:'middle',align:'right',margin:.1});
[['Phone videos and photos from class','Straight from the camera roll. No renaming required.'],
 ['Testimonials','Video clips and WhatsApp screenshots — both count as content.'],
 ['Certificate moments','The handover, the smile. Tagging and consent are handled downstream.'],
 ['Anything else','Older backlogs, one-off shoots, design files. When in doubt, add it.']
].forEach((r,i)=>{
  const y=4.15+i*.72;
  s.addShape('ellipse',{x:1.05,y:y+.08,w:.3,h:.3,fill:{color:AMBER}});
  T(s,r[0],{x:1.55,y:y,w:3.9,h:.5,fontSize:15,bold:true,color:WHITE,valign:'middle',margin:0});
  T(s,r[1],{x:5.6,y:y,w:6.8,h:.5,fontSize:12.5,color:'CADCE8',valign:'middle',margin:0});
});

/* ============ 10. TAGS ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'Every file gets real tags — automatically',{x:.85,y:.55,w:11.5,h:.85,fontFace:HEAD,fontSize:36,bold:true,color:NAVY});
T(s,'The system reviews each photo or video and records what it actually shows. Any tag can be corrected in the sheet.',{x:.9,y:1.42,w:11,h:.45,fontSize:15,color:MUTED});
let ty=2.15;
[['WHAT IT IS','Photo · Video · Carousel · Reel · Story',TEALD],
 ['WHAT’S IN FRAME','Hiral portrait / teaching · Group · Students · Testimonial · Certificate moment · Room wide',TEALD],
 ['HOW GOOD','Hero (agency-grade) · Usable · Raw/backup',GOLDINK],
 ['WHICH CLASS','“Mums batch — 26 Aug” · “Corporate — 4 Jul”',TEALD],
 ['CAN WE PUBLISH IT?','Social-ready = strong quality AND consent verified.   Do-not-use = restricted (minors without consent, client approval outstanding) — these cannot surface in a Social-ready filter.',REDINK]
].forEach(t=>{
  const h=t[0]==='CAN WE PUBLISH IT?'?1.25:.82;
  card(s,.9,ty,11.5,h-.12);
  T(s,t[0],{x:1.15,y:ty,w:2.6,h:h-.12,fontSize:12.5,bold:true,color:t[2],valign:'middle',charSpacing:1,margin:0});
  T(s,t[1],{x:3.9,y:ty,w:8.25,h:h-.12,fontSize:13,color:NAVY,valign:'middle',lineSpacingMultiple:1.1,margin:0});
  ty+=h;
});
T(s,'Duplicates: burst shots collapse into a single best frame, the rest retained as backups — the library stays readable.',{x:.9,y:6.75,w:11.5,h:.45,fontSize:13,italic:true,color:TEALD});

/* ============ 11. PART 3 DIVIDER ============ */
section('THREE','The six tabs, in use','What each view is for, who owns it, and how to read it.');

/* ============ 12. LIBRARY TAB ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'📚  Library — the searchable archive',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'Every asset IFM owns, in one sortable table. This is where you go to find something.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
[['382','assets catalogued'],['104','ready to post'],['231','raw footage'],['20','published']].forEach((k,i)=>{
  const x=.9+i*2.92; card(s,x,1.85,2.7,1.15,MINT);
  T(s,k[0],{x:x+.2,y:1.95,w:2.3,h:.62,fontFace:HEAD,fontSize:30,bold:true,color:TEALD,margin:0});
  T(s,k[1],{x:x+.2,y:2.55,w:2.3,h:.35,fontSize:11.5,bold:true,color:MUTED,margin:0});
});
T(s,'HOW TO FIND SOMETHING — three ways, fastest first',{x:.9,y:3.25,w:11,h:.4,fontSize:12.5,bold:true,color:TEALD,charSpacing:1});
[['1. Filter chips','One click. “Social-ready” for anything safe to post tonight, “Hiral shots”, “Testimonials”, “Certificates”, “Do not use”.'],
 ['2. Dropdowns','Narrow by type, shot, status or source — e.g. every Reel from Aakara that is Ready.'],
 ['3. Search box','Searches titles, descriptions, tags and session names. Descriptions say what is actually in frame, so “whiteboard” or “red top” works.']
].forEach((r,i)=>{
  const y=3.7+i*.98; card(s,.9,y,11.5,.85);
  T(s,r[0],{x:1.15,y:y,w:2.2,h:.85,fontSize:13.5,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,r[1],{x:3.45,y:y,w:8.7,h:.85,fontSize:12,color:MUTED,valign:'middle',lineSpacingMultiple:1.1,margin:0});
});
T(s,'Raw and archived material is hidden by default so the view stays useful — tick “Show raw/archived” to include it.',{x:.9,y:6.7,w:11.5,h:.4,fontSize:12.5,italic:true,color:TEALD});

/* ============ 13. TODAY TAB ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'🎯  On Deck — the daily working view',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'Built for Sakshi. Opens on a to-do list, not a dashboard — visit ?who=sakshi for the simplified view.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
card(s,.9,1.9,5.7,2.5);
T(s,'THE DAILY TARGETS',{x:1.15,y:2.05,w:5,h:.35,fontSize:12,bold:true,color:TEALD,charSpacing:1,margin:0});
[['15','outbound comments on other accounts'],['5','stories posted (not logged — a reminder, not a tracker)'],['7','items flagged as needing review']].forEach((r,i)=>{
  const y=2.5+i*.6;
  T(s,r[0],{x:1.15,y:y,w:.75,h:.5,fontFace:HEAD,fontSize:22,bold:true,color:TEAL,valign:'middle',margin:0});
  T(s,r[1],{x:1.95,y:y,w:4.5,h:.5,fontSize:12.5,color:MUTED,valign:'middle',margin:0});
});
card(s,6.75,1.9,5.65,2.5,MINT);
T(s,'THE OUTBOUND QUEUE',{x:7.0,y:2.05,w:5,h:.35,fontSize:12,bold:true,color:TEALD,charSpacing:1,margin:0});
T(s,'A ranked list of competitor posts to comment on, rebuilt from the weekly scrape. Two rules keep it useful:\n\n·  Nothing older than 7 days — a comment on a dead post is wasted effort.\n·  Mid-size posts first, not the giants — on an 80K-like post your comment lands around #400 and nobody sees it.',{x:7.0,y:2.45,w:5.15,h:1.8,fontSize:11.5,color:NAVY,lineSpacingMultiple:1.12});
T(s,'Tap ✓ Commented and it logs to the Outbound sheet — the counter and streak update immediately.',{x:.9,y:4.6,w:11.5,h:.4,fontSize:12.5,italic:true,color:TEALD});
s.addShape('roundRect',{x:.9,y:5.15,w:11.5,h:1.4,rectRadius:.1,fill:{color:'FFF8E8'},line:{color:AMBER,width:1}});
T(s,'Barely used so far',{x:1.2,y:5.3,w:3.2,h:.4,fontSize:13,bold:true,color:GOLDINK,margin:0});
T(s,'Two comments logged in the last three weeks against a target of 15 a day. The queue, the one-tap logging and the counter are all built and verified working end to end — what has not started is the daily habit. Worth deciding: commit to the 15, or lower the target so the tab reflects reality.',{x:1.2,y:5.7,w:10.9,h:.75,fontSize:12,color:MUTED,lineSpacingMultiple:1.1});

/* ============ 14. CREATOR TRACKER ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'🎨  Creator Tracker — the agency pipeline',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'What Aakara owes us, what has landed, and what has been paid for but never posted.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
[['🟡','Delivered — not yet posted','Finished work sitting unused. This group is money already spent — it should be the shortest column.',AMBER],
 ['🟢','Published — live on Instagram','Confirmed against the real IG grid, not just a status someone typed.',TEAL],
 ['🔵','In production / planned','Read from Aakara’s monthly deck, which remains useful as the forward calendar.','5B8DB8']
].forEach((g,i)=>{
  const x=.9+i*3.87; card(s,x,1.9,3.6,2.2);
  T(s,g[0],{x:x+.22,y:2.05,w:.55,h:.5,fontSize:19,margin:0});
  T(s,g[1],{x:x+.22,y:2.6,w:3.15,h:.62,fontSize:14,bold:true,color:NAVY,lineSpacingMultiple:1.05});
  T(s,g[2],{x:x+.22,y:3.25,w:3.15,h:.8,fontSize:11.5,color:MUTED,lineSpacingMultiple:1.12});
});
s.addShape('roundRect',{x:.9,y:4.35,w:11.5,h:1.5,rectRadius:.1,fill:{color:NAVY}});
T(s,'🚩  The reconciliation check — the most valuable thing on this tab',{x:1.2,y:4.5,w:10.9,h:.4,fontSize:14,bold:true,color:WHITE,margin:0});
T(s,'The hub compares every status against what is genuinely live on Instagram and flags the mismatches: items marked Published that are not actually on the grid, and items marked Delivered that quietly went live. It catches the two mistakes a manual list always makes.',{x:1.2,y:4.95,w:10.9,h:.8,fontSize:12,color:'CADCE8',lineSpacingMultiple:1.12});
T(s,'105 catalogue items now come from Aakara — the tracker builds itself from those rather than being maintained by hand.',{x:.9,y:6.1,w:11.5,h:.4,fontSize:12.5,italic:true,color:TEALD});

/* ============ 15. CERTIFICATES ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'🏅  Certificates — proof, handled carefully',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'Completion photos are among our strongest social proof — and the most sensitive content we hold.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
[['78','names in the sheet'],['5','have an Instagram handle'],['0','have a photo linked yet']].forEach((k,i)=>{
  const x=.9+i*3.87; card(s,x,1.85,3.6,1.15,MINT);
  T(s,k[0],{x:x+.25,y:1.95,w:3.1,h:.62,fontFace:HEAD,fontSize:30,bold:true,color:TEALD,margin:0});
  T(s,k[1],{x:x+.25,y:2.55,w:3.1,h:.35,fontSize:11.5,bold:true,color:MUTED,margin:0});
});
T(s,'HOW IT WORKS',{x:.9,y:3.25,w:11,h:.35,fontSize:12.5,bold:true,color:TEALD,charSpacing:1});
[['The sheet is the record','Name, Instagram handle, photo link, batch, posted yes/no. Add a student there and they appear in the hub automatically.'],
 ['Names are masked in the view','The hub shows “Jaya B.” rather than full names, so the tab is safe to screen-share or show outside the core team.'],
 ['Handles enable tagging','The point of the handle column is to @-mention each student when her certificate is posted — that is what drives reach.']
].forEach((r,i)=>{
  const y=3.68+i*.83; card(s,.9,y,11.5,.72);
  T(s,r[0],{x:1.15,y:y,w:2.9,h:.72,fontSize:13,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,r[1],{x:4.15,y:y,w:8.0,h:.72,fontSize:11.5,color:MUTED,valign:'middle',lineSpacingMultiple:1.1,margin:0});
});
s.addShape('roundRect',{x:.9,y:6.2,w:11.5,h:.75,rectRadius:.09,fill:{color:REDBG}});
T(s,'Where minors appear, written parental consent is required before anything is published. Until it is recorded, the file stays tagged Do-not-use and cannot reach a Social-ready filter.',{x:1.2,y:6.2,w:10.9,h:.75,fontSize:12,bold:true,color:REDINK,valign:'middle',lineSpacingMultiple:1.1,margin:0});

/* ============ 16. COMPETITORS — WHAT WE TRACK ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'📊  Competitors — what we track',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'23 accounts, refreshed automatically every Monday. Sorted into four kinds, because they are not all rivals.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
[['7','DIRECT','Same business as us — women’s financial education, workshops, courses.',TEAL],
 ['8','CONTENT','Creators competing for the same attention, though not women-specific.',NAVY],
 ['7','BENCHMARK','International players we study rather than compete with.','5B8DB8'],
 ['1','PLATFORM','Adjacent products — a referral partner, not a rival.',MUTED]
].forEach((k,i)=>{
  const x=.9+i*2.92; card(s,x,1.85,2.7,1.9);
  T(s,k[0],{x:x+.22,y:1.98,w:2.3,h:.62,fontFace:HEAD,fontSize:32,bold:true,color:k[3],margin:0});
  T(s,k[1],{x:x+.22,y:2.6,w:2.3,h:.32,fontSize:11,bold:true,color:k[3],charSpacing:1,margin:0});
  T(s,k[2],{x:x+.22,y:2.95,w:2.3,h:.75,fontSize:10.5,color:MUTED,lineSpacingMultiple:1.1});
});
T(s,'WHAT THE WEEKLY REFRESH COLLECTS',{x:.9,y:4.0,w:11,h:.35,fontSize:12.5,bold:true,color:TEALD,charSpacing:1});
[['Follower counts','tracked over time, so growth is visible'],
 ['Recent posts + thumbnails','up to 6 per account, with likes and comments'],
 ['Average engagement','the honest measure — reach is not scrapable for other accounts'],
 ['Qualitative intel','positioning, content pillars, hooks, and what IFM should do about it']
].forEach((r,i)=>{
  const x=.9+(i%2)*5.85, y=4.45+Math.floor(i/2)*.85;
  card(s,x,y,5.6,.72);
  T(s,'▪',{x:x+.2,y:y,w:.3,h:.72,fontSize:13,color:TEAL,valign:'middle',margin:0});
  T(s,r[0],{x:x+.5,y:y,w:2.3,h:.72,fontSize:12,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,r[1],{x:x+2.8,y:y,w:2.65,h:.72,fontSize:11,color:MUTED,valign:'middle',lineSpacingMultiple:1.05,margin:0});
});
T(s,'Anyone can add an account from the tab itself — type a name or paste a handle. It is logged as “intel pending” until reviewed.',{x:.9,y:6.3,w:11.5,h:.4,fontSize:12.5,italic:true,color:TEALD});

/* ============ 17. COMPETITORS — THE ENGAGEMENT TRUTH (chart) ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'Followers are vanity. Engagement is the read.',{x:.85,y:.5,w:11.5,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'Average likes as a share of followers — how many of an audience actually respond. Measured from live posts.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
s.addChart(pres.ChartType.bar,[{name:'Engagement rate (% of followers)',
  labels:['Vinita','CA Rachana Ranade','Her First $100K','Neha Nagar','Anushka Rathod','Ellevest','Monika Halan','LXME'],
  values:[5.77,4.58,1.71,1.34,1.24,0.20,0.09,0.04]}],
  {x:.85,y:1.85,w:7.4,h:4.6,barDir:'bar',chartColors:[TEAL],
   showTitle:false,showLegend:false,showValue:true,dataLabelPosition:'outEnd',
   dataLabelFormatCode:'0.00"%"',dataLabelColor:NAVY,dataLabelFontSize:10,dataLabelFontFace:BODY,
   catAxisLabelColor:NAVY,catAxisLabelFontSize:11,catAxisLabelFontFace:BODY,
   valAxisLabelColor:MUTED,valAxisLabelFontSize:9,valAxisHidden:true,
   catGridLine:{style:'none'},valGridLine:{style:'none'},barGapWidthPct:45});
card(s,8.55,1.85,3.85,4.6,NAVY);
T(s,'WHAT THIS TELLS US',{x:8.85,y:2.05,w:3.3,h:.35,fontSize:11.5,bold:true,color:'8FD1C7',charSpacing:1,margin:0});
T(s,'LXME is a paper tiger.',{x:8.85,y:2.5,w:3.3,h:.4,fontSize:15,bold:true,color:WHITE,margin:0});
T(s,'123,000 followers, but an average of 55 likes a post — 0.04%. The category leader by size is not winning attention.',{x:8.85,y:2.95,w:3.3,h:1.0,fontSize:11.5,color:'CADCE8',lineSpacingMultiple:1.15});
T(s,'The creators own the room.',{x:8.85,y:4.05,w:3.3,h:.4,fontSize:15,bold:true,color:WHITE,margin:0});
T(s,'Rachana Ranade converts 4.58% of a million followers. Individual voices beat brand accounts, consistently.',{x:8.85,y:4.5,w:3.3,h:1.0,fontSize:11.5,color:'CADCE8',lineSpacingMultiple:1.15});
T(s,'For IFM: a founder-led voice is the format that works — not a faceless brand feed.',{x:8.85,y:5.6,w:3.3,h:.75,fontSize:11.5,bold:true,italic:true,color:AMBER,lineSpacingMultiple:1.15});

/* ============ 18. COMPETITORS — THE STRATEGIC READ ============ */
s=pres.addSlide(); s.background={color:NAVY};
s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
T(s,'WHAT THE WHOLE SET TELLS US',{x:.9,y:.75,w:9,h:.4,fontSize:12.5,bold:true,color:'8FD1C7',charSpacing:2});
T(s,'Four more conclusions from tracking 23 accounts',{x:.85,y:1.2,w:11.5,h:.85,fontFace:HEAD,fontSize:34,bold:true,color:WHITE});
[['The white space nobody has taken','Checked across all 23: not one targets mums specifically — every one chases “women” broadly. IFM’s most ownable and least contested position.'],
 ['The format law of this space','Every high-engagement competitor grows on short, founder-led video. IFM’s own numbers agree: reels average 37 likes against 15 for everything else.'],
 ['Our real rivals for revenue','For the paid workshop business the competition is not the big creators — it is the small workshop-led players. None of them match IFM’s production quality.'],
 ['The uncontested moat','Zero of the 23 run an interactive game — verified across every content field. Stock Rush and the live quizzes are a structural differentiator, not a nice extra.']
].forEach((p,i)=>{
  const x=.9+(i%2)*5.85, y=2.25+Math.floor(i/2)*2.2;
  s.addShape('roundRect',{x,y,w:5.6,h:2.0,rectRadius:.11,fill:{color:'22456B'}});
  T(s,String(i+1),{x:x+.28,y:y+.22,w:.5,h:.5,fontFace:HEAD,fontSize:22,bold:true,color:'7FD9CB',margin:0});
  T(s,p[0],{x:x+.85,y:y+.22,w:4.5,h:.5,fontSize:15,bold:true,color:WHITE,valign:'middle',margin:0});
  T(s,p[1],{x:x+.3,y:y+.85,w:5.05,h:1.0,fontSize:11.5,color:'CADCE8',lineSpacingMultiple:1.18});
});
T(s,'This analysis is regenerated from the tracked set — it is a standing read, not a one-off study.',{x:.9,y:6.7,w:11.5,h:.4,fontSize:12,italic:true,color:'8FD1C7'});

/* ============ 19. PUBLISHED ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'📲  Published — what actually worked',{x:.85,y:.5,w:11,h:.8,fontFace:HEAD,fontSize:34,bold:true,color:NAVY});
T(s,'Live posts pulled from Instagram with real engagement — the feedback loop for everything we make.',{x:.9,y:1.3,w:11,h:.4,fontSize:14.5,color:MUTED});
[['379','followers today',TEALD],['+60','in 39 days',TEALD],['56','posts live',NAVY],['37 vs 15','avg likes: reels vs rest',CORAL]].forEach((k,i)=>{
  const x=.9+i*2.92; card(s,x,1.85,2.7,1.25,MINT);
  T(s,k[0],{x:x+.2,y:1.95,w:2.35,h:.62,fontFace:HEAD,fontSize:k[0].length>5?21:29,bold:true,color:k[2],valign:'middle',margin:0});
  T(s,k[1],{x:x+.2,y:2.6,w:2.35,h:.4,fontSize:11,bold:true,color:MUTED,margin:0});
});
s.addShape('roundRect',{x:.9,y:3.35,w:11.5,h:1.25,rectRadius:.1,fill:{color:NAVY}});
T(s,'The single clearest signal we have',{x:1.2,y:3.5,w:10.9,h:.4,fontSize:14,bold:true,color:WHITE,margin:0});
T(s,'Reels earn roughly 2.5× the likes of carousels and static posts on our own account. Our four best-performing posts of all time are all reels, and all founder-led. This is not a preference — it is what the data says.',{x:1.2,y:3.9,w:10.9,h:.65,fontSize:12,color:'CADCE8',lineSpacingMultiple:1.12});
T(s,'HOW TO READ THE TAB',{x:.9,y:4.8,w:11,h:.35,fontSize:12.5,bold:true,color:TEALD,charSpacing:1});
[['Engagement rate, for now','Reach is visible only to the account owner and cannot be scraped. A direct Instagram connection is being set up that will give us real reach, views and saves; until it is live, likes + comments as a share of followers is the honest stand-in.'],
 ['Verdict badges','Each post is scored against our own average — top third, middle, or bottom third. It answers “was this actually good for us”, not “is this good in the abstract”.']
].forEach((r,i)=>{
  const y=5.2+i*.83; card(s,.9,y,11.5,.72);
  T(s,r[0],{x:1.15,y:y,w:2.9,h:.72,fontSize:12.5,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,r[1],{x:4.15,y:y,w:8.0,h:.72,fontSize:11,color:MUTED,valign:'middle',lineSpacingMultiple:1.08,margin:0});
});

/* ============ 20. MEDIA KIT ============ */
s=pres.addSlide(); s.background={color:NAVY};
s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
T(s,'FOR PRESS AND AGENCIES',{x:.9,y:.8,w:8,h:.4,fontSize:13,bold:true,color:'8FD1C7',charSpacing:2});
T(s,'The Hiral Media Kit',{x:.85,y:1.3,w:8,h:.95,fontFace:HEAD,fontSize:40,bold:true,color:WHITE});
T(s,'A separate Drive folder holding only agency-grade portraits. Any new Hero-quality portrait or teaching shot is copied across automatically.',{x:.9,y:2.35,w:6.6,h:1.1,fontSize:16,color:'CADCE8',lineSpacingMultiple:1.2});
T(s,'When a journalist, agency or event requests photographs,\nsend this one folder link.',{x:.9,y:3.75,w:6.6,h:1.0,fontSize:16,bold:true,color:AMBER,lineSpacingMultiple:1.2});
T(s,'Currently holds 11 professional DSLR portraits from the July corporate session, plus two workshop stills — all high-resolution JPEG.',{x:.9,y:4.9,w:6.5,h:.7,fontSize:13.5,color:'CADCE8',lineSpacingMultiple:1.2});
// Audited 8 Sep 2026: the folder has exactly one permission — owner. Not Hiral, not
// link-shared. The "send this one folder link" instruction above silently fails today,
// so the slide has to say so rather than describe a workflow nobody can run.
T(s,'⚠  Before this link can be sent, the folder still needs sharing turned on — it is currently visible to Aditya only.',{x:.9,y:5.62,w:6.6,h:.6,fontSize:12.5,bold:true,color:AMBER,lineSpacingMultiple:1.15});
try{
  s.addImage({data:b64('IFM-319.jpg'),x:7.95,y:1.55,w:2.15,h:2.85,rounding:true});
  s.addImage({data:b64('IFM-317.jpg'),x:10.3,y:1.55,w:2.15,h:2.85,rounding:true});
  s.addImage({data:b64('IFM-316.jpg'),x:7.95,y:4.6,w:4.5,h:2.0,rounding:true});
  T(s,'the group photograph is held back pending client approval — the system enforces this automatically',{x:7.95,y:6.68,w:4.5,h:.4,fontSize:10,italic:true,color:'8FA9BC',align:'center'});
}catch(e){}

/* ============ 21. PART 4 DIVIDER ============ */
section('FOUR','Running it','What happens without anyone, and what still needs a person.');

/* ============ 22. AUTOMATION ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'What runs without anyone',{x:.85,y:.55,w:11,h:.85,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
T(s,'Four scheduled jobs keep the hub current. None of them require a person to remember anything.',{x:.9,y:1.4,w:11,h:.45,fontSize:15,color:MUTED});
[['7:38','every morning','Content processor','Scans every registered Drive folder, tags new files, collapses duplicates, updates the review count.',TEAL],
 ['8:07','every morning','Daily brief email','A one-page summary to Aditya: what is working, what is stuck, one competitor action.',TEAL],
 ['8:08','every evening','Follower log','Records the Instagram follower count. 39 days of history so far — this is how growth becomes visible.',NAVY],
 ['9:39','Mondays','Competitor refresh','Re-scrapes all 23 tracked accounts and rebuilds the engagement figures. The only job allowed to publish — and only when nothing unrelated is waiting in the tree.','5B8DB8']
].forEach((j,i)=>{
  const y=2.0+i*1.15; card(s,.9,y,11.5,1.02);
  s.addShape('roundRect',{x:1.1,y:y+.16,w:1.15,h:.7,rectRadius:.08,fill:{color:j[4]}});
  T(s,j[0],{x:1.1,y:y+.16,w:1.15,h:.7,fontSize:15,bold:true,color:WHITE,align:'center',valign:'middle',margin:0});
  T(s,j[1],{x:2.4,y:y,w:1.5,h:1.02,fontSize:10.5,color:MUTED,valign:'middle',margin:0});
  T(s,j[2],{x:3.95,y:y,w:2.5,h:1.02,fontSize:14,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,j[3],{x:6.5,y:y,w:5.65,h:1.02,fontSize:11.5,color:MUTED,valign:'middle',lineSpacingMultiple:1.1,margin:0});
});
T(s,'Nothing is published to Instagram automatically, and nothing goes live on the hub without approval.',{x:.9,y:6.75,w:11.5,h:.4,fontSize:13,bold:true,italic:true,color:TEALD});

/* ============ 23. WHO DOES WHAT ============ */
s=pres.addSlide(); s.background={color:WHITE}; logo(s);
T(s,'What each of us does',{x:.85,y:.55,w:11,h:.85,fontFace:HEAD,fontSize:38,bold:true,color:NAVY});
let wy=1.65;
[['Sakshi','Add every class’s photos and videos to IFM Content Drop, ideally the same day. Work the outbound queue on the On Deck tab. Use the Social-ready filter to choose what to post.'],
 ['Hiral','Send the Media Kit link when media request photographs. Review the Published tab for what is resonating — the reel finding is the one to act on.'],
 ['Asba','Tell us where the older photo backlog lives so it can be ingested once and tagged. New material goes straight to Content Drop.'],
 ['Aakara','No change to delivery. Keep the Month → Carousels / Reels / Stories structure — the system now reads it correctly, daily.'],
 ['Aditya','Approve hub deployments, empty the trash folder, and decide the competitor priorities. These are the only steps the system will not take on its own.']
].forEach((w,i)=>{
  s.addShape('roundRect',{x:.9,y:wy,w:11.5,h:.97,rectRadius:.08,fill:{color:i%2?WHITE:CREAM},line:{color:LINE,width:1}});
  s.addShape('ellipse',{x:1.1,y:wy+.18,w:.6,h:.6,fill:{color:TEAL}});
  T(s,w[0][0],{x:1.1,y:wy+.18,w:.6,h:.6,align:'center',valign:'middle',fontSize:18,bold:true,color:WHITE,margin:0});
  T(s,w[0],{x:1.9,y:wy,w:1.6,h:.97,fontSize:15.5,bold:true,color:NAVY,valign:'middle',margin:0});
  T(s,w[1],{x:3.6,y:wy,w:8.6,h:.97,fontSize:11.5,color:MUTED,valign:'middle',lineSpacingMultiple:1.08,margin:0});
  wy+=1.06;
});

/* ============ 24. COMMITMENTS ============ */
s=pres.addSlide(); s.background={color:NAVY};
s.addShape('ellipse',{x:-1.4,y:-1.8,w:5,h:5,fill:{color:INKDK}});
s.addImage({data:LOGO,x:12.45,y:.32,w:.55,h:.55});
T(s,'Three commitments, by design',{x:.85,y:.8,w:11.5,h:.9,fontFace:HEAD,fontSize:36,bold:true,color:WHITE});
[['Complete coverage','Every registered folder is scanned daily. Any file placed in Drive is catalogued and searchable within 24 hours.'],
 ['Compliance before publication','Content involving minors, pending consent, or awaiting client approval is restricted at the tag level — it cannot surface in “Social-ready”.'],
 ['No automated deletion','Rejected items are held in a review folder for 30 days; final deletion requires human action. Existing folders and files remain untouched.']
].forEach((p,i)=>{
  const x=.9+i*3.95;
  s.addShape('roundRect',{x,y:2.1,w:3.65,h:3.3,rectRadius:.12,fill:{color:'22456B'}});
  T(s,'✓',{x:x+.25,y:2.35,w:.8,h:.8,fontSize:34,bold:true,color:'7FD9CB'});
  T(s,p[0],{x:x+.25,y:3.15,w:3.15,h:.8,fontSize:17,bold:true,color:WHITE});
  T(s,p[1],{x:x+.25,y:3.95,w:3.15,h:1.5,fontSize:12,color:'CADCE8',lineSpacingMultiple:1.15});
});
T(s,'Questions — raise them in the team group. Incorrect tag — correct it directly in the Catalogue sheet. Content you can’t locate — treat it as a system issue and report it.',{x:.9,y:5.9,w:11.5,h:.9,fontSize:15,italic:true,color:'8FD1C7',lineSpacingMultiple:1.2});

pres.writeFile({fileName:__dirname+'/IFM-Content-Hub-Guide.pptx'}).then(()=>console.log('written'));
