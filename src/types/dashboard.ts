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
  min?: number | string;
  max?: number | string;
  mean?: number | string;
}
