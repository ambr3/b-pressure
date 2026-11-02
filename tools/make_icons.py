#!/usr/bin/env python3
"""Regenerate the app icons.

    python3 tools/make_icons.py

Needs Pillow. Black on white, Seclusa style. Mark: a heartbeat (ECG) line.
"""

from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "static" / "icons"

SIZE = 1024
BG = (255, 255, 255, 255)
FG = (10, 10, 10, 255)

# ECG waveform across the tile (x, y) in 1024 space.
WAVE = [
    (80, 512), (200, 512), (230, 470), (260, 512), (300, 512),
    (330, 400), (360, 660), (390, 470), (420, 512), (480, 512),
    (510, 460), (540, 512), (620, 512), (650, 485), (680, 512),
    (760, 512), (820, 512), (944, 512),
]


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def scale_points(pts, size):
    k = size / SIZE
    return [(int(x * k), int(y * k)) for x, y in pts]


def draw_wave(draw, pts, width):
    draw.line(pts, fill=FG, width=width, joint="curve")


def make_tile(size):
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tile = Image.new("RGBA", (size, size), BG)
    m = rounded_mask(size, int(size * 0.195))
    out.paste(tile, (0, 0), m)
    d = ImageDraw.Draw(out)
    pts = scale_points(WAVE, size)
    draw_wave(d, pts, max(4, size // 32))
    return out


def make_maskable(size):
    out = Image.new("RGBA", (size, size), BG)
    inner = int(size * 0.72)
    # scale wave into inner box
    layer = Image.new("RGBA", (inner, inner), BG)
    ld = ImageDraw.Draw(layer)
    pts = scale_points(WAVE, inner)
    draw_wave(ld, pts, max(4, inner // 32))
    off = (size - inner) // 2
    out.paste(layer, (off, off))
    return out


def main():
    ICONS.mkdir(parents=True, exist_ok=True)

    for size in (192, 512):
        make_tile(size).save(ICONS / f"icon-{size}.png")

    make_maskable(512).save(ICONS / "icon-maskable-512.png")

    pts = " ".join(f"{x},{y}" for x, y in WAVE)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Seclusa BP">
  <rect width="1024" height="1024" rx="200" fill="#ffffff"/>
  <polyline points="{pts}" fill="none" stroke="#0a0a0a" stroke-width="24"
            stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'''
    (ICONS / "icon.svg").write_text(svg, encoding="utf-8")

    for name in ("icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon.svg"):
        print(f"static/icons/{name}")


if __name__ == "__main__":
    main()
