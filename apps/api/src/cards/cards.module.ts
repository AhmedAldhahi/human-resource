import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CardsService],
  controllers: [CardsController],
})
export class CardsModule {}
