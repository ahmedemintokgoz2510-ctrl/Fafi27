// Fafi 27 ayarları. Takım, kadro ve diziliş bilgileri buradan değiştir.
// logo: 'assets/logos/dosya.png' gibi bir yol yaz (boşsa logo gösterilmez).
window.FAFI = {
  durations: [3, 5, 8], // dakika
  teams: [
    {
      name: 'FC Barcelona', short: 'FCB', color: '#17479e', color2: '#a50044', shortsColor: '#a50044', logo: null,
      players: [
        { name: 'Joan Garcia', number: 1, role: 'GK', stats: { pace: 68, shooting: 26, passing: 52, defending: 79, power: 56, preferredFoot: 'R' } },
        { name: 'Joao Cancelo', number: 2, role: 'DF', stats: { pace: 89, shooting: 58, passing: 80, defending: 78, power: 71, preferredFoot: 'R' } },
        { name: 'Jules Kounde', number: 23, role: 'DF', stats: { pace: 86, shooting: 45, passing: 74, defending: 84, power: 68, preferredFoot: 'R' } },
        { name: 'Pau Cubarsi', number: 5, role: 'DF', stats: { pace: 79, shooting: 38, passing: 75, defending: 85, power: 63, preferredFoot: 'L' } },
        { name: 'Alejandro Balde', number: 3, role: 'DF', stats: { pace: 91, shooting: 58, passing: 76, defending: 79, power: 69, preferredFoot: 'L' } },
        { name: 'Frenkie de Jong', number: 21, role: 'MF', stats: { pace: 81, shooting: 73, passing: 88, defending: 82, power: 78, preferredFoot: 'R' } },
        { name: 'Pedri', number: 8, role: 'MF', stats: { pace: 86, shooting: 78, passing: 90, defending: 75, power: 70, preferredFoot: 'R' } },
        { name: 'Gavi', number: 6, role: 'MF', stats: { pace: 88, shooting: 79, passing: 80, defending: 66, power: 72, preferredFoot: 'R' } },
        { name: 'Dani Olmo', number: 20, role: 'MF', stats: { pace: 86, shooting: 84, passing: 83, defending: 60, power: 75, preferredFoot: 'R' } },
        { name: 'Lamine Yamal', number: 10, role: 'FW', stats: { pace: 94, shooting: 81, passing: 82, defending: 47, power: 72, preferredFoot: 'R' } },
        { name: 'Raphinha', number: 11, role: 'FW', stats: { pace: 91, shooting: 87, passing: 80, defending: 44, power: 83, preferredFoot: 'R' } }
      ]
    },
    {
      name: 'Real Madrid', short: 'RMA', color: '#f1eee6', color2: '#d8bd68', shortsColor: '#17191d', logo: null,
      players: [
        { name: 'Thibaut Courtois', number: 1, role: 'GK', stats: { pace: 65, shooting: 25, passing: 47, defending: 81, power: 63, preferredFoot: 'R' } },
        { name: 'Trent Alexander-Arnold', number: 12, role: 'DF', stats: { pace: 88, shooting: 62, passing: 84, defending: 77, power: 70, preferredFoot: 'R' } },
        { name: 'Ibrahima Konate', number: 16, role: 'DF', stats: { pace: 76, shooting: 48, passing: 68, defending: 87, power: 79, preferredFoot: 'R' } },
        { name: 'Dean Huijsen', number: 4, role: 'DF', stats: { pace: 78, shooting: 42, passing: 71, defending: 84, power: 81, preferredFoot: 'R' } },
        { name: 'Alvaro Carreras', number: 18, role: 'DF', stats: { pace: 89, shooting: 61, passing: 74, defending: 78, power: 76, preferredFoot: 'L' } },
        { name: 'Jude Bellingham', number: 5, role: 'MF', stats: { pace: 82, shooting: 86, passing: 86, defending: 76, power: 85, preferredFoot: 'R' } },
        { name: 'Eduardo Camavinga', number: 6, role: 'MF', stats: { pace: 85, shooting: 63, passing: 83, defending: 81, power: 70, preferredFoot: 'L' } },
        { name: 'Federico Valverde', number: 8, role: 'MF', stats: { pace: 87, shooting: 79, passing: 79, defending: 84, power: 84, preferredFoot: 'R' } },
        { name: 'Aurelien Tchouameni', number: 14, role: 'MF', stats: { pace: 75, shooting: 62, passing: 82, defending: 88, power: 81, preferredFoot: 'R' } },
        { name: 'Vinicius Junior', number: 7, role: 'FW', stats: { pace: 96, shooting: 84, passing: 77, defending: 40, power: 74, preferredFoot: 'L' } },
        { name: 'Kylian Mbappe', number: 10, role: 'FW', stats: { pace: 94, shooting: 90, passing: 83, defending: 43, power: 87, preferredFoot: 'R' } }
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
