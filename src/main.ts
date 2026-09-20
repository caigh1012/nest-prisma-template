import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import { join } from 'path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

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

  // 使用 pino 作为全局 Logger（写入 ./logs 下的日志文件）
  app.useLogger(app.get(Logger));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
