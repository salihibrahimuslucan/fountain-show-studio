#!/usr/bin/env bash
# Kullanım: tools/smoke.sh "studio/index.html#demo" cikti.png [virtual-time-butcesi]
# Sunucu (tools/sunucu.cmd) 8321'de çalışıyor olmalı.
# Çıkış kodları: 0=temiz, 1=sayfa hatası, 2=Chrome yok, 3=görüntü üretilemedi,
#                4=PİKSEL KAPISI reddetti (üretilen kare şüpheli — konsol
#                temiz olsa da içerik bozuk olabilir)
#
# Ampirik not (Chrome 150): console.error/warn/log ve uncaught exception HEPSİ
# stderr'e "INFO:CONSOLE" olarak yazılır — severity ayrımı YOK ("ERROR:CONSOLE"
# bu sürümde hiç oluşmuyor). Bu yüzden politika: sayfa konsolu SESSİZ olmalı;
# bilinen sürücü gürültüsü dışında HER konsol satırı hata sayılır.
#
# PİKSEL KAPISI (2026-07-22, "ışık karesi" olayı sonrası eklendi): commit
# 4a4ae5c'de motor.js'de normalize(0)=NaN, bloom'un ayrılabilir bulanıklığıyla
# ekranın büyük bölümüne yayıldı — kare simsiyah olduğu halde konsol tertemizdi,
# 469 test yeşildi, bu script "TEMIZ" diyordu. Konsol denetimi PİKSELİ görmez.
# Bu yüzden ekran görüntüsü üretildikten SONRA tools/piksel-kapisi.py ile GERÇEK
# piksel içeriği de denetlenir (eşikler ve gerekçeleri o dosyada). Bu denetim
# yalnız "üretim BAŞARILI mı" (çıkış kodu 3) sorusundan sonra, konsol denetiminden
# ÖNCE çalışır — ikisi bağımsız kapılar, biri diğerinin yerine geçmez.
URL="http://localhost:8321/$1"; OUT="${2:-/tmp/smoke.png}"; BUTCE="${3:-9000}"
CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -x "$CHROME" ] || { echo "HATA: Chrome yok: $CHROME"; exit 2; }
LOG=$(mktemp); PROFIL=$(mktemp -d); trap 'rm -f "$LOG"; rm -rf "$PROFIL"' EXIT
rm -f "$OUT"
# --disable-gpu KULLANMA: Chrome 150 headless'ta EffectComposer'lı (render-to-
# texture) sayfalar bu bayrakla süresiz asılıyor; swiftshader tek başına yeterli
# (matrix testi 2026-07-16: bayraklıyken 2/2 asılma, bayraksız 4/4 temiz).
"$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader \
  --user-data-dir="$PROFIL" --no-first-run \
  --virtual-time-budget="$BUTCE" --window-size=1280,800 --screenshot="$OUT" \
  --enable-logging=stderr "$URL" 2> "$LOG"
[ -s "$OUT" ] || { echo "HATA: ekran goruntusu uretilemedi (sunucu/URL kontrol et)"; exit 3; }
echo "--- piksel kapisi ---"
PY=""
command -v python  >/dev/null 2>&1 && PY=python
[ -z "$PY" ] && command -v python3 >/dev/null 2>&1 && PY=python3
if [ -n "$PY" ]; then
  PIKSEL_RAPOR=$("$PY" "$(dirname "$0")/piksel-kapisi.py" "$OUT" 2>&1)
  PIKSEL_KOD=$?
  echo "$PIKSEL_RAPOR"
  if [ "$PIKSEL_KOD" = "1" ]; then
    echo "HATA: piksel kapisi REDDETTI (supheli kare - rapor yukarida)"
    exit 4
  elif [ "$PIKSEL_KOD" != "0" ]; then
    echo "UYARI: piksel analizi calisamadi (cikis kodu=$PIKSEL_KOD) - konsol denetimine devam ediliyor"
  fi
else
  echo "UYARI: python bulunamadi - piksel kapisi ATLANDI (yalniz konsol denetimi gecerli)"
fi
echo "--- sayfa hatalari ---"
if grep -iE ':CONSOLE[:(]|Uncaught|THREE\.' "$LOG" | grep -viE 'gpu stall|histogram|swiftshader|gl driver message'; then
  exit 1
else
  echo "TEMIZ"; exit 0
fi
