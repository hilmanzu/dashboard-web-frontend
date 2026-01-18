export interface Survey {
  id: number;
  name: string;
  description: string;
  status: string;
  semester: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponse {
  id: number;
  survey_name: string;
  year: number;
  semester: number;
  created_at: string;
  status: string; // Assuming there is a status or we derive it
}
