'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import IndicatorForm from '@/components/survey/IndicatorForm';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Survey {
  id: string;
  title: string;
  type: 'weighted' | 'unweighted';
}

export default function AddIndicatorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('id, title, type')
          .eq('id', params.id)
          .single();

        if (error) throw error;
        setSurvey(data);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSurvey();
  }, [params.id, supabase]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!survey) {
    return <div>Survey not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tambah Indikator untuk {survey.title}</h1>
        <Button variant="outline" onClick={() => router.push(`/survey/${survey.id}`)}>
          Kembali ke Survei
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Indikator Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <IndicatorForm
            surveyId={survey.id}
            isWeighted={survey.type === 'weighted'}
            onSuccess={() => router.push(`/survey/${survey.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
