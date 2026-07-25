# serit.py — kare dizisini tek kontak-şeride diker (2 sütunlu ızgara).
# Kullanım: python tools/serit.py cikti.png kare1.png kare2.png ...
# Amaç (v5.6): headless doğrulama HAREKET görebilsin — aynı sahnenin farklı
# t anları yan yana; ışık dönüşü / süpürme / patlama zamanlaması tek bakışta.
import sys
from PIL import Image, ImageDraw

out, *paths = sys.argv[1:]
W = 640
imgs = []
for p in paths:
    im = Image.open(p)
    im = im.resize((W, round(im.height * W / im.width)))
    imgs.append((p, im))
h = imgs[0][1].height
cols = 2
rows = (len(imgs) + cols - 1) // cols
tuval = Image.new('RGB', (W * cols, h * rows), (10, 10, 14))
ciz = ImageDraw.Draw(tuval)
for i, (p, im) in enumerate(imgs):
    x, y = (i % cols) * W, (i // cols) * h
    tuval.paste(im, (x, y))
    ciz.text((x + 8, y + 6), p.rsplit('\\', 1)[-1].rsplit('/', 1)[-1], fill=(255, 210, 120))
tuval.save(out)
print(f'serit: {out} ({len(imgs)} kare, {W*cols}x{h*rows})')
