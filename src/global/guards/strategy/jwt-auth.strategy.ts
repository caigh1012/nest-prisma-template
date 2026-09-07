import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: number;
  username: string;
};

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwtAuth') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // false 表示按 JWT 的 exp 字段校验过期时间；token 一旦过期会直接认证失败。
      // 只有在“允许过期 token 进入后续逻辑（如续签）”的场景下，才考虑改成 true。
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub || !payload.username) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return { userId: payload.sub, username: payload.username };
  }
}
