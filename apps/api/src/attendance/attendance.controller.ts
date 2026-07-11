import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  Role,
  ClockInDto,
  AttendanceResponseDto,
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
    );
  }

  @Patch('clock-out')
  @UseGuards(JwtAuthGuard)
  async clockOut(
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.clockOut(req.user.userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAttendance(
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getMyAttendance(req.user.userId);
  }
}
