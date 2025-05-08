/**
 * File: lib/likert-utils.ts
 *
 * Utilitas untuk menampilkan dan memproses skala Likert berdasarkan tipe
 */

import { QUESTION_TYPES, getLikertMaxPoints } from './question-types';

/**
 * Mendapatkan array angka untuk opsi skala Likert
 * @param type Tipe skala Likert ('likert-4' or 'likert-6')
 * @returns Array angka untuk opsi
 */
export function getLikertOptions(type: string): number[] {
  const maxPoints = getLikertMaxPoints(type);
  return Array.from({ length: maxPoints }, (_, i) => i + 1);
}

/**
 * Mendapatkan label untuk setiap poin dalam skala Likert
 * @param type Tipe skala Likert ('likert-4' or 'likert-6')
 * @returns Object dengan angka sebagai key dan label sebagai value
 */
export function getLikertLabels(type: string): Record<number, string> {
  switch (type) {
    case QUESTION_TYPES.LIKERT_4:
      return {
        1: 'Sangat Tidak Setuju',
        2: 'Tidak Setuju',
        3: 'Setuju',
        4: 'Sangat Setuju',
      };
    case QUESTION_TYPES.LIKERT_6:
      return {
        1: 'Sangat Tidak Setuju',
        2: 'Tidak Setuju',
        3: 'Agak Tidak Setuju',
        4: 'Agak Setuju',
        5: 'Setuju',
        6: 'Sangat Setuju',
      };
    default:
      console.warn(`Tipe Likert tidak dikenali: ${type}, menggunakan likert-4 sebagai fallback`);
      return {
        1: 'Sangat Tidak Setuju',
        2: 'Tidak Setuju',
        3: 'Setuju',
        4: 'Sangat Setuju',
      };
  }
}

/**
 * Mengonversi nilai numerik menjadi label skala Likert
 * @param value Nilai numerik
 * @param type Tipe skala Likert ('likert-4' or 'likert-6')
 * @returns Label untuk nilai tersebut
 */
export function getLikertLabelForValue(value: number, type: string): string {
  const labels = getLikertLabels(type);
  return labels[value] || `Nilai ${value}`;
}

/**
 * Mendapatkan warna untuk setiap nilai skala Likert
 * @param value Nilai numerik
 * @param type Tipe skala Likert ('likert-4' or 'likert-6')
 * @returns Kelas warna Tailwind CSS
 */
export function getLikertColorClass(value: number, type: string): string {
  const maxPoints = getLikertMaxPoints(type);

  // Skala warna dari merah (terendah) ke hijau (tertinggi)
  if (value === 1) return 'bg-red-500 text-white';
  if (value === maxPoints) return 'bg-green-500 text-white';

  // Nilai tengah
  if (type === QUESTION_TYPES.LIKERT_4) {
    if (value === 2) return 'bg-orange-400 text-white';
    if (value === 3) return 'bg-lime-400 text-white';
  } else if (type === QUESTION_TYPES.LIKERT_6) {
    if (value === 2) return 'bg-red-300 text-white';
    if (value === 3) return 'bg-orange-400 text-white';
    if (value === 4) return 'bg-yellow-400 text-white';
    if (value === 5) return 'bg-lime-400 text-white';
  }

  // Fallback jika nilai tidak dikenali
  return 'bg-gray-400 text-white';
}

/**
 * Memeriksa apakah suatu nilai berada dalam rentang skala Likert yang valid
 * @param value Nilai yang akan diperiksa
 * @param type Tipe skala Likert ('likert-4' atau 'likert-6')
 * @returns true jika nilai valid
 */
export function isValidLikertValue(value: number, type: string): boolean {
  const maxPoints = getLikertMaxPoints(type);
  return value >= 1 && value <= maxPoints;
}
