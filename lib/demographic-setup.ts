import { supabaseClient } from './supabase/client';

/**
 * Memeriksa dan membuat tabel demographic_responses jika belum ada
 */
export async function setupDemographicResponses() {
  try {
    console.log("Memeriksa tabel demographic_responses...");

    // Periksa apakah tabel demographic_responses sudah ada
    const { error: tableCheckError } = await supabaseClient
      .from('demographic_responses')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === "42P01") { // table doesn't exist
      console.log("Tabel demographic_responses tidak ditemukan, membuat tabel...");

      // Buat tabel demographic_responses dengan SQL
      const { error: createError } = await supabaseClient.rpc('create_demographic_responses_table');

      if (createError) {
        console.error("Gagal membuat tabel demographic_responses:", createError);

        // Coba membuat stored procedure jika belum ada
        const createProcedure = `
          CREATE OR REPLACE FUNCTION create_demographic_responses_table()
          RETURNS void AS $$
          BEGIN
            -- Buat tabel demographic_responses jika belum ada
            CREATE TABLE IF NOT EXISTS demographic_responses (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
              field_id UUID NOT NULL REFERENCES demographic_fields(id) ON DELETE CASCADE,
              value TEXT,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Buat indeks untuk mempercepat query
            CREATE INDEX IF NOT EXISTS idx_demographic_responses_response_id ON demographic_responses(response_id);
            CREATE INDEX IF NOT EXISTS idx_demographic_responses_field_id ON demographic_responses(field_id);
          END;
          $$ LANGUAGE plpgsql;
        `;

        // Jalankan SQL untuk membuat stored procedure
        const { error: procError } = await supabaseClient.rpc('exec_sql', { sql: createProcedure });

        if (procError) {
          console.error("Gagal membuat stored procedure:", procError);
          return false;
        }

        // Jalankan stored procedure
        const { error: execError } = await supabaseClient.rpc('create_demographic_responses_table');

        if (execError) {
          console.error("Gagal menjalankan stored procedure:", execError);
          return false;
        }
      }

      console.log("Tabel demographic_responses berhasil dibuat");
      return true;
    } else if (tableCheckError) {
      console.error("Error saat memeriksa tabel demographic_responses:", tableCheckError);
      return false;
    } else {
      console.log("Tabel demographic_responses sudah ada");
      return true;
    }
  } catch (err) {
    console.error("Error saat setup demographic_responses:", err);
    return false;
  }
}

/**
 * Memeriksa dan membuat tabel demographic_fields jika belum ada
 */
export async function setupDemographicFields() {
  try {
    console.log("Memeriksa tabel demographic_fields...");

    // Periksa apakah tabel demographic_fields sudah ada
    const { error: tableCheckError } = await supabaseClient
      .from('demographic_fields')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === "42P01") { // table doesn't exist
      console.log("Tabel demographic_fields tidak ditemukan, membuat tabel...");

      // Buat tabel demographic_fields dengan SQL
      const createSQL = `
        CREATE TABLE IF NOT EXISTS demographic_fields (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          type TEXT NOT NULL,
          required BOOLEAN DEFAULT TRUE,
          options JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          field_order INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_demographic_fields_survey_id ON demographic_fields(survey_id);

        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_timestamp_demographic_fields
        BEFORE UPDATE ON demographic_fields
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_timestamp();
      `;

      // Jalankan SQL untuk membuat tabel
      const { error: createError } = await supabaseClient.rpc('exec_sql', { sql: createSQL });

      if (createError) {
        console.error("Gagal membuat tabel demographic_fields:", createError);
        return false;
      }

      console.log("Tabel demographic_fields berhasil dibuat");
      return true;
    } else if (tableCheckError) {
      console.error("Error saat memeriksa tabel demographic_fields:", tableCheckError);
      return false;
    } else {
      console.log("Tabel demographic_fields sudah ada");
      return true;
    }
  } catch (err) {
    console.error("Error saat setup demographic_fields:", err);
    return false;
  }
}

/**
 * Setup semua tabel yang dibutuhkan untuk demografis
 */
export async function setupDemographicTables() {
  const fieldsSetup = await setupDemographicFields();
  if (fieldsSetup) {
    return await setupDemographicResponses();
  }
  return false;
}
