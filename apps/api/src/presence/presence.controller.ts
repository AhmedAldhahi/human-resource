import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceGateway } from './presence.gateway';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  OnlineStatusRecordDto,
  PresenceStatsDto,
  UpdateCustomStatusDto,
} from '@hrms/shared';

@Controller('presence')
export class PresenceController {
  constructor(
    private readonly presenceService: PresenceService,
    private readonly presenceGateway: PresenceGateway,
  ) {}

  @Get('live')
  @UseGuards(JwtAuthGuard)
  async getLivePresence(): Promise<OnlineStatusRecordDto[]> {
    return this.presenceService.getLivePresence();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getPresenceStats(): Promise<PresenceStatsDto> {
    return this.presenceService.getPresenceStats();
  }

  @Patch('custom-status')
  @UseGuards(JwtAuthGuard)
  async updateCustomStatus(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateCustomStatusDto,
  ): Promise<OnlineStatusRecordDto[]> {
    const records = await this.presenceService.updateCustomStatus(
      req.user.userId,
      dto,
    );
    this.presenceGateway.broadcastPresenceUpdate();
    return records;
  }
}
