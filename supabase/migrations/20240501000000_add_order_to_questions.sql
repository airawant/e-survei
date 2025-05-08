-- Tambahkan kolom order ke tabel questions
ALTER TABLE questions ADD COLUMN "order" INTEGER DEFAULT 0;

-- Tambahkan indeks untuk kolom order
CREATE INDEX idx_questions_order ON questions("order");

-- Komentar pada kolom untuk dokumentasi
COMMENT ON COLUMN questions."order" IS 'Urutan pertanyaan dalam indikator';
