import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PresenceModule } from '../presence/presence.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PresenceModule, AuditModule],
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
