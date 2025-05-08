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
  Sector
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
      <div className="grid grid-cols-1">
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
      </div>

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
                    onClick={() => {}}
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
                {renderWSMMatrixTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Visualisasi Data Survei</CardTitle>
                <CardDescription>
                  Menampilkan grafik skor survei
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* ... existing charts content ... */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
