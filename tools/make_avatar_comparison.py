"""Create side-by-side evidence from the previous and current Blender renders."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
docs = root / "docs"
font_path = Path("C:/Windows/Fonts/arial.ttf")
font = ImageFont.truetype(str(font_path), 30) if font_path.exists() else ImageFont.load_default()

for group in ("staff", "visitors"):
    for before_version, after_version in ((2, 3), (3, 4)):
        before = Image.open(docs / f"preview-avatar-{group}-v{before_version}.png").convert("RGB")
        after = Image.open(docs / f"preview-avatar-{group}-v{after_version}.png").convert("RGB")
        width, height = before.size
        result = Image.new("RGB", (width, height * 2 + 90), "#eee6e1")
        result.paste(before, (0, 45))
        result.paste(after, (0, height + 90))
        draw = ImageDraw.Draw(result)
        draw.text((24, 7), f"{group.upper()}  |  V{before_version} BEFORE", fill="#493b37", font=font)
        draw.text((24, height + 52), f"{group.upper()}  |  V{after_version} AFTER", fill="#493b37", font=font)
        filename = (f"preview-avatar-{group}-before-after.png" if after_version == 3
                    else f"preview-avatar-{group}-v3-v4.png")
        result.save(docs / filename, optimize=True)
