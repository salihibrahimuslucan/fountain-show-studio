#!/usr/bin/env bash
# saglik.sh — TEK KOMUTLA tam dogrulama: testler + smoke seti + yayin ciktisi.
# Kullanim: bash tools/saglik.sh [hizli]
#   hizli → yalnizca testler + 3 kritik hash (yaklasik 1 dk)
#
# NEDEN VAR: her denetim turunda ayni sirayi elle kosuyorduk ve iki tuzaga
# tekrar tekrar dusuluyordu:
#   1) Node testleri dosyalari METIN olarak okur, IMPORT ETMEZ → bir sozdizimi
#      hatasi (or. GLSL yorumuna sizan backtick) 264 test yesilken sayfayi
#      komple oldurebilir. Sayfayi ancak smoke acar.
#   2) Sunucu kapaliyken smoke.sh SAHTE "TEMIZ" verir → once curl ile 200 dogrula.
# Cikis kodlari: 0=hepsi temiz, 1=test kirmizi, 2=smoke kirmizi, 3=sunucu yok, 4=etkilesim kirmizi
set -u
cd "$(dirname "$0")/.."
KOK="$(pwd -W 2>/dev/null || pwd)"          # smoke.sh MUTLAK yol ister (chrome goreli yazamaz)
CIKTI="$KOK/_kiyas.local/saglik"
mkdir -p "$CIKTI"
HIZLI="${1:-}"

echo "=== 1/5 zombi headless chrome temizligi ==="
# Birikmis headless surecler smoke'u kilitliyor (bir turda 15 surec, 7 dk asilma).
# ⚠BLANKET `taskkill //IM chrome.exe` KULLANMA: KOSAN turlari da olduruyor —
# paralel ajanlarla birlikte uc ayri kosuyu sahte "KIRMIZI" yapti. Yasa gore sec.
bash tools/zombi-temizle.sh 300

echo "=== 2/5 Node testleri ==="
# NE YANLISTI: `if ! node --test ... | tail -12; then` yaziliydi. Bash'te bir BORU
# HATTININ cikis kodu SON komutunkidir — burada `tail`, ki O HEP 0 doner. Yani
# testler kirmizi olsa bile kosul asla tutmuyordu; saglik kontrolu SAHTE-YESIL
# basip 0 ile cikiyordu. Ayni maskeleme 5/5 etkilesim adiminda da vardi ve
# etkilesim kosucusu "HATA: baslik okunamadi" derken script "HEPSI TEMIZ" dedi.
# NEDEN BOYLE DUZELTILDI: cikti once gecici dosyaya alinir, GERCEK cikis kodu
# ayri degiskende saklanir, kisaltma (`tail`) ancak ondan SONRA yapilir. Boru
# hatti hic kurulmadigi icin maskeleme fiziksel olarak imkansiz hale gelir.
# `set -o pipefail` SECILMEDI: dosya genelinde `set -u` var ama pipefail acmak
# ilerideki her boru hattinin (or. `... | grep -q`, `... | head -1`) davranisini
# sessizce degistirir — 4/5 adimindaki `smoke.sh | tail -1 | grep -q TEMIZ`
# kaliba dokunmadan kalsin istiyoruz. Yerel duzeltme daha guvenli.
GUNLUK="$CIKTI/test.log"
node --test test/*.mjs > "$GUNLUK" 2>&1
KOD_TEST=$?
tail -12 "$GUNLUK"
if [ "$KOD_TEST" != "0" ]; then
  echo "SONUC: TESTLER KIRMIZI (tam gunluk: $GUNLUK)"; exit 1
fi

echo "=== 3/5 sunucu kontrolu (8321) ==="
KOD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8321/studio/ || echo 000)
if [ "$KOD" != "200" ]; then
  echo "sunucu kapali (HTTP $KOD) — baslat: py -m http.server 8321 --directory $KOK"
  echo "SONUC: SMOKE KOSULAMADI"; exit 3
fi

echo "=== 4/5 smoke seti ==="
if [ "$HIZLI" = "hizli" ]; then
  HASHLER=("studio/index.html#demo&t=13" "studio/index.html#mod=editor" "studio/index.html#ornek=mozart-daire&t=13")
else
  HASHLER=(
    "studio/index.html#demo&t=13"
    "studio/index.html#efektdemo"
    "studio/index.html#mod=editor"
    "studio/index.html#demo&mod=editor"
    "studio/index.html#sablondemo"
    "studio/index.html#plandemo"
    "studio/index.html#demo&projedemo"
    "studio/index.html#ornek=mozart-daire&t=13"
    "studio/index.html#ornek=veridis-quo-kovan&t=8"
    "studio/index.html#ornek=blinding-lights-cizgi&t=8"
  )
fi
HATA=0
for h in "${HASHLER[@]}"; do
  ad=$(echo "$h" | sed 's/[^a-zA-Z0-9]/_/g')
  printf "  %-46s " "$h"
  if timeout 130 bash tools/smoke.sh "$h" "$CIKTI/$ad.png" 9000 | tail -1 | grep -q TEMIZ; then
    echo "TEMIZ"
  else
    echo "KIRMIZI"; HATA=1
  fi
done
[ "$HATA" = "1" ] && { echo "SONUC: SMOKE KIRMIZI (kareler: $CIKTI)"; exit 2; }

echo "=== 5/5 etkilesim kosucusu ==="
# smoke "sayfa acildi mi" der; bu "fare gercekten calisiyor mu" der (ekle/surukle/
# sil/serit tiklamasi/scrub kelepceleri/TAB). Ayrinti: tools/etkilesim.html
# NE YANLISTI: `if ! bash tools/etkilesim.sh | tail -3; then` — yukaridaki 2/5
# adimiyla ayni boru-hatti maskelemesi. Kosucu 3 (baslik okunamadi) ile ciksa
# bile `tail` 0 donuyor, kosul tutmuyor, script "HEPSI TEMIZ" basiyordu. Yani
# saglik kontrolunun 5. adimi FIILEN HICBIR SEYI DOGRULAMIYORDU.
# NEDEN BOYLE DUZELTILDI: cikti gecici dosyaya, cikis kodu ayri degiskene; kisaltma
# sonra. Ayrica etkilesim.sh 1/2/3 gibi FARKLI kodlar dondurur (kirmizi / Chrome
# yok / sunucu-sayfa yok) — bunlari ayirt edebilmek icin kodu ekrana da basiyoruz;
# sozlesme geregi saglik.sh yine tek bir 4 ile cikar.
# ⚠IKINCI TUZAK — SURESIZ ASILMA: etkilesim.sh, Chrome cagrisini `timeout`
# ile sarmalamiyor. Sayfa bir MODAL acarsa (confirm/alert) headless olusturucu
# suresiz kilitlenir, --dump-dom hicbir sey dokmez, chrome HIC CIKMAZ. Olculdu:
# 15 dakika sonra hala kosuyordu, 0 bayt (kanit: docs/2026-07-19-etkilesim-
# donmasi.md). Boyle bir durumda tum saglik kontrolu sonsuza kadar asiliyordu.
# NEDEN BOYLE: 300 sn kelepce koyuyoruz. `timeout` 124 dondurur; bunu ayirip
# "TAKILDI" diye adlandiriyoruz, cunku "kirmizi" ile "hic bitmedi" apayri
# teshislerdir ve ikincisi neredeyse her zaman bir modal demektir.
EGUNLUK="$CIKTI/etkilesim.log"
timeout 300 bash tools/etkilesim.sh > "$EGUNLUK" 2>&1
KOD_ETK=$?
tail -3 "$EGUNLUK"
if [ "$KOD_ETK" = "124" ]; then
  echo "SONUC: ETKILESIM TAKILDI (300 sn) — sayfa hic settle olmadi."
  echo "  Neredeyse her zaman sebep bir MODAL: confirm()/alert() headless"
  echo "  olusturucuyu kilitler. Once kosulan yolda confirm arayin"
  echo "  (or. ana.js sablon uzerine dosemede confirm sorar)."
  exit 4
fi
if [ "$KOD_ETK" != "0" ]; then
  echo "SONUC: ETKILESIM KIRMIZI (etkilesim.sh cikis kodu=$KOD_ETK, tam gunluk: $EGUNLUK)"; exit 4
fi

echo "SONUC: HEPSI TEMIZ (kareler: $CIKTI)"
