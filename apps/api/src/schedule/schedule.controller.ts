import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, SetOfficeRosterDto, CreateMeetingDto } from '@hrms/shared';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // 1. Get employee unified schedule summary
  @Get('my-schedule')
  async getMySchedule(@Request() req: any) {
    return this.scheduleService.getMySchedule(req.user.userId);
  }

  // 2. Get Office Roster (All Users)
  @Get('office-roster')
  async getOfficeRoster(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('userId') userId?: string,
  ) {
    return this.scheduleService.getOfficeRoster(start, end, userId);
  }

  // 3. Set Office Roster (HR / Admin)
  @Post('office-roster')
  @UseGuards(RolesGuard)
  @Roles(Role.HR, Role.ADMIN)
  async setOfficeRoster(@Request() req: any, @Body() dto: SetOfficeRosterDto) {
    return this.scheduleService.setOfficeRoster(req.user.userId, dto);
  }

  // 4. Get Meetings List
  @Get('meetings')
  async getMeetings(@Request() req: any) {
    return this.scheduleService.getMeetings(req.user.userId, req.user.role as Role);
  }

  // 5. Create Meeting (HR / Admin)
  @Post('meetings')
  @UseGuards(RolesGuard)
  @Roles(Role.HR, Role.ADMIN)
  async createMeeting(@Request() req: any, @Body() dto: CreateMeetingDto) {
    return this.scheduleService.createMeeting(req.user.userId, dto);
  }

  // 6. Update Meeting (HR / Admin)
  @Patch('meetings/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.HR, Role.ADMIN)
  async updateMeeting(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMeetingDto>,
  ) {
    return this.scheduleService.updateMeeting(req.user.userId, id, dto);
  }

  // 7. Delete Meeting (HR / Admin)
  @Delete('meetings/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.HR, Role.ADMIN)
  async deleteMeeting(@Request() req: any, @Param('id') id: string) {
    return this.scheduleService.deleteMeeting(req.user.userId, id);
  }
}
