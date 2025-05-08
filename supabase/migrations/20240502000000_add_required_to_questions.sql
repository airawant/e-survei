-- Tambahkan kolom required ke tabel questions
ALTER TABLE questions ADD COLUMN "required" BOOLEAN DEFAULT TRUE;

-- Komentar pada kolom untuk dokumentasi
COMMENT ON COLUMN questions."required" IS 'Menentukan apakah pertanyaan wajib dijawab';
