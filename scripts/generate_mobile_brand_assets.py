from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(r"C:\Users\Enock\Desktop\PROJECTS\MyGarage")
IMAGES = ROOT / "Mobile App" / "assets" / "images"
SOURCE = IMAGES / "icon.png"

BRAND_BLUE = (59, 130, 246, 255)
BRAND_BLUE_LIGHT = (96, 165, 250, 255)
BRAND_NAVY = (7, 17, 34, 255)
BRAND_NAVY_SOFT = (15, 23, 42, 255)
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def load_symbol_mask() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    gray = ImageOps.grayscale(source)
    mask = gray.point(lambda px: 255 if px > 110 else 0)
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError("No bright logo mark detected in source icon.")
    mask = mask.crop(bbox)
    mask = ImageOps.expand(mask, border=12, fill=0)
    return mask.filter(ImageFilter.GaussianBlur(1.2))


def resize_mask(mask: Image.Image, max_w: int, max_h: int) -> Image.Image:
    ratio = min(max_w / mask.width, max_h / mask.height)
    size = (max(1, int(mask.width * ratio)), max(1, int(mask.height * ratio)))
    return mask.resize(size, Image.Resampling.LANCZOS)


def diagonal_gradient(size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int]) -> Image.Image:
    width, height = size
    gradient = Image.new("RGBA", size)
    pixels = gradient.load()
    for y in range(height):
        for x in range(width):
            mix = (x + y) / max(1, width + height - 2)
            r = int(start[0] * (1 - mix) + end[0] * mix)
            g = int(start[1] * (1 - mix) + end[1] * mix)
            b = int(start[2] * (1 - mix) + end[2] * mix)
            pixels[x, y] = (r, g, b, 255)
    return gradient


def radial_glow(size: tuple[int, int], color: tuple[int, int, int], opacity: int, scale: float = 0.7) -> Image.Image:
    width, height = size
    glow = Image.new("RGBA", size, TRANSPARENT)
    draw = ImageDraw.Draw(glow)
    margin_x = int(width * (1 - scale) / 2)
    margin_y = int(height * (1 - scale) / 2)
    draw.ellipse((margin_x, margin_y, width - margin_x, height - margin_y), fill=(*color, opacity))
    return glow.filter(ImageFilter.GaussianBlur(width // 12))


def rounded_rect_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def paste_center(base: Image.Image, layer: Image.Image, position: tuple[int, int] | None = None) -> None:
    if position is None:
        position = ((base.width - layer.width) // 2, (base.height - layer.height) // 2)
    base.alpha_composite(layer, position)


def make_symbol_layer(mask: Image.Image, size: tuple[int, int], fill: tuple[int, int, int, int], shadow_alpha: int = 80) -> Image.Image:
    layer = Image.new("RGBA", size, TRANSPARENT)
    shadow = Image.new("RGBA", mask.size, (*BRAND_NAVY[:3], shadow_alpha))
    shadow.putalpha(mask.filter(ImageFilter.GaussianBlur(5)))
    paste_center(layer, shadow, ((size[0] - mask.width) // 2, (size[1] - mask.height) // 2 + max(4, size[1] // 120)))

    symbol = Image.new("RGBA", mask.size, fill)
    symbol.putalpha(mask)
    paste_center(layer, symbol)
    return layer


def save_icon(mask: Image.Image) -> None:
    size = 1024
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)

    bg = diagonal_gradient((size, size), BRAND_NAVY[:3], BRAND_BLUE[:3])
    card_mask = rounded_rect_mask((size, size), 232)
    bg.putalpha(card_mask)
    canvas.alpha_composite(bg)

    inner = Image.new("RGBA", (size - 96, size - 96), TRANSPARENT)
    inner_bg = diagonal_gradient(inner.size, BRAND_NAVY_SOFT[:3], BRAND_BLUE_LIGHT[:3])
    inner_mask = rounded_rect_mask(inner.size, 184)
    inner_bg.putalpha(inner_mask)
    inner.alpha_composite(inner_bg)
    inner = inner.filter(ImageFilter.GaussianBlur(0.5))
    paste_center(canvas, inner)

    glow = radial_glow((size, size), BRAND_BLUE_LIGHT[:3], 115, 0.62)
    canvas.alpha_composite(glow)

    symbol_mask = resize_mask(mask, int(size * 0.68), int(size * 0.52))
    symbol_layer = make_symbol_layer(symbol_mask, (size, size), WHITE, shadow_alpha=110)
    canvas.alpha_composite(symbol_layer)

    border = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(border)
    draw.rounded_rectangle((12, 12, size - 13, size - 13), radius=220, outline=(255, 255, 255, 40), width=6)
    canvas.alpha_composite(border)

    canvas.save(IMAGES / "icon.png")


def save_adaptive(mask: Image.Image) -> None:
    size = 1024
    symbol_mask = resize_mask(mask, int(size * 0.72), int(size * 0.52))

    foreground = Image.new("RGBA", (size, size), TRANSPARENT)
    symbol = Image.new("RGBA", symbol_mask.size, WHITE)
    symbol.putalpha(symbol_mask)
    glow = Image.new("RGBA", symbol_mask.size, (*BRAND_BLUE_LIGHT[:3], 85))
    glow.putalpha(symbol_mask.filter(ImageFilter.GaussianBlur(4)))
    paste_center(foreground, glow, ((size - symbol_mask.width) // 2, (size - symbol_mask.height) // 2 + 8))
    paste_center(foreground, symbol)

    foreground.save(IMAGES / "adaptive-icon.png")
    foreground.save(IMAGES / "android-icon-foreground.png")

    monochrome = Image.new("RGBA", (size, size), TRANSPARENT)
    mono_symbol = Image.new("RGBA", symbol_mask.size, WHITE)
    mono_symbol.putalpha(symbol_mask)
    paste_center(monochrome, mono_symbol)
    monochrome.save(IMAGES / "android-icon-monochrome.png")

    background = diagonal_gradient((size, size), BRAND_NAVY[:3], BRAND_BLUE[:3])
    background.save(IMAGES / "android-icon-background.png")


def save_favicon(mask: Image.Image) -> None:
    size = 64
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)
    bg = diagonal_gradient((size, size), BRAND_NAVY[:3], BRAND_BLUE[:3])
    bg.putalpha(rounded_rect_mask((size, size), 16))
    canvas.alpha_composite(bg)

    glow = radial_glow((size, size), BRAND_BLUE_LIGHT[:3], 120, 0.62)
    canvas.alpha_composite(glow)

    symbol_mask = resize_mask(mask, int(size * 0.72), int(size * 0.46))
    symbol_layer = make_symbol_layer(symbol_mask, (size, size), WHITE, shadow_alpha=70)
    canvas.alpha_composite(symbol_layer)

    canvas.save(IMAGES / "favicon.png")


def save_splash_icon(mask: Image.Image) -> None:
    size = 1024
    canvas = Image.new("RGBA", (size, size), TRANSPARENT)

    badge_size = 480
    badge = Image.new("RGBA", (badge_size, badge_size), TRANSPARENT)
    badge_bg = diagonal_gradient((badge_size, badge_size), BRAND_NAVY[:3], BRAND_BLUE[:3])
    badge_bg.putalpha(rounded_rect_mask((badge_size, badge_size), 120))
    badge.alpha_composite(badge_bg)

    halo = radial_glow((badge_size, badge_size), BRAND_BLUE_LIGHT[:3], 120, 0.65)
    badge.alpha_composite(halo)

    symbol_mask = resize_mask(mask, int(badge_size * 0.68), int(badge_size * 0.46))
    symbol_layer = make_symbol_layer(symbol_mask, (badge_size, badge_size), WHITE, shadow_alpha=100)
    badge.alpha_composite(symbol_layer)

    border = Image.new("RGBA", (badge_size, badge_size), TRANSPARENT)
    draw = ImageDraw.Draw(border)
    draw.rounded_rectangle((8, 8, badge_size - 9, badge_size - 9), radius=118, outline=(255, 255, 255, 44), width=4)
    badge.alpha_composite(border)

    paste_center(canvas, badge)
    canvas.save(IMAGES / "splash-icon.png")


def save_optional_splash() -> None:
    splash = Image.new("RGBA", (1242, 2688), (248, 250, 252, 255))
    icon = Image.open(IMAGES / "splash-icon.png").convert("RGBA")
    icon = icon.resize((440, 440), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", icon.size, (*BRAND_NAVY[:3], 70))
    shadow.putalpha(icon.getchannel("A").filter(ImageFilter.GaussianBlur(18)))
    x = (splash.width - icon.width) // 2
    y = (splash.height - icon.height) // 2 - 80
    splash.alpha_composite(shadow, (x, y + 18))
    splash.alpha_composite(icon, (x, y))
    splash.save(IMAGES / "splash.png")


def main() -> None:
    mask = load_symbol_mask()
    save_icon(mask)
    save_adaptive(mask)
    save_favicon(mask)
    save_splash_icon(mask)
    save_optional_splash()
    print("Generated branded mobile assets in", IMAGES)


if __name__ == "__main__":
    main()
