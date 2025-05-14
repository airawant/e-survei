import { createClient } from '@supabase/supabase-js';
import { Survey, Indicator, Question, Response, Answer } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Instansiasi klien Supabase untuk digunakan di server-side
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Flag untuk mengaktifkan atau menonaktifkan verifikasi skema database
 * Jika false, verifikasi tidak akan dilakukan dan app akan tetap berjalan
 */
const ENABLE_SCHEMA_VERIFICATION = true;

/**
 * Fungsi helper untuk menangani error Supabase, khususnya untuk masalah format UUID
 * @param error Error yang dilempar oleh Supabase
 * @param context Konteks tambahan untuk pesan error
 * @param id ID yang dicoba digunakan (opsional)
 */
function handleSupabaseError(error: any, context: string, id?: string): never {
  // Log error untuk debugging dengan detail lengkap
  console.error(`Error in ${context}:`, JSON.stringify(error, null, 2));

  // Cek tipe error spesifik
  if (error?.code === 'PGRST204' && error?.message?.includes('metadata')) {
    throw new Error(`Kolom 'metadata' tidak ditemukan dalam tabel. Pastikan skema tabel sudah benar dan kolom metadata ada di tabel surveys.`);
  }

  // Cek apakah ini adalah error UUID
  const isUuidError =
    error?.code === '22P02' || // Invalid input syntax for UUID
    (error?.message && error.message.includes('uuid')) ||
    (error?.details && error.details.includes('uuid'));

  if (isUuidError && id) {
    throw new Error(`ID yang diberikan (${id}) bukan merupakan UUID yang valid. Gunakan fungsi getSurveyValidId untuk mendapatkan ID yang valid. Error asli: ${error.message}`);
  }

  // Cek apakah ini masalah skema tabel
  const isSchemaError =
    error?.code === 'PGRST204' || // Column not found in schema cache
    error?.code === '42P01' || // Undefined table
    error?.code === '42703'; // Undefined column

  if (isSchemaError) {
    throw new Error(`Kesalahan skema database dalam ${context}: ${error.message}. Pastikan tabel dan kolom yang dirujuk sudah ada dan sesuai.`);
  }

  // Format error agar lebih informatif
  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error);

  throw new Error(`Terjadi kesalahan dalam ${context}: ${errorMessage}`);
}

/**
 * Survey Services
 */

// Membuat survei baru dengan tipe (berbobot atau tidak berbobot)
export async function createSurvey(survey: {
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  survey_category?: 'calculate' | 'non_calculate';
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
  period_type?: string;
  period_year?: number;
  period?: string; // Kolom baru untuk nilai period
}) {
  try {
    // VALIDASI INPUT
    if (!survey.title) {
      const errorMsg = 'Error creating survey: Title is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Formatkan data survei untuk database
    const surveyToInsert = {
      title: survey.title,
      description: survey.description ?? '',
      type: survey.type ?? 'unweighted',
      survey_category: survey.survey_category ?? 'calculate',
      start_date: survey.start_date ?? null,
      end_date: survey.end_date ?? null,
      is_active: survey.is_active ?? true,
      period_type: survey.period_type ?? 'quarterly',
      period_year: survey.period_year ?? new Date().getFullYear(),
      period: survey.period ?? 'Q1' // Default ke Q1 jika tidak ada
    };

    console.log('Creating survey with data:', surveyToInsert);

    // Membuat survei baru
    const { data, error } = await supabaseClient
      .from('surveys')
      .insert([surveyToInsert])
      .select()
      .single();

    if (error) {
      console.error('Error creating survey in database:', error);
      throw error;
    }

    console.log('Survey created successfully with ID:', data.id);
    return data;
  } catch (error) {
    console.error('Error in createSurvey:', error);
    throw error;
  }
}

// Mendapatkan semua survei
export async function getAllSurveys() {
  const { data, error } = await supabaseClient
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fungsi helper untuk mendapatkan ID survei yang valid
 * Mencoba mendapatkan UUID valid jika ID dalam format non-standard
 * @param id ID survei yang mungkin dalam format non-standard
 * @returns ID survei yang valid untuk digunakan dengan Supabase
 */
async function getSurveyValidId(id: string): Promise<string> {
  // Perbaikan untuk menangani kasus ID kosong atau objek kosong
  if (id === undefined || id === null) {
    console.error('Error finding survey: ID kosong', id);
    throw new Error('Survey ID diperlukan dan tidak boleh kosong');
  }

  // Penanganan kasus khusus jika ID adalah objek kosong
  if (id === '{}' || (typeof id === 'object' && Object.keys(id).length === 0)) {
    console.error('Error finding survey: ID adalah objek kosong', id);
    throw new Error('Survey ID tidak valid: Objek kosong diterima');
  }

  if (typeof id !== 'string') {
    console.error('Error finding survey: Tipe ID survey tidak valid', typeof id, id);
    throw new Error(`Survey ID harus berupa string, diterima: ${typeof id}`);
  }

  if (id.trim() === '') {
    console.error('Error finding survey: string ID kosong');
    throw new Error('Survey ID tidak boleh berupa string kosong');
  }

  console.log('Validating survey ID:', id);

  // Jika ID sudah dalam format UUID yang valid, gunakan langsung
  if (isValidUUID(id)) {
    console.log('ID survey valid (UUID):', id);
    return id;
  }

  try {
    // Coba beberapa strategi untuk mendapatkan ID valid

    // 1. Cek apakah format ID adalah 'survey-{timestamp}'
    let query = '';
    if (id.startsWith('survey-')) {
      const numericPart = id.split('-')[1];
      // Gunakan query OR untuk mencari berdasarkan ID, title atau timestamp pada created_at
      if (numericPart && !isNaN(Number(numericPart))) {
        const timestamp = new Date(parseInt(numericPart));
        if (!isNaN(timestamp.getTime())) {
          // Jika numericPart adalah timestamp valid, cari survei dengan timestamp sekitar waktu tersebut
          const startTime = new Date(timestamp.getTime() - 60000); // 1 menit sebelumnya
          const endTime = new Date(timestamp.getTime() + 60000);   // 1 menit sesudahnya

          query = `id.eq.${id},title.ilike.%${id}%,created_at.gte.${startTime.toISOString()},created_at.lte.${endTime.toISOString()}`;
        } else {
          // Jika bukan timestamp, gunakan query biasa
          query = `id.eq.${id},title.ilike.%${id}%,title.ilike.%${numericPart}%`;
        }
      } else {
        query = `id.eq.${id},title.ilike.%${id}%`;
      }
    } else {
      // ID bisa berupa title atau bagian dari UUID
      query = `id.eq.${id},title.ilike.%${id}%`;
    }

    // Cari survei berdasarkan query yang telah dibuat
    const { data, error } = await supabaseClient
      .from('surveys')
      .select('id, title, created_at')
      .or(query)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding survey:', error);
      throw new Error(`Could not find survey with ID or title: ${id}. Error: ${error.message}`);
    }

    if (!data) {
      // Jika pencarian gagal, coba mencari semua survei dan pilih yang paling cocok
      const { data: allSurveys, error: allSurveysError } = await supabaseClient
        .from('surveys')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(10);

      if (allSurveysError) {
        throw new Error(`Survey with ID or title '${id}' not found`);
      }

      // Cek apakah ada survei yang memiliki title yang mirip
      if (allSurveys && allSurveys.length > 0) {
        // Temukan survei dengan title yang paling mirip
        const matchingSurvey = allSurveys.find(s =>
          s.title && s.title.toLowerCase().includes(String(id).toLowerCase())
        );

        if (matchingSurvey) {
          console.log(`Found matching survey by title: ${matchingSurvey.title} (${matchingSurvey.id})`);
          return matchingSurvey.id;
        }
      }

      throw new Error(`Survey with ID or title '${id}' not found. Available surveys: ${allSurveys?.map(s => s.title).join(', ')}`);
    }

    console.log(`Found survey: ${data.title} (${data.id})`);
    return data.id;
  } catch (error) {
    console.error('Error in getSurveyValidId:', error);
    throw error;
  }
}

// Mendapatkan survei berdasarkan ID dengan relasi indikator dan pertanyaan
export async function getSurveyById(id: string) {
  try {
    const surveyId = await getSurveyValidId(id);

    // Dapatkan survei dengan ID yang sudah divalidasi
    const { data, error } = await supabaseClient
      .from('surveys')
      .select(`
        *,
        indicators (
          *,
          questions (*)
        )
      `)
      .eq('id', surveyId)
      .single();

    if (error) {
      console.error('Error getting survey:', error);
      throw error;
    }

    // Format data respons jika ditemukan
    if (data) {
      // Format data periode dari kolom database ke format yang digunakan oleh aplikasi
      const period: SurveyPeriod = {
        type: data.period_type || 'quarterly', // Default ke quarterly jika tidak ada
        year: data.period_year || new Date().getFullYear(), // Default ke tahun sekarang
        value: data.period || '' // Menggunakan nilai period dari kolom database (tanpa default ke 'Q1')
      };

      // Tambahkan nilai quarter atau semester berdasarkan tipe periode
      if (data.period_type === 'quarterly') {
        period.quarter = data.period ? data.period.replace('Q', '') : '1';
      } else if (data.period_type === 'semester') {
        period.semester = data.period ? data.period.replace('S', '') : '1';
      }

      console.log("getSurveyById - Period data:", {
        id: data.id,
        title: data.title,
        database: {
          period_type: data.period_type,
          period_year: data.period_year,
          period: data.period
        },
        app_format: period
      });

      // Tambahkan objek period ke data respons
      data.period = period;
    }

    return data;
  } catch (error) {
    console.error('Error in getSurveyById:', error);
    throw error;
  }
}

// Memperbarui survei yang sudah ada
export async function updateSurvey(id: string, updates: Partial<{
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  survey_category: string;   // Tambahkan survey_category di sini
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  period_type: string;
  period_year: number;
  period: string; // Kolom baru untuk nilai period
}>) {
  try {
    // VALIDASI PARAMETER ID YANG LEBIH KETAT
    // Pengecekan jika id null, undefined atau kosong
    if (id === undefined || id === null) {
      const errorMsg = 'Error updating survey: ID survey kosong (undefined/null)';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Pengecekan jika id adalah objek atau string '{}'
    if (id === '{}' || (typeof id === 'object' && (!id || Object.keys(id).length === 0))) {
      const errorMsg = 'Error updating survey: ID survey tidak valid (objek kosong)';
      console.error(errorMsg, id);
      throw new Error(errorMsg);
    }

    // Validasi tipe data
    if (typeof id !== 'string') {
      const errorMsg = `Error updating survey: ID survey harus string, diterima: ${typeof id}`;
      console.error(errorMsg, id);
      throw new Error(errorMsg);
    }

    // Validasi string kosong
    if (id.trim() === '') {
      const errorMsg = 'Error updating survey: ID survey tidak boleh kosong';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Validasi objek updates
    if (!updates || Object.keys(updates).length === 0) {
      console.error('Error updating survey: Tidak ada data yang diperbarui');
      throw new Error('Update data diperlukan untuk memperbarui survei');
    }

    console.log('Update survey ID:', id, 'with data:', updates);

    // Dapatkan ID survey yang valid
    const surveyId = await getSurveyValidId(id);
    console.log(`Updating survey with validated ID: ${surveyId}`);

    // Log data yang akan diupdate untuk debugging
    console.log("Data update yang akan dikirim:", JSON.stringify(updates, null, 2));

    // Pastikan survey_category, is_active, dan nilai lain memiliki format yang benar
    if (updates.survey_category && typeof updates.survey_category !== 'string') {
      updates.survey_category = String(updates.survey_category);
    }

    if (updates.is_active !== undefined && typeof updates.is_active !== 'boolean') {
      updates.is_active = Boolean(updates.is_active);
    }

    // Update survei dengan ID yang sudah divalidasi
    const { data, error } = await supabaseClient
      .from('surveys')
      .update(updates)
      .eq('id', surveyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating survey in database:', error);

      if (error.code === 'PGRST116') {
        // Format error Postgres untuk debugging
        console.error('Detail error PostgreSQL:', {
          code: error.code,
          message: error.message,
          details: error.details
        });
      }

      throw error;
    }

    if (!data) {
      console.error('No data returned from update operation');
      throw new Error('No data returned from update operation');
    }

    console.log('Survey updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in updateSurvey:', error);
    throw error;
  }
}

// Fungsi pembantu untuk validasi UUID
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Menghapus survei berdasarkan ID
export async function deleteSurvey(id: string) {
  try {
    const surveyId = await getSurveyValidId(id);

    // Hapus survei dengan ID yang sudah divalidasi
    const { error } = await supabaseClient
      .from('surveys')
      .delete()
      .eq('id', surveyId);

    if (error) {
      console.error('Error deleting survey:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteSurvey:', error);
    throw error;
  }
}

// Toggle status aktif survei (aktivasi/deaktivasi)
export async function toggleSurveyActiveInDB(id: string, updates: { is_active: boolean }) {
  try {
    const surveyId = await getSurveyValidId(id);
    console.log(`Toggling survey active status for ID: ${surveyId} to: ${updates.is_active}`);

    const { data, error } = await supabaseClient
      .from('surveys')
      .update({ is_active: updates.is_active })
      .eq('id', surveyId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling survey active status:', error);
      throw error;
    }

    console.log('Survey active status updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in toggleSurveyActiveInDB:', error);
    throw error;
  }
}

/**
 * Indicator Services
 */

// Menambahkan indikator ke survei
export async function addIndicator(indicator: {
  survey_id: string;
  title?: string;
  name?: string;
  description: string;
  weight: number;
  order?: number;
}) {
  try {
    console.log(`Adding indicator to survey ${indicator.survey_id}: ${indicator.title || indicator.name}`);

    // Pastikan survey_id valid
    if (!indicator.survey_id) {
      throw new Error("Survey ID diperlukan untuk menambahkan indikator");
    }

    // Pastikan judul tidak kosong
    if (!indicator.title && !indicator.name) {
      throw new Error("Nama atau judul indikator diperlukan");
    }

  const mappedIndicator = {
    survey_id: indicator.survey_id,
    name: indicator.title || indicator.name,
      description: indicator.description || '',
      weight: typeof indicator.weight === 'number' ? indicator.weight : 1
  };

    console.log("Mapped indicator data:", mappedIndicator);

  const { data, error } = await supabaseClient
    .from('indicators')
    .insert([mappedIndicator])
    .select()
    .single();

    if (error) {
      console.error("Error adding indicator:", error);
      throw error;
    }

    console.log(`Indicator added successfully with ID: ${data?.id}`);
  return data;
  } catch (error) {
    console.error("Error in addIndicator:", error);
    throw error;
  }
}

// Mendapatkan semua indikator untuk survei tertentu
export async function getIndicatorsBySurveyId(surveyId: string) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    const { data, error } = await supabaseClient
      .from('indicators')
      .select('*, questions(*)')
      .eq('survey_id', validSurveyId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting indicators:', error);
      throw error;
    }

    const mappedData = data ? data.map(indicator => ({
      ...indicator,
      title: indicator.name,
    })) : [];

    return mappedData;
  } catch (error) {
    console.error('Error in getIndicatorsBySurveyId:', error);
    throw error;
  }
}

// Memperbarui indikator
export async function updateIndicator(id: string, updates: Partial<Omit<Indicator, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabaseClient
    .from('indicators')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Menghapus indikator
export async function deleteIndicator(id: string) {
  const { error } = await supabaseClient
    .from('indicators')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Question Services
 */

// Menambahkan pertanyaan ke indikator
export async function addQuestion(question: {
  indicator_id: string;
  text: string;
  type?: string;
  required?: boolean;
  options?: string[];
  weight: number;
  order?: number;
}) {
  try {
    console.log(`Adding question to indicator ${question.indicator_id}: ${question.text}`);

    // Validasi input yang lebih ketat
    if (!question.indicator_id || question.indicator_id.trim() === '') {
      const error = new Error("Indicator ID diperlukan untuk menambahkan pertanyaan");
      console.error(error);
      throw error;
    }

    // Pastikan text tidak kosong
    if (!question.text || question.text.trim() === '') {
      const error = new Error("Teks pertanyaan diperlukan dan tidak boleh kosong");
      console.error(error);
      throw error;
    }

    // Pastikan weight adalah nilai numerik
    let sanitizedWeight = 1;
    if (typeof question.weight === 'number' && !isNaN(question.weight)) {
      sanitizedWeight = Math.max(1, Math.min(100, question.weight)); // Batas antara 1-100
    } else {
      console.warn(`Weight tidak valid: ${question.weight}, menggunakan default 1`);
    }

    // Validasi options
    let validOptions: string[] = [];
    if (question.options) {
      if (Array.isArray(question.options)) {
        // Filter opsi yang valid
        validOptions = question.options
          .filter(opt => opt !== null && opt !== undefined)
          .map(opt => String(opt).trim())
          .filter(opt => opt !== '');
      } else {
        console.warn('options bukan array, menggunakan array kosong');
      }
    }

    // Membuat objek data untuk insert dengan nilai-nilai yang sudah disanitasi
    const questionData = {
      indicator_id: question.indicator_id.trim(),
      text: question.text.trim(), // Text sudah di-trim tapi tidak diubah/sanitized untuk menjaga karakter khusus
      type: question.type || 'likert', // Default ke likert jika tidak ada
      required: question.required !== undefined ? question.required : true, // Default ke true
      options: validOptions,
      weight: sanitizedWeight,
      order: typeof question.order === 'number' && !isNaN(question.order) ? question.order : 0 // Default ke 0 bukan null
    };

    console.log("Question data to insert:", JSON.stringify(questionData, null, 2));

    // Cek terlebih dahulu apakah indikator benar-benar ada
    try {
      const { data: indicatorCheck, error: indicatorError } = await supabaseClient
        .from('indicators')
        .select('id')
        .eq('id', questionData.indicator_id)
        .single();

      if (indicatorError || !indicatorCheck) {
        console.error(`Indicator ID ${questionData.indicator_id} tidak ditemukan dalam database:`, indicatorError);
        throw new Error(`Indicator ID ${questionData.indicator_id} tidak ada dalam database`);
      }

      console.log(`Indicator check passed. Indicator ID ${questionData.indicator_id} exists.`);
    } catch (indicatorCheckError) {
      console.error("Error checking indicator existence:", indicatorCheckError);
      throw new Error(`Gagal memverifikasi indicator ID: ${indicatorCheckError instanceof Error ? indicatorCheckError.message : 'Unknown error'}`);
    }

    // Jika order tidak ditentukan, ambil jumlah pertanyaan saat ini dan tetapkan sebagai urutan selanjutnya
    if (!question.order) {
      try {
        const { data: existingQuestions, error: countError } = await supabaseClient
          .from('questions')
          .select('id')
          .eq('indicator_id', questionData.indicator_id);

        if (!countError && existingQuestions) {
          questionData.order = existingQuestions.length;
          console.log(`Order tidak ditentukan, menggunakan nilai: ${questionData.order}`);
        }
      } catch (countError) {
        console.warn("Error mendapatkan jumlah pertanyaan:", countError);
        // Lanjutkan dengan nilai default jika terjadi error
      }
    }

    // Tambahkan pertanyaan ke database
    try {
      const { data, error } = await supabaseClient
        .from('questions')
        .insert([questionData])
        .select()
        .single();

      if (error) {
        console.error("Error adding question to database:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);

        // Jika error terkait karakter khusus, coba encode teks
        if (error.message && (error.message.includes("character") || error.message.includes("syntax"))) {
          console.log("Mencoba lagi dengan encoding teks pertanyaan...");

          // Buat salinan questionData dan encode teks pertanyaan
          const encodedData = {
            ...questionData,
            text: encodeURIComponent(questionData.text).replace(/%20/g, " ")
          };

          console.log("Menggunakan data ter-encode:", encodedData);

          const { data: encodedResult, error: encodedError } = await supabaseClient
            .from('questions')
            .insert([encodedData])
            .select()
            .single();

          if (encodedError) {
            console.error("Error masih terjadi setelah encoding:", encodedError);
            throw encodedError;
          }

          console.log(`Question added successfully after encoding with ID: ${encodedResult.id}`);
          return encodedResult;
        }

        throw error;
      }

      if (!data) {
        const noDataError = new Error("No data returned after adding question");
        console.error(noDataError);
        throw noDataError;
      }

      console.log(`Question added successfully with ID: ${data.id}`);
      return data;
    } catch (dbError) {
      console.error("Database error in addQuestion:", dbError);

      // Cek apakah error adalah dari Supabase
      if (dbError && typeof dbError === 'object' && 'code' in dbError) {
        console.error(`Supabase error code: ${(dbError as any).code}`);
        console.error(`Supabase error message: ${(dbError as any).message}`);
        console.error(`Supabase error details: ${(dbError as any).details}`);
      }

      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : JSON.stringify(dbError)}`);
    }
  } catch (error) {
    console.error("Error in addQuestion:", error);

    // Tambahkan informasi yang lebih rinci untuk debugging
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }

    // Tambahkan data pertanyaan ke log error untuk membantu debugging
    console.error("Question data that caused error:", JSON.stringify(question, null, 2));

    // Re-throw dengan pesan yang lebih informatif
    throw error instanceof Error
      ? error
      : new Error(`Unexpected error: ${JSON.stringify(error)}`);
  }
}

// Mendapatkan semua pertanyaan untuk indikator tertentu
export async function getQuestionsByIndicatorId(indicatorId: string) {
  const { data, error } = await supabaseClient
    .from('questions')
    .select('*')
    .eq('indicator_id', indicatorId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Memperbarui pertanyaan
export async function updateQuestion(id: string, updates: Partial<Omit<Question, 'id' | 'created_at' | 'updated_at'>>) {
  try {
    console.log(`Updating question with ID: ${id}`);

    const { data: existingQuestion, error: fetchError } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`Error fetching existing question (${id}):`, fetchError);
      throw fetchError;
    }

    if (!existingQuestion) {
      throw new Error(`Question with ID ${id} not found`);
    }

    // Buat objek update dengan nilai-nilai yang ditentukan
    const updateData: any = { ...updates };

    // Jika ada update teks pertanyaan, pastikan di-trim tapi tidak di-sanitize
    if (updateData.text) {
      updateData.text = updateData.text.trim();
    }

    // Jika update options, konversi ke format yang benar
    if (updateData.options) {
      updateData.options = Array.isArray(updateData.options) ? updateData.options : [];
    }

    console.log(`Update data:`, JSON.stringify(updateData, null, 2));

    const { data, error } = await supabaseClient
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating question (${id}):`, error);

      // Jika error terkait karakter khusus, coba encode teks pertanyaan
      if (error.message && (error.message.includes("character") || error.message.includes("syntax")) && updateData.text) {
        console.log("Mencoba lagi dengan encoding teks pertanyaan...");

        // Encode teks pertanyaan
        const encodedData = {
          ...updateData,
          text: encodeURIComponent(updateData.text).replace(/%20/g, " ")
        };

        console.log("Menggunakan data ter-encode:", encodedData);

        const { data: encodedResult, error: encodedError } = await supabaseClient
          .from('questions')
          .update(encodedData)
          .eq('id', id)
          .select()
          .single();

        if (encodedError) {
          console.error("Error masih terjadi setelah encoding:", encodedError);
          throw encodedError;
        }

        console.log(`Question updated successfully after encoding with ID: ${encodedResult.id}`);
        return encodedResult;
      }

      throw error;
    }

    console.log(`Question with ID ${id} updated successfully`);
    return data;
  } catch (error) {
    console.error(`Error in updateQuestion:`, error);
    throw error;
  }
}

// Menghapus pertanyaan
export async function deleteQuestion(id: string) {
  const { error } = await supabaseClient
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Response & Answer Services
 */

// Menyimpan respons survei dengan jawaban
export async function saveResponse(responseData: {
  survey_id: string;
  respondent_id: string;
  answers: { question_id: string; score: number }[];
  periode_survei?: string;
}) {
  // Mulai transaksi dengan menyimpan respon utama
  const { data: response, error: responseError } = await supabaseClient
    .from('responses')
    .insert([{
      survey_id: responseData.survey_id,
      respondent_id: responseData.respondent_id,
      periode_survei: responseData.periode_survei || null // Tambahkan periode_survei ke data yang disimpan
    }])
    .select()
    .single();

  if (responseError) throw responseError;

  // Menyiapkan jawaban untuk disisipkan dengan response_id yang baru dibuat
  const answersToInsert = responseData.answers.map(answer => ({
    response_id: response.id,
    question_id: answer.question_id,
    score: answer.score
  }));

  // Menyimpan semua jawaban
  const { error: answersError } = await supabaseClient
    .from('answers')
    .insert(answersToInsert);

  if (answersError) throw answersError;

  return response;
}

// Mendapatkan semua respons untuk survei tertentu
export async function getResponsesBySurveyId(surveyId: string) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    const { data, error } = await supabaseClient
      .from('responses')
      .select(`
        *,
        respondent:respondent_id (*),
        answers (
          *,
          question:question_id (*)
        )
      `)
      .eq('survey_id', validSurveyId);

    if (error) {
      console.error('Error getting survey responses:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getResponsesBySurveyId:', error);
    throw error;
  }
}

/**
 * Mendapatkan respons survey berdasarkan rentang tanggal
 * @param surveyId ID survey
 * @param startDate Tanggal mulai dalam format ISO string
 * @param endDate Tanggal akhir dalam format ISO string
 */
export async function getResponsesByDateRange(
  surveyId: string,
  startDate: string,
  endDate: string
) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    const { data, error } = await supabaseClient
      .from('responses')
      .select(`
        *,
        respondent:respondent_id (*),
        answers (
          *,
          question:question_id (*)
        )
      `)
      .eq('survey_id', validSurveyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) {
      console.error('Error getting responses by date range:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getResponsesByDateRange:', error);
    throw error;
  }
}

/**
 * Mendapatkan respons survey berdasarkan tahun
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 */
export async function getResponsesByYear(surveyId: string, year: number) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);
    const startDate = `${year}-01-01T00:00:00Z`;
    const endDate = `${year}-12-31T23:59:59Z`;

    return getResponsesByDateRange(validSurveyId, startDate, endDate);
  } catch (error) {
    console.error('Error in getResponsesByYear:', error);
    throw error;
  }
}

/**
 * Mendapatkan respons survey berdasarkan tahun dan kuartal
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 * @param quarter Kuartal (1-4)
 */
export async function getResponsesByQuarter(surveyId: string, year: number, quarter: number) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    if (quarter < 1 || quarter > 4) {
      throw new Error('Quarter must be between 1 and 4');
    }

    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;

    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
    const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? '28' : endMonth === 4 || endMonth === 6 || endMonth === 9 || endMonth === 11 ? '30' : '31'}T23:59:59Z`;

    return getResponsesByDateRange(validSurveyId, startDate, endDate);
  } catch (error) {
    console.error('Error in getResponsesByQuarter:', error);
    throw error;
  }
}

/**
 * Mendapatkan respons survey berdasarkan tahun dan semester
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 * @param semester Semester (1-2)
 */
export async function getResponsesBySemester(surveyId: string, year: number, semester: number) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    if (semester < 1 || semester > 2) {
      throw new Error('Semester must be between 1 and 2');
    }

    const startMonth = (semester - 1) * 6 + 1;
    const endMonth = semester * 6;

    const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
    const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? '28' : endMonth === 4 || endMonth === 6 || endMonth === 9 || endMonth === 11 ? '30' : '31'}T23:59:59Z`;

    return getResponsesByDateRange(validSurveyId, startDate, endDate);
  } catch (error) {
    console.error('Error in getResponsesBySemester:', error);
    throw error;
  }
}

/**
 * Konversi skor ke skala IKM (1-4)
 * @param score Skor asli (1-5)
 */
export function convertToIKMScale(score: number): number {
  if (isNaN(score)) return 1;
  return Math.max(1, Math.min(4, Math.round(score * 0.75 + 0.25)));
}

// Mendapatkan laporan statistik untuk survei tertentu
export async function getSurveyStatistics(surveyId: string) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    // Dapatkan detail survei terlebih dahulu
    const surveyData = await getSurveyById(validSurveyId);
    const isWeighted = surveyData.type === 'weighted';

    // Dapatkan semua respons
    const responses = await getResponsesBySurveyId(validSurveyId);

    if (!responses || responses.length === 0) {
      return {
        respondentCount: 0,
        averageScore: 0,
        indicators: [],
        totalQuestions: 0,
        totalScore: 0,
        ikm: 0
      };
    }

    // Kumpulkan semua indikator dan pertanyaan untuk kalkulasi
    const indicators = surveyData.indicators || [];

    // Hitung total bobot indikator (untuk survei berbobot)
    const totalIndicatorWeight = isWeighted
      ? indicators.reduce((sum: number, ind: any) => sum + (parseFloat(ind.weight) || 1), 0)
      : indicators.length;

    // Kalkulasi skor untuk setiap indikator
    const indicatorScores = indicators.map((indicator: any) => {
      const questions = indicator.questions || [];
      const totalQuestionWeight = isWeighted
        ? questions.reduce((sum: number, q: any) => sum + (parseFloat(q.weight) || 1), 0)
        : questions.length;

      // Hitung skor untuk setiap pertanyaan
      const questionScores = questions.map((question: any) => {
        const allAnswers = responses.flatMap((r: any) =>
          r.answers.filter((a: any) => a.question_id === question.id)
        );

        const totalScore = allAnswers.reduce((sum: number, a: any) => sum + a.score, 0);
        const responseCount = allAnswers.length;
        const avgScore = responseCount > 0 ? totalScore / responseCount : 0;

        return {
          questionId: question.id,
          questionText: question.text,
          weight: isWeighted ? parseFloat(question.weight) || 1 : 1,
          averageScore: avgScore,
          responseCount: responseCount,
          totalQuestionScore: totalScore
        };
      });

      // Kalkulasi skor indikator
      let indicatorScore = 0;
      if (isWeighted && totalQuestionWeight > 0) {
        // Untuk survei berbobot, hitung rata-rata tertimbang
        indicatorScore = questionScores.reduce((sum: number, q: any) =>
          sum + (q.averageScore * q.weight / totalQuestionWeight), 0);
      } else {
        // Untuk survei tidak berbobot, hitung total skor dibagi (jumlah responden * jumlah pertanyaan)
        const totalQuestionScore = questionScores.reduce((sum: number, q: { totalQuestionScore: number }) => sum + q.totalQuestionScore, 0);
        const totalResponses = Math.max(...questionScores.map((q: { responseCount: number }) => q.responseCount)) || 0;
        const questionCount = questionScores.length;

        indicatorScore = totalResponses > 0 && questionCount > 0
          ? totalQuestionScore / (totalResponses * questionCount)
          : 0;
      }

      return {
        indicatorId: indicator.id,
        indicatorTitle: indicator.name || indicator.title,
        weight: isWeighted ? parseFloat(indicator.weight) || 1 : 1,
        score: indicatorScore,
        questions: questionScores,
        // Informasi tambahan untuk perhitungan detail
        calculationDetails: {
          totalRespondents: Math.max(...questionScores.map((q: { responseCount: number }) => q.responseCount)) || 0,
          totalQuestions: questionScores.length,
          totalScore: questionScores.reduce((sum: number, q: { totalQuestionScore: number }) => sum + q.totalQuestionScore, 0)
        }
      };
    });

    // Kalkulasi skor keseluruhan
    let overallScore = 0;
    const totalResponses = responses.length;
    const totalQuestions = indicators.reduce((sum: number, ind: any) => {
      return sum + (ind.questions?.length || 0);
    }, 0);

    const totalScore = responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0);

    if (isWeighted && totalIndicatorWeight > 0) {
      // Untuk survei berbobot, hitung rata-rata tertimbang
      overallScore = indicatorScores.reduce((sum: number, ind: any) =>
        sum + (ind.score * ind.weight / totalIndicatorWeight), 0);
    } else {
      // Untuk survei tidak berbobot, rumus: S / (n × p)
      overallScore = totalResponses > 0 && totalQuestions > 0
        ? totalScore / (totalResponses * totalQuestions)
        : 0;
    }

    // Masukkan kembali ID yang valid
    return {
      surveyId: validSurveyId,
      surveyTitle: surveyData.title,
      isWeighted,
      respondentCount: totalResponses,
      averageScore: overallScore,
      indicators: indicatorScores,
      totalQuestions,
      totalScore,
      ikm: convertToIKMScale(overallScore),
      calculationFormula: isWeighted
        ? "Rata-rata tertimbang dari setiap indikator berdasarkan bobot"
        : "S / (n × p) = Total Skor / (Jumlah Responden × Jumlah Pertanyaan)"
    };
  } catch (error) {
    console.error('Error in getSurveyStatistics:', error);
    throw error;
  }
}

/**
 * Mendapatkan statistik survei berdasarkan rentang tanggal tertentu
 */
export async function getSurveyStatisticsByPeriod(
  surveyId: string,
  options: {
    year?: number;
    quarter?: number;
    semester?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    // Dapatkan detail survei terlebih dahulu
    const surveyData = await getSurveyById(validSurveyId);
    const isWeighted = surveyData.type === 'weighted';

    // Tentukan rentang tanggal berdasarkan opsi yang diberikan
    let responses;
    if (options.startDate && options.endDate) {
      responses = await getResponsesByDateRange(validSurveyId, options.startDate, options.endDate);
    } else if (options.year && options.quarter) {
      responses = await getResponsesByQuarter(validSurveyId, options.year, options.quarter);
    } else if (options.year && options.semester) {
      responses = await getResponsesBySemester(validSurveyId, options.year, options.semester);
    } else if (options.year) {
      responses = await getResponsesByYear(validSurveyId, options.year);
    } else {
      responses = await getResponsesBySurveyId(validSurveyId);
    }

    if (!responses || responses.length === 0) {
      return {
        respondentCount: 0,
        averageScore: 0,
        indicators: [],
        totalQuestions: 0,
        totalScore: 0,
        ikm: 0
      };
    }

    // Kumpulkan semua indikator dan pertanyaan untuk kalkulasi
    const indicators = surveyData.indicators || [];

    // Hitung total bobot indikator (untuk survei berbobot)
    const totalIndicatorWeight = isWeighted
      ? indicators.reduce((sum: number, ind: any) => sum + (parseFloat(ind.weight) || 1), 0)
      : indicators.length;

    // Kalkulasi skor untuk setiap indikator
    const indicatorScores = indicators.map((indicator: any) => {
      const questions = indicator.questions || [];
      const totalQuestionWeight = isWeighted
        ? questions.reduce((sum: number, q: any) => sum + (parseFloat(q.weight) || 1), 0)
        : questions.length;

      // Hitung skor untuk setiap pertanyaan
      const questionScores = questions.map((question: any) => {
        const allAnswers = responses.flatMap((r: any) =>
          r.answers.filter((a: any) => a.question_id === question.id)
        );

        const totalScore = allAnswers.reduce((sum: number, a: any) => sum + a.score, 0);
        const responseCount = allAnswers.length;
        const avgScore = responseCount > 0 ? totalScore / responseCount : 0;

        return {
          questionId: question.id,
          questionText: question.text,
          weight: isWeighted ? parseFloat(question.weight) || 1 : 1,
          averageScore: avgScore,
          responseCount: responseCount,
          totalQuestionScore: totalScore
        };
      });

      // Kalkulasi skor indikator
      let indicatorScore = 0;
      if (isWeighted && totalQuestionWeight > 0) {
        // Untuk survei berbobot, hitung rata-rata tertimbang
        indicatorScore = questionScores.reduce((sum: number, q: any) =>
          sum + (q.averageScore * q.weight / totalQuestionWeight), 0);
      } else {
        // Untuk survei tidak berbobot, hitung total skor dibagi (jumlah responden * jumlah pertanyaan)
        const totalQuestionScore = questionScores.reduce((sum: number, q: { totalQuestionScore: number }) => sum + q.totalQuestionScore, 0);
        const totalResponses = Math.max(...questionScores.map((q: { responseCount: number }) => q.responseCount)) || 0;
        const questionCount = questionScores.length;

        indicatorScore = totalResponses > 0 && questionCount > 0
          ? totalQuestionScore / (totalResponses * questionCount)
          : 0;
      }

      return {
        indicatorId: indicator.id,
        indicatorTitle: indicator.name || indicator.title,
        weight: isWeighted ? parseFloat(indicator.weight) || 1 : 1,
        score: indicatorScore,
        questions: questionScores,
        // Informasi tambahan untuk perhitungan detail
        calculationDetails: {
          totalRespondents: Math.max(...questionScores.map((q: { responseCount: number }) => q.responseCount)) || 0,
          totalQuestions: questionScores.length,
          totalScore: questionScores.reduce((sum: number, q: { totalQuestionScore: number }) => sum + q.totalQuestionScore, 0)
        }
      };
    });

    // Kalkulasi skor keseluruhan
    let overallScore = 0;
    const totalResponses = responses.length;
    const totalQuestions = indicators.reduce((sum: number, ind: any) => {
      return sum + (ind.questions?.length || 0);
    }, 0);

    const totalScore = responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0);

    if (isWeighted && totalIndicatorWeight > 0) {
      // Untuk survei berbobot, hitung rata-rata tertimbang
      overallScore = indicatorScores.reduce((sum: number, ind: any) =>
        sum + (ind.score * ind.weight / totalIndicatorWeight), 0);
    } else {
      // Untuk survei tidak berbobot, rumus: S / (n × p)
      overallScore = totalResponses > 0 && totalQuestions > 0
        ? totalScore / (totalResponses * totalQuestions)
        : 0;
    }

    // Informasi periode
    let periodInfo = {};
    if (options.year && options.quarter) {
      periodInfo = {
        year: options.year,
        quarter: options.quarter,
        periodType: 'quarter'
      };
    } else if (options.year && options.semester) {
      periodInfo = {
        year: options.year,
        semester: options.semester,
        periodType: 'semester'
      };
    } else if (options.year) {
      periodInfo = {
        year: options.year,
        periodType: 'year'
      };
    } else if (options.startDate && options.endDate) {
      periodInfo = {
        startDate: options.startDate,
        endDate: options.endDate,
        periodType: 'custom'
      };
    }

    // Masukkan kembali ID yang valid
    return {
      surveyId: validSurveyId,
      surveyTitle: surveyData.title,
      isWeighted,
      respondentCount: totalResponses,
      averageScore: overallScore,
      indicators: indicatorScores,
      totalQuestions,
      totalScore,
      ikm: convertToIKMScale(overallScore),
      calculationFormula: isWeighted
        ? "Rata-rata tertimbang dari setiap indikator berdasarkan bobot"
        : "S / (n × p) = Total Skor / (Jumlah Responden × Jumlah Pertanyaan)",
      ...periodInfo
    };

  } catch (error) {
    console.error('Error in getSurveyStatisticsByPeriod:', error);
    throw error;
  }
}

// Definisi tipe untuk periode survei
interface SurveyPeriod {
  type: string;
  year: number;
  value: string;
  quarter?: string;
  semester?: string;
}

// Mendapatkan semua survei dengan data lengkap
export async function getAllSurveysWithDetails() {
  const { data, error } = await supabaseClient
    .from('surveys')
    .select(`
      *,
      indicators: indicators(
        *,
        questions: questions(*)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Debug data mentah dari database
  console.log("Raw survey data from database:", data.map(s => ({
    id: s.id,
    title: s.title,
    period_type: s.period_type,
    period_year: s.period_year,
    period: s.period // Kolom 'period' yang menyimpan nilai periode (Q1, Q2, Q3, Q4, S1, S2)
  })));

  // Transformasi data untuk memetakan nama kolom dari database ke format aplikasi
  return data.map(survey => {
    // Map indikator
    const mappedIndicators = survey.indicators.map((indicator: any) => ({
      ...indicator,
      title: indicator.name, // Map name ke title
      survey_id: indicator.survey_id,
      questions: indicator.questions.map((question: any) => ({
        ...question,
        indicator_id: question.indicator_id
      }))
    }));

    // Format data periode dari kolom database ke format yang digunakan oleh aplikasi
    const period: SurveyPeriod = {
      type: survey.period_type || 'quarterly', // Default ke quarterly jika tidak ada
      year: survey.period_year || new Date().getFullYear(), // Default ke tahun sekarang
      value: survey.period || '' // Menggunakan nilai period dari kolom di database
    };

    // Simpan nilai quarter atau semester ke property yang sesuai berdasarkan tipe periode
    if (survey.period_type === 'quarterly') {
      // Menggunakan nilai period langsung (tanpa prefix 'Q')
      period.quarter = survey.period ? survey.period.replace('Q', '') : '1';
    } else if (survey.period_type === 'semester') {
      // Menggunakan nilai period langsung (tanpa prefix 'S')
      period.semester = survey.period ? survey.period.replace('S', '') : '1';
    }

    console.log("Period data converted:", {
      id: survey.id,
      title: survey.title,
      database: {
        period_type: survey.period_type,
        period_year: survey.period_year,
        period: survey.period
      },
      app_format: period
    });

    // Return survei dengan data lengkap
    return {
      ...survey,
      isActive: survey.is_active,
      indicators: mappedIndicators,
      isWeighted: survey.type === 'weighted',
      period // Tambahkan objek periode yang sudah diformat
    };
  });
}

/**
 * Mendapatkan tren hasil survei per periode (tahun, semester, kuartal)
 * @param surveyId ID survei
 * @param periods Array periode yang akan diambil, contoh: [{ year: 2024, quarter: 1 }, { year: 2024, quarter: 2 }]
 */
export async function getSurveyTrends(
  surveyId: string,
  periods: Array<{
    year: number;
    quarter?: number;
    semester?: number;
    startDate?: string;
    endDate?: string;
  }>
) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    // Dapatkan data survei
    const surveyData = await getSurveyById(validSurveyId);

    // Dapatkan statistik untuk setiap periode
    const trendsPromises = periods.map(async (period) => {
      try {
        const stats = await getSurveyStatisticsByPeriod(validSurveyId, period);

        // Format nama periode
        let periodName = `${period.year}`;
        if (period.quarter) {
          periodName = `Q${period.quarter} ${period.year}`;
        } else if (period.semester) {
          periodName = `S${period.semester} ${period.year}`;
        } else if (period.startDate && period.endDate) {
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);
          periodName = `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`;
        }

        return {
          ...stats,
          periodName,
          period
        };
      } catch (error) {
        console.error(`Error getting stats for period:`, period, error);
        return null;
      }
    });

    const trends = await Promise.all(trendsPromises);
    return trends.filter(Boolean);
  } catch (error) {
    console.error('Error in getSurveyTrends:', error);
    throw error;
  }
}

/**
 * Mendapatkan statistik perbandingan antar periode untuk memudahkan analisis
 * @param surveyId ID survei
 * @param periods Array periode yang akan dibandingkan
 */
export async function getComparisonStatistics(
  surveyId: string,
  periods: Array<{
    year: number;
    quarter?: number;
    semester?: number;
    startDate?: string;
    endDate?: string;
  }>
) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);
    const trends = await getSurveyTrends(validSurveyId, periods);

    if (!trends || trends.length === 0) {
      return {
        periods: [],
        indicators: [],
        overall: []
      };
    }

    // Dapatkan semua indikator yang unik
    const allIndicators = new Map();
    trends.forEach(trend => {
      if (trend) {
        trend.indicators.forEach((indicator: any) => {
          if (!allIndicators.has(indicator.indicatorId)) {
            allIndicators.set(indicator.indicatorId, {
              id: indicator.indicatorId,
              title: indicator.indicatorTitle,
              scores: []
            });
          }

          allIndicators.get(indicator.indicatorId).scores.push({
            periodName: trend.periodName,
            score: indicator.score,
            ikm: convertToIKMScale(indicator.score)
          });
        });
      }
    });

    // Format data untuk tampilan chart dan tabel
    return {
      surveyId: validSurveyId,
      periods: trends.map(t => t ? t.periodName : '').filter(Boolean),
      indicators: Array.from(allIndicators.values()),
      overall: trends.filter(Boolean).map(t => ({
        periodName: t!.periodName,
        score: t!.averageScore,
        ikm: t!.ikm,
        respondentCount: t!.respondentCount
      }))
    };
  } catch (error) {
    console.error('Error in getComparisonStatistics:', error);
    throw error;
  }
}

/**
 * Perbaikan pada fungsi perhitungan statistik survei untuk memastikan hasil yang akurat
 */
export async function getSurveyDetailedStatistics(surveyId: string, options?: {
  year?: number;
  quarter?: number;
  semester?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const validSurveyId = await getSurveyValidId(surveyId);

    // Dapatkan statistik umum terlebih dahulu
    const stats = options
      ? await getSurveyStatisticsByPeriod(validSurveyId, options)
      : await getSurveyStatistics(validSurveyId);
    // Untuk setiap indikator, tambahkan detail perhitungan
    const indicatorsWithDetails = stats.indicators.map((indicator: any) => {
      // Hitung total responden untuk indikator ini
      const totalRespondents = indicator.calculationDetails.totalRespondents;

      // Hitung total pertanyaan
      const totalQuestions = indicator.calculationDetails.totalQuestions;

      // Hitung total skor mentah
      const rawTotalScore = indicator.calculationDetails.totalScore;

      // Hitung denominator (n * p)
      const denominator = totalRespondents * totalQuestions;
      // Formula spesifik untuk jenis survei
      const formula = 'isWeighted' in stats && stats.isWeighted
        ? `Skor = Σ(skor pertanyaan × bobot) ÷ total bobot`
        : `Skor = S ÷ (n × p) = ${rawTotalScore.toFixed(2)} ÷ (${totalRespondents} × ${totalQuestions})`;
      // Nilai aktual (hasilnya)
      const result = 'isWeighted' in stats && stats.isWeighted
        ? indicator.score.toFixed(2)
        : denominator > 0
          ? (rawTotalScore / denominator).toFixed(2)
          : "0.00";

      return {
        ...indicator,
        detailedCalculation: {
          totalRespondents,
          totalQuestions,
          rawTotalScore: parseFloat(rawTotalScore.toFixed(2)),
          denominator,
          formula,
          result: parseFloat(result)
        }
      };
    });

    // Kalkulasi detail untuk keseluruhan survei
    const overallCalculation = {
      totalRespondents: stats.respondentCount,
      totalQuestions: stats.totalQuestions,
      totalScore: stats.totalScore,
      denominator: stats.respondentCount * stats.totalQuestions,
      formula: 'isWeighted' in stats && stats.isWeighted
        ? "Skor IKM = Rata-rata tertimbang dari semua indikator berdasarkan bobotnya"
        : `Skor IKM = S ÷ (n × p) = ${stats.totalScore} ÷ (${stats.respondentCount} × ${stats.totalQuestions})`,
      result: stats.averageScore,
      ikm: stats.ikm,
      ikmFormula: `IKM = ${stats.averageScore.toFixed(2)} × 0.75 + 0.25 = ${stats.ikm}`
    };

    // Kembalikan statistik dengan detail perhitungan tambahan
    return {
      ...stats,
      indicators: indicatorsWithDetails,
      overallCalculation,
      qualityDescription: getQualityDescription(stats.ikm)
    };
  } catch (error) {
    console.error('Error in getSurveyDetailedStatistics:', error);
    throw error;
  }
}

/**
 * Mendapatkan deskripsi kualitas berdasarkan skor IKM
 * @param ikm Skor IKM (1-4)
 */
function getQualityDescription(ikm: number): string {
  if (ikm >= 3.26 && ikm <= 4.00) return "Sangat Baik (A)";
  if (ikm >= 2.51 && ikm <= 3.25) return "Baik (B)";
  if (ikm >= 1.76 && ikm <= 2.50) return "Kurang Baik (C)";
  if (ikm >= 1.00 && ikm <= 1.75) return "Tidak Baik (D)";
  return "Tidak ada data";
}

/**
 * Demographic Field Services
 */

// Menambahkan field demografis ke survei
export async function addDemographicField(field: {
  survey_id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  field_order?: number;
}) {
  try {
    console.log(`Adding demographic field "${field.label}" to survey ${field.survey_id}`);

    // Format data untuk penyimpanan ke database
    const fieldData = {
      survey_id: field.survey_id,
      label: field.label,
      type: field.type,
      required: field.required !== undefined ? field.required : true,
      options: field.options ? JSON.stringify(field.options) : null,
      field_order: field.field_order || 1
    };

    const { data, error } = await supabaseClient
      .from('demographic_fields')
      .insert([fieldData])
      .select()
      .single();

    if (error) {
      console.error("Error adding demographic field:", error);
      throw error;
    }

    console.log(`Demographic field created with ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error('Error in addDemographicField:', error);
    throw error;
  }
}

// Mendapatkan semua field demografis untuk suatu survei
export async function getDemographicFields(surveyId: string) {
  try {
    console.log(`Mengambil demographic fields untuk survey_id: ${surveyId}`);

    // Validasi surveyId
    if (!surveyId) {
      console.error("Error: surveyId kosong");
      return [];
    }

    const { data, error } = await supabaseClient
      .from('demographic_fields')
      .select('*')
      .eq('survey_id', surveyId)
      .order('field_order', { ascending: true });

    if (error) {
      console.error('Error from Supabase:', error);
      throw error;
    }

    console.log(`Ditemukan ${data?.length || 0} demographic fields untuk survey ${surveyId}`);

    if (!data || data.length === 0) {
      console.log("Mencoba query tanpa filter untuk debugging");

      // Coba ambil semua field demografis untuk logging
      const { data: allFields, error: allError } = await supabaseClient
        .from('demographic_fields')
        .select('*')
        .limit(100);

      if (!allError && allFields && allFields.length > 0) {
        console.log(`Total demographic fields di database: ${allFields.length}`);
        console.log("Sampel 3 field:", allFields.slice(0, 3));

        // Cek apakah ada field dengan surveyId yang cocok
        const matchingFields = allFields.filter(f => f.survey_id === surveyId);
        console.log(`Field yang cocok dengan surveyId=${surveyId}: ${matchingFields.length}`);
      }

      return [];
    }

    // Log sample data
    if (data.length > 0) {
      console.log("Sampel field demografis pertama:", {
        id: data[0].id,
        label: data[0].label,
        survey_id: data[0].survey_id,
        type: data[0].type
      });

      if (data[0].options) {
        console.log("Format options:", typeof data[0].options);
      }
    }

    // Ubah options dari JSON string ke array
    return data.map(field => {
      let parsedOptions = [];
      if (field.options) {
        try {
          parsedOptions = typeof field.options === 'string'
            ? JSON.parse(field.options)
            : (Array.isArray(field.options) ? field.options : []);
        } catch (e) {
          console.error(`Error parsing options untuk field ${field.id}:`, e);
          console.log("Nilai options yang gagal di-parse:", field.options);
          parsedOptions = [];
        }
      }

      return {
        ...field,
        options: parsedOptions
      };
    });
  } catch (error) {
    console.error('Error getting demographic fields:', error);
    return []; // Return empty array instead of throwing error
  }
}

// Menyimpan respon demografis
export async function saveDemographicResponse(response: {
  response_id: string;
  field_id: string;
  value: string | number | string[];
}) {
  try {
    // Konversi nilai ke string jika perlu
    const value = Array.isArray(response.value)
      ? JSON.stringify(response.value)
      : String(response.value);

    const { data, error } = await supabaseClient
      .from('demographic_responses')
      .insert([{
        response_id: response.response_id,
        field_id: response.field_id,
        value
      }])
      .select()
      .single();

    if (error) {
      console.error("Error saving demographic response:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveDemographicResponse:', error);
    throw error;
  }
}

// Mendapatkan semua respon demografis untuk suatu respons survei
export async function getDemographicResponses(responseId: string) {
  try {
    const { data, error } = await supabaseClient
      .from('demographic_responses')
      .select(`
        *,
        demographic_fields (*)
      `)
      .eq('response_id', responseId);

    if (error) throw error;

    // Format hasil
    return data.map(response => {
      const field = response.demographic_fields;
      let value = response.value;

      // Parse value berdasarkan tipe field
      if (field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox') {
        try {
          // Coba parse sebagai JSON jika mungkin multiple options
          value = JSON.parse(value);
        } catch (e) {
          // Jika bukan JSON valid, biarkan sebagai string
        }
      } else if (field.type === 'number') {
        value = Number(value);
      }

      return {
        id: response.id,
        responseId: response.response_id,
        fieldId: response.field_id,
        field: {
          ...field,
          options: field.options ? JSON.parse(field.options) : []
        },
        value,
        createdAt: response.created_at
      };
    });
  } catch (error) {
    console.error('Error getting demographic responses:', error);
    throw error;
  }
}

/**
 * Verifikasi skema tabel yang diperlukan
 * Fungsi ini akan memverifikasi bahwa tabel dan kolom yang diperlukan ada dalam database
 * @param {boolean} skipErrors Jika true, tetap mengembalikan sukses meskipun ada error
 */
export async function verifyDatabaseSchema(skipErrors = false) {
  // Jika verifikasi dinonaktifkan, langsung kembalikan sukses
  if (!ENABLE_SCHEMA_VERIFICATION) {
    console.log("Verifikasi skema database dilewati (dinonaktifkan)");
    return true;
  }

  console.log("Memverifikasi skema database...");
  const requiredTables = ['surveys', 'indicators', 'questions', 'demographic_fields'];
  let allTablesValid = true;

  // Cek keberadaan tabel-tabel yang diperlukan
  for (const table of requiredTables) {
    try {
      // Coba kueri sederhana untuk memverifikasi keberadaan tabel
      console.log(`Verifikasi tabel ${table}...`);
      const { data, error } = await supabaseClient
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        console.error(`Error verifikasi tabel ${table}:`, error);
        console.error(`Detail error:`, JSON.stringify(error, null, 2));
        if (!skipErrors) allTablesValid = false;
      } else {
        console.log(`✓ Tabel ${table} valid.`);
      }
    } catch (err) {
      console.error(`Kesalahan saat memverifikasi tabel ${table}:`, err);
      console.error(`Stack trace:`, err instanceof Error ? err.stack : 'Tidak ada stack trace');
      if (!skipErrors) allTablesValid = false;
    }
  }

  // Verifikasi skema tabel questions dengan menggunakan try-catch yang lebih aman
  try {
    console.log("Verifikasi kolom tabel questions...");

    try {
      // Metode yang lebih sederhana: Coba query langsung ke tabel questions
      const { data, error } = await supabaseClient
        .from('questions')
        .select('id')
        .limit(1);

      if (error) {
        console.error("Error saat verifikasi tabel questions:", error);
        if (!skipErrors) allTablesValid = false;
      } else {
        console.log("✓ Tabel questions dapat diakses.");
      }
    } catch (simpleErr) {
      console.error("Error pada verifikasi sederhana tabel questions:", simpleErr);
      if (!skipErrors) allTablesValid = false;
    }

    // Mencoba mendapatkan baris sampel hanya jika verifikasi dasar berhasil
    if (allTablesValid || skipErrors) {
      try {
        const { data: sampleData, error: sampleError } = await supabaseClient
          .from('questions')
          .select('*')
          .limit(1);

        if (sampleError) {
          console.error("Error saat mengambil sample data questions:", sampleError);
        } else if (sampleData && sampleData.length > 0) {
          // Dapatkan struktur kolom dari data sampel
          const sampleRow = sampleData[0];
          const columns = Object.keys(sampleRow);
          console.log(`✓ Struktur tabel questions: ${columns.join(', ')}`);
        } else {
          console.log("ℹ️ Tabel questions kosong, tidak dapat memverifikasi struktur kolom.");
        }
      } catch (sampleErr) {
        console.error("Error saat mengambil data sampel dari questions:", sampleErr);
        // Tidak mempengaruhi allTablesValid karena ini hanya verifikasi tambahan
      }
    }
  } catch (err) {
    console.error("Kesalahan umum saat memverifikasi tabel questions:", err);
    if (!skipErrors) allTablesValid = false;
  }

  return allTablesValid;
}

// Panggil di awal aplikasi untuk memastikan skema benar
if (typeof window !== 'undefined') {
  // Hanya jalankan di client-side
  const VERIFICATION_DELAY = 3000; // Delay 3 detik
  console.log(`Menunda verifikasi skema database selama ${VERIFICATION_DELAY}ms...`);

  setTimeout(() => {
    // Jika verifikasi gagal, coba lagi dengan opsi skipErrors=true
    verifyDatabaseSchema().then(valid => {
      if (!valid) {
        console.warn("⚠️ Skema database memiliki masalah. Mencoba ulang dengan opsi skip errors...");

        // Coba lagi dengan skipErrors=true setelah delay tambahan
        setTimeout(() => {
          verifyDatabaseSchema(true).then(forcedValid => {
            console.log("✅ Aplikasi melanjutkan meskipun ada masalah dengan skema database.");
          }).catch(err => {
            console.error("❌ Fatal error saat verifikasi ulang skema database:", err);
          });
        }, 1000);
      } else {
        console.log("✅ Skema database terverifikasi sempurna.");
      }
    }).catch(err => {
      console.error("❌ Error saat verifikasi skema database:", err);
      console.log("Mencoba melanjutkan tanpa verifikasi skema...");
    });
  }, VERIFICATION_DELAY);
}
