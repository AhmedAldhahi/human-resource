import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SavePayrollDto,
  DraftPayrollDto,
  PayrollRecordDto,
  CARD_POINT_VALUES,
  PayrollStatus,
  EmployeeType
} from '@hrms/shared';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  async getDraftPayroll(month: string): Promise<DraftPayrollDto[]> {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('Month must be provided in YYYY-MM format (e.g. 2026-07)');
    }
    const [year, monthStr] = month.split('-');
    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(monthStr, 10);

    const startOfMonth = new Date(parsedYear, parsedMonth - 1, 1);
    const endOfMonth = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        attendances: {
          where: { clockInTime: { gte: startOfMonth, lte: endOfMonth } },
        },
        receivedCards: {
          where: { issuedAt: { gte: startOfMonth, lte: endOfMonth } },
        },
        payrollRecords: {
          where: { month },
        },
      },
    });

    return users.map((user) => {
      // 1. Calculate Tracked Hours
      let totalMins = 0;
      const wfhDates = new Set<string>();

      for (const att of user.attendances) {
        if (att.clockOutTime) {
          totalMins += (att.clockOutTime.getTime() - att.clockInTime.getTime()) / 60000;
        }

        // 2. Track WFH Days (excluding Fridays)
        if (att.workLocation === 'HOME') {
          const date = new Date(att.clockInTime);
          if (date.getDay() !== 5) { // 5 is Friday
            wfhDates.add(date.toISOString().split('T')[0]);
          }
        }
      }

      const trackedHours = Number((totalMins / 60).toFixed(2));
      const wfhDays = wfhDates.size;
      
      // 3. Transportation Deductions (only for Fixed Income)
      let transportationDeductions = 0;
      if (user.employeeType === EmployeeType.FIXED && user.transportationAllowance > 0) {
        transportationDeductions = Number((wfhDays * (user.transportationAllowance / 26)).toFixed(2));
      }

      // 4. Calculate Net Card Points
      let cardPointsReference = 0;
      for (const card of user.receivedCards) {
        cardPointsReference += CARD_POINT_VALUES[card.cardType] || 0;
      }

      const existingRecord = user.payrollRecords?.[0];

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        employeeType: user.employeeType as EmployeeType,
        monthlySalary: user.monthlySalary,
        hourlyWage: user.hourlyWage,
        transportationAllowance: user.transportationAllowance,
        recurringBonus: user.recurringBonus,
        trackedHours,
        transportationDeductions,
        wfhDays,
        cardPointsReference,
        savedApprovedHours: existingRecord?.approvedHours,
        savedBonusAmount: existingRecord?.bonusAmount,
        savedBonusNotes: existingRecord?.bonusNotes ?? undefined,
        savedDeductionAmount: existingRecord?.deductionAmount,
        savedDeductionNotes: existingRecord?.deductionNotes ?? undefined,
        savedStatus: existingRecord?.status as PayrollStatus,
      };
    });
  }

  async savePayroll(dto: SavePayrollDto): Promise<PayrollRecordDto> {
    const existing = await this.prisma.payrollRecord.findFirst({
      where: { userId: dto.userId, month: dto.month },
    });

    let record;
    if (existing) {
      record = await this.prisma.payrollRecord.update({
        where: { id: existing.id },
        data: {
          baseWage: dto.baseWage,
          transportationAllowance: dto.transportationAllowance,
          recurringBonus: dto.recurringBonus,
          approvedHours: dto.approvedHours,
          transportationDeductions: dto.transportationDeductions,
          bonusAmount: dto.bonusAmount,
          bonusNotes: dto.bonusNotes ?? null,
          deductionAmount: dto.deductionAmount,
          deductionNotes: dto.deductionNotes ?? null,
          cardPointsReference: dto.cardPointsReference,
          finalPayout: dto.finalPayout,
          status: dto.status ?? PayrollStatus.FINALIZED,
        },
      });
    } else {
      record = await this.prisma.payrollRecord.create({
        data: {
          userId: dto.userId,
          month: dto.month,
          baseWage: dto.baseWage,
          transportationAllowance: dto.transportationAllowance,
          recurringBonus: dto.recurringBonus,
          approvedHours: dto.approvedHours,
          transportationDeductions: dto.transportationDeductions,
          bonusAmount: dto.bonusAmount,
          bonusNotes: dto.bonusNotes ?? null,
          deductionAmount: dto.deductionAmount,
          deductionNotes: dto.deductionNotes ?? null,
          cardPointsReference: dto.cardPointsReference,
          finalPayout: dto.finalPayout,
          status: dto.status ?? PayrollStatus.FINALIZED,
        },
      });
    }

    return this.mapToDto(record);
  }

  async getHistory(month?: string): Promise<(PayrollRecordDto & { userName: string; email: string })[]> {
    const records = await this.prisma.payrollRecord.findMany({
      where: month ? { month } : undefined,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ month: 'desc' }, { user: { name: 'asc' } }],
    });

    return records.map(r => ({
      ...this.mapToDto(r),
      userName: r.user.name,
      email: r.user.email,
    }));
  }

  private mapToDto(record: any): PayrollRecordDto {
    return {
      id: record.id,
      userId: record.userId,
      month: record.month,
      baseWage: record.baseWage,
      transportationAllowance: record.transportationAllowance,
      recurringBonus: record.recurringBonus,
      approvedHours: record.approvedHours,
      transportationDeductions: record.transportationDeductions,
      bonusAmount: record.bonusAmount,
      bonusNotes: record.bonusNotes,
      deductionAmount: record.deductionAmount,
      deductionNotes: record.deductionNotes,
      cardPointsReference: record.cardPointsReference,
      finalPayout: record.finalPayout,
      status: record.status as PayrollStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
