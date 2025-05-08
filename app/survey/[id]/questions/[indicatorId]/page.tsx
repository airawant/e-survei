'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuestionForm from '@/components/survey/QuestionForm';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Survey {
  id: string;
  title: string;
  type: 'weighted' | 'unweighted';
}

interface Indicator {
  id: string;
  name: string;
}

export default function AddQuestionsPage({
  params
}: {
  params: { id: string; indicatorId: string }
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('id, title, type')
          .eq('id', params.id)
          .single();

        if (surveyError) throw surveyError;
        setSurvey(surveyData);

        // Fetch indicator
        const { data: indicatorData, error: indicatorError } = await supabase
          .from('indicators')
          .select('id, name')
          .eq('id', params.indicatorId)
          .single();

        if (indicatorError) throw indicatorError;
        setIndicator(indicatorData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id, params.indicatorId, supabase]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!survey || !indicator) {
    return <div>Data not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          <p className="text-lg text-muted-foreground">Indikator: {indicator.name}</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/survey/${survey.id}`)}>
          Kembali ke Survei
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Pertanyaan</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionForm
            indicatorId={indicator.id}
            surveyId={survey.id}
            isWeighted={survey.type === 'weighted'}
            onSuccess={() => router.push(`/survey/${survey.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
