import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IssueCardDto,
  CardResponseDto,
  CARD_POINT_VALUES,
} from '@hrms/shared';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async issueCard(
    issuerId: string,
    dto: IssueCardDto,
  ): Promise<CardResponseDto> {
    const pointValue = CARD_POINT_VALUES[dto.cardType];

    const [card] = await this.prisma.$transaction([
      this.prisma.performanceCard.create({
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
      }),
      this.prisma.user.update({
        where: { id: dto.employeeId },
        data: {
          netCardPoints: { increment: pointValue },
        },
      }),
    ]);

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
}
