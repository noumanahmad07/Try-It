#!/usr/bin/env python3
"""
Local virtual try-on compositor — warps cleaned garment onto torso (offline fallback).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError:
    print(
        json.dumps(
            {
                "error": "Missing dependencies. Run: pip install -r python/requirements.txt",
            }
        )
    )
    sys.exit(1)

from preprocess_tryon import preprocess_garment_image


def load_image(path: str) -> Image.Image:
    return Image.open(path).convert("RGBA")


def torso_quad(width: int, height: int) -> list[tuple[float, float]]:
    """Upper-body placement quad — tuned for waist-up / full-body photos."""
    return [
        (width * 0.20, height * 0.16),
        (width * 0.80, height * 0.16),
        (width * 0.74, height * 0.52),
        (width * 0.26, height * 0.52),
    ]


def warp_to_quad(shirt: Image.Image, quad: list[tuple[float, float]], out_size: tuple[int, int]) -> Image.Image:
    w, h = shirt.size
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    coeffs = _find_coeffs(quad, src)
    return shirt.transform(out_size, Image.Transform.PERSPECTIVE, coeffs, Image.Resampling.BICUBIC)


def _find_coeffs(
    dst: list[tuple[float, float]],
    src: list[tuple[float, float]],
) -> tuple[float, ...]:
    matrix = []
    for (x, y), (u, v) in zip(dst, src):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(matrix, dtype=np.float64)
    b = np.array([coord for point in src for coord in point], dtype=np.float64)
    res = np.linalg.lstsq(a, b, rcond=None)[0]
    return tuple(res.tolist())


def composite_tryon(person: Image.Image, garment: Image.Image) -> Image.Image:
    person_rgba = person.convert("RGBA")
    pw, ph = person_rgba.size

    # Remove hanger / background from product garment shots
    shirt_rgb = preprocess_garment_image(garment)
    shirt = shirt_rgb.convert("RGBA")

    # Fit shirt to torso height
    target_h = int(ph * 0.40)
    scale = target_h / max(shirt.height, 1)
    new_w = max(1, int(shirt.width * scale))
    shirt = shirt.resize((new_w, target_h), Image.Resampling.LANCZOS)

    quad = torso_quad(pw, ph)
    warped = warp_to_quad(shirt, quad, (pw, ph))

    # Soft edges — no gray overlay box on the person
    alpha = warped.split()[3].filter(ImageFilter.GaussianBlur(radius=2.5))
    warped.putalpha(alpha)

    result = Image.alpha_composite(person_rgba, warped)
    return result.convert("RGB")


def main() -> int:
    if len(sys.argv) != 4:
        print(
            json.dumps(
                {
                    "error": "Usage: virtual_tryon.py <person_image> <garment_image> <output_image>",
                }
            )
        )
        return 1

    person_path, garment_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        person = load_image(person_path)
        garment = load_image(garment_path)
        result = composite_tryon(person, garment)

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        result.save(out, format="PNG", optimize=True)

        print(json.dumps({"ok": True, "output": str(out)}))
        return 0
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
