# KART v2 — AquaLIGHT 406 (C'siz varyant)

Faz 1 Task 4 (plan: `docs/superpowers/plans/2026-07-24-faz1-isik-temeli.md`).
412/412C amiral kartının (`docs/cihaz-karti-v2-aqualight.md`) kısaltılmış
kardeşi — §5 (su boyama) ve §6 (kamaşma/glare) o kartta ORTAK anlatılıyor,
burada TEKRAR EDİLMEDİ. Bu kart yalnız 406'ya özgü künye/fark/[ELLE] içerir.

Veri kaynağı: **YALNIZ** `docs/referans/spec-sheet-ozeti.md` §10 (satır
450-504). Özette olmayan alan burada "PDF'te basılı değil" diye işaretlenir,
uydurulmaz.

Etiketler: ✅ spec-sheet-ozeti'nden doğrulandı · ⚠ çıkarım/tutarsızlık ·
❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Optik — 412/412C ile birebir aynı tablo

406'nın kendi lens grafiği yok; spec-sheet-ozeti not düşüyor: *"412/406 C ile
birebir aynı tablo"* (10 m → 11.54/1.74 m … 80 m → —/14.00 m; 60°/10° lens
ailesi, `çap = 2·d·tan(yarım açı)` ile doğrulanmış). Havada mı suda mı
ölçüldü sorusu 412/412C kartındaki S2 ile ORTAK — burada tekrar sorulmuyor.

## 3. LED dizilimi

- Spec metni 406/406C ailesini birebir tanımlıyor: **12 LED (6 RGB + 6 W/A)**
  — bu değer 406C'ye özgü paragrafta yazılı, 406 (C'siz) PDF'i aynı gövde
  ailesini "görsel olarak 406C ile aynı" diye anıyor (§10 "Önizleme motoru
  notları"). ✅
- ⚠ 406 PDF'inin bağlantı şemasındaki cihaz etiketi kopyala-yapıştır artığı
  olarak **"AquaLIGHT 412"** yazıyor (spec-sheet-ozeti §10 not) — 412 kartına
  taşınmış bilgiyle aynı aile karışıklığı, kod tarafını etkilemez.

## 4. Renk ve kontrol

412/412C kartındaki genel RGBW model (§4) burada da geçerli — WW/AA kaç K/nm
sorusu (S4), dimming eğrisi, DMX kanal haritası sorusu (S5) hepsi ORTAK ve
zaten 412 kartında soruluyor; 406'ya özgü tekrar YOK.

Fark yalnız güç sınıfı: 406 (22 W / 0.9 A) 406C'den (24 W / 1 A) hafif düşük
— ışık akısı (1746 lm) AYNI kaldığı için motorda parlaklık ölçeği
(`REFERANS_LUMEN` türetimi) etkilenmiyor.

## 5-6. Su boyama / kamaşma

Bkz. `docs/cihaz-karti-v2-aqualight.md` §5-§6 — 406 ailesi için fizik ORTAK,
tekrar edilmedi.

## 7. Simülatör ↔ gerçek farkları + katalog.js uyum kontrolü

**406C ile künye farkları (spec-sheet-ozeti §10 tablosu):**

| | AquaLIGHT 406 C | AquaLIGHT 406 (bu kart) |
|---|---|---|
| Güç | 24 W | **22 W** |
| Akım | 1 A | **0.9 A** |
| Ağırlık | 1.5 kg | **1.3 kg** |
| LED tipi | CREE / Edison PowerLED | Edison PowerLED (CREE yazmıyor) |
| Ürün No | 3045 | boş (PDF'te yok) |
| Işık akısı / boyut / renkler / IP68 | aynı | aynı |

**`studio/data/katalog.js` kaydıyla çapraz kontrol** (satır ~161-164,
`AquaLIGHT 406`):

```js
{ ad: 'AquaLIGHT 406', pn: 3025, ... teknik: { guc: '24 W', lumen: 1746, renk: 'RGB+WW/AA' },
  ledSayisi: 12, merkezDelik: false, lens: 60 }
```

- ⚠ **Güç çelişkisi:** katalog `guc: '24 W'` yazıyor, spec-sheet-ozeti §10
  **22 W** diyor (406C'nin 24 W'ıyla karışmış görünüyor — muhtemelen 406C
  kaydından kopyalanmış). Motorda `guc` alanı yalnız künye/panel metni
  amaçlı, `parlaklikOlcek` `lumen`den türüyor (lumen zaten doğru: 1746) —
  yani **görsel/fiziksel etkisi YOK**, ama künye paneli yanlış W gösteriyor.
- ⚠ **Ürün No çelişkisi:** katalog `pn: 3025`; bu değer spec-sheet-ozeti'nde
  YOK (406 PDF'i ürün no'yu boş bırakıyor). `3025` başka bir kaynaktan
  (`dahili ürün künyesi`, 412/412C kartının §1
  tablosu) geliyor — spec-sheet-ozeti tek kaynak kabul edilirse bu alan
  "PDF'te basılı değil" olmalıydı. Çelişki değil ama kaynak karışımı;
  düzeltme gerekmiyor (URUN_KUNYE.md katalog PDF'inin kendisi, geçerli
  kaynak), yalnız bu kartın veri kaynağı kısıtı gereği not düşülüyor.
- ✅ `lumen: 1746`, `renk: 'RGB+WW/AA'`, `ledSayisi: 12`, `merkezDelik: false`
  spec ile uyumlu.
- ⚠ `lens: 60` — spec sayısal lens tablosu iki seçenek veriyor (60°/10°),
  hangisinin gerçek varsayılan olduğunu belirtmiyor; 412 kartındaki S1/S2
  soruları burada da geçerli, tekrar sorulmuyor.

## 8. Onay sonrası KOD planı

412/412C kartı §8 ile ORTAK plan (gövde/optik/dim/su boyama/kamera). 406'ya
özgü tek ek adım: `katalog.js` `AquaLIGHT 406` kaydındaki `guc: '24 W'`
değeri `'22 W'` olarak düzeltilmeli (S-406-1 onayından sonra, kod dosyasına
bu turda DOKUNULMADI).

---

## [ELLE] onay kapısı

- [ ] **S-406-1 güç alanı düzeltmesi** — katalog.js'teki `AquaLIGHT 406`
  kaydında `guc: '24 W'` yanlış görünüyor (spec 22 W diyor, 406C'nin 24 W'ıyla
  karışmış olabilir). Düzeltilsin mi, yoksa bilinçli bir eşitleme mi (iki
  modelin panelde aynı W göstermesi istendi mi)? Varsayılan: düzeltirim (22 W).
  **[ELLE — Salih]**
- [ ] **S-406-2 ürün no kaynağı** — `pn: 3025` spec-sheet-ozeti'nde YOK
  (PDF boş bırakmış); `URUN_KUNYE.md`'den mi geliyor onaylar mısın, yoksa bu
  alan da "bilinmiyor" işaretlensin mi? Varsayılan: URUN_KUNYE.md kaynağını
  kabul ederim, kart notunu güncel bırakırım. **[ELLE — Salih]**
- [ ] **S-406-3 LED tipi farkı önemli mi** — 406C "CREE/Edison", 406 (C'siz)
  sadece "Edison" yazıyor; bu gerçek bir donanım farkı mı yoksa PDF dizgi
  eksikliği mi? Simülatörde LED tipi görsel/optik hiçbir şeyi etkilemiyor,
  yalnız künye paneli metni. Varsayılan: fark yok kabul ederim (kart notu
  olarak kalır, kod değişmez). **[ELLE — Salih]**
