-- Migrasi untuk demographic fields dan responses

-- Tabel untuk menyimpan konfigurasi field demografis
CREATE TABLE IF NOT EXISTS demographic_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN DEFAULT TRUE,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Urutan field (1, 2, 3, dst)
  field_order INTEGER DEFAULT 1
);

-- Indeks untuk mempercepat query berdasarkan survey_id
CREATE INDEX IF NOT EXISTS idx_demographic_fields_survey_id ON demographic_fields(survey_id);

-- Tabel untuk menyimpan respon demografis dari responden
CREATE TABLE IF NOT EXISTS demographic_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES demographic_fields(id) ON DELETE CASCADE,
  value TEXT, -- menyimpan nilai dalam bentuk text, bisa dikonversi sesuai tipe field
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks untuk mempercepat query berdasarkan response_id
CREATE INDEX IF NOT EXISTS idx_demographic_responses_response_id ON demographic_responses(response_id);
-- Indeks untuk mempercepat query berdasarkan field_id
CREATE INDEX IF NOT EXISTS idx_demographic_responses_field_id ON demographic_responses(field_id);

-- Trigger untuk memperbarui updated_at secara otomatis
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buat trigger untuk demographic_fields
CREATE TRIGGER set_timestamp_demographic_fields
BEFORE UPDATE ON demographic_fields
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
