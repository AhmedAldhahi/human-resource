import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  UserResponseDto,
  UpdateProfileDto,
  UpdateWageDto,
  UpdateEmployeeTypeDto,
  EmployeeType,
  CARD_POINT_VALUES,
} from '@hrms/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async getPointsMapForCurrentMonth(): Promise<Map<string, number>> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const cards = await this.prisma.performanceCard.findMany({
      where: { issuedAt: { gte: startOfMonth, lte: endOfMonth } },
      select: { employeeId: true, cardType: true },
    });

    const map = new Map<string, number>();
    for (const c of cards) {
      const current = map.get(c.employeeId) || 0;
      const pointVal = CARD_POINT_VALUES[c.cardType as keyof typeof CARD_POINT_VALUES] || 0;
      map.set(c.employeeId, current + pointVal);
    }
    return map;
  }

  private mapUser(user: any, netPoints = 0): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      isActive: user.isActive ?? true,
      employeeType: (user.employeeType as EmployeeType) ?? EmployeeType.FIXED,
      monthlySalary: user.monthlySalary ?? 0,
      photoUrl: user.photoUrl ?? null,
      absenceDaysLeft: user.absenceDaysLeft ?? 28,
      sickDaysLeft: user.sickDaysLeft ?? 14,
      vacationDaysLeft: user.vacationDaysLeft ?? 14,
      earlyLeaveMinutesAccumulated: user.earlyLeaveMinutesAccumulated ?? 0,
      netCardPoints: netPoints,
      hourlyWage: user.hourlyWage ?? 0,
      phone: user.phone ?? null,
      department: user.department ?? null,
      bio: user.bio ?? null,
      customStatus: user.customStatus ?? null,
      customEmoji: user.customEmoji ?? null,
      tsUsername: user.tsUsername ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    employeeType: true,
    monthlySalary: true,
    photoUrl: true,
    absenceDaysLeft: true,
    sickDaysLeft: true,
    vacationDaysLeft: true,
    earlyLeaveMinutesAccumulated: true,
    netCardPoints: true,
    hourlyWage: true,
    phone: true,
    department: true,
    bio: true,
    customStatus: true,
    customEmoji: true,
    tsUsername: true,
    createdAt: true,
  };

  async findAll(includeInactive: boolean = false): Promise<UserResponseDto[]> {
    const [users, pointsMap] = await Promise.all([
      this.prisma.user.findMany({
        where: includeInactive ? undefined : { isActive: true },
        select: this.userSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.getPointsMapForCurrentMonth(),
    ]);

    return users.map((user) => this.mapUser(user, pointsMap.get(user.id) || 0));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const [user, pointsMap] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: this.userSelect,
      }),
      this.getPointsMapForCurrentMonth(),
    ]);

    if (!user) {
      return null;
    }

    return this.mapUser(user, pointsMap.get(user.id) || 0);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role,
        employeeType: dto.employeeType ?? EmployeeType.FIXED,
        monthlySalary: dto.monthlySalary ?? 0,
        hourlyWage: dto.hourlyWage ?? 0,
        phone: dto.phone ?? null,
        department: dto.department ?? null,
        bio: dto.bio ?? null,
      },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(user, pointsMap.get(user.id) || 0);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.customStatus !== undefined ? { customStatus: dto.customStatus } : {}),
        ...(dto.customEmoji !== undefined ? { customEmoji: dto.customEmoji } : {}),
        ...(dto.tsUsername !== undefined ? { tsUsername: dto.tsUsername } : {}),
      },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }

  async updateWage(id: string, dto: UpdateWageDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.hourlyWage !== undefined ? { hourlyWage: dto.hourlyWage } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.department !== undefined ? { department: dto.department } : {}),
      },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }

  async updateEmployeeType(id: string, dto: UpdateEmployeeTypeDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        employeeType: dto.employeeType,
        ...(dto.monthlySalary !== undefined ? { monthlySalary: dto.monthlySalary } : {}),
        ...(dto.hourlyWage !== undefined ? { hourlyWage: dto.hourlyWage } : {}),
      },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }

  async resetAbsenceBalance(id: string): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        absenceDaysLeft: 28,
        sickDaysLeft: 14,
        vacationDaysLeft: 14,
        earlyLeaveMinutesAccumulated: 0,
      },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }

  async updatePhoto(id: string, photoUrl: string): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { photoUrl },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }
  async updateStatus(id: string, isActive: boolean): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: this.userSelect,
    });

    const pointsMap = await this.getPointsMapForCurrentMonth();
    return this.mapUser(updated, pointsMap.get(updated.id) || 0);
  }
}

