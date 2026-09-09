"""
Authors the app icon set.

    python3 scripts/generate-icons.py

The icon is the CROSS mechanic drawn as a board: a 3×3 grid on the game's dark
surface, with the five cells of a cross lit and the four corners left at a
whisper. It is the game's primary action and its board in one shape, and the
silhouette stays legible down to 40px where a full 5×5 or a symbol would mush.

Geometry is derived, not hand-placed, so every size stays in proportion and the
set can be regenerated after a design change. Colours are the theme's own
(src/ui/theme.ts): surface #2A2A29, lit cell #F7F7F5.

Requires Pillow.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"

ON = (247, 247, 245, 255)
SURFACE = (42, 42, 41, 255)
# The unlit corners: present enough to read as a board, quiet enough that the
# cross stays the only shape you see at small sizes.
CORNER_ALPHA = 0.12

# Gap between cells, as a fraction of a cell. Transcribed from the design study.
GAP_OF_CELL = 6 / (88 - 12) * 3
RADIUS_OF_CELL = 0.12
# Supersample, then downsample — Pillow's rounded_rectangle has no antialiasing.
SS = 4

# Row/column pairs that form the cross: the centre row and the centre column.
LIT = {(0, 1), (1, 0), (1, 1), (1, 2), (2, 1)}


def grid_ratio(margin_in_gaps: float) -> float:
    """
    Width of the grid as a fraction of the canvas, given a margin expressed in
    gap-widths.

    margin_in_gaps=1 means the distance from the artwork to the canvas edge
    equals the distance between two cells — the grid reads as one continuous
    board rather than a small motif floating in space.
    """
    grid_units = 3 + 2 * GAP_OF_CELL
    canvas_units = grid_units + 2 * margin_in_gaps * GAP_OF_CELL
    return grid_units / canvas_units


def draw_icon(
    size: int,
    margin_in_gaps: float,
    background: "tuple | None",
    corners: bool = True,
) -> Image.Image:
    s = size * SS
    base = Image.new("RGBA", (s, s), background or (0, 0, 0, 0))

    # Cells go on their own layer and are composited. Drawing a translucent fill
    # straight onto the base would *replace* those pixels, alpha included —
    # punching a hole through the dark surface instead of dimming over it.
    cells = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(cells)

    grid = s * grid_ratio(margin_in_gaps)
    pad = (s - grid) / 2
    cell = grid / (3 + 2 * GAP_OF_CELL)
    gap = cell * GAP_OF_CELL
    radius = cell * RADIUS_OF_CELL
    dim = (*ON[:3], round(255 * CORNER_ALPHA))

    for row in range(3):
        for col in range(3):
            lit = (row, col) in LIT
            if not lit and not corners:
                continue
            x = pad + col * (cell + gap)
            y = pad + row * (cell + gap)
            draw.rounded_rectangle(
                [x, y, x + cell, y + cell],
                radius=radius,
                fill=ON if lit else dim,
            )

    return Image.alpha_composite(base, cells).resize((size, size), Image.LANCZOS)


def write(name: str, image: Image.Image) -> None:
    image.save(ASSETS / name)
    print(f"  {name:<24} {image.width}×{image.height}")


ASSETS.mkdir(exist_ok=True)
print(f"Writing icons to {ASSETS}\n")

# iOS: full-bleed square, no transparency and no rounded corners — the system
# applies its own mask, and baking one in produces a double-rounded edge. The
# corner cells clear Apple's squircle with room to spare (verified, see README).
write("icon.png", draw_icon(1024, 1, SURFACE))

# Android adaptive: the launcher may mask this to a *circle*, which would slice
# the corner cells off a full board. So the foreground drops them and shows the
# cross alone — a shape that sits inside a circle happily — sized to stay within
# the guaranteed-visible centre 66%.
write("adaptive-icon.png", draw_icon(1024, 4.4, None, corners=False))

# Splash: transparent, drawn over the configured background colour, unmasked.
write("splash-icon.png", draw_icon(1024, 1, None))

write("favicon.png", draw_icon(48, 1, SURFACE))

print("\nDone.")
