#!/usr/bin/env python3
"""
IFM Source Registry sync — proof-of-concept for the content-hub redesign.

Reads the "IFM Source Registry" sheet (one row per Drive folder we're
supposed to be watching), scans every folder whose type is `drive_folder`
and status starts with "active", and reports any file NOT already
referenced anywhere in content/data.js.

This is deliberately NOT wired into the live hub yet — it's the first
concrete piece of the redesign discussed 25 Aug 2026: a standing registry
instead of "paste me a Drive link and I'll add it" as the only ingestion
path. Slides-deck sources (Aakara) are skipped here on purpose — a deck
needs the PDF-export + visual-read pipeline, not a file listing; see the
registry's own notes column.

Output: prints a report, and writes content/review-queue.json (one entry
per undiscovered file) for the Today tab to read.
"""
import csv, io, json, os, re, subprocess, sys, urllib.request

REGISTRY_ID = "1hmAfUIdHFnz1KsDaq0fduIchXtOcFA9WWnR274gvBhs"
REPO = "/Users/lollyg/Documents/investing for Mummies/CLAUDE"
DATA_JS = os.path.join(REPO, "content", "data.js")
OUT = os.path.join(REPO, "content", "review-queue.json")

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).stdout

def known_ids():
    """Every Drive file/folder id already referenced anywhere in data.js."""
    src = open(DATA_JS, encoding="utf-8").read()
    ids = set(re.findall(r"drive\.google\.com/file/d/([A-Za-z0-9_-]{20,})", src))
    ids |= set(re.findall(r"drive\.google\.com/drive/folders/([A-Za-z0-9_-]{20,})", src))
    return ids

# The June 2026 pre-Sakshi batch (owners asba@/suraj@) lives in both the Sakshi
# uploads folder AND the Certificates folder and is already covered elsewhere —
# the weekly-aakara-refresh skill knows this by date (created < 2026-08-15).
# A pure Drive-vs-catalogue id diff doesn't know that rule at all, and blindly
# reported all 38 of them as "new" on the first run here (25 Aug 2026) — every
# single one turned out to be June-dated on inspection. Filtering by the same
# filename signature the skill already documented (IMG_42xx / IMG_84xx) until
# this moves to a real per-candidate createdTime check.
JUNE_BATCH = re.compile(r"IMG_(42\d\d|84\d\d)\.")

def list_folder(folder_id):
    """Anonymous Drive folder listing (works for link-shared folders — the
    same trick used for the Rakshita and Sakshi folders). Filters out
    macOS AppleDouble junk (._*) which has burned this before."""
    html = sh(f'curl -s "https://drive.google.com/embeddedfolderview?id={folder_id}#list"')
    entries = re.findall(r'id="entry-([-\w]{20,})".*?flip-entry-title">([^<]*)<', html, re.S)
    out = []
    for fid, title in entries:
        title = title.replace("&#39;", "'").replace("&amp;", "&")
        if title.startswith("._"):
            continue
        out.append((fid, title))
    return out

def main():
    # The registry isn't link-shared yet (new sheet, private by default), so gviz's
    # public CSV endpoint 403s. Real fix: share it "anyone with the link — Viewer",
    # same as the Competitors sheet, then this reads live. Until then, --local lets
    # tonight's proof-of-concept run against a CSV pulled via the Drive connector.
    local = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != "--gviz" else None
    if local:
        reg_raw = open(local, encoding="utf-8").read()
    else:
        reg_raw = sh(f'curl -sL "https://docs.google.com/spreadsheets/d/{REGISTRY_ID}/gviz/tq?tqx=out:csv"')
        if not reg_raw.strip().startswith('"'):
            print("Could not read the registry via public CSV — it's not link-shared yet. "
                  "Share it 'Anyone with the link — Viewer' (Drive > Share), or pass a local "
                  "CSV path as an argument.", file=sys.stderr)
            return
    rows = list(csv.DictReader(io.StringIO(reg_raw)))

    known = known_ids()
    queue = []
    report = []

    for r in rows:
        name, typ, loc, status = r["source_name"], r["type"], r["location"], r["status"]
        if typ != "drive_folder" or not status.startswith("active"):
            report.append(f"SKIP  {name}  ({typ}, status={status})")
            continue
        fid = loc.rstrip("/").split("/")[-1]
        files = list_folder(fid)
        candidates = [(i, t) for i, t in files if i not in known and i != fid]
        excluded = [(i, t) for i, t in candidates if JUNE_BATCH.search(t)]
        new = [(i, t) for i, t in candidates if not JUNE_BATCH.search(t)]
        report.append(f"SCAN  {name}: {len(files)} real files, {len(candidates)} not id-matched "
                       f"({len(excluded)} filtered as the known June pre-Sakshi batch), "
                       f"{len(new)} genuinely new")
        for i, t in new:
            queue.append({
                "drive_id": i, "title": t, "source": name,
                "folder_url": f"https://drive.google.com/drive/folders/{fid}",
                "file_url": f"https://drive.google.com/file/d/{i}/view",
                "thumbnail": f"https://drive.google.com/thumbnail?id={i}&sz=w400",
                "status": "needs_review",
            })

    payload = {
        "generated_by": "source_sync.py (proof-of-concept, 25 Aug 2026)",
        "note": "Files found in registered Drive folders with no matching link anywhere in data.js. Nothing here has been catalogued yet — review and promote manually.",
        "count": len(queue),
        "items": queue,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print("\n".join(report))
    print(f"\n{len(queue)} file(s) found in registered folders with no catalogue entry.")
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    main()
