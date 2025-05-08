"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ResultsOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Skor rata-rata */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Skeleton className="h-9 w-16 mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        {/* Card Total Respon */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Skeleton className="h-9 w-16 mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        {/* Card Indeks Kepuasan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Skeleton className="h-9 w-16 mr-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Distribusi Jawaban */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Indikator */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabel Pertanyaan */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <div className="grid grid-cols-[1fr_80px] md:grid-cols-[1fr_80px_100px_100px] py-3 px-4 border-b">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="hidden md:block h-4 w-16" />
              <Skeleton className="hidden md:block h-4 w-16" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px] md:grid-cols-[1fr_80px_100px_100px] py-3 px-4 border-b">
                <Skeleton className="h-4 w-full max-w-[400px]" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="hidden md:block h-4 w-12" />
                <Skeleton className="hidden md:block h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
