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
} from '@hrms/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapUser(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      employeeType: (user.employeeType as EmployeeType) ?? EmployeeType.FIXED,
      monthlySalary: user.monthlySalary ?? 0,
      photoUrl: user.photoUrl ?? null,
      absenceDaysLeft: user.absenceDaysLeft ?? 28,
      sickDaysLeft: user.sickDaysLeft ?? 14,
      vacationDaysLeft: user.vacationDaysLeft ?? 14,
      earlyLeaveMinutesAccumulated: user.earlyLeaveMinutesAccumulated ?? 0,
      netCardPoints: user.netCardPoints ?? 0,
      hourlyWage: user.hourlyWage ?? 0,
      phone: user.phone ?? null,
      department: user.department ?? null,
      bio: user.bio ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
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
    createdAt: true,
  };

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: this.userSelect,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.mapUser(user));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });

    if (!user) {
      return null;
    }

    return this.mapUser(user);
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

    return this.mapUser(user);
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
      },
      select: this.userSelect,
    });

    return this.mapUser(updated);
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

    return this.mapUser(updated);
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

    return this.mapUser(updated);
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

    return this.mapUser(updated);
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

    return this.mapUser(updated);
  }
}

