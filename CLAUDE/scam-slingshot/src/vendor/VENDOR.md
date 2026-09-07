# Vendored runtime dependencies — NO CDN, EVER

The game must boot with the network switched off. Nothing here is fetched at runtime; the
importmap in `../../index.html` points at these files directly.

| Package | Pinned version | Files here | Why this build |
|---|---|---|---|
| `three` | **0.185.1** | `three/build/three.module.js` + `three.core.js` (and the `.min.js` pair, unused today) | ESM build. `three.module.js` re-exports from `three.core.js` — both are required, keep them side by side. |
| `three` addons | 0.185.1 | `three/addons/{postprocessing,shaders,geometries,utils,math,modifiers,lines,objects,environments,effects,textures}` | Curated subset of `three/examples/jsm`. Enough for outline/bloom/FXAA passes, fat lines (trajectory dots + sling band), `RoundedBoxGeometry`, `ConvexGeometry` + `ConvexHull` (fracture hulls), `DecalGeometry` (scorch/crack decals), `BufferGeometryUtils.mergeGeometries`, `SimplexNoise`/`ImprovedNoise` (procedural textures). |
| `@dimforge/rapier3d-compat` | **0.20.0** | `rapier3d-compat/rapier.mjs` | The **-compat** build. Its wasm is inlined as a ~2.7 MB base64 literal decoded inside `init()` — verified: no `fetch`, no `.wasm` request. The streaming build would need a wasm MIME type our static server does not guarantee. |

Importmap keys (see `index.html`):

```
"three"                      -> ./src/vendor/three/build/three.module.js
"three/addons/"              -> ./src/vendor/three/addons/
"three/examples/jsm/"        -> ./src/vendor/three/addons/
"@dimforge/rapier3d-compat"  -> ./src/vendor/rapier3d-compat/rapier.mjs
```

## Rules
- **Never** add a `https://cdn…` import. A critic that loads the page offline must still see the game.
- `rapier.mjs` has had its `//# sourceMappingURL=` line stripped — a 404 for the map would show up
  in the console and a console error is an automatic FAIL for every critic. If you re-vendor, strip
  it again.
- Three's builds carry no sourcemap references; leave them as-is.
- Do **not** leave a `node_modules/` inside the game folder.

## Re-vendoring (only if a version bump is genuinely needed)
```bash
TMP=$(mktemp -d) && cd "$TMP" && npm init -y >/dev/null
npm i three@<ver> @dimforge/rapier3d-compat@<ver>
DST='<repo>/CLAUDE/scam-slingshot/src/vendor'
cp node_modules/three/build/three.{module,core}.js  "$DST/three/build/"
cp node_modules/three/build/three.{module,core}.min.js "$DST/three/build/"
for d in postprocessing shaders geometries utils math modifiers lines objects environments effects textures; do
  cp -R "node_modules/three/examples/jsm/$d" "$DST/three/addons/"; done
cp node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs "$DST/rapier3d-compat/"
perl -0pi -e 's{\n//# sourceMappingURL=rapier\.mjs\.map\s*$}{\n}' "$DST/rapier3d-compat/rapier.mjs"
```
A version bump can silently change physics defaults and therefore every hand-tuned level.
Re-run `_tools/determinism.mjs` afterwards and expect to re-tune, not to get lucky.

Licences: `three/LICENSE` (MIT), `rapier3d-compat/LICENSE` (Apache-2.0).
