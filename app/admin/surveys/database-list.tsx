"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash, FileText, ExternalLink, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { getAllSurveysWithDetails } from "@/lib/supabase/client";

// Definisi tipe data berdasarkan skema database yang ada
interface Question {
  id: string;
  text: string;
  weight?: number;
  indicatorId: string;
}

interface Indicator {
  id: string;
  title?: string;
  name?: string; // Untuk kompatibilitas dengan database
  description?: string;
  weight?: number;
  surveyId: string;
  questions?: Question[];
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  type: 'weighted' | 'unweighted';
  isActive: boolean;
  createdAt: string | Date;
  indicators?: Indicator[];
}

export default function SurveyDatabaseList() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSurveys, setExpandedSurveys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ambil data survei langsung dari database Supabase
      const surveysData = await getAllSurveysWithDetails();
      setSurveys(surveysData);

      console.log("Survei berhasil diambil dari database:", surveysData);
      toast.success("Data Survei Diperbarui", {
        description: "Data survei telah berhasil diambil dari database."
      });
    } catch (err) {
      console.error("Error fetching surveys:", err);
      setError("Gagal mengambil data survei. " + (err instanceof Error ? err.message : String(err)));
      toast.error("Error", {
        description: "Gagal mengambil data survei."
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (surveyId: string) => {
    setExpandedSurveys((prev) => ({
      ...prev,
      [surveyId]: !prev[surveyId],
    }));
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Data Survei dari Database</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchSurveys} disabled={loading}>
            {loading ? "Memuat..." : "Refresh"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Buat Survei
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Pilih Jenis Survei</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/surveys/new?type=weighted">Survei Berbobot</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/surveys/new?type=unweighted">Survei Tidak Berbobot</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center p-12 border border-dashed border-gray-300 rounded-lg">
          <h3 className="text-lg font-medium text-gray-600 mb-2">Belum ada survei</h3>
          <p className="text-gray-500 mb-6">Mulai dengan membuat survei baru untuk mengumpulkan umpan balik.</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Buat Survei
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Pilih Jenis Survei</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/surveys/new?type=weighted">Survei Berbobot</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/surveys/new?type=unweighted">Survei Tidak Berbobot</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="grid gap-6">
          {surveys.map((survey) => (
            <Card key={survey.id} className={`border ${survey.isActive ? "border-green-200" : "border-gray-200"}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center">
                      {survey.title}
                      {survey.isActive && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          Aktif
                        </Badge>
                      )}
                      {!survey.isActive && (
                        <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-500 border-gray-200">
                          Draft
                        </Badge>
                      )}
                      <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                        {survey.type === 'weighted' ? 'Berbobot' : 'Tidak Berbobot'}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">{survey.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpanded(survey.id)}
                      aria-label={
                        expandedSurveys[survey.id] ? "Ciutkan detail survei" : "Tampilkan detail survei"
                      }
                    >
                      {expandedSurveys[survey.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500">
                  <div>Dibuat: {formatDate(survey.createdAt)}</div>
                  <div>•</div>
                  <div>Indikator: {survey.indicators?.length || 0}</div>
                  <div>•</div>
                  <div>
                    Pertanyaan:{" "}
                    {survey.indicators?.reduce((total, indicator) => total + (indicator.questions?.length || 0), 0) || 0}
                  </div>
                </div>
              </CardHeader>
              {expandedSurveys[survey.id] && (
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
                                {indicator.title || indicator.name}
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
                          <p className="text-gray-500">Belum ada indikator yang ditambahkan.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
              <CardFooter className="pt-1 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-500">
                    ID: <code className="text-xs bg-gray-100 p-1 rounded">{survey.id}</code>
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/surveys/${survey.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/results?surveyId=${survey.id}`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Hasil
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/survey/${survey.id}`} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Buka Survei
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/survey/dashboard/${survey.id}`}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Survei</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus survei ini? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600"
                          onClick={() => {
                            // Aksi hapus
                            toast.success("Survei Dihapus", {
                              description: "Survei berhasil dihapus."
                            });
                          }}
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
