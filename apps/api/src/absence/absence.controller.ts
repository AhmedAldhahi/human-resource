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
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { AbsenceService } from './absence.service';
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
  constructor(private readonly absenceService: AbsenceService) {}

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('document', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/documents';
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `doc-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createRequest(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateAbsenceDto,
    @UploadedFile() file: any,
  ): Promise<AbsenceRecordResponseDto> {
    const documentUrl = file ? `/uploads/documents/${file.filename}` : undefined;
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
