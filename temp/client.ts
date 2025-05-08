import { createClient } from '@supabase/supabase-js';
import { Survey, Indicator, Question, Response, Answer } from '../lib/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Instansiasi klien Supabase untuk digunakan di server-side
export const supabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Survey Services
 */

// Membuat survei baru dengan tipe (berbobot atau tidak berbobot)
export async function createSurvey(survey: {
  title: string;
  description: string;
  is_weighted: boolean;
  created_by: string;
  status: 'draft' | 'published' | 'closed';
}) {
  const { data, error } = await supabaseClient
    .from('surveys')
    .insert([survey])
    .select()
    .single();

  if (error) throw error;
  return data;
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

// Mendapatkan survei berdasarkan ID dengan relasi indikator dan pertanyaan
export async function getSurveyById(id: string) {
  const { data, error } = await supabaseClient
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

// Memperbarui survei yang sudah ada
export async function updateSurvey(id: string, updates: Partial<Omit<Survey, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabaseClient
    .from('surveys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Menghapus survei berdasarkan ID
export async function deleteSurvey(id: string) {
  const { error } = await supabaseClient
    .from('surveys')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

/**
 * Indicator Services
 */

// Menambahkan indikator ke survei
export async function addIndicator(indicator: {
  survey_id: string;
  title: string;
  description: string;
  weight: number;
  order: number;
}) {
  const { data, error } = await supabaseClient
    .from('indicators')
    .insert([indicator])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Mendapatkan semua indikator untuk survei tertentu
export async function getIndicatorsBySurveyId(surveyId: string) {
  const { data, error } = await supabaseClient
    .from('indicators')
    .select('*, questions(*)')
    .eq('survey_id', surveyId)
    .order('order', { ascending: true });

  if (error) throw error;
  return data;
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
  weight: number;
  order: number;
}) {
  const { data, error } = await supabaseClient
    .from('questions')
    .insert([question])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Mendapatkan semua pertanyaan untuk indikator tertentu
export async function getQuestionsByIndicatorId(indicatorId: string) {
  const { data, error } = await supabaseClient
    .from('questions')
    .select('*')
    .eq('indicator_id', indicatorId)
    .order('order', { ascending: true });

  if (error) throw error;
  return data;
}

// Memperbarui pertanyaan
export async function updateQuestion(id: string, updates: Partial<Omit<Question, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabaseClient
    .from('questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
}) {
  // Mulai transaksi dengan menyimpan respon utama
  const { data: response, error: responseError } = await supabaseClient
    .from('responses')
    .insert([{
      survey_id: responseData.survey_id,
      respondent_id: responseData.respondent_id
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
    .eq('survey_id', surveyId);

  if (error) throw error;
  return data;
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
    .eq('survey_id', surveyId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  return data;
}

/**
 * Mendapatkan respons survey berdasarkan tahun
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 */
export async function getResponsesByYear(surveyId: string, year: number) {
  const startDate = `${year}-01-01T00:00:00Z`;
  const endDate = `${year}-12-31T23:59:59Z`;

  return getResponsesByDateRange(surveyId, startDate, endDate);
}

/**
 * Mendapatkan respons survey berdasarkan tahun dan kuartal
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 * @param quarter Kuartal (1-4)
 */
export async function getResponsesByQuarter(surveyId: string, year: number, quarter: number) {
  if (quarter < 1 || quarter > 4) {
    throw new Error('Quarter must be between 1 and 4');
  }

  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? '28' : endMonth === 4 || endMonth === 6 || endMonth === 9 || endMonth === 11 ? '30' : '31'}T23:59:59Z`;

  return getResponsesByDateRange(surveyId, startDate, endDate);
}

/**
 * Mendapatkan respons survey berdasarkan tahun dan semester
 * @param surveyId ID survey
 * @param year Tahun dalam format YYYY
 * @param semester Semester (1-2)
 */
export async function getResponsesBySemester(surveyId: string, year: number, semester: number) {
  if (semester < 1 || semester > 2) {
    throw new Error('Semester must be between 1 and 2');
  }

  const startMonth = (semester - 1) * 6 + 1;
  const endMonth = semester * 6;

  const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`;
  const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${endMonth === 2 ? '28' : endMonth === 4 || endMonth === 6 || endMonth === 9 || endMonth === 11 ? '30' : '31'}T23:59:59Z`;

  return getResponsesByDateRange(surveyId, startDate, endDate);
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
  // Dapatkan detail survei terlebih dahulu
  const surveyData = await getSurveyById(surveyId);
  const isWeighted = surveyData.is_weighted;

  // Dapatkan semua respons
  const responses = await getResponsesBySurveyId(surveyId);

  if (!responses || responses.length === 0) {
    return {
      respondentCount: 0,
      averageScore: 0,
      indicators: []
    };
  }

  // Kumpulkan semua indikator dan pertanyaan untuk kalkulasi
  const indicators = surveyData.indicators || [];

  // Hitung total bobot indikator (untuk survei berbobot)
  const totalIndicatorWeight = isWeighted
    ? indicators.reduce((sum: number, ind: any) => sum + (ind.weight || 1), 0)
    : indicators.length;

  // Kalkulasi skor untuk setiap indikator
  const indicatorScores = indicators.map((indicator: any) => {
    const questions = indicator.questions || [];
    const totalQuestionWeight = isWeighted
      ? questions.reduce((sum: number, q: any) => sum + (q.weight || 1), 0)
      : questions.length;

    // Hitung skor untuk setiap pertanyaan
    const questionScores = questions.map((question: any) => {
      const allAnswers = responses.flatMap((r: any) =>
        r.answers.filter((a: any) => a.question_id === question.id)
      );

      const totalScore = allAnswers.reduce((sum: number, a: any) => sum + a.score, 0);
      const avgScore = allAnswers.length > 0 ? totalScore / allAnswers.length : 0;

      return {
        questionId: question.id,
        questionText: question.text,
        weight: isWeighted ? question.weight : 1,
        averageScore: avgScore,
        responseCount: allAnswers.length
      };
    });

    // Kalkulasi skor indikator
    let indicatorScore = 0;
    if (isWeighted && totalQuestionWeight > 0) {
      // Untuk survei berbobot, hitung rata-rata tertimbang
      indicatorScore = questionScores.reduce((sum: number, q: any) =>
        sum + (q.averageScore * q.weight / totalQuestionWeight), 0);
    } else {
      // Untuk survei tidak berbobot, hitung jumlah skor dibagi (jumlah responden * jumlah pertanyaan)
      const totalQuestionScore = questionScores.reduce((sum: number, q: any) => sum + (q.averageScore * q.responseCount), 0);
      const totalResponses = questionScores.reduce((sum: number, q: any) => sum + q.responseCount, 0);
      const questionCount = questionScores.length;
      const respondentCount = totalResponses / questionCount || 0;

      indicatorScore = respondentCount > 0 && questionCount > 0
        ? totalQuestionScore / (respondentCount * questionCount)
        : 0;
    }

    return {
      indicatorId: indicator.id,
      indicatorTitle: indicator.title,
      weight: isWeighted ? indicator.weight : 1,
      score: indicatorScore,
      questions: questionScores
    };
  });

  // Kalkulasi skor keseluruhan
  let overallScore = 0;
  if (isWeighted && totalIndicatorWeight > 0) {
    // Untuk survei berbobot, hitung rata-rata tertimbang
    overallScore = indicatorScores.reduce((sum: number, ind: any) =>
      sum + (ind.score * ind.weight / totalIndicatorWeight), 0);
  } else {
    // Untuk survei tidak berbobot, hitung jumlah semua skor dibagi jumlah total responden * total pertanyaan
    const totalResponses = responses.length;
    const totalQuestions = indicators.reduce((sum: number, ind: any) => {
      return sum + (ind.questions?.length || 0);
    }, 0);

    const totalScore = responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0);

    overallScore = totalResponses > 0 && totalQuestions > 0
      ? totalScore / (totalResponses * totalQuestions)
      : 0;
  }

  return {
    surveyId,
    surveyTitle: surveyData.title,
    isWeighted,
    respondentCount: responses.length,
    averageScore: overallScore,
    indicators: indicatorScores,

    // Tambahan untuk keperluan perhitungan dan tampilan detail
    totalQuestions: indicators.reduce((sum: number, ind: any) => sum + (ind.questions?.length || 0), 0),
    totalScore: responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0),
    ikm: convertToIKMScale(overallScore)
  };
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
  // Dapatkan detail survei terlebih dahulu
  const surveyData = await getSurveyById(surveyId);
  const isWeighted = surveyData.is_weighted;

  // Tentukan rentang tanggal berdasarkan opsi yang diberikan
  let responses;
  if (options.startDate && options.endDate) {
    responses = await getResponsesByDateRange(surveyId, options.startDate, options.endDate);
  } else if (options.year && options.quarter) {
    responses = await getResponsesByQuarter(surveyId, options.year, options.quarter);
  } else if (options.year && options.semester) {
    responses = await getResponsesBySemester(surveyId, options.year, options.semester);
  } else if (options.year) {
    responses = await getResponsesByYear(surveyId, options.year);
  } else {
    responses = await getResponsesBySurveyId(surveyId);
  }

  if (!responses || responses.length === 0) {
    return {
      respondentCount: 0,
      averageScore: 0,
      indicators: []
    };
  }

  // Kumpulkan semua indikator dan pertanyaan untuk kalkulasi
  const indicators = surveyData.indicators || [];

  // Hitung total bobot indikator (untuk survei berbobot)
  const totalIndicatorWeight = isWeighted
    ? indicators.reduce((sum: number, ind: any) => sum + (ind.weight || 1), 0)
    : indicators.length;

  // Kalkulasi skor untuk setiap indikator
  const indicatorScores = indicators.map((indicator: any) => {
    const questions = indicator.questions || [];
    const totalQuestionWeight = isWeighted
      ? questions.reduce((sum: number, q: any) => sum + (q.weight || 1), 0)
      : questions.length;

    // Hitung skor untuk setiap pertanyaan
    const questionScores = questions.map((question: any) => {
      const allAnswers = responses.flatMap((r: any) =>
        r.answers.filter((a: any) => a.question_id === question.id)
      );

      const totalScore = allAnswers.reduce((sum: number, a: any) => sum + a.score, 0);
      const avgScore = allAnswers.length > 0 ? totalScore / allAnswers.length : 0;

      return {
        questionId: question.id,
        questionText: question.text,
        weight: isWeighted ? question.weight : 1,
        averageScore: avgScore,
        responseCount: allAnswers.length
      };
    });

    // Kalkulasi skor indikator
    let indicatorScore = 0;
    if (isWeighted && totalQuestionWeight > 0) {
      // Untuk survei berbobot, hitung rata-rata tertimbang
      indicatorScore = questionScores.reduce((sum: number, q: any) =>
        sum + (q.averageScore * q.weight / totalQuestionWeight), 0);
    } else {
      // Untuk survei tidak berbobot, hitung jumlah skor dibagi (jumlah responden * jumlah pertanyaan)
      const totalQuestionScore = questionScores.reduce((sum: number, q: any) => sum + (q.averageScore * q.responseCount), 0);
      const totalResponses = questionScores.reduce((sum: number, q: any) => sum + q.responseCount, 0);
      const questionCount = questionScores.length;
      const respondentCount = totalResponses / questionCount || 0;

      indicatorScore = respondentCount > 0 && questionCount > 0
        ? totalQuestionScore / (respondentCount * questionCount)
        : 0;
    }

    return {
      indicatorId: indicator.id,
      indicatorTitle: indicator.title,
      weight: isWeighted ? indicator.weight : 1,
      score: indicatorScore,
      questions: questionScores
    };
  });

  // Kalkulasi skor keseluruhan
  let overallScore = 0;
  if (isWeighted && totalIndicatorWeight > 0) {
    // Untuk survei berbobot, hitung rata-rata tertimbang
    overallScore = indicatorScores.reduce((sum: number, ind: any) =>
      sum + (ind.score * ind.weight / totalIndicatorWeight), 0);
  } else {
    // Untuk survei tidak berbobot, hitung jumlah semua skor dibagi jumlah total responden * total pertanyaan
    const totalResponses = responses.length;
    const totalQuestions = indicators.reduce((sum: number, ind: any) => {
      return sum + (ind.questions?.length || 0);
    }, 0);

    const totalScore = responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0);

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

  return {
    surveyId,
    surveyTitle: surveyData.title,
    isWeighted,
    respondentCount: responses.length,
    averageScore: overallScore,
    indicators: indicatorScores,

    // Tambahan untuk keperluan perhitungan dan tampilan detail
    totalQuestions: indicators.reduce((sum: number, ind: any) => sum + (ind.questions?.length || 0), 0),
    totalScore: responses.reduce((sum: number, r: any) => {
      return sum + r.answers.reduce((answerSum: number, a: any) => answerSum + a.score, 0);
    }, 0),
    ikm: convertToIKMScale(overallScore),

    // Informasi periode
    ...periodInfo
  };
}
