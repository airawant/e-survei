'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getSurveyDetailedStatistics } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface DetailedCalculationProps {
  surveyId: string;
  year?: number;
  quarter?: number;
  semester?: number;
  startDate?: string;
  endDate?: string;
}

export default function DetailedCalculation({
  surveyId,
  year,
  quarter,
  semester,
  startDate,
  endDate
}: DetailedCalculationProps) {
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const options = {
          year,
          quarter,
          semester,
          startDate,
          endDate
        };

        // Hanya sertakan properti yang ada nilainya
        const filteredOptions = Object.fromEntries(
          Object.entries(options).filter(([_, v]) => v !== undefined)
        );

        const data = await getSurveyDetailedStatistics(surveyId, filteredOptions);
        setDetailedStats(data);

        // Set indikator default yang dipilih
        if (data.indicators && data.indicators.length > 0) {
          setSelectedIndicator(data.indicators[0].indicatorId);
        }
      } catch (error) {
        console.error('Error fetching detailed statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [surveyId, year, quarter, semester, startDate, endDate]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Detail Perhitungan IKM</CardTitle>
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

  if (!detailedStats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Detail Perhitungan IKM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Tidak dapat memuat data perhitungan. Silakan coba lagi nanti.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mendapatkan indikator yang dipilih
  const selectedIndicatorData = selectedIndicator
    ? detailedStats.indicators.find((ind: any) => ind.indicatorId === selectedIndicator)
    : null;

  // Fungsi untuk mendapatkan warna berdasarkan skor
  function getColorByScore(score: number) {
    if (isNaN(score) || score < 1) return "bg-gray-200";
    if (score < 1.75) return "bg-red-500";
    if (score < 2.51) return "bg-yellow-500";
    if (score < 3.26) return "bg-blue-500";
    return "bg-green-500";
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Detail Perhitungan IKM</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Ringkasan</TabsTrigger>
            <TabsTrigger value="indicator">Per Indikator</TabsTrigger>
            <TabsTrigger value="formula">Rumus Perhitungan</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">Jenis Survey</h3>
                  <p>{detailedStats.isWeighted ? 'Berbobot' : 'Tidak Berbobot'}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">Jumlah Responden</h3>
                  <p className="text-2xl font-bold">{detailedStats.respondentCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">Jumlah Pertanyaan</h3>
                  <p className="text-2xl font-bold">{detailedStats.totalQuestions || 0}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold mb-2">Total Skor</h3>
                  <p className="text-2xl font-bold">{detailedStats.totalScore || 0}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-2">Indeks Kepuasan Masyarakat (IKM)</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Progress
                      value={detailedStats.averageScore ? (detailedStats.averageScore / 5) * 100 : 0}
                      className="h-4"
                    />
                  </div>
                  <p className="text-2xl font-bold">
                    {detailedStats.averageScore ? detailedStats.averageScore.toFixed(2) : '0.00'} / 5.00
                  </p>
                </div>
                <div className="mt-4">
                  <p className="font-semibold">Skala IKM: {detailedStats.ikm?.toFixed(2) || '0.00'} / 4.00</p>
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    <div className={`h-2 rounded ${detailedStats.ikm >= 1 ? 'bg-red-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 rounded ${detailedStats.ikm >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 rounded ${detailedStats.ikm >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
                    <div className={`h-2 rounded ${detailedStats.ikm >= 4 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                  </div>
                  <div className="grid grid-cols-4 text-xs mt-1">
                    <div className="text-center">Tidak Baik</div>
                    <div className="text-center">Kurang Baik</div>
                    <div className="text-center">Baik</div>
                    <div className="text-center">Sangat Baik</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                  <p><span className="font-semibold">Rumus Perhitungan:</span> {detailedStats.calculationDetails?.formula}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="indicator" className="space-y-4">
            <div className="mb-4">
              <Select
                value={selectedIndicator || ''}
                onValueChange={setSelectedIndicator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Indikator" />
                </SelectTrigger>
                <SelectContent>
                  {detailedStats.indicators.map((ind: any) => (
                    <SelectItem key={ind.indicatorId} value={ind.indicatorId}>
                      {ind.indicatorTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIndicatorData && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="text-lg font-semibold">{selectedIndicatorData.indicatorTitle}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Jumlah Responden (n)</p>
                      <p className="text-xl font-semibold">
                        {selectedIndicatorData.calculationDetails?.totalRespondents || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Jumlah Pertanyaan (p)</p>
                      <p className="text-xl font-semibold">
                        {selectedIndicatorData.calculationDetails?.totalQuestions || 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Total Skor (S)</p>
                    <p className="text-xl font-semibold">
                      {typeof selectedIndicatorData.calculationDetails?.rawTotalScore === 'number'
                        ? selectedIndicatorData.calculationDetails.rawTotalScore.toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Skor Rata-rata</p>
                    <div className="flex items-center space-x-2">
                      <Progress
                        value={selectedIndicatorData.score ? (selectedIndicatorData.score / 5) * 100 : 0}
                        className={`h-3 ${getColorByScore(selectedIndicatorData.score)}`}
                      />
                      <p className="font-bold">{selectedIndicatorData.score !== undefined ? selectedIndicatorData.score.toFixed(2) : "0.00"}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                    <p className="font-semibold">Rumus:</p>
                    <p>
                      {selectedIndicatorData.calculationDetails?.formula}
                      {!detailedStats.isWeighted && (
                        <span> = {typeof selectedIndicatorData.calculationDetails?.rawTotalScore === 'number'
                          ? selectedIndicatorData.calculationDetails.rawTotalScore.toFixed(2)
                          : '0.00'} ÷ ({selectedIndicatorData.calculationDetails?.totalRespondents || 0} × {selectedIndicatorData.calculationDetails?.totalQuestions || 0}) = {selectedIndicatorData.score !== undefined ? selectedIndicatorData.score.toFixed(2) : "0.00"}</span>
                      )}
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pertanyaan</TableHead>
                      <TableHead className="text-right">Skor Rata-rata</TableHead>
                      <TableHead className="text-right">Jumlah Responden</TableHead>
                      {detailedStats.isWeighted && (
                        <TableHead className="text-right">Bobot</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedIndicatorData.questions.map((q: any) => (
                      <TableRow key={q.questionId}>
                        <TableCell>{q.questionText}</TableCell>
                        <TableCell className="text-right">{q.averageScore !== undefined ? q.averageScore.toFixed(2) : "0.00"}</TableCell>
                        <TableCell className="text-right">{q.responseCount}</TableCell>
                        {detailedStats.isWeighted && (
                          <TableCell className="text-right">{q.weight}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="formula" className="space-y-4">
            <div className="rounded-lg border p-6">
              <h3 className="text-xl font-semibold mb-4">Rumus Perhitungan IKM</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2 text-lg">Survey Tidak Berbobot</h4>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="mb-2"><span className="font-medium">Rumus:</span> Indeks Kepuasan = S / (n × p)</p>
                    <p className="mb-1">Dimana:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>S = Total skor seluruh jawaban</li>
                      <li>n = Jumlah responden</li>
                      <li>p = Jumlah pertanyaan</li>
                    </ul>
                    <p className="mt-2 italic text-sm">Contoh: Jika total skor 250, jumlah responden 10, dan jumlah pertanyaan 5, maka Indeks Kepuasan = 250 / (10 × 5) = 250 / 50 = 5.0</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-lg">Survey Berbobot</h4>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="mb-2"><span className="font-medium">Rumus:</span> Indeks Kepuasan = Σ(Wi × Si) / ΣWi</p>
                    <p className="mb-1">Dimana:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Wi = Bobot indikator/pertanyaan ke-i</li>
                      <li>Si = Skor rata-rata indikator/pertanyaan ke-i</li>
                      <li>ΣWi = Total bobot indikator/pertanyaan</li>
                    </ul>
                    <p className="mt-2 italic text-sm">Contoh: Jika terdapat 2 indikator dengan bobot 60% dan 40%, dengan skor rata-rata 4.2 dan 3.5, maka Indeks Kepuasan = (0.6 × 4.2 + 0.4 × 3.5) / (0.6 + 0.4) = (2.52 + 1.4) / 1 = 3.92</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-lg">Konversi ke Skala IKM (1-4)</h4>
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="mb-2"><span className="font-medium">Rumus:</span> IKM = (Score × 0.75) + 0.25</p>
                    <p className="mt-2 italic text-sm">Contoh: Jika skor rata-rata adalah 3.5, maka IKM = (3.5 × 0.75) + 0.25 = 2.625 + 0.25 = 2.875 ≈ 2.88</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-lg">Interpretasi Skala IKM</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rentang Nilai</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Interpretasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>1.00 - 1.75</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>D</span>
                          </div>
                        </TableCell>
                        <TableCell>Tidak Baik</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1.76 - 2.50</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span>C</span>
                          </div>
                        </TableCell>
                        <TableCell>Kurang Baik</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>2.51 - 3.25</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span>B</span>
                          </div>
                        </TableCell>
                        <TableCell>Baik</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>3.26 - 4.00</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span>A</span>
                          </div>
                        </TableCell>
                        <TableCell>Sangat Baik</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
