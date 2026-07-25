#!/usr/bin/env bash
# kareler.sh — HAREKET doğrulama şeridi (v5.6): aynı sahneyi farklı sim=
# anlarında çekip tek kontak-şeride diker. Headless göz tek karede hareketi
# göremez; bu şerit ışık dönüşü/süpürme/salvo zamanlamasını görünür yapar.
# Kullanım: tools/kareler.sh "studio/index.html#katalogdemo" cikti.png "1 4 7 10 13"
# Sunucu 8321'de çalışıyor olmalı (smoke.sh sözleşmesi).
HASH="$1"; OUT="$2"; TLER="${3:-1 4 7 10 13 15}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
i=0
for t in $TLER; do
  P=$(printf "%s/t%04.1f.png" "$TMP" "$t")
  tools/smoke.sh "${HASH}&sim=${t}" "$P" 15000 > /dev/null || echo "UYARI: t=$t kare hatasi"
  i=$((i+1))
done
python tools/serit.py "$OUT" "$TMP"/t*.png
