# Ruang Fisika — Simulator Usaha dan Energi

Situs belajar fisika berbahasa Indonesia dengan lima simulasi kehidupan sehari-hari, dibuat dari soal di `materials/`:

| # | Modul | Pertanyaan soal asli | Hasil |
|---|-------|----------------------|-------|
| 01 | Atlet Angkat Besi | Cukupkah 500 J untuk 20 kg setinggi 1,5 m? | 300 J → bisa |
| 02 | Derek Pengangkat | Derek 20 kW, 200 kg, 15 m, 50 s — mampu? | 600 W → mampu |
| 03 | Lift dan Muatan | Turun 30 m → 5 m dalam 100 s, 10.000 W, kabin 2.500 kg | muatan maks. 1.500 kg = 15.000 N |
| 04 | Uji Sabuk Pengaman | 36 km/jam, berhenti dalam 0,5 m, dummy 60 kg, sabuk 7.000 N | 6.000 N → tidak robek |
| 05 | Sepeda Menuruni Bukit | Tinggi 80 m, lintasan 160 m, tanpa gesekan | 8 s |

Setiap modul adalah satu **poster A/B** bergaya reel fisika:

- **Pertanyaan** besar ("Kecepatan 2× lipat. Gaya pada sabuk 2× atau 4×?") dengan pilihan jawaban.
- **Dua situasi berdampingan**: A = soal asli (biru), B = pembanding (merah), bergerak pada satu jam yang sama.
- Setelah menebak dan menonton: **satu persamaan berwarna** (mis. `6.000 N × 4 = 24.000 N`), **diagram gaya** A dan B dengan skala yang sama, **grafik** A dan B terhadap waktu, dan kesimpulan.
- **Coba sendiri**: geser angka A dan B, lalu putar lagi; pembahasan langkah demi langkah untuk soal asli.
- **Lembar belajar**: sketsa bebas, tugas vektor, jawaban angka + satuan yang diperiksa otomatis, daftar periksa dari rubrik, dan refleksi. Tersimpan di browser (localStorage) dan bisa dicetak.

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
    components/      chart (grafik A/B), fbd (diagram gaya), worksheet, sketch, fx, icons
    pages/           home, workspace, concepts, notes
    state/storage.js penyimpanan lokal berversi
tests/physics.test.mjs
materials/           dokumen soal dan kunci jawaban asli (tidak diubah)
```

## Tes

```
npm test        # atau: node --test tests/*.test.mjs
```

Tes memeriksa kelima hasil soal asli, nilai di bawah/tepat/di atas ambang, konversi satuan, input tidak valid, kekekalan energi, dan bahwa massa tidak memengaruhi waktu meluncur.

## Catatan model

Semua simulasi memakai model ideal yang asumsinya ditampilkan di setiap modul. Soal lift memerlukan tambahan asumsi (daya = laju maksimum mesin menyerap energi saat turun dengan kecepatan tetap); lihat `PLAN.md`.
