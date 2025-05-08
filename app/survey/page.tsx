'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { PlusCircle, Calendar, Users } from 'lucide-react';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  // Additional calculated properties
  indicators_count: number;
  questions_count: number;
}

interface Indicator {
  id: string;
  questions: { id: string }[];
}

export default function SurveysPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Menjadikan fetchSurveys sebagai fungsi callback agar dapat dipanggil ulang
  const fetchSurveys = useCallback(async () => {
    console.log("Memuat daftar survei terbaru...");
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          indicators:indicators(
            id,
            questions:questions(id)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include counts
      const transformedData = data.map((survey: any) => {
        const indicatorsCount = survey.indicators ? survey.indicators.length : 0;
        const questionsCount = survey.indicators ?
          survey.indicators.reduce((sum: number, indicator: Indicator) =>
            sum + (indicator.questions ? indicator.questions.length : 0), 0) : 0;

        return {
          ...survey,
          indicators_count: indicatorsCount,
          questions_count: questionsCount,
        };
      });

      setSurveys(transformedData);
      console.log(`Berhasil memuat ${transformedData.length} survei`);
    } catch (error) {
      console.error('Error fetching surveys:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Efek untuk memuat survei saat komponen di-mount dan setiap kali navigasi ke halaman ini
  useEffect(() => {
    // Muat data survei saat awal render
    fetchSurveys();

    // Refresh data setelah 1 detik untuk memastikan data yang baru dibuat/diubah sudah terekam di database
    const refreshTimeout = setTimeout(() => {
      fetchSurveys();
    }, 1000);

    // Setup listener untuk event navigasi
    const handleRouteChange = () => {
      console.log("Navigasi terdeteksi, memperbarui data survei...");
      fetchSurveys();
    };

    // Tidak ada API resmi untuk event router.beforePopState di Next.js App Router
    // Sebagai alternatif, gunakan setTimeout di useEffect dengan dependency []

    return () => {
      clearTimeout(refreshTimeout);
    };
  }, [fetchSurveys]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar Survei</h1>
        <Button onClick={() => router.push('/survey/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Buat Survei Baru
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : surveys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <Card key={survey.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{survey.title}</CardTitle>
                  <Badge variant={survey.is_active ? 'default' : 'destructive'}>
                    {survey.is_active ? 'Aktif' : 'Tidak Aktif'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {survey.description || 'Tidak ada deskripsi'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={survey.type === 'weighted' ? 'default' : 'outline'}>
                      {survey.type === 'weighted' ? 'Survei Berbobot' : 'Survei Tanpa Bobot'}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      Dibuat: {formatDate(survey.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{survey.start_date ? formatDate(survey.start_date) : 'Belum dijadwalkan'}</span>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{survey.indicators_count} Indikator, {survey.questions_count} Pertanyaan</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push(`/survey/${survey.id}`)}
                  >
                    Lihat Detail
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">Belum ada survei yang dibuat</p>
              <Button onClick={() => router.push('/survey/new')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Survei Pertama
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
