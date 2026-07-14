import { Module } from '@nestjs/common';
import { AbsenceController } from './absence.controller';
import { AbsenceService } from './absence.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AbsenceController],
  providers: [AbsenceService],
  exports: [AbsenceService],
})
export class AbsenceModule {}
