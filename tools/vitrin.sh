#!/usr/bin/env bash
# vitrin.sh — her cihaz icin TEK denetim karesi toplar.
# Kullanim: bash tools/vitrin.sh <cikti-dizini> [urun-adi ...]
# Urun verilmezse katalogdaki TUM urunler kosulur.
#
# ⚠MUTLAK YOL SART: chrome goreli alt-klasore YAZAMIYOR (smoke.sh dersi).
# ⚠BLANKET taskkill KULLANMA: kosan smoke turlarini oldururu; zombi temizligi
#   tools/zombi-temizle.sh 300 ile (yalniz --headless VE 300 sn'den eski).
#
# ⚠NEDEN ZAMAN SERIDI DEGIL, TEK KARE (2026-07-19 deneyi):
#   Onceki surum her cihaz icin 6 kare (t=0,0.2,0.5,1,2,4) cekiyordu ama ALTISI
#   AYNI ANI gosteriyordu. Kok sebep iki KATMANLI, ikisi de bu mimaride asilamaz:
#
#   (1) Cihaz DOGUSTA doludur. motor.js GpuParcaSistemi kurucusu (satir ~871-897)
#       her parcaciga rastgele bir omur-fazi (t0) verip balistik yorungesinde
#       ONE tasir → cihaz t=0'da ZATEN tam-akis (steady-state) sutunla dogar.
#       Bu BILEREK boyle (motor.js:886-888 "t=0 karesi yalan soylerdi"): acilis
#       rampasi diye bir sey YOK, dolayisiyla yakalanacak acilis dinamigi de yok.
#
#   (2) Sanal zaman rAF'i surmuyor. Farkli --virtual-time-budget degerleriyle
#       (300..5000 ms) cekilen SWITCH kareleri: sutun HER karede ~4.2 m tam
#       yukseklikte; showT saati yalnizca 0.1→0.2 s ilerledi (2-4 rAF karesi).
#       SwiftShader headless'ta rAF dongusu sanal butceyle DEGIL, kisa duvar-saati
#       penceresinde donuyor → butceyi buyutmek zaman serit URETMIYOR.
#       (Modul/WebGL kurulumu sanal butceyi TUKETMIYOR — 300 ms butce bile tam
#        kurulmus sahne verdi → kurulum duvar saatinde, sanal zaman askida.)
#
#   Sonuc: "zaman seridi" bu motorda mumkun degil. Denetim TEK KAREYE dusuruldu.
#   Acilis dinamigini gormek istersen motor'un prewarm tohumunu gecmen gerekir —
#   o motor cerrahisidir, bu araci asar (kapsam disi).
set -u
cd "$(dirname "$0")/.."
CIKTI="${1:?kullanim: bash tools/vitrin.sh <mutlak-cikti-dizini> [urun ...]}"
shift || true
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -x "$CHROME" ] || { echo "HATA: Chrome yok: $CHROME"; exit 2; }
KOD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8321/studio/index.html || echo 000)
[ "$KOD" = "200" ] || { echo "HATA: sunucu yok (HTTP $KOD)"; exit 3; }
mkdir -p "$CIKTI"

if [ "$#" -gt 0 ]; then
  URUNLER=("$@")
else
  mapfile -t URUNLER < <(node -e "
    import('./studio/data/katalog.js').then(m =>
      m.KATALOG.filter(u => u.pn !== null).forEach(u => console.log(u.ad)))")
fi

# Tek kare: cihaz zaten steady-state dogdugu icin bu kare = cihazin dogru gorunumu.
# 3000 ms butce kurulumu gecmeye + yan-sacilma iplikcigi oturmaya yeter (deneyde
# 300 ms bile tam sutun verdi; 3000 sadece daha oturmus dususu icin pay).
BUTCE=3000
TOPLAM=0
for URUN in "${URUNLER[@]}"; do
  GUVENLI=$(printf '%s' "$URUN" | tr ' /' '__')
  PROFIL=$(mktemp -d)
  URL="http://localhost:8321/studio/index.html#vitrin=$(printf '%s' "$URUN" | sed 's/ /%20/g')"
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
    --user-data-dir="$PROFIL" --no-first-run \
    --virtual-time-budget=$BUTCE --window-size=900,900 \
    --screenshot="$CIKTI/${GUVENLI}.png" "$URL" 2>/dev/null
  rm -rf "$PROFIL"
  TOPLAM=$((TOPLAM + 1))
  echo "  $URUN — 1 kare"
done
echo "TOPLAM $TOPLAM kare -> $CIKTI"
