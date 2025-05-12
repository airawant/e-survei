# Survey App

Aplikasi Survey yang dibangun dengan Next.js, Tailwind CSS, dan Shadcn UI.

## Fitur

- Pembuatan dan pengelolaan survey
- Form builder yang interaktif
- Kustomisasi pertanyaan dan indikator survey
- Pengumpulan data demografi responden
- Distribusi survey melalui QR code
- Tampilan responsif untuk desktop dan mobile

## Teknologi

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Styling**: Shadcn UI components
- **Form Handling**: React Hook Form + Zod Validator
- **State Management**: Context API
- **Data Visualization**: Recharts

## Memulai

### Prasyarat

- Node.js 18.17 atau lebih baru
- npm atau yarn

### Instalasi

1. Clone repository
```bash
git clone https://github.com/yourusername/surveyapp.git
cd surveyapp
```

2. Install dependencies
```bash
npm install
# atau
yarn install
```

3. Jalankan server development
```bash
npm run dev
# atau
yarn dev
```

4. Buka [http://localhost:3000](http://localhost:3000) di browser Anda

## Struktur Proyek

- `app/` - Komponen halaman Next.js menggunakan App Router
- `components/` - Komponen UI yang dapat digunakan kembali
  - `ui/` - Komponen UI dasar dari Shadcn UI
  - `survey/` - Komponen khusus untuk fitur survey
- `lib/` - Utilities, helpers, dan types
- `context/` - Context API untuk state management
- `hooks/` - Custom React hooks
- `public/` - Assets statis

## Lisensi

[MIT](https://choosealicense.com/licenses/mit/)

## Pembaruan Terbaru

### Visualisasi Grafik Distribusi Jawaban Responden

Pada pembaruan terbaru, kami telah menambahkan fitur visualisasi grafik distribusi jawaban responden untuk setiap unsur survei:

1. **Grafik Distribusi per Unsur**
   - Visualisasi terpisah untuk setiap unsur/pertanyaan survei
   - Grafik batang menunjukkan distribusi jawaban dengan:
     - Sumbu X: Skala likert (1-4 atau 1-6)
     - Sumbu Y: Jumlah responden yang memilih setiap nilai
   - Tampilan yang intuitif dan informatif untuk analisis data

2. **Dukungan untuk Berbagai Skala Likert**
   - Otomatis mendeteksi dan menyesuaikan dengan jenis skala (likert-4 atau likert-6)
   - Untuk likert-4: menampilkan opsi 1-4 (STM, TM, CM, SM)
   - Untuk likert-6: menampilkan opsi 1-6 (STM, TM, KM, CM, M, SM)
   - Gradasi warna yang berbeda untuk setiap skala

3. **Informasi Detil per Grafik**
   - Teks pertanyaan lengkap di setiap grafik
   - Informasi jenis skala yang digunakan
   - Data tambahan berupa:
     - Rata-rata skor
     - Total responden
     - Kategori mutu

4. **Fitur Interaktif**
   - Tooltip informatif saat mengarahkan kursor ke batang grafik
   - Menampilkan jumlah responden yang memilih nilai tersebut
   - Deskripsi lengkap dari setiap skala likert

5. **Kode Warna yang Konsisten**
   - Warna merah untuk nilai rendah (tidak memuaskan)
   - Warna biru untuk nilai tinggi (memuaskan)
   - Gradasi warna sesuai dengan tingkat kepuasan
   - Legenda dan keterangan untuk memudahkan interpretasi

### Cara Mengakses

Fitur visualisasi distribusi jawaban responden dapat diakses melalui tab "Grafik" pada halaman hasil survei:

1. Buka halaman hasil survei
2. Pilih tab "Grafik" pada bagian bawah halaman
3. Lihat grafik distribusi untuk setiap unsur/pertanyaan
4. Arahkan kursor ke batang grafik untuk melihat detail jumlah responden

Visualisasi ini sangat berguna untuk memahami:
- Distribusi jawaban untuk setiap unsur
- Pola jawaban responden secara keseluruhan
- Unsur-unsur yang memiliki tingkat kepuasan tertinggi dan terendah
- Area yang perlu ditingkatkan berdasarkan frekuensi jawaban

### Penyimpanan Data Periode Survei

Pada pembaruan terbaru, kami telah menambahkan fitur untuk menyimpan informasi periode survei (seperti "Q1-2025" atau "S1-2025") ke dalam kolom `periode_survei` di tabel `respondents` dan `responses`. Fitur ini memungkinkan:

1. **Pengelolaan Periode yang Lebih Baik**
   - Data periode survei disimpan dalam format yang konsisten (mis. "Q1-2025" atau "S1-2025")
   - Pemilihan periode (kuartal, semester, atau tahunan) saat pembuatan form survei
   - Periode yang sama disimpan untuk semua responden yang mengisi survei tersebut

2. **Analisis Berdasarkan Periode**
   - Laporan dan analisis dapat difilter berdasarkan periode spesifik
   - Perbandingan hasil survei antar periode menjadi lebih mudah
   - Tren kepuasan pengguna dapat dilihat dari waktu ke waktu

3. **Implementasi**
   - Kolom `periode_survei` (tipe string) telah ditambahkan ke tabel `respondents` dan `responses`
   - Kolom `period_type`, `period_year`, `period_quarter`, dan `period_semester` telah ditambahkan ke tabel `surveys`
   - Format penyimpanan: "Q1-2025" untuk kuartal, "S1-2025" untuk semester, dan "2025" untuk tahunan
   - Data periode diambil otomatis dari pengaturan survei yang ditentukan pada saat pembuatan

### Peningkatan Analisis Data Survey

Pada pembaruan terbaru, kami telah menambahkan beberapa fitur baru untuk meningkatkan analisis data survey:

1. **Fungsi Perhitungan Tren**
   - `getSurveyTrends`: Mendapatkan tren hasil survei per periode (tahun, semester, kuartal)
   - `getComparisonStatistics`: Mendapatkan statistik perbandingan antar periode untuk memudahkan analisis
   - `getSurveyDetailedStatistics`: Fungsi perhitungan statistik survei yang lebih detail dan akurat

2. **Komponen Analisis Data**
   - `DetailedCalculation`: Menampilkan detail perhitungan IKM dengan tampilan yang mudah dipahami
   - `TrendAnalysis`: Menampilkan analisis tren antar periode dalam bentuk grafik dan tabel
   - `RespondentsTable`: Menampilkan daftar responden dengan fitur pencarian, pengurutan, dan ekspor CSV

3. **Dashboard Survey**
   - Halaman dashboard baru di `/survey/dashboard/[id]` yang menampilkan:
     - Detail survei dan informasi dasar
     - Detail perhitungan dengan rumus yang jelas
     - Analisis tren dengan visualisasi data
     - Tampilan data responden dengan fitur ekspor data

### Cara Penggunaan

1. **Detail Perhitungan**
   ```tsx
   <DetailedCalculation
     surveyId="id-survey"
     year={2024}
     quarter={1} // opsional
     semester={1} // opsional
     startDate="2024-01-01" // opsional
     endDate="2024-03-31" // opsional
   />
   ```

2. **Analisis Tren**
   ```tsx
   <TrendAnalysis
     surveyId="id-survey"
     years={[2023, 2024]}
     periodType="quarter" // atau 'year', 'semester'
   />
   ```

3. **Tabel Responden**
   ```tsx
   <RespondentsTable surveyId="id-survey" />
   ```

Semua komponen baru mendukung tampilan responsif dan dapat disesuaikan dengan kebutuhan aplikasi.

### Akses ke Dashboard

Untuk mengakses dashboard survei, gunakan tombol "Dashboard" pada halaman daftar survei, atau akses langsung melalui URL:
```
/survey/dashboard/[id-survey]
```

Dashboard menyediakan tampilan yang komprehensif untuk menganalisis hasil survei dari berbagai perspektif, termasuk:
- Ringkasan hasil dengan indeks kepuasan
- Detail perhitungan dengan rumus yang jelas
- Analisis tren antar periode
- Daftar responden dengan data lengkap
