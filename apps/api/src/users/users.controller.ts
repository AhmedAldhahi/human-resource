import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { UsersService } from './users.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  CreateUserDto,
  UserResponseDto,
  UpdateProfileDto,
  UpdateWageDto,
  UpdateEmployeeTypeDto,
  UpdateActiveStatusDto,
} from '@hrms/shared';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async findAll(@Query('includeInactive') includeInactive?: string): Promise<UserResponseDto[]> {
    return this.usersService.findAll(includeInactive === 'true');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findById(req.user.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('id') id: string,
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<UserResponseDto> {
    if (
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.HR &&
      req.user.userId !== id
    ) {
      throw new ForbiddenException('You do not have permission to view this user.');
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: { user: { userId: string; email: string; role: Role } },
  ): Promise<UserResponseDto> {
    if (
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.HR &&
      req.user.userId !== id
    ) {
      throw new ForbiddenException('You do not have permission to update this user profile.');
    }

    return this.usersService.updateProfile(id, dto);
  }

  @Patch(':id/wage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async updateWage(
    @Param('id') id: string,
    @Body() dto: UpdateWageDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateWage(id, dto);
  }

  @Patch(':id/employee-type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async updateEmployeeType(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeTypeDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateEmployeeType(id, dto);
  }

  @Patch(':id/reset-absence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async resetAbsenceBalance(
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.resetAbsenceBalance(id);
  }

  @Post(':id/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Request() req: { user: { userId: string; role: Role } },
  ): Promise<UserResponseDto> {
    if (
      req.user.role !== Role.ADMIN &&
      req.user.role !== Role.HR &&
      req.user.userId !== id
    ) {
      throw new ForbiddenException('You cannot upload a photo for another user.');
    }

    if (!file) {
      throw new BadRequestException('No photo file uploaded.');
    }

    const photoUrl = await this.supabaseService.uploadFile(file, 'photos');
    return this.usersService.updatePhoto(id, photoUrl);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateActiveStatusDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, dto.isActive);
  }
}

