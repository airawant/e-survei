import { SurveyResponse as BaseSurveyResponse } from "@/types";

// Interface yang digunakan di ResultsOverview.tsx untuk melengkapi tipe yang kurang
interface AnswerDistribution {
  score: number
  count: number
  percentage: number
}

interface SurveyPeriod {
  year: number;
  quarter?: number;
  semester?: number;
}

interface QuestionDetail {
  id: string;
  text: string;
  indicatorId: string;
  indicatorName: string;
  averageScore: number;
  distribution: AnswerDistribution[];
  weight: number; // Bobot pertanyaan
}

interface IndicatorData {
  id: string;
  name: string;
  score: number;
  answerDistribution: AnswerDistribution[];
  questions?: string[];
  questionDetails: QuestionDetail[];
  indicatorId?: string;
  indicatorTitle?: string;
  weight?: number;
  weightedScore?: number;
}

interface TrendPoint {
  date: string;
  score: number;
  period: SurveyPeriod;
  rawDate?: Date;
}

interface SurveyResponse {
  answers: Record<string, number>;
  period: SurveyPeriod;
}

/**
 * Konversi skor dari skala 1-5 ke skala IKM 1-4
 * - Jika skor NaN, defaultnya 1
 * - Jika tidak, kalkulasi berdasarkan formula
 */
export const convertToIKMScale = (score: number): number => {
  if (isNaN(score)) return 1;
  return ((score - 1) / 5) * 3 + 1;
};

/**
 * Menghitung nilai agregasi indikator berdasarkan respons
 * - Untuk survei berbobot: rata-rata tertimbang berdasarkan bobot pertanyaan
 * - Untuk survei tidak berbobot: S / (n × p) - total skor dibagi (responden × pertanyaan)
 */
export const calculateIndicatorValue = (
  responses: SurveyResponse[],
  indicator: IndicatorData,
  isWeighted: boolean
): number => {
  if (!responses || responses.length === 0 || !indicator.questionDetails || indicator.questionDetails.length === 0) {
    return 0;
  }

  const questionsIds = indicator.questionDetails.map((q: QuestionDetail) => q.id);
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalScore = 0;
  let totalResponses = 0;

  // Untuk survei berbobot, gunakan rata-rata tertimbang
  if (isWeighted) {
    // Kalkulasi skor berbobot untuk setiap pertanyaan
    indicator.questionDetails.forEach((question: QuestionDetail) => {
      const questionWeight = question.weight;
      let questionScoreSum = 0;
      let responseCount = 0;

      // Hitung total skor untuk pertanyaan ini
      responses.forEach(response => {
        if (response.answers && response.answers[question.id]) {
          questionScoreSum += response.answers[question.id];
          responseCount++;
        }
      });

      // Hitung skor rata-rata pertanyaan
      const averageQuestionScore = responseCount > 0 ? questionScoreSum / responseCount : 0;

      // Tambahkan ke total berbobot
      totalWeightedScore += averageQuestionScore * questionWeight;
      totalWeight += questionWeight;
    });

    // Formula untuk survei berbobot: Σ(Rata-rata Skor Pertanyaan × Bobot) / Total Bobot
    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }
  // Untuk survei tidak berbobot, gunakan formula S / (n × p)
  else {
    // Jumlah responden (n)
    const respondentCount = responses.length;

    // Jumlah pertanyaan (p)
    const questionCount = indicator.questionDetails.length;

    // Total skor dari semua pertanyaan dan semua responden (S)
    responses.forEach(response => {
      if (response.answers) {
        questionsIds.forEach((qId: string) => {
          if (response.answers[qId]) {
            totalScore += response.answers[qId];
            totalResponses++;
          }
        });
      }
    });

    // Formula untuk survei tidak berbobot: S / (n × p)
    // Jika tidak semua responden menjawab semua pertanyaan, gunakan totalResponses
    return (respondentCount * questionCount) > 0 ? totalScore / (respondentCount * questionCount) : 0;
  }
};

/**
 * Menghitung total skor dari semua respons
 */
export const calculateTotalScore = (responses: SurveyResponse[]): number => {
  let totalScore = 0;

  responses.forEach(response => {
    if (response.answers) {
      Object.values(response.answers).forEach(score => {
        totalScore += score;
      });
    }
  });

  return totalScore;
};

/**
 * Transform data untuk menampilkan di chart batang
 */
export const transformDataForBarChart = (indicators: IndicatorData[]) => {
  if (!indicators || !Array.isArray(indicators) || indicators.length === 0) return [];

  return indicators.map((indicator) => ({
    name: indicator.name || indicator.indicatorTitle || 'Tanpa Nama',
    score: isNaN(indicator.score) ? 0 : indicator.score || 0
  })).sort((a, b) => a.score - b.score);
};

/**
 * Transform data tren untuk chart garis
 */
export const transformDataForLineChart = (trendData: TrendPoint[] | undefined) => {
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) return [];

  return trendData.map((point, index) => {
    try {
      // Parse date from ISO string
      let pointDate;
      try {
        pointDate = new Date(point.date);
      } catch (e) {
        pointDate = new Date(); // Fallback ke waktu sekarang jika parsing gagal
      }

      // Pastikan pointDate valid
      if (isNaN(pointDate.getTime())) {
        pointDate = new Date(); // Fallback ke waktu sekarang jika invalid
      }

      // Format tanggal menjadi string yang ramah pengguna
      let formattedName;
      try {
        formattedName = pointDate.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      } catch (e) {
        formattedName = `Data ${index + 1}`;
      }

      return {
        name: formattedName,
        score: isNaN(point.score) ? 0 : point.score || 0,
        // Gunakan string date yang sudah ada
        fullDate: point.date,
        x: index
      };
    } catch (e) {
      // Fallback jika ada error
      console.error("Error processing trend point:", e);
      return {
        name: `Data point ${index + 1}`,
        score: 0,
        fullDate: new Date().toISOString(),
        x: index
      };
    }
  });
};

/**
 * Menentukan kategori mutu berdasarkan nilai IKM
 */
export const getServiceQuality = (ikm: number): {mutu: string, kinerja: string} => {
  if (ikm > 3.25) return { mutu: "A", kinerja: "Sangat Baik" };
  if (ikm > 2.5) return { mutu: "B", kinerja: "Baik" };
  if (ikm > 1.75) return { mutu: "C", kinerja: "Kurang Baik" };
  return { mutu: "D", kinerja: "Tidak Baik" };
};
