"""Build seed/sample-outfits.json from crop-boxes-*.json and the cut PNGs.

Usage (from repo root): python -I scripts/assets/build-seed-file.py <crop-boxes.json> [...]
Anchor = arrow tip on the model, as % of the model crop box (1 decimal).
Image paths are relative to seed/.
"""
import json
import sys
from pathlib import Path

from PIL import Image

OUT = Path("seed/sample-outfits.json")


def image_ref(slug: str, name: str) -> dict:
    path = Path("assets-source/cut") / slug / f"{name}.png"
    with Image.open(path) as img:
        width, height = img.size
    return {"file": f"../{path.as_posix()}", "width": width, "height": height}


def anchor(tip: list, model: list) -> dict:
    x0, y0, x1, y1 = model
    x = (tip[0] - x0) / (x1 - x0) * 100
    y = (tip[1] - y0) / (y1 - y0) * 100
    return {"x": round(min(max(x, 0), 100), 1), "y": round(min(max(y, 0), 100), 1)}


def build_outfit(cfg: dict) -> dict:
    items = [
        {
            "id": it["slug"],
            "name": it["name"],
            "subtitle": it["subtitle"],
            "description": it["description"],
            "image": image_ref(cfg["slug"], it["slug"]),
            "side": it["side"],
            "order": it["order"],
            "anchor": anchor(it["tip"], cfg["model"]),
            "affiliateUrl": "",
        }
        for it in cfg["items"]
    ]
    return {
        "slug": cfg["slug"],
        "title": cfg["title"],
        "seoDescription": cfg["seoDescription"],
        "modelImage": image_ref(cfg["slug"], "model"),
        "status": "draft",
        "featured": cfg["featured"],
        "items": items,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    outfits = [build_outfit(json.loads(Path(p).read_text(encoding="utf-8"))) for p in sys.argv[1:]]
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"version": 1, "outfits": outfits}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(outfits)} outfits)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
