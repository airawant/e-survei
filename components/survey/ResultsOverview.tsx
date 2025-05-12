"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
  ReferenceLine
} from "recharts"
import React from 'react'
import {
  convertToIKMScale,
  calculateIndicatorValue,
  transformDataForBarChart,
  getServiceQuality,
  calculateTotalScore
} from "@/lib/utils/survey-calculations";
import { Button } from "@/components/ui/button";
import { CalendarIcon, RefreshCcw } from "lucide-react";
import { useSurvey } from "@/context/SupabaseSurveyContext";
import { toast } from "sonner";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Komponen ini dibuat berdasarkan struktur data yang terlihat dari SurveyContext.tsx
interface AnswerDistribution {
  score: number
  count: number
  percentage: number
}

// Definisi untuk periode survei
interface SurveyPeriod {
  year: number;
  quarter?: number;
  semester?: number;
}

interface UserData {
  id: string
  name: string
  email?: string
  age?: number
  gender?: string
  createdAt: Date
}

interface SurveyData {
  id: string
  date: Date
  userId: string
  period: SurveyPeriod
  answers: Record<string, number> // id_pertanyaan: nilai
}

interface QuestionData {
  id: string
  text: string
  weight: number // Bobot untuk Weighted Scoring
  indicatorId: string // Indikator terkait
}

interface IndicatorData {
  id: string
  name: string
  score: number
  answerDistribution: AnswerDistribution[]
  questions?: string[]
  questionDetails: QuestionDetail[]
  indicatorId?: string
  indicatorTitle?: string
  weight?: number
  weightedScore?: number
}

interface QuestionDetail {
  id: string
  text: string
  indicatorId: string
  indicatorName: string
  averageScore: number
  distribution: AnswerDistribution[]
  weight: number // Bobot pertanyaan
}

interface TrendPoint {
  date: string
  score: number
  period: SurveyPeriod
  rawDate?: Date // Opsional untuk kompatibilitas
}

interface TrendData {
  available: boolean
  previousScore: number
  currentScore: number
  trendPoints: TrendPoint[]
}

interface ReportData {
  id: string
  period: SurveyPeriod
  respondentCount: number
  aggregationValue: number
  scoreIndex: number // Hasil akhir skala 1-4
}

interface SurveyResult {
  reportData: {
    respondentCount: number;
    scoreIndex: number;
    aggregationValue: number;
  };
  currentPeriod: SurveyPeriod;
  surveyId: string;
  surveyTitle: string;
  totalRespondents: number;
  averageScore: number;
  indicatorsData: IndicatorData[];
  recommendationRate: number;
  trendData?: TrendData;
  isWeighted: boolean;
}

interface ResultsOverviewProps {
  result: SurveyResult
}

interface SurveyBasicDetails {
  title: string
  description: string
  period: {
    type: 'quarterly' | 'semester' | 'annual'
    quarter?: string
    semester?: string
    year: number
  }
  startDate: Date
  endDate: Date
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
const SCORE_LABELS = [
  "Sangat Tidak Memuaskan",
  "Tidak Memuaskan",
  "Kurang Memuaskan",
  "Cukup Memuaskan",
  "Memuaskan",
  "Sangat Memuaskan"
]

// Menambahkan interface untuk definisi kolom
interface WSMColumnBasic {
  id: string;
  header: string;
}

interface WSMColumnQuestion extends WSMColumnBasic {
  tooltip: string;
  weight: number;
}

type WSMColumn = WSMColumnBasic | WSMColumnQuestion;

// Menambahkan fungsi type guard
const isQuestionColumn = (column: WSMColumn): column is WSMColumnQuestion => {
  return 'weight' in column && 'tooltip' in column;
};

interface WeightedScore {
  questionDetails: QuestionDetail[];
}

interface ResponseData {
  score: number;
  weight: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface PeriodParams {
  type: 'quarter' | 'semester' | 'year' | 'custom';
  value?: string;
  year: number;
}

interface SurveyResponse {
  answers: Record<string, number>;
  period: SurveyPeriod;
}

export function ResultsOverview({ result }: ResultsOverviewProps) {
  const { getSurveyResults } = useSurvey();
  const [activeTab, setActiveTab] = useState("overview")
  const [forceUpdate, setForceUpdate] = useState(0)
  const isWeightedSurvey = result?.isWeighted !== false;
  const [qualityLevel, setQualityLevel] = useState("");
  const [respondentsData, setRespondentsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  // Data untuk pertanyaan (U1-U9)
  const [questionIds, setQuestionIds] = useState<string[]>([]);

  // Simpan informasi jenis tipe pertanyaan (untuk mengetahui mana yang likert-6)
  const [questionTypes, setQuestionTypes] = useState<Record<string, string>>({});

  // Tambahkan state baru untuk menyimpan pertanyaan berdasarkan indikator
  const [questionsByIndicator, setQuestionsByIndicator] = useState<Record<string, {
    indicatorId: string;
    indicatorName: string;
    questionIds: string[];
    questionTexts: Record<string, string>;
  }>>({});

  // Fungsi untuk mengambil data responden dan jawaban dari database
  const fetchRespondentsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!result || !result.surveyId) {
        setError("ID Survei tidak tersedia");
        setIsLoading(false);
        return;
      }

      // 1. Ambil semua pertanyaan untuk survei ini - pastikan mendapatkan semua pertanyaan likert
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('id, name')
        .eq('survey_id', result.surveyId);

      if (indicatorsError) {
        throw new Error(`Error mengambil indikator: ${indicatorsError.message}`);
      }

      if (!indicatorsData || indicatorsData.length === 0) {
        setError("Tidak ada indikator ditemukan untuk survei ini");
        setIsLoading(false);
        return;
      }

      const indicatorIds = indicatorsData.map(ind => ind.id);

      // Ambil pertanyaan berdasarkan indikator yang terkait dengan survey ini
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, indicator_id, type, weight')
        .in('indicator_id', indicatorIds)
        .order('created_at', { ascending: true });

      if (questionsError) {
        throw new Error(`Error mengambil pertanyaan: ${questionsError.message}`);
      }

      // Filter hanya pertanyaan likert atau semua jika tidak ada type yang spesifik
      const likertQuestions = questionsData.filter(q =>
        !q.type || q.type.includes('likert') || ['likert-4', 'likert-6'].includes(q.type)
      );

      if (likertQuestions.length === 0) {
        setError("Tidak ada pertanyaan likert ditemukan");
        setIsLoading(false);
        return;
      }

      // Simpan ID pertanyaan untuk referensi dan juga informasi tipe pertanyaan
      const questionIdsFromDB = likertQuestions.map(q => q.id);
      setQuestionIds(questionIdsFromDB);

      // Simpan tipe pertanyaan
      const questionTypesData: Record<string, string> = {};
      likertQuestions.forEach(q => {
        questionTypesData[q.id] = q.type || 'likert-4'; // Default ke likert-4 jika tidak ada tipe
      });
      setQuestionTypes(questionTypesData);

      // Kelompokkan pertanyaan berdasarkan indikator
      const indicatorMap: Record<string, {
        indicatorId: string;
        indicatorName: string;
        questionIds: string[];
        questionTexts: Record<string, string>;
      }> = {};

      // Inisialisasi indikator terlebih dahulu
      indicatorsData.forEach(indicator => {
        indicatorMap[indicator.id] = {
          indicatorId: indicator.id,
          indicatorName: indicator.name,
          questionIds: [],
          questionTexts: {}
        };
      });

      // Tambahkan pertanyaan ke indikator masing-masing
      likertQuestions.forEach(question => {
        if (question.indicator_id && indicatorMap[question.indicator_id]) {
          indicatorMap[question.indicator_id].questionIds.push(question.id);
          indicatorMap[question.indicator_id].questionTexts[question.id] = question.text;
        }
      });

      setQuestionsByIndicator(indicatorMap);

      console.log("Pertanyaan likert yang ditemukan:", likertQuestions.length, likertQuestions);
      console.log("Tipe pertanyaan:", questionTypesData);
      console.log("Pertanyaan berdasarkan indikator:", indicatorMap);

      // 2. Ambil semua responden untuk survei ini dengan jawaban lengkap
      const { data: respondentsWithData, error: respondentsError } = await supabase
        .from('respondents')
        .select(`
          id,
          name,
          survey_id,
          responses (
            id,
            answers (
              id,
              question_id,
              score
            )
          )
        `)
        .eq('survey_id', result.surveyId);

      if (respondentsError) {
        throw new Error(`Error mengambil responden: ${respondentsError.message}`);
      }

      console.log("Data responden yang ditemukan:", respondentsWithData.length, respondentsWithData);

      // Filter responden yang memiliki jawaban
      const respondentsWithAnswers = respondentsWithData.filter(r =>
        r.responses && r.responses.length > 0 &&
        r.responses[0].answers && r.responses[0].answers.length > 0
      );

      if (respondentsWithAnswers.length === 0) {
        setError("Tidak ada responden dengan jawaban ditemukan");
        setIsLoading(false);
        return;
      }

      // 3. Format data untuk tampilan tabel
      const formattedData = respondentsWithAnswers.map(respondent => {
        // Ambil respons pertama (biasanya hanya ada satu per responden)
        const response = respondent.responses[0] || { answers: [] };

        // Buat array skor yang terurut berdasarkan urutan pertanyaan
        const answers: Record<string, number> = {};

        // Pastikan kita memeriksa semua jawaban
        if (response.answers && response.answers.length > 0) {
          response.answers.forEach(answer => {
            if (answer && answer.question_id && typeof answer.score === 'number') {
              answers[answer.question_id] = answer.score;
            }
          });
        }

        // Buat array skor sesuai urutan questionIds - gunakan nilai default 0 jika tidak ada jawaban
        const orderedScores = questionIdsFromDB.map(qId => {
          const score = answers[qId];
          return typeof score === 'number' ? score : 0;
        });

        return {
          id: respondent.id,
          name: respondent.name || `Responden ${respondent.id.substring(0, 8)}`,
          answers: orderedScores
        };
      });

      // Tampilkan data untuk debug
      console.log("Formatted data:", formattedData);

      // Hanya tampilkan responden yang memiliki setidaknya satu jawaban dengan nilai > 0
      const validRespondents = formattedData.filter(r =>
        r.answers.some(score => score > 0)
      );

      if (validRespondents.length === 0) {
        setError("Tidak ditemukan responden dengan jawaban valid");
        setIsLoading(false);
        return;
      }

      setRespondentsData(validRespondents);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error saat mengambil data:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
      setIsLoading(false);
      toast.error("Gagal mengambil data responden: " + err.message);
    }
  };

  // Jalankan sekali saat komponen dimuat
  useEffect(() => {
    fetchRespondentsData();
  }, [result?.surveyId]);

  // Hitung total nilai per kolom - dengan pengecekan data
  const calculateColumnSums = () => {
    if (!respondentsData || !respondentsData.length || !questionIds || !questionIds.length)
      return Array(9).fill(0); // Default ke 9 kolom jika tidak ada data

    // Untuk setiap pertanyaan, hitung jumlah skor dari semua responden
    const columnSums = Array(questionIds.length).fill(0);

    respondentsData.forEach(respondent => {
      if (!respondent.answers) return;

      respondent.answers.forEach((score: number, index: number) => {
        if (typeof score === 'number' && !isNaN(score)) {
          columnSums[index] += score;
        }
      });
    });

    return columnSums;
  };

  // Hitung rata-rata nilai per kolom dengan penyesuaian untuk skala likert-6
  const calculateAveragePerColumn = () => {
    if (!respondentsData || !respondentsData.length || !questionIds || !questionIds.length)
      return Array(9).fill(0); // Default ke 9 kolom jika tidak ada data

    // Untuk setiap pertanyaan, hitung jumlah skor dan jumlah responden
    const columnSums = Array(questionIds.length).fill(0);
    const respondentCounts = Array(questionIds.length).fill(0);

    console.log("Tipe pertanyaan yang digunakan:", questionTypes);

    // Hitung jumlah skor per kolom
    respondentsData.forEach(respondent => {
      if (!respondent.answers) return;

      respondent.answers.forEach((score: number, index: number) => {
        if (typeof score === 'number' && !isNaN(score) && score > 0) {
          // Periksa apakah ini pertanyaan likert-6 dan sesuaikan nilainya
          const questionId = questionIds[index];
          const questionType = questionTypes[questionId] || '';

          if (questionType.includes('likert-6')) {
            // Jika likert-6, bagi dengan 1.5 untuk menyesuaikan skala
            console.log(`Menyesuaikan nilai untuk pertanyaan ${index+1} (tipe: ${questionType}): ${score} → ${score / 1.5}`);
            columnSums[index] += (score / 1.5);
          } else {
            columnSums[index] += score;
          }

          respondentCounts[index]++;
        }
      });
    });

    // Hitung rata-rata untuk setiap kolom
    const averages = columnSums.map((sum, index) =>
      respondentCounts[index] > 0 ? sum / respondentCounts[index] : 0
    );

    console.log("Jumlah responden per kolom:", respondentCounts);
    console.log("Jumlah skor per kolom (setelah penyesuaian):", columnSums);
    console.log("Rata-rata per kolom:", averages);

    return averages;
  };

  // Hitung NRR Per Unsur dari data responden - dengan pengecekan data
  const calculateNRRPerUnsur = () => {
    if (!respondentsData || !respondentsData.length || !questionIds || !questionIds.length)
      return Array(9).fill(0); // Default ke 9 kolom jika tidak ada data

    // Untuk setiap pertanyaan, hitung rata-rata skor dari semua responden
    const nrrValues = Array(questionIds.length).fill(0).map((_, qIndex) => {
      let totalScore = 0;
      let count = 0;

      respondentsData.forEach(respondent => {
        if (!respondent.answers) return;

        const score = respondent.answers[qIndex];
        if (typeof score === 'number' && !isNaN(score) && score > 0) {
          // Periksa apakah ini pertanyaan likert-6 dan sesuaikan nilainya
          const questionId = questionIds[qIndex];
          const questionType = questionTypes[questionId] || '';

          if (questionType.includes('likert-6')) {
            // Jika likert-6, bagi dengan 1.5 untuk menyesuaikan skala
            totalScore += (score / 1.5);
          } else {
            totalScore += score;
          }

          count++;
        }
      });

      return count > 0 ? totalScore / count : 0;
    });

    return nrrValues;
  };

  // Hitung total dan tampilkan dalam format sesuai yang diminta
  const calculateTotal = (nrrTertimbangValues: number[]) => {
    const total = nrrTertimbangValues.reduce((sum: number, value: number) => sum + value, 0);
    return total;
  };

  // Hitung nilai IKM setelah konversi (total NRR tertimbang × 25)
  const calculateIKMAfterConversion = (total: number) => {
    return total * 25;
  };

  // Bobot per unsur (1 dibagi jumlah pertanyaan)
  const getWeightPerQuestion = () => {
    if (!questionIds || questionIds.length === 0) return 0.111; // Default value if no questions
    return Number((1 / questionIds.length).toFixed(3));
  };

  // Hitung NRR Tertimbang (NRR per unsur × bobot per unsur) dengan bobot dari parameter
  const calculateNRRTertimbangWithWeight = (nrrValues: number[], weight: number) => {
    return nrrValues.map((value: number) => value * weight);
  };

  // Tentukan kategori kualitas layanan berdasarkan nilai IKM
  const getServiceCategory = (ikmValue: number) => {
    if (ikmValue <= 43.75) return { category: 'D', description: 'Tidak Baik' };
    if (ikmValue <= 62.50) return { category: 'C', description: 'Kurang Baik' };
    if (ikmValue <= 81.25) return { category: 'B', description: 'Baik' };
    return { category: 'A', description: 'Sangat Baik' };
  };

  // Nilai NRR Per Unsur dan NRR Tertimbang
  const columnSums = calculateColumnSums();
  const averagePerColumn = calculateAveragePerColumn();
  const nrrPerUnsur = calculateNRRPerUnsur();
  const weightPerQuestion = getWeightPerQuestion();
  const nrrTertimbang = calculateNRRTertimbangWithWeight(nrrPerUnsur, weightPerQuestion);
  const totalNRRTertimbang = calculateTotal(nrrTertimbang);
  const ikmAfterConversion = calculateIKMAfterConversion(totalNRRTertimbang);
  const serviceCategory = getServiceCategory(ikmAfterConversion);

  const selectedPeriod: SurveyPeriod = {
    year: new Date().getFullYear(),
    ...(new Date().getMonth() >= 3 && new Date().getMonth() <= 6 ? { quarter: 1 } : undefined),
    ...(new Date().getMonth() >= 7 && new Date().getMonth() <= 9 ? { quarter: 2 } : undefined),
    ...(new Date().getMonth() >= 10 ? { quarter: 3 } : undefined),
    ...(new Date().getMonth() >= 1 && new Date().getMonth() <= 6 ? { semester: 1 } : undefined),
    ...(new Date().getMonth() >= 7 && new Date().getMonth() <= 12 ? { semester: 2 } : undefined)
  };

  // Helper untuk mendapatkan periode dari tanggal
  const getPeriodFromDate = (date: Date): SurveyPeriod => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12

    // Tentukan quarter
    let quarterNum = 1;
    if (month >= 4 && month <= 6) quarterNum = 2;
    else if (month >= 7 && month <= 9) quarterNum = 3;
    else if (month >= 10) quarterNum = 4;

    // Tentukan semester
    const semesterNum = month <= 6 ? 1 : 2;

      return {
      year,
      quarter: quarterNum,
      semester: semesterNum
    };
  };

  // Helper untuk mengubah periode menjadi rentang tanggal
  const getDateRangeFromPeriod = ({ type, value, year }: PeriodParams): DateRange => {
    let startDate = new Date(year, 0, 1);
    let endDate = new Date(year, 11, 31);

    if (type === 'quarter' && value) {
      const quarter = parseInt(value.replace('Q', ''));
      startDate = new Date(year, (quarter - 1) * 3, 1);
      endDate = new Date(year, quarter * 3, 0);
    } else if (type === 'semester' && value) {
      const semester = parseInt(value.replace('S', ''));
      startDate = new Date(year, (semester - 1) * 6, 1);
      endDate = new Date(year, semester * 6, 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Fungsi untuk menghitung nilai agregasi berdasarkan responses dan indicator
  const calculateIndicatorValue = (responses: SurveyResponse[], indicator: IndicatorData, isWeighted: boolean): number => {
    if (!responses || responses.length === 0 || !indicator.questionDetails || indicator.questionDetails.length === 0) {
      return 0;
    }

    const questionsIds = indicator.questionDetails.map(q => q.id);
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalScore = 0;
    let totalResponses = 0;

    // Untuk survei berbobot, gunakan rata-rata tertimbang
    if (isWeighted) {
      // Kalkulasi skor berbobot untuk setiap pertanyaan
      indicator.questionDetails.forEach(question => {
        const questionWeight = question.weight;
        let questionScoreSum = 0;
        let responseCount = 0;

        // Hitung total skor untuk pertanyaan ini
        responses.forEach(response => {
          if (response.answers && response.answers[question.id]) {
            questionScoreSum += response.answers[question.id];
            responseCount++;
          }
        });

        // Hitung skor rata-rata pertanyaan
        const averageQuestionScore = responseCount > 0 ? questionScoreSum / responseCount : 0;

        // Tambahkan ke total berbobot
        totalWeightedScore += averageQuestionScore * questionWeight;
        totalWeight += questionWeight;
      });

      // Formula untuk survei berbobot: Σ(Rata-rata Skor Pertanyaan × Bobot) / Total Bobot
      return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    }
    // Untuk survei tidak berbobot, gunakan formula S / (n × p)
    else {
      // Jumlah responden (n)
      const respondentCount = responses.length;

      // Jumlah pertanyaan (p)
      const questionCount = indicator.questionDetails.length;

      // Total skor dari semua pertanyaan dan semua responden (S)
      responses.forEach(response => {
        if (response.answers) {
          questionsIds.forEach(qId => {
            if (response.answers[qId]) {
              totalScore += response.answers[qId];
              totalResponses++;
            }
          });
        }
      });

      // Formula untuk survei tidak berbobot: S / (n × p)
      // Jika tidak semua responden menjawab semua pertanyaan, gunakan totalResponses
      return (respondentCount * questionCount) > 0 ? totalScore / (respondentCount * questionCount) : 0;
    }
  };

  // Fungsi untuk menghasilkan nilai agregasi berdasarkan periode
  const calculateAggregationValue = (period: SurveyPeriod): number => {
    // Gunakan nilai dari result langsung, bukan dari responses
    if (!result || !result.indicatorsData) return 0;

    // Hitung jumlah responden (n)
    const respondentCount = result.totalRespondents || 0;

    // Hitung jumlah pertanyaan (b)
    const questionCount = result.indicatorsData.reduce((sum, indicator) => {
      return sum + (indicator.questionDetails?.length || 0);
    }, 0);

    // Buat array sederhana untuk skor
    const allScores: number[] = [];

    // Ambil semua skor dari semua pertanyaan
    result.indicatorsData.forEach(indicator => {
      indicator.questionDetails?.forEach(question => {
        if (question.averageScore) {
          allScores.push(question.averageScore);
        }
      });
    });

    // Hitung jumlah skor (S)
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);

    // Jika tidak ada responden atau pertanyaan, kembalikan 0
    if (respondentCount === 0 || questionCount === 0) return 0;

    // Rumus: S / (n × p)
    const aggregationValue = totalScore / (questionCount);

    // Batasi ke nilai maksimal 5
    return Math.min(5, Math.max(0, aggregationValue));
  };

  // Hitung jumlah responden yang bervariasi berdasarkan periode
  const calculateRespondentsForPeriod = (period?: SurveyPeriod): number => {
    // Gunakan nilai real dari survey result
    const count = result?.totalRespondents || 0;
    return isNaN(count) ? 0 : count;
  };

  // Fungsi untuk menghitung skala indeks dari skor 1-6 menjadi skala 1-4
  const calculateIndexScale = (score: number) => {
    if (isNaN(score)) return 1;
    // Konversi dari skala 1-6 ke skala indeks 1-4
    return Number(((score - 1) / 5 * 3 + 1).toFixed(2));
  };

  // Kalkulasi indeks dengan menggunakan data real
  const calculateIndexWithPeriod = (period?: SurveyPeriod): number => {
    if (!result) return 0;

    // Gunakan nilai real dari survey result
    const baseScore = isNaN(result.averageScore) ? 0 : result.averageScore || 0;

    // Konversi ke indeks
    return calculateIndexScale(baseScore);
  };

  // Gunakan data asli untuk pengaksesan properti objek
  // getFilteredResults() hanya digunakan untuk perhitungan aggregate
  const respondentCount = result?.totalRespondents || calculateRespondentsForPeriod();
  const indexValue = result?.reportData?.scoreIndex || calculateIndexWithPeriod();

  // Fungsi untuk menghitung skor IKM agregat dari indikator
  const calculateIKMFromIndicators = (): { score: number; indicatorName: string } => {
    // Jika tidak ada data indikator, gunakan nilai default dari indexValue
    if (!result?.indicatorsData || !Array.isArray(result.indicatorsData) || result.indicatorsData.length === 0) {
      return { score: convertToIKMScale(indexValue), indicatorName: "Tidak ada indikator" };
    }

    // Cari indikator "Kualitas Layanan"
    const kualitasLayananIndicator = result.indicatorsData.find(
      (indicator: IndicatorData) => indicator.indicatorTitle === "Kualitas Layanan"
    );

    if (kualitasLayananIndicator) {
      const indicatorScore = isNaN(kualitasLayananIndicator.score) ? 0 : kualitasLayananIndicator.score;
      return {
        score: convertToIKMScale(indicatorScore),
        indicatorName: kualitasLayananIndicator.indicatorTitle ?? "Kualitas Layanan"
      };
    }

    // Jika tidak ditemukan indikator "Kualitas Layanan", gunakan indikator pertama
    const firstIndicator = result.indicatorsData[0];
    const firstIndicatorScore = isNaN(firstIndicator.score) ? 0 : firstIndicator.score;
    return {
      score: convertToIKMScale(firstIndicatorScore),
      indicatorName: firstIndicator.indicatorTitle ?? "Indikator Utama"
    };
  };

  // Hitung skor IKM dari indikator
  const { score: ikmScore, indicatorName } = calculateIKMFromIndicators();

  // Memperbaiki CustomTooltip untuk tooltip grafik
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      let periodDetail = "";

      if (data.periodQuarter) {
        const quarterMap: Record<number, string> = {
          1: "Januari - Maret",
          2: "April - Juni",
          3: "Juli - September",
          4: "Oktober - Desember",
        };
        periodDetail = `Triwulan ${data.periodQuarter} (${
          quarterMap[data.periodQuarter]
        })`;
      } else if (data.periodSemester) {
        const semesterMap: Record<number, string> = {
          1: "Januari - Juni",
          2: "Juli - Desember",
        };
        periodDetail = `Semester ${data.periodSemester} (${
          semesterMap[data.periodSemester]
        })`;
      }

      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{`Periode: ${label}`}</p>
          {periodDetail && <p className="text-sm text-gray-600">{periodDetail}</p>}
          <p className="text-sm text-gray-600">{`Tahun: ${data.periodYear}`}</p>
          <p className="font-medium text-blue-600">{`Skor: ${data.score.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Fungsi untuk menghasilkan data matriks WSM (Weighted Scoring Model)
  const renderWSMMatrixTable = () => {
    if (!result || !result.indicatorsData) return null;

    // Fungsi untuk render tabel survei berbobot
    const renderWeightedSurveyTable = () => {
      // Buat kolom untuk tabel WSM
      const columns: WSMColumn[] = [
        { id: 'indicator', header: 'Indikator' }
      ];

      // Tambahkan kolom untuk setiap pertanyaan
      const allQuestionDetails: QuestionDetail[] = [];
      result.indicatorsData.forEach(indicator => {
        if (indicator.questionDetails) {
          indicator.questionDetails.forEach(question => {
            allQuestionDetails.push(question);
            columns.push({
              id: question.id,
              header: `Q${allQuestionDetails.length}`,
              tooltip: question.text,
              weight: question.weight || 1
            });
          });
        }
      });

      // Tambahkan kolom "Rata-rata" di akhir
      columns.push({ id: 'average', header: 'Rata-rata' });

      return (
        <div className="overflow-x-auto mt-6">
          <h3 className="text-xl font-bold mb-3">Matrix Weighted Scoring Model</h3>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {columns.map(column => (
                    <th
                      key={column.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.id === 'indicator' ? 'sticky left-0 bg-gray-50 z-10' : ''
                      }`}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
                {/* Tambahkan baris untuk bobot pada survei berbobot */}
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-100 z-10">
                    Bobot
                  </th>
                  {columns.slice(1).map(column => (
                    <th
                      key={`weight-${column.id}`}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {isQuestionColumn(column) ? `${column.weight}%` : '-'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.indicatorsData.map((indicator, i) => {
                  // Hitung skor rata-rata untuk indikator ini
                  const indicatorAvgScore = calculateIndicatorValue([], indicator, true);

                  return (
                    <tr key={indicator.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        {indicator.name || indicator.indicatorTitle}
                      </td>
                      {columns.slice(1, -1).map(column => {
                        const question = indicator.questionDetails?.find(q => q.id === column.id);
                        const score = question ? convertToIKMScale(question.averageScore) : '-';

                        return (
                          <td key={`${indicator.id}-${column.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {score !== '-' ? score.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {convertToIKMScale(indicatorAvgScore).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Tambahkan baris untuk rata-rata keseluruhan */}
                <tr className="bg-blue-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-blue-50 z-10">
                    Indeks Kepuasan Total
                  </td>
                  {columns.slice(1, -1).map(column => {
                    const questionId = column.id;
                    let totalScore = 0;
                    let count = 0;

                    // Hitung rata-rata untuk kolom ini di semua indikator
                    result.indicatorsData.forEach(indicator => {
                      const question = indicator.questionDetails?.find(q => q.id === questionId);
                      if (question) {
                        totalScore += question.averageScore;
                        count++;
                      }
                    });

                    const avgScore = count > 0 ? totalScore / count : 0;

                    return (
                      <td key={`total-${column.id}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {count > 0 ? convertToIKMScale(avgScore).toFixed(2) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {convertToIKMScale(result.reportData.aggregationValue).toFixed(2)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={columns.length} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold">Detail Perhitungan Indeks Kepuasan:</h4>
                        <div className="mt-2">
                          <p><span className="font-medium">Jumlah Responden (n):</span> {result.reportData.respondentCount || 0}</p>
                          <p><span className="font-medium">Jumlah Pertanyaan (p):</span> {allQuestionDetails.length}</p>
                          <p><span className="font-medium">Total Skor (S):</span> {3.5}</p>
                          <p><span className="font-medium">Indeks Kepuasan:</span> {convertToIKMScale(result.reportData.aggregationValue).toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">Keterangan:</h4>
                        <div className="mt-2">
                          <p>Untuk survei <strong>berbobot</strong>:</p>
                          <p>• Nilai indikator dihitung dari rata-rata berbobot pertanyaan</p>
                          <p>• Indeks kepuasan total dihitung dari rata-rata berbobot indikator</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      );
    };

    // Fungsi untuk render tabel survei tidak berbobot
    const renderUnweightedSurveyTable = () => {
      // Buat kolom untuk tabel
      const columns: WSMColumn[] = [
        { id: 'indicator', header: 'Indikator' }
      ];

      // Tambahkan kolom untuk setiap pertanyaan
      const allQuestionDetails: QuestionDetail[] = [];
      result.indicatorsData.forEach(indicator => {
        if (indicator.questionDetails) {
          indicator.questionDetails.forEach(question => {
            allQuestionDetails.push(question);
            columns.push({
              id: question.id,
              header: `Q${allQuestionDetails.length}`,
              tooltip: question.text,
              weight: 1 // semua pertanyaan memiliki bobot sama
            });
          });
        }
      });

      // Tambahkan kolom "Rata-rata" di akhir
      columns.push({ id: 'average', header: 'Rata-rata' });

    return (
      <div className="overflow-x-auto mt-6">
          <h3 className="text-xl font-bold mb-3">Matrix Skor Survey</h3>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
          <thead>
                <tr className="bg-gray-50">
              {columns.map(column => (
                <th
                  key={column.id}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        column.id === 'indicator' ? 'sticky left-0 bg-gray-50 z-10' : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.indicatorsData.map((indicator, i) => {
                  // Hitung skor rata-rata untuk indikator ini berdasarkan formula S/(n×p)
                  const indicatorAvgScore = calculateIndicatorValue([], indicator, false);

                  return (
                    <tr key={indicator.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}>
                        {indicator.name || indicator.indicatorTitle}
                  </td>
                      {columns.slice(1, -1).map(column => {
                        const question = indicator.questionDetails?.find(q => q.id === column.id);
                        const score = question ? convertToIKMScale(question.averageScore) : '-';

                        return (
                          <td key={`${indicator.id}-${column.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {score !== '-' ? score.toFixed(2) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {convertToIKMScale(indicatorAvgScore).toFixed(2)}
                      </td>
              </tr>
                  );
                })}
                {/* Tambahkan baris untuk rata-rata keseluruhan */}
                <tr className="bg-blue-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-blue-50 z-10">
                    Indeks Kepuasan Total
                </td>
                  {columns.slice(1, -1).map(column => {
                    const questionId = column.id;
                    let totalScore = 0;
                    let count = 0;

                    // Hitung rata-rata untuk kolom ini di semua indikator
                    result.indicatorsData.forEach(indicator => {
                      const question = indicator.questionDetails?.find(q => q.id === questionId);
                      if (question) {
                        totalScore += question.averageScore;
                        count++;
                      }
                    });

                    const avgScore = count > 0 ? totalScore / count : 0;

                    return (
                      <td key={`total-${column.id}`} className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {count > 0 ? convertToIKMScale(avgScore).toFixed(2) : '-'}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {convertToIKMScale(result.reportData.aggregationValue).toFixed(2)}
                  </td>
            </tr>
          </tbody>
          <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={columns.length} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold">Detail Perhitungan Indeks Kepuasan:</h4>
                        <div className="mt-2">
                          <p><span className="font-medium">Jumlah Responden (n):</span> {result.reportData.respondentCount || 0}</p>
                          <p><span className="font-medium">Jumlah Pertanyaan (p):</span> {allQuestionDetails.length}</p>
                          <p><span className="font-medium">Total Skor (S):</span> {3.5}</p>
                          <p>
                            <span className="font-medium">Formula:</span> S / (n × p) = {3.5} / ({result.reportData.respondentCount || 0} × {allQuestionDetails.length})
                          </p>
                          <p><span className="font-medium">Indeks Kepuasan:</span> {convertToIKMScale(result.reportData.aggregationValue).toFixed(2)}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">Keterangan:</h4>
                        <div className="mt-2">
                          <p>Untuk survei <strong>tidak berbobot</strong>:</p>
                          <p>• Skor dihitung dengan formula S / (n × p) dimana:</p>
                          <p>• S = Total skor dari semua responden</p>
                          <p>• n = Jumlah responden</p>
                          <p>• p = Jumlah pertanyaan</p>
                        </div>
                      </div>
                    </div>
              </td>
            </tr>
          </tfoot>
        </table>
          </div>
      </div>
    );
    };

    // Render tabel berdasarkan jenis survei
    return result.isWeighted ? renderWeightedSurveyTable() : renderUnweightedSurveyTable();
  };

  // Function untuk menghitung total skor - pindahkan keluar dari renderWSMMatrixTable
  const calculateTotalScoreLocal = () => {
    // Ganti cara akses ke data indikator
    const indicatorScores = result.indicatorsData.map(indicator => {
      return {
        score: indicator.score || 0,
        weight: indicator.weight || 0
      };
    });

    let totalScore = 0;

    // Hitung skor total berdasarkan bobot masing-masing indikator
    indicatorScores.forEach(ind => {
      if (result.isWeighted) {
        // Untuk survey bertimbang, kalikan skor dengan bobot
        totalScore += ind.score * (ind.weight / 100);
      } else {
        // Untuk survey tidak bertimbang, pakai rata-rata biasa
        totalScore += ind.score;
      }
    });

    // Bagi dengan jumlah indikator jika tidak bertimbang
    if (!result.isWeighted && indicatorScores.length > 0) {
      totalScore = totalScore / indicatorScores.length;
    }

    return Math.min(6, Math.max(0, totalScore));
  };

  const transformDataForBarChart = (data: SurveyResult) => {
    return data.indicatorsData.map((indicator) => ({
      name: indicator.name.length > 20 ? indicator.name.substring(0, 20) + "..." : indicator.name,
      score: indicator.score,
      fullName: indicator.name,
    }));
  };

  // Memperbaiki bagian render periode di tampilan
  const renderPeriodInfo = () => {
    let quarterText = '';
    let semesterText = '';

    // Pastikan aman untuk dirender
    if (selectedPeriod.quarter) {
      quarterText = `Triwulan ${selectedPeriod.quarter}`;
    }

    if (selectedPeriod.semester) {
      semesterText = `Semester ${selectedPeriod.semester}`;
    }

    let displayText = 'Tahun ';

    if (selectedPeriod.quarter) {
      displayText = quarterText;
    } else if (selectedPeriod.semester) {
      displayText = semesterText;
    } else {
      displayText = 'Tahun ';
    }

    return (
      <span className="text-primary ml-1">
        {displayText} {selectedPeriod.year}
      </span>
    );
  };

  // Ambil sedikit warna dari periode untuk styling
  const getPeriodeColor = () => {
    // Gunakan periode sebagai seed warna
    const colorSeed = (Array.from(selectedPeriod.year.toString()).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360);

    switch(selectedPeriod.quarter ? selectedPeriod.quarter : selectedPeriod.semester ? selectedPeriod.semester : selectedPeriod.year) {
      case 1:
        return `hsl(${colorSeed}, 70%, 45%)`; // Warna untuk triwulan
      case 2:
        return `hsl(${(colorSeed + 120) % 360}, 70%, 45%)`; // Warna untuk semester
      case 3:
        return `hsl(${(colorSeed + 240) % 360}, 70%, 45%)`; // Warna untuk tahunan
      default:
        return `hsl(${colorSeed}, 70%, 45%)`;
    }
  };

  const periodeColor = getPeriodeColor();

  // Fungsi untuk mendapatkan warna berdasarkan skor tertimbang
  const getWeightedScoreColor = (score: number): string => {
    if (score >= 5) return 'text-green-600';
    if (score >= 4) return 'text-green-500';
    if (score >= 3) return 'text-yellow-500';
    if (score >= 2) return 'text-orange-500';
    return 'text-red-500';
  };

  // Fungsi untuk mendapatkan warna berdasarkan skor total
  const getTotalScoreColor = (score: number): string => {
    if (score >= 5) return 'text-green-600';
    if (score >= 4) return 'text-green-500';
    if (score >= 3) return 'text-yellow-500';
    if (score >= 2) return 'text-orange-500';
    return 'text-red-500';
  };

  // Fungsi untuk menentukan kategori mutu berdasarkan nilai rata-rata
  const getMutuCategory = (value: number): { category: string; color: string } => {
    if (value >= 3.53 && value <= 4) return { category: 'Sangat Baik', color: 'bg-green-200' };
    if (value >= 3.07 && value < 3.53) return { category: 'Baik', color: 'bg-green-100' };
    if (value >= 2.60 && value < 3.07) return { category: 'Kurang Baik', color: 'bg-yellow-100' };
    return { category: 'Tidak Baik', color: 'bg-red-100' };
  };

  // Fungsi untuk mendapatkan kategori layanan berdasarkan nilai konversi indeks
  const getServiceCategoryForIndicator = (indicator: {
    indicatorId: string;
    indicatorName: string;
    questionIds: string[];
    questionTexts: Record<string, string>;
  }): string => {
    // Hitung bobot per pertanyaan untuk indikator ini
    const weightPerQ = indicator.questionIds.length > 0 ? 1 / indicator.questionIds.length : 0;

    // Hitung total indeks
    const totalIndex = indicator.questionIds.reduce((total: number, qId: string): number => {
      const questionIndex = questionIds.indexOf(qId);
      const avgValue = questionIndex !== -1 ? (averagePerColumn[questionIndex] || 0) : 0;
      return total + (avgValue * weightPerQ);
    }, 0);

    // Konversi indeks: indeks dikali 25
    const convertedIndex = totalIndex * 25;

    // Tentukan kategori berdasarkan nilai konversi
    if (convertedIndex <= 43.75) return "D (Tidak Baik)";
    if (convertedIndex <= 62.50) return "C (Kurang Baik)";
    if (convertedIndex <= 81.25) return "B (Baik)";
    return "A (Sangat Baik)";
  };

  // Fungsi untuk merender tabel matrix per indikator
  const renderMatrixTableByIndicator = (indicatorId: string) => {
    const indicator = questionsByIndicator[indicatorId];
    if (!indicator || !indicator.questionIds.length) return null;

    // Hitung bobot per pertanyaan untuk indikator ini
    const weightPerQuestion = 1 / indicator.questionIds.length;

    // Fungsi untuk mendapatkan rata-rata nilai per pertanyaan untuk indikator ini
    const getAverageForQuestion = (questionId: string) => {
      const questionIndex = questionIds.indexOf(questionId);
      if (questionIndex === -1) return 0;

      return averagePerColumn[questionIndex] || 0;
    };

    // Fungsi untuk mendapatkan tipe pertanyaan (likert-4 atau likert-6)
    const getQuestionType = (questionId: string) => {
      return questionTypes[questionId] || 'likert-4';
    };

    return (
      <div className="overflow-x-auto mt-8 mb-8">
        <h3 className="text-xl font-bold mb-3 text-center bg-blue-50 py-2 rounded-lg border border-blue-200">
          {indicator.indicatorName}
        </h3>
        <div className="rounded-md border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Responden
                </th>
                {/* Kolom untuk setiap pertanyaan dalam indikator ini */}
                {indicator.questionIds.map((qId, i) => (
                  <th
                    key={`ind-${indicatorId}-q-${qId}`}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    title={indicator.questionTexts[qId]}
                  >
                    U{i+1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Data responden dari database */}
              {respondentsData.map((respondent, i) => {
                return (
                  <tr key={`resp-${indicatorId}-${respondent.id}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}>
                      {respondent.name || `Responden ${i+1}`}
                    </td>
                    {indicator.questionIds.map((qId) => {
                      const questionIndex = questionIds.indexOf(qId);
                      const score = questionIndex !== -1 ? respondent.answers[questionIndex] : 0;

                      return (
                        <td
                          key={`resp-${indicatorId}-${respondent.id}-q-${qId}`}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                        >
                          {score}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Baris untuk rata-rata nilai per kolom */}
              <tr className="bg-yellow-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-yellow-50 z-10">
                  Nilai Rata-Rata per unsur
                </td>
                {indicator.questionIds.map((qId) => {
                  const avgValue = getAverageForQuestion(qId);
                  const isLikert6 = getQuestionType(qId).includes('likert-6');

                  return (
                    <td
                      key={`avg-${indicatorId}-${qId}`}
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-center ${isLikert6 ? 'bg-yellow-100' : ''}`}
                      title={isLikert6 ? "Nilai sudah disesuaikan (dibagi 1.5 untuk skala likert-6)" : ""}
                    >
                      {avgValue.toFixed(2)} {isLikert6 && <sup>*</sup>}
                    </td>
                  );
                })}
              </tr>

              {/* Baris untuk bobot per unsur */}
              <tr className="bg-orange-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-orange-50 z-10">
                  Bobot Nilai per unsur
                </td>
                {indicator.questionIds.map((qId) => (
                  <td
                    key={`weight-${indicatorId}-${qId}`}
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center"
                  >
                    {weightPerQuestion.toFixed(3)}
                  </td>
                ))}
              </tr>

              {/* Baris untuk Mutu Per unsur/Kinerja */}
              <tr className="bg-purple-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-purple-50 z-10">
                  Mutu Per unsur/Kinerja
                </td>
                {indicator.questionIds.map((qId) => {
                  const avgValue = getAverageForQuestion(qId);
                  const mutuCategory = getMutuCategory(avgValue);

                  return (
                    <td
                      key={`mutu-${indicatorId}-${qId}`}
                      className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-center ${mutuCategory.color}`}
                    >
                      {mutuCategory.category}
                    </td>
                  );
                })}
              </tr>

              {/* Baris untuk Nilai Rata-Rata per unsur x Bobot Nilai */}
              <tr className="bg-amber-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-amber-50 z-10">
                  Nilai Rata-Rata per unsur x Bobot Nilai
                </td>
                {indicator.questionIds.map((qId) => {
                  const avgValue = getAverageForQuestion(qId);

                  return (
                    <td
                      key={`avg-weight-${indicatorId}-${qId}`}
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center"
                    >
                      {(avgValue * weightPerQuestion).toFixed(3)}
                    </td>
                  );
                })}
              </tr>

              {/* Baris baru untuk Indeks Indikator */}
              <tr className="bg-blue-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-blue-200 z-10">
                  Indeks {indicator.indicatorName}
                </td>
                <td
                  colSpan={indicator.questionIds.length}
                  className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center"
                >
                  {(() => {
                    // Hitung jumlah semua nilai rata-rata per unsur x bobot nilai
                    const totalIndex = indicator.questionIds.reduce((total, qId) => {
                      const avgValue = getAverageForQuestion(qId);
                      return total + (avgValue * weightPerQuestion);
                    }, 0);

                    return totalIndex.toFixed(3);
                  })()}
                </td>
              </tr>

              {/* Baris baru untuk Nilai Konversi Indeks */}
              <tr className="bg-green-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-green-200 z-10">
                  Nilai Konversi Indeks
                </td>
                <td
                  colSpan={indicator.questionIds.length}
                  className="px-6 py-4 whitespace-nowrap text-md font-bold text-center"
                >
                  {(() => {
                    // Hitung jumlah semua nilai rata-rata per unsur x bobot nilai
                    const totalIndex = indicator.questionIds.reduce((total, qId) => {
                      const avgValue = getAverageForQuestion(qId);
                      return total + (avgValue * weightPerQuestion);
                    }, 0);

                    // Konversi indeks: indeks dikali 25
                    const convertedIndex = totalIndex * 25;

                    // Kategori layanan berdasarkan nilai konversi
                    let category = "";
                    if (convertedIndex <= 43.75) category = "D (Tidak Baik)";
                    else if (convertedIndex <= 62.50) category = "C (Kurang Baik)";
                    else if (convertedIndex <= 81.25) category = "B (Baik)";
                    else category = "A (Sangat Baik)";

                    // Tampilkan nilai konversi dan kategori
                    return `${convertedIndex.toFixed(2)}`;
                  })()}
                </td>
              </tr>

              {/* Baris baru untuk Mutu Pelayanan */}
              <tr className="bg-indigo-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 bg-indigo-100 z-10">
                  Mutu Pelayanan
                </td>
                <td
                  colSpan={indicator.questionIds.length}
                  className="px-6 py-4 whitespace-nowrap text-md font-bold text-center"
                >
                  {(() => {
                    // Hitung jumlah semua nilai rata-rata per unsur x bobot nilai
                    const totalIndex = indicator.questionIds.reduce((total, qId) => {
                      const avgValue = getAverageForQuestion(qId);
                      return total + (avgValue * weightPerQuestion);
                    }, 0);

                    // Konversi indeks: indeks dikali 25
                    const convertedIndex = totalIndex * 25;

                    // Kategori layanan berdasarkan nilai konversi
                    let category = "";
                    let bgColor = "";

                    if (convertedIndex <= 43.75) {
                      category = "D (Tidak Baik)";
                      bgColor = "bg-red-100";
                    } else if (convertedIndex <= 62.50) {
                      category = "C (Kurang Baik)";
                      bgColor = "bg-yellow-100";
                    } else if (convertedIndex <= 81.25) {
                      category = "B (Baik)";
                      bgColor = "bg-green-100";
                    } else {
                      category = "A (Sangat Baik)";
                      bgColor = "bg-green-200";
                    }

                    // Tampilkan kategori mutu dengan latar belakang warna yang sesuai
                    return (
                      <span className={`px-3 py-1 rounded ${bgColor}`}>
                        {category}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-gray-100">
                <td colSpan={indicator.questionIds.length + 1} className="px-6 py-4">
                  <div className="mt-2">
                    <p className="font-medium text-gray-700">Detail Perhitungan untuk {indicator.indicatorName}:</p>
                    <p className="mt-1 text-sm"><span className="font-medium">Jumlah Pertanyaan:</span> {indicator.questionIds.length}</p>
                    <p className="text-sm"><span className="font-medium">Bobot per Pertanyaan:</span> 1/{indicator.questionIds.length} = {weightPerQuestion.toFixed(3)}</p>
                    <p className="text-sm"><span className="font-medium">Indeks {indicator.indicatorName}:</span> Jumlah dari semua nilai "Nilai Rata-Rata per unsur x Bobot Nilai" = {
                      indicator.questionIds.reduce((total, qId) => {
                        const avgValue = getAverageForQuestion(qId);
                        return total + (avgValue * weightPerQuestion);
                      }, 0).toFixed(3)
                    }</p>
                    <p className="text-sm"><span className="font-medium">Nilai Konversi Indeks:</span> Indeks {indicator.indicatorName} dikali 25 = {
                      (() => {
                        const totalIndex = indicator.questionIds.reduce((total, qId) => {
                          const avgValue = getAverageForQuestion(qId);
                          return total + (avgValue * weightPerQuestion);
                        }, 0);
                        const convertedIndex = totalIndex * 25;
                        return `${convertedIndex.toFixed(2)}`;
                      })()
                    }</p>
                    {/* <p className="text-sm"><span className="font-medium">Mutu/Kinerja Pelayanan:</span> {
                      (() => {
                        const totalIndex = indicator.questionIds.reduce((total, qId) => {
                          const avgValue = getAverageForQuestion(qId);
                          return total + (avgValue * weightPerQuestion);
                        }, 0);
                        const convertedIndex = totalIndex * 25;

                        // Kategori mutu berdasarkan nilai konversi
                        let category = "";
                        let bgColor = "";

                        if (convertedIndex <= 43.75) {
                          category = "D (Tidak Baik)";
                          bgColor = "bg-red-100";
                        } else if (convertedIndex <= 62.50) {
                          category = "C (Kurang Baik)";
                          bgColor = "bg-yellow-100";
                        } else if (convertedIndex <= 81.25) {
                          category = "B (Baik)";
                          bgColor = "bg-green-100";
                        } else {
                          category = "A (Sangat Baik)";
                          bgColor = "bg-green-200";
                        }

                        return (
                          <span className={`px-2 py-1 rounded ${bgColor}`}>
                            {category}
                          </span>
                        );
                      })()
                    } (berdasarkan nilai konversi {
                      (() => {
                        const totalIndex = indicator.questionIds.reduce((total, qId) => {
                          const avgValue = getAverageForQuestion(qId);
                          return total + (avgValue * weightPerQuestion);
                        }, 0);
                        const convertedIndex = totalIndex * 25;
                        return convertedIndex.toFixed(2);
                      })()
                    })</p> */}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Catatan kaki untuk menjelaskan perhitungan
  const getFootnoteForAdjustedValues = () => {
    const likert6Columns = questionIds
      .map((id, index) => questionTypes[id]?.includes('likert-6') ? index + 1 : null)
      .filter(index => index !== null);

    if (likert6Columns.length === 0) return null;

    return (
      <p className="mt-2 text-sm">
        <span className="font-medium"><sup>*</sup> Catatan:</span> Nilai dari pertanyaan skala Likert-6
        (Unsur {likert6Columns.join(', ')}) telah disesuaikan dengan dibagi 1,5 untuk menyesuaikan skala
        ke skala 1-4 sesuai dengan pertanyaan likert-4. Sel dengan latar belakang berwarna menunjukkan
        nilai yang telah disesuaikan.
      </p>
    );
  };

  return (
    <div className="space-y-6">
      {/* Informasi Periode - Sekarang langsung di awal */}
      <div className="bg-muted/30 p-3 rounded-md">
        <h3 className="text-lg font-medium flex items-center">
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Ringkasan Hasil Survei {selectedPeriod.year}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Data menampilkan ringkasan hasil survei dari seluruh periode. Gunakan filter di bawah untuk melihat tren score dalam periode tertentu.
        </p>
      </div>

      {/* Kartu Ringkasan */}
      {/* <div className="grid grid-cols-1">
        <Card className="border-2" style={{ borderLeft: `4px solid ${periodeColor}` }}>
          <CardHeader className="pb-2">
            <CardDescription>Indeks Kepuasan</CardDescription>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{ikmScore.toFixed(2)}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{indicatorName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={ikmScore >= 3 ? "default" : ikmScore >= 2 ? "secondary" : "outline"} className="ml-2">
                  {ikmScore >= 3.25 ? 'Sangat Baik' :
                   ikmScore > 2.5 ? 'Baik' :
                   ikmScore > 1.75 ? 'Kurang Baik' : 'Tidak Baik'}
                </Badge>
                <Badge className="flex items-center" style={{ backgroundColor: periodeColor }}>
                  {respondentCount || 0} Responden
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm pb-2">Skala 1-4</div>
            <Progress
              value={!isNaN(ikmScore) ? ikmScore * 25 : 0}
              className="h-2"
              style={{ '--theme-primary': periodeColor } as React.CSSProperties}
            />
            <div className="text-xs text-muted-foreground mt-2">
              Indeks Kepuasan Masyarakat berdasarkan {result?.indicatorsData?.length || 0} indikator dari {respondentCount || 0} responden
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Matriks Nilai Survey (WSM) */}
      <Card className="shadow-lg border-2 border-primary/20" style={{ borderLeft: `4px solid ${periodeColor}` }}>
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Matriks Perhitungan Nilai Survey (WSM)</CardTitle>
              <CardDescription>
                Menggunakan metode Weighted Scoring Model untuk menghitung nilai tertimbang dari setiap responden
              </CardDescription>
            </div>
            <div className="text-xs px-2 py-1 rounded bg-muted-foreground/10" style={{ borderLeft: `2px solid ${periodeColor}` }}>
              Data Agregat Keseluruhan
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-2 text-sm">
            <div>
              <strong>Weighted Scoring Model (WSM)</strong> adalah metode pengambilan keputusan multi-kriteria yang memberikan
              bobot pada setiap kriteria evaluasi. Pada matriks ini:
            </div>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nilai asli adalah skor yang diberikan responden (skala 1-6).</li>
              <li>BP (Bobot Pertanyaan) menunjukkan tingkat kepentingan relatif dari pertanyaan tersebut.</li>
              <li>Nilai tertimbang adalah hasil perhitungan berdasarkan rumus di atas.</li>
            </ul>
          </div>

          <div className="py-2">
            {renderWSMMatrixTable()}
          </div>
        </CardContent>
      </Card>

      {/* Setelah bagian ini di bawah WSM Matrix Table */}
      <div className="mt-8">
        <Tabs defaultValue="wsm" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="wsm" className="flex-1">Matrix WSM</TabsTrigger>
            <TabsTrigger value="charts" className="flex-1">Grafik</TabsTrigger>
          </TabsList>

          <TabsContent value="wsm">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg justify-between">
                  <span>Weighted Scoring Model (WSM) - {selectedPeriod.year}</span>
                  <button
                    className="text-primary text-sm flex items-center gap-1"
                    onClick={() => fetchRespondentsData()}
                  >
                    <RefreshCcw size={16} />
                    <span>Refresh</span>
                  </button>
                </CardTitle>
                <CardDescription>
                  Menampilkan skor survei berdasarkan model pembobotan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Memuat data responden...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md my-4">
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchRespondentsData} className="mt-2">
                      Coba Lagi
                    </Button>
                  </div>
                ) : respondentsData.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md my-4">
                    <p>Tidak ada data responden dengan jawaban yang tersedia.</p>
                    <Button variant="outline" size="sm" onClick={fetchRespondentsData} className="mt-2">
                      Muat Ulang
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Tabel Matrix per indikator */}
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded shadow-sm mb-4">
                        <h2 className="text-2xl font-bold text-center">Matrix Nilai Pertanyaan Per Indikator</h2>
                        <p className="text-center text-gray-600 mt-2">Perhitungan matrix dibuat untuk masing-masing indikator dengan pertanyaan/unsur yang relevan</p>
                      </div>

                      {/* Tampilkan tabel matrix untuk setiap indikator */}
                      {Object.keys(questionsByIndicator).map(indicatorId => (
                        <div key={`indicator-matrix-${indicatorId}`}>
                          {renderMatrixTableByIndicator(indicatorId)}
                        </div>
                      ))}
                    </div>

                    {/* Tabel 2: NILAI INDEKS SETELAH KONVERSI */}
                    <div className="overflow-x-auto mt-8">
                      <h3 className="text-xl font-bold mb-3 text-center bg-green-50 py-2 rounded-lg border border-green-200">NILAI INDEKS SETELAH KONVERSI</h3>
                      <div className="rounded-md border shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nilai Persepsi
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nilai Interval (NI)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nilai Interval Konversi (NIK)
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Mutu Pelayanan
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Kinerja Pelayanan
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1,00 - 1,75</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">25,00 - 43,75</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">D</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Tidak Baik</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1,76 - 2,50</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">43,76 - 62,50</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">C</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Kurang Baik</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2,51 - 3,25</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">62,51 - 81,25</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">B</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Baik</td>
                            </tr>
                            <tr className="bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">4</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">3,26 - 4,00</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">81,26 - 100,00</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">A</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Sangat Baik</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* Tampilkan WSM Matrix jika data tersedia dan tidak sedang loading */}
                {!isLoading && !error && renderWSMMatrixTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Visualisasi Data Survei</CardTitle>
                <CardDescription>
                  Menampilkan distribusi jawaban responden per unsur berdasarkan skala likert
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Memuat data...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md my-4">
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchRespondentsData} className="mt-2">
                      Coba Lagi
                    </Button>
                  </div>
                ) : respondentsData.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md my-4">
                    <p>Tidak ada data responden dengan jawaban yang tersedia.</p>
                    <Button variant="outline" size="sm" onClick={fetchRespondentsData} className="mt-2">
                      Muat Ulang
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Tampilkan grafik untuk setiap unsur */}
                    {questionIds.map((qId, questionIndex) => {
                      // Ambil semua jawaban untuk pertanyaan ini
                      const questionType = questionTypes[qId] || 'likert-4';
                      const isLikert6 = questionType.includes('likert-6');
                      const maxScore = isLikert6 ? 6 : 4;

                      // Hitung distribusi jawaban
                      const distribution: Record<number, number> = {};
                      // Inisialisasi semua nilai dengan 0
                      for (let i = 1; i <= maxScore; i++) {
                        distribution[i] = 0;
                      }

                      // Hitung jumlah jawaban untuk setiap skor
                      respondentsData.forEach(respondent => {
                        const score = respondent.answers[questionIndex];
                        if (score >= 1 && score <= maxScore) {
                          distribution[score] = (distribution[score] || 0) + 1;
                        }
                      });

                      // Konversi ke format untuk recharts
                      const chartData = Object.keys(distribution).map(score => {
                        const numScore = parseInt(score);
                        return {
                          skor: isLikert6 ?
                            (numScore === 1 ? "1 - STM" :
                             numScore === 2 ? "2 - TM" :
                             numScore === 3 ? "3 - KM" :
                             numScore === 4 ? "4 - CM" :
                             numScore === 5 ? "5 - M" :
                             "6 - SM") :
                            (numScore === 1 ? "1 - STM" :
                             numScore === 2 ? "2 - TM" :
                             numScore === 3 ? "3 - CM" :
                             "4 - SM"),
                          jumlah: distribution[numScore],
                          skorAsli: numScore,
                        };
                      });

                      // Cari teks pertanyaan dari indikator
                      let questionText = `Unsur ${questionIndex + 1}`;
                      Object.values(questionsByIndicator).forEach(indicator => {
                        if (indicator.questionIds.includes(qId) && indicator.questionTexts[qId]) {
                          questionText = indicator.questionTexts[qId];
                        }
                      });

                      // Tentukan warna berdasarkan tipe likert
                      const barColors = isLikert6 ?
                        ['#fee2e2', '#fecaca', '#fca5a5', '#bfdbfe', '#93c5fd', '#60a5fa'] :
                        ['#fee2e2', '#fca5a5', '#93c5fd', '#60a5fa'];

                      return (
                        <div key={`chart-${qId}`} className="border rounded-lg shadow-sm p-4">
                          <h3 className="font-medium text-center mb-2">{questionText}</h3>
                          <p className="text-sm text-gray-500 text-center mb-4">
                            Distribusi Jawaban ({isLikert6 ? "Skala Likert-6" : "Skala Likert-4"})
                          </p>

                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="skor"
                                  angle={0}
                                  textAnchor="middle"
                                  height={60}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  label={{
                                    value: 'Jumlah Responden',
                                    angle: -90,
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle' }
                                  }}
                                />
                                <Tooltip
                                  formatter={(value, name, props) => [
                                    `${value} responden`, 'Jumlah'
                                  ]}
                                  labelFormatter={(label) => {
                                    const scorePart = label.split(" - ")[0];
                                    const textPart = label.split(" - ")[1];
                                    return `Skor ${scorePart}: ${
                                      textPart === "STM" ? "Sangat Tidak Memuaskan" :
                                      textPart === "TM" ? "Tidak Memuaskan" :
                                      textPart === "KM" ? "Kurang Memuaskan" :
                                      textPart === "CM" ? "Cukup Memuaskan" :
                                      textPart === "M" ? "Memuaskan" :
                                      "Sangat Memuaskan"
                                    }`;
                                  }}
                                />
                                <Legend />
                                <Bar
                                  dataKey="jumlah"
                                  name="Jumlah Responden"
                                  radius={[4, 4, 0, 0]}
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={barColors[entry.skorAsli - 1]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              Rata-rata: <span className="font-medium">{averagePerColumn[questionIndex]?.toFixed(2) || "0.00"}</span>
                            </span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              Total Responden: <span className="font-medium">{respondentsData.length}</span>
                            </span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              Kategori Mutu: <span className={`font-medium ${getMutuCategory(averagePerColumn[questionIndex] || 0).color.replace('bg-', 'text-')}`}>
                                {getMutuCategory(averagePerColumn[questionIndex] || 0).category}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Keterangan Skala Likert */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium mb-2">Keterangan Skala Likert:</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Skala Likert-4:</p>
                          <ul className="text-xs space-y-1">
                            <li><span className="inline-block w-3 h-3 bg-red-200 mr-1"></span> 1 = Sangat Tidak Memuaskan (STM)</li>
                            <li><span className="inline-block w-3 h-3 bg-red-300 mr-1"></span> 2 = Tidak Memuaskan (TM)</li>
                            <li><span className="inline-block w-3 h-3 bg-blue-200 mr-1"></span> 3 = Cukup Memuaskan (CM)</li>
                            <li><span className="inline-block w-3 h-3 bg-blue-400 mr-1"></span> 4 = Sangat Memuaskan (SM)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Skala Likert-6:</p>
                          <ul className="text-xs space-y-1">
                            <li><span className="inline-block w-3 h-3 bg-red-100 mr-1"></span> 1 = Sangat Tidak Memuaskan (STM)</li>
                            <li><span className="inline-block w-3 h-3 bg-red-200 mr-1"></span> 2 = Tidak Memuaskan (TM)</li>
                            <li><span className="inline-block w-3 h-3 bg-red-300 mr-1"></span> 3 = Kurang Memuaskan (KM)</li>
                            <li><span className="inline-block w-3 h-3 bg-blue-200 mr-1"></span> 4 = Cukup Memuaskan (CM)</li>
                            <li><span className="inline-block w-3 h-3 bg-blue-300 mr-1"></span> 5 = Memuaskan (M)</li>
                            <li><span className="inline-block w-3 h-3 bg-blue-400 mr-1"></span> 6 = Sangat Memuaskan (SM)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
