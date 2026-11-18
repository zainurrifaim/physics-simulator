export default {
  id: 'derek',
  number: '02',
  short: 'Derek',
  title: 'Derek Pengangkat',
  category: 'Usaha & Daya',
  tags: ['Daya', 'Usaha'],
  minutes: 15,
  problem:
    'Kekuatan derek (crane) adalah 20 kW. Derek digunakan untuk mengangkat kotak bermassa 200 kg dalam 50 detik. Jarak benda dari lantai adalah 15 m. Apakah derek mampu mengangkat kotak tersebut? (g = 10 m/s²)',
  preset: { mass: 200, height: 15, time: 50, power: 20000 },
  fields: [
    { key: 'mass', label: 'Massa kotak', symbol: 'm', unit: 'kg', min: 50, max: 10000, step: 50 },
    { key: 'height', label: 'Tinggi angkat', symbol: 'h', unit: 'm', min: 2, max: 30, step: 1 },
    { key: 'time', label: 'Waktu yang diminta', symbol: 't', unit: 's', min: 5, max: 120, step: 1 },
    { key: 'power', label: 'Daya derek', symbol: 'P', unit: 'W', min: 500, max: 50000, step: 500 },
  ],
  formula: 'W = F · s &nbsp;&nbsp; P = W / t',
  assumptions:
    'Daya derek dianggap seluruhnya menjadi daya mekanik untuk mengangkat (efisiensi ideal). Kotak naik dengan kecepatan tetap sehingga tegangan tali sama dengan gaya berat. Bila daya kurang, simulasi tidak menyatakan "mustahil", tetapi menunjukkan waktu minimum yang lebih lama.',
  compare: {
    question: 'Derek 20 kW, waktu 50 s. Peti 200 kg atau 10.000 kg — masih mampu?',
    sub: 'Derek yang sama mengangkat peti setinggi 15 m. Massa B 50 kali massa A. g = 10 m/s².',
    options: ['Keduanya mampu', 'Hanya A', 'Hanya B', 'Tidak ada'],
    correct: 1,
    key: 'mass',
    B: { mass: 10000 },
    tag: (p, f) => `${f(p.mass)} kg`,
    detail: (p, r, f) => (r.ok ? `butuh ${f(r.required)} W ✓` : `butuh ${f(r.required)} W ✗ · perlu ${f(r.minTime, 1)} s`),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.required)} W</span> ≤ ${f(A.power)} W ${rB.ok ? '≥' : '&lt;'} <span class="b">${f(rB.required)} W</span>`,
    caption: (A, rA, B, rB, f) => `P = W / t = m · g · h / t — dengan waktu yang sama, massa ${f(B.mass / A.mass)}× butuh daya ${f(rB.required / rA.required)}×`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? `Hanya A. Peti B butuh ${f(rB.required)} W; dengan 20 kW derek perlu ${f(rB.minTime, 1)} s, bukan 50 s.` : rA.ok && rB.ok ? 'Keduanya mampu.' : 'Daya derek tidak cukup.',
    diagram: 'Diagram gaya pada peti',
    forces: (p, r) => [
      { dx: 0, dy: -1, value: r.weight, label: 'T' },
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'usaha oleh derek', unit: 'J', fn: (s) => s.potential },
  },
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W = F · s = ${f(r.weight)} × ${f(p.height)} = ${f(r.work)} J`,
    `P<sub>butuh</sub> = W / t = ${f(r.work)} / ${f(p.time)} = <b>${f(r.required)} W</b>`,
    r.ok
      ? `P<sub>derek</sub> = ${f(p.power)} W ≥ ${f(r.required)} W → derek <b>mampu</b>.`
      : `P<sub>derek</sub> = ${f(p.power)} W < ${f(r.required)} W → waktu minimum t = W / P = ${f(r.minTime, 2)} s.`,
  ],
  worksheet: {
    question: 'Berapa daya yang dibutuhkan untuk mengangkat kotak pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat F<sub>g</sub>', correct: 'down', magnitude: 2000 },
      { key: 'T', label: 'Gaya angkat (tegangan tali) T', correct: 'up', magnitude: 2000 },
      { key: 's', label: 'Perpindahan s', correct: 'up' },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa: derek di atas, kotak di bawah, ketinggian 15 m.',
      'Label: P = 20 kW = 20.000 W, m = 200 kg, t = 50 s, h = 15 m.',
      'Diagram vektor: F<sub>g</sub> ke bawah (2.000 N), gaya angkat ke atas (≥ 2.000 N), s ke atas (15 m).',
      'Perhitungan W = 30.000 J, P = 600 W, lalu dibandingkan dengan 20.000 W.',
    ],
    reflection: 'Usaha dan daya sama-sama berhubungan dengan energi. Apa bedanya? Gunakan hasil eksperimenmu saat mengubah waktu angkat.',
  },
};
