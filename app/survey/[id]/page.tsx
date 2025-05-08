'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { PlusCircle, Users, Eye } from 'lucide-react';

// Tipe data untuk komponen
interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface Indicator {
  id: string;
  name: string;
  description: string;
  weight: number;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  type: string;
  weight: number;
}

// Fungsi untuk memformat tanggal
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

export default function SurveyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondentCount, setRespondentCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Mengambil data survei
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', params.id)
          .single();

        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        // Mengambil data indikator dan pertanyaan
        const { data: indicatorData, error: indicatorError } = await supabase
          .from('indicators')
          .select(`
            id,
            name,
            description,
            weight,
            questions (
              id,
              text,
              type,
              weight
            )
          `)
          .eq('survey_id', params.id)
          .order('name', { ascending: true });

        if (indicatorError) throw indicatorError;
        setIndicators(indicatorData || []);

        // Hitung jumlah responden
        const { count, error: countError } = await supabase
          .from('respondents')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', params.id);

        if (countError) throw countError;
        setRespondentCount(count || 0);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id, supabase]);

  if (isLoading) return <div>Loading...</div>;
  if (!survey) return <div>Survey not found</div>;

  // Render informasi survei
  const renderSurveyInfo = () => (
    <Card>
      <CardHeader>
        <CardTitle>Informasi Survei</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-4">
          <div>
            <dt className="font-medium text-muted-foreground">Deskripsi</dt>
            <dd>{survey.description || '-'}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="font-medium text-muted-foreground">Tanggal Mulai</dt>
              <dd>{formatDate(survey.start_date)}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Tanggal Selesai</dt>
              <dd>{formatDate(survey.end_date)}</dd>
            </div>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Jumlah Responden</dt>
            <dd>{respondentCount}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );

  // Render aksi survei
  const renderSurveyActions = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Aksi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            className="w-full"
            onClick={() => router.push(`/survey/${survey.id}/indicators`)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Indikator
          </Button>

          {indicators.length > 0 && (
            <>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push(`/survey/${survey.id}/preview`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Pratinjau Survei
              </Button>

              <Button
                className="w-full"
                variant={respondentCount > 0 ? "default" : "outline"}
                onClick={() => router.push(`/survey/${survey.id}/responses`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Lihat Responden{respondentCount > 0 ? ` (${respondentCount})` : ''}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render indikator dan pertanyaan
  const renderIndicatorsAndQuestions = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Indikator dan Pertanyaan</h2>
      {indicators.map((indicator) => (
        <Card key={indicator.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{indicator.name}</CardTitle>
              {survey.type === 'weighted' && (
                <p className="text-sm text-muted-foreground">Bobot: {indicator.weight}%</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/survey/${survey.id}/questions/${indicator.id}`)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Pertanyaan
            </Button>
          </CardHeader>
          <CardContent>
            {indicator.description && (
              <p className="mb-4 text-muted-foreground">{indicator.description}</p>
            )}

            {indicator.questions && indicator.questions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">Daftar Pertanyaan:</h3>
                <div className="border rounded-md divide-y">
                  {indicator.questions.map((question, index) => (
                    <div key={question.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <p>
                          <span className="font-medium">{index + 1}. </span>
                          {question.text}
                        </p>
                        {survey.type === 'weighted' && (
                          <Badge variant="outline">{question.weight}%</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tipe: {question.type === 'likert' ? 'Skala Likert (1-5)' :
                          question.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Teks'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Belum ada pertanyaan. Tambahkan pertanyaan untuk indikator ini.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render empty indicators message
  const renderEmptyIndicators = () => (
    <Card>
      <CardContent className="py-6">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Belum ada indikator yang ditambahkan</p>
          <Button
            onClick={() => router.push(`/survey/${survey.id}/indicators`)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Indikator Pertama
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={survey.type === 'weighted' ? 'default' : 'outline'}>
              {survey.type === 'weighted' ? 'Survei Berbobot' : 'Survei Tanpa Bobot'}
            </Badge>
            <Badge variant={survey.is_active ? 'default' : 'destructive'}>
              {survey.is_active ? 'Aktif' : 'Tidak Aktif'}
            </Badge>
          </div>
        </div>
        <Button onClick={() => router.push('/survey')}>
          Kembali
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {renderSurveyInfo()}
        {renderSurveyActions()}
      </div>

      {indicators.length > 0 ? renderIndicatorsAndQuestions() : renderEmptyIndicators()}
    </div>
  );
}
