#!/usr/bin/env bash
# dist/ = yayınlanacak statik site (yalnız studio; ders/docs girmez — spec §9)
cd "$(dirname "$0")/.."
rm -rf dist && mkdir dist
cp -r studio/* dist/
# `_` onekli dosyalar YEREL test iskelesidir (denetim turunun _test-*.aqshow
# sovlari; .gitignore'da). cp -r hepsini kopyaliyordu → yayinlanan siteye
# sizacaklardi. Yayin ciktisi yalnizca urunun kendisi olmali.
find dist -name '_*' -delete
echo "dist hazir: $(du -sh dist | cut -f1)"
