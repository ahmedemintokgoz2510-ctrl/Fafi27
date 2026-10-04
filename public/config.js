// Fafi 27 ayarları. Takım, kadro ve diziliş bilgileri buradan değiştir.
// logo: 'assets/logos/dosya.png' gibi bir yol yaz (boşsa logo gösterilmez).
window.FAFI = {
  durations: [3, 5, 8], // dakika
  teams: [
    {
      name: 'FC Barcelona', short: 'FCB', color: '#17479e', color2: '#a50044', shortsColor: '#a50044', logo: null,
      players: [
        { name: 'Joan Garcia', number: 1, role: 'GK', appearance: { skin: '#d7b18f', hair: '#3a2921' }, stats: { pace: 68, shooting: 26, passing: 52, defending: 79, power: 56, preferredFoot: 'R' } },
        { name: 'Joao Cancelo', number: 2, role: 'DF', appearance: { skin: '#b98765', hair: '#211d19' }, stats: { pace: 89, shooting: 58, passing: 80, defending: 78, power: 71, preferredFoot: 'R' } },
        { name: 'Jules Kounde', number: 23, role: 'DF', appearance: { skin: '#855a40', hair: '#141312' }, stats: { pace: 86, shooting: 45, passing: 74, defending: 84, power: 68, preferredFoot: 'R' } },
        { name: 'Pau Cubarsi', number: 5, role: 'DF', appearance: { skin: '#ddb99b', hair: '#3b2820' }, stats: { pace: 79, shooting: 38, passing: 75, defending: 85, power: 63, preferredFoot: 'L' } },
        { name: 'Alejandro Balde', number: 3, role: 'DF', appearance: { skin: '#80543d', hair: '#141312' }, stats: { pace: 91, shooting: 58, passing: 76, defending: 79, power: 69, preferredFoot: 'L' } },
        { name: 'Frenkie de Jong', number: 21, role: 'MF', appearance: { skin: '#e0c09f', hair: '#6a4933' }, stats: { pace: 81, shooting: 73, passing: 88, defending: 82, power: 78, preferredFoot: 'R' } },
        { name: 'Pedri', number: 8, role: 'MF', appearance: { skin: '#d7b08f', hair: '#55372c' }, stats: { pace: 86, shooting: 78, passing: 90, defending: 75, power: 70, preferredFoot: 'R' } },
        { name: 'Gavi', number: 6, role: 'MF', appearance: { skin: '#e2c29f', hair: '#73523b' }, stats: { pace: 88, shooting: 79, passing: 80, defending: 66, power: 72, preferredFoot: 'R' } },
        { name: 'Raphinha', number: 11, role: 'FW', appearance: { skin: '#82573f', hair: '#151311' }, stats: { pace: 91, shooting: 87, passing: 80, defending: 44, power: 83, preferredFoot: 'R' } },
        { name: 'Gabriel Jesus', number: 9, role: 'FW', appearance: { skin: '#b98260', hair: '#211916' }, stats: { pace: 82, shooting: 81, passing: 79, defending: 48, power: 69, preferredFoot: 'R' } },
        { name: 'Lamine Yamal', number: 10, role: 'FW', appearance: { skin: '#b98667', hair: '#171414' }, stats: { pace: 94, shooting: 81, passing: 82, defending: 47, power: 72, preferredFoot: 'R' } }
      ],
      formation: [
        { role: 'GK', x: -0.92, z: 0 },
        { role: 'DF', x: -0.68, z: -0.62 }, { role: 'DF', x: -0.72, z: -0.2 },
        { role: 'DF', x: -0.72, z: 0.2 }, { role: 'DF', x: -0.68, z: 0.62 },
        { role: 'MF', x: -0.4, z: -0.42 }, { role: 'MF', x: -0.38, z: 0 }, { role: 'MF', x: -0.4, z: 0.42 },
        { role: 'FW', x: -0.18, z: -0.58 }, { role: 'FW', x: -0.12, z: 0 }, { role: 'FW', x: -0.18, z: 0.58 }
      ]
    },
    {
      name: 'Real Madrid', short: 'RMA', color: '#f1eee6', color2: '#d8bd68', shortsColor: '#17191d', logo: null,
      players: [
        { name: 'Thibaut Courtois', number: 1, role: 'GK', appearance: { skin: '#d8b694', hair: '#57402f' }, stats: { pace: 65, shooting: 25, passing: 47, defending: 81, power: 63, preferredFoot: 'R' } },
        { name: 'Raul Asencio', number: 35, role: 'DF', appearance: { skin: '#c99b78', hair: '#2c211b' }, stats: { pace: 78, shooting: 42, passing: 68, defending: 79, power: 76, preferredFoot: 'R' } },
        { name: 'Eder Militao', number: 3, role: 'DF', appearance: { skin: '#9b6e50', hair: '#1a1512' }, stats: { pace: 84, shooting: 39, passing: 70, defending: 84, power: 85, preferredFoot: 'R' } },
        { name: 'Dean Huijsen', number: 4, role: 'DF', appearance: { skin: '#d9b595', hair: '#4b3528' }, stats: { pace: 78, shooting: 42, passing: 71, defending: 84, power: 81, preferredFoot: 'R' } },
        { name: 'Alvaro Carreras', number: 18, role: 'DF', appearance: { skin: '#d6af8d', hair: '#493126' }, stats: { pace: 89, shooting: 61, passing: 74, defending: 78, power: 76, preferredFoot: 'L' } },
        { name: 'Eduardo Camavinga', number: 6, role: 'MF', appearance: { skin: '#785039', hair: '#151311' }, stats: { pace: 85, shooting: 63, passing: 83, defending: 81, power: 70, preferredFoot: 'L' } },
        { name: 'Federico Valverde', number: 8, role: 'MF', appearance: { skin: '#d7b18f', hair: '#4d3528' }, stats: { pace: 87, shooting: 79, passing: 79, defending: 84, power: 84, preferredFoot: 'R' } },
        { name: 'Vinicius Junior', number: 7, role: 'FW', appearance: { skin: '#744b34', hair: '#141210' }, stats: { pace: 96, shooting: 84, passing: 77, defending: 40, power: 74, preferredFoot: 'L' } },
        { name: 'Jude Bellingham', number: 5, role: 'MF', appearance: { skin: '#81563e', hair: '#171411' }, stats: { pace: 82, shooting: 86, passing: 86, defending: 76, power: 85, preferredFoot: 'R' } },
        { name: 'Arda Guler', number: 15, role: 'MF', appearance: { skin: '#c99b78', hair: '#211a16' }, stats: { pace: 80, shooting: 79, passing: 87, defending: 46, power: 61, preferredFoot: 'L' } },
        { name: 'Kylian Mbappe', number: 10, role: 'FW', appearance: { skin: '#69452f', hair: '#121110' }, stats: { pace: 94, shooting: 90, passing: 83, defending: 43, power: 87, preferredFoot: 'R' } }
      ],
      formation: [
        { role: 'GK', x: -0.92, z: 0 },
        { role: 'DF', x: -0.68, z: -0.62 }, { role: 'DF', x: -0.72, z: -0.2 },
        { role: 'DF', x: -0.72, z: 0.2 }, { role: 'DF', x: -0.68, z: 0.62 },
        { role: 'MF', x: -0.43, z: -0.3 }, { role: 'MF', x: -0.43, z: 0.3 },
        { role: 'FW', x: -0.21, z: -0.58 }, { role: 'MF', x: -0.18, z: 0 },
        { role: 'MF', x: -0.21, z: 0.58 }, { role: 'FW', x: -0.06, z: 0 }
      ]
    }
  ],
  // Fallback 4-4-2. Team-specific starting shapes are defined alongside each roster.
  formation: [
    { role: 'GK', x: -0.92, z: 0 },
    { role: 'DF', x: -0.62, z: -0.62 }, { role: 'DF', x: -0.66, z: -0.22 },
    { role: 'DF', x: -0.66, z: 0.22 },  { role: 'DF', x: -0.62, z: 0.62 },
    { role: 'MF', x: -0.38, z: -0.62 }, { role: 'MF', x: -0.4, z: -0.2 },
    { role: 'MF', x: -0.4, z: 0.2 },    { role: 'MF', x: -0.38, z: 0.62 },
    { role: 'FW', x: -0.2, z: -0.14 },  { role: 'FW', x: -0.2, z: 0.14 }
  ]
};
