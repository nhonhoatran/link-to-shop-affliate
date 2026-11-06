"""Crop items + model from a lookbook reference image into assets-source/cut/{slug}/raw/.

Usage (from repo root): python -I scripts/assets/crop-lookbook-items.py <crop-boxes.json>
Item crops are trimmed to non-white content (any channel < THRESH) plus padding.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops
from scipy import ndimage

THRESH = 245
PAD = 8


def drop_edge_fragments(img: Image.Image) -> Image.Image:
    """Whiten small blobs touching the crop border (arrow-line leftovers)."""
    arr = np.array(img.convert("RGB"))
    content = (arr < THRESH).any(axis=2)
    labels, count = ndimage.label(ndimage.binary_dilation(content, iterations=6), structure=np.ones((3, 3)))
    if count < 2:
        return img
    sizes = ndimage.sum(content, labels, range(1, count + 1))
    biggest = sizes.max()
    for idx in range(1, count + 1):
        ys, xs = np.nonzero(labels == idx)
        on_border = ys.min() == 0 or xs.min() == 0 or ys.max() == arr.shape[0] - 1 or xs.max() == arr.shape[1] - 1
        if on_border and sizes[idx - 1] < 0.03 * biggest:
            arr[labels == idx] = 255
    return Image.fromarray(arr)


def trim(img: Image.Image) -> Image.Image:
    channels = [c.point(lambda v: 255 if v < THRESH else 0) for c in img.convert("RGB").split()]
    content = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    bbox = content.getbbox()
    if bbox is None:
        raise ValueError("crop is empty after trim")
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - PAD), max(0, y0 - PAD), min(img.width, x1 + PAD), min(img.height, y1 + PAD)))


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out = Path("assets-source/cut") / cfg["slug"] / "raw"
    out.mkdir(parents=True, exist_ok=True)
    src = Image.open(cfg["source"]).convert("RGB")
    src.crop(tuple(cfg["model"])).save(out / "model.png")
    for item in cfg["items"]:
        piece = src.copy()
        for rect in item.get("erase", []):
            piece.paste((255, 255, 255), tuple(rect))
        trim(drop_edge_fragments(piece.crop(tuple(item["box"])))).save(out / f"{item['slug']}.png")
    print(f"cropped {len(cfg['items'])} items + model -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
