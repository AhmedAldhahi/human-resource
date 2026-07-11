import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@hrms/shared';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'hrms-jwt-secret-change-in-production-2024',
    });
  }

  validate(payload: JwtPayload): {
    userId: string;
    email: string;
    role: Role;
  } {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
