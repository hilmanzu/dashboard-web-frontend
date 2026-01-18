export interface UserInfo {
  id: number;
  user_id: number;
  phone_number: string;
  address: string;
  type: number; // 1: Internal/Jabatan, 2: External/Perusahaan
  duty_id?: number;
  division_id?: number;
  department_id?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  signature?: string;
  company_id?: number;
  userInfo?: UserInfo;
}
