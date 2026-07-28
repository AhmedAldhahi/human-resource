import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalaryAdvanceService } from './salary-advance.service';
import {
  CreateSalaryAdvanceDto,
  UpdateSalaryAdvanceDto,
  AdvanceStatus,
  Role,
} from '@hrms/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('salary-advances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalaryAdvanceController {
  constructor(private readonly salaryAdvanceService: SalaryAdvanceService) {}

  @Post()
  @Roles(Role.HR, Role.ADMIN)
  async create(@Body() dto: CreateSalaryAdvanceDto, @Request() req: any) {
    return this.salaryAdvanceService.create(dto, req.user?.id);
  }

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: AdvanceStatus,
    @Request() req?: any,
  ) {
    const isHrOrAdmin = req.user?.role === Role.HR || req.user?.role === Role.ADMIN;
    // Employees can only view their own advances
    const targetUserId = isHrOrAdmin ? userId : req.user?.id;
    return this.salaryAdvanceService.findAll(targetUserId, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salaryAdvanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.HR, Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateSalaryAdvanceDto) {
    return this.salaryAdvanceService.update(id, dto);
  }

  @Patch(':id/cancel')
  @Roles(Role.HR, Role.ADMIN)
  async cancel(@Param('id') id: string) {
    return this.salaryAdvanceService.cancel(id);
  }
}
