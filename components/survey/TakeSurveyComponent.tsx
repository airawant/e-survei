"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Save } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import type { DemographicField, Question } from "@/types"
import { CalendarIcon } from "lucide-react"
import { getLikertOptions, getLikertLabels } from "@/lib/likert-utils"
import { isLikertType } from "@/lib/question-types"

interface TakeSurveyComponentProps {
  surveyId?: string
}

interface LocalDemographicField extends DemographicField {
  placeholder?: string;
}

const TakeSurveyComponent = ({ surveyId }: TakeSurveyComponentProps) => {
  const router = useRouter()
  const {
    surveys,
    currentSurvey,
    getSurvey,
    startSurveyResponse,
    saveResponseDraft,
    submitSurveyResponse,
    currentResponse,
    surveyProgress,
    updateSurveyProgress,
  } = useSurvey()

  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [surveyCompleted, setSurveyCompleted] = useState(false)
  const [answerData, setAnswerData] = useState<{
    answers: { questionId: string; value: string | number | string[] }[]
    demographicData: { fieldId: string; value: string | number | string[] }[]
  }>({
    answers: [],
    demographicData: [],
  })

  useEffect(() => {
    if (surveyId) {
      getSurvey(surveyId)
      startSurveyResponse(surveyId)
    } else if (surveys.length > 0) {
      const activeSurvey = surveys.find((s) => s.isActive)
      if (activeSurvey) {
        router.push(`/take-survey/${activeSurvey.id}`)
      }
    }
  }, [surveyId, surveys, getSurvey, startSurveyResponse, router])

  if (!currentSurvey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-lg border-0 shadow-subtle">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Survey Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <p className="text-gray-600 mb-6">The survey you're looking for is not available or may have expired.</p>
            <Button onClick={() => router.push("/")} className="mx-auto">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentSurvey.isActive) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-lg border-0 shadow-subtle">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Survey Not Active</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <p className="text-gray-600 mb-6">
              This survey is currently not active. Please check back later or contact the administrator.
            </p>
            <Button onClick={() => router.push("/")} className="mx-auto">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (surveyCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-lg border-0 shadow-subtle">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Thank You!</CardTitle>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-600 mb-6">
              Your response has been submitted successfully. We appreciate your feedback!
            </p>
            <Button onClick={() => router.push("/")} className="mx-auto">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStepContent = () => {
    const { currentStep } = surveyProgress

    if (currentStep === 0) {
      return (
        <>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{currentSurvey.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <p className="text-gray-600">{currentSurvey.description}</p>
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
              <div className="flex gap-2">
                <Info className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">About this survey</p>
                  <p className="mt-1">
                    This survey will take approximately {Math.ceil(surveyProgress.totalQuestions / 5)} minutes to
                    complete. Your feedback is invaluable to us.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Questions:</span>
                  <span className="text-gray-900">{surveyProgress.totalQuestions}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </>
      )
    } else if (currentStep === 1) {
      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">Demographic Information</CardTitle>
            <p className="text-gray-500 text-sm mt-1">Please provide the following information about yourself.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentSurvey.demographicFields.map((field) => (
              <div key={field.id} className="mb-4">
                <div className="mb-2">
                  <label className="block text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {getDemographicFieldTypeInput(field as LocalDemographicField, handleDemographicChange)}
                  {formErrors[`demographic-${field.id}`] && (
                    <p className="text-sm text-red-500">{formErrors[`demographic-${field.id}`]}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </>
      )
    } else {
      const indicatorIndex = currentStep - 2
      const indicator = currentSurvey.indicators[indicatorIndex]

      if (!indicator) return null

      return (
        <>
          <CardHeader>
            <CardTitle className="text-xl">{indicator.title}</CardTitle>
            {indicator.description && <p className="text-gray-500 text-sm mt-1">{indicator.description}</p>}
          </CardHeader>
          <CardContent className="space-y-6">
            {indicator.questions.map((question, qIndex) => (
              <div key={question.id} className="space-y-2">
                <div className="flex items-start">
                  <span className="text-gray-400 mr-2 text-sm">{qIndex + 1}.</span>
                  <label className="block text-sm font-medium text-gray-700">
                    {question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
                {renderQuestionField(question)}
                {formErrors[`question-${question.id}`] && (
                  <p className="text-sm text-red-500">{formErrors[`question-${question.id}`]}</p>
                )}
              </div>
            ))}
          </CardContent>
        </>
      )
    }
  }

  const getDemographicFieldTypeInput = (
    field: LocalDemographicField,
    handleChange: (
      fieldId: string,
      value: string | number | string[]
    ) => void
  ) => {
    const fieldValue = answerData.demographicData.find((d) => d.fieldId === field.id)?.value

    switch (field.type) {
      case "text":
        return (
          <Input
            type="text"
            value={(fieldValue as string) || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className="w-full"
          />
        )
      case "number":
        return (
          <Input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={(fieldValue as string) || ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className="w-full"
          />
        )
      case "date":
        return (
          <div className="border rounded-md p-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !answerData.demographicData.find(
                      (d) => d.fieldId === field.id
                    )?.value && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {answerData.demographicData.find((d) => d.fieldId === field.id)
                    ?.value ? (
                    format(
                      new Date(
                        answerData.demographicData.find(
                          (d) => d.fieldId === field.id
                        )?.value as string
                      ),
                      'PPP'
                    )
                  ) : (
                    <span>{field.placeholder || 'Pick a date'}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={
                    answerData.demographicData.find((d) => d.fieldId === field.id)
                      ?.value
                      ? new Date(
                          answerData.demographicData.find(
                            (d) => d.fieldId === field.id
                          )?.value as string
                        )
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      // Konversi Date ke string ISO saat memilih tanggal
                      handleChange(field.id, date.toISOString());
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )
      case "dropdown":
        return (
          <Select
            value={(fieldValue as string) || ""}
            onValueChange={(value) => handleChange(field.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
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
        return (
          <RadioGroup
            value={(fieldValue as string) || ""}
            onValueChange={(value) => handleChange(field.id, value)}
            className="space-y-2"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                  {option}
                </label>
              </div>
            ))}
          </RadioGroup>
        )
      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => {
              const isChecked = Array.isArray(fieldValue) && fieldValue.includes(option)
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(fieldValue) ? [...fieldValue] : []
                      if (checked) {
                        handleChange(field.id, [...currentValues, option])
                      } else {
                        handleChange(
                          field.id,
                          currentValues.filter((v) => v !== option),
                        )
                      }
                    }}
                  />
                  <label htmlFor={`${field.id}-${option}`} className="text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              )
            })}
          </div>
        )
      default:
        return <Input type="text" className="w-full" />
    }
  }

  const renderQuestionField = (question: Question) => {
    const answerValue = answerData.answers.find((a) => a.questionId === question.id)?.value

    if (isLikertType(question.type)) {
      // Menggunakan utilitas untuk mendapatkan opsi berdasarkan tipe
      const likertOptions = getLikertOptions(question.type);
      const likertLabels = getLikertLabels(question.type);

      return (
        <div className="pt-2">
          <div className="flex justify-between mb-2 text-xs text-gray-500">
            <span>{likertLabels[1]}</span>
            <span>{likertLabels[likertOptions.length]}</span>
          </div>
          <div className={cn(
            "grid gap-2",
            likertOptions.length === 4 ? "grid-cols-4" : "grid-cols-6"
          )}>
            {likertOptions.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleAnswerChange(question.id, value)}
                className={cn(
                  "h-10 rounded-md border transition-all",
                  answerValue === value
                    ? "bg-primary text-white border-primary"
                    : "bg-white hover:bg-gray-50 border-gray-200",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )
    }

    switch (question.type) {
      case "text":
        return (
          <Textarea
            value={(answerValue as string) || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full"
            rows={3}
          />
        )
      case "dropdown":
        return (
          <Select
            value={(answerValue as string) || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "radio":
        return (
          <RadioGroup
            value={(answerValue as string) || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-2"
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                <label htmlFor={`${question.id}-${option}`} className="text-sm text-gray-700">
                  {option}
                </label>
              </div>
            ))}
          </RadioGroup>
        )
      case "checkbox":
        return (
          <div className="space-y-2">
            {question.options?.map((option) => {
              const isChecked = Array.isArray(answerValue) && answerValue.includes(option)
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${question.id}-${option}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(answerValue) ? [...answerValue] : []
                      if (checked) {
                        handleAnswerChange(question.id, [...currentValues, option])
                      } else {
                        handleAnswerChange(
                          question.id,
                          currentValues.filter((v) => v !== option),
                        )
                      }
                    }}
                  />
                  <label htmlFor={`${question.id}-${option}`} className="text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              )
            })}
          </div>
        )
      default:
        console.warn(`Tipe pertanyaan tidak didukung: ${question.type}`);
        return <div className="p-3 bg-red-100 text-red-800 rounded-md">Tipe pertanyaan "{question.type}" tidak didukung</div>
    }
  }

  const handleDemographicChange = (fieldId: string, value: string | number | string[]) => {
    setAnswerData((prev) => {
      const existingDataIndex = prev.demographicData.findIndex(
        (item) => item.fieldId === fieldId
      )

      if (existingDataIndex > -1) {
        const updatedDemographicData = [...prev.demographicData]
        updatedDemographicData[existingDataIndex] = {
          ...updatedDemographicData[existingDataIndex],
          value,
        }
        return {
          ...prev,
          demographicData: updatedDemographicData,
        }
      }

      return {
        ...prev,
        demographicData: [
          ...prev.demographicData,
          {
            fieldId,
            value,
          },
        ],
      }
    })

    if (formErrors[`demographic-${fieldId}`]) {
      setFormErrors((prev) => {
        const updated = { ...prev }
        delete updated[`demographic-${fieldId}`]
        return updated
      })
    }
  }

  const handleAnswerChange = (questionId: string, value: string | number | string[]) => {
    setAnswerData((prev) => {
      const existingAnswerIndex = prev.answers.findIndex((a) => a.questionId === questionId)
      if (existingAnswerIndex >= 0) {
        const updatedAnswers = [...prev.answers]
        updatedAnswers[existingAnswerIndex] = { questionId, value }
        return { ...prev, answers: updatedAnswers }
      } else {
        return {
          ...prev,
          answers: [...prev.answers, { questionId, value }],
        }
      }
    })

    if (formErrors[`question-${questionId}`]) {
      setFormErrors((prev) => {
        const updated = { ...prev }
        delete updated[`question-${questionId}`]
        return updated
      })
    }
  }

  const validateDemographicFields = (demographicFields: LocalDemographicField[]) => {
    const errors: { [key: string]: string } = {}
    demographicFields.forEach((field) => {
      if (field.required) {
        const demographicValue = answerData.demographicData.find(
          (d) => d.fieldId === field.id
        )?.value
        if (!demographicValue) {
          errors[`demographic-${field.id}`] = "Wajib diisi"
        }
      }
    })
    return errors
  }

  const validateCurrentStep = (): boolean => {
    const { currentStep } = surveyProgress;
    let newErrors: { [key: string]: string } = {};

    if (currentStep === 0) {
      // Step 0 tidak memerlukan validasi
      return true;
    } else if (currentStep === 1) {
      // Validasi fields demografi
      const demographicErrors = validateDemographicFields(
        currentSurvey.demographicFields.map(field => field as LocalDemographicField)
      );
      newErrors = demographicErrors;
    } else {
      // Validasi pertanyaan survey
      const indicatorIndex = currentStep - 2;
      const indicator = currentSurvey.indicators[indicatorIndex];

      if (indicator) {
        indicator.questions.forEach((question) => {
          if (question.required) {
            const value = answerData.answers.find((a) => a.questionId === question.id)?.value;
            if (!value || (Array.isArray(value) && value.length === 0) || value === "") {
              newErrors[`question-${question.id}`] = "Pertanyaan ini wajib dijawab";
            }
          }
        });
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return
    }

    const { currentStep, totalSteps } = surveyProgress

    saveResponseDraft({
      answers: answerData.answers,
      demographicData: answerData.demographicData,
    })

    let completedQuestions = 0
    currentSurvey.indicators.forEach((indicator) => {
      indicator.questions.forEach((question) => {
        if (answerData.answers.some((a) => a.questionId === question.id)) {
          completedQuestions += 1
        }
      })
    })

    if (currentStep === totalSteps - 1) {
      setConfirmSubmit(true)
      return
    }

    const nextStep = currentStep + 1
    updateSurveyProgress({
      currentStep: nextStep,
      completedQuestions,
    })
  }

  const handlePrev = () => {
    const { currentStep } = surveyProgress
    if (currentStep > 0) {
      updateSurveyProgress({
        currentStep: currentStep - 1,
      })
    }
  }

  const handleSaveDraft = () => {
    saveResponseDraft({
      answers: answerData.answers,
      demographicData: answerData.demographicData,
    })
    toast.success("Draft saved successfully")
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      await submitSurveyResponse({
        surveyId: currentSurvey.id,
        answers: answerData.answers,
        demographicData: answerData.demographicData,
        feedback: feedbackText,
      })

      setSurveyCompleted(true)
    } catch (error) {
      console.error("Error submitting response:", error)
      toast.error("Failed to submit response. Please try again.")
    } finally {
      setSubmitting(false)
      setConfirmSubmit(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-3xl border-0 shadow-subtle">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-500">
              Step {surveyProgress.currentStep + 1} of {surveyProgress.totalSteps}
            </div>
            <div className="text-sm font-medium text-gray-500">{surveyProgress.completionPercentage}% Complete</div>
          </div>
          <Progress value={surveyProgress.completionPercentage} className="h-1.5" />
        </div>

        {currentStepContent()}

        <CardFooter className="flex justify-between pt-4 pb-6 px-6 border-t">
          <div>
            {surveyProgress.currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handlePrev} disabled={submitting}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {surveyProgress.currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
            )}
            <Button type="button" onClick={handleNext} disabled={submitting}>
              {surveyProgress.currentStep === surveyProgress.totalSteps - 1 ? (
                "Finish"
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Your Response</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to submit your survey response. Would you like to add any additional feedback?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Any additional comments or feedback (optional)"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full"
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting} className="bg-primary">
              {submitting && (
                <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Submit Response
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TakeSurveyComponent
