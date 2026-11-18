# Ruang Fisika — Simulator Usaha dan Energi

Situs belajar fisika berbahasa Indonesia dengan lima simulasi kehidupan sehari-hari, dibuat dari soal di `materials/`:

| # | Modul | Pertanyaan soal asli | Hasil |
|---|-------|----------------------|-------|
| 01 | Atlet Angkat Besi | Cukupkah 500 J untuk 20 kg setinggi 1,5 m? | 300 J → bisa |
| 02 | Derek Pengangkat | Derek 20 kW, 200 kg, 15 m, 50 s — mampu? | 600 W → mampu |
| 03 | Lift dan Muatan | Turun 30 m → 5 m dalam 100 s, 10.000 W, kabin 2.500 kg | muatan maks. 1.500 kg = 15.000 N |
| 04 | Uji Sabuk Pengaman | 36 km/jam, berhenti dalam 0,5 m, dummy 60 kg, sabuk 7.000 N | 6.000 N → tidak robek |
| 05 | Sepeda Menuruni Bukit | Tinggi 80 m, lintasan 160 m, tanpa gesekan | 8 s |

Setiap modul memiliki empat halaman belajar yang dapat dibuka langsung:

- **Prediksi**: pertanyaan A/B berdasarkan soal awal dan pilihan jawaban.
- **Eksperimen**: tambahkan/kurangi beban langsung pada gambar, seret penanda tinggi, kecepatan, jarak pengereman, atau panjang lereng. Setiap penanda mendukung tombol panah keyboard dan kolom angka. Mengubah setup menjeda dan mengulang waktu ke awal.
- **Penjelasan**: persamaan, kesimpulan, serta pilihan grafik, diagram gaya, atau langkah perhitungan. Hasil mengikuti setup A/B saat ini; penilaian prediksi hanya berlaku untuk soal awal.
- **Latihan**: sketsa, vektor satu per satu, perhitungan dengan satuan, dan refleksi. Latihan selalu menggunakan **soal asli**, bukan angka eksperimen yang diubah. Draf, parameter, dan waktu simulasi tersimpan di browser; cetak menampilkan seluruh bagian latihan.

Modul langsung membuka **Eksperimen** dengan satu gambar besar. Tombol A, B, dan A/B memilih satu situasi atau perbandingan. Satu bilah atas memuat pilihan modul, langkah belajar, serta tombol **Atur** untuk membuka parameter dan bantuan interaksi. Hamburger memuat navigasi situs. Grafik dan diagram gaya memenuhi area penjelasan; uraian dan asumsi tersedia melalui **Detail**. Animasi menghormati preferensi pengurangan gerak.

| Modul | A (soal asli) | B (pembanding) | Pelajaran |
|---|---|---|---|
| Angkat besi | 20 kg | 40 kg | massa 2× → energi 2× (600 J > 500 J) |
| Derek | 200 kg | 10.000 kg | waktu sama → daya sebanding massa |
| Lift | muatan 1.500 kg | 2.500 kg | 1.500 kg tepat di batas 10 kW |
| Sabuk | 36 km/jam | 72 km/jam | kecepatan 2× → gaya 4× |
| Sepeda | 80 kg | 160 kg | massa tidak mengubah waktu |

## Menjalankan

Tidak perlu instalasi paket. Situs harus dibuka lewat server lokal (bukan klik dua kali `index.html`).

- **Windows**: klik dua kali `start-server.bat` (memakai Python atau Node.js yang tersedia), lalu buka http://localhost:8000.
- **Python**: `python -m http.server 8000 -d site`
- **Node.js**: `node serve.mjs` (atau `npm start`)

Untuk server sekolah, cukup salin isi folder `site/` ke server web statis mana pun.

## Struktur

```
site/
  index.html
  styles/            base, layout, scene, poster, workspace, print
  src/
    app.js           router (hash) + kerangka halaman
    physics/models.js  model fisika murni (SI, g = 10 m/s²)
    lessons/*.js     teks, preset soal asli, langkah cerita, rubrik per modul
    scenes/*.js      ilustrasi SVG per modul + helper gambar
    components/      interaction (pointer/keyboard/validasi), chart, fbd, worksheet, sketch, fx, icons
    pages/           home, workspace, concepts, notes
    state/storage.js penyimpanan lokal berversi
tests/               physics.test.mjs, interaction.test.mjs
materials/           dokumen soal dan kunci jawaban asli (tidak diubah)
```

## Tes

```
npm test        # atau: node --test tests/*.test.mjs
```

Tes memeriksa kelima hasil soal asli, nilai ambang, konversi satuan, input tidak valid, kekekalan energi, pemetaan gerakan penanda, pembatasan parameter, perubahan hasil per modul, dan batas grafik A/B yang berbeda.

## Catatan model

Semua simulasi memakai model ideal yang asumsinya ditampilkan di setiap modul. Soal lift memerlukan tambahan asumsi (daya = laju maksimum mesin menyerap energi saat turun dengan kecepatan tetap); lihat `PLAN.md`.
