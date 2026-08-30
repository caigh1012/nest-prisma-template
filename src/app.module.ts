import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SharedModule } from './modules/shared/shared.module';
import { UsersModule } from './modules/users/users.module';

/**
 * 应用模块
 * 1. 引入配置模块
 * 2. 引入共享模块
 * 3. 引入用户模块
 */
@Module({
  imports: [
    // 引入 env 文件配置
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 事件总线：统一使用 user.created 这类命名，支持后续 user.* 通配监听
    EventEmitterModule.forRoot({
      wildcard: true, // 开启通配符事件匹配，如 user.*
      delimiter: '.', // 事件命名分隔符，对应 user.created 这种风格
      newListener: false, // 不额外发布“新增监听器”事件
      removeListener: false, // 不额外发布“移除监听器”事件
      maxListeners: 20, // 允许更多监听器，减少业务模块增多后的告警
      verboseMemoryLeak: true, // 超过监听器上限时输出更明确的泄漏提示
      ignoreErrors: false, // 监听器抛错时继续向外抛出，避免静默失败
    }),

    // pino 日志：仅生产环境按天滚动（文件名带日期），单个文件超过 10MB 自动创建新文件
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // 兼容 Nest 11 / Express 5 的命名通配符语法，避免全局前缀拼接成 /api/*
        forRoutes: ['{*path}'],
        pinoHttp:
          configService.get('NODE_ENV') === 'production'
            ? {
                transport: {
                  target: 'pino-roll',
                  options: {
                    file: './logs/app', // 生成 ./logs/app.YYYY-MM-DD.N.log
                    frequency: 'daily', // 每天滚动
                    dateFormat: 'yyyy-MM-dd', // 文件名带上日期（pino-roll 4.x 需显式指定）
                    size: '10m', // 超过 10MB 滚动
                    mkdir: true, // 自动创建 ./logs 目录
                  },
                },
              }
            : {
                transport: {
                  target: 'pino-pretty',
                  options: { singleLine: true },
                },
              },
      }),
    }),
    SharedModule,
    UsersModule,
  ],
  providers: [],
})
export class AppModule {}
