/* i18n.js — the language layer.

   Two languages and one register.

   'en' is plain Indian English: short words, warm, said out loud the way a
   45-year-old who left school at 16 actually talks. 'hi' is Devanagari at the
   SAME spoken register — Nagpur kitchen table, not a government pamphlet.

   The financial nouns people already own stay in Roman script in BOTH
   languages: SIP, EMI, KYC, PAN, Aadhaar, FD, F&O, NAV, CIBIL, nominee,
   premium, policy, mutual fund, direct plan, term insurance, 1930. Nobody in
   India says "पारस्परिक निधि", so we never write it.

   Banned in both languages (DESIGN §13): inflation/मुद्रास्फीति, nivesh,
   jokhim, chakravriddhi, aapatkalin nidhi, portfolio, corpus, liquidity,
   volatility, diversification, returns-as-a-percentage. Use mehngai, paisa
   lagana, paisa doob sakta hai, byaj pe byaj, bura waqt fund, utaar-chadhav.

   No string here promises a return. No string here blames or shames anybody.

   Money never lives in this file — it is composed by the caller with
   rupees() / lakhCrore() from util.js and passed in as a {var}. */

import { rupees, lakhCrore } from './util.js';
/* The curriculum and the seat names are pure data with no language layer of
   their own, so this module localises those records in place (see
   localiseContent() at the foot of the file). Neither import creates a
   cycle: content.js imports nothing at all, config.js imports nothing at
   all, and neither touches the DOM at module scope. */
import { SQUARES, SNAKES, LADDERS, ZONES, GLOSSARY } from './content.js';
import { tokens } from './config.js';

/* ── the two languages ─────────────────────────────────────────────── */

export const LANGS = ['en', 'hi'];
export const LANG_NAMES = { en: 'English', hi: 'हिंदी' };
/** What the हिं / EN chip prints: the language you are NOT in. */
export const LANG_CHIP = { en: 'हिं', hi: 'EN' };

const STORE_KEY = 'snl.lang';

/** Devanagari digits, if a projector or a print sheet ever wants them.
 *  DEFAULT IS LATIN — that is what Indian price tags, bills and bank
 *  statements use, and the numbers are the one thing that must read
 *  identically in both languages. */
export const NUMERALS = {
  latin:      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  devanagari: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
};

let numeralStyle = 'latin';
export function setNumerals(style) { numeralStyle = style === 'devanagari' ? 'devanagari' : 'latin'; }
export function getNumerals() { return numeralStyle; }

/** Convert the Latin digits in a string to the current numeral style. */
export function toNumerals(s, style = numeralStyle) {
  if (style !== 'devanagari') return String(s);
  const d = NUMERALS.devanagari;
  return String(s).replace(/[0-9]/g, c => d[+c]);
}

/* ── strings ───────────────────────────────────────────────────────────
   Flat dotted keys. 'hi' may omit any key; 't()' falls back to 'en',
   never to the raw key.                                                */

const en = {
  /* — the product — */
  'app.name':            'Saanp Seedhi',
  'app.byline':          'Investing for Mummies',
  'app.tagline':         'The board your house already has. With the real prices painted on it.',
  'loading.title':       'Saanp Seedhi',
  'loading.wait':        'Setting up the board',

  /* — setup — */
  'setup.aria':          'Choose how many people are playing',
  'setup.heading':       'How many of you?',
  'setup.players2':      '2 players',
  'setup.players3':      '3 players',
  'setup.players4':      '4 players',
  'setup.withMithu':     'With Mithu',
  'setup.withMithuSub':  'You and the parrot',
  'setup.playerName':    'Khiladi {n}',
  'setup.mithuName':     'Mithu',
  'setup.rename':        'Change name',
  'setup.renameAria':    'Change the name for {name}',
  'setup.nameHint':      'A short name fits best. You can change it later too.',
  'setup.namePlaceholder': 'Name',
  'setup.saveName':      'Save',
  'setup.howToPlay':     'How do we play?',
  'setup.equalStart':    'Everyone here starts on the same square. Real life does not start everyone in the same place — that is not your fault, and not yours alone to fix.',
  'setup.resumeTitle':   'Carry on from where you stopped?',
  'setup.resumeBody':    'Your last game is saved on this phone. Nothing is lost.',
  'setup.resumeYes':     'Carry on',
  'setup.resumeNo':      'Start fresh',

  /* — the four pieces — */
  'token.matka':         'Matka',
  'token.diya':          'Diya',
  'token.chaabi':        'Chaabi',
  'token.ghanti':        'Ghanti',
  'token.mithu':         'Mithu the parrot',
  'token.aria':          '{name} plays the {token}',

  /* — how to play — */
  'howto.title':         'How to play',
  'howto.dice':          'Tap the dice. Your piece walks that many squares.',
  'howto.ladder':        'A ladder takes you up. Ladders here are small jobs you do once.',
  'howto.snake':         'A snake takes you down. What it cost is painted on its back.',
  'howto.shield':        'The brass lota is your Bura Waqt Fund. It takes one snake bite for you. Once.',
  'howto.jhatka':        'Some squares are nobody’s fault. Those say so.',
  'howto.finish':        'First to 100 wins. Going past 100 also wins.',
  'howto.noLosing':      'Nobody is ever out. Everybody finishes.',
  'howto.close':         'Close',

  /* — the turn — */
  'turn.handoff':        'Pass to {name}',
  'turn.handoffTap':     'TAP',
  'turn.your':           '{name}, your turn',
  'turn.yourShort':      'Your turn',
  'turn.roll':           'Roll',
  'turn.rollAria':       'Roll the dice',
  'turn.rollHint':       'Tap the dice',
  'turn.rolled':         '{name} rolled {value}',
  'turn.moved':          '{from} to {to}',
  'turn.stayed':         '{name} stayed on {to}',
  'turn.six':            'Six. One more roll.',
  'turn.sixAgain':       'Six again. One more roll.',
  'turn.thirdSix':       'Three sixes. The turn moves on — nothing is lost.',
  'turn.extraTurn':      'One more roll',
  'turn.mithuThinking':  'Mithu is thinking',
  'turn.mithuRolled':    'Mithu rolled {value}',
  'turn.autoRolled':     'Rolled for you, so nobody had to wait.',
  'turn.timerAria':      '{n} seconds left in this turn',
  'turn.skip':           'Skip',
  'turn.skipHint':       'Tap anywhere to move on',
  'turn.waiting':        'Waiting for {name}',

  /* — reaching 100 — */
  'finish.needExactly':  'You need exactly {need}',
  'finish.blocked':      '{value} is too many. You need exactly {need}.',
  'finish.triesLeft':    '{n} more rolls, then any number takes you home.',
  'finish.mercy':        'Enough waiting. Any number takes you home now.',
  'finish.overshoot':    'Past 100 counts. You are home.',
  'finish.reached':      '{name} reached 100',
  'finish.lakshya':      'Lakshya poora.',

  /* — ladders — */
  'ladder.header':       'Well done.',
  'ladder.up':           'Up to {to}',
  'ladder.line':         '{name} climbed from {from} to {to}',
  'ladder.stepLabel':    'The first step',
  'ladder.plumbing':     'Not luck. Just a thing that was set up once.',

  /* — snakes — */
  'snake.header':        'This happens to a lot of people.',
  'snake.down':          'Down to {to}',
  'snake.line':          '{name} slid from {from} to {to}',
  'snake.costLabel':     'What it cost',
  'snake.escapeLabel':   'The way out',
  'snake.counterparty':  'Who got paid',
  'snake.notYou':        'The product did this. Not you.',

  /* — Jhatka (the structural-risk deck) — */
  'event.title':         'Jhatka',
  'event.header':        'NOT YOUR FAULT',
  'event.cost':          '4 squares back. This is exactly what a buffer is for.',
  'event.noAdvice':      'There was nothing here to do differently.',
  'event.line':          '{name} — 4 squares back',

  /* — the Bura Waqt Fund — */
  'shield.name':         'Bura Waqt Fund',
  'shield.short':        'Lota',
  'shield.absorbed':     'The Bura Waqt Fund took it. You do not move.',
  'shield.granted':      '{name} now has the Bura Waqt Fund.',
  'shield.grantedLadder': '{name} built the buffer. The Bura Waqt Fund is theirs.',
  'shield.spent':        'Used once. It can come back.',
  'shield.haveAria':     '{name} has the Bura Waqt Fund',
  'shield.noneAria':     '{name} does not have the Bura Waqt Fund',
  'shield.explain':      'Three months of kharcha, reachable the same day.',

  /* — milestones — */
  'milestone.header':    'Look back a minute',
  'milestone.squares':   '{n} squares done',
  'milestone.nothingNew': 'Nothing new here. Just what you already crossed.',

  /* — the lesson card chrome — */
  'lesson.why':          'Why this matters',
  'lesson.action':       'What to do',
  'lesson.readMore':     'Read more',
  'lesson.readLess':     'Close this',
  'lesson.gotIt':        'Got it',
  'lesson.next':         'Next',
  'lesson.handoffNext':  'Pass to {name}',
  'lesson.term':         'The name for this',
  'lesson.heritage':     'On the old board',
  'lesson.square':       'Square {n}',
  'lesson.aria':         'Square {n}. {title}. Tap anywhere to close.',
  'lesson.notGuaranteed': 'not guaranteed',
  'lesson.source':       'Where this number comes from',
  'lesson.dismiss':      'Tap anywhere to carry on',
  'lesson.seenBefore':   'You have been here before.',

  /* — Sabka Sawaal — */
  'quiz.title':          'Sabka Sawaal',
  'quiz.guessFirst':     'Guess first',
  'quiz.noWrong':        'No wrong answer. No score.',
  'quiz.askRoom':        'Ask the whole room',
  'quiz.chipAria':       'Answer: {text}',
  'quiz.answerLabel':    'The answer',
  'quiz.mostGuessLow':   'Most people guess low.',
  'quiz.normalise':      'Most people get this one wrong, and that is the point.',
  'quiz.continue':       'Carry on',

  /* — HUD — */
  'hud.standings':       'Where everyone is',
  'hud.square':          'Square {n}',
  'hud.onSquare':        '{name} · square {n}',
  'hud.aheadBy':         '{n} squares ahead',
  'hud.behindBy':        '{n} squares behind',
  'hud.youAre':          'You are {rank}, {n} squares behind',
  'hud.youAreLeading':   'You are first',
  'hud.leading':         'Ahead',
  'hud.log':             'What just happened',
  'hud.menu':            'Settings',
  'hud.help':            'How to play',
  'hud.mute':            'Turn sound off',
  'hud.unmute':          'Turn sound on',
  'hud.soundIsOn':       'Sound is on',
  'hud.soundIsOff':      'Sound is off',
  'hud.langToggleAria':  'Switch language to {lang}',
  'hud.diceAria':        'Dice showing {n}. Tap to roll.',
  'hud.diceReadyAria':   'Dice ready. Tap to roll.',
  'hud.diceRollingAria': 'Dice rolling',
  'hud.turnOf':          '{name} to roll',

  /* — settings — */
  'settings.title':          'Settings',
  'settings.language':       'Language',
  'settings.sound':          'Sound',
  'settings.exactFinish':    'Poora hisaab',
  'settings.exactFinishSub': 'Land exactly on 100. Miss twice and any roll finishes.',
  'settings.workshop':       'Workshop mode',
  'settings.workshopSub':    'No timers. Cards wait for you. For a class.',
  'settings.reducedMotion':  'Less movement',
  'settings.reducedMotionSub': 'Smaller, quieter animation. Everything still happens.',
  'settings.turnTimer':      'Turn timer',
  'settings.turnTimerSub':   '20 seconds, then it rolls for you. It never skips you.',
  'settings.voice':          'Read titles aloud',
  'settings.voiceSub':       'Only the square name and the number. Never the whole card.',
  'settings.drone':          'Soft background note',
  'settings.droneSub':       'Very quiet. Off by default.',
  'settings.projector':      'Projector mode',
  'settings.projectorSub':   'Camera stays still, numbers get bigger. For a hall.',
  'settings.textSize':       'Text size',
  'settings.textSize100':    'Normal',
  'settings.textSize125':    'Big',
  'settings.textSize150':    'Biggest',
  'settings.printBoard':     'Print the board',
  'settings.newGame':        'New game',
  'settings.close':          'Done',
  'settings.on':             'On',
  'settings.off':            'Off',

  /* — end of game — */
  'end.arrival':         'Lakshya poora.',
  'end.arrivalSub':      '{name} got there. Not the richest — the one who reached what they were saving for.',
  'end.everyone':        'Everybody arrived',
  'end.finishedOn':      'finished on square {n}',
  'end.yourPath':        'Your road',
  'end.laddersHeading':  'LADDERS YOU CLIMBED',
  'end.snakesHeading':   'SNAKES THAT BIT',
  'end.shieldHeading':   'YOUR BUFFER',
  'end.shieldSaved.one': 'The Bura Waqt Fund saved you once.',
  'end.shieldSaved.other': 'The Bura Waqt Fund saved you {n} times.',
  'end.shieldHeld':      'You still have the Bura Waqt Fund. Nothing needed it.',
  'end.noLadders':       'No ladders this game. The dice decides that, not you.',
  'end.noSnakes':        'No snake touched you this game.',
  'end.oneNumber':       'One number to take home',
  'end.readMost':        'You read the most',
  'end.readMostBody':    'You met {mine} of them. {name} met {theirs}. You can name every one of yours now.',
  'end.thisWeek':        'One job this week',
  'end.thisWeekSub':     'Fifteen minutes. Only this one.',
  'end.thisWeekDone':    'Done',
  'end.thisWeekSaved':   'Ticked. It will still be here on Saturday.',
  'end.missed':          'What nobody landed on',
  'end.missedSub':       'The squares no piece stopped on today.',
  'end.teacher':         'Ask the table',
  'end.teacherQ':        'Which snake cost the most, and why?',
  'end.playAgain':       'Play again',
  'end.savePhoto':       'Save as a photo',
  'end.printBoard':      'Print the board',
  'end.home':            'New players',
  'end.rounds.one':      '1 round',
  'end.rounds.other':    '{n} rounds',
  'end.noScore':         'No score, no coins, no money total. That was never the game.',

  /* — the five zones — */
  'zone.1':              'Ghar ka hisaab',
  'zone.1.sub':          'Where the money actually goes',
  'zone.2':              'Bura waqt aur kaagaz',
  'zone.2.sub':          'The buffer, and the paperwork nobody warns you about',
  'zone.3':              'Suraksha aur dhokha',
  'zone.3.sub':          'Cover that holds, and pitches that do not',
  'zone.4':              'Badhna',
  'zone.4.sub':          'Small amounts, long time',
  'zone.5':              'Kaagaz aur manzil',
  'zone.5.sub':          'Not being fooled, and telling your family',

  /* — glossary — */
  'glossary.title':      'Words, in plain language',
  'glossary.open':       'Word list',
  'glossary.search':     'Find a word',
  'glossary.sayThis':    'What we say instead',
  'glossary.means':      'What it means',
  'glossary.empty':      'No word matches that.',

  /* — errors and fallbacks. Never blame the device, never blame the player. — */
  'error.title':         'Something went wrong',
  'error.body':          'Not your fault. The game can start again from here.',
  'error.reload':        'Start again',
  'error.webglTitle':    'Showing the flat board',
  'error.webglBody':     'This phone gets the plain board. Every square, every lesson, exactly the same.',
  'error.storage':       'This phone is not saving the game. You can still play the whole thing.',
  'error.audio':         'Sound could not start. Everything works without it.',
  'error.saveFailed':    'Could not save the picture. A screenshot works just as well.',
  'error.printFailed':   'Could not open the print sheet.',
  'error.retry':         'Try again',

  /* — screen reader — */
  'a11y.live':           '{name} rolled {value}. {from} to {to}. {title}. {line}',
  'a11y.liveLadder':     '{name} climbed the ladder from {from} to {to}. {title}.',
  'a11y.liveSnake':      '{name} came down the snake from {from} to {to}. {title}.',
  'a11y.liveShield':     'The Bura Waqt Fund absorbed it. {name} does not move.',
  'a11y.liveEvent':      'Jhatka on square {cell}. Not {name}’s fault. 4 squares back.',
  'a11y.liveWin':        '{name} reached 100. Lakshya poora.',
  'a11y.liveShieldGot':  '{name} now has the Bura Waqt Fund.',
  'a11y.board':          'The board, 100 squares, one to a hundred',
  'a11y.cell':           'Square {n}. {title}. {occupants}',
  'a11y.cellEmpty':      'nobody here',
  'a11y.skipToDice':     'Skip to the dice',
  'a11y.langChanged':    'Language changed to {lang}',

  /* — ordinals (four players, so four are enough) — */
  'ordinal.1':           '1st',
  'ordinal.2':           '2nd',
  'ordinal.3':           '3rd',
  'ordinal.4':           '4th',
  'ordinal.n':           '{n}th',
  /* The oblique form. English does not inflect, so these are the same words —
     they exist so a caller can ask for the right Hindi grammar (see below). */
  'ordinalObl.1':        '1st',
  'ordinalObl.2':        '2nd',
  'ordinalObl.3':        '3rd',
  'ordinalObl.4':        '4th',
  'ordinalObl.n':        '{n}th',

  /* — small shared words — */
  'common.close':        'Close',
  'common.cancel':       'Cancel',
  'common.ok':           'OK',
  'common.back':         'Back',
  'common.yes':          'Yes',
  'common.no':           'No',
  'common.and':          'and',
  'common.tapAnywhere':  'Tap anywhere',
  'common.you':          'you',
  'common.squares.one':  '1 square',
  'common.squares.other': '{n} squares',
};

const hi = {
  /* — the product — */
  'app.name':            'साँप सीढ़ी',
  'app.tagline':         'वही बोर्ड जो घर में पहले से है। असली दामों के साथ।',
  'loading.title':       'साँप सीढ़ी',
  'loading.wait':        'बोर्ड लग रहा है',

  /* — setup — */
  'setup.aria':          'कितने लोग खेल रहे हैं, चुनो',
  'setup.heading':       'कितने लोग हैं?',
  'setup.players2':      '2 खिलाड़ी',
  'setup.players3':      '3 खिलाड़ी',
  'setup.players4':      '4 खिलाड़ी',
  'setup.withMithu':     'मिठू के साथ',
  'setup.withMithuSub':  'आप और तोता',
  'setup.playerName':    'खिलाड़ी {n}',
  'setup.mithuName':     'मिठू',
  'setup.rename':        'नाम बदलो',
  'setup.renameAria':    '{name} का नाम बदलो',
  'setup.nameHint':      'छोटा नाम अच्छा बैठता है। बाद में भी बदल सकते हो।',
  'setup.namePlaceholder': 'नाम',
  'setup.saveName':      'ठीक है',
  'setup.howToPlay':     'कैसे खेलें?',
  'setup.equalStart':    'सब यहीं से, एक जैसे शुरू कर रहे हैं। असली ज़िंदगी में ऐसा नहीं होता — वो अलग लड़ाई है, और वो अकेले आपकी नहीं है।',
  'setup.resumeTitle':   'जहाँ छोड़ा था, वहीं से चलें?',
  'setup.resumeBody':    'पिछला खेल इसी फ़ोन में रखा है। कुछ गया नहीं।',
  'setup.resumeYes':     'हाँ, आगे चलो',
  'setup.resumeNo':      'नया खेल',

  /* — the four pieces — */
  'token.matka':         'मटका',
  'token.diya':          'दिया',
  'token.chaabi':        'चाबी',
  'token.ghanti':        'घंटी',
  'token.mithu':         'मिठू तोता',
  'token.aria':          '{name} का निशान — {token}',

  /* — how to play — */
  'howto.title':         'कैसे खेलें',
  'howto.dice':          'पासे पे टैप करो। जितना आया, उतने घर चलो।',
  'howto.ladder':        'सीढ़ी मिली तो ऊपर। यहाँ सीढ़ी वो काम है जो एक बार करो, फिर चलता रहता है।',
  'howto.snake':         'साँप मिला तो नीचे। कितने का पड़ा, वो उसकी पीठ पे लिखा है।',
  'howto.shield':        'पीतल का लोटा आपका बुरा वक़्त फंड है। एक बार, एक डसना खा जाता है।',
  'howto.jhatka':        'कुछ घर किसी की गलती नहीं होते। वहाँ ऐसा ही लिखा मिलेगा।',
  'howto.finish':        '100 पे पहले पहुँचो। 100 से आगे निकल गए, तब भी पहुँच गए।',
  'howto.noLosing':      'कोई बाहर नहीं होता। सब पहुँचते हैं।',
  'howto.close':         'बंद करो',

  /* — the turn — */
  'turn.handoff':        '{name} को दो',
  'turn.handoffTap':     'टैप',
  'turn.your':           '{name}, आपकी बारी',
  'turn.yourShort':      'आपकी बारी',
  'turn.roll':           'चलो',
  'turn.rollAria':       'पासा फेंको',
  'turn.rollHint':       'पासे पे टैप करो',
  'turn.rolled':         '{name} ने {value} डाला',
  'turn.moved':          '{from} से {to}',
  'turn.stayed':         '{name} {to} पे ही रुके',
  'turn.six':            'छक्का। एक चाल और।',
  'turn.sixAgain':       'फिर छक्का। एक चाल और।',
  'turn.thirdSix':       'तीन छक्के। बारी आगे बढ़ी — कुछ गया नहीं।',
  'turn.extraTurn':      'एक चाल और',
  'turn.mithuThinking':  'मिठू सोच रही है',
  'turn.mithuRolled':    'मिठू ने {value} डाला',
  'turn.autoRolled':     'आपके लिए चल दिया, ताकि किसी को रुकना न पड़े।',
  'turn.timerAria':      'इस बारी में {n} सेकंड बचे',
  'turn.skip':           'आगे',
  'turn.skipHint':       'आगे बढ़ने के लिए कहीं भी टैप करो',
  'turn.waiting':        '{name} का इंतज़ार',

  /* — reaching 100 — */
  'finish.needExactly':  'आपको ठीक {need} चाहिए',
  'finish.blocked':      '{value} ज़्यादा हो गया। ठीक {need} चाहिए।',
  'finish.triesLeft':    '{n} चाल और — उसके बाद कोई भी नंबर आपको पहुँचा देगा।',
  'finish.mercy':        'बहुत इंतज़ार हो गया। अब कोई भी नंबर आपको पहुँचा देगा।',
  'finish.overshoot':    '100 से आगे भी चलेगा। आप पहुँच गए।',
  'finish.reached':      '{name} 100 पे पहुँच गए',
  'finish.lakshya':      'लक्ष्य पूरा।',

  /* — ladders — */
  'ladder.header':       'अच्छा किया।',
  'ladder.up':           '{to} तक ऊपर',
  'ladder.line':         '{name} {from} से {to} चढ़ गए',
  'ladder.stepLabel':    'पहला कदम',
  'ladder.plumbing':     'किस्मत नहीं। बस एक काम जो एक बार कर लिया था।',

  /* — snakes — */
  'snake.header':        'ये बहुत लोगों के साथ होता है।',
  'snake.down':          '{to} तक नीचे',
  'snake.line':          '{name} {from} से {to} फिसल गए',
  'snake.costLabel':     'कितने का पड़ा',
  'snake.escapeLabel':   'निकलने का रास्ता',
  'snake.counterparty':  'ये पैसा किसको गया',
  'snake.notYou':        'ये प्रोडक्ट ने किया। आपने नहीं।',

  /* — Jhatka — */
  'event.title':         'झटका',
  'event.header':        'आपकी गलती नहीं',
  'event.cost':          '4 घर पीछे। बुरा वक़्त फंड ठीक इसी के लिए होता है।',
  'event.noAdvice':      'इसमें अलग से कुछ करने को था ही नहीं।',
  'event.line':          '{name} — 4 घर पीछे',

  /* — the Bura Waqt Fund — */
  'shield.name':         'बुरा वक़्त फंड',
  'shield.short':        'लोटा',
  'shield.absorbed':     'बुरा वक़्त फंड ने संभाल लिया। आप वहीं के वहीं।',
  'shield.granted':      '{name} को बुरा वक़्त फंड मिला।',
  'shield.grantedLadder': '{name} ने बुरा वक़्त फंड बना लिया।',
  'shield.spent':        'एक बार काम आ गया। दोबारा भी मिल सकता है।',
  'shield.haveAria':     '{name} के पास बुरा वक़्त फंड है',
  'shield.noneAria':     '{name} के पास अभी बुरा वक़्त फंड नहीं है',
  'shield.explain':      'तीन महीने का खर्चा, उसी दिन निकाल सको ऐसा।',

  /* — milestones — */
  'milestone.header':    'ज़रा पीछे देखो',
  'milestone.squares':   '{n} घर हो गए',
  'milestone.nothingNew': 'नया कुछ नहीं। जो पार कर आए, बस वही।',

  /* — lesson card chrome — */
  'lesson.why':          'ये क्यों ज़रूरी है',
  'lesson.action':       'क्या करना है',
  'lesson.readMore':     'और पढ़ो',
  'lesson.readLess':     'बंद करो',
  'lesson.gotIt':        'समझ गए',
  'lesson.next':         'आगे',
  'lesson.handoffNext':  '{name} को दो',
  'lesson.term':         'इसका नाम',
  'lesson.heritage':     'पुराने बोर्ड पे',
  'lesson.square':       'घर {n}',
  'lesson.aria':         'घर {n}। {title}। बंद करने के लिए कहीं भी टैप करो।',
  'lesson.notGuaranteed': 'गारंटी नहीं है',
  'lesson.source':       'ये नंबर कहाँ से आया',
  'lesson.dismiss':      'आगे बढ़ने के लिए कहीं भी टैप करो',
  'lesson.seenBefore':   'यहाँ आप पहले भी आ चुके हो।',

  /* — Sabka Sawaal — */
  'quiz.title':          'सबका सवाल',
  'quiz.guessFirst':     'पहले अंदाज़ा लगाओ',
  'quiz.noWrong':        'कोई जवाब गलत नहीं। कोई नंबर नहीं मिलता।',
  'quiz.askRoom':        'सबसे पूछो',
  'quiz.chipAria':       'जवाब: {text}',
  'quiz.answerLabel':    'जवाब',
  'quiz.mostGuessLow':   'ज़्यादातर लोग कम बताते हैं।',
  'quiz.normalise':      'ये ज़्यादातर लोगों से छूट जाता है — बात ही यही है।',
  'quiz.continue':       'आगे चलो',

  /* — HUD — */
  'hud.standings':       'कौन कहाँ है',
  'hud.square':          'घर {n}',
  'hud.onSquare':        '{name} · घर {n}',
  'hud.aheadBy':         '{n} घर आगे',
  'hud.behindBy':        '{n} घर पीछे',
  'hud.youAre':          '{rank} — {n} घर पीछे',
  'hud.youAreLeading':   'आप सबसे आगे हो',
  'hud.leading':         'सबसे आगे',
  'hud.log':             'अभी क्या हुआ',
  'hud.menu':            'सेटिंग',
  'hud.help':            'कैसे खेलें',
  'hud.mute':            'आवाज़ बंद करो',
  'hud.unmute':          'आवाज़ चालू करो',
  'hud.soundIsOn':       'आवाज़ चालू है',
  'hud.soundIsOff':      'आवाज़ बंद है',
  'hud.langToggleAria':  'भाषा बदलकर {lang} करो',
  'hud.diceAria':        'पासे पे {n}। फेंकने के लिए टैप करो।',
  'hud.diceReadyAria':   'पासा तैयार है। टैप करके फेंको।',
  'hud.diceRollingAria': 'पासा घूम रहा है',
  'hud.turnOf':          '{name} की बारी',

  /* — settings — */
  'settings.title':          'सेटिंग',
  'settings.language':       'भाषा',
  'settings.sound':          'आवाज़',
  'settings.exactFinish':    'पूरा हिसाब',
  'settings.exactFinishSub': 'ठीक 100 पे उतरना। दो बार चूके तो कोई भी नंबर चलेगा।',
  'settings.workshop':       'वर्कशॉप मोड',
  'settings.workshopSub':    'कोई टाइमर नहीं। कार्ड रुके रहेंगे। क्लास के लिए।',
  'settings.reducedMotion':  'कम हिलना',
  'settings.reducedMotionSub': 'हिलना-डुलना कम। होगा सब कुछ वैसे ही।',
  'settings.turnTimer':      'बारी का टाइमर',
  'settings.turnTimerSub':   '20 सेकंड, फिर अपने आप चल जाएगा। बारी कभी छूटती नहीं।',
  'settings.voice':          'नाम आवाज़ में पढ़ो',
  'settings.voiceSub':       'सिर्फ़ घर का नाम और नंबर। पूरा कार्ड कभी नहीं।',
  'settings.drone':          'हल्की सी धुन',
  'settings.droneSub':       'बहुत धीमी। पहले से बंद है।',
  'settings.projector':      'प्रोजेक्टर मोड',
  'settings.projectorSub':   'कैमरा हिलेगा नहीं, नंबर बड़े हो जाएंगे। हॉल के लिए।',
  'settings.textSize':       'लिखाई का साइज़',
  'settings.textSize100':    'सामान्य',
  'settings.textSize125':    'बड़ा',
  'settings.textSize150':    'सबसे बड़ा',
  'settings.printBoard':     'बोर्ड प्रिंट करो',
  'settings.newGame':        'नया खेल',
  'settings.close':          'हो गया',
  'settings.on':             'चालू',
  'settings.off':            'बंद',

  /* — end of game — */
  'end.arrival':         'लक्ष्य पूरा।',
  'end.arrivalSub':      '{name} पहुँच गए। सबसे अमीर नहीं — जिसका लक्ष्य पूरा हुआ।',
  'end.everyone':        'सब पहुँचे',
  'end.finishedOn':      'घर {n} पे रुके',
  'end.yourPath':        'आपका रास्ता',
  'end.laddersHeading':  'सीढ़ियाँ जो आपने चढ़ीं',
  'end.snakesHeading':   'साँप जो मिले',
  'end.shieldHeading':   'आपका बुरा वक़्त फंड',
  'end.shieldSaved.one': 'बुरा वक़्त फंड ने आपको एक बार बचाया।',
  'end.shieldSaved.other': 'बुरा वक़्त फंड ने आपको {n} बार बचाया।',
  'end.shieldHeld':      'बुरा वक़्त फंड अब भी आपके पास है। ज़रूरत ही नहीं पड़ी।',
  'end.noLadders':       'इस बार कोई सीढ़ी नहीं मिली। ये पासा तय करता है, आप नहीं।',
  'end.noSnakes':        'इस खेल में कोई साँप छुआ तक नहीं।',
  'end.oneNumber':       'एक नंबर, घर ले जाने के लिए',
  'end.readMost':        'सबसे ज़्यादा आपने पढ़ा',
  'end.readMostBody':    'आपको {mine} मिले। {name} को {theirs}। अब आप अपने सबका नाम बता सकते हो।',
  'end.thisWeek':        'इस हफ़्ते एक काम',
  'end.thisWeekSub':     'पंद्रह मिनट। बस यही एक।',
  'end.thisWeekDone':    'हो गया',
  'end.thisWeekSaved':   'निशान लग गया। शनिवार को भी यहीं मिलेगा।',
  'end.missed':          'जो छूट गया',
  'end.missedSub':       'जिन घरों पे आज कोई नहीं रुका।',
  'end.teacher':         'टेबल से पूछो',
  'end.teacherQ':        'किस साँप ने सबसे ज़्यादा नुकसान किया, और क्यों?',
  'end.playAgain':       'फिर से खेलो',
  'end.savePhoto':       'फ़ोटो सेव करो',
  'end.printBoard':      'बोर्ड प्रिंट करो',
  'end.home':            'नए खिलाड़ी',
  'end.rounds.one':      '1 राउंड',
  'end.rounds.other':    '{n} राउंड',
  'end.noScore':         'कोई स्कोर नहीं, कोई सिक्के नहीं, किसी का पैसा नहीं गिना। खेल कभी वो था ही नहीं।',

  /* — zones — */
  'zone.1':              'घर का हिसाब',
  'zone.1.sub':          'पैसा असल में जाता कहाँ है',
  'zone.2':              'बुरा वक़्त और कागज़',
  'zone.2.sub':          'बुरा वक़्त फंड, और वो कागज़ जिसके बारे में कोई नहीं बताता',
  'zone.3':              'सुरक्षा और धोखा',
  'zone.3.sub':          'जो cover टिकता है, और जो बातें नहीं टिकतीं',
  'zone.4':              'बढ़ना',
  'zone.4.sub':          'थोड़ा-थोड़ा, लंबे समय तक',
  'zone.5':              'कागज़ और मंज़िल',
  'zone.5.sub':          'धोखे में न आना, और घरवालों को बता देना',

  /* — glossary — */
  'glossary.title':      'शब्द, आसान भाषा में',
  'glossary.open':       'शब्दों की सूची',
  'glossary.search':     'शब्द ढूँढो',
  'glossary.sayThis':    'हम इसकी जगह ये कहते हैं',
  'glossary.means':      'मतलब',
  'glossary.empty':      'ऐसा कोई शब्द नहीं मिला।',

  /* — errors — */
  'error.title':         'कुछ गड़बड़ हो गई',
  'error.body':          'आपकी गलती नहीं। खेल यहीं से फिर चालू हो सकता है।',
  'error.reload':        'फिर से चालू करो',
  'error.webglTitle':    'सादा बोर्ड दिखा रहे हैं',
  'error.webglBody':     'इस फ़ोन पे सादा बोर्ड चलेगा। सारे घर, सारी बातें — बिल्कुल वही।',
  'error.storage':       'ये फ़ोन खेल सेव नहीं कर पा रहा। खेलने में कोई रुकावट नहीं।',
  'error.audio':         'आवाज़ चालू नहीं हो पाई। बिना आवाज़ के भी सब चलेगा।',
  'error.saveFailed':    'तस्वीर सेव नहीं हुई। स्क्रीनशॉट भी उतना ही काम करेगा।',
  'error.printFailed':   'प्रिंट वाला पन्ना नहीं खुल पाया।',
  'error.retry':         'फिर कोशिश करो',

  /* — screen reader — */
  'a11y.live':           '{name} ने {value} डाला। {from} से {to}। {title}। {line}',
  'a11y.liveLadder':     '{name} सीढ़ी से {from} से {to} चढ़े। {title}।',
  'a11y.liveSnake':      '{name} साँप से {from} से {to} नीचे आए। {title}।',
  'a11y.liveShield':     'बुरा वक़्त फंड ने संभाल लिया। {name} वहीं हैं।',
  'a11y.liveEvent':      'घर {cell} पे झटका। {name} की गलती नहीं। 4 घर पीछे।',
  'a11y.liveWin':        '{name} 100 पे पहुँच गए। लक्ष्य पूरा।',
  'a11y.liveShieldGot':  '{name} को बुरा वक़्त फंड मिला।',
  'a11y.board':          'बोर्ड, 100 घर, एक से सौ तक',
  'a11y.cell':           'घर {n}। {title}। {occupants}',
  'a11y.cellEmpty':      'यहाँ कोई नहीं',
  'a11y.skipToDice':     'सीधे पासे पे जाओ',
  'a11y.langChanged':    'भाषा बदलकर {lang} हो गई',

  /* — ordinals — */
  /* Nominative — the standalone podium badge. 'पहले' alone reads as
     'earlier', which is why the winner's badge was wrong. */
  'ordinal.1':           'पहला',
  'ordinal.2':           'दूसरा',
  'ordinal.3':           'तीसरा',
  'ordinal.4':           'चौथा',
  'ordinal.n':           '{n}वाँ',
  /* Oblique — inside a phrase, and after the honorific आप. */
  'ordinalObl.1':        'पहले',
  'ordinalObl.2':        'दूसरे',
  'ordinalObl.3':        'तीसरे',
  'ordinalObl.4':        'चौथे',
  'ordinalObl.n':        '{n}वें',

  /* — small shared words — */
  'common.close':        'बंद करो',
  'common.cancel':       'रहने दो',
  'common.ok':           'ठीक है',
  'common.back':         'वापस',
  'common.yes':          'हाँ',
  'common.no':           'नहीं',
  'common.and':          'और',
  'common.tapAnywhere':  'कहीं भी टैप करो',
  'common.you':          'आप',
  'common.squares.one':  '1 घर',
  'common.squares.other': '{n} घर',
};

/* ── the curriculum, in Hindi ──────────────────────────────────────────
   content.js is a pure data file with no language layer of its own, so for
   a long time 'Hindi' meant Hindi buttons around English teaching. This is
   the other 86% of the words: every square title and lesson line, every
   quiz, every Jhatka card, every snake and ladder, and the word list.

   Keyed the way the game already addresses its own content:
     'sq.<n>'        a square, 1..100
     'snake.<from>'  a snake, by the square its head sits on
     'ladder.<from>' a ladder, by the square its foot sits on
     'gloss.<term>'  a glossary row, by its English term

   Field names match content.js exactly, nested objects included, so the
   table can be diffed against the English by machine.

   Register: Nagpur kitchen table. The nouns a family already owns stay in
   Roman in BOTH languages — SIP, FD, KYC, PAN, Aadhaar, policy, premium,
   cover, mutual fund, direct plan, term insurance, NAV, expense ratio,
   nominee, F&O, 1930. Rupee figures are byte-identical to the English:
   the numbers are the one thing that must not move between languages.  */

export const CONTENT_HI = {
  'sq.1': { title: 'पहला कदम',
    lesson: 'यहाँ सब एक ही घर से शुरू कर रहे हैं। पैसे की कोई जानकारी नहीं चाहिए। बस पासा फेंको।' },
  'sq.2': { title: 'पैसा आता है, चला जाता है',
    lesson: 'तनख़्वाह 1 को आती है और 20 तक ख़त्म। आज पता करते हैं कहाँ जाती है।' },
  'sq.3': { title: 'सात दिन का हिसाब',
    lesson: 'सात दिन तक जो भी रुपया बाहर जाए, लिख लो। बस इतना।' },
  'sq.4': { title: 'दो चाय रोज़',
    lesson: 'रोज़ की दो ₹30 वाली चाय साल की ₹21,900 है। गुनाह नहीं। पर पता होना चाहिए।' },
  'sq.5': { title: 'घर का खर्चा',
    lesson: 'किराया, राशन, फीस, बिजली, दवाई। ये पहले आते हैं, और किसी को बुरा मानने की ज़रूरत नहीं।' },
  'sq.6': { title: 'शौक़ भी ज़रूरी',
    lesson: 'बाकी सब शौक़ है। ग़लत नहीं — बस वो जो बुरे महीने में रोका जा सकता है।' },
  'sq.7': { title: 'महंगाई चुपके से',
    lesson: 'इस साल ₹50 की थाली अगले साल करीब ₹53 की। वही दुकान, वही थाली।' },
  'sq.8': { title: 'अंदाज़ा लगाओ',
    lesson: 'पहले अंदाज़ा लगाओ: 2006 में सिनेमा का टिकट ₹60 का था। आज कितने का?',
    quiz: {
      question: '2006 में सिनेमा का टिकट ₹60 का था। आज?',
      chips: ['करीब ₹120', 'करीब ₹250'],
      reveal: 'ज़्यादातर लोग कम बताते हैं। करीब ₹250 — बीस साल में लगभग चार गुना। कुछ ग़लत नहीं हुआ। यही महंगाई है।',
    } },
  'sq.9': { title: 'नीचे से फिर से',
    lesson: 'फिर नीचे के पास। यहाँ हर कोई एक बार खड़ा होता है। अभी कुछ गया नहीं।' },
  'sq.10': { title: 'दस का निशान',
    lesson: 'दस घर हो गए। एक सच अब पक्का पता है: चुपचाप रखा पैसा चुपचाप छोटा होता जाता है।',
    bullets: [
      'अकेला छोड़ा हुआ पैसा एक जगह टिकता नहीं।',
      'महंगाई हर एक साल, चुपचाप उसे हिला देती है।',
      'इसीलिए "बस safe रखो" कभी प्लान था ही नहीं।',
    ],
    action: 'हर महीने ख़रीदी जाने वाली एक चीज़ चुनो और पूछो कि दस साल पहले उसका दाम क्या था।',
    deep: 'करीब 6% महंगाई पे, स्टील के डिब्बे में रखे ₹1,00,000 बीस साल बाद करीब ₹31,000 की चीज़ें ख़रीदते हैं। हिसाब सीधा है: ₹1,00,000 को 1.06 से बीस बार बाँटो, वो करीब 3.21 बनता है। 2006 में ₹60 का सिनेमा टिकट आज करीब ₹250 का है। न कुछ ग़लत हुआ, न किसी ने चोरी की। बस उन्हीं रुपयों से हर साल कम सामान आया।' },
  'sq.11': { title: 'डिब्बे में पैसा',
    lesson: 'घर का कैश सबसे safe लगता है। और वही एक पैसा है जो कभी बढ़ता नहीं।' },
  'sq.12': { title: 'पहली SIP — ₹500',
    lesson: 'हर महीने ₹500, एक तारीख़, एक fund। पहली वाली सबसे मुश्किल होती है।',
    heritage: 'पुराने बोर्ड पे इस घर को श्रद्धा कहते थे। पहला कदम आज भी सबसे मुश्किल है।' },
  'sq.13': { title: 'किसी को बताया नहीं',
    lesson: 'आपने चुपचाप शुरू किया। ये चलता है। पैसे को किसी की इजाज़त नहीं चाहिए।' },
  'sq.14': { title: 'ब्याज पे ब्याज',
    lesson: 'आपका ब्याज ख़ुद अपना ब्याज कमाने लगता है। सालों तक धीरे, फिर धीरे नहीं।' },
  'sq.15': { title: 'झटका',
    lesson: 'इस महीने कुछ टूट गया। किसी ने प्लान नहीं किया था। कार्ड उठाओ।',
    event: {
      name: 'स्कूटर ख़राब',
      line: '₹4,000 की मरम्मत, बिना बताए।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। बुरा वक़्त फंड ठीक इसी के लिए होता है।',
    } },
  'sq.16': { title: 'छोटा शुरू करो',
    lesson: '₹500 महीना भी असली शुरुआत है। बड़ी रकम का इंतज़ार करते-करते दस साल निकल जाते हैं।' },
  'sq.17': { title: 'आधार से मोबाइल जोड़ो',
    lesson: 'आपके Aadhaar पे वही नंबर होना चाहिए जो आज चलता है, वरना ऑनलाइन कुछ नहीं खुलेगा।' },
  'sq.18': { title: 'बैंक की लाइन',
    lesson: 'उस लाइन में आप सबके लिए खड़े हुए हो। आज अपने लिए।' },
  'sq.19': { title: 'नाम एक जैसा हो',
    lesson: 'PAN, Aadhaar और बैंक — तीनों पे स्पेलिंग एक जैसी। एक अक्षर सब रोक देता है।' },
  'sq.20': { title: 'फिर चलो',
    lesson: 'घर गए हैं, खेल नहीं। जो पासा फेंकते रहते हैं वही 100 पे पहुँचते हैं।' },
  'sq.21': { title: 'हिसाब साफ़ है',
    lesson: 'कितना आया, कितना गया, और बीच का फ़र्क़। ज़्यादातर लोग इसे कभी लिखते ही नहीं।' },
  'sq.22': { title: 'लीक मिल गया',
    lesson: 'लीक मिल गया। अब वही तनख़्वाह ज़्यादा दूर तक चलेगी, बिना किसी बढ़ोतरी के।' },
  'sq.23': { title: 'बच्चों की फीस',
    lesson: 'स्कूल की फीस हर साल बढ़ती है, तो उसके लिए रखा पैसा भी बढ़ना चाहिए।' },
  'sq.24': { title: 'safe का मतलब',
    lesson: 'Safe का मतलब है कुछ ग़लत नहीं हो सकता। ग़लत तो महंगाई कर रही है, चुपचाप।',
    why: 'FD में ₹1,00,000 पे 6.5% से ₹6,500 मिले। टैक्स और महंगाई के बाद असल में करीब ₹50 बचते हैं।',
    action: 'छह महीने का खर्चा FD में रखो, और बाकी को safe कहना बंद करो।',
    deep: 'FD में ₹1,00,000, 6.5% पे, साल में ₹6,500 देते हैं। 30% वाले स्लैब में ₹1,950 टैक्स चला जाता है, बचे ₹4,550। 4.5% महंगाई पे करीब ₹4,500 की ख़रीदने की ताक़त चुपचाप ग़ायब हो जाती है। असल में बचते हैं करीब ₹50। FD ने अपना काम किया और रुपये बचा लिए। उन रुपयों से क्या आता है, उसे बचाने के लिए वो बनी ही नहीं थी।' },
  'sq.25': { title: 'बुरा वक़्त फंड',
    lesson: 'तीन महीने का खर्चा, एक दिन में हाथ में। यही आपकी ढाल है।' },
  'sq.26': { title: 'कहाँ रखें',
    lesson: 'इमरजेंसी का पैसा बैंक में रहता है, lock-in में नहीं। यहाँ रफ़्तार रिटर्न से बड़ी है।' },
  'sq.27': { title: 'FD से बेहतर स्कीम',
    lesson: 'बताया गया FD से बेहतर। थी 15 साल की policy, जो करीब 4 पैसे प्रति रुपया देती है।' },
  'sq.28': { title: 'सबक़ मिला',
    lesson: 'उस गिरावट में घर गए। और यहाँ का सबसे महँगा सबक़ भी वहीं मिला।' },
  'sq.29': { title: 'क्या होता अगर',
    lesson: 'अंदाज़ा लगाओ: कल से कमाई बंद हो जाए तो ये घर कितने महीने चलेगा?',
    quiz: {
      question: 'कल से कमाई बंद हो जाए तो ये घर कितने महीने चलेगा?',
      chips: ['एक महीना या उससे कम', 'तीन महीने या ज़्यादा'],
      reveal: 'ज़्यादातर घर कहते हैं "एक महीना या कम" — और वो सच बोल रहे होते हैं। तीन महीने का खर्चा अलग रखना, यही निशाना है।',
    } },
  'sq.30': { title: 'SIP चालू है',
    lesson: 'आपके ₹500 अब हर रोज़ काम कर रहे हैं, बिना आपके कुछ किए।' },
  'sq.31': { title: 'झटका',
    lesson: 'घर में कोई बीमार है। किसी ने ये प्लान नहीं किया था। कार्ड उठाओ।',
    event: {
      name: 'घर में बीमारी',
      line: 'दो दिन में ₹80,000। किसी ने प्लान नहीं किया था।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। बुरा वक़्त फंड यही वक़्त ख़रीदता है।',
    } },
  'sq.32': { title: 'एक फ़ाइल, एक शेल्फ़',
    lesson: 'PAN, Aadhaar, policy, पासबुक। एक फ़ोल्डर। किसी न किसी को ज़रूरत पड़ेगी।' },
  'sq.33': { title: 'KYC एक ही बार',
    lesson: 'सारे mutual fund के लिए KYC एक बार होती है। बीस मिनट, फिर कभी नहीं।' },
  'sq.34': { title: 'वीडियो में PAN',
    lesson: 'रौशनी अच्छी हो, PAN कैमरे के सामने। ज़्यादातर बार reject सिर्फ़ रौशनी की वजह से होता है।' },
  'sq.35': { title: 'दो अलग चीज़ें',
    lesson: 'Policy घरवालों को बचाती है। पैसा लगाना पैसा बढ़ाता है। एक ही चीज़ से दोनों काम कभी नहीं।',
    why: 'बचत वाली policy ने करीब 3 से 5.5 पैसे प्रति रुपया दिया — घरवालों के ₹5.3 लाख करोड़ पे।',
    action: 'कोई प्रोडक्ट सुरक्षा और बढ़ोतरी दोनों का वादा करे, तो दोनों का दाम अलग-अलग निकालकर देखो।',
    deep: 'बचत और बीमा साथ बेचने वाली policy — endowment, money-back, ULIP — ने आमतौर पे साल का करीब 3 से 5.5 पैसे प्रति रुपया दिया है। cover वो premium का करीब दस गुना देती हैं, जबकि घर को कमाई का दस से पंद्रह गुना चाहिए। FY25 में भारतीय घरों ने ₹5.3 लाख करोड़ life insurance में डाले। ये उनकी हर ₹100 की बचत में से ₹15 था, mutual fund में गए पैसे से भी ज़्यादा।' },
  'sq.36': { title: 'अब शुरू हो सकता है',
    lesson: 'आपके कागज़ पूरे हैं। भारत में ज़्यादातर लोग इसी एक क़दम से आगे नहीं बढ़ पाते।' },
  'sq.37': { title: 'तारीख़ बदल दो',
    lesson: 'SIP 2 तारीख़ को, 28 को नहीं। पहले बचाओ, जो बचे वो खर्च करो।' },
  'sq.38': { title: 'कार्ड का minimum due',
    lesson: 'सिर्फ़ minimum भरने पे हर महीने करीब 3.5 पैसे प्रति रुपया लगता है।' },
  'sq.39': { title: 'पूरा बिल भरो',
    lesson: 'कार्ड ठीक है, अगर पूरा बिल तारीख़ पे भर दो। वरना वो कर्ज़ है।' },
  'sq.40': { title: 'साँस लो',
    lesson: 'फिसल गए। साठ घर अभी बाकी हैं। इस खेल से कोई कभी बाहर नहीं होता।' },
  'sq.41': { title: 'अपना health cover',
    lesson: 'ऑफ़िस का cover नौकरी के साथ ख़त्म हो जाता है। एक अपने नाम पे रखो।' },
  'sq.42': { title: 'कितने का cover',
    lesson: 'एक गंभीर भर्ती ₹3,00,000 से ₹5,00,000 तक जाती है। cover उतने का लो।' },
  'sq.43': { title: 'Family floater',
    lesson: 'पूरे परिवार की एक policy आमतौर पे चार अलग policy से सस्ती पड़ती है।' },
  'sq.44': { title: 'झटका',
    lesson: 'किराया बढ़ गया। फ़ैसला किसी और का था। कार्ड उठाओ।',
    event: {
      name: 'किराया बढ़ गया',
      line: 'हर महीने ₹2,000 ज़्यादा, फ़ैसला किसी और का।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। रकम कम कर लो — SIP बंद कभी मत करो।',
    } },
  'sq.45': { title: 'गारंटी कितनी?',
    lesson: 'अंदाज़ा लगाओ: साल के कितने रिटर्न पे "गारंटीड" शब्द से डर जाना चाहिए?',
    quiz: {
      question: 'गारंटीड सालाना कितने से ऊपर सुनो तो चले जाओ?',
      chips: ['₹100 पे ₹8 से ऊपर', '₹100 पे ₹12 से ऊपर'],
      reveal: '₹100 पे साल के ₹12 से ऊपर। ध्यान रहे — सरकार की SCSS ₹1,00,000 पे साल के ₹8,200 की गारंटी देती है, और वो बिल्कुल असली है। गारंटी दिक़्क़त नहीं है। गारंटी, ऊँचा रिटर्न और अनजान आदमी — तीनों साथ हों, वो दिक़्क़त है।',
    } },
  'sq.46': { title: '3% = ₹6,000 महीना',
    lesson: '₹2,00,000 पे महीने का 3% यानी हर महीने ₹6,000। कोई ईमानदार धंधा इतना नहीं देता।' },
  'sq.47': { title: 'पैसा चला गया',
    lesson: 'पड़ोसी को आठ महीने वक़्त पे पैसा मिला। जाल इसी तरह बनता है।' },
  'sq.48': { title: 'नंबर माँगो',
    lesson: 'रजिस्ट्रेशन नंबर माँगो और रेगुलेटर की अपनी साइट पे जाँच लो। मुफ़्त है।' },
  'sq.49': { title: 'ढाल तैयार',
    lesson: 'तीन महीने का खर्चा बैंक में। अब एक बुरा महीना आपको तोड़ नहीं सकता।' },
  'sq.50': { title: 'आधा रास्ता',
    lesson: 'आधा हो गया। एक SIP, एक बुरा वक़्त फंड और cover — पैसे की समझ का ज़्यादातर हिस्सा यही है।',
    bullets: [
      '₹500 की SIP अब अपने आप चलती है।',
      'तीन महीने का खर्चा बैंक में पड़ा है।',
      'Cover आपके अपने नाम पे है, ऑफ़िस के नहीं।',
    ],
    action: 'एक पन्ने पे लिखो आपके पास क्या-क्या है। हर एक के आगे लिखो: बुरा वक़्त, cover, या बढ़ने वाला पैसा।',
    deep: 'FY25 में भारतीय घरों की हर ₹100 की बचत में से ₹35 जमा में गए और ₹22 provident fund और pension में। ₹15 life insurance में, ₹13 mutual fund में और ₹2 शेयरों में। वो ₹15 देश की सबसे बड़ी ग़लत जगह है। उसका ज़्यादातर हिस्सा बीमा के लिफ़ाफ़े में लिपटी बचत है, जिसका दाम किसी को दिखाया ही नहीं गया।' },
  'sq.51': { title: 'मशीन को याद है',
    lesson: 'तनख़्वाह वाले दिन auto-debit। मशीन कभी भूलती नहीं और उसका महीना कभी बुरा नहीं होता।',
    why: 'SIP 28 को हो तो फ़ेल होती है। ₹2,000 महीना 2 तारीख़ पे कर दो — साल के ₹24,000 सबसे पहले निकलेंगे।',
    action: 'SIP की तारीख़ तनख़्वाह के एक-दो दिन बाद कर दो। ऐप में एक ही क्लिक है।',
    heritage: 'पुराने बोर्ड पे इस घर का नाम भरोसा था। अब ये वो मशीन है जो कभी नहीं भूलती।',
    deep: 'SIP की तारीख़ बदलने से इच्छाशक्ति का कोई लेना-देना नहीं। पैसा बस महीने के खा जाने से पहले निकल जाता है। खर्च से पहले बचाए गए ₹2,000 महीना साल के ₹24,000 हैं। बीस साल में ये आपका अपना ₹4,80,000 अंदर गया। जो SIP याद रखनी पड़े, वो ठीक उसी महीने छूटेगी जिस महीने छूटनी नहीं चाहिए थी।' },
  'sq.52': { title: 'Nominee भर दो',
    lesson: 'एक खाली खाना। इसी वजह से भारत में ₹73,000 करोड़ से ज़्यादा बिना दावे के पड़ा है।' },
  'sq.53': { title: 'घर में बताओ',
    lesson: 'एक इंसान को पता होना चाहिए पैसा कहाँ है। ताले में बंद राज़ किसी के काम नहीं आता।' },
  'sq.54': { title: 'Term insurance',
    lesson: 'सिर्फ़ cover, पैसा वापस नहीं। इसीलिए इतनी कम कीमत में मिलता है।' },
  'sq.55': { title: 'नीचे आ गए',
    lesson: 'पीछे हो, हारे नहीं। यहाँ से बुरा वक़्त फंड आपको खड़ा रखता है।' },
  'sq.56': { title: 'फ़ॉर्म पे सच लिखो',
    lesson: 'फ़ॉर्म पे अपनी सेहत और आदतें सच लिखो। छोटा सा झूठ ही claim को मार देता है।' },
  'sq.57': { title: 'सोना गिरवी रखा',
    lesson: 'घर का सोना साहूकार के पास चला गया। किश्त चूकी तो नीलाम।' },
  'sq.58': { title: 'शादी ग़लती नहीं है',
    lesson: 'शादी कभी ग़लती नहीं होती। उसके लिए 20 पैसे प्रति रुपया पे उधार लेना ग़लती है।' },
  'sq.59': { title: 'झटका',
    lesson: 'तीन महीने काम बंद रहा। आपकी ग़लती नहीं। कार्ड उठाओ।',
    event: {
      name: 'तीन महीने काम नहीं',
      line: 'काम बंद हो गया। ये जोखिम है, ग़लती नहीं।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। तीन महीने का खर्चा ठीक इसी दिन के लिए है।',
    } },
  'sq.60': { title: 'एक जगह नहीं',
    lesson: 'सारे अंडे एक टोकरी में मत रखो। कुछ सुरक्षित, कुछ बढ़ने वाला — हमेशा दोनों।' },
  'sq.61': { title: 'कौन सा पहले',
    lesson: 'अंदाज़ा लगाओ: बुरा वक़्त फंड, policy, या पैसा लगाना — पहले कौन सा?',
    quiz: {
      question: 'पहले क्या आता है?',
      chips: ['पैसा लगाना', 'बुरा वक़्त फंड'],
      reveal: 'पहले बुरा वक़्त फंड, फिर cover, फिर पैसा लगाना। हर बार, हर किसी के लिए, इसी क्रम में। बुरे महीने में यही एक क्रम टिकता है।',
    } },
  'sq.62': { title: 'परिवार सुरक्षित',
    lesson: 'कुछ हो जाए तो ये घर बिखरेगा नहीं। cover यही ख़रीदता है।' },
  'sq.63': { title: 'सोना कितना',
    lesson: 'सोना ठीक है। गहने नहीं: मजदूरी में ₹100 पे ₹8 से ₹25 चले जाते हैं।' },
  'sq.64': { title: 'उतार चढ़ाव',
    lesson: 'बाज़ार ऊपर-नीचे होता है। वो हिलना बढ़ोतरी की कीमत है, ख़राबी नहीं।' },
  'sq.65': { title: 'Trading अलग है',
    lesson: 'इसी हफ़्ते बेचने के लिए ख़रीदना trading है। दस साल रखने के लिए ख़रीदना पैसा लगाना है।' },
  'sq.66': { title: 'F&O का चक्कर',
    lesson: 'SEBI ने गिना: पिछले साल हर 100 में करीब 88 F&O वालों का पैसा डूबा।' },
  'sq.67': { title: 'पड़ोसी की टिप',
    lesson: 'पड़ोसी अपनी जीत बताता है, हार कभी नहीं। सब यही करते हैं।' },
  'sq.68': { title: 'Direct plan',
    lesson: 'वही fund, दो दाम। Direct में एजेंट का हिस्सा अंदर नहीं बैठा होता।' },
  'sq.69': { title: 'कौन कमा रहा है',
    lesson: 'हर प्रोडक्ट किसी न किसी को पैसा देता है। दस्तख़त से पहले पूछो कौन, और कितना।',
    why: 'Regular plan ₹1,00,000 पे साल के करीब ₹500 देता है। बचत वाली policy पहले साल में बड़ा हिस्सा देती है।',
    action: 'बेचने वाले से मुँह पे पूछो कि हाँ कहने पे उसे क्या मिलेगा। जवाब बहुत कुछ बता देगा।',
    heritage: 'पुराने बोर्ड पे इस घर का नाम क़र्ज़ था। अब ये पूछता है कि पैसा किसको मिल रहा है।',
    deep: '"मेरी फ़ीस कुछ नहीं है" का मतलब लगभग हमेशा यही होता है कि फ़ीस प्रोडक्ट के अंदर है। Regular mutual fund plan ₹1,00,000 पे साल के करीब ₹500 का trail देता है। बचत वाली policy उसकी जगह पहले साल में बड़ा commission देती है। IRDAI अपनी सालाना रिपोर्ट में ग़लत बिक्री को बड़ी चिंता कहता है। FY25 में अनुचित कारोबार की शिकायतें 14% बढ़कर 26,667 हो गईं।' },
  'sq.70': { title: '"मेरी फ़ीस कुछ नहीं"',
    lesson: '"मेरी सेवा मुफ़्त है" का मतलब है फ़ीस पहले से आपके रिटर्न के अंदर बैठी है।' },
  'sq.71': { title: 'घरवाले safe',
    lesson: 'Term cover हो गया। इस पूरे बोर्ड की सबसे सस्ती और सबसे प्यारी चीज़।' },
  'sq.72': { title: 'पाँच साल हो गए',
    lesson: 'साठ auto-debit, एक भी नहीं छूटा, सोचना तक नहीं पड़ा। मशीन ने कर दिया।' },
  'sq.73': { title: 'झटका',
    lesson: 'माँ-बाप को अब देखभाल चाहिए। किसी की ग़लती नहीं। कार्ड उठाओ।',
    event: {
      name: 'माँ-बाप की देखभाल',
      line: 'देखभाल का खर्च अब ₹15,000 महीना।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। घर का खर्चा कभी ग़लती नहीं होता।',
    } },
  'sq.74': { title: 'SIP बंद कर दी',
    lesson: 'दाम गिरे तो SIP बंद कर दी। इसका मतलब है आपने सिर्फ़ महँगे दाम पे ख़रीदा।' },
  'sq.75': { title: 'पौना रास्ता',
    lesson: 'तीन-चौथाई। ग़ौर करो: अब तक किसी चीज़ के लिए बड़ी तनख़्वाह नहीं चाहिए थी।',
    bullets: [
      'लिखा हुआ हिसाब, और Aadhaar से जुड़ा मोबाइल।',
      'बुरा वक़्त फंड, health cover और term cover।',
      'एक ऐसा fund जो हर साल एजेंट को पैसा नहीं देता।',
    ],
    action: 'जिस एक चीज़ पे सबसे ज़्यादा शक है उसे जाँच लो — Aadhaar वाला मोबाइल, या नाम का मिलान।',
    deep: 'हर 100 में से करीब 63 भारतीय घर बाज़ार का कोई न कोई प्रोडक्ट जानते हैं। असल में इस्तेमाल 10 से भी कम करते हैं। ये फ़ासला पैसे का लगभग कभी नहीं होता। वो मोबाइल नंबर होता है जिस पे अब OTP नहीं आता। PAN पे अलग लिखा हुआ नाम होता है, या वो mandate जो टाइम आउट हो गया। इस बोर्ड पे अब तक जो भी चढ़ा है, वो कागज़ी काम है, कोई बड़ी नेकी नहीं।' },
  'sq.76': { title: 'खर्चा पढ़ो',
    lesson: 'हर fund साल का एक हिस्सा काटता है, चाहे उस साल वो ऊपर गया हो या नीचे।',
    why: '₹1,00,000 पे 1% expense ratio यानी साल के ₹1,000 — रोज़ करीब ₹2.74 कट जाते हैं।',
    action: 'अपने हर fund का expense ratio देख लो। साल में एक बार, दस मिनट।',
    heritage: 'पुराने बोर्ड पे इस घर का नाम ज्ञान था। दस्तख़त से पहले सालाना कटौती पढ़ लो।',
    deep: '₹1,00,000 पे 1% expense ratio यानी साल के ₹1,000। रोज़ के करीब ₹2.74। इसका बिल नहीं आता; ये NAV में से पहले ही कट जाता है, आपके देखने से भी पहले। जिस साल fund गिरता है, उस साल भी कटता है। पूरा हुनर बस ये नंबर जान लेना है, और इसके लिए क़ानून पढ़ने की ज़रूरत नहीं।' },
  'sq.77': { title: 'वक़्त सबसे बड़ा',
    lesson: '25 से ₹2,000 महीना, 35 से ₹5,000 महीना को हरा देता है — साल के 12% पे, गारंटी नहीं है।' },
  'sq.78': { title: 'कुछ नहीं किया',
    lesson: 'दाम गिरे और ₹5,00,000 स्क्रीन पे ₹3,50,000 दिखे। आपने कुछ नहीं किया। अच्छा किया।',
    heritage: 'पुराने बोर्ड पे इस घर का नाम तप था। आप गिरावट में बैठे रहे और कुछ नहीं किया।' },
  'sq.79': { title: 'थोड़ा पीछे',
    lesson: 'इतनी देर से एक छोटी फिसलन। खीज होगी, नुकसान नहीं। पासा उठाओ।' },
  'sq.80': { title: 'लाल नंबर',
    lesson: 'स्क्रीन लाल दिखे तो पैसा सचमुच गिरा है। बेच दिया तो वो गिरावट पक्की हो जाती है।' },
  'sq.81': { title: 'बैंक से कॉल आया',
    lesson: '"FD से बेहतर स्कीम है।" बस एक चीज़ पूछो: policy कितने साल की है?' },
  'sq.82': { title: 'गारंटीड कितना?',
    lesson: 'गारंटीड 8.2% असली है: ₹1,00,000 पे साल के ₹8,200। किसी अनजान का 12% नहीं।',
    why: 'SCSS ₹1,00,000 पे साल के ₹8,200 देती है, क़ानून के पीछे। PACL ने इससे ज़्यादा का वादा करके ₹49,100 करोड़ जमा किए।',
    action: '₹100 पे साल के ₹8 से ऊपर सुनो तो रजिस्ट्रेशन नंबर माँगो और ख़ुद जाँचो।',
    deep: 'सरकार की Senior Citizens Savings Scheme गारंटीड 8.2% देती है, यानी ₹1,00,000 पे साल के ₹8,200। ये संसद के क़ानून के पीछे है और बिल्कुल असली। तो अकेला "गारंटीड" शब्द ख़तरे की घंटी नहीं है। दर है। किसी अनजान का गारंटीड 12% या उससे ऊपर या तो ग़लत नाम से बेची जा रही policy है, या ग़ैरक़ानूनी।' },
  'sq.83': { title: 'Lock-in पूछो',
    lesson: 'पूछो कि पैसा कितने साल फँसा रहेगा। ये कोई अपने आप नहीं बताता।' },
  'sq.84': { title: 'खर्चा कम हुआ',
    lesson: 'वही fund, ₹1,00,000 पे साल के करीब ₹500 कम कटे। हर साल, बीस साल तक।' },
  'sq.85': { title: 'बोरिंग ही सही',
    lesson: 'पैसे की अच्छी आदतें बोरिंग होती हैं। मज़ा आमतौर पे महँगा वाला रास्ता है।' },
  'sq.86': { title: 'झटका',
    lesson: 'ऐसा बिल आ गया जो कोई देख ही नहीं सकता था। कार्ड उठाओ।',
    event: {
      name: 'बिना बताए बिल',
      line: 'ऐसा कुछ आ गया जो कोई देख नहीं सकता था।',
      shielded: 'बुरा वक़्त फंड ने संभाल लिया।',
      setback: '4 घर पीछे। ज़िंदगी आपका कैलेंडर नहीं देखती।',
    } },
  'sq.87': { title: 'कौन पूछता है',
    lesson: 'अंदाज़ा लगाओ: कौन सा अफ़सर "जाँच के लिए" पैसा भेजने को कह सकता है?',
    quiz: {
      question: 'कौन सा अफ़सर जाँच के लिए पैसा भेजने को कह सकता है?',
      chips: ['वीडियो कॉल पे CBI', 'कोई नहीं। एक भी नहीं।'],
      reveal: 'कोई नहीं। एक भी नहीं। किसी पुलिस, अदालत, CBI, RBI या इनकम टैक्स अफ़सर ने आज तक किसी से जाँच के लिए पैसा भेजने को नहीं कहा। कॉल काटो, फिर 1930 मिलाओ।',
    } },
  'sq.88': { title: 'आठ क़दम',
    lesson: 'आठ घर पीछे। अब भी पहले पहुँच सकते हो। पासा फेंको।' },
  'sq.89': { title: 'एक और premium',
    lesson: '"भर दो, सब वापस मिल जाएगा।" आमतौर पे ये बिल्कुल नई policy होती है।' },
  'sq.90': { title: '1930 याद रखो',
    lesson: 'ऑनलाइन ठगे गए? एक घंटे के अंदर 1930 मिलाओ। तब तक पैसा रोका जा सकता है।' },
  'sq.91': { title: 'Screen share नहीं',
    lesson: 'खाता ठीक करने के लिए किसी को screen-share ऐप या आपका OTP नहीं चाहिए। किसी को नहीं। कभी नहीं।' },
  'sq.92': { title: 'बस थोड़ा और',
    lesson: 'पीछे देखो: SIP, बुरा वक़्त फंड, cover, direct plan, nominee। ये पूरा प्लान है।',
    bullets: [
      'SIP, बुरा वक़्त फंड, health cover, term cover, direct plan, nominee।',
      'छह चीज़ें। मिलकर ये एक पूरा प्लान बन जाता है।',
      'अब बचा है धोखे में न आना, और घरवालों को बता देना।',
    ],
    action: 'इस हफ़्ते हर खाते में nominee जोड़ो, और बता दो कागज़ किस फ़ोल्डर में हैं।',
    deep: 'भारत में ₹73,000 करोड़ से ज़्यादा बिना दावे के पड़ा है। करीब ₹60,518 करोड़ सरकारी बैंकों के पास, ₹8,974 करोड़ life insurance कंपनियों के पास और ₹3,749 करोड़ mutual fund में। एक राष्ट्रीय अभियान उसमें से सिर्फ़ ₹5,777 करोड़ लौटा पाया। जो पैसा किसी को मिल ही न सके, वो कमाया ही नहीं गया। nominee का एक खाली खाना ही ज़्यादातर पैसे को वहाँ पहुँचाता है।' },
  'sq.93': { title: 'बच्चों के सामने',
    lesson: 'बच्चे पैसा देखकर सीखते हैं। उन्हें हर महीने SIP जाते हुए देखने दो।' },
  'sq.94': { title: 'वही पैसा बड़ा हुआ',
    lesson: 'आपने कुछ जोड़ा नहीं। बस भागे नहीं। इसीलिए बढ़ा।' },
  'sq.95': { title: 'घरवालों से बात',
    lesson: 'घरवालों को बता दो पैसा कहाँ रखा है। यही आख़िरी असली जोखिम बचा है।' },
  'sq.96': { title: '"CBI बोल रहा हूँ"',
    lesson: 'वीडियो कॉल पे वर्दी, और "जाँच के लिए" पैसा भेजने की बात। दोनों नाटक हैं।' },
  'sq.97': { title: 'ना कह दिया',
    lesson: 'आपने ना कह दिया। इस बोर्ड का असली इम्तिहान यही था, और आप पास हो गए।' },
  'sq.98': { title: 'सब लिखा हुआ है',
    lesson: 'खाते, nominee, और एक इंसान जिसे पता है। आपका पैसा उन तक पहुँच जाएगा।' },
  'sq.99': { title: 'एक क़दम',
    lesson: 'एक घर बचा। पुराने बोर्ड पे यहाँ साँप था। हमने उसे हटा दिया।',
    heritage: 'पुराने बोर्ड पे 99 पे साँप था, मोक्ष से एक क़दम पहले। हमने उसे हटाया, और ये बता भी रहे हैं।' },
  'sq.100': { title: 'मंज़िल: लक्ष्य पूरा',
    lesson: 'सबसे अमीर नहीं। वो जिसका लक्ष्य पूरा हुआ। खेल हमेशा यही था।' },
  /* — the eight snakes. The counterparty line is the ethics of the game and
       it is translated as carefully as everything else. — */
  'snake.27': { name: 'Endowment policy',
    costNote: 'FD से कम मिला',
    why: '15 साल तक साल के ₹50,000 यानी आपके ₹7,50,000। वापस मिलते हैं करीब ₹10,41,000।',
    escape: 'दस्तख़त से पहले पूछो: policy कितने साल की है? जवाब 15 या 20 हो, तो वो FD नहीं है।',
    counterparty: 'बैंक की शाखा और एजेंट, पहले साल के बड़े commission से।',
    deep: 'बचत और बीमा वाली policy को पाँच साल की जमा बताकर बेचा जाता है। पाँच साल सिर्फ़ इतना है कि आप कितने साल भरेंगे। policy ख़ुद पंद्रह या बीस साल चलती है। 15 साल तक साल के ₹50,000 भरो — यानी ₹7,50,000 अंदर, और आमतौर के 4% पे maturity करीब ₹10,41,000। वही पैसा 6.5% की FD में टैक्स से पहले करीब ₹12,88,000 होता। घरवालों के लिए term cover लो और पैसे के लिए SIP।' },
  'snake.38': { name: 'कार्ड का minimum due',
    costNote: 'एक साल का ब्याज',
    why: 'कार्ड पे चलता छोड़ा ₹50,000 का बिल साल भर में करीब ₹21,000 ब्याज ले लेता है।',
    escape: 'पूरा बिल तारीख़ पे भरो। न भर सको तो बैंक से कहकर उसे आम लोन में बदलवा लो।',
    counterparty: 'कार्ड देने वाली कंपनी। बचे हुए पैसे पे ब्याज ही उसकी ज़्यादातर कमाई है।',
    deep: 'क्रेडिट कार्ड सचमुच मुफ़्त है, अगर पूरा बिल due date पे भर दिया जाए। जिस पल नहीं भरा, बचे हुए पैसे पे हर महीने करीब 3.5 पैसे प्रति रुपया लगने लगता है। यानी साल का करीब 42 पैसे प्रति रुपया। ₹50,000 पे बारह महीने में करीब ₹21,000 ब्याज, उन ₹50,000 के ऊपर। कोई इसे सालाना नंबर में नहीं बताता। सबसे ऊँची दर वाला कार्ड पहले साफ़ करो, चाहे वो सबसे छोटा हो।' },
  'snake.46': { name: 'चेन सिस्टम',
    costNote: 'पूरा पैसा गया',
    why: '₹2,00,000 एक स्कीम में, महीने का ₹6,000 मिलता था। आठ महीने मिला, फिर बंद।',
    escape: 'पूछो मुनाफ़ा आता कहाँ से है। जवाब "नए मेंबर" हो तो चले जाओ और पड़ोसी को भी बता दो।',
    counterparty: 'चलाने वाला और सबसे पहले वाले मेंबर, नए मेंबरों के पैसे से।',
    deep: 'महीने का 3 पैसे प्रति रुपया यानी साल का 36 पैसे प्रति रुपया, ब्याज पे ब्याज से पहले ही। भारत में कोई भी क़ानूनी धंधा किसी अनजान को इतना नहीं देता। चेन सिस्टम अपने पुराने मेंबरों को नए मेंबरों के पैसे से भरता है। आठ-दस महीने सब बढ़िया दिखता है, फिर जिस दिन नए लोग आना बंद, उसी दिन सब बंद। SEBI ने PACL की वसूली ₹49,100 करोड़ बताई थी। रजिस्ट्रेशन नंबर माँगो और रेगुलेटर की अपनी साइट पे जाँचो।' },
  'snake.57': { name: 'सोना गिरवी रखा',
    costNote: 'साल का ब्याज',
    why: 'घर के सोने पे ₹4,00,000 उधार, 20 पैसे प्रति रुपया — यानी साल का ₹80,000 ब्याज।',
    escape: 'जो खर्चे पता हैं उनके लिए महीनों पहले से जोड़ो। सोना आख़िरी दरवाज़ा है, पहला नहीं।',
    counterparty: 'gold loan कंपनी या मोहल्ले का साहूकार, और वो जो नीलाम हुआ सोना ख़रीदता है।',
    deep: 'Gold loan तेज़ इसलिए है क्योंकि आपका सोना ही गारंटी है। बैंक सोने पे साल के करीब 9 से 12 पैसे प्रति रुपया लेते हैं। gold loan कंपनियाँ और मोहल्ले के साहूकार अक्सर 18 से 24 लेते हैं। ₹4,00,000 पे 20 पैसे यानी साल का ₹80,000। भारत में gold loan का बही-खाता तीन साल में करीब तीन गुना हुआ है, और अब ज़्यादातर इमरजेंसी के लिए नहीं, खर्च के लिए। जो खर्च पता है, उसके लिए एक साल पहले से अलग फंड शुरू करो।' },
  'snake.66': { name: 'F&O का चक्कर',
    costNote: 'एक साल में, औसतन',
    why: 'SEBI ने गिना: हर 100 में करीब 88 F&O वालों का पैसा डूबा। औसत नुकसान ₹1,17,000।',
    escape: 'वो trading है, पैसा लगाना नहीं। बाज़ार में जाना है तो SIP लो और उसे साल दो।',
    counterparty: 'broker और exchange, जिन्हें हर सौदे पे पैसा मिलता है — आप जीतो या हारो।',
    deep: 'SEBI 2024 से हर साल अकेले सौदे करने वालों का हिसाब देखता है। जवाब बदलता नहीं: दस में से करीब नौ का पैसा डूबता है। पिछले साल हर 100 में 87.7 का डूबा, और औसत नुकसान करीब ₹1,17,000 था। 30 से कम उम्र वालों में, जो कुल का दस में से चार से भी ज़्यादा हैं, डूबने वालों का हिस्सा और भी ज़्यादा है। इसे घर के पैसे से बिल्कुल अलग रखो, और बुरा वक़्त फंड से तो कभी नहीं।' },
  'snake.74': { name: 'SIP बंद कर दी',
    costNote: 'जो कभी लगा ही नहीं',
    why: 'दाम गिरे तो ₹5,000 महीना आठ महीने रोक दिया। यानी ₹40,000 जो कभी अंदर गया ही नहीं।',
    escape: 'पैसा तंग हो तो SIP ₹500 की कर दो। कम करना ठीक है। बंद करना नुकसान करता है।',
    counterparty: 'कोई नहीं। ये सिर्फ़ आपका नुकसान करता है और किसी को कुछ नहीं देता — इसीलिए कोई चेताता नहीं।',
    deep: 'SIP दाम गिरने पे ज़्यादा unit ख़रीदती है। गिरावट में उसे रोकने का मतलब है आपने सिर्फ़ ऊँचे दामों पे ख़रीदा। ₹5,000 के आठ रुके हुए महीने यानी ₹40,000 जो कभी अंदर गया ही नहीं। भारत में हर गिरावट पे SIP बंद होने की गिनती उछलती है; जनवरी 2025 में जितनी SIP खुलीं, उससे ज़्यादा बंद हुईं। उन लोगों को किसी ने नंबर लाल होने के लिए तैयार ही नहीं किया था। अभी, जब सब शांत है, तय कर लो कि दाम गिरने पे आप क्या करोगे।' },
  'snake.89': { name: 'Revival कॉल',
    costNote: 'नई policy में चला गया',
    why: 'कॉल आती है कि एक premium और भरो तो फँसा पैसा खुल जाएगा। ₹30,000 भरे — नई 15 साल की policy के लिए।',
    escape: 'कुछ भी भरने से पहले पुरानी policy का नंबर और उसकी maturity तारीख़ लिखित में माँगो।',
    counterparty: 'एजेंट, जिसे "revival" पे पहले साल का नया commission मिलता है।',
    deep: 'ये उस पैसे का शिकार करता है जो सचमुच फँसा हुआ है। भारतीय life insurance कंपनियों के पास करीब ₹8,974 करोड़ बिना दावे के पड़ा है। किसी बड़ी कंपनी की गिनती में करीब आधी policy पाँचवें साल तक भरी जानी बंद हो जाती हैं। यानी फ़ोन करने के लिए लाखों बंद policy मौजूद हैं। revival कॉल अक्सर नई तारीख़ वाली बिल्कुल नई policy बेच देती है। policy नंबर, शुरू होने की तारीख़ और maturity की तारीख़ लिखित में माँगो।' },
  'snake.96': { name: 'Digital arrest',
    costNote: '"release fee"',
    why: 'वीडियो कॉल, पीछे थाना, आपका Aadhaar "एक पार्सल में मिला", और फिर ₹8,000 release fee।',
    escape: 'कॉल काटो, घर के एक इंसान को बताओ, एक घंटे के अंदर 1930 मिलाओ। कोई अफ़सर पैसा नहीं माँगता।',
    counterparty: 'संगठित ठगी के अड्डे, जिनमें ज़्यादातर भारत के बाहर से चलते हैं।',
    deep: 'Digital arrest से 2022 से 2025 के बीच करीब 2,41,537 शिकायतें और करीब ₹3,012 करोड़ का नुकसान हुआ। वर्दी, कॉल करने वाले के पीछे का थाना और स्क्रीन पे दिखते कागज़ — सब पोशाक और पर्दा है। एक लाइन इस पूरे ख़ानदान की ठगी को हरा देती है। किसी असली पुलिस, अदालत, CBI, RBI या इनकम टैक्स अफ़सर ने आज तक जाँच के लिए पैसा भेजने को नहीं कहा। कॉल काटो, एक इंसान को ज़ोर से बताओ, फिर 1930 मिलाओ।' },

  /* — the eight ladders. Plumbing, not virtue. — */
  'ladder.3': { name: 'सात दिन का हिसाब',
    amountNote: 'साल में मिला',
    why: 'सात दिन हर रुपया लिखने पे आमतौर पे महीने के ₹1,500 से ₹3,000 का रिसाव मिल जाता है।',
    how: 'फ़ोन का notes ऐप, या बिल का पिछला हिस्सा। सिर्फ़ सात दिन। अभी कुछ काटो मत — आख़िर में एक बार पढ़ो।',
    deep: 'अपना खर्चा किसी को ठीक-ठीक याद नहीं रहता। इसीलिए "पैसा जाता कहाँ है?" का जवाब ज़्यादातर घरों में नहीं होता। शक्ल देखने के लिए सात दिन काफ़ी हैं। रोज़ की ₹100 वाली आदत साल की ₹36,500 है, और रोज़ की दो ₹30 वाली चाय ₹21,900। जो घर लिखकर देखते हैं उन्हें आमतौर पे महीने के ₹1,500 से ₹3,000 मिल जाते हैं, जो उन्होंने ख़र्च करने चुने ही नहीं थे।' },
  'ladder.12': { name: 'पहली SIP — ₹500',
    amountNote: 'आपका अपना पैसा, 20 साल में',
    why: 'बीस साल तक ₹500 महीना यानी आपका अपना ₹1,20,000 अंदर, ₹500 करके।',
    how: 'एक index fund, direct plan, ₹500, तनख़्वाह के दो दिन बाद की auto-debit तारीख़। एक बार, पंद्रह मिनट।',
    heritage: 'पुराने बोर्ड पे इस घर को श्रद्धा कहते थे। पहला कदम आज भी सबसे मुश्किल है।',
    deep: 'बीस साल तक ₹500 महीना यानी आपका अपना ₹1,20,000। साल के 12% से बढ़ा — गारंटी नहीं है — तो करीब ₹4,99,000 होता। 8% पे करीब ₹2,95,000। ये फ़र्क़ ही ईमानदार हिस्सा है। जिस पे कोई शक नहीं वो है ₹1,20,000, और ये कि बड़ी रकम का इंतज़ार करने वाले ने कभी वो भी नहीं डाला। आज ₹500 की एक SIP शुरू करो।' },
  'ladder.17': { name: 'आधार से मोबाइल जोड़ो',
    amountNote: 'पूरी फ़ीस',
    why: 'इसमें करीब ₹50 और एक सुबह लगती है। पहली बार पैसा लगाने की कोशिश सबसे ज़्यादा इसी वजह से फ़ेल होती है।',
    how: 'अपना Aadhaar और आज चलने वाला मोबाइल नंबर लेकर Aadhaar Seva Kendra जाओ। बस इतना काम है।',
    deep: 'हर ऑनलाइन KYC अपना OTP उसी मोबाइल पे भेजती है जो Aadhaar से जुड़ा है। अगर वो नंबर 2018 में छूट गया था, तो कुछ नहीं खुलेगा। न mutual fund, न demat, न mandate, न claim — और गड़बड़ी का मैसेज कभी वजह नहीं बताता। इलाज है एक बार जाकर करीब ₹50 की फ़ीस देना। इस पूरे बोर्ड पे ये सबसे बोरिंग और सबसे काम की चीज़ है।' },
  'ladder.25': { name: 'बुरा वक़्त फंड',
    amountNote: 'तीन महीने का खर्चा',
    why: 'घर का खर्चा ₹25,000 महीना है तो तीन महीने का ₹75,000। यही बिल को कार्ड का कर्ज़ बनने से रोकता है।',
    how: 'बिना कार्ड वाला अलग बचत खाता खोलो। हर महीने ₹2,000 भेजो, जब तक तीन महीने का खर्चा जमा न हो जाए।',
    deep: 'तीन महीने का खर्चा, उसी दिन हाथ में। ₹25,000 महीने पे वो ₹75,000 है; छह महीने का ₹1,50,000। ₹2,000 महीना से वहाँ पहुँचने में तीन साल से थोड़ा ज़्यादा लगता है। ₹5,000 महीना से करीब पंद्रह महीने। ये बैंक में रहता है, सोने में नहीं और lock-in में नहीं। यहाँ रिटर्न से ज़्यादा रफ़्तार मायने रखती है, क्योंकि बात उस दोपहर की है जब ज़रूरत पड़ेगी।' },
  'ladder.41': { name: 'अपना health cover',
    amountNote: 'का floater',
    why: 'एक गंभीर भर्ती ₹3,00,000 से ₹5,00,000 की पड़ती है। ₹10,00,000 का floater साल के ₹20,000 से ₹30,000 में आता है।',
    how: 'अपने नाम पे ₹10,00,000 का family floater लो, ऑफ़िस वाले से अलग, जब सब ठीक-ठाक हैं।',
    deep: 'करीब 30 से 40 करोड़ भारतीयों के पास कोई health cover नहीं है। अस्पताल में एक बार भर्ती होना निम्न-मध्यम वर्ग से कर्ज़ तक पहुँचने का सबसे आम रास्ता है। कंपनी का cover उसी दिन ख़त्म होता है जिस दिन नौकरी, और अक्सर वही हफ़्ता होता है जब ज़रूरत पड़ती है। पुरानी बीमारियों का waiting period तब से फिर शुरू होता है जब आप अपनी policy लेते हो। शहर में पाँच दिन की भर्ती अभी ही ₹1,00,000 पार कर जाती है; गंभीर मामला ₹3,00,000 से ₹5,00,000 तक।' },
  'ladder.54': { name: 'Term insurance',
    amountNote: 'का cover',
    why: 'सेहतमंद 30 साल के इंसान के लिए ₹1,00,00,000 का cover अक्सर साल के ₹12,000 से ₹15,000 में आता है।',
    how: 'सालाना कमाई का 10 से 15 गुना लो। सिर्फ़ term, ऑनलाइन ख़रीदा हुआ, साथ में कुछ नहीं।',
    deep: 'Term insurance तभी पैसा देती है जब उस अवधि में मौत हो जाए। पूरा प्रोडक्ट बस इतना है। इसीलिए ₹1,00,00,000 का cover उस money-back policy के एक हिस्से में आ जाता है जो उसका दसवाँ हिस्सा देती है। premium उम्र, सेहत और कंपनी पे निर्भर है। 30 पे करीब ₹12,000 से ₹15,000 साल का; 40 पे अक्सर दुगना। साल के ₹6,00,000 कमाते हो तो ₹60,00,000 से ₹90,00,000 का cover रखो।' },
  'ladder.68': { name: 'Direct plan',
    amountNote: 'हर साल, हर ₹1,00,000 पे',
    why: 'वही fund, दो दाम। Direct आपके हाथ में हर ₹1,00,000 पे साल के करीब ₹500 छोड़ देता है।',
    how: 'ऐप में Direct वाला और Growth वाला विकल्प चुनो। पुराना पैसा हटाने से पहले exit load देख लो।',
    deep: 'Regular plan आपके रिटर्न में से हर साल distributor को commission देता है। वो NAV के अंदर बैठा होता है, इसलिए बिल कभी नहीं दिखता। भारत के एक बड़े equity fund में ये करीब 1.28% direct बनाम 1.78% regular रहा है। वो फ़र्क़ ₹1,00,000 पे साल के करीब ₹500 है, यानी ₹5,00,000 पे साल के ₹2,500। दशकों तक ये आपके ख़िलाफ़ बढ़ता जाता है। इससे regular plan बुरा नहीं हो जाता; बस पता होना चाहिए कि आप पैसा दे रहे हो।' },
  'ladder.78': { name: 'कुछ नहीं किया',
    amountNote: 'स्क्रीन पे दिखा',
    why: 'दाम गिरे और ₹5,00,000 स्क्रीन पे ₹3,50,000 दिखे। आपने कुछ नहीं बदला, और आपके ₹5,000 ख़रीदते रहे।',
    how: 'आज, जब सब शांत है, लिखकर तय कर लो: गिरावट आएगी तो मैं कुछ नहीं करूँगा। घरवालों को दिखा दो।',
    heritage: 'पुराने बोर्ड पे इस घर का नाम तप था। आप गिरावट में बैठे रहे और कुछ नहीं किया।',
    deep: 'SEBI के सर्वे में हर 100 में करीब 40 लोग सुस्त पड़ चुके हैं, और उनमें से ज़्यादातर ख़राब प्रदर्शन को वजह बताते हैं। उन्होंने शुरू किया, गिरावट देखी, और जम गए। 30% की गिरावट स्क्रीन पे ₹5,00,000 को ₹3,50,000 बना देती है। वो सचमुच की गिरावट है, कोई धोखा नहीं। उसे पक्का बेचना करता है। जिन लोगों ने उसमें भी SIP चलाए रखी, उन्होंने दशक की सबसे सस्ती unit ख़रीदीं।' },

  /* — the word list. 'hinglish' is what the game says out loud; in Hindi
       mode it is said in Devanagari, same words. — */
  'gloss.Inflation': { hinglish: 'महंगाई', plain: 'दाम हर साल बढ़ते हैं, तो उन्हीं रुपयों से कम सामान आता है।' },
  'gloss.Investment': { hinglish: 'पैसा लगाना', plain: 'पैसा कहीं ऐसी जगह रखना कि सालों में बढ़े।' },
  'gloss.Savings': { hinglish: 'बचत', plain: 'अलग रखा हुआ पैसा, जो खर्च नहीं हुआ।' },
  'gloss.Interest': { hinglish: 'ब्याज', plain: 'पैसे का किराया — जो आपको मिले, या जो उधार पे आप दो।' },
  'gloss.Compound interest': { hinglish: 'ब्याज पे ब्याज', plain: 'आपका ब्याज ख़ुद अपना ब्याज कमाने लगता है।' },
  'gloss.Returns': { hinglish: 'कितना बढ़कर मिला', plain: 'कितना ज़्यादा वापस मिला, रुपयों में कहा गया।' },
  'gloss.Risk': { hinglish: 'पैसा डूब सकता है', plain: 'पैसे की कीमत गिर सकती है, या पैसा जा सकता है।' },
  'gloss.Volatility': { hinglish: 'उतार-चढ़ाव', plain: 'रास्ते में दामों का ऊपर-नीचे होते रहना।' },
  'gloss.Diversification': { hinglish: 'पैसा अलग-अलग जगह रखो', plain: 'सब कुछ कभी एक ही जगह मत रखो।' },
  'gloss.Liquidity': { hinglish: 'कितनी जल्दी पैसा निकाल सकते हो', plain: 'कितनी जल्दी उसे वापस नकद बना सकते हो।' },
  'gloss.Lock-in': { hinglish: 'कितने साल पैसा नहीं निकाल सकते', plain: 'वो साल जिनमें पैसा बाहर नहीं निकाला जा सकता।' },
  'gloss.Emergency fund': { hinglish: 'बुरा वक़्त फंड', plain: 'तीन से छह महीने का खर्चा, उसी दिन हाथ में आ जाए।' },
  'gloss.Mutual fund': { hinglish: 'सबका पैसा एक जगह, manager चलाता है', plain: 'बहुत लोगों का पैसा एक साथ; एक manager कई कंपनियाँ ख़रीदता है।' },
  'gloss.SIP': { hinglish: 'हर महीने थोड़ा-थोड़ा', plain: 'हर महीने तय रकम लगाने का पक्का आदेश।' },
  'gloss.NAV': { hinglish: 'एक unit का आज का भाव', plain: 'fund की एक unit का आज का दाम।' },
  'gloss.Direct plan': { hinglish: 'बिना एजेंट वाला plan', plain: 'वही fund, जिसमें एजेंट की सालाना कटौती अंदर नहीं है।' },
  'gloss.Regular plan': { hinglish: 'एजेंट वाला plan', plain: 'वही fund, जिसमें आपके रिटर्न में से commission कटता है।' },
  'gloss.Expense ratio': { hinglish: 'fund हर साल कितना काट लेता है', plain: 'fund की सालाना कटौती, हर लाख पे कितने रुपये।' },
  'gloss.Commission': { hinglish: 'बेचने वाले को कितना मिला', plain: 'आपके हाँ कहने पे बेचने वाला क्या कमाता है।' },
  'gloss.Equity / shares': { hinglish: 'share, कंपनी में हिस्सा', plain: 'किसी कंपनी में मालिकाना हक़ का छोटा सा टुकड़ा।' },
  'gloss.Stock market': { hinglish: 'शेयर बाज़ार', plain: 'जहाँ कंपनियों के share ख़रीदे और बेचे जाते हैं।' },
  'gloss.Trading': { hinglish: 'जल्दी ख़रीदना-बेचना', plain: 'कुछ दिन या हफ़्तों में बेचने के लिए ख़रीदना।' },
  'gloss.F&O / derivatives': { hinglish: 'F&O', plain: 'दाम की दिशा पे तेज़ दाँव। 10 में से करीब 9 का पैसा डूबता है।' },
  'gloss.Index fund': { hinglish: 'पूरे बाज़ार वाला fund', plain: 'ऐसा fund जो बस पूरा बाज़ार अपने पास रखता है।' },
  'gloss.FD': { hinglish: 'FD', plain: 'बैंक में तय समय के लिए, तय ब्याज पे रखा पैसा।' },
  'gloss.Term insurance': { hinglish: 'सिर्फ़ सुरक्षा वाली policy', plain: 'सिर्फ़ cover। पैसा वापस नहीं। घरवालों को बड़ी रकम मिलती है।' },
  'gloss.Endowment / money-back': { hinglish: 'बचत वाली policy', plain: 'बीमा और बचत एक साथ। कम रिटर्न, लंबा lock-in।' },
  'gloss.ULIP': { hinglish: 'market वाली policy', plain: 'बीमा और बाज़ार एक ही चीज़ में, ऊपर से कटौतियाँ।' },
  'gloss.Premium': { hinglish: 'premium, policy की किस्त', plain: 'policy के लिए आप जो रकम भरते हो।' },
  'gloss.Sum assured': { hinglish: 'claim में कितना मिलेगा', plain: 'claim पे घरवालों को मिलने वाली रकम।' },
  'gloss.Maturity': { hinglish: 'maturity पे कितना मिलेगा', plain: 'policy या जमा ख़त्म होने पे जो वापस मिलता है।' },
  'gloss.Persistency / lapse': { hinglish: 'policy बंद हो गई', plain: 'premium न भरने से policy बंद हो जाना।' },
  'gloss.Health cover / floater': { hinglish: 'health cover', plain: 'वो policy जो परिवार के अस्पताल के बिल भरती है।' },
  'gloss.Nominee': { hinglish: 'nominee', plain: 'वो इंसान जिसे आपके न रहने पे पैसा मिलेगा।' },
  'gloss.KYC': { hinglish: 'KYC', plain: 'पैसा लगाने से पहले एक बार होने वाली पहचान की जाँच।' },
  'gloss.PAN': { hinglish: 'PAN', plain: 'वो टैक्स नंबर जो हर निवेश के लिए चाहिए।' },
  'gloss.Demat account': { hinglish: 'share रखने वाला खाता', plain: 'वो खाता जो share बिजली के रूप में रखता है।' },
  'gloss.Mandate / auto-debit': { hinglish: 'auto-debit', plain: 'बैंक को हर महीने तय रकम काटने की इजाज़त।' },
  'gloss.EMI': { hinglish: 'EMI', plain: 'लोन की हर महीने की तय किस्त।' },
  'gloss.Minimum due': { hinglish: 'minimum due', plain: 'कार्ड की सबसे छोटी अदायगी — और सबसे महँगी।' },
  'gloss.No-cost EMI': { hinglish: 'no-cost EMI', plain: 'वो किस्तें जिनमें ब्याज दाम के अंदर छिपा होता है।' },
  'gloss.Gold loan': { hinglish: 'सोना गिरवी रखना', plain: 'सोने पे उधार। किस्त चूकी तो वो बिक जाता है।' },
  'gloss.Ponzi / chain system': { hinglish: 'चेन सिस्टम', plain: 'पुराने मेंबरों को नए मेंबरों के पैसे से भरा जाता है। ये हमेशा रुकता है।' },
  'gloss.Capital gains tax': { hinglish: 'मुनाफ़े पे टैक्स', plain: 'बेचने पे हुए मुनाफ़े पे लगने वाला टैक्स।' },
  'gloss.Credit score': { hinglish: 'CIBIL score', plain: 'एक नंबर जो बताता है आप उधार कितने भरोसे से चुकाते हो।' },
  'gloss.Corpus / portfolio': { hinglish: 'आपका पैसा कहाँ-कहाँ लगा है', plain: 'आपके पास जो कुछ है, सब मिलाकर।' },
  'gloss.Asset allocation': { hinglish: 'कितना कहाँ रखा है', plain: 'आपका पैसा सुरक्षित और बढ़ने वाले में कैसे बँटा है।' },
  'gloss.Digital arrest': { hinglish: '"CBI बोल रहा हूँ"', plain: 'वीडियो कॉल पे नकली अफ़सर, जो पैसा भेजने को कहता है।' },
  'gloss.1930': { hinglish: '1930', plain: 'साइबर ठगी की हेल्पलाइन। एक घंटे के अंदर कॉल करो।' },
  'gloss.Compounding': { hinglish: 'ब्याज पे ब्याज लगना', plain: 'वो बढ़ोतरी जो ख़ुद अपने ऊपर बढ़ने लगती है, साल दर साल।' },
  'gloss.Debt': { hinglish: 'कर्ज़ा', plain: 'जो पैसा आप पे उधार है — लोन, कार्ड का बिल, EMI।' },
  'gloss.Exit load': { hinglish: 'जल्दी निकालने की फ़ीस', plain: 'fund से जल्दी पैसा निकालने पे लगने वाली फ़ीस।' },
  'gloss.Growth option': { hinglish: 'growth वाला option', plain: 'मुनाफ़ा बाहर देने की जगह fund के अंदर ही रहता है।' },
  'gloss.Trail commission': { hinglish: 'हर साल का commission', plain: 'जितने साल पैसा लगा रहे, एजेंट को हर साल मिलने वाला हिस्सा।' },
  'gloss.SEBI': { hinglish: 'SEBI', plain: 'सरकारी संस्था जो शेयर बाज़ार पे नज़र रखती है।' },
  'gloss.IRDAI': { hinglish: 'IRDAI', plain: 'सरकारी संस्था जो बीमा कंपनियों पे नज़र रखती है।' },
  'gloss.SCSS': { hinglish: 'सीनियर सिटिज़न वाली स्कीम', plain: 'साठ साल से ऊपर वालों के लिए सरकारी बचत स्कीम।' },
};

export const STRINGS = { en, hi };

/* ── state ─────────────────────────────────────────────────────────── */

const listeners = new Set();
const missing = new Set();

let lang = detect();

function detect() {
  const stored = read(STORE_KEY);
  if (stored && LANGS.includes(stored)) return stored;
  try {
    const nav = (typeof navigator !== 'undefined' && (navigator.language || (navigator.languages || [])[0])) || '';
    if (/^hi\b|^hi-/i.test(nav)) return 'hi';
  } catch { /* no navigator (node, tests) */ }
  return 'en';
}

function read(k) { try { return localStorage.getItem(k); } catch { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode, fine */ } }

export function getLang() { return lang; }

/** Switch language. Legal mid-turn, instant, never interrupts anything. */
export function setLang(next) {
  const v = LANGS.includes(next) ? next : 'en';
  if (v === lang) return lang;
  lang = v;
  write(STORE_KEY, v);
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = v === 'hi' ? 'hi' : 'en-IN';
  }
  /* Before the listeners, so every re-render below reads the new language. */
  localiseContent();
  for (const fn of [...listeners]) { try { fn(v); } catch { /* one bad listener must not stop the rest */ } }
  return lang;
}

/** The other language — what the हिं / EN chip should print and switch to. */
export function otherLang() { return lang === 'en' ? 'hi' : 'en'; }
export function toggleLang() { return setLang(otherLang()); }
export function langChipLabel() { return LANG_CHIP[lang]; }

/** Subscribe. Returns an unsubscribe function. */
export function onLangChange(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ── lookup ────────────────────────────────────────────────────────── */

const RE_VAR = /\{(\w+)\}/g;

function interpolate(str, vars) {
  if (!vars) return str.replace(RE_VAR, '').replace(/\s{2,}/g, ' ').trim();
  return str.replace(RE_VAR, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? '' : String(v);
  }).replace(/\s{2,}/g, ' ').trim();
}

/** Is this key defined in either language? */
export function has(key) { return en[key] !== undefined || hi[key] !== undefined; }

/**
 * Look up 'key' in the current language, fall back to English, interpolate
 * '{name}' style vars. Never returns the raw key.
 * @param {string} key
 * @param {object} [vars]
 * @param {string} [fallback]  shown only if the key exists in neither language
 */
export function t(key, vars, fallback) {
  const table = STRINGS[lang] || en;
  let s = table[key];
  if (s === undefined) s = en[key];
  if (s === undefined) {
    missing.add(key);
    s = typeof fallback === 'string' ? fallback : '';
  }
  const out = interpolate(s, vars);
  return numeralStyle === 'devanagari' ? toNumerals(out) : out;
}

/** Plural form. Looks up '<key>.one' / '<key>.other', then '<key>'. */
export function tn(key, n, vars) {
  const suffix = Math.abs(Number(n)) === 1 ? '.one' : '.other';
  const merged = { n, ...(vars || {}) };
  return has(key + suffix) ? t(key + suffix, merged) : t(key, merged);
}

/**
 * Localised ordinal for a rank. Only 1–4 ever happen; n is safe anyway.
 *
 * Hindi inflects and English does not, so there are two forms and the caller
 * has to say which slot the word is going into:
 *   'nom'  a standalone badge beside a name — पहला, दूसरा   (the default)
 *   'obl'  inside a phrase, or after the honorific आप — पहले, दूसरे
 * Getting this wrong is what made the winner's badge read 'पहले' (= earlier).
 * @param {number} n
 * @param {'nom'|'obl'} [form]
 */
export function ordinal(n, form = 'nom') {
  if (form === 'obl') {
    const ok = 'ordinalObl.' + n;
    if (has(ok)) return t(ok);
    if (has('ordinalObl.n')) return t('ordinalObl.n', { n });
  }
  const k = 'ordinal.' + n;
  return has(k) ? t(k) : t('ordinal.n', { n });
}

/** The default name of seat n (1-based). 'Khiladi 1' / 'खिलाड़ी 1'.
 *  Anything that would otherwise hardcode a seat name calls this instead —
 *  a Roman 'Khiladi 1' inside an all-Devanagari HUD is the loudest tell that
 *  Hindi mode is a skin. */
export function playerName(n) { return t('setup.playerName', { n }); }

/** Money, always through util.js — Indian grouping, never ₹100,000.
 *  'big' uses lakh/crore wording, which stays Roman in both languages
 *  because that is how lakh and crore are written on every price tag. */
export function money(n, big = false) {
  const s = big ? lakhCrore(n) : rupees(n);
  return numeralStyle === 'devanagari' ? toNumerals(s) : s;
}

/** Any keys asked for that exist in neither language. Dev aid; no logging. */
export function missingKeys() { return [...missing]; }

/** Keys defined in English but not yet in Hindi — these fall back to English. */
export function untranslatedKeys() { return Object.keys(en).filter(k => hi[k] === undefined); }

/* ── the curriculum, localised in place ────────────────────────────────

   content.js and config.js are pure data files with no language layer, and
   every consumer reads their fields live at render time. So the honest way
   to make Hindi mean Hindi — without asking nine other modules to remember
   to route one more string through t() — is to localise the records
   themselves, here, whenever the language changes.

   The English is stashed on first touch and restored on the way back, so
   this is reversible and EN is always byte-identical to the source file.
   Everything is wrapped: a shape change in content.js must never stop the
   game booting, it may only leave a line in English.                     */

const _english = new Map();   // record object -> { field: the English value }

function stash(rec, field) {
  let o = _english.get(rec);
  if (!o) { o = {}; _english.set(rec, o); }
  if (!(field in o)) o[field] = rec[field];
  return o;
}

/** Copy 'hiRec' onto 'rec' when on, put the English back when off. */
function applyRecord(rec, hiRec, on) {
  if (!rec || !hiRec) return;
  for (const field of Object.keys(hiRec)) {
    const hiVal = hiRec[field];
    if (hiVal && typeof hiVal === 'object' && !Array.isArray(hiVal)) {
      applyRecord(rec[field], hiVal, on);   // quiz {}, event {}
      continue;
    }
    if (rec[field] === undefined) continue; // field the English does not have
    const orig = stash(rec, field);
    rec[field] = on ? hiVal : orig[field];
  }
}

/** Zone names and the four seat names, which live in the string table. */
function localiseChrome() {
  if (Array.isArray(ZONES)) {
    for (const z of ZONES) {
      if (has('zone.' + z.id)) { stash(z, 'name'); z.name = t('zone.' + z.id); }
    }
  }
  const players = tokens && Array.isArray(tokens.players) ? tokens.players : [];
  players.forEach((p, i) => {
    stash(p, 'name');  p.name  = playerName(i + 1);
    stash(p, 'label'); p.label = has('token.' + p.key) ? t('token.' + p.key) : p.label;
  });
  if (tokens && tokens.bot) {
    stash(tokens.bot, 'name');  tokens.bot.name  = t('setup.mithuName');
    stash(tokens.bot, 'label'); tokens.bot.label = t('setup.mithuName');
  }
}

/**
 * Put the whole curriculum into the current language. Idempotent, cheap
 * (a few hundred property writes), and safe to call at any moment — the
 * cards are built from these objects on the way up, never cached.
 */
export function localiseContent() {
  const on = lang === 'hi';
  try {
    if (Array.isArray(SQUARES)) for (const sq of SQUARES) applyRecord(sq, CONTENT_HI['sq.' + sq.n], on);
    if (Array.isArray(SNAKES))  for (const s of SNAKES)   applyRecord(s,  CONTENT_HI['snake.' + s.from], on);
    if (Array.isArray(LADDERS)) for (const l of LADDERS)  applyRecord(l,  CONTENT_HI['ladder.' + l.from], on);
    if (Array.isArray(GLOSSARY)) for (const g of GLOSSARY) applyRecord(g, CONTENT_HI['gloss.' + g.term], on);
    localiseChrome();
  } catch { /* a shape change must cost us a Hindi line, never the boot */ }
}

/**
 * Read one localised content field without going through the records.
 * The callers that want to be explicit use this:
 *   tc('sq.4', 'lesson', square.lesson)
 * @param {string} id        'sq.4' | 'snake.27' | 'ladder.36' | 'gloss.SIP'
 * @param {string} field     the content.js field name
 * @param {*} fallbackEn     the English, returned whenever there is no Hindi
 */
export function tc(id, field, fallbackEn) {
  const rec = CONTENT_HI[id];
  const v = rec ? rec[field] : undefined;
  return (lang === 'hi' && v !== undefined && v !== null) ? v : fallbackEn;
}

/** How much of the curriculum actually has Hindi. Dev aid — the old
 *  untranslatedKeys() only ever looked at the chrome, which is how a
 *  13%-translated game reported itself as fully translated. */
export function contentCoverage() {
  const want = [];
  if (Array.isArray(SQUARES)) SQUARES.forEach(s => want.push('sq.' + s.n));
  if (Array.isArray(SNAKES))  SNAKES.forEach(s => want.push('snake.' + s.from));
  if (Array.isArray(LADDERS)) LADDERS.forEach(l => want.push('ladder.' + l.from));
  if (Array.isArray(GLOSSARY)) GLOSSARY.forEach(g => want.push('gloss.' + g.term));
  const missingIds = want.filter(id => !CONTENT_HI[id]);
  return { total: want.length, translated: want.length - missingIds.length, missing: missingIds };
}

/* Set <html lang> once at boot so screen readers pick the right voice. */
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = lang === 'hi' ? 'hi' : 'en-IN';
}

/* detect() may already have chosen Hindi from storage or the phone's locale,
   and the board is built before anybody calls setLang. */
localiseContent();
