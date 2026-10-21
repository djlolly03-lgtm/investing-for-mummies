# www.investingformummies.com — how to change this site

**This folder is the only source of truth for the live site.** Edit here, preview, deploy from here.

| File | What it is |
|---|---|
| `index.html` | Page shell: `<head>`, SEO text, FAQ schema, PostHog + Vercel Analytics + GA tags |
| `app.js` | **All page content and sections.** Readable React (`React.createElement`), not minified — edit the text in place |
| `home.css` | Styles. Fixes go at the bottom under a dated comment |
| `vercel.json` | Redirects (`/registernow`, `/register`, `/batches`, `/games`) and security/cache headers |
| `404.html` | Branded "page not found" |
| `vendor-react.js`, `image-slot.js` | Libraries — don't edit |
| `_superseded-source-15oct/` | Old Claude Design source — **do not rebuild from it** (see WHY.txt inside) |

## Changing something
1. Edit `app.js` / `index.html` / `home.css` here (ask Claude in this repo).
2. Preview: the `ifm-www` server in `.claude/launch.json` (localhost:8760). Check at phone width (390px).
3. Commit.
4. Deploy, from inside this folder: `vercel deploy --prod --yes` (linked to Vercel project `ifm-website-oct26`).
5. Verify on https://www.investingformummies.com.

## If you still want to design in Claude Design
Fine for trying ideas — but never export it over this folder. Export to a separate folder
and ask Claude to carry the specific change across into `app.js`, so nothing made here is lost.

## Don't touch without checking
- The tracking tags in `index.html` (PostHog, Vercel Analytics, GA) and the
  `Content-Security-Policy` header in `vercel.json` that allows them.
