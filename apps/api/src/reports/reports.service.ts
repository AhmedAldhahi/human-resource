import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  OverviewReportDto,
  AttendanceReportDto,
  PayrollItemDto,
  EmployeeType,
  WorkLocation,
  AttendanceStatus,
  AbsenceStatus,
  CARD_POINT_VALUES,
} from '@hrms/shared';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<OverviewReportDto> {
    const totalEmployees = await this.prisma.user.count();
    const fixedIncomeCount = await this.prisma.user.count({
      where: { employeeType: EmployeeType.FIXED },
    });
    const perHourCount = await this.prisma.user.count({
      where: { employeeType: EmployeeType.PER_HOUR },
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

    const todayAttendances = await this.prisma.attendance.findMany({
      where: {
        clockInTime: { gte: startOfToday, lte: endOfToday },
      },
    });

    const todayClockedIn = todayAttendances.length;
    const todayOfficeCount = todayAttendances.filter(
      (a) => a.workLocation === WorkLocation.OFFICE,
    ).length;
    const todayHomeCount = todayAttendances.filter(
      (a) => a.workLocation === WorkLocation.HOME,
    ).length;
    const todayLateCount = todayAttendances.filter((a) => a.latePenalty).length;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalAbsencesThisMonth = await this.prisma.absenceRecord.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    return {
      totalEmployees,
      fixedIncomeCount,
      perHourCount,
      todayClockedIn,
      todayOfficeCount,
      todayHomeCount,
      todayLateCount,
      totalAbsencesThisMonth,
    };
  }

  async getAttendanceTrend(days: number = 7): Promise<AttendanceReportDto[]> {
    const result: AttendanceReportDto[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const attendances = await this.prisma.attendance.findMany({
        where: { clockInTime: { gte: startOfDay, lte: endOfDay } },
      });

      result.push({
        date: dateStr,
        totalClockIns: attendances.length,
        officeCount: attendances.filter((a) => a.workLocation === WorkLocation.OFFICE).length,
        homeCount: attendances.filter((a) => a.workLocation === WorkLocation.HOME).length,
        lateCount: attendances.filter((a) => a.latePenalty).length,
      });
    }

    return result;
  }

  async getPayrollSummary(year?: number, month?: number): Promise<PayrollItemDto[]> {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month ?? new Date().getMonth(); // 0-indexed

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
    });

    const items: PayrollItemDto[] = [];

    for (const user of users) {
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: user.id,
          clockInTime: { gte: startOfMonth, lte: endOfMonth },
          status: AttendanceStatus.CLOCKED_OUT,
          clockOutTime: { not: null },
        },
      });

      let totalMinutesWorked = 0;
      let penaltyMinutesTotal = 0;

      for (const att of attendances) {
        if (att.clockOutTime) {
          const diffMs = att.clockOutTime.getTime() - att.clockInTime.getTime();
          const shiftMins = Math.floor(diffMs / (1000 * 60));
          if (shiftMins > 0) {
            totalMinutesWorked += shiftMins;
          }
        }
        if (att.latePenalty) {
          penaltyMinutesTotal += att.penaltyMinutes || 45;
        }
      }

      const netMinutes = Math.max(0, totalMinutesWorked - penaltyMinutesTotal);
      const totalHoursWorked = Math.round((netMinutes / 60) * 100) / 100;

      // Count unpaid absences in this month
      const absences = await this.prisma.absenceRecord.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startOfMonth.toISOString().split('T')[0],
            lte: endOfMonth.toISOString().split('T')[0],
          },
          status: AbsenceStatus.APPROVED,
          isPaid: false,
        },
      });
      const unpaidAbsenceDays = absences.length;

      // Query performance cards specifically issued in this target month
      const monthCards = await this.prisma.performanceCard.findMany({
        where: {
          employeeId: user.id,
          issuedAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: { cardType: true },
      });

      const monthPoints = monthCards.reduce(
        (sum, c) => sum + (CARD_POINT_VALUES[c.cardType as keyof typeof CARD_POINT_VALUES] || 0),
        0,
      );

      let calculatedCompensation = 0;
      const empType = (user.employeeType as EmployeeType) ?? EmployeeType.FIXED;
      const monthlySalary = user.monthlySalary ?? 0;
      const hourlyWage = user.hourlyWage ?? 0;
      const pointsAdjustment = monthPoints; // $1 per card point

      if (empType === EmployeeType.FIXED) {
        // Fixed salary minus unpaid absence deductions plus card points
        const dailyRate = monthlySalary / 22; // ~22 working days
        const deduction = unpaidAbsenceDays * dailyRate;
        calculatedCompensation = Math.max(0, monthlySalary - deduction + pointsAdjustment);
      } else {
        // Per-hour rate times net worked hours plus card points
        calculatedCompensation = Math.max(0, totalHoursWorked * hourlyWage + pointsAdjustment);
      }

      items.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        department: user.department ?? null,
        employeeType: empType,
        monthlySalary,
        hourlyWage,
        totalHoursWorked,
        penaltyMinutesTotal,
        unpaidAbsenceDays,
        netCardPoints: monthPoints,
        calculatedCompensation: Math.round(calculatedCompensation * 100) / 100,
      });
    }

    return items;
  }
}
