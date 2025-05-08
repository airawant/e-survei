-- Menambahkan kolom periode_survei ke tabel respondents
ALTER TABLE respondents
ADD COLUMN periode_survei TEXT;

-- Tambahkan indeks untuk mempercepat query yang melibatkan periode_survei
CREATE INDEX idx_respondents_periode_survei ON respondents(periode_survei);

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN respondents.periode_survei IS 'Menyimpan informasi periode survei (seperti Tahun, Semester, Kuartal, atau periode kustom) untuk memudahkan pelaporan berdasarkan periode';
