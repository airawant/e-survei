"use client"

import { useParams, useRouter } from "next/navigation"
import SurveyFormComponent from "@/components/survey/SurveyFormComponent"

export default function EditSurvey() {
  const params = useParams()

  // Ambil ID dan pastikan itu string valid
  const rawId = params.id

  // Debugging untuk memastikan nilai ID yang diterima
  console.log("Edit Survey Page - Raw ID from params:", rawId, "Type:", typeof rawId)

  // Pastikan ID adalah string, bukan objek kosong
  let id: string
  if (rawId === null || rawId === undefined) {
    console.error("Invalid ID: null or undefined")
    id = ""
  } else if (typeof rawId === 'object' && Object.keys(rawId).length === 0) {
    console.error("Invalid ID: empty object")
    id = ""
  } else {
    id = String(rawId) // Pastikan selalu string
  }

  console.log("Edit Survey Page - Processed ID:", id)

  const router = useRouter()

  // Jika ID kosong, kita bisa redirect ke halaman survey list
  if (!id) {
    console.error("Missing survey ID, should redirect to survey list")
    // router.push("/admin/surveys") // Uncomment jika ingin redirect otomatis
  }

  return <SurveyFormComponent router={router} isEditing={true} id={id} />
}
