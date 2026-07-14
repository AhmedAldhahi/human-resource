import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  OverviewReportDto,
  AttendanceReportDto,
  PayrollItemDto,
} from '@hrms/shared';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getOverview(): Promise<OverviewReportDto> {
    return this.reportsService.getOverview();
  }

  @Get('attendance-trend')
  async getAttendanceTrend(
    @Query('days') days?: string,
  ): Promise<AttendanceReportDto[]> {
    return this.reportsService.getAttendanceTrend(days ? Number(days) : 7);
  }

  @Get('payroll')
  async getPayrollSummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ): Promise<PayrollItemDto[]> {
    return this.reportsService.getPayrollSummary(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }
}
