"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BarChart3, Calendar, Edit, Eye, MoreHorizontal, Plus, Search, Trash2,
  Users, Share2, ExternalLink, Copy, ChevronDown, ChevronUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Layout from "@/components/Layout"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { useAdminAuth } from "@/context/AdminAuthContext"
import type { Survey } from "@/types"
import { cn } from "@/lib/utils"
import ClientOnly, { LoadingFallback } from "@/components/ClientOnly"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

const formatTanggal = (date: Date): string => {
  const bulanIndonesia = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const tanggal = date.getDate();
  const bulan = bulanIndonesia[date.getMonth()];
  const tahun = date.getFullYear();

  return `${tanggal} ${bulan} ${tahun}`;
};

const formatDate = (dateString?: string | Date | null): string => {
  if (!dateString) return 'Tanggal tidak tersedia';

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    // Periksa apakah tanggal valid
    if (isNaN(date.getTime())) return 'Tanggal tidak valid';

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return 'Tanggal tidak valid';
  }
};

const SurveyCardDetail = ({
  survey,
  onDelete,
  onToggleActive,
}: {
  survey: Survey
  onDelete: (id: string) => void
  onToggleActive: (id: string) => void
}) => {
  const { surveyResponses } = useSurvey()
  const responseCount = surveyResponses.filter((r) => r.surveyId === survey.id && r.isComplete).length
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)

  // Generate survei URL
  const surveyUrl = `/take-survey/${survey.id}`;
  const fullSurveyUrl = typeof window !== 'undefined' ? `${window.location.origin}${surveyUrl}` : surveyUrl;

  // Fungsi untuk menyalin URL survei ke clipboard
  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(fullSurveyUrl);
      toast.success("URL Survei disalin ke clipboard");
    }
  };

  // Fungsi untuk menyalin ID survei ke clipboard
  const copyIdToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(survey.id);
      toast.success("ID Survei disalin ke clipboard");
    }
  };

  // Fungsi untuk toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      key={survey.id}
      className="overflow-hidden border-0 shadow-subtle hover:shadow-md transition-all duration-300 group mb-4"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center flex-wrap gap-2">
              {survey.title}
            <Badge
              variant={survey.isActive ? "default" : "secondary"}
              className={cn(
                  "px-2 py-0.5 text-xs rounded-md",
                survey.isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-100",
              )}
            >
              {survey.isActive ? "Aktif" : "Tidak Aktif"}
            </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {survey.type === 'weighted' ? 'Berbobot' : 'Tidak Berbobot'}
              </Badge>
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-600 border-gray-200 cursor-pointer hover:bg-gray-100"
                onClick={copyIdToClipboard}
                title="Klik untuk menyalin ID"
              >
                ID: {survey.id.substring(0, 8)}...
                    </Badge>
            </CardTitle>
            <CardDescription className="mt-2">{survey.description}</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
              aria-label={isExpanded ? "Ciutkan detail survei" : "Tampilkan detail survei"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white rounded-md shadow-lg border border-gray-100">
                <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href={`/admin/surveys/${survey.id}/edit`} className="flex w-full items-center hover:text-blue-600 transition-colors">
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Survei</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/results/${survey.id}`} className="flex w-full items-center hover:text-blue-600 transition-colors">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Lihat Hasil</span>
                </Link>
              </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <button onClick={copyToClipboard} className="flex w-full items-center hover:text-blue-600 transition-colors">
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Salin URL Survei</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <button onClick={copyIdToClipboard} className="flex w-full items-center hover:text-blue-600 transition-colors">
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Salin ID Survei</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/take-survey/${survey.id}`} className="flex w-full items-center hover:text-blue-600 transition-colors" target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span>Buka Survei</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleActive(survey.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  survey.isActive
                    ? "text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                    : "text-green-600 focus:text-green-700 focus:bg-green-50"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <span>{survey.isActive ? "Nonaktifkan Survei" : "Aktifkan Survei"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(survey.id)}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer transition-colors"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Hapus Survei</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500">
          <div>Dibuat: {formatDate(survey?.createdAt)}</div>
          <div>•</div>
          <div>ID: <span
            className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs cursor-pointer hover:bg-gray-200 transition-colors"
            onClick={copyIdToClipboard}
            title="Klik untuk menyalin ID survei"
          >{survey.id}</span></div>
          <div>•</div>
          <div>Indikator: {survey.indicators?.length || 0}</div>
          <div>•</div>
          <div>
            Pertanyaan:{" "}
            {survey.indicators?.reduce((total, indicator) => total + (indicator.questions?.length || 0), 0) || 0}
          </div>
          <div>•</div>
          <div className="flex items-center">
            <Users className="mr-1 h-3.5 w-3.5" />
            <span>
              {responseCount} {responseCount === 1 ? "responden" : "responden"}
            </span>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Indikator dan Pertanyaan</h4>
              <div className="space-y-3">
                {survey.indicators && survey.indicators.length > 0 ? (
                  survey.indicators.map((indicator, index) => (
                    <div key={indicator.id} className="border rounded-md p-3">
                      <h5 className="font-medium flex items-center">
                        <span className="bg-gray-100 text-gray-700 w-6 h-6 inline-flex items-center justify-center rounded-full text-xs mr-2">
                          {index + 1}
                        </span>
                        {indicator.title}
                        {survey.type === 'weighted' && (
                          <Badge className="ml-2 bg-gray-50" variant="outline">
                            Bobot: {indicator.weight}
                          </Badge>
                        )}
                      </h5>
                      {indicator.questions && indicator.questions.length > 0 ? (
                        <div className="ml-8 mt-2 space-y-1">
                          {indicator.questions.map((question, qIndex) => (
                            <div key={question.id} className="text-sm flex">
                              <span className="text-gray-500 mr-2">{qIndex + 1}.</span>
                              <span>{question.text}</span>
                              {survey.type === 'weighted' && (
                                <Badge className="ml-2 bg-gray-50 text-xs" variant="outline">
                                  Bobot: {question.weight}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-8 mt-2 text-sm text-gray-500">
                          Tidak ada pertanyaan untuk indikator ini.
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada indikator untuk survei ini.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
        <div className="flex items-center space-x-3">
          <Link href={`/admin/surveys/${survey.id}/edit`}>
            <Button variant="outline" size="sm" className="text-sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Survei
            </Button>
          </Link>
          {responseCount > 0 && (
            <Link href={`/results/${survey.id}`}>
              <Button variant="default" size="sm" className="text-sm bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="mr-2 h-4 w-4" />
                Lihat Hasil
              </Button>
            </Link>
          )}
        </div>
        <Button
          onClick={() => onToggleActive(survey.id)}
          variant="ghost"
          size="sm"
          className={cn(
            "text-sm",
            survey.isActive
              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              : "text-green-600 hover:text-green-700 hover:bg-green-50"
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {survey.isActive ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function SurveyManagement() {
  const { adminData, isLoading: isAuthLoading, isAuthenticated } = useAdminAuth()
  const router = useRouter()
  const { surveys, deleteSurvey, toggleSurveyActive, listSurveys } = useSurvey()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [timeFrame, setTimeFrame] = useState("all")
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [surveyToDelete, setSurveyToDelete] = useState<string | null>(null)

  // Fungsi untuk me-refresh data survei - Pindahkan ke bagian atas sebelum kondisional
  const refreshSurveys = useCallback(async () => {
    try {
      console.log("Memuat daftar survei terbaru dari database...");
      await listSurveys();
      console.log("Daftar survei berhasil diperbarui");
    } catch (error) {
      console.error("Error saat memperbarui daftar survei:", error);
    }
  }, [listSurveys]);

  // Efek untuk me-refresh data survei saat komponen di-mount
  useEffect(() => {
    // Muat data survei saat halaman dibuka
    refreshSurveys();

    // Refresh data lagi setelah 1 detik untuk memastikan data terbaru
    const refreshTimeout = setTimeout(() => {
      refreshSurveys();
    }, 1000);

    return () => {
      clearTimeout(refreshTimeout);
    };
  }, [refreshSurveys]);

  // Redirect jika belum login atau bukan admin
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthLoading, isAuthenticated, router])

  const handleDeleteClick = (id: string) => {
    setSurveyToDelete(id)
    setShowDeleteAlert(true)
  }

  const confirmDelete = async () => {
    if (surveyToDelete) {
      await deleteSurvey(surveyToDelete)
      setShowDeleteAlert(false)
      setSurveyToDelete(null)
    }
  }

  // Jika masih loading, tampilkan indikator loading
  if (isAuthLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h2 className="text-xl">Memuat...</h2>
          </div>
        </div>
      </Layout>
    )
  }

  // Jika tidak autentikasi, jangan tampilkan apa-apa (akan di-redirect)
  if (!isAuthenticated) {
    return null
  }

  const filteredSurveys = surveys
    .filter((survey) => {
      // Filter berdasarkan pencarian
      const matchesSearch =
        searchTerm === "" ||
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchTerm.toLowerCase())

      // Filter berdasarkan status
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && survey.isActive) ||
        (statusFilter === "inactive" && !survey.isActive)

      // Filter berdasarkan waktu
      const matchesTimeFrame =
        timeFrame === "all" ||
        (timeFrame === "recent" &&
          new Date(survey.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)

      return matchesSearch && matchesStatus && matchesTimeFrame
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold">Manajemen Survei</h1>
          <div className="mt-4 md:mt-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
                <Button className="bg-primary">
              <Plus className="mr-2 h-4 w-4" />
              Buat Survei Baru
            </Button>
          </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Pilih Jenis Survei</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/surveys/create?type=unweighted">Survei Tanpa Bobot</Link>
            </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/surveys/create?type=weighted">Survei Dengan Bobot</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          </div>
      </div>

        <div className="bg-white shadow-subtle rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari survei..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-4">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
              <Select value={timeFrame} onValueChange={(value) => setTimeFrame(value as any)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="recent">30 Hari Terakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

        <ClientOnly fallback={<LoadingFallback />}>
          <>
            {filteredSurveys.length === 0 ? (
              <div className="bg-white shadow-subtle rounded-xl p-8 text-center">
                <h3 className="text-xl font-medium mb-2">Tidak ada survei yang ditemukan</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== "all" || timeFrame !== "all"
                    ? "Coba ubah filter pencarian Anda"
                    : "Buat survei baru untuk memulai"}
                </p>
                <Link href="/admin/surveys/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Survei Baru
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSurveys.map((survey) => (
                  <SurveyCardDetail
                    key={survey.id}
                    survey={survey}
                    onDelete={handleDeleteClick}
                    onToggleActive={toggleSurveyActive}
                  />
                ))}
            </div>
          )}
          </>
        </ClientOnly>
        </div>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Survei</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus survei ini? Tindakan ini tidak dapat dibatalkan dan semua data terkait
              akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}
