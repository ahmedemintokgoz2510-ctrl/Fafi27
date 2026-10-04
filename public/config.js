// Fafi 27 ayarları. Takım, kadro ve diziliş bilgileri buradan değiştir.
// logo: 'assets/logos/dosya.png' gibi bir yol yaz (boşsa logo gösterilmez).
window.FAFI = {
  durations: [3, 5, 8], // dakika
  teams: [
    {
      name: 'FC Barcelona', short: 'FCB', color: '#17479e', color2: '#a50044', logo: null,
      players: [
        { name: 'Joan Garcia', number: 1 }, { name: 'Joao Cancelo', number: 2 },
        { name: 'Jules Kounde', number: 23 }, { name: 'Pau Cubarsi', number: 5 },
        { name: 'Alejandro Balde', number: 3 }, { name: 'Frenkie de Jong', number: 21 },
        { name: 'Pedri', number: 8 }, { name: 'Gavi', number: 6 },
        { name: 'Dani Olmo', number: 20 }, { name: 'Lamine Yamal', number: 10 },
        { name: 'Raphinha', number: 11 }
      ]
    },
    {
      name: 'Real Madrid', short: 'RMA', color: '#f1eee6', color2: '#d8bd68', logo: null,
      players: [
        { name: 'Thibaut Courtois', number: 1 }, { name: 'Trent Alexander-Arnold', number: 12 },
        { name: 'Ibrahima Konate', number: 16 }, { name: 'Dean Huijsen', number: 4 },
        { name: 'Alvaro Carreras', number: 18 }, { name: 'Jude Bellingham', number: 5 },
        { name: 'Eduardo Camavinga', number: 6 }, { name: 'Federico Valverde', number: 8 },
        { name: 'Aurelien Tchouameni', number: 14 }, { name: 'Vinicius Junior', number: 7 },
        { name: 'Kylian Mbappe', number: 10 }
      ]
    }
  ],
  // 4-4-2. x: kendi kalesinden orta sahaya (-1 = kale çizgisi, 0 = orta saha), z: saha genişliği
  formation: [
    { role: 'GK', x: -0.92, z: 0 },
    { role: 'DF', x: -0.62, z: -0.62 }, { role: 'DF', x: -0.66, z: -0.22 },
    { role: 'DF', x: -0.66, z: 0.22 },  { role: 'DF', x: -0.62, z: 0.62 },
    { role: 'MF', x: -0.38, z: -0.62 }, { role: 'MF', x: -0.4, z: -0.2 },
    { role: 'MF', x: -0.4, z: 0.2 },    { role: 'MF', x: -0.38, z: 0.62 },
    { role: 'FW', x: -0.2, z: -0.14 },  { role: 'FW', x: -0.2, z: 0.14 }
  ]
};
