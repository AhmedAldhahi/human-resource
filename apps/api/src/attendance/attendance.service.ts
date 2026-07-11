import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceResponseDto, AttendanceStatus } from '@hrms/shared';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async clockIn(
    employeeId: string,
    intendedTask: string,
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
        'You already have an open attendance record. Please clock out first.',
      );
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        intendedTask,
        status: AttendanceStatus.CLOCKED_IN,
      },
    });

    return {
      id: attendance.id,
      employeeId: attendance.employeeId,
      clockInTime: attendance.clockInTime.toISOString(),
      clockOutTime: attendance.clockOutTime
        ? attendance.clockOutTime.toISOString()
        : null,
      intendedTask: attendance.intendedTask,
      status: attendance.status as AttendanceStatus,
    };
  }

  async clockOut(employeeId: string): Promise<AttendanceResponseDto> {
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
      },
    });

    return {
      id: attendance.id,
      employeeId: attendance.employeeId,
      clockInTime: attendance.clockInTime.toISOString(),
      clockOutTime: attendance.clockOutTime
        ? attendance.clockOutTime.toISOString()
        : null,
      intendedTask: attendance.intendedTask,
      status: attendance.status as AttendanceStatus,
    };
  }

  async getMyAttendance(employeeId: string): Promise<AttendanceResponseDto[]> {
    const records = await this.prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockInTime: 'desc' },
    });

    return records.map((record) => ({
      id: record.id,
      employeeId: record.employeeId,
      clockInTime: record.clockInTime.toISOString(),
      clockOutTime: record.clockOutTime
        ? record.clockOutTime.toISOString()
        : null,
      intendedTask: record.intendedTask,
      status: record.status as AttendanceStatus,
    }));
  }
}
