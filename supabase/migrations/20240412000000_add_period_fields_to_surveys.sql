-- Menambahkan kolom-kolom periode ke tabel surveys
ALTER TABLE surveys
ADD COLUMN period_type TEXT,
ADD COLUMN period_year INTEGER,
ADD COLUMN period_quarter TEXT,
ADD COLUMN period_semester TEXT;

-- Tambahkan indeks untuk mempercepat query yang melibatkan periode
CREATE INDEX idx_surveys_period ON surveys(period_type, period_year);

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN surveys.period_type IS 'Tipe periode survei (quarterly, semester, annual)';
COMMENT ON COLUMN surveys.period_year IS 'Tahun periode survei';
COMMENT ON COLUMN surveys.period_quarter IS 'Kuartal periode survei (Q1, Q2, Q3, Q4) jika tipe quarterly';
COMMENT ON COLUMN surveys.period_semester IS 'Semester periode survei (S1, S2) jika tipe semester';
