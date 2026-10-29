# Interview sheet — Shubham Jadhav
**Monday 2 Nov 2026 · Nariman Point · 45 min**

Candidate from Bhumika (Mascot HR). Sent the app, repo and a note on what went wrong —
unprompted. B.Tech AI & Data Science, Jul 2026. Four internships, all data science.

---

## Before you sell him anything — 10 minutes

**1. "What do you think this job is?"**
Let him answer first. His CV says *"looking to grow into a Data Engineering / AI-ML role."*
If he describes an ML job, correct it now, not in month three.

**2. Salary expectation.** Band is ₹25,000–40,000. Ask before he likes you.

**3. "Why did you build the split-spend app?"**
Was it for the application, or for himself and his friends? Both are fine answers.
Built-for-himself is the better one.

---

## His own work — the three questions

All three come from his repo, so they're fair, and all three are things he can recover from.
**Watch how he reacts to being found out, not whether he knew.**

**1. "You said all the data is stored locally. Is it?"**
It isn't. 11 Firestore calls, 2 `localStorage` uses — it's a cloud app with a small cache.
He described his own build wrongly. Describing things precisely *is* the job.

**2. "There are two index files in the repo. Which one ships?"**
`www/index (2).html` (15 KB) is still sitting next to `www/index.html` (13 KB).
Leftover duplicate. Noticing exactly this is what we'd pay him for.

**3. "Your rules say `request.auth != null` — but you call `signInAnonymously`. So what's
actually protecting a group?"** ← **the best question**
Nothing but a short group code. Anyone on the internet satisfies that condition.
It's a genuine hole, it's subtle, and it's the one that tells you if he's coachable.

**Credit where it's due — say this out loud:**
His Firestore rules block `list` and `delete`, and make the activity log append-only.
The app's Activity tab says *"Permanent record. Entries cannot be edited or deleted."*
**The rules and the UI agree.** Most juniors ship Firebase wide open. He thought about it.

---

## The ops half — if the role is going to include it

**4. "A backup job emails you ✓ SUCCESS every night for six weeks. How would you find out
it never actually ran?"**

This is the question. It happened here — our nightly git backup logged *"all repos backed up"*
every night from 7 Sep to 18 Oct while doing nothing, because the error was swallowed and an
empty answer was read as success. GitHub was 44 commits stale when we found it.

Good answers: restore from the backup and see if it works · check the artefact's size and
timestamp, not the job's exit code · make the job report what it *wrote*, not that it finished ·
alert on silence as well as on failure.
Bad answer: "check the logs."

**5. "Something is slow and you don't know why. Walk me through the first twenty minutes."**
Looking for: measure before guessing. Not a list of tool names.

---

## The teaching half — don't skip this

**6. "Explain compounding to a 14-year-old. You have sixty seconds."**

This is not a finance test. It's the whole business. We teach by making people play rather than
sit through slides, and someone who can't make an idea land can't build something that does.

Watch for: does he check whether you followed? Does he use an example or a definition?
Does he reach for a number you can picture?

**7. "Pick any one of our games. What would you change about it?"**
Send him a link beforehand. Tests whether he plays with a critical eye or just admires it.

---

## Close

- **Offer the paid half-day.** For this role it's worth more than a second interview.
- Tell him plainly what's hard about the job: most of it is third and fourth attempts.
- Ask what he'd want to be doing in two years. Listen for whether this is a stepping stone.

---

## Do not

- Install the APK he sent. Untrusted executable. If you want to try it, ask him to put the
  web version on a free Vercel or Firebase URL — it's plain HTML, ten-minute job, and it
  doubles as a test of whether he can ship something you can open.
- Hand him sole ownership of backups, server security patching, or production database
  permissions. Not about him being junior — about single points of failure that fail quietly.
