# Bug Fix: Halaman Edit Survey

## Masalah
Terdapat bug pada aplikasi di mana halaman edit survei (http://localhost:3000/admin/surveys/[id]/edit) memerlukan refresh manual sebelum dapat melakukan update data survei.

## Penyebab
Beberapa penyebab masalah ini:
1. Penanganan ID survei yang tidak optimal pada halaman edit survei
2. Proses pengambilan dan memuat data survei yang tidak menunggu sampai data benar-benar tersedia
3. Kurang robustnya mekanisme pembaruan data survei
4. Tidak adanya UI loading dan pesan error yang jelas

## Perubahan yang Dilakukan

### 1. Halaman Edit Survei (`app/admin/surveys/[id]/edit/page.tsx`)
- Menambahkan state loading dan state management untuk ID survei
- Menggunakan `useEffect` untuk memproses ID survei dengan benar dari parameter URL
- Menambahkan logika pre-loading data survei sebelum menampilkan form
- Menambahkan indikator loading saat data sedang diambil
- Menangani kasus ID yang tidak valid dengan redirect ke halaman survei

### 2. Komponen Form Survei (`components/survey/SurveyFormComponent.tsx`)
- Meningkatkan logika dalam `useEffect` untuk pengambilan data survei dengan pendekatan yang lebih baik
- Menambahkan caching untuk data survei yang sudah diambil untuk menghindari pengambilan berulang
- Memperbaiki penanganan error saat memuat dan memperbarui data survei
- Memodifikasi fungsi `onSubmit` untuk lebih robust

### 3. Context Survei (`context/SupabaseSurveyContext.tsx`)
- Menambahkan mekanisme retry untuk fungsi `updateSurvey`
- Memperbaiki validasi ID dan penanganan error
- Memastikan state `currentSurvey` di-refresh setelah update berhasil
- Menambahkan pemisahan untuk berbagai proses dalam fungsi update survei

## Cara Kerja Setelah Perubahan
1. Saat halaman edit survei dibuka, komponen akan memproses ID survei dari parameter URL
2. Jika ID valid, komponen akan memuat data survei menggunakan context SupabaseSurvey
3. Selama data dimuat, indikator loading akan ditampilkan kepada pengguna
4. Setelah data dimuat, form edit akan ditampilkan dengan data yang sudah terisi
5. Saat form disimpan, proses update dilakukan dengan sistem retry untuk menangani masalah koneksi
6. Setelah update berhasil, data dalam context dan state lokal diperbarui
7. Tidak perlu refresh manual saat mengedit survei

## Manfaat
1. Pengalaman pengguna yang lebih baik
2. Penanganan error yang lebih jelas
3. Sistem yang lebih handal dan robust
4. Tidak memerlukan refresh manual saat mengedit survei
