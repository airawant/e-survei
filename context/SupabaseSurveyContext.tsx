"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, useMemo } from "react"
import { toast } from "sonner"
import type {
  Survey,
  SurveyResponse,
  SurveyResult,
  SurveyProgress,
  SurveyContextType,
  Indicator,
  Question,
  DemographicField
} from "../types"
import { v4 as uuidv4 } from "uuid"
import {
  getAllSurveys as getAllSurveysFromDB,
  getSurveyById as getSurveyByIdFromDB,
  createSurvey as createSurveyInDB,
  updateSurvey as updateSurveyInDB,
  deleteSurvey as deleteSurveyInDB,
  toggleSurveyActiveInDB,
  getAllSurveysWithDetails,
  saveResponse as saveResponseFromDB,
  getResponsesBySurveyId,
  getSurveyStatistics,
  getSurveyDetailedStatistics,
  getDemographicFields,
  supabaseClient
} from "@/lib/supabase/client"
import { setupDemographicTables } from "@/lib/demographic-setup"

const defaultSurveyProgress: SurveyProgress = {
  currentStep: 0,
  totalSteps: 0,
  completedQuestions: 0,
  totalQuestions: 0,
  completionPercentage: 0,
}

const SupabaseSurveyContext = createContext<SurveyContextType | undefined>(undefined)

/**
 * Definisi local fungsi untuk menyimpan respons survey dengan penanganan error yang lebih baik
 */
async function saveResponseInDB(responseData: {
  survey_id: string;
  respondent_id: string;
  answers: { question_id: string; score: number; text_value?: string }[];
  periode_survei: string;
}) {
  try {
    console.log("Memulai penyimpanan respons ke database...", {
      survey_id: responseData.survey_id,
      respondent_id: responseData.respondent_id,
      answers_count: responseData.answers.length,
      periode_survei: responseData.periode_survei
    });

    // Mulai transaksi dengan menyimpan respon utama
    const { data: response, error: responseError } = await supabaseClient
      .from('responses')
      .insert([{
        survey_id: responseData.survey_id,
        respondent_id: responseData.respondent_id,
        periode_survei: responseData.periode_survei // Pastikan periode_survei disimpan
      }])
      .select()
      .single();

    if (responseError) {
      console.error("Error saat menyimpan respons:", responseError);
      throw responseError;
    }

    // Menyiapkan jawaban untuk disisipkan dengan response_id yang baru dibuat
    const answersToInsert = responseData.answers.map(answer => ({
      response_id: response.id,
      question_id: answer.question_id,
      score: answer.score,
      text_answer: answer.text_value // Tambahkan text_value ke kolom text_answer
    }));

    console.log(`Menyimpan ${answersToInsert.length} jawaban untuk respons ID: ${response.id}`);

    // Menyimpan semua jawaban
    const { error: answersError } = await supabaseClient
      .from('answers')
      .insert(answersToInsert);

    if (answersError) {
      console.error("Error saat menyimpan jawaban:", answersError);
      throw answersError;
    }

    console.log("Berhasil menyimpan respons dan jawaban ke database");
    return response;
  } catch (error) {
    console.error("Error dalam saveResponseInDB:", error);
    throw error;
  }
}

export const SupabaseSurveyProvider = ({ children }: { children: ReactNode }) => {
  // State utama
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null)
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([])
  const [currentResponse, setCurrentResponse] = useState<SurveyResponse | null>(null)
  const [surveyResults, setSurveyResults] = useState<SurveyResult[]>([])
  const [surveyProgress, setSurveyProgress] = useState<SurveyProgress>(defaultSurveyProgress)

  // State untuk penanganan error dan loading
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const isClient = typeof window !== 'undefined'

  // Fungsi untuk mengambil semua survei
  const fetchAllSurveys = useCallback(async () => {
    try {
      setLoading(true)
      console.log("Fetching all surveys from database...")

      // Gunakan fungsi getAllSurveysWithDetails untuk mendapatkan data lengkap termasuk indikator dan pertanyaan
      const surveysFromDB = await getAllSurveysWithDetails()
      console.log(`Fetched ${surveysFromDB.length} surveys from database with detailed indicators and questions`)

      // Konversi data dari format database ke format state lokal
      const formattedSurveys = surveysFromDB.map(survey => {
        // Log data periode dari database untuk debugging
        console.log(`Periode dari database untuk survei ${survey.id}:`, survey.period);

        // Pastikan periode memiliki property value yang diisi dari kolom period di database
        const period = {
          type: survey.period?.type || 'quarterly',
          year: survey.period?.year || new Date().getFullYear(),
          value: survey.period?.value || '', // Pastikan nilai value diambil dari database
          quarter: survey.period?.quarter || '',
          semester: survey.period?.semester || ''
        };

        // Tampilkan log debugging untuk memastikan data periode benar
        console.log(`Periode setelah diformat untuk survei ${survey.id}:`, period);

        return {
          id: survey.id,
          title: survey.title || '',
          description: survey.description || '',
          createdAt: new Date(survey.created_at),
          updatedAt: new Date(survey.updated_at || survey.created_at),
          isActive: survey.is_active, // Konversi is_active ke isActive
          indicators: survey.indicators || [],
          demographicFields: survey.demographic_fields || [],
          period: period, // Gunakan periode yang sudah diformat dengan benar
          type: survey.type || 'weighted',
          surveyCategory: survey.survey_category || 'calculate', // Tambahkan surveyCategory
        };
      })

      setSurveys(formattedSurveys)
      setLoading(false)
      setInitialized(true)
      return formattedSurveys
    } catch (err) {
      console.error("Error fetching surveys:", err)
      setError("Gagal memuat daftar survei dari database")
      setLoading(false)
      toast.error("Gagal memuat daftar survei")
      return []
    }
  }, [])

  // Fungsi untuk memuat respons survei dari database
  const fetchAllResponses = useCallback(async (surveyIds: string[]) => {
    try {
      setLoading(true)
      console.log("Mengambil semua respons survei dari database...")

      // Simpan semua respons yang diambil
      const allResponses: SurveyResponse[] = [];

      // Ambil respons untuk setiap survei
      for (const surveyId of surveyIds) {
        try {
          // Dapatkan respons dari database
          const responses = await getResponsesBySurveyId(surveyId);

          // Periksa apakah tabel demographic_responses ada
          let demographicTableExists = true;
          try {
            const { error: tableCheckError } = await supabaseClient
              .from('demographic_responses')
              .select('id')
              .limit(1);

            if (tableCheckError) {
              console.error("Tabel demographic_responses tidak dapat diakses:", tableCheckError);
              demographicTableExists = false;
            }
          } catch (tableCheckErr) {
            console.error("Error saat memeriksa tabel demographic_responses:", tableCheckErr);
            demographicTableExists = false;
          }

          // Dapatkan data demografis untuk setiap respons jika tabel ada
          for (const response of responses) {
            try {
              // Jika tabel demographic_responses tidak ada, tambahkan tanpa data demografis
              if (!demographicTableExists) {
                allResponses.push({
                  id: response.id,
                  surveyId: response.survey_id,
                  submittedAt: new Date(response.created_at),
                  isComplete: true,
                  demographicData: [],
                  answers: response.answers.map((a: { question_id: string; score: number }) => ({
                    questionId: a.question_id,
                    value: a.score
                  }))
                });
                continue;
              }

              // Ambil data demografis dari tabel demographic_responses
              const { data: demographicData, error } = await supabaseClient
                .from('demographic_responses')
                .select(`
                  *,
                  demographic_fields (*)
                `)
                .eq('response_id', response.id);
              // Format data demografis ke format yang digunakan aplikasi
              const formattedDemographicData = demographicData ? demographicData.map((d: { field_id: string; value: string }) => ({
                fieldId: d.field_id,
                value: d.value
              })) : [];

              // Tambahkan respons dengan data demografis ke array utama
              allResponses.push({
                id: response.id,
                surveyId: response.survey_id,
                submittedAt: new Date(response.created_at),
                isComplete: true,
                demographicData: formattedDemographicData,
                answers: response.answers.map((a: { question_id: string; score: number }) => ({
                  questionId: a.question_id,
                  value: a.score
                }))
              });
            } catch (err) {
              console.error(`Error processing response ${response.id}:`, err);
            }
          }
        } catch (err) {
          console.error(`Error fetching responses for survey ${surveyId}:`, err);
        }
      }

      console.log(`Berhasil mengambil ${allResponses.length} respons dari database`);

      // Update state dengan semua respons yang berhasil diambil
      setSurveyResponses(allResponses);

      setLoading(false);
      return allResponses;
    } catch (err) {
      console.error("Error fetching all responses:", err);
      setError("Gagal memuat respons survei dari database");
      setLoading(false);
      toast.error("Gagal memuat data respons survei");
      return [];
    }
  }, []);

  // Load semua survei saat aplikasi pertama kali dimuat
  useEffect(() => {
    if (!initialized) {
      // Buat fungsi async untuk load data
      const loadInitialData = async () => {
        try {
          // Verifikasi skema database terlebih dahulu
          const verifyDbSchema = async () => {
            try {
              // Import fungsi verifyDatabaseSchema
              const { verifyDatabaseSchema } = await import("@/lib/supabase/client");
              const isSchemaValid = await verifyDatabaseSchema();
              if (!isSchemaValid) {
                console.warn("Skema database tidak valid, beberapa fitur mungkin tidak berfungsi dengan baik");
              } else {
                console.log("Skema database terverifikasi");
              }
            } catch (schemaError) {
              console.error("Error saat verifikasi skema database:", schemaError);
            }
          };

          // Jalankan verifikasi skema
          await verifyDbSchema();

          // Ambil semua survei
          const surveys = await fetchAllSurveys();

          // Jika ada survei, ambil data respons untuk semua survei
          if (surveys.length > 0) {
            await fetchAllResponses(surveys.map(survey => survey.id));
          }
        } catch (err) {
          console.error("Error saat inisialisasi data:", err);
        }
      };

      loadInitialData();

      // Verifikasi struktur table demographic_responses
      const verifyDatabaseStructure = async () => {
        try {
          console.log("Melakukan setup tabel demografis...");
          // Setup tabel demografis jika belum ada
          const setupSuccess = await setupDemographicTables();
          if (setupSuccess) {
            console.log("Setup tabel demografis berhasil");
          } else {
            console.warn("Setup tabel demografis tidak sepenuhnya berhasil, beberapa fitur mungkin tidak berfungsi dengan baik");
          }
        } catch (err) {
          console.error("Error saat verifikasi struktur database:", err);
        }
      };

      verifyDatabaseStructure();
    }
  }, [initialized, fetchAllSurveys, fetchAllResponses]);

  // Efek untuk memuat semua survei ketika halaman dibuka
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        console.log("Mengambil data survei terbaru untuk halaman Take Survey...");
        const surveyData = await fetchAllSurveys();
        console.log("Data survei berhasil dimuat");

        // Debug informasi periode
        if (surveyData && surveyData.length > 0) {
          console.log("==== DEBUG INFORMASI PERIODE SURVEI ====");
          surveyData.forEach((survey, index) => {
            console.log(`Survei #${index + 1} - ${survey.title}:`, {
              id: survey.id,
              periode: survey.period,
              periode_type: survey.period?.type,
              periode_quarter: survey.period?.quarter,
              periode_semester: survey.period?.semester,
              periode_year: survey.period?.year,
              periode_value: survey.period?.value // Pastikan properti value juga ditampilkan dalam debug
            });
          });
          console.log("=====================================");
        }
      } catch (error) {
        console.error("Error saat mengambil daftar survei:", error);
      }
    };

    loadSurveys();
  }, [fetchAllSurveys]);

  // Fungsi untuk membuat survei baru
  const createSurvey = useCallback(async (surveyData: Omit<Survey, "id" | "createdAt" | "updatedAt">) => {
    try {
      setLoading(true)
      console.log("Creating new survey in database:", surveyData.title)
      console.log("Survey data:", JSON.stringify(surveyData, null, 2));

      // Validasi data periode
      if (!surveyData.period) {
        console.warn("Survey period is missing, using default values");
        surveyData.period = {
          type: 'quarterly',
          year: new Date().getFullYear(),
          quarter: '1',
          value: 'Q1'
        };
      }

      // Persiapkan nilai period berdasarkan tipe
      let periodValue = '';
      if (surveyData.period.type === 'quarterly' && surveyData.period.quarter) {
        periodValue = `Q${surveyData.period.quarter}`;
      } else if (surveyData.period.type === 'semester' && surveyData.period.semester) {
        periodValue = `S${surveyData.period.semester}`;
      } else if (surveyData.period.type === 'annual') {
        periodValue = 'TAHUN';
      }

      console.log("Periode yang akan disimpan:", {
        type: surveyData.period.type,
        year: surveyData.period.year,
        quarter: surveyData.period.quarter,
        semester: surveyData.period.semester,
        value: periodValue
      });

      // Map data ke format yang diterima oleh createSurveyInDB
      const dbSurvey = {
        title: surveyData.title,
        description: surveyData.description,
        type: surveyData.type || 'unweighted', // Set default ke unweighted jika undefined
        survey_category: surveyData.surveyCategory || 'calculate', // Default ke calculate
        is_active: surveyData.isActive || false,
        start_date: null,
        end_date: null,
        // Tambahkan informasi periode
        period_type: surveyData.period.type,
        period_year: surveyData.period.year,
        period: periodValue
      }

      // Simpan ke database menggunakan fungsi dari lib/supabase/client.ts
      console.log("Sending survey data to database:", dbSurvey);
      const createdSurvey = await createSurveyInDB(dbSurvey)

      if (!createdSurvey || !createdSurvey.id) {
        const error = new Error("Gagal membuat survei, tidak ada ID yang dikembalikan dari database");
        console.error(error);
        throw error;
      }

      console.log("Survey created successfully with ID:", createdSurvey.id)

      // Konversi tanggal ke format Date
      const fullSurvey: Survey = {
        ...surveyData,
        id: createdSurvey.id,
        createdAt: new Date(createdSurvey.created_at),
        updatedAt: new Date(createdSurvey.updated_at || createdSurvey.created_at)
      }

      // Update state lokal
      setSurveys(prev => [fullSurvey, ...prev])

      // Set currentSurvey
      setCurrentSurvey(fullSurvey)

      // Refresh data untuk memastikan semua data termasuk demografis sudah dimuat
      console.log("Refreshing survey data after creation...")
      await fetchAllSurveys()

      toast.success("Survei berhasil dibuat")
      setLoading(false)
      return fullSurvey
    } catch (err) {
      console.error("Error creating survey:", err)
      console.error("Error details:", err instanceof Error ? err.message : JSON.stringify(err))
      console.error("Stack trace:", err instanceof Error && err.stack ? err.stack : "No stack trace available")

      // Pesan error yang lebih informatif
      let errorMessage = "Gagal membuat survei";
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      }

      setError(errorMessage)
      setLoading(false)
      toast.error(errorMessage)
      throw err
    }
  }, [fetchAllSurveys])

  // Fungsi untuk mendapatkan survei berdasarkan ID
  const getSurvey = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log(`Fetching survey with ID: ${id}`)

      // Cari di state lokal terlebih dahulu
      const existingSurvey = surveys.find((s) => s.id === id)

      if (existingSurvey) {
        console.log("Found survey in local state:", existingSurvey.title)
        setCurrentSurvey(existingSurvey)

        // Set up survey progress
        const totalQuestions = existingSurvey.indicators.reduce(
          (total: number, indicator: Indicator) => total + indicator.questions.length,
          0
        )

        setSurveyProgress({
          currentStep: 0,
          totalSteps: existingSurvey.indicators.length + 1, // +1 for demographics
          completedQuestions: 0,
          totalQuestions,
          completionPercentage: 0,
        })

        setLoading(false)
        return existingSurvey
      } else {
        // Jika tidak ada di state lokal, ambil dari database
        console.log("Survey not found in local state, fetching from database...")
        const dbSurvey = await getSurveyByIdFromDB(id)

        if (!dbSurvey) {
          setError(`Survey with ID ${id} not found`)
          setLoading(false)
          return
        }

        // Konversi database survey ke model Survey
        const surveyData: Survey = {
          id: dbSurvey.id,
          title: dbSurvey.title || '',
          description: dbSurvey.description || '',
          createdAt: new Date(dbSurvey.created_at),
          updatedAt: new Date(dbSurvey.updated_at || dbSurvey.created_at),
          isActive: dbSurvey.is_active,
          indicators: dbSurvey.indicators || [],
          demographicFields: dbSurvey.demographic_fields || [],
          period: dbSurvey.period || { type: 'quarterly', year: new Date().getFullYear() },
          type: dbSurvey.type || 'weighted',
          surveyCategory: dbSurvey.survey_category || 'calculate',
        }

        // Debug informasi periode survey untuk memastikan data yang benar
        console.log("Period info dari getSurvey:", {
          id: surveyData.id,
          title: surveyData.title,
          period: surveyData.period,
          period_type: surveyData.period?.type,
          period_year: surveyData.period?.year,
          period_value: surveyData.period?.value,
          period_quarter: surveyData.period?.quarter,
          period_semester: surveyData.period?.semester
        });

        // Ambil data demografis jika belum ada
        try {
          if (!surveyData.demographicFields || surveyData.demographicFields.length === 0) {
            console.log(`Fetching demographic fields for survey ${id}`)
            const demographicFields = await getDemographicFields(id)

            if (demographicFields && demographicFields.length > 0) {
              console.log(`Found ${demographicFields.length} demographic fields`)
              surveyData.demographicFields = demographicFields.map(field => ({
                id: field.id,
                label: field.label,
                type: field.type,
                required: field.required,
                options: field.options || []
              }))
            } else {
              console.log('No demographic fields found')
              surveyData.demographicFields = []
            }
          }
        } catch (demographicError) {
          console.error('Error fetching demographic fields:', demographicError)
          // Jangan mempengaruhi keseluruhan fungsi jika ada error dalam mendapatkan data demografis
          surveyData.demographicFields = []
        }

        console.log(`Survey loaded: ${surveyData.title}`)
        setCurrentSurvey(surveyData)

        // Update state lokal
        setSurveys((prev) => {
          const exists = prev.some((s) => s.id === surveyData.id)
          if (exists) {
            return prev.map((s) => (s.id === surveyData.id ? surveyData : s))
          } else {
            return [...prev, surveyData]
          }
        })

        // Set up survey progress
        const totalQuestions = surveyData.indicators.reduce(
          (total: number, indicator: Indicator) => total + indicator.questions.length,
          0
        )

        setSurveyProgress({
          currentStep: 0,
          totalSteps: surveyData.indicators.length + 1, // +1 for demographics
          completedQuestions: 0,
          totalQuestions,
          completionPercentage: 0,
        })

        toast.success("Survei berhasil ditemukan")
        setLoading(false)
        return surveyData
      }
    } catch (err) {
      console.error("Error getting survey:", err)
      setError("Gagal mendapatkan detail survei")
      setLoading(false)
      toast.error("Gagal mendapatkan detail survei")
      throw err
    }
  }, [surveys])

  // Fungsi untuk memperbarui survei
  const updateSurvey = useCallback(async (id: string, updates: Partial<Survey>) => {
    try {
      setLoading(true)
      console.log("Updating survey:", id)
      console.log("Update data:", JSON.stringify(updates, null, 2))

      // Validasi ID sebelum melanjutkan
      if (!id || id === '{}' || (typeof id === 'object' && Object.keys(id).length === 0)) {
        const errorMsg = "ID survei tidak valid";
        console.error(errorMsg, id);
        setError(errorMsg);
        setLoading(false);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Cek apakah survey berbobot atau tidak
      const surveyType = updates.type || (currentSurvey?.type || 'weighted');
      const isWeightedSurvey = surveyType === 'weighted';
      console.log(`Survey type: ${surveyType}, isWeightedSurvey: ${isWeightedSurvey}`);

      // Map data ke format yang diterima oleh updateSurveyInDB
      const dbUpdates: {
        title?: string;
        description?: string;
        type?: 'weighted' | 'unweighted';
        is_active?: boolean;
        survey_category?: string;
        period_type?: string;
        period_year?: number;
        period?: string; // Kolom baru untuk nilai period
      } = {
        title: updates.title,
        description: updates.description,
        type: updates.type,
        is_active: updates.isActive
      }

      // Pastikan survey_category dikirim dengan benar
      if (updates.surveyCategory !== undefined) {
        dbUpdates.survey_category = updates.surveyCategory === 'calculate' || updates.surveyCategory === 'non_calculate'
          ? updates.surveyCategory
          : 'calculate'; // Default ke calculate jika nilainya tidak valid

        console.log("Survey category yang akan dikirim:", dbUpdates.survey_category);
      }

      // Tambahkan data periode jika ada dalam updates
      if (updates.period) {
        console.log("Periode yang akan diupdate:", updates.period)

        dbUpdates.period_type = updates.period.type || 'quarterly'
        dbUpdates.period_year = updates.period.year || new Date().getFullYear()

        // Atur nilai period berdasarkan tipe periode
        if (updates.period.type === 'quarterly' && updates.period.quarter) {
          // Konversi quarter menjadi format 'Q1', 'Q2', dll.
          dbUpdates.period = `Q${updates.period.quarter}`;
        } else if (updates.period.type === 'semester' && updates.period.semester) {
          // Konversi semester menjadi format 'S1', 'S2'
          dbUpdates.period = `S${updates.period.semester}`;
        } else if (updates.period.type === 'annual') {
          // Untuk annual, gunakan 'TAHUN'
          dbUpdates.period = 'TAHUN';
        } else if (updates.period.value) {
          // Gunakan nilai eksplisit jika ada
          dbUpdates.period = updates.period.value;
        } else {
          // Nilai default jika tidak ada yang cocok
          dbUpdates.period = 'Q1';
        }
      }

      // Hapus properti undefined
      Object.keys(dbUpdates).forEach(key => {
        if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
          delete dbUpdates[key as keyof typeof dbUpdates]
        }
      })

      console.log("Data yang dikirim ke database:", JSON.stringify(dbUpdates, null, 2))

      // Buat fungsi untuk menangani proses update secara terpisah
      const performUpdate = async () => {
        try {
          // Panggil API updateSurveyInDB dengan retry mechanism
          let retries = 0;
          const maxRetries = 2;
          let updatedSurvey = null;
          let lastError = null;

          while (retries <= maxRetries && !updatedSurvey) {
            try {
              updatedSurvey = await updateSurveyInDB(id, dbUpdates);
              console.log("Survey updated successfully in database:", updatedSurvey);
              break;
            } catch (error) {
              lastError = error;
              console.warn(`Update attempt ${retries + 1} failed:`, error);
              retries++;

              // Tunggu sebentar sebelum mencoba lagi
              if (retries <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
          }

          if (!updatedSurvey) {
            throw lastError || new Error("Gagal memperbarui survei setelah beberapa percobaan");
          }

          return updatedSurvey;
        } catch (error) {
          console.error("Error updating survey in database:", error);
          throw error;
        }
      };

      // Jalankan update utama
      const updatedSurvey = await performUpdate();

      // Update demographic fields jika ada dalam updates
      if (updates.demographicFields && updates.demographicFields.length > 0) {
        console.log("Updating demographic fields:", updates.demographicFields.length)

        try {
          // Dapatkan semua demographic fields yang ada dari database
          const { data: existingFields, error } = await supabaseClient
            .from('demographic_fields')
            .select('id')
            .eq('survey_id', id);

          if (error) {
            console.error("Error fetching existing demographic fields:", error);
            throw error;
          }

          console.log("Existing demographic fields:", existingFields?.length || 0);

          // Buat set untuk field yang ada
          const existingFieldIds = new Set();
          if (existingFields) {
            existingFields.forEach(field => {
              existingFieldIds.add(field.id);
            });
          }

          // Proses setiap demographic field
          for (const field of updates.demographicFields) {
            if (field.id && existingFieldIds.has(field.id)) {
              // Update field yang ada
              console.log(`Updating existing demographic field: ${field.id}`);
              const { error } = await supabaseClient
                .from('demographic_fields')
                .update({
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  options: field.options || []
                })
                .eq('id', field.id);

              if (error) {
                console.error(`Error updating demographic field ${field.id}:`, error);
                continue;
              }
            } else {
              // Tambahkan field baru
              console.log(`Adding new demographic field: ${field.label}`);
              const { error } = await supabaseClient
                .from('demographic_fields')
                .insert({
                  survey_id: id,
                  label: field.label,
                  type: field.type,
                  required: field.required,
                  options: field.options || []
                });

              if (error) {
                console.error(`Error adding demographic field ${field.label}:`, error);
                continue;
              }
            }
          }

          // Hapus field yang tidak ada lagi dalam updates
          const currentFieldIds = updates.demographicFields.map(f => f.id).filter(Boolean);
          const fieldsToDelete = Array.from(existingFieldIds)
            .filter(id => !currentFieldIds.includes(id as string));

          if (fieldsToDelete.length > 0) {
            console.log(`Deleting ${fieldsToDelete.length} removed demographic fields`);
            for (const fieldId of fieldsToDelete) {
              const { error } = await supabaseClient
                .from('demographic_fields')
                .delete()
                .eq('id', fieldId);

              if (error) {
                console.error(`Error deleting demographic field ${fieldId}:`, error);
              }
            }
          }

        } catch (demoError) {
          console.error("Error updating demographic fields:", demoError);
          toast.warning("Survei berhasil diperbarui tetapi terjadi masalah dengan pembaruan data demografi");
        }
      }

      // Update indicators jika ada dalam updates
      if (updates.indicators && updates.indicators.length > 0) {
        console.log("Updating indicators:", updates.indicators.length)

        try {
          // Dapatkan semua indikator yang ada dari database
          const { data: existingIndicators, error } = await supabaseClient
            .from('indicators')
            .select('id')
            .eq('survey_id', id);

          if (error) {
            console.error("Error fetching existing indicators:", error);
            throw error;
          }

          console.log("Existing indicators:", existingIndicators?.length || 0);

          // Buat map untuk indikator yang ada
          const existingIndicatorIds = new Set();
          if (existingIndicators) {
            existingIndicators.forEach(ind => {
              existingIndicatorIds.add(ind.id);
            });
          }

          // Proses setiap indikator
          for (const indicator of updates.indicators) {
            if (indicator.id && existingIndicatorIds.has(indicator.id)) {
              // Update indikator yang ada
              console.log(`Updating existing indicator: ${indicator.id}`);
              const { error } = await supabaseClient
                .from('indicators')
                .update({
                  name: indicator.title,
                  description: indicator.description || '',
                  weight: isWeightedSurvey ? (indicator.weight || 1) : 1
                })
                .eq('id', indicator.id);

              if (error) {
                console.error(`Error updating indicator ${indicator.id}:`, error);
                continue;
              }

              // Update pertanyaan jika ada
              await updateQuestionsForIndicator(indicator, isWeightedSurvey);
            } else {
              // Tambahkan indikator baru
              console.log(`Adding new indicator: ${indicator.title}`);
              const { data: newIndicator, error } = await supabaseClient
                .from('indicators')
                .insert({
                  survey_id: id,
                  name: indicator.title,
                  description: indicator.description || '',
                  weight: isWeightedSurvey ? (indicator.weight || 1) : 1
                })
                .select()
                .single();

              if (error) {
                console.error(`Error adding indicator ${indicator.title}:`, error);
                continue;
              }

              // Tambahkan pertanyaan untuk indikator baru
              if (newIndicator && indicator.questions && indicator.questions.length > 0) {
                for (const question of indicator.questions) {
                  await addQuestionForIndicator(newIndicator.id, question, isWeightedSurvey);
                }
              }
            }
          }

          // Hapus indikator yang tidak ada lagi dalam updates (opsional)
          const currentIndicatorIds = updates.indicators.map(ind => ind.id).filter(Boolean);
          const indicatorsToDelete = Array.from(existingIndicatorIds)
            .filter(id => !currentIndicatorIds.includes(id as string));

          if (indicatorsToDelete.length > 0) {
            console.log(`Deleting ${indicatorsToDelete.length} removed indicators`);
            for (const indId of indicatorsToDelete) {
              const { error } = await supabaseClient
                .from('indicators')
                .delete()
                .eq('id', indId);

              if (error) {
                console.error(`Error deleting indicator ${indId}:`, error);
              }
            }
          }

          console.log("Indicator update completed successfully");
        } catch (indicatorError) {
          console.error("Error updating indicators:", indicatorError);
          toast.warning("Survei berhasil diperbarui tetapi terjadi masalah dengan pembaruan indikator");
        }
      }

      // Update state lokal
      setSurveys(prev => prev.map(survey => {
        if (survey.id === id) {
          return {
                ...survey,
                ...updates,
                updatedAt: new Date()
              }
        }
        return survey
      }))

      // Refresh data survey setelah update
      console.log("Refreshing survey data after update...")

      try {
        await fetchAllSurveys();

        // Jika ada currentSurvey dan ID-nya cocok, update currentSurvey
        if (currentSurvey && currentSurvey.id === id) {
          // Mendapatkan data terbaru dari database
          const refreshedSurvey = await getSurvey(id);
          if (refreshedSurvey) {
            setCurrentSurvey(refreshedSurvey);
            console.log("Current survey refreshed with latest data");
          }
        }
      } catch (refreshError) {
        console.error("Error refreshing survey data:", refreshError);
        // Lanjutkan proses meskipun refresh gagal
      }

      toast.success("Survei berhasil diperbarui")
      setLoading(false)
      return updatedSurvey;

    } catch (err) {
      console.error("Error updating survey:", err)
      setError("Gagal memperbarui survei")
      setLoading(false)
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui survei")
      throw err
    }
  }, [currentSurvey, setSurveys, fetchAllSurveys, getSurvey])

  // Helper function untuk memperbarui pertanyaan dalam indikator
  const updateQuestionsForIndicator = async (indicator: Indicator, isWeighted: boolean) => {
    try {
      if (!indicator.questions || indicator.questions.length === 0) {
        console.log(`Tidak ada pertanyaan untuk diperbarui pada indikator ${indicator.id}`);
        return;
      }
      // Dapatkan semua pertanyaan yang ada untuk indikator ini
      const { data: existingQuestions, error } = await supabaseClient
        .from('questions')
        .select('id, text')
        .eq('indicator_id', indicator.id);

      if (error) {
        console.error(`Error fetching questions for indicator ${indicator.id}:`, error);
        return;
      }

      const existingQuestionCount = existingQuestions?.length || 0;
      console.log(`Ditemukan ${existingQuestionCount} pertanyaan yang sudah ada di database untuk indikator ${indicator.id}`);

      // Buat map untuk pertanyaan yang ada
      const existingQuestionIds = new Set();
      const existingQuestionMap = new Map();

      if (existingQuestions) {
        existingQuestions.forEach(q => {
          existingQuestionIds.add(q.id);
          existingQuestionMap.set(q.id, q.text);
        });
      }

      let updatedCount = 0;
      let addedCount = 0;
      let errorCount = 0;

      // Proses setiap pertanyaan
      for (const question of indicator.questions) {
        try {
          if (question.id && existingQuestionIds.has(question.id)) {
            // Update pertanyaan yang ada
            const oldText = existingQuestionMap.get(question.id);
            console.log(`Memperbarui pertanyaan ${question.id}: "${oldText?.substring(0, 30)}..." -> "${question.text?.substring(0, 30)}..."`);
            await updateQuestionInDB(question.id, question, isWeighted);
            updatedCount++;
          } else {
            // Tambahkan pertanyaan baru
            console.log(`Menambahkan pertanyaan baru: "${question.text?.substring(0, 30)}..."`);
            await addQuestionForIndicator(indicator.id, question, isWeighted);
            addedCount++;
          }
        } catch (qError) {
          console.error(`Error processing question:`, qError);
          errorCount++;
        }
      }

      console.log(`Hasil pembaruan pertanyaan - Diperbarui: ${updatedCount}, Ditambahkan: ${addedCount}, Gagal: ${errorCount}`);

      // Hapus pertanyaan yang tidak ada lagi (opsional)
      const currentQuestionIds = indicator.questions.map((q: Question) => q.id).filter(Boolean);
      const questionsToDelete = Array.from(existingQuestionIds)
        .filter((id: unknown) => !currentQuestionIds.includes(id as string));

      if (questionsToDelete.length > 0) {
        console.log(`Menghapus ${questionsToDelete.length} pertanyaan yang tidak ada lagi dari indikator ${indicator.id}`);

        let deletedCount = 0;
        let deleteErrorCount = 0;

        for (const qId of questionsToDelete) {
          const { error } = await supabaseClient
            .from('questions')
            .delete()
            .eq('id', qId);

          if (error) {
            console.error(`Error deleting question ${qId}:`, error);
            deleteErrorCount++;
          } else {
            deletedCount++;
          }
        }

        console.log(`Hasil penghapusan pertanyaan - Berhasil: ${deletedCount}, Gagal: ${deleteErrorCount}`);
      }

      console.log(`Pembaruan pertanyaan untuk indikator ${indicator.id} selesai`);
    } catch (error) {
      console.error(`Error in updateQuestionsForIndicator:`, error);
      throw error;
    }
  }

  // Helper function untuk memperbarui pertanyaan
  const updateQuestionInDB = async (questionId: string, question: Question, isWeighted: boolean) => {
    try {
      console.log(`Memperbarui pertanyaan ${questionId}`);

      // Konversi options ke tipe yang sesuai
      let options = null;
      if (question.options && Array.isArray(question.options)) {
        options = JSON.stringify(question.options);
      }

      const weight = isWeighted ? (question.weight || 1) : 1;

      console.log(`Data pertanyaan yang akan diperbarui:`, {
        id: questionId,
        text: question.text?.substring(0, 50) + (question.text?.length > 50 ? '...' : ''),
        type: question.type,
        weight: weight,
        isWeighted: isWeighted,
        originalWeight: question.weight
      });

      const { error } = await supabaseClient
        .from('questions')
        .update({
          text: question.text,
          type: question.type,
          required: question.required !== undefined ? question.required : true,
          options: options,
          weight: weight
        })
        .eq('id', questionId);

      if (error) {
        console.error(`Error updating question ${questionId}:`, error);
        throw error;
      }

      console.log(`Pertanyaan ${questionId} berhasil diperbarui`);
    } catch (error) {
      console.error(`Error in updateQuestionInDB:`, error);
      throw error;
    }
  }

  // Helper function untuk menambahkan pertanyaan baru
  const addQuestionForIndicator = async (indicatorId: string, question: Question, isWeighted: boolean) => {
    try {
      console.log(`Menambahkan pertanyaan baru ke indikator ${indicatorId}: "${question.text?.substring(0, 30)}..."`);

      // Konversi options ke tipe yang sesuai
      let options = null;
      if (question.options && Array.isArray(question.options)) {
        options = JSON.stringify(question.options);
      }

      const weight = isWeighted ? (question.weight || 1) : 1;

      console.log(`Data pertanyaan baru:`, {
        indicator_id: indicatorId,
        text: question.text?.substring(0, 50) + (question.text?.length > 50 ? '...' : ''),
        type: question.type,
        required: question.required !== undefined ? question.required : true,
        options: options ? 'Tersedia' : 'Tidak ada',
        weight: weight,
        isWeighted: isWeighted,
        originalWeight: question.weight
      });

      const { data, error } = await supabaseClient
        .from('questions')
        .insert({
          indicator_id: indicatorId,
          text: question.text,
          type: question.type,
          required: question.required !== undefined ? question.required : true,
          options: options,
          weight: weight
        })
        .select();

      if (error) {
        console.error(`Error menambahkan pertanyaan ke indikator ${indicatorId}:`, error);
        throw error;
      }

      console.log(`Pertanyaan baru berhasil ditambahkan dengan ID: ${data && data[0] ? data[0].id : 'unknown'}`);
    } catch (error) {
      console.error(`Error in addQuestionForIndicator:`, error);
      throw error;
    }
  }

  // Fungsi untuk menghapus survei
  const deleteSurvey = useCallback(async (id: string) => {
    try {
      setLoading(true)
      console.log("Deleting survey:", id)

      // Hapus dari database
      await deleteSurveyInDB(id)

      // Update state lokal
      setSurveys(prev => prev.filter(survey => survey.id !== id))

      // Reset currentSurvey jika yang dihapus adalah currentSurvey
      if (currentSurvey?.id === id) {
        setCurrentSurvey(null)
      }

      toast.success("Survei berhasil dihapus")
      setLoading(false)
      return true
    } catch (err) {
      console.error("Error deleting survey:", err)
      setError("Gagal menghapus survei")
      setLoading(false)
      toast.error("Gagal menghapus survei")
      throw err
    }
  }, [currentSurvey])

  // Fungsi untuk mengaktifkan/menonaktifkan survei
  const toggleSurveyActive = useCallback(async (id: string) => {
    try {
      setLoading(true)

      // Dapatkan status saat ini
      const survey = surveys.find(s => s.id === id)
      if (!survey) {
        throw new Error(`Survei dengan ID ${id} tidak ditemukan`)
      }

      // Toggle status
      const newActiveStatus = !survey.isActive

      // Update di database
      await toggleSurveyActiveInDB(id, { is_active: newActiveStatus })

      // Update state lokal
      setSurveys(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, isActive: newActiveStatus, updatedAt: new Date() }
            : s
        )
      )

      // Update currentSurvey jika perlu
      if (currentSurvey?.id === id) {
        setCurrentSurvey(prev =>
          prev
            ? { ...prev, isActive: newActiveStatus, updatedAt: new Date() }
            : prev
        )
      }

      toast.success(`Survei berhasil ${newActiveStatus ? 'diaktifkan' : 'dinonaktifkan'}`)
      setLoading(false)
      return true
    } catch (err) {
      console.error("Error toggling survey active status:", err)
      setError("Gagal mengubah status survei")
      setLoading(false)
      toast.error("Gagal mengubah status survei")
      throw err
    }
  }, [surveys, currentSurvey])

  // Fungsi untuk memulai respons survei
  const startSurveyResponse = useCallback((surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId)

    if (!survey) {
      setError("Survei tidak ditemukan")
      toast.error("Survei tidak ditemukan")
      return
    }

    const newResponse: SurveyResponse = {
      id: `response-${Date.now()}`,
      surveyId,
      answers: [],
      demographicData: [],
      submittedAt: new Date(),
      isComplete: false,
    }

    setCurrentResponse(newResponse)
    setCurrentSurvey(survey)

    // Set up survey progress
    const totalQuestions = survey.indicators.reduce(
      (total: number, indicator: Indicator) => total + indicator.questions.length,
      0
    )

    setSurveyProgress({
      currentStep: 0,
      totalSteps: survey.indicators.length + 1, // +1 for demographics
      completedQuestions: 0,
      totalQuestions,
      completionPercentage: 0,
    })
  }, [surveys])

  // Fungsi untuk menyimpan draft respons
  const saveResponseDraft = useCallback((data: Partial<SurveyResponse>) => {
    if (!currentResponse) {
      setError("Tidak ada respons survei yang aktif")
      toast.error("Tidak ada respons survei yang aktif")
      return
    }

    const updatedResponse = { ...currentResponse, ...data }
    setCurrentResponse(updatedResponse)

    toast.success("Progres disimpan")
  }, [currentResponse])

  // Fungsi untuk mengirimkan respons survei
  const submitSurveyResponse = useCallback(async (data: Omit<SurveyResponse, "id" | "submittedAt" | "isComplete">) => {
    try {
      setLoading(true)
      console.log("Memulai proses pengiriman respons survei...")

      // Ambil data survei terlebih dahulu untuk mendapatkan periode yang benar
      const survey = await getSurvey(data.surveyId);
      if (!survey || !survey.period) {
        throw new Error("Data survei atau periode tidak ditemukan");
      }

      // Format periode survei berdasarkan data survei
      let periode_survei = '';
      const periodType = survey.period.type || 'quarterly';
      const periodYear = survey.period.year || new Date().getFullYear();

      if (periodType === 'quarterly') {
        const quarterValue = survey.period.quarter || '1';
        periode_survei = `Q${quarterValue}-${periodYear}`;
      } else if (periodType === 'semester') {
        const semesterValue = survey.period.semester || '1';
        periode_survei = `S${semesterValue}-${periodYear}`;
      } else if (periodType === 'annual') {
        periode_survei = `TAHUN-${periodYear}`;
      }

      console.log("Periode survei yang akan disimpan:", {
        surveyId: data.surveyId,
        periode: periode_survei,
        surveyPeriod: survey.period
      });

      // Buat objek respons lengkap
      const completedResponse: SurveyResponse = {
        id: currentResponse?.id || `response-${Date.now()}`,
        ...data,
        submittedAt: new Date(),
        isComplete: true,
      }

      // 1. Buat responden baru
      let name = 'Anonymous';
      let email = null;
      let phone = null;

      // Ekstrak informasi dasar responden dari data demografis (jika ada)
      if (completedResponse.demographicData && completedResponse.demographicData.length > 0) {
        // Dapatkan semua field demografis untuk survei ini
        const { data: demographicFields } = await supabaseClient
          .from('demographic_fields')
          .select('*')
          .eq('survey_id', completedResponse.surveyId);

        if (demographicFields && demographicFields.length > 0) {
          // Cari field dengan label "Nama Lengkap"
          const fullNameField = demographicFields.find(field =>
            field.label === "Nama Lengkap" || field.label === "Nama" || field.label === "Full Name");

          if (fullNameField) {
            // Cari nilai dari field tersebut dalam demographicData
            const fullNameData = completedResponse.demographicData.find(item => item.fieldId === fullNameField.id);
            if (fullNameData && fullNameData.value) {
              name = String(fullNameData.value);
            }
          }
        }
      }

      // Buat responden di database dengan periode survei yang benar
      const { data: respondent, error: respondentError } = await supabaseClient
        .from('respondents')
        .insert({
          survey_id: completedResponse.surveyId,
          name,
          email,
          phone,
          periode_survei // Gunakan periode yang sudah diformat dengan benar
        })
        .select()
        .single();

      if (respondentError) {
        console.error("Error creating respondent:", respondentError);
        throw respondentError;
      }

      // 2. Simpan response dengan respondent_id yang valid dan periode survei yang benar

      // Dapatkan semua pertanyaan dari survei saat ini untuk memeriksa tipe pertanyaan
      const allQuestions: Question[] = [];
      if (survey && survey.indicators) {
        survey.indicators.forEach(indicator => {
          if (indicator.questions) {
            allQuestions.push(...indicator.questions);
          }
        });
      }

      const saveData = {
        survey_id: completedResponse.surveyId,
        respondent_id: respondent.id,
        answers: completedResponse.answers.map(a => {
          // Dapatkan tipe pertanyaan dari survei
          const question = allQuestions.find(q => q.id === a.questionId);
          const questionType = question?.type || 'likert';

          // Jika tipe pertanyaan adalah teks, simpan sebagai teks
          if (questionType === 'text') {
            return {
              question_id: a.questionId,
              score: 0, // Nilai default untuk pertanyaan teks
              text_value: String(a.value) // Simpan nilai teks
            };
          } else {
            // Untuk tipe lain, konversi ke angka jika memungkinkan
            return {
              question_id: a.questionId,
              score: typeof a.value === 'number' ? a.value :
                     typeof a.value === 'string' ? parseFloat(a.value) || 3 : 3
            };
          }
        }),
        periode_survei // Gunakan periode yang sudah diformat dengan benar
      }

      // Simpan respons ke database
      let response;
      try {
        console.log("Memanggil saveResponseInDB dengan data:", {
          ...saveData,
          periode_survei
        });
        response = await saveResponseInDB(saveData);
        console.log("Respons berhasil disimpan dengan ID:", response.id);

        // Tambahkan kode untuk menyimpan data demografi
        if (completedResponse.demographicData && completedResponse.demographicData.length > 0) {
          console.log("Menyimpan data demografi ke tabel demographic_responses...");
          const { saveDemographicResponse } = await import("@/lib/supabase/client");

          // Simpan setiap item data demografi
          for (const demoItem of completedResponse.demographicData) {
            try {
              await saveDemographicResponse({
                response_id: response.id,
                field_id: demoItem.fieldId,
                value: demoItem.value
              });
            } catch (demoError) {
              console.error("Error saat menyimpan data demografi:", demoError);
              // Lanjutkan meskipun ada error pada satu item
            }
          }

          console.log(`Berhasil menyimpan ${completedResponse.demographicData.length} data demografi`);
        }
      } catch (error: unknown) {
        console.error("Error saat menyimpan respons ke database:", error);
        const errorMessage = error instanceof Error ? error.message : 'Koneksi database error';
        throw new Error(`Gagal menyimpan respons: ${errorMessage}`);
      }

      // Update state lokal
      setSurveyResponses(prev => [...prev, completedResponse])
      setCurrentResponse(null)
      setSurveyProgress(defaultSurveyProgress)

      toast.success("Survei berhasil dikirim")
      setLoading(false)
      return true
    } catch (err) {
      console.error("Error submitting survey response:", err)
      setError("Gagal mengirim respons survei")
      setLoading(false)
      toast.error("Gagal mengirim respons survei")
      throw err
    }
  }, [currentResponse])

  // Fungsi untuk menghitung hasil survei
  const calculateResults = useCallback(async (surveyId: string) => {
    try {
      setLoading(true)
      console.log("Calculating results for survey:", surveyId)

      // Dapatkan statistik dari database
      const stats = await getSurveyDetailedStatistics(surveyId)

      if (!stats) {
        throw new Error("Gagal menghitung statistik survei")
      }

      // Konversi ke format SurveyResult yang digunakan aplikasi
      const result: SurveyResult = {
        surveyId: surveyId,
        surveyTitle: '',
        totalResponses: stats.overallCalculation?.totalRespondents || 0,
        averageScore: stats.overallCalculation?.result || 0,
        satisfactionIndex: stats.ikm || 0,
        indicators: stats.indicators.map((indicator: {
          indicatorId: string;
          indicatorTitle: string;
          score: number;
          weight: number;
          questions: Array<{
            questionId: string;
            questionText: string;
            averageScore: number;
            responseCount: number;
          }>;
        }) => ({
          id: indicator.indicatorId,
          title: indicator.indicatorTitle,
          score: indicator.score,
          weight: indicator.weight,
          questionScores: indicator.questions.map(q => ({
            id: q.questionId,
            text: q.questionText,
            averageScore: q.averageScore,
            responseCount: q.responseCount,
            answerDistribution: [1, 2, 3, 4, 5].map(score => ({
              score,
              count: 0 // Distribusi sebenarnya tidak tersedia dari API
            }))
          })),
          answerDistribution: [1, 2, 3, 4, 5].map(score => ({
            score,
            count: 0 // Distribusi sebenarnya tidak tersedia dari API
          }))
        })),
        indicatorScores: [], // Tambahkan indikator scores yang kosong
        demographicBreakdown: {}, // Tambahkan demo breakdown kosong
        crossTabulations: {}, // Tambahkan cross tabulations kosong
        trendData: {
          available: false,
          previousScore: 0,
          currentScore: stats.overallCalculation?.result || 0,
          trendPoints: []
        },
        calculatedAt: new Date() // Tambahkan waktu kalkulasi
      }

      // Cek apakah sudah ada hasil untuk survei ini
      const existingResultIndex = surveyResults.findIndex(r => r.surveyId === surveyId)

      if (existingResultIndex >= 0) {
        // Update hasil yang sudah ada
        setSurveyResults(prev => {
          const updatedResults = [...prev]
          updatedResults[existingResultIndex] = result
          return updatedResults
        })
      } else {
        // Tambahkan hasil baru
        setSurveyResults(prev => [...prev, result])
      }

      toast.success("Hasil survei berhasil dihitung")
      setLoading(false)
      return result
    } catch (err) {
      console.error("Error calculating survey results:", err)
      setError("Gagal menghitung hasil survei")
      setLoading(false)
      toast.error("Gagal menghitung hasil survei")
      throw err
    }
  }, [surveyResults])

  // Fungsi untuk mendapatkan respons berdasarkan survei ID (versi diperbarui)
  const getSurveyResponses = useCallback(async (surveyId: string) => {
    try {
      setLoading(true)

      console.log(`Mengambil respons untuk survei ID: ${surveyId}`)

      // Periksa apakah sudah memiliki respons untuk survei ini di state lokal
      const existingResponses = surveyResponses.filter(r => r.surveyId === surveyId)
      if (existingResponses.length > 0) {
        console.log(`Ditemukan ${existingResponses.length} respons di state lokal untuk survei ${surveyId}`)
        setLoading(false)
        return existingResponses
      }

      // Jika tidak ada di state lokal, ambil dari database
      console.log(`Mengambil respons dari database untuk survei ${surveyId}`)
      const responses = await getResponsesBySurveyId(surveyId)

      // Periksa apakah tabel demographic_responses ada
      let demographicTableExists = true;
      try {
        const { error: tableCheckError } = await supabaseClient
          .from('demographic_responses')
          .select('id')
          .limit(1);

        if (tableCheckError) {
          console.error("Tabel demographic_responses tidak dapat diakses:", tableCheckError);
          demographicTableExists = false;
        }
      } catch (tableCheckErr) {
        console.error("Error saat memeriksa tabel demographic_responses:", tableCheckErr);
        demographicTableExists = false;
      }

      // Dapatkan data demografis untuk setiap respons jika tabel ada
      const responsesWithDemographics = await Promise.all(responses.map(async (r) => {
        try {
          // Jika tabel demographic_responses tidak ada, kembalikan tanpa data demografis
          if (!demographicTableExists) {
            return {
              ...r,
              demographicData: []
            };
          }

          // Ambil data demografis dari tabel demographic_responses
          const { data: demographicData, error } = await supabaseClient
            .from('demographic_responses')
            .select(`
              *,
              demographic_fields (*)
            `)
            .eq('response_id', r.id);

          if (error || !demographicData) {
            console.error('Error fetching demographic data:', error);
            return {
              ...r,
              demographicData: []
            };
          }

          // Format data demografis ke format yang digunakan aplikasi
          const formattedDemographicData = demographicData.map(d => ({
            fieldId: d.field_id,
            value: d.value
          }));

          return {
            ...r,
            demographicData: formattedDemographicData
          };
        } catch (err) {
          console.error('Error processing demographics for response:', err);
          return {
            ...r,
            demographicData: []
          };
        }
      }));

      // Konversi ke format yang digunakan aplikasi
      const formattedResponses = responsesWithDemographics.map(r => ({
        id: r.id,
        surveyId: r.survey_id,
        submittedAt: new Date(r.created_at),
        isComplete: true,
        demographicData: r.demographicData || [],
        answers: r.answers.map((a: { question_id: string; score: number }) => ({
          questionId: a.question_id,
          value: a.score
        }))
      }));

      // Update state dengan menambahkan respons baru ke respons yang sudah ada
      setSurveyResponses(prev => [...prev, ...formattedResponses]);

      console.log(`Berhasil mengambil dan menambahkan ${formattedResponses.length} respons untuk survei ${surveyId}`);

      setLoading(false)
      return formattedResponses
    } catch (err) {
      console.error("Error getting survey responses:", err)
      setError("Gagal mendapatkan respons survei")
      setLoading(false)
      toast.error("Gagal mendapatkan respons survei")
      throw err
    }
  }, [surveyResponses])

  // Fungsi untuk mendapatkan hasil survei
  const getSurveyResults = useCallback(async (surveyId: string) => {
    try {
      // Cek apakah sudah ada hasil di state lokal
      const existingResult = surveyResults.find(r => r.surveyId === surveyId)
      if (existingResult) {
        return existingResult
      }

      // Jika tidak ada, hitung hasilnya
      return await calculateResults(surveyId)
    } catch (err) {
      console.error("Error getting survey results:", err)
      throw err
    }
  }, [surveyResults, calculateResults])

  // Fungsi untuk memperbarui progres survei
  const updateSurveyProgress = useCallback((progress: Partial<SurveyProgress>) => {
    setSurveyProgress(prev => ({ ...prev, ...progress }))
  }, [])

  // Objek konteks
  const contextValue: SurveyContextType = {
    surveys,
    currentSurvey,
    surveyResponses,
    currentResponse,
    surveyResults,
    surveyProgress,
    error,
    loading,
    isClient,

    // CRUD operations
    createSurvey,
    getSurvey,
    updateSurvey,
    deleteSurvey,
    toggleSurveyActive,
    listSurveys: fetchAllSurveys,

    // Response operations
    startSurveyResponse,
    saveResponseDraft,
    submitSurveyResponse,
    getSurveyResponses,

    // Results operations
    calculateResults,
    getSurveyResults,
    updateSurveyProgress,
  }

  return (
    <SupabaseSurveyContext.Provider value={contextValue}>
      {children}
    </SupabaseSurveyContext.Provider>
  )
}

export const useSupabaseSurvey = (): SurveyContextType => {
  const context = useContext(SupabaseSurveyContext)

  if (context === undefined) {
    throw new Error('useSupabaseSurvey must be used within a SupabaseSurveyProvider')
  }

  return context
}

// Export default untuk kompatibilitas dengan kode yang sudah ada
export const useSurvey = useSupabaseSurvey
