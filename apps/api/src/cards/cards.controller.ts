import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CardsService } from './cards.service';
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
  constructor(private readonly cardsService: CardsService) {}

  @Post('issue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  async issueCard(
    @Request() req: { user: { userId: string; email: string; role: Role } },
    @Body() issueCardDto: IssueCardDto,
  ): Promise<CardResponseDto> {
    return this.cardsService.issueCard(req.user.userId, issueCardDto);
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
}
