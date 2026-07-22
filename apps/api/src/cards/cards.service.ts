import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IssueCardDto,
  CardResponseDto,
  CARD_POINT_VALUES,
} from '@hrms/shared';
import { PresenceGateway } from '../presence/presence.gateway';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly presenceGateway?: PresenceGateway,
  ) {}

  private async recalculateUserPoints(employeeId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthCards = await this.prisma.performanceCard.findMany({
      where: {
        employeeId,
        issuedAt: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { cardType: true },
    });

    const currentMonthNet = monthCards.reduce(
      (sum, c) => sum + (CARD_POINT_VALUES[c.cardType as keyof typeof CARD_POINT_VALUES] || 0),
      0,
    );

    await this.prisma.user.update({
      where: { id: employeeId },
      data: { netCardPoints: currentMonthNet },
    });

    return currentMonthNet;
  }

  async issueCard(
    issuerId: string,
    dto: IssueCardDto,
  ): Promise<CardResponseDto> {
    const card = await this.prisma.performanceCard.create({
      data: {
        employeeId: dto.employeeId,
        issuerId,
        cardType: dto.cardType,
        reason: dto.reason,
      },
      include: {
        employee: { select: { name: true } },
        issuer: { select: { name: true } },
      },
    });

    await this.recalculateUserPoints(dto.employeeId);
    this.presenceGateway?.broadcastPresenceUpdate();

    return {
      id: card.id,
      employeeId: card.employeeId,
      issuerId: card.issuerId,
      cardType: card.cardType as CardResponseDto['cardType'],
      reason: card.reason,
      issuedAt: card.issuedAt.toISOString(),
      employeeName: card.employee.name,
      issuerName: card.issuer.name,
    };
  }

  async getCardsByEmployee(employeeId: string): Promise<CardResponseDto[]> {
    const cards = await this.prisma.performanceCard.findMany({
      where: { employeeId },
      include: {
        employee: { select: { name: true } },
        issuer: { select: { name: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return cards.map((card) => ({
      id: card.id,
      employeeId: card.employeeId,
      issuerId: card.issuerId,
      cardType: card.cardType as CardResponseDto['cardType'],
      reason: card.reason,
      issuedAt: card.issuedAt.toISOString(),
      employeeName: card.employee.name,
      issuerName: card.issuer.name,
    }));
  }

  async getAllCards(): Promise<CardResponseDto[]> {
    const cards = await this.prisma.performanceCard.findMany({
      include: {
        employee: { select: { name: true } },
        issuer: { select: { name: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return cards.map((card) => ({
      id: card.id,
      employeeId: card.employeeId,
      issuerId: card.issuerId,
      cardType: card.cardType as CardResponseDto['cardType'],
      reason: card.reason,
      issuedAt: card.issuedAt.toISOString(),
      employeeName: card.employee.name,
      issuerName: card.issuer.name,
    }));
  }

  async deleteCard(id: string): Promise<{ success: boolean }> {
    const card = await this.prisma.performanceCard.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    await this.prisma.performanceCard.delete({ where: { id } });
    await this.recalculateUserPoints(card.employeeId);
    this.presenceGateway?.broadcastPresenceUpdate();
    return { success: true };
  }
}
