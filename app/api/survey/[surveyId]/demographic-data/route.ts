import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { surveyId: string } }
) {
  try {
    const { surveyId } = params;
    const url = new URL(request.url);
    const periodeSurvei = url.searchParams.get('periodeSurvei');

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID tidak valid' },
        { status: 400 }
      );
    }

    console.log(`[API] Mengambil data demografis untuk survei ID: ${surveyId}`);
    
    // 1. Ambil semua field demografis untuk survei ini
    const { data: demographicFields, error: fieldsError } = await supabaseClient
      .from('demographic_fields')
      .select('*')
      .eq('survey_id', surveyId)
      .order('field_order', { ascending: true });

    if (fieldsError) {
      console.error('[API] Error fetching demographic fields:', fieldsError);
      return NextResponse.json(
        { error: 'Gagal mengambil data field demografis', details: fieldsError.message },
        { status: 500 }
      );
    }

    // Jika tidak ada field demografis, kembalikan array kosong
    if (!demographicFields || demographicFields.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Ambil semua respons untuk survei ini
    let responseQuery = supabaseClient
      .from('responses')
      .select('id, periode_survei')
      .eq('survey_id', surveyId);

    // Filter berdasarkan periode jika ada
    if (periodeSurvei) {
      responseQuery = responseQuery.eq('periode_survei', periodeSurvei);
    }

    const { data: responses, error: responsesError } = await responseQuery;

    if (responsesError) {
      console.error('[API] Error fetching responses:', responsesError);
      return NextResponse.json(
        { error: 'Gagal mengambil data respons', details: responsesError.message },
        { status: 500 }
      );
    }

    // Jika tidak ada respons, kembalikan field demografis tanpa data respons
    if (!responses || responses.length === 0) {
      return NextResponse.json({
        demographicFields,
        demographicResponses: []
      });
    }

    const responseIds = responses.map(r => r.id);

    // 3. Ambil semua respons demografis untuk respons yang sudah difilter
    const { data: demographicResponses, error: demographicResponsesError } = await supabaseClient
      .from('demographic_responses')
      .select('*')
      .in('response_id', responseIds);

    if (demographicResponsesError) {
      console.error('[API] Error fetching demographic responses:', demographicResponsesError);
      return NextResponse.json(
        { error: 'Gagal mengambil data respons demografis', details: demographicResponsesError.message },
        { status: 500 }
      );
    }

    // 4. Ambil data responden untuk mendapatkan informasi tambahan
    const { data: respondents, error: respondentsError } = await supabaseClient
      .from('respondents')
      .select('id, name, email, phone')
      .eq('survey_id', surveyId);

    if (respondentsError) {
      console.error('[API] Error fetching respondents:', respondentsError);
    }

    // Gabungkan data responden dengan respons
    const respondentMap = respondents ? respondents.reduce((map, r) => {
      map[r.id] = r;
      return map;
    }, {}) : {};

    // Kembalikan semua data yang diperlukan
    return NextResponse.json({
      demographicFields,
      demographicResponses,
      responses,
      respondents: respondentMap
    });
  } catch (error) {
    console.error('[API] Error fetching demographic data:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data demografis', details: String(error) },
      { status: 500 }
    );
  }
}