export default {
  id: 'lift',
  interaction: { handles: ['top', 'bottom'], load: 'payload', increment: 50, hint: 'Tambahkan muatan dengan + atau −. Seret penanda lantai awal dan akhir.' },
  number: '03',
  short: 'Lift',
  title: 'Lift dan Muatan',
  category: 'Daya & Energi',
  tags: ['Daya', 'Energi potensial'],
  minutes: 18,
  problem:
    'Lift bergerak turun dari ketinggian 30 m ke 5 m di atas lantai dalam waktu 100 s. Jika daya lift adalah 10.000 W dan massa lift adalah 2.500 kg, berapakah berat maksimum yang dapat dimuat oleh lift? (g = 10 m/s²)',
  preset: { cabin: 2500, payload: 1500, top: 30, bottom: 5, time: 100, power: 10000 },
  fields: [
    { key: 'cabin', label: 'Massa kabin', symbol: 'm<sub>lift</sub>', unit: 'kg', min: 500, max: 5000, step: 100 },
    { key: 'payload', label: 'Massa muatan', symbol: 'm<sub>muatan</sub>', unit: 'kg', min: 0, max: 5000, step: 50 },
    { key: 'top', label: 'Ketinggian awal', symbol: 'h<sub>1</sub>', unit: 'm', min: 10, max: 40, step: 1 },
    { key: 'bottom', label: 'Ketinggian akhir', symbol: 'h<sub>2</sub>', unit: 'm', min: 0, max: 9, step: 1 },
    { key: 'time', label: 'Waktu turun', symbol: 't', unit: 's', min: 20, max: 200, step: 5 },
    { key: 'power', label: 'Daya lift', symbol: 'P', unit: 'W', min: 2000, max: 30000, step: 500 },
  ],
  formula: 'P = F · v &nbsp;&nbsp; v = s / t',
  assumptions:
    'Lift dimodelkan tanpa beban penyeimbang. Saat turun, energi potensial berkurang dan rem mesin menyerap energi itu. Daya lift adalah laju mesin menyerap energi saat lift turun, yaitu energi yang dapat diserap setiap detik. Kecepatan yang diminta dihitung dari jarak turun dibagi waktu. Jika daya cukup, lift turun dengan kecepatan tetap. Jika daya kurang, lift makin cepat. Rem darurat mulai bekerja saat kecepatannya mencapai 115% kecepatan yang diminta. Batas massa dalam perhitungan berlaku untuk kecepatan tersebut. Menambah waktu turun mengurangi kebutuhan daya. Model ini mengabaikan batas kekuatan struktur lift.',
  compare: {
    question: 'Lift mana yang sampai ke lantai tujuan?',
    sub: 'Kedua lift turun dari 30 m ke 5 m dalam 100 detik. Daya lift 10 kW (laju mesin menyerap energi saat turun).',
    experimentQuestion: () => 'Lift mana yang sampai ke lantai tujuan?',
    context: (A, B, f) => [
      A.top === B.top && A.bottom === B.bottom && A.time === B.time
        ? `Turun dari ${f(A.top)} m ke ${f(A.bottom)} m dalam ${f(A.time)} detik.`
        : `A turun dari ${f(A.top)} ke ${f(A.bottom)} m dalam ${f(A.time)} detik. B dari ${f(B.top)} ke ${f(B.bottom)} m dalam ${f(B.time)} detik.`,
      A.cabin === B.cabin && A.power === B.power
        ? `Kabin ${f(A.cabin)} kg, daya lift ${f(A.power / 1000)} kW.`
        : `Kabin A ${f(A.cabin)} kg, rem ${f(A.power / 1000)} kW. Kabin B ${f(B.cabin)} kg, rem ${f(B.power / 1000)} kW.`,
    ].join(' '),
    options: ['Keduanya sampai', 'Hanya A', 'Hanya B', 'Keduanya berhenti lebih awal'],
    correct: 1,
    key: 'payload',
    B: { payload: 2500 },
    tag: (p, f) => `Muatan ${f(p.payload)} kg`,
    detail: (p, r, f) => (r.ok ? `Sampai di ${f(p.bottom)} m dalam ${f(p.time)} detik.` : r.outcome === 'safety' ? `Rem darurat menghentikan lift di ${f(r.stopHeight, 1)} m.` : 'Lift melewati tujuan dan mengenai peredam di dasar.'),
    equation: (A, rA, B, rB, f) =>
      `<span class="a">${f(rA.absorbed)} W</span> ${rA.ok ? '≤' : '&gt;'} ${f(A.power)} W ${rB.ok ? '≥' : '&lt;'} <span class="b">${f(rB.absorbed)} W</span>`,
    caption: (A, rA, B, rB, f) => `P = m<sub>total</sub> · g · v, v = ${f(rA.speed, 2)} m/s — muatan maksimum ${f(Math.max(0, rA.maxPayload))} kg = ${f(rA.maxPayloadWeight)} N`,
    verdict: (A, rA, B, rB, f) =>
      rA.ok && !rB.ok ? `Hanya A sampai ke tujuan. Pada kecepatan ini, rem mesin dapat mengendalikan muatan hingga ${f(rA.maxPayload)} kg. Muatan B membutuhkan daya lift ${f(rB.absorbed)} W, melebihi ${f(B.power)} W yang tersedia.` : rA.ok && rB.ok ? 'Kedua lift sampai ke tujuan.' : 'Daya lift terlampaui. Periksa hasil tiap lift.',
    diagram: 'Diagram gaya pada kabin',
    // the brake can supply at most P / v: an overloaded cabin is NOT in equilibrium
    forces: (p, r) => [
      { dx: 0, dy: -1, value: Math.min(r.weight, p.power / r.speed), label: r.ok ? 'T' : 'T = P/v' },
      { dx: 0, dy: 1, value: r.weight, label: 'F<tspan class="sub" dy="4">g</tspan>' },
    ],
    graph: { label: 'laju turun', unit: 'm/s', fn: (s) => s.speed, line: (p) => ({ value: (p.top - p.bottom) / p.time, label: 'kecepatan normal' }) },
  },
  worked: (p, r, f) => [
    `s = ${f(p.top)} − ${f(p.bottom)} = ${f(r.drop)} m (ke bawah), v = s / t = ${f(r.drop)} / ${f(p.time)} = ${f(r.speed, 4)} m/s`,
    `Cara kunci jawaban: energi yang boleh diserap mesin selama t adalah W = P · t = ${f(p.power * p.time)} J. Energi itu sama dengan energi potensial yang dilepas, F · s, jadi F = W / s = ${f(p.power * p.time)} / ${f(r.drop)} = ${f(r.maxTotalMass * 10)} N`,
    `Cara setara: P = F · v → F = P / (s / t) = ${f(p.power)} × ${f(p.time)} / ${f(r.drop)} = ${f(r.maxTotalMass * 10)} N. Usaha gaya penahan bernilai negatif (gaya ke atas, gerak ke bawah).`,
    `m<sub>total</sub> = F / g = ${f(r.maxTotalMass)} kg → m<sub>muatan</sub> = ${f(r.maxTotalMass)} − ${f(p.cabin)} = ${f(r.maxPayload)} kg`,
    r.maxPayload >= 0
      ? `Berat muatan maksimum = ${f(Math.max(0, r.maxPayload))} × 10 = <b>${f(r.maxPayloadWeight)} N</b>`
      : 'Bahkan kabin kosong sudah melampaui daya lift dalam model ini.',
    `Muatan sekarang ${f(p.payload)} kg membutuhkan daya lift ${f(r.absorbed)} W → ${r.ok ? 'sesuai kemampuan rem mesin' : '<b>melebihi kemampuan rem mesin</b>'}.`,
  ],
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
