# kontakt.py — smoke karelerini TEK kontakt sayfasinda birlestirir.
# Kullanim: py tools/kontakt.py <cikti.png> <kare1.png> [kare2.png ...]
#
# NEDEN VAR: gorsel denetimde kareleri tek tek acmak hem yavas hem kiyas
# yapilamaz hale getiriyor; yan yana konunca "bu preset digerinin kopyasi",
# "bu cihaz hic gorunmuyor", "bu kare oncekinden karanlik" gibi hatalar
# aninda okunuyor (fon presetlerinin altisinin ayni cikmasi boyle yakalandi).
import sys, os
from PIL import Image, ImageDraw

def main():
    if len(sys.argv) < 3:
        print('kullanim: py tools/kontakt.py <cikti.png> <kare...>'); return 1
    cikti, kareler = sys.argv[1], sys.argv[2:]
    kareler = [k for k in kareler if os.path.exists(k)]
    if not kareler:
        print('kare bulunamadi'); return 1
    sutun = 2 if len(kareler) <= 6 else 3
    satir = (len(kareler) + sutun - 1) // sutun
    KW, KH, ETIKET = 640, 400, 18
    sayfa = Image.new('RGB', (sutun * KW, satir * (KH + ETIKET)), (10, 12, 18))
    ciz = ImageDraw.Draw(sayfa)
    for i, yol in enumerate(kareler):
        im = Image.open(yol).convert('RGB').resize((KW, KH))
        x, y = (i % sutun) * KW, (i // sutun) * (KH + ETIKET)
        sayfa.paste(im, (x, y + ETIKET))
        ciz.text((x + 6, y + 4), os.path.basename(yol), fill=(150, 200, 240))
    sayfa.save(cikti)
    print(f'{len(kareler)} kare -> {cikti}  ({sutun}x{satir})')
    return 0

if __name__ == '__main__':
    sys.exit(main())
