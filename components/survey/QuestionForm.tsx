"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface QuestionFormProps {
  indicatorId: string
  surveyId: string
  isWeighted: boolean
  onSuccess?: () => void
}

export default function QuestionForm({ indicatorId, surveyId, isWeighted, onSuccess }: QuestionFormProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [questions, setQuestions] = useState([
    {
      text: '',
      type: 'likert',
      weight: 1,
    },
  ])

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        type: 'likert',
        weight: 1,
      },
    ])
  }

  const handleQuestionChange = (index: number, field: string, value: string | number) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setQuestions(newQuestions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate that all questions have text
      const emptyQuestions = questions.some((q) => !q.text.trim())
      if (emptyQuestions) {
        toast.error('Semua pertanyaan harus diisi')
        setIsLoading(false)
        return
      }

      // Validate total weight if it's a weighted survey
      if (isWeighted) {
        const totalWeight = questions.reduce((sum, q) => sum + Number(q.weight), 0)
        if (totalWeight !== 100) {
          toast.error('Total bobot pertanyaan harus 100%')
          setIsLoading(false)
          return
        }
      }

      // Insert all questions
      const { data, error } = await supabase
        .from('questions')
        .insert(
          questions.map((q) => ({
            indicator_id: indicatorId,
            text: q.text,
            type: q.type,
            weight: isWeighted ? q.weight : 1,
          }))
        )
        .select()

      if (error) throw error

      toast.success('Pertanyaan berhasil ditambahkan')
      if (onSuccess) onSuccess()
      router.push(`/survey/${surveyId}`)
    } catch (error) {
      console.error('Error adding questions:', error)
      toast.error('Gagal menambahkan pertanyaan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={index} className="p-4 border rounded-md space-y-4">
            <div>
              <Label htmlFor={`question-${index}`}>Pertanyaan {index + 1}</Label>
              <Input
                id={`question-${index}`}
                value={question.text}
                onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                placeholder="Masukkan pertanyaan"
                required
              />
            </div>

            <div>
              <Label htmlFor={`type-${index}`}>Tipe Pertanyaan</Label>
              <Select
                value={question.type}
                onValueChange={(value) => handleQuestionChange(index, 'type', value)}
              >
                <SelectTrigger id={`type-${index}`}>
                  <SelectValue placeholder="Pilih tipe pertanyaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="likert">Skala Likert (1-5)</SelectItem>
                  <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                  <SelectItem value="text">Teks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isWeighted && (
              <div>
                <Label htmlFor={`weight-${index}`}>Bobot Pertanyaan (%)</Label>
                <Input
                  id={`weight-${index}`}
                  type="number"
                  min="1"
                  max="100"
                  value={question.weight}
                  onChange={(e) => handleQuestionChange(index, 'weight', Number(e.target.value))}
                  required
                />
              </div>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" onClick={handleAddQuestion}>
          Tambah Pertanyaan Lain
        </Button>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/survey/${surveyId}`)}
        >
          Batal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : 'Simpan Pertanyaan'}
        </Button>
      </div>
    </form>
  )
}
