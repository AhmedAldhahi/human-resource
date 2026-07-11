import axios from 'axios';
import type {
  LoginDto,
  LoginResponseDto,
  UserResponseDto,
  CreateUserDto,
  ClockInDto,
  AttendanceResponseDto,
  IssueCardDto,
  CardResponseDto,
} from '@hrms/shared';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
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

  getAll: async (): Promise<UserResponseDto[]> => {
    const { data } = await apiClient.get<UserResponseDto[]>('/users');
    return data;
  },

  create: async (dto: CreateUserDto): Promise<UserResponseDto> => {
    const { data } = await apiClient.post<UserResponseDto>('/users', dto);
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

export default apiClient;
