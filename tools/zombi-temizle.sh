#!/usr/bin/env bash
# zombi-temizle.sh — YALNIZCA takilmis headless Chrome'lari oldurur.
# Kullanim: bash tools/zombi-temizle.sh [yasSaniye]   (varsayilan 300 = 5 dk)
#
# NEDEN VAR: onceki recete `taskkill //F //IM chrome.exe` idi — bu KOSAN
# smoke/etkilesim turlarini da olduruyor. Paralel calisan ajanlarla birlikte
# bu, uc ayri kosuyu "KIRMIZI" gosterdi; hicbiri gercek regresyon degildi,
# birbirlerinin chrome'unu kesiyorlardi. Bir smoke turu en fazla ~130 sn surer,
# etkilesim turu ~300 sn; bu esiklerin USTUNDEKI surec gercekten takilmistir.
#
# ⚠Yalnizca --headless bayrakli surecler hedeflenir: kullanicinin GERCEK Chrome
# penceresi (acik sekmeler, MCP oturumu) ASLA oldurulmez.
set -u
YAS="${1:-300}"

powershell -NoProfile -NonInteractive -Command "
  \$esik = (Get-Date).AddSeconds(-$YAS)
  \$hedef = Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" |
    Where-Object { \$_.CommandLine -like '*--headless*' -and \$_.CreationDate -lt \$esik }
  if (\$hedef) {
    \$hedef | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Output (\"{0} takilmis headless chrome olduruldu ({1} sn ustu)\" -f \$hedef.Count, $YAS)
  } else {
    Write-Output 'takilmis headless chrome yok'
  }
" 2>/dev/null || echo "zombi taramasi atlandi (powershell yok)"
