# Fafi 27

Akıllı tahtada açılan, telefonların gamepad olduğu 2 kişilik futbol oyunu.

## Çalıştırma
```
npm install
npm start
```
Tahtada `http://localhost:3000` aç. Telefonlar localhost'a ulaşamaz; iki yol var:
- **Render'a yükle** (Mortal Kombat oyunundaki gibi): GitHub reposuna koy, Render'da Web Service oluştur
  (Build: `npm install`, Start: `npm start`). Tahtada Render adresini aç, farklı Wi-Fi'lerden oynanır.
- Aynı Wi-Fi'de: tahtada `http://BİLGİSAYAR-IP:3000` aç.

## Akış
Ana menü (süre 3/5/8 dk, ses) → Oyna → QR kod → iki telefon okutur → takım seçimi → maç.

## Telefon kontrolleri
- Sol yarı: joystick (ekranda neresine dokunursan orası merkez olur)
- ŞUT: basılı tut, bırakınca vurur (ne kadar uzun tutarsan o kadar sert)
- PAS: joystick yönündeki en uygun oyuncuya
- DEĞİŞ: topa en yakın başka oyuncuyu kontrol et (normalde otomatik geçer)

## Dosyalar
- `config.js` takım adı/renk/logo, diziliş (4-4-2)
- `js/game.js` oyun mantığı (11'e 11, yapay zeka, kaleci, gol, aut, korner)
- `js/host.js` tahta ekranı (three.js), menü, ağ
- `js/controller.js` + `controller.html` telefon gamepad
- `assets/` logolar, sesler, modeller (bkz. `assets/README.txt`)

## Sonraki adım
Penaltı ve frikik (çizerek vuruş, kaleci seçimi, yakın kale kamerası), faul, ofsayt.
