/**
 * File: lib/question-types.ts
 *
 * Utilitas untuk mengelola tipe pertanyaan, terutama skala Likert
 */

// Daftar tipe pertanyaan yang didukung di aplikasi frontend
export const QUESTION_TYPES = {
  LIKERT_4: 'likert-4',
  LIKERT_6: 'likert-6',
  MULTIPLE_CHOICE: 'multiple-choice',
  TEXT: 'text',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  NUMBER: 'number',
};

// Daftar tipe pertanyaan yang didukung di database Supabase
export const DB_QUESTION_TYPES = {
  LIKERT_4: 'likert-4',
  LIKERT_6: 'likert-6',
  MULTIPLE_CHOICE: 'multiple_choice', // Perhatikan underscore
  TEXT: 'text',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DATE: 'date',
  NUMBER: 'number',
};

/**
 * Mengonversi tipe pertanyaan dari format frontend ke format database
 * @param frontendType Tipe pertanyaan dari frontend
 * @returns Tipe pertanyaan untuk database
 */
export function convertToDbQuestionType(frontendType: string): string {
  switch (frontendType) {
    case QUESTION_TYPES.LIKERT_4:
      return DB_QUESTION_TYPES.LIKERT_4;
    case QUESTION_TYPES.LIKERT_6:
      return DB_QUESTION_TYPES.LIKERT_6;
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      return DB_QUESTION_TYPES.MULTIPLE_CHOICE;
    case QUESTION_TYPES.TEXT:
      return DB_QUESTION_TYPES.TEXT;
    case QUESTION_TYPES.DROPDOWN:
      return DB_QUESTION_TYPES.DROPDOWN;
    case QUESTION_TYPES.RADIO:
      return DB_QUESTION_TYPES.RADIO;
    case QUESTION_TYPES.CHECKBOX:
      return DB_QUESTION_TYPES.CHECKBOX;
    case QUESTION_TYPES.DATE:
      return DB_QUESTION_TYPES.DATE;
    case QUESTION_TYPES.NUMBER:
      return DB_QUESTION_TYPES.NUMBER;
    default:
      // Jika tipe tidak dikenali, gunakan text sebagai fallback
      console.warn(`Tipe pertanyaan tidak dikenali: ${frontendType}, menggunakan 'text' sebagai fallback`);
      return DB_QUESTION_TYPES.TEXT;
  }
}

/**
 * Mengonversi tipe pertanyaan dari format database ke format frontend
 * @param dbType Tipe pertanyaan dari database
 * @returns Tipe pertanyaan untuk frontend
 */
export function convertFromDbQuestionType(dbType: string): string {
  switch (dbType) {
    case DB_QUESTION_TYPES.LIKERT_4:
      return QUESTION_TYPES.LIKERT_4;
    case DB_QUESTION_TYPES.LIKERT_6:
      return QUESTION_TYPES.LIKERT_6;
    case DB_QUESTION_TYPES.MULTIPLE_CHOICE:
      return QUESTION_TYPES.MULTIPLE_CHOICE;
    case DB_QUESTION_TYPES.TEXT:
      return QUESTION_TYPES.TEXT;
    case DB_QUESTION_TYPES.DROPDOWN:
      return QUESTION_TYPES.DROPDOWN;
    case DB_QUESTION_TYPES.RADIO:
      return QUESTION_TYPES.RADIO;
    case DB_QUESTION_TYPES.CHECKBOX:
      return QUESTION_TYPES.CHECKBOX;
    case DB_QUESTION_TYPES.DATE:
      return QUESTION_TYPES.DATE;
    case DB_QUESTION_TYPES.NUMBER:
      return QUESTION_TYPES.NUMBER;
    default:
      // Jika tipe tidak dikenali, gunakan text sebagai fallback
      console.warn(`Tipe pertanyaan dari database tidak dikenali: ${dbType}, menggunakan 'text' sebagai fallback`);
      return QUESTION_TYPES.TEXT;
  }
}

/**
 * Mendapatkan jumlah poin maksimum untuk skala Likert berdasarkan tipenya
 * @param likertType Tipe skala Likert (likert-4, likert-6)
 * @returns Jumlah poin maksimum
 */
export function getLikertMaxPoints(likertType: string): number {
  switch (likertType) {
    case QUESTION_TYPES.LIKERT_4:
      return 4;
    case QUESTION_TYPES.LIKERT_6:
      return 6;
    default:
      console.warn(`Tipe Likert tidak dikenali: ${likertType}, menggunakan 4 sebagai fallback`);
      return 4;
  }
}

/**
 * Memeriksa apakah tipe pertanyaan adalah skala Likert
 * @param questionType Tipe pertanyaan
 * @returns true jika tipe pertanyaan adalah skala Likert
 */
export function isLikertType(questionType: string): boolean {
  return questionType === QUESTION_TYPES.LIKERT_4 || questionType === QUESTION_TYPES.LIKERT_6;
}
