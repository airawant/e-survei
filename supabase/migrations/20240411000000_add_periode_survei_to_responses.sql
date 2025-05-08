-- Menambahkan kolom periode_survei ke tabel responses
ALTER TABLE responses
ADD COLUMN periode_survei TEXT;

-- Tambahkan indeks untuk mempercepat query yang melibatkan periode_survei
CREATE INDEX idx_responses_periode_survei ON responses(periode_survei);

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN responses.periode_survei IS 'Menyimpan informasi periode survei (seperti Q1 - 2025 atau Semester 1 - 2025) untuk memudahkan pelaporan berdasarkan periode';
