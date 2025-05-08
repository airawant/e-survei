export type Survey = {
  id: string;
  title: string;
  description: string;
  type: 'weighted' | 'unweighted';
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Indicator = {
  id: string;
  survey_id: string;
  title: string;
  description: string;
  weight: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export type Question = {
  id: string;
  indicator_id: string;
  text: string;
  weight: number;
  order: number;
  created_at: string;
  updated_at: string;
}

export type Response = {
  id: string;
  survey_id: string;
  respondent_id: string;
  created_at: string;
  updated_at: string;
}

export type Answer = {
  id: string;
  response_id: string;
  question_id: string;
  score: number;
  created_at: string;
  updated_at: string;
}
