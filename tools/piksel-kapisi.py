#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""piksel-kapisi.py — tools/smoke.sh icin PIKSEL denetimi (2026-07-22).

NEDEN VAR (kok sebep: commit 4a4ae5c "isik-karesi"): motor.js'de
normalize(0)=NaN uretti, bloom onu ekranin buyuk bir DIKDORTGENINE
yaydi. tools/smoke.sh SADECE Chrome konsol cikisini denetliyordu; kare
simsiyah oldugu halde konsol temizdi, 469 test yesildi, smoke "TEMIZ"
dedi. Bu script konsolun goremedigini gorur: URETILEN PNG'nin gercek
piksellerini analiz eder.

ARAC SECIMI: bu ortamda hem Pillow (PIL) hem numpy ONCEDEN KURULUYDU
(python -c "import PIL, numpy" basarili, yeni kurulum YAPILMADI). Node.js
de mevcut ama PNG'yi elle cozmek (zlib inflate + PNG filtre tersleme,
kanal birlestirme) bu isi Pillow'un zaten yaptigi seyi yeniden yazmak
olurdu. ffmpeg de kurulu ama tek kare durum analizi icin ayri bir surec
baslatip formati donusturmek (PNG->rawvideo) Pillow+numpy'nin dogrudan
bellek-ici vektorize erisiminden daha yavas ve daha kirilgan (path/quote
kacislari, stdout parse). Pillow acar, numpy vektorize satir/sutun
istatistigi cikarir — ikisi de zaten kurulu, EN AZ yeni hareketli parca.

KULLANIM:
  python tools/piksel-kapisi.py <png-dosyasi>
  -> stdout'a tek satir JSON rapor basar.
  -> cikis kodu: 0 = temiz, 1 = REDDEDILDI (supheli piksel deseni),
                 2 = kullanim hatasi, 3 = analiz basarisiz (dosya/format).

ESIKLER VE GEREKCELERI (asagida da kod icinde tekrarlanir) — bu esikler
SEZGISEL degil, GERCEK VERIYLE KALIBRE EDILDI: commit 4a4ae5c'nin hatasi
(bozuk_isik_karesi.aqshow senaryosu) f1-grup dalinda zaten DUZELTILMISTI,
bu yuzden 4a4ae5c^ (duzeltmeden BIR ONCEKI commit) icin izole bir git
worktree acilip studio/ornekler/_tani-isikkaresi.aqshow o worktree'ye
kopyalanarak GERCEK bozuk kare tools/smoke.sh ile yeniden URETILDI (PNG
39.959 bayt — sikayette gecen "~40KB" ile birebir eslesiyor). Bu gercek
kanit asagidaki (a) esigini belirledi:

  (a) DUZ/VARYANSSIZ GENIS SIYAH ALAN — bugunku hatanin gercek imzasi.
      Gece sahnesi DOGAL OLARAK karanliktir; "karanlik" TEK BASINA hata
      degildir — o yuzden sadece siyah ORANINA bakmak (ne kadar cok, ne
      kadar az) YANLIS ayirt edici: gercek bozuk karede siyah oran %92.3
      idi (neredeyse tum 3B tuval), ama METIN/menu gibi mesru gece
      sahnelerinde de siyah oran %25-%77 arasina rahatca cikabiliyor
      (olcum: studio/index.html#demo, #efektdemo, mozart-daire,
      veridis-quo-kovan, blinding-lights-cizgi, _tani-isikkaresi'nin
      DUZELTILMIS hali — hepsi asagida). Gercek ayirt edici SIYAH
      PIKSELLERIN KENDI ICINDEKI VARYANS: NaN -> 0 kirpma/tonemap sonucu
      dogan "wipe" TAMAMEN DUZ siyahtir (piksel-piksel varyans ~0),
      oysa gercek bir GPU render'inda en karanlik bolgede bile dithering/
      tonemap egrisi/parcacik isigindan kalan DOGAL gurultu vardir.
      OLCULEN DEGERLER (kanal<=BLACK_MAX sayilan piksellerin kendi
      std'si, tum kare uzerinde, kirpma yok):
        gercek BOZUK kare (4a4ae5c^, _tani-isikkaresi, ~40KB PNG) .. 0.43
        #demo&t=1 ......................................... 3.02
        #efektdemo ........................................ 3.01
        #ornek=mozart-daire&t=13 .......................... 2.98
        #ornek=veridis-quo-kovan&t=8 ...................... 2.56 (en dusuk mesru)
        #ornek=blinding-lights-cizgi&t=8 .................. 2.91
        #ornek=_tani-isikkaresi&t=4 (DUZELTILMIS hali) .... 3.22
      Bozuk=0.43, en dusuk mesru=2.56 -> aralarinda ~6x bosluk var.
      FLATLINE_STD_MAX=1.5 bu bosluğun ortasina, her iki yone de ~%40
      pay birakacak sekilde secildi. FLATLINE_AREA_MIN=0.05: kucuk
      dogal siyah unsurlari (ikon, metin, ince golge — orn. sentetik
      "kucuk_leke" testinde %0.24 alan, std=0 ama COK KUCUK) gormezden
      gelinsin diye — yalniz kareyi anlamli olcude kaplayan (>= %5) DUZ
      siyah blok red sebebi sayilir. Ust sinir YOK: bir "wipe" ne kadar
      genis olursa olsun (hatta tum tuvali kaplasa) ayni mantikla
      REDDEDILMELI — bu depodaki hicbir mesru sahnede tum tuvalin
      varyanssiz duz siyaha dusmesi gozlenmedi.

  (b) ASIRI DOYMUS BEYAZ — patlama/blit hatasi imzasi (ekranin buyuk
      bolumu tek renk donuk beyaz olur; stroboskop/flaş gibi mesru
      efektler bile karenin COGUNLUGUNU degil, kucuk bolgelerini kaplar).
      WHITE_FRAC_REJECT=0.60: karenin >= %60'i kanal>=250 ise red.
      (Bu sinyal icin "bozuk" ornegi ELDE YOK — 4a4ae5c'nin hatasi
      siyah yonlu calisiyordu. Esik SEZGISEL: taranan hicbir mesru
      sahnede beyaz_oran %2'yi gecmedi — bkz. rapor dosyasi.)

  (c) TEK RENK KARE — tum kare (veya neredeyse tumu) ayni renkse bu
      cogunlukla bos/hata sayfasi, yuklenmemis WebGL baglami ya da
      Chrome'un kendi hata ekranidir. SOLID_STD=1.5: butun kanallardaki
      piksel degerlerinin birlesik standart sapmasi bu esigin altindaysa
      red (gercek bir 3B sahnenin golgeleme/gradyan/parcacik varyansi
      olmadan boyle duz olmasi beklenmez). (Bu da SEZGISEL — depoda
      "tamamen tek renk kare" ornegi yok; sentetik "duz_gri" testiyle
      dogrulandi.)

NOT — ONCEKI TASARIM HATASI (kayit icin): ilk surumde (a) sinyali satir/
sutun projeksiyonuyla "tam genislik/yukseklige yayilan dikdortgen" araniyor
VE bbox alani %85'i gecerse "gece sahnesi" sayilip ATLANIYORDU. Gercek
bozuk kareyle sinandiginda bu YANLIS: gercek artefaktin alani %92.3 idi
(ust sinirin ustunde, atlaniyordu) VE satir/sutun projeksiyonu keyfi
konumlu/kucuk bir dikdortgeni hic yakalayamazdi (yalniz tam genislik/
yukseklige yayilan seklini yakalar). Varyans tabanli yontem bu ikisini de
duzeltir cunku SEKLE degil, PIKSELIN KENDI DOGASINA (duz mu, gurultulu
mu) bakar.
"""
import sys
import json

try:
    from PIL import Image
except ImportError:
    print("HATA: Pillow (PIL) yok. `python -c \"import PIL\"` ile dogrulayin.",
          file=sys.stderr)
    sys.exit(3)

try:
    import numpy as np
except ImportError:
    print("HATA: numpy yok. `python -c \"import numpy\"` ile dogrulayin.",
          file=sys.stderr)
    sys.exit(3)

# --- esikler (yukaridaki docstring'de olcumlerle gerekceli) ---
BLACK_MAX = 10             # kanal <= bu deger "siyaha yakin" sayilir
WHITE_MIN = 250            # kanal >= bu deger "doymus beyaz" sayilir
SOLID_STD = 1.5            # tum karede birlesik std bu altindaysa "tek renk"
FLATLINE_AREA_MIN = 0.05   # siyah alan / toplam alan - altindaysa kucuk dogal unsur, gormezden gel
FLATLINE_STD_MAX = 1.5     # siyah piksellerin KENDI ICINDEKI std'si - altindaysa "duz/varyanssiz"
                           # (olcum: gercek bozuk kare std=0.43, en dusuk mesru kare std=2.56 -> orta nokta)
WHITE_FRAC_REJECT = 0.60   # kare genelinde doymus beyaz oran esigi


def duz_siyah_blok(black_mask, arr):
    """(a) sinyalini denetler: genis VE varyanssiz siyah alan. Bulunursa
    aciklama metni, yoksa None doner. Bkz. modul docstring'indeki olcumler."""
    toplam = black_mask.size
    black_frac = float(black_mask.sum()) / toplam
    if black_frac < FLATLINE_AREA_MIN:
        return None
    black_vals = arr[black_mask]
    ic_std = float(black_vals.astype(np.float64).std())
    if ic_std <= FLATLINE_STD_MAX:
        return (
            f"duz/varyanssiz genis siyah alan: siyah_oran={black_frac:.1%} "
            f"ic_std={ic_std:.3f} <= {FLATLINE_STD_MAX} "
            f"(gercek NaN/wipe artefaktinin imzasi - gercek GPU render'i "
            f"en karanlik bolgede bile dogal gurultu birakir; mesru "
            f"sahnelerde olculen en dusuk ic_std=2.56 idi)"
        )
    return None


def analiz(png_yolu):
    im = Image.open(png_yolu).convert('RGB')
    arr = np.asarray(im, dtype=np.uint8)
    h, w = arr.shape[0], arr.shape[1]
    toplam = h * w

    black_mask = arr.max(axis=2) <= BLACK_MAX
    white_mask = arr.min(axis=2) >= WHITE_MIN

    black_frac = float(black_mask.sum()) / toplam
    white_frac = float(white_mask.sum()) / toplam
    std_all = float(arr.astype(np.float64).std())

    sebepler = []

    if std_all < SOLID_STD:
        sebepler.append(f"kare tek renk (std={std_all:.3f} < {SOLID_STD})")

    if white_frac >= WHITE_FRAC_REJECT:
        sebepler.append(
            f"asiri doymus beyaz: oran={white_frac:.1%} >= {WHITE_FRAC_REJECT:.0%}")

    duz_sebep = duz_siyah_blok(black_mask, arr)
    if duz_sebep:
        sebepler.append(duz_sebep)

    return {
        'dosya': png_yolu,
        'genislik': w,
        'yukseklik': h,
        'siyah_oran': round(black_frac, 4),
        'beyaz_oran': round(white_frac, 4),
        'std': round(std_all, 4),
        'red': bool(sebepler),
        'sebepler': sebepler,
    }


def main():
    if len(sys.argv) < 2:
        print("kullanim: python tools/piksel-kapisi.py <png-dosyasi>", file=sys.stderr)
        sys.exit(2)
    png_yolu = sys.argv[1]
    try:
        rapor = analiz(png_yolu)
    except Exception as e:  # dosya yok / bozuk PNG / vb.
        print(f"HATA: piksel analizi basarisiz ({png_yolu}): {e}", file=sys.stderr)
        sys.exit(3)
    print(json.dumps(rapor, ensure_ascii=False))
    sys.exit(1 if rapor['red'] else 0)


if __name__ == '__main__':
    main()
