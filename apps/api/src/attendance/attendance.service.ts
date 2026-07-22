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
      authorizationName: record.authorizationName ?? null,
      isException: record.isException ?? false,
      exceptionStatus: record.exceptionStatus ?? null,
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
    const tz = process.env.TIMEZONE || 'Asia/Riyadh';
    const nowLocalStr = now.toLocaleString('en-US', { timeZone: tz });
    const nowLocal = new Date(nowLocalStr);
    const workStartLocal = new Date(nowLocal);
    workStartLocal.setHours(9, 0, 0, 0);

    let latePenalty = false;
    let penaltyMinutes = 0;

    if (workLocation === WorkLocation.OFFICE && nowLocal > workStartLocal) {
      latePenalty = true;
      penaltyMinutes = Math.floor(
        (nowLocal.getTime() - workStartLocal.getTime()) / (1000 * 60),
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

    const now = new Date();
    const startOfDay = new Date(openAttendance.clockInTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(openAttendance.clockInTime);
    endOfDay.setHours(23, 59, 59, 999);

    const sameDayRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        status: AttendanceStatus.CLOCKED_OUT,
        clockInTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    let totalMinutes = (now.getTime() - openAttendance.clockInTime.getTime()) / 60000;
    for (const r of sameDayRecords) {
      if (r.clockOutTime) {
        totalMinutes += (r.clockOutTime.getTime() - r.clockInTime.getTime()) / 60000;
      }
    }

    let isException = false;
    let exceptionStatus: string | null = null;
    let authorizationName: string | null = null;

    if (totalMinutes > 12 * 60) {
      if (!dto.authorizationName || dto.authorizationName.trim().length === 0) {
        throw new BadRequestException('NEEDS_AUTHORIZATION: You have crossed 12 hours in a single day. Who gave you authorization?');
      }
      isException = true;
      exceptionStatus = 'PENDING';
      authorizationName = dto.authorizationName.trim();
    }

    const attendance = await this.prisma.attendance.update({
      where: { id: openAttendance.id },
      data: {
        clockOutTime: now,
        status: AttendanceStatus.CLOCKED_OUT,
        completedTasksCount: dto.completedTasksCount,
        clockOutNote: dto.clockOutNote,
        authorizationName,
        isException,
        exceptionStatus,
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

  async getPendingExceptions(): Promise<AttendanceResponseDto[]> {
    const records = await this.prisma.attendance.findMany({
      where: {
        isException: true,
        exceptionStatus: 'PENDING',
      },
      orderBy: { clockInTime: 'desc' },
    });
    return records.map((record) => this.mapRecord(record));
  }

  async resolveException(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<AttendanceResponseDto> {
    const record = await this.prisma.attendance.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: { exceptionStatus: status },
    });
    return this.mapRecord(updated);
  }
}
