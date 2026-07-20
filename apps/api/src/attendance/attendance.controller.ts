import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  ClockInDto,
  ClockOutDto,
  AttendanceResponseDto,
  UpdateAttendanceDto,
} from '@hrms/shared';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @UseGuards(JwtAuthGuard)
  async clockIn(
    @Request() req: { user: { userId: string; email: string; role: Role } },
    @Body() clockInDto: ClockInDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.clockIn(
      req.user.userId,
      clockInDto.intendedTask,
      clockInDto.workLocation,
    );
  }

  @Patch('clock-out')
  @UseGuards(JwtAuthGuard)
  async clockOut(
    @Request() req: { user: { userId: string; email: string; role: Role } },
    @Body() clockOutDto: ClockOutDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.clockOut(req.user.userId, clockOutDto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAttendance(
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getMyAttendance(req.user.userId);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async getByEmployee(
    @Param('id') employeeId: string,
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getByEmployee(employeeId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async updateAttendance(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.updateAttendance(id, dto);
  }
}

