import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { CardsModule } from '../cards/cards.module';
import { AbsenceModule } from '../absence/absence.module';
import { ReportsModule } from '../reports/reports.module';
import { PresenceModule } from '../presence/presence.module';
import { TrackerModule } from '../tracker/tracker.module';
import { ChatModule } from '../chat/chat.module';
import { PayrollModule } from '../payroll/payroll.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    SupabaseModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AttendanceModule,
    CardsModule,
    AbsenceModule,
    ReportsModule,
    PresenceModule,
    TrackerModule,
    ChatModule,
    PayrollModule,
    AuditModule,
  ],
})
export class AppModule {}

