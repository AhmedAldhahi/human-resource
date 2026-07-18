import { Module } from '@nestjs/common';
import { VoaderaService } from './voadera.service';
import { VoaderaController } from './voadera.controller';

@Module({
  controllers: [VoaderaController],
  providers: [VoaderaService],
  exports: [VoaderaService],
})
export class VoaderaModule {}
