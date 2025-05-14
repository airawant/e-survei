import { NextRequest, NextResponse } from 'next/server';
import { getResponsesBySurveyId } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    const { surveyId } = params;

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID tidak valid' },
        { status: 400 }
      );
    }

    console.log(`[API] Mengambil responden untuk survei ID: ${surveyId}`);

    // Ambil data responden dari Supabase
    const responses = await getResponsesBySurveyId(surveyId);

    console.log(`[API] Berhasil mengambil ${responses.length} responden`);

    // Return data dalam format JSON
    return NextResponse.json(responses);
  } catch (error) {
    console.error('[API] Error fetching survey responses:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data responden', details: String(error) },
      { status: 500 }
    );
  }
}
