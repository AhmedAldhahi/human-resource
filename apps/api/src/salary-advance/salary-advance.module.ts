import { Module } from '@nestjs/common';
import { SalaryAdvanceService } from './salary-advance.service';
import { SalaryAdvanceController } from './salary-advance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SalaryAdvanceController],
  providers: [SalaryAdvanceService],
  exports: [SalaryAdvanceService],
})
export class SalaryAdvanceModule {}
