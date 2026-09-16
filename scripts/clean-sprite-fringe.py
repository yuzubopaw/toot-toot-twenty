#!/usr/bin/env python3
"""Border-only magenta flood-fill + fringe fade for Sunny Station sprites.

Global chroma key ate pink (pig, train cars). This floods from the image
border through leftover key / empty pixels only, then despills the edge.
Interior pink, cream windows, and spark fills are not reachable from the
border through the ink outline, so they stay.
"""

from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITE_DIR = ROOT / "public" / "images" / "sprites"
BACKUP_DIR = ROOT / "tmp-smoke" / "graphics-lead" / "backup"
PREVIEW_DIR = ROOT / "tmp-smoke" / "graphics-lead" / "preview"

CREAM = (255, 248, 231, 255)
SKY = (94, 200, 240, 255)
BLACK = (0, 0, 0, 255)


def magenta_planes(arr: np.ndarray):
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3].astype(np.int16)
    mag = r + b - 2 * g
    lum = (299 * r + 587 * g + 114 * b) // 1000
    return r, g, b, a, mag, lum


def floodable_mask(arr: np.ndarray) -> np.ndarray:
    """Pixels we may walk through from the border (empty / leftover key).

    Thresholds stay away from pastel pink (pig ~230,154,173 and the train
    car ~220,132,163) which have high G. Classic chroma leftover has low G
    and high R+B. Semi-transparent fringe is keyed by alpha + magenta score.
    """
    r, g, b, a, mag, lum = magenta_planes(arr)
    m = np.zeros(a.shape, dtype=bool)
    m |= a <= 18
    m |= (a < 48) & ((mag > 8) | (lum < 70))
    m |= (a < 140) & (mag > 30)
    m |= (a < 200) & (mag > 48) & (g < 90)
    # Solid leftover chroma (#FF00FF-like), not pastel pink / cream windows.
    m |= (g < 50) & (r > 150) & (b > 150) & (mag > 120)
    return m


def flood_from_border(floodable: np.ndarray) -> np.ndarray:
    """4-connected flood from every border pixel that is floodable."""
    h, w = floodable.shape
    reached = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and floodable[y, x] and not reached[y, x]:
            reached[y, x] = True
            q.append((y, x))

    for x in range(w):
        push(0, x)
        push(h - 1, x)
    for y in range(h):
        push(y, 0)
        push(y, w - 1)

    while q:
        y, x = q.popleft()
        push(y - 1, x)
        push(y + 1, x)
        push(y, x - 1)
        push(y, x + 1)
    return reached


def neighbor_bg_count(bg: np.ndarray) -> np.ndarray:
    """8-neighbor count of background pixels (outside the image counts as bg)."""
    h, w = bg.shape
    padded = np.pad(bg.astype(np.uint8), 1, constant_values=1)
    nbg = np.zeros((h, w), dtype=np.uint8)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            nbg += padded[1 + dy : 1 + dy + h, 1 + dx : 1 + dx + w]
    return nbg


def fringe_fade(arr: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """Despill magenta from ink edges and fade leftover fringe alpha."""
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    a = arr[:, :, 3].astype(np.float32)
    mag = r + b - 2.0 * g
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    nbg = neighbor_bg_count(bg)
    edge = (~bg) & (nbg > 0)

    spill = np.maximum(0.0, (r + b) * 0.5 - g)
    mag_amt = np.clip(mag / 90.0, 0.0, 1.0)
    strength = np.clip(nbg.astype(np.float32) / 4.0, 0.0, 1.0)
    k = strength * (0.5 + 0.5 * mag_amt) * edge.astype(np.float32)

    r2 = r - spill * k
    b2 = b - spill * k
    g2 = g

    # Dark outline pixels: crush remaining magenta toward ink black.
    dark = edge & (lum < 58)
    r2 = np.where(dark, r2 * 0.28, r2)
    g2 = np.where(dark, g2 * 0.28, g2)
    b2 = np.where(dark, b2 * 0.28, b2)

    a2 = a.copy()
    drop = edge & (a < 110) & (mag > 18)
    a2 = np.where(drop, 0.0, a2)
    fade = edge & (mag > 32) & (a2 > 0)
    a2 = np.where(fade, a2 * (1.0 - 0.72 * mag_amt * strength), a2)

    a2 = np.where(bg, 0.0, a2)

    out = np.stack(
        [
            np.clip(r2, 0, 255),
            np.clip(g2, 0, 255),
            np.clip(b2, 0, 255),
            np.clip(a2, 0, 255),
        ],
        axis=-1,
    ).astype(np.uint8)
    out[out[:, :, 3] == 0] = 0
    return out


def clean_rgba(arr: np.ndarray) -> np.ndarray:
    floodable = floodable_mask(arr)
    bg = flood_from_border(floodable)
    return fringe_fade(arr, bg)


def composite(src: Image.Image, rgba: tuple[int, int, int, int]) -> Image.Image:
    bg = Image.new("RGBA", src.size, rgba)
    return Image.alpha_composite(bg, src)


def _count_pink(arr: np.ndarray) -> int:
    r, g, b, a, mag, _ = magenta_planes(arr)
    return int(((a > 200) & (g > 100) & (mag > 40)).sum())


def _count_cream(arr: np.ndarray) -> int:
    r, g, b, a, _, _ = magenta_planes(arr)
    return int(((a > 200) & (r > 190) & (g > 180) & (b > 150)).sum())


def stats(name: str, before: np.ndarray, after: np.ndarray) -> str:
    _, _, _, a0, mag0, _ = magenta_planes(before)
    _, _, _, a1, mag1, _ = magenta_planes(after)
    fringe0 = int(((a0 > 0) & (a0 < 180) & (mag0 > 25)).sum())
    fringe1 = int(((a1 > 0) & (a1 < 180) & (mag1 > 25)).sum())
    return (
        f"{name:22} fringe {fringe0:5d}->{fringe1:5d}  "
        f"pink {_count_pink(before):6d}->{_count_pink(after):6d}  "
        f"cream {_count_cream(before):6d}->{_count_cream(after):6d}  "
        f"alpha {int((a0 > 0).sum()):6d}->{int((a1 > 0).sum()):6d}"
    )


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(SPRITE_DIR.glob("*.webp"))
    if not files:
        raise SystemExit(f"no sprites in {SPRITE_DIR}")

    print("cleaning", len(files), "sprites")
    for path in files:
        backup = BACKUP_DIR / path.name
        if not backup.exists():
            shutil.copy2(path, backup)
        src = Image.open(backup).convert("RGBA")
        before = np.array(src)
        after = clean_rgba(before)
        print(stats(path.name, before, after))
        out = Image.fromarray(after, "RGBA")
        out.save(path, "WEBP", lossless=True, quality=100, method=6)

        # Contact-sheet previews on cream, sky, and black (fringe shows on black).
        for label, color in (("cream", CREAM), ("sky", SKY), ("black", BLACK)):
            composite(out, color).save(
                PREVIEW_DIR / f"{path.stem}-{label}.png", "PNG"
            )

    print("backup", BACKUP_DIR)
    print("preview", PREVIEW_DIR)


if __name__ == "__main__":
    main()
