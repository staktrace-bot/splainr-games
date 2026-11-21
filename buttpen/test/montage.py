#!/usr/bin/env python3
"""Side-by-side before/after image for the quick-command regression test."""
import sys
from PIL import Image, ImageDraw, ImageFont

a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]
im1, im2 = Image.open(a).convert("RGBA"), Image.open(b).convert("RGBA")
h = max(im1.height, im2.height)

def pad(im):
    c = Image.new("RGBA", (im.width, h), (224, 247, 255, 255))
    c.paste(im, (0, (h - im.height) // 2))
    return c

im1, im2 = pad(im1), pad(im2)
gap, label, side = 16, 36, 8
w = im1.width + im2.width + gap + side * 2
canvas = Image.new("RGBA", (w, h + label + side), (255, 255, 255, 255))
d = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except Exception:
    font = ImageFont.load_default()
d.text((side, 8), "Before: after Run (square)", fill=(40, 40, 60), font=font)
d.text((side + im1.width + gap, 8), "After: fd 50, then rt 45 fd 30", fill=(40, 40, 60), font=font)
canvas.paste(im1, (side, label))
canvas.paste(im2, (side + im1.width + gap, label))
canvas.convert("RGB").save(out, "PNG")
