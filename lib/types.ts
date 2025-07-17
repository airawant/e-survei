export type QuestionType = 'likert' | 'text' | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'number';

export interface Question {
  id: string;
  text: string;
  type: QuestionType | string;
  required: boolean;
  options?: string[];
  weight: number;
}

export interface Indicator {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface DemographicField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  isActive?: boolean;
  indicators: Indicator[];
  demographicFields: DemographicField[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | number | string[];
}

export interface DemographicDataItem {
  fieldId: string;
  value: string | number | string[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: SurveyAnswer[];
  demographicData?: DemographicDataItem[];
  feedback?: string;
  submittedAt: Date;
  isComplete: boolean;
  periode_survei?: string;
}

export interface AnswerDistribution {
  score: number;
  count: number;
  percentage: number;
}

export interface QuestionDetail {
  questionId: string;
  questionText: string;
  averageScore: number;
  min: number;
  max: number;
  median: number;
  mode: number;
  stdDev: number;
  weight: number;
  responseCount: number;
  distribution?: Array<{ score: number; count: number; percentage: number }>;
}

export interface WeightedScore {
  indicatorId: string;
  indicatorTitle: string;
  score: number;
  weight: number;
  weightedScore: number;
  questionDetails: QuestionDetail[];
}

export interface SurveyResult {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  averageScore: number;
  satisfactionIndex: number;
  indicatorScores: WeightedScore[];
  demographicBreakdown: Record<string, Record<string, number>>;
  crossTabulations: Record<string, Record<string, number>>;
  trendData: {
    available: boolean;
    previousScore: number;
    currentScore: number;
    trendPoints: Array<[object Object]      date: Date;
      score: number;
    }>;
  };
  calculatedAt: Date;
}

export interface SurveyProgress {
  currentStep: number;
  totalSteps: number;
  completedQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
}

export interface SurveyContext {
  surveys: Survey[];
  currentSurvey: Survey | null;
  surveyResponses: SurveyResponse[];
  currentResponse: SurveyResponse | null;
  surveyResults: SurveyResult[];
  surveyProgress: SurveyProgress;
  loading: boolean;
  error: string | null;
  createSurvey: (data: Partial<Survey>) => Promise<string>;
  updateSurvey: (id: string, data: Partial<Survey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  getSurvey: (id: string) => Promise<void>;
  listSurveys: () => Promise<void>;
  toggleSurveyActive: (id: string) => Promise<void>;
  startSurveyResponse: (surveyId: string) => void;
  saveResponseDraft: (data: Partial<SurveyResponse>) => void;
  submitSurveyResponse: (data: Omit<SurveyResponse, "id" | "submittedAt" | "isComplete">) => Promise<void>;
  calculateResults: (surveyId: string) => Promise<void>;
  getSurveyResults: (surveyId: string) => Promise<void>;
  updateSurveyProgress: (progress: Partial<SurveyProgress>) => void;
}

export interface Respondent {
  id: string;
  survey_id: string;
  name: string;
  email?: string;
  phone?: string;
  periode_survei?: string;
  created_at: Date;
}
