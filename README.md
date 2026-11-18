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

Modul langsung membuka **Eksperimen** dalam perbandingan **A/B**. Kedua situasi memakai satu kontrol waktu. Tombol A atau B memperbesar satu situasi, dan A/B menampilkan keduanya kembali. Pertanyaan di atas gambar menjelaskan apa yang dibandingkan, dengan hasil singkat di bawah setiap gambar. Tombol **Atur** membuka pilihan situasi yang diedit, nilai parameter, dan tampilan gaya. Memilih B untuk diedit tetap dapat dilakukan dalam tampilan A/B. Menu memuat navigasi situs. **Penjelasan** menyediakan kesimpulan, grafik, diagram gaya, dan langkah perhitungan. Saat modul dibuka kembali, nilai dan posisi waktu tersimpan dipulihkan dalam tampilan A/B. **Putar ulang** memulai kembali kedua situasi. Animasi menghormati preferensi pengurangan gerak.

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
    scenes/*.css     gaya khusus tiap ilustrasi modul
  src/
    app.js           router (hash) + kerangka halaman
    physics/models.js  model fisika murni (SI, g = 10 m/s²) + garis waktu tiap hasil
    lessons/*.js     teks, preset soal asli, langkah cerita, rubrik per modul
    lessons/live.js  angka langsung di bawah gambar (dari keadaan yang sama dengan gambar)
    scenes/*.js      ilustrasi SVG per modul: render, kamera, penanda seret, geometri untuk tes
    scenes/rig.js    tubuh manusia dengan panjang anggota tetap (IK dua ruas, 2D dan 3D)
    components/      interaction (pointer/keyboard/validasi), chart, fbd, worksheet, sketch, fx, icons
    pages/           home, workspace, concepts, notes
    state/storage.js penyimpanan lokal berversi
  dev/frames.html    alat pengembang: semua modul × setup × waktu dalam satu halaman
tests/               fisika, interaksi, invarian per bingkai, dan tes geometri tiap ilustrasi
materials/           dokumen soal dan kunci jawaban asli (tidak diubah)
```

## Tes

```
npm test        # atau: node --test tests/*.test.mjs
```

Selain hasil soal asli, nilai ambang, dan validasi input, tes memeriksa **setiap bingkai** animasi
(setup A, B, tiap parameter di batas minimum/maksimum, dan setup acak) terhadap aturan fisika
yang tidak boleh dilanggar gambar:

- panjang lengan dan tungkai tetap; tangan tetap memegang barbel; kaki tetap di lantai; gerak sendi kontinu;
- hasil "tidak bisa" tidak pernah tampak berhasil (barbel jatuh, peti berhenti saat waktu habis atau tidak terangkat, lift direm darurat, dummy membentur dasbor);
- energi selalu seimbang (Ep + Ek + energi yang diserap rem = tetap);
- ukuran di gambar sesuai skala sebenarnya (atau diberi keterangan "diperbesar");
- setup yang tepat di batas tidak berubah putusan karena pembulatan angka.

### Melihat bingkai animasi

```
node tests/screenshot.mjs keluaran.png "id=angkat&sets=A,B,height=max&cols=6" 2000 1200
node tests/screenshot.mjs keluaran.png "/#sim/lift" 1400 850      # halaman aplikasi sebenarnya
```

`sets` menerima `A`, `B`, `<kunci>=min|max`, atau setup bebas seperti `B.capacity=5000;time=40`.
Di Git Bash, awali perintah halaman aplikasi dengan `MSYS_NO_PATHCONV=1`.

## Catatan model

Semua simulasi memakai model ideal yang asumsinya ditampilkan di setiap modul. Setiap hasil
"tidak bisa" punya kelanjutan fisis yang ditampilkan, bukan hanya tulisan:

| Modul | Bila gagal |
|---|---|
| Angkat besi | barbel berhenti saat energi habis (h = E / mg), dilepas, lalu jatuh bebas |
| Derek | daya membatasi kecepatan (v = P / mg); waktu habis sebelum sampai. Kapasitas angkat (tambahan model, tidak ada di soal) membuat beban berlebih tidak terangkat |
| Lift | rem hanya mampu P / v, kabin makin cepat, pembatas kecepatan memicu rem darurat pada 115% |
| Sabuk | sabuk robek seketika, dummy terus bergerak dengan v₀ sampai membentur dasbor 0,45 m di depannya |
| Sepeda | (selalu sampai) massa tidak mengubah waktu; kemiringan dibatasi sin θ ≤ 0,7 |

Soal lift memerlukan tambahan asumsi (daya = laju maksimum mesin menyerap energi saat turun dengan kecepatan tetap); lihat `PLAN.md`.
