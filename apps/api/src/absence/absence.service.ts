import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAbsenceDto,
  AbsenceRecordResponseDto,
  AbsenceStatus,
  AbsenceType,
  WorkLocation,
  EmployeeType,
} from '@hrms/shared';
import { PresenceGateway } from '../presence/presence.gateway';

@Injectable()
export class AbsenceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly presenceGateway?: PresenceGateway,
  ) {}

  private mapRecord(record: any): AbsenceRecordResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      userName: record.user?.name,
      userEmail: record.user?.email,
      date: record.date,
      type: record.type as AbsenceType,
      status: record.status as AbsenceStatus,
      reason: record.reason ?? null,
      documentUrl: record.documentUrl ?? null,
      earlyLeaveMinutes: record.earlyLeaveMinutes ?? null,
      isPaid: record.isPaid,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async createRequest(
    userId: string,
    dto: CreateAbsenceDto,
    documentUrl?: string,
  ): Promise<AbsenceRecordResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const earlyMinutes = dto.earlyLeaveMinutes !== undefined && dto.earlyLeaveMinutes !== null
      ? Number(dto.earlyLeaveMinutes)
      : undefined;

    // If Per-Hour employee:
    if (user.employeeType === EmployeeType.PER_HOUR) {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Per-hour employees must provide a reason when reporting off or absent.');
      }
      const record = await this.prisma.absenceRecord.create({
        data: {
          userId,
          date: dto.date,
          type: AbsenceType.HOURLY_OFF,
          status: AbsenceStatus.APPROVED, // auto approved so HR sees it in history/reports right away
          reason: dto.reason.trim(),
          documentUrl: documentUrl ?? null,
          earlyLeaveMinutes: earlyMinutes,
          isPaid: false, // hourly workers only get paid when clocked in
        },
        include: { user: true },
      });
      return this.mapRecord(record);
    }

    // If Fixed Income employee:
    if (dto.type === AbsenceType.SICK_LEAVE) {
      if (!documentUrl && (!dto.reason || dto.reason.trim().length === 0)) {
        throw new BadRequestException('Sick leave requests must include a medical verification note/document or reason.');
      }
    } else if (dto.type === AbsenceType.EARLY_LEAVE) {
      if (!earlyMinutes || earlyMinutes <= 0) {
        throw new BadRequestException('Please specify the number of hours/minutes left early.');
      }
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Please provide a reason for leaving early.');
      }
    } else if (dto.type === AbsenceType.VACATION || dto.type === AbsenceType.REGULAR) {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Please provide details/reason for your leave request.');
      }
    }

    // Check balance for paid vs unpaid if fixed employee
    let isPaid = true;
    if (dto.type === AbsenceType.SICK_LEAVE) {
      isPaid = user.sickDaysLeft > 0;
    } else if (dto.type === AbsenceType.VACATION || dto.type === AbsenceType.REGULAR) {
      isPaid = user.vacationDaysLeft > 0;
    } else if (dto.type === AbsenceType.EARLY_LEAVE) {
      isPaid = true;
    }

    const record = await this.prisma.absenceRecord.create({
      data: {
        userId,
        date: dto.date,
        type: dto.type,
        status: AbsenceStatus.PENDING,
        reason: dto.reason ?? null,
        documentUrl: documentUrl ?? null,
        earlyLeaveMinutes: earlyMinutes,
        isPaid,
      },
      include: { user: true },
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    return this.mapRecord(record);
  }

  async getMyRecords(userId: string): Promise<AbsenceRecordResponseDto[]> {
    const records = await this.prisma.absenceRecord.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { date: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async getAllRecords(): Promise<AbsenceRecordResponseDto[]> {
    const records = await this.prisma.absenceRecord.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async updateStatus(id: string, status: AbsenceStatus): Promise<AbsenceRecordResponseDto> {
    const record = await this.prisma.absenceRecord.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!record) {
      throw new NotFoundException('Absence record not found.');
    }

    let isPaid = record.isPaid;

    if (status === AbsenceStatus.APPROVED && record.status !== AbsenceStatus.APPROVED) {
      if (record.type === AbsenceType.SICK_LEAVE) {
        if (record.user.sickDaysLeft > 0) {
          await this.prisma.user.update({
            where: { id: record.userId },
            data: {
              sickDaysLeft: Math.max(0, record.user.sickDaysLeft - 1),
              absenceDaysLeft: Math.max(0, record.user.absenceDaysLeft - 1),
            },
          });
          isPaid = true;
        } else {
          isPaid = false;
        }
      } else if (record.type === AbsenceType.VACATION || record.type === AbsenceType.REGULAR) {
        if (record.user.vacationDaysLeft > 0) {
          await this.prisma.user.update({
            where: { id: record.userId },
            data: {
              vacationDaysLeft: Math.max(0, record.user.vacationDaysLeft - 1),
              absenceDaysLeft: Math.max(0, record.user.absenceDaysLeft - 1),
            },
          });
          isPaid = true;
        } else {
          isPaid = false;
        }
      } else if (record.type === AbsenceType.EARLY_LEAVE && record.earlyLeaveMinutes && record.earlyLeaveMinutes > 0) {
        const user = record.user;
        const newAccumulated = user.earlyLeaveMinutesAccumulated + record.earlyLeaveMinutes;
        const daysToSubtract = Math.floor(newAccumulated / 240);
        const remainingAccumulated = newAccumulated % 240;

        await this.prisma.user.update({
          where: { id: record.userId },
          data: {
            earlyLeaveMinutesAccumulated: remainingAccumulated,
            ...(daysToSubtract > 0
              ? {
                  vacationDaysLeft: Math.max(0, user.vacationDaysLeft - daysToSubtract),
                  absenceDaysLeft: Math.max(0, user.absenceDaysLeft - daysToSubtract),
                }
              : {}),
          },
        });
      }
    } else if (record.status === AbsenceStatus.APPROVED && status !== AbsenceStatus.APPROVED) {
      // Reverting an approved paid absence back -> refund day
      if (record.isPaid) {
        if (record.type === AbsenceType.SICK_LEAVE) {
          await this.prisma.user.update({
            where: { id: record.userId },
            data: {
              sickDaysLeft: Math.min(14, record.user.sickDaysLeft + 1),
              absenceDaysLeft: Math.min(28, record.user.absenceDaysLeft + 1),
            },
          });
        } else if (record.type === AbsenceType.VACATION || record.type === AbsenceType.REGULAR) {
          await this.prisma.user.update({
            where: { id: record.userId },
            data: {
              vacationDaysLeft: Math.min(14, record.user.vacationDaysLeft + 1),
              absenceDaysLeft: Math.min(28, record.user.absenceDaysLeft + 1),
            },
          });
        }
      }
    }

    const updated = await this.prisma.absenceRecord.update({
      where: { id },
      data: { status, isPaid },
      include: { user: true },
    });

    this.presenceGateway?.broadcastPresenceUpdate();

    return this.mapRecord(updated);
  }

  async checkAutoAbsencesForDate(dateStr: string): Promise<{ processed: number; created: number }> {
    const checkDate = new Date(dateStr);
    if (checkDate.getDay() === 5) {
      // Friday is the weekend/day off — no absence deduction
      return { processed: 0, created: 0 };
    }

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });
    let created = 0;

    for (const user of users) {
      if (user.employeeType === EmployeeType.PER_HOUR) continue; // no auto absence checks needed for hourly workers

      const attendance = await this.prisma.attendance.findFirst({
        where: {
          employeeId: user.id,
          clockInTime: {
            gte: new Date(`${dateStr}T00:00:00.000Z`),
            lte: new Date(`${dateStr}T23:59:59.999Z`),
          },
        },
      });

      if (!attendance) {
        const existingAbsence = await this.prisma.absenceRecord.findFirst({
          where: { userId: user.id, date: dateStr },
        });

        if (!existingAbsence) {
          if (user.vacationDaysLeft > 0) {
            await this.prisma.absenceRecord.create({
              data: {
                userId: user.id,
                date: dateStr,
                type: AbsenceType.REGULAR,
                status: AbsenceStatus.APPROVED,
                reason: 'Auto-detected absence (missed workday)',
                isPaid: true,
              },
            });
            await this.prisma.user.update({
              where: { id: user.id },
              data: {
                vacationDaysLeft: user.vacationDaysLeft - 1,
                absenceDaysLeft: Math.max(0, user.absenceDaysLeft - 1),
              },
            });
          } else {
            await this.prisma.absenceRecord.create({
              data: {
                userId: user.id,
                date: dateStr,
                type: AbsenceType.REGULAR,
                status: AbsenceStatus.PENDING,
                reason: 'Zero Balance - Missed workday (Requires HR Approval)',
                isPaid: false,
              },
            });
          }
          created++;
        }
      }
    }

    return { processed: users.length, created };
  }
}

