/**
 * Copyright (c) 2026 Ahmed Aldhahi. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This software is the intellectual property of Ahmed Aldhahi.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.use((req: any, res: any, next: any) => {
    if (req.url && !req.url.startsWith('/api/') && req.url !== '/api') {
      req.url = `/api${req.url}`;
    }
    next();
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 HRMS API running on: http://localhost:${port}/api`);
}

bootstrap();
