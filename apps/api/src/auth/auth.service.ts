import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponseDto, UserResponseDto, EmployeeType } from '@hrms/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

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

  async login(user: UserResponseDto): Promise<LoginResponseDto> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }
}
