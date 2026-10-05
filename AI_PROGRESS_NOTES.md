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

- Sahadaki aktif futbolcular `public/assets/models/casual-human.glb` içindeki Quaternius Casual Male karakteridir. Cinevva kataloğunda CC0, skinned, 23 eklem ve 17 animasyon klibi olarak doğrulandı; host `Idle`, `Run`, `Jump` kliplerini kullanır, şut animasyonu host'ta prosedüreldir. Bone/material eşlemeleri Quaternius rig adlarına göre yapıldı. Model daha ayrıntılı ve takım formaları renklendiriliyor, ancak hâlâ stilize/low-poly; fotogerçekçi değildir. `animated-human.glb` fallback olarak durur.
- `public/assets/models/crowd/` içindeki altı Eclair/Quaternius CC0 GLB yalnızca tribün seyircileridir; saha oyuncusu olarak kullanılamazlar, çünkü statik pozludurlar.
- Önceki siyah/kırmızı “random oyuncular” bu statik seyirci modelleriydi; saha oyuncuları değildi. Kaynak GLB’lerde Shoes/Pants materyalleri neredeyse siyahtı. `host.js` seyirci kıyafetlerini renk paletiyle değiştirip kalabalığı üst yan tribünlere taşımaya başladı.
- Son düzenlemede kale arkası ve en alt seyirci sırası çıkarıldı. Bu değişiklik `public/js/host.js` içinde bekliyor; bir sonraki hesap önce 16:9 oyun/maç görünümünü kontrol etmeli, sonra commit/push etmeli veya gerekirse yerleşimi ufakça ayarlamalı.

### Mevcut Oynanış

- Telefonda `KAY`: basılı tutma süresi kayma gücünü artırır; yakın değilse başlamaz; sert temas faul ve serbest vuruş doğurur. Host’ta kayma pozu, düdük, banner ve titreşim vardır.
- Telefonda `ARA`: en uygun takım arkadaşını seçer, onu koşuya gönderir ve topu koşu yoluna bırakır; ilk dokunuşta topu alabilir.
- `PAS` ve `ARA`: kısa dokunuş en yakın uygun ileri oyuncuyu, uzun basış daha uzaktaki hedefi seçer; kontrolcüde şarj göstergesi bulunur.
- Omuz omuza temas, baskı girdisi ve oyuncu savunma/güç değerleriyle top kazanımına dönüşebilir.
- Taç ve korner ayrı duran top durumlarıdır. Taçta top oyuncu el hizasında, kornerde kamera korner noktasından ceza alanına bakar; telefon joystick sürüklemesi yön seçer ve `PAS` vuruşu kullanır.
- Kaleci ceza alanında erişilebilir alçalan hava toplarına çıkar, yakalama olasılığı kaleci savunma değeri ve top hızı/mesafesine göre hesaplanır; tutulan top el hizasında gösterilir.
- CPU top taşıyıcısı artık kare başına rastgele pas/şut denemez; şut alanı, baskı ve topu tutma süresine göre karar verir. Chaser seçimi kararlılaştırıldı, top bizdeyken defans/orta saha/forvet destek derinliği ayrıldı.
- Oyuncu ad/numara etiketleri topa yakın ve kontrol edilen oyuncuda görünür; küçük, çerçevesiz metin topun üstüne kart bindirmez. Idle kontrollü oyuncu ve topsuz AI topa döner; kadrodaki görünür ten/saç paletleri oyuncu başına tanımlıdır.
- Ses placeholder dosyaları CC0 Freesound MP3 önizlemeleriyle değiştirildi: düdük, top vuruşu, gol sevinci, 138 saniyelik stadyum ambiyansı ve kontrolcü buton tıkı. Ayrıntılı atıflar `public/assets/README.txt` içinde.
- AI yaklaşımında Konami'nin açık eFootball rehberindeki açık pas hedefi/koşu ve takım oyun tarzı ilkeleri referans alındı; Konami'nin kapalı maç AI'sının aynısı olduğu iddia edilmez: https://www.konami.com/efootball/en/page/overview
- Şut/pas uzun şarjı havadan vuruş yapar; pas hedefi belirlenir.
- Sprint stamina tüketir ve bırakınca yeniler; top sprintte daha fazla öne açılır. `BASKI` ile kontrollü oyuncunun yanı sıra en yakın iki AI takım arkadaşı destek baskısı yapar.
- Takım dizilişleri artık ayrı: Barcelona 4-3-3; Real Madrid 4-2-3-1 ve Arda Güler sağ hücum orta sahasında. Dizilişler sıralı 11 oyuncuyla eşlenir.
- Maç kamerası topu takip eder ve kaleye yaklaşınca yakınlaşır; menü kamerası geniş açıda kalır. HUD’da aktif oyuncunun kondisyon yüzdesi görünür.
- Şutlarda yön girdisi top spin'i üretir; top Magnus benzeri yanal kuvvetle kavis alır ve spin zamanla azalır. Shooting/passing değerleri isabeti, shooting/power değerleri şut gücünü etkiler.
- Normal pas, ara pas ve orta için pas anındaki ikinci son savunmacı/top çizgisine göre ofsayt kontrolü yapılır; hedef oyuncu topa müdahale ederse savunmaya serbest vuruş verilir ve host'ta ofsayt bildirimi çıkar.
- Bunlar eFootball klonu veya eşdeğer fizik değildir. Sabit adım fiziği, daha ayrıntılı sekme/sürtünme, çarpışma ve kaleci davranışı hâlâ geliştirilmelidir.

### Gerçekçi Model Araştırması

- `CesiumMan` GLB indirilebilir ve rig/animasyon içerir ama Cesium maskot/logosu taşıyan stilize bir örnektir; gerçek futbolcu görünümü için uygun değil.
- Sketchfab “Realistic Male Character” T-pozu tam-vücut ve CC BY 4.0’dır, fakat yaklaşık 642k üçgen/321k vertex, rig’sizdir ve görüntüleyici bu cihazda ağır olduğunu bildirir. 22 kopyayı oyuna ekleme; önce rig/LOD ve performans çözümü gerekir. Atıf şartları da uygulanmalı.
- Cinevva katalog sayfasında Quaternius `Casual Female` ve `Casual Male` eşleşmesi CC0 GLB, 23 eklem, 17 klip, yaklaşık 6.6k vertex ve harici texture gerektirmeyen varlıklar olarak listelenmiştir. Erkek GLB indirildi, rig/klip adları incelendi ve oyunun host renderer'ına entegre edildi; kadın eş modeli indirilmedi çünkü Barcelona/RMA erkek kadrosunda kullanılmıyor.
- Cinevva auto-rigger GLB/FBX/OBJ alıp rigli GLB döndürüyor; sayfaya göre ilk export ücretsiz ve en fazla 6 animasyon, sonrası plan gerektiriyor. Bir hesapla oturum açma gerekir. Kullanıcı hesabı/şifresi isteme veya model adına kullanıcı hesabında işlem yapma; sadece kullanıcı modeli alıp paylaşırsa entegrasyona devam et.
- Makinede Blender komutu bulunamadı. Rig’siz 600k+ poligonlu modeli elde rigleme için mevcut araç yok.
- OpenGameArt'ta CC0 “A footballer with some animation” paketi bulundu; futbol forması ve Blender rig/actions içeriyor, ancak yalnızca 2010 dönemi `.blend` ve TGA dosyaları sağlıyor. Makinede Blender olmadığı ve web uygulaması GLB istediği için kullanılabilir animasyonlu GLB'ye dönüştürülemedi.
- CC0 için kaynak sayfaları: `https://app.cinevva.com/game-assets/free-3d-character-models`, `https://quaternius.com/packs/ultimateanimatedcharacters.html` (paket eşleşmesini ayrıca doğrula). Mevcut animasyonlu karakter kaynağı `https://poly.pizza/m/c3Ibh9I3udk`.

### Sonraki İş Sırası

1. Seyirci yerleşimi 16:9 host sahnesinde kontrol edildi; canlı eşleştirme akışı iki telefon oturumuyla da test edildi.
2. Gerçek insan/fotogerçekçi asset isteniyorsa lisanslı, web-uyumlu, skinned GLB bul; mevcut Quaternius modelini ancak tek oyuncu preview ve performans testinden sonra değiştir. Var olan model low-poly olduğu için fotogerçekçilik hedefi henüz bitmedi.
3. Sonraki AI adımları: top bizde değilken takım blok yüksekliği/hat kaydırma, rakibi markalama, pas arası koşusu, açık pas koridoru ve şut açısını simülasyon testleriyle iyileştir. eFootball'un iç AI'sı yayımlanmadığı için bu tasarım futbol taktiklerine dayanır; eşdeğerlik iddiası yapma.
4. Kaleci tutma/çelme davranışını gerçek oyun akışında test et; saha dışına çıkan şut, orta ve yüksekten gelen top senaryolarında el yüksekliği animasyonunu ayarla.
5. Her değişiklikte `npm test`, dört JS dosyası için `node --check`, `git diff --check`, browser console ve 16:9/mobil render kontrolü yap.

### Devir Anı Doğrulama

- Devir değişiklikleri ve bu not dosyası aynı Git geçmişine alınmalı; yeni hesap açıldığında `git status --short --branch` ile temizliği, `git log -1 --oneline --decorate` ile `origin/main` eşitliğini doğrula.
- `host.js` içindeki seyirci yerleşimi son bir 16:9 göz kontrolünden geçti; yayın sonrası aynı sahne yeni hesapta açılabiliyor olmalı.
- ARA hedef/koşu/ilk dokunuş, stamina tüketim-toparlanma, pressure destek sayısı, sprintte topun daha çok açılması ve slide/foul senaryoları deterministik Node testleriyle geçti.
- Son browser kontrollerinde JS hatası yoktu; 16:9 canvas çalışıyordu ve gamepad butonları çakışmıyordu.
- 2026-10-04 ek doğrulama: `npm test` 14/14 geçti; dört JS dosyasının syntax kontrolleri ve `git diff --check` temiz. İki controller tarayıcı oturumu takım seçip maça geçti. Beş CC0 ses dosyasının browser metadata decode'u başarılı; crowd 138s, goal cheer 8s. İsim etiketleri topa yakın oyuncular/kontrolcü oyuncusu için küçük ve çerçevesiz görünür; idle oyuncular topa döner. CPU takımına verilen korner/taç otomatik oynanır; taç vuruşu saha içine yönlendirilir.
- Yeni Casual Male GLB browser sahnesinde yüklendi; mevcut iki takım forması görünür. Saha oyuncuları hâlâ low-poly ve fotogerçekçi değiller. Daha gerçekçi futbolcu GLB'si için blender-only OpenGameArt modelini dönüştürmek üzere Blender gerekir; kullanıcının ortamında Blender/FFmpeg kurulu değil.
- Araştırma için oluşturulan PNG ekran görüntüleri temizlendi.

## Son değişiklikler (saha, orantı, aut/taç)

- **Saha**: `host.js` dokuyu `assets/textures/pitch.png` yolundan arıyordu, dosya `assets/pitch.png`'de olduğu için hep yedek çizim görünüyordu. Yol düzeltildi. `pitch.png`, `football_court.glb` içindeki saha dokusuyla birebir aynı.
- **Orantı**: top yarıçapı 0.48 → 0.2 (`game.js` içinde `BR`), oyuncu boyu ~2 m (`PLAYER_SCALE = 0.84`).
- **Taç**: artık gerçek el atışı (9–22 m/s). Dokunup bırakmak yakına atar, uzağa atmak için parmağı uzun çekmek gerekir. Saha dışına doğru çekilen yön içeri çevrilir.
- **Aut (kale vuruşu)**: top çıkınca ayrı `goalkick` durumu başlar, kaleci kale alanından vurur.
- **Aut modu (telefon)**: aut, taç ve korner'de vuruşu yapan oyuncunun telefonu gamepad yerine tam ekran nişan alanına geçer. Parmağı atılacak yöne düz çek, uzunluk = güç, bırakınca atar (`c2h {t:'aim', x, y, p}` → `game.restartKick`). Kaleci topu elinde tutunca da aynı mod açılır.
- Testler: `npm test` (23 test).
