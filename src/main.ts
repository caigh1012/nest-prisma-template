import { NestFactory, Reflector } from '@nestjs/core';
import compression from 'compression';
import { join } from 'path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { loggerMiddleware } from '@/core/middlewares/logger.middleware';
import { HttpExceptionFilter } from '@/core/filters/http-exception.filter';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { ClassSerializerInterceptor } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // 缓存启动日志，待 pino Logger 接管后再输出
    bufferLogs: true,
  });

  // 如果需要排除某个路由，可以添加 { exclude: [] }
  app.setGlobalPrefix('api');

  // 开启 CORS ，跨域资源共享 (CORS) 是一种允许从其他域请求资源的机制
  app.enableCors();

  // 静态资源服务：/public/
  app.useStaticAssets(join(__dirname, '../..', 'public'), {
    prefix: '/public/',
  });

  // 开启压缩 压缩响应体
  app.use(compression());

  // app.useGlobalGuards(new JwtAuthGuard());

  // 全局日志 仅记录 /api 下的请求；Express 会自动匹配 /api 及其子路径
  app.use('/api', loggerMiddleware);

  // 全局异常过滤器（统一错误响应结构）
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局参数校验管道（class-validator + class-transformer）
  app.useGlobalPipes(new ValidationPipe());

  // 全局响应序列化拦截器（配合 class-transformer 的 @Exclude/@Expose 使用）
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // 使用 pino 作为全局 Logger（写入 ./logs 下的日志文件）
  app.useLogger(app.get(Logger));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
