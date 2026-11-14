"""Paint character-specific skin maps for the editable V4 Blender scene.

The UV positions are measured from Blender's 64 x 40 UV sphere: front U=.25,
left/right cheek U=.156/.344. Values are hand tuned for the eight faces.
"""

from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "packages/assets/textures/avatars_v4"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 768

SKIN = {
    "staff_male": ((.75, .47, .34), .72),
    "staff_female_01": ((.49, .28, .18), .92),
    "staff_female_02": ((.86, .63, .49), .72),
    "staff_female_03": ((.36, .19, .12), .85),
    "owner_daughter": ((.86, .63, .49), .98),
    "customer_female": ((.86, .63, .49), .70),
    "customer_male": ((.75, .47, .34), .55),
    "customer_senior": ((.49, .28, .18), .55),
}


def srgb(linear):
    return 12.92 * linear if linear <= .0031308 else 1.055 * linear ** (1 / 2.4) - .055


u = np.arange(SIZE, dtype=np.float32)[None, :] / (SIZE - 1)
v = 1 - np.arange(SIZE, dtype=np.float32)[:, None] / (SIZE - 1)


def gaussian(cx, cy, sx, sy):
    return np.exp(-.5 * (((u - cx) / sx) ** 2 + ((v - cy) / sy) ** 2))


for index, (name, (base, blush_strength)) in enumerate(SKIN.items()):
    rgb = np.array([srgb(channel) for channel in base], dtype=np.float32)
    image = np.broadcast_to(rgb, (SIZE, SIZE, 3)).copy()
    # Broad colour shifts soften the forehead and round the cheeks.
    image += gaussian(.25, .72, .19, .20)[..., None] * np.array([.018, .013, .009])
    image += gaussian(.25, .25, .18, .16)[..., None] * np.array([.012, -.003, -.009])
    for cheek in (.155, .345):
        image += gaussian(cheek, .445, .039, .048)[..., None] * blush_strength * np.array([.052, -.022, -.032])
        image -= gaussian(cheek, .57, .052, .026)[..., None] * np.array([.012, .010, .009])
    image += gaussian(.25, .42, .026, .035)[..., None] * np.array([.017, -.007, -.009])
    # Fine low-contrast grain breaks up flat plastic shading at close range.
    rng = np.random.default_rng(8120 + index)
    grain = rng.normal(0, .0025, (SIZE, SIZE, 1)).astype(np.float32)
    image += grain
    if name == "owner_daughter":
        for cheek in (.16, .34):
            for dx, dy in ((-.008, -.006), (0, -.011), (.009, -.005)):
                image -= gaussian(cheek + dx, .43 + dy, .0013, .0014)[..., None] * np.array([.08, .055, .045])
    Image.fromarray(np.uint8(np.clip(image, 0, 1) * 255), "RGB").save(
        OUT / f"{name}_skin.png", optimize=True
    )
    print("PAINTED", name)
