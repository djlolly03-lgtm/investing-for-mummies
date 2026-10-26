# Games deep audit — 26 Oct 2026
Live checklist (ticks saved in its database): https://claude.ai/artifact/1ifTqEvrmF52rnjhjiBtGu
- `*.json` — one file per audit group (sitewide, solo-a/b/c, class-a/b, classic); 65 pages, 547 items.
- `build-page.py` + `template.html` → `ifm-games-fix-list.html` (the published page).
- Item ids are `<game-key>--<n>` (position in that game's list). Ticks live in the artifact db
  collection `done/<item id>`. If you edit a game's items, ADD new ones at the end so existing ids
  (and their ticks) don't shift.
- Screenshots were left in the session scratchpad (not copied; regenerable).
