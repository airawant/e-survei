"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Plus, Trash2, MoveUp, MoveDown, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface DemographicsTabProps {
  surveyId: string
}

interface DemographicField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
  placeholder?: string
  [key: string]: any
}

export default function DemographicsTab({ surveyId }: DemographicsTabProps) {
  const { surveys, updateSurvey } = useSurvey()
  const [fields, setFields] = useState<DemographicField[]>([])
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Get current survey
  const survey = surveys.find(s => s.id === surveyId)

  // Initialize fields from survey data
  useEffect(() => {
    if (survey && survey.demographicFields) {
      setFields(survey.demographicFields)
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

  const handleAddField = () => {
    const newField: DemographicField = {
      id: `demo-${Date.now()}`,
      label: `Pertanyaan Demografi ${fields.length + 1}`,
      type: "text",
      required: true,
      placeholder: "",
      options: []
    }

    setFields([...fields, newField])
  }

  const handleRemoveField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId))
  }

  const handleUpdateField = (fieldId: string, key: string, value: any) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        return {
          ...field,
          [key]: value
        }
      }
      return field
    }))
  }

  const handleAddOption = (fieldId: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        const options = field.options || []
        return {
          ...field,
          options: [...options, `Opsi ${options.length + 1}`]
        }
      }
      return field
    }))
  }

  const handleUpdateOption = (fieldId: string, index: number, value: string) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        const options = [...(field.options || [])]
        options[index] = value
        return {
          ...field,
          options
        }
      }
      return field
    }))
  }

  const handleRemoveOption = (fieldId: string, index: number) => {
    setFields(fields.map(field => {
      if (field.id === fieldId) {
        const options = [...(field.options || [])]
        options.splice(index, 1)
        return {
          ...field,
          options
        }
      }
      return field
    }))
  }

  const moveFieldUp = (index: number) => {
    if (index === 0) return

    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[index - 1]
    newFields[index - 1] = temp

    setFields(newFields)
  }

  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return

    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[index + 1]
    newFields[index + 1] = temp

    setFields(newFields)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      // Validate fields
      const hasValidation = fields.every(field => {
        if (field.type === "select" || field.type === "multiple-choice") {
          return field.options && field.options.length > 0
        }
        return true
      })

      if (!hasValidation) {
        setSaveStatus({
          success: false,
          message: "Beberapa bidang pilihan tidak memiliki opsi"
        })
        setIsSaving(false)
        return
      }

      // Save to survey
      await updateSurvey(surveyId, {
        demographicFields: fields.map(field => ({
          ...field,
          options: field.options || []
        }))
      })

      setSaveStatus({
        success: true,
        message: "Data demografi berhasil disimpan"
      })

      setTimeout(() => {
        setSaveStatus(null)
      }, 3000)
    } catch (error) {
      console.error("Error saving demographics:", error)
      setSaveStatus({
        success: false,
        message: "Gagal menyimpan data demografi"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Data Demografi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tambahkan pertanyaan demografi untuk mengumpulkan informasi tambahan dari responden
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleAddField} variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Tambah Kolom
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan"}
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

      {fields.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-gray-500 mb-4">Belum ada kolom demografi dalam survei ini</p>
            <Button onClick={handleAddField} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Tambah Kolom Demografi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {index + 1}. {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveFieldUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8"
                    >
                      <MoveUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveFieldDown(index)}
                      disabled={index === fields.length - 1}
                      className="h-8 w-8"
                    >
                      <MoveDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(field.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Tipe: {getTypeLabel(field.type)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`field-label-${field.id}`}>Label Kolom</Label>
                    <Input
                      id={`field-label-${field.id}`}
                      value={field.label}
                      onChange={(e) => handleUpdateField(field.id, "label", e.target.value)}
                      placeholder="Label kolom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`field-type-${field.id}`}>Tipe Kolom</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => handleUpdateField(field.id, "type", value)}
                    >
                      <SelectTrigger id={`field-type-${field.id}`}>
                        <SelectValue placeholder="Pilih tipe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Teks Singkat</SelectItem>
                        <SelectItem value="textarea">Teks Panjang</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="select">Pilihan Dropdown</SelectItem>
                        <SelectItem value="multiple-choice">Pilihan Ganda</SelectItem>
                        <SelectItem value="date">Tanggal</SelectItem>
                        <SelectItem value="number">Angka</SelectItem>
                        <SelectItem value="phone">Nomor Telepon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      handleUpdateField(field.id, "required", Boolean(checked))
                    }
                  />
                  <Label htmlFor={`field-required-${field.id}`}>Wajib diisi</Label>
                </div>

                {(field.type === "text" || field.type === "textarea" || field.type === "email" || field.type === "number" || field.type === "phone") && (
                  <div className="space-y-2">
                    <Label htmlFor={`field-placeholder-${field.id}`}>Teks Placeholder</Label>
                    <Input
                      id={`field-placeholder-${field.id}`}
                      value={field.placeholder || ""}
                      onChange={(e) => handleUpdateField(field.id, "placeholder", e.target.value)}
                      placeholder="Teks placeholder"
                    />
                  </div>
                )}

                {(field.type === "select" || field.type === "multiple-choice") && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Opsi Pilihan</Label>
                      <Button
                        onClick={() => handleAddOption(field.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Tambah Opsi
                      </Button>
                    </div>

                    {(!field.options || field.options.length === 0) && (
                      <Alert className="bg-yellow-50 border-yellow-300">
                        <AlertCircle className="h-4 w-4 text-yellow-800" />
                        <AlertDescription className="text-yellow-800">
                          Tambahkan setidaknya satu opsi pilihan
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      {field.options && field.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <Input
                            value={option}
                            onChange={(e) => handleUpdateOption(field.id, optIndex, e.target.value)}
                            placeholder={`Opsi ${optIndex + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOption(field.id, optIndex)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    text: 'Teks Singkat',
    textarea: 'Teks Panjang',
    email: 'Email',
    select: 'Pilihan Dropdown',
    'multiple-choice': 'Pilihan Ganda',
    date: 'Tanggal',
    number: 'Angka',
    phone: 'Nomor Telepon'
  }

  return typeMap[type] || type
}
