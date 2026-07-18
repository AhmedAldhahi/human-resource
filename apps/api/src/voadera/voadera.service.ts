import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { VoaderaEmployeeDto, VoaderaSessionDto, VoaderaDailyReportDto } from '@hrms/shared';

@Injectable()
export class VoaderaService {
  private readonly apiUrl: string;
  private readonly adminPassword: string;
  private accessToken: string | null = null;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('VOADERA_API_URL') || '';
    this.adminPassword = this.configService.get<string>('VOADERA_ADMIN_PASSWORD') || '';
  }

  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        password: this.adminPassword,
      });
      this.accessToken = response.data.access_token;
      return this.accessToken as string;
    } catch (error) {
      console.error('Voadera API authentication failed:', error);
      throw new HttpException('Failed to authenticate with Voadera API', HttpStatus.INTERNAL_SERVER_ERROR);
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
      console.error(`Voadera API request failed (${endpoint}):`, error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.message || 'Voadera API request failed',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getEmployees(start?: string, end?: string): Promise<VoaderaEmployeeDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';
    
    return this.request<VoaderaEmployeeDto[]>('GET', `/employees${qs}`);
  }

  async getSessions(voaderaId: string, start?: string, end?: string): Promise<VoaderaSessionDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.request<VoaderaSessionDto[]>('GET', `/employees/${voaderaId}/sessions${qs}`);
  }

  async getDailyReport(voaderaId: string, start?: string, end?: string): Promise<VoaderaDailyReportDto[]> {
    const query = new URLSearchParams();
    if (start) query.append('start', start);
    if (end) query.append('end', end);
    const qs = query.toString() ? `?${query.toString()}` : '';

    return this.request<VoaderaDailyReportDto[]>('GET', `/employees/${voaderaId}/daily-report${qs}`);
  }
}
