#!/usr/bin/env python3
"""Download the stock photos listed in assets-source/demo/image-manifest.json and turn them into seed assets.

Usage (from the repo root):
    python scripts/demo-images/prepare-demo-images.py [--only NAME] [--force]

Manifest format:
    {
      "downloads": { "raw/model-x.jpg": "<unsplash photo id>", ... },
      "outputs": [
        { "out": "model/x.jpg", "src": "raw/model-x.jpg", "aspect": "2:3", "maxEdge": 1600 },
        { "out": "item/x.png", "src": "raw/item-x.jpg", "transparent": true, "maxEdge": 800 }
      ]
    }
`aspect` crops the centre of the source, `focus` (0..1, vertical) moves the crop window, `transparent` keys out a
near-white background (product shots) and trims to the subject, `rotate` rotates degrees counter-clockwise.
"""
import argparse
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2] / "assets-source" / "demo"
MANIFEST = ROOT / "image-manifest.json"
UNSPLASH = "https://images.unsplash.com/photo-{id}?w={w}&q=85&fm=jpg"
WHITE_THRESHOLD = 228
EDGE_SOFTNESS = 1.2


def download(target: Path, photo_id: str, width: int) -> None:
    if target.exists():
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(UNSPLASH.format(id=photo_id, w=width), headers={"User-Agent": "under30ss-demo-seed"})
    with urllib.request.urlopen(request, timeout=120) as response, open(target, "wb") as handle:
        handle.write(response.read())
    print(f"downloaded {target.relative_to(ROOT)}")


def crop_aspect(image: Image.Image, aspect: str, focus: float) -> Image.Image:
    w_ratio, h_ratio = (int(part) for part in aspect.split(":"))
    target = w_ratio / h_ratio
    width, height = image.size
    if width / height > target:
        new_width = round(height * target)
        left = (width - new_width) // 2
        return image.crop((left, 0, left + new_width, height))
    new_height = round(width / target)
    top = round((height - new_height) * focus)
    return image.crop((0, top, width, top + new_height))


def key_out_white(image: Image.Image, padding: int) -> Image.Image:
    rgb = image.convert("RGB")
    # A pixel is background when every channel is near white; the mask is blurred so edges stay soft.
    mask = Image.eval(rgb.convert("L").point(lambda v: 255 if v >= WHITE_THRESHOLD else 0), lambda v: v)
    channels = rgb.split()
    for channel in channels:
        mask = Image.composite(mask, Image.new("L", mask.size, 0), channel.point(lambda v: 255 if v >= WHITE_THRESHOLD else 0))
    alpha = Image.eval(mask, lambda v: 255 - v).filter(ImageFilter.GaussianBlur(EDGE_SOFTNESS))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
    if bbox:
        left, top, right, bottom = bbox
        result = result.crop((max(0, left - padding), max(0, top - padding), min(result.width, right + padding), min(result.height, bottom + padding)))
    return result


def fit(image: Image.Image, max_edge: int) -> Image.Image:
    if max(image.size) <= max_edge:
        return image
    image.thumbnail((max_edge, max_edge), Image.LANCZOS)
    return image


def build(entry: dict, force: bool) -> None:
    out = ROOT / entry["out"]
    if out.exists() and not force:
        return
    image = Image.open(ROOT / entry["src"])
    image = image.convert("RGBA" if entry.get("transparent") else "RGB")
    if entry.get("rotate"):
        image = image.rotate(entry["rotate"], expand=True, fillcolor=(255, 255, 255, 0) if entry.get("transparent") else "white")
    if entry.get("box"):
        # Fractions of the source size: [left, top, right, bottom].
        left, top, right, bottom = entry["box"]
        image = image.crop((round(left * image.width), round(top * image.height), round(right * image.width), round(bottom * image.height)))
    if entry.get("aspect"):
        image = crop_aspect(image, entry["aspect"], float(entry.get("focus", 0.5)))
    if entry.get("transparent"):
        image = key_out_white(image, int(entry.get("padding", 24)))
    image = fit(image, int(entry.get("maxEdge", 1600)))
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() == ".png":
        image.save(out, optimize=True)
    else:
        image.convert("RGB").save(out, quality=int(entry.get("quality", 86)), optimize=True, progressive=True)
    print(f"built {entry['out']} {image.size}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="only build outputs whose path contains this text")
    parser.add_argument("--force", action="store_true", help="rebuild outputs that already exist")
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for relative, photo_id in manifest["downloads"].items():
        width = 1000 if relative.startswith("raw/item-") else 2000
        download(ROOT / relative, photo_id, width)
    for entry in manifest["outputs"]:
        if args.only and args.only not in entry["out"]:
            continue
        build(entry, args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
