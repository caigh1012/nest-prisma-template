import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * 常见状态码的兜底错误信息，仅当异常未携带自定义 message 时使用
 */
const DEFAULT_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: '请求参数错误',
  [HttpStatus.UNAUTHORIZED]: '未认证或登录已过期',
  [HttpStatus.FORBIDDEN]: '没有访问权限',
  [HttpStatus.NOT_FOUND]: '资源不存在',
  [HttpStatus.TOO_MANY_REQUESTS]: '请求过于频繁',
  [HttpStatus.INTERNAL_SERVER_ERROR]: '服务器内部错误',
};

/**
 * 全局异常过滤器
 * 统一处理 HTTP 异常与未知异常，返回一致的响应结构
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    console.log(exception, 'exception');
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 非 HttpException 一律视为服务器内部错误（兜底）
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.getMessage(exception, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.originalUrl} ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    /**
     * 统一错误响应结构
     */
    response.status(status).json({
      code: `${status}`,
      message,
      data: null,
    });
  }

  private getMessage(exception: HttpException, status: number): string | string[] {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      // console.log(res, 'res');
      this.logger.log(res, 'res');

      if (typeof res === 'string') {
        return res;
      }

      if (typeof res === 'object' && res !== null) {
        const message = (res as Record<string, unknown>).message;
        if (typeof message === 'string' || Array.isArray(message)) {
          return message;
        }
      }
    }

    return DEFAULT_MESSAGES[status] ?? DEFAULT_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR];
  }
}
