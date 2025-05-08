import { createClient } from '@supabase/supabase-js';
import { Survey, Indicator, Question, Response, Answer } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi untuk membuat survei baru
export async function createSurvey(survey: Omit<Survey, 'id' | 'created_at' | 'updated_at'>) {
  try {
    console.log("Creating survey in Supabase:", JSON.stringify(survey, null, 2));

    const { data, error } = await supabase
      .from('surveys')
      .insert([survey])
      .select()
      .single();

    if (error) {
      console.error("Error creating survey in Supabase:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to create survey: ${error.message}`);
    }

    console.log("Survey created successfully with ID:", data.id);
    return data;
  } catch (err) {
    console.error("Exception in createSurvey:", err);
    throw err;
  }
}

// Fungsi untuk menambahkan indikator ke survei
export async function addIndicator(indicator: Omit<Indicator, 'id' | 'created_at' | 'updated_at'>) {
  try {
    console.log("Adding indicator for survey_id:", indicator.survey_id);

    const { data, error } = await supabase
      .from('indicators')
      .insert([indicator])
      .select()
      .single();

    if (error) {
      console.error("Error adding indicator:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to add indicator: ${error.message}`);
    }

    console.log("Indicator added successfully with ID:", data.id);
    return data;
  } catch (err) {
    console.error("Exception in addIndicator:", err);
    throw err;
  }
}

// Fungsi untuk menambahkan pertanyaan ke indikator
export async function addQuestion(question: Omit<Question, 'id' | 'created_at' | 'updated_at'>) {
  try {
    console.log("Adding question for indicator_id:", question.indicator_id);

    const { data, error } = await supabase
      .from('questions')
      .insert([question])
      .select()
      .single();

    if (error) {
      console.error("Error adding question:", JSON.stringify(error, null, 2));
      throw new Error(`Failed to add question: ${error.message}`);
    }

    console.log("Question added successfully with ID:", data.id);
    return data;
  } catch (err) {
    console.error("Exception in addQuestion:", err);
    throw err;
  }
}

// Fungsi untuk mendapatkan survei berdasarkan ID
export async function getSurveyById(id: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select(`
      *,
      indicators (
        *,
        questions (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Fungsi untuk menyimpan jawaban responden
export async function saveResponse(response: {
  survey_id: string;
  respondent_id: string;
  answers: { question_id: string; score: number }[];
}) {
  // Mulai transaksi
  const { data: responseData, error: responseError } = await supabase
    .from('responses')
    .insert([{
      survey_id: response.survey_id,
      respondent_id: response.respondent_id
    }])
    .select()
    .single();

  if (responseError) throw responseError;

  // Simpan jawaban
  const answers = response.answers.map(answer => ({
    response_id: responseData.id,
    question_id: answer.question_id,
    score: answer.score
  }));

  const { error: answersError } = await supabase
    .from('answers')
    .insert(answers);

  if (answersError) throw answersError;

  return responseData;
}
