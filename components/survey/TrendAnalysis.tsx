'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { getSurveyTrends, getComparisonStatistics } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface TrendAnalysisProps {
  surveyId: string;
  years: number[];
  periodType: 'year' | 'quarter' | 'semester';
}

export default function TrendAnalysis({
  surveyId,
  years,
  periodType
}: TrendAnalysisProps) {
  const [trendData, setTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Siapkan periode berdasarkan tahun dan jenis periode
        const periods = [];

        if (periodType === 'year') {
          // Untuk analisis tahunan
          for (const year of years) {
            periods.push({ year });
          }
        } else if (periodType === 'quarter') {
          // Untuk analisis kuartalan
          for (const year of years) {
            for (let quarter = 1; quarter <= 4; quarter++) {
              periods.push({ year, quarter });
            }
          }
        } else if (periodType === 'semester') {
          // Untuk analisis semesteran
          for (const year of years) {
            for (let semester = 1; semester <= 2; semester++) {
              periods.push({ year, semester });
            }
          }
        }

        const data = await getComparisonStatistics(surveyId, periods);
        setTrendData(data);
      } catch (error) {
        console.error('Error fetching trend data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [surveyId, years, periodType]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analisis Tren</CardTitle>
          <CardDescription>Perbandingan hasil survei antar periode</CardDescription>
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

  if (!trendData || !trendData.periods || trendData.periods.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analisis Tren</CardTitle>
          <CardDescription>Perbandingan hasil survei antar periode</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Tidak ada data tren yang tersedia untuk periode yang dipilih.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Siapkan data untuk grafik batang keseluruhan
  const overallBarData = trendData.overall.map((item: any) => ({
    name: item.periodName,
    skor: parseFloat(item.score.toFixed(2)),
    ikm: parseFloat(item.ikm.toFixed(2)),
    responden: item.respondentCount
  }));

  // Siapkan data untuk grafik garis indikator
  const indicatorLineData = trendData.periods.map((period: string, index: number) => {
    const dataPoint: any = { name: period };

    trendData.indicators.forEach((indicator: any) => {
      if (indicator.scores[index]) {
        dataPoint[indicator.title] = parseFloat(indicator.scores[index].score.toFixed(2));
      }
    });

    return dataPoint;
  });

  // Fungsi untuk membuat warna acak untuk setiap indikator
  const getIndicatorColor = (index: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
      '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Analisis Tren</CardTitle>
        <CardDescription>Perbandingan hasil survei antar periode</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="chart">Grafik</TabsTrigger>
            <TabsTrigger value="table">Tabel</TabsTrigger>
            <TabsTrigger value="indicators">Per Indikator</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tren Skor Keseluruhan</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overallBarData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip
                      formatter={(value: any) => [value, 'Nilai']}
                      labelFormatter={(label) => `Periode: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="skor" name="Skor (Skala 1-5)" fill="#8884d8" />
                    <Bar dataKey="ikm" name="IKM (Skala 1-4)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tren Jumlah Responden</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overallBarData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [value, 'Jumlah']}
                      labelFormatter={(label) => `Periode: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="responden" name="Jumlah Responden" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Tren Per Indikator</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={indicatorLineData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip
                      formatter={(value: any) => [value, 'Skor']}
                      labelFormatter={(label) => `Periode: ${label}`}
                    />
                    <Legend />
                    {trendData.indicators.map((indicator: any, index: number) => (
                      <Line
                        key={indicator.id}
                        type="monotone"
                        dataKey={indicator.title}
                        stroke={getIndicatorColor(index)}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Tabel Skor Keseluruhan</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Skor Survei (1-5)</TableHead>
                    <TableHead className="text-right">IKM (1-4)</TableHead>
                    <TableHead className="text-right">Jumlah Responden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trendData.overall.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.periodName}</TableCell>
                      <TableCell className="text-right">{item.score.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.ikm.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.respondentCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="indicators" className="space-y-6">
            {trendData.indicators.map((indicator: any) => (
              <div key={indicator.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{indicator.title}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Skor (1-5)</TableHead>
                      <TableHead className="text-right">IKM (1-4)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicator.scores.map((score: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{score.periodName}</TableCell>
                        <TableCell className="text-right">{score.score.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{score.ikm.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={indicator.scores.map((score: any) => ({
                        name: score.periodName,
                        skor: parseFloat(score.score.toFixed(2)),
                        ikm: parseFloat(score.ikm.toFixed(2))
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="skor" name="Skor (Skala 1-5)" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="ikm" name="IKM (Skala 1-4)" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
