# Saanp Seedhi — Content

Publication-quality. This is the source of truth for `js/content.js`.

**Rules obeyed throughout, and gated by `tests/content.lint.mjs`:**
- Every rupee figure below has been arithmetically checked. Working is shown in the deep
  explainers so anyone can re-check it.
- **No return is ever promised.** Where growth is shown, the literal words *"if it grew at
  12% a year — not guaranteed"* appear.
- **No percentage appears without a rupee amount beside it.**
- Indian digit grouping everywhere: **₹1,00,000**, never ₹100,000. Lakh and crore for large
  numbers.
- Snakes indict the **mechanism and the counterparty**, never the player. Weddings, medical
  care, education and parents are never a snake.
- Every figure carries its vintage and source in §6. **Numbers go stale — review annually.**

---

## 1. The 100 squares

`kind` values: `plain` (ribbon only, 1800 ms) · `lesson` (opens a card) · `quiz` · `event`
· `milestone` · `finish`. Ladder feet and snake heads carry `kind: lesson` and are resolved
via `ladderAt()` / `snakeAt()`.

| # | Title | Kind | Lesson (the one line on the ribbon) |
|---|---|---|---|
| 1 | Pehla kadam | plain | Everyone here starts on the same square. No money knowledge needed. Just roll. |
| 2 | Paisa aata, chala jaata | plain | Salary comes on the 1st and is gone by the 20th. Today we find out where. |
| 3 | Saat din ka hisaab | lesson · **ladder 3→22** | Write down every rupee that goes out, for seven days. Only that. |
| 4 | Do chai roz | plain | Two ₹30 chais a day is ₹21,900 a year. Not a sin. Just worth knowing. |
| 5 | Ghar ka kharcha | plain | Rent, ration, fees, bijli, dawai. These come first. Nobody should feel bad about them. |
| 6 | Shauk bhi zaroori | plain | Everything else is a want. Not wrong — just the part you can pause in a bad month. |
| 7 | Mehngai chupke se | plain | A ₹50 plate this year is about ₹53 next year. Same shop, same plate. |
| 8 | Andaza lagao | quiz | Guess first: a cinema ticket cost ₹60 in 2006. What is it today? |
| 9 | Neeche se phir se | plain | Back near the bottom. Everybody stands here once. Nothing is lost yet. |
| 10 | Dus ka nishaan | milestone | Ten squares. You already know one true thing: quiet money quietly shrinks. |
| 11 | Dabbe mein paisa | plain | Cash at home feels safest. It is also the only money that never grows. |
| 12 | Pehli SIP — ₹500 | lesson · **ladder 12→30** | ₹500 a month, one date, one fund. The first one is the hardest. |
| 13 | Kisi ko bataya nahi | plain | You started quietly. That is allowed. Money does not need anyone's permission. |
| 14 | Byaj pe byaj | plain | Your byaj starts earning its own byaj. Slow for years, then not slow. |
| 15 | Jhatka | event | Something broke this month. Nobody planned it. Draw a card. |
| 16 | Chhota shuru karo | plain | ₹500 a month is a real start. Waiting for a big amount is how ten years pass. |
| 17 | Aadhaar se mobile jodo | lesson · **ladder 17→36** | Your Aadhaar must carry the phone you use today, or nothing online opens. |
| 18 | Bank ki line | plain | You have stood in that line for everyone else. Today you are standing in it for this. |
| 19 | Naam ek jaisa ho | plain | PAN, Aadhaar and bank must show the same spelling. One extra letter stops everything. |
| 20 | Phir chalo | plain | You lost squares, not the game. The ones who keep rolling reach 100. |
| 21 | Hisaab saaf hai | plain | Income, kharcha, and the gap between them. Most people never write it down once. |
| 22 | Leak mil gaya | plain | You found the leak. The same salary now goes further, with no raise. |
| 23 | Bacchon ki fees | plain | School fees rise every year, so the money kept for them has to grow too. |
| 24 | Safe ka matlab | lesson | Safe means nothing can go wrong. Mehngai is the thing going wrong, quietly. |
| 25 | Bura Waqt Fund | lesson · **ladder 25→49** | Three months of kharcha, reachable in one day. This is your shield. |
| 26 | Kahan rakhein | plain | Emergency money belongs in a bank, not a lock-in. Speed beats return here. |
| 27 | FD se better scheme | lesson · **snake 27→9** | Sold as better than FD. It was a 15-year policy paying about 4 paise a rupee. |
| 28 | Sabak mila | plain | That fall cost squares. It also taught the most expensive lesson on this board. |
| 29 | Kya hota agar | quiz | Guess: if income stopped tomorrow, how many months could this house run? |
| 30 | SIP chalu hai | plain | Your ₹500 is now working every single day, without you doing anything. |
| 31 | Jhatka | event | Somebody at home is ill. Nobody planned this. Draw a card. |
| 32 | Ek file, ek shelf | plain | PAN, Aadhaar, policies, passbooks. One folder. Somebody will need it one day. |
| 33 | KYC ek hi baar | plain | KYC is done once for all mutual funds. Twenty minutes, then never again. |
| 34 | Video mein PAN | plain | Good light, PAN facing the camera. Most rejections are only bad light. |
| 35 | Do alag cheezein | lesson | Insurance protects the family. Investment grows money. Never one product for both. |
| 36 | Ab shuru ho sakta hai | plain | Your paperwork works. Most people in India never get past this one step. |
| 37 | Tareekh badal do | plain | SIP on the 2nd, not the 28th. Save first, spend what is left. |
| 38 | Card ka minimum due | lesson · **snake 38→20** | Paying only the minimum charges about 3.5 paise a rupee, every month. |
| 39 | Poora bill bharo | plain | A card is fine if the whole bill is paid on the date. Otherwise it is a costly loan. |
| 40 | Saans lo | plain | You slipped. Sixty squares are still ahead. Nobody is ever out of this game. |
| 41 | Apna health cover | lesson · **ladder 41→62** | Office cover ends the day the job ends. Keep one in your own name. |
| 42 | Kitne ka cover | plain | One serious admission costs ₹3,00,000 to ₹5,00,000. Cover for that, not for ₹50,000. |
| 43 | Family floater | plain | One policy covering the whole family usually costs less than four separate ones. |
| 44 | Jhatka | event | The rent went up. Decided by somebody else. Draw a card. |
| 45 | Guarantee kitni? | quiz | Guess: above what yearly return should the word "guaranteed" scare you? |
| 46 | 3% har mahine | lesson · **snake 46→28** | 3% a month is 36% a year. No honest business pays that to a stranger. |
| 47 | Paisa chala gaya | plain | The neighbour was paid on time for eight months. That is how the trap is built. |
| 48 | Number maango | plain | Ask for the registration number and check it on the regulator's own site. Free. |
| 49 | Shield taiyaar | plain | Three months of kharcha in the bank. One bad month can no longer break you. |
| 50 | Aadha raasta | milestone | Halfway. A SIP, a buffer and cover — that is most of good money sense. |
| 51 | Machine ko yaad rehta hai | lesson | Auto-debit on salary day. The old board called square 51 "reliability". |
| 52 | Nominee bhar do | plain | One empty box. More than ₹73,000 crore lies unclaimed in India because of it. |
| 53 | Ghar mein batao | plain | One person must know where the money is. A locked secret helps nobody. |
| 54 | Term insurance | lesson · **ladder 54→71** | Pure cover, no money back. That is exactly why it costs so little. |
| 55 | Neeche aa gaye | plain | You are behind, not beaten. From here the buffer keeps you standing. |
| 56 | Sach likho form pe | plain | Write your real health and habits on the form. A small lie is how claims die. |
| 57 | Sona girvi rakha | lesson · **snake 57→40** | The family gold went to the lender. Miss the payments and it is auctioned. |
| 58 | Shaadi galti nahi hai | plain | The wedding is never the mistake. Borrowing at 20 paise a rupee for one is. |
| 59 | Jhatka | event | The work stopped for three months. Not your fault. Draw a card. |
| 60 | Ek jagah nahi | plain | Saare ande ek tokri mein mat rakho. Some safe, some growing, always both. |
| 61 | Kaunsa pehle | quiz | Guess: buffer, insurance, or investing — which one comes first? |
| 62 | Parivar surakshit | plain | If something happens, this house does not fall apart. That is what cover buys. |
| 63 | Sona kitna | plain | Gold is fine. Jewellery is not investment — making charges take ₹8 to ₹25 per ₹100. |
| 64 | Utaar chadhav | plain | Markets go up and down. That movement is the price of growth, not a fault. |
| 65 | Trading alag hai | plain | Buying to sell this week is trading. Buying to keep ten years is investing. |
| 66 | F&O ka chakkar | lesson · **snake 66→47** | SEBI counted it: almost 88 of every 100 F&O traders lost money last year. |
| 67 | Padosi ki tip | plain | The neighbour tells you his wins and never his losses. Everybody does. |
| 68 | Direct plan | lesson · **ladder 68→85** | Same fund, two prices. Direct has no agent's cut sitting inside it. |
| 69 | Kaun kama raha hai | lesson | Every product pays somebody. The old board called square 69 "debt". |
| 70 | "Meri fees kuch nahi" | plain | "My service is free" means the fee is already sitting inside your returns. |
| 71 | Ghar wale safe | plain | Term cover done. The cheapest and most loving thing on this whole board. |
| 72 | Paanch saal ho gaye | plain | Sixty auto-debits, never missed, never thought about. The machine did it. |
| 73 | Jhatka | event | A parent needs care now. Nobody's fault. Draw a card. |
| 74 | SIP band kar di | lesson · **snake 74→55** | You stopped the SIP when prices fell. That is buying only at the high prices. |
| 75 | Pauna raasta | milestone | Three-quarters. Notice: nothing so far needed a big salary. |
| 76 | Kharcha padho | lesson | Every fund takes a yearly cut. The old board called square 76 "knowledge". |
| 77 | Waqt sabse bada | plain | Starting ten years earlier can do more than doubling the amount. |
| 78 | Kuch nahi kiya | lesson · **ladder 78→94** | Prices fell 30% and you did nothing. The old board called square 78 "tapasya". |
| 79 | Thoda peeche | plain | A small slip this late. Annoying, not serious. Pick up the dice. |
| 80 | Laal number | plain | When the screen shows red the money has really fallen. Selling then makes it permanent. |
| 81 | Bank se call aaya | plain | "FD se better scheme hai." Ask one thing: policy kitne saal ki hai? |
| 82 | Guaranteed kitna? | lesson | Government schemes do pay a guaranteed 8%. A stranger promising 12% is the problem. |
| 83 | Lock-in poochho | plain | Ask how many years the money is stuck. Nobody tells you this on their own. |
| 84 | Kharcha kam hua | plain | Same fund, about ₹500 a year less taken per ₹1,00,000 — every year, for twenty years. |
| 85 | Boring hi sahi | plain | Good money habits are boring. Excitement is usually the expensive option. |
| 86 | Jhatka | event | A bill arrived that nobody could have seen coming. Draw a card. |
| 87 | Kaun poochta hai | quiz | Guess: which officer may ask you to transfer money "for verification"? |
| 88 | Aath kadam | plain | Eight squares back. You can still finish first. Roll. |
| 89 | Ek aur premium | lesson · **snake 89→79** | "Bhar do, sab wapas mil jayega." It is usually a brand new policy. |
| 90 | 1930 yaad rakho | plain | Cheated online? Call 1930 within the hour. That is when money can still be frozen. |
| 91 | Screen share nahi | plain | Nobody needs AnyDesk or your OTP to fix your account. Nobody. Ever. |
| 92 | Bas thoda aur | milestone | Look back: SIP, buffer, cover, direct plan, nominee. That is a whole plan. |
| 93 | Bacchon ke saamne | plain | Children learn money by watching, not by being told. Let them see the SIP go out. |
| 94 | Wahi paisa bada hua | plain | You added nothing. You just did not run. That is why it grew. |
| 95 | Ghar walon se baat | plain | Tell the family where the money is kept. This is the last real risk left. |
| 96 | "CBI bol raha hoon" | lesson · **snake 96→88** | A uniform on a video call and a transfer "for verification". Both are a costume. |
| 97 | Naa keh diya | plain | You said no. That was the real test on this board, and you passed. |
| 98 | Sab likha hua hai | plain | Accounts, nominee, and one person who knows. Your money will reach them. |
| 99 | Ek kadam | plain | One square left. The old board put a snake here. We took it out. |
| 100 | Manzil: lakshya poora | finish | Not the richest. The one whose goal got funded. That was always the game. |

**Counts:** 62 plain · 22 lesson (8 snake heads, 8 ladder feet, 6 standalone) · 5 quiz ·
6 event · 4 milestone · 1 finish = 100.

---

## 2. The eight snakes

Products and situations. Every one names the counterparty. **Nothing bites above 96, and
the two late snakes drop 10 and 8.**

---

### 27 → 9 · FD se better scheme (drop 18)

**Why.** ₹50,000 a year for 15 years is ₹7,50,000 of your money, and it comes back as about
₹10,40,000 — roughly ₹2,50,000 less than the same money in an FD.

**Escape.** Ask one question before signing: *policy kitne saal ki hai?* If the answer is
15 or 20, it is not an FD.

**Kiska faayda:** the bank branch and the agent, from a large first-year commission.

**Aur padho.** A savings-plus-insurance policy is sold as a five-year deposit. The five
years is how long you *pay*; the policy runs fifteen or twenty. Pay ₹50,000 a year for
15 years — ₹7,50,000 in — and at a typical 4% it matures around ₹10,40,000. The identical
money in a 6.5% FD would be about ₹12,90,000. You paid ₹2,50,000 for cover of maybe ₹5 lakh.
**Do this:** buy term cover for the family and a SIP for the money. Never one product for
both jobs.

---

### 38 → 20 · Card ka minimum due (drop 18)

**Why.** A ₹50,000 bill left running on the card costs about ₹21,000 of interest in a year.
The "minimum due" of ₹2,500 keeps the card alive and the karza growing.

**Escape.** Pay the full bill on the date. If you truly cannot, ask the bank to convert it
to a normal loan — 14 paise a rupee beats 42.

**Kiska faayda:** the card issuer. Interest on revolving balances is most of what a card
earns.

**Aur padho.** A credit card is genuinely free if the whole bill is paid on the due date.
The moment it is not, the unpaid amount charges roughly 3.5 paise per rupee **every month**
— about 42 paise a rupee a year. On ₹50,000 that is about ₹21,000 of interest in twelve
months, on top of the ₹50,000. Nobody ever quotes it as an annual number.
**Do this:** clear the highest-rate card first, even if it is the smallest, and stop using
it until the balance reads zero.

---

### 46 → 28 · 3% har mahine (drop 18)

**Why.** ₹2,00,000 into a scheme paying 3% a month. It paid on time for eight months, then
stopped. Nothing came back.

**Escape.** Ask where the profit comes from. If the answer is new members, it is a chain
system — walk away and warn the neighbour too.

**Kiska faayda:** the earlier members and the organiser, paid out of the newer members'
money.

**Aur padho.** 3% a month is 36% a year before compounding. No lawful business in India
pays that to a stranger. A chain system pays the early members from the new members' money,
so it looks perfect for eight or ten months and then stops the day recruiting stops. Saradha
took about ₹30,000 crore from 17 lakh depositors on exactly this shape.
**Do this:** before paying anyone, ask for the SEBI or RBI registration number and check it
on the regulator's own website. It is free and it takes two minutes.

---

### 57 → 40 · Sona girvi rakha (drop 17)

**Why.** ₹4,00,000 borrowed against the family gold at 20 paise a rupee is ₹80,000 of
interest a year. Miss the payments and the chain is auctioned, not returned.

**Escape.** Save for known kharcha months ahead. Gold is the last door to open, never the
first.

**Kiska faayda:** the gold-loan NBFC or the local lender, and whoever buys the auctioned
gold.

**Aur padho.** Gold loans are fast because your gold is the security. Banks lend against
gold at roughly 9 to 12 paise a rupee a year; gold-loan NBFCs and local lenders often
charge 18 to 24. On ₹4,00,000 at 20% that is ₹80,000 a year. India's outstanding gold loans
went from ₹6.3 lakh crore in March 2023 to ₹19.4 lakh crore in March 2026 — increasingly
for spending, not emergencies.
**Do this:** for a known expense like a wedding, start a separate fund the year before.
Pledging the family's only reserve for something you could see coming is the expensive
order.

---

### 66 → 47 · F&O ka chakkar (drop 19)

**Why.** SEBI's own study: almost 88 of every 100 people who traded F&O last year lost
money. The average net loss was ₹1,17,000 per person, in one year.

**Escape.** That is trading, not investing. If you want the market, use a SIP and give it
years.

**Kiska faayda:** the broker and the exchange. Transaction costs alone took about ₹25,000
crore.

**Aur padho.** SEBI studied every individual equity-derivatives trader for FY26: 87.7% lost
money, with an aggregate net loss of ₹91,685 crore and an average of about ₹1,17,000 each.
Among the under-30s — 43% of all traders — 89% lost. Roughly 9 in 10 of those who lost two
years running and kept going lost again.
**Do this:** keep it completely separate from the family's money. If you must try it, use
only what you can lose entirely — never the bura waqt fund, never borrowed money.

---

### 74 → 55 · SIP band kar di (drop 19)

**Why.** Prices fell, so you paused ₹5,000 a month for eight months. That is ₹40,000 that
never went in — and it never went in cheap.

**Escape.** If money is tight, cut the SIP to ₹500. Cutting is fine. Stopping is what
hurts.

**Kiska faayda:** nobody. This one costs you and pays no one — which is why almost nobody
warns you about it.

**Aur padho.** A SIP buys more units when prices are low. Stopping it during a fall means
you only ever bought at the high prices, which is exactly backwards. In India the SIP
stoppage ratio spikes during drawdowns — it reached about 109% in January 2025, meaning
more SIPs were closed than opened that month. Nobody prepared those investors for the
number turning red.
**Do this:** write down today, while things are calm, what you will do when prices fall:
nothing. Then show that page to your family.

---

### 89 → 79 · Ek aur premium (drop 10)

**Why.** A call says one more premium unlocks your stuck money. ₹30,000 paid — and it turned
out to be a brand new 15-year policy.

**Escape.** Ask for the old policy number and its maturity date, in writing, before paying
anything.

**Kiska faayda:** the agent, who earns a fresh first-year commission on a "revival".

**Aur padho.** This one preys on money that is genuinely stuck: about ₹8,974 crore of
unclaimed money sits with Indian life insurers. Half of a large insurer's policies, counted
by number, are no longer being paid by year five, so there are millions of lapsed policies
to call about. "Revival" calls very often sell a new policy with a new start date.
**Do this:** ask for the policy number, the start date and the maturity date in writing. A
new start date means a new policy, not a revival.

---

### 96 → 88 · "CBI bol raha hoon" (drop 8)

**Why.** A video call, a police backdrop, your Aadhaar "found in a parcel", and then ₹8,000
as a release fee. Indians lost about ₹3,012 crore to this between 2022 and 2025.

**Escape.** Cut the call, tell one family member, dial 1930 within the hour. No officer ever
asks for a transfer.

**Kiska faayda:** organised scam centres — around 46% of these operations run out of
Cambodia, Myanmar and Laos.

**Aur padho.** "Digital arrest" produced 2,41,537 complaints and about ₹3,012 crore of
losses between 2022 and 2025, with over 30,000 complaints in 2025 alone. The uniform, the
police station behind the caller and the FIR on screen are all a costume and a backdrop.
The one line that defeats the whole family of scams: **no genuine police, court, CBI, RBI or
income-tax officer has ever asked anyone to transfer money to a "verification account".**
**Do this:** cut the call, say it out loud to one person in the house, then dial 1930. The
first hour is when money can still be frozen.

---

## 3. The eight ladders

Plumbing, not virtue. Each carries the concrete first step.

---

### 3 → 22 · Saat din ka hisaab (lift 19)

**Why.** Seven days of writing down every rupee usually finds ₹1,500 to ₹3,000 a month
leaking — ₹18,000 to ₹36,000 a year, found without earning any more.

**How.** Notes app or the back of a bill. Seven days only. Cut nothing yet — just read it
once at the end.

**Aur padho.** Nobody remembers their own kharcha correctly, which is why "where does it
go?" has no answer for most households. Seven days is enough to see the shape: a ₹100-a-day
habit is ₹36,500 a year, and two ₹30 chais a day is ₹21,900. Families who do this typically
find ₹1,500 to ₹3,000 a month they never chose to spend.
**Do this:** for the next seven days, write every rupee that leaves. Then sit down once and
read it. That is the whole exercise.

---

### 12 → 30 · Pehli SIP — ₹500 (lift 18) · *the old board called this square "faith"*

**Why.** ₹500 a month for twenty years is ₹1,20,000 of your own money going in, ₹500 at a
time. The habit is what you are really buying.

**How.** One index fund, direct plan, ₹500, auto-debit dated two days after salary. Fifteen
minutes, once.

**Aur padho.** ₹500 × 12 × 20 = ₹1,20,000 of your own money. If it grew at 12% a year — not
guaranteed — that would be roughly ₹4,99,000; at 8% it would be closer to ₹2,95,000. The
range is the honest part. What is not in doubt is the ₹1,20,000, and that nobody who waited
for a lump sum ever put it in. India's average retail mutual-fund folio is about ₹86,877 —
small amounts are the norm, so the *start date* is the whole game.
**Do this:** start one SIP of ₹500 today. Do not wait for a bigger amount or a better month.

---

### 17 → 36 · Aadhaar se mobile jodo (lift 19)

**Why.** This one costs about ₹50 and one morning, and it is the single most common reason
a first attempt to invest fails.

**How.** Go to an Aadhaar Seva Kendra with your Aadhaar and the phone number you actually
use today. That is it.

**Aur padho.** Every online KYC sends its OTP to the mobile linked to your Aadhaar. If that
is a number you stopped using in 2018, nothing will open — no mutual fund, no demat, no
mandate, no claim — and the error message will not tell you why. The fix is a physical visit
and a fee of about ₹50. It is the cheapest, dullest, highest-leverage thing on this board.
**Do this:** check which number your Aadhaar carries at myaadhaar.uidai.gov.in before you
try to open anything.

---

### 25 → 49 · Bura Waqt Fund (lift 24) · *earns the shield*

**Why.** If the house spends ₹25,000 a month, three months is ₹75,000. That is what stops a
hospital bill turning into card debt at 42 paise a rupee.

**How.** Open a separate savings account, no card linked. Send ₹2,000 a month until it holds
three months of kharcha.

**Aur padho.** Three months of expenses, reachable the same day. On ₹25,000 a month that is
₹75,000; six months is ₹1,50,000. At ₹2,000 a month you get there in a bit over three years;
at ₹5,000 a month, in fifteen months. It must be in a bank, not in gold and not in a
lock-in — speed matters more than return here, because the whole point is the afternoon you
need it.
**Do this:** open a separate savings account this week and standing-instruct ₹2,000 into it
on salary day. Do not link a debit card to it.

---

### 41 → 62 · Apna health cover (lift 21)

**Why.** One serious hospital admission costs ₹3,00,000 to ₹5,00,000. A ₹10,00,000 family
floater costs roughly ₹20,000 to ₹30,000 a year.

**How.** Buy a family floater of at least ₹10,00,000 in your own name, separate from the
office cover, while everyone is healthy.

**Aur padho.** About 40 crore Indians — the "missing middle" — have no health cover at all,
and one hospitalisation is the most common route from lower-middle class into debt. Company
cover ends on the day the job ends, which is often the week you need it, and pre-existing
conditions reset when you finally buy your own. A five-day city admission already crosses
₹1,00,000; a serious one runs ₹3,00,000 to ₹5,00,000.
**Do this:** buy your own family floater now, while everyone is healthy and the waiting
periods can run down quietly in the background.

---

### 54 → 71 · Term insurance (lift 17)

**Why.** For a healthy 30-year-old, ₹1,00,00,000 of cover often costs about ₹12,000 to
₹15,000 a year — roughly ₹1,000 a month. Nothing comes back, which is exactly why it is
cheap.

**How.** Take 10 to 15 times your yearly income. Term only, bought online, nothing bundled
with it, every health question answered honestly.

**Aur padho.** Term insurance pays only if you die during the term. That is the whole
product, and it is why ₹1 crore of cover costs a fraction of what a "money-back" policy
costs for a tenth of the cover. Premiums depend on your age, health and insurer — at 30,
roughly ₹12,000 to ₹15,000 a year for ₹1 crore; at 40 it is often double. If you earn
₹6,00,000 a year, aim for ₹60,00,000 to ₹90,00,000 of cover.
**Do this:** buy it direct from the insurer, tell the complete truth on the form, and tell
your family the policy exists.

---

### 68 → 85 · Direct plan (lift 17)

**Why.** Same fund, same manager, two prices. Direct typically keeps about ₹500 a year in
your hands for every ₹1,00,000 you hold — every year, for as long as you hold it.

**How.** In the app, choose the **Direct** version and the **Growth** option. Start new SIPs
there first; check the exit load before moving old money.

**Aur padho.** A regular plan pays a trail commission to the distributor out of your
returns, embedded in the NAV so you never see a bill. Real numbers: HDFC Top 100 has run
about 1.28% direct against 1.78% regular — a gap of half a paisa per rupee, or roughly ₹500
a year per ₹1,00,000, ₹2,500 a year on ₹5,00,000, and it compounds against you for decades.
This does not make regular plans bad; if you genuinely need handholding, that is what you
are paying for. Just know you are paying.
**Do this:** check whether your existing SIPs say Direct or Regular. Start every new one
Direct.

---

### 78 → 94 · Kuch nahi kiya (lift 16) · *the old board called this square "tapasya"*

**Why.** Prices fell 30% — ₹5,00,000 showed as ₹3,50,000 — and you changed nothing for
eighteen months. Your ₹5,000 kept buying every month while everyone else stopped.

**How.** Decide today, in writing, while things are calm: when it falls, I do nothing for
eighteen months. Show that page to your family.

**Aur padho.** About 40% of investors SEBI surveyed have gone dormant, and 87% of them cite
poor performance — they started, saw a drawdown, and froze. A 30% fall turns ₹5,00,000 into
₹3,50,000 on screen. That is a real fall, not an illusion; what makes it permanent is
selling. The people who kept their SIP running through it bought their cheapest units of the
whole decade.
**Do this:** move the app off your home screen and look once every three months instead of
every day.

---

## 4. Milestones, standalone lesson cards, events and quizzes

### 4.1 Milestones

**Square 10 — Dus ka nishaan**
> Ten squares done. Money left alone does not stay still — mehngai moves it, quietly and
> every year. That is the whole reason "just keep it safe" is not a plan.

**Aur padho.** At about 6% mehngai, ₹1,00,000 kept in a steel dabba for twenty years buys
roughly ₹31,000 worth of things (₹1,00,000 ÷ 1.06²⁰, and 1.06²⁰ ≈ 3.21). A cinema ticket that
cost ₹60 in 2006 is around ₹250 today. Nothing went wrong and nobody stole anything — the
rupees just bought less each year. **Do this:** pick one thing you buy monthly and ask what
it cost ten years ago. That number is your real teacher.

---

**Square 50 — Aadha raasta**
> Halfway. Three things now exist: a ₹500 SIP, three months of kharcha, and cover in your
> own name. That is most of good money sense, and none of it needed a big salary.

**Aur padho.** Of every ₹100 Indian households saved in FY25, ₹35 went into deposits, ₹22
into PF and pension, ₹15 into life insurance, ₹13 into mutual funds and ₹2 into shares. The
₹15 in insurance is the biggest single misallocation in the country, because most of it is
savings bought inside an insurance wrapper. **Do this:** list what you own on one page and
mark which of the three — buffer, cover, growing money — each thing actually is.

---

**Square 75 — Pauna raasta**
> Three-quarters. Look at what you climbed: a written hisaab, a linked mobile, a buffer,
> cover, and a fund that does not pay an agent. Not one of them needed a raise.

**Aur padho.** 63% of Indian households know about at least one market product; only 9.5%
actually use one. The gap is almost never the money — it is the mobile number that no longer
gets the OTP, the name spelled differently on the PAN, the mandate that timed out. Everything
you have climbed on this board so far is plumbing. **Do this:** check the one thing you most
suspect is broken — the Aadhaar-linked mobile, or the name match across PAN and bank.

---

**Square 92 — Bas thoda aur**
> Look back at the whole plan: SIP, buffer, health cover, term cover, direct plan, nominee.
> Six things. Everything left is about not being fooled and telling your family.

**Aur padho.** More than ₹73,000 crore is unclaimed in India — about ₹60,518 crore with
public sector banks, ₹8,974 crore with life insurers and ₹3,749 crore in mutual funds — and
a national campaign returned only ₹5,777 crore of it. Money nobody can find is money that
was never earned. **Do this:** add a nominee to every account this week and tell one family
member which folder the papers are in.

---

### 4.2 The six standalone lesson cards

**Square 24 — Safe ka matlab**
> "Safe" means nothing can go wrong. Mehngai is the thing going wrong.

**Aur padho.** ₹1,00,000 in an FD at 6.5% earns ₹6,500 in a year. If you are in the 30%
slab, ₹1,950 goes in tax, leaving ₹4,550. At 4.5% mehngai, ₹4,500 of buying power quietly
disappears. What is actually left: about ₹50. The FD did its job — it protected the rupees.
It was never designed to protect what the rupees can buy. **Do this:** keep six months of
kharcha in an FD and stop pretending the rest is safe there.

---

**Square 35 — Do alag cheezein**
> Insurance protects the family. Investment grows money. Never one product doing both.

**Aur padho.** Bundled savings-insurance plans — endowment, money-back, ULIP — have
historically returned about 3 to 5.5 paise per rupee a year while giving cover of roughly
ten times the *premium* instead of the ten to fifteen times *income* a family actually needs.
Indian households put ₹5.3 lakh crore into life insurance funds in FY25, 15% of all financial
savings — more than into mutual funds. **Do this:** if a product promises both protection and
returns, price the two separately and compare. It almost never wins.

---

**Square 51 — Machine ko yaad rehta hai** · *the old board called this "reliability"*
> A SIP dated the 28th fails. Dated the 2nd it runs for twenty years without a thought.

**Aur padho.** Nothing about willpower changes when the SIP date moves — the money simply
leaves before the month can eat it. ₹2,000 a month saved before spending is ₹24,000 a year
and ₹4,80,000 over twenty years of your own money going in. A SIP you have to remember is a
SIP you will skip in exactly the month you could least afford to. **Do this:** move your SIP
date to one or two days after salary lands. It is one click in the app.

---

**Square 69 — Kaun kama raha hai** · *the old board called this "debt"*
> Every product pays somebody. Ask who gets paid, and how much, before you sign.

**Aur padho.** "Meri fees kuch nahi hai" almost always means the fee is inside the product.
A regular mutual-fund plan pays a trail of roughly half a paisa per rupee a year — about ₹500
per ₹1,00,000. An endowment policy pays a large first-year commission. IRDAI's own annual
report calls mis-selling a significant concern, and complaints about unfair business
practices rose 14% to 26,667 in FY25, with banks and brokers generating the most.
**Do this:** ask the seller, out loud, what they earn if you say yes. The answer, or the
discomfort, tells you what you need.

---

**Square 76 — Kharcha padho** · *the old board called this "knowledge"*
> Every fund takes a yearly cut, taken quietly, whether the fund went up or down.

**Aur padho.** A 1% expense ratio on ₹1,00,000 is ₹1,000 a year — about ₹2.74 deducted every
single day (₹1,000 ÷ 365). It is not billed; it is taken out of the NAV before you see it.
And it is charged even in a year the fund falls. Knowing the number is the whole skill; you
do not need to understand the regulation behind it. **Do this:** look up the expense ratio of
every fund you own. It takes ten minutes and you only have to do it once a year.

---

**Square 82 — Guaranteed kitna?**
> Guaranteed is not automatically fake. Guaranteed *and* high *and* from a stranger is.

**Aur padho.** The government's Senior Citizens' Savings Scheme pays a guaranteed 8.2% —
guaranteed by an Act of Parliament, and completely real. So "guaranteed" is not the red flag
on its own. The line is the *rate*: anything promising a guaranteed 12% a year or more is
either a mislabelled insurance product or illegal under the Unregulated Deposit Schemes Act,
2019. Saradha (₹30,000 crore), PACL (₹49,100 crore) and Rose Valley all ran above that line.
**Do this:** for anything above 8%, ask for the registration number and check it on the
regulator's own website before a rupee moves.

---

### 4.3 The Jhatka deck (events) — "AAPKI GALTI NAHI"

Each costs 4 squares, or nothing if the Bura Waqt Fund absorbs it. **No blame, and no advice
about avoiding it, because it was not avoidable.**

| # | Event | Line | If shield held | If not |
|---|---|---|---|---|
| 15 | Scooter kharab | A ₹4,000 repair, no warning. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. Yeh wahi hai jiske liye buffer hota hai. |
| 31 | Ghar mein beemari | ₹80,000 in two days. Nobody planned it. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. A buffer is what buys the time. |
| 44 | Kiraya badh gaya | ₹2,000 more a month, decided by somebody else. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. Adjust the amount — never stop the SIP. |
| 59 | Teen mahine kaam nahi | Work stopped. This is a risk, not a mistake. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. Three months of kharcha is exactly this. |
| 73 | Maa-baap ki dekhbhaal | Care now costs ₹15,000 a month. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. Family kharcha is never the mistake. |
| 86 | Bina bataye bill | Something arrived that nobody could have seen. | Bura waqt fund ne sambhal liya. | 4 ghar peeche. Life does not check your calendar. |

---

### 4.4 The five quiz squares (Sabka Sawaal)

Guess before the reveal. **Two chips, neither wrong, no score, no timer, no penalty.** Every
reveal opens by normalising error.

| # | Question | Chip A | Chip B | Reveal |
|---|---|---|---|---|
| 8 | A cinema ticket cost ₹60 in 2006. Today? | About ₹120 | About ₹250 | Zyaadatar log kam bataate hain. About ₹250 — roughly four times, in twenty years. Nothing went wrong. That is mehngai. |
| 29 | If income stopped tomorrow, how long could this house run? | One month or less | Three months or more | Most households answer "one month or less" — and they are being honest. Three months of kharcha set aside is the target. |
| 45 | Above what guaranteed yearly return should you walk away? | Above 8% | Above 12% | Above 12%. Careful: the government's SCSS pays a guaranteed 8.2% and is completely real. Guaranteed is not the problem — guaranteed, high, and from a stranger is. |
| 61 | Which comes first? | Investing | Buffer | Buffer, then insurance, then investing. In that order, every time, for everyone. It is the only order that survives a bad month. |
| 87 | Which officer may ask you to transfer money "for verification"? | CBI on a video call | None. Not one. | None. Not one. No police, court, CBI, RBI or income-tax officer has ever asked anyone to transfer money to verify it. Cut the call, then dial 1930. |

---

## 5. Glossary

Every financial term used anywhere in the game. **Plain definition under 15 words. The
Hinglish column is what the game actually says out loud.**

| Term | Say this instead (Hinglish) | Plain meaning |
|---|---|---|
| Inflation | **mehngai** | Prices rise every year, so the same rupees buy less. |
| Investment | **paisa lagana** | Putting money somewhere so it grows over years. |
| Savings | **bachat** | Money kept aside, not spent. |
| Interest | **byaj** | The rent money earns, or the rent you pay to borrow. |
| Compound interest | **byaj pe byaj** | Your interest starts earning its own interest. |
| Returns | **kitna badhkar mila** | How much more you got back, said in rupees. |
| Risk | **paisa doob sakta hai** | The money can fall in value, or be lost. |
| Volatility | **utaar-chadhav** | The up-and-down movement of prices along the way. |
| Diversification | **paisa alag-alag jagah rakho** | Never keep everything in one place. |
| Liquidity | **kitni jaldi paisa nikal sakte ho** | How fast you can turn it back into cash. |
| Lock-in | **kitne saal paisa nahi nikal sakte** | Years during which you cannot take the money out. |
| Emergency fund | **bura waqt fund** | Three to six months of expenses, reachable the same day. |
| Mutual fund | **sabka paisa ek jagah, manager chalata hai** | Many people's money pooled; a manager buys many companies. |
| SIP | **har mahine thoda-thoda** | A standing instruction to invest a fixed amount monthly. |
| NAV | **ek unit ka aaj ka bhaav** | Today's price of one unit of a fund. |
| Direct plan | **bina agent wala plan** | The same fund without the agent's yearly cut inside. |
| Regular plan | **agent wale plan** | The same fund with a commission taken from your returns. |
| Expense ratio | **fund har saal kitna kaat leta hai** | The yearly cut a fund takes, in rupees per lakh. |
| Commission | **bechne wale ko kitna mila** | What the seller earns when you say yes. |
| Equity / shares | **share**, **company mein hissa** | A small ownership piece of a company. |
| Stock market | **share bazaar** | Where company shares are bought and sold. |
| Trading | **jaldi khareedna-bechna** | Buying to sell within days or weeks. |
| F&O / derivatives | **F&O** | A fast bet on price direction. Almost 9 in 10 lose. |
| Index fund | **poore bazaar wala fund** | A fund that simply holds the whole market. |
| FD | **FD** | Money kept with a bank for a fixed time at fixed interest. |
| Term insurance | **sirf suraksha wali policy** | Pure cover. No money back. Family gets a large amount. |
| Endowment / money-back | **bachat wali policy** | Insurance and savings bundled. Low returns, long lock-in. |
| ULIP | **market wali policy** | Insurance plus market investment in one, with charges. |
| Premium | **premium**, **policy ki kist** | The amount you pay for an insurance policy. |
| Sum assured | **claim mein kitna milega** | The amount the family receives on a claim. |
| Maturity | **maturity pe kitna milega** | What you get back when the policy or deposit ends. |
| Persistency / lapse | **policy band ho gayi** | The policy stopped because premiums were not paid. |
| Health cover / floater | **health cover** | Insurance that pays hospital bills for the family. |
| Nominee | **nominee** | The person who receives the money if you are gone. |
| KYC | **KYC** | The one-time identity check before you can invest. |
| PAN | **PAN** | The tax number every investment needs. |
| Demat account | **share rakhne wala khaata** | The account that holds shares in electronic form. |
| Mandate / auto-debit | **auto-debit** | Permission for the bank to take a fixed amount monthly. |
| EMI | **EMI** | A fixed monthly instalment on a loan. |
| Minimum due | **minimum due** | The smallest card payment allowed — and the costliest. |
| No-cost EMI | **no-cost EMI** | Instalments where the interest is hidden in the price. |
| Gold loan | **sona girvi rakhna** | Borrowing against your gold. Miss payments, it is sold. |
| Ponzi / chain system | **chain system** | Old members paid from new members' money. It always stops. |
| Capital gains tax | **munafe pe tax** | Tax on the profit when you sell. |
| Credit score | **CIBIL score** | A number showing how reliably you repay. |
| Corpus / portfolio | **aapka paisa kahan-kahan laga hai** | Everything you own, taken together. |
| Asset allocation | **kitna kahan rakha hai** | How your money is split across safe and growing. |
| Digital arrest | **"CBI bol raha hoon"** | A fake officer on a video call demanding a transfer. |
| 1930 | **1930** | The cyber-fraud helpline. Call within the hour. |

---

## 6. Sources and vintage

**Review annually. Any figure without a live source is deleted, not softened.**

| Figure used | Source · vintage |
|---|---|
| 87.7% of F&O traders lost, ₹91,685 cr aggregate, ~₹1,17,000 average, 89% of under-30s | SEBI study, 20 Aug 2026 (FY26) |
| ~40% of surveyed investors dormant; 87% cite performance; 63% aware / 9.5% invest; 94% prefer Hindi or a regional language; 21% can name SEBI | SEBI Investor Survey 2025 |
| ₹5.3 lakh cr into life insurance = 15% of FY25 financial savings; ₹100 split (35/22/15/13/7/6/2) | RBI household financial savings, FY25 |
| Endowment IRR 3–5.5%; life insurance penetration 2.7% of GDP | IRDAI / PrimeInvestor, FY25 |
| ~50% of LIC policies (by count) not persisting to year 5; 13th-month ~64% | LIC press release, 27 May 2025 |
| Mis-selling complaints +14% to 26,667 in FY25; banks and brokers lead | IRDAI annual report, FY25 |
| Gold loans ₹6.3 lakh cr (Mar 2023) → ₹19.4 lakh cr (Mar 2026) | CRIF / Kotak, FY26 |
| Digital arrest: 2,41,537 cases, ~₹3,012 cr, 2022–2025; ~46% run from Cambodia/Myanmar/Laos | I4C |
| ₹22,495 cr lost to **all** cyber fraud in 2025, +24% YoY | I4C / MHA, 2025 |
| Unclaimed: ₹60,518 cr PSBs + ₹8,974 cr life insurers + ₹3,749 cr MFs; ₹5,777 cr returned | PIB, Feb 2026 |
| SCSS guaranteed 8.2%; Unregulated Deposit Schemes Act 2019 | Government of India |
| ~40 crore uninsured "missing middle"; OOP health spend 40–50% | NITI / national health accounts |
| HDFC Top 100: 1.28% direct vs 1.78% regular | Zerodha Varsity, expense-ratio chapter |
| CPI ~4.45% (Jul 2026); FD ~6.5% | MoSPI / bank card rates, 2026 |
| SIP stoppage ratio ~109%, Jan 2025; average folio ₹86,877 | AMFI |
| Household debt 41.3% of GDP (Mar 2025) | RBI Financial Stability Report |
| Saradha ~₹30,000 cr / 17 lakh depositors; PACL ₹49,100 cr | SEBI / CBI case records |
| Aadhaar demographic update fee ~₹50 | UIDAI |

**Assumptions stated wherever growth is shown, never hidden:**
- Every growth figure names its rate and carries *"not guaranteed"*.
- ₹500/month for 20 years: ₹1,20,000 in; ~₹4,99,000 at 12%, ~₹2,95,000 at 8%.
- ₹2,000/month from 25 to 60 (₹8,40,000 in) is about ₹1.30 crore at 12%; ₹5,000/month from
  35 to 60 (₹15,00,000 in) is about ₹94.9 lakh at 12%. **At 8% the later start narrowly
  wins** — so the "start early" claim is only ever made with the 12% assumption stated out
  loud.
- Endowment: ₹50,000 × 15 years = ₹7,50,000 in; ≈ ₹10,41,000 at 4%; ≈ ₹12,88,000 in a 6.5%
  FD (annuity-due, compounded annually).
- Mehngai: ₹1,00,000 ÷ 1.06²⁰ ≈ ₹31,180.
- Card: ₹50,000 × 42% ≈ ₹21,000 a year (nominal; compounded monthly at 3.5% it is closer to
  ₹25,500 — we quote the smaller, safer number).
