import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VoaderaService } from './voadera.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@hrms/shared';

@Controller('voadera')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR)
export class VoaderaController {
  constructor(private readonly voaderaService: VoaderaService) {}

  @Get('employees')
  async getEmployees(@Query('start') start?: string, @Query('end') end?: string) {
    return this.voaderaService.getEmployees(start, end);
  }

  @Get('employees/:id/sessions')
  async getSessions(
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.voaderaService.getSessions(id, start, end);
  }

  @Get('employees/:id/daily-report')
  async getDailyReport(
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.voaderaService.getDailyReport(id, start, end);
  }
}
