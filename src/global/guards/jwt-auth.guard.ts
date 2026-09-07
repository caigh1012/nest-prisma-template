import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwtAuth') {
  /**
   * 放行不需要 JWT 鉴权的 URL。
   * 如需新增公开接口，继续在这里补充即可。
   */
  private static readonly authWhitelist: ReadonlyArray<string> = ['/api/login'];

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const requestPath = this.normalizePath(request.originalUrl ?? request.url ?? request.path ?? '');

    const isWhitelisted = JwtAuthGuard.authWhitelist.some((rule) => this.normalizePath(rule) === requestPath);

    if (isWhitelisted) {
      return true;
    }

    return super.canActivate(context);
  }

  private normalizePath(path: string) {
    const [pathname] = path.split('?');
    const normalizedPath = pathname.replace(/\/+$/, '');

    return normalizedPath || '/';
  }
}
