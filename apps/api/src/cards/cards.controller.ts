import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  Role,
  IssueCardDto,
  CardResponseDto,
} from '@hrms/shared';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async issueCard(
    @Request() req: { user: { userId: string; email: string; role: Role } },
    @Body() issueCardDto: IssueCardDto,
  ): Promise<CardResponseDto> {
    if (issueCardDto.employeeId === req.user.userId) {
      throw new BadRequestException('You cannot issue a performance card to yourself.');
    }
    const card = await this.cardsService.issueCard(req.user.userId, issueCardDto);
    await this.auditService.logAction(
      req.user.userId,
      'ISSUE_CARD',
      `Issued ${issueCardDto.cardType} card for reason: "${issueCardDto.reason}"`,
      card.id,
    );
    return card;
  }

  @Get('employee/:id')
  @UseGuards(JwtAuthGuard)
  async getCardsByEmployee(
    @Param('id') employeeId: string,
  ): Promise<CardResponseDto[]> {
    return this.cardsService.getCardsByEmployee(employeeId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async getAllCards(): Promise<CardResponseDto[]> {
    return this.cardsService.getAllCards();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async deleteCard(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
  ): Promise<{ success: boolean }> {
    const result = await this.cardsService.deleteCard(id);
    await this.auditService.logAction(
      req.user.userId,
      'DELETE_CARD',
      `Deleted performance card`,
      id,
    );
    return result;
  }
}
