'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getSurveyById } from '@/lib/supabase/client';
import RespondentsTable from '@/components/survey/RespondentsTable';

interface SurveyDashboardProps {
  params: {
    id: string;
  };
}

export default function SurveyDashboard({ params }: SurveyDashboardProps) {
  const { id } = params;
  const [surveyData, setSurveyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        setLoading(true);
        const data = await getSurveyById(id);
        setSurveyData(data);
      } catch (err) {
        console.error('Error fetching survey data:', err);
        setError('Gagal mengambil data survei. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [id]);

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Survei tidak ditemukan'}</p>
            <Button className="mt-4" variant="outline" asChild>
              <a href="/survey">Kembali ke Daftar Survei</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{surveyData.title}</h1>
          <p className="text-muted-foreground mt-1">{surveyData.description}</p>
        </div>
        <Button asChild>
          <a href={`/survey/editor/${id}`}>Edit Survei</a>
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`px-2 py-1 rounded ${surveyData.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {surveyData.is_active ? 'Aktif' : 'Tidak Aktif'}
        </span>
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">
          {surveyData.type === 'weighted' ? 'Berbobot' : 'Tidak Berbobot'}
        </span>
        <span>
          Dibuat: {new Date(surveyData.created_at).toLocaleDateString('id-ID')}
        </span>
        {surveyData.start_date && (
          <span>
            Periode: {new Date(surveyData.start_date).toLocaleDateString('id-ID')}
            {surveyData.end_date ? ` - ${new Date(surveyData.end_date).toLocaleDateString('id-ID')}` : ''}
          </span>
        )}
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Ringkasan</TabsTrigger>
          <TabsTrigger value="responses" className="flex-1">Data Responden</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Tidak Tersedia</CardTitle>
              <CardDescription>
                Komponen ResultsOverview mengharapkan data format khusus yang tidak tersedia langsung dari API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Silakan gunakan data responden untuk analisis data survei
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <RespondentsTable surveyId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
