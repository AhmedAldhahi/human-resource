import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceResponseDto, AttendanceStatus, UpdateAttendanceDto, WorkLocation } from '@hrms/shared';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

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
        'You already have an open attendance record. Please clock out first.',
      );
    }

    const now = new Date();
    const isOffice = workLocation === WorkLocation.OFFICE;
    // Late penalty if arriving at office after 9 AM (hour >= 9 and minute > 0 or hour > 9)
    // To be precise: if hour >= 9 (e.g. 9:01 AM or later, or exactly 9:00 if strictly after 9:00 AM)
    const isAfterNine = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
    const latePenalty = isOffice && isAfterNine;
    const penaltyMinutes = latePenalty ? 45 : 0;

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

    return {
      id: attendance.id,
      employeeId: attendance.employeeId,
      clockInTime: attendance.clockInTime.toISOString(),
      clockOutTime: attendance.clockOutTime
        ? attendance.clockOutTime.toISOString()
        : null,
      intendedTask: attendance.intendedTask,
      status: attendance.status as AttendanceStatus,
      workLocation: attendance.workLocation as WorkLocation,
      latePenalty: attendance.latePenalty,
      penaltyMinutes: attendance.penaltyMinutes,
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
      workLocation: attendance.workLocation as WorkLocation,
      latePenalty: attendance.latePenalty,
      penaltyMinutes: attendance.penaltyMinutes,
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
      workLocation: record.workLocation as WorkLocation,
      latePenalty: record.latePenalty,
      penaltyMinutes: record.penaltyMinutes,
    }));
  }

  async getByEmployee(employeeId: string): Promise<AttendanceResponseDto[]> {
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
      workLocation: record.workLocation as WorkLocation,
      latePenalty: record.latePenalty,
      penaltyMinutes: record.penaltyMinutes,
    }));
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

    const updated = await this.prisma.attendance.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      employeeId: updated.employeeId,
      clockInTime: updated.clockInTime.toISOString(),
      clockOutTime: updated.clockOutTime ? updated.clockOutTime.toISOString() : null,
      intendedTask: updated.intendedTask,
      status: updated.status as AttendanceStatus,
      workLocation: updated.workLocation as WorkLocation,
      latePenalty: updated.latePenalty,
      penaltyMinutes: updated.penaltyMinutes,
    };
  }
}


