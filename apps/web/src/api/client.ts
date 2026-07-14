import axios from 'axios';
import type {
  LoginDto,
  LoginResponseDto,
  UserResponseDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateWageDto,
  UpdateEmployeeTypeDto,
  ClockInDto,
  AttendanceResponseDto,
  UpdateAttendanceDto,
  IssueCardDto,
  CardResponseDto,
  CreateAbsenceDto,
  AbsenceRecordResponseDto,
  AbsenceStatus,
  OverviewReportDto,
  AttendanceReportDto,
  PayrollItemDto,
} from '@hrms/shared';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return 'http://localhost:3000/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hrms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — redirect to login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hrms_token');
      localStorage.removeItem('hrms_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (dto: LoginDto): Promise<LoginResponseDto> => {
    const { data } = await apiClient.post<LoginResponseDto>('/auth/login', dto);
    return data;
  },
};

// ── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: async (): Promise<UserResponseDto> => {
    const { data } = await apiClient.get<UserResponseDto>('/users/me');
    return data;
  },

  getById: async (id: string): Promise<UserResponseDto> => {
    const { data } = await apiClient.get<UserResponseDto>(`/users/${id}`);
    return data;
  },

  getAll: async (): Promise<UserResponseDto[]> => {
    const { data } = await apiClient.get<UserResponseDto[]>('/users');
    return data;
  },

  create: async (dto: CreateUserDto): Promise<UserResponseDto> => {
    const { data } = await apiClient.post<UserResponseDto>('/users', dto);
    return data;
  },

  updateProfile: async (id: string, dto: UpdateProfileDto): Promise<UserResponseDto> => {
    const { data } = await apiClient.patch<UserResponseDto>(`/users/${id}/profile`, dto);
    return data;
  },

  updateWage: async (id: string, dto: UpdateWageDto): Promise<UserResponseDto> => {
    const { data } = await apiClient.patch<UserResponseDto>(`/users/${id}/wage`, dto);
    return data;
  },

  updateEmployeeType: async (id: string, dto: UpdateEmployeeTypeDto): Promise<UserResponseDto> => {
    const { data } = await apiClient.patch<UserResponseDto>(`/users/${id}/employee-type`, dto);
    return data;
  },

  resetAbsenceBalance: async (id: string): Promise<UserResponseDto> => {
    const { data } = await apiClient.patch<UserResponseDto>(`/users/${id}/reset-absence`);
    return data;
  },

  uploadPhoto: async (id: string, file: File): Promise<UserResponseDto> => {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await apiClient.post<UserResponseDto>(`/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ── Attendance ──────────────────────────────────────────────────────────────
export const attendanceApi = {
  clockIn: async (dto: ClockInDto): Promise<AttendanceResponseDto> => {
    const { data } = await apiClient.post<AttendanceResponseDto>(
      '/attendance/clock-in',
      dto
    );
    return data;
  },

  clockOut: async (): Promise<AttendanceResponseDto> => {
    const { data } = await apiClient.patch<AttendanceResponseDto>(
      '/attendance/clock-out'
    );
    return data;
  },

  getMyAttendance: async (): Promise<AttendanceResponseDto[]> => {
    const { data } = await apiClient.get<AttendanceResponseDto[]>(
      '/attendance/my'
    );
    return data;
  },

  getByEmployee: async (employeeId: string): Promise<AttendanceResponseDto[]> => {
    const { data } = await apiClient.get<AttendanceResponseDto[]>(
      `/attendance/employee/${employeeId}`
    );
    return data;
  },

  update: async (id: string, dto: UpdateAttendanceDto): Promise<AttendanceResponseDto> => {
    const { data } = await apiClient.patch<AttendanceResponseDto>(
      `/attendance/${id}`,
      dto
    );
    return data;
  },
};

// ── Cards ───────────────────────────────────────────────────────────────────
export const cardsApi = {
  issue: async (dto: IssueCardDto): Promise<CardResponseDto> => {
    const { data } = await apiClient.post<CardResponseDto>(
      '/cards/issue',
      dto
    );
    return data;
  },

  getByEmployee: async (id: string): Promise<CardResponseDto[]> => {
    const { data } = await apiClient.get<CardResponseDto[]>(
      `/cards/employee/${id}`
    );
    return data;
  },

  getAll: async (): Promise<CardResponseDto[]> => {
    const { data } = await apiClient.get<CardResponseDto[]>('/cards');
    return data;
  },
};

// ── Absence ─────────────────────────────────────────────────────────────────
export const absenceApi = {
  createRequest: async (dto: CreateAbsenceDto, documentFile?: File): Promise<AbsenceRecordResponseDto> => {
    const formData = new FormData();
    formData.append('date', dto.date);
    formData.append('type', dto.type);
    if (dto.reason) formData.append('reason', dto.reason);
    if (dto.earlyLeaveMinutes !== undefined && dto.earlyLeaveMinutes !== null) {
      formData.append('earlyLeaveMinutes', String(dto.earlyLeaveMinutes));
    }
    if (documentFile) formData.append('document', documentFile);

    const { data } = await apiClient.post<AbsenceRecordResponseDto>('/absence/request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getMyRecords: async (): Promise<AbsenceRecordResponseDto[]> => {
    const { data } = await apiClient.get<AbsenceRecordResponseDto[]>('/absence/my');
    return data;
  },

  getAllRecords: async (): Promise<AbsenceRecordResponseDto[]> => {
    const { data } = await apiClient.get<AbsenceRecordResponseDto[]>('/absence/all');
    return data;
  },

  updateStatus: async (id: string, status: AbsenceStatus): Promise<AbsenceRecordResponseDto> => {
    const { data } = await apiClient.patch<AbsenceRecordResponseDto>(`/absence/${id}/status`, { status });
    return data;
  },

  checkAuto: async (date?: string): Promise<{ processed: number; created: number }> => {
    const { data } = await apiClient.post<{ processed: number; created: number }>('/absence/check-auto', { date });
    return data;
  },
};

// ── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  getOverview: async (): Promise<OverviewReportDto> => {
    const { data } = await apiClient.get<OverviewReportDto>('/reports/overview');
    return data;
  },

  getAttendanceTrend: async (days: number = 7): Promise<AttendanceReportDto[]> => {
    const { data } = await apiClient.get<AttendanceReportDto[]>(`/reports/attendance-trend?days=${days}`);
    return data;
  },

  getPayroll: async (year?: number, month?: number): Promise<PayrollItemDto[]> => {
    let url = '/reports/payroll?';
    if (year !== undefined) url += `year=${year}&`;
    if (month !== undefined) url += `month=${month}`;
    const { data } = await apiClient.get<PayrollItemDto[]>(url);
    return data;
  },
};

export default apiClient;

