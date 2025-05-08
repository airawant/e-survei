-- Perbarui tipe pertanyaan untuk likert menjadi likert-4 dan likert-6
-- Asumsikan bahwa semua pertanyaan likert tanpa pengklasifikasian lebih lanjut adalah likert-4

-- Langkah 1: Tambahkan nilai baru ke enum question_type jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
        RAISE NOTICE 'Tipe enum question_type tidak ditemukan, lewati perubahan enum';
    ELSE
        BEGIN
            -- Tambahkan nilai likert-4 ke enum jika belum ada
            ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'likert-4';
            RAISE NOTICE 'Nilai likert-4 ditambahkan ke enum question_type';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Nilai likert-4 sudah ada di enum question_type';
        END;

        BEGIN
            -- Tambahkan nilai likert-6 ke enum jika belum ada
            ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'likert-6';
            RAISE NOTICE 'Nilai likert-6 ditambahkan ke enum question_type';
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Nilai likert-6 sudah ada di enum question_type';
        END;
    END IF;
END$$;

-- Langkah 2: Ubah nilai 'likert' yang ada menjadi 'likert-4' (asumsi semua skala Likert yang ada adalah 1-4)
UPDATE questions
SET type = 'likert-4'::question_type
WHERE type = 'likert';

-- Langkah 3 (Opsional): Tambahkan catatan di tabel untuk membedakan likert-4 dan likert-6
-- Jika skala likert 1-6 dapat diidentifikasi berdasarkan kriteria tertentu, misalnya ID atau teks tertentu
-- UPDATE questions
-- SET type = 'likert-6'::question_type
-- WHERE type = 'likert-4' AND (teks pertanyaan mengandung '1-6' atau kriteria lain);

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN questions.type IS 'Tipe pertanyaan. Skala Likert disimpan sebagai likert-4 (1-4) atau likert-6 (1-6)';
