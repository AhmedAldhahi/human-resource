import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PresenceStatus,
  OnlineStatusRecordDto,
  PresenceStatsDto,
  UpdateCustomStatusDto,
  AttendanceStatus,
  WorkLocation,
  AbsenceStatus,
  Role,
} from '@hrms/shared';

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getLivePresence(): Promise<OnlineStatusRecordDto[]> {
    // Get all users
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all currently open attendance records
    const openAttendances = await this.prisma.attendance.findMany({
      where: {
        status: AttendanceStatus.CLOCKED_IN,
      },
    });

    // Get today's date in YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    // Get approved absences for today
    const todayAbsences = await this.prisma.absenceRecord.findMany({
      where: {
        date: todayStr,
        status: AbsenceStatus.APPROVED,
      },
    });

    const attendanceMap = new Map(
      openAttendances.map((a) => [a.employeeId, a])
    );
    const absenceMap = new Map(
      todayAbsences.map((abs) => [abs.userId, abs])
    );

    const records: OnlineStatusRecordDto[] = users.map((user) => {
      const attendance = attendanceMap.get(user.id);
      const absence = absenceMap.get(user.id);

      let status: PresenceStatus;
      let isOnline = false;
      let clockInTime: string | null = null;
      let workLocation: WorkLocation | null = null;
      let intendedTask: string | null = null;
      let absenceType = null;
      let absenceReason: string | null = null;

      if (attendance) {
        isOnline = true;
        clockInTime = attendance.clockInTime.toISOString();
        workLocation = attendance.workLocation as WorkLocation;
        intendedTask = attendance.intendedTask;
        status =
          workLocation === WorkLocation.HOME
            ? PresenceStatus.ONLINE_REMOTE
            : PresenceStatus.ONLINE_OFFICE;
      } else if (absence) {
        status = PresenceStatus.ON_LEAVE;
        absenceType = absence.type;
        absenceReason = absence.reason ?? null;
      } else {
        status = PresenceStatus.OFFLINE;
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        department: user.department ?? null,
        photoUrl: user.photoUrl ?? null,
        status,
        isOnline,
        clockInTime,
        workLocation,
        intendedTask,
        customStatus: user.customStatus ?? null,
        customEmoji: user.customEmoji ?? null,
        absenceType,
        absenceReason,
        netCardPoints: user.netCardPoints ?? 0,
      };
    });

    // Sort: Online Office -> Online Remote -> On Leave -> Offline
    const statusOrder: Record<PresenceStatus, number> = {
      [PresenceStatus.ONLINE_OFFICE]: 1,
      [PresenceStatus.ONLINE_REMOTE]: 2,
      [PresenceStatus.ON_LEAVE]: 3,
      [PresenceStatus.OFFLINE]: 4,
    };

    return records.sort((a, b) => {
      const orderA = statusOrder[a.status];
      const orderB = statusOrder[b.status];
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }

  async getPresenceStats(): Promise<PresenceStatsDto> {
    const records = await this.getLivePresence();

    const stats: PresenceStatsDto = {
      totalEmployees: records.length,
      onlineCount: 0,
      officeCount: 0,
      remoteCount: 0,
      onLeaveCount: 0,
      offlineCount: 0,
    };

    for (const r of records) {
      if (r.status === PresenceStatus.ONLINE_OFFICE) {
        stats.onlineCount++;
        stats.officeCount++;
      } else if (r.status === PresenceStatus.ONLINE_REMOTE) {
        stats.onlineCount++;
        stats.remoteCount++;
      } else if (r.status === PresenceStatus.ON_LEAVE) {
        stats.onLeaveCount++;
      } else {
        stats.offlineCount++;
      }
    }

    return stats;
  }

  async updateCustomStatus(userId: string, dto: UpdateCustomStatusDto): Promise<OnlineStatusRecordDto[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.customStatus !== undefined ? { customStatus: dto.customStatus } : {}),
        ...(dto.customEmoji !== undefined ? { customEmoji: dto.customEmoji } : {}),
      },
    });

    return this.getLivePresence();
  }
}
