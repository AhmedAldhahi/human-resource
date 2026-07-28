import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSalaryAdvanceDto,
  UpdateSalaryAdvanceDto,
  SalaryAdvanceDto,
  AdvanceStatus,
} from '@hrms/shared';

@Injectable()
export class SalaryAdvanceService {
  constructor(private readonly prisma: PrismaService) {}

  private mapAdvance(advance: any): SalaryAdvanceDto {
    return {
      id: advance.id,
      userId: advance.userId,
      userName: advance.user?.name,
      userEmail: advance.user?.email,
      totalAmount: advance.totalAmount,
      monthlyInstallment: advance.monthlyInstallment,
      paidAmount: advance.paidAmount,
      remainingBalance: advance.remainingBalance,
      startMonth: advance.startMonth,
      status: advance.status as AdvanceStatus,
      notes: advance.notes ?? null,
      createdById: advance.createdById ?? null,
      createdAt: advance.createdAt.toISOString(),
      updatedAt: advance.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateSalaryAdvanceDto, createdById?: string): Promise<SalaryAdvanceDto> {
    if (!dto.totalAmount || dto.totalAmount <= 0) {
      throw new BadRequestException('Total advance amount must be greater than 0');
    }
    if (!dto.monthlyInstallment || dto.monthlyInstallment <= 0) {
      throw new BadRequestException('Monthly installment amount must be greater than 0');
    }
    if (!dto.startMonth || !/^\d{4}-\d{2}$/.test(dto.startMonth)) {
      throw new BadRequestException('Start month must be in YYYY-MM format');
    }

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Employee not found');

    // Check if user already has an active advance
    const activeExisting = await this.prisma.salaryAdvance.findFirst({
      where: { userId: dto.userId, status: AdvanceStatus.ACTIVE },
    });
    if (activeExisting) {
      throw new BadRequestException('Employee already has an active salary advance in progress.');
    }

    const advance = await this.prisma.salaryAdvance.create({
      data: {
        userId: dto.userId,
        totalAmount: dto.totalAmount,
        monthlyInstallment: dto.monthlyInstallment,
        paidAmount: 0,
        remainingBalance: dto.totalAmount,
        startMonth: dto.startMonth,
        status: AdvanceStatus.ACTIVE,
        notes: dto.notes?.trim() || null,
        createdById: createdById || null,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return this.mapAdvance(advance);
  }

  async findAll(userId?: string, status?: AdvanceStatus): Promise<SalaryAdvanceDto[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const advances = await this.prisma.salaryAdvance.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return advances.map((a) => this.mapAdvance(a));
  }

  async findOne(id: string): Promise<SalaryAdvanceDto> {
    const advance = await this.prisma.salaryAdvance.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!advance) throw new NotFoundException('Salary advance record not found');
    return this.mapAdvance(advance);
  }

  async update(id: string, dto: UpdateSalaryAdvanceDto): Promise<SalaryAdvanceDto> {
    const existing = await this.prisma.salaryAdvance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary advance record not found');

    const data: any = {};
    if (dto.totalAmount !== undefined) {
      data.totalAmount = dto.totalAmount;
      data.remainingBalance = Math.max(0, dto.totalAmount - existing.paidAmount);
      if (data.remainingBalance <= 0) data.status = AdvanceStatus.COMPLETED;
    }
    if (dto.monthlyInstallment !== undefined) {
      data.monthlyInstallment = dto.monthlyInstallment;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    const updated = await this.prisma.salaryAdvance.update({
      where: { id },
      data,
      include: { user: { select: { name: true, email: true } } },
    });

    return this.mapAdvance(updated);
  }

  async cancel(id: string): Promise<SalaryAdvanceDto> {
    const existing = await this.prisma.salaryAdvance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Salary advance record not found');

    const updated = await this.prisma.salaryAdvance.update({
      where: { id },
      data: { status: AdvanceStatus.CANCELLED },
      include: { user: { select: { name: true, email: true } } },
    });

    return this.mapAdvance(updated);
  }
}
