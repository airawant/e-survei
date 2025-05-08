"use client"

import React, { useState, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface QrCodeDisplayProps {
  url: string
}

const QrCodeDisplay = ({ url }: QrCodeDisplayProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    })
  }, [url])

  return (
    <div className="text-center p-6 space-y-6">
      <div className="mx-auto bg-white p-4 rounded-xl shadow-subtle max-w-xs">
        <QRCodeSVG value={url} size={200} level="H" includeMargin className="mx-auto" />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Scan this QR code or share the link:</p>
        <div className="flex items-center">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-l-md text-sm"
          />
          <Button onClick={handleCopyLink} variant="default" className="rounded-l-none">
            {copied ? "Copied!" : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default React.memo(QrCodeDisplay)

