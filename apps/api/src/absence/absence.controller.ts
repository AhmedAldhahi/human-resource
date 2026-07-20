import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { AbsenceService } from './absence.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  CreateAbsenceDto,
  AbsenceRecordResponseDto,
  UpdateAbsenceStatusDto,
} from '@hrms/shared';

@Controller('absence')
export class AbsenceController {
  constructor(
    private readonly absenceService: AbsenceService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async createRequest(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateAbsenceDto,
    @UploadedFile() file: any,
  ): Promise<AbsenceRecordResponseDto> {
    const documentUrl = file ? await this.supabaseService.uploadFile(file, 'documents') : undefined;
    return this.absenceService.createRequest(req.user.userId, dto, documentUrl);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyRecords(
    @Request() req: { user: { userId: string } },
  ): Promise<AbsenceRecordResponseDto[]> {
    return this.absenceService.getMyRecords(req.user.userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async getAllRecords(): Promise<AbsenceRecordResponseDto[]> {
    return this.absenceService.getAllRecords();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAbsenceStatusDto,
  ): Promise<AbsenceRecordResponseDto> {
    return this.absenceService.updateStatus(id, dto.status);
  }

  @Post('check-auto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async checkAutoAbsences(
    @Body() body: { date?: string },
  ): Promise<{ processed: number; created: number }> {
    const dateStr = body.date || new Date().toISOString().split('T')[0];
    return this.absenceService.checkAutoAbsencesForDate(dateStr);
  }
}
