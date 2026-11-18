export default {
  id: 'derek',
  number: '02',
  short: 'Derek',
  title: 'Derek Pengangkat',
  category: 'Usaha & Daya',
  tags: ['Daya', 'Usaha'],
  minutes: 15,
  color: 'sand',
  description: 'Angkat sebuah peti dan selidiki perbedaan antara usaha dan daya.',
  hook: 'Derek 20 kW, peti 200 kg, 50 detik. Mampukah?',
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
  prediction: {
    question: 'Daya yang dibutuhkan untuk mengangkat kotak dalam 50 detik itu…',
    options: ['Jauh lebih kecil dari 20 kW', 'Hampir sama dengan 20 kW', 'Lebih besar dari 20 kW'],
    correct: 0,
  },
  story: (p, r, f) => [
    { caption: 'Mampukah derek ini?', sub: 'Sebuah derek di lokasi proyek akan mengangkat peti ke lantai atas.', layers: [], t: 'start' },
    { caption: `P = ${f(p.power / 1000)} kW · m = ${f(p.mass)} kg`, sub: `Peti harus naik ${f(p.height)} m dalam ${f(p.time)} detik.`, layers: ['labels'], t: 'start' },
    { caption: 'Tali menarik, bumi menarik', sub: `Tegangan tali T ke atas, gaya berat F<sub>g</sub> = ${f(r.weight)} N ke bawah, perpindahan s ke atas.`, layers: ['labels', 'forces', 'motion'], t: 'start' },
    { caption: 'Mulai mengangkat', sub: 'Usaha bertambah sedikit demi sedikit setiap detik — itulah daya.', layers: ['labels', 'forces', 'motion'], t: 'play' },
    {
      caption: 'Usaha, lalu daya',
      layers: ['labels'],
      t: 'end',
      equation: [`W = F · s = ${f(r.weight)} N × ${f(p.height)} m = ${f(r.work)} J`, 'P = W / t', `P = ${f(r.work)} J / ${f(p.time)} s = <b>${f(r.required)} W</b>`],
    },
    { caption: r.ok ? `${f(r.required)} W ≪ ${f(p.power)} W → MAMPU` : `Butuh ${f(r.required)} W → terlalu lambat`, sub: 'Kemiringan grafik usaha terhadap waktu adalah daya.', layers: ['labels'], t: 'end', chart: true },
  ],
  worked: (p, r, f) => [
    `F<sub>g</sub> = m · g = ${f(p.mass)} × 10 = ${f(r.weight)} N`,
    `W = F · s = ${f(r.weight)} × ${f(p.height)} = ${f(r.work)} J`,
    `P<sub>butuh</sub> = W / t = ${f(r.work)} / ${f(p.time)} = <b>${f(r.required)} W</b>`,
    r.ok
      ? `P<sub>derek</sub> = ${f(p.power)} W ≥ ${f(r.required)} W → derek <b>mampu</b>.`
      : `P<sub>derek</sub> = ${f(p.power)} W < ${f(r.required)} W → waktu minimum t = W / P = ${f(r.minTime, 2)} s.`,
  ],
  summary: (p, r, f) => ({
    message: r.ok ? 'Daya derek cukup untuk waktu yang diminta.' : 'Daya kurang: pengangkatan butuh waktu lebih lama.',
    metrics: [
      ['Usaha', `${f(r.work)} J`],
      ['Daya yang dibutuhkan', `${f(r.required)} W`],
      ['Waktu minimum', `${f(r.minTime, 2)} s`],
    ],
  }),
  chart: {
    yLabel: 'Usaha',
    yUnit: 'J',
    series: () => [{ label: 'Usaha oleh tali W', kind: 'energy', fn: (s) => s.potential }],
    lines: (p, r) => [{ label: 'Usaha total', value: r.work }],
    note: 'Garis lurus: usaha bertambah dengan laju tetap. Makin curam garisnya, makin besar daya.',
  },
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
