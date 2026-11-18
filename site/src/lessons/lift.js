export default {
  id: 'lift',
  number: '03',
  short: 'Lift',
  title: 'Lift dan Muatan',
  category: 'Daya & Energi',
  tags: ['Daya', 'Energi potensial'],
  minutes: 18,
  color: 'lilac',
  description: 'Ikuti perjalanan lift dan pahami energi yang diserap pengereman.',
  hook: 'Lift turun 25 m dalam 100 s. Berapa muatan maksimumnya?',
  problem:
    'Lift bergerak turun dari ketinggian 30 m ke 5 m di atas lantai dalam waktu 100 s. Jika daya lift adalah 10.000 W dan massa lift adalah 2.500 kg, berapakah berat maksimum yang dapat dimuat oleh lift? (g = 10 m/s²)',
  preset: { cabin: 2500, payload: 1500, top: 30, bottom: 5, time: 100, power: 10000 },
  fields: [
    { key: 'cabin', label: 'Massa kabin', symbol: 'm<sub>lift</sub>', unit: 'kg', min: 500, max: 5000, step: 100 },
    { key: 'payload', label: 'Massa muatan', symbol: 'm<sub>muatan</sub>', unit: 'kg', min: 0, max: 5000, step: 50 },
    { key: 'top', label: 'Ketinggian awal', symbol: 'h<sub>1</sub>', unit: 'm', min: 10, max: 40, step: 1 },
    { key: 'bottom', label: 'Ketinggian akhir', symbol: 'h<sub>2</sub>', unit: 'm', min: 0, max: 9, step: 1 },
    { key: 'time', label: 'Waktu turun', symbol: 't', unit: 's', min: 20, max: 200, step: 5 },
    { key: 'power', label: 'Daya maksimum lift', symbol: 'P', unit: 'W', min: 2000, max: 30000, step: 500 },
  ],
  formula: 'P = F · v &nbsp;&nbsp; v = s / t',
  assumptions:
    'Model pengajaran: lift tanpa beban penyeimbang turun dengan kecepatan tetap. Gaya penahan (tali/motor) ke atas sama dengan berat total dan melakukan usaha negatif. Daya 10.000 W dianggap sebagai laju maksimum mesin menyerap energi yang dilepaskan gravitasi. Batas struktur dan keselamatan lain diabaikan — hasilnya bukan kapasitas resmi lift sungguhan.',
  prediction: {
    question: 'Berapa kira-kira massa muatan maksimum lift ini?',
    options: ['Kurang dari 1.000 kg', 'Antara 1.000 dan 2.000 kg', 'Lebih dari 2.000 kg'],
    correct: 1,
  },
  story: (p, r, f) => [
    { caption: 'Seberapa berat muatannya?', sub: 'Sebuah lift turun perlahan dari lantai atas ke lantai bawah.', layers: [], t: 'start' },
    { caption: `Dari ${f(p.top)} m ke ${f(p.bottom)} m dalam ${f(p.time)} s`, sub: `Perpindahan s = ${f(p.top)} − ${f(p.bottom)} = ${f(r.drop)} m ke bawah. Massa kabin ${f(p.cabin)} kg, daya ${f(p.power)} W.`, layers: ['labels'], t: 'start' },
    { caption: 'Berat ke bawah, gerak ke bawah', sub: 'Gaya berat total searah perpindahan. Tali menahan ke atas agar kecepatan tetap.', layers: ['labels', 'forces', 'motion'], t: 'start' },
    { caption: 'Turun dengan kecepatan tetap', sub: `v = s / t = ${f(r.drop)} / ${f(p.time)} = ${f(r.speed, 3)} m/s. Energi potensial berkurang dan diserap mesin.`, layers: ['labels', 'forces', 'motion'], t: 'play' },
    {
      caption: 'Dari daya ke massa',
      layers: ['labels'],
      t: 'end',
      equation: [
        `W = P · t = ${f(p.power)} × ${f(p.time)} = ${f(p.power * p.time)} J`,
        `F = W / s = ${f(p.power * p.time)} / ${f(r.drop)} = ${f(r.maxTotalMass * 10)} N → m<sub>total</sub> = ${f(r.maxTotalMass)} kg`,
        `m<sub>muatan</sub> = ${f(r.maxTotalMass)} − ${f(p.cabin)} = ${f(r.maxPayload)} kg → <b>${f(r.maxPayloadWeight)} N</b>`,
      ],
    },
    { caption: `Muatan maks. ${f(Math.max(0, r.maxPayload))} kg`, sub: 'Energi potensial yang hilang sama dengan energi yang diserap mesin.', layers: ['labels'], t: 'end', chart: true },
  ],
  worked: (p, r, f) => [
    `s = ${f(p.top)} − ${f(p.bottom)} = ${f(r.drop)} m (ke bawah), v = s / t = ${f(r.speed, 3)} m/s`,
    `Cara kunci jawaban: W = P · t = ${f(p.power * p.time)} J, F = W / s = ${f(r.maxTotalMass * 10)} N`,
    `Cara setara: P = F · v → F = ${f(p.power)} / ${f(r.speed, 3)} = ${f(r.maxTotalMass * 10)} N`,
    `m<sub>total</sub> = F / g = ${f(r.maxTotalMass)} kg → m<sub>muatan</sub> = ${f(r.maxTotalMass)} − ${f(p.cabin)} = ${f(r.maxPayload)} kg`,
    r.maxPayload >= 0
      ? `Berat muatan maksimum = ${f(Math.max(0, r.maxPayload))} × 10 = <b>${f(r.maxPayloadWeight)} N</b>`
      : 'Bahkan kabin kosong sudah melampaui daya maksimum dalam model ini.',
    `Muatan sekarang ${f(p.payload)} kg: daya yang harus diserap ${f(r.absorbed)} W → ${r.ok ? 'masih aman' : '<b>melebihi batas</b>'}.`,
  ],
  summary: (p, r, f) => ({
    message: r.maxPayload < 0 ? 'Kabin kosong pun melampaui batas daya.' : r.ok ? 'Muatan saat ini masih di bawah batas.' : 'Muatan saat ini melebihi batas daya lift.',
    metrics: [
      ['Muatan maksimum', `${f(Math.max(0, r.maxPayload))} kg`],
      ['Berat muatan maksimum', `${f(r.maxPayloadWeight)} N`],
      ['Daya yang diserap', `${f(r.absorbed)} W`],
    ],
  }),
  chart: {
    yLabel: 'Energi',
    yUnit: 'J',
    series: () => [
      { label: 'Energi potensial E<sub>p</sub>', kind: 'energy', fn: (s) => s.potential },
      { label: 'Energi diserap mesin', kind: 'absorbed', fn: (s) => s.absorbed },
    ],
    note: 'Energi potensial berkurang dengan laju tetap; energi yang sama diserap oleh mesin lift.',
  },
  worksheet: {
    question: 'Berapa berat (gaya berat) maksimum muatan lift pada soal asli?',
    vectors: [
      { key: 'Fg', label: 'Gaya berat total F<sub>g</sub> (kabin + muatan maks.)', correct: 'down', magnitude: 40000 },
      { key: 's', label: 'Perpindahan s', correct: 'down' },
    ],
    directions: ['up', 'down', 'left', 'right'],
    rubric: [
      'Sketsa posisi awal: lift di ketinggian 30 m; posisi akhir: 5 m.',
      'Perpindahan s = 30 − 5 = 25 m ke bawah.',
      'Diagram vektor: gaya berat total ke bawah, perpindahan ke bawah (25 m), label P, t, m<sub>lift</sub>.',
      'Perhitungan W = 1.000.000 J, F = 40.000 N, m<sub>total</sub> = 4.000 kg, muatan 1.500 kg = 15.000 N.',
    ],
    reflection: 'Mengapa lift yang turun lebih lambat dapat membawa muatan lebih besar dalam model ini? Uji dengan mengubah waktu turun.',
  },
};
