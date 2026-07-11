import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UserResponseDto } from '@hrms/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        netCardPoints: true,
        createdAt: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      netCardPoints: user.netCardPoints,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        netCardPoints: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      netCardPoints: user.netCardPoints,
      createdAt: user.createdAt.toISOString(),
    };
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
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        netCardPoints: true,
        createdAt: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserResponseDto['role'],
      netCardPoints: user.netCardPoints,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
