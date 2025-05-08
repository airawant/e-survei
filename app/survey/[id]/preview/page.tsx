'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Copy, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  is_active: boolean;
}

export default function SurveyPreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [indicatorsCount, setIndicatorsCount] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);

  const surveyLink = typeof window !== 'undefined'
    ? `${window.location.origin}/respond/${params.id}`
    : '';

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', params.id)
          .single();

        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        // Count indicators and questions
        const { data: indicators, error: indicatorsError } = await supabase
          .from('indicators')
          .select(`
            id,
            questions (
              id
            )
          `)
          .eq('survey_id', params.id);

        if (indicatorsError) throw indicatorsError;

        setIndicatorsCount(indicators ? indicators.length : 0);
        const totalQuestions = indicators
          ? indicators.reduce((sum, indicator) =>
              sum + (indicator.questions ? indicator.questions.length : 0), 0)
          : 0;
        setQuestionsCount(totalQuestions);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id, supabase]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(surveyLink);
    toast.success('Link berhasil disalin');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!survey) {
    return <div>Survey not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push(`/survey/${params.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Survei
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pratinjau Survei: {survey.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">{survey.description}</p>

            <div className="flex flex-col md:flex-row md:justify-between gap-4">
              <div>
                <p className="font-medium">Tipe Survei:</p>
                <p className="text-muted-foreground">
                  {survey.type === 'weighted' ? 'Survei Berbobot' : 'Survei Tanpa Bobot'}
                </p>
              </div>
              <div>
                <p className="font-medium">Status:</p>
                <p className="text-muted-foreground">
                  {survey.is_active ? 'Aktif' : 'Tidak Aktif'}
                </p>
              </div>
              <div>
                <p className="font-medium">Jumlah Indikator:</p>
                <p className="text-muted-foreground">{indicatorsCount}</p>
              </div>
              <div>
                <p className="font-medium">Jumlah Pertanyaan:</p>
                <p className="text-muted-foreground">{questionsCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link Survei</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Bagikan link berikut kepada responden untuk mengisi survei:
          </p>

          <div className="flex space-x-2">
            <Input value={surveyLink} readOnly />
            <Button onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6">
            <Button
              className="w-full"
              onClick={() => window.open(surveyLink, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Buka Link Survei
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
