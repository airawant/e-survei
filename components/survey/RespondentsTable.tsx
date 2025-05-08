"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Download, ArrowUpDown, ChevronRight, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getResponsesBySurveyId } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RespondentsTableProps {
  surveyId: string;
}

interface Respondent {
  id: string;
  survey_id: string;
  created_at: string;
  respondent?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    periode_survei?: string;
  };
  answers?: Array<{
    id: string;
    question_id: string;
    score: number;
    question?: {
      id: string;
      text: string;
    };
  }>;
  periode_survei?: string;
  average_score?: number;
}

export default function RespondentsTable({ surveyId }: RespondentsTableProps) {
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [filteredRespondents, setFilteredRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [averageScore, setAverageScore] = useState<number | null>(null);
  // State untuk menyimpan ID responden yang sedang expanded
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // State untuk filter periode
  const [periodOptions, setPeriodOptions] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Fungsi untuk toggle expand/collapse baris
  const toggleRowExpanded = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // Fungsi untuk mengambil data responden
  const fetchRespondents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/survey/${surveyId}/responses`);

      if (!response.ok) {
        throw new Error('Gagal mengambil data responden');
      }

      const data = await response.json();

      // Proses data untuk menampilkan info yang diperlukan
      const processedData = data.map((item: any) => {
        // Hitung skor rata-rata jika ada jawaban
        let avgScore = 0;
        if (item.answers && item.answers.length > 0) {
          const totalScore = item.answers.reduce((acc: number, curr: any) => {
            return acc + (typeof curr.score === 'number' ? curr.score : 0);
          }, 0);
          avgScore = totalScore / item.answers.length;
        }

        return {
          ...item,
          periode_survei: item.respondent?.periode_survei || 'Tidak disetel',
          average_score: avgScore
        };
      });

      setRespondents(processedData);

      // Ekstrak semua periode unik untuk filter dropdown
      const uniquePeriods = [...new Set(processedData.map((item: Respondent) =>
        item.periode_survei || 'Tidak disetel'
      ))] as string[];
      setPeriodOptions(uniquePeriods.sort());

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mengambil data hanya dijalankan sekali saat komponen dimuat
  useEffect(() => {
    fetchRespondents();
  }, [surveyId]);

  // Filter dan sort respondents berdasarkan search term dan periode
  useEffect(() => {
    let results = [...respondents];

    // Filter berdasarkan periode yang dipilih
    if (selectedPeriod !== 'all') {
      results = results.filter(r => r.periode_survei === selectedPeriod);
    }

    // Filter berdasarkan search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.respondent?.name?.toLowerCase().includes(lowerSearchTerm) ||
        r.respondent?.email?.toLowerCase().includes(lowerSearchTerm) ||
        r.respondent?.phone?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Sort berdasarkan field yang dipilih
    if (sortConfig.key) {
      results.sort((a, b) => {
        if (sortConfig.key === 'name') {
          const nameA = (a.respondent?.name || '').toLowerCase();
          const nameB = (b.respondent?.name || '').toLowerCase();
          return sortConfig.direction === 'asc'
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        } else if (sortConfig.key === 'created_at') {
          return sortConfig.direction === 'asc'
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortConfig.key === 'average_score') {
          const scoreA = a.average_score || 0;
          const scoreB = b.average_score || 0;
          return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        } else if (sortConfig.key === 'periode_survei') {
          const periodA = a.periode_survei || '';
          const periodB = b.periode_survei || '';
          return sortConfig.direction === 'asc'
            ? periodA.localeCompare(periodB)
            : periodB.localeCompare(periodA);
        }
        return 0;
      });
    }

    setFilteredRespondents(results);
  }, [respondents, searchTerm, sortConfig, selectedPeriod]);

  const toggleSort = (field: 'created_at' | 'name' | 'average_score' | 'periode_survei') => {
    if (field === sortConfig.key) {
      setSortConfig({ ...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setSortConfig({ key: field, direction: 'desc' });
    }
  };

  const exportCSV = () => {
    if (filteredRespondents.length === 0) return;

    const headers = ['No', 'Nama', 'Email', 'Telepon', 'Periode Survei', 'Tanggal Submit', 'Skor Rata-rata'];

    const csvData = filteredRespondents.map((respondent, index) => {
      const name = respondent.respondent?.name || '-';
      const email = respondent.respondent?.email || '-';
      const phone = respondent.respondent?.phone || '-';
      const periode = respondent.periode_survei || 'Tidak disetel';
      const date = format(new Date(respondent.created_at), 'dd/MM/yyyy', { locale: id });
      const score = typeof respondent.average_score === 'number'
        ? respondent.average_score.toFixed(2)
        : '-';

      return [index + 1, name, email, phone, periode, date, score];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `responden-survey-${surveyId}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fungsi untuk menampilkan detail pertanyaan dan jawaban responden
  const renderAnswerDetails = (respondent: Respondent) => {
    if (!respondent.answers || respondent.answers.length === 0) {
      return (
        <div className="py-2 px-4 text-muted-foreground">
          Tidak ada data jawaban untuk responden ini.
        </div>
      );
    }

    return (
      <div className="py-3 px-4 bg-muted/5">
        <h4 className="font-medium mb-2 text-sm">Detail Jawaban dari {respondent.respondent?.name || "Responden"}</h4>
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-12 text-xs font-medium text-muted-foreground mb-1">
            <div className="col-span-1">No</div>
            <div className="col-span-7">Pertanyaan</div>
            <div className="col-span-2 text-center">Skor</div>
            <div className="col-span-2 text-center">Kategori</div>
          </div>
          {respondent.answers.map((answer, idx) => {
            // Kategori skor
            const scoreCategory =
              answer.score >= 5 ? "Sangat Memuaskan" :
              answer.score >= 4 ? "Memuaskan" :
              answer.score >= 3 ? "Cukup Memuaskan" :
              answer.score >= 2 ? "Kurang Memuaskan" :
              answer.score >= 1 ? "Tidak Memuaskan" : "Sangat Tidak Memuaskan";

            // Warna berdasarkan skor
            const scoreColor =
              answer.score >= 5 ? "text-green-600" :
              answer.score >= 4 ? "text-green-500" :
              answer.score >= 3 ? "text-yellow-500" :
              answer.score >= 2 ? "text-orange-500" : "text-red-500";

            return (
              <div key={answer.id} className={`grid grid-cols-12 text-sm py-2 ${idx % 2 === 0 ? 'bg-muted/10' : ''} rounded-md`}>
                <div className="col-span-1 text-xs">{idx + 1}</div>
                <div className="col-span-7">{answer.question?.text || "Pertanyaan tidak tersedia"}</div>
                <div className={`col-span-2 text-center font-medium ${scoreColor}`}>{answer.score}</div>
                <div className={`col-span-2 text-center text-xs ${scoreColor}`}>{scoreCategory}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Data Responden</CardTitle>
          <CardDescription>Memuat data responden...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Responden</CardTitle>
        <CardDescription>
          {respondents.length} responden telah mengisi survei ini
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan nama atau email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="w-full md:w-64">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Periode: {selectedPeriod === 'all' ? 'Semua' : selectedPeriod}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => setSelectedPeriod('all')}>
                  Semua Periode
                </DropdownMenuItem>
                {periodOptions.map(period => (
                  <DropdownMenuItem
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="outline" onClick={exportCSV} disabled={filteredRespondents.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {respondents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Belum ada responden yang mengisi survei ini.
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 font-medium" onClick={() => toggleSort('name')}>
                      Nama / Email
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 font-medium" onClick={() => toggleSort('periode_survei')}>
                      Periode Survei
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 font-medium" onClick={() => toggleSort('created_at')}>
                      Tanggal Submit
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" className="p-0 font-medium" onClick={() => toggleSort('average_score')}>
                      Skor Rata-rata
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRespondents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Tidak ada hasil yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRespondents.map((respondent, index) => (
                    <React.Fragment key={respondent.id}>
                      <TableRow className={expandedRows.has(respondent.id) ? "bg-muted/20" : ""}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRowExpanded(respondent.id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedRows.has(respondent.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{respondent.respondent?.name || 'Anonim'}</div>
                        <div className="text-sm text-muted-foreground">
                          {respondent.respondent?.email || respondent.respondent?.phone || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {respondent.periode_survei || 'Tidak disetel'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(respondent.created_at), 'dd MMMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof respondent.average_score === 'number'
                          ? respondent.average_score.toFixed(2)
                          : '-'}
                      </TableCell>
                    </TableRow>
                      {expandedRows.has(respondent.id) && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 border-t-0">
                            {renderAnswerDetails(respondent)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          {filteredRespondents.length > 0 && (
            <p>Menampilkan {filteredRespondents.length} dari {respondents.length} responden</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
