# KART v2 — AquaLIGHT 606 C

Faz 1 Task 4 (plan: `docs/superpowers/plans/2026-07-24-faz1-isik-temeli.md`).
412/412C amiral kartının (`docs/cihaz-karti-v2-aqualight.md`) kısaltılmış
kardeşi — §5 (su boyama) ve §6 (kamaşma/glare) o kartta ORTAK anlatılıyor,
burada TEKRAR EDİLMEDİ. 606C ailenin en farklı üyesi: 6 renk kanalı (RGBACL)
mevcut RGBW simülatör modelinin DIŞINDA — bu kart bir borç kartı.

Veri kaynağı: **YALNIZ** `docs/referans/spec-sheet-ozeti.md` §2 (satır
66-106). Özette olmayan alan burada "PDF'te basılı değil" diye işaretlenir,
uydurulmaz.

Etiketler: ✅ spec-sheet-ozeti'nden doğrulandı · ⚠ çıkarım/tutarsızlık ·
❓ Salih'e soru · **[ELLE]** = onay maddesi

---

## 1. Künye — public sürümde çıkarıldı

Ürün künye tabloları (parça numarası, ölçü, ağırlık, gerilim, güç) üreticinin
ürün kataloğuna aittir ve bu public sürümde yer almaz. Motorun simülasyon için
kullandığı türetilmiş parametreler `studio/data/katalog.js` içindedir.

## 2. Optik — ⚠ LENS TABLOSU PDF'TE YOK

**Açıkça işaretleniyor: 606C için sayısal lens açısı/koni çapı tablosu
spec-sheet-ozeti'nde YOK.** 406C/412/412C/STARLIGHT 403/303 kartlarının
hepsinde PDF'ten okunmuş bir grafik var; 606C PDF'i böyle bir tablo
basmıyor (spec-sheet-ozeti §2 içinde "Lighting Angle" grafiği anılmıyor).

Görselden okunanlar (§2 "Görselden okunanlar" bölümü) tek optik ipucu:
LED renk şeması çiziminde **büyük Cyan + büyük Lime lensler** ve merkezde
**R/G/B/Amber kümesi** görülüyor — yani lensler HETEROJEN boyutlu (406/412
ailesinin homojen 12-LED çemberinden farklı bir fiziksel düzen). Bu geometri
hakkında sayısal veri yok; ❓ **[ELLE] soruya bağlandı** (aşağı bak).

⚠ Katalogda ve motor `rgb_spot` arketipinde şu an tek bir `lens` alanı
(derece, 60|10) var — 606C'nin heterojen 6-lens kümesi bu modele hiç
oturmuyor. §7'de KOD borcu olarak not düşülüyor.

## 3. LED dizilimi

- Halka form 406C ile aynı gövde ailesi (Ø160×70 mm), ortadan nozul geçişli.
  ✅
- 6 renk kanalı = en az 6 ayrı LED/lens grubu (R, G, B, Amber, Cyan, Lime),
  büyüklükleri görselden HETEROJEN görünüyor (yukarı bak). PDF LED sayısını
  kanal başına açıkça basmıyor — ⚠ ÇIKARIM, tam sayı bilinmiyor.
- Holder U Profile: 75°'ye kadar eğimli montaj braketi (30 mm profil, 140 mm
  braket) — 606/606C açılı da konumlanabiliyor. ✅
- DryDECK plakaları 406C ile aynı: Ø280 yuvarlak veya 30×30 kare. ✅

## 4. Renk ve kontrol — ⚠ EN BÜYÜK FARK: RGBACL 6 kanal

**RGBACL, mevcut simülatör RGBW+ (hue+beyaz) modelinin ÜSTÜNDE bir renk
uzayı** — Faz 1 Task 1'de `proje.js`'e eklenen `rgbwKaris(hueRenk, beyaz,
dogal)` iki girdi (hue + tek beyaz kanal) alıyor; 606C'nin donanımı R, G, B,
Amber, Cyan, Lime = **6 bağımsız** DMX kanalı taşıyor. RGBW+ modeli bunu
temsil EDEMEZ — Amber/Cyan/Lime tam bağımsız kanallar olduğu için hue tekerine
sıkıştırılamaz (hue dairesel bir boyuttur, 6 ayrık ışık kaynağı değil).

Spec-sheet-ozeti kendi "Önizleme motoru notları"nda bir indirgeme öneriyor:
*"motor renk karışımı RGB'ye indirgenirken Amber≈(1, 0.6, 0), Cyan≈(0, 1, 1),
Lime≈(0.6, 1, 0) katkı modeli kullanılabilir"* — ama bu 6 kanalı simüle
etmiyor, yalnızca RGB'ye YAKLAŞTIRIYOR (kod tarafında henüz uygulanmadı).

3000 lm @ 30 W — 406C'ye göre ~1.7× parlak, intensity oranı 3000/1746 ≈ 1.72
(katalogda `REFERANS_LUMEN` türetimi bu oranı otomatik hesaplayabilir, EĞER
606C katalog kaydı eklenirse — bkz. §7).

## 5-6. Su boyama / kamaşma

Bkz. `docs/cihaz-karti-v2-aqualight.md` §5-§6 — fizik ORTAK. RGBACL renk
seçimi bu fiziği değiştirmez, yalnız hangi rengin su/kamera hattına
gönderileceği değişir (§4'teki borç).

## 7. Simülatör ↔ gerçek farkları + katalog.js uyum kontrolü

**`studio/data/katalog.js`'te 606C kaydı YOK.** `isik` grubundaki tüm kayıtlar
(satır ~153-189): 412, 412C, 406, 406C, 512C, 312C, 306C, 206C, 112C,
STARLIGHT 403 — 606C listede **hiç yok**. Bu, alan-bazlı bir çelişki değil,
tam bir eksik kayıt: 606C paletten hiç eklenemiyor.

| Konu | Gerçek (spec-sheet-ozeti §2) | Şimdi (katalog.js / motor) | |
|---|---|---|---|
| Katalog kaydı | mevcut ürün, PN yok ama künye tam | **kayıt yok** | ❌ |
| Renk modeli | RGBACL 6 bağımsız kanal | RGBW+ (hue + tek beyaz), 4 kanala kadar | ❌ **BORÇ** |
| Lens/koni | heterojen 6-lens küme, sayısal veri yok | `rgb_spot` tek `lens` derece alanı (60\|10) | ❌ oturmuyor |
| Lümen | 3000 lm | — (kayıt yoksa `parlaklikOlcek` hesaplanamaz) | ❌ |

**606C renk modeli şu an desteklenmiyor** — bu, plan kapsamı dışı bırakılan
bir iş (`2026-07-24-faz1-isik-temeli.md` "Kapsam DIŞI" bölümü: *"606C RGBACL
renk modeli desteği (kartta borç olarak yazılır, kod YOK)"*). Bu kart o
borcun yazılı kaydıdır.

## 8. Onay sonrası KOD planı (borç — bu turda UYGULANMAZ)

1. **Katalog kaydı** — `606C` ve `606` (C'siz) `isik` grubuna eklenir; `pn`
   alanı boş kalır (PDF'te yok), `teknik.lumen: 3000`, `renk: 'RGBACL'`.
2. **Renk modeli genişletmesi** — `proje.js`'e RGBACL için ayrı bir karışım
   fonksiyonu (6 kanal → RGB indirgeme, spec'in Amber/Cyan/Lime katkı
   modeliyle başlangıç) veya `rgbwKaris`'in genelleştirilmiş bir üst kümesi.
   Bu, mevcut hue+beyaz kontrol UI'ının 606C için yetersiz kaldığı anlamına
   gelir — ayrı bir kontrol şeridi gerekebilir.
3. **Lens/optik** — heterojen lens kümesi tek `lens` derece alanına
   sığdırılamıyor; sayısal veri gelene kadar 406C ile aynı 60°/10° varsayımı
   geçici çözüm olabilir (❓ aşağıdaki S1).
4. **KIYAS** — 606C tek cihaz, altı renk kanalı ayrı ayrı + kombinasyonlar,
   406C referansına göre 1.72× parlaklık oranı doğrulaması.

---

## [ELLE] onay kapısı

- [ ] **S-606C-1 lens geçici varsayımı** — sayısal lens tablosu gelene kadar
  606C'yi 406C'nin 60°/10° lens ailesiyle mi göstermeliyiz (aynı Ø160×70 mm
  gövde ailesi olduğu için makul bir köprü), yoksa katalog kaydı eklenene
  dek 606C hiç PALETTE görünmesin mi? Varsayılan: 406C lens varsayımını
  ödünç alırım, kart notuna "geçici" diye yazarım. **[ELLE — Salih]**
- [ ] **S-606C-2 RGBACL öncelik** — 606C bu turda kod kapsamı dışı bırakıldı
  (plan §"Kapsam DIŞI"). Bu doğru mu, yoksa Faz 2'ye taşınacak somut bir iş
  maddesi mi açılsın (6-kanal kontrol şeridi + RGB indirgeme fonksiyonu)?
  Varsayılan: borç olarak kalır, ayrı iş açılana kadar dokunulmaz.
  **[ELLE — Salih]**
- [ ] **S-606C-3 606 vs 606C ayrımı** — PDF'in kendisi 606/606C farkını
  yalnız kablo topolojisiyle (yıldız vs zincir) açıklıyor, sahnede görsel
  fark bu olmadığına göre motorda İKİ ayrı katalog kaydı mı gerekir yoksa
  tek kayıt + "zincir/yıldız" metadata notu mu yeterli? Varsayılan: tek görsel
  prefab, iki elektriksel/topoloji varyantı olarak not düşerim (406/412
  kartındaki desenin aynısı). **[ELLE — Salih]**
