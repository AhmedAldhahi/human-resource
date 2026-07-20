import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, SavePayrollDto } from '@hrms/shared';

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR, Role.ADMIN)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('draft')
  getDraftPayroll(@Query('month') month: string) {
    return this.payrollService.getDraftPayroll(month);
  }

  @Post('save')
  savePayroll(@Body() dto: SavePayrollDto) {
    return this.payrollService.savePayroll(dto);
  }

  @Get('history')
  getHistory(@Query('month') month?: string) {
    return this.payrollService.getHistory(month);
  }
}
