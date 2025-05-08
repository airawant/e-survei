-- Tambahkan kolom survey_category ke tabel surveys
-- Buat tipe enum untuk kategori survei (Calculate dan Non Calculate)
DO $$ BEGIN
    CREATE TYPE survey_category_enum AS ENUM ('calculate', 'non_calculate');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tambahkan kolom survey_category ke tabel surveys jika belum ada
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS survey_category survey_category_enum DEFAULT 'calculate';

-- Tambahkan komentar untuk kolom
COMMENT ON COLUMN surveys.survey_category IS 'Kategori survei: calculate (dengan perhitungan IKM) atau non_calculate (tanpa perhitungan)';

-- Update survei yang ada: jika bertipe weighted maka tetap calculate, jika unweighted maka set ke calculate sebagai default
UPDATE surveys SET survey_category = 'calculate' WHERE type = 'unweighted' AND survey_category IS NULL;
