import { BadRequestException, HttpStatus } from '@nestjs/common';

/**
 * 参数校验失败异常
 * message 为参数字段及其校验失败原因，形如：`字段名: 原因`
 */
export class ValidationException extends BadRequestException {
  constructor(errors: { field: string; reason: string }[]) {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message: errors.map(({ field, reason }) => `${field}: ${reason}`),
      error: 'Bad Request',
    });
  }
}
