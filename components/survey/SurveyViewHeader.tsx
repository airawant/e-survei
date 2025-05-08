"use client"

import React, { useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Edit, Eye, ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import QrCodeDisplay from "@/components/survey/QrCodeDisplay"

interface SurveyViewHeaderProps {
  id: string
  title: string
  totalQuestions: number
  isActive: boolean
  surveyUrl: string
  onBack: () => void
}

// Use React.memo to prevent unnecessary re-renders
const SurveyViewHeader = React.memo(
  ({ id, title, totalQuestions, isActive, surveyUrl, onBack }: SurveyViewHeaderProps) => {
    const [isOpen, setIsOpen] = useState(false)

    const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open)
    }, [])

    const handleBackClick = useCallback(() => {
      onBack()
    }, [onBack])

    return (
      <div className="border-b pb-5">
        <div className="flex justify-between items-start">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={handleBackClick} className="mb-1 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                <div className="flex items-center">
                  {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}
                </div>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    isActive
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100",
                  )}
                >
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Popover open={isOpen} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-medium">Share Survey</h3>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <Link
                      href={`/take-survey/${id}`}
                      target="_blank"
                      className="text-sm text-primary hover:underline flex items-center"
                    >
                      Preview
                      <Eye className="ml-1 h-3.5 w-3.5" />
                    </Link>
                    <a
                      href={surveyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline flex items-center"
                    >
                      Open in new tab
                      <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </div>
                  {isOpen && <QrCodeDisplay url={surveyUrl} />}
                </div>
              </PopoverContent>
            </Popover>
            <Link href={`/admin/surveys/${id}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit Survey
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  },
)

SurveyViewHeader.displayName = "SurveyViewHeader"

export default SurveyViewHeader
