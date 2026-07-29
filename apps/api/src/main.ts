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

// Simple sliding window rate limiter to protect against DDoS and brute-force attacks
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/min per IP

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

  // Security Headers & Rate Limiting Middleware
  app.use((req: any, res: any, next: any) => {
    // 1. Security Headers (XSS & Clickjacking Protection)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 2. DDoS & Brute-Force Rate Limiter
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = ipRequestCounts.get(ip);

    if (clientRecord && now < clientRecord.resetTime) {
      clientRecord.count++;
      if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'DDoS / Brute-force rate limit exceeded. Please slow down and try again in 1 minute.',
        });
      }
    } else {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }

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
