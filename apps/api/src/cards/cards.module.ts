import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { AuditModule } from '../audit/audit.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [AuditModule, PresenceModule],
  providers: [CardsService],
  controllers: [CardsController],
})
export class CardsModule {}
