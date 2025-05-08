"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Clipboard, Copy, Mail, Share2, QrCode, Link2, Check, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Survey } from "@/lib/types"
import ClientOnly from "./ClientOnly"

interface ShareTabProps {
  surveyId: string
}

export default function ShareTab({ surveyId }: ShareTabProps) {
  const { surveys } = useSurvey()
  const [activeTab, setActiveTab] = useState<string>("link")
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({})
  const [sendEmail, setSendEmail] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [surveyUrl, setSurveyUrl] = useState("")

  // Get current survey
  const survey = surveys.find((s: Survey) => s.id === surveyId)

  // Set surveyUrl safely with useEffect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = `${window.location.protocol}//${window.location.host}`
      setSurveyUrl(`${baseUrl}/survey/${surveyId}`)
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

  const surveyTitle = survey.title

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Show success status
        setCopiedState({ ...copiedState, [key]: true })

        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedState({ ...copiedState, [key]: false })
        }, 2000)

        toast.success("Teks telah disalin ke clipboard")
      })
      .catch(err => {
        console.error('Failed to copy: ', err)
        toast.error("Terjadi kesalahan saat menyalin teks")
      })
  }

  const handleEmailSend = () => {
    const url = surveyUrl
    const subject = encodeURIComponent(emailSubject || `Undangan Survei: ${surveyTitle}`)
    const body = encodeURIComponent(emailMessage ? `${emailMessage}\n\n${url}` : `Anda diundang untuk mengisi survei: ${surveyTitle}\n\n${url}`)

    // Basic validation
    if (!emailRecipients.trim()) {
      toast.error("Masukkan setidaknya satu alamat email")
      return
    }

    // For multiple recipients, split by comma
    const recipients = emailRecipients.split(',').map(email => email.trim()).filter(Boolean)

    if (recipients.length === 0) {
      toast.error("Masukkan setidaknya satu alamat email yang valid")
      return
    }

    // Create mailto link
    const mailtoUrl = `mailto:${recipients.join(',')}?subject=${subject}&body=${body}`
    window.open(mailtoUrl)
  }

  const shareViaSocial = (platform: string) => {
    const url = surveyUrl
    const text = `Anda diundang untuk mengisi survei: ${surveyTitle}`

    let shareUrl = ''

    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        break
      default:
        toast.error("Platform berbagi ini belum didukung")
        return
    }

    window.open(shareUrl, '_blank')
  }

  const generateShareCode = () => {
    return `survey-${surveyId.substring(0, 8)}`
  }

  const embedCode = `<iframe src="${surveyUrl}?embed=true" width="100%" height="600" frameborder="0"></iframe>`

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bagikan Survei</h2>
      </div>

    <Card>
      <CardHeader>
          <CardTitle>Opsi Berbagi</CardTitle>
          <CardDescription>
            Bagikan survei melalui berbagai platform
          </CardDescription>
      </CardHeader>
      <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">
                <Link2 className="h-4 w-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="h-4 w-4 mr-2" />
                Kode QR
              </TabsTrigger>
              <TabsTrigger value="embed">
                <ExternalLink className="h-4 w-4 mr-2" />
                Sematkan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-6 mt-4">
              <ClientOnly>
                <div className="space-y-4">
          <div>
                    <Label>Link Survei</Label>
                    <div className="flex mt-1.5">
                      <Input value={surveyUrl} readOnly className="rounded-r-none" />
                      <Button
                        className="rounded-l-none"
                        onClick={() => copyToClipboard(surveyUrl, 'url')}
                        variant="secondary"
                      >
                        {copiedState['url'] ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copiedState['url'] ? 'Disalin' : 'Salin'}
              </Button>
            </div>
          </div>

          <div>
                    <Label>Kode Berbagi</Label>
                    <div className="flex mt-1.5">
                      <Input value={generateShareCode()} readOnly className="rounded-r-none" />
                      <Button
                        className="rounded-l-none"
                        onClick={() => copyToClipboard(generateShareCode(), 'code')}
                        variant="secondary"
                      >
                        {copiedState['code'] ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copiedState['code'] ? 'Disalin' : 'Salin'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Kode ini dapat dibagikan kepada responden untuk mengakses survei
                    </p>
                  </div>

                  <div className="pt-2">
                    <Label className="mb-2 block">Bagikan via Media Sosial</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => shareViaSocial('whatsapp')}>
                        WhatsApp
                      </Button>
                      <Button variant="outline" onClick={() => shareViaSocial('telegram')}>
                        Telegram
                      </Button>
                      <Button variant="outline" onClick={() => shareViaSocial('twitter')}>
                        Twitter
                      </Button>
                      <Button variant="outline" onClick={() => shareViaSocial('facebook')}>
                        Facebook
                      </Button>
                      <Button variant="outline" onClick={() => shareViaSocial('linkedin')}>
                        LinkedIn
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="email-option"
                      checked={sendEmail}
                      onCheckedChange={setSendEmail}
                    />
                    <Label htmlFor="email-option">Kirim via Email</Label>
                  </div>

                  {sendEmail && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-recipients">Alamat Email Penerima</Label>
                        <Input
                          id="email-recipients"
                          placeholder="email@contoh.com, email2@contoh.com"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          Pisahkan beberapa alamat email dengan koma
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-subject">Subjek Email</Label>
                        <Input
                          id="email-subject"
                          placeholder={`Undangan Survei: ${surveyTitle}`}
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-message">Pesan</Label>
                        <Textarea
                          id="email-message"
                          placeholder={`Anda diundang untuk mengisi survei: ${surveyTitle}`}
                          value={emailMessage}
                          onChange={(e) => setEmailMessage(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <Button onClick={handleEmailSend} className="w-full">
                        <Mail className="h-4 w-4 mr-2" />
                        Kirim Email
                  </Button>
                    </div>
                  )}
                </div>
              </ClientOnly>
            </TabsContent>

            <TabsContent value="qr" className="mt-4">
              <ClientOnly>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(surveyUrl)}`}
                      alt="QR Code untuk survei"
                      className="w-48 h-48"
                    />
              </div>

                  <div className="flex justify-center">
                    <Button onClick={() => {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(surveyUrl)}`
                      window.open(qrUrl, '_blank')
                    }}>
                      Unduh QR Code
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-500">
                    Kode QR ini dapat dipindai dengan kamera ponsel untuk membuka survei
              </div>
            </div>
              </ClientOnly>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4 mt-4">
              <ClientOnly>
                <div>
                  <Label>Kode Sematan</Label>
                  <div className="mt-1.5">
                    <div className="bg-gray-50 p-3 rounded-md font-mono text-xs">
                      {embedCode}
              </div>
                    <Button
                      className="mt-2"
                      onClick={() => copyToClipboard(embedCode, 'embed')}
                      variant="outline"
                      size="sm"
                    >
                      {copiedState['embed'] ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                      {copiedState['embed'] ? 'Disalin' : 'Salin Kode Sematan'}
              </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sematan kode ini ke situs web Anda untuk menampilkan survei langsung di halaman
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">Pratinjau</h3>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="w-full h-40 flex items-center justify-center border border-dashed">
                      <p className="text-gray-500 text-sm">Pratinjau tidak tersedia</p>
            </div>
          </div>
        </div>
              </ClientOnly>
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
    </div>
  )
}
