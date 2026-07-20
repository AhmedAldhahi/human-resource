import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceResponseDto, AttendanceStatus, UpdateAttendanceDto, WorkLocation, ClockOutDto } from '@hrms/shared';
import { PresenceGateway } from '../presence/presence.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly presenceGateway?: PresenceGateway,
  ) {}

  private mapRecord(record: any): AttendanceResponseDto {
    return {
      id: record.id,
      employeeId: record.employeeId,
      clockInTime: record.clockInTime.toISOString(),
      clockOutTime: record.clockOutTime ? record.clockOutTime.toISOString() : null,
      intendedTask: record.intendedTask,
      status: record.status as AttendanceStatus,
      workLocation: record.workLocation as WorkLocation,
      latePenalty: record.latePenalty,
      penaltyMinutes: record.penaltyMinutes,
      completedTasksCount: record.completedTasksCount ?? null,
      clockOutNote: record.clockOutNote ?? null,
    };
  }

  async clockIn(
    employeeId: string,
    intendedTask: string,
    workLocation: WorkLocation = WorkLocation.OFFICE,
  ): Promise<AttendanceResponseDto> {
    if (!intendedTask || intendedTask.length < 15) {
      throw new BadRequestException(
        'Intended task must be at least 15 characters long',
      );
    }

    const openAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        status: AttendanceStatus.CLOCKED_IN,
      },
    });

    if (openAttendance) {
      throw new BadRequestException(
        'You are already clocked in. Please clock out first.',
      );
    }

    const now = new Date();
    const workStart = new Date(now);
    workStart.setHours(9, 0, 0, 0);

    let latePenalty = false;
    let penaltyMinutes = 0;

    if (workLocation === WorkLocation.OFFICE && now > workStart) {
      latePenalty = true;
      penaltyMinutes = Math.floor(
        (now.getTime() - workStart.getTime()) / (1000 * 60),
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        intendedTask,
        status: AttendanceStatus.CLOCKED_IN,
        workLocation,
        latePenalty,
        penaltyMinutes,
      },
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    return this.mapRecord(attendance);
  }

  async clockOut(
    employeeId: string,
    dto: ClockOutDto,
  ): Promise<AttendanceResponseDto> {
    if (dto.completedTasksCount === undefined || dto.completedTasksCount === null || !dto.clockOutNote || !dto.clockOutNote.trim()) {
      throw new BadRequestException(
        'You must provide both the completed tasks count and a clock out note.',
      );
    }

    const openAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        status: AttendanceStatus.CLOCKED_IN,
      },
      orderBy: { clockInTime: 'desc' },
    });

    if (!openAttendance) {
      throw new BadRequestException(
        'No open attendance record found. Please clock in first.',
      );
    }

    const attendance = await this.prisma.attendance.update({
      where: { id: openAttendance.id },
      data: {
        clockOutTime: new Date(),
        status: AttendanceStatus.CLOCKED_OUT,
        completedTasksCount: dto.completedTasksCount,
        clockOutNote: dto.clockOutNote,
      },
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    return this.mapRecord(attendance);
  }

  async getMyAttendance(employeeId: string): Promise<AttendanceResponseDto[]> {
    const records = await this.prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockInTime: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async getByEmployee(employeeId: string): Promise<AttendanceResponseDto[]> {
    const records = await this.prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockInTime: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async updateAttendance(id: string, dto: UpdateAttendanceDto): Promise<AttendanceResponseDto> {
    const existing = await this.prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Attendance record not found.');
    }

    const data: any = {};
    if (dto.clockInTime !== undefined) {
      data.clockInTime = new Date(dto.clockInTime);
    }
    if (dto.clockOutTime !== undefined) {
      data.clockOutTime = dto.clockOutTime ? new Date(dto.clockOutTime) : null;
    }
    if (dto.intendedTask !== undefined) {
      data.intendedTask = dto.intendedTask;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.workLocation !== undefined) {
      data.workLocation = dto.workLocation;
    }
    if (dto.latePenalty !== undefined) {
      data.latePenalty = dto.latePenalty;
    }
    if (dto.penaltyMinutes !== undefined) {
      data.penaltyMinutes = dto.penaltyMinutes;
    }
    if (dto.completedTasksCount !== undefined) {
      data.completedTasksCount = dto.completedTasksCount;
    }
    if (dto.clockOutNote !== undefined) {
      data.clockOutNote = dto.clockOutNote;
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data,
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    return this.mapRecord(updated);
  }
}
