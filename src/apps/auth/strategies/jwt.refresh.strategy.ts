import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.type';
import { type Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request): string | null => {
        const token: unknown = req.cookies?.refresh_token;
        return typeof token === 'string' ? token : null;
      },
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken: unknown = req.cookies?.refresh_token;

    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      refreshToken,
    };
  }
}
