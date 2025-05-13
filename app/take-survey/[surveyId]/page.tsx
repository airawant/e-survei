"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import React from "react"
import { ChevronLeft, BarChart3, AlertCircle, CheckCircle2, User, Clock, Calendar, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import Layout from "@/components/Layout"
import ClientOnly, { LoadingFallback } from "@/components/ClientOnly"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Survey, SurveyResponse, Indicator, Question as BaseQuestion } from "@/types"
import { cn } from "@/lib/utils"
import { getLikertOptions, getLikertLabels, getLikertLabelForValue } from "@/lib/likert-utils"
import { isLikertType } from "@/lib/question-types"

// Perluas tipe Question dengan properti tambahan yang diperlukan
interface Question extends BaseQuestion {
  indicatorId?: string;
  indicatorTitle?: string;
}

// Interface untuk menangani data dari database
interface IndicatorFromDB extends Indicator {
  name?: string;
}

// Definisi lokal untuk tipe Question dan DemographicField
interface DemographicField {
  id: string;
  label: string;
  name?: string;
  type: string;
  required: boolean;
  options?: string[];
  field_order?: number;
}

// Interface untuk menangani data demografis dari database
interface DemographicFieldFromDB {
  id: string;
  survey_id: string;
  label?: string;
  name?: string;
  type?: string;
  required?: boolean;
  options?: string[] | string;
  field_order?: number;
}

// Step enum untuk mengontrol alur pengisian survei
enum SurveyStep {
  DEMOGRAPHICS = 'demographics',
  QUESTIONS = 'questions',
  REVIEW = 'review'
}

// Pindahkan fungsi ke luar komponen
function getRatingLabel(value: number): string {
  switch (value) {
    case 6: return "Sangat Puas"
    case 5: return "Puas"
    case 4: return "Cukup Puas"
    case 3: return "Cukup"
    case 2: return "Kurang Puas"
    case 1: return "Sangat Tidak Puas"
    default: return ""
  }
}

// Fungsi untuk memformat tampilan periode
const formatPeriodeSurvei = (survey: Survey | null): string => {
  // Tambahkan logging untuk debugging lebih detail
  console.log("Periode survei yang akan diformat (detail):", {
    period: survey?.period,
    type: survey?.period?.type,
    year: survey?.period?.year,
    value: survey?.period?.value, // Nilai period dari database
    quarter: survey?.period?.quarter,
    semester: survey?.period?.semester,
    quarterType: survey?.period?.quarter ? typeof survey?.period.quarter : 'undefined',
    semesterType: survey?.period?.semester ? typeof survey?.period.semester : 'undefined',
    quarterStringified: survey?.period?.quarter ? JSON.stringify(survey?.period.quarter) : 'undefined'
  });

  // Tambahkan logging khusus untuk quarter untuk melihat lebih detail
  if (survey?.period?.type === 'quarterly') {
    try {
      console.log("DEBUGGING QUARTER VALUE:", {
        quarterValue: survey?.period?.quarter,
        quarterType: typeof survey?.period?.quarter,
        quarterNumber: survey?.period?.quarter ? parseInt(String(survey?.period?.quarter).replace('Q', ''), 10) : null,
        quarterRaw: survey?.period?.quarter,
        quarterJSON: JSON.stringify(survey?.period?.quarter),
        // Tambahkan debugging untuk value dari database
        valueFromDB: survey?.period?.value,
        valueType: survey?.period?.value ? typeof survey?.period.value : 'undefined'
      });
    } catch (e) {
      console.error("Error debugging quarter:", e);
    }
  }

  if (!survey || !survey.period) return 'Periode tidak tersedia';

  // Hapus HARDCODED CASE: Triwulan 3 2025
  // Gunakan nilai dari database saja

  const { type, year, quarter, semester } = survey.period;

  // Nilai period dari database
  const periodValue = survey.period.value;

  // Validasi tambahan untuk memastikan semua nilai yang diperlukan tersedia
  if (!type || !year) {
    console.log("Tipe periode atau tahun tidak tersedia", { type, year });
    return 'Periode tidak lengkap';
  }

  // Gunakan nilai period dari database jika tersedia
  if (periodValue) {
    console.log(`Menggunakan nilai period langsung dari database: ${periodValue}`);

    // Handle kasus untuk format periode
    if (type === 'quarterly') {
      // Ekstrak nomor quarter dari nilai (Q1, Q2, Q3, Q4)
      let quarterNum = periodValue.replace('Q', '');

      // Validasi quarterNum (pastikan antara 1-4)
      if (!['1', '2', '3', '4'].includes(quarterNum)) {
        console.log(`PERINGATAN: Nilai kuartal tidak valid (${quarterNum}), menggunakan Q1`);
        quarterNum = '1';
      }

      // Format dengan bahasa Indonesia: "Triwulan 3 2025"
      return `Triwulan ${quarterNum} ${year}`;
    }
    else if (type === 'semester') {
      // Ekstrak nomor semester dari nilai (S1, S2)
      let semesterNum = periodValue.replace('S', '');

      // Validasi semesterNum (pastikan 1 atau 2)
      if (!['1', '2'].includes(semesterNum)) {
        console.log(`PERINGATAN: Nilai semester tidak valid (${semesterNum}), menggunakan S1`);
        semesterNum = '1';
      }

      // Format dengan bahasa Indonesia: "Semester 1 2025"
      return `Semester ${semesterNum} ${year}`;
    }
    else if (type === 'annual') {
      return `Tahun ${year}`;
    }
  }

  // Fallback ke logika lama jika nilai period tidak tersedia dari database
  console.log("Nilai period tidak tersedia dari database, menggunakan fallback");

  // Handle kasus khusus ketika periode adalah 'quarterly' tetapi kuartal tidak didefinisikan
  if (type === 'quarterly') {
    // Default ke kuartal 1 hanya jika quarter benar-benar tidak ada
    let quarterNum = quarter ? String(quarter).replace('Q', '') : '1';

    console.log(`Menggunakan quarterNum: ${quarterNum} dari nilai asli quarter:`, quarter);

    // Jika ada nilai quarter, proses dengan benar - pastikan kita menggunakan nilai yang sudah ada
    if (quarter) {
      if (typeof quarter === 'string') {
        quarterNum = quarter.startsWith('Q') ? quarter.replace('Q', '') : quarter;
      } else if (typeof quarter === 'number') {
        quarterNum = String(quarter);
      }
      console.log(`Setelah pemrosesan quarter, menggunakan quarterNum: ${quarterNum}`);
    } else {
      console.log("PERINGATAN: Quarter tidak ditemukan untuk periode kuartal, menggunakan default Q1");
    }

    // Validasi quarterNum (pastikan antara 1-4)
    if (!['1', '2', '3', '4'].includes(quarterNum)) {
      console.log(`PERINGATAN: Nilai kuartal tidak valid (${quarterNum}), menggunakan Q1`);
      quarterNum = '1';
    }

    // Format dengan bahasa Indonesia: "Triwulan 3 2025"
    return `Triwulan ${quarterNum} ${year}`;
  }
  else if (type === 'semester') {
    // Default ke semester 1 jika tidak ada nilai semester
    let semesterNum = '1';

    // Jika ada nilai semester, proses dengan benar
    if (semester) {
      if (typeof semester === 'string') {
        semesterNum = semester.startsWith('S') ? semester.replace('S', '') : semester;
      } else if (typeof semester === 'number') {
        semesterNum = String(semester);
      }
    } else {
      console.log("PERINGATAN: Semester tidak ditemukan untuk periode semester, menggunakan default S1");
    }

    // Validasi semesterNum (pastikan 1 atau 2)
    if (!['1', '2'].includes(semesterNum)) {
      console.log(`PERINGATAN: Nilai semester tidak valid (${semesterNum}), menggunakan S1`);
      semesterNum = '1';
    }

    // Format dengan bahasa Indonesia: "Semester 1 2025"
    return `Semester ${semesterNum} ${year}`;
  }
  else if (type === 'annual') {
    return `Tahun ${year}`;
  }
  else {
    // Default jika tipe tidak cocok, tetap tampilkan dengan format yang lebih informatif
    console.log("Tipe periode tidak dikenali atau nilai tidak tersedia", { type, quarter, semester });
    return `Periode ${year} (${type || 'tidak diketahui'})`;
  }
};

// Fungsi untuk mendapatkan label periode yang lebih deskriptif
const getPeriodeLabel = (survey: Survey | null): string => {
  if (!survey || !survey.period) return 'Periode tidak tersedia';

  // Hapus HARDCODED CASE: Triwulan 3 2025
  // Gunakan nilai dari database saja

  const { type, year, quarter, semester } = survey.period;

  // Nilai period dari database
  const periodValue = survey.period.value;

  // Validasi tambahan
  if (!type || !year) {
    return '';
  }

  // Gunakan nilai period dari database jika tersedia
  if (periodValue) {
    console.log(`Menggunakan nilai periodValue untuk label: ${periodValue}`);

    if (type === 'quarterly') {
      // Ekstrak nomor quarter dari nilai (Q1, Q2, Q3, Q4)
      let quarterNum = periodValue.replace('Q', '');

      // Validasi quarterNum (pastikan antara 1-4)
      if (!['1', '2', '3', '4'].includes(quarterNum)) {
        return '';
      }

      // Tampilkan rentang bulan berdasarkan quarter
      const labels = ['', 'Januari-Maret', 'April-Juni', 'Juli-September', 'Oktober-Desember'];
      return labels[parseInt(quarterNum)];
    }
    else if (type === 'semester') {
      // Ekstrak nomor semester dari nilai (S1, S2)
      let semesterNum = periodValue.replace('S', '');

      // Validasi semesterNum (pastikan 1 atau 2)
      if (!['1', '2'].includes(semesterNum)) {
        return '';
      }

      // Tampilkan rentang bulan berdasarkan semester
      return semesterNum === '1' ? 'Januari-Juni' : 'Juli-Desember';
    }
    else if (type === 'annual') {
      return ''; // Tidak perlu label tambahan untuk tipe annual
    }

    return '';
  }

  // Fallback ke logika lama jika nilai period tidak tersedia dari database
  console.log("Nilai periodValue tidak tersedia dari database untuk label, menggunakan fallback");

  if (type === 'quarterly') {
    // Default ke kuartal 1 hanya jika quarter benar-benar tidak ada
    let quarterNum = quarter ? String(quarter).replace('Q', '') : '1';

    // Jika ada nilai quarter, proses dengan benar
    if (quarter) {
      if (typeof quarter === 'string') {
        quarterNum = quarter.startsWith('Q') ? quarter.replace('Q', '') : quarter;
      } else if (typeof quarter === 'number') {
        quarterNum = String(quarter);
      }
    }

    // Validasi quarterNum (pastikan antara 1-4)
    if (!['1', '2', '3', '4'].includes(quarterNum)) {
      return '';
    }

    // Tampilkan hanya rentang bulan
    const labels = ['', 'Januari-Maret', 'April-Juni', 'Juli-September', 'Oktober-Desember'];
    return labels[parseInt(quarterNum)];
  }
  else if (type === 'semester') {
    // Default ke semester 1 jika tidak ada nilai semester
    let semesterNum = '1';

    // Jika ada nilai semester, proses dengan benar
    if (semester) {
      if (typeof semester === 'string') {
        semesterNum = semester.startsWith('S') ? semester.replace('S', '') : semester;
      } else if (typeof semester === 'number') {
        semesterNum = String(semester);
      }
    }

    // Validasi semesterNum (pastikan 1 atau 2)
    if (!['1', '2'].includes(semesterNum)) {
      return '';
    }

    // Tampilkan hanya rentang bulan
    const label = semesterNum === '1' ? 'Januari-Juni' : 'Juli-Desember';
    return label;
  }
  else if (type === 'annual') {
    return ''; // Tidak perlu label tambahan karena formatPeriodeSurvei sudah menampilkan "Tahun YYYY"
  }

  return '';
};

export default function TakeSurveyPage({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params)
  const router = useRouter()
  const { surveys, submitSurveyResponse, getSurvey } = useSurvey()

  // State untuk data survei
  const [surveyData, setSurveyData] = useState<Survey | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])

  // State untuk mengontrol alur survei
  const [currentStep, setCurrentStep] = useState<SurveyStep>(SurveyStep.DEMOGRAPHICS)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  // State untuk menyimpan jawaban
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [demographicData, setDemographicData] = useState<Record<string, any>>({})

  // State lainnya
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demographicErrors, setDemographicErrors] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        console.log("Memulai pengambilan data survei dengan ID:", surveyId);

        // Pastikan getSurvey dipanggil setiap kali halaman dibuka untuk mendapatkan data terbaru
        console.log("Mengambil data survei dari database:", surveyId);
        const surveyDetail = await getSurvey(surveyId);
        console.log("Selesai memanggil getSurvey");

        // Debug informasi periode
        if (surveyDetail && surveyDetail.period) {
          console.log("==== DEBUG INFORMASI PERIODE PADA HALAMAN DETAIL ====");
          console.log("Data periode survei:", {
            id: surveyDetail.id,
            title: surveyDetail.title,
            periode: surveyDetail.period,
            periode_type: surveyDetail.period?.type,
            periode_value: surveyDetail.period?.value, // Menampilkan nilai value dari periode
            periode_quarter: surveyDetail.period?.quarter,
            periode_semester: surveyDetail.period?.semester,
            periode_year: surveyDetail.period?.year,
            raw: JSON.stringify(surveyDetail.period)
          });

          // Debug tampilan periode yang akan ditampilkan
          const formattedPeriod = formatPeriodeSurvei(surveyDetail);
          const periodLabel = getPeriodeLabel(surveyDetail);
          console.log("Tampilan periode yang akan ditampilkan:", {
            formatted: formattedPeriod,
            label: periodLabel
          });

          console.log("=====================================");
        }

        // Cari di state lokal setelah getSurvey dipanggil
        const updatedLocalSurvey = surveys.find(s => s.id === surveyId);
        console.log("Hasil setelah getSurvey:", updatedLocalSurvey ? "Survey ditemukan" : "Survey tidak ditemukan");

        if (updatedLocalSurvey) {
          console.log("Survey data berhasil diambil dari database:", updatedLocalSurvey.title);
          console.log("Indikator:", updatedLocalSurvey.indicators?.length || 0);
          console.log("Demographic fields:", updatedLocalSurvey.demographicFields?.length || 0);

          // Jika field demografis tidak ada atau kosong, coba ambil khusus data demografis
          if (!updatedLocalSurvey.demographicFields || updatedLocalSurvey.demographicFields.length === 0) {
            console.log("Field demografis tidak ditemukan, mencoba mengambil data demografis secara terpisah");
            try {
              const { supabaseClient } = await import('@/lib/supabase/client');
              const { data: demografiFields, error: demoError } = await supabaseClient
                .from('demographic_fields')
                .select('*')
                .eq('survey_id', surveyId)
                .order('field_order', { ascending: true });

              if (demoError) {
                console.error("Error mengambil data demografis:", demoError);
              } else if (demografiFields && demografiFields.length > 0) {
                console.log(`Berhasil mengambil ${demografiFields.length} field demografis`);

                // Format field demografis
                const formattedDemoFields = demografiFields.map((field) => {
                  // Format options dengan benar
                  let parsedOptions: string[] = [];
                  if (field.options) {
                    try {
                      if (typeof field.options === 'string') {
                        // Coba parse sebagai JSON
                        const trimmedOptions = field.options.trim();
                        if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
                          parsedOptions = JSON.parse(trimmedOptions);
                          console.log(`Successfully parsed options as JSON array for ${field.label || field.name}:`, parsedOptions);
                        } else {
                          // Jika bukan JSON array, coba split dengan koma
                          parsedOptions = trimmedOptions.split(',').map((option: string) => option.trim()).filter(Boolean);
                          console.log(`Parsed options as comma-separated string for ${field.label || field.name}:`, parsedOptions);
                        }
                      } else if (Array.isArray(field.options)) {
                        parsedOptions = field.options;
                        console.log(`Options already an array for ${field.label || field.name}:`, parsedOptions);
                      } else {
                        console.warn(`Unexpected options format for ${field.label || field.name}:`, typeof field.options);
                        parsedOptions = [];
                      }
                    } catch (e) {
                      console.warn(`Failed to parse options for ${field.label || field.name}:`, e);
                      console.warn(`Raw options value:`, field.options);
                      parsedOptions = [];
                    }
                  }

                  // Validasi tipe field
                  const validTypes = ['text', 'number', 'date', 'dropdown', 'radio', 'checkbox'];
                  const fieldType = field.type && validTypes.includes(field.type) ? field.type : 'text';

                  if (field.type && !validTypes.includes(field.type)) {
                    console.warn(`Invalid field type "${field.type}" for field ${field.label || field.name}, using 'text' instead`);
                  }

                  // Pastikan semua field demografis memiliki label
                  const fieldLabel = field.label || field.name || 'Field';

                  return {
                    id: field.id,
                    label: fieldLabel,
                    type: fieldType,
                    required: field.required === undefined ? false : Boolean(field.required),
                    options: parsedOptions,
                    field_order: field.field_order
                  };
                });

                // Update survei lokal dengan field demografis yang baru diambil
                const updatedSurvey = { ...updatedLocalSurvey, demographicFields: formattedDemoFields };
                processSurveyData(updatedSurvey);
                return;
              }
            } catch (err) {
              console.error("Error saat mengambil data demografis terpisah:", err);
            }
          }

          processSurveyData(updatedLocalSurvey);
          return;
        }

        // Jika masih tidak ditemukan, coba panggil langsung dari database
        console.log("Mencoba mengambil data langsung dari DB");
        try {
          const { supabaseClient } = await import('@/lib/supabase/client');

          // Ambil data survei lengkap dengan indikator dan pertanyaan
          const { data: survey, error: surveyError } = await supabaseClient
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

          if (surveyError || !survey) {
            console.error("Error mengambil survei:", surveyError);
            setError("Survei tidak ditemukan dalam database");
            return;
          }

          console.log("Berhasil mendapatkan survei langsung dari database:", survey.title || survey.id);

          // Ambil demographic fields
          const { data: demografiFields, error: demoError } = await supabaseClient
            .from('demographic_fields')
            .select('*')
            .eq('survey_id', surveyId)
            .order('field_order', { ascending: true });

          if (demoError) {
            console.error("Error mengambil data demografis:", demoError);
          }

          console.log("Field demografis yang diambil dari database:", demografiFields?.length || 0);

          // Log detail data demografis yang diambil
          if (demografiFields && demografiFields.length > 0) {
            console.log("Detail field demografis dari database:");
            demografiFields.forEach((field: any, idx: number) => {
              console.log(`Raw Demographic Field #${idx + 1}:`, {
                id: field.id,
                survey_id: field.survey_id,
                label: field.label,
                name: field.name,
                type: field.type,
                required: field.required,
                options: field.options,
                field_order: field.field_order
              });
            });
          } else {
            console.log("Tidak ada field demografis yang ditemukan untuk survei ini");
          }

          // Format data survei
          const formattedSurvey: Survey = {
            id: survey.id,
            title: survey.title || '',
            description: survey.description || '',
            createdAt: new Date(survey.created_at),
            updatedAt: new Date(survey.updated_at || survey.created_at),
            isActive: survey.is_active,
            indicators: Array.isArray(survey.indicators) ? survey.indicators : [],
            demographicFields: demografiFields?.map((field: DemographicFieldFromDB) => {
              // Format options dengan benar
              let parsedOptions: string[] = [];
              if (field.options) {
                try {
                  if (typeof field.options === 'string') {
                    // Coba parse sebagai JSON
                    const trimmedOptions = field.options.trim();
                    if (trimmedOptions.startsWith('[') && trimmedOptions.endsWith(']')) {
                      parsedOptions = JSON.parse(trimmedOptions);
                      console.log(`Successfully parsed options as JSON array for ${field.label || field.name}:`, parsedOptions);
                    } else {
                      // Jika bukan JSON array, coba split dengan koma
                      parsedOptions = trimmedOptions.split(',').map((option: string) => option.trim()).filter(Boolean);
                      console.log(`Parsed options as comma-separated string for ${field.label || field.name}:`, parsedOptions);
                    }
                  } else if (Array.isArray(field.options)) {
                    parsedOptions = field.options;
                    console.log(`Options already an array for ${field.label || field.name}:`, parsedOptions);
                  } else {
                    console.warn(`Unexpected options format for ${field.label || field.name}:`, typeof field.options);
                    parsedOptions = [];
                  }
                } catch (e) {
                  console.warn(`Failed to parse options for ${field.label || field.name}:`, e);
                  console.warn(`Raw options value:`, field.options);
                  parsedOptions = [];
                }
              }

              // Validasi tipe field
              const validTypes = ['text', 'number', 'date', 'dropdown', 'radio', 'checkbox'];
              const fieldType = field.type && validTypes.includes(field.type) ? field.type : 'text';

              if (field.type && !validTypes.includes(field.type)) {
                console.warn(`Invalid field type "${field.type}" for field ${field.label || field.name}, using 'text' instead`);
              }

              // Pastikan semua field demografis memiliki label
              const fieldLabel = field.label || field.name || 'Field';

              return {
                id: field.id,
                label: fieldLabel,
                type: fieldType,
                required: field.required === undefined ? false : Boolean(field.required),
                options: parsedOptions,
                field_order: field.field_order
              };
            }) || [],
            // Format period dengan benar, pastikan value diambil dari kolom period di database
            period: {
              type: survey.period_type || 'quarterly',
              year: survey.period_year || new Date().getFullYear(),
              value: survey.period || '', // Kolom period dari database
              quarter: survey.period_type === 'quarterly' ? (survey.period ? survey.period.replace('Q', '') : '1') : '',
              semester: survey.period_type === 'semester' ? (survey.period ? survey.period.replace('S', '') : '1') : ''
            },
            type: survey.type || 'weighted',
            surveyCategory: survey.survey_category || 'calculate'
          };

          processSurveyData(formattedSurvey);
        } catch (dbError) {
          console.error("Error saat mengambil data langsung dari database:", dbError);
          setError("Terjadi kesalahan saat mengambil data dari database");
        }
      } catch (error) {
        console.error("Error getting survey:", error);
        setError("Terjadi kesalahan saat mengambil data survei");
      }
    };

    fetchSurveyData();
  }, [surveyId, surveys, getSurvey]);

  // Fungsi untuk memproses data survei
  const processSurveyData = (survey: Survey) => {
    console.log("Memproses data survei:", survey.title);
    console.log("Data survei untuk diproses:", JSON.stringify({
      id: survey.id,
      title: survey.title,
      indicators: (survey.indicators || []).length,
      demographicFields: (survey.demographicFields || []).length,
      period: survey.period // Tampilkan seluruh objek period
    }));

    // Debug informasi demografis
    if (survey.demographicFields && survey.demographicFields.length > 0) {
      console.log("Detail field demografis dari database:");
      survey.demographicFields.forEach((field, idx) => {
        console.log(`Field #${idx + 1}:`, {
          id: field.id,
          label: field.label || field.id, // Menggunakan field.id sebagai fallback, bukan field.name
          type: field.type,
          required: field.required,
          options: field.options
        });
      });
    }

    // Periksa apakah period memiliki value yang valid
    if (survey.period) {
      console.log("Period value yang akan digunakan:", {
        type: survey.period.type,
        year: survey.period.year,
        value: survey.period.value,
        quarter: survey.period.quarter,
        semester: survey.period.semester
      });

      // Pastikan period.value diisi dengan benar jika tidak ada
      if (!survey.period.value && survey.period.type) {
        // Jika tidak ada value tapi ada quarter/semester, coba buat value dari itu
        if (survey.period.type === 'quarterly' && survey.period.quarter) {
          survey.period.value = `Q${survey.period.quarter}`;
          console.log(`Membuat period.value dari quarter: ${survey.period.value}`);
        } else if (survey.period.type === 'semester' && survey.period.semester) {
          survey.period.value = `S${survey.period.semester}`;
          console.log(`Membuat period.value dari semester: ${survey.period.value}`);
        }
      }
    }

    // Pastikan data demografis dalam format yang benar
    const formattedDemographicFields = (survey.demographicFields || []).map((field: any) => {
      console.log(`Memproses field demografis: ${field.label || field.name || 'Untitled'}`, field);

      // Jika options adalah string (dari database), parse sebagai JSON
      let processedOptions = field.options;
      if (field.options && typeof field.options === 'string') {
        try {
          processedOptions = JSON.parse(field.options);
          console.log(`Berhasil parse options untuk field ${field.label || field.name}:`, processedOptions);
        } catch (e) {
          console.warn(`Gagal parsing options untuk field ${field.label || field.id}:`, e);
          console.warn(`String options yang gagal parse:`, field.options);
          processedOptions = [];
        }
      } else if (!field.options) {
        console.log(`Field ${field.label || field.name || field.id} tidak memiliki options`);
        processedOptions = [];
      } else if (!Array.isArray(field.options)) {
        console.warn(`Options untuk field ${field.label || field.name || field.id} bukan array:`, typeof field.options);
        try {
          // Coba konversi ke array jika bukan string atau array
          processedOptions = Object.values(field.options);
          console.log(`Konversi options ke array:`, processedOptions);
        } catch (e) {
          console.warn(`Gagal konversi options ke array:`, e);
          processedOptions = [];
        }
      }

      // Pastikan label ada
      const fieldLabel = field.label || field.name || 'Field';

      // Pastikan tipe data valid
      const validTypes = ['text', 'number', 'date', 'dropdown', 'radio', 'checkbox'];
      const fieldType = validTypes.includes(field.type) ? field.type : 'text';

      if (field.type && !validTypes.includes(field.type)) {
        console.warn(`Tipe field tidak valid: ${field.type}, menggunakan default 'text'`);
      }

      // Pastikan semua field memiliki nilai yang benar
      return {
        id: field.id,
        label: fieldLabel,
        type: fieldType,
        required: field.required === undefined ? false : Boolean(field.required),
        options: Array.isArray(processedOptions) ? processedOptions : []
      };
    });

    // Log hasil pemrosesan
    console.log("Hasil pemrosesan field demografis:");
    formattedDemographicFields.forEach((field, idx) => {
      console.log(`Field #${idx + 1} (processed):`, field);
    });

    // Ubah format data pertanyaan
    const processedQuestions: Question[] = [];
    if (survey.indicators && survey.indicators.length > 0) {
      survey.indicators.forEach((indicator: IndicatorFromDB) => {
        if (indicator.questions && indicator.questions.length > 0) {
          indicator.questions.forEach((question: any) => {
            processedQuestions.push({
              ...question,
              indicatorId: indicator.id,
              indicatorTitle: indicator.title || (indicator as any).name || 'Indikator'
            });
          });
        }
      });
    }

    // Update state
    setSurveyData({
      ...survey,
      demographicFields: formattedDemographicFields
    });
    setAllQuestions(processedQuestions);
    console.log(`Memproses ${processedQuestions.length} pertanyaan dan ${formattedDemographicFields.length} field demografis`);
  };

  // Handler untuk jawaban pertanyaan survei
  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // Handler untuk data demografi
  const handleDemographicChange = (fieldId: string, value: any) => {
    setDemographicData(prev => ({
      ...prev,
      [fieldId]: value
    }))

    if (demographicErrors[fieldId]) {
      setDemographicErrors(prev => ({
        ...prev,
        [fieldId]: false
      }))
    }
  }

  const calculateProgress = () => {
    if (allQuestions.length === 0) return 0
    return Math.round((Object.keys(responses).length / allQuestions.length) * 100)
  }

  // Validasi data demografi sebelum melanjutkan
  const validateDemographics = () => {
    if (!surveyData || !surveyData.demographicFields) return true

    const errors: Record<string, boolean> = {}
    let hasErrors = false

    surveyData.demographicFields.forEach(field => {
      if (field.required && (!demographicData[field.id] || demographicData[field.id] === '')) {
        errors[field.id] = true
        hasErrors = true
      }
    })

    setDemographicErrors(errors)
    return !hasErrors
  }

  // Handler untuk navigasi antar langkah survei
  const handleNextStep = () => {
    if (currentStep === SurveyStep.DEMOGRAPHICS) {
      if (validateDemographics()) {
        setCurrentStep(SurveyStep.QUESTIONS)
      } else {
        setError("Mohon lengkapi semua bidang data demografi yang wajib diisi")
      }
    } else if (currentStep === SurveyStep.QUESTIONS) {
      if (currentQuestionIndex < allQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        setCurrentStep(SurveyStep.REVIEW)
      }
    }
  }

  const handlePreviousStep = () => {
    if (currentStep === SurveyStep.QUESTIONS) {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1)
      } else {
        setCurrentStep(SurveyStep.DEMOGRAPHICS)
      }
    } else if (currentStep === SurveyStep.REVIEW) {
      setCurrentStep(SurveyStep.QUESTIONS)
      setCurrentQuestionIndex(allQuestions.length - 1)
    }
  }

  // Handler untuk pengiriman survei
  const handleSubmit = () => {
    if (!surveyData) return

    // Validasi data demografis
    const requiredDemographicFields = surveyData.demographicFields.filter(field => field.required)
    const missingDemographicFields = requiredDemographicFields.filter(field =>
      !demographicData[field.id] ||
      (Array.isArray(demographicData[field.id]) && demographicData[field.id].length === 0) ||
      demographicData[field.id] === ""
    )

    if (missingDemographicFields.length > 0) {
      setError(`Mohon lengkapi data demografis: ${missingDemographicFields.map(f => f.label).join(", ")}`)
      return
    }

    // Validasi pertanyaan
    const missingQuestions = allQuestions.filter(question =>
      question.required && !responses[question.id]
    )

    if (missingQuestions.length > 0) {
      setError(`Mohon jawab pertanyaan berikut: ${missingQuestions.map(q => q.text).join(", ")}`)
      return
    }

    setIsSubmitting(true)

    try {
      // Format responses to match the expected structure
      const formattedResponses = Object.entries(responses).map(([questionId, value]) => {
        const question = allQuestions.find(q => q.id === questionId)
        return {
          questionId,
          indicatorId: question?.indicatorId || "",
          value
        }
      })

      // Format demographic data
      const formattedDemographics = Object.entries(demographicData).map(([fieldId, value]) => ({
        fieldId,
        value
      }))

      // Create new survey response
      const responseData = {
        surveyId: surveyData.id,
        answers: formattedResponses,
        demographicData: formattedDemographics
      }

      // Submit to context
      submitSurveyResponse(responseData)
      setIsSubmitted(true)
      setIsSubmitting(false)

      // Hapus draft setelah submit berhasil
      if (typeof window !== "undefined") {
        const savedDrafts = localStorage.getItem("surveyDrafts")
        if (savedDrafts) {
          const drafts = JSON.parse(savedDrafts)
          delete drafts[surveyData.id]
          localStorage.setItem("surveyDrafts", JSON.stringify(drafts))
        }
      }
    } catch (error) {
      setError("Terjadi kesalahan saat mengirim tanggapan. Silakan coba lagi.")
      setIsSubmitting(false)
    }
  }

  // Render field demografi sesuai tipenya
  const renderDemographicField = (field: DemographicField) => {
    console.log(`Rendering demographic field:`, {
      id: field.id,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options
    });

    const fieldValue = demographicData[field.id]
    const hasError = demographicErrors[field.id]

    // Pastikan tipe yang valid
    const validType = ['text', 'number', 'date', 'dropdown', 'radio', 'checkbox'].includes(field.type)
      ? field.type
      : 'text';

    if (validType !== field.type) {
      console.warn(`Warning: Tipe field tidak valid "${field.type}", menggunakan "${validType}" sebagai fallback`);
    }

    // Pastikan options tersedia untuk tipe yang membutuhkannya
    const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(validType);
    if (needsOptions && (!field.options || field.options.length === 0)) {
      console.warn(`Warning: Field "${field.label}" dengan tipe ${validType} membutuhkan options, tapi tidak ada options tersedia`);
    }

    switch (validType) {
      case "text":
        return (
          <Input
            type="text"
            value={fieldValue || ""}
            onChange={(e) => handleDemographicChange(field.id, e.target.value)}
            className={cn("w-full", hasError && "border-red-500")}
            placeholder={`Masukkan ${field.label.toLowerCase()}`}
          />
        )
      case "number":
        return (
          <Input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={fieldValue || ""}
            onChange={(e) => handleDemographicChange(field.id, e.target.value)}
            className={cn("w-full", hasError && "border-red-500")}
            placeholder={`Masukkan ${field.label.toLowerCase()}`}
          />
        )
      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !fieldValue && "text-muted-foreground",
                  hasError && "border-red-500"
                )}
              >
                <Clock className="mr-2 h-4 w-4" />
                {fieldValue ? format(new Date(fieldValue), "PPP") : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={fieldValue ? new Date(fieldValue) : undefined}
                onSelect={(date) => handleDemographicChange(field.id, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )
      case "dropdown":
        if (!field.options || field.options.length === 0) {
          console.warn(`Field dropdown "${field.label}" tidak memiliki options`, field);
          return (
            <div className="text-amber-500 text-sm">
              Dropdown field membutuhkan opsi (tidak ada opsi tersedia)
            </div>
          );
        }
        return (
          <Select
            value={fieldValue || ""}
            onValueChange={(value) => handleDemographicChange(field.id, value)}
          >
            <SelectTrigger className={cn("w-full", hasError && "border-red-500")}>
              <SelectValue placeholder={`Pilih ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "radio":
        if (!field.options || field.options.length === 0) {
          console.warn(`Field radio "${field.label}" tidak memiliki options`, field);
          return (
            <div className="text-amber-500 text-sm">
              Radio field membutuhkan opsi (tidak ada opsi tersedia)
            </div>
          );
        }
        return (
          <RadioGroup
            value={fieldValue || ""}
            onValueChange={(value) => handleDemographicChange(field.id, value)}
            className={cn("space-y-2", hasError && "border-red-500 border p-2 rounded-md")}
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )
      case "checkbox":
        if (!field.options || field.options.length === 0) {
          console.warn(`Field checkbox "${field.label}" tidak memiliki options`, field);
          return (
            <div className="text-amber-500 text-sm">
              Checkbox field membutuhkan opsi (tidak ada opsi tersedia)
            </div>
          );
        }

        return (
          <div className={cn("space-y-2", hasError && "border-red-500 border p-2 rounded-md")}>
            {field.options?.map((option) => {
              // Inisialisasi fieldValue sebagai array jika belum
              if (!fieldValue) {
                handleDemographicChange(field.id, []);
              }

              const isChecked = Array.isArray(fieldValue)
                ? fieldValue.includes(option)
                : false;

              const handleCheckboxChange = (checked: boolean) => {
                let newValue: string[] = [];

                if (Array.isArray(fieldValue)) {
                  // Jika sudah array, update sesuai status checkbox
                  if (checked) {
                    // Tambahkan option jika belum ada
                    newValue = [...fieldValue, option];
                  } else {
                    // Hapus option dari array jika ada
                    newValue = fieldValue.filter(val => val !== option);
                  }
                } else {
                  // Jika bukan array, buat array baru
                  newValue = checked ? [option] : [];
                }

                handleDemographicChange(field.id, newValue);
              };

              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={isChecked}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        )
      default:
        console.warn(`Tipe field tidak diketahui: ${field.type}`);
        return (
          <div className="text-amber-500 text-sm">
            Tipe field tidak diketahui: {field.type}
          </div>
        );
    }
  }

  // UI state handlers
  if (error) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-8 text-center">
          <div className="bg-red-50 p-6 rounded-lg mb-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/take-survey">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Survei
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (isSubmitted) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-8 text-center">
          <div className="bg-green-50 p-8 rounded-lg mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Terima Kasih!</h2>
            <p className="text-gray-600 mb-6">
              Tanggapan Anda telah berhasil dikirim. Kami sangat menghargai waktu dan masukan yang Anda berikan.
            </p>
            <Link href="/take-survey">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Survei
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <ClientOnly fallback={<LoadingFallback message="Memuat survei..." />}>
        {surveyData ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center mb-2">
              <Link href="/take-survey" className="text-blue-600 hover:text-blue-800 flex items-center mr-auto">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Kembali ke daftar survei
              </Link>
              {currentStep === SurveyStep.QUESTIONS && (
                <span className="text-sm text-gray-500">
                  Pertanyaan {currentQuestionIndex + 1} dari {allQuestions.length}
                </span>
              )}
            </div>

            {currentStep === SurveyStep.QUESTIONS && (
              <Progress value={calculateProgress()} className="mb-6" />
            )}

            <h1 className="text-2xl md:text-3xl font-bold mb-2">{surveyData.title}</h1>
            <p className="text-gray-500 mb-4">{surveyData.description}</p>

            {/* Tampilkan informasi periode survei */}
            {surveyData.period && (
              <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-md mb-6 flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                <div className="flex flex-col">
                  <span className="font-medium">{formatPeriodeSurvei(surveyData)}</span>
                  {getPeriodeLabel(surveyData) && getPeriodeLabel(surveyData) !== 'Periode tidak tersedia' && getPeriodeLabel(surveyData) !== '' && (
                    <span className="text-xs text-blue-600">{getPeriodeLabel(surveyData)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Bagian Demografis */}
            {currentStep === SurveyStep.DEMOGRAPHICS && surveyData.demographicFields && (
              <Card className="p-6 shadow-subtle mb-8">
                <div className="mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  <h2 className="text-xl font-medium">Data Demografi</h2>
                </div>
                <p className="text-gray-500 mb-6">
                  Mohon lengkapi informasi berikut sebelum mengisi survei. Data ini membantu kami memahami tanggapan Anda dengan lebih baik.
                </p>

                {surveyData.demographicFields.length > 0 ? (
                <div className="space-y-6">
                    {surveyData.demographicFields.map((field, idx) => {
                      console.log(`Rendering demografic field ${idx}:`, field);
                      return (
                        <div key={field.id || `demo-field-${idx}`} className="space-y-2">
                      <Label className="flex items-center">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderDemographicField(field)}
                      {demographicErrors[field.id] && (
                        <p className="text-sm text-red-500">
                          {field.label} wajib diisi
                        </p>
                      )}
                    </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-gray-500">
                    <p>Tidak ada data demografis yang perlu diisi untuk survei ini.</p>
                </div>
                )}
              </Card>
            )}

            {/* Bagian Pertanyaan Survei */}
            {currentStep === SurveyStep.QUESTIONS && (
              <Card className="p-6 shadow-subtle mb-8">
                {allQuestions.length > 0 ? (
                  <>
                <div className="mb-2">
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 py-1 px-2 rounded">
                        {allQuestions[currentQuestionIndex]?.indicatorTitle || 'Indikator'}
                  </span>
                </div>
                    <h3 className="text-xl font-medium mb-6">
                      {allQuestions[currentQuestionIndex]?.text || 'Pertanyaan tidak tersedia'}
                    </h3>

                {/* Render pertanyaan berdasarkan tipe */}
                {(() => {
                  const question = allQuestions[currentQuestionIndex];
                  const questionType = question?.type || 'likert';

                  if (isLikertType(questionType)) {
                    // Menggunakan utilitas untuk mendapatkan opsi dan label berdasarkan tipe
                    const likertOptions = getLikertOptions(questionType);
                    const likertLabels = getLikertLabels(questionType);
                    const maxRating = likertOptions.length;
                    const currentValue = parseInt(responses[question?.id || '']?.toString() || "0");

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between px-4 text-sm text-gray-500">
                          <span>{likertLabels[1]}</span>
                          <span>{likertLabels[maxRating]}</span>
                        </div>

                        <div className="flex items-center justify-center space-x-4 py-8">
                          {likertOptions.map((value) => (
                            <div key={value} className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => handleResponseChange(question?.id || '', value)}
                                className="text-6xl focus:outline-none transition-colors"
                              >
                                <span className={value <= currentValue ? "text-yellow-400" : "text-gray-300"}>
                                  ★
                                </span>
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="text-center text-sm text-gray-600">
                          {currentValue ? `${getLikertLabelForValue(currentValue, questionType)}` : "Belum memberikan rating"}
                        </div>
                      </div>
                    );
                  }

                  switch(questionType) {
                    case 'text':
                      return (
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Masukkan jawaban Anda"
                            value={responses[question?.id || '']?.toString() || ""}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleResponseChange(question?.id || '', e.target.value)}
                            className="w-full min-h-[100px]"
                          />
                        </div>
                      );

                    case 'dropdown':
                      return (
                        <div className="space-y-4">
                          <Select
                            value={responses[question?.id || '']?.toString() || ""}
                            onValueChange={(value) => handleResponseChange(question?.id || '', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih opsi" />
                            </SelectTrigger>
                            <SelectContent>
                              {question?.options?.map((option, index) => (
                                <SelectItem key={index} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );

                    case 'radio':
                      return (
                        <div className="space-y-4">
                          <RadioGroup
                            value={responses[question?.id || '']?.toString() || ""}
                            onValueChange={(value) => handleResponseChange(question?.id || '', value)}
                            className="space-y-2"
                          >
                            {question?.options?.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`option-${index}`} />
                                <Label htmlFor={`option-${index}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      );

                    case 'checkbox':
                      // Untuk checkbox, kita perlu menangani array nilai
                      const handleCheckboxChange = (option: string, checked: boolean) => {
                        const currentValues = responses[question?.id || ''] || [];
                        let newValues;

                        if (Array.isArray(currentValues)) {
                          newValues = checked
                            ? [...currentValues, option]
                            : currentValues.filter(val => val !== option);
                        } else {
                          newValues = checked ? [option] : [];
                        }

                        handleResponseChange(question?.id || '', newValues);
                      };

                      return (
                        <div className="space-y-4">
                          {question?.options?.map((option, index) => {
                            const currentValues = responses[question?.id || ''] || [];
                            const isChecked = Array.isArray(currentValues) && currentValues.includes(option);

                            return (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`checkbox-${index}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                                />
                                <Label htmlFor={`checkbox-${index}`}>{option}</Label>
                              </div>
                            );
                          })}
                        </div>
                      );

                    case 'date':
                      return (
                        <div className="space-y-4">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !responses[question?.id || ''] && "text-muted-foreground"
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {responses[question?.id || ''] ?
                                  format(new Date(responses[question?.id || '']), "PPP") :
                                  <span>Pilih tanggal</span>
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={responses[question?.id || ''] ? new Date(responses[question?.id || '']) : undefined}
                                onSelect={(date) => handleResponseChange(question?.id || '', date?.toISOString() || '')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      );

                    case 'number':
                      return (
                        <div className="space-y-4">
                          <Input
                            type="number"
                            value={responses[question?.id || '']?.toString() || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleResponseChange(question?.id || '', parseFloat(e.target.value) || 0)}
                            placeholder="Masukkan angka"
                            className="w-full"
                          />
                        </div>
                      );

                    default:
                      return (
                        <div className="p-4 border border-orange-200 bg-orange-50 rounded-md text-orange-700">
                          <AlertCircle className="inline-block h-4 w-4 mr-2" />
                          Tipe pertanyaan "{questionType}" tidak didukung
                        </div>
                      );
                  }
                })()}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">Tidak Ada Pertanyaan</h3>
                    <p className="text-gray-500 mb-4">
                      Survei ini belum memiliki pertanyaan yang dapat dijawab.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/take-survey')}>
                      Kembali ke Daftar Survei
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Bagian Review */}
            {currentStep === SurveyStep.REVIEW && (
              <Card className="p-6 shadow-subtle mb-8">
                <h2 className="text-xl font-medium mb-4">Tinjauan Jawaban</h2>
                <p className="text-gray-500 mb-6">
                  Mohon tinjau jawaban Anda sebelum mengirim. Pastikan semua informasi sudah benar.
                </p>

                {/* Ringkasan Demografis */}
                <div className="mb-6">
                  <h3 className="font-medium text-blue-600 mb-2">Data Demografi</h3>
                  <div className="space-y-2 border rounded-md p-4">
                    {surveyData.demographicFields?.map((field) => (
                      <div key={field.id} className="flex justify-between">
                        <span className="text-gray-500">{field.label}:</span>
                        <span className="font-medium">
                          {field.type === 'date' && demographicData[field.id]
                            ? format(new Date(demographicData[field.id]), "dd MMMM yyyy")
                            : (demographicData[field.id] || '-')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ringkasan Jawaban */}
                <div>
                  <h3 className="font-medium text-blue-600 mb-2">Jawaban Pertanyaan</h3>
                  <div className="space-y-4">
                    {allQuestions.map((question, index) => (
                      <div key={question.id} className="border rounded-md p-4">
                        <div className="text-sm text-gray-500 mb-1">
                          Pertanyaan {index + 1} ({question.indicatorTitle})
                        </div>
                        <div className="font-medium mb-2">{question.text}</div>
                        <div className="flex items-center">
                          {question.type === 'likert' ? (
                            <>
                              <span className="text-lg font-bold mr-2">
                                {responses[question.id] || '-'}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({responses[question.id] ? getRatingLabel(responses[question.id]) : 'Belum dijawab'})
                              </span>
                            </>
                          ) : question.type === 'checkbox' ? (
                            <span className="text-base">
                              {Array.isArray(responses[question.id])
                                ? responses[question.id].join(', ')
                                : 'Belum dijawab'}
                            </span>
                          ) : question.type === 'date' ? (
                            <span className="text-base">
                              {responses[question.id]
                                ? format(new Date(responses[question.id]), "dd MMMM yyyy")
                                : 'Belum dijawab'}
                            </span>
                          ) : (
                            <span className="text-base">
                              {responses[question.id] || 'Belum dijawab'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Navigasi Tombol */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousStep}
                disabled={currentStep === SurveyStep.DEMOGRAPHICS}
              >
                Sebelumnya
              </Button>

              {currentStep === SurveyStep.REVIEW ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.keys(responses).length < allQuestions.length}
                >
                  {isSubmitting ? "Mengirim..." : "Kirim Tanggapan"}
                </Button>
              ) : (
                <Button
                  onClick={handleNextStep}
                  disabled={
                    currentStep === SurveyStep.QUESTIONS &&
                    !responses[allQuestions[currentQuestionIndex]?.id]
                  }
                >
                  {currentStep === SurveyStep.DEMOGRAPHICS ? "Mulai Survei" : "Selanjutnya"}
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md">
                <AlertCircle className="inline-block h-4 w-4 mr-2" />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Survei Tidak Ditemukan</h2>
            <p className="text-gray-600 mb-6">
              Survei yang Anda cari tidak ditemukan atau mungkin sudah tidak aktif.
            </p>
            <Link href="/take-survey">
              <Button>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Survei
              </Button>
            </Link>
          </div>
        )}
      </ClientOnly>
    </Layout>
  )
}
