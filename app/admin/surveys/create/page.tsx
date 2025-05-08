"use client"

import { useRouter } from "next/navigation"
import SurveyFormComponent from "@/components/survey/SurveyFormComponent"

export default function CreateSurvey() {
  const router = useRouter()

  return <SurveyFormComponent router={router} isEditing={false} />
}
