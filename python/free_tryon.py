#!/usr/bin/env python3
"""
Free virtual try-on — public Hugging Face IDM-VTON (no API keys).
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import time
from pathlib import Path

try:
    from dotenv import load_dotenv

    root = Path(__file__).resolve().parent.parent
    load_dotenv(root / ".env")
    load_dotenv(root / ".env.local")
except ImportError:
    pass

try:
    import requests
except ImportError:
    requests = None  # type: ignore

from preprocess_tryon import (
    build_garment_description,
    person_needs_auto_crop,
    preprocess_garment,
    preprocess_person,
)

FREE_GRADIO_SPACES = [
    {"id": "yisol/IDM-VTON", "api_name": "/tryon"},
]


def load_gradio_spaces() -> list[dict]:
    """Your forked Spaces first, then the public yisol/IDM-VTON fallback."""
    spaces: list[dict] = []
    extra = (os.getenv("HF_TRYON_SPACES") or "").strip()
    if extra:
        for item in extra.split(","):
            space_id = item.strip()
            if space_id:
                spaces.append({"id": space_id, "api_name": "/tryon"})
    for default in FREE_GRADIO_SPACES:
        if not any(s["id"] == default["id"] for s in spaces):
            spaces.append(default)
    return spaces

# IDM-VTON defaults that preserve the original person (see yisol/IDM-VTON app.py)
FIXED_SEED = 42
DENOISE_STEPS = 30
# is_checked=True → OpenPose + human parsing auto-mask (required for identity preservation)
# is_checked_crop=False → no auto-crop/resize (keeps original framing and pose)
# guidance_scale=2.0 is hardcoded inside the space pipeline


def get_hf_token() -> str:
    for key in ("HF_TOKEN", "HF_API_KEY", "HUGGINGFACE_TOKEN"):
        value = (os.getenv(key) or "").strip()
        if value and value.startswith("hf_"):
            return value
    return ""


def is_quota_or_gpu_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(
        k in msg
        for k in ("zerogpu", "quota", "exceeded", "gpu", "rate limit", "too many requests")
    )


def read_prompt_file(prompt_file: str | None) -> str | None:
    if prompt_file and Path(prompt_file).is_file():
        text = Path(prompt_file).read_text(encoding="utf-8").strip()
        return text or None
    return None


def save_result_image(result_item, output_path: str) -> None:
    if result_item is None:
        raise RuntimeError("Empty result from Gradio space")

    if isinstance(result_item, dict):
        url = result_item.get("url") or result_item.get("path")
        if url:
            result_item = url
        else:
            raise RuntimeError(f"Unexpected dict result: {result_item}")

    result_str = str(result_item)

    if result_str.startswith("http://") or result_str.startswith("https://"):
        if not requests:
            raise RuntimeError("requests package required")
        resp = requests.get(result_str, timeout=180)
        resp.raise_for_status()
        Path(output_path).write_bytes(resp.content)
        return

    src = Path(result_str)
    if not src.is_file():
        raise RuntimeError(f"Result file not found: {result_str}")

    shutil.copy(src, output_path)


def try_gradio_space(
    space_id: str,
    api_name: str,
    person_path: str,
    garment_path: str,
    garment_des: str,
    seed: int,
    use_auto_crop: bool,
) -> str:
    from gradio_client import Client, handle_file

    hf_token = get_hf_token()
    print(
        f"Connecting to {space_id} (seed={seed}, crop={use_auto_crop}, "
        f"hf_token={'yes' if hf_token else 'no'})...",
        file=sys.stderr,
    )

    client = Client(space_id, hf_token=hf_token or None)

    result = client.predict(
        dict={
            "background": handle_file(person_path),
            "layers": [],
            "composite": None,
        },
        garm_img=handle_file(garment_path),
        garment_des=garment_des,
        is_checked=True,  # OpenPose + human parsing mask
        is_checked_crop=use_auto_crop,
        denoise_steps=DENOISE_STEPS,
        seed=seed,
        api_name=api_name,
    )

    if isinstance(result, (list, tuple)) and len(result) > 0:
        return str(result[0])
    return str(result)


def run_free_gradio_tryon(
    person_path: str,
    garment_path: str,
    output_path: str,
    garment_des: str,
) -> str:
    errors: list[str] = []
    use_auto_crop = person_needs_auto_crop(person_path)
    seeds = [FIXED_SEED]

    for space in load_gradio_spaces():
        space_id = space["id"]
        api_name = space.get("api_name", "/tryon")

        for seed in seeds:
            try:
                result_ref = try_gradio_space(
                    space_id,
                    api_name,
                    person_path,
                    garment_path,
                    garment_des,
                    seed,
                    use_auto_crop,
                )
                save_result_image(result_ref, output_path)
                print(
                    json.dumps(
                        {
                            "ok": True,
                            "output": output_path,
                            "engine": "free_gradio",
                            "space": space_id,
                            "seed": seed,
                        }
                    )
                )
                return space_id
            except Exception as exc:  # noqa: BLE001
                msg = f"{space_id} seed={seed}: {exc}"
                errors.append(msg)
                print(f"Attempt failed — {msg}", file=sys.stderr)

                if is_quota_or_gpu_error(exc):
                    print(
                        f"Quota/GPU limit on {space_id} — trying next space...",
                        file=sys.stderr,
                    )
                    time.sleep(1)
                    break  # next seed/space

                time.sleep(2)

    raise RuntimeError(
        "All free AI spaces are busy or unavailable. " + " | ".join(errors[:4])
    )


def run_local_fallback(person_path: str, garment_path: str, output_path: str) -> None:
    from virtual_tryon import composite_tryon, load_image

    result = composite_tryon(load_image(person_path), load_image(garment_path))
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    result.save(out, format="PNG", optimize=True)


def main() -> int:
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: free_tryon.py <person> <garment> <output> [prompt_file]"}))
        return 1

    person_path, garment_path, output_path = sys.argv[1], sys.argv[2], sys.argv[3]
    prompt_file = sys.argv[4] if len(sys.argv) > 4 else None
    work_dir = Path(output_path).parent

    for p in (person_path, garment_path):
        if not Path(p).is_file():
            print(json.dumps({"error": f"File not found: {p}"}))
            return 1

    prompt_text = read_prompt_file(prompt_file)

    # Preprocess images for better AI results
    clean_person = str(work_dir / "person_clean.png")
    clean_garment = str(work_dir / "garment_clean.png")
    try:
        preprocess_person(person_path, clean_person)
        preprocess_garment(garment_path, clean_garment)
    except Exception as exc:  # noqa: BLE001
        print(f"Preprocess warning: {exc}", file=sys.stderr)
        clean_person, clean_garment = person_path, garment_path

    garment_des = build_garment_description(prompt_text, clean_garment)
    print(f"Garment description: {garment_des[:120]}...", file=sys.stderr)

    try:
        run_free_gradio_tryon(clean_person, clean_garment, output_path, garment_des)
        return 0
    except Exception as gradio_error:  # noqa: BLE001
        print(f"Free AI failed: {gradio_error}", file=sys.stderr)
        skip_local = (os.getenv("SKIP_LOCAL_TRYON_FALLBACK") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        if skip_local:
            print(json.dumps({"error": str(gradio_error)}))
            return 1
        try:
            run_local_fallback(clean_person, clean_garment, output_path)
            print(
                json.dumps(
                    {
                        "ok": True,
                        "output": output_path,
                        "engine": "local_fallback",
                        "warning": (
                            "AI GPU quota is full — showing a basic preview. "
                            "Hanger removed and shirt warped onto your photo. "
                            "Try again in a few hours for full AI try-on, or upgrade HF to PRO for more GPU time."
                        ),
                    }
                )
            )
            return 0
        except Exception as local_error:  # noqa: BLE001
            print(json.dumps({"error": f"AI failed ({gradio_error}). Fallback failed ({local_error})."}))
            return 1


if __name__ == "__main__":
    raise SystemExit(main())
