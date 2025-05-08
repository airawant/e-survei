'use client';

import SurveyForm from '@/components/survey/SurveyForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewSurveyPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Buat Survei Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <SurveyForm />
        </CardContent>
      </Card>
    </div>
  );
}
