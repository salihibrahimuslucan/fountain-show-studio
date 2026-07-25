#!/usr/bin/env bash
# etkilesim.sh — headless ETKILESIM testini kosar (tools/etkilesim.html).
# Kullanim: bash tools/etkilesim.sh
# Cikis: 0=hepsi OK, 1=en az bir HATA, 2=Chrome yok, 3=sunucu/sayfa yok
#
# smoke.sh "sayfa acildi mi" der; bu kosucu "fare gercekten calisiyor mu" der:
# paletten ekleme, surukleme, Delete, serit tiklamasi, scrub kelepceleri, TAB.
# Sonuclari sayfa <title>'a yazar, biz --dump-dom ile okuruz.
set -u
cd "$(dirname "$0")/.."
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -x "$CHROME" ] || { echo "HATA: Chrome yok: $CHROME"; exit 2; }
KOD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8321/tools/etkilesim.html || echo 000)
[ "$KOD" = "200" ] || { echo "HATA: sunucu/sayfa yok (HTTP $KOD) — py -m http.server 8321 --directory <kok>"; exit 3; }

PROFIL=$(mktemp -d); trap 'rm -rf "$PROFIL"' EXIT
# ⚠TIMEOUT SART: modal (confirm/alert) yakalanirsa Chrome HIC cikmiyor — 15 dk
# beklenip 0 bayt alindi (2026-07-19). Kosucu artik 120 sn'de kesilir; timeout'un
# 124 kodu "asildi" demektir ve "baslik okunamadi"dan AYRI raporlanir, cunku o
# mesaj sayfa yuklenmedi sanisina yol aciyordu.
DOM=$(timeout 120 "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --user-data-dir="$PROFIL" --no-first-run --window-size=1280,800 \
  --virtual-time-budget=28000 --dump-dom http://localhost:8321/tools/etkilesim.html 2>/dev/null)
CIKIS=$?
[ "$CIKIS" = "124" ] && { echo "HATA: kosucu 120 sn'de ASILDI — once confirm/alert/prompt ara (modal kilidi)"; exit 4; }

BASLIK=$(printf '%s' "$DOM" | grep -o '<title>[^<]*</title>' | head -1 | sed 's|</\?title>||g')
if [ -z "$BASLIK" ]; then echo "HATA: baslik okunamadi (sayfa yuklenmedi?)"; exit 3; fi

printf '%s\n' "$BASLIK" | tr '|' '\n' | sed '/^$/d' | sed 's/^ *//'
case "$BASLIK" in
  *"HEPSI OK"*) echo "SONUC: ETKILESIM TEMIZ"; exit 0 ;;
  *"BASLIYOR"*) echo "SONUC: TEST BITMEDI (virtual-time yetmedi?)"; exit 1 ;;
  *)            echo "SONUC: ETKILESIM KIRMIZI"; exit 1 ;;
esac
