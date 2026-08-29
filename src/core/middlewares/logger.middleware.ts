import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

// 不同请求方法使用不同颜色
const METHOD_COLORS: Record<string, string> = {
  GET: C.green,
  POST: C.cyan,
  PUT: C.yellow,
  PATCH: C.magenta,
  DELETE: C.red,
};

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    const color = METHOD_COLORS[method] ?? C.cyan;
    const ip = req.ip || req.socket.remoteAddress || '-';

    console.log(
      `${C.bold}${color}${method}${C.reset} ` +
        `${C.blue}${req.originalUrl}${C.reset} ` +
        `${C.dim}${C.gray}→ ${ip}${C.reset}`,
    );

    const params: Record<string, unknown> = {};
    if (Object.keys(req.query).length) params.query = req.query;
    if (Object.keys(req.params).length) params.params = req.params;

    if (req.body && Object.keys(req.body).length) params.body = req.body;

    if (Object.keys(params).length) {
      console.log(`${C.dim}${C.yellow}  参数${C.reset}`, params);
    }

    next();
  }
}
