"""Chroma-key background removal for the two logo PNGs.

Samples the background color from the image corners, then fades alpha
to 0 for pixels close to that color (with a feather range so anti-aliased
edges don't get a hard cutout halo).
"""
import sys
from PIL import Image


def remove_background(src_path, dst_path, low=22, high=50):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size
    corners = [im.getpixel((0, 0)), im.getpixel((w - 1, 0)),
               im.getpixel((0, h - 1)), im.getpixel((w - 1, h - 1))]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))

    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2])
            if d <= low:
                new_a = 0
            elif d >= high:
                new_a = a
            else:
                new_a = int(a * (d - low) / (high - low))
            px[x, y] = (r, g, b, new_a)

    im.save(dst_path)
    print(f"{src_path} -> {dst_path} (bg sampled={bg})")


if __name__ == "__main__":
    remove_background("public/logo-dark.png", sys.argv[1] if len(sys.argv) > 1 else "/tmp/logo-dark-test.png")
    remove_background("public/logo-light.png", sys.argv[2] if len(sys.argv) > 2 else "/tmp/logo-light-test.png")
