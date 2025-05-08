"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClipboardIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { Survey } from "@/lib/types"
import ClientOnly from "./ClientOnly"

interface SurveyOverviewTabProps {
  surveyId: string
}

export default function SurveyOverviewTab({ surveyId }: SurveyOverviewTabProps) {
  const { surveys, updateSurvey } = useSurvey()
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")

  // Get current survey
  const survey = surveys.find((s: Survey) => s.id === surveyId)

  // Set publicUrl safely with useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = `${window.location.protocol}//${window.location.host}`
      setPublicUrl(`${baseUrl}/survey/${surveyId}`)
    }
  }, [surveyId])

  if (!survey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Survei tidak ditemukan</p>
        </CardContent>
      </Card>
    )
  }

  const [title, setTitle] = useState(survey.title)
  const [description, setDescription] = useState(survey.description || "")
  const [isActive, setIsActive] = useState(survey.isActive || false)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      await updateSurvey(surveyId, {
        title,
        description,
        isActive,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error updating survey:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("URL salin ke clipboard!")
      })
      .catch(err => {
        console.error('Gagal menyalin: ', err)
      })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informasi Survei</CardTitle>
          <CardDescription>
            Detail dasar tentang survei
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Judul Survei</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul survei"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsikan survei ini"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            {/* Hapus seluruh bagian periode survei */}
            {/* <Label>Periode Survei</Label>
            <RadioGroup
              value={periodType}
              onValueChange={setPeriodType}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="period-daily" />
                <Label htmlFor="period-daily">Harian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="period-weekly" />
                <Label htmlFor="period-weekly">Mingguan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="period-monthly" />
                <Label htmlFor="period-monthly">Bulanan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quarterly" id="period-quarterly" />
                <Label htmlFor="period-quarterly">Kuartalan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="period-yearly" />
                <Label htmlFor="period-yearly">Tahunan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="period-custom" />
                <Label htmlFor="period-custom">Kustom</Label>
              </div>
            </RadioGroup> */}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="active-status"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-status">Aktifkan Survei</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">ID Survei</p>
              <p>{surveyId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">URL Publik</p>
              <ClientOnly>
                <div className="flex items-center">
                  <Input
                    value={publicUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
                    onClick={() => copyToClipboard(publicUrl)}
                  >
                    <ClipboardIcon className="h-4 w-4" />
                  </Button>
                </div>
              </ClientOnly>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Dibuat</p>
              <p>{survey.createdAt ? format(new Date(survey.createdAt), "dd MMM yyyy") : "-"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Terakhir Diperbarui</p>
              <p>{survey.updatedAt ? format(new Date(survey.updatedAt), "dd MMM yyyy") : "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>

      {saveSuccess && (
        <Alert className="bg-green-50 border-green-300">
          <AlertDescription className="text-green-700">
            Berhasil menyimpan perubahan.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
