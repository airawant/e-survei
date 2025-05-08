'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Survey {
  id: string;
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
}

interface Indicator {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface RespondentData {
  name: string;
  email: string;
  phone: string;
}

interface RespondentRecord {
  id: string;
  survey_id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ResponseRecord {
  id: string;
  survey_id: string;
  respondent_id: string;
}

export default function RespondSurveyPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [respondent, setRespondent] = useState<RespondentData>({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    async function fetchSurvey() {
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
            questions (
              id,
              text,
              type
            )
          `)
          .eq('survey_id', params.id)
          .order('created_at', { ascending: true });

        if (indicatorError) throw indicatorError;
        setIndicators(indicatorData || []);
      } catch (error) {
        console.error('Error fetching survey:', error);
        toast.error('Gagal memuat survey');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSurvey();
  }, [params.id, supabase]);

  const handleAnswerChange = (questionId: string, value: number | string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleRespondentDataChange = (field: keyof RespondentData, value: string) => {
    setRespondent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validasi data responden
      if (!respondent.name.trim()) {
        toast.error('Nama responden harus diisi');
        setIsSubmitting(false);
        return;
      }

      // Validasi jawaban
      const allQuestions = indicators.flatMap((indicator) => indicator.questions);
      const unansweredQuestions = allQuestions.filter((question) => !answers[question.id]);

      if (unansweredQuestions.length > 0) {
        toast.error('Semua pertanyaan harus dijawab');
        setIsSubmitting(false);
        return;
      }

      // 1. Simpan data responden
      const { data: respondentRecord, error: respondentError } = await supabase
        .from('respondents')
        .insert([
          {
            survey_id: params.id,
            name: respondent.name,
            email: respondent.email || null,
            phone: respondent.phone || null,
          },
        ])
        .select()
        .single();

      if (respondentError) throw respondentError;

      // 2. Simpan data response
      const { data: responseRecord, error: responseError } = await supabase
        .from('responses')
        .insert([
          {
            survey_id: params.id,
            respondent_id: respondentRecord.id,
          },
        ])
        .select()
        .single();

      if (responseError) throw responseError;

      // 3. Simpan data jawaban
      const answersToInsert = allQuestions.map((question) => ({
        response_id: responseRecord.id,
        question_id: question.id,
        score: question.type === 'likert' ? Number(answers[question.id]) : 0,
        text_answer: question.type !== 'likert' ? String(answers[question.id]) : null,
      }));

      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert);

      if (answersError) throw answersError;

      toast.success('Terima kasih! Jawaban Anda berhasil disimpan');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Gagal menyimpan jawaban');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p>Memuat survei...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p>Survei tidak ditemukan</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Terima Kasih!</CardTitle>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <p className="mb-8">Jawaban Anda telah berhasil disimpan.</p>
            <Button onClick={() => window.location.reload()}>Isi Survei Lagi</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">{survey.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {survey.description && (
            <p className="text-center mb-4 text-muted-foreground">{survey.description}</p>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Data Responden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nama <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={respondent.name}
                onChange={(e) => handleRespondentDataChange('name', e.target.value)}
                placeholder="Masukkan nama Anda"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={respondent.email}
                onChange={(e) => handleRespondentDataChange('email', e.target.value)}
                placeholder="Masukkan email Anda (opsional)"
              />
            </div>
            <div>
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                value={respondent.phone}
                onChange={(e) => handleRespondentDataChange('phone', e.target.value)}
                placeholder="Masukkan nomor telepon Anda (opsional)"
              />
            </div>
          </CardContent>
        </Card>

        {indicators.map((indicator) => (
          <Card key={indicator.id} className="mb-8">
            <CardHeader>
              <CardTitle>{indicator.name}</CardTitle>
              {indicator.description && (
                <p className="text-muted-foreground">{indicator.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {indicator.questions.map((question, qIndex) => (
                <div key={question.id} className="space-y-2">
                  <Label>
                    {qIndex + 1}. {question.text} <span className="text-destructive">*</span>
                  </Label>

                  {question.type === 'likert' ? (
                    <RadioGroup
                      value={answers[question.id]?.toString()}
                      onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                      className="flex flex-col sm:flex-row justify-between pt-2"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <div key={value} className="flex items-center space-x-2">
                          <RadioGroupItem value={value.toString()} id={`q-${question.id}-${value}`} />
                          <Label htmlFor={`q-${question.id}-${value}`}>{value}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : question.type === 'text' ? (
                    <Textarea
                      value={answers[question.id]?.toString() || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Masukkan jawaban Anda"
                    />
                  ) : (
                    <Input
                      value={answers[question.id]?.toString() || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Masukkan jawaban Anda"
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-center">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Kirim Jawaban'}
          </Button>
        </div>
      </form>
    </div>
  );
}
