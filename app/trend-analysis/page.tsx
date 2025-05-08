'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useSurvey } from '@/context/SupabaseSurveyContext';
import TrendAnalysis from '@/components/survey/TrendAnalysis';
import Layout from '@/components/Layout';

export default function TrendAnalysisPage() {
  const { surveys, listSurveys, loading } = useSurvey();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
  const currentYear = new Date().getFullYear();
  const [years, setYears] = useState([currentYear - 1, currentYear]);
  const [periodType, setPeriodType] = useState<'year' | 'quarter' | 'semester'>('quarter');

  useEffect(() => {
    // Muat daftar survei jika belum dimuat
    if (surveys.length === 0) {
      listSurveys();
    }
  }, [surveys, listSurveys]);

  const handleSurveyChange = (value: string) => {
    setSelectedSurveyId(value);
  };

  const handlePeriodTypeChange = (value: string) => {
    setPeriodType(value as 'year' | 'quarter' | 'semester');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analisis Tren</h1>
            <p className="text-muted-foreground mt-1">Analisis perbandingan hasil survei antar periode</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Analisis</CardTitle>
            <CardDescription>Pilih survei dan periode waktu yang ingin dianalisis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pilih Survei</label>
                <Select value={selectedSurveyId} onValueChange={handleSurveyChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih survei untuk dianalisis" />
                  </SelectTrigger>
                  <SelectContent>
                    {surveys.map((survey) => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Jenis Periode</label>
                <Select value={periodType} onValueChange={handlePeriodTypeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih jenis periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Tahunan</SelectItem>
                    <SelectItem value="semester">Semester</SelectItem>
                    <SelectItem value="quarter">Kuartal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tahun</label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={years[0].toString()}
                    onValueChange={(value) => setYears([parseInt(value), years[1]])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tahun awal" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={(currentYear - 4 + i).toString()}>
                          {currentYear - 4 + i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span>sampai</span>

                  <Select
                    value={years[1].toString()}
                    onValueChange={(value) => setYears([years[0], parseInt(value)])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tahun akhir" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => (
                        <SelectItem key={i} value={(currentYear - 4 + i).toString()}>
                          {currentYear - 4 + i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {selectedSurveyId ? (
          <TrendAnalysis
            surveyId={selectedSurveyId}
            years={years}
            periodType={periodType}
          />
        ) : (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">
                Silakan pilih survei untuk melihat analisis tren
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
