import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@hrms/shared';

@Controller('tracker')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrackerController {
  constructor(
    private readonly trackerService: TrackerService,
    private readonly usersService: UsersService,
  ) {}

  @Get('me/daily-report')
  async getMyDailyReport(
    @Request() req: any,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new ForbiddenException('User not found');

    const employees = await this.trackerService.getEmployees();
    let matched = null;
    if (user.tsUsername) {
      matched = employees.find(e => e.windowsId === user.tsUsername);
    }
    if (!matched && user.name) {
      matched = employees.find(e => (e.name || '').toLowerCase() === user.name.toLowerCase() || e.windowsId === user.name);
    }

    if (!matched) {
      return [];
    }

    return this.trackerService.getDailyReport(matched.id, start, end);
  }

  @Get('employees')
  @Roles(Role.ADMIN, Role.HR)
  async getEmployees(@Query('start') start?: string, @Query('end') end?: string) {
    return this.trackerService.getEmployees(start, end);
  }

  @Get('employees/:id/sessions')
  @Roles(Role.ADMIN, Role.HR)
  async getSessions(
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.trackerService.getSessions(id, start, end);
  }

  @Get('employees/:id/daily-report')
  @Roles(Role.ADMIN, Role.HR)
  async getDailyReport(
    @Param('id') id: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.trackerService.getDailyReport(id, start, end);
  }
}
