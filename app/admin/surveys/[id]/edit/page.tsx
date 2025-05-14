"use client"

import { useParams, useRouter } from "next/navigation"
import SurveyFormComponent from "@/components/survey/SurveyFormComponent"
import { useEffect, useState } from "react"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Spinner } from "@/components/ui/spinner"

export default function EditSurvey() {
  const params = useParams()
  const router = useRouter()
  const { getSurvey } = useSurvey()
  const [isLoading, setIsLoading] = useState(true)
  const [surveyId, setSurveyId] = useState<string>("")

  // Ambil ID dan proses secara asynchronous dalam useEffect
  useEffect(() => {
    const rawId = params.id
    console.log("Edit Survey Page - Raw ID from params:", rawId, "Type:", typeof rawId)

    // Menangani berbagai kemungkinan format dari params.id
    let processedId: string
    if (rawId === null || rawId === undefined) {
      console.error("Invalid ID: null or undefined")
      processedId = ""
    } else if (typeof rawId === 'object') {
      if (Array.isArray(rawId)) {
        processedId = rawId[0] || ""
      } else if (Object.keys(rawId).length === 0) {
        console.error("Invalid ID: empty object")
        processedId = ""
      } else {
        // Jika objek memiliki properti, coba ambil nilai pertama
        const firstKey = Object.keys(rawId)[0]
        processedId = rawId[firstKey] || String(rawId)
      }
    } else {
      processedId = String(rawId)
    }

    console.log("Edit Survey Page - Processed ID:", processedId)

    if (!processedId) {
      console.error("Missing survey ID, redirecting to survey list")
      router.push("/admin/surveys")
      return
    }

    // Set ID yang sudah diproses
    setSurveyId(processedId)

    // Pre-load survey data untuk memastikan data tersedia sebelum render
    const loadSurveyData = async () => {
      try {
        setIsLoading(true)
        console.log("Preloading survey data for ID:", processedId)
        await getSurvey(processedId)
        console.log("Survey data preloaded successfully")
      } catch (error) {
        console.error("Error preloading survey data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSurveyData()
  }, [params.id, router, getSurvey])

  // Tampilkan indikator loading sampai data survei siap
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-2 text-lg">Memuat data survei...</span>
      </div>
    )
  }

  return <SurveyFormComponent router={router} isEditing={true} id={surveyId} />
}
