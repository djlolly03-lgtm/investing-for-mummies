# IFM feedback report

Fortnightly refresh of the **IFM Feedback Insights** artifact
(https://claude.ai/artifact/UEyhCseunAeZF1KaDdxX5N) from the admin Google Sheet.
Built 6 Oct 2026. Scheduled task: `ifm-feedback-report-fortnightly` (Fridays 09:00, acts only on the
1st and 3rd Friday). Reviewed with the user on the 2nd and 4th Monday, 3 pm, 15 min (calendar event).

**Not inside `CLAUDE/` on purpose.** Nothing here is deployed. `data/` and `out/` are gitignored because
they hold student names and emails.

| File | Role |
|---|---|
| `fetch_feedback.py` | Downloads 6 tabs of sheet `1cKjzjbmPfFJq3wjTJnGTKW4rUJNIHpZltfL1jKau9Uk` (Feedback, IYA Feedback, IFT Feedback, three registration tabs). Fixes the Aug-2026 column shift per row, drops test entries, maps email→batch (name fallback), counts enrolment per cohort month. Writes `data/clean.json`, `data/stats.json`, `data/all-responses.csv`, and prints what is new since the previous run. |
| `themes.json` | The human tagging. `{chart: [[label, field, selector, status?], …]}`. Selector is a list of names, `"=exact value"` or `"~substring"`. Status `warn`/`bad` colours the bar amber/red. |
| `template.html` | The page. `{{PLACEHOLDERS}}` are filled from stats; `__DATA__`, `__THEMES__`, `__COVERAGE__` are injected. The insight paragraphs, quotes, attention list, recommendations and hygiene list are prose and must be edited by hand (or by the scheduled Claude run) when the data moves. |
| `build.py` | Fills the template → `out/feedback-insights.html`. Strips emails. Prints theme names that no longer exist in the data and IFM rows that have no tags yet. |

Run by hand:

    cd "/Users/lollyg/Documents/investing for Mummies/feedback-report"
    /usr/bin/python3 fetch_feedback.py && /usr/bin/python3 build.py

Syntax check of the built page's script:

    node -e "const h=require('fs').readFileSync('out/feedback-insights.html','utf8');const m=h.match(/<script>([\s\S]*)<\/script>/);new Function(m[1]);console.log('ok')"

Then publish `out/feedback-insights.html` to the artifact URL above with the Artifact tool (`url` = that link).

Known sheet defects the script works around (fix at source when possible):
- Rows from August 2026 onward are shifted one column left (form gained a column, headers not updated).
- Test rows: emails test@example.com / asba@moogaworld.com, or Q1 = "Test".
- Email typos (`prerna@jatia.con`, `zahaansiddiqui@gmail.com@`) and one IFT row named ".".
