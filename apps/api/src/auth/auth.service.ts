import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginResponseDto, UserResponseDto, EmployeeType, CARD_POINT_VALUES } from '@hrms/shared';

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

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const cards = await this.prisma.performanceCard.findMany({
      where: {
        employeeId: user.id,
        issuedAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { cardType: true },
    });

    const currentMonthPoints = cards.reduce(
      (sum, c) => sum + (CARD_POINT_VALUES[c.cardType as keyof typeof CARD_POINT_VALUES] || 0),
      0,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      isActive: (user as any).isActive ?? true,
      employeeType: (user.employeeType as EmployeeType) ?? EmployeeType.FIXED,
      monthlySalary: user.monthlySalary ?? 0,
      photoUrl: user.photoUrl ?? null,
      absenceDaysLeft: user.absenceDaysLeft ?? 28,
      sickDaysLeft: user.sickDaysLeft ?? 14,
      vacationDaysLeft: user.vacationDaysLeft ?? 14,
      earlyLeaveMinutesAccumulated: user.earlyLeaveMinutesAccumulated ?? 0,
      netCardPoints: currentMonthPoints,
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
