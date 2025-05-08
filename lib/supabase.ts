import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { convertToDbQuestionType } from './question-types';

const supabase = createClientComponentClient();

interface QuestionParams {
  indicator_id: string;
  text: string;
  type: string;
  required: boolean;
  options?: string[];
  weight: number;
  order?: number;
}

/**
 * Interface untuk parameter survey
 */
interface SurveyParams {
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  survey_category: string;
  is_active: boolean;
  period_type: string;
  period_year: number;
  period: string;
}

/**
 * Interface untuk parameter indikator
 */
interface IndicatorParams {
  survey_id: string;
  title: string;
  description?: string;
  weight?: number;
}

/**
 * Interface untuk parameter field demografis
 */
interface DemographicFieldParams {
  survey_id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  field_order: number;
}

/**
 * Menambahkan pertanyaan baru ke database
 * @param params Parameter pertanyaan
 * @returns Pertanyaan yang ditambahkan
 */
export async function addQuestion(params: QuestionParams) {
  try {
    console.log(`Menambahkan pertanyaan dengan tipe: ${params.type}`);

    // Konversi tipe pertanyaan dari frontend ke tipe database
    const dbQuestionType = convertToDbQuestionType(params.type);
    console.log(`Tipe pertanyaan dikonversi ke: ${dbQuestionType}`);

    const { data, error } = await supabase
      .from('questions')
      .insert({
        indicator_id: params.indicator_id,
        text: params.text,
        type: dbQuestionType, // Gunakan tipe yang sudah dikonversi
        required: params.required,
        options: params.options ? JSON.stringify(params.options) : null,
        weight: params.weight,
        order: params.order || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding question:', error);
      throw error;
    }

    console.log('Question added successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in addQuestion:', error);
    throw error;
  }
}

/**
 * Mengambil pertanyaan berdasarkan ID
 * @param id ID pertanyaan
 * @returns Pertanyaan yang ditemukan
 */
export async function getQuestion(id: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error getting question:', error);
    throw error;
  }

  return data;
}

/**
 * Memperbarui pertanyaan berdasarkan ID
 * @param id ID pertanyaan
 * @param params Parameter pertanyaan yang akan diperbarui
 * @returns Pertanyaan yang diperbarui
 */
export async function updateQuestion(id: string, params: Partial<QuestionParams>) {
  try {
    // Jika ada perubahan pada tipe pertanyaan, konversi ke format database
    if (params.type) {
      params.type = convertToDbQuestionType(params.type);
    }

    const { data, error } = await supabase
      .from('questions')
      .update({
        ...params,
        options: params.options ? JSON.stringify(params.options) : undefined,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      throw error;
    }

    console.log('Question updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in updateQuestion:', error);
    throw error;
  }
}

/**
 * Menghapus pertanyaan berdasarkan ID
 * @param id ID pertanyaan
 * @returns Status penghapusan
 */
export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting question:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Membuat survei baru
 * @param params Parameter survei
 * @returns Survei yang dibuat
 */
export async function createSurvey(params: SurveyParams) {
  try {
    // Periksa apakah judul sudah ada
    const { data: existingTitle } = await supabase
      .from('surveys')
      .select('id')
      .eq('title', params.title)
      .single();

    // Jika judul sudah ada, tambahkan timestamp ke judul
    let title = params.title;
    if (existingTitle) {
      const timestamp = new Date().toISOString().substring(0, 19).replace(/[T:]/g, '-');
      title = `${params.title} (${timestamp})`;
    }

    const { data, error } = await supabase
      .from('surveys')
      .insert({
        title: title,
        description: params.description,
        type: params.type,
        survey_category: params.survey_category,
        is_active: params.is_active,
        period_type: params.period_type,
        period_year: params.period_year,
        period: params.period,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating survey:', error);
      throw error;
    }

    console.log('Survey created successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in createSurvey:', error);
    throw error;
  }
}

/**
 * Memperbarui survei berdasarkan ID
 * @param id ID survei
 * @param params Parameter survei yang akan diperbarui
 * @returns Survei yang diperbarui
 */
export async function updateSurvey(id: string, params: Partial<SurveyParams> & {
  indicators?: {
    id?: string;
    title: string;
    description?: string;
    weight?: number;
    questions?: {
      id?: string;
      text: string;
      type: string;
      required: boolean;
      options?: string[];
      weight?: number;
    }[];
  }[];
  period?: {
    type: "semester" | "quarterly" | "annual";
    year: number;
    quarter?: string;
    semester?: string;
  };
}) {
  try {
    const updateData: any = {};

    if (params.title) updateData.title = params.title;
    if (params.description) updateData.description = params.description;
    if (params.type) updateData.type = params.type;
    if (params.survey_category) updateData.survey_category = params.survey_category;
    if (params.is_active !== undefined) updateData.is_active = params.is_active;

    // Handle period data
    if (params.period) {
      updateData.period_type = params.period.type;
      updateData.period_year = params.period.year;

      if (params.period.type === 'quarterly' && params.period.quarter) {
        updateData.period = `Q${params.period.quarter}`;
      } else if (params.period.type === 'semester' && params.period.semester) {
        updateData.period = `S${params.period.semester}`;
      } else if (params.period.type === 'annual') {
        updateData.period = 'TAHUN';
      }
    }

    const { data, error } = await supabase
      .from('surveys')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating survey:', error);
      throw error;
    }

    // Update indicators if provided
    if (params.indicators && params.indicators.length > 0) {
      // Fetch existing indicators
      const { data: existingIndicators, error: fetchError } = await supabase
        .from('indicators')
        .select('id')
        .eq('survey_id', id);

      if (fetchError) {
        console.error('Error fetching existing indicators:', fetchError);
        throw fetchError;
      }

      // Create a map of existing indicator IDs
      const existingIndicatorMap = new Map();
      existingIndicators?.forEach(ind => {
        existingIndicatorMap.set(ind.id, true);
      });

      // Process each indicator
      for (const indicator of params.indicators) {
        if (indicator.id && existingIndicatorMap.has(indicator.id)) {
          // Update existing indicator
          await updateIndicator(indicator.id, {
            title: indicator.title,
            description: indicator.description || '',
            weight: indicator.weight || 1
          });

          // Update questions if provided
          if (indicator.questions && indicator.questions.length > 0) {
            // Fetch existing questions for this indicator
            const { data: existingQuestions, error: questionsError } = await supabase
              .from('questions')
              .select('id')
              .eq('indicator_id', indicator.id);

            if (questionsError) {
              console.error('Error fetching questions for indicator:', questionsError);
              continue;
            }

            // Create a map of existing question IDs
            const existingQuestionMap = new Map();
            existingQuestions?.forEach(q => {
              existingQuestionMap.set(q.id, true);
            });

            // Process each question
            for (const question of indicator.questions) {
              if (question.id && existingQuestionMap.has(question.id)) {
                // Update existing question
                await updateQuestion(question.id, {
                  text: question.text,
                  type: question.type,
                  required: question.required,
                  options: question.options,
                  weight: question.weight || 1
                });
              } else {
                // Add new question
                await addQuestion({
                  indicator_id: indicator.id,
                  text: question.text,
                  type: question.type,
                  required: question.required,
                  options: question.options,
                  weight: question.weight || 1,
                  order: 1
                });
              }
            }
          }
        } else {
          // Add new indicator
          const newIndicator = await addIndicator({
            survey_id: id,
            title: indicator.title,
            description: indicator.description || '',
            weight: indicator.weight || 1
          });

          // Add questions for new indicator
          if (newIndicator && indicator.questions) {
            for (const question of indicator.questions) {
              await addQuestion({
                indicator_id: newIndicator.id,
                text: question.text,
                type: question.type,
                required: question.required,
                options: question.options,
                weight: question.weight || 1,
                order: 1
              });
            }
          }
        }
      }
    }

    console.log('Survey updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in updateSurvey:', error);
    throw error;
  }
}

/**
 * Menambahkan indikator baru
 * @param params Parameter indikator
 * @returns Indikator yang ditambahkan
 */
export async function addIndicator(params: IndicatorParams) {
  try {
    const { data, error } = await supabase
      .from('indicators')
      .insert({
        survey_id: params.survey_id,
        title: params.title,
        description: params.description || '',
        weight: params.weight || 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding indicator:', error);
      throw error;
    }

    console.log('Indicator added successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in addIndicator:', error);
    throw error;
  }
}

/**
 * Memperbarui indikator berdasarkan ID
 * @param id ID indikator
 * @param params Parameter indikator yang akan diperbarui
 * @returns Indikator yang diperbarui
 */
export async function updateIndicator(id: string, params: Partial<IndicatorParams>) {
  try {
    const { data, error } = await supabase
      .from('indicators')
      .update(params)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating indicator:', error);
      throw error;
    }

    console.log('Indicator updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in updateIndicator:', error);
    throw error;
  }
}

/**
 * Menambahkan field demografis baru
 * @param params Parameter field demografis
 * @returns Field demografis yang ditambahkan
 */
export async function addDemographicField(params: DemographicFieldParams) {
  try {
    const { data, error } = await supabase
      .from('demographic_fields')
      .insert({
        survey_id: params.survey_id,
        label: params.label,
        type: params.type,
        required: params.required,
        options: params.options ? JSON.stringify(params.options) : null,
        field_order: params.field_order
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding demographic field:', error);
      throw error;
    }

    console.log('Demographic field added successfully:', data);
    return data;
  } catch (error) {
    console.error('Exception in addDemographicField:', error);
    throw error;
  }
}

// Fungsi lain terkait Supabase bisa ditambahkan di sini...
