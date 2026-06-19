"""Preprocess person + garment images before virtual try-on."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def load_rgb(path: str) -> Image.Image:
    return Image.open(path).convert("RGB")


def save_rgb(img: Image.Image, path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def _border_light_ratio(img: Image.Image, border_frac: float = 0.08) -> float:
    """Fraction of near-white pixels along image borders (product-shot signal)."""
    rgb = np.array(img.convert("RGB"))
    h, w = rgb.shape[:2]
    bx = max(1, int(w * border_frac))
    by = max(1, int(h * border_frac))

    border_pixels = np.concatenate(
        [
            rgb[:by, :, :].reshape(-1, 3),
            rgb[-by:, :, :].reshape(-1, 3),
            rgb[:, :bx, :].reshape(-1, 3),
            rgb[:, -bx:, :].reshape(-1, 3),
        ]
    )
    light = np.all(border_pixels >= 220, axis=1)
    return float(light.mean()) if len(light) else 0.0


def _has_hanger(img: Image.Image) -> bool:
    """Detect wooden/plastic hanger in the top strip of garment photos."""
    w, h = img.size
    top = np.array(img.convert("RGB").crop((0, 0, w, max(1, int(h * 0.2)))))
    pixels = top.reshape(-1, 3)
    r, g, b = pixels[:, 0].astype(np.float32), pixels[:, 1].astype(np.float32), pixels[:, 2].astype(np.float32)
    wood = (r > 65) & (g > 40) & (b < 150) & (r >= g * 0.85) & (g > b * 0.65)
    return float(wood.mean()) > 0.012


def _skin_ratio(img: Image.Image) -> float:
    """Rough skin-tone ratio in center — low means product shot, not worn on person."""
    w, h = img.size
    center = np.array(
        img.convert("RGB").crop((int(w * 0.2), int(h * 0.05), int(w * 0.8), int(h * 0.55)))
    ).reshape(-1, 3)
    r, g, b = center[:, 0].astype(np.float32), center[:, 1].astype(np.float32), center[:, 2].astype(np.float32)
    skin = (r > 95) & (g > 40) & (b > 20) & (r > g) & (r > b) & (abs(r - g) > 15)
    return float(skin.mean()) if len(center) else 0.0


def is_product_shot(img: Image.Image) -> bool:
    """Flat-lay / hanger product photos vs worn-on-person reference shots."""
    if _border_light_ratio(img) > 0.45:
        return True
    if _has_hanger(img):
        return True
    # Neutral-background garment-only photo (no skin visible)
    return _skin_ratio(img) < 0.04


def preprocess_garment_image(img: Image.Image) -> Image.Image:
    """
    Product shots: remove hanger + white/gray background.
    Worn/reference shots: light resize only.
    Returns RGB image ready for try-on.
    """
    img = img.convert("RGBA")

    if not is_product_shot(img):
        rgb = img.convert("RGB")
        max_dim = 768
        w, h = rgb.size
        scale = min(1.0, max_dim / max(w, h))
        if scale < 1.0:
            rgb = rgb.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        return rgb

    w, h = img.size
    top_crop = 0.22 if _has_hanger(img) else 0.14
    crop = img.crop((int(w * 0.06), int(h * top_crop), int(w * 0.94), int(h * 0.92)))

    data = np.array(crop)
    r, g, b, a = data.T
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    sat = np.where(max_c == 0, 0, (max_c - min_c) / max_c)

    light_bg = (
        ((r >= 225) & (g >= 225) & (b >= 225))
        | ((max_c >= 200) & (sat < 0.12))
        | ((r >= 180) & (g >= 180) & (b >= 180) & (sat < 0.08))
    )
    data[..., 3][light_bg.T] = 0

    cleaned = Image.fromarray(data)
    bbox = cleaned.getbbox()
    if bbox:
        pad = 6
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(cleaned.width, bbox[2] + pad)
        y1 = min(cleaned.height, bbox[3] + pad)
        cleaned = cleaned.crop((x0, y0, x1, y1))

    bg = Image.new("RGB", cleaned.size, (255, 255, 255))
    bg.paste(cleaned, mask=cleaned.split()[3])
    return bg


def preprocess_garment(input_path: str, output_path: str) -> None:
    """File wrapper around preprocess_garment_image."""
    img = Image.open(input_path)
    save_rgb(preprocess_garment_image(img), output_path)


def preprocess_person(input_path: str, output_path: str) -> None:
    """Resize person photo — no cropping (preserve pose and framing)."""
    img = load_rgb(input_path)
    max_dim = 1024
    w, h = img.size
    scale = min(1.0, max_dim / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    img = img.filter(ImageFilter.UnsharpMask(radius=1, percent=30, threshold=3))
    save_rgb(img, output_path)


def person_needs_auto_crop(person_path: str) -> bool:
    """IDM-VTON expects ~3:4 portrait; enable auto-crop when aspect differs."""
    with Image.open(person_path) as img:
        w, h = img.size
        if h == 0:
            return True
        ratio = w / h
        return abs(ratio - 0.75) > 0.1


def _garment_pixels(img: Image.Image) -> np.ndarray:
    """Sample center torso region — avoids wall/background at edges."""
    w, h = img.size
    crop = img.crop((int(w * 0.12), int(h * 0.08), int(w * 0.88), int(h * 0.92)))
    small = crop.resize((140, 140), Image.Resampling.BILINEAR)
    data = np.array(small).reshape(-1, 3).astype(np.float32)
    # Shirt pixels: not background white wall, not deep shadow
    not_bg = np.max(data, axis=1) < 250
    not_shadow = np.min(data, axis=1) > 45
    mask = not_bg & not_shadow
    return data[mask] if mask.any() else data


def describe_garment_from_image(garment_path: str) -> str:
    """
    Short IDM-VTON garment_des from pixels.
    Example: "white long sleeve button-down cotton shirt"
    """
    img = load_rgb(garment_path)
    pixels = _garment_pixels(img)
    if len(pixels) == 0:
        return "long sleeve button-down cotton shirt"

    brightness = pixels.mean(axis=1)
    bright = pixels[brightness >= np.percentile(brightness, 55)]
    if len(bright) > 20:
        pixels = bright

    # Prefer saturated blue pixels (navy shirts on gray/white backgrounds)
    sat = (pixels.max(axis=1) - pixels.min(axis=1)) / (pixels.max(axis=1) + 1e-6)
    blue_pixels = pixels[(pixels[:, 2] > pixels[:, 0] + 12) & (sat > 0.06)]
    if len(blue_pixels) > 25:
        avg = np.median(blue_pixels, axis=0)
        r, g, b = avg
        color = "navy blue" if b < 130 else "blue"
    else:
        avg = np.median(pixels, axis=0)
        r, g, b = avg

        white_like = np.mean(
            (pixels[:, 0] > 110) & (pixels[:, 1] > 110) & (pixels[:, 2] > 100)
        )
        if white_like > 0.3:
            color = "off-white" if max(r, g, b) < 220 else "white"
        elif b > r + 18 and b > g + 12:
            color = "navy blue" if b < 120 else "blue"
        elif r < 85 and g < 85 and b < 85:
            color = "black"
        elif abs(r - g) < 22 and abs(g - b) < 22:
            color = "grey"
        elif r > g and r > b:
            color = "red"
        elif g > r and g > b:
            color = "green"
        else:
            color = "colored"

    # Torso crops are often wider than tall — default to long sleeve for shirts
    w, h = img.size
    sleeve = "long sleeve"
    if h > w * 1.15:
        sleeve = "short sleeve"

    return f"{color} {sleeve} button-down cotton shirt, natural fabric wrinkles"


def _is_legacy_preservation_prompt(text: str) -> bool:
    upper = text.upper()
    return (
        len(text) > 120
        or "STRICT RULES" in upper
        or "PRESERVE THE ORIGINAL" in upper
        or "REPLACE ONLY THE OUTER" in upper
    )


def build_garment_description(prompt_text: str | None, garment_path: str) -> str:
    """
    IDM-VTON garment_des — short garment caption only.
    Preservation is handled by OpenPose mask + crop settings, not this field.
    """
    pixel_desc = describe_garment_from_image(garment_path)

    if prompt_text and prompt_text.strip():
        text = prompt_text.strip()
        if _is_legacy_preservation_prompt(text):
            return pixel_desc[:200]

        # Short styling note from user — merge with pixel analysis
        if len(text) <= 100:
            if text.lower() in pixel_desc.lower():
                return pixel_desc[:200]
            return f"{pixel_desc}, {text}"[:200]

    return pixel_desc[:200]
