"""Remove backgrounds locally with rembg: cut/{slug}/raw/*.png -> cut/{slug}/*.png (RGBA).

Usage (from repo root): python -I scripts/assets/remove-item-backgrounds.py <crop-boxes.json>
Items with "keepWhite": true in the config, and model.png, are copied unchanged.
Nothing is uploaded; the u2net model is downloaded once and cached by rembg.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    base = Path("assets-source/cut") / cfg["slug"]
    raw = base / "raw"
    shutil.copyfile(raw / "model.png", base / "model.png")
    session = new_session("u2net")
    for item in cfg["items"]:
        src, dst = raw / f"{item['slug']}.png", base / f"{item['slug']}.png"
        if item.get("keepWhite"):
            shutil.copyfile(src, dst)
            print(f"kept white  {item['slug']}")
            continue
        remove(Image.open(src).convert("RGB"), session=session).save(dst)
        print(f"bg removed  {item['slug']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
