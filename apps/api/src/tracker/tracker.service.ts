import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TrackerEmployeeDto, TrackerSessionDto, TrackerDailyReportDto } from '@hrms/shared';

@Injectable()
export class TrackerService {
  private readonly apiUrl: string;
  private readonly adminPassword: string;
  private accessToken: string | null = null;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('TRACKER_API_URL') || '';
    this.adminPassword = this.configService.get<string>('TRACKER_ADMIN_PASSWORD') || '';
  }

  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        password: this.adminPassword,
      });
      // The Tracker API returns { token: '...' } not access_token
      this.accessToken = response.data.token || response.data.access_token;
      return this.accessToken as string;
    } catch (error) {
      console.error('Tracker API authentication failed:', error);
      throw new HttpException('Failed to authenticate with Tracker API', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async getAuthHeaders(): Promise<{ Authorization: string }> {
    if (!this.accessToken) {
      await this.authenticate();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private async request<T>(method: 'GET' | 'POST', endpoint: string, retryCount = 0): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount === 0) {
        // Token might be expired, re-authenticate and retry
        this.accessToken = null;
        return this.request<T>(method, endpoint, 1);
      }
      console.error(`Tracker API request failed (${endpoint}):`, error.response?.data || error.message);
      
      let status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      // Do not return 401, as it will cause the HRMS frontend to log the user out
      if (status === 401) {
        status = HttpStatus.BAD_GATEWAY;
      }
      
      throw new HttpException(
        error.response?.data?.message || 'Tracker API request failed',
        status,
      );
    }
  }

  async getEmployees(start?: string, end?: string): Promise<TrackerEmployeeDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';
    
    return this.request<TrackerEmployeeDto[]>('GET', `/employees${qs}`);
  }

  async getSessions(trackerId: string, start?: string, end?: string): Promise<TrackerSessionDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await this.request<any>('GET', `/employees/${trackerId}/sessions${qs}`);
    return Array.isArray(response) ? response : (response?.data || []);
  }

  async getDailyReport(trackerId: string, start?: string, end?: string): Promise<TrackerDailyReportDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await this.request<any>('GET', `/employees/${trackerId}/daily-report${qs}`);
    // Handle { status: 'success', data: [...] } format or direct array
    return Array.isArray(response) ? response : (response?.data || []);
  }
}
