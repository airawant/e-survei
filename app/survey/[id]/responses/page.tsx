'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Tipe data untuk Survey
interface Survey {
  id: string;
  title: string;
  type: 'weighted' | 'unweighted';
}

// Tipe data untuk Respondent
interface Respondent {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  responses: {
    id: string;
    created_at: string;
    answers: {
      id: string;
      question_id: string;
      score: number;
      text_answer: string | null;
    }[];
  }[];
}

// Fungsi untuk memformat tanggal
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Fungsi untuk menghitung rata-rata skor
const calculateAverageScore = (respondent: Respondent) => {
  if (!respondent.responses || respondent.responses.length === 0) return 0;

  const scores = respondent.responses.flatMap(response =>
    response.answers ? response.answers.map(answer => answer.score) : []
  );

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

export default function SurveyResponsesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);

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

        // Get all indicator IDs first
        const { data: indicators, error: indicatorError } = await supabase
          .from('indicators')
          .select('id')
          .eq('survey_id', params.id);

        if (indicatorError) throw indicatorError;

        if (indicators && indicators.length > 0) {
          const indicatorIds = indicators.map(indicator => indicator.id);

          // Count questions using the indicator IDs
          const { count, error: questionCountError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('indicator_id', indicatorIds);

          if (questionCountError) throw questionCountError;
          setTotalQuestions(count || 0);
        }

        // Fetch respondents
        const { data: respondentData, error: respondentError } = await supabase
          .from('respondents')
          .select(`
            id,
            name,
            email,
            phone,
            created_at,
            responses (
              id,
              created_at,
              answers (
                id,
                question_id,
                score,
                text_answer
              )
            )
          `)
          .eq('survey_id', params.id)
          .order('created_at', { ascending: false });

        if (respondentError) throw respondentError;
        setRespondents(respondentData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [params.id, supabase]);

  if (isLoading) return <div>Loading...</div>;
  if (!survey) return <div>Survey not found</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          <p className="text-muted-foreground">Daftar Responden</p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/survey/${params.id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Survei
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responden ({respondents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {respondents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Waktu Pengisian</TableHead>
                  <TableHead>Jawaban</TableHead>
                  <TableHead>Rata-rata Skor</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {respondents.map((respondent) => {
                  const answersCount = respondent.responses && respondent.responses[0]?.answers
                    ? respondent.responses[0].answers.length
                    : 0;
                  const avgScore = calculateAverageScore(respondent);

                  return (
                    <TableRow key={respondent.id}>
                      <TableCell className="font-medium">{respondent.name}</TableCell>
                      <TableCell>
                        {respondent.email && <div>{respondent.email}</div>}
                        {respondent.phone && <div>{respondent.phone}</div>}
                        {!respondent.email && !respondent.phone && <span>-</span>}
                      </TableCell>
                      <TableCell>{formatDate(respondent.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={answersCount === totalQuestions ? 'default' : 'outline'}>
                          {answersCount} / {totalQuestions}
                        </Badge>
                      </TableCell>
                      <TableCell>{avgScore.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/survey/${params.id}/responses/${respondent.id}`)}
                        >
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Belum ada responden yang mengisi survei ini.</p>
              <Button
                className="mt-4"
                onClick={() => router.push(`/survey/${params.id}/preview`)}
              >
                Bagikan Survei
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
