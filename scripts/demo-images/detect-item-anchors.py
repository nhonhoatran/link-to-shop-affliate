#!/usr/bin/env python3
"""Fill in `anchor` for demo outfit items by asking Gemini where each item sits on the model photo.

Usage (from the repo root, GEMINI_API_KEY resolved like the ai-multimodal skill):
    python scripts/demo-images/detect-item-anchors.py [--seed seed/demo/demo-seed.json] [--only SLUG] [--force]

Only items without an anchor are detected unless --force is given. Items Gemini cannot find keep their current anchor
(or the fallback written in the seed) so the seed stays publishable.
"""
import argparse
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / ".claude" / "scripts"))

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402
from resolve_env import resolve_env  # noqa: E402

MODEL = "gemini-3.8-flash"
PROMPT = (
    "Find these clothing items or accessories worn by the person in the photo: {labels}. "
    "Return a JSON array of objects {{\"label\": <one of the given labels>, \"box_2d\": [ymin, xmin, ymax, xmax]}} "
    "with coordinates normalized to 0-1000. Skip labels that are not visible. JSON only."
)


def detect(client: genai.Client, image: Path, labels: list[str]) -> dict[str, tuple[float, float]]:
    mime = "image/png" if image.suffix.lower() == ".png" else "image/jpeg"
    response = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=image.read_bytes(), mime_type=mime), PROMPT.format(labels="; ".join(labels))],
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0),
    )
    found: dict[str, tuple[float, float]] = {}
    for box in json.loads(response.text or "[]"):
        label = str(box.get("label", ""))
        coords = box.get("box_2d") or []
        if label in labels and label not in found and len(coords) == 4:
            ymin, xmin, ymax, xmax = (float(value) for value in coords)
            found[label] = (round((xmin + xmax) / 20, 1), round((ymin + ymax) / 20, 1))
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", default=str(REPO / "seed" / "demo" / "demo-seed.json"))
    parser.add_argument("--only", help="outfit slug")
    parser.add_argument("--force", action="store_true", help="re-detect items that already have an anchor")
    args = parser.parse_args()
    seed_path = Path(args.seed)
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    client = genai.Client(api_key=resolve_env("GEMINI_API_KEY", skill="ai-multimodal"))

    for outfit in seed["outfits"]:
        if args.only and outfit["slug"] != args.only:
            continue
        # Items without a `detect` label were anchored by hand (cut-out sets) and are never re-detected.
        pending = [item for item in outfit["items"] if "anchor" not in item or (args.force and "detect" in item)]
        if not pending:
            continue
        labels = [item.get("detect") or item["name"] for item in pending]
        image = (seed_path.parent / outfit["modelImage"]["file"]).resolve()
        try:
            found = detect(client, image, labels)
        except Exception as error:  # noqa: BLE001 - keep going with the other outfits
            print(f"{outfit['slug']}: detection failed ({error})")
            continue
        for item, label in zip(pending, labels):
            if label in found:
                x, y = found[label]
                item["anchor"] = {"x": x, "y": y}
                print(f"{outfit['slug']}/{item['id']}: anchor {x},{y}")
            else:
                print(f"{outfit['slug']}/{item['id']}: not found, kept {item.get('anchor')}")
    seed_path.write_text(json.dumps(seed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
