"""Tile every item PNG of a folder on a gray background for visual review.

Usage: python -I scripts/assets/build-contact-sheet.py <input-dir> <output.png>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

CELL, COLS, BG = 300, 5, (128, 128, 128)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    files = [f for f in sorted(Path(sys.argv[1]).glob("*.png")) if f.stem != "model"]
    rows = (len(files) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * CELL, rows * (CELL + 20)), BG)
    draw = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        img = Image.open(f).convert("RGBA")
        img.thumbnail((CELL - 10, CELL - 10))
        x, y = (i % COLS) * CELL, (i // COLS) * (CELL + 20)
        sheet.paste(img, (x + 5, y + 20), img)
        draw.text((x + 5, y + 4), f.stem, fill=(255, 255, 0))
    sheet.save(sys.argv[2])
    print(f"{len(files)} items -> {sys.argv[2]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
