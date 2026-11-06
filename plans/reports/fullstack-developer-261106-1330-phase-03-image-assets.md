# Phase 03 report: image assets and seed data

## Tooling
- Python 3.14.5, rembg 2.0.87 (u2net, onnxruntime 1.27.0), Pillow 13.0.0 (pip upgraded it from 12.2), numpy 2.4.5, scipy 1.18.1. Installed with `python -m pip install rembg onnxruntime` (user site works under `python -I`).
- Model u2net (176MB) downloaded once to `C:\Users\LENOVO\.rembg\models\u2net\u2net.onnx`. All processing local.

## Commands (from repo root)
```
python -I scripts/assets/crop-lookbook-items.py scripts/assets/crop-boxes-{dramatic,mesh-84}.json
python -I scripts/assets/remove-item-backgrounds.py scripts/assets/crop-boxes-{dramatic,mesh-84}.json
python -I scripts/assets/build-contact-sheet.py assets-source/cut/<outfit>[/raw] <png>
python -I scripts/assets/build-seed-file.py scripts/assets/crop-boxes-dramatic.json scripts/assets/crop-boxes-mesh-84.json
pnpm exec tsx --conditions=source scripts/assets/validate-seed-file.ts
```
Validator output (exit 0):
```
dramatic: 8 items, status=draft, featured=true
mesh-84: 9 items, status=draft, featured=false
OK: seed file matches schema, all image files exist with matching dimensions
```
Validator imports the schema by relative path (`../../packages/shared/src/seed-file-schema`), so `--conditions=source` is not strictly needed but harmless. It also checks PNG signature + IHDR width/height vs JSON, and duplicate item ids. Negative case (size mismatch) not exercised.

## Files
- scripts/assets: `crop-boxes-dramatic.json`, `crop-boxes-mesh-84.json` (boxes + all text + side/order + arrow/anchor point in source px + optional `erase`/`keepWhite`), `crop-lookbook-items.py` (crop, whiten edge arrow fragments, trim, pad 8), `remove-item-backgrounds.py`, `build-contact-sheet.py`, `build-seed-file.py`, `validate-seed-file.ts`.
- `assets-source/cut/{dramatic,mesh-84}/*.png` (17 items + 2 `model.png`), plus `raw/` subfolders (white-bg crops, intermediate; safe to delete or gitignore, seed does not reference them).
- `seed/sample-outfits.json`.
- Phase file todo ticked (plan.md untouched).

## Items: dramatic (model box 285,235-700,1545 = 415x1310)
| slug | side | order | anchor % (x,y) | bg |
|---|---|---|---|---|
| ao-thun-in-chu | left | 0 | 26.5, 19.8 | removed |
| quan-short-jean-rach | left | 1 | 36.1, 58.0 | removed |
| giay-sneaker-trang-xam | left | 2 | 38.6, 93.9 | removed |
| tui-deo-cheo | right | 0 | 81.9, 45.8 | removed |
| day-chuyen-bac | right | 1 | 49.4, 22.5 | removed |
| moc-khoa-phu-kien | right | 2 | 39.8, 50.8 | removed |
| that-lung-da-nau | right | 3 | 50.6, 43.3 | removed |
| khan-bandana-do | right | 4 | 20.5, 49.6 | removed |

## Items: mesh-84 (model box 272,222-708,1560 = 436x1338)
| slug | side | order | anchor % | bg |
|---|---|---|---|---|
| ao-mesh-the-thao | left | 0 | 17.2, 23.9 | removed |
| ao-thun-trang | left | 1 | 53.9, 36.6 | removed |
| quan-short-jean-rong | left | 2 | 24.1, 59.8 | removed |
| giay-sneaker-den | left | 3 | 40.1, 93.4 | removed |
| kinh-mat-den | right | 0 | 44.7, 3.0 | removed |
| day-chuyen-bac | right | 1 | 52.8, 19.4 | KEPT WHITE (rembg destroyed chain) |
| that-lung-da | right | 2 | 65.4, 40.4 | removed |
| moc-khoa-phu-kien | right | 3 | 67.2, 51.6 | KEPT WHITE (rembg smeared chains) |
| tat-trang-dai | right | 4 | 65.4, 85.2 | removed |

Anchor values copied from `seed/sample-outfits.json`.

## Contact sheets (gray bg) and checks
`plans/261106-1201-under30ss-shop-the-look/visuals/`: `contact-dramatic.png`, `contact-mesh-84.png` (final), `contact-*-raw.png` (before rembg), `anchors-check.png` (anchor dots drawn on both model crops).

## Known quality issues / decisions
- Anchors: arrow tips in the references often land off-body or on the wrong spot (belt and keychain arrows in dramatic cross each other; denim/jersey tips sit on bandana/sleeve edge). I placed each anchor on the matching item on the model, close to the arrow tip, instead of the literal tip. Checked visually via `anchors-check.png`; fine-tune in admin editor.
- Model crops keep white background and the baked-in arrow threads/lines (known limitation); not background-removed.
- Item crops: arrow fragments removed by narrowing boxes, `erase` rects (denim in both outfits) and a border-blob filter; final sheets show no text/arrow remnants.
- dramatic `day-chuyen-bac`: bg removed but chain very thin/faint on gray; acceptable, could be switched to `keepWhite` if reviewers dislike it.
- mesh-84 `kinh-mat-den`: white patch inside far temple arm comes from the original photo (kept).
- White items (tee, socks, white sneakers) cut cleanly with rembg; slight halo possible on dark backgrounds.
- Mesh necklace description in the image is cut off at the right edge ("...phong cách streetwear"); completed with a period only.
- Images are original source resolution (e.g. shirts ~290px wide), enough for ~150px display.
- Seed `image.file` paths are `../assets-source/cut/<outfit>/<file>.png`, relative to `seed/`.

**Status:** DONE_WITH_CONCERNS
**Summary:** 17 item PNGs + 2 model PNGs produced locally (rembg u2net), `seed/sample-outfits.json` generated and validator passes (schema + file existence + dimensions).
**Concerns/Blockers:** 2 mesh-84 items (necklace, keychain) kept white background; model crops contain baked-in thread lines; anchors placed on items near (not exactly at) arrow tips and need admin fine-tuning. `raw/` folders are intermediates P7 may want to exclude.
