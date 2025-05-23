"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart3, CalendarDays, CalendarIcon, ExternalLink, Search, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Layout from "@/components/Layout"
import ClientOnly, { LoadingFallback } from "@/components/ClientOnly"
import { useSurvey } from "@/context/SupabaseSurveyContext"
import { Survey } from "@/types"

const formatTanggal = (date: Date): string => {
  const bulanIndonesia = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const tanggal = date.getDate();
  const bulan = bulanIndonesia[date.getMonth()];
  const tahun = date.getFullYear();

  return `${tanggal} ${bulan} ${tahun}`;
};

// Fungsi untuk memformat tampilan periode
const formatPeriodeSurvei = (survey: Survey): string => {
  // Tambahkan logging untuk debugging lebih detail
  console.log("Periode survei yang akan diformat (detail):", {
    period: survey.period,
    type: survey.period?.type,
    year: survey.period?.year,
    period_value: survey.period?.value, // Nilai period baru dari database
    quarterType: survey.period?.quarter ? typeof survey.period.quarter : 'undefined',
    semesterType: survey.period?.semester ? typeof survey.period.semester : 'undefined'
  });

  if (!survey.period) return 'Periode tidak tersedia';

  const { type, year } = survey.period;

  // Nilai period dari database diakses langsung
  const periodValue = survey.period.value;

  // Validasi tambahan untuk memastikan semua nilai yang diperlukan tersedia
  if (!type || !year) {
    console.log("Tipe periode atau tahun tidak tersedia", { type, year });
    return 'Periode tidak lengkap';
  }

  // Gunakan nilai period dari database langsung
  if (periodValue) {
    console.log(`Menggunakan nilai period langsung dari database: ${periodValue}`);

    // Handle kasus untuk format periode
    if (type === 'quarterly') {
      // Ekstrak nomor quarter dari nilai (Q1, Q2, Q3, Q4)
      let quarterNum = periodValue.replace('Q', '');

      // Validasi quarterNum (pastikan antara 1-4)
      if (!['1', '2', '3', '4'].includes(quarterNum)) {
        console.log(`PERINGATAN: Nilai kuartal tidak valid (${quarterNum}), menggunakan Q1`);
        quarterNum = '1';
      }

      // Format dengan bahasa Indonesia: "Triwulan 3 2025"
      return `Triwulan ${quarterNum} ${year}`;
    }
    else if (type === 'semester') {
      // Ekstrak nomor semester dari nilai (S1, S2)
      let semesterNum = periodValue.replace('S', '');

      // Validasi semesterNum (pastikan 1 atau 2)
      if (!['1', '2'].includes(semesterNum)) {
        console.log(`PERINGATAN: Nilai semester tidak valid (${semesterNum}), menggunakan S1`);
        semesterNum = '1';
      }

      // Format dengan bahasa Indonesia: "Semester 1 2025"
      return `Semester ${semesterNum} ${year}`;
    }
    else if (type === 'annual') {
      return `Tahun ${year}`;
    }
  }

  // Fallback ke logika lama jika nilai period tidak tersedia
  console.log("Nilai period tidak tersedia dari database, menggunakan fallback");

  // Handle kasus khusus ketika periode adalah 'quarterly' tetapi kuartal tidak didefinisikan
  if (type === 'quarterly') {
    // Default ke kuartal 1 jika quarter tidak ada
    let quarterNum = survey.period.quarter ? String(survey.period.quarter).replace('Q', '') : '1';

    // Validasi quarterNum (pastikan antara 1-4)
    if (!['1', '2', '3', '4'].includes(quarterNum)) {
      console.log(`PERINGATAN: Nilai kuartal tidak valid (${quarterNum}), menggunakan Q1`);
      quarterNum = '1';
    }

    // Format dengan bahasa Indonesia: "Triwulan 3 2025"
    return `Triwulan ${quarterNum} ${year}`;
  }
  else if (type === 'semester') {
    // Default ke semester 1 jika semester tidak ada
    let semesterNum = survey.period.semester ? String(survey.period.semester).replace('S', '') : '1';

    // Validasi semesterNum (pastikan 1 atau 2)
    if (!['1', '2'].includes(semesterNum)) {
      console.log(`PERINGATAN: Nilai semester tidak valid (${semesterNum}), menggunakan S1`);
      semesterNum = '1';
    }

    // Format dengan bahasa Indonesia: "Semester 1 2025"
    return `Semester ${semesterNum} ${year}`;
  }
  else if (type === 'annual') {
    return `Tahun ${year}`;
  }
  else {
    // Default jika tipe tidak cocok, tetap tampilkan dengan format yang lebih informatif
    console.log("Tipe periode tidak dikenali atau nilai tidak tersedia", { type });
    return `Periode ${year} (${type || 'tidak diketahui'})`;
  }
};

// Fungsi untuk mendapatkan label periode yang lebih deskriptif
const getPeriodeLabel = (survey: Survey): string => {
  if (!survey.period) return 'Periode tidak tersedia';

  const { type } = survey.period;

  // Nilai period dari database diakses langsung
  const periodValue = survey.period.value;

  // Validasi tambahan
  if (!type) {
    return '';
  }

  // Gunakan nilai period dari database
  if (periodValue) {
    if (type === 'quarterly') {
      // Ekstrak nomor quarter dari nilai (Q1, Q2, Q3, Q4)
      let quarterNum = periodValue.replace('Q', '');

      // Validasi quarterNum (pastikan antara 1-4)
      if (!['1', '2', '3', '4'].includes(quarterNum)) {
        return '';
      }

      // Tampilkan rentang bulan berdasarkan quarter
      const labels = ['', 'Januari-Maret', 'April-Juni', 'Juli-September', 'Oktober-Desember'];
      return labels[parseInt(quarterNum)];
    }
    else if (type === 'semester') {
      // Ekstrak nomor semester dari nilai (S1, S2)
      let semesterNum = periodValue.replace('S', '');

      // Validasi semesterNum (pastikan 1 atau 2)
      if (!['1', '2'].includes(semesterNum)) {
        return '';
      }

      // Tampilkan rentang bulan berdasarkan semester
      return semesterNum === '1' ? 'Januari-Juni' : 'Juli-Desember';
    }
    else if (type === 'annual') {
      return ''; // Tidak perlu label tambahan untuk tipe annual
    }

    return '';
  }


  if (type === 'quarterly') {
    // Default ke kuartal 1 hanya jika quarter benar-benar tidak ada
    let quarterNum = survey.period.quarter ? String(survey.period.quarter).replace('Q', '') : '1';

    // Validasi quarterNum (pastikan antara 1-4)
    if (!['1', '2', '3', '4'].includes(quarterNum)) {
      return '';
    }

    // Tampilkan hanya rentang bulan
    const labels = ['', 'Januari-Maret', 'April-Juni', 'Juli-September', 'Oktober-Desember'];
    return labels[parseInt(quarterNum)];
  }
  else if (type === 'semester') {
    // Konversi semester menjadi angka
    let semesterNum = survey.period.semester ?
      (typeof survey.period.semester === 'string' ?
        survey.period.semester.replace('S', '') :
        String(survey.period.semester)
      ) : '1';

    // Validasi semesterNum
    if (!['1', '2'].includes(semesterNum)) {
      return '';
    }

    // Tampilkan rentang bulan
    return semesterNum === '1' ? 'Januari-Juni' : 'Juli-Desember';
  }
  else if (type === 'annual') {
    return ''; // Tidak perlu label tambahan karena formatPeriodeSurvei sudah menampilkan "Tahun YYYY"
  }

  return '';
};

export default function TakeSurveyPage() {
  const router = useRouter()
  const { surveys, surveyResponses, listSurveys } = useSurvey()
  const [searchTerm, setSearchTerm] = useState("")

  // Efek untuk memuat semua survei ketika halaman dibuka
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        console.log("Mengambil data survei terbaru untuk halaman Take Survey...");
        const surveyData = await listSurveys();
        console.log("Data survei berhasil dimuat");

        // Debug informasi periode
        if (surveyData && surveyData.length > 0) {
          console.log("==== DEBUG INFORMASI PERIODE SURVEI ====");
          surveyData.forEach((survey, index) => {
            console.log(`Survei #${index + 1} - ${survey.title}:`, {
              id: survey.id,
              periode: survey.period,
              periode_type: survey.period?.type,
              periode_quarter: survey.period?.quarter,
              periode_semester: survey.period?.semester,
              periode_year: survey.period?.year,
              periode_value: survey.period?.value // Tambahkan debug untuk value
            });

            // Cek apakah formatPeriodeSurvei menggunakan nilai dari database
            const periodText = formatPeriodeSurvei(survey);
            console.log(`Format periode untuk survei ${survey.title}: ${periodText}`);

            // Tampilkan semua informasi survei untuk debugging
            console.log(`Detail lengkap survei ${survey.title}:`, JSON.stringify(survey, null, 2));
          });
          console.log("=====================================");
        }
      } catch (error) {
        console.error("Error saat mengambil daftar survei:", error);
      }
    };

    loadSurveys();
  }, [listSurveys]); // Hanya listSurveys yang menjadi dependency

  // Filter hanya survei yang aktif
  const activeSurveys = surveys.filter(survey => survey.isActive)

  // Filter berdasarkan pencarian
  const filteredSurveys = activeSurveys.filter(survey =>
    survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    survey.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-2">
          Pilih Survei untuk Diisi
        </h1>
        <p className="text-gray-500 max-w-3xl">
          Silakan pilih salah satu survei yang tersedia di bawah ini untuk mulai mengisi. Partisipasi Anda sangat berarti untuk peningkatan kualitas layanan kami.
        </p>
      </div>

      <div className="bg-white shadow-subtle rounded-lg border border-gray-100 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            type="search"
            placeholder="Cari survei berdasarkan judul atau deskripsi..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ClientOnly fallback={<LoadingFallback message="Memuat daftar survei..." />}>
        <div className="grid gap-6">
          {filteredSurveys.length > 0 ? (
            filteredSurveys.map(survey => {
              // Hitung jumlah responden untuk survei ini
              const responseCount = surveyResponses.filter(r => r.surveyId === survey.id && r.isComplete).length

              return (
                <Card key={survey.id} className="overflow-hidden shadow-subtle hover:shadow-md transition-all duration-300 group">
                  <div className="p-6">
                    <h3 className="text-xl font-medium mb-2">{survey.title}</h3>
                    <p className="text-gray-500 mb-4">{survey.description}</p>

                    {/* Menampilkan informasi periode */}
                    {survey.period && (
                      <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-2 rounded-md mb-4 flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{formatPeriodeSurvei(survey)}</span>
                          {getPeriodeLabel(survey) && getPeriodeLabel(survey) !== 'Periode tidak tersedia' && getPeriodeLabel(survey) !== '' && (
                            <span className="text-xs text-blue-600">{getPeriodeLabel(survey)}</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                      <div className="flex items-center">
                        <CalendarDays className="mr-1.5 h-4 w-4" />
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1.5 h-4 w-4" />
                        <span>{responseCount} responden telah mengisi</span>
                      </div>
                    </div>

                    <div className="mt-2">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        {survey.indicators.reduce((total, ind) => total + ind.questions.length, 0)} Pertanyaan
                      </Badge>
                      {survey.indicators.map(indicator => (
                        <Badge key={indicator.id} className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {indicator.title}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      Waktu pengisian: <span className="font-medium">±{Math.ceil(survey.indicators.reduce((total, ind) => total + ind.questions.length, 0) / 3)} menit</span>
                    </div>
                    <Link href={`/take-survey/${survey.id}`}>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Isi Survei
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="bg-white shadow-subtle rounded-lg border border-gray-100 p-8 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4 opacity-75" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Tidak ada survei yang tersedia</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                {searchTerm ? "Tidak ada survei yang cocok dengan pencarian Anda." : "Tidak ada survei yang aktif saat ini. Silakan cek kembali nanti."}
              </p>
              {searchTerm && (
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm("")}
                >
                  Reset Pencarian
                </Button>
              )}
            </div>
          )}
        </div>
      </ClientOnly>
    </Layout>
  )
}
