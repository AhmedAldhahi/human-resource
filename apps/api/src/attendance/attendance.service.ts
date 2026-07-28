import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceResponseDto, AttendanceStatus, UpdateAttendanceDto, WorkLocation, ClockOutDto, EmployeeType } from '@hrms/shared';
import { PresenceGateway } from '../presence/presence.gateway';
import { TrackerService } from '../tracker/tracker.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly presenceGateway?: PresenceGateway,
    @Optional() private readonly trackerService?: TrackerService,
  ) {}

  private mapRecord(record: any): AttendanceResponseDto {
    return {
      id: record.id,
      employeeId: record.employeeId,
      employeeName: record.employee?.name,
      employeeEmail: record.employee?.email,
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

    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { tsUsername: true, employeeType: true },
    });

    const now = new Date();
    const tz = process.env.TIMEZONE || 'Asia/Riyadh';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10) - 1;
    const day = parseInt(getPart('day'), 10);
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);

    const nowLocalMinutes = hour * 60 + minute;
    const workStartMinutes = 9 * 60; // 09:00 AM

    let latePenalty = false;
    let penaltyMinutes = 0;

    // Late penalty ONLY applies to hours-based (PER_HOUR) employees
    if (
      user?.employeeType === EmployeeType.PER_HOUR &&
      workLocation === WorkLocation.OFFICE &&
      nowLocalMinutes > workStartMinutes
    ) {
      latePenalty = true;
      penaltyMinutes = nowLocalMinutes - workStartMinutes;
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
      include: {
        employee: { select: { name: true, email: true } },
      },
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    if (user?.tsUsername) {
      const inOffice = workLocation === WorkLocation.OFFICE;
      await this.trackerService?.syncOfficeStatus(user.tsUsername, inOffice, now);
    }

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
    if (now <= openAttendance.clockInTime) {
      throw new BadRequestException('Clock out time cannot be earlier than or equal to clock in time.');
    }

    // Split shift into daily segments if it crosses midnight boundaries
    const segments: { start: Date; end: Date }[] = [];
    let currentStart = new Date(openAttendance.clockInTime);
    while (true) {
      const nextMidnight = new Date(currentStart);
      nextMidnight.setHours(24, 0, 0, 0);
      if (now <= nextMidnight) {
        segments.push({ start: currentStart, end: now });
        break;
      } else {
        const endOfDay = new Date(nextMidnight.getTime() - 1);
        segments.push({ start: currentStart, end: endOfDay });
        currentStart = nextMidnight;
      }
    }

    // Calculate total minutes worked in this shift + existing same-day records
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

    const user = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { tsUsername: true, maxDailyHours: true },
    });

    const maxHours = user?.maxDailyHours ?? 12;

    let isException = false;
    let exceptionStatus: string | null = null;
    let authorizationName: string | null = null;

    if (totalMinutes > maxHours * 60) {
      if (!dto.authorizationName || dto.authorizationName.trim().length === 0) {
        throw new BadRequestException(`NEEDS_AUTHORIZATION: You have crossed ${maxHours} hours in a single day. Who gave you authorization?`);
      }
      isException = true;
      exceptionStatus = 'PENDING';
      authorizationName = dto.authorizationName.trim();
    }

    // Update segment 0 (the original open attendance record)
    const firstSegment = segments[0];
    const attendance = await this.prisma.attendance.update({
      where: { id: openAttendance.id },
      data: {
        clockOutTime: firstSegment.end,
        status: AttendanceStatus.CLOCKED_OUT,
        completedTasksCount: dto.completedTasksCount,
        clockOutNote: dto.clockOutNote,
        authorizationName,
        isException,
        exceptionStatus,
      },
      include: {
        employee: { select: { name: true, email: true } },
      },
    });

    // Create records for any subsequent segments if shift crossed midnight
    for (let i = 1; i < segments.length; i++) {
      await this.prisma.attendance.create({
        data: {
          employeeId,
          clockInTime: segments[i].start,
          clockOutTime: segments[i].end,
          intendedTask: `${openAttendance.intendedTask} (Shift continuation)`,
          status: AttendanceStatus.CLOCKED_OUT,
          workLocation: openAttendance.workLocation,
          latePenalty: false,
          penaltyMinutes: 0,
          completedTasksCount: dto.completedTasksCount,
          clockOutNote: dto.clockOutNote,
          authorizationName,
          isException,
          exceptionStatus,
        },
      });
    }

    this.presenceGateway?.broadcastPresenceUpdate();

    if (user?.tsUsername) {
      this.trackerService?.syncOfficeStatus(user.tsUsername, false, now);
    }

    return this.mapRecord(attendance);
  }

  private async autoCloseStaleSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - 15 * 60 * 60 * 1000);
    const staleRecords = await this.prisma.attendance.findMany({
      where: {
        status: AttendanceStatus.CLOCKED_IN,
        clockInTime: { lte: cutoff },
      },
    });

    for (const record of staleRecords) {
      const autoClockOutTime = new Date(record.clockInTime.getTime() + 15 * 60 * 60 * 1000);
      await this.prisma.attendance.update({
        where: { id: record.id },
        data: {
          clockOutTime: autoClockOutTime,
          status: AttendanceStatus.CLOCKED_OUT,
          isException: true,
          exceptionStatus: 'PENDING',
          authorizationName: 'AUTO_15H_SYSTEM',
          clockOutNote: record.clockOutNote
            ? `${record.clockOutNote}\n[AUTO CLOCK-OUT 15H]: Exceeded 15-hour maximum safety limit.`
            : '[SYSTEM AUTO CLOCK-OUT]: Shift exceeded 15 hours without clocking out. Flagged for HR review.',
        },
      });
    }

    if (staleRecords.length > 0) {
      this.presenceGateway?.broadcastPresenceUpdate();
    }
  }

  async getMyAttendance(employeeId: string, limit = 100): Promise<AttendanceResponseDto[]> {
    await this.autoCloseStaleSessions();
    const records = await this.prisma.attendance.findMany({
      where: { employeeId },
      include: { employee: { select: { name: true, email: true } } },
      orderBy: { clockInTime: 'desc' },
      take: limit,
    });

    return records.map((record) => this.mapRecord(record));
  }

  async getByEmployee(employeeId: string, limit = 100): Promise<AttendanceResponseDto[]> {
    await this.autoCloseStaleSessions();
    const records = await this.prisma.attendance.findMany({
      where: { employeeId },
      include: { employee: { select: { name: true, email: true } } },
      orderBy: { clockInTime: 'desc' },
      take: limit,
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
    return this.getAllExceptions('PENDING');
  }

  async getAllExceptions(status?: string): Promise<AttendanceResponseDto[]> {
    await this.autoCloseStaleSessions();
    const where: any = { isException: true };
    if (status && status !== 'ALL') {
      where.exceptionStatus = status;
    }
    const records = await this.prisma.attendance.findMany({
      where,
      include: { employee: { select: { name: true, email: true } } },
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
