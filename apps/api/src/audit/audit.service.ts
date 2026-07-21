import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogResponseDto } from '@hrms/shared';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    adminId: string,
    action: string,
    details: string,
    targetId?: string,
    targetName?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        adminId,
        action,
        details,
        targetId,
        targetName,
      },
    });
  }

  async getLogs(): Promise<AuditLogResponseDto[]> {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { name: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      adminName: log.admin.name,
      action: log.action,
      targetId: log.targetId,
      targetName: log.targetName,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
