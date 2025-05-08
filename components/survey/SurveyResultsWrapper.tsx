"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResultsOverview } from "@/components/survey/ResultsOverview"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SurveyResultsWrapperProps {
  id: string
}

// Definisi tipe
interface SurveyResponse {
  id: string
  surveyId: string
  isComplete: boolean
  [key: string]: any
}

interface SurveyResult {
  surveyId: string
  [key: string]: any
}

export function SurveyResultsWrapper({ id }: SurveyResultsWrapperProps) {
  const router = useRouter()
  const { surveyResults, surveyResponses, getSurveyResults, loading } = useSurvey()
  const [isClient, setIsClient] = useState(false)
  const [timeoutReached, setTimeoutReached] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Tambahkan useRef untuk mencegah debug log loop dan mounting
  const debugLoggedRef = useRef(false)
  const isMounted = useRef(true)

  // Set isClient to true once component mounts to ensure we're in client side
  useEffect(() => {
    setIsClient(true)

    // Force render after 5 seconds regardless of loading state
    const timeout = setTimeout(() => {
      if (isMounted.current) {
        setTimeoutReached(true)
      }
    }, 5000)

    // Cleanup function
    return () => {
      clearTimeout(timeout)
      isMounted.current = false
    }
  }, [])

  // Retry fetching results
  const handleRetry = async () => {
    setError(null)
    setRetryCount(prev => prev + 1)

    try {
      await getSurveyResults(id)
    } catch (err) {
      setError("Gagal memuat data hasil survey")
      console.error("Error refreshing survey results:", err)
    }
  }

  // When we're on the client, we can search for the results
  const surveyResult = isClient ? surveyResults.find((result: SurveyResult) => result.surveyId === id) : null

  // Check response count
  const responseCount = isClient ? surveyResponses?.filter((r: SurveyResponse) => r.surveyId === id && r.isComplete)?.length || 0 : 0

  // Debug output - perbaikan untuk mencegah infinite loop
  useEffect(() => {
    if (isClient && !debugLoggedRef.current) {
      console.log("[SurveyResultsWrapper] State:", {
        id,
        resultsLength: surveyResults.length,
        foundResult: !!surveyResult,
        responseCount,
        timeoutReached,
        retryCount
      })

      // Set flag untuk mencegah log berulang
      debugLoggedRef.current = true
    }
    // Hilangkan dependensi yang menyebabkan re-render berulang
  }, [isClient]);

  // Menampilkan indikator loading yang lebih informatif
  if (!isClient && !timeoutReached) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center min-h-[30vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-gray-500">Memuat hasil survei...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Menangani error loading
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={handleRetry} className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Jika sudah timeout tapi masih loading, tampilkan status memuat yang lebih jelas
  if (loading && timeoutReached) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2 mx-auto" />
            <h3 className="text-lg font-medium mb-2">Memuat Data</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Memuat hasil survey membutuhkan waktu lebih lama dari biasanya.
              Mohon tunggu sebentar atau coba muat ulang halaman.
            </p>
            <div className="flex justify-center">
              <Button variant="outline" onClick={handleRetry} className="mr-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Muat Ulang Data
              </Button>
              <Button variant="ghost" onClick={() => router.push(`/admin/surveys/${id}`)}>
                Lihat Detail Survei
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If no survey result exists, show the empty state
  if (!surveyResult) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hasil Survei</CardTitle>
          <CardDescription>Ringkasan hasil survei dan analisis tanggapan</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="py-8">
            <h3 className="text-lg font-medium mb-2">Belum ada responden</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Hasil survei akan muncul di sini setelah ada responden yang menyelesaikan survei.
              {responseCount > 0 ? ` Terdapat ${responseCount} responden, tetapi belum cukup data untuk analisis.` : ''}
            </p>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={() => router.push(`/admin/surveys/${id}`)}>
                Lihat Detail Survei
              </Button>
              {responseCount > 0 && (
                <Button onClick={handleRetry}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Muat Ulang
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If we have a survey result, render the ResultsOverview component
  return <ResultsOverview result={surveyResult} />
}
