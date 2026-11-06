"""Clean a lookbook model photo: white background + arrow lines inpainted.

Usage (repo root): python -I scripts/assets/clean-model-lines.py <outfit-slug>
In : assets-source/cut/<slug>/raw/model-with-lines.png
Out: assets-source/cut/<slug>/model.png (same size, so seed anchors stay valid)
"fill": "patch" (top-level or per line) copies nearby texture; default "telea" inpaints.
Traces: scripts/assets/model-line-traces-<slug>.json
  {"lines": [{"pts": [[x, y], ...], "r": corridor half-width px, "thr": diff threshold, "med": median window,
   "direct": true -> inpaint the whole corridor (for lines over fine detail)}]}
Only pixels inside a corridor that also differ from the local median are inpainted.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage as ndi


def line_masks(img: np.ndarray, traces: dict) -> dict:
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    masks = {"patch": np.zeros(gray.shape, np.uint8), "telea": np.zeros(gray.shape, np.uint8)}
    for ln in traces["lines"]:
        mode = ln.get("fill", traces.get("fill", "telea"))
        corridor = np.zeros_like(masks[mode])
        pts = np.array(ln["pts"], np.int32).reshape(-1, 1, 2)
        cv2.polylines(corridor, [pts], False, 255, max(1, round(2 * ln.get("r", 7))))
        kernel = np.ones((3, 3), np.uint8)
        if ln.get("direct"):
            masks[mode] |= cv2.dilate(corridor, kernel)
            continue
        med = cv2.medianBlur(gray, ln.get("med", 25))
        diff = cv2.absdiff(gray, med) > ln.get("thr", 25)
        masks[mode] |= cv2.dilate(((corridor > 0) & diff).astype(np.uint8) * 255, kernel, iterations=2)
    return masks


def patch_fill(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Fill each masked blob with the best-matching nearby patch (keeps mesh/denim texture)."""
    out, h, w = img.copy(), *img.shape[:2]
    labels, n = ndi.label(mask > 0)
    for i in range(1, n + 1):
        comp = labels == i
        ring = ndi.binary_dilation(comp, iterations=4) & (mask == 0)
        ys, xs = np.nonzero(comp | ring)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        best, best_d = None, 1e18
        for dy in range(-45, 46, 3):
            for dx in range(-45, 46, 3):
                if max(abs(dx), abs(dy)) < 6 or not (0 <= y0 + dy and y1 + dy <= h and 0 <= x0 + dx and x1 + dx <= w):
                    continue
                cm = comp[y0:y1, x0:x1]
                rm = ring[y0:y1, x0:x1]
                sm = mask[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
                if (sm[cm | rm] > 0).any():
                    continue
                a = img[y0:y1, x0:x1][rm].astype(float)
                b = img[y0 + dy:y1 + dy, x0 + dx:x1 + dx][rm].astype(float)
                d = np.abs(a - b).mean()
                if d < best_d:
                    best, best_d = (dy, dx), d
        if best is None:
            continue
        dy, dx = best
        cm = comp[y0:y1, x0:x1]
        out[y0:y1, x0:x1][cm] = img[y0 + dy:y1 + dy, x0 + dx:x1 + dx][cm]
    return out


def person_alpha(img: Image.Image) -> np.ndarray:
    soft = np.array(remove(img, session=new_session("u2net"), only_mask=True)) / 255.0
    solid = ndi.binary_opening(soft > 0.5, iterations=3)
    labels, n = ndi.label(solid)
    keep = labels == (1 + int(np.argmax(ndi.sum(solid, labels, range(1, n + 1)))))
    return np.where(ndi.binary_dilation(keep, iterations=2), soft, 0.0)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    slug = sys.argv[1]
    src = Path("assets-source/cut") / slug / "raw" / "model-with-lines.png"
    traces = json.loads(Path(f"scripts/assets/model-line-traces-{slug}.json").read_text(encoding="utf-8"))
    pil = Image.open(src).convert("RGB")
    img = np.array(pil)
    masks = line_masks(img, traces)
    fixed = patch_fill(img, masks["patch"])
    fixed = cv2.inpaint(fixed, masks["telea"], 3, cv2.INPAINT_TELEA)
    a = person_alpha(pil)[..., None]
    out = np.clip(fixed * a + 255.0 * (1 - a), 0, 255).astype(np.uint8)
    Image.fromarray(out).save(src.parent.parent / "model.png")
    print(f"{slug}: {pil.size} -> {out.shape[1]}x{out.shape[0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
