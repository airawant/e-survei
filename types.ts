export interface Survey {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  type: "weighted" | "unweighted";
  surveyCategory: "calculate" | "non_calculate";
  indicators: Indicator[];
  demographicFields: DemographicField[];
  period: SurveyPeriod;
  createdAt: Date;
  updatedAt: Date;
  status?: 'draft' | 'published' | 'closed';
  created_by?: string;
}

export interface Indicator {
  id: string;
  title: string;
  description: string;
  weight: number;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  weight: number;
  options: string[];
}

export interface DemographicField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: {
    questionId: string;
    value: number | string | string[];
  }[];
  demographicData?: {
    fieldId: string;
    value: number | string | string[];
  }[];
  feedback?: string;
  submittedAt: Date;
  isComplete: boolean;
}

export interface SurveyProgress {
  currentStep: number;
  totalSteps: number;
  completedQuestions: number;
  totalQuestions: number;
  completionPercentage: number;
}

export interface SurveyResult {
  surveyId: string;
  surveyTitle: string;
  totalResponses: number;
  averageScore: number;
  satisfactionIndex: number;
  indicators: {
    id: string;
    title: string;
    score: number;
    weight: number;
    questionScores: {
      id: string;
      text: string;
      averageScore: number;
      responseCount: number;
      answerDistribution: {
        score: number;
        count: number;
      }[];
    }[];
    answerDistribution: {
      score: number;
      count: number;
    }[];
  }[];
  indicatorScores: WeightedScore[];
  demographicBreakdown: Record<string, any>;
  crossTabulations: Record<string, any>;
  trendData: {
    available: boolean;
    previousScore: number;
    currentScore: number;
    trendPoints: { date: Date; score: number }[];
  };
  calculatedAt: Date;
}

export interface WeightedScore {
  indicatorId: string;
  indicatorTitle: string;
  score: number;
  weight: number;
  weightedScore: number;
  questionDetails: {
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
  }[];
}

export interface SurveyContextType {
  surveys: Survey[];
  currentSurvey: Survey | null;
  surveyResponses: SurveyResponse[];
  currentResponse: SurveyResponse | null;
  surveyResults: SurveyResult[];
  surveyProgress: SurveyProgress;
  loading: boolean;
  error: string | null;
  isClient: boolean;
  createSurvey: (surveyData: Omit<Survey, "id" | "createdAt" | "updatedAt">) => Promise<Survey>;
  updateSurvey: (id: string, updates: Partial<Survey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<boolean>;
  getSurvey: (id: string) => Promise<Survey | undefined>;
  listSurveys: () => Promise<Survey[]>;
  toggleSurveyActive: (id: string) => Promise<boolean>;
  startSurveyResponse: (surveyId: string) => void;
  saveResponseDraft: (data: Partial<SurveyResponse>) => void;
  submitSurveyResponse: (data: Omit<SurveyResponse, "id" | "submittedAt" | "isComplete">) => Promise<boolean>;
  calculateResults: (surveyId: string) => Promise<SurveyResult>;
  getSurveyResults: (surveyId: string) => Promise<SurveyResult>;
  updateSurveyProgress: (progress: Partial<SurveyProgress>) => void;
  getSurveyResponses: (surveyId: string) => Promise<SurveyResponse[]>;
}

interface SurveyPeriod {
  type: 'quarterly' | 'semester' | 'annual';
  quarter?: string; // Q1, Q2, Q3, Q4
  semester?: string; // S1, S2
  year: number;
  value?: string; // Nilai periode dari database (Q1, Q2, Q3, Q4, S1, S2)
}
