import { Module } from '@nestjs/common';
import { VoaderaService } from './voadera.service';
import { VoaderaController } from './voadera.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [VoaderaController],
  providers: [VoaderaService],
  exports: [VoaderaService],
})
export class VoaderaModule {}
