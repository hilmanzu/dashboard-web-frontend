export interface DashboardData {
  user: {
    id: number;
    name: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    signature?: string;
    userInfo?: {
      type: number;
      division_id?: number;
    };
  };
  surveySummary: {
    semester_1: number;
    semester_2: number;
    total: number;
  };
  targetScore: number;
  division: string;
  duty: string;
  department: string;
  type: string;
  lng_first_year: number;
  bog_first_year: number;
  energy_first_year: number;
  dashboardAccess: string[];
  isAdmin: boolean;
}

export interface KeluhanSummary {
  open: number;
  closed: number;
}

export interface LngSupplySummary {
  current_year: string;
  all_data: string;
}

export interface EnergyDeliverySummary {
  current_year: string;
  all_data: string;
  data_yesterday: string;
}

export interface BogSummary {
  bog_daily: number | string;
  bog_date: string | null;
  bog_monthly: number | string;
}

export interface ChartDataPoint {
  x: string;
  y: number | string;
  fillColor?: string;
  value?: number | string;
  values?: number | string;
  min?: number | string;
  max?: number | string;
  mean?: number | string;
  totsts?: number;
}

export interface LngChartResponse {
  data: ChartDataPoint[];
  std_cargo: number;
  total_sts: number;
  total_lng_for_year: number;
  data_to_current_month: ChartDataPoint[];
  std_cargo_to_current_month: number;
  total_sts_to_current_month: number;
  total_lng_for_year_to_current_month: number;
}

export interface EnergyChartResponse {
  data: ChartDataPoint[];
  data_pgn: ChartDataPoint[];
  data_pln: ChartDataPoint[];
  avarage_energy_per_day: ChartDataPoint[];
  total_energy_for_year: number;
  average_energy_for_year: number;
  average_energy_input: number;
  total_energy_for_year_pgn: number;
  average_energy_for_year_pgn: number;
  average_energy_input_pgn: number;
  total_energy_for_year_pln: number;
  average_energy_for_year_pln: number;
  average_energy_input_pln: number;
  total_energy_for_year_to_current_month: number;
  average_energy_for_year_to_current_month: number;
  average_energy_input_to_current_month: number;
  data_to_current_month: ChartDataPoint[];
  average_energy_per_day_to_current_month: ChartDataPoint[];
}

export interface SendOutChartResponse {
  seriesData: {
    name: string;
    data: number[];
    group: string;
  }[];
  categories: string[];
}

export interface SurveyYearResponse {
  success: boolean;
  data: {
    surveySummary: {
      semester_1: number;
      semester_2: number;
      total: number;
    };
    targetScore: number;
  };
}
