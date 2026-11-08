# GreenVox: Platform WebGIS Pemantauan Lingkungan dan Sains Warga Cibubur

GreenVox adalah platform WebGIS komunitas berbasis sekolah yang memadukan data penginderaan jauh satelit Sentinel-2 dengan pantauan foto nyata dari warga (User Generated Content / Ground Truth) di sekitar SMP Islam Al-Azhar 19 Cibubur, Jakarta Timur.

## Fitur Utama

1. WebGIS Satelit Resolusi Tinggi: Menampilkan citra satelit asli keadaan riil (foto udara resolusi sub-meter berpadu nama jalan transparan) sebagai tampilan default, dengan opsi peta topografi kontur dan peta jalan vektor.
2. Hasil komposit median Sentinel-2 Google Earth Engine untuk perbandingan 2022 vs 2026.
3. Evaluasi perubahan kerapatan vegetasi (Delta NDVI) untuk penyaringan lokasi penurunan kanopi.
4. Fitur UGC Pantauan Lapangan: Warga dapat mengklik titik mana saja pada peta, mengunggah foto kondisi nyata tanah, memilih kategori lahan, dan status kebutuhan reboisasi.
5. Modal Komparasi Ground Truth & Tautan Street View 360°: Membandingkan foto nyata warga, data spektral satelit, dan panorama Google Street View untuk keputusan reboisasi yang tepat sasaran.
6. Tipografi humanis menggunakan IBM Plex Sans dengan antarmuka yang bersih dan mudah dipahami.
7. Ekspor data lengkap ke format GeoJSON (termasuk foto, kategori, dan koordinat).
8. Berjalan instan pada mode lokal peramban (LocalStorage) serta mendukung sinkronisasi basis data online Supabase.

## Menjalankan Secara Lokal

Buka terminal pada folder proyek:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Akses melalui peramban:

`http://127.0.0.1:8000/`

## Alur Verifikasi Lapangan untuk Keputusan Reboisasi

1. Arahkan peta ke area yang ingin dipantau (tersedia tombol pintas Fokus Cibubur dan Wilayah Jakarta).
2. Klik tombol Kirim Pantauan Lapangan.
3. Klik titik lokasi tanah yang ingin diverifikasi pada peta (bebas di titik mana saja, baik di dalam zona inti pilot Cibubur maupun wilayah sekitarnya).
4. Unggah foto lapangan kondisi nyata (misal: tanah terbuka gundul atau pohon eksisting).
5. Pilih kondisi fisik lahan dan rekomendasi kebutuhan reboisasi (Mendesak Ditanami, Potensial, Terjaga, atau Bukan Area Tanam).
6. Berikan catatan lapangan dan simpan.
7. Klik marker atau daftar pantauan untuk melihat komparasi foto warga vs analisis satelit.
