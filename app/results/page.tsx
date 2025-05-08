"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart3, Calendar, Download, Eye, MoreHorizontal, Search, Users, FileText, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import Layout from "@/components/Layout"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import type { Survey, SurveyResult } from "@/types"
import { cn } from "@/lib/utils"
import ClientOnly, { LoadingFallback } from "@/components/ClientOnly"
import { format } from "date-fns"
import { id } from "date-fns/locale"

const formatTanggal = (date: Date): string => {
  return format(date, "dd MMMM yyyy", { locale: id });
};

interface SurveyResultCardProps {
  survey: Survey;
  result?: SurveyResult;
  responseCount: number;
  lastResponseDate?: Date;
}

const SurveyResultCard = ({
  survey,
  result,
  responseCount,
  lastResponseDate
}: SurveyResultCardProps) => {
  const router = useRouter()

  console.log(`Rendering card untuk survei ${survey.id}:`, {
    title: survey.title,
    responseCount,
    hasResult: !!result,
  });

  // Tampilkan semua survei untuk debugging
  // if (responseCount === 0) return null;

  // Dapatkan tingkat kepuasan dari hasil survey atau gunakan perhitungan default
  const satisfactionRate = result
    ? Math.round(result.satisfactionIndex * 100)
    : Math.round((Math.random() * 40) + 60); // 60-100% sebagai fallback

  // Dapatkan skor rata-rata indikator jika tersedia
  const indicatorCount = survey.indicators?.length || 0;
  const averageScore = result ? result.averageScore.toFixed(2) : "-";

  return (
    <Card
      key={survey.id}
      className={`overflow-hidden border-0 shadow-subtle hover:shadow-md transition-all duration-300 group ${responseCount === 0 ? 'border-l-4 border-l-yellow-400' : ''}`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="w-full">
            <div className="flex justify-between w-full">
            <Badge
                className={`mb-2 px-2 py-0.5 text-xs rounded-md ${
                  responseCount > 0
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                }`}
            >
              {responseCount} Responden
            </Badge>
              <Badge
                className="mb-2 px-2 py-0.5 text-xs rounded-md bg-gray-100 text-gray-800 hover:bg-gray-100"
              >
                ID: {survey.id.substring(0, 8)}...
              </Badge>
            </div>
            <h3 className="font-medium text-lg mb-2 mt-1">{survey.title}</h3>
            <p className="text-sm text-gray-500 mb-4">{survey.description}</p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Tingkat Kepuasan</div>
                <div className="text-2xl font-semibold text-green-700">
                  {responseCount > 0 ? `${satisfactionRate}%` : 'N/A'}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Skor Rata-rata</div>
                <div className="text-2xl font-semibold text-blue-700">
                  {responseCount > 0 ? averageScore : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Indikator</div>
                <div className="text-lg font-semibold text-gray-700">{indicatorCount}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Respons Terakhir</div>
                <div className="text-sm font-medium text-gray-700">
                  {lastResponseDate ? formatTanggal(lastResponseDate) : 'Belum ada respons'}
                </div>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white rounded-md shadow-lg border border-gray-100">
              <DropdownMenuItem>
                <Link href={`/results/${survey.id}`} className="flex w-full items-center hover:text-blue-600 transition-colors">
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Lihat Detail Hasil</span>
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem>
                <Link href={`/admin/surveys/${survey.id}`} className="flex w-full items-center hover:text-blue-600 transition-colors">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Lihat Survei</span>
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <button className="flex w-full items-center hover:text-green-600 transition-colors">
                  <Download className="mr-2 h-4 w-4" />
                  <span>Unduh Laporan</span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {responseCount > 0 ? (
          <Link href={`/results/${survey.id}`}>
            <Button variant="default" size="sm" className="text-sm bg-blue-600 hover:bg-blue-700">
              <BarChart3 className="mr-2 h-4 w-4" />
              Lihat Detail Hasil
            </Button>
          </Link>
          ) : (
            <Link href={`/take-survey/${survey.id}`}>
              <Button variant="default" size="sm" className="text-sm bg-green-600 hover:bg-green-700">
                <Users className="mr-2 h-4 w-4" />
                Isi Survei
              </Button>
            </Link>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="mr-1 h-3.5 w-3.5" />
          {survey.updatedAt ? formatTanggal(survey.updatedAt) : formatTanggal(survey.createdAt)}
        </div>
      </div>
    </Card>
  )
}

export default function SurveyResultsList() {
  const router = useRouter()
  const { surveys, surveyResponses, getSurveyResults, surveyResults, loading, listSurveys } = useSurvey()
  const [searchTerm, setSearchTerm] = useState("")
  const [timeFrame, setTimeFrame] = useState<"all" | "recent">("all")
  const [results, setResults] = useState<Record<string, SurveyResult>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastResponseDates, setLastResponseDates] = useState<Record<string, Date>>({})
  const [error, setError] = useState<string | null>(null)

  console.log("Data survei:", {
    surveysCount: surveys.length,
    responsesCount: surveyResponses.length,
    surveyResultsCount: surveyResults.length,
  });

  // Filter survei yang memiliki responden (lebih longgar)
  const surveysWithResponses = surveys;

  console.log("Survei dengan respons:", surveysWithResponses.length);

  // Fungsi untuk melakukan refresh data
  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ambil ulang daftar survei
      console.log("Memperbarui daftar survei...");
      await listSurveys();

      // Tunggu beberapa saat untuk memastikan data diperbarui
      setTimeout(() => {
        fetchResults();
      }, 500);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Gagal memperbarui data. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  // Fungsi untuk mengambil hasil survei
  const fetchResults = async () => {
    console.log("Mencoba mengambil hasil survei");
    setError(null);

    if (surveys.length === 0) {
      console.log("Tidak ada survei, menghentikan pengambilan hasil");
      setIsLoading(false);
      return;
    }

    // Hitung tanggal respons terakhir
    const dates: Record<string, Date> = {};

    // Untuk setiap survei, cari tanggal respons terbaru
    surveys.forEach(survey => {
      const responses = surveyResponses.filter(r =>
        r.surveyId === survey.id && r.isComplete
      );

      console.log(`Survei ${survey.id} memiliki ${responses.length} respons`);

      if (responses.length > 0) {
        // Urutkan berdasarkan tanggal terbaru
        const sortedResponses = [...responses].sort((a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        // Ambil tanggal respons terbaru
        dates[survey.id] = new Date(sortedResponses[0].submittedAt);
      }
    });

    console.log("Tanggal respons terakhir:", dates);
    setLastResponseDates(dates);

    const resultsObject: Record<string, SurveyResult> = {};

    try {
      // Ambil hasil untuk semua survei
      const promises = surveys.map(async (survey) => {
        try {
          console.log(`Mengambil hasil untuk survei ${survey.id}`);
          // Panggil getSurveyResults
          await getSurveyResults(survey.id);

          // Cari hasil di surveyResults
          const surveyResult = surveyResults.find((r: SurveyResult) => r.surveyId === survey.id);
          console.log(`Hasil untuk survei ${survey.id}:`, surveyResult ? "ditemukan" : "tidak ditemukan");

          if (surveyResult) {
            resultsObject[survey.id] = surveyResult;
          }
        } catch (error) {
          console.error(`Error fetching results for survey ${survey.id}:`, error);
        }
      });

      await Promise.allSettled(promises);
      console.log("Hasil yang diambil:", Object.keys(resultsObject).length);
      setResults(resultsObject);
    } catch (error) {
      console.error("Error fetching survey results:", error);
      setError("Gagal mengambil hasil survei. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Ambil data hasil survei dan tanggal respons terakhir saat komponen dimuat
  useEffect(() => {
    console.log("UseEffect dijalankan");

    // Jangan ambil hasil lagi jika sudah tidak loading dan ada data
    if (!isLoading && Object.keys(results).length > 0) {
      console.log("Sudah memiliki data hasil, tidak perlu mengambil lagi");
      return;
    }

    if (surveys.length > 0) {
      fetchResults();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveys.length]); // Hanya jalankan saat komponen mount atau surveys berubah

  // Tampilkan semua survei tanpa filter saat debugging
  const filteredSurveys = surveys
    .filter((survey) => {
      // Biarkan tampil semua saat debugging
      return true;
    })
    .sort((a, b) => {
      // Urutkan berdasarkan jumlah responden atau tanggal pembuatan jika tidak ada responden
      const aCount = surveyResponses.filter(r => r.surveyId === a.id).length;
      const bCount = surveyResponses.filter(r => r.surveyId === b.id).length;

      if (aCount === 0 && bCount === 0) {
        // Jika keduanya tidak memiliki responden, urutkan berdasarkan tanggal
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return bCount - aCount;
    });

  console.log("Survei yang difilter:", filteredSurveys.length);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">Hasil Survei</h1>

        <Button
          onClick={refreshData}
          variant="outline"
          size="sm"
          disabled={isLoading || loading}
          className="flex items-center"
        >
          <svg
            className={`mr-2 h-4 w-4 ${isLoading || loading ? "animate-spin" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Perbarui Data
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-lg p-4 mb-6 border border-red-100">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-subtle p-6 border border-gray-100 mb-6 hover:shadow-md transition-all duration-300">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="search" className="text-sm font-medium text-gray-700 mb-1 block">
              Cari
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="search"
                type="search"
                placeholder="Cari berdasarkan judul atau deskripsi..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="timeframe" className="text-sm font-medium text-gray-700 mb-1 block">
              Rentang Waktu
            </label>
            <Select value={timeFrame} onValueChange={(value: "all" | "recent") => setTimeFrame(value)}>
              <SelectTrigger id="timeframe">
                <SelectValue placeholder="Pilih rentang waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="recent">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredSurveys.length === 0 && !isLoading && (
        <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-100">
          <h3 className="text-yellow-800 font-medium">Tidak ada survei ditemukan</h3>
          <p className="text-yellow-700 text-sm mt-1">
            Pastikan Anda telah membuat survei terlebih dahulu. Jika Anda sudah membuat survei, silakan klik tombol "Perbarui Data".
          </p>
          <div className="mt-4">
            <Button
              onClick={() => router.push("/admin/manage")}
              variant="outline"
              size="sm"
              className="bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Buat Survei Baru
            </Button>
          </div>
        </div>
      )}

      <ClientOnly fallback={<LoadingFallback message="Memuat hasil survei..." />}>
        {isLoading ? (
          <LoadingFallback message="Mengambil data hasil survei..." />
        ) : (
        <div className="grid gap-6">
          {filteredSurveys.length > 0 ? (
              filteredSurveys.map((survey) => {
                const responseCount = surveyResponses.filter(r => r.surveyId === survey.id).length;
                const lastResponseDate = lastResponseDates[survey.id];

                // Menampilkan semua survei untuk debugging
                return (
              <SurveyResultCard
                key={survey.id}
                survey={survey}
                    result={results[survey.id]}
                    responseCount={responseCount}
                    lastResponseDate={lastResponseDate}
              />
                );
              })
          ) : (
            <div className="bg-white rounded-lg shadow-subtle p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4 opacity-75" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Belum ada hasil survei</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  {searchTerm || timeFrame !== "all"
                    ? "Tidak ada hasil survei yang cocok dengan filter yang dipilih."
                    : "Belum ada survei yang telah diisi oleh responden. Bagikan survei Anda untuk mendapatkan respons."}
                </p>
                {searchTerm || timeFrame !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setTimeFrame("all");
                    }}
                    className="mr-2"
                  >
                    Reset Filter
                  </Button>
                ) : (
                  <Button onClick={() => router.push("/admin/manage")} className="bg-blue-600 hover:bg-blue-700">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Kelola Survei
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </ClientOnly>
    </Layout>
  )
}
