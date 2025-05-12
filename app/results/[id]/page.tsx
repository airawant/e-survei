"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, ClipboardCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Button } from "@/components/ui/button"
import Layout from "@/components/Layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ClientOnly from "@/components/survey/ClientOnly"
import { RespondentsTableSkeleton } from "./RespondentsTableSkeleton"
import { ResultsOverviewSkeleton } from "./ResultsOverviewSkeleton"
import dynamic from "next/dynamic"

interface Indicator {
  id: string;
  questions: any[];
  [key: string]: any;
}

// Dynamically import components to reduce bundle size and improve loading
const SurveyResultsWrapper = dynamic(
  () => import("@/components/survey/SurveyResultsWrapper").then(mod => mod.SurveyResultsWrapper),
  { ssr: false, loading: () => <ResultsOverviewSkeleton /> }
)

const RespondentsTable = dynamic(
  () => import("@/components/survey/RespondentsTable"),
  { ssr: false, loading: () => <RespondentsTableSkeleton /> }
)

const ResultsAggregation = dynamic(
  () => import("@/components/survey/ResultsAggregation").then(mod => mod.ResultsAggregation),
  { ssr: false, loading: () => <ResultsOverviewSkeleton /> }
)

export default function SurveyResults() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { getSurvey, currentSurvey, getSurveyResults, surveyResults, loading } = useSurvey()
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [error, setError] = useState<string | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const dataFetchedRef = useRef(false)

  // Mengambil data survey dan hasilnya
  useEffect(() => {
    // Prevent fetching on every render or component remount
    if (dataFetchedRef.current) return;

    const fetchData = async () => {
      try {
        if (id) {
          // Reset state
          setError(null);
          setIsDataLoaded(false);

          // Mengambil data survey
          await getSurvey(id);

          // Mengambil hasil survey
          await getSurveyResults(id);

          setIsDataLoaded(true);
          dataFetchedRef.current = true;
        }
      } catch (err) {
        setError("Gagal memuat data survey. Silakan coba lagi.");
        console.error("Error fetching survey data:", err);
      }
    };

    fetchData();

    // Timeout untuk loading state (10 detik)
    const timeoutId = setTimeout(() => {
      setLoadingTimeout(true);
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [id, getSurvey, getSurveyResults]);

  const handleRetry = async () => {
    try {
      setLoadingTimeout(false);
      setError(null);
      dataFetchedRef.current = false;

      // Reset flag so we can fetch again
      dataFetchedRef.current = false;

      // Reload data
      await getSurvey(id);
      await getSurveyResults(id);

      setIsDataLoaded(true);
    } catch (err) {
      setError("Gagal memuat data survey. Silakan coba lagi.");
      console.error("Error reloading survey data:", err);
    }
  };

  // Fallback jika loading terlalu lama
  if ((loading && loadingTimeout) || error) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Memuat data membutuhkan waktu lebih lama dari biasanya. Data mungkin belum tersedia atau terjadi masalah koneksi.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => router.push("/results")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Survey
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Muat Ulang
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  // Menampilkan loading spinner jika masih loading dan belum timeout
  if (loading && !loadingTimeout && !isDataLoaded) {
    return (
      <Layout>
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-gray-500">Memuat hasil survey...</p>
        </div>
      </Layout>
    )
  }

  if (!currentSurvey) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Survey tidak ditemukan</h2>
          <p className="mt-2 text-gray-600">
            Survey yang Anda cari tidak ada atau Anda tidak memiliki akses.
          </p>
          <Button onClick={() => router.push("/results")} className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Survey
          </Button>
        </div>
      </Layout>
    )
  }

  const { title, description, isActive } = currentSurvey

  // Hitung total pertanyaan
  const totalQuestions = currentSurvey.indicators ?
    currentSurvey.indicators.reduce((total: number, indicator: Indicator) =>
      total + (indicator.questions ? indicator.questions.length : 0), 0) : 0

  return (
    <Layout>
      <ClientOnly>
        <div>
          <div className="flex items-center mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.push("/results")} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Hasil Survey: {title}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <CalendarDays className="mr-1 h-4 w-4" />
                </div>
                <div className="flex items-center">
                  <ClipboardCheck className="mr-1 h-4 w-4" />
                  {totalQuestions} {totalQuestions === 1 ? "pertanyaan" : "pertanyaan"}
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="respondents">Responden</TabsTrigger>
              <TabsTrigger value="aggregation">Agregasi Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Suspense fallback={<ResultsOverviewSkeleton />}>
                <SurveyResultsWrapper id={id} />
              </Suspense>
            </TabsContent>

            <TabsContent value="respondents" className="mt-6">
              <Suspense fallback={<RespondentsTableSkeleton />}>
                <RespondentsTable surveyId={id} />
              </Suspense>
            </TabsContent>

            <TabsContent value="aggregation" className="mt-6">
              <Suspense fallback={<ResultsOverviewSkeleton />}>
                <ResultsAggregation surveyId={id} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </ClientOnly>
    </Layout>
  )
}
