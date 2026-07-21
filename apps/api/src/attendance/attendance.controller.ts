import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
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

  @Get('exceptions/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async getPendingExceptions(): Promise<AttendanceResponseDto[]> {
    return this.attendanceService.getPendingExceptions();
  }

  @Patch('exceptions/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async resolveException(
    @Param('id') id: string,
    @Body('status') status: 'ACCEPTED' | 'REJECTED',
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.resolveException(id, status);
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  async getByEmployee(
    @Param('id') employeeId: string,
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<AttendanceResponseDto[]> {
    if (
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.HR &&
      req.user.userId !== employeeId
    ) {
      throw new ForbiddenException('You do not have permission to view this attendance data.');
    }
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

