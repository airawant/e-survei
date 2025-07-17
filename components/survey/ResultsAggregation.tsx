"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Loader2, ListChecks, CheckSquare, BarChart3 as ChartBarIcon, Sigma } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { supabaseClient } from "@/lib/supabase/client"
// Import tipe yang diperlukan, tetapi rename untuk menghindari konflik
import {
  Survey as SurveyType,
  SurveyResult as SurveyResultType,
  WeightedScore,
  QuestionDetail
} from "@/lib/types"
import { Button } from "@/components/ui/button"

// Interface untuk distribusi jawaban
interface AnswerDistribution {
  score: number;
  count: number;
  percentage: number;
}

// Extend interface QuestionDetail untuk memastikan distribusi tersedia
interface QuestionDetailWithDistribution extends QuestionDetail {
  distribution?: AnswerDistribution[];
}

// Extend interface WeightedScore untuk memastikan distribusi tersedia pada questionDetails
interface WeightedScoreWithDistribution extends Omit<WeightedScore, 'questionDetails'> {
  questionDetails: QuestionDetailWithDistribution[];
}

// Interface untuk item data demografis
interface DemographicDataItem {
  fieldId: string;
  value: string | number | string[];
  fieldLabel?: string; // Label field opsional yang mungkin disertakan
}

interface ResultsAggregationProps {
  surveyId: string
  periodeSurvei?: string
}

interface SurveyResult {
  surveyId: string;
  surveyTitle?: string;
  totalResponses: number;
  averageScore: number;
  satisfactionIndex: number;
  indicatorScores: Array<{
    indicatorId: string;
    indicatorTitle: string;
    score: number;
    weight: number;
    weightedScore: number;
    questionDetails: Array<{
      questionId: string;
      questionText: string;
      averageScore: number;
      min: number;
      max: number;
      median: number;
      mode: number;
      stdDev: number;
      weight: number;
      responseCount: number;
      distribution?: Array<{
        score: number;
        count: number;
        percentage: number;
      }>;
    }>;
  }>;
  demographicBreakdown: Record<string, any>;
  crossTabulations: Record<string, any>;
  trendData: {
    available: boolean;
    previousScore: number;
    currentScore: number;
    trendPoints: Array<{
      date: Date;
      score: number;
    }>;
  };
  calculatedAt?: Date;
}

interface Survey {
  id: string;
  title: string;
  [key: string]: any;
}

interface ChartDataItem {
  name: string;
  score: number;
  fullName: string;
  fill: string;
}

interface DistributionItem {
  name: string;
  value: number;
  percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

// Definisi label skor yang lebih deskriptif
const SCORE_LABELS = [
  "Sangat Tidak Memuaskan",
  "Tidak Memuaskan",
  "Kurang Memuaskan",
  "Cukup Memuaskan",
  "Memuaskan",
  "Sangat Memuaskan"
];

// Fungsi untuk mendapatkan label berdasarkan skor
const getScoreLabel = (score: number): string => {
  if (score === undefined || score === null) return SCORE_LABELS[0];
  if (score >= 5.5) return SCORE_LABELS[5]
  if (score >= 4.5) return SCORE_LABELS[4]
  if (score >= 3.5) return SCORE_LABELS[3]
  if (score >= 2.5) return SCORE_LABELS[2]
  if (score >= 1.5) return SCORE_LABELS[1]
  return SCORE_LABELS[0]
}

// Fungsi untuk mendapatkan variant Badge berdasarkan skor
const getBadgeColor = (score: number): "destructive" | "secondary" | "default" | "outline" => {
  if (score === undefined || score === null) return "destructive";
  if (score < 2) return "destructive"
  if (score < 3) return "outline"
  if (score < 4.5) return "secondary"
  if (score < 5.5) return "default"
  return "default"
}

// Fungsi untuk mengkonversi skor menjadi indeks 0-100
const calculateIndexScale = (score: number): number => {
  // Mengkonversi skor 1-6 ke skala 0-100
  return Math.round(((score - 1) / 5) * 100);
}

// Fungsi untuk mendapatkan label demografis dari Supabase
const getDemographicFieldLabels = async (fieldIds: string[]): Promise<Record<string, string>> => {
  if (!fieldIds || fieldIds.length === 0) return {};

  try {
    // Ambil data field demografis berdasarkan ID
    const { data, error } = await supabaseClient
      .from('demographic_fields')
      .select('id, label')
      .in('id', fieldIds);

    if (error) {
      console.error("Error fetching demographic field labels:", error);
      return {};
    }

    // Buat mapping dari ID ke label
    const labelMap: Record<string, string> = {};
    if (data) {
      data.forEach(field => {
        if (field.id && field.label) {
          labelMap[field.id] = field.label;
        }
      });
    }

    console.log("Demographic field labels from database:", labelMap);
    return labelMap;
  } catch (err) {
    console.error("Error in getDemographicFieldLabels:", err);
    return {};
  }
}

export function ResultsAggregation({ surveyId, periodeSurvei }: ResultsAggregationProps) {
  const { surveyResults, getSurveyResults, loading, surveys, surveyResponses, getSurveyResponses } = useSurvey()
  const [activeTab, setActiveTab] = useState("all")
  const [overallDistribution, setOverallDistribution] = useState<{ score: number; count: number; percentage: number }[]>([])
  const [demographicData, setDemographicData] = useState<{[key: string]: { label: string, data: {name: string, value: number}[] }}>({})
  const [loadingDemographics, setLoadingDemographics] = useState(false)

  // Gunakan useEffect untuk mengambil data survei
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil data survey results tanpa parameter periode (karena getSurveyResults mungkin tidak menerima parameter kedua)
        await getSurveyResults(surveyId)
      } catch (error) {
        console.error("Error fetching survey results:", error)
        // Handle error state jika perlu
      }
    }

    fetchData()
  }, [surveyId, getSurveyResults])

  // Gunakan useEffect untuk mengambil respons survei jika belum ada
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        setLoadingDemographics(true)
        // Filter respons yang sudah ada untuk survei ini
        const existingResponses = surveyResponses.filter(r => r.surveyId === surveyId);

        // Jika belum ada respons untuk survei ini, ambil dari server
        if (existingResponses.length === 0) {
          console.log("Fetching survey responses for", surveyId);
          await getSurveyResponses(surveyId);
        } else {
          console.log("Using existing survey responses:", existingResponses.length);
        }
      } catch (error) {
        console.error("Error fetching survey responses:", error);
      } finally {
        setLoadingDemographics(false);
      }
    };

    fetchResponses();
  }, [surveyId, surveyResponses, getSurveyResponses]);

  // Temukan surveyResult yang sesuai dengan surveyId
  const surveyResult = useMemo(() => {
    return surveyResults.find(result => result.surveyId === surveyId) || null
  }, [surveyResults, surveyId])

  // Get current survey
  const currentSurvey = surveys.find((s) => s.id === surveyId)

  useEffect(() => {
    if (surveyResult && surveyResult.indicatorScores) {
      // Menghitung distribusi keseluruhan
      const distribution: { [key: number]: number } = {}

      // Inisialisasi distribusi untuk semua skor (1-6)
      for (let i = 1; i <= 6; i++) {
        distribution[i] = 0
      }

      let totalAnswers = 0

      // Agregasi distribusi dari semua indikator
      surveyResult.indicatorScores.forEach((indicator) => {
        indicator.questionDetails.forEach((question) => {
          // Pastikan distribution tersedia (tambahkan type assertion untuk mengatasi masalah tipe)
          const questionWithDist = question as QuestionDetailWithDistribution;
          if (questionWithDist.distribution) {
            questionWithDist.distribution.forEach((d) => {
              distribution[d.score] = (distribution[d.score] || 0) + d.count
              totalAnswers += d.count
            })
          }
        })
      })

      // Konversi objek distribusi ke array
      const distributionArray = Object.entries(distribution).map(([score, count]) => ({
        score: parseInt(score),
        count,
        percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0
      }))

      setOverallDistribution(distributionArray)
    }
  }, [surveyResult])

  // Fungsi untuk memproses data demografis
  useEffect(() => {
    const processData = async () => {
      if (surveyResponses && surveyResponses.length > 0) {
        // Log untuk debugging
        console.log("Processing demographic data");
        console.log("Total survey responses:", surveyResponses.length);
        console.log("Filter periode:", periodeSurvei);

        const surveyResponsesFiltered = surveyResponses.filter(
          (response) => response.surveyId === surveyId && response.isComplete
        );

        console.log("Filtered survey responses for this survey:", surveyResponsesFiltered.length);

        if (surveyResponsesFiltered.length === 0) {
          return;
        }

        // Filter berdasarkan periode_survei jika ada
        let periodFilteredResponses = surveyResponsesFiltered;
        if (periodeSurvei && periodeSurvei !== "") {
          console.log("Filtering by period:", periodeSurvei);
          console.log("Available periods in data:", [...new Set(surveyResponsesFiltered.map(r => r.periode_survei))]);

          periodFilteredResponses = surveyResponsesFiltered.filter(
            (response) => response.periode_survei === periodeSurvei
          );
          console.log("Responses filtered by period:", periodFilteredResponses.length);
        }

        if (periodFilteredResponses.length === 0) {
          console.log("No responses found for the selected period");
          setDemographicData({});
          return;
        }

        // Cek struktur data pada respons pertama
        if (periodFilteredResponses[0].demographicData) {
          console.log("Sample demographic data structure:", periodFilteredResponses[0].demographicData);
        }

        // Inisialisasi objek untuk menyimpan mapping fieldId ke label
        const demographicFieldLabels: Record<string, string> = {};

        // Jika currentSurvey memiliki demographicFields, gunakan untuk mendapatkan label
        const currentSurvey = surveys.find((s) => s.id === surveyId);

        // Cek apakah survey memiliki demographicFields
        if (currentSurvey && 'demographicFields' in currentSurvey) {
          console.log("Survey has demographic fields data");

          const fields = currentSurvey.demographicFields || [];

          // Buat mapping dari ID ke label
          fields.forEach((field: any) => {
            if (field && field.id && field.label) {
              demographicFieldLabels[field.id] = field.label;
              console.log(`Found field mapping: ${field.id} -> "${field.label}"`);
            }
          });
        }

        // Hitung distribusi untuk setiap field demografis
        const demographicBreakdown: Record<string, Record<string, number>> = {};

        // Kumpulkan semua field ID yang dibutuhkan
        const fieldIds: string[] = [];

        // Proses semua respons untuk membuat distribusi data demografis
        periodFilteredResponses.forEach((response) => {
          if (response.demographicData && response.demographicData.length > 0) {
            response.demographicData.forEach((data) => {
              // Simpan ID field dan nilai
              const fieldId = data.fieldId;
              if (!fieldIds.includes(fieldId)) {
                fieldIds.push(fieldId);
              }

              const value = String(data.value);

              // Tambahkan ke statistik demografis
              if (!demographicBreakdown[fieldId]) {
                demographicBreakdown[fieldId] = {};
              }

              if (!demographicBreakdown[fieldId][value]) {
                demographicBreakdown[fieldId][value] = 0;
              }

              demographicBreakdown[fieldId][value]++;
            });
          }
        });

        console.log("Demographic breakdown:", demographicBreakdown);
        console.log("Field IDs for lookup:", fieldIds);

        // Jika kita tidak memiliki label untuk beberapa field, coba dapatkan dari database
        if (fieldIds.length > 0) {
          try {
            // Ambil label dari database
            const dbLabels = await getDemographicFieldLabels(fieldIds);

            // Gabungkan dengan label yang sudah ada
            Object.entries(dbLabels).forEach(([id, label]) => {
              if (!demographicFieldLabels[id]) {
                demographicFieldLabels[id] = label;
                console.log(`Found field label in database: ${id} -> "${label}"`);
              }
            });
          } catch (error) {
            console.error("Error fetching demographic field labels:", error);
          }
        }

        console.log("Final field labels:", demographicFieldLabels);

        // Konversi data untuk chart
        const processedData: {[key: string]: { label: string, data: {name: string, value: number}[] }} = {};

        Object.keys(demographicBreakdown).forEach((fieldId) => {
          const fieldValues = demographicBreakdown[fieldId];
          const dataPoints = Object.keys(fieldValues).map((value) => ({
            name: value,
            value: fieldValues[value],
          }));

          // Hanya tambahkan jika ada data
          if (dataPoints.length > 0) {
            processedData[fieldId] = {
              // Gunakan label dari mapping jika tersedia, atau fallback ke Field ID
              label: demographicFieldLabels[fieldId] || `Field ${fieldId}`,
              data: dataPoints,
            };
          }
        });

        console.log("Processed demographic data:", processedData);
        setDemographicData(processedData);
      }
    };

    processData();
  }, [surveyResponses, surveyId, surveys, periodeSurvei]);

  // If loading, show spinner
  if (loading) {
    return (
      <div className="flex h-40 w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // If no survey result, show error message
  if (!surveyResult) {
    return (
      <div className="flex h-40 w-full items-center justify-center text-muted-foreground">
        Tidak ada data hasil survei. Silakan coba lagi nanti.
      </div>
    )
  }

  // Pastikan indicatorScores ada sebelum digunakan
  const indicatorScores = surveyResult.indicatorScores || [];

  // Helper function untuk membuat tabs indikator dengan penanganan error yang lebih baik
  const createTabs = () => {
    // Pastikan surveyResult dan surveyResult.indicatorScores ada
    if (!surveyResult || !surveyResult.indicatorScores || !Array.isArray(surveyResult.indicatorScores)) {
      return [{
        id: "all",
        title: "Semua Indikator",
        icon: <Sigma className="mr-2 h-4 w-4" />,
        score: "N/A"
      }];
    }

    // Default tabs
    const tabs = [
      {
        id: "all",
        title: "Semua Indikator",
        icon: <Sigma className="mr-2 h-4 w-4" />,
        score: surveyResult.averageScore ? surveyResult.averageScore.toFixed(2) : "N/A"
      }
    ];

    // Gunakan indicatorScores yang sudah kita definisikan di atas
    if (indicatorScores && Array.isArray(indicatorScores)) {
      indicatorScores.forEach((indicator) => {
        if (indicator) {
          tabs.push({
            id: indicator.indicatorId || `indicator-${tabs.length}`,
            title: indicator.indicatorTitle || `Indikator ${tabs.length}`,
            icon: <ChartBarIcon className="mr-2 h-4 w-4" />,
            score: indicator.score ? indicator.score.toFixed(2) : "N/A"
          });
        }
      });
    }

    return tabs;
  };

  // Helper function to render indicator data
  const renderIndicatorData = (indicator: WeightedScoreWithDistribution) => {
  return (
      <div className="space-y-6" key={indicator.indicatorId}>
            <div className="flex items-center justify-between">
              <div>
            <h3 className="text-lg font-semibold">{indicator.indicatorTitle}</h3>
            <p className="text-sm text-muted-foreground">
              Bobot: {indicator.weight}%
            </p>
              </div>
              <div className="text-right">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{indicator.score !== undefined && indicator.score !== null ? indicator.score.toFixed(2) : "0.00"}</span>
              <Badge variant={getBadgeColor(indicator.score)}>
                {getScoreLabel(indicator.score)}
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Indeks Kepuasan: {calculateIndexScale(indicator.score)}%
            </p>
              </div>
      </div>

        <Progress value={(indicator.score / 6) * 100} className="h-2" />

        {/* Tambahkan Card Distribusi Jawaban Indikator */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribusi Jawaban Indikator</CardTitle>
            <CardDescription>
              Distribusi jawaban responden untuk seluruh pertanyaan dalam indikator ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Hitung distribusi jawaban indikator */}
            {(() => {
              // Buat objek untuk menyimpan distribusi
              const distribution: { [key: number]: { count: number, percentage: number } } = {};

              // Inisialisasi distribusi untuk semua skor (1-6)
              for (let i = 1; i <= 6; i++) {
                distribution[i] = { count: 0, percentage: 0 };
              }

              // Total jawaban
              let totalAnswers = 0;

              // Agregasi distribusi dari semua pertanyaan dalam indikator
              indicator.questionDetails.forEach((question) => {
                // Pastikan distribution tersedia
                if (question.distribution) {
                  question.distribution.forEach((d) => {
                    // Pastikan skor berada dalam range 1-6
                    if (d.score >= 1 && d.score <= 6) {
                      distribution[d.score].count += d.count;
                      totalAnswers += d.count;
                    }
                  });
                }
              });

              // Hitung persentase
              Object.keys(distribution).forEach((score) => {
                const numScore = parseInt(score);
                distribution[numScore].percentage = totalAnswers > 0
                  ? (distribution[numScore].count / totalAnswers) * 100
                  : 0;
              });

              // Konversi ke array untuk tampilan
              const distributionArray = Object.entries(distribution).map(([score, data]) => ({
                score: parseInt(score),
                count: data.count,
                percentage: data.percentage
              }));

              // Tampilkan distribusi
              return (
                <div>
                  <div className="grid grid-cols-6 gap-2 mb-4">
                    {distributionArray.map((dist) => (
                      <div key={dist.score} className="flex flex-col items-center p-2 rounded-md bg-muted">
                        <div className="text-sm font-medium mb-1">Skor {dist.score}</div>
                        <div className="text-xl font-bold">{dist.count}</div>
                        <div className="text-xs text-muted-foreground">{dist.percentage !== undefined && dist.percentage !== null ? dist.percentage.toFixed(1) : "0.0"}%</div>
                      </div>
                    ))}
                  </div>

                  {/* Tambahkan visualisasi chart */}
                  <div className="h-48 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionArray}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="score" label={{ value: 'Skor', position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: 'Jumlah Jawaban', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                          formatter={(value, name, props) => {
                            if (name === "count") return [`${value} jawaban`, "Jumlah"];
                            if (name === "percentage") return [`${Number(value).toFixed(1)}%`, "Persentase"];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Jumlah" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tambahkan Pie Chart untuk visualisasi persentase */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h5 className="text-sm font-medium text-center mb-2">Distribusi Persentase</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distributionArray}
                              dataKey="percentage"
                              nameKey="score"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            >
                              {distributionArray.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColorForScore(entry.score)} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${Number(value).toFixed(1)}%`, `Skor ${name}`]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-center mb-2">Distribusi Jumlah Jawaban</h5>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distributionArray}
                              dataKey="count"
                              nameKey="score"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({name, value}) => `${name}: ${value}`}
                            >
                              {distributionArray.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColorForScore(entry.score)} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name) => [`${value} jawaban`, `Skor ${name}`]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                <TableHead className="w-[50%]">Pertanyaan</TableHead>
                <TableHead className="text-center">Skor</TableHead>
                <TableHead className="text-center">Min</TableHead>
                <TableHead className="text-center">Max</TableHead>
                <TableHead className="text-center">Median</TableHead>
                <TableHead className="text-center">Mode</TableHead>
                <TableHead className="text-center">StdDev</TableHead>
                <TableHead className="text-center">Resp.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indicator.questionDetails.map((question) => (
                          <TableRow key={question.questionId}>
                  <TableCell className="font-medium">{question.questionText}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">{question.averageScore !== undefined && question.averageScore !== null ? question.averageScore.toFixed(2) : "0.00"}</span>
                      <Badge variant={getBadgeColor(question.averageScore)} className="mt-1">
                        {getScoreLabel(question.averageScore)}
                              </Badge>
                    </div>
                            </TableCell>
                  <TableCell className="text-center">{question.min || 0}</TableCell>
                  <TableCell className="text-center">{question.max || 0}</TableCell>
                  <TableCell className="text-center">{question.median !== undefined && question.median !== null ? question.median.toFixed(2) : "0.00"}</TableCell>
                  <TableCell className="text-center">{question.mode || 0}</TableCell>
                  <TableCell className="text-center">{question.stdDev !== undefined && question.stdDev !== null ? question.stdDev.toFixed(2) : "0.00"}</TableCell>
                  <TableCell className="text-center">{question.responseCount || 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
        </div>

        {/* Tambahkan rincian distribusi jawaban untuk setiap pertanyaan */}
        <div className="space-y-6 mt-6">
          <h4 className="text-base font-semibold">Distribusi Jawaban per Pertanyaan</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indicator.questionDetails.map((question) => {
              // Hanya tampilkan jika ada distribusi
              if (!question.distribution || question.distribution.length === 0) {
                return null;
              }

              return (
                <Card key={question.questionId} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{question.questionText}</CardTitle>
                    <CardDescription className="text-xs">
                      Rata-rata: {question.averageScore !== undefined && question.averageScore !== null ? question.averageScore.toFixed(2) : "0.00"} | Responden: {question.responseCount || 0}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="grid grid-cols-6 gap-1">
                      {question.distribution?.map((dist) => (
                        <div key={dist.score} className="flex flex-col items-center p-1 rounded-sm bg-muted/50">
                          <div className="text-xs font-medium">Skor {dist.score}</div>
                          <div className="text-sm font-bold">{dist.count}</div>
                          <div className="text-xs text-muted-foreground">{dist.percentage !== undefined && dist.percentage !== null ? dist.percentage.toFixed(1) : "0.0"}%</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar untuk visualisasi distribusi */}
                    <div className="flex items-center space-x-1 mt-3">
                      {question.distribution?.map((dist) => (
                        <div
                          key={dist.score}
                          className="h-4 rounded-sm"
                          style={{
                            width: `${dist.percentage}%`,
                            backgroundColor: getColorForScore(dist.score),
                            minWidth: dist.count > 0 ? '8px' : '0'
                          }}
                          title={`Skor ${dist.score}: ${dist.count} jawaban (${dist.percentage !== undefined && dist.percentage !== null ? dist.percentage.toFixed(1) : "0.0"}%)`}
                        />
                      ))}
                    </div>

                    {/* Tambahkan toggle untuk menampilkan chart dengan Collapsible */}
                    <Collapsible className="mt-3">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-center cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                          <ChevronDown className="h-3 w-3 mr-1" />
                          <span>Lihat visualisasi chart</span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={question.distribution}
                                dataKey="count"
                                nameKey="score"
                                cx="50%"
                                cy="50%"
                                outerRadius={50}
                                label={({name, value}) => `${name}: ${value}`}
                              >
                                {question.distribution?.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={getColorForScore(entry.score)} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value, name) => {
                                  const dist = question.distribution?.find(d => d.score.toString() === name);
                                  return [`${value} jawaban (${dist?.percentage.toFixed(1) || '0.0'}%)`, `Skor ${name}`];
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    )
  }

  // Helper function untuk menentukan warna berdasarkan skor
  const getColorForScore = (score: number): string => {
    const colors = {
      1: "#ef4444", // Merah
      2: "#f97316", // Oranye
      3: "#eab308", // Oranye Kekuningan
      4: "#facc15", // Kuning
      5: "#a3e635", // Hijau Muda
      6: "#22c55e"  // Hijau
    };

    return colors[score as keyof typeof colors] || "#9ca3af"; // Default abu-abu
  };

  const renderTabContent = () => {
    if (activeTab === "all") {
      return (
        <>
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle>Indikator Gabungan</CardTitle>
              <CardDescription>Hasil keseluruhan dari semua indikator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Skor Rata-rata</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-bold">{surveyResult.averageScore !== undefined && surveyResult.averageScore !== null ? surveyResult.averageScore.toFixed(2) : "0.00"}</span>
                    <Badge variant={getBadgeColor(surveyResult.averageScore)}>
                      {getScoreLabel(surveyResult.averageScore)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Indeks Kepuasan: {calculateIndexScale(surveyResult.averageScore)}%
                  </p>
                </div>
              </div>

              <Progress value={(surveyResult.averageScore / 6) * 100} className="h-2 mt-4" />

              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Distribusi Jawaban</h4>
                <div className="grid grid-cols-6 gap-2">
                  {overallDistribution.map((dist) => (
                    <div key={dist.score} className="flex flex-col items-center p-2 rounded-md bg-background">
                      <div className="text-sm font-medium mb-1">Skor {dist.score}</div>
                      <div className="text-xl font-bold">{dist.count}</div>
                      <div className="text-xs text-muted-foreground">{dist.percentage !== undefined ? dist.percentage.toFixed(1) : "0.0"}%</div>
                  </div>
                ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tambahkan Card Visualisasi Data Demografi */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Visualisasi Data Demografi</CardTitle>
                  <CardDescription>Distribusi responden berdasarkan data demografis</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Fungsi untuk mencetak hanya bagian demografi
                    const printDemographics = () => {
                      // Buat elemen style untuk mencetak
                      const style = document.createElement('style');
                      style.innerHTML = `
                        @media print {
                          body * {
                            visibility: hidden;
                          }
                          #demographic-section, #demographic-section * {
                            visibility: visible;
                          }
                          #demographic-section {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                          }
                          .print-hide {
                            display: none !important;
                          }
                        }
                      `;
                      document.head.appendChild(style);

                      window.print();

                      // Hapus style setelah mencetak
                      document.head.removeChild(style);
                    };

                    printDemographics();
                  }}
                  className="print-hide"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  Cetak Data Demografi
                </Button>
              </div>
            </CardHeader>
            <CardContent id="demographic-section">
              {loadingDemographics ? (
                <div className="flex items-center justify-center h-40">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-2"></div>
                    <p className="text-sm text-muted-foreground">Memuat data demografi...</p>
                  </div>
                </div>
              ) : Object.keys(demographicData).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.keys(demographicData).map((fieldId) => {
                    const { label, data } = demographicData[fieldId];

                    // Lewati jika tidak ada data
                    if (!data || data.length === 0) return null;

                    // Hitung total untuk persentase
                    const total = data.reduce((sum, item) => sum + item.value, 0);

                    // Tambahkan persentase ke data
                    const dataWithPercentage = data.map((item) => ({
                      ...item,
                      percentage: total > 0 ? (item.value / total) * 100 : 0,
                    }));

                    // Urut data berdasarkan nilai (dari besar ke kecil)
                    const sortedData = [...dataWithPercentage].sort((a, b) => b.value - a.value);

                    return (
                      <Card key={fieldId} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">{label}</CardTitle>
                          <CardDescription className="text-xs">
                            Total Responden: {total}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {/* Tampilkan data dalam tabel */}
                          <div className="mb-4">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Nilai</TableHead>
                                  <TableHead className="text-right">Jumlah</TableHead>
                                  <TableHead className="text-right">Persentase</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sortedData.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-right">{item.value}</TableCell>
                                    <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Tampilkan visualisasi chart */}
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={sortedData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                >
                                  {sortedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value, name, props) => [
                                    `${value} responden (${(props.payload.percentage).toFixed(1)}%)`,
                                    name
                                  ]}
                                />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center">
                  <p className="text-muted-foreground mb-2">Tidak ada data demografis tersedia untuk survei ini.</p>
                  <p className="text-xs text-muted-foreground">Data demografis akan tersedia jika responden mengisi informasi demografis saat mengambil survei.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-8">
            {indicatorScores.map((indicator) => {
              // Cast indikator ke tipe yang sudah kita definisikan
              const indicatorWithDist = indicator as WeightedScoreWithDistribution;
              return renderIndicatorData(indicatorWithDist);
            })}
          </div>
        </>
      )
    }

    const selectedIndicator = indicatorScores.find(
      (indicator) => indicator.indicatorId === activeTab
    ) as WeightedScoreWithDistribution | undefined

    if (selectedIndicator) {
      return renderIndicatorData(selectedIndicator)
    }

    return <div>No data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Detail Hasil Survei</h2>
        <Badge variant="outline" className="ml-2">
          {surveyResult.totalResponses} Responden
        </Badge>
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="mb-4 flex flex-wrap">
          {createTabs().map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center">
              {tab.icon}
              <span>{tab.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab}>{renderTabContent()}</TabsContent>
      </Tabs>
    </div>
  )
}
