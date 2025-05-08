"use client"

import React, { useCallback } from "react"
import { QrCode, Copy } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface ShareSurveyProps {
  surveyUrl: string
  title: string
}

const ShareSurvey = React.memo(({ surveyUrl, title }: ShareSurveyProps) => {
  const handleDownloadQrCode = useCallback(() => {
    toast.success("QR code download started")
  }, [])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(surveyUrl)
    toast.success("Link copied to clipboard")
  }, [surveyUrl])

  const handleCopyEmbedCode = useCallback(() => {
    navigator.clipboard.writeText(`<iframe src="${surveyUrl}" width="100%" height="600" frameborder="0"></iframe>`)
    toast.success("Embed code copied")
  }, [surveyUrl])

  const emailLink = `mailto:?subject=${encodeURIComponent(`Please take our survey: ${title}`)}&body=${encodeURIComponent(`We'd appreciate your feedback on our survey: ${surveyUrl}`)}`
  const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Take our survey: ${title}`)}&url=${encodeURIComponent(surveyUrl)}`
  const linkedinLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(surveyUrl)}`
  const embedCode = `<iframe src="${surveyUrl}" width="100%" height="600" frameborder="0"></iframe>`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Share Your Survey</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">QR Code</h3>
            <div className="bg-white p-6 rounded-xl shadow-subtle max-w-xs mx-auto">
              <QRCodeSVG value={surveyUrl} size={200} level="H" includeMargin className="mx-auto" />
            </div>
            <div className="text-center mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadQrCode} className="mx-auto">
                <QrCode className="mr-2 h-4 w-4" />
                Download QR Code
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Survey Link</h3>
            <div className="space-y-4">
              <p className="text-gray-600">Share this link with your audience to collect responses.</p>

              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-2">Direct Link:</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={surveyUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-l-md text-sm"
                  />
                  <Button onClick={handleCopyLink} variant="default" className="rounded-l-none">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <a href={emailLink} className="text-primary hover:underline text-sm">
                  Share via Email
                </a>

                <a href={twitterLink} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">
                  Share on Twitter
                </a>

                <a
                  href={linkedinLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Share on LinkedIn
                </a>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Embed in Website</h4>
              <p className="text-sm text-blue-700 mb-3">Use this HTML code to embed the survey on your website:</p>
              <div className="bg-white border border-blue-100 rounded p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                {embedCode}
              </div>
              <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-blue-700" onClick={handleCopyEmbedCode}>
                Copy code
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ShareSurvey.displayName = "ShareSurvey"

export default ShareSurvey

