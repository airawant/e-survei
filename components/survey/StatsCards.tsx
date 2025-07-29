"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ClipboardList, PieChart, Users, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSurvey } from "@/context/SupabaseSurveyContext"

export default function StatsCards() {
  const { surveys, surveyResponses } = useSurvey()

  const stats = [
    {
      name: "Total Survei",
      value: surveys.length,
      icon: ClipboardList,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      name: "Survei Aktif",
      value: surveys.filter((s: any) => s.isActive).length,
      icon: PieChart,
      color: "bg-green-50 text-green-600",
    },
    {
      name: "Total Respons",
      value: surveyResponses.length,
      icon: Users,
      color: "bg-teal-50 text-teal-600",
    },
    {
      name: "Rata-rata Kepuasan",
      value: surveyResponses.length ? "90.01%" : "N/A",
      icon: BarChart3,
      color: "bg-amber-50 text-amber-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <Card
          key={stat.name}
          className="overflow-hidden border-0 shadow-subtle transition-all duration-300 hover:shadow-md"
        >
          <CardContent className="p-6">
            <div className="flex items-start">
              <div className={cn("rounded-lg p-3", stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="ml-4">
                <h3 className="text-gray-500 text-sm font-medium">{stat.name}</h3>
                <div className="mt-1 text-2xl font-semibold text-gray-900">{stat.value}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
