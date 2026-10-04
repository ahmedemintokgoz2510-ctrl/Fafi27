# FAFI 27 - Proje Durumu ve Devam Adımları

## 1) Mevcut durum

Proje temel olarak hazır:
- Node.js + Express + Socket.IO sunucusu var.
- Akıllı tahta tarafında 3D saha ve oyun mantığı çalışıyor.
- Telefon tarafı QR kod ile oda bağlanması ve takım seçimi çalışıyor.
- Oda oluşturma, katılma, slot atama, takım seçimi, maç başlatma akışı işliyor.

Şu anda en kritik nokta: oyun deneyimi, kontrol hissi ve gerçek futbol oyunu hissi. Bu alanda daha fazla geliştirme gerekiyor.

## 2) Şu anda çalışan şeyler

- Sunucu başlatma: çalışıyor.
- Oda üretme: çalışıyor.
- Telefon bağlanma: çalışıyor.
- 2 kişilik takım/takım seçimi: çalışıyor.
- Oyun sahnesi render: çalışıyor.
- Top, oyuncu, skor, süre, gol ve restart mantığı: temel olarak çalışıyor.
- Tahtadaki oyun ekranı ve telefon ekranı ayrımı: çalışıyor.

## 3) Bilinen sorunlar / eksikler

### 3.1 Mobil kontrol deneyimi beğenilmiyor
Bu proje için en büyük sorun bu:
- Mevcut kontrol ekranı oyuncuya çok “gamepad” gibi geliyor.
- Oyun hissi daha çok arayüz kontrolü, daha az gerçek futbol kontrolü hissi veriyor.
- İstenen şey: telefonun ekrani futbol kontrolü gibi doğal, hızlı ve rahat hissettiren bir arayüz.

Gerekli iyileştirmeler:
- Joystick daha hafif ve daha sezgisel olmalı.
- Şut, pas, değiştir butonları daha doğru pozisyonlanmalı.
- Hareket ve şut zinciri daha akıcı olmalı.
- Dokunma/görsel geri bildirim çok daha iyi olmalı.

### 3.2 Oyun mantığı henüz “gerçek futbol” hissi vermiyor
- Oyunun temel mekanikleri var ama oynanabilirlik ve futbol hissi daha fazla geliştirme istiyor.
- Topun hızlanması, dönmesi, çarpışma hissi, adam kapama, pas isabeti, kale savunması daha “gerçekçi” hale getirilebilir.
- Oyuncu davranışları AI tarafında daha doğal değil.

### 3.3 Görsel / ses assetleri eksik
- Bazı ses dosyaları yer tutucu halinde ya da eksik.
- Gerçek ses ve arka plan unsurları eklenecek.
- Görsel daha kaliteli olduğu sürece oyun daha etkileyici hale gelir.

### 3.4 Gerçek cihaz testine ihtiyaç var
- Şimdiki testler masaüstü tarayıcı üzerinden yapıldı.
- Akıllı tahta ve telefon için gerçek mobil cihaz denemeleri gerekiyor.
- Ekran oranı, dokunma, ekran yönü, performans ve gecikme testleri yapılmalı.

## 4) Mevcut kod dosyaları ve ne yaptıkları

### Sunucu
- server.js
  - Express sunucusu
  - Socket.IO oda yönetimi
  - host ve controller bağlantıları
  - odada slot / takım / oynama akışı

### Tahta tarafı
- public/index.html
  - ana menü, lobby, skor ekranı, QR kod ekranı
- public/js/host.js
  - Three.js sahne düzeni
  - oyun render, skor, sunum, sesi ve socket akışı

### Telefon tarafı
- public/controller.html
  - oyunpad benzeri mobil arayüz
- public/js/controller.js
  - mobil joystick, şut/pas/değiştir butonları, socket girişleri

### Oyun mantığı
- public/js/game.js
  - top, oyuncular, takım yapısı, gol/oyun akışı, AI, input mantığı

### Ayarlar / yapılandırma
- public/config.js
  - maç süresi
  - takımlar
  - 4-4-2 formasyon

## 5) Gelecekte yapılacaklar

### Aşama 1: Kontrol deneyimini iyileştirme
- Joy stick ve buton hissi daha gerçek futbol controlüne benzetilmeli.
- Hız ve yön algısı daha doğal olmalı.
- Şut/pas butonları oyuncuya daha rahat verilmeli.
- Duyusal geri bildirim (vibration, buton ansı) güçlendirilmeli.

### Aşama 2: Oynanabilirlik geliştirme
- Top ve oyuncu hareketleri daha akıcı hale getirilecek.
- Gol, kurtarma ve çarpışma hissi daha gerçekçi olacak.
- AI rakip davranışı daha iyi olacak.
- Oyun “akıllı tahta futbol” hissi verecek şekilde düzenlenecek.

### Aşama 3: Görsellik ve modelleme
- Gerçekçi 3D modeller aranacak.
- Futbolcu modelleri / stadyum / saha / top / formalar daha geliştirilip profesyonel görünüme getirilecek.
- Modeller internetten temin edilip projeye uygun hale getirilecek.

### Aşama 4: Geliştirilmiş sunum
- Daha iyi score HUD
- Daha iyi animasyonlar
- Daha güçlü gol/maç sona erme etkileri
- Ses ve arka plan tamamlanacak

## 6) Sonraki yapılacak kilit görevler

1. Telefon kontrollerini tamamen farklı bir şekilde tasarla.
2. Her butonun tam kullanım hissini yeniden gözden geçir.
3. Oyun mantığını “futbol hissi” açısından test et.
4. Daha gerçekçi modeller bul ve ekle.
5. Görsel ve ses öğelerini tamamlama.
6. Gerçek cihaz testi yap.

## 7) Son durum özeti

Proje temel olarak çalışıyor ama şu anda “oyun olarak beğenilmeyecek” seviyeden çıkıp “gerçek futbol deneyimi hissi veren bir proje” seviyesine taşınması gerekiyor.

En büyük konu:
- Kontrol deneyimi
- Gerçek futbol hissi
- Görsel ve model geliştirme

Bu üç alanın tamamlanmasıyla proje iyi bir hale gelecektir.

## 8) Son not

Bu dosya, başka bir AI’a veya sonraki çalışmada devam eden kişiye proje durumunu hızlıca anlatır. Projenin ana hedefi şudur:

“Telefonlar gamepad yerine kontrol cihazı olarak kullanılacak. Akıllı tahta üzerinde futbol oyunu oynanacak. Daha sonra gerçekçi modeller ve görseller eklenerek oyun daha keyifli hale getirilecek.”

## 9) Hesap Değişimi İçin Devir Notu (2026-10-04)

Bu bölüm güncel durumu anlatır; yukarıdaki genel/eskimiş maddelerle çelişirse bu bölümü esas al.

### Repo ve Çalıştırma

- Aktif repo: `E:\indirilenler\fafi-27\fafi-27` (`main`, `origin/main`).
- Bu devir çalışmasının başladığı upstream taban commit `a83cc05 Improve football feel and fix dark spectators` idi. Devir kodu/notlarının son commit SHA’sını `git log -1` ile kontrol et.
- Seyirci yerleşimi `public/js/host.js` içinde düzenlendi: kale arkası ve alt sıra kaldırıldı; 36 statik model üst yan tribünlere seyrek dağıtılıyor.
- `Fafi27-duzeltilmis` ve `Fafi27-efootball-hissi` klasörleri Git repo değil, eski/kopya çalışma klasörleridir. Ana klasörü bunlarla topluca değiştirme.
- Başlatma: `npm start`. Port 3000 zaten kullanımdaysa çalışan yerel sunucuyu kapatmadan ikinci sunucu başlatma; `EADDRINUSE` bu durumda beklenen sonuçtur.

### Şu Anki Görsel Durum

- Sahadaki aktif futbolcular `public/assets/models/animated-human.glb` içindeki rig/animasyonlu Quaternius karakteridir; `host.js` bunu klonlayıp `Idle`, `Run`, `Jump` kliplerini kullanır. Model gerçek insan oranlarına göre stilize/low-poly’dir; fotogerçekçi değildir.
- `public/assets/models/crowd/` içindeki altı Eclair/Quaternius CC0 GLB yalnızca tribün seyircileridir; saha oyuncusu olarak kullanılamazlar, çünkü statik pozludurlar.
- Önceki siyah/kırmızı “random oyuncular” bu statik seyirci modelleriydi; saha oyuncuları değildi. Kaynak GLB’lerde Shoes/Pants materyalleri neredeyse siyahtı. `host.js` seyirci kıyafetlerini renk paletiyle değiştirip kalabalığı üst yan tribünlere taşımaya başladı.
- Son düzenlemede kale arkası ve en alt seyirci sırası çıkarıldı. Bu değişiklik `public/js/host.js` içinde bekliyor; bir sonraki hesap önce 16:9 oyun/maç görünümünü kontrol etmeli, sonra commit/push etmeli veya gerekirse yerleşimi ufakça ayarlamalı.

### Mevcut Oynanış

- Telefonda `KAY`: basılı tutma süresi kayma gücünü artırır; yakın değilse başlamaz; sert temas faul ve serbest vuruş doğurur. Host’ta kayma pozu, düdük, banner ve titreşim vardır.
- Telefonda `ARA`: en uygun takım arkadaşını seçer, onu koşuya gönderir ve topu koşu yoluna bırakır; ilk dokunuşta topu alabilir.
- Şut/pas uzun şarjı havadan vuruş yapar; pas hedefi belirlenir.
- Sprint stamina tüketir ve bırakınca yeniler; top sprintte daha fazla öne açılır. `BASKI` ile kontrollü oyuncunun yanı sıra en yakın iki AI takım arkadaşı destek baskısı yapar.
- Maç kamerası topu takip eder ve kaleye yaklaşınca yakınlaşır; menü kamerası geniş açıda kalır. HUD’da aktif oyuncunun kondisyon yüzdesi görünür.
- Bunlar eFootball klonu veya eşdeğer fizik değildir. Oyun hâlâ basitleştirilmiş JS simülasyonudur; top spin/curve, sekme, oyuncu ivme/easing, pas/şut isabeti, çarpışma ve kaleci davranışında ayrıntılı tuning gerekir.

### Gerçekçi Model Araştırması

- `CesiumMan` GLB indirilebilir ve rig/animasyon içerir ama Cesium maskot/logosu taşıyan stilize bir örnektir; gerçek futbolcu görünümü için uygun değil.
- Sketchfab “Realistic Male Character” T-pozu tam-vücut ve CC BY 4.0’dır, fakat yaklaşık 642k üçgen/321k vertex, rig’sizdir ve görüntüleyici bu cihazda ağır olduğunu bildirir. 22 kopyayı oyuna ekleme; önce rig/LOD ve performans çözümü gerekir. Atıf şartları da uygulanmalı.
- Cinevva katalog sayfasında Quaternius `Casual Female` için CC0 GLB, 23 eklem, 17 klip, yaklaşık 6.6k vertex ve harici texture gerektirmediği listelenmiştir. Gerçek insan görünümüne ne kadar yakın olduğu ve erkek eşinin aynı pakette bulunup bulunmadığı henüz doğrulanmadı; oyuna indirilip entegre edilmedi.
- Cinevva auto-rigger GLB/FBX/OBJ alıp rigli GLB döndürüyor; sayfaya göre ilk export ücretsiz ve en fazla 6 animasyon, sonrası plan gerektiriyor. Bir hesapla oturum açma gerekir. Kullanıcı hesabı/şifresi isteme veya model adına kullanıcı hesabında işlem yapma; sadece kullanıcı modeli alıp paylaşırsa entegrasyona devam et.
- Makinede Blender komutu bulunamadı. Rig’siz 600k+ poligonlu modeli elde rigleme için mevcut araç yok.
- CC0 için kaynak sayfaları: `https://app.cinevva.com/game-assets/free-3d-character-models`, `https://quaternius.com/packs/ultimateanimatedcharacters.html` (paket eşleşmesini ayrıca doğrula). Mevcut animasyonlu karakter kaynağı `https://poly.pizza/m/c3Ibh9I3udk`.

### Sonraki İş Sırası

1. `git status --short --branch` ile bekleyen `host.js` crowd yerleşimini doğrula; 16:9 host görüntüsünde kale çizgisine seyirci taşmadığını kontrol et. Sonra ilgili testi ve `git diff --check` çalıştır.
2. Gerçekçi oyuncu hedefi için Cinevva’daki Casual Female/Male GLB’lerini veya eşdeğer açık lisanslı, skinned, animasyonlu iki yetişkin modeli doğrula. Önce ayrı preview’de ölçek, rig kemik adları, idle/run/shot klipleri, materyal/texture bağımlılıkları ve dosya boyutunu incele.
3. Eşleşen gerçekçi modeller bulunursa önce tek bir oyuncuda test et. `host.js`’teki `Spine1`, `Hips`, `Head`, `LeftUpLeg`, `RightUpLeg` bone adlarının yeni rig’deki adlarla uyuştuğunu kontrol et; uymazsa kemik eşleme katmanı veya mevcut Quaternius rig’e retarget gerekir. Fallback’i silme.
4. Bir sonraki oynanış dilimi top fiziği olsun: sabit adım/deterministik test, yer sürtünmesi ve hava drag’i, zıplama/sekme, top spin + Magnus eğrisi, koşu momentum/ivme frenleme ve kısa/uzun pas/şut isabet farkı. Her davranışı ayrı küçük simülasyon testiyle doğrula; doğrudan “eFootball ile aynı” diye iddia etme.
5. Her değişiklikte dört JS dosyası için `node --check`, `git diff --check`, browser console ve 16:9/mobil render kontrolü yap. Kullanıcı önceki çalışmalarda GitHub’a push istemiştir; push öncesi status/diff’i incele, unrelated dosyaları dahil etme.

### Devir Anı Doğrulama

- Devir değişiklikleri ve bu not dosyası aynı Git geçmişine alınmalı; yeni hesap açıldığında `git status --short --branch` ile temizliği, `git log -1 --oneline --decorate` ile `origin/main` eşitliğini doğrula.
- `host.js` içindeki seyirci yerleşimi son bir 16:9 göz kontrolünden geçti; yayın sonrası aynı sahne yeni hesapta açılabiliyor olmalı.
- ARA hedef/koşu/ilk dokunuş, stamina tüketim-toparlanma, pressure destek sayısı, sprintte topun daha çok açılması ve slide/foul senaryoları deterministik Node testleriyle geçti.
- Son browser kontrollerinde JS hatası yoktu; 16:9 canvas çalışıyordu ve gamepad butonları çakışmıyordu.
- Araştırma için oluşturulan PNG ekran görüntüleri temizlendi.
