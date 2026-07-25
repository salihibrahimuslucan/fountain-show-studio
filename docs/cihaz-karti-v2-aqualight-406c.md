# KART v2 — AquaLIGHT 406 C

Faz 1 Task 4 (plan: `docs/superpowers/plans/2026-07-24-faz1-isik-temeli.md`).
412/412C amiral kartının (`docs/cihaz-karti-v2-aqualight.md`) kısaltılmış
kardeşi — §5 (su boyama) ve §6 (kamaşma/glare) o kartta ORTAK anlatılıyor,
burada TEKRAR EDİLMEDİ.

Veri kaynağı: **YALNIZ** `docs/referans/spec-sheet-ozeti.md` §1 (satır
10-64). Özette olmayan alan burada "PDF'te basılı değil" diye işaretlenir,
uydurulmaz.

Etiketler: ✅ spec-sheet-ozeti'nden doğrulandı · ⚠ çıkarım/tutarsızlık ·
❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Optik — 60°/10° lens ailesi ✅ birebir (412/412C ile aynı tablo)

| Mesafe (m) | 60° lens (yarı-açı 30°) koni çapı | 10° lens (yarı-açı 5°) koni çapı |
|---|---|---|
| 10 | 11.54 | 1.74 |
| 20 | 23.09 | 3.49 |
| 30 | 34.64 | 5.24 |
| 40 | 46.18 | 6.99 |
| 50 | — | 8.74 |
| 60 | — | 10.49 |
| 70 | — | 12.24 |
| 80 | — | 14.00 |

Tablo `çap = 2·d·tan(yarım açı)` ile birebir tutuyor. Havada mı suda mı
ölçüldüğü sorusu (412 kartındaki ⭐S2) 406C için de geçerli — o kartta zaten
soruluyor, burada tekrar edilmedi.

## 3. LED dizilimi

✅ Spec metni birebir: *"6 RGB and 6 natural white LEDs, or 6 amber LEDs"* →
**12 LED (6 RGB + 6 W/A)**. 412'nin aksine burada çıkarım YOK, PDF açık
yazıyor.

Halka Ø160 mm çember üzerinde ayrık LED dizilimi (görselden okunmuş, spec-sheet
"Görselden okunanlar" bölümü).

## 4. Renk ve kontrol

412 kartındaki genel RGBW model (§4: beyaz kanal RGB'ye EKLENİR, square-law
dimming, DMX kanal haritası S4/S5 soruları) burada da ORTAK — tekrar
sorulmuyor.

## 5-6. Su boyama / kamaşma

Bkz. `docs/cihaz-karti-v2-aqualight.md` §5-§6 — fizik ORTAK, tekrar edilmedi.

## 7. Simülatör ↔ gerçek farkları + katalog.js uyum kontrolü

**`studio/data/katalog.js` kaydıyla çapraz kontrol** (satır ~157-160,
`AquaLIGHT 406C`):

```js
{ ad: 'AquaLIGHT 406C', pn: 3045, ... teknik: { guc: '24 W', lumen: 1746, renk: 'RGB+WW/AA' },
  ledSayisi: 12, merkezDelik: true, lens: 60 }
```

✅ **Çelişki YOK** — `pn: 3045`, `guc: '24 W'`, `lumen: 1746`, `renk`,
`ledSayisi: 12`, `merkezDelik: true` hepsi spec-sheet-ozeti §1 ile birebir
uyumlu. Bu kart ailesinin en temiz kaydı (406, STARLIGHT 403 ve 606C'nin
aksine).

⚠ `lens: 60` — katalog varsayılan olarak geniş (60°) lensi seçmiş; spec-sheet
iki seçeneği de listeliyor ama hangisinin fabrika varsayılanı olduğunu
belirtmiyor (412 kartı S1). Bu 406C'ye özgü değil, ORTAK soru.

## 8. Onay sonrası KOD planı

412/412C kartı §8 ile ORTAK — 406C ayrıca kod değişikliği gerektirmiyor,
katalog kaydı zaten spec ile uyumlu.

---

## [ELLE] onay kapısı

- [ ] **S-406C-1 "C" tanımının doğruluğu** — 406C'nin de 412C gibi "yalnız
  mekanik: merkez delik" farkı olduğunu doğrular mısın (406C'ye özgü ayrı
  spec sheet PDF'i yok, bu çıkarım 412'nin notundan taşındı)? Varsayılan:
  evet, aynı desen geçerli sayarım. **[ELLE — Salih]**
- [ ] **S-406C-2 lens varsayılanı** — sahada 406C'ler fabrikada hangi lensle
  geliyor, 60° mi 10° mü (katalog şu an 60° varsayıyor)? 412 kartındaki S1
  ile aynı soru — cevap gelirse tüm aile (406/406C/412/412C) için tek seferde
  uygulanır. Varsayılan: 60° kalır. **[ELLE — Salih]**
