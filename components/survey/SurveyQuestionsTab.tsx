"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, MoveUp, MoveDown, GripVertical, AlertCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { v4 as uuidv4 } from "uuid"

interface SurveyQuestionsTabProps {
  surveyId: string
}

interface Indicator {
  id: string
  title: string
  description: string
  weight: number
  questions: Question[]
  [key: string]: any
}

interface Question {
  id: string
  text: string
  description?: string
  type: string
  required: boolean
  options: string[]
  weight: number
  order: number
  [key: string]: any
}

export default function SurveyQuestionsTab({ surveyId }: SurveyQuestionsTabProps) {
  const { surveys, updateSurvey } = useSurvey()
  const [activeTab, setActiveTab] = useState<string>("indicator-1")
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Get current survey
  const survey = surveys.find((s: any) => s.id === surveyId)

  // Initialize indicators from survey data
  useEffect(() => {
    if (survey && survey.indicators) {
      // Konversi data API agar sesuai dengan interface lokal
      const normalizedIndicators = survey.indicators.map(indicator => ({
        ...indicator,
        description: indicator.description || "",
        questions: indicator.questions.map(question => ({
          ...question,
          description: (question as any).description ?? "",
          options: question.options ?? [],
          order: question.order || 0
        }))
      }));

      setIndicators(normalizedIndicators);

      // Set active tab to first indicator if exists
      if (survey.indicators.length > 0) {
        setActiveTab(`indicator-${survey.indicators[0].id}`)
      }
    }
  }, [survey])

  if (!survey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Survei tidak ditemukan</p>
        </CardContent>
      </Card>
    )
  }

  const handleAddIndicator = () => {
    const newIndicator: Indicator = {
      id: `ind-${Date.now()}`,
      title: `Indikator Baru ${indicators.length + 1}`,
      description: "",
      weight: 1,
      questions: []
    }

    const newIndicators = [...indicators, newIndicator]
    setIndicators(newIndicators)
    setActiveTab(`indicator-${newIndicator.id}`)
  }

  const handleRemoveIndicator = (indicatorId: string) => {
    const filteredIndicators = indicators.filter(ind => ind.id !== indicatorId)
    setIndicators(filteredIndicators)

    // Set active tab to first available indicator
    if (filteredIndicators.length > 0) {
      setActiveTab(`indicator-${filteredIndicators[0].id}`)
    }
  }

  const handleAddQuestion = (indicatorId: string) => {
    const updatedIndicators = [...indicators]
    const indicator = updatedIndicators.find(ind => ind.id === indicatorId)

    if (indicator) {
      const questions = [...indicator.questions]
      const newQuestionOrder = questions.length // gunakan jumlah pertanyaan saat ini sebagai nilai order

      questions.push({
        id: uuidv4(),
        text: "",
        description: "",
        type: "likert-4",
        required: true,
        options: [],
        weight: 1,
        order: newQuestionOrder // tambahkan field order dengan nilai yang benar
      })

      indicator.questions = questions
      setIndicators(updatedIndicators)
    }
  }

  const handleRemoveQuestion = (indicatorId: string, questionId: string) => {
    const updatedIndicators = indicators.map(ind => {
      if (ind.id === indicatorId) {
        return {
          ...ind,
          questions: ind.questions.filter(q => q.id !== questionId)
        }
      }
      return ind
    })

    setIndicators(updatedIndicators)
  }

  const handleUpdateIndicator = (indicatorId: string, field: string, value: any) => {
    const updatedIndicators = indicators.map(ind => {
      if (ind.id === indicatorId) {
        const updatedValue = field === "description" && (value === undefined || value === null) ? "" : value;
        return {
          ...ind,
          [field]: updatedValue
        }
      }
      return ind
    })

    setIndicators(updatedIndicators)
  }

  const handleUpdateQuestion = (indicatorId: string, questionId: string, field: string, value: any) => {
    const updatedIndicators = indicators.map(ind => {
      if (ind.id === indicatorId) {
        return {
          ...ind,
          questions: ind.questions.map(q => {
            if (q.id === questionId) {
              const updatedValue = (field === "description" || field === "options") && (value === undefined || value === null)
                ? (field === "options" ? [] : "")
                : value;

              return {
                ...q,
                [field]: updatedValue
              }
            }
            return q
          })
        }
      }
      return ind
    })

    setIndicators(updatedIndicators)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      // Save to survey
      await updateSurvey(surveyId, {
        indicators
      })

      setSaveStatus({
        success: true,
        message: "Pertanyaan berhasil disimpan"
      })

      setTimeout(() => {
        setSaveStatus(null)
      }, 3000)
    } catch (error) {
      console.error("Error saving questions:", error)
      setSaveStatus({
        success: false,
        message: "Gagal menyimpan pertanyaan"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const moveQuestionUp = (indicatorId: string, questionIndex: number) => {
    if (questionIndex === 0) return

    const updatedIndicators = [...indicators]
    const indicator = updatedIndicators.find(ind => ind.id === indicatorId)

    if (indicator) {
      const questions = [...indicator.questions]

      // Tukar posisi pertanyaan
      const temp = questions[questionIndex]
      questions[questionIndex] = questions[questionIndex - 1]
      questions[questionIndex - 1] = temp

      // Perbarui nilai order untuk mencerminkan urutan baru
      if (questions[questionIndex].order !== undefined && questions[questionIndex - 1].order !== undefined) {
        const tempOrder = questions[questionIndex].order
        questions[questionIndex].order = questions[questionIndex - 1].order
        questions[questionIndex - 1].order = tempOrder
      } else {
        // Jika nilai order belum ada, tetapkan berdasarkan indeks baru
        questions.forEach((q, idx) => {
          q.order = idx
        })
      }

      indicator.questions = questions
      setIndicators(updatedIndicators)
    }
  }

  const moveQuestionDown = (indicatorId: string, questionIndex: number) => {
    const indicator = indicators.find(ind => ind.id === indicatorId)
    if (!indicator || questionIndex >= indicator.questions.length - 1) return

    const updatedIndicators = [...indicators]
    const indicatorToUpdate = updatedIndicators.find(ind => ind.id === indicatorId)

    if (indicatorToUpdate) {
      const questions = [...indicatorToUpdate.questions]

      // Tukar posisi pertanyaan
      const temp = questions[questionIndex]
      questions[questionIndex] = questions[questionIndex + 1]
      questions[questionIndex + 1] = temp

      // Perbarui nilai order untuk mencerminkan urutan baru
      if (questions[questionIndex].order !== undefined && questions[questionIndex + 1].order !== undefined) {
        const tempOrder = questions[questionIndex].order
        questions[questionIndex].order = questions[questionIndex + 1].order
        questions[questionIndex + 1].order = tempOrder
      } else {
        // Jika nilai order belum ada, tetapkan berdasarkan indeks baru
        questions.forEach((q, idx) => {
          q.order = idx
        })
      }

      indicatorToUpdate.questions = questions
      setIndicators(updatedIndicators)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Pertanyaan Survei</h2>
        <div className="flex space-x-2">
          <Button onClick={handleAddIndicator}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Indikator
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Pertanyaan"}
          </Button>
        </div>
      </div>

      {saveStatus && (
        <Alert
          className={saveStatus.success ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}
        >
          <AlertDescription className={saveStatus.success ? "text-green-700" : "text-red-700"}>
            {saveStatus.message}
          </AlertDescription>
        </Alert>
      )}

      {indicators.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-gray-500 mb-4">Belum ada indikator dalam survei ini</p>
            <Button onClick={handleAddIndicator}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Indikator Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex flex-wrap">
            {indicators.map((indicator, index) => (
              <TabsTrigger
                key={indicator.id}
                value={`indicator-${indicator.id}`}
                className="relative group"
              >
                {indicator.title}
                {indicators.length > 1 && (
                  <div
                    className="h-6 w-6 absolute -right-3 -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveIndicator(indicator.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {indicators.map((indicator) => (
            <TabsContent
              key={indicator.id}
              value={`indicator-${indicator.id}`}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Konfigurasi Indikator</CardTitle>
                  <CardDescription>
                    Data dasar untuk indikator ini
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`indicator-title-${indicator.id}`}>Judul Indikator</Label>
                      <Input
                        id={`indicator-title-${indicator.id}`}
                        value={indicator.title}
                        onChange={(e) => handleUpdateIndicator(indicator.id, "title", e.target.value)}
                        placeholder="Judul indikator"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`indicator-desc-${indicator.id}`}>Deskripsi (opsional)</Label>
                    <Textarea
                      id={`indicator-desc-${indicator.id}`}
                      value={indicator.description || ""}
                      onChange={(e) => handleUpdateIndicator(indicator.id, "description", e.target.value)}
                      placeholder="Deskripsi indikator"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Daftar Pertanyaan</h3>
                <Button onClick={() => handleAddQuestion(indicator.id)} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Pertanyaan
                </Button>
              </div>

              {indicator.questions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 mb-4">Belum ada pertanyaan untuk indikator ini</p>
                    <Button onClick={() => handleAddQuestion(indicator.id)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah Pertanyaan
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" defaultValue={indicator.questions.map((_, i) => `question-${i}`)} className="space-y-2">
                  {indicator.questions.map((question, index) => (
                    <AccordionItem key={question.id} value={`question-${index}`} className="border rounded-lg">
                      <div className="flex items-center px-4 py-2 bg-gray-50 rounded-t-lg">
                        <GripVertical className="h-5 w-5 text-gray-400 mr-1" />
                        <AccordionTrigger className="hover:no-underline py-0">
                          <div className="flex-1 text-left">
                            Pertanyaan {index + 1}: {question.text}
                          </div>
                        </AccordionTrigger>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveQuestionUp(indicator.id, index)
                            }}
                            disabled={index === 0}
                            className="h-8 w-8"
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveQuestionDown(indicator.id, index)
                            }}
                            disabled={index === indicator.questions.length - 1}
                            className="h-8 w-8"
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveQuestion(indicator.id, question.id)
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent className="px-4 py-3">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`question-text-${question.id}`}>Teks Pertanyaan</Label>
                            <Input
                              id={`question-text-${question.id}`}
                              value={question.text}
                              onChange={(e) => handleUpdateQuestion(indicator.id, question.id, "text", e.target.value)}
                              placeholder="Teks pertanyaan"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`question-desc-${question.id}`}>Deskripsi/Petunjuk (opsional)</Label>
                            <Textarea
                              id={`question-desc-${question.id}`}
                              value={question.description || ""}
                              onChange={(e) => handleUpdateQuestion(indicator.id, question.id, "description", e.target.value)}
                              placeholder="Deskripsi atau petunjuk untuk pertanyaan"
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`question-type-${question.id}`}>Tipe Pertanyaan</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) => handleUpdateQuestion(indicator.id, question.id, "type", value)}
                              >
                                <SelectTrigger id={`question-type-${question.id}`}>
                                  <SelectValue placeholder="Pilih tipe" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="likert-4">Skala Likert (1-4)</SelectItem>
                                  <SelectItem value="likert-6">Skala Likert (1-6)</SelectItem>
                                  <SelectItem value="multiple-choice">Pilihan Ganda</SelectItem>
                                  <SelectItem value="text">Teks</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`question-required-${question.id}`}>Wajib Diisi</Label>
                              <Select
                                value={question.required ? "yes" : "no"}
                                onValueChange={(value) => handleUpdateQuestion(indicator.id, question.id, "required", value === "yes")}
                              >
                                <SelectTrigger id={`question-required-${question.id}`}>
                                  <SelectValue placeholder="Pilih opsi" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="yes">Ya</SelectItem>
                                  <SelectItem value="no">Tidak</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Only show question weight field if survey type is weighted */}
                            {survey.type === 'weighted' && (
                              <div className="space-y-2">
                                <Label htmlFor={`question-weight-${question.id}`}>Bobot Pertanyaan</Label>
                                <Input
                                  id={`question-weight-${question.id}`}
                                  type="number"
                                  min="1"
                                  value={question.weight || 1}
                                  onChange={(e) => handleUpdateQuestion(indicator.id, question.id, "weight", parseInt(e.target.value) || 1)}
                                  placeholder="Bobot pertanyaan"
                                />
                                <p className="text-xs text-gray-500">
                                  Nilai relatif dalam indikator ini.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
