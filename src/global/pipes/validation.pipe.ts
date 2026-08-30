import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ValidationException } from '../exceptions/validation.exception';

/**
 * 全局参数校验管道
 * 使用 class-transformer 将普通对象转换为 DTO 实例，再用 class-validator 校验
 */
@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    // 无类型或基础类型无需校验
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);

    const errors = await validate(object, {
      whitelist: true, // 剔除 DTO 上未声明的字段
      forbidNonWhitelisted: true, // 存在未声明字段时直接报错
    });

    if (errors.length > 0) {
      throw new ValidationException(this.flattenErrors(errors));
    }

    return object;
  }

  private toValidate(metatype: unknown): boolean {
    const types: unknown[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private flattenErrors(errors: ValidationError[], prefix = ''): { field: string; reason: string }[] {
    const result: { field: string; reason: string }[] = [];

    for (const error of errors) {
      const field = prefix ? `${prefix}.${error.property}` : error.property;
      const reason = error.constraints ? Object.values(error.constraints)[0] : '参数不合法';

      result.push({ field, reason });

      if (error.children?.length) {
        result.push(...this.flattenErrors(error.children, field));
      }
    }

    return result;
  }
}
