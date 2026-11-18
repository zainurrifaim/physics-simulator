export default {
  id: 'sabuk',
  number: '04',
  short: 'Sabuk pengaman',
  title: 'Uji Sabuk Pengaman',
  category: 'Usaha & Energi Kinetik',
  tags: ['Energi kinetik', 'Gaya'],
  minutes: 15,
  color: 'peach',
  description: 'Uji tabrak dengan dummy. Apakah sabuk pengaman sanggup menahan?',
  hook: 'Mobil 36 km/jam menabrak dinding. Robekkah sabuknya?',
  problem:
    'Mobil bermassa 1.500 kg bergerak dengan kecepatan 36 km/jam dan menabrak dinding. Mobil melambat dari 36 km/jam hingga diam dalam jarak 0,5 m. Jika massa dummy adalah 60 kg dan sabuk pengaman robek pada gaya sebesar 7.000 N, tentukan apakah sabuk pengaman robek atau tidak. (g = 10 m/s²)',
  preset: { speed: 36, distance: 0.5, mass: 60, limit: 7000, carMass: 1500 },
  fields: [
    { key: 'speed', label: 'Kecepatan awal', symbol: 'v<sub>0</sub>', unit: 'km/jam', min: 10, max: 120, step: 1 },
    { key: 'distance', label: 'Jarak pengereman', symbol: 's', unit: 'm', min: 0.1, max: 2, step: 0.05 },
    { key: 'mass', label: 'Massa dummy', symbol: 'm', unit: 'kg', min: 20, max: 120, step: 1 },
    { key: 'limit', label: 'Kekuatan sabuk', symbol: 'F<sub>maks</sub>', unit: 'N', min: 1000, max: 30000, step: 500 },
    { key: 'carMass', label: 'Massa mobil', symbol: 'M', unit: 'kg', min: 500, max: 3000, step: 50 },
  ],
  formula: 'v² = v<sub>0</sub>² + 2as &nbsp;&nbsp; F = m · a',
  assumptions:
    'Perlambatan dianggap konstan selama 0,5 m, dan sabuk memberikan seluruh gaya horizontal yang menghentikan dummy. Gaya 6.000 N adalah gaya rata-rata model, bukan puncak gaya tabrakan sungguhan. Massa mobil hanya konteks — gaya pada sabuk ditentukan massa dummy. Sabuk dianggap robek bila F ≥ kekuatan sabuk.',
  prediction: {
    question: 'Menurutmu, apakah sabuk pengaman akan robek?',
    options: ['Tidak robek', 'Robek', 'Tergantung massa mobil'],
    correct: 0,
  },
  story: (p, r, f) => [
    { caption: 'Uji tabrak!', sub: 'Mobil baru diuji menabrak dinding. Sensor gaya dipasang di sabuk pengaman dummy.', layers: [], t: 'start' },
    { caption: `${f(p.speed)} km/jam = ${f(r.v0, 2)} m/s`, sub: `Mobil berhenti dalam ${f(p.distance)} m. Dummy ${f(p.mass)} kg, sabuk robek pada ${f(p.limit)} N.`, layers: ['labels', 'motion'], t: 'start' },
    { caption: 'Brak!', sub: 'Mobil melambat hingga diam. Sabuk menarik dummy ke belakang agar ikut berhenti.', layers: ['labels', 'forces', 'motion'], t: 'play' },
    {
      caption: 'Seberapa besar perlambatannya?',
      layers: ['labels', 'forces'],
      t: 'end',
      equation: ['v² = v<sub>0</sub>² + 2as', `0 = ${f(r.v0, 2)}² + 2 · a · ${f(p.distance)}`, `a = <b>${f(r.acceleration, 2)} m/s²</b>`],
    },
    {
      caption: 'Gaya pada dummy',
      layers: ['labels', 'forces'],
      t: 'end',
      equation: ['F = m · |a|', `F = ${f(p.mass)} kg × ${f(Math.abs(r.acceleration), 2)} m/s²`, `F = <b>${f(r.force)} N</b>`],
    },
    { caption: r.fails ? `${f(r.force)} N ≥ ${f(p.limit)} N → ROBEK` : `${f(r.force)} N < ${f(p.limit)} N → TIDAK ROBEK`, sub: 'Kecepatan turun lurus ke nol: perlambatannya tetap.', layers: ['labels'], t: 'end', chart: true },
  ],
  worked: (p, r, f) => [
    `v<sub>0</sub> = ${f(p.speed)} × 1000 / 3600 = ${f(r.v0, 3)} m/s`,
    `v² = v<sub>0</sub>² + 2as → 0 = ${f(r.v0 ** 2, 2)} + 2 · a · ${f(p.distance)} → a = ${f(r.acceleration, 2)} m/s²`,
    `F = m · |a| = ${f(p.mass)} × ${f(Math.abs(r.acceleration), 2)} = <b>${f(r.force)} N</b>`,
    r.fails
      ? `${f(r.force)} N ≥ ${f(p.limit)} N → sabuk <b>robek</b> dalam model ini.`
      : `${f(r.force)} N < ${f(p.limit)} N → sabuk <b>tidak robek</b>.`,
    `Lewat energi: usaha sabuk = −½mv<sub>0</sub>² = −${f(r.kinetic)} J, F = ${f(r.kinetic)} / ${f(p.distance)} = ${f(r.force)} N.`,
  ],
  summary: (p, r, f) => ({
    message: r.fails ? 'Gaya mencapai kekuatan sabuk: sabuk robek.' : 'Gaya masih di bawah kekuatan sabuk.',
    metrics: [
      ['Gaya pada dummy', `${f(r.force)} N`],
      ['Perlambatan', `${f(r.acceleration, 2)} m/s²`],
      ['Waktu berhenti', `${f(r.duration, 3)} s`],
    ],
  }),
  chart: {
    yLabel: 'Kecepatan',
    yUnit: 'm/s',
    series: () => [{ label: 'Kecepatan v', kind: 'velocity', fn: (s) => s.speed }],
    note: 'Kecepatan berkurang secara linear karena perlambatan konstan. Coba gandakan kecepatan awal: gayanya menjadi empat kali.',
  },
  worksheet: {
    question: 'Berapa gaya yang bekerja pada dummy (dan sabuk) pada soal asli?',
    vectors: [
      { key: 'v', label: 'Kecepatan awal v<sub>0</sub>', correct: 'right' },
      { key: 'F', label: 'Gaya sabuk/pengereman F pada dummy', correct: 'left', magnitude: 6000 },
      { key: 'Fg', label: 'Gaya berat dummy F<sub>g</sub>', correct: 'down', magnitude: 600 },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa: mobil bergerak ke kanan (v = 10 m/s) menuju dinding, berhenti dalam 0,5 m.',
      'Dummy di dalam mobil memakai sabuk pengaman.',
      'Diagram vektor: v<sub>0</sub> ke kanan, gaya pengereman ke kiri, gaya berat ke bawah.',
      'Perhitungan v<sub>0</sub> = 10 m/s, a = −100 m/s², F = 6.000 N, dibandingkan dengan 7.000 N.',
    ],
    reflection: 'Mengapa zona remuk (crumple zone) yang memperpanjang jarak berhenti membuat penumpang lebih aman? Ubah jarak pengereman untuk menguji jawabanmu.',
  },
};
